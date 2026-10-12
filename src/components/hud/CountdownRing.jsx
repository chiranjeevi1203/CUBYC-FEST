import { TIMELINE } from '../../config/experience';

const SIZE = 240;
export const RING_CENTER = SIZE / 2;
const RING_R = 100;
const ARC_R = 110;
export const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_R;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

// Unique numerals in the order they appear (6 → 0).
const NUMERALS = Array.from(new Set(TIMELINE.countTicks.map(([, n]) => n)));

// Comet tail: three arcs ending at the comet head (angle 0), brighter toward the head.
const TAIL = [
  { deg: 70, opacity: 0.12, width: 1.2 },
  { deg: 38, opacity: 0.28, width: 1.6 },
  { deg: 16, opacity: 0.6, width: 2 },
];

/**
 * Orbital countdown. The master timeline writes the comet rotation and the
 * hairline journey arc directly (cometRef / arcRef); React only swaps which
 * numeral is active, and CSS crossfades them.
 */
export default function CountdownRing({ count, cometRef, arcRef }) {
  return (
    <div className="relative aspect-square w-[min(44vw,11.5rem)] select-none sm:w-[12.5rem]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="cr-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff1cf" />
            <stop offset="50%" stopColor="#e9c27a" />
            <stop offset="100%" stopColor="#b8863b" />
          </linearGradient>
          <radialGradient id="cr-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(9,13,32,0.55)" />
            <stop offset="75%" stopColor="rgba(9,13,32,0.25)" />
            <stop offset="100%" stopColor="rgba(9,13,32,0)" />
          </radialGradient>
          <filter id="cr-glow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Soft dark disc keeps the numeral legible over bright nebula */}
        <circle cx={RING_CENTER} cy={RING_CENTER} r={RING_R + 14} fill="url(#cr-core)" />

        {/* Thin orbit ring */}
        <circle cx={RING_CENTER} cy={RING_CENTER} r={RING_R} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.8" />

        {/* Hairline journey-progress arc */}
        <circle cx={RING_CENTER} cy={RING_CENTER} r={ARC_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" />
        <circle
          ref={arcRef}
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={ARC_R}
          fill="none"
          stroke="url(#cr-gold)"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray={ARC_CIRCUMFERENCE}
          strokeDashoffset={ARC_CIRCUMFERENCE}
          transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
          opacity="0.9"
        />

        {/* Comet travelling the ring (rotated by the timeline) */}
        <g ref={cometRef} transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}>
          {TAIL.map((t) => {
            const len = (t.deg / 360) * RING_CIRCUMFERENCE;
            return (
              <circle
                key={t.deg}
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_R}
                fill="none"
                stroke="#f3d9a4"
                strokeOpacity={t.opacity}
                strokeWidth={t.width}
                strokeLinecap="round"
                strokeDasharray={`${len} ${RING_CIRCUMFERENCE}`}
                transform={`rotate(${-t.deg} ${RING_CENTER} ${RING_CENTER})`}
              />
            );
          })}
          <circle cx={RING_CENTER + RING_R} cy={RING_CENTER} r="3.4" fill="#fff6e0" filter="url(#cr-glow)" />
        </g>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="mb-1 font-mono text-[0.45rem] tracking-[0.42em] text-gold-300/70 sm:text-[0.5rem]">
          SYSTEM INITIALIZATION
        </span>
        <span className="relative block h-[clamp(3.25rem,13vw,4.25rem)] w-full">
          {NUMERALS.map((n) => (
            <span
              key={n}
              className={`countdown-numeral font-serif font-light text-gold-gradient ${n === count ? 'is-active' : ''}`}
              aria-hidden="true"
            >
              {n}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
