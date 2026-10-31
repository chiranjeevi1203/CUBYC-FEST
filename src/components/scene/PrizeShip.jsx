import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { ALL_EVENTS } from '../../config/allEvents';
import { hullShader, panelShader } from '../../lib/stationShaders';
import { useShaderMaterial } from '../../lib/useShaderMaterial';
import { INTERACTIVE_SELECTOR, interaction } from '../../lib/interaction';
import { PHASES, getScene, useExperience } from '../../store/useExperience';

/*
 * A small freighter that roams the empty space around the solar system carrying
 * the prize pool: a gold cargo pod slung under an ivory hull, two main engines
 * and two strap-on boosters with soft exhaust, and a faint trail along its path.
 * A quiet "₹10L+ Prize Pool" tag rides with it; hovering the ship eases it to a
 * crawl, lifts its glow and opens the tag.
 *
 * Lives inside the system's tilted ecliptic group, so it fades with the system
 * and is lit by the same sun.
 */

const SCALE = 2.75; // world units per model unit (model is ~1.5 long)
const TRAIL_POINTS = 54;
const TRAIL_STEP = 0.11; // seconds between trail samples

/**
 * The wandering path (ecliptic-local), at time t: a slow loop through the empty
 * space beyond Neptune's orbit, lifted off the orbital plane, drifting in and out.
 */
function pathAt(t, out) {
  const a = 1.1 + t * 0.036;
  // An ellipse: tighter along the axis that runs up/down the landing view, wider to the sides.
  const u = a - 1.885;
  const r = (1 / Math.hypot(Math.cos(u) / 55, Math.sin(u) / 64)) * (1 + 0.035 * Math.sin(t * 0.029 + 0.6) + 0.012 * Math.sin(t * 0.077));
  return out.set(Math.cos(a) * r, 6 + 2.5 * Math.sin(t * 0.05), -Math.sin(a) * r);
}

/** Exhaust: hot near the nozzle, cooling to peach and fading along its length. */
const plumeShader = {
  vertexShader: /* glsl */ `
    uniform float uLen;
    varying float vT;
    void main() {
      vT = clamp(0.5 + position.y / uLen, 0.0, 1.0); // 0 at the nozzle, 1 at the tip
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uPower;
    uniform float uTime;
    varying float vT;
    void main() {
      float flick = 0.86 + 0.14 * sin(uTime * 47.0 + vT * 9.0);
      vec3 col = mix(vec3(1.0, 0.97, 0.9), vec3(1.0, 0.62, 0.36), smoothstep(0.0, 0.55, vT));
      float a = pow(1.0 - vT, 1.7) * uPower * flick;
      gl_FragColor = vec4(col * a, a);
    }
  `,
};

