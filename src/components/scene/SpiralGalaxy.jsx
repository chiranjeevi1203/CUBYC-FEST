import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { GALAXY, mulberry32 } from '../../config/experience';
import { getScene } from '../../store/useExperience';
import { galaxyShader, radialGlowShader } from '../../lib/shaders';
import { useShaderMaterial } from '../../lib/useShaderMaterial';

/**
 * The opening galaxy (after a classic tilted spiral): a creamy-gold core inside a
 * pale steel-blue inner disc, two tightly wound flocculent arms of blue stars
 * studded with bright blue-white knots, and dark dust lanes tracing the inner
 * edge of each arm. Every particle also carries a scattered "halo" position; the
 * uAssembly uniform gathers halo → disc as the galaxy first appears.
 */

const C = GALAXY.colors;

/** Arm angle (radians) at radius fraction t ∈ [0, 1]. */
const armAngle = (t, arm) => (arm / GALAXY.arms) * Math.PI * 2 + Math.log(1 + t * 9) * GALAXY.wind;

function makeGeometry(n, boundR) {
  const g = new THREE.BufferGeometry();
  const attr = {
    position: new Float32Array(n * 3),
    aScatter: new Float32Array(n * 3),
    aColor: new Float32Array(n * 3),
    aSize: new Float32Array(n),
    aDelay: new Float32Array(n),
  };
  return {
    g,
    attr,
    finish() {
      g.setAttribute('position', new THREE.BufferAttribute(attr.position, 3));
      g.setAttribute('aScatter', new THREE.BufferAttribute(attr.aScatter, 3));
      g.setAttribute('aColor', new THREE.BufferAttribute(attr.aColor, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(attr.aSize, 1));
      g.setAttribute('aDelay', new THREE.BufferAttribute(attr.aDelay, 1));
      // Bounding sphere must cover the halo, or the disc is culled mid-assembly.
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), boundR);
      return g;
    },
  };
}

