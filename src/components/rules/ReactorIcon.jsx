import { useId } from 'react';

/*
 * The protocol reactor, flat (front view of the reference sci-fi core): a chrome
 * armour ring with blocky teeth and gold seams, four clamps, a spinning turbine
 * over concentric rings of molten light, and a chrome hub. Pure SVG; the motion
 * (turbine spin, core pulse, ring flow) lives in CSS (.rx-*).
 */
export default function ReactorIcon({ className = '' }) {
  const id = useId().replace(/:/g, '');
  const u = (n) => `url(#${id}-${n})`;
  const C = 60;

  return (
    <svg viewBox="0 0 120 120" className={`rx ${className}`} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-core`}>
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="0.22" stopColor="#ffe3a6" />
          <stop offset="0.55" stopColor="#ffa53c" />
          <stop offset="0.85" stopColor="#c8520f" />
          <stop offset="1" stopColor="#5a1e06" />
        </radialGradient>
        <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#c9ced8" />
          <stop offset="0.6" stopColor="#6c7383" />
          <stop offset="0.8" stopColor="#d8dce4" />
          <stop offset="1" stopColor="#4a505d" />
        </linearGradient>
        <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b6170" />
          <stop offset="1" stopColor="#23262e" />
        </linearGradient>
        <radialGradient id={`${id}-hub`} cx="38%" cy="32%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#b7bdc9" />
          <stop offset="1" stopColor="#4a505d" />
        </radialGradient>
      </defs>

      {/* Gold glow behind the seams */}
      <circle cx={C} cy={C} r="55" fill="#ff9a30" className="rx-seamglow" />

      {/* Armour teeth: alternating chrome / steel blocks */}
      {Array.from({ length: 16 }, (_, i) => (
        <rect
          key={i}
          x={C - 7}
          y="3.5"
          width="14"
          height="13"
          rx="1.5"
          fill={i % 2 ? u('steel') : u('chrome')}
          stroke="#1a1d24"
          strokeWidth="0.6"
          transform={`rotate(${i * 22.5} ${C} ${C})`}
        />
      ))}

      {/* Main armour ring */}
      <circle cx={C} cy={C} r="44" fill="none" stroke={u('chrome')} strokeWidth="10" />
      <circle cx={C} cy={C} r="49" fill="none" stroke="#1a1d24" strokeWidth="0.8" />
      <circle cx={C} cy={C} r="39" fill="none" stroke="#1a1d24" strokeWidth="1.2" />
      {/* Gold seams cut through the ring */}
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={C - 0.9} y="11" width="1.8" height="10" fill="#ffc46b" className="rx-seam" transform={`rotate(${i * 45 + 11.25} ${C} ${C})`} />
      ))}

      {/* The core: molten light with rings flowing outward */}
      <circle cx={C} cy={C} r="38" fill={u('core')} className="rx-core" />
      <g fill="none" stroke="#fff1cf" className="rx-rings">
        <circle cx={C} cy={C} r="14" strokeWidth="0.8" />
        <circle cx={C} cy={C} r="22" strokeWidth="0.7" />
        <circle cx={C} cy={C} r="30" strokeWidth="0.6" />
      </g>

      {/* Turbine vanes */}
      <g className="rx-turbine">
        {Array.from({ length: 16 }, (_, i) => (
          <path
            key={i}
            d={`M${C} ${C - 35} l2.6 0 l-1.4 15 l-2.4 0 Z`}
            fill={u('steel')}
            stroke="#0d0f14"
            strokeWidth="0.4"
            transform={`rotate(${i * 22.5} ${C} ${C}) skewX(-14)`}
          />
        ))}
        <circle cx={C} cy={C} r="35.5" fill="none" stroke={u('chrome')} strokeWidth="1.6" />
      </g>

      {/* Four clamps across the rim */}
      {[45, 135, 225, 315].map((a) => (
        <g key={a} transform={`rotate(${a} ${C} ${C})`}>
          <rect x={C - 4} y="12" width="8" height="18" rx="1.2" fill={u('chrome')} stroke="#1a1d24" strokeWidth="0.6" />
          <rect x={C - 1} y="14" width="2" height="5" fill="#ffd38a" className="rx-seam" />
        </g>
      ))}

      {/* Counter-ring with glowing studs */}
      <g className="rx-ring2">
        <circle cx={C} cy={C} r="15" fill="none" stroke={u('steel')} strokeWidth="3" />
        {Array.from({ length: 6 }, (_, i) => (
          <circle key={i} cx={C} cy={C - 15} r="1.3" fill="#fff4d2" transform={`rotate(${i * 60} ${C} ${C})`} />
        ))}
      </g>

      {/* Chrome hub */}
      <circle cx={C} cy={C} r="10" fill={u('hub')} stroke="#1a1d24" strokeWidth="0.8" />
      <circle cx={C} cy={C} r="5.2" fill="#1a1d24" />
      <circle cx={C} cy={C} r="5.2" fill="none" stroke="#c9ced8" strokeWidth="0.9" />
      <circle cx={C - 3} cy={C - 3.5} r="1.8" fill="#fff" opacity="0.8" />
    </svg>
  );
}
