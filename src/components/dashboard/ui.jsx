import { useEffect, useMemo, useRef, useState } from 'react';
import { prefersReducedMotion, EVENT } from '../../config/experience';
import { PAYMENT } from '../../config/payment';
import { SKY_FRAG, createShaderLayer } from '../../lib/blackHole';

/*
 * The dashboard's shared pieces: icons, the page heading, the blue galaxy
 * behind everything, the payment notice, and the festival ticket.
 */

export const ICONS = {
  overview: 'M3.5 9 10 3.5 16.5 9v7.5h-4.5V12H8v4.5H3.5Z',
  register: 'M5 3.5h7l3 3v10H5ZM12 3.5v3h3M7.5 10h5M7.5 13h3.5',
  events: 'M4 5h12v11H4ZM4 8.5h12M7.5 3v3.5M12.5 3v3.5M7 11.5h2M11 11.5h2M7 14h2',
  myevents: 'M5 4.5h10v12l-5-3-5 3Z',
  team: 'M7 9a2.6 2.6 0 1 0 0-5.2A2.6 2.6 0 0 0 7 9Zm6.5.6a2.1 2.1 0 1 0 0-4.2M2.5 16c.6-2.8 2.4-4.2 4.5-4.2s3.9 1.4 4.5 4.2M13 12c1.9 0 3.4 1.2 4 3.6',
  announcements: 'M4 8.5v3h2.5L12 15V5L6.5 8.5ZM14.5 8a3 3 0 0 1 0 4M16.5 6a6 6 0 0 1 0 8',
  home: 'M3 10 10 3.5 17 10M5.5 8v8.5h9V8',
  logout: 'M8 4H4v12h4M12 6.5 15.5 10 12 13.5M15 10H8',
  solo: 'M10 9a2.8 2.8 0 1 0 0-5.6A2.8 2.8 0 0 0 10 9ZM5 17c.6-3 2.5-4.6 5-4.6s4.4 1.6 5 4.6',
  check: 'M5 10.5l3 3 7-7',
  clock: 'M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM10 6.5V10l2.5 1.6',
  pin: 'M10 17s-5.5-5-5.5-9a5.5 5.5 0 0 1 11 0c0 4-5.5 9-5.5 9ZM10 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  ticket: 'M3 6h14v2.5a1.5 1.5 0 0 0 0 3V14H3v-2.5a1.5 1.5 0 0 0 0-3ZM12 6v8',
  card: 'M3 5.5h14v9H3ZM3 8.5h14M6 12h3',
  upload: 'M10 13V4M6.5 7.5 10 4l3.5 3.5M4 13v3h12v-3',
  link: 'M8.5 11.5 11.5 8.5M9 6l1.5-1.5a3 3 0 0 1 4.2 4.2L13 10.5M11 14l-1.5 1.5a3 3 0 0 1-4.2-4.2L7 9.5',
  alert: 'M10 3.5 17 16H3ZM10 8.5v3.5M10 14.2v.1',
  plus: 'M10 4v12M4 10h12',
  close: 'M5 5l10 10M15 5 5 15',
  copy: 'M7 7h9v9H7ZM4 13V4h9',
  menu: 'M3.5 6h13M3.5 10h13M3.5 14h13',
  print: 'M6 7V3.5h8V7M6 13H4V7h12v6h-2M6 11h8v5.5H6Z',
  arrow: 'M4 10h11M11 6l4 4-4 4',
};

