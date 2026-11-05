import { useEffect } from 'react';
import Frame from '../ui/Frame';
import Star from '../ui/Star';
import { useSite } from '../../store/useSite';

/** Shown over the whole website while a super admin has maintenance mode on. */
export default function MaintenancePage() {
  const on = useSite((s) => s.maintenance);
  const message = useSite((s) => s.message);
  useEffect(() => {
    document.documentElement.classList.toggle('is-maintenance', on);
  }, [on]);
  if (!on) return null;
  return (
    <div className="mnt" role="alertdialog" aria-modal="true" aria-labelledby="mnt-title">
      <section className="cd-panel mnt__card">
        <Frame />
        <p className="mnt__kicker">
          <Star className="h-2 w-2" /> CUBYC — FEST 2027 <Star className="h-2 w-2" />
        </p>
        <h1 id="mnt-title" className="mnt__title">
          We’ll be right back
        </h1>
        <p className="mnt__body">{message || 'We’re making a few improvements. The site will be back shortly.'}</p>
        <p className="mnt__foot">CHRIST (Deemed to be University), Bangalore Yeshwanthpur Campus</p>
      </section>
    </div>
  );
}
