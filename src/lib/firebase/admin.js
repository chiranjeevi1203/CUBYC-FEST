/**
 * The admin portal's data (/festadmin). Everything here is also enforced by
 * firestore.rules — the portal only shows people what the database already
 * allows them: admins read, super admins change. Every change is written
 * together with an activity-log entry in the same batch, so nothing changes
 * without a record of who did it.
 */
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from './client';
import { EVENT_TABLE } from '../fest/eventTable';

// Built into firestore.rules too (the rules decide; this only labels the UI).
export const ROOT_SUPERADMINS = ['chiranjeevi.p@bcah.christuniversity.in'];

/** Follow sign-in: onChange({ user, role }) with role 'superadmin' | 'admin' | null. */
export function watchAdmin(onChange) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) return onChange({ user: null, role: null });
    const email = (fbUser.email ?? '').toLowerCase();
    let role = null;
    if (ROOT_SUPERADMINS.includes(email)) role = 'superadmin';
    else {
      try {
        const r = await getDoc(doc(db, 'roles', email));
        if (r.exists() && ['admin', 'superadmin'].includes(r.data().role)) role = r.data().role;
      } catch {
        role = null; // not allowed to read it: no access
      }
    }
    onChange({ user: { uid: fbUser.uid, email, name: fbUser.displayName ?? email, photo: fbUser.photoURL ?? null }, role });
  });
}

export async function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(auth, provider);
}
export const signOut = () => fbSignOut(auth);

const all = async (name) => (await getDocs(collection(db, name))).docs.map((d) => ({ id: d.id, ...d.data() }));
const one = async (path) => {
  const s = await getDoc(doc(db, path));
  return s.exists() ? s.data() : null;
};

