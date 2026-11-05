import { useEffect, useRef, useState } from 'react';
import SiteNav from '../ui/SiteNav';
import Frame from '../ui/Frame';
import Star from '../ui/Star';
import { useMountedWhile, usePageShell } from '../about/usePageShell';
import { prefersReducedMotion } from '../../config/experience';
import { useExperience } from '../../store/useExperience';
import { initialsOf, useAuth } from '../../store/useAuth';
import { loginForRegister, takeAfterLogin } from '../../lib/registerNav';
import { go } from '../../lib/route';

/*
 * Sign-in (/login): a frosted-glass card, in the landing page's gold frame, in
 * the middle of a galaxy. The Milky Way crosses the sky, stars twinkle and
 * drift with the pointer (near stars more than far ones), shooting stars streak
 * past, and a click on empty sky launches a shooting star from that spot. Google is the only way in.
 */

/* ---------- the sky ---------- */

function useSky(canvasRef, launchRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = prefersReducedMotion();
    let seed = 1337;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
    // Three depths: far stars barely move with the pointer, near ones move most.
    const stars = Array.from({ length: 1400 }, (_, i) => {
      const inBand = i % 5 < 3;
      const u = rand();
      const bright = rand() < 0.035;
      return {
        x: inBand ? u : rand(),
        y: inBand ? 0.82 - u * 0.62 + gauss() * 0.12 : rand(),
        depth: rand() < 0.7 ? 0.25 : rand() < 0.7 ? 0.6 : 1,
        r: bright ? 0.9 + rand() * 0.7 : 0.2 + rand() * (inBand ? 0.45 : 0.6),
        a: bright ? 0.85 + rand() * 0.15 : 0.2 + rand() * 0.55,
        tw: 0.4 + rand() * 2.4,
        ph: rand() * Math.PI * 2,
        tint: rand() < 0.14 ? '#ffe3b8' : rand() < 0.22 ? '#cfdcff' : '#ffffff',
      };
    });
    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const pointer = { x: 0, y: 0, cx: 0, cy: 0 };
    const onMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const meteors = [];
    let nextMeteor = 1.5;
    // A click on empty sky launches a shooting star from there.
    launchRef.current = (x, y) => meteors.push({ x: x + 40, y: y - 20, life: 0, len: 150, dur: 0.7, bright: true });

    let t = 0;
    let last = performance.now();
    let raf = 0;
    const draw = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      t += dt;
      pointer.cx += (pointer.x - pointer.cx) * 0.05;
      pointer.cy += (pointer.y - pointer.cy) * 0.05;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const ox = reduced ? 0 : -pointer.cx * 18 * s.depth;
        const oy = reduced ? 0 : -pointer.cy * 12 * s.depth;
        ctx.globalAlpha = s.a * (reduced ? 1 : 0.6 + 0.4 * Math.sin(t * s.tw + s.ph));
        ctx.fillStyle = s.tint;
        ctx.beginPath();
        ctx.arc(s.x * w + ox, s.y * h + oy, s.r * (0.8 + s.depth * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduced) {
        nextMeteor -= dt;
        if (nextMeteor <= 0) {
          meteors.push({ x: (0.3 + Math.random() * 0.7) * w, y: Math.random() * h * 0.45, life: 0, len: 100 + Math.random() * 100, dur: 0.75 });
          nextMeteor = 2.5 + Math.random() * 4;
        }
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          m.life += dt;
          const k = m.life / m.dur;
          const hx = m.x - k * 320;
          const hy = m.y + k * 150;
          const g = ctx.createLinearGradient(hx, hy, hx + m.len, hy - m.len * 0.47);
          g.addColorStop(0, m.bright ? 'rgba(255,236,200,1)' : 'rgba(255,246,228,0.95)');
          g.addColorStop(1, 'rgba(255,246,228,0)');
          ctx.globalAlpha = Math.sin(Math.min(k, 1) * Math.PI);
          ctx.strokeStyle = g;
          ctx.lineWidth = m.bright ? 1.8 : 1.3;
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx + m.len, hy - m.len * 0.47);
          ctx.stroke();
          if (k >= 1) meteors.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
      launchRef.current = null;
    };
  }, [canvasRef, launchRef]);
}

