/*
 * Gold filigree in the style of classic ornament sets: scrolled corner
 * flourishes, an ornate divider with a central crest, and the frame that puts
 * a flourish in each corner of a card. All stroke-based SVG in currentColor.
 */

/** One corner flourish (drawn for the top-left corner; rotate/flip for others). */
export function Flourish({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        {/* The L of the corner */}
        <path d="M2 40V2h38" />
        <path d="M6 30V6h24" opacity="0.6" />
        {/* Scroll curling off the horizontal */}
        <path d="M14 6c0 6 4 10 10 10s8-5 5-8-7 0-6 3" />
        <path d="M40 2c4 0 7 3 7 6s-3 5-5 3" />
        {/* Scroll curling off the vertical */}
        <path d="M6 14c6 0 10 4 10 10s-5 8-8 5 0-7 3-6" />
        <path d="M2 40c0 4 3 7 6 7s5-3 3-5" />
        {/* Inner leaf + bead */}
        <path d="M18 18c5 1 9 5 10 10-5-1-9-5-10-10Z" />
      </g>
      <circle cx="6" cy="6" r="2.4" fill="currentColor" />
      <circle cx="31" cy="20" r="1.3" fill="currentColor" />
      <circle cx="20" cy="31" r="1.3" fill="currentColor" />
    </svg>
  );
}

/** Four flourishes in the corners of the parent (which must be position: relative). */
export function OrnateCorners({ className = '' }) {
  return (
    <span className={`orn-corners ${className}`} aria-hidden="true">
      <Flourish className="orn-c orn-c--tl" />
      <Flourish className="orn-c orn-c--tr" />
      <Flourish className="orn-c orn-c--bl" />
      <Flourish className="orn-c orn-c--br" />
    </span>
  );
}

/** A horizontal ornament: lines out to scrolls on either side of a crest. */
export function OrnateDivider({ className = '' }) {
  return (
    <svg viewBox="0 0 320 28" className={`orn-divider ${className}`} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14h104" />
        <path d="M212 14h104" />
        <circle cx="4" cy="14" r="1.8" fill="currentColor" />
        <circle cx="316" cy="14" r="1.8" fill="currentColor" />
        {/* left scrolls */}
        <path d="M108 14c8 0 12-6 18-6s8 4 6 6-6 1-5-2" />
        <path d="M108 14c8 0 12 6 18 6s8-4 6-6-6-1-5 2" />
        {/* right scrolls */}
        <path d="M212 14c-8 0-12-6-18-6s-8 4-6 6 6 1 5-2" />
        <path d="M212 14c-8 0-12 6-18 6s-8-4-6-6 6-1 5 2" />
        {/* crest */}
        <path d="M160 3l7 11-7 11-7-11Z" />
        <path d="M146 14c4-4 6-4 7 0-1 4-3 4-7 0Z" />
        <path d="M174 14c-4-4-6-4-7 0 1 4 3 4 7 0Z" />
      </g>
      <circle cx="160" cy="14" r="2.2" fill="currentColor" />
    </svg>
  );
}
