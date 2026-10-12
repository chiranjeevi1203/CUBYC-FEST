import { useId } from 'react';

/**
 * CUBYC fest mark: a ringed planet whose ring passes behind and in front of
 * the globe, a moon on its orbit and a guiding star. Pure SVG, scales cleanly.
 */
export default function FestMark({ className = 'h-10', title = 'CUBYC' }) {
  const id = useId().replace(/:/g, '');
  const ring = (clip) => (
    <g clipPath={`url(#${id}-${clip})`}>
      <ellipse cx="32" cy="34" rx="27" ry="8.5" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="2.2" />
      <ellipse cx="32" cy="34" rx="22" ry="6.4" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="0.8" opacity="0.7" />
    </g>
  );

  return (
    <svg viewBox="0 0 64 64" className={`aspect-square w-auto ${className}`} role="img" aria-label={title}>
      <defs>
        <radialGradient id={`${id}-globe`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="0.45" stopColor="#f3d9a4" />
          <stop offset="1" stopColor="#8a5f22" />
        </radialGradient>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#f7e7c4" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.25" />
        </linearGradient>
        {/* Ring split: back half (above the planet's centre) and front half */}
        <clipPath id={`${id}-back`}>
          <rect x="0" y="0" width="64" height="34"/>
        </clipPath>
        <clipPath id={`${id}-front`}>
          <rect x="0" y="34" width="64" height="30"/>
        </clipPath>
      </defs>
      <g transform="rotate(-18 32 34)">{ring('back')}</g>
      <circle cx="32" cy="34" r="12.5" fill={`url(#${id}-globe)`} />
      <path d="M22 30 q10 -4 20 0" stroke="#fffaf0" strokeOpacity="0.35" strokeWidth="1" fill="none" />
      <path d="M21 36 q11 4 22 0" stroke="#8a5f22" strokeOpacity="0.45" strokeWidth="1" fill="none" />
      <g transform="rotate(-18 32 34)">{ring('front')}</g>
      <circle cx="56.5" cy="26" r="2.1" fill="#e6eeff" />
      <path d="M50 7.5 l1.3 3 3 1.3 -3 1.3 -1.3 3 -1.3 -3 -3 -1.3 3 -1.3z" fill="#f7e7c4" />
    </svg>
  );
}
