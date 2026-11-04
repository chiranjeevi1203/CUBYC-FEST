/**
 * Firestore security rules (Spark plan — the rules are the only guard),
 * tested against the local emulator:  npm run test:backend
 * Every test tries something a participant, an admin or an attacker might do.
 */
import { after, before, beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

const ROOT = 'chiranjeevi.p@bcah.christuniversity.in';
let env;
const google = (email, extra = {}) => ({ email, email_verified: true, firebase: { sign_in_provider: 'google.com' }, ...extra });
const as = (uid, token) => env.authenticatedContext(uid, token).firestore();
const asAlice = () => as('alice', google('alice@example.com'));

const goodProfile = {
  name: 'Alice Rao',
  gender: 'Female',
  dob: '2004-05-17',
  phone: '9876543210',
  whatsapp: '',
  college: 'CHRIST (Deemed to be University)',
  department: 'Psychology',
  course: 'BSc',
  year: '2nd year',
  collegeId: '2341234',
  city: 'Bangalore',
  state: 'Karnataka',
  emergencyName: 'Parent',
  emergencyPhone: '9123456780',
  agree: true,
};
const newAccount = (uid, email, cubycId, over = {}) => ({
  uid,
  email,
  cubycId,
  profile: { name: 'New' },
  profileComplete: false,
  status: 'active',
  pass: { status: 'none' },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...over,
});
/** First sign-in, as the website does it: account + CUBYC ID in one write. */
function signUp(db, uid, email, cubycId, over = {}, idOver = {}) {
  const b = writeBatch(db);
  b.set(doc(db, 'cubycIds', cubycId), { uid, createdAt: serverTimestamp(), ...idOver });
  b.set(doc(db, 'users', uid), newAccount(uid, email, cubycId, over));
  return b.commit();
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cubyc',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(() => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const seed = (uid, email, id) => Promise.all([
      setDoc(doc(db, 'users', uid), { ...newAccount(uid, email, id), createdAt: new Date(), updatedAt: new Date() }),
      setDoc(doc(db, 'cubycIds', id), { uid, createdAt: new Date() }),
    ]);
    await seed('alice', 'alice@example.com', 'CB27-AAAAAA');
    await seed('bob', 'bob@example.com', 'CB27-BBBBBB');
    await setDoc(doc(db, 'roles/adm@example.com'), { role: 'admin', depts: ['venus'], grantedBy: ROOT, grantedAt: new Date() });
    await setDoc(doc(db, 'roles/sup@example.com'), { role: 'superadmin', depts: [], grantedBy: ROOT, grantedAt: new Date() });
    await setDoc(doc(db, 'auditLogs/x'), { action: 'test' });
  });
});

describe('signing up', () => {
  const carol = () => as('carol', google('carol@example.com'));
  test('a new participant can create their account with a fresh CUBYC ID', async () => {
    await assertSucceeds(signUp(carol(), 'carol', 'carol@example.com', 'CB27-CCCCCC'));
  });
  test('the email must be your own verified Google email', async () => {
    await assertFails(signUp(carol(), 'carol', 'someone@else.com', 'CB27-CCCCCC'));
  });
  test('an ID already taken cannot be claimed', async () => {
    await assertFails(signUp(carol(), 'carol', 'carol@example.com', 'CB27-AAAAAA'));
  });
  test('the ID must be a valid CUBYC ID', async () => {
    await assertFails(signUp(carol(), 'carol', 'carol@example.com', 'CB27-0000'));
    await assertFails(signUp(carol(), 'carol', 'carol@example.com', 'HACKED'));
  });
  test('an account cannot be created without claiming its ID (and vice versa)', async () => {
    await assertFails(setDoc(doc(carol(), 'users/carol'), newAccount('carol', 'carol@example.com', 'CB27-CCCCCC')));
    await assertFails(setDoc(doc(carol(), 'cubycIds/CB27-CCCCCC'), { uid: 'carol', createdAt: serverTimestamp() }));
  });
  test('you cannot claim a second ID once you have an account', async () => {
    await assertFails(setDoc(doc(asAlice(), 'cubycIds/CB27-ZZZZZZ'), { uid: 'alice', createdAt: serverTimestamp() }));
  });
  test("you cannot create someone else's account", async () => {
    await assertFails(signUp(carol(), 'dave', 'carol@example.com', 'CB27-DDDDDD'));
  });
  for (const [label, over] of [
    ['a suspended-or-other status', { status: 'vip' }],
    ['a paid pass', { pass: { status: 'verified' } }],
    ['a false "profile complete"', { profileComplete: true }],
    ['an extra field', { role: 'superadmin' }],
    ['a made-up time', { createdAt: new Date(0) }],
  ]) {
    test(`a new account with ${label} is refused`, async () => {
      await assertFails(signUp(carol(), 'carol', 'carol@example.com', 'CB27-CCCCCC', over));
    });
  }
  test('only Google sign-in counts', async () => {
    const db = as('carol', { email: 'carol@example.com', email_verified: true, firebase: { sign_in_provider: 'password' } });
    await assertFails(signUp(db, 'carol', 'carol@example.com', 'CB27-CCCCCC'));
  });
  test('an unverified email is refused', async () => {
    await assertFails(signUp(as('carol', google('carol@example.com', { email_verified: false })), 'carol', 'carol@example.com', 'CB27-CCCCCC'));
  });
  test('IDs cannot be listed or looked up (someone else’s)', async () => {
    await assertFails(getDoc(doc(asAlice(), 'cubycIds/CB27-BBBBBB')));
    await assertFails(getDocs(collection(asAlice(), 'cubycIds')));
    await assertSucceeds(getDoc(doc(asAlice(), 'cubycIds/CB27-AAAAAA')));
  });
});

