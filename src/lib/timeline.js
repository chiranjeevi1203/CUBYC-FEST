import gsap from 'gsap';
import { CAMERA, SOLAR, TIMELINE } from '../config/experience';
import { PHASES, resetSceneState } from '../store/useExperience';

/* -------------------------------------------------------------------------- */
/*  Timeline-time lookups (the countdown is derived, never interval-driven)   */
/* -------------------------------------------------------------------------- */

const EPS = 1e-4;

export function countAt(t) {
  let value = TIMELINE.countTicks[0][1];
  for (const [time, numeral] of TIMELINE.countTicks) {
    if (t >= time - EPS) value = numeral;
  }
  return value;
}

export function copyIndexAt(t) {
  let index = 0;
  TIMELINE.copy.forEach(([time], i) => {
    if (t >= time - EPS) index = i;
  });
  return index;
}

/** Final landing composition in world space. */
export function heroPose() {
  const [sx, sy, sz] = SOLAR.position;
  const [ox, oy, oz] = CAMERA.hero.offset;
  const [lx, ly, lz] = CAMERA.hero.look;
  return { px: sx + ox, py: sy + oy, pz: sz + oz, lx: sx + lx, ly: sy + ly, lz: sz + lz };
}

/* -------------------------------------------------------------------------- */
/*  Builders                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Builds the single GSAP master timeline that drives the camera path, every
 * shader-facing scene value, the HUD (ring, comet, numerals, microcopy, end
 * card) and the landing-page reveal.
 *
 * @param {object} opts
 * @param {object} opts.scene          mutable scene state (store)
 * @param {object} opts.hud            { chrome[], ringWrap, progressArc, comet, center, circumference, endCard, veil }
 * @param {HTMLElement|null} opts.landing
 * @param {HTMLElement[]} opts.reveals elements marked [data-reveal] in the landing page
 * @param {(phase:string)=>void} opts.onPhase
 * @param {(count:number)=>void} opts.onCount
 * @param {(index:number)=>void} opts.onCopy
 * @param {()=>void} opts.onHandoff
 * @param {boolean} opts.reducedMotion
 */
export function buildMasterTimeline(opts) {
  resetSceneState(opts.scene);
  prepareDom(opts);
  return opts.reducedMotion ? buildReduced(opts) : buildCinematic(opts);
}

function prepareDom({ hud, landing, reveals, reducedMotion }) {
  if (landing) gsap.set(landing, { autoAlpha: 0 });
  if (reveals.length) gsap.set(reveals, { autoAlpha: 0, y: reducedMotion ? 0 : 40 });
  gsap.set(hud.chrome, { opacity: 0 });
  gsap.set(hud.ringWrap, { opacity: 0, y: reducedMotion ? 0 : 14 });
  gsap.set(hud.endCard, { opacity: 0, letterSpacing: '0.08em', y: reducedMotion ? 0 : 8 });
  gsap.set(hud.veil, { opacity: 0 });
}

/** Writes ring + comet straight to the DOM; reports numeral / copy changes only when they change. */
function makeTicker({ hud, onCount, onCopy }, timeFactor) {
  let lastCount = null;
  let lastCopy = null;
  return (time) => {
    const t = time * timeFactor;
    const p = Math.min(t / TIMELINE.duration, 1);
    if (hud.progressArc) hud.progressArc.style.strokeDashoffset = String(hud.circumference * (1 - p));
    if (hud.comet) hud.comet.setAttribute('transform', `rotate(${-90 + p * 360} ${hud.center} ${hud.center})`);
    const count = countAt(t);
    if (count !== lastCount) {
      lastCount = count;
      onCount(count);
    }
    const copy = copyIndexAt(t);
    if (copy !== lastCopy) {
      lastCopy = copy;
      onCopy(copy);
    }
  };
}

