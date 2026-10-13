import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { EVENT, mulberry32, prefersReducedMotion } from '../../config/experience';
import Frame from './Frame';

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

/* -------------------------------------------------------------------------- */
/*  A realistic lunar surface, painted once into a canvas                     */
/* -------------------------------------------------------------------------- */

const TEX_SIZE = 256;
let moonTextureUrl = null;

/**
 * Procedural full-moon disc: grey regolith with darker maria, craters with a
 * sunlit rim and shadowed wall (light from the right, as the moon waxes),
 * and limb darkening. Generated once, then shared by every moon as an image.
 */
function moonTexture() {
  if (moonTextureUrl) return moonTextureUrl;
  const N = TEX_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(N, N);
  const rand = mulberry32(1969);

  // Smooth value noise + fractal sum.
  const G = 128;
  const grid = new Float32Array(G * G);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const at = (i, j) => grid[(((j % G) + G) % G) * G + (((i % G) + G) % G)];
  const smooth = (t) => t * t * (3 - 2 * t);
  const noise = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = smooth(x - xi);
    const v = smooth(y - yi);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, octaves = 5) => {
    let f = 0;
    let amp = 0.5;
    for (let o = 0; o < octaves; o++) {
      f += amp * noise(x, y);
      x *= 2.03;
      y *= 2.03;
      amp *= 0.5;
    }
    return f;
  };
  const sstep = (a, b, x) => {
    const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
    return t * t * (3 - 2 * t);
  };

  // Craters: many small, few large (x, y in -1…1, r in disc units).
  const craters = [];
  for (let i = 0; i < 70; i++) {
    const r = 0.018 + Math.pow(rand(), 3.2) * 0.12;
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.95;
    craters.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r });
  }
  const L = { x: 0.95, y: -0.3 }; // light from the right, slightly above

  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      const nx = ((px + 0.5) / N) * 2 - 1;
      const ny = ((py + 0.5) / N) * 2 - 1;
      const r2 = nx * nx + ny * ny;
      const o = (py * N + px) * 4;
      if (r2 > 1) {
        img.data[o + 3] = 0;
        continue;
      }
      const z = Math.sqrt(1 - r2);
      // Highlands, with maria (the dark "seas") weighted to the upper left like the real near side.
      let v = 0.7 + (fbm(nx * 3 + 5, ny * 3 + 5) - 0.5) * 0.24;
      const m = fbm(nx * 1.25 + 11, ny * 1.25 + 3, 4) + (-nx * 0.08 - ny * 0.1);
      v *= 1 - sstep(0.5, 0.6, m) * 0.36;
      v += (noise(px * 0.45, py * 0.45) - 0.5) * 0.06; // regolith grain

      for (const c of craters) {
        const dx = nx - c.x;
        const dy = ny - c.y;
        const d = Math.sqrt(dx * dx + dy * dy) / c.r;
        if (d > 1.35) continue;
        if (d < 1) {
          // Floor slightly darker; inner wall facing the light is bright, the far wall in shadow.
          const facing = -(dx * L.x + dy * L.y) / (c.r * Math.max(d, 0.001));
          v *= 1 - 0.1 * (1 - sstep(0.6, 1, d));
          v += facing * sstep(0.45, 1, d) * 0.16;
        } else {
          v += (1 - sstep(1, 1.35, d)) * 0.035; // ejecta apron
        }
      }

      // Limb darkening + antialiased edge.
      v *= 0.62 + 0.38 * Math.pow(z, 0.55);
      const edge = Math.min(Math.max((1 - Math.sqrt(r2)) * (N / 2), 0), 1);
      img.data[o] = Math.min(255, v * 242);
      img.data[o + 1] = Math.min(255, v * 236);
      img.data[o + 2] = Math.min(255, v * 226);
      img.data[o + 3] = edge * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  moonTextureUrl = canvas.toDataURL('image/png');
  return moonTextureUrl;
}

/* -------------------------------------------------------------------------- */
/*  Moon + countdown                                                          */
/* -------------------------------------------------------------------------- */

const R = 48;
const phasePath = (lit) => moonPath(lit, R, 50, 50);

/**
 * A realistic moon in its current phase: the lit side is the lunar surface,
 * the terminator is softened, and the night side keeps a faint earthshine.
 */
function Moon({ lit, pathRef }) {
  const id = useId().replace(/:/g, '');
  const tex = useMemo(moonTexture, []);
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <defs>
        <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <mask id={`${id}-phase`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <path ref={pathRef} d={phasePath(lit)} fill="#fff" filter={`url(#${id}-soft)`} />
        </mask>
        <clipPath id={`${id}-disc`}>
          <circle cx="50" cy="50" r={R} />
        </clipPath>
        <radialGradient id={`${id}-shade`} cx="62%" cy="40%" r="70%">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${id}-disc)`}>
        {/* Night side: deep shadow with a whisper of earthshine */}
        <circle cx="50" cy="50" r={R} fill="#070912" />
        <image href={tex} x={50 - R} y={50 - R} width={R * 2} height={R * 2} opacity="0.1" />
        {/* Day side */}
        <g mask={`url(#${id}-phase)`}>
          <image href={tex} x={50 - R} y={50 - R} width={R * 2} height={R * 2} />
          <circle cx="50" cy="50" r={R} fill={`url(#${id}-shade)`} />
        </g>
      </g>
    </svg>
  );
}

/** Seconds moon: re-shaped every animation frame for a perfectly smooth sweep. */
function LiveSecondsMoon() {
  const pathRef = useRef(null);
  const [initial] = useState(() => 1 - ((START - Date.now()) % 60000) / 60000);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let raf = 0;
    const loop = () => {
      const remaining = Math.max(START - Date.now(), 0);
      pathRef.current?.setAttribute('d', phasePath(1 - (remaining % 60000) / 60000));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <Moon lit={initial} pathRef={pathRef} />;
}

/** One unit of the countdown: its moon, the value and the unit. */
function Unit({ value, label, lit, live = false, minDigits = 2 }) {
  return (
    <div className="moon-timer__unit">
      <div className="moon-timer__moon">{live ? <LiveSecondsMoon /> : <Moon lit={lit} />}</div>
      <span key={value} className="moon-timer__value">
        {String(value).padStart(minDigits, '0')}
      </span>
      <span className="moon-timer__label">{label}</span>
    </div>
  );
}

/**
 * Live countdown to the fest on one glass panel. Each unit's moon waxes toward
 * full as it counts down; the days moon reaches full moon on fest day.
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
      className="moon-timer"
    >
      <Frame />
      <Unit value={days} label="Days" lit={daysLit} />
      <Unit value={hours} label="Hours" lit={1 - hours / 24} />
      <Unit value={minutes} label="Minutes" lit={1 - minutes / 60} />
      <Unit value={seconds} label="Seconds" live />
    </div>
  );
}
