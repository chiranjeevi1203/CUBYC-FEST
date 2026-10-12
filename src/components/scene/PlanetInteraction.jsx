import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BODIES, BRAND, CAMERA, TOUR } from '../../config/experience';
import { PHASES, getScene, useExperience } from '../../store/useExperience';
import { INTERACTIVE_SELECTOR, interaction } from '../../lib/interaction';

const CLICK_MOVE_PX = 6;
const CLICK_MS = 650;

/** Is the landing page live (interactions only make sense after the loader)? */
const isLive = () => useExperience.getState().phase === PHASES.LANDING_IDLE;
/**
 * Planets / sun only respond inside the "Explore" section. In the hero the
 * system is pure backdrop: no hover, drag or click.
 */
const canInteract = () => isLive() && interaction.section > 0.6;

/**
 * Pointer controller for the background scene:
 * Active only inside the "Explore" section (see canInteract):
 *  - drag empty space to orbit the system (with inertia),
 *  - hover a planet / the sun for a label + highlight,
 *  - click a body to fly to it (info card), click empty space for a shooting star.
 * Listens on window because the canvas sits behind the page.
 */
export default function PlanetInteraction() {
  const { camera, size } = useThree();
  const world = useMemo(() => new THREE.Vector3(), []);
  const edge = useMemo(() => new THREE.Vector3(), []);
  const camRight = useMemo(() => new THREE.Vector3(), []);
  const lastHover = useRef(-2);
  const press = useRef(null);
  const tipPos = useRef({ x: 0, y: 0 });
  const sizeRef = useRef(size);
  sizeRef.current = size;

  /**
   * Screen-space hit test at the current pointer: returns the nearest body under
   * it (planet index, 'sun' or -1) and stores its label position. Used every
   * frame for hover AND synchronously on click, so a click never depends on
   * whether a frame happened to render since the pointer arrived.
   */
  const pick = useRef(null);
  pick.current = () => {
    const { width, height } = sizeRef.current;
    let best = -1;
    let bestDist = Infinity;
    camera.updateMatrixWorld();
    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    const px = ((interaction.ndc.x + 1) / 2) * width;
    const py = ((1 - interaction.ndc.y) / 2) * height;
    const test = (body, id) => {
      if (!body?.group || !body.group.visible) return;
      body.group.getWorldPosition(world);
      const r = body.radius * body.group.scale.x;
      edge.copy(world).addScaledVector(camRight, r);
      world.project(camera);
      edge.project(camera);
      if (world.z > 1) return; // behind the camera
      const sx = ((world.x + 1) / 2) * width;
      const sy = ((1 - world.y) / 2) * height;
      const rPx = Math.hypot(((edge.x - world.x) / 2) * width, ((edge.y - world.y) / 2) * height);
      const d = Math.hypot(px - sx, py - sy);
      // Generous hit area so small, moving worlds are still easy to catch.
      if (d < rPx * 1.15 + 18 && d < bestDist) {
        bestDist = d;
        best = id;
        tipPos.current.x = sx;
        tipPos.current.y = sy - rPx;
      }
    };
    interaction.bodies.forEach((b, i) => test(b, i));
    test(interaction.sun, 'sun');
    return best;
  };

  useEffect(() => {
    const root = document.documentElement;

    const toNdc = (e) => {
      interaction.ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
      interaction.ndc.y = -((e.clientY / window.innerHeight) * 2 - 1);
      interaction.inside = true;
    };

    const onDown = (e) => {
      if (!canInteract() || e.button > 0) return;
      if (e.target instanceof Element && e.target.closest(INTERACTIVE_SELECTOR)) return;
      toNdc(e);
      // e.timeStamp (not "now") so a janky frame between down and up can't eat the click.
      press.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, lastX: e.clientX, lastY: e.clientY, lastT: performance.now(), moved: false };
      // Mouse / pen drag orbits anywhere. Touch keeps native scrolling, except inside
      // [data-orbit-touch] (touch-action: pan-y) where sideways swipes orbit.
      const touchOrbit = e.pointerType === 'touch' && e.target instanceof Element && e.target.closest('[data-orbit-touch]');
      if (e.pointerType !== 'touch' || touchOrbit) {
        interaction.dragging = true;
        interaction.vyaw = 0;
        interaction.vpitch = 0;
        root.classList.add('is-orbiting');
      }
    };

    const onMove = (e) => {
      toNdc(e);
      const p = press.current;
      if (!p) return;
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > CLICK_MOVE_PX) p.moved = true;
      if (!interaction.dragging) return;
      const now = performance.now();
      const dt = Math.max((now - p.lastT) / 1000, 1 / 240);
      const dx = (e.clientX - p.lastX) / window.innerWidth;
      const dy = (e.clientY - p.lastY) / window.innerHeight;
      const dYaw = -dx * CAMERA.drag.yawSpeed;
      const dPitch = dy * CAMERA.drag.pitchSpeed;
      interaction.yaw += dYaw;
      interaction.pitch += dPitch;
      // Velocity for the release fling (lightly smoothed).
      interaction.vyaw = interaction.vyaw * 0.6 + (dYaw / dt) * 0.4;
      interaction.vpitch = interaction.vpitch * 0.6 + (dPitch / dt) * 0.4;
      p.lastX = e.clientX;
      p.lastY = e.clientY;
      p.lastT = now;
      if (p.moved) interaction.hasInteracted = true;
    };

    const onUp = (e) => {
      const p = press.current;
      press.current = null;
      if (interaction.dragging) {
        interaction.dragging = false;
        root.classList.remove('is-orbiting');
        // A held-still release shouldn't fling.
        if (performance.now() - (p?.lastT ?? 0) > 80) {
          interaction.vyaw = 0;
          interaction.vpitch = 0;
        }
      }
      if (!p || p.moved || e.timeStamp - p.t > CLICK_MS || !canInteract()) return;

      // A click / tap.
      toNdc(e);
      const { setFocus, focus } = useExperience.getState();
      const hit = pick.current();
      interaction.hasInteracted = true;
      if (hit !== -1) {
        setFocus(hit);
      } else if (focus !== null) {
        setFocus(null);
      } else {
        interaction.spawns.push({ x: interaction.ndc.x, y: interaction.ndc.y });
      }
    };

    const onLeave = () => {
      interaction.inside = false;
    };
    const onBlur = () => {
      press.current = null;
      interaction.dragging = false;
      root.classList.remove('is-orbiting');
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onBlur);
    window.addEventListener('blur', onBlur);
    root.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onBlur);
      window.removeEventListener('blur', onBlur);
      root.removeEventListener('pointerleave', onLeave);
      root.classList.remove('is-orbiting', 'planet-hover');
    };
  }, []);

  // Keyboard: Esc closes focus, arrows step through the planets.
  useEffect(() => {
    const onKey = (e) => {
      const { focus, setFocus } = useExperience.getState();
      if (focus === null || !isLive()) return;
      if (e.key === 'Escape') setFocus(null);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        // Tour order keeps each moon right after its planet.
        const step = e.key === 'ArrowRight' ? 1 : -1;
        const at = typeof focus === 'number' ? TOUR.indexOf(focus) : -1;
        setFocus(TOUR[(at + step + TOUR.length) % TOUR.length]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useFrame(() => {
    // While a button is held, keep the current hover so a click still knows what it pressed.
    if (interaction.dragging) return;
    const live = canInteract() && getScene().parallax > 0.3;
    const tip = interaction.tooltipEl;
    const best = live && interaction.inside ? pick.current() : -1;
    const tipX = tipPos.current.x;
    const tipY = tipPos.current.y;

    interaction.hover = best;
    if (best !== lastHover.current) {
      lastHover.current = best;
      document.documentElement.classList.toggle('planet-hover', best !== -1);
      if (tip) {
        if (best === -1) {
          tip.dataset.visible = 'false';
        } else {
          const name = best === 'sun' ? 'The Sun' : BODIES[best].name;
          const track = best === 'sun' ? BRAND.title : BODIES[best].track;
          tip.querySelector('[data-name]').textContent = name;
          tip.querySelector('[data-track]').textContent = track;
          tip.dataset.visible = 'true';
        }
      }
    }
    if (tip && best !== -1) {
      tip.style.transform = `translate3d(${tipX}px, ${tipY - 14}px, 0) translate(-50%, -100%)`;
    }
  });

  return null;
}