/** Soft round glow on a camera-facing quad. */
const glowShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      float d = length(vUv - 0.5) * 2.0;
      float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2) * uOpacity;
      gl_FragColor = vec4(uColor * a, a);
    }
  `,
};

const ADDITIVE = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

/** Landing page live, with nothing covering it? */
const isLive = () => {
  const s = useExperience.getState();
  return s.phase === PHASES.LANDING_IDLE && !s.dept && !s.galleryOpen && !s.scheduleOpen && !s.rulesOpen && !s.eventsOpen && !s.aboutOpen && !s.contactOpen && !s.sponsorsOpen && !s.notFound && !s.chatOpen;
};

export default function PrizeShip({ sunPos, visibility }) {
  const { camera, size, gl } = useThree();
  const root = useRef(null);
  const ship = useRef(null);
  const tagRef = useRef(null);
  const overUi = useRef(false);
  // t = 78 starts the loop on the left, in open space in both the hero and the explore view.
  const st = useRef({ t: 78, rate: 1, hot: 0, sample: 0, plateW: 0, frame: 0 });

  const reveal = useMemo(() => ({ value: 0 }), []);
  const glow = useMemo(() => ({ value: 0 }), []);
  const hull = useShaderMaterial(
    hullShader,
    useMemo(() => ({ uColor: { value: new THREE.Color('#ece6da') }, uSunPos: { value: sunPos }, uReveal: reveal, uSeams: { value: 0.55 }, uGlow: glow }), [sunPos, reveal, glow]),
    { transparent: true },
  );
  const dark = useShaderMaterial(
    hullShader,
    useMemo(() => ({ uColor: { value: new THREE.Color('#5d6270') }, uSunPos: { value: sunPos }, uReveal: reveal, uSeams: { value: 0.3 }, uGlow: glow }), [sunPos, reveal, glow]),
    { transparent: true },
  );
  const gold = useShaderMaterial(
    hullShader,
    useMemo(() => ({ uColor: { value: new THREE.Color('#e3b467') }, uSunPos: { value: sunPos }, uReveal: reveal, uSeams: { value: 0 }, uGlow: glow }), [sunPos, reveal, glow]),
    { transparent: true },
  );
  const fins = useShaderMaterial(
    panelShader,
    useMemo(() => ({ uColor: { value: new THREE.Color('#1b2347') }, uGold: { value: new THREE.Color('#e9c27a') }, uSunPos: { value: sunPos }, uReveal: reveal }), [sunPos, reveal]),
    { transparent: true, side: THREE.DoubleSide },
  );
  const plumeUniforms = useMemo(() => ({ uPower: { value: 0 }, uTime: { value: 0 }, uLen: { value: 0.62 } }), []);
  const plume = useShaderMaterial(plumeShader, plumeUniforms, ADDITIVE);
  const nozzleUniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#ffd7a3') }, uOpacity: { value: 0 } }), []);
  const nozzle = useShaderMaterial(glowShader, nozzleUniforms, ADDITIVE);
  const haloUniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#e9c27a') }, uOpacity: { value: 0 } }), []);
  const halo = useShaderMaterial(glowShader, haloUniforms, ADDITIVE);
  const navRed = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff6a5c', ...ADDITIVE }), []);
  const navGreen = useMemo(() => new THREE.MeshBasicMaterial({ color: '#6dffb0', ...ADDITIVE }), []);

  // Exhaust trail along the path, fading from the ship back.
  const trail = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(TRAIL_POINTS * 3);
    const col = new Float32Array(TRAIL_POINTS * 3);
    const c = new THREE.Color('#ffcf9a');
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const k = Math.pow(1 - i / (TRAIL_POINTS - 1), 1.8); // 1 at the ship → 0 at the tail
      col.set([c.r * k, c.g * k, c.b * k], i * 3);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.LineBasicMaterial({ vertexColors: true, ...ADDITIVE, opacity: 0, toneMapped: false });
    const line = new THREE.Line(g, m);
    line.frustumCulled = false;
    return line;
  }, []);

  useEffect(
    () => () => {
      trail.geometry.dispose();
      trail.material.dispose();
      navRed.dispose();
      navGreen.dispose();
    },
    [trail, navRed, navGreen],
  );

  // The tag: a DOM label that follows the ship (crisper than text in WebGL).
  useEffect(() => {
    const host = gl.domElement.parentElement;
    const el = document.createElement('div');
    el.className = 'prize-tag';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<span class="prize-tag__plate"><span class="prize-tag__amt">₹10L+</span><span class="prize-tag__label">Prize pool</span>' +
      `<span class="prize-tag__more">Across all ${ALL_EVENTS.length} events</span></span><span class="prize-tag__stem"></span>`;
    host.appendChild(el);
    tagRef.current = el;
    const onMove = (e) => {
      overUi.current = e.target instanceof Element && !!e.target.closest(INTERACTIVE_SELECTOR);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      el.remove();
    };
  }, [gl]);

  const v = useMemo(
    () => ({ pos: new THREE.Vector3(), ahead: new THREE.Vector3(), world: new THREE.Vector3(), edge: new THREE.Vector3(), right: new THREE.Vector3(), trail: [] }),
    [],
  );

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const s = st.current;
    const vis = Math.min(Math.max(visibility(), 0), 1);
    reveal.value = vis;
    const g = root.current;
    g.visible = vis > 0.002;
    trail.visible = g.visible;
    const tag = tagRef.current;

    // Hovered? Same screen-space test the planets use, on the ship's projected size.
    let hit = false;
    let sx = 0;
    let sy = 0;
    if (g.visible) {
      ship.current.getWorldPosition(v.world);
      camera.updateMatrixWorld();
      v.right.setFromMatrixColumn(camera.matrixWorld, 0);
      v.edge.copy(v.world).addScaledVector(v.right, 0.9 * SCALE);
      v.world.project(camera);
      v.edge.project(camera);
      // In front of the camera and on screen (the loop runs off the edges in places).
      const front = v.world.z < 1 && Math.abs(v.world.x) < 1.02 && Math.abs(v.world.y) < 1.02;
      sx = ((v.world.x + 1) / 2) * size.width;
      sy = ((1 - v.world.y) / 2) * size.height;
      const rPx = Math.hypot(((v.edge.x - v.world.x) / 2) * size.width, ((v.edge.y - v.world.y) / 2) * size.height);
      if (front && vis > 0.5 && isLive() && interaction.inside && !interaction.dragging && !overUi.current) {
        const px = ((interaction.ndc.x + 1) / 2) * size.width;
        const py = ((1 - interaction.ndc.y) / 2) * size.height;
        hit = Math.hypot(px - sx, py - sy) < Math.max(rPx * 1.3, 22);
      }
      if (tag) {
        tag.style.transform = `translate3d(${sx.toFixed(1)}px, ${(sy - Math.max(rPx * 0.55, 9)).toFixed(1)}px, 0) translate(-50%, -100%)`;
        // Near a screen edge the label slides inward; its stem stays on the ship.
        const plate = tag.firstChild;
        // Re-measured every few frames (it widens on hover), not every frame.
        if (s.frame++ % 12 === 0) s.plateW = plate.offsetWidth;
        const half = s.plateW / 2 + 8;
        const dx = Math.min(Math.max(sx, half), size.width - half) - sx;
        plate.style.transform = dx ? `translateX(${dx.toFixed(1)}px)` : '';
        tag.style.opacity = front && isLive() ? (vis * vis).toFixed(3) : '0';
      }
    } else if (tag) {
      tag.style.opacity = '0';
    }
    const k = 1 - Math.exp(-dt * 5);
    s.hot += ((hit ? 1 : 0) - s.hot) * k;
    tag?.classList.toggle('is-hot', hit);

    // Wander (easing to a crawl while hovered).
    s.rate += ((hit ? 0.18 : 1) - s.rate) * k;
    // The clock only runs while the system is shown, so the ship always enters at its start.
    if (vis > 0.3) s.t += dt * s.rate;
    pathAt(s.t, v.pos);
    pathAt(s.t + 0.6, v.ahead);
    g.position.copy(v.pos);
    // Face along the path, banking gently into the turn.
    g.parent.localToWorld(v.world.copy(v.ahead));
    g.lookAt(v.world);
    g.rotateZ(-0.32 + 0.12 * Math.sin(s.t * 0.21));
    g.scale.setScalar(SCALE * (0.7 + 0.3 * vis) * (1 + s.hot * 0.12));

    glow.value = s.hot;
    const time = clock.elapsedTime;
    plumeUniforms.uTime.value = time;
    plumeUniforms.uPower.value = vis * (0.55 + 0.45 * s.hot) * (0.92 + 0.08 * Math.sin(time * 3.1));
    nozzleUniforms.uOpacity.value = vis * (0.75 + 0.5 * s.hot);
    haloUniforms.uOpacity.value = vis * s.hot * 0.32;
    const blink = (offset) => (Math.sin(time * 2.6 + offset) > 0.82 ? 1 : 0.15) * vis;
    navRed.opacity = blink(0);
    navGreen.opacity = blink(1.6);

    // Trail: sample the path behind the ship.
    s.sample += dt;
    if (s.sample > TRAIL_STEP || v.trail.length === 0) {
      s.sample = 0;
      v.trail.unshift(v.pos.clone());
      if (v.trail.length > TRAIL_POINTS) v.trail.length = TRAIL_POINTS;
    }
    const attr = trail.geometry.attributes.position;
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const p = i === 0 ? v.pos : v.trail[Math.min(i, v.trail.length - 1)];
      attr.setXYZ(i, p.x, p.y, p.z);
    }
    attr.needsUpdate = true;
    trail.material.opacity = vis * (0.32 + 0.25 * s.hot);
  });

  // Model: forward is +Z, up is +Y, roughly 1.5 units long.
  return (
    <>
      <primitive object={trail} />
      <group ref={root}>
        <group ref={ship}>
          {/* main hull with a tapered nose */}
          <mesh material={hull}>
            <boxGeometry args={[0.44, 0.26, 1.0]} />
          </mesh>
          <mesh material={hull} position={[0, 0, 0.6]} rotation={[Math.PI / 2, Math.PI / 4, 0]}>
            <cylinderGeometry args={[0.12, 0.25, 0.2, 4]} />
          </mesh>
          <mesh material={dark} position={[0, 0.135, 0.12]}>
            <boxGeometry args={[0.3, 0.02, 0.5]} />
          </mesh>
          {/* crew pod on a strut, with its canopy */}
          <mesh material={dark} position={[-0.3, -0.02, 0.18]}>
            <boxGeometry args={[0.18, 0.06, 0.2]} />
          </mesh>
          <mesh material={hull} position={[-0.44, -0.02, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.105, 0.42, 6, 14]} />
          </mesh>
          <mesh material={dark} position={[-0.44, -0.02, 0.46]} scale={[1, 1, 0.55]}>
            <sphereGeometry args={[0.085, 14, 10]} />
          </mesh>
          {/* fuel tank on the other side */}
          <mesh material={hull} position={[0.3, 0.08, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.075, 0.38, 4, 12]} />
          </mesh>
          {/* radiator fins (navy cells in a gold grid, like the station's wings) */}
          <mesh material={fins} position={[0.04, 0.4, -0.12]} rotation={[0, 0, 0.08]}>
            <boxGeometry args={[0.018, 0.52, 0.56]} />
          </mesh>
          <mesh material={fins} position={[-0.5, -0.36, 0.02]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.018, 0.4, 0.44]} />
          </mesh>
          {/* the prize: a gold cargo pod in clamps under the hull */}
          <mesh material={dark} position={[0, -0.17, -0.02]}>
            <boxGeometry args={[0.2, 0.06, 0.5]} />
          </mesh>
          <mesh material={gold} position={[0, -0.27, -0.02]}>
            <boxGeometry args={[0.28, 0.16, 0.42]} />
          </mesh>
          {/* engines, nozzles and exhaust */}
          {[-0.12, 0.12].map((x) => (
            <group key={x} position={[x, 0, -0.56]}>
              <mesh material={dark} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.075, 0.095, 0.16, 14]} />
              </mesh>
              <Billboard position={[0, 0, -0.09]}>
                <mesh material={nozzle}>
                  <planeGeometry args={[0.32, 0.32]} />
                </mesh>
              </Billboard>
              <mesh material={plume} position={[0, 0, -0.39]} rotation={[-Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.07, 0.62, 14, 1, true]} />
              </mesh>
            </group>
          ))}
          {/* strap-on boosters, low on each flank: nose cone, gold band, nozzle and flame */}
          {[-0.27, 0.27].map((x) => (
            <group key={`b${x}`} position={[x, -0.15, -0.12]}>
              <mesh material={hull} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.055, 0.055, 0.6, 12]} />
              </mesh>
              <mesh material={hull} position={[0, 0, 0.37]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.055, 0.14, 12]} />
              </mesh>
              <mesh material={gold} position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.058, 0.058, 0.04, 12]} />
              </mesh>
              <mesh material={dark} position={[0, 0, -0.33]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.042, 0.06, 0.08, 12]} />
              </mesh>
              <mesh material={dark} position={[x < 0 ? 0.06 : -0.06, 0.04, 0]}>
                <boxGeometry args={[0.06, 0.03, 0.3]} />
              </mesh>
              <Billboard position={[0, 0, -0.38]}>
                <mesh material={nozzle}>
                  <planeGeometry args={[0.22, 0.22]} />
                </mesh>
              </Billboard>
              <mesh material={plume} position={[0, 0, -0.68]} scale={[0.85, 1, 0.85]} rotation={[-Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.07, 0.62, 12, 1, true]} />
              </mesh>
            </group>
          ))}
          {/* navigation lights */}
          <mesh material={navRed} position={[-0.56, -0.02, 0.15]}>
            <sphereGeometry args={[0.022, 6, 6]} />
          </mesh>
          <mesh material={navGreen} position={[0.38, 0.08, -0.12]}>
            <sphereGeometry args={[0.022, 6, 6]} />
          </mesh>
          {/* a soft gold halo, only while hovered */}
          <Billboard>
            <mesh material={halo}>
              <planeGeometry args={[2.6, 2.6]} />
            </mesh>
          </Billboard>
        </group>
      </group>
    </>
  );
}
