import { useEffect, useId, useRef } from 'react';
import { prefersReducedMotion } from '../../config/experience';

/*
 * A flying saucer that roams the Sponsors page. It drifts between waypoints,
 * now and then hovers and shines its tractor beam, and turns evasive when a
 * pointer comes near. Touch it (or get the cursor onto it) and it jumps to
 * hyperspeed, streaks off-screen and warps back in somewhere else.
 * Only the saucer itself takes pointer events; the page underneath works as usual.
 */

const TAU = Math.PI * 2;
/** n points on an ellipse between angles a0 and a1 (0 = right, π/2 = front/bottom). */
const onEllipse = (cx, cy, rx, ry, n, a0, a1) =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / Math.max(n - 1, 1);
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });

const RIBS = Array.from({ length: 30 }, (_, i) => {
  const a = (i / 30) * TAU;
  return [200 + Math.cos(a) * 104, 122.5 + Math.sin(a) * 12.5, 200 + Math.cos(a) * 132, 121 + Math.sin(a) * 16.5];
});
const VENTS = onEllipse(200, 122, 118, 14.5, 13, 0.12 * Math.PI, 0.88 * Math.PI);
const RIM_LIGHTS = onEllipse(200, 113, 171, 14.5, 20, 0.04 * Math.PI, 0.96 * Math.PI);
const DOME_LIGHTS = onEllipse(200, 84, 44, 5.5, 7, 0.12 * Math.PI, 0.88 * Math.PI);
const SEAMS = [-3, -2, -1, 0, 1, 2, 3].map((k) => [200 + k * 13, 85, 200 + k * 46, 104]);
// Portholes round the upper hull (front half)
const PORTS = onEllipse(200, 89.5, 92, 5.5, 9, 0.14 * Math.PI, 0.86 * Math.PI);

const QUIPS = ['Too slow, earthling!', 'Nice try.', 'Can’t catch me!', 'Not today!', 'Almost had me…', 'See you at CUBYC!', 'Hyperspace is my thing.', 'Warp drive engaged!'];

