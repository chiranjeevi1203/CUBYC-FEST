import { useEffect, useRef, useState } from 'react';
import { HOLE_FRAG_WARM, createShaderLayer } from '../../lib/blackHole';
import { prefersReducedMotion } from '../../config/experience';

/**
 * A realistic black hole as a link: the gallery page's ray-traced Schwarzschild
 * hole (light bent around the horizon, the disk's lensed images above and below
 * it, Doppler-beamed gas), here in the warm "Interstellar" palette and rendered
 * small, with its label and a call-to-action pill beneath it. Hover spins the disk up;
 * a click swallows the button inward, then follows the link. It only renders
 * while on screen.
 */
export default function BlackHoleButton({ href, label, cta, ariaLabel }) {
  const [falling, setFalling] = useState(false);
  const [gl, setGl] = useState(true);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const timer = useRef(0);
  const state = useRef({ speed: 1, target: 1, time: 0 });
  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const layer = createShaderLayer(canvas, HOLE_FRAG_WARM, { alpha: true });
    if (!layer) {
      setGl(false);
      return undefined;
    }
    const reduced = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    const size = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      layer.resize(w, h, dpr);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);

    let raf = 0;
    let visible = false;
    let last = performance.now();
    const s = state.current;
    const draw = (now) => {
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
      last = now;
      s.speed += (s.target - s.speed) * (1 - Math.exp(-dt * 4));
      if (!reduced) s.time += dt * s.speed;
      layer.draw({
        uRes: [w * dpr, h * dpr],
        uCenter: [(w / 2) * dpr, (h / 2) * dpr],
        uR: h * 0.17 * dpr,
        uTime: s.time,
        uIntro: 1,
        uSpread: 1,
      });
      raf = visible && !reduced ? requestAnimationFrame(draw) : 0;
    };
    // Only render while on screen.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    });
    io.observe(canvas);
    return () => {
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      layer.destroy();
    };
  }, []);

  const spin = (on) => {
    state.current.target = on ? 4 : 1;
  };

  const onClick = (e) => {
    // Modified clicks (new tab etc.) behave like a normal link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (falling) return;
    if (prefersReducedMotion()) {
      window.location.hash = href;
      return;
    }
    setFalling(true);
    state.current.target = 14;
    timer.current = window.setTimeout(() => {
      window.location.hash = href;
      timer.current = window.setTimeout(() => {
        setFalling(false);
        state.current.target = 1;
      }, 500);
    }, 760);
  };

  return (
    <a
      ref={rootRef}
      href={href}
      onClick={onClick}
      onPointerEnter={() => spin(true)}
      onPointerLeave={() => spin(false)}
      onFocus={() => spin(true)}
      onBlur={() => spin(false)}
      className={`bhb ${falling ? 'is-falling' : ''} ${gl ? '' : 'is-flat'}`}
      aria-label={ariaLabel ?? label}
      data-cursor="hover"
    >
      <span className="bhb__view" aria-hidden="true">
        <span className="bhb__bloom" />
        <canvas ref={canvasRef} className="bhb__canvas" />
        {/* Fallback when WebGL is unavailable */}
        <span className="bhb__flat" />
      </span>
      <span className="bhb__label">{label}</span>
      {cta && (
        <span className="bhb__cta">
          <span className="bhb__cta-dot" aria-hidden="true" />
          {cta}
          <svg viewBox="0 0 20 20" className="bhb__cta-arrow" aria-hidden="true">
            <path d="M4 10h11m-4-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </a>
  );
}
