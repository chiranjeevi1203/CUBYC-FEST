import { useEffect, useRef, useState } from 'react';

const HOVER_SELECTOR = 'a, button, [role="button"], [data-cursor="hover"], input, label, select, textarea';

// Trail colour stops: solar gold at the head → violet → blue at the tail.
const TRAIL_STOPS = [
  [255, 222, 150],
  [244, 180, 82],
  [168, 120, 255],
  [92, 128, 255],
];

function trailColor(t) {
  const scaled = Math.min(Math.max(t, 0), 0.999) * (TRAIL_STOPS.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const a = TRAIL_STOPS[i];
  const b = TRAIL_STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

function canUseCometCursor() {
  if (typeof window === 'undefined') return false;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return fine && !reduced;
}

/**
 * Glowing comet cursor drawn on a single 2D canvas: a smooth tapered trail,
 * sparkling star dust, and a soft ring that blooms over interactive elements.
 * The loop sleeps when nothing is moving and restarts on the next pointer event.
 */
export default function CometCursor() {
  const canvasRef = useRef(null);
  const [enabled, setEnabled] = useState(canUseCometCursor);

  // Re-evaluate if the user switches input type or motion preference.
  useEffect(() => {
    const queries = [
      window.matchMedia('(hover: hover) and (pointer: fine)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
    ];
    const update = () => setEnabled(canUseCometCursor());
    queries.forEach((q) => q.addEventListener('change', update));
    return () => queries.forEach((q) => q.removeEventListener('change', update));
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const root = document.documentElement;
    root.classList.add('has-comet-cursor');

    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
    const TRAIL_LENGTH = lowPower ? 16 : 26;
    const MAX_PARTICLES = lowPower ? 36 : 90;

    let dpr = 1;
    let width = 0;
    let height = 0;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const mouse = { x: width / 2, y: height / 2 };
    const head = { x: mouse.x, y: mouse.y };
    const trail = Array.from({ length: TRAIL_LENGTH }, () => ({ x: head.x, y: head.y }));
    const particles = [];
    let visible = 0;
    let visibleTarget = 0;
    let hover = 0;
    let hoverTarget = 0;
    let press = 0;
    let raf = 0;
    let running = false;
    let last = performance.now();

    const spawn = (x, y, speed, burst = false) => {
      if (particles.length >= MAX_PARTICLES) return;
      const angle = Math.random() * Math.PI * 2;
      const velocity = burst ? 40 + Math.random() * 120 : 8 + Math.random() * 26 + speed * 0.04;
      particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity + (burst ? 0 : 6),
        life: 0,
        max: 0.5 + Math.random() * (burst ? 0.6 : 0.7),
        size: 0.8 + Math.random() * (burst ? 2.2 : 1.6),
        tint: Math.random(),
        spin: Math.random() * Math.PI,
      });
    };

    const drawSparkle = (p, alpha) => {
      const [r, g, b] = trailColor(p.tint * 0.9);
      const s = p.size * (1 - p.life / p.max * 0.5);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-s * 2.2, 0);
      ctx.lineTo(s * 2.2, 0);
      ctx.moveTo(0, -s * 2.2);
      ctx.lineTo(0, s * 2.2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,248,230,${alpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(s * 0.55, 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const frame = (now) => {
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05); // never negative (rAF time can precede setup)
      last = now;

      // Ease the head toward the pointer; ease the trail toward the head.
      const prevX = head.x;
      const prevY = head.y;
      const follow = 1 - Math.exp(-dt * 28);
      head.x += (mouse.x - head.x) * follow;
      head.y += (mouse.y - head.y) * follow;
      const speed = Math.hypot(head.x - prevX, head.y - prevY) / Math.max(dt, 0.001);

      trail[0].x = head.x;
      trail[0].y = head.y;
      const drag = 1 - Math.exp(-dt * 34);
      for (let i = 1; i < trail.length; i++) {
        trail[i].x += (trail[i - 1].x - trail[i].x) * drag;
        trail[i].y += (trail[i - 1].y - trail[i].y) * drag;
      }

      visible += (visibleTarget - visible) * (1 - Math.exp(-dt * 10));
      // Planets in the WebGL scene count as hover targets too (class set by PlanetInteraction).
      const wantHover = Math.max(hoverTarget, root.classList.contains('planet-hover') ? 1 : 0);
      hover += (wantHover - hover) * (1 - Math.exp(-dt * 12));
      press += (0 - press) * (1 - Math.exp(-dt * 8));

      // Star dust scales with speed.
      if (visibleTarget > 0 && speed > 60 && Math.random() < Math.min(speed / 1400, 0.85)) {
        spawn(head.x, head.y, speed);
      }

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      // Tapered comet trail
      ctx.lineCap = 'round';
      const tailWidth = 7 * (1 - hover * 0.6);
      for (let i = 1; i < trail.length; i++) {
        const t = i / (trail.length - 1);
        const a = trail[i - 1];
        const b = trail[i];
        if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 0.15) continue;
        const [r, g, bl] = trailColor(t);
        const alpha = Math.pow(1 - t, 1.6) * 0.75 * visible;
        ctx.strokeStyle = `rgba(${r | 0},${g | 0},${bl | 0},${alpha})`;
        ctx.lineWidth = Math.max(tailWidth * (1 - t), 0.4);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.max) {
          particles.splice(i, 1);
          continue;
        }
        p.vx *= 1 - dt * 2.2;
        p.vy *= 1 - dt * 2.2;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.spin += dt * 2;
        const life = p.life / p.max;
        const twinkle = 0.65 + 0.35 * Math.sin(p.life * 28 + p.tint * 10);
        drawSparkle(p, (1 - life) * twinkle * 0.9 * Math.max(visible, 0.4));
      }

      // Head glow
      const glowR = 16 + hover * 14 + press * 10;
      const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, glowR);
      glow.addColorStop(0, `rgba(255,236,190,${0.55 * visible * (1 - hover * 0.55)})`);
      glow.addColorStop(0.4, `rgba(244,180,82,${0.22 * visible})`);
      glow.addColorStop(1, 'rgba(120,90,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(head.x, head.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Core dot shrinks as the hover ring blooms
      ctx.globalCompositeOperation = 'source-over';
      const core = 3.2 * (1 - hover * 0.6) * (1 - press * 0.3);
      ctx.fillStyle = `rgba(255,250,236,${visible})`;
      ctx.beginPath();
      ctx.arc(head.x, head.y, core, 0, Math.PI * 2);
      ctx.fill();

      // Hover ring
      if (hover > 0.01) {
        const ringR = 8 + hover * 16 - press * 4;
        ctx.strokeStyle = `rgba(233,194,122,${0.85 * hover * visible})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(head.x, head.y, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(233,194,122,${0.08 * hover * visible})`;
        ctx.fill();
      }

      // Sleep when everything has settled.
      const tail = trail[trail.length - 1];
      const settled =
        particles.length === 0 &&
        Math.abs(mouse.x - tail.x) + Math.abs(mouse.y - tail.y) < 0.3 &&
        Math.abs(visibleTarget - visible) < 0.01 &&
        Math.abs(wantHover - hover) < 0.01 &&
        press < 0.01;
      if (settled) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (visibleTarget === 0) {
        // First appearance: snap the comet to the pointer instead of streaking in.
        head.x = mouse.x;
        head.y = mouse.y;
        trail.forEach((p) => {
          p.x = mouse.x;
          p.y = mouse.y;
        });
      }
      visibleTarget = 1;
      wake();
    };
    const onOver = (e) => {
      hoverTarget = e.target instanceof Element && e.target.closest(HOVER_SELECTOR) ? 1 : 0;
      wake();
    };
    const onDown = () => {
      press = 1;
      for (let i = 0; i < 10; i++) spawn(head.x, head.y, 0, true);
      wake();
    };
    const onLeave = () => {
      visibleTarget = 0;
      wake();
    };
    const onResize = () => {
      resize();
      wake();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('pointerover', onOver, { passive: true });
    root.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      running = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      root.classList.remove('has-comet-cursor');
      // Release the backing store.
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ pointerEvents: 'none', zIndex: 9999 }}
    />
  );
}
