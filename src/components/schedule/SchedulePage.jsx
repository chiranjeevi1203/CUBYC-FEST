import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import SiteNav from '../ui/SiteNav';
import Frame from '../ui/Frame';
import Star from '../ui/Star';
import Shuttle from './Shuttle';
import { SCHEDULE_DAYS } from '../../config/schedule';
import { EVENT, prefersReducedMotion } from '../../config/experience';
import { createShaderLayer } from '../../lib/blackHole';
import { MILKY_FRAG } from '../../lib/milkyWay';
import { useExperience } from '../../store/useExperience';

/*
 * Flight plan: the shuttle flies from centre-left toward centre-right as you
 * scroll (wheel, drag, swipe, arrow keys). Behind it a glowing flight line is
 * drawn, and each stop of the day branches off the line — alternately above
 * and below — as the shuttle passes. Clicking the shuttle boosts it, repaints
 * its hull (white = Day 01, orange = Day 02) and redraws the other day's plan.
 */

const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
const lerp = (a, b, t) => a + (b - a) * t;
const pad = (n) => String(n).padStart(2, '0');
const MAX_STOPS = Math.max(...SCHEDULE_DAYS.map((d) => d.items.length));

function layoutFor(w, h, count) {
  const portrait = w < h * 0.85;
  const short = !portrait && h < 560; // phones held sideways: a lower, tighter flight line
  const spacing = portrait ? clamp(w * 0.5, 170, 230) : clamp(w * 0.2, short ? 200 : 230, 330);
  const startGap = spacing * 0.75;
  const last = startGap + (count - 1) * spacing;
  return {
    w,
    h,
    portrait,
    spacing,
    startGap,
    sMax: last + spacing * 0.35,
    baseY: h * (portrait ? 0.56 : short ? 0.66 : 0.6),
    amp: portrait || short ? 10 : 18,
    lambda: spacing * 0.9,
    shipW: portrait ? 150 : short ? clamp(w * 0.18, 150, 210) : clamp(w * 0.2, 220, 320),
    // Starts hugging the left edge (exhaust just off-screen), ends centre-right.
    shipX0: (portrait ? 150 : short ? clamp(w * 0.18, 150, 210) : clamp(w * 0.2, 220, 320)) * 0.42 + (portrait ? 6 : 18),
    shipX1: w * (portrait ? 0.62 : 0.72),
    stem: portrait ? 64 : short ? 34 : 92,
  };
}

const pathY = (x, L) => L.baseY + L.amp * Math.sin(x / L.lambda);

function Stop({ item, index, x, y, up, on, L }) {
  return (
    <div className={`sch-stop ${up ? 'is-up' : 'is-down'} ${on ? 'is-on' : ''}`} style={{ left: x, top: y, '--stem': `${L.stem}px` }}>
      <span className="sch-stop__stem" aria-hidden="true" />
      <span className="sch-stop__node" aria-hidden="true" />
      <article className="sch-card" aria-hidden={!on}>
        <Frame size="sm" star={false} />
        <span className="sch-card__index">{pad(index + 1)}</span>
        <time className="sch-card__time">{item.time}</time>
        <h3 className="sch-card__title">{item.title}</h3>
        <p className="sch-card__venue">
          <svg viewBox="0 0 20 20" className="h-3 w-3 shrink-0" aria-hidden="true">
            <path d="M10 18s6-5.6 6-10A6 6 0 0 0 4 8c0 4.4 6 10 6 10Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="10" cy="8" r="2" fill="currentColor" />
          </svg>
          {item.venue}
        </p>
        {item.tag && <span className="sch-card__tag">{item.tag}</span>}
      </article>
    </div>
  );
}

