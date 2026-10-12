import { useId, useState } from 'react';

/*
 * Drop the official logo at:  src/assets/christ-university-logo.png
 *
 * import.meta.glob resolves to an empty object when the file is absent, so the
 * build never breaks: the component simply renders the gold "CU" monogram.
 */
const found = import.meta.glob('../../assets/christ-university-logo.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const LOGO_SRC = Object.values(found)[0] ?? null;

function Monogram({ className = '', title }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1cf" />
          <stop offset="0.45" stopColor="#e9c27a" />
          <stop offset="1" stopColor="#a97a2f" />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="rgba(233,194,122,0.22)" />
          <stop offset="1" stopColor="rgba(9,13,32,0)" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#${id}-core)`} />
      <circle cx="32" cy="32" r="29.5" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="1.2" />
      <circle cx="32" cy="32" r="25.5" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="0.5" strokeDasharray="0.6 2.4" />
      <text
        x="32"
        y="39.5"
        textAnchor="middle"
        fontFamily="'D-DIN', Bahnschrift, Arial, sans-serif"
        fontSize="20"
        fontWeight="700"
        letterSpacing="1"
        fill={`url(#${id}-gold)`}
      >
        CU
      </text>
      <path d="M32 6.5 l1.1 2.4 2.4 1.1 -2.4 1.1 -1.1 2.4 -1.1 -2.4 -2.4 -1.1 2.4 -1.1z" fill="#f3d9a4" />
    </svg>
  );
}

/**
 * Christ University mark. Renders the supplied PNG when present (and loadable),
 * otherwise an elegant gold "CU" monogram. Size it with className (h-* / w-*).
 */
export default function BrandLogo({ className = 'h-10', title = 'Christ University' }) {
  const [failed, setFailed] = useState(false);

  if (!LOGO_SRC || failed) {
    return <Monogram className={`aspect-square w-auto ${className}`} title={title} />;
  }
  return (
    <img
      src={LOGO_SRC}
      alt={title}
      decoding="async"
      draggable="false"
      onError={() => setFailed(true)}
      className={`w-auto select-none object-contain ${className}`}
    />
  );
}
