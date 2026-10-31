import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../config/experience';

/*
 * The site's scrollbar: a slim gold rail on the right edge with a long-hull
 * spacecraft as the thumb (engine cluster up top, an open truss carrying a gold
 * prize crate, crew module at the nose). Scrolling down fires the engine
 * cluster, harder the faster you go; scrolling up fires the retro thrusters at
 * the nose. Drag the craft, or click the rail to fly there.
 *
 * It follows whichever surface is scrolling: the landing page (the window) or
 * an open full-screen page (.space-page, a department's event list). Mouse and
 * trackpad only; touch screens keep their native scroll indicators.
 */

const SHIP_H = 132; // px, matches the artwork's viewBox height
const INSET = 10; // px of rail above and below the ship's travel
const SCROLLERS = '.space-page, .dept-events';

/** The surface currently being scrolled: the topmost open page that scrolls, else the window. */
function findScroller() {
  const html = document.documentElement;
  if (html.classList.contains('is-loading')) return null;
  const pages = [...document.querySelectorAll(SCROLLERS)].filter((el) => {
    if (el.closest('[inert]') || el.scrollHeight <= el.clientHeight + 4) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
  });
  if (pages.length) return pages[pages.length - 1];
  if (html.classList.contains('dept-open')) return null;
  return html.scrollHeight > window.innerHeight + 4 ? window : null;
}

const metrics = (sc) =>
  sc === window
    ? { top: window.scrollY, max: document.documentElement.scrollHeight - window.innerHeight }
    : { top: sc.scrollTop, max: sc.scrollHeight - sc.clientHeight };

const scrollToY = (sc, y, smooth) => (sc === window ? window : sc).scrollTo({ top: y, behavior: smooth ? 'smooth' : 'instant' });

/** The craft, nose down: engines (top) → aft module → cargo truss → mid module → crew module (bottom). */
function Craft() {
  return (
    <svg className="ss-ship__art" viewBox="0 0 22 132" aria-hidden="true">
      <defs>
        <linearGradient id="ss-hull" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7d828c" />
          <stop offset="0.22" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#e9ebee" />
          <stop offset="0.78" stopColor="#9aa0a9" />
          <stop offset="1" stopColor="#40444c" />
        </linearGradient>
        <linearGradient id="ss-dark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a2d33" />
          <stop offset="0.3" stopColor="#6c717a" />
          <stop offset="1" stopColor="#15171b" />
        </linearGradient>
        <linearGradient id="ss-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff0c8" />
          <stop offset="0.4" stopColor="#e9c27a" />
          <stop offset="0.7" stopColor="#a5712c" />
          <stop offset="1" stopColor="#f3d39a" />
        </linearGradient>
        <radialGradient id="ss-hot" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff4e0" />
          <stop offset="0.45" stopColor="#ff9a4a" />
          <stop offset="1" stopColor="#ff3d2e" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* engine cluster: bells with glowing throats, in a ribbed housing */}
      {[6, 11, 16].map((x) => (
        <g key={x}>
          <path d={`M${x - 2.3} 2 L${x + 2.3} 2 L${x + 1.4} 8 L${x - 1.4} 8 Z`} fill="url(#ss-dark)" />
          <ellipse className="ss-throat" cx={x} cy="2.2" rx="2.2" ry="0.9" fill="url(#ss-hot)" />
        </g>
      ))}
      <rect x="3" y="8" width="16" height="7" fill="url(#ss-dark)" />
      <path d="M3 10h16M3 12.5h16" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
      {/* aft module */}
      <rect x="4" y="15" width="14" height="20" fill="url(#ss-hull)" />
      <path d="M4 19h14M4 31h14" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
      <rect x="4" y="26.5" width="14" height="1.4" fill="url(#ss-gold)" />
      <rect x="5.5" y="21" width="2" height="2" fill="#ff5a4a" opacity="0.8" />
      {/* open truss carrying the gold prize crate */}
      <rect x="5" y="35" width="12" height="36" fill="#0d0f14" />
      <rect x="6.5" y="37" width="9" height="13" fill="#20242c" />
      <rect x="6.5" y="55" width="9" height="13" fill="url(#ss-gold)" />
      <path d="M6.5 59h9M11 55v13" stroke="rgba(94,61,20,0.55)" strokeWidth="0.5" />
      <path d="M4 35v36M18 35v36M4 35L18 53M18 35L4 53M4 53L18 71M18 53L4 71M4 53h14" stroke="#7a808a" strokeWidth="0.75" fill="none" />
      {/* mid module, with a radiator comb on one side */}
      <rect x="4" y="71" width="14" height="27" fill="url(#ss-hull)" />
      <path d="M4 75h14M4 94h14M11 75v19" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5" />
      <rect x="4" y="85" width="14" height="1.2" fill="url(#ss-gold)" />
      <rect x="18" y="74" width="3.4" height="18" fill="#c9ced5" />
      <path d="M18 75.5h3.4M18 77.5h3.4M18 79.5h3.4M18 81.5h3.4M18 83.5h3.4M18 85.5h3.4M18 87.5h3.4M18 89.5h3.4" stroke="#7b818a" strokeWidth="0.6" />
      {/* crew module: zigzag solar stub, porthole, rounded nose and docking port */}
      <path d="M4 102 L0.6 103.5 L3 106 L0.6 108.5 L3 111 L0.6 113.5 L4 115" fill="#c3c8cf" stroke="#7b818a" strokeWidth="0.4" />
      <path d="M4 98h14v22c0 3.5-3 6-7 6s-7-2.5-7-6Z" fill="url(#ss-hull)" />
      <path d="M4 103h14M4 116h14" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5" />
      <circle cx="13.5" cy="109" r="1.5" fill="#1b2235" stroke="#9aa0a8" strokeWidth="0.4" />
      <rect x="9" y="125.5" width="4" height="4" fill="url(#ss-dark)" />
      <circle className="ss-nav" cx="5.4" cy="121.5" r="0.9" fill="#ff5a4a" />
    </svg>
  );
}

