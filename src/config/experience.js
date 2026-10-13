/**
 * Central tuning file for the CUBYC — FEST'2027 opening experience.
 * Copy, timing, colours, camera path, particle budgets and planets all live here.
 * Department names / events live in ./departments.js and are attached to the bodies below.
 */

import { DEPARTMENTS } from './departments';

/* -------------------------------------------------------------------------- */
/*  Brand + copy                                                              */
/* -------------------------------------------------------------------------- */

export const BRAND = {
  university: 'Christ University',
  universityFull: 'CHRIST (Deemed to be University)',
  campus: 'Yeshwanthpur Campus',
  fest: 'CUBYC',
  edition: "FEST'2027",
  title: "CUBYC — FEST'2027",
  subline: 'Our 1st Flagship Annual Fest',
  heroTitle: ['CUBYC', 'FEST'],
  tagline: 'Ten departments. One orbit. The cosmos comes to campus.',
};

/** Event dates (IST). The landing-page countdown targets `start`. */
export const EVENT = {
  start: '2027-02-04T09:00:00+05:30',
  end: '2027-02-05T21:00:00+05:30',
  dateLabel: '4 – 5 February 2027',
  days: ['Thu · 04 Feb 2027', 'Fri · 05 Feb 2027'],
  // The "days" moon waxes from new (this date) to full on fest day.
  countdownFrom: '2026-10-01T00:00:00+05:30',
};

/* -------------------------------------------------------------------------- */
/*  Timeline (seconds on the GSAP master timeline)                            */
/* -------------------------------------------------------------------------- */

export const TIMELINE = {
  duration: 6,
  // 1 = canonical 6.0s. 0.8 = slower, 1.25 = faster.
  timeScale: 1,
  // prefers-reduced-motion: no warp, galaxy → solar system crossfade.
  reducedDuration: 1.2,
  phases: { GALAXY: 0, WARP: 1.5, ARRIVAL: 3.5, CAPTURE: 4.8, HANDOFF: 6 },
  // [time, numeral] — the countdown is looked up from timeline time, never a timer.
  countTicks: [
    [0, 6],
    [0.75, 5],
    [1.5, 4],
    [2.5, 3],
    [3.5, 2],
    [4.8, 1],
    [5.6, 0],
  ],
  // [time, microcopy]
  copy: [
    [0, 'Locating the Milky Way'],
    [1.5, 'Warp drive engaged — traversing the cosmos'],
    [3.5, 'Solar system detected'],
    [4.8, 'Welcome aboard'],
  ],
};

/* -------------------------------------------------------------------------- */
/*  Colour                                                                    */
/* -------------------------------------------------------------------------- */

export const PALETTE = {
  // Galaxy (REF-1): warm core → blue rim
  galaxyInside: '#ffb489',
  galaxyOutside: '#638dff',
  galaxyCore: '#ffe6c4',
  // Nebula billboards (REF-2): indigo / violet / warm gold
  nebula: ['#3a2c9a', '#6b4fd8', '#d9a24a', '#2b4fb3', '#8a5ad8'],
  // Warp streaks: mostly white-blue, rare gold
  warp: ['#ffffff', '#e6eeff', '#c8d6ff', '#a9bfff'],
  warpGold: '#ffd38a',
  // Sun
  sunCore: '#fff6dc',
  sunMid: '#ffc04a',
  sunEdge: '#e2581c',
  sunGlowInner: '#ffd27a',
  sunGlowOuter: '#ff7a2a',
  sunFresnel: '#ffb347',
  // Accents
  orbit: '#e9c27a',
  belt: '#c9a46a',
};

export const STAR_COLORS = ['#ffffff', '#ffffff', '#d6e2ff', '#bfcfff', '#ffe9c4', '#ffd6a0'];

/* -------------------------------------------------------------------------- */
/*  Scene layout                                                              */
/* -------------------------------------------------------------------------- */

