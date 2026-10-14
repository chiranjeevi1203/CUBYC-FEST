import { useId } from 'react';

/**
 * The CUBYC orbiter, top-down, nose to the right (after the reference shuttle).
 *
 * Detail, front to back: black nose cap with RCS thruster ports, flight-deck
 * windows in frames, overhead windows and star-tracker door; payload-bay doors
 * in five segments with hinge ribs, latches and radiator panels; double-delta
 * wings with fine thermal tiles, black reinforced-carbon leading edges, wing-
 * glove fairings and split elevons; OMS pods with RCS clusters and their own
 * nozzles; the vertical stabiliser with its rudder / speed-brake split; body
 * flap; three main engines with hot inner rims and a live exhaust plume; and
 * heat-tinted tiles near the tail. A slow sun glint sweeps the hull.
 *
 * Hull colours come from CSS custom properties (--hull-hi / --hull / --hull-lo,
 * --accent), registered with @property so a day switch fades white → orange.
 */
const WING_T = 'M300 84 L262 74 L146 24 L126 26 L118 34 L112 78 Z';
const WING_B = 'M300 116 L262 126 L146 176 L126 174 L118 166 L112 122 Z';
const BODY = 'M92 76 L388 74 C420 74 446 80 462 90 C472 95 476 98 476 100 C476 102 472 105 462 110 C446 120 420 126 388 126 L92 124 Z';
const POD_T = 'M96 76 L150 75 C162 75 166 70 162 66 L104 66 C96 66 92 70 96 76 Z';
const POD_B = 'M96 124 L150 125 C162 125 166 130 162 134 L104 134 C96 134 92 130 96 124 Z';
const INK = 'rgba(20,22,34,';

