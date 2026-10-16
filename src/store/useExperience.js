import { create } from 'zustand';
import { CAMERA, PLANETS, detectQuality } from '../config/experience';

export const PHASES = {
  GALAXY: 'GALAXY',
  WARP: 'WARP',
  ARRIVAL: 'ARRIVAL',
  LANDING_IDLE: 'LANDING_IDLE',
};

/**
 * Plain mutable values written by the GSAP master timeline and read inside
 * useFrame. Never stored reactively, so nothing re-renders per frame.
 */
export function createSceneState() {
  const [px, py, pz] = CAMERA.start.pos;
  const [lx, ly, lz] = CAMERA.start.look;
  return {
    stars: 0,
    nebula: 0,
    speed: 0, // 0…1 warp velocity → streak length / opacity
    sun: 0,
    orbits: 0,
    parallax: 0, // enabled once the landing page is live
    pointer: { x: 0, y: 0 }, // smoothed pointer, written by CameraRig
    galaxy: { opacity: 0, assembly: 0, flash: 0, spin: 0 },
    planets: PLANETS.map(() => ({ v: 0 })),
    cam: { px, py, pz, lx, ly, lz, fov: CAMERA.galaxyFov, bank: 0, fit: 0 },
  };
}

/** Restore a scene object in place so every component keeps the same reference. */
export function resetSceneState(scene) {
  const fresh = createSceneState();
  Object.assign(scene, fresh);
  return scene;
}

export const useExperience = create((set) => ({
  phase: PHASES.GALAXY,
  canvasReady: false,
  hudMounted: true,
  quality: detectQuality(),
  // Stable mutable object — read with useExperience.getState().scene, never subscribed to.
  scene: createSceneState(),

  // Focused body for the fly-to + info card: 0…7 (planet index), 'sun', or null.
  focus: null,

  // Department pages (see lib/deptRoute.js — always change these through navigate()).
  // dept: department key ('sun', 'earth', 'moon', …) or null.
  // deptView: 'orbit' (the world rising as a semicircle) | 'events' (inside the world).
  // deptEvent: selected event slug in the events view.
  dept: null,
  deptView: 'orbit',
  deptEvent: null,
  // true once a full-screen page (a department, the gallery) covers the landing → the main canvas can pause.
  deptCovered: false,
  // The campus gallery page (#/gallery) and the schedule page (#/schedule).
  galleryOpen: false,
  scheduleOpen: false,
  rulesOpen: false,
  aboutOpen: false,
  contactOpen: false,
  sponsorsOpen: false,
  notFound: false,
  eventsOpen: false,
  // The CUBYC Comms chatbot overlay.
  chatOpen: false,

  setPhase: (phase) => set((state) => (state.phase === phase ? state : { phase })),
  setFocus: (focus) => set((state) => (state.focus === focus ? state : { focus })),
  setRoute: ({ dept = null, view = 'orbit', event = null }) => set({ dept, deptView: dept ? view : 'orbit', deptEvent: dept ? event : null }),
  setGalleryOpen: (galleryOpen) => set((state) => (state.galleryOpen === galleryOpen ? state : { galleryOpen })),
  setChatOpen: (chatOpen) => set((state) => (state.chatOpen === chatOpen ? state : { chatOpen })),
  setEventsOpen: (eventsOpen) => set((state) => (state.eventsOpen === eventsOpen ? state : { eventsOpen })),
  setRulesOpen: (rulesOpen) => set((state) => (state.rulesOpen === rulesOpen ? state : { rulesOpen })),
  setAboutOpen: (aboutOpen) => set((state) => (state.aboutOpen === aboutOpen ? state : { aboutOpen })),
  setContactOpen: (contactOpen) => set((state) => (state.contactOpen === contactOpen ? state : { contactOpen })),
  setSponsorsOpen: (sponsorsOpen) => set((state) => (state.sponsorsOpen === sponsorsOpen ? state : { sponsorsOpen })),
  setNotFound: (notFound) => set((state) => (state.notFound === notFound ? state : { notFound })),
  setScheduleOpen: (scheduleOpen) => set((state) => (state.scheduleOpen === scheduleOpen ? state : { scheduleOpen })),
  setDeptCovered: (deptCovered) => set((state) => (state.deptCovered === deptCovered ? state : { deptCovered })),
  setCanvasReady: () => set({ canvasReady: true }),
  finishLoader: () => set({ hudMounted: false, phase: PHASES.LANDING_IDLE }),
}));

/** Convenience accessor for the mutable scene state. */
export const getScene = () => useExperience.getState().scene;