export const GALAXY = {
  count: { high: 30000, low: 10000 },
  branches: 5,
  radius: 60,
  spin: 1.15, // how tightly the arms wind
  randomness: 0.3,
  randomnessPower: 2.6,
  thickness: 0.16,
  position: [0, 0, 0],
  rotation: [0.95, 0, 0.35],
  rotationSpeed: 0.09, // rad/s at the core once spinning
  portraitScale: 0.62,
};

export const SOLAR = {
  position: [0, 0, -420],
  tiltDeg: 12,
  sunRadius: 5,
};

export const CAMERA = {
  baseFov: 60,
  warpFov: 78,
  portraitFovBoost: 8,
  start: { pos: [0, 34, 165], look: [0, 0, 0] },
  cruise: { pos: [0, 26, 128] },
  // Where the warp ends, measured back from the sun along +Z.
  arrivalDistance: 72,
  arrivalHeight: 12,
  // Final landing viewing angle, relative to the sun. The distance is then
  // auto-fitted every frame so the WHOLE system fills `heroBox` (all planets visible).
  hero: { offset: [0, 68, 70], look: [0, -2, 0] },
  // Screen area (NDC: -1…1, y up) the system is fitted into. The hero is centred,
  // so the system is centred behind it and nearly fills the screen.
  // Values slightly above 1 let the outer orbits brush the screen edges, so the
  // system covers the whole viewport.
  heroBox: {
    wide: { cx: 0, cy: -0.02, hx: 1.04, hy: 1.02 }, // desktop
    square: { cx: 0, cy: -0.02, hx: 1.04, hy: 1.02 }, // 4:3 / tablets landscape
    portrait: { cx: 0, cy: 0, hx: 1.04, hy: 1.02 }, // phones
  },
  // The "Explore the system" section: the system grows past the screen edges
  // (blended in by scroll position).
  exploreBox: {
    // Every orbit (and planet) fits on screen, clear of the navbar at the top.
    // On desktop (≥1000px) cx < 0 slides the system left so the glass
    // "Explore Departments" panel on the right never covers a planet.
    wide: { cx: -0.2, cy: -0.07, hx: 0.97, hy: 0.84 },
    square: { cx: -0.2, cy: -0.07, hx: 0.97, hy: 0.84 },
    portrait: { cx: 0, cy: -0.06, hx: 0.98, hy: 0.82 },
  },
  // Portrait screens roll the landing view so the orbits run lengthwise.
  portraitRoll: Math.PI / 2 - 0.25,
  // Drag-to-orbit limits / feel.
  drag: { yawSpeed: 3.2, pitchSpeed: 1.6, pitchMin: -0.35, pitchMax: 0.45, damping: 3.5 },
  // Scrolling the page turns the system by up to this many radians.
  scrollYaw: 0.5,
  // Scrolling through the explore section circles the camera by this much (radians).
  exploreYaw: 1.5,
  parallax: 3,
  idleDrift: 1.4,
};

export const WARP = {
  streaks: { high: 1400, low: 600 },
  tubeRadius: [3, 34],
  depth: 240,
  length: 42,
  travelSpeed: 520,
  goldChance: 0.04,
};

export const NEBULA = {
  count: { high: 9, low: 6 },
  depth: 280,
  opacity: [0.05, 0.15],
};

export const SKY_STARS = { high: 4200, low: 2200 };

// Background detail layers behind the solar system.
export const BACKGROUND = {
  milkyWay: { high: 14000, low: 6000 },
  galaxies: 4,
  flareStars: { high: 14, low: 8 },
  shootingEvery: [3.5, 8], // seconds between random shooting stars on the landing page
};
export const BELT = { high: 1800, low: 900, inner: 22.6, width: 1.6 };

/* -------------------------------------------------------------------------- */
/*  Planets (art-directed, not to scale)                                      */
/* -------------------------------------------------------------------------- */

export const PLANET_SCALE = 1.5;

/**
 * Motion uses the planets' REAL periods, scaled so Earth orbits once every
 * ~2 minutes (EARTH_ORBIT_SPEED) and spins at EARTH_SPIN. Everything else keeps
 * its true ratio to Earth: Mercury laps in ~30s, Neptune barely moves; Venus and
 * Uranus spin backwards.
 */
