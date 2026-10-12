import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMERA, ORBIT_SCALE, PLANETS, PLANET_SCALE, SOLAR, prefersReducedMotion } from '../../config/experience';
import { getScene, useExperience } from '../../store/useExperience';
import { interaction } from '../../lib/interaction';

const FIT_SAMPLES = 32;
const UP = new THREE.Vector3(0, 1, 0);

/** Screen area (NDC) the landing composition should fill for this viewport. */
function layoutKey(width, height) {
  if (width < height) return 'portrait';
  return width / height >= 1.5 ? 'wide' : 'square';
}

/** Hero framing, blended toward the bigger "explore" framing as that section scrolls in. */
function heroBox(width, height, t, out) {
  const key = layoutKey(width, height);
  const a = CAMERA.heroBox[key];
  const b = CAMERA.exploreBox[key];
  // The right-hand panel only exists on desktop; smaller screens keep the system centred.
  const bcx = width >= 1000 ? b.cx : 0;
  out.cx = a.cx + (bcx - a.cx) * t;
  out.cy = a.cy + (b.cy - a.cy) * t;
  out.hx = a.hx + (b.hx - a.hx) * t;
  out.hy = a.hy + (b.hy - a.hy) * t;
  return out;
}

/**
 * Every place a planet can be: each planet's orbit padded by that planet's own
 * size (and ring), above and below the plane, in world space — matching
 * SolarSystem's position and ecliptic tilt.
 */
function buildFitPoints() {
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08, 0, THREE.MathUtils.degToRad(-SOLAR.tiltDeg)));
  const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...SOLAR.position), tilt, new THREE.Vector3(1, 1, 1));
  const points = [];
  for (const planet of PLANETS) {
    const extent = planet.radius * PLANET_SCALE * (planet.ring ? planet.ring.outer : 1.15);
    const R = planet.orbit * ORBIT_SCALE + extent;
    for (let i = 0; i < FIT_SAMPLES; i++) {
      const a = (i / FIT_SAMPLES) * Math.PI * 2;
      for (const y of [-extent, extent]) {
        points.push(new THREE.Vector3(Math.cos(a) * R, y, -Math.sin(a) * R).applyMatrix4(matrix));
      }
    }
  }
  return points;
}

/**
 * First-person camera. Position, look target, FOV and bank come from the GSAP
 * master timeline (scene.cam). On the landing page this rig layers on:
 * auto-framing (system covers the viewport), drag-to-orbit with inertia,
 * scroll rotation, fly-to-planet focus, idle drift and pointer parallax.
 */