export function Icon({ name, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A section's heading: the title and one plain line under it. */
export function PageHead({ title, children, aside }) {
  return (
    <header className="cd-head" data-hero>
      <div className="min-w-0">
        <h1 className="cd-head__title">{title}</h1>
        {children && <p className="cd-head__lead">{children}</p>}
      </div>
      {aside}
    </header>
  );
}

/** Copy text to the clipboard; `copied` is true for a moment after. */
export function useCopy() {
  const [copied, setCopied] = useState(null);
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return [copied, copy];
}

/** Until the payment is verified: a plain reminder that registrations count only after it. */
export function PayNotice({ user, compact = false }) {
  const status = user.pass.status;
  if (status === 'verified') return null;
  const pending = status === 'pending';
  return (
    <div className={`cd-notice ${pending ? 'is-pending' : ''} ${compact ? 'is-compact' : ''}`} role="note" data-hero>
      <Icon name={pending ? 'clock' : 'alert'} className="cd-notice__icon" />
      <p>
        {pending ? (
          <>
            <b>We’re checking your payment.</b> Your registrations become valid as soon as it’s verified.
          </>
        ) : (
          <>
            <b>Payment pending.</b> You can register for events now, but your registration is valid only after you pay the ₹{PAYMENT.amount} fest pass.
          </>
        )}
      </p>
      {!pending && (
        <a href="#/dashboard/register" className="cd-btn cd-btn--gold cd-btn--sm">
          Pay now
        </a>
      )}
    </div>
  );
}

/** A QR-style mark generated from a string (a stand-in until the server issues the real ticket QR). */
export function PassCode({ value, size = 21 }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    for (const ch of value) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
    const finder = (x, y) => [[0, 0], [size - 7, 0], [0, size - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
    const out = [];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (finder(x, y)) continue;
        if (rand() < 0.48) out.push([x, y]);
      }
    return out;
  }, [value, size]);
  const Finder = ({ x, y }) => (
    <g>
      <rect x={x + 0.5} y={y + 0.5} width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${size + 2} ${size + 2}`} className="cd-qr" role="img" aria-label={`Code for ${value}`} shapeRendering="crispEdges">
      <rect x="-1" y="-1" width={size + 2} height={size + 2} fill="#ffffff" />
      <g fill="#0b1020" color="#0b1020">
        {cells.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
        ))}
        <Finder x={0} y={0} />
        <Finder x={size - 7} y={0} />
        <Finder x={0} y={size - 7} />
      </g>
    </svg>
  );
}

/** The festival ticket, issued once the payment is verified. Shown at the registration desk. */
export function Ticket({ user, events }) {
  const p = user.profile ?? {};
  return (
    <article className="cd-ticket" aria-label="Your CUBYC festival ticket">
      <div className="cd-ticket__main">
        <p className="cd-ticket__brand">
          CUBYC <span>— Fest’2027</span>
        </p>
        <p className="cd-ticket__kind">Festival pass · Admit one</p>
        <h3 className="cd-ticket__name">{user.name}</h3>
        <p className="cd-ticket__meta">{[p.course, p.college].filter(Boolean).join(' · ') || user.email}</p>
        <dl className="cd-ticket__facts">
          <div>
            <dt>CUBYC ID</dt>
            <dd>{user.cubycId}</dd>
          </div>
          <div>
            <dt>Ticket no.</dt>
            <dd>{user.pass.ticket}</dd>
          </div>
          <div>
            <dt>Dates</dt>
            <dd>{EVENT.dateLabel}</dd>
          </div>
          <div>
            <dt>Events</dt>
            <dd>{events}</dd>
          </div>
        </dl>
        <p className="cd-ticket__ok">
          <Icon name="check" className="h-3.5 w-3.5" /> Payment verified · Valid for entry
        </p>
      </div>
      <div className="cd-ticket__stub">
        <PassCode value={`${user.cubycId}|${user.pass.ticket}`} />
        <b>{user.cubycId}</b>
        <small>Show at the registration desk</small>
      </div>
    </article>
  );
}

/**
 * The backdrop: the gallery page's sky (violet-indigo nebula and twinkling
 * stars, drawn by a shader — without the black hole), scattered brighter dot
 * stars over it, and now and then a shooting star streaking across.
 */
export function SpaceBackdrop() {
  const skyRef = useRef(null);
  const ref = useRef(null);
  useEffect(() => {
    const reduced = prefersReducedMotion();
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    const sky = createShaderLayer(skyRef.current, SKY_FRAG);
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let seed = 2027;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const COLORS = ['#ffffff', '#dbe7ff', '#b9d0ff', '#cfd8ff', '#fff4dc'];
    const dots = Array.from({ length: touch ? 90 : 160 }, () => {
      const big = rand() < 0.12;
      return {
        x: rand(),
        y: rand(),
        r: big ? 1.1 + rand() * 0.8 : 0.4 + rand() * 0.6,
        a: big ? 0.7 + rand() * 0.3 : 0.3 + rand() * 0.45,
        c: COLORS[Math.floor(rand() * COLORS.length)],
        ph: rand() * Math.PI * 2,
        tw: 0.5 + rand() * 1.8,
        big,
      };
    });
    const shots = [];
    let nextShot = 1.2;
    const spawn = () => {
      // Mostly from the upper area, streaking down and to one side.
      const dir = Math.random() < 0.65 ? -1 : 1;
      const ang = (dir < 0 ? Math.PI - 0.5 : 0.5) + (Math.random() - 0.5) * 0.35;
      shots.push({
        x: w * (dir < 0 ? 0.35 + Math.random() * 0.65 : Math.random() * 0.65),
        y: h * Math.random() * 0.45,
        vx: Math.cos(ang),
        vy: Math.sin(ang),
        speed: 650 + Math.random() * 450,
        len: 120 + Math.random() * 140,
        life: 0,
        max: 0.75 + Math.random() * 0.5,
      });
    };

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      sky?.resize(w, h, touch ? 1 : Math.min(dpr, 1.25));
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    let t = 0;
    const draw = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      t += dt;
      sky?.draw({ uRes: [w * (touch ? 1 : Math.min(dpr, 1.25)), h * (touch ? 1 : Math.min(dpr, 1.25))], uTime: t });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const s of dots) {
        const a = s.a * (reduced ? 1 : 0.55 + 0.45 * Math.sin(t * s.tw + s.ph));
        const x = s.x * w;
        const y = s.y * h;
        ctx.globalAlpha = a;
        ctx.fillStyle = s.c;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.big) {
          ctx.globalAlpha = a * 0.16;
          ctx.beginPath();
          ctx.arc(x, y, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (!reduced) {
        nextShot -= dt;
        if (nextShot <= 0) {
          spawn();
          nextShot = 2.2 + Math.random() * 3.8;
        }
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          s.life += dt;
          s.x += s.vx * s.speed * dt;
          s.y += s.vy * s.speed * dt;
          const k = s.life / s.max;
          if (k >= 1) {
            shots.splice(i, 1);
            continue;
          }
          const fade = Math.sin(Math.PI * k);
          const tx = s.x - s.vx * s.len;
          const ty = s.y - s.vy * s.len;
          const g = ctx.createLinearGradient(s.x, s.y, tx, ty);
          g.addColorStop(0, 'rgba(255,255,255,0.95)');
          g.addColorStop(0.25, 'rgba(190,215,255,0.5)');
          g.addColorStop(1, 'rgba(120,160,255,0)');
          ctx.globalAlpha = fade;
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.globalAlpha = fade * 0.9;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = fade * 0.25;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
          ctx.fill();
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
      document.removeEventListener('visibilitychange', onVis);
      sky?.destroy();
    };
  }, []);
  return (
    <div className="cd-bg" aria-hidden="true">
      <canvas ref={skyRef} className="cd-bg__sky" />
      <canvas ref={ref} className="cd-bg__stars" />
    </div>
  );
}
