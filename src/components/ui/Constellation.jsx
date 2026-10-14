import { useId } from 'react';

/** A constellation drawn in gold: glowing stars joined by fine lines, twinkling gently. */
export default function Constellation({ data, className = '' }) {
  const id = useId().replace(/:/g, '');
  const r = { 1: 2.6, 2: 1.9, 3: 1.3 };
  return (
    <svg viewBox="-6 -6 112 112" className={`constellation ${className}`} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-star`}>
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="0.35" stopColor="#f7e7c4" />
          <stop offset="1" stopColor="#e9c27a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="constellation__lines">
        {data.lines.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={data.stars[a][0]} y1={data.stars[a][1]} x2={data.stars[b][0]} y2={data.stars[b][1]} />
        ))}
      </g>
      {data.stars.map(([x, y, m], i) => (
        <g key={i} className="constellation__star" style={{ animationDelay: `${(i * 0.37) % 2.4}s` }}>
          <circle cx={x} cy={y} r={r[m] * 3.2} fill={`url(#${id}-star)`} opacity="0.55" />
          <circle cx={x} cy={y} r={r[m]} fill="#fffaf0" />
          {m === 1 && <path d={`M${x - 6} ${y}H${x + 6}M${x} ${y - 6}V${y + 6}`} stroke="#fff3d6" strokeWidth="0.35" opacity="0.8" />}
        </g>
      ))}
    </svg>
  );
}