export const EARTH_ORBIT_SPEED = 0.05; // rad/s
export const EARTH_SPIN = 0.35; // rad/s
// Scrolling through the explore section advances time by this many Earth orbits.
export const SCROLL_EARTH_ORBITS = 1.25;
export const ORBIT_SCALE = 1;

/**
 * type: 'rocky' | 'gas' | 'earth'
 * colors: [primary, secondary, accent]
 * angle: starting position on the orbit (radians)
 * speed: orbital speed (rad/s) — spin: axial rotation (rad/s) — tilt: axial tilt (rad)
 */
export const PLANETS = [
  {
    name: 'Mercury',
    type: 'rocky', radius: 0.55, orbit: 9, angle: 0.3, orbitDays: 87.97, dayLength: 58.65, tilt: 0.03,
    colors: ['#8f8079', '#5d524d', '#cdb9a5'], atmosphere: '#d8c7b8', seed: 1.3,
  },
  {
    name: 'Venus',
    type: 'gas', bands: 5, radius: 0.95, orbit: 12.5, angle: 2.1, orbitDays: 224.7, dayLength: -243, tilt: 0.05,
    colors: ['#efcf98', '#d19a5c', '#f8e6c2'], atmosphere: '#ffd9a0', seed: 2.7,
  },
  {
    name: 'Earth',
    type: 'earth', radius: 1.0, orbit: 16.5, angle: 4.0, orbitDays: 365.25, dayLength: 0.997, tilt: 0.41,
    colors: ['#2c6cb8', '#5e9a48', '#e9dcae'], atmosphere: '#7cc0ff', seed: 4.1,
  },
  {
    name: 'Mars',
    type: 'rocky', radius: 0.7, orbit: 20.5, angle: 1.0, orbitDays: 686.98, dayLength: 1.026, tilt: 0.44,
    colors: ['#c4572f', '#8a3820', '#eaa173'], atmosphere: '#ff9a6a', seed: 5.9,
  },
  {
    name: 'Jupiter',
    type: 'gas', bands: 14, spot: 1, spotColor: '#b4513a', radius: 2.6, orbit: 29, angle: 2.8, orbitDays: 4332.6, dayLength: 0.414, tilt: 0.05,
    colors: ['#dcb88e', '#a06a45', '#f4e5ca'], atmosphere: '#f3d2a5', seed: 7.3,
  },
  {
    name: 'Saturn',
    type: 'gas', bands: 12, radius: 2.2, orbit: 37.5, angle: 5.3, orbitDays: 10759.2, dayLength: 0.444, tilt: 0.47,
    colors: ['#e9d4a1', '#c39f63', '#f7edd2'], atmosphere: '#f7e2b0', seed: 8.8,
    ring: { inner: 1.35, outer: 2.35, colors: ['#ecd7a6', '#a88a5a'], opacity: 0.9 },
  },
  {
    name: 'Uranus',
    type: 'gas', bands: 4, radius: 1.5, orbit: 44.5, angle: 0.55, orbitDays: 30688.5, dayLength: -0.718, tilt: 1.7,
    colors: ['#a3dde0', '#7cc2c9', '#d9f3f1'], atmosphere: '#bff4ff', seed: 10.2,
    ring: { inner: 1.55, outer: 1.9, colors: ['#cfeff2', '#7fa7b0'], opacity: 0.45 },
  },
  {
    name: 'Neptune',
    type: 'gas', bands: 6, spot: 0.7, spotColor: '#1d2a6e', radius: 1.45, orbit: 51, angle: 3.7, orbitDays: 60182, dayLength: 0.671, tilt: 0.49,
    colors: ['#3e63d4', '#283f9c', '#86a8f2'], atmosphere: '#7aa2ff', seed: 11.6,
  },
];

/**
 * Moons orbit their parent planet. Same fields and look as planets, plus:
 * parent (planet name), distance (orbit radius around the parent, world units),
 * inclination (orbit tilt, rad). The Moon is tidally locked (dayLength = orbitDays).
 */
