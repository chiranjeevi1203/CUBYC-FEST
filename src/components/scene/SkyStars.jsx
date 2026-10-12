import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SKY_STARS, STAR_COLORS, mulberry32 } from '../../config/experience';
import { getScene } from '../../store/useExperience';
import { skyStarShader } from '../../lib/shaders';
import { useShaderMaterial } from '../../lib/useShaderMaterial';

/** Distant twinkling stars on a camera-locked shell; counter-rotates with the pointer. */
export default function SkyStars({ quality }) {
  const points = useRef(null);
  const count = quality === 'low' ? SKY_STARS.low : SKY_STARS.high;

  const geometry = useMemo(() => {
    const rand = mulberry32(1987);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const theta = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      positions.set([s * Math.cos(theta) * 700, u * 700, s * Math.sin(theta) * 700], i * 3);
      c.set(STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)]);
      colors.set([c.r, c.g, c.b], i * 3);
      sizes[i] = 0.8 + Math.pow(rand(), 4) * 3.2;
      phases[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    return g;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } }),
    [],
  );
  const material = useShaderMaterial(skyStarShader, uniforms, {
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  useFrame(({ camera, clock, gl }) => {
    const s = getScene();
    points.current.position.copy(camera.position);
    points.current.rotation.set(s.pointer.y * 0.012, -s.pointer.x * 0.02, 0);
    uniforms.uTime.value = clock.elapsedTime;
    // Dim the far shell slightly while streaks own the screen.
    uniforms.uOpacity.value = s.stars * (1 - s.speed * 0.6);
    uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} renderOrder={-5} />;
}