/** Everything the dashboard shows. Super admins also get roles and the activity log. */
export async function loadAll(isSuper) {
  const [users, registrations, teams, announcements, registration, site, payment] = await Promise.all([
    all('users'),
    all('registrations'),
    all('teams'),
    all('announcements'),
    one('settings/registration'),
    one('settings/site'),
    one('settings/payment'),
  ]);
  let roles = [];
  let logs = [];
  if (isSuper) {
    [roles, logs] = await Promise.all([
      all('roles'),
      getDocs(query(collection(db, 'auditLogs'), orderBy('at', 'desc'), limit(300))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    ]);
  }
  return { users, registrations, teams, announcements, roles, logs, settings: { registration, site, payment }, loadedAt: new Date() };
}

/* ---------------- changes (super admins) — each with its log entry ---------------- */

function logged(actor, action, target, details = {}) {
  const b = writeBatch(db);
  b.set(doc(collection(db, 'auditLogs')), { actorUid: actor.uid, actorEmail: actor.email, action, target: String(target).slice(0, 200), details, at: serverTimestamp() });
  return b;
}

export async function setRegistrationOpen(actor, open) {
  const b = logged(actor, open ? 'registration.open' : 'registration.close', 'settings/registration');
  b.set(doc(db, 'settings/registration'), { open, updatedBy: actor.email, updatedAt: serverTimestamp() });
  await b.commit();
}

export async function setMaintenance(actor, maintenance, message) {
  const b = logged(actor, maintenance ? 'maintenance.on' : 'maintenance.off', 'settings/site', { message });
  b.set(doc(db, 'settings/site'), { maintenance, message: String(message ?? '').slice(0, 400), updatedBy: actor.email, updatedAt: serverTimestamp() });
  await b.commit();
}

export async function savePayment(actor, p) {
  const clean = {
    open: Boolean(p.open),
    christite: Math.max(0, Math.round(Number(p.christite) || 0)),
    external: Math.max(0, Math.round(Number(p.external) || 0)),
    payee: String(p.payee ?? '').slice(0, 120),
    upiId: String(p.upiId ?? '').slice(0, 80),
    bank: String(p.bank ?? '').slice(0, 120),
    account: String(p.account ?? '').slice(0, 40),
    ifsc: String(p.ifsc ?? '').slice(0, 20).toUpperCase(),
    portalUrl: String(p.portalUrl ?? '').slice(0, 300),
    instructions: String(p.instructions ?? '').slice(0, 1500),
  };
  const b = logged(actor, 'payment.settings', 'settings/payment', { christite: clean.christite, external: clean.external, open: clean.open });
  b.set(doc(db, 'settings/payment'), { ...clean, updatedBy: actor.email, updatedAt: serverTimestamp() });
  await b.commit();
}

const newId = () => `a_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export async function saveAnnouncement(actor, a) {
  const id = a.id ?? newId();
  const data = {
    title: String(a.title ?? '').trim().slice(0, 140),
    body: String(a.body ?? '').trim().slice(0, 3000),
    tag: String(a.tag ?? 'General').trim().slice(0, 24) || 'General',
    pinned: Boolean(a.pinned),
    published: Boolean(a.published),
    link: String(a.link ?? '').trim().slice(0, 300),
    date: a.date || new Date().toISOString().slice(0, 10),
    updatedBy: actor.email,
    updatedAt: serverTimestamp(),
  };
  const b = logged(actor, a.id ? 'announcement.edit' : 'announcement.create', `announcements/${id}`, { title: data.title, published: data.published });
  b.set(doc(db, 'announcements', id), data);
  await b.commit();
  return id;
}
export async function deleteAnnouncement(actor, id, title) {
  const b = logged(actor, 'announcement.delete', `announcements/${id}`, { title });
  b.delete(doc(db, 'announcements', id));
  await b.commit();
}

export async function grantRole(actor, email, role) {
  const e = String(email).trim().toLowerCase();
  const b = logged(actor, 'role.grant', `roles/${e}`, { role });
  b.set(doc(db, 'roles', e), { role, depts: [], grantedBy: actor.email, grantedAt: serverTimestamp() });
  await b.commit();
}
export async function revokeRole(actor, email) {
  const b = logged(actor, 'role.revoke', `roles/${email}`);
  b.delete(doc(db, 'roles', email));
  await b.commit();
}

export async function setUserStatus(actor, u, status) {
  const b = logged(actor, status === 'suspended' ? 'user.suspend' : 'user.reactivate', `users/${u.id}`, { email: u.email, cubycId: u.cubycId });
  b.update(doc(db, 'users', u.id), { status, updatedAt: serverTimestamp() });
  await b.commit();
}

const blocksOf = (slug) => EVENT_TABLE[slug]?.b ?? [];

/** Remove one registration (and free its time). A team member is also taken off the team. */
export async function removeRegistration(actor, reg, team) {
  const b = logged(actor, 'registration.remove', `registrations/${reg.id}`, { uid: reg.uid, slug: reg.slug, teamId: reg.teamId ?? null });
  b.delete(doc(db, 'registrations', reg.id));
  for (const bl of blocksOf(reg.slug)) b.delete(doc(db, 'busy', `${reg.uid}_${bl}`));
  if (team && team.memberUids?.includes(reg.uid)) {
    b.update(doc(db, 'teams', team.id), { members: team.members.filter((m) => m.uid !== reg.uid), memberUids: team.memberUids.filter((x) => x !== reg.uid) });
  }
  await b.commit();
}

/** Take a whole team apart: the team, its name, and every member's registration and time. */
export async function dismantleTeam(actor, team) {
  const b = logged(actor, 'team.dismantle', `teams/${team.id}`, { name: team.name, slug: team.slug, members: team.memberUids.length });
  for (const uid of team.memberUids) {
    b.delete(doc(db, 'registrations', `${team.slug}_${uid}`));
    for (const bl of blocksOf(team.slug)) b.delete(doc(db, 'busy', `${uid}_${bl}`));
  }
  b.delete(doc(db, 'teamNames', `${team.slug}_${team.nameKey}`));
  b.delete(doc(db, 'teams', team.id));
  await b.commit();
}
