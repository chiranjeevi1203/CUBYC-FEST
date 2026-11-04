import { create } from 'zustand';
import { REGISTRATION_OPEN } from '../config/features';

/*
 * Who is signed in, their account and their fest pass. Screens only read `user`
 * and call these actions, so they don't care where the account lives:
 *
 *   BACKEND (registration open + VITE_FIREBASE_PROJECT_ID set)
 *     Firebase: Google sign-in, the account and its permanent CUBYC ID created by
 *     the server, the profile saved to Firestore (checked by the security rules).
 *     The Firebase code is loaded on demand (lib/firebase), never on the public site
 *     while registration is closed.
 *
 *   otherwise (plain `npm run dev`)
 *     an offline stand-in: a sample participant kept in this browser only.
 *
 * user: { uid, name, email, cubycId, profile, profileComplete, status, pass, role }
 * ready: false until the sign-in state is known (avoid flashing "signed out").
 */

export const BACKEND = REGISTRATION_OPEN && Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID);
const loadAccount = () => (BACKEND ? import('../lib/firebase/account') : Promise.reject(new Error('no backend')));

// No look-alike characters (0/O, 1/I/L), so an ID read aloud is typed right.
const ID_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const randomCode = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => ID_CHARS[b % ID_CHARS.length]).join('');

/* ---------- offline stand-in (development only) ---------- */
const KEY = 'cubyc-demo-user';
const save = (user) => {
  try {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: kept for this visit only */
  }
};
const loadLocal = () => {
  if (BACKEND) return null;
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
};

/** Friendly words for sign-in and saving errors. */
function explain(err) {
  const code = err?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'cancelled';
  if (code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.';
  if (code === 'auth/network-request-failed' || code === 'functions/unavailable') return 'No connection. Check your internet and try again.';
  if (code === 'permission-denied' || code === 'functions/permission-denied') return 'That isn’t allowed for your account.';
  return 'Something went wrong. Please try again.';
}

let started = false;

export const useAuth = create((set, get) => ({
  user: loadLocal(),
  ready: !BACKEND,
  status: 'idle', // idle | signing-in | error
  error: null,

  /** Start following the signed-in account (Firebase). Called once by the app. */
  init: async () => {
    if (!BACKEND || started) return;
    started = true;
    const { watchAccount } = await loadAccount();
    watchAccount((user, err) => set({ user, ready: true, ...(err ? { status: 'error', error: explain(err) } : {}) }));
  },

  /** Google sign-in. Resolves with the account once it is ready (or null). */
  signInWithGoogle: async () => {
    set({ status: 'signing-in', error: null });
    if (!BACKEND) {
      await new Promise((r) => setTimeout(r, 900));
      if (!import.meta.env.DEV) {
        set({ status: 'error', error: 'not_open' });
        return null;
      }
      const user = { name: 'Demo Participant', email: 'demo.participant@gmail.com', cubycId: `CB27-${randomCode(6)}`, profile: {}, pass: { status: 'none' }, status: 'active' };
      save(user);
      set({ user, status: 'idle' });
      return user;
    }
    try {
      get().init();
      const account = await loadAccount();
      await account.signInWithGoogle();
      // Wait for the server to set up the account (first sign-in) and the record to arrive.
      const user = await new Promise((resolve) => {
        if (get().user) return resolve(get().user);
        const stop = useAuth.subscribe((s) => {
          if (s.user || s.status === 'error') {
            stop();
            resolve(s.user);
          }
        });
      });
      set({ status: user ? 'idle' : 'error' });
      return user;
    } catch (err) {
      const msg = explain(err);
      set({ status: msg === 'cancelled' ? 'idle' : 'error', error: msg === 'cancelled' ? null : msg });
      return null;
    }
  },

  /** Save the details form. Throws a friendly message if it can't be saved. */
  saveProfile: async (profile) => {
    const u = get().user;
    if (!BACKEND) {
      const user = { ...u, name: profile.name || u.name, profile: { ...u.profile, ...profile } };
      save(user);
      set({ user });
      return;
    }
    try {
      const { saveProfile } = await loadAccount();
      await saveProfile(u.uid, profile);
    } catch (err) {
      throw new Error(explain(err));
    }
  },

  /* Payments: offline stand-in only for now (the real payment flow comes later). */
  submitPayment: ({ utr = '', receipt = '' }) => {
    if (BACKEND) return;
    const u = get().user;
    const user = { ...u, pass: { ...u.pass, status: 'pending', utr, receipt, submittedAt: new Date().toISOString() } };
    save(user);
    set({ user });
  },
  verifyPass: () => {
    if (BACKEND) return;
    const u = get().user;
    const user = { ...u, pass: { ...u.pass, status: 'verified', ticket: u.pass.ticket ?? `TKT-${randomCode(6)}`, verifiedAt: new Date().toISOString() } };
    save(user);
    set({ user });
  },

  signOut: async () => {
    if (BACKEND) {
      const { signOut } = await loadAccount();
      await signOut();
    } else save(null);
    set({ user: null, status: 'idle', error: null });
  },
}));

/** "Demo Participant" → "DP" */
export const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export { randomCode };