function ScheduleView({ open, onGone }) {
  const quality = useExperience((s) => s.quality);
  const setCovered = useExperience((s) => s.setDeptCovered);
  const reduced = prefersReducedMotion();

  const [day, setDay] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [, setVersion] = useState(0); // re-render on resize
  const plan = SCHEDULE_DAYS[day];
  const count = plan.items.length;

  const rootRef = useRef(null);
  const bgRef = useRef(null);
  const trackRef = useRef(null);
  const clipRef = useRef(null);
  const headRef = useRef(null);
  const shipRef = useRef(null);
  const shockRef = useRef(null);
  const barRef = useRef(null);
  const closing = useRef(false);
  const switching = useRef(false);
  const flow = useRef({ s: 0, target: 0, intro: 0, time: 0, warm: 0, kickX: 0, kickR: 0, shipO: 1, rot: 0, thrust: 0.6 });
  const layout = useRef(layoutFor(window.innerWidth, window.innerHeight, MAX_STOPS));
  const revealedRef = useRef(0);

  const L = layout.current;
  const xs = useMemo(() => plan.items.map((_, i) => L.startGap + i * L.spacing), [plan, L]);
  const xsRef = useRef(xs);
  xsRef.current = xs;

  // Flight-line geometry (track coordinates).
  const pathD = useMemo(() => {
    const pts = [];
    for (let x = 0; x <= L.sMax + L.w; x += 8) pts.push(`${x.toFixed(1)},${pathY(x, L).toFixed(1)}`);
    return `M${pts.join(' L')}`;
  }, [L]);

  /* ---------- enter / exit ---------- */
  const glideTo = useCallback((s, d = 1.6) => {
    gsap.to(flow.current, { target: s, duration: d, ease: 'power2.inOut', overwrite: 'auto' });
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    document.documentElement.classList.add('dept-open');
    const head = headRef.current ? Array.from(headRef.current.children) : [];
    gsap.set(root, { autoAlpha: 0 });
    gsap.set(head, { autoAlpha: 0, y: 22 });
    const f = flow.current;
    f.kickX = reduced ? 0 : -window.innerWidth * 0.45;
    const tl = gsap
      .timeline()
      .to(root, { autoAlpha: 1, duration: reduced ? 0.2 : 0.7, ease: 'power2.out', onComplete: () => setCovered(true) })
      .to(f, { intro: 1, duration: reduced ? 0.2 : 1.8, ease: 'power2.out' }, 0.1)
      .to(f, { kickX: 0, duration: reduced ? 0.01 : 1.9, ease: 'expo.out' }, 0.25)
      .to(head, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.4)
      .call(() => glideTo(xsRef.current[0] + 20, 1.4), null, reduced ? 0.2 : 1.3);
    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) {
      if (!closing.current) return undefined;
      closing.current = false;
      document.documentElement.classList.add('dept-open');
      const tl = gsap.timeline().to(rootRef.current, { autoAlpha: 1, duration: 0.4, onComplete: () => setCovered(true) });
      return () => tl.kill();
    }
    closing.current = true;
    setCovered(false);
    document.documentElement.classList.remove('dept-open');
    const tl = gsap
      .timeline({ onComplete: onGone })
      .to(flow.current, { intro: 0, duration: 0.6, ease: 'power2.in' }, 0)
      .to(rootRef.current, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut' }, 0.1);
    return () => tl.kill();
  }, [open, onGone, setCovered]);

  useEffect(() => () => document.documentElement.classList.remove('dept-open'), []);

  /* ---------- render loop ---------- */
  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 0.75 : 1);
    const bg = createShaderLayer(bgRef.current, MILKY_FRAG);

    const resize = () => {
      layout.current = layoutFor(window.innerWidth, window.innerHeight, MAX_STOPS);
      bg?.resize(window.innerWidth, window.innerHeight, dpr);
      setVersion((v) => v + 1);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      // rAF's timestamp can precede the setup time: never let dt go negative.
      const dt = clamp((now - last) / 1000, 0, 0.1);
      last = now;
      const f = flow.current;
      const Lc = layout.current;
      f.time += dt;
      f.target = clamp(f.target, 0, Lc.sMax);
      f.s += (f.target - f.s) * (1 - Math.exp(-dt * (reduced ? 30 : 4.2)));
      if (Math.abs(f.target - f.s) < 0.05) f.s = f.target;
      const p = f.s / Lc.sMax;

      // Shuttle: slides centre-left → centre-right, rides the line, banks with its slope.
      const sx = lerp(Lc.shipX0, Lc.shipX1, p) + f.kickX;
      const y = pathY(f.s, Lc) + Math.sin(f.time * 1.6) * 3;
      const slope = (Lc.amp / Lc.lambda) * Math.cos(f.s / Lc.lambda);
      const speed = clamp((f.target - f.s) / 160, -1, 1);
      // Bank and thrust ease on their own, so jittery wheel input never twitches the shuttle.
      const k = 1 - Math.exp(-dt * 6);
      f.rot += (Math.atan(slope) + speed * 0.05 - f.rot) * k;
      f.thrust += (0.55 + Math.abs(speed) * 0.65 - f.thrust) * k;
      const ship = shipRef.current;
      if (ship) {
        ship.style.transform = `translate3d(${(sx - Lc.shipW / 2).toFixed(2)}px, ${(y - (Lc.shipW * 200) / 480 / 2).toFixed(2)}px, 0) rotate(${(f.rot + f.kickR).toFixed(4)}rad)`;
        ship.style.opacity = String(f.shipO);
        ship.style.setProperty('--thrust', f.thrust.toFixed(3));
      }
      // The line is drawn up to the shuttle's tail.
      const tail = f.s - (Lc.shipW * 0.36) * Math.cos(Math.atan(slope));
      if (trackRef.current) trackRef.current.style.transform = `translate3d(${(sx - f.s).toFixed(2)}px, 0, 0)`;
      clipRef.current?.setAttribute('width', String(Math.max(tail, 0)));
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;

      const n = xsRef.current.filter((x) => x <= f.s + 24).length;
      if (n !== revealedRef.current) {
        revealedRef.current = n;
        setRevealed(n);
      }

      bg?.draw({ uRes: [window.innerWidth * dpr, window.innerHeight * dpr], uTime: f.time, uOffset: f.s / Lc.w * 0.12, uIntro: f.intro, uWarm: f.warm });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      bg?.destroy();
    };
  }, [quality, reduced]);

  /* ---------- day switch ---------- */
  const switchTo = useCallback(
    (next) => {
      if (switching.current || next === day) return;
      switching.current = true;
      const f = flow.current;
      const root = rootRef.current;
      const track = trackRef.current;
      const shipEl = shipRef.current;
      const done = () => {
        switching.current = false;
        shipEl?.classList.remove('is-boost');
      };
      if (reduced) {
        root.dataset.day = String(next);
        setDay(next);
        f.s = 0;
        f.target = 0;
        f.warm = next;
        glideTo(xsRef.current[0] + 20, 0.01);
        done();
        return;
      }
      shipEl?.classList.add('is-boost');
      gsap
        .timeline({ onComplete: done })
        // Boost: lunge forward with a pitch-up, shockwave ring, hull repaint.
        .to(f, { kickX: 140, kickR: -0.12, duration: 0.45, ease: 'power3.in' }, 0)
        .fromTo(shockRef.current, { scale: 0.2, opacity: 0.9 }, { scale: 3.2, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0.05)
        .call(() => (root.dataset.day = String(next)), null, 0.1)
        .to(f, { warm: next, duration: 1.4, ease: 'power2.inOut' }, 0.1)
        .to(track, { opacity: 0, filter: 'blur(8px)', duration: 0.4, ease: 'power2.in' }, 0.05)
        .to(f, { shipO: 0, duration: 0.18 }, 0.4)
        // Rewind behind the scenes, swap the plan, fly back in from the left.
        .call(
          () => {
            setDay(next);
            gsap.killTweensOf(f, 'target');
            f.s = 0;
            f.target = 0;
            f.kickX = -window.innerWidth * 0.4;
            f.kickR = 0.08;
          },
          null,
          0.6,
        )
        .to(f, { shipO: 1, duration: 0.3 }, 0.65)
        .to(f, { kickX: 0, kickR: 0, duration: 1.5, ease: 'expo.out' }, 0.65)
        .to(track, { opacity: 1, filter: 'blur(0px)', duration: 0.7, ease: 'power2.out', clearProps: 'filter' }, 0.8)
        .call(() => glideTo(xsRef.current[0] + 20, 1.3), null, 1.2);
    },
    [day, reduced, glideTo],
  );

  /* ---------- input ---------- */
  const leave = () => {
    window.location.hash = '#schedule';
  };
  const stepTo = useCallback(
    (dir) => {
      const f = flow.current;
      const list = xsRef.current;
      const i = list.filter((x) => x <= f.target + 24).length - 1;
      const j = clamp(i + dir, 0, list.length - 1);
      glideTo(list[j] + 20, 0.9);
    },
    [glideTo],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        leave();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        stepTo(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        stepTo(-1);
      } else if (e.key === 'Home') glideTo(0, 1.2);
      else if (e.key === 'End') glideTo(layout.current.sMax, 1.6);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepTo, glideTo]);

  const onWheel = (e) => {
    if (switching.current) return;
    gsap.killTweensOf(flow.current, 'target');
    flow.current.target += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.9;
  };
  const drag = useRef(null);
  const onPointerDown = (e) => {
    if (e.target instanceof Element && e.target.closest('a, button')) return;
    drag.current = { x: e.clientX };
    gsap.killTweensOf(flow.current, 'target');
  };
  const onPointerMove = (e) => {
    if (!drag.current || switching.current) return;
    flow.current.target -= (e.clientX - drag.current.x) * 1.6;
    drag.current.x = e.clientX;
  };
  const endDrag = () => {
    drag.current = null;
  };

  const other = SCHEDULE_DAYS[1 - day];
  const current = plan.items[Math.max(revealed - 1, 0)];

  return (
    <div
      ref={rootRef}
      data-day={day}
      className="sch-page fixed inset-0 z-40 overflow-hidden text-[#f4f1ea]"
      style={{ '--ship-w': `${L.shipW}px` }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <canvas ref={bgRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="sch-vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* Track: flight line + stops (translated as the shuttle flies) */}
      <div ref={trackRef} className="sch-track absolute left-0 top-0 h-full" style={{ width: L.sMax + L.w }}>
        <svg className="absolute left-0 top-0 overflow-visible" width={L.sMax + L.w} height={L.h} aria-hidden="true">
          <defs>
            <clipPath id="sch-drawn">
              <rect ref={clipRef} x="0" y="0" width="0" height={L.h} />
            </clipPath>
            <linearGradient id="sch-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--line-a)" />
              <stop offset="1" stopColor="var(--line-b)" />
            </linearGradient>
          </defs>
          <path d={pathD} className="sch-line-ghost" />
          <g clipPath="url(#sch-drawn)">
            <path d={pathD} className="sch-line-glow" />
            <path d={pathD} className="sch-line" stroke="url(#sch-line)" />
          </g>
        </svg>
        {plan.items.map((item, i) => (
          <Stop key={`${plan.key}-${i}`} item={item} index={i} x={xs[i]} y={pathY(xs[i], L)} up={i % 2 === 0} on={i < revealed} L={L} />
        ))}
      </div>

      {/* The shuttle */}
      <button
        ref={shipRef}
        type="button"
        className="sch-ship"
        onClick={() => switchTo(1 - day)}
        aria-label={`Switch to ${other.label} schedule`}
        title={`Switch to ${other.label}`}
      >
        <span ref={shockRef} className="sch-ship__shock" aria-hidden="true" />
        <Shuttle />
        <span className="sch-ship__hint" aria-hidden="true">
          Tap for {other.label}
        </span>
      </button>

      <SiteNav active="schedule" />

      {/* Heading */}
      <header ref={headRef} className="sch-head pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+5.25rem)] z-30 flex flex-col items-center px-5 text-center sm:top-28">
        <p className="inline-flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/85 uppercase">
          <Star className="h-2 w-2 text-gold-400/70" />
          Flight plan · {EVENT.dateLabel}
          <Star className="h-2 w-2 text-gold-400/70" />
        </p>
        <h1 className="title-cosmic mt-3 font-display text-[clamp(2.2rem,6.6vw,4.6rem)] font-bold leading-none tracking-[0.12em] [margin-right:-0.12em] uppercase">
          Schedule
        </h1>
        <div className="pointer-events-auto mt-5 sch-days" role="tablist" aria-label="Day">
          {SCHEDULE_DAYS.map((d, i) => (
            <button key={d.key} type="button" role="tab" aria-selected={i === day} className={`sch-day ${i === day ? 'is-on' : ''}`} onClick={() => switchTo(i)}>
              <span className="sch-day__label font-display text-[0.7rem] font-bold tracking-[0.22em] uppercase">{d.label}</span>
              <span className="font-mono text-[0.5rem] tracking-[0.24em] uppercase opacity-70">{d.date}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Flight HUD */}
      <div className="sch-hud" data-dock>
        <div className="flex items-center justify-between gap-4">
          <span className="font-mono text-[0.56rem] tracking-[0.3em] text-gold-300/85 uppercase">
            {plan.label} · {plan.title}
          </span>
          <span className="font-mono text-[0.56rem] tracking-[0.3em] text-white/55 uppercase">
            <span className="text-gold-200">{current?.time}</span> · {pad(revealed)} / {pad(count)}
          </span>
        </div>
        <div className="sch-hud__bar">
          <span ref={barRef} className="sch-hud__fill" />
        </div>
        <p className="mt-2 text-center font-mono text-[0.52rem] tracking-[0.26em] text-white/45 uppercase">
          <span className="hidden sm:inline">Scroll or drag to fly · </span>
          <span className="sm:hidden">Swipe to fly · </span>
          Click the shuttle for {other.label}
        </p>
      </div>
    </div>
  );
}

/** The schedule page (#/schedule): mounted while open, plus its exit animation. */
export default function SchedulePage() {
  const open = useExperience((s) => s.scheduleOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  const onGone = useCallback(() => setMounted(false), []);
  if (!mounted) return null;
  return <ScheduleView open={open} onGone={onGone} />;
}