function buildCinematic(opts) {
  const { scene: s, hud, landing, reveals, onPhase, onHandoff } = opts;
  const c = s.cam;
  const g = s.galaxy;
  const P = TIMELINE.phases;
  const [sx, sy, sz] = SOLAR.position;
  const hero = heroPose();

  // FPV travel in three segments with continuous velocity:
  // accelerate 0.8s → cruise 1.2s → decelerate 1.3s.
  const z0 = CAMERA.cruise.pos[2];
  const zEnd = sz + CAMERA.arrivalDistance;
  const v = (z0 - zEnd) / (0.8 / 2 + 1.2 + 1.3 / 2);
  const zA = z0 - v * 0.4;
  const zB = zA - v * 1.2;

  const tick = makeTicker(opts, 1);
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: () => tick(tl.time()) });

  tl.call(onPhase, [PHASES.GALAXY], P.GALAXY)
    .call(onPhase, [PHASES.WARP], P.WARP)
    .call(onPhase, [PHASES.ARRIVAL], P.ARRIVAL);

  /* ---------- HUD in ---------- */
  tl.to(hud.chrome, { opacity: 1, duration: 0.9, stagger: 0.06, ease: 'power2.out' }, 0.2).to(
    hud.ringWrap,
    { opacity: 1, y: 0, duration: 1.0, ease: 'expo.out' },
    0.15,
  );

  /* ---------- PHASE 1 · GALAXY POP (0.0 → 1.5) ---------- */
  tl.to(g, { opacity: 1, duration: 0.6, ease: 'power1.out' }, 0)
    .to(g, { assembly: 1, duration: 1.35, ease: 'power2.out' }, 0.05)
    .to(g, { flash: 1, duration: 0.22, ease: 'power2.out' }, 0.95)
    .to(g, { flash: 0.25, duration: 0.8, ease: 'power2.inOut' }, 1.17)
    .to(g, { spin: 1, duration: 1.2, ease: 'power1.inOut' }, 0.9)
    .to(s, { stars: 1, duration: 1.4, ease: 'power1.out' }, 0.1)
    .to(s, { nebula: 1, duration: 1.3, ease: 'power1.inOut' }, 0.3)
    .to(
      c,
      { px: CAMERA.cruise.pos[0], py: CAMERA.cruise.pos[1], pz: z0, duration: P.WARP, ease: 'sine.inOut' },
      0,
    );

  /* ---------- PHASE 2 · WARP TRAVEL (1.5 → 3.5) ---------- */
  tl.to(c, { pz: zA, duration: 0.8, ease: 'power2.in' }, P.WARP)
    .to(c, { pz: zB, duration: 1.2 }, P.WARP + 0.8)
    .to(c, { pz: zEnd, duration: 1.3, ease: 'power2.out' }, P.WARP + 2.0)
    .to(c, { py: 5, duration: 1.0, ease: 'sine.inOut' }, P.WARP)
    .to(c, { py: CAMERA.arrivalHeight, duration: 2.3, ease: 'sine.inOut' }, P.WARP + 1.0)
    .to(c, { lx: sx, ly: sy, lz: sz, duration: 0.7, ease: 'power2.inOut' }, P.WARP)
    // Speed mirrors the travel velocity exactly: linear ramp up, hold, linear ramp down.
    .to(s, { speed: 1, duration: 0.8 }, P.WARP)
    .to(s, { speed: 0, duration: 1.3 }, P.WARP + 2.0)
    .to(c, { fov: CAMERA.warpFov, duration: 0.9, ease: 'power2.in' }, P.WARP)
    .to(c, { fov: CAMERA.baseFov, duration: 1.7, ease: 'power2.out' }, P.WARP + 1.1)
    .to(c, { bank: 1, duration: 0.7, ease: 'power1.in' }, P.WARP + 0.1)
    .to(c, { bank: 0, duration: 1.2, ease: 'power1.out' }, P.WARP + 1.6)
    // The galaxy dissolves as we dive through its core.
    .to(g, { opacity: 0, duration: 0.45, ease: 'power1.in' }, P.WARP + 0.45);

  /* ---------- PHASE 3 · APPROACHING SOL (3.5 → 4.8) ---------- */
  tl.to(s, { sun: 1, duration: 1.5, ease: 'power2.out' }, 3.1).to(
    s,
    { orbits: 1, duration: 1.4, ease: 'power2.inOut' },
    3.8,
  );

  /* ---------- PHASE 4 · ORBIT CAPTURE & HAND-OFF (4.8 → 6.0) ---------- */
  tl.to(s.planets, { v: 1, duration: 0.8, ease: 'power2.out', stagger: 0.06 }, P.CAPTURE)
    // fit → 1 hands framing to CameraRig's auto-fit (whole system, centred, sized to the viewport).
    .to(c, { ...hero, fit: 1, duration: P.HANDOFF - P.CAPTURE + 0.3, ease: 'power2.inOut' }, P.CAPTURE)
    // End card: title blooms with letter-spacing expansion, then clears for the landing hero.
    .to(hud.endCard, { opacity: 1, letterSpacing: '0.42em', y: 0, duration: 0.9, ease: 'power3.out' }, 4.95)
    .to(hud.endCard, { opacity: 0, letterSpacing: '0.62em', duration: 0.4, ease: 'power2.in' }, 5.6)
    .to(hud.ringWrap, { opacity: 0, y: 10, duration: 0.35, ease: 'power2.in' }, 5.65)
    .to(hud.chrome, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 5.7);

  if (landing) tl.to(landing, { autoAlpha: 1, duration: 0.5, ease: 'power1.out' }, 5.75);
  if (reveals.length) {
    tl.to(reveals, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, 5.85).set(reveals, {
      clearProps: 'transform',
    });
  }

  tl.call(onHandoff, null, P.HANDOFF).to(s, { parallax: 1, duration: 1.6, ease: 'power1.inOut' }, P.HANDOFF);
  return tl;
}

