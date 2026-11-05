import { useEffect } from 'react';
import { ANNOUNCEMENTS } from '../../config/announcements';
import { BACKEND } from '../../store/useAuth';
import { useSite } from '../../store/useSite';

/** Published announcements from the admin portal; the built-in notes until the first one is published. */
export function useAnnouncementList() {
  const live = useSite((s) => s.announcements);
  const watch = useSite((s) => s.watchAnnouncements);
  useEffect(() => {
    watch();
  }, [watch]);
  return BACKEND && live && live.length ? live : ANNOUNCEMENTS;
}