/* ---------- the card ---------- */

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="lg-google__mark" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function Card({ cardRef }) {
  const { user, status, error, signInWithGoogle, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const busy = status === 'signing-in';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(user.cubycId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the ID is on screen to copy by hand */
    }
  };

  return (
    <section ref={cardRef} className={`lg-card ${busy ? 'is-busy' : ''}`} aria-labelledby="lg-title" data-no-orbit>
      <Frame />
      <span className="lg-card__glare" aria-hidden="true" />
      <span className="lg-card__scan" aria-hidden="true" />
      <p className="lg-card__kicker">
        <Star className="h-2 w-2 text-gold-400/80" />
        Mission access
        <Star className="h-2 w-2 text-gold-400/80" />
      </p>

      {user ? (
        <>
          <h1 id="lg-title" className="lg-card__title">
            Welcome <span className="text-gold-gradient">aboard</span>
          </h1>
          <div className="lg-user">
            <span className="lg-user__avatar" aria-hidden="true">
              {initialsOf(user.name)}
            </span>
            <span className="min-w-0">
              <b className="lg-user__name">{user.name}</b>
              <span className="lg-user__email">{user.email}</span>
            </span>
          </div>
          {user.cubycId ? (
            <div className="lg-id">
              <span>
                <small>Your CUBYC ID</small>
                <b>{user.cubycId}</b>
              </span>
              <button type="button" className="lg-id__copy" onClick={copy}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          ) : (
            <p className="lg-card__sub">Your CUBYC ID is waiting in your dashboard.</p>
          )}
          <div className="lg-actions">
            <a href="/dashboard" className="lg-btn lg-btn--main">
              Dashboard
            </a>
            <button type="button" className="lg-btn" onClick={signOut}>
              Sign out
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 id="lg-title" className="lg-card__title">
            Sign in to <span className="text-gold-gradient">CUBYC</span>
          </h1>
          {loginForRegister() ? (
            <p className="lg-card__sub lg-card__note" role="note">Please log in first to register for events. You’ll go straight to them after signing in.</p>
          ) : (
            <p className="lg-card__sub">Register for events, build your team and track every registration in one place.</p>
          )}
          <button
            type="button"
            className="lg-google"
            onClick={async () => {
              // Signed in: straight on to the dashboard.
              // Signed in: on to the dashboard (its Events, if a Register button sent you here).
              if (await signInWithGoogle()) go(takeAfterLogin() ?? '/dashboard');
            }}
            disabled={busy}
            aria-busy={busy}
          >
            <span className="lg-google__orbit" aria-hidden="true" />
            {busy ? <span className="lg-spinner" aria-hidden="true" /> : <GoogleMark />}
            <span>{busy ? 'Signing in…' : 'Continue with Google'}</span>
          </button>
          <p className="lg-status" role="status" aria-live="polite">
            {error === 'not_open' ? 'Sign-in opens with registrations — very soon. Watch this space.' : error || ''}
          </p>
        </>
      )}
    </section>
  );
}

/* ---------- the page ---------- */

function LoginView({ open, onGone }) {
  const canvasRef = useRef(null);
  const cardRef = useRef(null);
  const launchRef = useRef(null);
  const rootRef = usePageShell({
    open,
    onGone,
    leaveHash: '#home',
    onEnter: (tl) => {
      tl.fromTo(cardRef.current, { autoAlpha: 0, y: 24, filter: 'blur(10px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'expo.out', clearProps: 'filter,transform' }, 0.25);
    },
  });
  useSky(canvasRef, launchRef);

  // The card tilts toward the pointer and a soft highlight follows it across the glass.
  useEffect(() => {
    const root = rootRef.current;
    const card = cardRef.current;
    if (!root || !card || prefersReducedMotion()) return undefined;
    const onMove = (e) => {
      root.style.setProperty('--px', ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
      root.style.setProperty('--py', ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      const r = card.getBoundingClientRect();
      card.style.setProperty('--gx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      card.style.setProperty('--gy', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [rootRef]);

  // A click on empty sky (not the card, not the navbar) launches a shooting star.
  const onSkyClick = (e) => {
    if (e.target instanceof Element && e.target.closest('.lg-card, .nv, a, button')) return;
    launchRef.current?.(e.clientX, e.clientY);
  };

  return (
    <div ref={rootRef} className="lg-page fixed inset-0 z-40 overflow-y-auto overflow-x-hidden text-[#f4f1ea]" data-no-orbit onClick={onSkyClick}>
      <div className="lg-space" aria-hidden="true">
        <span className="lg-space__milkyway" />
        <span className="lg-space__glow" />
        <canvas ref={canvasRef} className="lg-sky" />
      </div>
      <SiteNav />
      <main className="lg-main">
        <Card cardRef={cardRef} />
        <p className="lg-hint" aria-hidden="true">
          Tap the sky to launch a shooting star
        </p>
      </main>
    </div>
  );
}

/** The sign-in page (/login). */
export default function LoginPage() {
  const open = useExperience((s) => s.loginOpen);
  const [mounted, onGone] = useMountedWhile(open);
  if (!mounted) return null;
  return <LoginView open={open} onGone={onGone} />;
}
