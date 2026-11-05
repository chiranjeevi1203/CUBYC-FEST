import { create } from 'zustand';
import { BACKEND } from './useAuth';

/*
 * Live site settings the public website obeys, set from the admin portal:
 *   maintenance  true → every visitor sees the maintenance message
 * Announcements (published ones) are followed only while the dashboard is open.
 * If the database can't be reached the site simply stays up (fails open).
 */
let started = false;
let stopAnn = null;

export const useSite = create((set) => ({
  maintenance: false,
  message: '',
  announcements: null, // null until loaded; [] = none published

  init: async () => {
    if (!BACKEND || started) return;
    started = true;
    try {
      const [{ db }, { doc, onSnapshot }] = await Promise.all([import('../lib/firebase/client'), import('firebase/firestore')]);
      onSnapshot(
        doc(db, 'settings', 'site'),
        (s) => set({ maintenance: s.exists() && s.data().maintenance === true, message: s.exists() ? String(s.data().message ?? '') : '' }),
        () => set({ maintenance: false }),
      );
    } catch {
      /* stay up */
    }
  },

  /** Follow published announcements (dashboard). Returns a stop function. */
  watchAnnouncements: async () => {
    if (!BACKEND || stopAnn) return;
    try {
      const [{ db }, { collection, onSnapshot, query, where }] = await Promise.all([import('../lib/firebase/client'), import('firebase/firestore')]);
      stopAnn = onSnapshot(
        query(collection(db, 'announcements'), where('published', '==', true)),
        (snap) => set({ announcements: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }),
        () => set({ announcements: [] }),
      );
    } catch {
      set({ announcements: [] });
    }
  },
}));
