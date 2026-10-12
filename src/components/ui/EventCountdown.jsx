import { useEffect, useId, useRef, useState } from 'react';
import { EVENT, prefersReducedMotion } from '../../config/experience';

const START = new Date(EVENT.start).getTime();
const END = new Date(EVENT.end).getTime();
const FROM = new Date(EVENT.countdownFrom).getTime();

function split(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * SVG path for the lit part of a moon. `lit` 0 = new moon, 1 = full moon,
 * waxing (lit from the right). The terminator is an ellipse whose x-radius
 * shrinks to 0 at the half moon.
 */
function moonPath(lit, r = 30, cx = 32, cy = 32) {
  const f = Math.min(Math.max(lit, 0), 1);
  if (f <= 0.001) return '';
  if (f >= 0.999) return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  const rx = Math.abs(1 - 2 * f) * r;
  const sweep = f < 0.5 ? 0 : 1; // crescent bulges right, gibbous bulges left
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`;
}

function phaseName(lit) {
  if (lit < 0.03) return 'New moon';
  if (lit < 0.3) return 'Waxing crescent';
  if (lit < 0.48) return 'First quarter';
  if (lit < 0.52) return 'Half moon';
  if (lit < 0.97) return 'Waxing gibbous';
  return 'Full moon';
}

// Doodle-tile art lives on a 100×100 canvas; the moon sits in the middle.
const MOON = { r: 30, cx: 50, cy: 50 };
const tilePath = (lit) => moonPath(lit, MOON.r, MOON.cx, MOON.cy);

// Illustrated craters (x, y, r) — drawn faintly on the dark side, brighter where lit.
const CRATERS = [
  [40, 38, 6.2],
  [60, 45, 4.3],
  [47, 62, 7.6],
  [65, 63, 3.6],
  [33, 55, 3.3],
  [56, 30, 2.9],
];

// Fine rays radiating around the moon, alternating long / short (like the doodle tiles).
const RAYS = Array.from({ length: 32 }, (_, i) => {
  const a = (i / 32) * Math.PI * 2;
  const r1 = 35.5;
  const r2 = i % 2 ? 40 : 44;
  return [50 + Math.cos(a) * r1, 50 + Math.sin(a) * r1, 50 + Math.cos(a) * r2, 50 + Math.sin(a) * r2];
});

// Four-point sparkles + dots scattered in the tile corners.
const SPARKLES = [
  [13, 15, 3.2],
  [87, 18, 2.4],
  [85, 84, 3],
  [16, 86, 2.2],
];
const DOTS = [
  [24, 10],
  [92, 34],
  [9, 64],
  [72, 92],
  [33, 91],
  [78, 9],
];
const sparkle = (x, y, s) =>
  `M ${x} ${y - s} Q ${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q ${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q ${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q ${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z`;

/**
 * Doodle-style tile art: radiating rays, sparkles, and a flat illustrated moon
 * (navy night side, pale lavender lit side, craters) showing the current phase.
 */
function MoonArt({ lit, pathRef, variant }) {
  const id = useId().replace(/:/g, '');
  const light = variant === 'light';
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <defs>
        {/* Warm ivory moonlight — the site's ivory / gold palette */}
        <radialGradient id={`${id}-lit`} cx="60%" cy="36%" r="75%">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="0.6" stopColor="#f3e7cc" />
          <stop offset="1" stopColor="#d9c493" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <path ref={pathRef} d={tilePath(lit)} />
        </clipPath>
      </defs>

      {/* Rays + sparkles */}
      <g stroke={light ? 'rgba(233,194,122,0.55)' : 'rgba(233,194,122,0.28)'} strokeWidth="0.9" strokeLinecap="round">
        {RAYS.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      <g fill={light ? 'rgba(247,231,196,0.95)' : 'rgba(243,217,164,0.7)'}>
        {SPARKLES.map(([x, y, s]) => (
          <path key={`${x}-${y}`} d={sparkle(x, y, s)} />
        ))}
        {DOTS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" />
        ))}
      </g>

      {/* Night side with faint craters */}
      <circle cx={MOON.cx} cy={MOON.cy} r={MOON.r} fill={light ? '#1f1a44' : '#161c42'} />
      {CRATERS.map(([x, y, r]) => (
        <circle key={`n${x}-${y}`} cx={x} cy={y} r={r} fill="rgba(255,255,255,0.06)" />
      ))}

      {/* Lit side (phase) with illustrated craters */}
      <g clipPath={`url(#${id}-clip)`}>
        <circle cx={MOON.cx} cy={MOON.cy} r={MOON.r} fill={`url(#${id}-lit)`} />
        {CRATERS.map(([x, y, r]) => (
          <circle key={`l${x}-${y}`} cx={x} cy={y} r={r} fill="#d8c59a" opacity="0.7" />
        ))}
        {CRATERS.map(([x, y, r]) => (
          <circle key={`h${x}-${y}`} cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.55} fill="#f0e4c6" opacity="0.8" />
        ))}
      </g>
      <circle cx={MOON.cx} cy={MOON.cy} r={MOON.r - 0.4} fill="none" stroke="rgba(233,194,122,0.35)" strokeWidth="0.8" />
    </svg>
  );
}

/** Seconds moon: re-shaped every animation frame for a perfectly smooth sweep. */
function LiveSecondsMoon({ variant }) {
  const pathRef = useRef(null);
  const [initial] = useState(() => 1 - ((START - Date.now()) % 60000) / 60000);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let raf = 0;
    const loop = () => {
      const remaining = Math.max(START - Date.now(), 0);
      pathRef.current?.setAttribute('d', tilePath(1 - (remaining % 60000) / 60000));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <MoonArt lit={initial} pathRef={pathRef} variant={variant} />;
}

/** A doodle-style moon tile: framed moon-phase art, then value, unit and phase name. */
function MoonCard({ value, label, lit, live = false, minDigits = 2, variant = 'dark' }) {
  return (
    <div className={`moon-card moon-card--${variant}`}>
      <div className="moon-card__art">{live ? <LiveSecondsMoon variant={variant} /> : <MoonArt lit={lit} variant={variant} />}</div>
      <span key={value} className="moon-card__value">
        {String(value).padStart(minDigits, '0')}
      </span>
      <span className="moon-card__label">{label}</span>
      <span className="moon-card__phase">{live ? 'Waxing' : phaseName(lit)}</span>
    </div>
  );
}

/**
 * Live countdown to the fest, as four moon-phase cards (inspired by Google's
 * "Rise of the Half Moon" doodle). Each moon waxes toward full as its unit
 * counts down; the days moon reaches full moon on fest day.
 */
export default function EventCountdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let interval = 0;
    const tick = () => setNow(Date.now());
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 1000);
    }, 1000 - (Date.now() % 1000));
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  if (now >= END) {
    return <p className="font-mono text-xs tracking-[0.4em] text-gold-200 uppercase">Thank you for orbiting with us</p>;
  }
  if (now >= START) {
    return (
      <p className="inline-flex items-center gap-3 font-mono text-xs tracking-[0.4em] text-gold-200 uppercase">
        <span className="live-dot" aria-hidden="true" /> We are live — {EVENT.dateLabel}
      </p>
    );
  }

  const { days, hours, minutes, seconds } = split(START - now);
  const daysLit = 1 - Math.min(Math.max((START - now) / (START - FROM), 0), 1);

  return (
    <div
      role="timer"
      aria-label={`Countdown to ${EVENT.dateLabel}: ${days} days, ${hours} hours, ${minutes} minutes`}
      className="grid grid-cols-4 gap-2 sm:gap-4"
    >
      {/* Tiles alternate deep navy / midnight violet, like the doodle's card grid. */}
      <MoonCard value={days} label="Days" lit={daysLit} variant="dark" />
      <MoonCard value={hours} label="Hours" lit={1 - hours / 24} variant="light" />
      <MoonCard value={minutes} label="Minutes" lit={1 - minutes / 60} variant="dark" />
      <MoonCard value={seconds} label="Seconds" live variant="light" />
    </div>
  );
}
