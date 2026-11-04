/**
 * Event registration and teams, against the Firestore emulator with the real
 * rules and the real website code (src/lib/fest/registry.js):  npm run test:backend
 */
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { createRegistry, RegistryError } from '../src/lib/fest/registry.js';

const ROOT = 'chiranjeevi.p@bcah.christuniversity.in';
const RULES = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
// The event table exactly as the rules have it.
const EVENTS = Object.fromEntries(
  Object.entries(Function(`return ${RULES.replace(/\r\n/g, '\n').match(/function EVENTS\(\) \{\s*return (\{[\s\S]*?\n {6}\});/)[1]}`)()).map(([slug, s]) => {
    const [kind, max, ...b] = s.split(',');
    return [slug, { b, team: kind === 't', min: 1, max: Number(max) }];
  }),
);

let env;
const PEOPLE = {
  asha: { cubycId: 'CB27-AAAAAA', name: 'Asha K' },
  ben: { cubycId: 'CB27-BBBBBB', name: 'Ben M' },
  cara: { cubycId: 'CB27-CCCCCC', name: 'Cara P' },
  dev: { cubycId: 'CB27-DDDDDD', name: 'Dev R' },
  eli: { cubycId: 'CB27-EEEEEE', name: 'Eli S' },
  newbie: { cubycId: 'CB27-NNNNNN', name: 'New Person', incomplete: true },
};
const user = (uid) => ({ uid, cubycId: PEOPLE[uid].cubycId, name: PEOPLE[uid].name });
const google = (email) => ({ email, email_verified: true, firebase: { sign_in_provider: 'google.com' } });
const dbOf = (uid) => env.authenticatedContext(uid, google(`${uid}@example.com`)).firestore();
const reg = (uid) => createRegistry({ db: dbOf(uid), events: EVENTS });
const rootDb = () => env.authenticatedContext('root', google(ROOT)).firestore();

async function setOpen(open) {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'settings/registration'), { open, updatedBy: ROOT, updatedAt: new Date() }));
}
async function exists(path) {
  let e = false;
  await env.withSecurityRulesDisabled(async (ctx) => {
    e = (await getDoc(doc(ctx.firestore(), path))).exists();
  });
  return e;
}
const rejectsWith = (p, code) => assert.rejects(p, (e) => e instanceof RegistryError && e.code === code);

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-cubyc', firestore: { rules: RULES, host: '127.0.0.1', port: 8080 } });
});
after(() => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, p] of Object.entries(PEOPLE))
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: `${uid}@example.com`,
        cubycId: p.cubycId,
        profile: { name: p.name },
        profileComplete: !p.incomplete,
        status: 'active',
        pass: { status: 'none' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  });
  await setOpen(true);
});

describe('the event table in the rules', () => {
  test('all 27 events, each with its time blocks and team size', () => {
    assert.equal(Object.keys(EVENTS).length, 27);
    assert.deepEqual(EVENTS['air-crash'], { b: ['d1-1030'], team: false, min: 1, max: 1 });
    assert.equal(EVENTS['street-play'].max, 25);
  });
});

