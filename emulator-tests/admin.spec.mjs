/**
 * Admin portal rules (/festadmin): site settings, payment settings, announcements,
 * roles and the activity log — against the Firestore emulator:  npm run test:backend
 */
import { after, before, beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

const ROOT = 'chiranjeevi.p@bcah.christuniversity.in';
let env;
const google = (email) => ({ email, email_verified: true, firebase: { sign_in_provider: 'google.com' } });
const as = (uid, email) => env.authenticatedContext(uid, google(email)).firestore();
const root = () => as('root', ROOT);
const admin = () => as('adm', 'viewer@example.com');
const sup = () => as('sup', 'boss@example.com');
const user = () => as('u1', 'someone@example.com');
const anon = () => env.unauthenticatedContext().firestore();

const site = (by, extra = {}) => ({ maintenance: true, message: 'Back soon', updatedBy: by, updatedAt: serverTimestamp(), ...extra });
const pay = (by, extra = {}) => ({ open: false, christite: 400, external: 500, payee: 'CHRIST', instructions: 'Pay on the portal', updatedBy: by, updatedAt: serverTimestamp(), ...extra });
const ann = (by, extra = {}) => ({ title: 'Hello', body: 'Welcome', tag: 'General', pinned: false, published: true, link: '', date: '2026-11-05', updatedBy: by, updatedAt: serverTimestamp(), ...extra });

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-cubyc', firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 } });
});
after(() => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'roles/viewer@example.com'), { role: 'admin', depts: [], grantedBy: ROOT, grantedAt: new Date() });
    await setDoc(doc(db, 'roles/boss@example.com'), { role: 'superadmin', depts: [], grantedBy: ROOT, grantedAt: new Date() });
  });
});

describe('maintenance switch (settings/site)', () => {
  test('anyone can read it, even signed out', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'settings/site')));
  });
  test('super admins turn it on and off', async () => {
    await assertSucceeds(setDoc(doc(root(), 'settings/site'), site(ROOT)));
    await assertSucceeds(setDoc(doc(sup(), 'settings/site'), site('boss@example.com', { maintenance: false })));
  });
  test('admins (view only), participants and visitors cannot', async () => {
    await assertFails(setDoc(doc(admin(), 'settings/site'), site('viewer@example.com')));
    await assertFails(setDoc(doc(user(), 'settings/site'), site('someone@example.com')));
    await assertFails(setDoc(doc(anon(), 'settings/site'), site('x')));
  });
  test('the change must be signed with your own email and the real time', async () => {
    await assertFails(setDoc(doc(sup(), 'settings/site'), site(ROOT)));
    await assertFails(setDoc(doc(sup(), 'settings/site'), site('boss@example.com', { updatedAt: new Date(0) })));
    await assertFails(setDoc(doc(sup(), 'settings/site'), site('boss@example.com', { extra: 1 })));
  });
});

describe('payment settings', () => {
  test('super admins edit fees and details; signed-in people can read them', async () => {
    await assertSucceeds(setDoc(doc(root(), 'settings/payment'), pay(ROOT)));
    await assertSucceeds(getDoc(doc(user(), 'settings/payment')));
    await assertFails(getDoc(doc(anon(), 'settings/payment')));
  });
  test('admins and participants cannot change them; amounts must be sane', async () => {
    await assertFails(setDoc(doc(admin(), 'settings/payment'), pay('viewer@example.com')));
    await assertFails(setDoc(doc(user(), 'settings/payment'), pay('someone@example.com')));
    await assertFails(setDoc(doc(root(), 'settings/payment'), pay(ROOT, { christite: -1 })));
    await assertFails(setDoc(doc(root(), 'settings/payment'), pay(ROOT, { external: '500' })));
  });
});

describe('announcements', () => {
  test('super admins publish; everyone sees published ones', async () => {
    await assertSucceeds(setDoc(doc(root(), 'announcements/a_welcome'), ann(ROOT)));
    await assertSucceeds(getDoc(doc(anon(), 'announcements/a_welcome')));
    await assertSucceeds(getDocs(query(collection(user(), 'announcements'), where('published', '==', true))));
  });
  test('drafts stay hidden from participants, visible to admins', async () => {
    await assertSucceeds(setDoc(doc(root(), 'announcements/a_draft1'), ann(ROOT, { published: false })));
    await assertFails(getDoc(doc(user(), 'announcements/a_draft1')));
    await assertSucceeds(getDoc(doc(admin(), 'announcements/a_draft1')));
    await assertFails(getDocs(collection(user(), 'announcements')));
    await assertSucceeds(getDocs(collection(admin(), 'announcements')));
  });
  test('only super admins write; links must be safe', async () => {
    await assertFails(setDoc(doc(admin(), 'announcements/a_x12345'), ann('viewer@example.com')));
    await assertFails(setDoc(doc(user(), 'announcements/a_x12345'), ann('someone@example.com')));
    await assertFails(setDoc(doc(root(), 'announcements/a_x12345'), ann(ROOT, { link: 'javascript:alert(1)' })));
    await assertSucceeds(setDoc(doc(root(), 'announcements/a_x12345'), ann(ROOT, { link: 'https://example.com/form' })));
    await assertSucceeds(deleteDoc(doc(sup(), 'announcements/a_x12345')));
  });
});

describe('admin access', () => {
  const role = (r, by) => ({ role: r, depts: [], grantedBy: by, grantedAt: serverTimestamp() });
  test('super admins add and remove admins', async () => {
    await assertSucceeds(setDoc(doc(root(), 'roles/new@example.com'), role('admin', ROOT)));
    await assertSucceeds(deleteDoc(doc(sup(), 'roles/new@example.com')));
  });
  test('admins and participants cannot grant access (not even to themselves)', async () => {
    await assertFails(setDoc(doc(admin(), 'roles/viewer@example.com'), role('superadmin', 'viewer@example.com')));
    await assertFails(setDoc(doc(user(), 'roles/someone@example.com'), role('admin', 'someone@example.com')));
    await assertFails(updateDoc(doc(admin(), 'roles/viewer@example.com'), { role: 'superadmin' }));
  });
  test('the root super admin cannot be removed or changed from the site', async () => {
    await assertFails(setDoc(doc(sup(), `roles/${ROOT}`), role('admin', 'boss@example.com')));
  });
  test('admins can read site data for the dashboard; participants cannot list it', async () => {
    await assertSucceeds(getDocs(collection(admin(), 'users')));
    await assertSucceeds(getDocs(collection(admin(), 'registrations')));
    await assertSucceeds(getDocs(collection(admin(), 'teams')));
    await assertFails(getDocs(collection(user(), 'users')));
  });
});

describe('activity log', () => {
  const entry = (uid, email) => ({ actorUid: uid, actorEmail: email, action: 'test', target: 'x', details: {}, at: serverTimestamp() });
  test('admins add entries in their own name only; nobody edits or deletes them', async () => {
    const ref = await assertSucceeds(addDoc(collection(sup(), 'auditLogs'), entry('sup', 'boss@example.com')));
    await assertFails(addDoc(collection(sup(), 'auditLogs'), entry('sup', ROOT)));
    await assertFails(addDoc(collection(user(), 'auditLogs'), entry('u1', 'someone@example.com')));
    await assertFails(updateDoc(doc(root(), 'auditLogs', ref.id), { action: 'changed' }));
    await assertFails(deleteDoc(doc(root(), 'auditLogs', ref.id)));
  });
  test('only super admins read the log', async () => {
    await assertSucceeds(getDocs(collection(root(), 'auditLogs')));
    await assertFails(getDocs(collection(admin(), 'auditLogs')));
  });
});