describe('participants', () => {
  test('signed-out visitors cannot read any account', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice')));
  });
  test('you can read your own account, not anyone else’s', async () => {
    await assertSucceeds(getDoc(doc(asAlice(), 'users/alice')));
    await assertFails(getDoc(doc(asAlice(), 'users/bob')));
    await assertFails(getDocs(collection(asAlice(), 'users')));
  });
  test('you can save a valid, complete profile', async () => {
    await assertSucceeds(updateDoc(doc(asAlice(), 'users/alice'), { profile: goodProfile, profileComplete: true, updatedAt: serverTimestamp() }));
  });
  test('"profile complete" must be true only when it is', async () => {
    const half = { name: 'Alice', agree: true };
    await assertFails(updateDoc(doc(asAlice(), 'users/alice'), { profile: half, profileComplete: true, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(asAlice(), 'users/alice'), { profile: goodProfile, profileComplete: false, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(asAlice(), 'users/alice'), { profile: { ...goodProfile, agree: false }, profileComplete: true, updatedAt: serverTimestamp() }));
  });
  test('saving needs the server time stamp', async () => {
    await assertFails(updateDoc(doc(asAlice(), 'users/alice'), { profile: goodProfile, profileComplete: true, updatedAt: new Date(0) }));
  });
  for (const [field, value] of [
    ['email', 'evil@example.com'],
    ['cubycId', 'CB27-ZZZZZZ'],
    ['status', 'vip'],
    ['pass', { status: 'verified' }],
    ['uid', 'bob'],
    ['role', 'superadmin'],
  ]) {
    test(`you cannot change "${field}"`, async () => {
      await assertFails(updateDoc(doc(asAlice(), 'users/alice'), { [field]: value, updatedAt: serverTimestamp() }));
    });
  }
  test("you cannot edit someone else's profile", async () => {
    await assertFails(updateDoc(doc(asAlice(), 'users/bob'), { profile: goodProfile, profileComplete: true, updatedAt: serverTimestamp() }));
  });
  for (const [label, patch] of [
    ['a bad phone number', { phone: '12345' }],
    ['a bad date of birth', { dob: '17/05/2004' }],
    ['an unknown gender option', { gender: 'Robot' }],
    ['an unknown field', { isAdmin: true }],
    ['an over-long name', { name: 'x'.repeat(81) }],
    ['a non-text field', { college: { $gt: '' } }],
  ]) {
    test(`a profile with ${label} is rejected`, async () => {
      await assertFails(updateDoc(doc(asAlice(), 'users/alice'), { profile: { ...goodProfile, ...patch }, profileComplete: false, updatedAt: serverTimestamp() }));
    });
  }
  test('a suspended account cannot be edited by its owner', async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'users/alice'), { status: 'suspended' }));
    await assertFails(updateDoc(doc(asAlice(), 'users/alice'), { profile: goodProfile, profileComplete: true, updatedAt: serverTimestamp() }));
  });
  test('you cannot delete your account yourself', async () => {
    await assertFails(deleteDoc(doc(asAlice(), 'users/alice')));
  });
  test('you cannot give yourself a role', async () => {
    const r = { role: 'superadmin', depts: [], grantedBy: 'alice@example.com', grantedAt: serverTimestamp() };
    await assertFails(setDoc(doc(asAlice(), 'roles/alice@example.com'), r));
  });
  test('participants cannot read roles of others or the audit log', async () => {
    await assertFails(getDoc(doc(asAlice(), 'roles/adm@example.com')));
    await assertFails(getDoc(doc(asAlice(), 'auditLogs/x')));
  });
  test('any other collection is closed', async () => {
    await assertFails(setDoc(doc(asAlice(), 'payments/p1'), { amount: 0 }));
    await assertFails(getDoc(doc(asAlice(), 'payments/p1')));
  });
});