describe('individual events', () => {
  test('register, and the time is booked', async () => {
    await reg('asha').registerIndividual(user('asha'), 'air-crash');
    assert.ok(await exists('registrations/air-crash_asha'));
    assert.ok(await exists('busy/asha_d1-1030'));
  });
  test('registering twice is refused', async () => {
    await reg('asha').registerIndividual(user('asha'), 'air-crash');
    await rejectsWith(reg('asha').registerIndividual(user('asha'), 'air-crash'), 'already');
  });
  test('an event at the same time is refused, naming the clash', async () => {
    await reg('asha').registerIndividual(user('asha'), 'air-crash');
    await assert.rejects(reg('asha').registerIndividual(user('asha'), 'best-manager-sustainaquest'), (e) => e.code === 'clash' && e.clashWith === 'air-crash');
  });
  test('…and the database refuses it even if the website check is skipped', async () => {
    await reg('asha').registerIndividual(user('asha'), 'air-crash');
    const db = dbOf('asha');
    const b = writeBatch(db);
    b.set(doc(db, 'registrations/best-manager-sustainaquest_asha'), { uid: 'asha', cubycId: 'CB27-AAAAAA', name: 'Asha K', slug: 'best-manager-sustainaquest', kind: 'individual', createdAt: serverTimestamp() });
    b.set(doc(db, 'busy/asha_d1-1030'), { uid: 'asha', slug: 'best-manager-sustainaquest', block: 'd1-1030', at: serverTimestamp() });
    await assertFails(b.commit());
  });
  test('…and a registration without booking its time is refused', async () => {
    await assertFails(setDoc(doc(dbOf('asha'), 'registrations/air-crash_asha'), { uid: 'asha', cubycId: 'CB27-AAAAAA', name: 'Asha K', slug: 'air-crash', kind: 'individual', createdAt: serverTimestamp() }));
  });
  test('an event at a different time is fine', async () => {
    await reg('asha').registerIndividual(user('asha'), 'air-crash');
    await reg('asha').registerIndividual(user('asha'), 'indian-film-and-folk-dance-solo');
  });
  test('withdrawing frees the time for another event', async () => {
    await reg('asha').registerIndividual(user('asha'), 'air-crash');
    await reg('asha').withdraw(user('asha'), 'air-crash');
    assert.equal(await exists('busy/asha_d1-1030'), false);
    await reg('asha').registerIndividual(user('asha'), 'best-manager-sustainaquest');
  });
  test('you can’t register as someone else or with a wrong name or ID', async () => {
    const db = dbOf('asha');
    const b = writeBatch(db);
    b.set(doc(db, 'registrations/air-crash_ben'), { uid: 'ben', cubycId: 'CB27-BBBBBB', name: 'Ben M', slug: 'air-crash', kind: 'individual', createdAt: serverTimestamp() });
    b.set(doc(db, 'busy/ben_d1-1030'), { uid: 'ben', slug: 'air-crash', block: 'd1-1030', at: serverTimestamp() });
    await assertFails(b.commit());
    await assertFails(reg('asha').registerIndividual({ ...user('asha'), name: 'Someone Else' }, 'air-crash'));
  });
  test('details must be complete first', async () => {
    await assertFails(reg('newbie').registerIndividual(user('newbie'), 'air-crash'));
  });
  test('a team event can’t be entered as an individual', async () => {
    await rejectsWith(reg('asha').registerIndividual(user('asha'), 'case-404'), 'team-event');
  });
  test('nothing can be registered or withdrawn while registration is closed', async () => {
    await reg('asha').registerIndividual(user('asha'), 'air-crash');
    await setOpen(false);
    await assertFails(reg('ben').registerIndividual(user('ben'), 'air-crash'));
    await assertFails(reg('asha').withdraw(user('asha'), 'air-crash'));
  });
  test('people can see only their own registrations', async () => {
    await reg('asha').registerIndividual(user('asha'), 'air-crash');
    await assertFails(getDoc(doc(dbOf('ben'), 'registrations/air-crash_asha')));
    await assertSucceeds(getDoc(doc(dbOf('asha'), 'registrations/air-crash_asha')));
  });
});

