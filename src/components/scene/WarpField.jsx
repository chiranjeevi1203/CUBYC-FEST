import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE, WARP, mulberry32 } from '../../config/experience';
import { getScene } from '../../store/useExperience';
import { warpShader } from '../../lib/shaders';
import { useShaderMaterial } from '../../lib/useShaderMaterial';

/**
 * Hyperspace streaks (REF-2). A tube of 2-vertex lines lives in camera space
 * around the view axis; the GPU cycles them toward the lens and stretches each
 * tail back toward the vanishing point in proportion to scene.speed.
 */
export default function WarpField({ quality }) {
  const group = useRef(null);
  const travel = useRef(0);
  const count = quality === 'low' ? WARP.streaks.low : WARP.streaks.high;

  const geometry = useMemo(() => {
    const rand = mulberry32(88);
    const positions = new Float32Array(count * 6);
    const colors = new Float32Array(count * 6);
    const tails = new Float32Array(count * 2);
    const zs = new Float32Array(count * 2);
    const seeds = new Float32Array(count * 2);
    const white = PALETTE.warp.map((hex) => new THREE.Color(hex));
    const gold = new THREE.Color(PALETTE.warpGold);
    const [rMin, rMax] = WARP.tubeRadius;

    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = rMin + Math.sqrt(rand()) * (rMax - rMin);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z0 = rand() * WARP.depth;
      const seed = rand();
      const c = rand() < WARP.goldChance ? gold : white[Math.floor(rand() * white.length)];
      for (let v = 0; v < 2; v++) {
        const k = i * 2 + v;
        positions.set([x, y, 0], k * 3);
        colors.set([c.r, c.g, c.b], k * 3);
        tails[k] = v;
        zs[k] = z0;
        seeds[k] = seed;
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('aTail', new THREE.BufferAttribute(tails, 1));
    g.setAttribute('aZ', new THREE.BufferAttribute(zs, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTravel: { value: 0 },
      uDepth: { value: WARP.depth },
      uLength: { value: WARP.length },
      uSpeed: { value: 0 },
      uOpacity: { value: 0 },
    }),
    [],
  );
  const material = useShaderMaterial(warpShader, uniforms, {
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });

  useFrame(({ camera }, delta) => {
    const speed = getScene().speed;
    const g = group.current;
    g.visible = speed > 0.01;
    if (!g.visible) return;
    // Ride along with the lens so the streaks always radiate from screen centre.
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    travel.current += delta * WARP.travelSpeed * speed;
    uniforms.uTravel.value = travel.current;
    // Length ∝ speed² so streaks visibly contract back into points as we brake.
    uniforms.uSpeed.value = speed * speed;
    uniforms.uOpacity.value = THREE.MathUtils.smoothstep(speed, 0.05, 0.45);
  });

  return (
    <group ref={group}>
      <lineSegments geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />
    </group>
  );
}
