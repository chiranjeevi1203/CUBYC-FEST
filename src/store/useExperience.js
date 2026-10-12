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
    cam: { px, py, pz, lx, ly, lz, fov: CAMERA.baseFov, bank: 0, fit: 0 },
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

  setPhase: (phase) => set((state) => (state.phase === phase ? state : { phase })),
  setFocus: (focus) => set((state) => (state.focus === focus ? state : { focus })),
  setCanvasReady: () => set({ canvasReady: true }),
  finishLoader: () => set({ hudMounted: false, phase: PHASES.LANDING_IDLE }),
}));

/** Convenience accessor for the mutable scene state. */
export const getScene = () => useExperience.getState().scene;