function buildStars(count) {
  const rand = mulberry32(2027);
  const R = GALAXY.radius;
  const { g, attr, finish } = makeGeometry(count, R * 3.4);
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5; // ≈ normal, −1…1

  const core = new THREE.Color(C.core);
  const inner = new THREE.Color(C.inner);
  const arm = new THREE.Color(C.arm);
  const rim = new THREE.Color(C.rim);
  const knot = new THREE.Color(C.knot);
  const warm = new THREE.Color(C.warm);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const kind = rand();
    let x;
    let y;
    let z;
    let t;
    let size = 0.55 + Math.pow(rand(), 3) * 1.9;
    let bright = 0.75 + rand() * 0.55;

    if (kind < 0.14) {
      // Central bulge: dense, warm, slightly flattened
      const r = Math.pow(rand(), 2.2) * R * 0.22;
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      x = s * Math.cos(th) * r;
      y = u * r * 0.55;
      z = s * Math.sin(th) * r;
      t = r / R;
      c.copy(core).lerp(inner, Math.min(t / 0.2, 1) * 0.55);
      size += t < 0.05 ? 0.9 : 0.3;
      bright *= 1.15;
    } else if (kind < 0.44) {
      // Smooth disc between the arms (the bright pale inner oval, thinning outward)
      const r = Math.pow(rand(), 1.7) * R * 0.92;
      const th = rand() * Math.PI * 2;
      x = Math.cos(th) * r;
      z = Math.sin(th) * r;
      y = gauss() * R * 0.022;
      t = r / R;
      c.copy(inner).lerp(rim, Math.min(t * 1.3, 1));
      bright *= 0.62;
      // Every few disc stars is a soft glow sprite: a smooth, luminous inner oval
      if (rand() < 0.25) {
        size = 3.5 + rand() * 4;
        bright = 0.12 + (1 - t) * 0.12;
      }
    } else {
      // Two flocculent arms; ~8% of their stars bunch into bright knots
      const a = Math.floor(rand() * GALAXY.arms);
      t = 0.14 + Math.pow(rand(), 0.8) * 0.86;
      const r = t * R;
      const spread = (0.06 + t * 0.11) * R;
      const ang = armAngle(t, a) + gauss() * 0.22;
      // Fragments: offset whole clumps off the arm so the arms look torn, not ruled
      const frag = Math.sin(t * 37 + a * 2.1) * 0.5 + Math.sin(t * 71 + a) * 0.25;
      x = Math.cos(ang) * r + gauss() * spread + frag * spread * 0.6;
      z = Math.sin(ang) * r + gauss() * spread;
      y = gauss() * R * 0.018 * (1.2 - t * 0.6);
      c.copy(arm).lerp(rim, Math.min(Math.max((t - 0.35) * 1.6, 0), 1));
      if (t < 0.28) c.lerp(inner, (0.28 - t) / 0.28);
      if (kind < 0.58) {
        // Arm haze: big, faint sprites that melt the arm stars into glowing blue cloud
        x += gauss() * spread * 0.6;
        z += gauss() * spread * 0.6;
        size = 5 + rand() * 6.5;
        bright = 0.1 + rand() * 0.07;
      } else if (rand() < 0.08) {
        c.copy(knot);
        size += 1.1 + rand() * 1.8;
        bright *= 1.35;
      } else if (rand() < 0.012) {
        // Rare warm field stars caught in the arms
        c.copy(warm);
        size += 0.8;
      }
    }

    attr.position[i3] = x;
    attr.position[i3 + 1] = y;
    attr.position[i3 + 2] = z;

    // Scattered halo start: a loose shell around the disc
    const hr = R * (1.5 + rand() * 1.5);
    const hu = rand() * 2 - 1;
    const hth = rand() * Math.PI * 2;
    const hs = Math.sqrt(1 - hu * hu);
    attr.aScatter[i3] = hs * Math.cos(hth) * hr;
    attr.aScatter[i3 + 1] = hu * hr * 0.8;
    attr.aScatter[i3 + 2] = hs * Math.sin(hth) * hr;

    attr.aColor[i3] = c.r * bright;
    attr.aColor[i3 + 1] = c.g * bright;
    attr.aColor[i3 + 2] = c.b * bright;
    attr.aSize[i] = size;
    // Core particles land first, rim particles last
    attr.aDelay[i] = Math.min(t * 0.25 + rand() * 0.1, 0.35);
  }
  return finish();
}

/** Dark dust lanes: soft, larger sprites hugging the inner (trailing) edge of each arm. */
function buildDust(count) {
  const rand = mulberry32(611);
  const R = GALAXY.radius;
  const { attr, finish } = makeGeometry(count, R * 3.4);
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  const dark = new THREE.Color(C.dust);
  const rust = new THREE.Color(C.dustEdge);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const a = Math.floor(rand() * GALAXY.arms);
    const t = 0.1 + Math.pow(rand(), 1.15) * 0.6;
    const r = t * R * 0.97;
    const ang = armAngle(t, a) - 0.26 + gauss() * 0.08;
    const spread = (0.014 + t * 0.035) * R;
    attr.position[i3] = Math.cos(ang) * r + gauss() * spread;
    attr.position[i3 + 1] = gauss() * R * 0.008;
    attr.position[i3 + 2] = Math.sin(ang) * r + gauss() * spread;
    attr.aScatter[i3] = attr.position[i3] * 2.6;
    attr.aScatter[i3 + 1] = (rand() - 0.5) * R;
    attr.aScatter[i3 + 2] = attr.position[i3 + 2] * 2.6;
    c.copy(dark).lerp(rust, rand() * 0.5);
    attr.aColor[i3] = c.r;
    attr.aColor[i3 + 1] = c.g;
    attr.aColor[i3 + 2] = c.b;
    attr.aSize[i] = 2.2 + rand() * 3.2;
    attr.aDelay[i] = 0.12 + t * 0.25;
  }
  return finish();
}

