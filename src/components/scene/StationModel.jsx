import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '../../config/experience';
import { hullShader, lightShader, panelShader } from '../../lib/stationShaders';
import { useShaderMaterial } from '../../lib/useShaderMaterial';

const SPOKES = 3;
const WINDOWS = 72;
// Solar wings on the truss: x positions of the panel centres (both sides).
const PANELS_X = [1.3, 2.06];

/**
 * The CUBYC space station, modelled at unit scale (habitat-ring radius = 1,
 * spin axis = local Y):
 *   a rotating habitat ring with spokes and lit windows, a central hub with a
 *   gold docking collar, and a truss carrying four navy-and-gold solar wings.
 *
 * Shared uniform objects keep it in step with its owner:
 *   sunPos  THREE.Vector3 (world space) — the key light
 *   reveal  { value } — fade in / out (landing reveal, scroll fade)
 *   glow    { value } — hover / focus lift
 */
export default function StationModel({ colors, sunPos, reveal, glow, spin = 0.22, lightSize = 2.2, quality = 'high' }) {
  const ring = useRef(null);
  const [hullColor, panelColor, goldColor] = colors;

  const makeHull = (color, seams) => ({
    uColor: { value: new THREE.Color(color) },
    uSunPos: { value: sunPos },
    uReveal: reveal,
    uSeams: { value: seams },
    uGlow: glow,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hullUniforms = useMemo(() => makeHull(hullColor, 1), [hullColor, sunPos, reveal, glow]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const goldUniforms = useMemo(() => makeHull(goldColor, 0), [goldColor, sunPos, reveal, glow]);
  const panelUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(panelColor) },
      uGold: { value: new THREE.Color(goldColor) },
      uSunPos: { value: sunPos },
      uReveal: reveal,
    }),
    [panelColor, goldColor, sunPos, reveal],
  );
  const lightUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: lightSize },
      uColor: { value: new THREE.Color('#ffe2a8') },
      uOpacity: { value: 0 },
    }),
    [lightSize],
  );

  const opts = { transparent: true, side: THREE.DoubleSide };
  const hull = useShaderMaterial(hullShader, hullUniforms, opts);
  const gold = useShaderMaterial(hullShader, goldUniforms, opts);
  const panel = useShaderMaterial(panelShader, panelUniforms, opts);
  const lights = useShaderMaterial(lightShader, lightUniforms, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

  // Windows along the outer face of the habitat ring.
  const windows = useMemo(() => {
    const rand = mulberry32(42);
    const n = quality === 'low' ? WINDOWS / 2 : WINDOWS;
    const pos = new Float32Array(n * 3);
    const phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pos.set([Math.cos(a) * 1.09, (rand() - 0.5) * 0.06, Math.sin(a) * 1.09], i * 3);
      phase[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    return g;
  }, [quality]);
  useEffect(() => () => windows.dispose(), [windows]);

  useFrame(({ clock, gl }, delta) => {
    ring.current.rotation.y += Math.min(delta, 0.1) * spin;
    lightUniforms.uTime.value = clock.elapsedTime;
    lightUniforms.uPixelRatio.value = gl.getPixelRatio();
    lightUniforms.uOpacity.value = reveal.value * (0.85 + (glow?.value ?? 0) * 0.3);
  });

  const segs = quality === 'low' ? 64 : 128;

  return (
    <group>
      {/* Rotating habitat */}
      <group ref={ring}>
        <mesh material={hull} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1, 0.085, 18, segs]} />
        </mesh>
        <mesh material={gold} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.9, 0.022, 8, segs]} />
        </mesh>
        {Array.from({ length: SPOKES }, (_, i) => (
          <mesh key={i} material={hull} rotation={[0, (i / SPOKES) * Math.PI, Math.PI / 2]}>
            <cylinderGeometry args={[0.022, 0.022, 1.82, 8]} />
          </mesh>
        ))}
        <points geometry={windows} material={lights} renderOrder={5} />
      </group>

      {/* Hub + docking collar */}
      <mesh material={hull}>
        <cylinderGeometry args={[0.16, 0.16, 0.7, 28]} />
      </mesh>
      {[-0.35, 0.35].map((y) => (
        <mesh key={y} material={hull} position={[0, y, 0]}>
          <sphereGeometry args={[0.16, 24, 14]} />
        </mesh>
      ))}
      <mesh material={gold} position={[0, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.03, 10, 40]} />
      </mesh>

      {/* Truss + solar wings */}
      <mesh material={gold} position={[0, 0.3, 0]}>
        <boxGeometry args={[(PANELS_X[1] + 0.4) * 2, 0.035, 0.035]} />
      </mesh>
      {[-1, 1].flatMap((side) =>
        PANELS_X.map((x) => (
          <mesh key={`${side}-${x}`} material={panel} position={[side * x, 0.3, 0]} rotation={[-Math.PI / 2 + 0.32, 0, 0]}>
            <planeGeometry args={[0.72, 0.34]} />
          </mesh>
        )),
      )}
    </group>
  );
}
