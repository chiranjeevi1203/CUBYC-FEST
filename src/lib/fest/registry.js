/**
 * Event registration on Firestore: register / withdraw (individual events),
 * create / join / dismantle a team, and read your own bookings.
 *
 * Every write here is also checked by firestore.rules — this code checks first
 * only to give a clear message (a clash, a full team, a taken name). It takes
 * the database and the event table as arguments, so the same code runs in the
 * website and in the emulator tests.
 *
 *   events: slug → { b: [time blocks], team, min, max }   (as in firestore.rules)
 *   user:   { uid, cubycId, name }
 */
import { cleanTeamName, isTeamCode, normaliseCode } from './teamCode.js';
import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore';

const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const randomCode = () => {
  const bytes = crypto.getRandomValues(new Uint32Array(6));
  return `TM-${[...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join('')}`;
};

export { cleanTeamName, isTeamCode, normaliseCode };

/** An error with a code and a message meant for people. */
export class RegistryError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'RegistryError';
    this.code = code;
    Object.assign(this, extra);
  }
}

export function createRegistry({ db, events, nameOf = (s) => s }) {
  const regRef = (slug, uid) => doc(db, 'registrations', `${slug}_${uid}`);
  const busyRef = (uid, block) => doc(db, 'busy', `${uid}_${block}`);
  const teamRef = (id) => doc(db, 'teams', id);
  const nameRef = (slug, key) => doc(db, 'teamNames', `${slug}_${key}`);
  const ev = (slug) => {
    const e = events[slug];
    if (!e) throw new RegistryError('unknown-event', 'This event isn’t open for registration.');
    return e;
  };

  /** Inside a transaction: refuse if already registered for the event or if any of its blocks is taken. */
  async function checkFree(tx, user, slug) {
    if ((await tx.get(regRef(slug, user.uid))).exists()) throw new RegistryError('already', `You’re already registered for ${nameOf(slug)}.`);
    for (const block of ev(slug).b) {
      const b = await tx.get(busyRef(user.uid, block));
      if (b.exists()) {
        const other = b.data().slug;
        throw new RegistryError('clash', `You’re already registered for ${nameOf(other)} at the same time. Please verify and confirm before choosing ${nameOf(slug)}.`, { clashWith: other });
      }
    }
  }
  function book(tx, user, slug, teamId) {
    tx.set(regRef(slug, user.uid), {
      uid: user.uid,
      cubycId: user.cubycId,
      name: user.name,
      slug,
      kind: teamId ? 'team' : 'individual',
      ...(teamId ? { teamId } : {}),
      createdAt: serverTimestamp(),
    });
    for (const block of ev(slug).b) tx.set(busyRef(user.uid, block), { uid: user.uid, slug, block, at: serverTimestamp() });
  }
  const entry = (user) => ({ uid: user.uid, cubycId: user.cubycId, name: user.name });

  return {
    /** Register for an individual event. */
    async registerIndividual(user, slug) {
      if (ev(slug).team) throw new RegistryError('team-event', 'This is a team event — create or join a team.');
      await runTransaction(db, async (tx) => {
        await checkFree(tx, user, slug);
        book(tx, user, slug, null);
      });
    },

    /** Withdraw from an individual event (frees its time). */
    async withdraw(user, slug) {
      const reg = await getDoc(regRef(slug, user.uid));
      if (!reg.exists()) return;
      if (reg.data().kind !== 'individual') throw new RegistryError('team-locked', 'Team registrations can’t be withdrawn. The team leader can dismantle the team.');
      const b = writeBatch(db);
      b.delete(regRef(slug, user.uid));
      for (const block of ev(slug).b) b.delete(busyRef(user.uid, block));
      await b.commit();
    },

    /** Create a team for a team event; you lead it. Returns the team (its id is the code to share). */
    async createTeam(user, slug, rawName) {
      if (!ev(slug).team) throw new RegistryError('not-team', 'This is an individual event.');
      const name = cleanTeamName(rawName);
      if (!name) throw new RegistryError('bad-name', 'Team names are 2–40 letters, numbers, spaces or . _ & \' - and start with a letter or number.');
      const nameKey = name.toLowerCase();
      for (let attempt = 0; attempt < 5; attempt++) {
        const id = randomCode();
        const team = await runTransaction(db, async (tx) => {
          if ((await tx.get(nameRef(slug, nameKey))).exists()) throw new RegistryError('name-taken', `The team name “${name}” is already taken for ${nameOf(slug)}. Try another.`);
          if ((await tx.get(teamRef(id))).exists()) return null; // code clash — pick another
          await checkFree(tx, user, slug);
          const t = { id, slug, name, nameKey, leaderUid: user.uid, leaderCubycId: user.cubycId, leaderName: user.name, members: [entry(user)], memberUids: [user.uid], status: 'active', createdAt: serverTimestamp() };
          tx.set(teamRef(id), t);
          tx.set(nameRef(slug, nameKey), { teamId: id });
          book(tx, user, slug, id);
          return t;
        });
        if (team) return team;
      }
      throw new RegistryError('no-code', 'Could not create the team. Please try again.');
    },

    /** Look a team up by its code (to show it before joining). */
    async findTeam(rawCode) {
      const code = normaliseCode(rawCode);
      if (!isTeamCode(code)) throw new RegistryError('bad-code', 'Team codes look like TM-7K4QXM.');
      const snap = await getDoc(teamRef(code));
      if (!snap.exists()) throw new RegistryError('no-team', 'No team with this code. Check it with your team leader.');
      return snap.data();
    },

    /** Join a team with its code. */
    async joinTeam(user, rawCode) {
      const code = normaliseCode(rawCode);
      if (!isTeamCode(code)) throw new RegistryError('bad-code', 'Team codes look like TM-7K4QXM.');
      return runTransaction(db, async (tx) => {
        const snap = await tx.get(teamRef(code));
        if (!snap.exists()) throw new RegistryError('no-team', 'No team with this code. Check it with your team leader.');
        const t = snap.data();
        if (t.status !== 'active') throw new RegistryError('closed-team', 'This team is no longer taking members.');
        if (t.memberUids.includes(user.uid)) throw new RegistryError('member', 'You’re already in this team.');
        if (t.memberUids.length >= ev(t.slug).max) throw new RegistryError('full', `This team is full (${ev(t.slug).max} members).`);
        await checkFree(tx, user, t.slug);
        tx.update(teamRef(code), { members: [...t.members, entry(user)], memberUids: [...t.memberUids, user.uid] });
        book(tx, user, t.slug, code);
        return { ...t, members: [...t.members, entry(user)], memberUids: [...t.memberUids, user.uid] };
      });
    },

    /** Leader only: take the team apart — every member's registration is removed and their time freed. */
    async dismantleTeam(user, teamId) {
      let t = (await getDoc(teamRef(teamId))).data();
      if (!t) return;
      if (t.leaderUid !== user.uid) throw new RegistryError('not-leader', 'Only the team leader can dismantle the team.');
      const { slug } = t;
      if (t.status === 'active') {
        const b = writeBatch(db);
        b.update(teamRef(teamId), { status: 'dismantling' });
        await b.commit();
      }
      // One member at a time (keeps every write small enough for the rules to check).
      for (;;) {
        t = (await getDoc(teamRef(teamId))).data();
        const other = t.members.find((m) => m.uid !== user.uid);
        if (!other) break;
        const b = writeBatch(db);
        b.update(teamRef(teamId), { members: t.members.filter((m) => m.uid !== other.uid), memberUids: t.memberUids.filter((u) => u !== other.uid) });
        b.delete(regRef(slug, other.uid));
        for (const block of ev(slug).b) b.delete(busyRef(other.uid, block));
        await b.commit();
      }
      const b = writeBatch(db);
      b.delete(regRef(slug, user.uid));
      for (const block of ev(slug).b) b.delete(busyRef(user.uid, block));
      b.delete(nameRef(slug, t.nameKey));
      b.delete(teamRef(teamId));
      await b.commit();
    },

    /** Your registrations, the blocks you hold, and your teams. */
    async mine(user) {
      const [regs, busy] = await Promise.all([
        getDocs(query(collection(db, 'registrations'), where('uid', '==', user.uid))),
        getDocs(query(collection(db, 'busy'), where('uid', '==', user.uid))),
      ]);
      const list = regs.docs.map((d) => d.data());
      const teamIds = [...new Set(list.filter((r) => r.teamId).map((r) => r.teamId))];
      const teams = (await Promise.all(teamIds.map((id) => getDoc(teamRef(id))))).filter((s) => s.exists()).map((s) => s.data());
      return { registrations: list, busy: busy.docs.map((d) => d.data()), teams };
    },

    /** Is registration open right now? */
    async isOpen() {
      const s = await getDoc(doc(db, 'settings', 'registration'));
      return s.exists() && s.data().open === true;
    },
  };
}