function Saucer() {
  const id = useId().replace(/:/g, '');
  const u = (n) => `url(#${id}-${n})`;
  return (
    <svg viewBox="0 0 400 230" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-hull`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef2fa" />
          <stop offset="0.35" stopColor="#aeb9cf" />
          <stop offset="0.72" stopColor="#5f6c88" />
          <stop offset="1" stopColor="#2b3247" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.3" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.42" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.78" stopColor="#ffd9a0" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#353b4f" />
          <stop offset="0.18" stopColor="#c6cddb" />
          <stop offset="0.45" stopColor="#f6f8fc" />
          <stop offset="0.7" stopColor="#c2c9d8" />
          <stop offset="1" stopColor="#30364a" />
        </linearGradient>
        <radialGradient id={`${id}-under`} cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor="#7a6744" />
          <stop offset="0.5" stopColor="#433829" />
          <stop offset="1" stopColor="#1a1712" />
        </radialGradient>
        <radialGradient id={`${id}-dome`} cx="40%" cy="30%" r="80%">
          <stop offset="0" stopColor="#eef6ff" />
          <stop offset="0.25" stopColor="#a5c6ee" />
          <stop offset="0.62" stopColor="#3b5b94" />
          <stop offset="1" stopColor="#111a36" />
        </radialGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#fff3d0" stopOpacity="0.95" />
          <stop offset="0.4" stopColor="#ffb347" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff8a2a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe2a8" stopOpacity="0.6" />
          <stop offset="0.5" stopColor="#ffd38a" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ffd38a" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* Tractor beam (behind everything) */}
      <g className="ufo__beam">
        <path d="M176 132 L224 132 L300 300 L100 300 Z" fill={u('beam')} />
        <path d="M188 132 L212 132 L246 290 L154 290 Z" fill={u('beam')} />
      </g>
      {/* Warm glow under the craft */}
      <ellipse cx="200" cy="136" rx="78" ry="15" fill={u('glow')} className="ufo__underglow" />

      {/* Upper hull: a shallow cone up to the dome */}
      <path d="M38 112 C 92 96, 150 80, 200 79 C 250 80, 308 96, 362 112 Z" fill={u('hull')} />
      <g fill="none" stroke="rgba(18, 22, 38, 0.38)" strokeWidth="0.8">
        <path d="M70 106 C 120 92, 160 86, 200 85.5 C 240 86, 280 92, 330 106" />
        <path d="M110 98 C 142 90, 172 87.5, 200 87.4 C 228 87.5, 258 90, 290 98" />
        {SEAMS.map(([x1, y1, x2, y2]) => (
          <path key={x2} d={`M${x1} ${y1} L${x2} ${y2}`} />
        ))}
      </g>
      <path d="M38 112 C 92 96, 150 80, 200 79 C 250 80, 308 96, 362 112 Z" fill={u('sheen')} />
      <path d="M40 112 C 120 104, 280 104, 360 112" fill="none" stroke="#e9c27a" strokeOpacity="0.75" strokeWidth="1" />
      {PORTS.map(([x, y], i) => (
        <g key={`p${i}`}>
          <ellipse cx={x} cy={y} rx="3.4" ry="1.9" fill="#141a2e" stroke="rgba(233, 194, 122, 0.6)" strokeWidth="0.5" />
          <ellipse cx={x} cy={y} rx="2.2" ry="1.1" className="ufo__port" style={{ '--i': i }} />
        </g>
      ))}

      {/* Rim */}
      <ellipse cx="200" cy="113" rx="172" ry="15" fill={u('rim')} stroke="#1d2233" strokeWidth="0.6" />
      <path d="M34 112 C 110 100, 290 100, 366 112" fill="none" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="0.8" />

      {/* Underside: bronze plate, rings, ribs, vents and the core */}
      <ellipse cx="200" cy="120" rx="160" ry="21" fill={u('under')} stroke="#c9a46a" strokeOpacity="0.55" strokeWidth="0.7" />
      <g strokeLinecap="round">
        {RIBS.map(([x1, y1, x2, y2]) => (
          <g key={`${x1}-${y1}`}>
            <path d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`} stroke="rgba(0, 0, 0, 0.5)" strokeWidth="1.8" />
            <path d={`M${(x1 + 0.8).toFixed(1)} ${y1.toFixed(1)} L${(x2 + 0.8).toFixed(1)} ${y2.toFixed(1)}`} stroke="rgba(255, 220, 160, 0.16)" strokeWidth="0.6" />
          </g>
        ))}
      </g>
      <g fill="none" stroke="rgba(233, 194, 122, 0.5)" strokeWidth="0.8">
        <ellipse cx="200" cy="121" rx="132" ry="16.5" />
        <ellipse cx="200" cy="122.5" rx="104" ry="12.5" />
      </g>
      {VENTS.map(([x, y], i) => (
        <circle key={`v${i}`} cx={x} cy={y} r="2.3" className="ufo__vent" style={{ '--i': i }} />
      ))}
      <ellipse cx="200" cy="125.5" rx="68" ry="8.5" fill="#15120e" stroke="rgba(233, 194, 122, 0.55)" strokeWidth="0.8" />
      <g className="ufo__core">
        <ellipse cx="200" cy="128" rx="46" ry="6" fill="none" stroke="#ffb347" strokeWidth="6" filter={u('blur')} />
        <ellipse cx="200" cy="128" rx="46" ry="6" fill="none" stroke="#ffd58a" strokeWidth="3" />
        <ellipse cx="200" cy="128" rx="46" ry="6" fill="none" stroke="#fff6dc" strokeWidth="1" />
        <ellipse cx="200" cy="128.4" rx="37" ry="4" fill="#241a0e" />
      </g>

      {/* Rim lights (chase round the front edge) */}
      {RIM_LIGHTS.map(([x, y], i) => (
        <circle key={`r${i}`} cx={x} cy={y} r="1.7" className="ufo__rimlight" style={{ '--i': i }} />
      ))}

      {/* Dome */}
      <ellipse cx="200" cy="83.5" rx="47" ry="6.5" fill="#2b3247" stroke="#e9c27a" strokeWidth="0.9" />
      <path d="M155 83 C 157 56, 181 46, 200 46 C 219 46, 243 56, 245 83 C 229 88, 171 88, 155 83 Z" fill={u('dome')} />
      <ellipse cx="200" cy="72" rx="22" ry="10" className="ufo__domeglow" />
      <path d="M167 76 C 169 61, 181 52, 196 50 C 186 56, 178 65, 176 77 Z" fill="#ffffff" opacity="0.5" />
      <circle cx="186" cy="56" r="2.2" fill="#ffffff" opacity="0.85" />
      <path d="M155 83 C 157 56, 181 46, 200 46 C 219 46, 243 56, 245 83" fill="none" stroke="rgba(233, 194, 122, 0.55)" strokeWidth="0.8" />
      <ellipse cx="200" cy="46.5" rx="5" ry="1.6" fill="#e9c27a" />
      {DOME_LIGHTS.map(([x, y], i) => (
        <circle key={`d${i}`} cx={x} cy={y} r="1.3" className="ufo__domelight" style={{ '--i': i }} />
      ))}
    </svg>
  );
}

