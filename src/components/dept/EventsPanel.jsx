import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { DEPARTMENTS, eventSlug } from '../../config/departments';
import { BODY_BY_KEY, EVENT, prefersReducedMotion } from '../../config/experience';
import { ALL_EVENTS } from '../../config/allEvents';
import { scheduleFor } from '../../config/schedule';
import { navigate } from '../../lib/deptRoute';
import Star from '../ui/Star';
import Frame from '../ui/Frame';
import Constellation from '../ui/Constellation';

/** 'Label: body' → { label, lines, bullets }. Lines beginning with '- ' become bullets. */
function parseRule(text) {
  const m = text.match(/^([^:\n]{2,64}):\s+([\s\S]*)$/);
  const label = m ? m[1] : null;
  const body = m ? m[2] : text;
  const rows = body.split('\n').map((r) => r.trim()).filter(Boolean);
  return {
    label,
    lines: rows.filter((r) => !r.startsWith('- ')),
    bullets: rows.filter((r) => r.startsWith('- ')).map((r) => r.slice(2)),
  };
}

const formatPhone = (p) => (p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p);
const pad = (n) => String(n).padStart(2, '0');
const unique = (list) => [...new Set(list)];
const NODE = 58; // dial node size (px)

const ICONS = {
  team: 'M7 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z M13.5 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M2.5 16c0-2.6 2-4.5 4.5-4.5s4.5 1.9 4.5 4.5 M12 12c2.3 0 5.5 1.2 5.5 4',
  date: 'M3.5 5h13v11.5h-13Z M3.5 8.5h13 M7 3v3.5 M13 3v3.5',
  time: 'M10 3.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13Z M10 6.5V10l2.5 1.6',
  venue: 'M10 17s-5.5-5-5.5-9a5.5 5.5 0 0 1 11 0c0 4-5.5 9-5.5 9Z M10 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  dept: 'M10 3a7 7 0 1 0 0 14a7 7 0 1 0 0-14Z M3.5 10h13 M10 3c2 2 2.8 4.4 2.8 7S12 15 10 17c-2-2-2.8-4.4-2.8-7S8 5 10 3Z',
  faculty: 'M10 4 2.5 7.5 10 11l7.5-3.5Z M5.5 9v3.6c1.2 1.4 2.8 2 4.5 2s3.3-.6 4.5-2V9',
  student: 'M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M4 17c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5',
  trophy: 'M6 3.5h8v4a4 4 0 0 1-8 0Z M6 5H3.5v1a2.5 2.5 0 0 0 2.6 2.5 M14 5h2.5v1a2.5 2.5 0 0 1-2.6 2.5 M10 11.5v3 M7 16.5h6 M8 14.5h4',
};

