/**
 * The sign-up flow end to end, against the local Auth + Firestore emulators:
 *   npm run test:backend
 * It follows src/lib/firebase/account.js step by step (Google sign-in is
 * simulated by the Auth emulator).
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { GoogleAuthProvider, connectAuthEmulator, getAuth, signInWithCredential } from 'firebase/auth';
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, collection, getFirestore, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT = 'demo-cubyc';
const ROOT = 'chiranjeevi.p@bcah.christuniversity.in';
const ID_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const apps = [];

function client(name) {
  const app = initializeApp({ projectId: PROJECT, apiKey: 'demo-key', authDomain: `${PROJECT}.firebaseapp.com` }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const signIn = (email, sub) => signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub, email, email_verified: true, name: 'Test ' + sub })));
  return { auth, db, signIn };
}

/** The website's first-sign-in step (account.js → ensureAccount). */
async function ensureAccount({ auth, db }, forcedId) {
  const u = auth.currentUser;
  const userRef = doc(db, 'users', u.uid);
  if ((await getDoc(userRef)).exists()) return (await getDoc(userRef)).data().cubycId;
  for (let attempt = 0; attempt < 6; attempt++) {
    const id = attempt === 0 && forcedId ? forcedId : `CB27-${Array.from({ length: 6 }, () => ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)]).join('')}`;
    const idRef = doc(db, 'cubycIds', id);
    try {
      const ok = await runTransaction(db, async (tx) => {
        if ((await tx.get(userRef)).exists()) return true;
        if ((await tx.get(idRef)).exists()) return false;
        tx.set(idRef, { uid: u.uid, createdAt: serverTimestamp() });
        tx.set(userRef, { uid: u.uid, email: u.email.toLowerCase(), cubycId: id, profile: { name: u.displayName }, profileComplete: false, status: 'active', pass: { status: 'none' }, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        return true;
      });
      if (ok) return (await getDoc(userRef)).data().cubycId;
    } catch (e) {
      if (e.code !== 'permission-denied') throw e;
    }
  }
  throw new Error('no id');
}

before(async () => {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
});
after(() => Promise.all(apps.map((a) => deleteApp(a))));

describe('sign-up', () => {
  const asha = client('asha');
  let id;
  test('first Google sign-in creates the account with a 6-character CUBYC ID', async () => {
    await asha.signIn('Asha@Example.com', 'asha');
    id = await ensureAccount(asha);
    assert.match(id, /^CB27-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    const data = (await getDoc(doc(asha.db, 'users', asha.auth.currentUser.uid))).data();
    assert.equal(data.email, 'asha@example.com');
  });
  test('signing in again keeps the same ID', async () => {
    assert.equal(await ensureAccount(asha), id);
  });
  test('an ID that is already taken is skipped for a new one', async () => {
    const ben = client('ben');
    await ben.signIn('ben@example.com', 'ben');
    const benId = await ensureAccount(ben, id); // tries Asha's ID first
    assert.notEqual(benId, id);
    assert.match(benId, /^CB27-/);
  });
  test('saving the details works and is checked', async () => {
    const ref = doc(asha.db, 'users', asha.auth.currentUser.uid);
    const profile = { name: 'Asha K', gender: 'Female', dob: '2005-01-02', phone: '9876543210', college: 'CHRIST', department: 'Commerce', course: 'BCom', year: '1st year', collegeId: '123', city: 'Bangalore', state: 'Karnataka', emergencyName: 'Mom', emergencyPhone: '9123456780', agree: true };
    await updateDoc(ref, { profile, profileComplete: true, updatedAt: serverTimestamp() });
    assert.equal((await getDoc(ref)).data().profileComplete, true);
    await assert.rejects(updateDoc(ref, { cubycId: 'CB27-ZZZZZZ', updatedAt: serverTimestamp() }));
  });
});

describe('roles', () => {
  const root = client('root');
  const fac = client('fac');
  test('the root super admin can see everyone and grant access', async () => {
    await root.signIn(ROOT, 'root');
    await ensureAccount(root);
    assert.ok((await getDocs(collection(root.db, 'users'))).size >= 2);
    await setDoc(doc(root.db, 'roles/faculty@example.com'), { role: 'admin', depts: ['venus'], grantedBy: ROOT, grantedAt: serverTimestamp() });
  });
  test('the new admin can read participants but not change them', async () => {
    await fac.signIn('faculty@example.com', 'fac');
    await ensureAccount(fac);
    const rootUid = root.auth.currentUser.uid;
    assert.ok((await getDoc(doc(fac.db, 'users', rootUid))).exists());
    await assert.rejects(updateDoc(doc(fac.db, 'users', rootUid), { status: 'suspended', updatedAt: serverTimestamp() }));
  });
  test('removing access takes effect immediately', async () => {
    await deleteDoc(doc(root.db, 'roles/faculty@example.com'));
    await assert.rejects(getDoc(doc(fac.db, 'users', root.auth.currentUser.uid)));
  });
});