export default function SpiralGalaxy({ quality }) {
  const group = useRef(null);
  const coreMesh = useRef(null);
  const rotation = useRef(0);
  const size = useThree((s) => s.size);
  const count = quality === 'low' ? GALAXY.count.low : GALAXY.count.high;

  const stars = useMemo(() => buildStars(count), [count]);
  const dust = useMemo(() => buildDust(Math.round(count * GALAXY.dustRatio)), [count]);
  useEffect(
    () => () => {
      stars.dispose();
      dust.dispose();
    },
    [stars, dust],
  );

  const uniforms = useMemo(
    () => ({ uAssembly: { value: 0 }, uRotation: { value: 0 }, uOpacity: { value: 0 }, uSize: { value: 150 }, uPixelRatio: { value: 1 } }),
    [],
  );
  const material = useShaderMaterial(galaxyShader, uniforms, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

  // Dust darkens what is behind it (normal blending), so it is drawn after the stars.
  const dustUniforms = useMemo(
    () => ({ uAssembly: { value: 0 }, uRotation: { value: 0 }, uOpacity: { value: 0 }, uSize: { value: 150 }, uPixelRatio: { value: 1 } }),
    [],
  );
  const dustMaterial = useShaderMaterial(galaxyShader, dustUniforms, { transparent: true, depthWrite: false, blending: THREE.NormalBlending });

  // Warm core bloom (camera-facing) and the pale inner-disc haze (lies in the disc plane).
  const coreUniforms = useMemo(() => ({ uColor: { value: new THREE.Color(C.core) }, uIntensity: { value: 0 } }), []);
  const coreMaterial = useShaderMaterial(radialGlowShader, coreUniforms, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const hazeUniforms = useMemo(() => ({ uColor: { value: new THREE.Color(C.haze) }, uIntensity: { value: 0 } }), []);
  const hazeMaterial = useShaderMaterial(radialGlowShader, hazeUniforms, {
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

  useFrame(({ gl }, delta) => {
    const g = getScene().galaxy;
    const visible = g.opacity > 0.002;
    group.current.visible = visible;
    if (!visible) return;
    rotation.current += delta * GALAXY.rotationSpeed * g.spin;
    const pr = gl.getPixelRatio();
    for (const u of [uniforms, dustUniforms]) {
      u.uAssembly.value = g.assembly;
      u.uRotation.value = rotation.current;
      u.uPixelRatio.value = pr;
    }
    uniforms.uOpacity.value = g.opacity;
    dustUniforms.uOpacity.value = g.opacity * GALAXY.dustOpacity * g.assembly;
    coreUniforms.uIntensity.value = g.opacity * (0.5 * g.assembly + g.flash * 1.1);
    hazeUniforms.uIntensity.value = g.opacity * 0.5 * g.assembly;
    coreMesh.current.scale.setScalar(1 + g.flash * 0.4);

    const portrait = size.width < size.height;
    group.current.scale.setScalar(portrait ? GALAXY.portraitScale : 1);
  });

  const R = GALAXY.radius;
  return (
    <group ref={group} position={GALAXY.position}>
      {/* Screen angle (outer) × inclination (inner): the disc runs lower-left → upper-right. */}
      <group rotation={[0, 0, GALAXY.screenAngle]}>
        <group rotation={[GALAXY.inclination, 0, 0]}>
          <mesh material={hazeMaterial} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
            <planeGeometry args={[R * 1.25, R * 1.25]} />
          </mesh>
          <points geometry={stars} material={material} renderOrder={2} />
          <points geometry={dust} material={dustMaterial} renderOrder={3} />
        </group>
      </group>
      <Billboard>
        <mesh ref={coreMesh} material={coreMaterial} renderOrder={4}>
          <planeGeometry args={[R * 0.7, R * 0.7]} />
        </mesh>
      </Billboard>
    </group>
  );
}