function Icon({ name, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Reward burst pieces: a four-point star, a diamond and a gift box (gold, on a 20-unit box). */
const BURST_SVG = {
  star: '<path d="M10 0 12.2 7.8 20 10 12.2 12.2 10 20 7.8 12.2 0 10 7.8 7.8Z" fill="currentColor"/>',
  diamond: '<path d="M10 1 19 10 10 19 1 10Z" fill="none" stroke="currentColor" stroke-width="2"/>',
  gift:
    '<path d="M3 8h14v10H3Z M2 5h16v3H2Z" fill="currentColor"/><path d="M10 5v13" stroke="#1d1103" stroke-width="1.6"/><path d="M10 5C8 1 4.5 2 6 4.6 7 5.5 10 5 10 5Zm0 0c2-4 5.5-3 4-.4C13 5.5 10 5 10 5Z" fill="none" stroke="currentColor" stroke-width="1.4"/>',
};

/**
 * Clicking the prize card: a game-style "reward unlocked" burst. A gold shockwave, then stars,
 * diamonds, sparks and gift boxes fly out, arc down and twinkle away. The pieces live in a fixed
 * layer on <body> (the card's clipped corners would cut them off) and remove themselves after.
 */
function rewardBurst(tile) {
  const r = tile.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'prize-burst';
  layer.style.left = `${r.left + r.width / 2}px`;
  layer.style.top = `${r.top + r.height / 2}px`;
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const make = (cls, html = '') => {
    const el = document.createElement('span');
    el.className = cls;
    el.innerHTML = html;
    layer.appendChild(el);
    return el;
  };
  const rand = gsap.utils.random;
  const tl = gsap.timeline({ onComplete: () => layer.remove() });

  const ring = make('prize-burst__ring');
  tl.fromTo(ring, { scale: 0.2, autoAlpha: 0.9 }, { scale: 3.2, autoAlpha: 0, duration: 0.8, ease: 'expo.out' }, 0);
  const flash = make('prize-burst__flash');
  tl.fromTo(flash, { scale: 0.3, autoAlpha: 0.85 }, { scale: 1.6, autoAlpha: 0, duration: 0.55, ease: 'power2.out' }, 0);

  const pieces = [
    ...Array.from({ length: 14 }, () => ['star', rand(10, 22)]),
    ...Array.from({ length: 8 }, () => ['diamond', rand(7, 12)]),
    ...Array.from({ length: 12 }, () => ['spark', rand(3, 6)]),
    ...Array.from({ length: 5 }, () => ['gift', rand(16, 22)]),
  ];
  pieces.forEach(([kind, size], i) => {
    const el = make(`prize-burst__p prize-burst__p--${kind}`, kind === 'spark' ? '' : `<svg viewBox="0 0 20 20">${BURST_SVG[kind]}</svg>`);
    el.style.width = el.style.height = `${size}px`;
    const angle = (i / pieces.length) * Math.PI * 2 + rand(-0.25, 0.25);
    const dist = rand(70, 190) * (kind === 'gift' ? 0.75 : 1);
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist * 0.8 - rand(20, 60);
    // fly out, then drift down twinkling for about a second, fading at the end
    const start = rand(0, 0.08);
    const fly = rand(0.4, 0.55);
    const fall = rand(0.9, 1.3);
    tl.fromTo(
      el,
      { x: 0, y: 0, scale: 0, rotate: rand(-90, 90), autoAlpha: 1 },
      { x, y, scale: 1, rotate: `+=${rand(-200, 200)}`, duration: fly, ease: 'expo.out' },
      start,
    )
      .to(el, { y: y + rand(40, 90), rotate: `+=${rand(-60, 60)}`, duration: fall, ease: 'power1.in' }, start + fly)
      .to(el, { scale: 0.35, duration: 0.14, yoyo: true, repeat: 5, ease: 'sine.inOut' }, start + fly)
      .to(el, { autoAlpha: 0, duration: 0.4, ease: 'power1.in' }, start + fly + fall - 0.4);
  });
}

/** The prize pool tile: same shape as the other tiles, in gold; click (or Enter / Space) for the reward burst. */
function PrizeTile({ amount }) {
  const ref = useRef(null);
  const celebrate = () => {
    const tile = ref.current;
    if (!tile) return;
    tile.classList.remove('is-burst');
    void tile.offsetWidth; // restart the flash animation
    tile.classList.add('is-burst');
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      tile.querySelector('.edk-tile__icon'),
      { scale: 1, rotate: 0 },
      {
        keyframes: [
          { scale: 1.45, rotate: -14, duration: 0.18 },
          { rotate: 12, duration: 0.14 },
          { scale: 1, rotate: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' },
        ],
      },
    );
    rewardBurst(tile);
  };
  return (
    <div
      ref={ref}
      className="edk-tile edk-tile--prize"
      data-ev-anim
      role="button"
      tabIndex={0}
      aria-label={`Prize pool ₹${amount.toLocaleString('en-IN')}, plus gift hampers for the winners`}
      onClick={celebrate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          celebrate();
        }
      }}
      onAnimationEnd={(e) => e.animationName === 'edk-prize-flash' && e.currentTarget.classList.remove('is-burst')}
    >
      <span className="edk-tile--prize__sheen" aria-hidden="true" />
      <span className="edk-tile__icon">
        <Icon name="trophy" />
      </span>
      <div className="min-w-0">
        <dt>Prize pool</dt>
        <dd className="edk-tile--prize__amount">₹{amount.toLocaleString('en-IN')}</dd>
        <dd className="edk-tile__sub">Plus gift hampers for the winners</dd>
      </div>
    </div>
  );
}

