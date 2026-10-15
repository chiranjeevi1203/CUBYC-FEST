import { useEffect, useRef } from 'react';
import { createShaderLayer } from '../../lib/blackHole';
import { MILKY_FRAG } from '../../lib/milkyWay';
import { prefersReducedMotion } from '../../config/experience';
import { useExperience } from '../../store/useExperience';

/**
 * The About page's sky: the same live Milky Way shader as the schedule page,
 * fixed behind the content. Scrolling the page pans it a little (parallax);
 * a vignette keeps it from competing with the campus.
 */
export default function SpaceBackdrop() {
  const canvasRef = useRef(null);
  const quality = useExperience((s) => s.quality);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scroller = canvas.closest('.space-page');
    const dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 0.75 : 1);
    const bg = createShaderLayer(canvas, MILKY_FRAG);
    const resize = () => bg?.resize(window.innerWidth, window.innerHeight, dpr);
    resize();
    window.addEventListener('resize', resize);
    const reduced = prefersReducedMotion();
    let raf = 0;
    let last = performance.now();
    const f = { time: 0, intro: reduced ? 1 : 0, offset: 0 };
    const tick = (now) => {
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
      last = now;
      if (!reduced) f.time += dt;
      f.intro += (1 - f.intro) * (1 - Math.exp(-dt * 1.6));
      const target = (scroller?.scrollTop ?? 0) / Math.max(window.innerHeight, 1) * 0.05;
      f.offset += (target - f.offset) * (1 - Math.exp(-dt * 4));
      bg?.draw({ uRes: [window.innerWidth * dpr, window.innerHeight * dpr], uTime: f.time, uOffset: f.offset, uIntro: f.intro, uWarm: 0 });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      bg?.destroy();
    };
  }, [quality]);

  return (
    <div className="space-bd" aria-hidden="true">
      <canvas ref={canvasRef} className="space-bd__canvas" />
      <div className="space-bd__veil" />
    </div>
  );
}