/** prefers-reduced-motion: no warp — galaxy → veil crossfade → solar system, ~1.2s. */
function buildReduced(opts) {
  const { scene: s, hud, landing, reveals, onPhase, onHandoff } = opts;
  const c = s.cam;
  const g = s.galaxy;
  const D = TIMELINE.reducedDuration;
  const tick = makeTicker(opts, TIMELINE.duration / D);
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: () => tick(tl.time()) });
  const swap = D * 0.45;

  tl.call(onPhase, [PHASES.GALAXY], 0)
    .set(g, { assembly: 1, spin: 1 }, 0)
    .to(g, { opacity: 1, duration: 0.3 }, 0)
    .to(s, { stars: 1, nebula: 1, duration: 0.3 }, 0)
    .to(hud.chrome, { opacity: 1, duration: 0.2 }, 0)
    .to(hud.ringWrap, { opacity: 1, duration: 0.2 }, 0)
    .to(hud.veil, { opacity: 1, duration: 0.22, ease: 'power1.in' }, swap - 0.22)
    .call(onPhase, [PHASES.ARRIVAL], swap)
    .set(g, { opacity: 0 }, swap)
    .set(c, { ...heroPose(), fov: CAMERA.baseFov, fit: 1 }, swap)
    .set(s, { sun: 1, orbits: 1 }, swap)
    .set(s.planets, { v: 1 }, swap)
    .to(hud.veil, { opacity: 0, duration: 0.4, ease: 'power1.out' }, swap + 0.05)
    .to(hud.endCard, { opacity: 1, letterSpacing: '0.42em', duration: 0.01 }, swap + 0.05)
    .to([hud.ringWrap, ...hud.chrome, hud.endCard], { opacity: 0, duration: 0.25 }, D - 0.3);

  if (landing) tl.to(landing, { autoAlpha: 1, duration: 0.35 }, D - 0.35);
  if (reveals.length) tl.to(reveals, { autoAlpha: 1, duration: 0.4 }, D - 0.3);
  tl.call(onHandoff, null, D);
  return tl;
}
