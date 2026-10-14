import gsap from 'gsap';
import { CAMERA, SOLAR, TIMELINE } from '../config/experience';
import { PHASES, resetSceneState } from '../store/useExperience';

/* -------------------------------------------------------------------------- */
/*  Timeline-time lookups (the countdown is derived, never interval-driven)   */
/* -------------------------------------------------------------------------- */

const EPS = 1e-4;

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
 * @param {object} opts.hud            { chrome[], dash, update(frame), endCard, veil }
 * @param {HTMLElement|null} opts.landing
 * @param {HTMLElement[]} opts.reveals elements marked [data-reveal] in the landing page
 * @param {(phase:string)=>void} opts.onPhase
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
  gsap.set(hud.dash, { opacity: 0, x: reducedMotion ? 0 : -18 });
  gsap.set(hud.endCard, { opacity: 0, letterSpacing: '0.08em', y: reducedMotion ? 0 : 8 });
  gsap.set(hud.veil, { opacity: 0 });
}

/** Galaxy-side and Sun-side ends of the journey (camera z). */
function journeyEnds() {
  return { from: CAMERA.start.pos[2], to: SOLAR.position[2] + CAMERA.arrivalDistance };
}

/**
 * Per-frame journey readout for the dash: progress (0…1, from the distance the
 * camera has actually travelled, so it creeps, races at lightspeed, then eases
 * in), velocity as a fraction of lightspeed, and timeline time. Copy changes are
 * reported only when they change.
 */