export default function Shuttle({ className = '' }) {
  const id = useId().replace(/:/g, '');
  const ref = (n) => `url(#${id}-${n})`;
  const ink = (a) => `${INK}${a})`;

  return (
    <svg viewBox="0 0 480 200" className={`shuttle ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--hull-lo)" />
          <stop offset="0.22" stopColor="var(--hull-hi)" />
          <stop offset="0.5" stopColor="var(--hull)" />
          <stop offset="0.82" stopColor="var(--hull-lo)" />
          <stop offset="1" stopColor="var(--hull-lo)" />
        </linearGradient>
        <linearGradient id={`${id}-wingT`} x1="0.2" y1="1" x2="0.4" y2="0">
          <stop offset="0" stopColor="var(--hull)" />
          <stop offset="0.7" stopColor="var(--hull-hi)" />
          <stop offset="1" stopColor="var(--hull)" />
        </linearGradient>
        <linearGradient id={`${id}-wingB`} x1="0.2" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="var(--hull)" />
          <stop offset="1" stopColor="var(--hull-lo)" />
        </linearGradient>
        {/* Heat-stained tiles toward the tail */}
        <linearGradient id={`${id}-heat`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a2a1e" stopOpacity="0.38" />
          <stop offset="0.22" stopColor="#5a4030" stopOpacity="0.12" />
          <stop offset="0.4" stopColor="#5a4030" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-nose`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a2e3c" />
          <stop offset="1" stopColor="#0b0c12" />
        </linearGradient>
        <linearGradient id={`${id}-flame`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.16" stopColor="#fff3cf" />
          <stop offset="0.42" stopColor="#ffb44a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff6a1a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-core`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#d8ecff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#9fc8ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="1" cy="0.5" r="1">
          <stop offset="0" stopColor="#ffd48a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ff7a2a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-bell`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3c404c" />
          <stop offset="0.45" stopColor="#d4d7e0" />
          <stop offset="0.6" stopColor="#9a9eaa" />
          <stop offset="1" stopColor="#2e313b" />
        </linearGradient>
        <radialGradient id={`${id}-rim`} cx="0" cy="0.5" r="1">
          <stop offset="0" stopColor="#ffe9b8" />
          <stop offset="0.5" stopColor="#ff9a3c" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ff6a1a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <pattern id={`${id}-tiles`} width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M5 0H0V5" fill="none" stroke={ink(0.13)} strokeWidth="0.45" />
        </pattern>
        <pattern id={`${id}-tilesL`} width="9" height="9" patternUnits="userSpaceOnUse">
          <path d="M9 0H0V9" fill="none" stroke={ink(0.1)} strokeWidth="0.5" />
        </pattern>
        <pattern id={`${id}-radiator`} width="3" height="12" patternUnits="userSpaceOnUse">
          <line x1="0.5" y1="0" x2="0.5" y2="12" stroke="rgba(120,150,190,0.35)" strokeWidth="0.6" />
        </pattern>
        <clipPath id={`${id}-wclip`}>
          <path d={WING_T} />
          <path d={WING_B} />
        </clipPath>
        <clipPath id={`${id}-bclip`}>
          <path d={BODY} />
        </clipPath>
        <clipPath id={`${id}-hull`}>
          <path d={BODY} />
          <path d={WING_T} />
          <path d={WING_B} />
          <path d={POD_T} />
          <path d={POD_B} />
        </clipPath>
      </defs>

      {/* ---------------- Exhaust plume ---------------- */}
      <g className="shuttle__exhaust">
        <ellipse cx="50" cy="100" rx="52" ry="34" fill={ref('glow')} className="shuttle__glow" />
        {[88, 100, 112].map((y, i) => (
          <g key={y}>
            <path
              className={`shuttle__flame shuttle__flame--${i}`}
              d={`M78 ${y - 6} C64 ${y - 9} 42 ${y - 6} 18 ${y} C42 ${y + 6} 64 ${y + 9} 78 ${y + 6} Z`}
              fill={ref('flame')}
            />
            {/* Shock diamonds in the core */}
            <path className={`shuttle__flame shuttle__flame--${(i + 1) % 3}`} d={`M78 ${y - 2.4} L56 ${y} L78 ${y + 2.4} Z`} fill={ref('core')} />
          </g>
        ))}
        {/* OMS engine plumes */}
        {[70, 130].map((y) => (
          <path key={y} className="shuttle__flame shuttle__flame--1" d={`M96 ${y - 2} C86 ${y - 3} 74 ${y - 1} 64 ${y} C74 ${y + 1} 86 ${y + 3} 96 ${y + 2} Z`} fill={ref('flame')} opacity="0.75" />
        ))}
      </g>

      {/* ---------------- Wings ---------------- */}
      <path d={WING_T} fill={ref('wingT')} />
      <path d={WING_B} fill={ref('wingB')} />
      <g clipPath={ref('wclip')}>
        <rect x="100" y="20" width="210" height="160" fill={ref('tiles')} />
        {/* Wing-glove fairing */}
        <path d="M262 74 L238 84 M262 126 L238 116" stroke={ink(0.3)} strokeWidth="0.7" fill="none" />
        {/* Split elevons with hinge lines and gaps */}
        <path d="M112 78 L120 34" stroke={ink(0.45)} strokeWidth="1" />
        <path d="M112 122 L120 166" stroke={ink(0.45)} strokeWidth="1" />
        <path d="M124 76 L131 32 M124 124 L131 168" stroke={ink(0.38)} strokeWidth="0.8" />
        <path d="M113 56 L127 55 M113 144 L127 145" stroke={ink(0.5)} strokeWidth="1.2" />
        {/* Access panels */}
        {[[168, 56], [196, 64], [168, 144], [196, 136]].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x - 6} y={y - 3} width="12" height="6" fill="none" stroke={ink(0.22)} strokeWidth="0.5" />
        ))}
        {/* Shade where the wing meets the fuselage */}
        <rect x="100" y="70" width="210" height="10" fill={ink(0.12)} />
        <rect x="100" y="120" width="210" height="10" fill={ink(0.16)} />
        <rect x="100" y="20" width="60" height="160" fill={ref('heat')} />
      </g>
      {/* Reinforced-carbon leading edges with a sunlit highlight */}
      <path d="M300 84 L262 74 L146 24 L132 25" fill="none" stroke="#14161f" strokeWidth="4.6" strokeLinejoin="round" />
      <path d="M300 116 L262 126 L146 176 L132 175" fill="none" stroke="#14161f" strokeWidth="4.6" strokeLinejoin="round" />
      <path d="M298 82.4 L262 72.4 L146 22.6" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.7" />
      {Array.from({ length: 11 }, (_, i) => {
        const t = i / 10;
        return <circle key={i} cx={262 - t * 116} cy={74 - t * 50} r="0.55" fill="rgba(255,255,255,0.35)" />;
      })}

      {/* Fest mark + name on the wings */}
      <g transform="translate(196 54) rotate(90)">
        <circle r="9" fill="#0d1230" stroke="var(--accent)" strokeWidth="1.2" />
        <ellipse rx="12" ry="3.6" fill="none" stroke="var(--accent)" strokeWidth="1" transform="rotate(-18)" />
        <circle r="4.2" fill="#f3d9a4" />
        <circle cx="7" cy="-7" r="0.9" fill="#f3d9a4" />
      </g>
      <text x="212" y="145" fontFamily="'D-DIN', Arial, sans-serif" fontSize="7.5" fontWeight="700" letterSpacing="1.6" fill="#1a1f3a" textAnchor="middle">
        CUBYC
      </text>

      {/* ---------------- OMS pods ---------------- */}
      {[POD_T, POD_B].map((d, i) => (
        <g key={d}>
          <path d={d} fill={ref('body')} stroke={ink(0.38)} strokeWidth="0.6" />
          <path d={i ? 'M104 129 L156 129' : 'M104 71 L156 71'} stroke={ink(0.25)} strokeWidth="0.5" />
          {/* RCS thruster cluster */}
          {[0, 1, 2].map((k) => (
            <rect key={k} x={146 + k * 4.2} y={i ? 129.5 : 68.2} width="2.6" height="2.3" fill="#151821" />
          ))}
          {/* OMS nozzle */}
          <path d={i ? 'M98 128 L92 126.5 L92 133.5 L98 132 Z' : 'M98 68 L92 66.5 L92 73.5 L98 72 Z'} fill={ref('bell')} />
        </g>
      ))}

      {/* ---------------- Fuselage ---------------- */}
      <path d={BODY} fill={ref('body')} />
      <g clipPath={ref('bclip')}>
        <rect x="90" y="70" width="390" height="10" fill={ref('tilesL')} />
        <rect x="90" y="120" width="390" height="10" fill={ref('tilesL')} />
        <rect x="90" y="70" width="390" height="60" fill={ref('heat')} />
        {/* Payload-bay doors: five segments, hinge ribs, latches */}
        <rect x="176" y="79.5" width="214" height="41" fill="none" stroke={ink(0.32)} strokeWidth="0.7" />
        {Array.from({ length: 4 }, (_, i) => 176 + (i + 1) * 42.8).map((x) => (
          <line key={x} x1={x} y1="79.5" x2={x} y2="120.5" stroke={ink(0.28)} strokeWidth="0.6" />
        ))}
        {Array.from({ length: 21 }, (_, i) => 178 + i * 10.2).map((x) => (
          <g key={x}>
            <line x1={x} y1="80" x2={x} y2="82" stroke={ink(0.3)} strokeWidth="0.5" />
            <line x1={x} y1="118" x2={x} y2="120" stroke={ink(0.3)} strokeWidth="0.5" />
          </g>
        ))}
        <rect x="182" y="83.5" width="128" height="13" fill="rgba(170,190,215,0.18)" />
        <rect x="182" y="103.5" width="128" height="13" fill="rgba(170,190,215,0.14)" />
        <rect x="182" y="83.5" width="128" height="13" fill={ref('radiator')} />
        <rect x="182" y="103.5" width="128" height="13" fill={ref('radiator')} />
        <line x1="176" y1="100" x2="390" y2="100" stroke={ink(0.5)} strokeWidth="0.9" />
        <line x1="176" y1="99.2" x2="390" y2="99.2" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
        {/* Gold accent pinstripe + name */}
        <line x1="176" y1="88" x2="390" y2="88" stroke="var(--accent)" strokeWidth="1.1" opacity="0.85" />
        <text x="352" y="96" fontFamily="'D-DIN', Arial, sans-serif" fontSize="5.4" fontWeight="700" letterSpacing="1.2" fill={ink(0.75)}>
          CUBYC · FEST&apos;27
        </text>
        {/* Aft fuselage panel lines */}
        <path d="M150 76 L150 124 M164 76 L164 124" stroke={ink(0.22)} strokeWidth="0.5" />
        {/* Forward fuselage: hatch, star-tracker door, panel lines */}
        <path d="M396 76 L396 124 M414 77 L414 123" stroke={ink(0.24)} strokeWidth="0.5" />
        <rect x="400" y="111" width="8" height="6" fill="none" stroke={ink(0.4)} strokeWidth="0.6" />
        <rect x="402" y="85" width="5" height="3.4" fill="#1a1d29" />
      </g>
      <path d={BODY} fill="none" stroke={ink(0.42)} strokeWidth="0.8" />

      {/* Flight deck: framed windows, overhead windows */}
      <path d="M420 87 L438 85.4 L447 92 L447 108 L438 114.6 L420 113 Z" fill="none" stroke={ink(0.38)} strokeWidth="0.7" />
      {[
        'M430 88.6 L439.6 87.8 L444 92.6 L432.4 94.6 Z',
        'M430 111.4 L439.6 112.2 L444 107.4 L432.4 105.4 Z',
        'M446 93.8 L452.4 95.6 L452.4 99.4 L446 99.4 Z',
        'M446 100.6 L452.4 100.6 L452.4 104.4 L446 106.2 Z',
      ].map((d) => (
        <path key={d} d={d} fill="#0f1320" stroke="#6b7180" strokeWidth="0.45" />
      ))}
      <path d="M431 89.4 L438 88.8" stroke="rgba(160,200,255,0.55)" strokeWidth="0.7" />
      <path d="M447 94.6 L451.6 96" stroke="rgba(160,200,255,0.5)" strokeWidth="0.6" />
      <rect x="425" y="96.6" width="4.6" height="2.6" fill="#0f1320" />
      <rect x="425" y="100.8" width="4.6" height="2.6" fill="#0f1320" />

      {/* Black nose cap with forward RCS ports */}
      <path d="M460 89 C469 94.5 476 98 476 100 C476 102 469 105.5 460 111 C465 105 465 95 460 89 Z" fill={ref('nose')} />
      {[[458, 92.5], [461.5, 94], [458, 107.5], [461.5, 106]].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 1.1} y={y - 0.9} width="2.2" height="1.8" fill="#05060a" stroke="rgba(255,255,255,0.18)" strokeWidth="0.3" />
      ))}
      <path d="M466 95.5 C470 97.5 472 99 472 100" stroke="rgba(255,255,255,0.28)" strokeWidth="0.6" fill="none" />

      {/* ---------------- Tail ---------------- */}
      {/* Body flap */}
      <path d="M92 82 L84 83 L84 117 L92 118 Z" fill="var(--hull-lo)" stroke={ink(0.5)} strokeWidth="0.5" />
      {/* Vertical stabiliser seen edge-on, with the rudder / speed-brake split */}
      <path d="M80 97.6 L180 98.6 L180 101.4 L80 102.4 Z" fill="var(--hull-lo)" />
      <path d="M80 97.6 L180 98.6" stroke="#14161f" strokeWidth="1.4" />
      <path d="M80 100 L122 100" stroke={ink(0.7)} strokeWidth="0.6" />

      {/* Main engines: bells with hot inner rims */}
      {[88, 100, 112].map((y) => (
        <g key={y}>
          <path d={`M92 ${y - 4.5} L77 ${y - 6.8} L77 ${y + 6.8} L92 ${y + 4.5} Z`} fill={ref('bell')} stroke="#17191f" strokeWidth="0.5" />
          <path d={`M80 ${y - 6.2} L80 ${y + 6.2}`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" />
          <ellipse cx="77.4" cy={y} rx="1.8" ry="6.4" fill={ref('rim')} className="shuttle__rim" />
        </g>
      ))}

      {/* Sun glint sweeping along the hull + spine highlight */}
      <g clipPath={ref('hull')}>
        <rect className="shuttle__glint" x="-60" y="0" width="60" height="200" fill={ref('glint')} transform="skewX(-18)" />
      </g>
      <path d="M120 85.5 L400 84.6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
