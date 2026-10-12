import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { GALAXY, PALETTE, mulberry32 } from '../../config/experience';
import { getScene } from '../../store/useExperience';
import { galaxyShader, radialGlowShader } from '../../lib/shaders';
import { useShaderMaterial } from '../../lib/useShaderMaterial';

/**
 * Procedural milky-way disc: logarithmic-ish spiral arms, a thick central bulge,
 * warm core → blue rim. Every particle also carries a scattered "halo" position;
 * the uAssembly uniform morphs halo → disc for the opening "galaxy pop".
 */
function buildGalaxy(count) {
  const rand = mulberry32(2027);
  const { radius: R, branches, spin, randomness, randomnessPower, thickness } = GALAXY;
  const positions = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const delays = new Float32Array(count);

  const inside = new THREE.Color(PALETTE.galaxyInside);
  const outside = new THREE.Color(PALETTE.galaxyOutside);
  const core = new THREE.Color(PALETTE.galaxyCore);
  const c = new THREE.Color();
  const signed = () => (rand() < 0.5 ? -1 : 1);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const bulge = rand() < 0.1;
    let x;
    let y;
    let z;
    let t;

    if (bulge) {
      // Spherical-ish central bulge
      const r = Math.pow(rand(), 2.2) * R * 0.16;
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      x = s * Math.cos(th) * r;
      y = u * r * 0.7;
      z = s * Math.sin(th) * r;
      t = r / R;
    } else {
      const r = Math.pow(rand(), 1.5) * R;
      const branchAngle = ((i % branches) / branches) * Math.PI * 2;
      const spinAngle = (r / R) * spin * Math.PI * 2;
      const spread = randomness * r;
      const rx = Math.pow(rand(), randomnessPower) * signed() * spread;
      const ry = Math.pow(rand(), randomnessPower) * signed() * spread * thickness * 2.2 * (1 - (r / R) * 0.6);
      const rz = Math.pow(rand(), randomnessPower) * signed() * spread;
      x = Math.cos(branchAngle + spinAngle) * r + rx;
      y = ry;
      z = Math.sin(branchAngle + spinAngle) * r + rz;
      t = r / R;
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    // Scattered halo start: a loose shell around the disc
    const hr = R * (1.6 + rand() * 1.6);
    const hu = rand() * 2 - 1;
    const hth = rand() * Math.PI * 2;
    const hs = Math.sqrt(1 - hu * hu);
    scatter[i3] = hs * Math.cos(hth) * hr;
    scatter[i3 + 1] = hu * hr * 0.8;
    scatter[i3 + 2] = hs * Math.sin(hth) * hr;

    c.copy(inside).lerp(outside, Math.min(t * 1.15, 1));
    if (t < 0.12) c.lerp(core, 1 - t / 0.12);
    const brightness = 0.8 + rand() * 0.6;
    colors[i3] = c.r * brightness;
    colors[i3 + 1] = c.g * brightness;
    colors[i3 + 2] = c.b * brightness;

    sizes[i] = 0.6 + Math.pow(rand(), 3) * 2.4 + (t < 0.1 ? 0.6 : 0);
    // Core particles land first, rim particles last
    delays[i] = Math.min(t * 0.25 + rand() * 0.1, 0.35);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  g.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1));
  // Bounding sphere must cover the halo, or the disc is culled mid-assembly.
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 3.4);
  return g;
}

export default function SpiralGalaxy({ quality }) {
  const group = useRef(null);
  const glowMesh = useRef(null);
  const rotation = useRef(0);
  const size = useThree((s) => s.size);
  const count = quality === 'low' ? GALAXY.count.low : GALAXY.count.high;

  const geometry = useMemo(() => buildGalaxy(count), [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uAssembly: { value: 0 },
      uRotation: { value: 0 },
      uOpacity: { value: 0 },
      uSize: { value: 105 },
      uPixelRatio: { value: 1 },
    }),
    [],
  );
  const material = useShaderMaterial(galaxyShader, uniforms, {
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const glowUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(PALETTE.galaxyCore) }, uIntensity: { value: 0 } }),
    [],
  );
  const glowMaterial = useShaderMaterial(radialGlowShader, glowUniforms, {
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  useFrame(({ gl }, delta) => {
    const g = getScene().galaxy;
    const visible = g.opacity > 0.002;
    group.current.visible = visible;
    if (!visible) return;
    rotation.current += delta * GALAXY.rotationSpeed * g.spin;
    uniforms.uAssembly.value = g.assembly;
    uniforms.uRotation.value = rotation.current;
    uniforms.uOpacity.value = g.opacity;
    uniforms.uPixelRatio.value = gl.getPixelRatio();
    glowUniforms.uIntensity.value = g.opacity * (0.16 * g.assembly + g.flash * 1.2);
    glowMesh.current.scale.setScalar(1 + g.flash * 0.5);

    const portrait = size.width < size.height;
    group.current.scale.setScalar(portrait ? GALAXY.portraitScale : 1);
  });

  return (
    <group ref={group} position={GALAXY.position}>
      <points geometry={geometry} material={material} rotation={GALAXY.rotation} />
      <Billboard>
        <mesh ref={glowMesh} material={glowMaterial}>
          <planeGeometry args={[GALAXY.radius * 0.7, GALAXY.radius * 0.7]} />
        </mesh>
      </Billboard>
    </group>
  );
}
