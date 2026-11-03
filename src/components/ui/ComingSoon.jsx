import { useEffect, useRef, useState } from 'react';
import Frame from './Frame';
import Star from './Star';
import { EVENT } from '../../config/experience';
import { COMING_SOON_EVENT } from '../../lib/comingSoon';

const COPY = {
  register: { title: 'Registrations open soon', body: 'We’re putting the finishing touches on registration. Check back soon to sign up for your events.' },
  login: { title: 'Login opens soon', body: 'Participant accounts open together with registrations. Check back soon.' },
};

/**
 * The "Coming soon" notice: a small framed glass card in the theme, shown when a
 * Register or Login button is pressed while registration is closed. Closes on
 * the button, Escape, a click outside, or by itself after a few seconds.
 */
export default function ComingSoon() {
  const [kind, setKind] = useState(null);
  const closeRef = useRef(null);
  const timer = useRef(0);

  useEffect(() => {
    const onShow = (e) => {
      setKind(e.detail?.kind === 'login' ? 'login' : 'register');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setKind(null), 6000);
    };
    window.addEventListener(COMING_SOON_EVENT, onShow);
    return () => {
      window.removeEventListener(COMING_SOON_EVENT, onShow);
      window.clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!kind) return undefined;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      setKind(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [kind]);

  if (!kind) return null;
  const c = COPY[kind];
  return (
    <div className="soon" role="presentation" onClick={() => setKind(null)}>
      <div className="soon__card" role="dialog" aria-modal="true" aria-labelledby="soon-title" onClick={(e) => e.stopPropagation()}>
        <Frame size="sm" />
        <p className="soon__kicker">
          <Star className="h-2 w-2" /> Coming soon <Star className="h-2 w-2" />
        </p>
        <h2 id="soon-title" className="soon__title">
          {c.title}
        </h2>
        <p className="soon__body">{c.body}</p>
        <p className="soon__date">CUBYC Fest 2027 · {EVENT.dateLabel}</p>
        <button ref={closeRef} type="button" className="soon__btn" onClick={() => setKind(null)}>
          Got it
        </button>
      </div>
    </div>
  );
}
