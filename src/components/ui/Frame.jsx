/**
 * Celestial frame: a fine gold hairline set just inside a panel's edge, with
 * inverted (scooped) corners, a dot at each corner point and — on larger
 * panels — a four-point star set into a break at the top. Purely decorative.
 *
 * Place it as a child of any positioned container (it fills it, inset by
 * --frame-inset). size: 'sm' | 'md' | 'lg' · star: show the top star.
 */
function Corner({ pos }) {
  return (
    <svg className={`frame__corner frame__corner--${pos}`} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M20 0A20 20 0 0 1 0 20" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <circle cx="0" cy="0" r="1.7" fill="currentColor" />
    </svg>
  );
}

export default function Frame({ size = 'md', star = true, className = '' }) {
  return (
    <span className={`frame frame--${size} ${star ? 'frame--star' : ''} ${className}`} aria-hidden="true">
      <span className="frame__line" />
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />
      {star && (
        <svg className="frame__star" viewBox="0 0 20 20">
          <path d="M10 0l1.6 8.4L20 10l-8.4 1.6L10 20l-1.6-8.4L0 10l8.4-1.6z" fill="currentColor" />
          <circle cx="10" cy="10" r="1.6" fill="#0b0d1c" />
        </svg>
      )}
    </span>
  );
}
