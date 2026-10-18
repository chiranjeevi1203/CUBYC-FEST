import { useEffect, useRef } from 'react';
import { mulberry32, prefersReducedMotion } from '../../config/experience';

/**
 * Black space full of stars, behind the Contact page: three depth layers that
 * twinkle and drift with the page's scroll (nearer stars move more), and a
 * shooting star now and then. `scrollRef` is the page's scroll container.
 */
export default function StarSky({ scrollRef }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return undefined;
    const reduced = prefersReducedMotion();
    let W = 0;
    let H = 0;
    let dpr = 1;
    let stars = [];
    const rnd = mulberry32(2027);
    const COLORS = ['255,255,255', '255,255,255', '214,226,255', '191,207,255', '255,233,196', '255,214,160'];

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const n = Math.min(1100, Math.round((W * H) / 1700));
      stars = Array.from({ length: n }, () => {
        const layer = rnd() < 0.62 ? 0 : rnd() < 0.75 ? 1 : 2;
        return {
          x: rnd() * W,
          y: rnd() * H * 1.6,
          r: [0.45, 0.8, 1.25][layer] * (0.7 + rnd() * 0.6),
          a: 0.35 + rnd() * 0.6,
          tw: 0.6 + rnd() * 2.2,
          ph: rnd() * Math.PI * 2,
          c: COLORS[Math.floor(rnd() * COLORS.length)],
          layer,
        };
      });
    };
    build();

    let shoot = null;
    let nextShoot = 2 + Math.random() * 5;
    let raf = 0;
    let last = performance.now();
    let t = 0;
    const draw = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      const sy = scrollRef?.current?.scrollTop ?? 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      // the faintest cold haze, so the black has depth
      const haze = ctx.createRadialGradient(W * 0.5, H * 0.35, 0, W * 0.5, H * 0.35, Math.max(W, H) * 0.7);
      haze.addColorStop(0, 'rgba(40, 52, 96, 0.16)');
      haze.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, W, H);
      const span = H * 1.6;
      for (const s of stars) {
        const speed = [0.04, 0.09, 0.16][s.layer];
        let y = (s.y - sy * speed) % span;
        if (y < 0) y += span;
        if (y > H + 4) continue;
        const a = reduced ? s.a : s.a * (0.65 + 0.35 * Math.sin(t * s.tw + s.ph));
        ctx.fillStyle = `rgba(${s.c},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.layer === 2 && s.r > 1.3) {
          // soft glow and a tiny cross on the brightest stars
          ctx.fillStyle = `rgba(${s.c},${(a * 0.18).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(s.x, y, s.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(s.x - s.r * 4, y - 0.3, s.r * 8, 0.6);
          ctx.fillRect(s.x - 0.3, y - s.r * 4, 0.6, s.r * 8);
        }
      }
      if (!reduced) {
        nextShoot -= dt;
        if (!shoot && nextShoot <= 0) {
          const ang = 0.35 + Math.random() * 0.5;
          shoot = { x: Math.random() * W * 0.8, y: Math.random() * H * 0.5, vx: Math.cos(ang) * 900, vy: Math.sin(ang) * 900, life: 0 };
          nextShoot = 5 + Math.random() * 8;
        }
        if (shoot) {
          shoot.life += dt;
          shoot.x += shoot.vx * dt;
          shoot.y += shoot.vy * dt;
          const fade = Math.max(0, 1 - shoot.life / 0.9);
          const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 0.12, shoot.y - shoot.vy * 0.12);
          g.addColorStop(0, `rgba(255, 246, 225, ${fade})`);
          g.addColorStop(1, 'rgba(160, 195, 255, 0)');
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(shoot.x, shoot.y);
          ctx.lineTo(shoot.x - shoot.vx * 0.12, shoot.y - shoot.vy * 0.12);
          ctx.stroke();
          if (fade <= 0) shoot = null;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', build);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', build);
    };
  }, [scrollRef]);

  return <canvas ref={ref} className="ct-sky" aria-hidden="true" />;
}
