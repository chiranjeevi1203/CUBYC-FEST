import { useImperativeHandle, useRef } from 'react';
import { TIMELINE } from '../../config/experience';

const STAGES = { G: 'Galaxy', C: 'Lightspeed', S: 'Sol' };
const RADAR = 46; // half-size of the radar diamond (SVG units)
const fmtLy = new Intl.NumberFormat('en-US');

/** mm:ss.cc */
function clock(t) {
  const cs = Math.floor(Math.max(t, 0) * 100);
  const m = Math.floor(cs / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
}

/**
 * The loader's journey dash (bottom-left), styled after a race-car display:
 * distance to Sol / mission clock / velocity on the left, the stage letter and a
 * big 0–100% journey readout over a slanted progress bar in the centre, and a
 * diamond radar on the right where our marker spirals in to the Sun.
 *
 * The master timeline drives it every frame through `apiRef.current.update()`,
 * which writes straight to the DOM; React only re-renders on copy changes.
 */
export default function JourneyDash({ ref, apiRef, copyIndex }) {
  const pctRef = useRef(null);
  const fillRef = useRef(null);
  const timeRef = useRef(null);
  const distRef = useRef(null);
  const velRef = useRef(null);
  const blipRef = useRef(null);
  const trailRef = useRef(null);
  const rootRef = useRef(null);
  const last = useRef({ pct: -1, time: '', dist: '', vel: '', light: null });

  useImperativeHandle(ref, () => rootRef.current, []);
  useImperativeHandle(
    apiRef,
    () => ({
      update({ t, progress, velocity }) {
        const L = last.current;
        const pct = Math.round(progress * 100);
        if (pct !== L.pct) {
          L.pct = pct;
          if (pctRef.current) pctRef.current.textContent = String(pct);
        }
        if (fillRef.current) fillRef.current.style.transform = `scaleX(${progress})`;
        const time = clock(t);
        if (time !== L.time && timeRef.current) timeRef.current.textContent = L.time = time;
        const dist = fmtLy.format(Math.round(TIMELINE.journeyLy * (1 - progress)));
        if (dist !== L.dist && distRef.current) distRef.current.textContent = L.dist = dist;
        const vel = velocity.toFixed(2);
        if (vel !== L.vel && velRef.current) velRef.current.textContent = L.vel = vel;
        const light = velocity > 0.97;
        if (light !== L.light) {
          L.light = light;
          rootRef.current?.classList.toggle('is-light', light);
        }
        // Radar: spiral in from the rim (the Galactic Centre) to the Sun at the centre.
        const a = -Math.PI * 0.25 + progress * Math.PI * 1.35;
        const r = (1 - progress) * RADAR * 0.92;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        blipRef.current?.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
        trailRef.current?.setAttribute('x2', x.toFixed(2));
        trailRef.current?.setAttribute('y2', y.toFixed(2));
      },
    }),
    [],
  );

  const stage = TIMELINE.copy[copyIndex][2];

  return (
    <div ref={rootRef} className="jdash" aria-hidden="true">
      {/* Left: readouts */}
      <dl className="jdash__stats">
        <div>
          <dt>To Sol</dt>
          <dd>
            <span ref={distRef}>{fmtLy.format(TIMELINE.journeyLy)}</span> <small>ly</small>
          </dd>
        </div>
        <div className="is-main">
          <dt>Mission</dt>
          <dd ref={timeRef}>00:00.00</dd>
        </div>
        <div>
          <dt>Velocity</dt>
          <dd>
            <span ref={velRef}>0.00</span> <small>c</small>
          </dd>
        </div>
      </dl>

      {/* Centre: stage + journey percentage + bar */}
      <div className="jdash__core">
        <div className="jdash__read">
          <span className="jdash__stage">
            <b key={stage}>{stage}</b>
            <small>{STAGES[stage]}</small>
          </span>
          <span ref={pctRef} className="jdash__pct">
            0
          </span>
          <span className="jdash__unit">%</span>
        </div>
        <div className="jdash__bar">
          <span>Journey</span>
          <div className="jdash__track">
            <i ref={fillRef} className="jdash__fill" />
          </div>
          <span>100%</span>
        </div>
        <div className="jdash__copy">
          {TIMELINE.copy.map(([, line], i) => (
            <p key={line} className={`hud-copy ${i === copyIndex ? 'is-active' : ''}`}>
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Right: radar */}
      <svg className="jdash__radar" viewBox="-60 -60 120 120">
        <defs>
          <radialGradient id="jdash-blip">
            <stop offset="0" stopColor="#fff6e0" />
            <stop offset="0.35" stopColor="#e9c27a" />
            <stop offset="1" stopColor="rgba(233,194,122,0)" />
          </radialGradient>
        </defs>
        <g fill="none" stroke="rgba(243,217,164,0.16)" strokeWidth="0.8">
          {[1, 0.66, 0.33].map((k) => (
            <path key={k} d={`M0 ${-RADAR * k} L${RADAR * k} 0 L0 ${RADAR * k} L${-RADAR * k} 0 Z`} />
          ))}
          <path d={`M0 ${-RADAR} V${RADAR} M${-RADAR} 0 H${RADAR}`} strokeDasharray="1.5 2.5" />
        </g>
        <path d={`M0 ${-RADAR} L${RADAR} 0 L0 ${RADAR} L${-RADAR} 0 Z`} fill="none" stroke="rgba(243,217,164,0.45)" strokeWidth="1" />
        <circle r="2.6" fill="#f7e7c4" className="jdash__sol" />
        <line ref={trailRef} x1="0" y1="0" x2="0" y2="0" stroke="rgba(233,194,122,0.35)" strokeWidth="0.8" strokeDasharray="2 2" />
        <g ref={blipRef}>
          <circle r="9" fill="url(#jdash-blip)" opacity="0.8" />
          <circle r="2.8" fill="#fff1cf" />
        </g>
        <text x="0" y={-RADAR - 5} textAnchor="middle">GC</text>
        <text x="6" y="-5" className="jdash__sol-label">
          SOL
        </text>
      </svg>
    </div>
  );
}
