/**
 * The participant's account on Firebase (Spark plan — no server code; the
 * Firestore rules check every write): Google sign-in, creating the account and
 * its permanent CUBYC ID on first sign-in, the live account record, roles, and
 * saving the profile. Used only by store/useAuth.js.
 */
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './client';
import { isProfileComplete } from '../fest/profile';

// The root super admin(s) — the same list is built into firestore.rules (the rules decide; this only labels the UI).
const ROOT_SUPERADMINS = ['chiranjeevi.p@bcah.christuniversity.in'];

// No look-alike characters (0/O, 1/I/L), so an ID read aloud is typed right.
const ID_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const newCubycId = () => {
  const bytes = crypto.getRandomValues(new Uint32Array(6));
  return `CB27-${[...bytes].map((b) => ID_CHARS[b % ID_CHARS.length]).join('')}`;
};

/**
 * First sign-in: create the account and claim a fresh CUBYC ID in one
 * transaction (the rules accept the two only together). Later sign-ins: nothing.
 */
async function ensureAccount(fbUser) {
  const userRef = doc(db, 'users', fbUser.uid);
  if ((await getDoc(userRef)).exists()) return;
  const email = fbUser.email.toLowerCase();
  const profile = { name: String(fbUser.displayName ?? '').slice(0, 80) };
  for (let attempt = 0; attempt < 6; attempt++) {
    const cubycId = newCubycId();
    const idRef = doc(db, 'cubycIds', cubycId);
    try {
      const created = await runTransaction(db, async (tx) => {
        if ((await tx.get(userRef)).exists()) return true; // created meanwhile (another tab)
        if ((await tx.get(idRef)).exists()) return false; // ID taken — try another
        tx.set(idRef, { uid: fbUser.uid, createdAt: serverTimestamp() });
        tx.set(userRef, {
          uid: fbUser.uid,
          email,
          cubycId,
          profile,
          profileComplete: isProfileComplete(profile),
          status: 'active',
          pass: { status: 'none' },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return true;
      });
      if (created) return;
    } catch (err) {
      // Someone else's ID: reading it is refused — just pick another.
      if (err?.code !== 'permission-denied') throw err;
    }
  }
  throw Object.assign(new Error('Could not create your account. Please try again.'), { code: 'cubyc/no-id' });
}

async function roleOf(email) {
  if (ROOT_SUPERADMINS.includes(email)) return 'superadmin';
  const snap = await getDoc(doc(db, 'roles', email));
  return snap.exists() ? snap.data().role : null;
}

/** The account record → the shape the dashboard uses. */
const toUser = (fbUser, data, role) => ({
  uid: fbUser.uid,
  email: data.email,
  cubycId: data.cubycId,
  name: data.profile?.name || fbUser.displayName || data.email,
  profile: data.profile ?? {},
  profileComplete: data.profileComplete === true,
  status: data.status,
  pass: data.pass ?? { status: 'none' },
  role,
});

/**
 * Follow the signed-in account. `onChange(user | null, error?)` is called once
 * the state is known and on every change. Returns a function to stop.
 */
export function watchAccount(onChange) {
  let stopDoc = () => {};
  const stopAuth = onAuthStateChanged(auth, async (fbUser) => {
    stopDoc();
    stopDoc = () => {};
    if (!fbUser) return onChange(null);
    try {
      const google = fbUser.providerData.some((p) => p.providerId === 'google.com');
      if (!google || !fbUser.emailVerified || !fbUser.email) throw Object.assign(new Error('Sign in with a verified Google account.'), { code: 'cubyc/not-google' });
      await ensureAccount(fbUser);
      const role = await roleOf(fbUser.email.toLowerCase());
      stopDoc = onSnapshot(
        doc(db, 'users', fbUser.uid),
        (snap) => snap.exists() && onChange(toUser(fbUser, snap.data(), role)),
        (err) => onChange(null, err),
      );
    } catch (err) {
      onChange(null, err);
    }
    return undefined;
  });
  return () => {
    stopDoc();
    stopAuth();
  };
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(auth, provider);
}

/** Save the profile (the only part of the account a participant can change; checked by the rules). */
export async function saveProfile(uid, profile) {
  await updateDoc(doc(db, 'users', uid), { profile, profileComplete: isProfileComplete(profile), updatedAt: serverTimestamp() });
}

export const signOut = () => fbSignOut(auth);