export const MOONS = [
  {
    name: 'Moon', parent: 'Earth',
    type: 'rocky', radius: 0.27, distance: 3.1, inclination: 0.09, angle: 1.2, orbitDays: 27.32, dayLength: 27.32, tilt: 0.03,
    colors: ['#bdb8ae', '#7d786f', '#e6e1d6'], atmosphere: '#d9d6cf', seed: 13.4,
  },
];

/**
 * Space stations: their own heliocentric orbit, interactive like the planets.
 * radius: hit / focus size (world units, before PLANET_SCALE) · size: habitat-ring radius.
 * colors: [hull, solar panels, gold accents].
 */
export const STATIONS = [
  {
    name: 'Space Station', key: 'station',
    type: 'station', radius: 0.85, size: 0.78, orbit: 25.8, angle: 3.6, orbitDays: 1200, dayLength: 1, tilt: 0,
    colors: ['#d8d0bf', '#1b2552', '#e9c27a'], atmosphere: '#e9c27a', seed: 14.2,
  },
];

// Derive angular speeds from the real periods (same ratios as the real solar system),
// and attach each body's department: `track` = department name, `blurb` = its tagline.
for (const p of [...PLANETS, ...MOONS, ...STATIONS]) {
  p.speed = (EARTH_ORBIT_SPEED * 365.25) / p.orbitDays;
  p.spin = EARTH_SPIN / p.dayLength;
  p.key = p.key ?? p.name.toLowerCase();
  p.department = DEPARTMENTS[p.key];
  p.track = p.department.name;
  p.blurb = p.department.tagline;
}

/** The sun as a page body (CUBYC — the host campus and hub of every department). */
export const SUN_BODY = {
  name: 'Sun',
  key: 'sun',
  type: 'sun',
  department: DEPARTMENTS.sun,
  track: DEPARTMENTS.sun.name,
  blurb: DEPARTMENTS.sun.tagline,
  colors: [PALETTE.sunMid, PALETTE.sunEdge, PALETTE.sunCore],
  atmosphere: PALETTE.sunGlowInner,
  seed: 0.7,
};

/** Every interactive body, indexed the way focus / hover ids are: planets 0–7, then moons, then stations. */
export const BODIES = [
  ...PLANETS.map((p) => ({ ...p, kind: 'planet' })),
  ...MOONS.map((m) => ({ ...m, kind: 'moon' })),
  ...STATIONS.map((s) => ({ ...s, kind: 'station' })),
];
/** Tour order for ← / →: outward by orbit (stations included); each moon follows its parent planet. */
export const TOUR = BODIES.map((b, i) => [b, i])
  .filter(([b]) => b.kind !== 'moon')
  .sort(([a], [b]) => a.orbit - b.orbit)
  .flatMap(([b, i]) => [i, ...BODIES.map((m, j) => (m.kind === 'moon' && m.parent === b.name ? j : -1)).filter((j) => j >= 0)]);

/** Department key ('sun', 'earth', 'moon', …) → the body's data. */
export const BODY_BY_KEY = Object.fromEntries([['sun', SUN_BODY], ...BODIES.map((b) => [b.key, b])]);
/** Department key → focus id used by the landing scene (planet / moon index, or 'sun'). */
export const focusIdOf = (key) => (key === 'sun' ? 'sun' : BODIES.findIndex((b) => b.key === key));
/** Focus id → department key. */
export const keyOfFocus = (focus) => (focus === 'sun' ? 'sun' : typeof focus === 'number' ? BODIES[focus]?.key ?? null : null);

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** 'low' on phones and low-core devices: fewer particles, cheaper glass, lower DPR. */
export function detectQuality() {
  if (typeof window === 'undefined') return 'high';
  const small = Math.min(window.innerWidth, window.innerHeight) < 600 || window.innerWidth < 768;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
  return small || weak ? 'low' : 'high';
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Small deterministic PRNG so procedural layouts are stable between renders. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
