/**
 * Event registration on the live site: the registry (lib/fest/registry.js) on
 * the real database, plus live views of whether registration is open, your
 * registrations and your teams. Used only by store/useRegs.js.
 *
 * The event table (time blocks, team sizes) is built from the same schedule and
 * the same code as the table written into firestore.rules.
 */
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './client';
import { createRegistry } from '../fest/registry';
import { EVENT_TABLE } from '../fest/eventTable';
import { CATALOG } from '../registration/catalog';

export const registry = createRegistry({ db, events: EVENT_TABLE, nameOf: (slug) => CATALOG[slug]?.name ?? slug });

/** Follow: registration open/closed, your registrations, and each of your teams. Returns a stop function. */
export function watchRegistrations(uid, onChange, onError) {
  const state = { open: false, regs: [], teams: {}, loaded: { open: false, regs: false } };
  const teamSubs = new Map();
  const emit = () => onChange({ open: state.open, regs: state.regs, teams: { ...state.teams }, loaded: state.loaded.open && state.loaded.regs });

  const stopOpen = onSnapshot(
    doc(db, 'settings', 'registration'),
    (s) => {
      state.open = s.exists() && s.data().open === true;
      state.loaded.open = true;
      emit();
    },
    onError,
  );
  const stopRegs = onSnapshot(
    query(collection(db, 'registrations'), where('uid', '==', uid)),
    (snap) => {
      state.regs = snap.docs.map((d) => d.data());
      state.loaded.regs = true;
      const ids = new Set(state.regs.filter((r) => r.teamId).map((r) => r.teamId));
      for (const [id, stop] of teamSubs)
        if (!ids.has(id)) {
          stop();
          teamSubs.delete(id);
          delete state.teams[id];
        }
      for (const id of ids)
        if (!teamSubs.has(id))
          teamSubs.set(
            id,
            onSnapshot(
              doc(db, 'teams', id),
              (t) => {
                if (t.exists()) state.teams[id] = t.data();
                else delete state.teams[id];
                emit();
              },
              () => {
                delete state.teams[id];
                emit();
              },
            ),
          );
      emit();
    },
    onError,
  );
  return () => {
    stopOpen();
    stopRegs();
    for (const stop of teamSubs.values()) stop();
    teamSubs.clear();
  };
}