describe('teams', () => {
  test('a leader creates a team; the leader is booked and the name is claimed', async () => {
    const t = await reg('asha').createTeam(user('asha'), 'case-404', 'Code  Crusaders ');
    assert.match(t.id, /^TM-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    assert.equal(t.name, 'Code Crusaders');
    assert.ok(await exists(`teams/${t.id}`));
    assert.ok(await exists('registrations/case-404_asha'));
    assert.ok(await exists('teamNames/case-404_code crusaders'));
  });
  test('a team name already used in that event is refused…', async () => {
    await reg('asha').createTeam(user('asha'), 'case-404', 'Code Crusaders');
    await rejectsWith(reg('ben').createTeam(user('ben'), 'case-404', 'code crusaders'), 'name-taken');
  });
  test('…but the same name is fine in a different event', async () => {
    await reg('asha').createTeam(user('asha'), 'case-404', 'Code Crusaders');
    await reg('ben').createTeam(user('ben'), 'meme-battle', 'Code Crusaders');
  });
  test('odd team names are refused (by the website and the database)', async () => {
    await rejectsWith(reg('asha').createTeam(user('asha'), 'case-404', '<script>'), 'bad-name');
    await rejectsWith(reg('asha').createTeam(user('asha'), 'case-404', 'x'), 'bad-name');
  });
  test('members join with the code', async () => {
    const t = await reg('asha').createTeam(user('asha'), 'case-404', 'Sleuths');
    const joined = await reg('ben').joinTeam(user('ben'), t.id.toLowerCase());
    assert.deepEqual(joined.memberUids, ['asha', 'ben']);
    assert.ok(await exists('registrations/case-404_ben'));
  });
  test('joining is refused if it clashes with your timetable, naming the event', async () => {
    await reg('ben').registerIndividual(user('ben'), 'air-crash');
    const t = await reg('asha').createTeam(user('asha'), 'case-404', 'Sleuths');
    await assert.rejects(reg('ben').joinTeam(user('ben'), t.id), (e) => e.code === 'clash' && e.clashWith === 'air-crash' && /Air|air-crash/.test(e.message));
  });
  test('you can’t be in two teams at the same time, or two teams for one event', async () => {
    const t1 = await reg('asha').createTeam(user('asha'), 'case-404', 'One');
    const t2 = await reg('cara').createTeam(user('cara'), 'case-404', 'Two');
    const t3 = await reg('dev').createTeam(user('dev'), 'street-play', 'Three'); // same time block
    await reg('ben').joinTeam(user('ben'), t1.id);
    await rejectsWith(reg('ben').joinTeam(user('ben'), t2.id), 'already');
    await rejectsWith(reg('ben').joinTeam(user('ben'), t3.id), 'clash');
  });
  test('a member of a team can’t start another team at the same time', async () => {
    const t = await reg('asha').createTeam(user('asha'), 'case-404', 'One');
    await reg('ben').joinTeam(user('ben'), t.id);
    await rejectsWith(reg('ben').createTeam(user('ben'), 'case-404', 'Breakaway'), 'already');
    await rejectsWith(reg('ben').createTeam(user('ben'), 'street-play', 'Breakaway'), 'clash');
  });
  test('a full team takes no more members', async () => {
    const t = await reg('asha').createTeam(user('asha'), 'literature-court-room', 'Bench'); // exactly 3
    await reg('ben').joinTeam(user('ben'), t.id);
    await reg('cara').joinTeam(user('cara'), t.id);
    await rejectsWith(reg('dev').joinTeam(user('dev'), t.id), 'full');
  });
  test('a wrong code is explained', async () => {
    await rejectsWith(reg('ben').joinTeam(user('ben'), 'TM-ZZZZZZ'), 'no-team');
    await rejectsWith(reg('ben').joinTeam(user('ben'), 'hello'), 'bad-code');
  });
  test('joining can only add yourself (not someone else, not change the leader)', async () => {
    const t = await reg('asha').createTeam(user('asha'), 'case-404', 'Sleuths');
    const db = dbOf('ben');
    await assertFails(updateDoc(doc(db, `teams/${t.id}`), { members: [...t.members, { uid: 'cara', cubycId: 'CB27-CCCCCC', name: 'Cara P' }], memberUids: ['asha', 'cara'] }));
    await assertFails(updateDoc(doc(db, `teams/${t.id}`), { leaderUid: 'ben' }));
  });
  test('team members can’t withdraw', async () => {
    const t = await reg('asha').createTeam(user('asha'), 'case-404', 'Sleuths');
    await reg('ben').joinTeam(user('ben'), t.id);
    await rejectsWith(reg('ben').withdraw(user('ben'), 'case-404'), 'team-locked');
    await assertFails(deleteDoc(doc(dbOf('ben'), 'registrations/case-404_ben')));
  });
  test('only the leader can dismantle', async () => {
    const t = await reg('asha').createTeam(user('asha'), 'case-404', 'Sleuths');
    await reg('ben').joinTeam(user('ben'), t.id);
    await rejectsWith(reg('ben').dismantleTeam(user('ben'), t.id), 'not-leader');
    await assertFails(updateDoc(doc(dbOf('ben'), `teams/${t.id}`), { status: 'dismantling' }));
  });
  test('dismantling wipes the team and frees everyone; the name can be used again', async () => {
    const t = await reg('asha').createTeam(user('asha'), 'case-404', 'Sleuths');
    await reg('ben').joinTeam(user('ben'), t.id);
    await reg('cara').joinTeam(user('cara'), t.id);
    await reg('asha').dismantleTeam(user('asha'), t.id);
    for (const p of [`teams/${t.id}`, 'teamNames/case-404_sleuths', 'registrations/case-404_asha', 'registrations/case-404_ben', 'busy/cara_d1-1030']) assert.equal(await exists(p), false, p);
    await reg('ben').registerIndividual(user('ben'), 'air-crash');
    await reg('dev').createTeam(user('dev'), 'case-404', 'Sleuths');
  });
  test('nobody can join a team being dismantled', async () => {
    const t = await reg('asha').createTeam(user('asha'), 'case-404', 'Sleuths');
    await assertSucceeds(updateDoc(doc(dbOf('asha'), `teams/${t.id}`), { status: 'dismantling' }));
    await rejectsWith(reg('ben').joinTeam(user('ben'), t.id), 'closed-team');
  });
  test('after registration closes, teams are final', async () => {
    const t = await reg('asha').createTeam(user('asha'), 'case-404', 'Sleuths');
    await setOpen(false);
    await assertFails(reg('asha').dismantleTeam(user('asha'), t.id));
    await assertFails(reg('ben').joinTeam(user('ben'), t.id));
  });
  test('an individual event can’t have a team', async () => {
    await rejectsWith(reg('asha').createTeam(user('asha'), 'air-crash', 'Solo Squad'), 'not-team');
  });
  test('teams can be looked up by code; listing all teams is refused', async () => {
    const t = await reg('asha').createTeam(user('asha'), 'case-404', 'Sleuths');
    assert.equal((await reg('ben').findTeam(t.id)).name, 'Sleuths');
    const { collection, getDocs } = await import('firebase/firestore');
    await assertFails(getDocs(collection(dbOf('ben'), 'teams')));
  });
});

describe('opening and closing registration', () => {
  test('super admins open and close it; nobody else can', async () => {
    const body = (by) => ({ open: false, updatedBy: by, updatedAt: serverTimestamp() });
    await assertSucceeds(setDoc(doc(rootDb(), 'settings/registration'), body(ROOT)));
    await assertFails(setDoc(doc(dbOf('asha'), 'settings/registration'), body('asha@example.com')));
  });
  test('anyone signed in can see whether it is open', async () => {
    await assertSucceeds(getDoc(doc(dbOf('asha'), 'settings/registration')));
  });
  test('super admins can fix anything (e.g. remove a duplicate team)', async () => {
    const t = await reg('asha').createTeam(user('asha'), 'case-404', 'Sleuths');
    await assertSucceeds(deleteDoc(doc(rootDb(), `teams/${t.id}`)));
  });
});
