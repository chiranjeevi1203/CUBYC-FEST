import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Frame from '../ui/Frame';
import { ALL_EVENTS } from '../../config/allEvents';
import { DEPT_ORDER } from '../../config/departments';
import { prefersReducedMotion } from '../../config/experience';

/*
 * "Open to all" pop-up on the events page. Each visit, two spacecraft arrive
 * docked nose to nose in the centre of the screen, fire their separation
 * thrusters and part to unfold the message between them. Closing burns them
 * back together, docks them and sends the pair off into the distance.
 *
 * Physics, roughly: the forward thrusters (by the docking collars) push the
 * craft apart and the main engines brake them; closing runs the other way round.
 */

const VB_W = 300;
const VB_H = 160;
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

/** A solar wing: a framed panel of cells, from four corners (root a–b, tip c–d). */
function Wing({ a, b, c, d, cols = 9, rows = 3 }) {
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  // u runs root → tip, v across the wing
  const at = (u, v) => lerp(lerp(a, d, u), lerp(b, c, u), v);
  const pts = (list) => list.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
  const cells = [];
  const gu = 0.012;
  const gv = 0.05;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const u0 = i / cols + gu;
      const u1 = (i + 1) / cols - gu;
      const v0 = j / rows + gv;
      const v1 = (j + 1) / rows - gv;
      cells.push(<polygon key={`${i}-${j}`} points={pts([at(u0, v0), at(u0, v1), at(u1, v1), at(u1, v0)])} />);
    }
  }
  const all = pts([a, b, c, d]);
  const yoke = [at(-0.06, 0.3), at(-0.06, 0.7), at(0, 0.7), at(0, 0.3)];
  return (
    <g>
      <polygon points={pts(yoke)} fill="url(#xd-hullDark)" />
      <polygon points={all} fill="#2b303b" />
      <g fill="url(#xd-cell)">{cells}</g>
      <polygon points={all} fill="url(#xd-cellSheen)" />
      <polygon points={all} fill="none" stroke="#c3c8cf" strokeWidth="0.8" />
    </g>
  );
}

/** Cylinder ribs (radiator fins on an aft skirt). */
const ribs = (x, y, h, n) => Array.from({ length: n }, (_, i) => `M${x + 2 + i * 2.2} ${y}v${h}`).join('');

/** A hull section: shaded cylinder, light falloff along its length and a specular line. */
function Section({ x, y, w, h, dark = false }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={dark ? 'url(#xd-hullDark)' : 'url(#xd-hull)'} />
      <rect x={x} y={y} width={w} height={h} fill="url(#xd-fall)" />
      <path d={`M${x} ${y + h * 0.17}h${w}`} stroke="rgba(255,255,255,0.75)" strokeWidth="0.7" />
      <path d={`M${x} ${y}v${h}M${x + w} ${y}v${h}`} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
    </g>
  );
}