export default function ScrollShip() {
  const [enabled] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches);
  const railRef = useRef(null);
  const shipRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const html = document.documentElement;
    html.classList.add('has-scroll-ship');
    const rail = railRef.current;
    const ship = shipRef.current;
    const reduced = prefersReducedMotion();
    let scroller = null;
    let lastTop = 0;
    let thrust = 0; // 0…1, scrolling down
    let retro = 0; // 0…1, scrolling up
    let raf = 0;
    let last = performance.now();
    let checkAt = 0;

    const travel = () => rail.clientHeight - INSET * 2 - SHIP_H;

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      // Re-find the active surface a few times a second (pages open and close).
      if (now > checkAt) {
        checkAt = now + 250;
        const next = findScroller();
        if (next !== scroller) {
          scroller = next;
          lastTop = scroller ? metrics(scroller).top : 0;
        }
        rail.classList.toggle('is-on', !!scroller);
      }
      if (scroller) {
        const { top, max } = metrics(scroller);
        const p = max > 0 ? Math.min(Math.max(top / max, 0), 1) : 0;
        const y = INSET + p * travel();
        ship.style.transform = `translate3d(-50%, ${y.toFixed(1)}px, 0)`;
        rail.style.setProperty('--done', `${(y + SHIP_H / 2).toFixed(1)}px`);
        // Speed in screens per second drives the burn.
        const speed = dt > 0 ? (top - lastTop) / Math.max(window.innerHeight, 1) / dt : 0;
        lastTop = top;
        const k = 1 - Math.exp(-dt * (reduced ? 30 : 9));
        const fall = 1 - Math.exp(-dt * 2.2);
        const wantDown = Math.min(Math.max(speed, 0) / 1.6, 1);
        const wantUp = Math.min(Math.max(-speed, 0) / 1.6, 1);
        thrust += (wantDown - thrust) * (wantDown > thrust ? k : fall);
        retro += (wantUp - retro) * (wantUp > retro ? k : fall);
        ship.style.setProperty('--thrust', thrust.toFixed(3));
        ship.style.setProperty('--retro', retro.toFixed(3));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Drag the craft; click the rail to fly to that point.
    const toTop = (clientY, grab) => {
      const r = rail.getBoundingClientRect();
      const p = (clientY - r.top - INSET - grab) / Math.max(travel(), 1);
      return Math.min(Math.max(p, 0), 1) * metrics(scroller).max;
    };
    const onDown = (e) => {
      if (!scroller || e.button > 0) return;
      e.preventDefault();
      const s = ship.getBoundingClientRect();
      if (e.target instanceof Element && ship.contains(e.target)) {
        drag.current = { grab: e.clientY - s.top };
        rail.setPointerCapture(e.pointerId);
        rail.classList.add('is-dragging');
        html.classList.add('is-scroll-dragging');
      } else {
        scrollToY(scroller, toTop(e.clientY, SHIP_H / 2), !reduced);
      }
    };
    const onMove = (e) => {
      if (!drag.current || !scroller) return;
      scrollToY(scroller, toTop(e.clientY, drag.current.grab), false);
    };
    const onUp = () => {
      drag.current = null;
      rail.classList.remove('is-dragging');
      html.classList.remove('is-scroll-dragging');
    };
    rail.addEventListener('pointerdown', onDown);
    rail.addEventListener('pointermove', onMove);
    rail.addEventListener('pointerup', onUp);
    rail.addEventListener('pointercancel', onUp);
    return () => {
      cancelAnimationFrame(raf);
      rail.removeEventListener('pointerdown', onDown);
      rail.removeEventListener('pointermove', onMove);
      rail.removeEventListener('pointerup', onUp);
      rail.removeEventListener('pointercancel', onUp);
      html.classList.remove('has-scroll-ship', 'is-scroll-dragging');
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div ref={railRef} className="ss-rail" aria-hidden="true" data-no-orbit>
      <span className="ss-track" />
      <span className="ss-track__done" />
      <div ref={shipRef} className="ss-ship">
        {/* main burn: glare over the nozzles and a plume trailing above */}
        <span className="ss-plume">
          <span className="ss-plume__glow" />
          <span className="ss-plume__body" />
          <span className="ss-plume__core" />
        </span>
        <span className="ss-glare" />
        {/* retro thrusters at the nose */}
        <span className="ss-retro ss-retro--l" />
        <span className="ss-retro ss-retro--r" />
        <Craft />
      </div>
    </div>
  );
}
