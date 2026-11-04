import { create } from 'zustand';
import { BACKEND } from './useAuth';

/*
 * The live site's event registrations (BACKEND only): whether registration is
 * open, your registrations and teams (kept up to date as they change), and the
 * actions — register, withdraw, create / join / dismantle a team.
 *
 * Every action resolves to { ok: true, … } or { ok: false, error } with words
 * meant for people. The database rules check everything again.
 *
 * regs:  [{ slug, kind: 'individual' | 'team', teamId? }]
 * teams: { [teamId]: { id, slug, name, leaderUid, members: [{ uid, cubycId, name }], memberUids, status } }
 */

const load = () => import('../lib/firebase/events');

function explain(err, open) {
  if (err?.name === 'RegistryError') return err.message;
  const code = err?.code ?? '';
  if (code === 'permission-denied') return open ? 'That isn’t allowed. Make sure your details are complete, then try again.' : 'Registration is closed right now.';
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'No connection. Check your internet and try again.';
  if (code === 'aborted') return 'Lots of people are registering right now. Please try again.';
  return 'Something went wrong. Please try again.';
}

let stop = null;
let watching = null;

export const useRegs = create((set, get) => ({
  loaded: false,
  open: false,
  regs: [],
  teams: {},
  error: null,

  /** Follow this account's registrations (call again with null on sign-out). */
  watch: async (uid) => {
    if (!BACKEND || watching === uid) return;
    stop?.();
    stop = null;
    watching = uid;
    set({ loaded: false, open: false, regs: [], teams: {}, error: null });
    if (!uid) return;
    const { watchRegistrations } = await load();
    if (watching !== uid) return;
    stop = watchRegistrations(
      uid,
      (s) => set({ ...s, error: null }),
      () => set({ loaded: true, error: 'Couldn’t load your registrations. Check your connection and refresh.' }),
    );
  },

  run: async (fn) => {
    try {
      const { registry } = await load();
      const value = await fn(registry);
      return { ok: true, value };
    } catch (err) {
      return { ok: false, error: explain(err, get().open), code: err?.code, clashWith: err?.clashWith };
    }
  },

  register: (user, slug) => get().run((r) => r.registerIndividual(user, slug)),
  withdraw: (user, slug) => get().run((r) => r.withdraw(user, slug)),
  createTeam: (user, slug, name) => get().run((r) => r.createTeam(user, slug, name)),
  findTeam: (code) => get().run((r) => r.findTeam(code)),
  joinTeam: (user, code) => get().run((r) => r.joinTeam(user, code)),
  dismantle: (user, teamId) => get().run((r) => r.dismantleTeam(user, teamId)),
}));
