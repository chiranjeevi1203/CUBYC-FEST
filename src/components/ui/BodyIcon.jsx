import { useId } from 'react';
import { PLANET_ART } from '../../lib/planetArt';

/** The space station, drawn to match the 3D model: habitat ring, hub and gold-framed solar wings. */
function StationIcon({ className }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 64" className={`block aspect-square ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-hull`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#c9bfa8" />
        </linearGradient>
        <linearGradient id={`${id}-panel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b3a7a" />
          <stop offset="1" stopColor="#141b40" />
        </linearGradient>
      </defs>
      {/* Solar wings */}
      {[4, 13, 43, 52].map((x) => (
        <g key={x}>
          <rect x={x} y="27" width="8" height="10" rx="0.6" fill={`url(#${id}-panel)`} stroke="#e9c27a" strokeWidth="0.7" />
          <path d={`M${x + 2.7} 27v10M${x + 5.3} 27v10M${x} 32h8`} stroke="#e9c27a" strokeOpacity="0.55" strokeWidth="0.4" />
        </g>
      ))}
      <path d="M4 32h56" stroke="#e9c27a" strokeWidth="0.9" />
      {/* Habitat ring (back half, hub, front half) */}
      <path d="M14 32a18 7 0 0 1 36 0" fill="none" stroke={`url(#${id}-hull)`} strokeWidth="2.6" opacity="0.7" />
      <rect x="29" y="22" width="6" height="20" rx="3" fill={`url(#${id}-hull)`} />
      <ellipse cx="32" cy="22.5" rx="4.2" ry="1.4" fill="none" stroke="#e9c27a" strokeWidth="0.9" />
      <path d="M14 32a18 7 0 0 0 36 0" fill="none" stroke={`url(#${id}-hull)`} strokeWidth="2.8" />
      {[18, 25, 39, 46].map((x) => (
        <circle key={x} cx={x} cy={x < 32 ? 36.2 + (x - 18) * 0.25 : 38 - (x - 39) * 0.25} r="0.7" fill="#ffe2a8" />
      ))}
    </svg>
  );
}

/**
 * Watercolour DOM icon for a department's world (the sun, a planet or the Moon).
 * Uses the #watercolour-sm filter defined once on the landing page.
 */
export default function BodyIcon({ bodyKey, className = 'w-10' }) {
  if (bodyKey === 'station') return <StationIcon className={className} />;
  if (bodyKey === 'sun') {
    return <span className={`wc-sun relative block aspect-square rounded-full ${className}`} aria-hidden="true" />;
  }
  const ring = bodyKey === 'saturn';
  return (
    <span className={`relative block aspect-square ${className}`} aria-hidden="true">
      {ring && <span className="planet-ring planet-ring--back" />}
      <span className="wc-sphere absolute inset-0 rounded-full" style={{ backgroundImage: PLANET_ART[bodyKey], filter: 'url(#watercolour-sm)' }} />
      {ring && <span className="planet-ring planet-ring--front" />}
    </span>
  );
}
