import { create } from 'zustand';

/*
 * Who is signed in, their profile and their fest pass. A STAND-IN until the
 * backend is connected: screens only call these actions and read `user`, so
 * swapping this file for the real Google sign-in and payment check leaves every
 * screen untouched.
 *
 * Every participant gets their CUBYC ID the moment they sign in. With it they
 * can pick events and build teams straight away, and pay the ₹500 fest pass on
 * the bank portal whenever they're ready.
 *
 * Fest pass: status 'none' (not paid yet) → 'pending' (payment details sent,
 * the college is checking them) → 'verified' (payment confirmed: the
 * registration is valid and the festival ticket is issued).
 *
 * Until the backend is connected, "Continue with Google" signs in a sample
 * participant (kept only in this browser) on the live site too, so the
 * dashboard can be opened and tried. Set PREVIEW_SIGN_IN to false to show
 * "sign-in opens soon" instead. Payments are never marked verified on the live
 * site — the "Mark as verified" preview button exists only in npm run dev.
 */

/** Stand-in sign-in on the live site, until the real Google sign-in is wired up. */
const PREVIEW_SIGN_IN = true;

const KEY = 'cubyc-demo-user';
// No look-alike characters (0/O, 1/I/L), so an ID read aloud is typed right.
const ID_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const randomCode = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => ID_CHARS[b % ID_CHARS.length]).join('');

/** A participant's CUBYC ID, e.g. CB27-7K4Q. (The real one will be issued by the server.) */
export const makeCubycId = () => `CB27-${randomCode(4)}`;

const save = (user) => {
  try {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: kept for this visit only */
  }
};
const load = () => {
  try {
    const user = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    // Accounts saved before IDs were issued at sign-in get theirs now.
    if (user && !user.cubycId) {
      user.cubycId = makeCubycId();
      save(user);
    }
    return user;
  } catch {
    return null;
  }
};

export const useAuth = create((set, get) => ({
  user: load(),
  status: 'idle', // idle | signing-in | error
  error: null,

  signInWithGoogle: async () => {
    set({ status: 'signing-in', error: null });
    await new Promise((r) => setTimeout(r, 1200));
    if (!import.meta.env.DEV && !PREVIEW_SIGN_IN) {
      set({ status: 'error', error: 'not_open' });
      return null;
    }
    const user = {
      name: 'Demo Participant',
      email: 'demo.participant@gmail.com',
      cubycId: makeCubycId(),
      profile: {},
      pass: { status: 'none' },
    };
    save(user);
    set({ user, status: 'idle' });
    return user;
  },

  /** Save the registration form. */
  saveProfile: (profile) => {
    const user = { ...get().user, name: profile.name || get().user.name, profile: { ...get().user.profile, ...profile } };
    save(user);
    set({ user });
  },

  /**
   * The participant has paid on the bank portal and sends the details:
   * { utr, receipt } — the transaction ID and/or the name of the receipt file
   * (PDF or screenshot) they attached. The college checks them in the backend.
   */
  submitPayment: ({ utr = '', receipt = '' }) => {
    const u = get().user;
    const user = { ...u, pass: { ...u.pass, status: 'pending', utr, receipt, submittedAt: new Date().toISOString() } };
    save(user);
    set({ user });
  },

  /** The college confirms the payment: the registration is valid and the ticket issued. (Admin-side in the real system.) */
  verifyPass: () => {
    const u = get().user;
    const user = { ...u, pass: { ...u.pass, status: 'verified', ticket: u.pass.ticket ?? `TKT-${randomCode(6)}`, verifiedAt: new Date().toISOString() } };
    save(user);
    set({ user });
  },

  signOut: () => {
    save(null);
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
