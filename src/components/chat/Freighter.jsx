import { useId } from 'react';

/**
 * The chatbot's ship: a light freighter seen from above, nose up — a saucer hull
 * with two forward mandibles, an offset cockpit pod, a radar dish, a top turret,
 * panel lines with rust-red plating, and a curved sublight engine strip glowing
 * blue along the stern. Inspired by the classic Star Wars freighter silhouette.
 */
export default function Freighter({ className = '' }) {
  const id = useId().replace(/:/g, '');
  const ref = (n) => `url(#${id}-${n})`;
  const hull = 'M50 8 L58 8 L60 30 L64 30 L66 8 L74 8 L78 34 C96 42 108 60 108 80 C108 104 88 122 64 124 C40 122 20 104 20 80 C20 60 32 42 48 34 Z';

  return (
    <svg viewBox="0 0 128 140" className={`freighter ${className}`} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-metal`} cx="45%" cy="40%" r="70%">
          <stop offset="0" stopColor="#eef0f5" />
          <stop offset="0.55" stopColor="#b9bdc8" />
          <stop offset="1" stopColor="#7c818f" />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8f6ff" />
          <stop offset="0.25" stopColor="#7fd0ff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#2a7bff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-hull`}>
          <path d={hull} />
        </clipPath>
      </defs>

      {/* Sublight beam (behind) */}
      <path className="freighter__beam" d="M34 112 C46 124 82 124 94 112 L100 140 L28 140 Z" fill={ref('beam')} />

      {/* Hull */}
      <path d={hull} fill={ref('metal')} />
      <g clipPath={ref('hull')}>
        {/* Radial plating */}
        <g stroke="rgba(30,34,48,0.35)" strokeWidth="0.7" fill="none">
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return <line key={i} x1={64 + Math.cos(a) * 14} y1={80 + Math.sin(a) * 14} x2={64 + Math.cos(a) * 60} y2={80 + Math.sin(a) * 60} />;
          })}
          <circle cx="64" cy="80" r="30" />
          <circle cx="64" cy="80" r="44" />
        </g>
        {/* Rust-red plates */}
        <g fill="#8a3a32" opacity="0.8">
          <rect x="34" y="70" width="7" height="4" transform="rotate(-20 37 72)" />
          <rect x="86" y="88" width="8" height="4" transform="rotate(25 90 90)" />
          <rect x="52" y="104" width="6" height="3" />
          <rect x="78" y="56" width="5" height="4" />
        </g>
        {/* Spine between the mandibles + cargo bays */}
        <rect x="58" y="22" width="12" height="40" fill="#a9adb9" stroke="rgba(30,34,48,0.4)" strokeWidth="0.6" />
        <path d="M60 28 h8 M60 34 h8 M60 40 h8 M60 46 h8" stroke="rgba(30,34,48,0.4)" strokeWidth="0.6" />
        <rect x="24" y="76" width="22" height="8" fill="#c9ccd5" stroke="rgba(30,34,48,0.45)" strokeWidth="0.6" />
        <rect x="82" y="76" width="22" height="8" fill="#c9ccd5" stroke="rgba(30,34,48,0.45)" strokeWidth="0.6" />
        {/* Engine grilles near the stern */}
        {[[52, 98], [64, 101], [76, 98]].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="4" fill="#2a2e3a" stroke="#14161f" strokeWidth="0.6" />
        ))}
        {/* Stern engine strip */}
        <path className="freighter__engine" d="M30 108 C44 122 84 122 98 108" fill="none" stroke="#bfe8ff" strokeWidth="3" strokeLinecap="round" />
      </g>
      <path d={hull} fill="none" stroke="rgba(20,22,32,0.6)" strokeWidth="0.9" />

      {/* Top turret + radar dish */}
      <circle cx="64" cy="80" r="9" fill="#d5d8e0" stroke="#4a4f5c" strokeWidth="0.8" />
      <circle cx="64" cy="80" r="3.5" fill="#3a3f4c" />
      <path className="freighter__guns" d="M61 78 L61 68 M67 78 L67 68" stroke="#2a2e3a" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="44" cy="54" rx="6" ry="5" fill="#cfd2db" stroke="#4a4f5c" strokeWidth="0.7" />
      <circle cx="44" cy="54" r="1.6" fill="#4a4f5c" />

      {/* Cockpit pod (starboard) */}
      <path d="M94 50 L112 40 L122 46 L120 54 L100 60 Z" fill={ref('metal')} stroke="#4a4f5c" strokeWidth="0.8" />
      <path d="M112 41 L122 46 L120 53 L114 50 Z" fill="#1b2840" />
      <path d="M115 44 L119 46" stroke="#9fd3ff" strokeWidth="0.8" />
    </svg>
  );
}