/** The title as words of individually animated letters (words never break apart). */
function SplitTitle({ text }) {
  return text.split(' ').map((word, w, words) => (
    <Fragment key={`${word}-${w}`}>
      <span className="edk-word">
        {[...word].map((ch, i) => (
          <span key={i} className="edk-char">
            {ch}
          </span>
        ))}
      </span>
      {w < words.length - 1 && ' '}
    </Fragment>
  ));
}

/**
 * Register: opens the registration form (EVENT.registerUrl) in a new tab, or —
 * until that link is set — returns to the landing page's registration section.
 */
function RegisterButton({ event, wide = false }) {
  const go = () => {
    if (EVENT.registerUrl) {
      window.open(EVENT.registerUrl, '_blank', 'noopener');
      return;
    }
    navigate(null);
    window.setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 900);
  };
  return (
    <button type="button" onClick={go} className={`edk-register ${wide ? 'edk-register--wide' : ''}`} data-ev-anim aria-label={`Register for ${event.name}`}>
      <span className="edk-register__text">
        <b>Register</b>
      </span>
      <span className="edk-register__sheen" aria-hidden="true" />
    </button>
  );
}

/**
 * The orbit dial: the department's events ride a great ring at the left edge of
 * the screen (an arc across the top on phones). The selected event swings to the
 * front; the wheel, a swipe, the arrow keys or the ▲▼ keys turn the ring.
 */