/** Shared gradients, patterns and filters (one copy per page). */
function Defs() {
  return (
    <svg className="xd-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="xd-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe3e8" />
          <stop offset="0.14" stopColor="#ffffff" />
          <stop offset="0.3" stopColor="#eef0f3" />
          <stop offset="0.56" stopColor="#bcc1c8" />
          <stop offset="0.8" stopColor="#6f757e" />
          <stop offset="0.93" stopColor="#3a3f47" />
          <stop offset="1" stopColor="#5a5246" />
        </linearGradient>
        <linearGradient id="xd-hullDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c3c7cd" />
          <stop offset="0.2" stopColor="#eceef1" />
          <stop offset="0.5" stopColor="#959ba3" />
          <stop offset="0.82" stopColor="#4a4f57" />
          <stop offset="1" stopColor="#1d2025" />
        </linearGradient>
        {/* light from the upper left: brighter fore end, darker aft end */}
        <linearGradient id="xd-fall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#00040c" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id="xd-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a9098" />
          <stop offset="0.2" stopColor="#dfe3e8" />
          <stop offset="0.36" stopColor="#5b6068" />
          <stop offset="0.7" stopColor="#25282d" />
          <stop offset="1" stopColor="#0f1013" />
        </linearGradient>
        <linearGradient id="xd-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff0c8" />
          <stop offset="0.22" stopColor="#e9c27a" />
          <stop offset="0.45" stopColor="#a06c2a" />
          <stop offset="0.62" stopColor="#f3d39a" />
          <stop offset="0.82" stopColor="#b8853c" />
          <stop offset="1" stopColor="#5e3d14" />
        </linearGradient>
        <linearGradient id="xd-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c99a5c" />
          <stop offset="0.4" stopColor="#7a5530" />
          <stop offset="1" stopColor="#2a1c10" />
        </linearGradient>
        <linearGradient id="xd-cell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b3a6e" />
          <stop offset="0.5" stopColor="#0d1430" />
          <stop offset="1" stopColor="#1f2d5a" />
        </linearGradient>
        <linearGradient id="xd-cellSheen" x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0.2" stopColor="#a9c6ff" stopOpacity="0" />
          <stop offset="0.42" stopColor="#d6e4ff" stopOpacity="0.3" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="0.62" stopColor="#a9c6ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="xd-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7e9cc8" />
          <stop offset="0.4" stopColor="#0b1120" />
          <stop offset="1" stopColor="#24324f" />
        </linearGradient>
        <radialGradient id="xd-dish" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#c9ced5" />
          <stop offset="1" stopColor="#6a7079" />
        </radialGradient>
        <radialGradient id="xd-throat" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff4dc" />
          <stop offset="0.35" stopColor="#ffb257" />
          <stop offset="0.75" stopColor="#d2531a" stopOpacity="0.7" />
          <stop offset="1" stopColor="#7a1d06" stopOpacity="0" />
        </radialGradient>
        <pattern id="xd-rad" width="4" height="2.4" patternUnits="userSpaceOnUse">
          <rect width="4" height="2.4" fill="#dde1e6" />
          <rect y="1.6" width="4" height="0.8" fill="#8f959d" />
        </pattern>
        {/* Crinkled insulation foil: noise lit from the upper left, multiplied into the gold */}
        <filter id="xd-foil" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.32 0.22" numOctaves="2" seed="7" result="noise" />
          <feDiffuseLighting in="noise" surfaceScale="1.8" lightingColor="#fff4d8" result="light">
            <feDistantLight azimuth="225" elevation="50" />
          </feDiffuseLighting>
          <feComposite in="light" in2="SourceGraphic" operator="arithmetic" k1="1.3" k2="0.12" k3="0" k4="0" result="lit" />
          <feComposite in="lit" in2="SourceAlpha" operator="in" />
        </filter>
        {/* Heat haze: the hot exhaust wobbles whatever it is drawn over */}
        <filter id="xd-haze" x="-40%" y="-80%" width="180%" height="260%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.11" numOctaves="2" seed="4" result="noise">
            <animate attributeName="baseFrequency" dur="0.7s" values="0.02 0.11;0.026 0.14;0.02 0.11" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

/** Gold insulation blanket. */
const Foil = (props) => <rect {...props} fill="url(#xd-gold)" filter="url(#xd-foil)" />;

/** Port craft: service module with long solar wings; docking collar on its right. */
function CraftLeft() {
  return (
    <svg className="xd-craft__art" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true">
      <Wing a={[91, 44]} b={[117, 44]} c={[69, -20]} d={[43, -20]} />
      <Wing a={[91, 116]} b={[117, 116]} c={[165, 180]} d={[139, 180]} />
      {/* main engine, with cooling bands */}
      <path d="M38 68C26 70 15 61 5 54V106C15 99 26 90 38 92Z" fill="url(#xd-steel)" />
      <path d="M16 60.5V99.5M26 66V94" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />
      <path d="M37 69.5C26 71 15 62.5 6 56.5" stroke="rgba(255,255,255,0.45)" strokeWidth="0.9" fill="none" />
      <ellipse cx="5" cy="80" rx="3.2" ry="26" fill="#07080b" stroke="#80868e" strokeWidth="0.6" />
      <ellipse className="xd-throat" cx="5.6" cy="80" rx="2.4" ry="22" fill="url(#xd-throat)" />
      <Section x={38} y={64} w={10} h={32} dark />
      {/* aft skirt with radiator fins */}
      <Section x={48} y={45} w={16} h={70} dark />
      <path d={ribs(48, 45, 70, 6)} stroke="rgba(0,0,0,0.3)" strokeWidth="0.55" />
      {/* service module */}
      <Section x={64} y={48} w={100} h={64} />
      <rect x="70" y="53" width="28" height="19" fill="url(#xd-rad)" opacity="0.85" />
      <path d="M112 48v64M138 48v64M64 96h48" stroke="rgba(20,24,30,0.3)" strokeWidth="0.6" />
      <Foil x="116" y="80" width="44" height="28" />
      <path d="M70 102h30M70 106h22" stroke="#d9b56a" strokeWidth="0.9" />
      <rect x="101" y="40" width="6" height="8" fill="url(#xd-hullDark)" />
      <rect x="101" y="112" width="6" height="8" fill="url(#xd-hullDark)" />
      <g fill="url(#xd-hullDark)">
        <rect x="148" y="43" width="10" height="5" />
        <rect x="148" y="112" width="10" height="5" />
      </g>
      <path d="M150 43l-2-3M156 43l2-3M150 117l-2 3M156 117l2 3" stroke="#9aa0a8" strokeWidth="0.8" />
      {/* pressurised module, with an antenna dish */}
      <Section x={164} y={52} w={70} h={56} />
      <Foil x="164" y="52" width="7" height="56" />
      <rect x="190" y="64" width="18" height="22" rx="2" fill="#1b1e24" stroke="#aab0b8" strokeWidth="0.7" />
      <path d="M186 59.5h26M186 90.5h26" stroke="#d9b56a" strokeWidth="1" />
      <circle cx="221" cy="80" r="3.2" fill="url(#xd-glass)" stroke="#9aa0a8" strokeWidth="0.6" />
      <path d="M164 100h70" stroke="rgba(20,24,30,0.25)" strokeWidth="0.6" />
      <path d="M214 52V36" stroke="#b9bfc7" strokeWidth="1.1" />
      <ellipse cx="214" cy="34" rx="9" ry="3" fill="url(#xd-dish)" stroke="#8a9098" strokeWidth="0.5" transform="rotate(-18 214 34)" />
      <path d="M214 34l3-7" stroke="#c9ced5" strokeWidth="0.7" />
      {/* adapter truss */}
      <Section x={238} y={70} w={20} h={20} dark />
      <rect x="240" y="73" width="16" height="3" fill="#b06a35" />
      <rect x="240" y="84" width="16" height="3" fill="#8c4f24" />
      <path d="M234 56L262 66M234 104L262 94" stroke="#e3e6ea" strokeWidth="1.7" />
      <path d="M234 56L262 94M234 104L262 66" stroke="#8f959d" strokeWidth="1" />
      {/* docking collar */}
      <Section x={262} y={64} w={20} h={32} />
      <Section x={280} y={58} w={6} h={44} dark />
      <Section x={286} y={62} w={8} h={36} />
      <path d="M294 64L300 70L294 75ZM294 96L300 90L294 85Z" fill="#c9ced5" />
      <circle className="xd-nav xd-nav--port" cx="283" cy="56" r="1.9" />
    </svg>
  );
}

/** Starboard craft: crew capsule and service module; docking probe on its left. */
function CraftRight() {
  return (
    <svg className="xd-craft__art" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true">
      <Wing a={[187, 44]} b={[213, 44]} c={[259, -20]} d={[233, -20]} />
      <Wing a={[187, 116]} b={[213, 116]} c={[161, 180]} d={[135, 180]} />
      {/* docking probe and collar */}
      <path d="M6 64L0 70L6 75ZM6 96L0 90L6 85Z" fill="#c9ced5" />
      <Section x={6} y={62} w={8} h={36} />
      <Section x={14} y={58} w={6} h={44} dark />
      <Section x={20} y={64} w={16} h={32} />
      <circle className="xd-nav xd-nav--starboard" cx="17" cy="56" r="1.9" />
      {/* crew capsule */}
      <path d="M36 66L36 94L108 116L108 44Z" fill="url(#xd-hull)" />
      <path d="M36 66L36 94L108 116L108 44Z" fill="url(#xd-fall)" />
      <path d="M36 66.6L108 45.4" stroke="rgba(255,255,255,0.7)" strokeWidth="0.7" />
      <path d="M60 58.7V101.3M84 51.3V108.7" stroke="rgba(20,24,30,0.28)" strokeWidth="0.6" />
      <path d="M64 66.5L76 62.8V71.5L64 74Z" fill="url(#xd-glass)" stroke="#9aa0a8" strokeWidth="0.6" />
      <path d="M65 67.6l4-1.2" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />
      <rect x="88" y="76" width="13" height="18" rx="1.5" fill="#1b1e24" stroke="#aab0b8" strokeWidth="0.6" />
      <path d="M86 73h17" stroke="#d9b56a" strokeWidth="0.9" />
      <rect x="44" y="84" width="6" height="4" fill="url(#xd-hullDark)" />
      <path d="M70 61V48" stroke="#c9ced5" strokeWidth="0.8" />
      <rect x="108" y="42" width="5" height="76" fill="url(#xd-shield)" />
      {/* service module */}
      <Section x={113} y={46} w={120} h={68} />
      <Foil x="113" y="46" width="10" height="68" />
      <rect x="182" y="52" width="12" height="22" fill="url(#xd-rad)" opacity="0.85" />
      <rect x="206" y="52" width="22" height="22" fill="url(#xd-rad)" opacity="0.85" />
      <path d="M150 46v68M178 46v68M123 98h110" stroke="rgba(20,24,30,0.28)" strokeWidth="0.6" />
      <Foil x="152" y="100" width="24" height="12" />
      <rect x="197" y="40" width="6" height="6" fill="url(#xd-hullDark)" />
      <rect x="197" y="114" width="6" height="6" fill="url(#xd-hullDark)" />
      <g fill="url(#xd-hullDark)">
        <rect x="126" y="41" width="10" height="5" />
        <rect x="126" y="114" width="10" height="5" />
      </g>
      <path d="M128 41l-2-3M134 41l2-3M128 119l-2 3M134 119l2 3" stroke="#9aa0a8" strokeWidth="0.8" />
      <path d="M168 114v12" stroke="#b9bfc7" strokeWidth="1.1" />
      <ellipse cx="168" cy="128" rx="8" ry="2.6" fill="url(#xd-dish)" stroke="#8a9098" strokeWidth="0.5" transform="rotate(14 168 128)" />
      <g className="xd-mark">
        {'CUBYC'.split('').map((ch, i) => (
          <text key={i} x="137.5" y={63 + i * 8.6} textAnchor="middle">
            {ch}
          </text>
        ))}
      </g>
      {/* aft skirt and main engine */}
      <Section x={233} y={45} w={16} h={70} dark />
      <path d={ribs(233, 45, 70, 6)} stroke="rgba(0,0,0,0.3)" strokeWidth="0.55" />
      <Section x={249} y={64} w={10} h={32} dark />
      <path d="M259 68C271 70 282 61 292 54V106C282 99 271 90 259 92Z" fill="url(#xd-steel)" />
      <path d="M281 60.5V99.5M271 66V94" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />
      <path d="M260 69.5C271 71 282 62.5 291 56.5" stroke="rgba(255,255,255,0.45)" strokeWidth="0.9" fill="none" />
      <ellipse cx="292" cy="80" rx="3.2" ry="26" fill="#07080b" stroke="#80868e" strokeWidth="0.6" />
      <ellipse className="xd-throat" cx="291.4" cy="80" rx="2.4" ry="22" fill="url(#xd-throat)" />
    </svg>
  );
}

/** Exhaust: a hot white core with shock diamonds, a blue body and a warm glow. */
function Plume({ kind }) {
  return (
    <span className={`xd-plume xd-plume--${kind}`} aria-hidden="true">
      <span className="xd-plume__in">
        <span className="xd-plume__glow" />
        <span className="xd-plume__body" />
        <span className="xd-plume__core" />
        {kind === 'main' && <span className="xd-plume__shock" />}
      </span>
    </span>
  );
}

function Craft({ side }) {
  return (
    <div className={`xd-craft xd-craft--${side}`}>
      <Plume kind="main" />
      <Plume kind="rcs-up" />
      <Plume kind="rcs-down" />
      {side === 'l' ? <CraftLeft /> : <CraftRight />}
    </div>
  );
}

/** Sizes and the centred position of the pop-up for this screen. */
function geometry(plateEl) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cw = clamp(w * 0.17, 136, 250); // one craft
  const ch = (cw * VB_H) / VB_W;
  const pw = Math.round(clamp(w - 2 * (cw + 8 + 18), Math.min(w - 2 * 62, 300), 640));
  const ph = plateEl?.offsetHeight || 220;
  const nav = document.querySelector('.ev-page > .nv')?.getBoundingClientRect();
  // Centred on the screen, but never tucked under the navbar.
  const y = Math.max(h / 2, (nav ? nav.bottom : 72) + 12 + Math.max(ph, ch) / 2);
  return { cw, ch, pw, x: w / 2, y, sep: pw / 2 + 8 };
}

export default function OpenToAllDock() {
  // hidden → open → closing → gone (unmounted with the events page; shown again next visit)
  const [phase, setPhase] = useState('hidden');
  const rootRef = useRef(null);
  const bodyRef = useRef(null);
  const plateRef = useRef(null);
  const scrimRef = useRef(null);
  const closeRef = useRef(null);
  const st = useRef({ x: 0, y: 0, s: 0.3, o: 0, sep: 0, main: 0, rcs: 0, flare: 0, ring: 0, lit: 0, idle: 0 });
  const tl = useRef(null);

  const apply = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const s = st.current;
    el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0) scale(${s.s.toFixed(4)})`;
    el.style.opacity = s.o.toFixed(3);
    el.style.setProperty('--sep', `${s.sep.toFixed(1)}px`);
    el.style.setProperty('--main', s.main.toFixed(3));
    el.style.setProperty('--rcs', s.rcs.toFixed(3));
    el.style.setProperty('--flare', s.flare.toFixed(3));
    el.style.setProperty('--ring', s.ring.toFixed(3));
    el.style.setProperty('--lit', s.lit.toFixed(3));
    el.style.setProperty('--idle', s.idle.toFixed(3));
  }, []);

  // Size everything for the screen, and keep it centred if the window changes.
  useLayoutEffect(() => {
    if (phase === 'gone') return undefined;
    const place = () => {
      const g = geometry(plateRef.current);
      const el = rootRef.current;
      el.style.setProperty('--cw', `${g.cw}px`);
      el.style.setProperty('--ch', `${g.ch}px`);
      el.style.setProperty('--pw', `${g.pw}px`);
      const s = st.current;
      s.x = g.x;
      s.y = g.y;
      if (phase === 'open' && !tl.current?.isActive()) s.sep = g.sep;
      apply();
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [phase, apply]);

  // Every visit to the events page: pop up once the page has faded in.
  useEffect(() => {
    const t = window.setTimeout(() => setPhase('open'), 850);
    return () => window.clearTimeout(t);
  }, []);

  // Arrive, undock and unfold — or fold, re-dock and fly off.
  useEffect(() => {
    if (phase !== 'open' && phase !== 'closing') return undefined;
    const g = geometry(plateRef.current);
    const s = st.current;
    const plate = plateRef.current;
    const lines = plate.querySelectorAll('[data-xd-line]');
    tl.current?.kill();

    if (prefersReducedMotion()) {
      const show = phase === 'open';
      Object.assign(s, { x: g.x, y: g.y, s: 1, o: show ? 1 : 0, sep: g.sep, idle: show ? 1 : 0, main: 0, rcs: 0, flare: 0, ring: 0, lit: 0 });
      apply();
      gsap.set(plate, { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)' });
      gsap.set(lines, { autoAlpha: 1, y: 0, filter: 'none' });
      gsap.set(scrimRef.current, { autoAlpha: show ? 1 : 0 });
      if (show) closeRef.current?.focus({ preventScroll: true });
      else setPhase('gone');
      return undefined;
    }

    const t = gsap.timeline({ onUpdate: apply, onComplete: apply });
    if (phase === 'open') {
      Object.assign(s, { x: g.x, y: g.y, s: 0.32, o: 0, sep: 0, ring: 0 });
      gsap.set(plate, { autoAlpha: 0 });
      gsap.set(bodyRef.current, { filter: 'blur(6px)' });
      t.to(scrimRef.current, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 0)
        // In from deep space, still docked, closing on the viewer.
        .to(s, { o: 1, duration: 0.45, ease: 'power1.out' }, 0)
        .to(s, { s: 1, duration: 1.05, ease: 'power3.out' }, 0)
        .to(bodyRef.current, { filter: 'blur(0px)', duration: 0.8, ease: 'power2.out', clearProps: 'filter' }, 0)
        .to(s, { idle: 0.6, duration: 0.6 }, 0.2)
        // Separation: the collars release, the forward thrusters kick the craft apart.
        .to(s, { flare: 1, lit: 1, duration: 0.12, ease: 'power2.out' }, 1.1)
        .to(s, { ring: 1, duration: 1, ease: 'power2.out' }, 1.1)
        .to(s, { flare: 0, duration: 1, ease: 'power2.in' }, 1.24)
        .to(s, { lit: 0, duration: 0.9, ease: 'power1.in' }, 1.3)
        .to(s, { rcs: 1, duration: 0.1 }, 1.12)
        .to(s, { rcs: 0, duration: 0.5, ease: 'power1.in' }, 1.44)
        .to(s, { sep: g.sep, duration: 1.2, ease: 'power3.out' }, 1.14)
        .fromTo(plate, { autoAlpha: 1, clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.05, ease: 'power3.out' }, 1.22)
        .fromTo(lines, { autoAlpha: 0, y: 12, filter: 'blur(6px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.7, stagger: 0.09, ease: 'power2.out' }, 1.46)
        .add(() => plate.classList.add('is-lit'), 1.5)
        // Main engines brake them on station, then idle.
        .to(s, { main: 1, duration: 0.14, ease: 'power2.out' }, 1.74)
        .to(s, { main: 0, duration: 0.7, ease: 'power2.in' }, 1.99)
        .to(s, { idle: 1, duration: 0.6 }, 1.84)
        .add(() => closeRef.current?.focus({ preventScroll: true }), 1.9);
    } else {
      t.to(lines, { autoAlpha: 0, y: -6, duration: 0.25, stagger: 0.03, ease: 'power1.in' }, 0)
        .to(plate, { clipPath: 'inset(0% 50% 0% 50%)', duration: 0.6, ease: 'power3.in' }, 0.12)
        .set(plate, { autoAlpha: 0 }, 0.72)
        // Main engines push them together; the forward thrusters brake before contact.
        .to(s, { main: 1, duration: 0.12, ease: 'power2.out' }, 0.05)
        .to(s, { main: 0, duration: 0.5, ease: 'power2.in' }, 0.3)
        .to(s, { sep: 0, duration: 1.05, ease: 'power2.inOut' }, 0.12)
        .to(s, { rcs: 0.85, duration: 0.08 }, 0.8)
        .to(s, { rcs: 0, duration: 0.32, ease: 'power1.in' }, 0.9)
        // Capture: a flash at the collars and a small jolt.
        .set(s, { ring: 0 }, 1.15)
        .to(s, { flare: 0.6, lit: 0.6, duration: 0.08 }, 1.15)
        .to(s, { flare: 0, lit: 0, duration: 0.55, ease: 'power2.in' }, 1.23)
        .to(s, { ring: 1, duration: 0.8, ease: 'power2.out' }, 1.15)
        .fromTo(bodyRef.current, { x: -2 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }, 1.15)
        // Docked again, the pair burns away into the distance.
        .to(s, { idle: 1, main: 0.55, duration: 0.3, ease: 'power2.out' }, 1.55)
        .to(s, { s: 0.3, o: 0, duration: 0.95, ease: 'power2.in' }, 1.6)
        .to(bodyRef.current, { filter: 'blur(4px)', duration: 0.9, ease: 'power2.in' }, 1.6)
        .to(scrimRef.current, { autoAlpha: 0, duration: 0.7, ease: 'power2.inOut' }, 1.75)
        .add(() => setPhase('gone'));
    }
    tl.current = t;
    return undefined;
  }, [phase, apply]);
  useEffect(() => () => tl.current?.kill(), []);

  const close = useCallback(() => setPhase((p) => (p === 'open' ? 'closing' : p)), []);

  // Escape closes the message first (before the page's own Escape leaves the page).
  useEffect(() => {
    if (phase !== 'open') return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [phase, close]);

  if (phase === 'gone') return null;
  return (
    <>
      <Defs />
      <div ref={scrimRef} className="xd-scrim" onClick={close} aria-hidden="true" />
      <div ref={rootRef} className="xd" style={{ opacity: 0 }}>
        <div ref={bodyRef} className="xd-body">
          <Craft side="l" />
          <Craft side="r" />
          <span className="xd-flare" aria-hidden="true">
            <span className="xd-flare__bloom" />
            <span className="xd-flare__streak" />
            <span className="xd-flare__streak xd-flare__streak--wide" />
            <span className="xd-flare__ring" />
          </span>
        </div>

        <section
          ref={plateRef}
          className="xd-plate"
          role="dialog"
          aria-modal="false"
          aria-labelledby="xd-title"
          aria-describedby="xd-desc"
          aria-hidden={phase !== 'open'}
        >
          <Frame size="sm" />
          <span className="xd-plate__sheen" aria-hidden="true" />
          <button ref={closeRef} type="button" className="xd-close" onClick={close} aria-label="Close the message" tabIndex={phase === 'open' ? 0 : -1}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <p className="xd-kicker" data-xd-line>
            <span className="xd-kicker__dot" aria-hidden="true" />
            Mission advisory
            <span className="xd-kicker__sep" aria-hidden="true">·</span>
            Open to all
          </p>
          <h2 id="xd-title" className="xd-title" data-xd-line>
            Students can participate in <span className="xd-hl">any event</span>
          </h2>
          <p id="xd-desc" className="xd-sub" data-xd-line>
            <span className="xd-sub__rule" aria-hidden="true" />
            Irrespective of their domain
            <span className="xd-sub__rule xd-sub__rule--r" aria-hidden="true" />
          </p>
          <p className="xd-foot" data-xd-line>
            {DEPT_ORDER.length} domains · {ALL_EVENTS.length} events · every one of them open to you
          </p>
        </section>
      </div>
    </>
  );
}