export default function CameraRig() {
  const { camera, size } = useThree();
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const probe = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const focusTarget = useMemo(() => new THREE.Vector3(), []);
  const focusPos = useMemo(() => new THREE.Vector3(), []);
  // Damped copies of the focus pose → planet-to-planet hops glide instead of cutting.
  const focusPosS = useMemo(() => new THREE.Vector3(), []);
  const focusLookS = useMemo(() => new THREE.Vector3(), []);
  const fitPoints = useMemo(buildFitPoints, []);
  const fit = useRef({ m: 1, ox: 0, oy: 0, primed: false });
  const focusWeight = useRef(0);
  const sectionWeight = useRef(0);
  const exploreTurn = useRef(0);
  const boxRef = useRef({ cx: 0, cy: 0, hx: 1, hy: 1 });
  const pointer = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine || prefersReducedMotion()) return undefined;
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onLeave = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  useEffect(() => {
    fit.current.primed = false;
  }, [size.width, size.height]);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const s = getScene();
    const c = s.cam;
    const t = clock.elapsedTime;
    const portrait = size.width < size.height;
    const fov = c.fov + (portrait ? CAMERA.portraitFovBoost : 0);
    const roll = portrait ? CAMERA.portraitRoll * c.fit : 0;

    // Pointer parallax (only once the landing is live — s.parallax gates it).
    const k = 1 - Math.exp(-delta * 2.5);
    smooth.current.x += (pointer.current.x - smooth.current.x) * k;
    smooth.current.y += (pointer.current.y - smooth.current.y) * k;
    s.pointer.x = smooth.current.x * s.parallax;
    s.pointer.y = smooth.current.y * s.parallax;

    look.set(c.lx, c.ly, c.lz);
    const f = fit.current;

    /* ---------- 1. Auto-fit: the whole system covers the viewport ---------- */
    if (c.fit > 0.001) {
      pos.set(c.px, c.py, c.pz).sub(look).multiplyScalar(f.m).add(look);
      camera.position.copy(pos);
      camera.lookAt(look);
      if (roll) camera.rotateZ(roll);
      camera.fov = fov;
      if (camera.view?.enabled) camera.clearViewOffset();
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const p of fitPoints) {
        probe.copy(p).project(camera);
        minX = Math.min(minX, probe.x);
        maxX = Math.max(maxX, probe.x);
        minY = Math.min(minY, probe.y);
        maxY = Math.max(maxY, probe.y);
      }
      // Ease toward the section's zoom so scroll jitter never pumps the framing.
      sectionWeight.current += (interaction.section - sectionWeight.current) * (1 - Math.exp(-delta * 4));
      const box = heroBox(size.width, size.height, THREE.MathUtils.smoothstep(sectionWeight.current, 0, 1), boxRef.current);
      const scale = Math.max((maxX - minX) / 2 / box.hx, (maxY - minY) / 2 / box.hy);
      const blend = f.primed ? 1 - Math.exp(-delta * 6) : 1;
      if (Number.isFinite(scale) && scale > 0) {
        f.m = THREE.MathUtils.clamp(f.m * Math.pow(scale, blend), 0.3, 5);
        f.ox += (box.cx - (maxX + minX) / 2 / scale - f.ox) * blend;
        f.oy += (box.cy - (maxY + minY) / 2 / scale - f.oy) * blend;
        f.primed = true;
      }
    }

    pos.set(c.px, c.py, c.pz).sub(look).multiplyScalar(THREE.MathUtils.lerp(1, f.m, c.fit)).add(look);

    /* ---------- 2. Drag-to-orbit (with inertia) + scroll rotation ---------- */
    const live = s.parallax;
    if (!interaction.dragging) {
      // Back in the hero: ease any drag rotation home so its composition is preserved.
      if (interaction.section < 0.4) {
        const home = Math.exp(-delta * 1.6);
        interaction.yaw *= home;
        interaction.pitch *= home;
        interaction.vyaw *= home;
        interaction.vpitch *= home;
      }
      interaction.yaw += interaction.vyaw * delta;
      interaction.pitch += interaction.vpitch * delta;
      const damp = Math.exp(-CAMERA.drag.damping * delta);
      interaction.vyaw *= damp;
      interaction.vpitch *= damp;
    }
    interaction.pitch = THREE.MathUtils.clamp(interaction.pitch, CAMERA.drag.pitchMin, CAMERA.drag.pitchMax);
    // Scrolling through the explore section slowly circles the camera around the system.
    exploreTurn.current += (interaction.orbitScroll - exploreTurn.current) * (1 - Math.exp(-delta * 3));
    const turn = THREE.MathUtils.smoothstep(exploreTurn.current, 0, 1) * CAMERA.exploreYaw;
    const yaw = (interaction.yaw + interaction.scroll * CAMERA.scrollYaw + turn) * live;
    const pitch = interaction.pitch * live;
    if (yaw || pitch) {
      offset.copy(pos).sub(look);
      offset.applyAxisAngle(UP, yaw);
      right.crossVectors(offset, UP).normalize();
      // Keep the camera above the ecliptic: pitch moves it up / down over the system.
      offset.applyAxisAngle(right, -pitch);
      pos.copy(look).add(offset);
    }

    /* ---------- 3. Fly-to focus on a planet / the sun ---------- */
    const focus = useExperience.getState().focus;
    let body = null;
    if (typeof focus === 'number') body = interaction.bodies[focus];
    else if (focus === 'sun') body = interaction.sun;
    if (body?.group) {
      body.group.getWorldPosition(focusTarget);
      const radius = body.radius * body.group.scale.x;
      offset.copy(pos).sub(look).normalize();
      focusPos.copy(focusTarget).addScaledVector(offset, radius * (focus === 'sun' ? 6 : 9) + 6);
      focusPos.y += radius * 1.5;
    }
    const wantFocus = body?.group ? 1 : 0;
    if (wantFocus) {
      if (focusWeight.current < 0.01) {
        // Fresh focus from the overview: start the damped pose on target.
        focusPosS.copy(focusPos);
        focusLookS.copy(focusTarget);
      } else {
        const glide = 1 - Math.exp(-delta * 2.2);
        focusPosS.lerp(focusPos, glide);
        focusLookS.lerp(focusTarget, glide * 1.4 > 1 ? 1 : glide * 1.4);
      }
    }
    focusWeight.current += (wantFocus - focusWeight.current) * (1 - Math.exp(-delta * 2.4));
    const fw = THREE.MathUtils.smoothstep(focusWeight.current, 0, 1);
    if (fw > 0.0005) {
      pos.lerp(focusPosS, fw);
      look.lerp(focusLookS, fw);
    }

    /* ---------- 4. Idle drift ---------- */
    pos.x += Math.sin(t * 0.13) * CAMERA.idleDrift * live;
    pos.y += Math.sin(t * 0.17 + 1.2) * CAMERA.idleDrift * 0.6 * live;

    camera.position.copy(pos);
    camera.lookAt(look);
    if (roll) camera.rotateZ(roll * (1 - fw));

    if (c.bank > 0.001) {
      camera.rotateZ(c.bank * (Math.sin(t * 1.7) * 0.035 + Math.sin(t * 3.1 + 1.3) * 0.018));
    }

    camera.translateX(s.pointer.x * CAMERA.parallax * (1 - fw * 0.7));
    camera.translateY(s.pointer.y * CAMERA.parallax * 0.6 * (1 - fw * 0.7));

    camera.fov = fov;
    const ox = f.ox * c.fit * (1 - fw);
    const oy = f.oy * c.fit * (1 - fw);
    if (Math.abs(ox) + Math.abs(oy) > 1e-4) {
      camera.setViewOffset(size.width, size.height, (-ox * size.width) / 2, (oy * size.height) / 2, size.width, size.height);
    } else {
      if (camera.view?.enabled) camera.clearViewOffset();
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