function makeTicker({ scene, hud, onCopy }, timeFactor, warpVelocity) {
  const { from, to } = journeyEnds();
  let lastCopy = null;
  let lastT = 0;
  let lastZ = scene.cam.pz;
  let progress = 0;
  let velocity = 0;
  return (time) => {
    const t = time * timeFactor;
    const z = scene.cam.pz;
    const p = Math.min(Math.max((from - z) / (from - to), 0), 1);
    // Never runs backwards (the hero framing can nudge the camera past the end).
    progress = t < lastT - EPS ? p : Math.max(progress, p);
    const dt = t - lastT;
    if (dt > 1e-3 && dt < 0.25) velocity = Math.min(Math.abs(z - lastZ) / dt / warpVelocity, 1);
    else if (dt >= 0.25) velocity = scene.speed;
    lastT = t;
    lastZ = z;
    hud.update?.({ t, progress, velocity });
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

  // Lightspeed in three segments with continuous velocity: a sudden 0.4s
  // acceleration, a cruise, then a long 1.9s deceleration into the system.
  const ACC = 0.4;
  const CRUISE = P.ARRIVAL - P.WARP - ACC;
  const DEC = 1.9;
  const z0 = CAMERA.cruise.pos[2];
  const zEnd = sz + CAMERA.arrivalDistance;
  const v = (z0 - zEnd) / (ACC / 2 + CRUISE + DEC / 2);
  const zA = z0 - v * (ACC / 2);
  const zB = zA - v * CRUISE;

  const tick = makeTicker(opts, 1, v);
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: () => tick(tl.time()) });

  tl.call(onPhase, [PHASES.GALAXY], P.GALAXY)
    .call(onPhase, [PHASES.WARP], P.WARP)
    .call(onPhase, [PHASES.ARRIVAL], P.ARRIVAL);

  /* ---------- HUD in ---------- */
  tl.to(hud.chrome, { opacity: 1, duration: 0.9, stagger: 0.06, ease: 'power2.out' }, 0.2).to(
    hud.dash,
    { opacity: 1, x: 0, duration: 1.1, ease: 'expo.out' },
    0.25,
  );

  /* ---------- PHASE 1 · THE GALAXY, A SLOW DRIFT (0.0 → 3.0) ---------- */
  tl.to(g, { opacity: 1, duration: 1.4, ease: 'power1.out' }, 0)
    .to(g, { assembly: 1, duration: 2.2, ease: 'power3.out' }, 0.05)
    .to(g, { spin: 1, duration: 1.6, ease: 'power1.inOut' }, 0.4)
    .to(s, { stars: 1, duration: 1.6, ease: 'power1.out' }, 0.1)
    .to(s, { nebula: 1, duration: 1.6, ease: 'power1.inOut' }, 0.3)
    // Drifting in: steady and unhurried, still moving when the jump hits.
    .to(c, { px: CAMERA.cruise.pos[0], py: CAMERA.cruise.pos[1], pz: z0, duration: P.WARP, ease: 'power1.inOut' }, 0)
    // The charge: the lens tightens and the core gathers light…
    .to(c, { fov: CAMERA.galaxyFov - 4, duration: 0.6, ease: 'sine.inOut' }, P.WARP - 0.6)
    .to(g, { flash: 0.55, duration: 0.6, ease: 'power2.in' }, P.WARP - 0.6);

  /* ---------- PHASE 2 · LIGHTSPEED (3.0 → 4.7) ---------- */
  // …then everything lets go at once.
  tl.to(c, { pz: zA, duration: ACC, ease: 'power2.in' }, P.WARP)
    .to(c, { pz: zB, duration: CRUISE }, P.WARP + ACC)
    .to(c, { pz: zEnd, duration: DEC, ease: 'power2.out' }, P.ARRIVAL)
    .to(c, { py: 5, duration: ACC + 0.4, ease: 'sine.inOut' }, P.WARP)
    .to(c, { py: CAMERA.arrivalHeight, duration: DEC + 0.6, ease: 'sine.inOut' }, P.ARRIVAL - 0.6)
    .to(c, { lx: sx, ly: sy, lz: sz, duration: 0.6, ease: 'power2.inOut' }, P.WARP - 0.05)
    // Speed mirrors the travel velocity exactly: linear ramp up, hold, linear ramp down.
    .to(s, { speed: 1, duration: ACC }, P.WARP)
    .to(s, { speed: 0, duration: DEC }, P.ARRIVAL)
    .to(c, { fov: CAMERA.warpFov, duration: 0.35, ease: 'power3.out' }, P.WARP)
    .to(c, { fov: CAMERA.baseFov, duration: DEC + 0.2, ease: 'power2.inOut' }, P.ARRIVAL - 0.2)
    .to(c, { bank: 1, duration: 0.6, ease: 'power1.in' }, P.WARP + 0.1)
    .to(c, { bank: 0, duration: 1.4, ease: 'power1.out' }, P.ARRIVAL - 0.3)
    // A burst of light from the core as we punch through, then the galaxy falls away.
    .to(g, { flash: 1, duration: 0.14, ease: 'power2.out' }, P.WARP)
    .to(g, { opacity: 0, duration: 0.55, ease: 'power1.in' }, P.WARP + 0.12);

  /* ---------- PHASE 3 · ARRIVAL: THE SUN FIRST (4.7 → 6.4) ---------- */
  tl.to(s, { sun: 1, duration: 1.8, ease: 'power2.out' }, P.ARRIVAL - 0.15).to(
    s,
    { orbits: 1, duration: 1.6, ease: 'power2.inOut' },
    P.ARRIVAL + 0.9,
  );

  /* ---------- PHASE 4 · PLANETS & HAND-OFF (6.4 → 8.0) ---------- */
  tl.to(s.planets, { v: 1, duration: 1.0, ease: 'power2.out', stagger: 0.08 }, P.CAPTURE - 0.3)
    // fit → 1 hands framing to CameraRig's auto-fit (whole system, centred, sized to the viewport).
    .to(c, { ...hero, fit: 1, duration: P.HANDOFF - P.CAPTURE + 0.3, ease: 'power2.inOut' }, P.CAPTURE)
    // End card: title blooms with letter-spacing expansion, then clears for the landing hero.
    .to(hud.endCard, { opacity: 1, letterSpacing: '0.42em', y: 0, duration: 0.9, ease: 'power3.out' }, P.CAPTURE + 0.35)
    .to(hud.endCard, { opacity: 0, letterSpacing: '0.62em', duration: 0.4, ease: 'power2.in' }, P.HANDOFF - 0.4)
    .to(hud.dash, { opacity: 0, x: -14, duration: 0.4, ease: 'power2.in' }, P.HANDOFF - 0.4)
    .to(hud.chrome, { opacity: 0, duration: 0.3, ease: 'power1.in' }, P.HANDOFF - 0.3);

  if (landing) tl.to(landing, { autoAlpha: 1, duration: 0.5, ease: 'power1.out' }, P.HANDOFF - 0.25);
  if (reveals.length) {
    tl.to(reveals, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, P.HANDOFF - 0.15).set(reveals, {
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
  const tick = makeTicker(opts, TIMELINE.duration / D, 1);
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: () => tick(tl.time()) });
  const swap = D * 0.45;

  tl.call(onPhase, [PHASES.GALAXY], 0)
    .set(g, { assembly: 1, spin: 1 }, 0)
    .to(g, { opacity: 1, duration: 0.3 }, 0)
    .to(s, { stars: 1, nebula: 1, duration: 0.3 }, 0)
    .to(hud.chrome, { opacity: 1, duration: 0.2 }, 0)
    .to(hud.dash, { opacity: 1, duration: 0.2 }, 0)
    .to(hud.veil, { opacity: 1, duration: 0.22, ease: 'power1.in' }, swap - 0.22)
    .call(onPhase, [PHASES.ARRIVAL], swap)
    .set(g, { opacity: 0 }, swap)
    .set(c, { ...heroPose(), fov: CAMERA.baseFov, fit: 1 }, swap)
    .set(s, { sun: 1, orbits: 1 }, swap)
    .set(s.planets, { v: 1 }, swap)
    .to(hud.veil, { opacity: 0, duration: 0.4, ease: 'power1.out' }, swap + 0.05)
    .to(hud.endCard, { opacity: 1, letterSpacing: '0.42em', duration: 0.01 }, swap + 0.05)
    .to([hud.dash, ...hud.chrome, hud.endCard], { opacity: 0, duration: 0.25 }, D - 0.3);

  if (landing) tl.to(landing, { autoAlpha: 1, duration: 0.35 }, D - 0.35);
  if (reveals.length) tl.to(reveals, { autoAlpha: 1, duration: 0.4 }, D - 0.3);
  tl.call(onHandoff, null, D);
  return tl;
}
