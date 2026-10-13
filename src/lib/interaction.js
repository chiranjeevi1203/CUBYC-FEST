/**
 * Shared, non-reactive interaction state between the WebGL scene and the DOM
 * overlays (tooltip, hint). Written every frame, so it deliberately lives
 * outside React. The focused planet — which drives UI — lives in the zustand store.
 */
export const interaction = {
  // Pointer in NDC (-1…1, y up) and whether it is over the window.
  ndc: { x: 0, y: 0 },
  inside: false,
  // Index of the hovered body: 0…7 planets, 'sun', or -1.
  hover: -1,
  // Drag-to-orbit offsets (radians) with inertia.
  dragging: false,
  yaw: 0,
  pitch: 0,
  vyaw: 0,
  vpitch: 0,
  // 0…1 scroll progress through the page (slowly turns the system).
  scroll: 0,
  // 0…1 how much the "Explore the system" section fills the viewport (zooms the system in).
  section: 0,
  // 1 → the solar system is shown; fades to 0 once the explore section scrolls away
  // (later sections keep only the starry backdrop).
  systemFade: 1,
  // 0…1 scroll progress THROUGH the (tall) explore section — revolves the system.
  orbitScroll: 0,
  // Registered scene bodies: { group: THREE.Object3D, radius } — set by SolarSystem.
  bodies: [],
  sun: null,
  // Screen-space shooting-star requests (NDC), consumed by BackgroundDetails.
  spawns: [],
  // DOM nodes the scene writes to directly.
  tooltipEl: null,
  hasInteracted: false,
};

/** Elements that should keep normal clicks / text selection (no drag-to-orbit). */
export const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, label, summary, [role="button"], [data-no-orbit], .glass, .nav-bar, .moon-timer, .explore-panel, .explore-pill';