describe('admins', () => {
  const admin = () => as('adm', google('adm@example.com'));
  const sup = () => as('sup', google('sup@example.com'));
  const root = () => as('root', google(ROOT));
  const grant = (role) => ({ role, depts: [], grantedBy: '', grantedAt: serverTimestamp() });

  test('admins can read every account (read-only)', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'users/bob')));
    await assertSucceeds(getDocs(collection(admin(), 'users')));
  });
  test('admins cannot edit, suspend or delete accounts', async () => {
    await assertFails(updateDoc(doc(admin(), 'users/bob'), { status: 'suspended', updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(admin(), 'users/bob')));
  });
  test('admins cannot grant roles or read the audit log', async () => {
    await assertFails(setDoc(doc(admin(), 'roles/new@example.com'), { ...grant('admin'), grantedBy: 'adm@example.com' }));
    await assertFails(getDoc(doc(admin(), 'auditLogs/x')));
  });
  test('the root super admin can grant and remove access', async () => {
    await assertSucceeds(setDoc(doc(root(), 'roles/new@example.com'), { ...grant('admin'), depts: ['venus'], grantedBy: ROOT }));
    await assertSucceeds(deleteDoc(doc(root(), 'roles/new@example.com')));
  });
  test('a granted super admin can manage access too', async () => {
    await assertSucceeds(setDoc(doc(sup(), 'roles/new@example.com'), { ...grant('superadmin'), grantedBy: 'sup@example.com' }));
  });
  test('grants must be signed by the granter, with a valid role', async () => {
    await assertFails(setDoc(doc(root(), 'roles/new@example.com'), { ...grant('admin'), grantedBy: 'someone@else.com' }));
    await assertFails(setDoc(doc(root(), 'roles/new@example.com'), { ...grant('owner'), grantedBy: ROOT }));
  });
  test('nobody can change their own access or the root super admin’s', async () => {
    await assertFails(deleteDoc(doc(sup(), 'roles/sup@example.com')));
    await assertFails(setDoc(doc(sup(), `roles/${ROOT}`), { ...grant('admin'), grantedBy: 'sup@example.com' }));
  });
  test('super admins can correct a profile and suspend an account', async () => {
    await assertSucceeds(updateDoc(doc(root(), 'users/bob'), { profile: goodProfile, profileComplete: true, status: 'suspended', updatedAt: serverTimestamp() }));
  });
  test('…but even they cannot change an email, CUBYC ID or pass', async () => {
    await assertFails(updateDoc(doc(root(), 'users/bob'), { email: 'x@example.com', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(root(), 'users/bob'), { cubycId: 'CB27-ZZZZZZ', updatedAt: serverTimestamp() }));
  });
  test('the audit log is append-only and signed', async () => {
    const entry = { actorUid: 'root', actorEmail: ROOT, action: 'user.suspend', target: 'users/bob', details: {}, at: serverTimestamp() };
    await assertSucceeds(setDoc(doc(root(), 'auditLogs/a1'), entry));
    await assertFails(setDoc(doc(root(), 'auditLogs/a2'), { ...entry, actorEmail: 'someone@else.com' }));
    await assertFails(updateDoc(doc(root(), 'auditLogs/a1'), { action: 'nothing' }));
    await assertFails(deleteDoc(doc(root(), 'auditLogs/a1')));
  });
  test('the root email only counts with Google sign-in', async () => {
    const fake = as('fake', { email: ROOT, email_verified: true, firebase: { sign_in_provider: 'password' } });
    await assertFails(getDoc(doc(fake, 'users/bob')));
  });
});