function OrbitDial({ events, index, onSelect }) {
  const rootRef = useRef(null);
  const ringRef = useRef(null);
  const nodes = useRef([]);
  const rot = useRef({ v: index });
  const geo = useRef(null);
  const count = events.length;
  const go = (i) => onSelect(events[(i + count) % count].slug);

  const place = () => {
    const g = geo.current;
    if (!g) return;
    const v = rot.current.v;
    events.forEach((_, i) => {
      const el = nodes.current[i];
      if (!el) return;
      const d = i - v;
      const a = g.base + d * g.step;
      const x = g.cx + g.R * Math.cos(a);
      const y = g.cy + g.R * Math.sin(a);
      const dist = Math.abs(d);
      const vis = Math.max(0, 1 - dist / g.reach);
      el.style.transform = `translate3d(${(x - NODE / 2).toFixed(1)}px, ${(y - NODE / 2).toFixed(1)}px, 0) scale(${(1 - Math.min(dist, 3) * 0.11).toFixed(3)})`;
      el.style.opacity = vis.toFixed(3);
      el.style.visibility = vis < 0.02 ? 'hidden' : 'visible';
      el.style.setProperty('--focus', Math.max(0, 1 - dist).toFixed(3));
    });
    ringRef.current?.style.setProperty('--spin', `${(-v * g.step * 57.2958).toFixed(2)}deg`);
  };

  const layout = () => {
    const el = rootRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const wide = window.matchMedia('(min-width: 1024px)').matches;
    let g;
    if (wide) {
      const R = Math.max(Math.min(h * 0.46, 380), 220);
      g = { R, cx: -R * 0.5, cy: h / 2, base: 0, step: Math.min(0.36, 82 / R), reach: 4.4 };
    } else {
      const R = Math.max(w * 1.25, 480);
      g = { R, cx: w / 2, cy: R + NODE * 0.85, base: -Math.PI / 2, step: 78 / R, reach: 3.4 };
    }
    geo.current = g;
    const ring = ringRef.current;
    if (ring) {
      ring.style.left = `${g.cx - g.R}px`;
      ring.style.top = `${g.cy - g.R}px`;
      ring.style.width = ring.style.height = `${g.R * 2}px`;
    }
    // A small diamond on the inside of the ring marks the front.
    const ptr = el.querySelector('.odial__pointer');
    if (ptr) {
      const r = g.R - NODE * 0.95;
      ptr.style.left = `${g.cx + r * Math.cos(g.base)}px`;
      ptr.style.top = `${g.cy + r * Math.sin(g.base)}px`;
    }
    place();
  };

  useLayoutEffect(() => {
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(rootRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Turn the ring to the selected event.
  useEffect(() => {
    const d = prefersReducedMotion() ? 0 : 1.05;
    gsap.to(rot.current, { v: index, duration: d, ease: 'expo.out', onUpdate: place, overwrite: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // The wheel turns the ring one event per notch (throttled); a swipe does the same on touch.
  useEffect(() => {
    const el = rootRef.current;
    let acc = 0;
    let last = 0;
    const onWheel = (e) => {
      e.preventDefault();
      acc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const now = performance.now();
      if (Math.abs(acc) < 40 || now - last < 260) return;
      last = now;
      go(index + Math.sign(acc));
      acc = 0;
    };
    let start = null;
    const onDown = (e) => (start = { x: e.clientX, y: e.clientY });
    const onUp = (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      const wide = geo.current?.base === 0;
      const delta = wide ? dy : dx;
      if (Math.abs(delta) > 36) go(index - Math.sign(delta));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, events]);

  const onKey = (e) => {
    if (['ArrowDown', 'ArrowRight'].includes(e.key)) go(index + 1);
    else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) go(index - 1);
    else return;
    e.preventDefault();
  };

  // Keep keyboard focus on the front node as the ring turns.
  useEffect(() => {
    if (rootRef.current?.contains(document.activeElement)) nodes.current[index]?.querySelector('button')?.focus({ preventScroll: true });
  }, [index]);

  return (
    <nav ref={rootRef} className="odial" aria-label="Events" data-cursor="hover">
      <div ref={ringRef} className="odial__ring" aria-hidden="true">
        <svg viewBox="0 0 200 200" className="odial__ring-svg">
          <circle cx="100" cy="100" r="99.4" className="odial__orbit" />
          <circle cx="100" cy="100" r="92" className="odial__orbit odial__orbit--dash" />
          <circle cx="100" cy="100" r="84" className="odial__orbit odial__orbit--faint" />
          <g className="odial__ticks">
            {Array.from({ length: 120 }, (_, i) => (
              <line key={i} x1="100" y1="2.5" x2="100" y2={i % 10 === 0 ? 7 : 4.6} transform={`rotate(${i * 3} 100 100)`} />
            ))}
          </g>
          <g className="odial__gems">
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d="M100 89.5 101.8 92 100 94.5 98.2 92Z" transform={`rotate(${i * 45 + 22.5} 100 100)`} />
            ))}
          </g>
        </svg>
      </div>
      <span className="odial__pointer" aria-hidden="true" />

      <ul className="odial__nodes">
        {events.map((e, i) => (
          <li key={e.slug} ref={(el) => (nodes.current[i] = el)} className={`odial__node ${i === index ? 'is-front' : ''}`}>
            <button
              type="button"
              onClick={() => go(i)}
              onKeyDown={onKey}
              tabIndex={i === index ? 0 : -1}
              aria-current={i === index ? 'true' : undefined}
              aria-label={`${pad(i + 1)} · ${e.name}`}
              className="odial__btn"
            >
              <span className="odial__halo" aria-hidden="true" />
              <span className="odial__num">{pad(i + 1)}</span>
            </button>
            <span className="odial__label" aria-hidden="true">
              <b>{e.name}</b>
              <small>{e.format}</small>
            </span>
          </li>
        ))}
      </ul>

      <div className="odial__keys">
        <button type="button" onClick={() => go(index - 1)} aria-label="Previous event" className="odial__key">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="m5 12.5 5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="odial__count">
          <b>{pad(index + 1)}</b> / {pad(count)}
        </span>
        <button type="button" onClick={() => go(index + 1)} aria-label="Next event" className="odial__key">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </nav>
  );
}

/**
 * Inside a world: the events deck. The orbit dial sits at the far left; the
 * selected event's brief is a glass panel on the right — title, an emblem with
 * the event's constellation, every detail (team, date, time, venue, department,
 * coordinators), the full rules and Register. Switching events sweeps a band of
 * light across the glass while the old brief slips out and the new one assembles.
 */
export default function EventsPanel({ deptKey, selected, onSelect }) {
  const dept = DEPARTMENTS[deptKey];
  const body = BODY_BY_KEY[deptKey];
  const events = useMemo(() => dept.events.map((e) => ({ ...e, slug: eventSlug(e.name) })), [dept]);
  const index = Math.max(0, events.findIndex((e) => e.slug === selected));
  // The brief lags the selection by one transition.
  const [shown, setShown] = useState(index);
  const event = events[shown];
  const rules = useMemo(() => event.rules.map(parseRule), [event]);
  const meta = useMemo(() => ALL_EVENTS.find((e) => e.dept === deptKey && e.slug === event.slug), [deptKey, event]);
  const slots = useMemo(() => scheduleFor(event.name, dept.events.map((e) => e.name)), [event, dept]);
  const panelRef = useRef(null);
  const sweepRef = useRef(null);
  const tl = useRef(null);
  const first = useRef(true);
  const place = deptKey === 'moon' ? 'the Moon' : deptKey === 'station' ? 'the Space Station' : body.name;
  const world = place.replace(/^the /, 'The ');

  const tiles = [
    { icon: 'team', label: 'Team', value: event.format, sub: meta?.solo ? 'Solo entry' : 'Register as a team' },
    {
      icon: 'date',
      label: 'Date',
      value: slots.length ? unique(slots.map((s) => s.date)).join(' & ') : EVENT.dateLabel,
      sub: slots.length ? unique(slots.map((s) => s.day)).join(' & ') : 'Day announced with the final schedule',
    },
    {
      icon: 'time',
      label: 'Time',
      value: slots.length ? slots.map((s) => s.time).join(' · ') : 'To be announced',
      sub: slots.length ? slots.map((s) => s.title).join(' · ') : 'Reporting 15 minutes before',
    },
    {
      icon: 'venue',
      label: 'Venue',
      value: slots.length ? unique(slots.map((s) => s.venue)).join(' · ') : 'CHRIST (Deemed to be University)',
      sub: slots.length ? 'CHRIST (Deemed to be University) · Yeshwanthpur Campus' : 'Yeshwanthpur Campus · room announced soon',
    },
    { icon: 'dept', label: 'Domain', value: dept.name, sub: `${world} · ${dept.org ?? 'CUBYC — Fest’2027'}` },
  ];

  // Selection changed → the old brief slips out under a sweep of light, then swap.
  useEffect(() => {
    if (index === shown) return undefined;
    const el = panelRef.current;
    tl.current?.kill();
    if (prefersReducedMotion() || !el) {
      setShown(index);
      return undefined;
    }
    const parts = el.querySelectorAll('[data-ev-anim]');
    tl.current = gsap
      .timeline({ onComplete: () => setShown(index) })
      .to(parts, { autoAlpha: 0, x: -28, filter: 'blur(6px)', duration: 0.28, stagger: 0.012, ease: 'power2.in' }, 0)
      .to(el.querySelector('.edk-seal'), { rotate: 90, scale: 0.7, autoAlpha: 0, duration: 0.32, ease: 'power2.in' }, 0)
      .fromTo(sweepRef.current, { xPercent: -120, autoAlpha: 1 }, { xPercent: 20, duration: 0.34, ease: 'power2.in' }, 0);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // New brief in place → assemble it: letters rise, tiles cascade, the seal spins in.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const intro = first.current;
    first.current = false;
    if (!intro) {
      const scroller = el.closest('.dept-events');
      const top = el.getBoundingClientRect().top;
      if (scroller && (top < 0 || top > window.innerHeight * 0.6)) scroller.scrollTo({ top: scroller.scrollTop + top - 120, behavior: 'smooth' });
    }
    if (prefersReducedMotion()) return;
    const chars = el.querySelectorAll('.edk-char');
    const parts = el.querySelectorAll('[data-ev-anim]');
    tl.current = gsap
      .timeline({ delay: intro ? 0.35 : 0 })
      .fromTo(sweepRef.current, { xPercent: intro ? -120 : 20, autoAlpha: 1 }, { xPercent: 140, autoAlpha: 0, duration: 0.8, ease: 'power2.out' }, 0)
      .fromTo(el.querySelector('.edk-seal'), { rotate: -140, scale: 0.55, autoAlpha: 0 }, { rotate: 0, scale: 1, autoAlpha: 1, duration: 1.1, ease: 'expo.out' }, 0.05)
      .fromTo(chars, { yPercent: 110, autoAlpha: 0, rotate: 8 }, { yPercent: 0, autoAlpha: 1, rotate: 0, duration: 0.7, stagger: 0.018, ease: 'expo.out' }, 0.08)
      .fromTo(parts, { autoAlpha: 0, x: 0, y: 18, filter: 'blur(6px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.65, stagger: 0.035, ease: 'expo.out' }, 0.14)
      .set([...parts, el.querySelector('.edk-seal')], { clearProps: 'opacity,visibility,transform,filter' })
      .set(chars, { clearProps: 'opacity,visibility,transform' });
  }, [shown]);

  useEffect(() => () => tl.current?.kill(), []);

  const nextEvent = events[(index + 1) % events.length];

  return (
    <div className="edk-stage">
      <OrbitDial events={events} index={index} onSelect={onSelect} />

      <div className="edk-main">
        <header className="edk-head">
          <p className="inline-flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/85 uppercase">
            <Star className="h-2 w-2 text-gold-400/70" />
            Inside {place}
            <Star className="h-2 w-2 text-gold-400/70" />
          </p>
          <h2 className="title-cosmic mt-3 font-display text-[clamp(1.6rem,4.4vw,3rem)] font-bold leading-[1.04] tracking-[0.08em] uppercase">{dept.name}</h2>
          <p className="mt-2 font-mono text-[0.6rem] tracking-[0.3em] text-white/55 uppercase">
            {dept.org ?? 'Domain'} · {pad(events.length)} event{events.length === 1 ? '' : 's'}
          </p>
        </header>

        <article ref={panelRef} className="edk-panel" aria-live="polite">
          <Frame size="lg" className="edk-frame" />
          <span ref={sweepRef} className="edk-sweep" aria-hidden="true" />
          <span className="edk-watermark" aria-hidden="true">
            {pad(shown + 1)}
          </span>

          <div className="edk-hud" data-ev-anim>
            <span className="inline-flex items-center gap-2.5">
              <span className="edk-led" aria-hidden="true" />
              Event {pad(shown + 1)} / {pad(events.length)}
            </span>
            <span className="hidden sm:inline">
              {dept.short} · {world}
            </span>
          </div>

          <div className="edk-hero">
            <div className="edk-seal" aria-hidden="true">
              <svg viewBox="0 0 120 120" className="edk-seal__rings">
                <circle cx="60" cy="60" r="58" className="edk-seal__o" />
                <circle cx="60" cy="60" r="52" className="edk-seal__o edk-seal__o--dash" />
                <circle cx="60" cy="60" r="38" className="edk-seal__o edk-seal__o--faint" />
                {Array.from({ length: 4 }, (_, i) => (
                  <path key={i} d="M60 0.5 62.5 4 60 7.5 57.5 4Z" className="edk-seal__gem" transform={`rotate(${i * 90} 60 60)`} />
                ))}
              </svg>
              {meta?.constellation && <Constellation data={meta.constellation} className="edk-seal__stars" />}
              <span className="edk-seal__name">{meta?.constellation?.name}</span>
            </div>

            <div className="min-w-0">
              <p className="edk-kicker" data-ev-anim>
                <span className="edk-kicker__gem" aria-hidden="true" />
                {event.format}
                <span className="edk-kicker__gem" aria-hidden="true" />
                {meta && <span className="text-white/45">No. {pad(meta.no)} of {ALL_EVENTS.length}</span>}
              </p>
              <h3 className="edk-title">
                <SplitTitle key={event.slug} text={event.name} />
              </h3>
              <div className="edk-ornament" data-ev-anim aria-hidden="true">
                <span />
                <i />
                <span />
              </div>
              <p className="edk-summary" data-ev-anim>
                {event.summary}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <RegisterButton event={event} />
                <span className="font-mono text-[0.55rem] tracking-[0.28em] text-white/40 uppercase" data-ev-anim>
                  {EVENT.dateLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Every detail */}
          <dl className="edk-tiles">
            {tiles.map((t) => (
              <div key={t.label} className="edk-tile" data-ev-anim>
                <span className="edk-tile__icon">
                  <Icon name={t.icon} />
                </span>
                <div className="min-w-0">
                  <dt>{t.label}</dt>
                  <dd>{t.value}</dd>
                  <dd className="edk-tile__sub">{t.sub}</dd>
                </div>
              </div>
            ))}
            {event.faculty && (
              <div className="edk-tile" data-ev-anim>
                <span className="edk-tile__icon">
                  <Icon name="faculty" />
                </span>
                <div className="min-w-0">
                  <dt>Faculty in-charge</dt>
                  <dd>{event.faculty}</dd>
                  <dd className="edk-tile__sub">{dept.name}</dd>
                </div>
              </div>
            )}
            <div className="edk-tile" data-ev-anim>
              <span className="edk-tile__icon">
                <Icon name="student" />
              </span>
              <div className="min-w-0">
                <dt>Student in-charge</dt>
                <dd>{event.student?.name ?? 'To be announced'}</dd>
                {event.student?.phone ? (
                  <dd>
                    <a href={`tel:+91${event.student.phone}`} className="edk-tile__phone">
                      +91 {formatPhone(event.student.phone)}
                    </a>
                  </dd>
                ) : (
                  <dd className="edk-tile__sub">Contact shared before the fest</dd>
                )}
              </div>
            </div>
            {/* The prize pool closes the tiles: same tile, in warm gold with a shimmering amount */}
            {event.prize ? <PrizeTile amount={event.prize} /> : null}
          </dl>

          {/* Rules */}
          <div className="edk-section" data-ev-anim>
            <span className="edk-kicker__gem" aria-hidden="true" />
            <h4>Format &amp; rules</h4>
            <span className="edk-section__line" aria-hidden="true" />
            <span className="font-mono text-[0.55rem] tracking-[0.26em] text-white/40 uppercase">{pad(rules.length)} clauses</span>
          </div>
          <ol className="edk-rules">
            {rules.map((r, i) => (
              <li key={i} className="edk-rule" data-ev-anim>
                <span className="edk-rule__num">{pad(i + 1)}</span>
                <div className="min-w-0 text-[0.92rem] leading-relaxed text-white/75">
                  {r.label && <p className="mb-1 font-display text-[0.78rem] font-bold tracking-[0.12em] text-[#f6f1e7] uppercase">{r.label}</p>}
                  {r.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {r.bullets.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {r.bullets.map((b) => (
                        <li key={b} className="flex gap-3">
                          <Star className="mt-[0.45em] h-1.5 w-1.5 shrink-0 text-gold-400/70" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* Footer: register again, or move on */}
          <div className="edk-foot" data-ev-anim>
            <RegisterButton event={event} wide />
            {events.length > 1 && (
              <button type="button" className="edk-next" onClick={() => onSelect(nextEvent.slug)}>
                <span className="font-mono text-[0.52rem] tracking-[0.3em] text-white/45 uppercase">Next event</span>
                <span className="font-display text-[0.78rem] font-bold tracking-[0.12em] text-[#f6f1e7] uppercase">{nextEvent.name}</span>
                <svg viewBox="0 0 20 20" className="edk-next__arrow h-4 w-4" aria-hidden="true">
                  <path d="M4 10h11m-4-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
