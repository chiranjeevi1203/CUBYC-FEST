import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import SiteNav from '../ui/SiteNav';
import Frame from '../ui/Frame';
import Star from '../ui/Star';
import { GALLERY_ITEMS as GALLERY_PHOTOS, Media } from '../Gallery';
import { BRAND, prefersReducedMotion } from '../../config/experience';
import { BACKGROUND_FRAG, HOLE_FRAG, createPhotoLayer, createShaderLayer } from '../../lib/blackHole';
import { useExperience } from '../../store/useExperience';

/*
 * Photos drift in on two spiral streams (from the left and from the right) and
 * accelerate as they fall. They are drawn on the GPU as finely subdivided quads:
 * tides stretch them along the pull and squeeze them across it while they shrink,
 * the hole's gravity bends their light into an arc around the shadow (with a faint
 * mirrored second image on the far side), and they redden and fade at the horizon.
 * Invisible DOM buttons follow them for hover, focus and click.
 */
const EINSTEIN = 1.45; // Einstein radius of the photo lens, in shadow radii
const TEX_W = 640;
const TEX_H = 460;
const TOTAL_PHOTOS = GALLERY_PHOTOS.length;
// Never show more photos at once than there are, so a photo is never on screen twice.
const PER_SIDE = Math.max(1, Math.min(3, Math.floor(TOTAL_PHOTOS / 2)));
const SLOTS = PER_SIDE * 2;
const SECONDS_PER_SLOT = 4.4;
const TOTAL = GALLERY_PHOTOS.length;
/**
 * Arrival order. Photos arrive alternately from the left and the right, so the list
 * (already alternating departments) is re-paired — A B · B A · A B … — so that each
 * stream alternates departments too, and no photo is ever on screen twice.
 */
const ORDER = Array.from({ length: TOTAL }, (_, i) => {
  const pair = Math.floor(i / 2);
  const j = pair % 2 === 1 ? (i % 2 === 0 ? i + 1 : i - 1) : i;
  return j < TOTAL ? j : i;
});

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mod = (n, m) => ((n % m) + m) % m;
const pad = (n) => String(n).padStart(2, '0');

function layoutFor(w, h) {
  const portrait = w < h * 0.85;
  const short = !portrait && h < 560; // phones held sideways
  // A small, detailed hole; the photos are the stars of the page.
  const R = portrait ? Math.max(20, Math.min(w * 0.07, 36)) : Math.max(short ? 22 : 28, Math.min(Math.min(w, h) * 0.052, 62));
  const cardW = portrait
    ? Math.max(150, Math.min(w * 0.6, h * 0.34, 280))
    : short
      ? Math.max(130, Math.min(h * 0.4, w * 0.22))
      : Math.max(220, Math.min(w * 0.23, 360));
  return {
    w,
    h,
    portrait,
    cx: w / 2,
    cy: h * (portrait ? 0.6 : short ? 0.64 : 0.63),
    R,
    cardW,
    cardH: cardW * 0.72,
    D0: w / 2 + cardW * 0.8,
    k: portrait ? 1.05 : 0.42,
    spread: portrait ? 0.6 : 1,
  };
}

/** Where a photo is at flow progress p (0 = just arriving at the screen edge, 1 = swallowed). */
function poseOf(p, side, L) {
  const d = L.D0 * Math.pow(1 - p, 0.78);
  const th = (side === 0 ? Math.PI + 0.22 : 0.22) + Math.pow(p, 2.4) * 2.35;
  const x = Math.cos(th) * d;
  const y = Math.sin(th) * d * L.k;
  // Tidal pull: 0 far out → 1 at the horizon (grows steeply, like 1/r^3).
  const tau = 1 - smooth(L.R * 1.1, L.R * 7, d);
  // Full size for most of the journey; shrinks only on the final approach.
  const size = 0.12 + 0.88 * Math.pow(smooth(L.R * 0.8, Math.max(L.R * 9, L.cardW * 1.3), d), 0.85);
  let phi = Math.atan2(y, x);
  if (phi > Math.PI / 2) phi -= Math.PI;
  if (phi < -Math.PI / 2) phi += Math.PI;
  const o = smooth(0, 0.06, p) * smooth(0.15, 0.85, d / L.R);
  return { x, y, d, tau, size, rot: phi * tau * 0.5, o };
}

