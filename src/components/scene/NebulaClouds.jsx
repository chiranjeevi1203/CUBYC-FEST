import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NEBULA, PALETTE, WARP, mulberry32 } from '../../config/experience';
import { getScene } from '../../store/useExperience';

/** Paints a soft, irregular cloud from layered radial gradients on a 2D canvas. */
function paintCloudTexture(color, rand) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(color);
  const rgb = `${Math.round(base.r * 255)},${Math.round(base.g * 255)},${Math.round(base.b * 255)}`;

  ctx.globalCompositeOperation = 'lighter';
  const blobs = 7 + Math.floor(rand() * 5);
  for (let i = 0; i < blobs; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = Math.pow(rand(), 0.8) * size * 0.26;
    const x = size / 2 + Math.cos(angle) * dist;
    const y = size / 2 + Math.sin(angle) * dist;
    const r = size * (0.14 + rand() * 0.24);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.22 + rand() * 0.3;
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.55, `rgba(${rgb},${a * 0.35})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  // A faint warm/white heart gives the cloud luminosity.
  const heart = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.3);
  heart.addColorStop(0, 'rgba(255,240,220,0.12)');
  heart.addColorStop(1, 'rgba(255,240,220,0)');
  ctx.fillStyle = heart;
  ctx.fillRect(0, 0, size, size);

  // Feather the square edges away.
  ctx.globalCompositeOperation = 'destination-in';
  const mask = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size / 2);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Defocused nebula billboards that stream past the lens at the screen edges,
 * at several parallax depths. Slow when idle, fast during warp.
 */
export default function NebulaClouds({ quality }) {
  const group = useRef(null);
  const meshes = useRef([]);
  const travel = useRef(0);
  const count = quality === 'low' ? NEBULA.count.low : NEBULA.count.high;

  const clouds = useMemo(() => {
    const rand = mulberry32(31);
    return Array.from({ length: count }, (_, i) => {
      // Keep clouds off the central axis so the vanishing point stays clean.
      const angle = (i / count) * Math.PI * 2 + rand() * 0.6;
      const radius = 26 + rand() * 40;
      const texture = paintCloudTexture(PALETTE.nebula[i % PALETTE.nebula.length], rand);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        opacity: 0,
      });
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.65,
        z0: rand() * NEBULA.depth,
        size: 70 + rand() * 90,
        roll: rand() * Math.PI * 2,
        parallax: 0.55 + rand() * 0.6,
        opacity: NEBULA.opacity[0] + rand() * (NEBULA.opacity[1] - NEBULA.opacity[0]),
        texture,
        material,
      };
    });
  }, [count]);

  useEffect(
    () => () =>
      clouds.forEach((c) => {
        c.texture.dispose();
        c.material.dispose();
      }),
    [clouds],
  );

  useFrame(({ camera, clock }, delta) => {
    const s = getScene();
    const g = group.current;
    g.visible = s.nebula > 0.002;
    if (!g.visible) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    // Gentle idle drift + warp-speed rush.
    travel.current += delta * (2.2 + WARP.travelSpeed * 0.45 * s.speed);
    const t = clock.elapsedTime;

    clouds.forEach((c, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      const z = -NEBULA.depth + ((c.z0 + travel.current * c.parallax) % NEBULA.depth) - 8;
      mesh.position.set(c.x + Math.sin(t * 0.05 + i) * 3, c.y + Math.cos(t * 0.04 + i) * 2, z);
      mesh.rotation.z = c.roll + t * 0.01 * (i % 2 ? 1 : -1);
      const far = THREE.MathUtils.smoothstep(z, -NEBULA.depth - 8, -NEBULA.depth * 0.6);
      const near = 1 - THREE.MathUtils.smoothstep(z, -40, -10);
      c.material.opacity = c.opacity * s.nebula * far * near;
    });
  });

  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          material={c.material}
          frustumCulled={false}
        >
          <planeGeometry args={[c.size, c.size]} />
        </mesh>
      ))}
    </group>
  );
}