export default function Ufo() {
  const ufoRef = useRef(null);
  const bodyRef = useRef(null);
  const trailRef = useRef(null);
  const tagRef = useRef(null);
  const flashRef = useRef(null);

  useEffect(() => {
    const ufo = ufoRef.current;
    const body = bodyRef.current;
    const trail = trailRef.current;
    const tag = tagRef.current;
    const flash = flashRef.current;
    if (!ufo || !body) return undefined;
    const reduced = prefersReducedMotion();

    let W = window.innerWidth;
    let H = window.innerHeight;
    let uw = ufo.offsetWidth;
    let uh = ufo.offsetHeight;
    const rand = (a, b) => a + Math.random() * (b - a);
    const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
    // Roaming area: clear of the navbar at the top and the screen edges.
    const area = () => ({ x0: uw * 0.6, x1: Math.max(uw * 0.6, W - uw * 0.6), y0: 96 + uh * 0.3, y1: Math.max(96 + uh * 0.3, H - uh * 0.75) });
    const pick = (avoidX, avoidY) => {
      const a = area();
      let p = [rand(a.x0, a.x1), rand(a.y0, a.y1)];
      for (let i = 0; i < 14 && avoidX !== undefined && dist(p[0], p[1], avoidX, avoidY) < Math.min(W, H) * 0.45; i++) {
        p = [rand(a.x0, a.x1), rand(a.y0, a.y1)];
      }
      return p;
    };

    const pointer = { x: -9999, y: -9999, mouse: false };
    const s = {
      phase: 'gone', pt: 0, t: 0, x: W / 2, y: H / 2, vx: 0, vy: 0, tx: W / 2, ty: H / 2, retarget: 0,
      beamUntil: 0, nextBeam: rand(5, 9), alert: 0, dx: 1, dy: 0, speed: 0, fx: 0, fy: 0, goneFor: 1.1, attempts: 0, msgUntil: 0,
    };
    const maxSpeed = reduced ? 22 : 95;

    const setPhase = (p) => {
      s.phase = p;
      s.pt = 0;
      ufo.dataset.phase = p;
    };
    let tagText = '';
    const setTag = (text) => {
      if (text !== tagText) {
        tagText = text;
        tag.textContent = text;
      }
    };
    const burst = (x, y, big) => {
      if (!flash || reduced) return;
      flash.style.left = `${x}px`;
      flash.style.top = `${y}px`;
      flash.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.15)', opacity: 1 },
          { transform: `translate(-50%, -50%) scale(${big ? 2.6 : 1.8})`, opacity: 0 },
        ],
        { duration: big ? 650 : 480, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      );
    };

    /** Someone reached for it: charge up, then jump away from the pointer. */
    const escape = (fromX, fromY) => {
      if (s.phase !== 'roam') return;
      s.attempts += 1;
      const a = Math.atan2(s.y - fromY, s.x - fromX) + rand(-0.55, 0.55);
      s.dx = Math.cos(a);
      s.dy = Math.sin(a);
      s.speed = 0;
      s.beamUntil = 0;
      burst(s.x, s.y, false);
      if (reduced) {
        s.goneFor = 0.6;
        setPhase('gone');
      } else setPhase('charge');
    };

    /** Warp back in somewhere else on the page. */
    const arrive = () => {
      const [x, y] = pick(pointer.x > -999 ? pointer.x : undefined, pointer.y);
      const a = rand(0, TAU);
      const far = Math.max(W, H) * 0.7;
      s.fx = x - Math.cos(a) * far;
      s.fy = y - Math.sin(a) * far;
      s.tx = x;
      s.ty = y;
      s.dx = Math.cos(a);
      s.dy = Math.sin(a);
      s.vx = 0;
      s.vy = 0;
      s.retarget = s.t + rand(3, 6);
      setPhase(reduced ? 'roam' : 'arrive');
      if (reduced) {
        s.x = x;
        s.y = y;
      }
      burst(x, y, true);
      if (s.attempts > 0) {
        setTag(`${QUIPS[(s.attempts - 1) % QUIPS.length]} · ${String(s.attempts).padStart(2, '0')}`);
        s.msgUntil = s.t + 2.6;
      } else {
        setTag('Incoming signal…');
        s.msgUntil = s.t + 2.2;
      }
    };

    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
      last = now;
      s.t += dt;
      s.pt += dt;
      let sx = 1;
      let sy = 1;
      let depth = 1;
      let trailLen = 0;
      let trailAngle = 0;

      if (s.phase === 'roam') {
        // Wander between waypoints; now and then stop to shine the beam.
        if (s.t > s.retarget || dist(s.x, s.y, s.tx, s.ty) < 24) {
          [s.tx, s.ty] = pick();
          s.retarget = s.t + rand(4, 8);
        }
        const beaming = s.t < s.beamUntil;
        if (!beaming && s.t > s.nextBeam && s.alert < 0.1) {
          s.beamUntil = s.t + 3.4;
          s.nextBeam = s.t + rand(11, 18);
        }
        let ax = (s.tx - s.x) * (beaming ? 0.05 : 0.55) - s.vx * (beaming ? 3 : 1.1);
        let ay = (s.ty - s.y) * (beaming ? 0.05 : 0.55) - s.vy * (beaming ? 3 : 1.1);
        // A pointer nearby: back away (and get jumpy); right on top of it: escape.
        const pd = dist(s.x, s.y, pointer.x, pointer.y);
        const near = 210;
        s.alert += ((pd < near ? 1 : 0) - s.alert) * (1 - Math.exp(-dt * 6));
        if (pd < near && pd > 0.1) {
          const push = (near - pd) * 4.2;
          ax += ((s.x - pointer.x) / pd) * push;
          ay += ((s.y - pointer.y) / pd) * push;
          s.beamUntil = 0;
        }
        if (pointer.mouse && pd < uw * 0.32 + 18) escape(pointer.x, pointer.y);
        s.vx += ax * dt;
        s.vy += ay * dt;
        const sp = Math.hypot(s.vx, s.vy);
        const cap = maxSpeed * (1 + s.alert * 1.6);
        if (sp > cap) {
          s.vx *= cap / sp;
          s.vy *= cap / sp;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        // Stay on screen (soft walls).
        const a = area();
        s.x = Math.min(Math.max(s.x, a.x0 - 20), a.x1 + 20);
        s.y = Math.min(Math.max(s.y, a.y0 - 20), a.y1 + 20);
        depth = reduced ? 1 : 0.9 + 0.12 * Math.sin(s.t * 0.21);
        ufo.classList.toggle('is-beam', s.t < s.beamUntil);
      } else if (s.phase === 'charge') {
        // A beat of charge-up: squash, glow, a small recoil.
        const k = Math.min(s.pt / 0.16, 1);
        sx = 1 + 0.1 * k;
        sy = 1 - 0.12 * k;
        s.x -= s.dx * 40 * dt;
        s.y -= s.dy * 40 * dt;
        if (s.pt > 0.16) setPhase('dash');
      } else if (s.phase === 'dash') {
        // Hyperspeed: accelerate hard along the escape line and leave a light streak.
        s.speed = Math.min(s.speed + 14000 * dt, 5200);
        s.x += s.dx * s.speed * dt;
        s.y += s.dy * s.speed * dt;
        sx = 1 + Math.min(s.speed / 5200, 1) * 0.25;
        sy = 1 - Math.min(s.speed / 5200, 1) * 0.15;
        depth = 1 - Math.min(s.pt / 0.35, 1) * 0.35;
        trailLen = Math.min(s.speed * 0.16, W * 0.75);
        trailAngle = Math.atan2(-s.dy, -s.dx);
        const off = uw * 1.5;
        if (s.x < -off || s.x > W + off || s.y < -off || s.y > H + off) {
          s.goneFor = rand(0.7, 1.4);
          setPhase('gone');
        }
      } else if (s.phase === 'gone') {
        if (s.pt > s.goneFor) arrive();
      } else if (s.phase === 'arrive') {
        // Drop out of hyperspeed onto the new spot, decelerating hard.
        const k = Math.min(s.pt / 0.5, 1);
        const e = 1 - Math.pow(1 - k, 4);
        s.x = s.fx + (s.tx - s.fx) * e;
        s.y = s.fy + (s.ty - s.fy) * e;
        depth = 0.55 + 0.45 * e;
        trailLen = (1 - e) * W * 0.45;
        trailAngle = Math.atan2(-s.dy, -s.dx);
        if (k >= 1) setPhase('roam');
      }

      // Status tag: a quip after a jump, otherwise its mood.
      const alert = s.phase === 'roam' && s.alert > 0.5;
      const showMsg = s.t < s.msgUntil;
      if (!showMsg) setTag(s.phase === 'dash' || s.phase === 'charge' ? 'Hyperspeed' : alert ? 'UFO · evasive' : s.t < s.beamUntil ? 'UFO · scanning' : 'UFO · roaming');
      ufo.classList.toggle('is-alert', alert);
      if (s.phase !== 'roam') ufo.classList.remove('is-beam');
      ufo.classList.toggle('show-tag', showMsg || alert || s.phase === 'charge' || s.phase === 'dash');

      // Draw: position + gentle bob; the body tilts into its motion.
      const bob = s.phase === 'roam' && !reduced ? Math.sin(s.t * 1.7) * 5 : 0;
      const jitter = alert && !reduced ? Math.sin(s.t * 31) * 1.4 : 0;
      const tilt = Math.max(-1, Math.min(1, s.vx / maxSpeed)) * 9 * (s.phase === 'roam' ? 1 : 0) + jitter;
      ufo.style.transform = `translate3d(${(s.x - uw / 2).toFixed(1)}px, ${(s.y - uh * 0.5 + bob).toFixed(1)}px, 0)`;
      body.style.transform = `rotate(${tilt.toFixed(2)}deg) scale(${(depth * sx).toFixed(3)}, ${(depth * sy).toFixed(3)})`;
      if (trail) {
        trail.style.opacity = trailLen > 4 ? '1' : '0';
        trail.style.width = `${trailLen.toFixed(0)}px`;
        trail.style.transform = `translateY(-50%) rotate(${trailAngle.toFixed(3)}rad)`;
      }
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.mouse = e.pointerType === 'mouse' || e.pointerType === 'pen';
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    // A tap or click on (or right next to) the saucer sends it away.
    const onDown = (e) => {
      onMove(e);
      if (s.phase === 'roam' && dist(s.x, s.y, e.clientX, e.clientY) < Math.max(uw * 0.55, 70)) escape(e.clientX, e.clientY);
    };
    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      uw = ufo.offsetWidth;
      uh = ufo.offsetHeight;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', onResize);
    setPhase('gone');
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="ufo-layer" aria-hidden="true">
      <span ref={flashRef} className="ufo-flash" />
      <div ref={ufoRef} className="ufo" data-phase="gone">
        <span ref={trailRef} className="ufo__trail" />
        <div ref={bodyRef} className="ufo__body">
          <Saucer />
          <span className="ufo__hit" />
        </div>
        <span ref={tagRef} className="ufo__tag" />
      </div>
    </div>
  );
}