/** The invisible DOM hit target that follows a photo (only while it's still catchable). */
function placeHit(el, q, L) {
  el.style.transform = `translate3d(${L.cx + q.x - L.cardW / 2}px, ${L.cy + q.y - L.cardH / 2}px, 0) rotate(${q.rot}rad) scale(${q.size})`;
  const catchable = q.o > 0.5 && q.tau < 0.4;
  el.style.visibility = catchable ? 'visible' : 'hidden';
}

/** Draw an image (photo or placeholder art) into a texture-sized canvas, cropped to cover. */
function coverCanvas(img) {
  const c = document.createElement('canvas');
  c.width = TEX_W;
  c.height = TEX_H;
  const ctx = c.getContext('2d');
  const iw = img.naturalWidth || img.width || TEX_W;
  const ih = img.naturalHeight || img.height || TEX_H;
  const sc = Math.max(TEX_W / iw, TEX_H / ih);
  const w = iw * sc;
  const h = ih * sc;
  ctx.fillStyle = '#05060d';
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  ctx.drawImage(img, (TEX_W - w) / 2, (TEX_H - h) / 2, w, h);
  return c;
}

/* -------------------------------------------------------------------------- */

function Lightbox({ index, onClose, onStep, closeRef }) {
  const panel = useRef(null);
  const media = useRef(null);
  const shown = useRef(index);
  const item = GALLERY_PHOTOS[index];

  // Emerges from the black hole.
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      panel.current,
      { scale: 0.15, rotate: -10, autoAlpha: 0, filter: 'blur(14px) brightness(2.2)' },
      { scale: 1, rotate: 0, autoAlpha: 1, filter: 'blur(0px) brightness(1)', duration: 0.9, ease: 'expo.out', clearProps: 'filter' },
    );
  }, []);
  // Stepping crossfades the photo.
  useLayoutEffect(() => {
    if (shown.current === index || prefersReducedMotion()) return;
    shown.current = index;
    gsap.fromTo(media.current, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'power3.out' });
  }, [index]);

  const close = () => {
    if (prefersReducedMotion()) return onClose();
    gsap.to(panel.current, { scale: 0.12, rotate: 12, autoAlpha: 0, filter: 'blur(12px) brightness(2)', duration: 0.5, ease: 'power3.in', onComplete: onClose });
    return undefined;
  };
  closeRef.current = close;

  // Swipe sideways to step through the photos (touch and pen).
  const swipe = useRef(null);
  const onSwipeStart = (e) => {
    if (e.pointerType === 'mouse' || (e.target instanceof Element && e.target.closest('button'))) return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onSwipeEnd = (e) => {
    const sw = swipe.current;
    swipe.current = null;
    if (!sw) return;
    const dx = e.clientX - sw.x;
    const dy = e.clientY - sw.y;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.3) onStep(dx < 0 ? 1 : -1);
  };

  return (
    <div className="bh-lightbox" role="dialog" aria-modal="true" aria-label={item.title} onClick={close}>
      <figure
        ref={panel}
        className="bh-lightbox__panel"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onSwipeStart}
        onPointerUp={onSwipeEnd}
        onPointerCancel={() => (swipe.current = null)}
      >
        <Frame size="lg" />
        <div ref={media} className="bh-lightbox__media">
          <Media item={item} uid={`lb-${index}`} />
        </div>
        <figcaption className="bh-lightbox__bar">
          <span className="flex min-w-0 flex-col">
            <span className="font-mono text-[0.56rem] tracking-[0.32em] text-gold-300/80 uppercase">
              {pad(index + 1)} / {pad(TOTAL)}
            </span>
            <span className="mt-1 truncate font-display text-lg font-bold tracking-[0.1em] text-[#f6f1e7] uppercase sm:text-xl">{item.title}</span>
            {item.caption && <span className="mt-0.5 truncate font-mono text-[0.58rem] tracking-[0.26em] text-white/50 uppercase">{item.caption}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <button type="button" className="bh-btn" onClick={() => onStep(-1)} aria-label="Previous photo">
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <path d="M16 10H5m4-5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="bh-btn" onClick={() => onStep(1)} aria-label="Next photo">
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <path d="M4 10h11m-4-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="bh-btn" onClick={close} aria-label="Close">
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        </figcaption>
      </figure>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function GalleryView({ open, onGone }) {
  const quality = useExperience((s) => s.quality);
  const setCovered = useExperience((s) => s.setDeptCovered);
  const rootRef = useRef(null);
  const bgRef = useRef(null);
  const holeRef = useRef(null);
  const photoRef = useRef(null);
  const artHost = useRef(null);
  const headRef = useRef(null);
  const hotRef = useRef(null);
  const hotEase = useRef(Array.from({ length: SLOTS }, () => 0));
  const cards = useRef([]);
  const imgs = useRef(Array.from({ length: SLOTS }, () => -1));
  const flow = useRef({ t: 0, time: 0, speed: 0, fling: 0, intro: 0, hover: false, paused: false, tweening: false, dragging: false, lightbox: false });
  const layout = useRef(layoutFor(window.innerWidth, window.innerHeight));
  const [slotImgs, setSlotImgs] = useState(() => Array.from({ length: SLOTS }, (_, s) => s % TOTAL));
  const [hot, setHot] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [paused, setPaused] = useState(false);
  const lightboxClose = useRef(null);
  const closing = useRef(false);
  const reduced = prefersReducedMotion();

  flow.current.lightbox = lightbox !== null;
  hotRef.current = hot;
  flow.current.paused = paused;

  /* ---------- enter / exit ---------- */
  useLayoutEffect(() => {
    const root = rootRef.current;
    document.documentElement.classList.add('dept-open');
    gsap.set(root, { autoAlpha: 0 });
    const head = headRef.current ? Array.from(headRef.current.children) : [];
    gsap.set(head, { autoAlpha: 0, y: 24 });
    const tl = gsap
      .timeline()
      .to(root, { autoAlpha: 1, duration: reduced ? 0.2 : 0.7, ease: 'power2.out', onComplete: () => setCovered(true) })
      .to(flow.current, { intro: 1, duration: reduced ? 0.2 : 2.2, ease: 'power2.out' }, 0.15)
      .to(head, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.35);
    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) {
      // Reopened while the exit was still playing: bring it straight back.
      if (!closing.current) return undefined;
      closing.current = false;
      document.documentElement.classList.add('dept-open');
      const tl = gsap
        .timeline()
        .to(rootRef.current, { autoAlpha: 1, duration: 0.4, ease: 'power2.out', onComplete: () => setCovered(true) }, 0)
        .to(flow.current, { intro: 1, duration: 0.8, ease: 'power2.out' }, 0);
      return () => tl.kill();
    }
    closing.current = true;
    setCovered(false);
    document.documentElement.classList.remove('dept-open');
    const tl = gsap
      .timeline({ onComplete: onGone })
      .to(flow.current, { intro: 0, duration: 0.6, ease: 'power2.in' }, 0)
      .to(rootRef.current, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut' }, 0.1);
    return () => tl.kill();
  }, [open, onGone, setCovered]);

  useEffect(
    () => () => {
      document.documentElement.classList.remove('dept-open');
    },
    [],
  );

  /* ---------- render loop: shaders + photo streams ---------- */
  useEffect(() => {
    // Touch devices get a slightly lighter budget so the drift stays smooth on phones;
    // the soft nebula backdrop renders at 1x there (it has no fine detail to lose).
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1 : touch ? 1.35 : 1.5);
    const bgDpr = touch ? Math.min(dpr, 1) : dpr;
    // The hole is small, so it can render at full sharpness.
    const holeDpr = dpr;
    const bg = createShaderLayer(bgRef.current, BACKGROUND_FRAG);
    const photos = createPhotoLayer(photoRef.current);
    const hole = createShaderLayer(holeRef.current, HOLE_FRAG, { alpha: true });

    // Textures: real photos load from their URLs; placeholder art is rasterised from its SVG.
    let alive = true;
    GALLERY_PHOTOS.forEach((item, i) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => alive && photos?.setTexture(i, coverCanvas(img));
      if (item.src) {
        img.src = item.src;
      } else {
        const svg = artHost.current?.querySelector(`[data-art="${i}"] svg`);
        if (!svg) return;
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('width', String(TEX_W));
        clone.setAttribute('height', String(TEX_H));
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
      }
    });

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      layout.current = layoutFor(w, h);
      bg?.resize(w, h, bgDpr);
      photos?.resize(w, h, dpr);
      hole?.resize(w, h, holeDpr);
      const L = layout.current;
      cards.current.forEach((el) => {
        if (!el) return;
        el.style.width = `${L.cardW}px`;
        el.style.height = `${L.cardH}px`;
      });
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const f = flow.current;
      const halt = f.hover || f.paused || f.lightbox || f.tweening || f.dragging || reduced;
      f.speed += ((halt ? 0 : 1 / SECONDS_PER_SLOT) - f.speed) * (1 - Math.exp(-dt * 3));
      f.t += f.speed * dt;
      // A released drag keeps gliding, then settles.
      if (!f.dragging && f.fling) {
        f.t += f.fling * dt;
        f.fling *= Math.exp(-dt * 3.2);
        if (Math.abs(f.fling) < 0.02) f.fling = 0;
      }
      f.time += dt;
      const L = layout.current;

      let changed = false;
      const draws = [];
      for (let side = 0; side < 2; side++) {
        for (let i = 0; i < PER_SIDE; i++) {
          const slot = side * PER_SIDE + i;
          // The right stream runs half a slot behind the left, so arrivals alternate sides.
          const u = (f.t + i + side * 0.5) / PER_SIDE;
          const cycle = Math.floor(u);
          const p = u - cycle;
          const img = ORDER[mod((cycle * PER_SIDE + i) * 2 + side, TOTAL)];
          if (imgs.current[slot] !== img) {
            imgs.current[slot] = img;
            changed = true;
          }
          const q = poseOf(p, side, L);
          const el = cards.current[slot];
          if (el) placeHit(el, q, L);
          const hs = (hotEase.current[slot] += ((hotRef.current === slot ? 1 : 0) - hotEase.current[slot]) * (1 - Math.exp(-dt * 10)));
          const grow = q.size * (1 + hs * 0.1);
          draws.push({
            tex: img,
            card: [(L.cx + q.x) * dpr, (L.h - (L.cy + q.y)) * dpr],
            size: [L.cardW * grow * dpr, L.cardH * grow * dpr],
            rot: -q.rot,
            tidal: (L.portrait ? 1.4 : 2.2) * Math.pow(q.tau, 2.4),
            alpha: q.o * f.intro,
            hot: hs,
            secondary: 0,
            tau: q.tau,
          });
        }
      }
      if (changed) setSlotImgs([...imgs.current]);
      // Photos deepest in the well draw first; those still far out sit on top.
      draws.sort((a, b) => b.tau - a.tau);

      const W = L.w * dpr;
      const H = L.h * dpr;
      const u = { uRes: [W, H], uCenter: [L.cx * dpr, (L.h - L.cy) * dpr], uR: L.R * dpr, uTime: f.time, uIntro: f.intro, uSpread: L.spread };
      bg?.draw({ ...u, uRes: [L.w * bgDpr, L.h * bgDpr], uCenter: [L.cx * bgDpr, (L.h - L.cy) * bgDpr], uR: L.R * bgDpr });
      photos?.draw({ res: [W, H], hole: u.uCenter, R: L.R * dpr, E: L.portrait ? EINSTEIN * 0.72 : EINSTEIN }, draws);
      hole?.draw({ ...u, uRes: [L.w * holeDpr, L.h * holeDpr], uCenter: [L.cx * holeDpr, (L.h - L.cy) * holeDpr], uR: L.R * holeDpr });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      alive = false;
      bg?.destroy();
      photos?.destroy();
      hole?.destroy();
    };
  }, [quality, reduced]);

  /* ---------- controls ---------- */
  const nudge = useCallback((dir) => {
    const f = flow.current;
    f.tweening = true;
    gsap.to(f, { t: Math.round(f.t) + dir, duration: 0.95, ease: 'power3.inOut', overwrite: true, onComplete: () => (f.tweening = false) });
  }, []);

  const step = useCallback((dir) => setLightbox((i) => (i === null ? i : mod(i + dir, TOTAL))), []);
  const leave = () => {
    window.location.hash = '#gallery';
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (flow.current.lightbox) lightboxClose.current?.();
        else leave();
      } else if (e.key === 'ArrowRight') {
        if (flow.current.lightbox) step(1);
        else nudge(1);
      } else if (e.key === 'ArrowLeft') {
        if (flow.current.lightbox) step(-1);
        else nudge(-1);
      } else if (e.key === ' ' && !flow.current.lightbox && !(e.target instanceof Element && e.target.closest('a, button'))) {
        e.preventDefault();
        setPaused((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nudge, step]);

  // Scroll or drag to pull the streams along.
  const onWheel = (e) => {
    if (flow.current.lightbox) return;
    flow.current.t += (e.deltaY + e.deltaX) * 0.0022;
  };
  const drag = useRef(null);
  const dragged = useRef(false); // a drag that moved swallows the click that follows it
  const onPointerDown = (e) => {
    if (flow.current.lightbox || e.button > 0) return;
    if (e.target instanceof Element && e.target.closest('a, button:not(.bh-card), header, nav, .bh-controls')) return;
    drag.current = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, at: performance.now(), v: 0, moved: false };
    dragged.current = false;
    flow.current.fling = 0;
    // On touch, holding a photo stops it (the mouse does this on hover).
    if (e.pointerType !== 'mouse' && e.target instanceof Element && e.target.closest('.bh-card')) flow.current.hover = true;
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return;
      d.moved = true;
      dragged.current = true;
      flow.current.dragging = true;
      gsap.killTweensOf(flow.current, 't');
      flow.current.tweening = false;
    }
    // Sideways drags pull the streams; on tall phones an upward swipe does too.
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const delta = Math.abs(dx) >= Math.abs(dy) ? dx : layout.current.portrait ? -dy : 0;
    const now = performance.now();
    const dt = Math.max((now - d.at) / 1000, 0.001);
    const dT = delta / (layout.current.w * (layout.current.portrait ? 0.32 : 0.16));
    flow.current.t += dT;
    d.v = d.v * 0.6 + (dT / dt) * 0.4;
    d.x = e.clientX;
    d.y = e.clientY;
    d.at = now;
  };
  const endDrag = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      // Fling: a quick release carries on (velocity faded if the finger rested first).
      const idle = performance.now() - d.at;
      flow.current.fling = idle > 90 || e?.type === 'pointercancel' ? 0 : Math.max(-6, Math.min(6, d.v));
    }
    flow.current.dragging = false;
    if (e?.pointerType && e.pointerType !== 'mouse') {
      flow.current.hover = false;
      setHot(null);
    }
  };

  const L = layout.current;
  return (
    <div
      ref={rootRef}
      className="bh-page fixed inset-0 z-40 touch-none overflow-hidden text-[#f4f1ea] select-none"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={(e) => e.pointerType === 'mouse' && endDrag(e)}
    >
      <canvas ref={bgRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <canvas ref={photoRef} className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true" />
      {/* Placeholder art, rasterised into textures */}
      <div ref={artHost} className="hidden" aria-hidden="true">
        {GALLERY_PHOTOS.map((item, i) =>
          item.src ? null : (
            <div key={i} data-art={i}>
              <Media item={item} uid={`tx-${i}`} />
            </div>
          ),
        )}
      </div>

      {/* Photo streams */}
      {/* Hit targets that follow the photos (drawn on the canvas above). */}
      <div className="absolute inset-0 z-[15]" aria-label="Campus gallery" role="list">
        {slotImgs.map((img, slot) => {
          const item = GALLERY_PHOTOS[img];
          return (
            <button
              key={slot}
              ref={(el) => (cards.current[slot] = el)}
              type="button"
              role="listitem"
              className={`bh-card ${hot === slot ? 'is-hot' : ''}`}
              style={{ width: L.cardW, height: L.cardH, visibility: 'hidden' }}
              onPointerEnter={(e) => {
                if (e.pointerType !== 'mouse') return;
                flow.current.hover = true;
                setHot(slot);
              }}
              onPointerLeave={(e) => {
                if (e.pointerType !== 'mouse') return;
                flow.current.hover = false;
                setHot(null);
              }}
              onClick={() => {
                if (dragged.current) {
                  dragged.current = false;
                  return;
                }
                setLightbox(img);
              }}
              aria-label={`Open photo: ${item.title}`}
            >
              <span className="bh-card__caption">{item.title}</span>
            </button>
          );
        })}
      </div>

      <canvas ref={holeRef} className="pointer-events-none absolute inset-0 z-20 h-full w-full" aria-hidden="true" />
      <div className="bh-vignette pointer-events-none absolute inset-0 z-20" aria-hidden="true" />

      <SiteNav active="gallery" />

      {/* Heading */}
      <header ref={headRef} className="bh-head pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+5.25rem)] z-30 flex flex-col items-center px-5 text-center sm:top-28">
        <p className="inline-flex items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-gold-300/85 uppercase">
          <Star className="h-2 w-2 text-gold-400/70" />
          Event horizon · {BRAND.campus}
          <Star className="h-2 w-2 text-gold-400/70" />
        </p>
        <h1 className="title-cosmic mt-3 font-display text-[clamp(2.2rem,6.6vw,4.6rem)] font-bold leading-none tracking-[0.12em] [margin-right:-0.12em] uppercase">
          Gallery
        </h1>
        <p className="mt-3 max-w-md text-[0.86rem] leading-relaxed text-white/60 sm:text-[0.95rem]">
          Moments from our campus, drawn into orbit. Hold one to stop it — open it to pull it back out.
        </p>
      </header>

      {/* Controls */}
      <div className="bh-controls" data-dock>
        <button type="button" className="bh-btn" onClick={() => nudge(-1)} aria-label="Previous photos">
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
            <path d="M16 10H5m4-5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className="bh-btn" onClick={() => setPaused((v) => !v)} aria-label={paused ? 'Resume the drift' : 'Pause the drift'} aria-pressed={paused}>
          {paused ? (
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path d="M7 5v10l8-5z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path d="M7 5v10M13 5v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <button type="button" className="bh-btn" onClick={() => nudge(1)} aria-label="Next photos">
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
            <path d="M4 10h11m-4-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="bh-controls__text">
          <span className="text-gold-200">{pad(TOTAL)}</span> moments
          <span className="bh-hint bh-hint--mouse"> · scroll or drag to pull</span>
          <span className="bh-hint bh-hint--touch"> · swipe to pull</span>
        </span>
      </div>

      {lightbox !== null && <Lightbox index={lightbox} onStep={step} onClose={() => setLightbox(null)} closeRef={lightboxClose} />}
    </div>
  );
}

/** The campus gallery page (#/gallery): mounted while open, plus its exit animation. */
export default function GalleryPage() {
  const open = useExperience((s) => s.galleryOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  const onGone = useCallback(() => setMounted(false), []);
  if (!mounted) return null;
  return <GalleryView open={open} onGone={onGone} />;
}
