import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { mulberry32 } from '../../config/experience';

/*
 * The docking ring on the Contact page: twelve modules on a slowly turning ring,
 * joined by jointed connector arms, with spokes to a central hub. Each module is
 * one contact person. Hull plating, windows, vents, hatches and gold foil are all
 * drawn procedurally onto canvas textures (colour + bump), so it reads as a real
 * engineered craft rather than plain boxes.
 *
 * Module k sits at angle θ = 90° − (k + ½)·30°: k = 0…5 run down the right side,
 * k = 6…11 up the left side (k = 11 top-left).
 */

export const MODULES = 12;
const R = 5;
const angleOf = (k) => Math.PI / 2 - ((k + 0.5) * Math.PI * 2) / MODULES;
// Module types round the ring (mirrored left/right)
const KINDS = ['hab', 'lab', 'solar', 'hab', 'engine', 'lab', 'lab', 'engine', 'hab', 'solar', 'lab', 'hab'];
const SIZE = { hab: [1.55, 1.1, 1.0], lab: [1.2, 1.22, 1.2], solar: [1.25, 0.95, 0.95], engine: [1.32, 1.0, 1.1] };

/* -------------------------------------------------------------------------- */
/*  Procedural textures                                                       */
/* -------------------------------------------------------------------------- */

const texCache = new Map();

/** Hull plating: subdivided plates, seams, rivets and details. Returns colour + bump maps. */
function hullTexture(variant) {
  if (texCache.has(variant)) return texCache.get(variant);
  const S = 512;
  const rnd = mulberry32(variant * 7919 + 13);
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    return [c, c.getContext('2d')];
  };
  const [cc, g] = mk();
  const [bc, b] = mk();
  g.fillStyle = '#d6d9df';
  g.fillRect(0, 0, S, S);
  b.fillStyle = '#7a7a7a';
  b.fillRect(0, 0, S, S);

  const windows = variant === 1;
  const vents = variant === 2;
  let label = 0;

  const plate = (x, y, w, h) => {
    const l = 74 + rnd() * 14;
    g.fillStyle = `hsl(222, ${4 + rnd() * 5}%, ${l}%)`;
    g.fillRect(x + 2, y + 2, w - 4, h - 4);
    // soft weathering toward the bottom of each plate
    const grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, 'rgba(255,255,255,0.06)');
    grd.addColorStop(1, 'rgba(40,44,56,0.08)');
    g.fillStyle = grd;
    g.fillRect(x + 2, y + 2, w - 4, h - 4);
    b.fillStyle = `rgb(${150 + rnd() * 30},${150 + rnd() * 30},${150 + rnd() * 30})`;
    b.fillRect(x + 3, y + 3, w - 6, h - 6);
    // seam
    g.strokeStyle = 'rgba(28, 31, 40, 0.78)';
    g.lineWidth = 2.5;
    g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    g.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    g.lineWidth = 1;
    g.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);
    // rivets along the edges
    g.fillStyle = 'rgba(70, 74, 86, 0.55)';
    b.fillStyle = '#d0d0d0';
    const step = 16;
    for (let i = x + 8; i < x + w - 6; i += step) {
      g.fillRect(i, y + 5, 2, 2);
      g.fillRect(i, y + h - 7, 2, 2);
      b.fillRect(i, y + 5, 2, 2);
      b.fillRect(i, y + h - 7, 2, 2);
    }
    // details
    const r = rnd();
    if (windows && w > 70 && h > 50 && r < 0.55) {
      const n = Math.max(1, Math.floor((w - 20) / 34));
      for (let i = 0; i < n; i++) {
        const wx = x + 12 + i * 34;
        const wy = y + h / 2 - 12;
        g.fillStyle = '#1a2337';
        g.fillRect(wx - 2, wy - 2, 26, 28);
        const sky = g.createLinearGradient(wx, wy, wx + 22, wy + 24);
        sky.addColorStop(0, '#3a4c70');
        sky.addColorStop(0.45, '#141d33');
        sky.addColorStop(1, '#070b16');
        g.fillStyle = sky;
        g.fillRect(wx, wy, 22, 24);
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.fillRect(wx + 3, wy + 3, 3, 8);
        b.fillStyle = '#303030';
        b.fillRect(wx - 2, wy - 2, 26, 28);
      }
    } else if ((vents && r < 0.6) || r < 0.12) {
      // louvred vent
      const vx = x + w * 0.2;
      const vw = w * 0.6;
      for (let yy = y + 10; yy < y + h - 10; yy += 6) {
        g.fillStyle = 'rgba(30, 34, 44, 0.75)';
        g.fillRect(vx, yy, vw, 2.5);
        b.fillStyle = '#202020';
        b.fillRect(vx, yy, vw, 2.5);
      }
    } else if (r < 0.24 && w > 50 && h > 50) {
      // hatch with a handle
      const hw = Math.min(w, h) * 0.55;
      const hx = x + (w - hw) / 2;
      const hy = y + (h - hw) / 2;
      g.strokeStyle = 'rgba(40, 44, 56, 0.7)';
      g.lineWidth = 2;
      g.strokeRect(hx, hy, hw, hw);
      g.strokeRect(hx + 5, hy + 5, hw - 10, hw - 10);
      g.fillStyle = '#9da3ae';
      g.fillRect(hx + hw / 2 - 8, hy + hw / 2 - 2, 16, 4);
      b.strokeStyle = '#2a2a2a';
      b.lineWidth = 3;
      b.strokeRect(hx, hy, hw, hw);
    } else if (r < 0.32 && w > 60) {
      // hazard stripes (gold / dark)
      const sh = 10;
      const sy = y + h - 18;
      g.save();
      g.beginPath();
      g.rect(x + 8, sy, w - 16, sh);
      g.clip();
      for (let i = -sh; i < w; i += 12) {
        g.fillStyle = i % 24 === 0 ? '#c9a24c' : '#2a2c33';
        g.beginPath();
        g.moveTo(x + 8 + i, sy + sh);
        g.lineTo(x + 8 + i + sh, sy);
        g.lineTo(x + 8 + i + sh + 6, sy);
        g.lineTo(x + 8 + i + 6, sy + sh);
        g.fill();
      }
      g.restore();
    } else if (r < 0.4 && w > 70) {
      // stencil label
      label += 1;
      g.fillStyle = 'rgba(40, 44, 56, 0.7)';
      g.font = 'bold 13px monospace';
      g.fillText(`CBX-${String(variant * 10 + label).padStart(2, '0')}`, x + 10, y + 22);
      g.fillRect(x + 10, y + 27, 36, 2);
    } else if (r < 0.46) {
      // crinkled gold foil insulation patch
      const fw = w * 0.6;
      const fh = h * 0.5;
      const fx = x + (w - fw) / 2;
      const fy = y + (h - fh) / 2;
      const grd2 = g.createLinearGradient(fx, fy, fx + fw, fy + fh);
      grd2.addColorStop(0, '#e9c27a');
      grd2.addColorStop(0.5, '#a97a2f');
      grd2.addColorStop(1, '#f3d9a4');
      g.fillStyle = grd2;
      g.fillRect(fx, fy, fw, fh);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${rnd() < 0.5 ? '255,240,200' : '90,60,20'}, ${0.15 + rnd() * 0.25})`;
        g.beginPath();
        g.moveTo(fx + rnd() * fw, fy + rnd() * fh);
        g.lineTo(fx + rnd() * fw, fy + rnd() * fh);
        g.lineTo(fx + rnd() * fw, fy + rnd() * fh);
        g.fill();
      }
    }
  };
  const split = (x, y, w, h, d) => {
    if (d > 0 && (w > 90 || h > 90) && rnd() > 0.18) {
      if (w > h) {
        const s = Math.round(w * (0.3 + rnd() * 0.4));
        split(x, y, s, h, d - 1);
        split(x + s, y, w - s, h, d - 1);
      } else {
        const s = Math.round(h * (0.3 + rnd() * 0.4));
        split(x, y, w, s, d - 1);
        split(x, y + s, w, h - s, d - 1);
      }
    } else plate(x, y, w, h);
  };
  split(0, 0, S, S, 4);
  // grime speckle
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${rnd() < 0.5 ? '30,34,44' : '255,255,255'}, ${rnd() * 0.06})`;
    g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const map = new THREE.CanvasTexture(cc);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const bump = new THREE.CanvasTexture(bc);
  bump.anisotropy = 4;
  const out = { map, bump };
  texCache.set(variant, out);
  return out;
}

/** Solar array: dark cells with silver bus lines. */
function solarTexture() {
  if (texCache.has('solar')) return texCache.get('solar');
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 256, 512);
  grd.addColorStop(0, '#26355f');
  grd.addColorStop(0.5, '#0f1834');
  grd.addColorStop(1, '#1d2b52');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 512);
  g.strokeStyle = 'rgba(190, 205, 235, 0.55)';
  g.lineWidth = 1.5;
  for (let x = 0; x <= 256; x += 32) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 512);
    g.stroke();
  }
  for (let y = 0; y <= 512; y += 32) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }
  g.strokeStyle = '#e9c27a';
  g.lineWidth = 6;
  g.strokeRect(3, 3, 250, 506);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set('solar', t);
  return t;
}

/* -------------------------------------------------------------------------- */
/*  Parts                                                                     */
/* -------------------------------------------------------------------------- */

function useMaterials() {
  return useMemo(() => {
    const hull = [0, 1, 2].map((v) => hullTexture(v));
    return {
      hull,
      metal: new THREE.MeshStandardMaterial({ color: '#b8bdc7', roughness: 0.38, metalness: 0.6 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2e38', roughness: 0.7, metalness: 0.35 }),
      gold: new THREE.MeshStandardMaterial({ color: '#d8ae5c', roughness: 0.28, metalness: 0.95, emissive: '#3a2608', emissiveIntensity: 0.4 }),
      solar: new THREE.MeshStandardMaterial({ map: solarTexture(), roughness: 0.25, metalness: 0.55 }),
      glass: new THREE.MeshStandardMaterial({ color: '#0a1122', roughness: 0.12, metalness: 0.3, emissive: '#4f7fd8', emissiveIntensity: 0.22 }),
      glow: new THREE.MeshBasicMaterial({ color: '#9fc4ff', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
      amber: new THREE.MeshBasicMaterial({ color: '#ffc46b', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    };
  }, []);
}

/** One module on the ring: hull box plus greebles for its type. */
function Module({ k, mats, hullMat, onOver, onOut, onPick }) {
  const kind = KINDS[k];
  const [w, h, d] = SIZE[kind];
  const rnd = useMemo(() => mulberry32(k * 101 + 7), [k]);
  const bits = useMemo(() => {
    // small boxes and tanks scattered over the outer (+Y) and front (+Z) faces
    const out = [];
    for (let i = 0; i < 6; i++) {
      const top = rnd() < 0.5;
      out.push({
        top,
        x: (rnd() - 0.5) * w * 0.75,
        o: (rnd() - 0.5) * (top ? d : h) * 0.6,
        s: [0.1 + rnd() * 0.18, 0.05 + rnd() * 0.08, 0.1 + rnd() * 0.18],
        tank: rnd() < 0.3,
      });
    }
    return out;
  }, [rnd, w, h, d]);

  const handlers = {
    onPointerOver: (e) => {
      e.stopPropagation();
      onOver(k);
    },
    onPointerOut: (e) => {
      e.stopPropagation();
      onOut(k);
    },
    onClick: (e) => {
      e.stopPropagation();
      if (e.delta > 6) return; // that was a drag
      onPick(k);
    },
  };

  return (
    <group {...handlers}>
      <RoundedBox args={[w, h, d]} radius={0.07} smoothness={3} material={hullMat} />
      {/* recessed band round the middle */}
      <mesh material={mats.dark}>
        <boxGeometry args={[w * 1.006, h * 0.08, d * 1.006]} />
      </mesh>
      {/* docking collars on both sides (where the arms join) */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[(sx * w) / 2, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.metal}>
            <cylinderGeometry args={[0.2, 0.24, 0.16, 16]} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[sx * 0.09, 0, 0]} material={mats.dark}>
            <torusGeometry args={[0.19, 0.035, 8, 20]} />
          </mesh>
        </group>
      ))}
      {/* greebles */}
      {bits.map((b, i) =>
        b.tank ? (
          <mesh key={i} position={b.top ? [b.x, h / 2 + 0.06, b.o] : [b.x, b.o, d / 2 + 0.06]} rotation={[0, 0, Math.PI / 2]} material={mats.metal}>
            <capsuleGeometry args={[0.06, b.s[0] * 2, 4, 10]} />
          </mesh>
        ) : (
          <mesh key={i} position={b.top ? [b.x, h / 2 + b.s[1] / 2, b.o] : [b.x, b.o, d / 2 + b.s[1] / 2]} material={i % 3 === 0 ? mats.dark : mats.metal}>
            <boxGeometry args={b.top ? b.s : [b.s[0], b.s[2], b.s[1]]} />
          </mesh>
        ),
      )}
      {/* framed panel array on the front face (solar / radiator), as on the habitat and lab modules */}
      {(kind === 'hab' || kind === 'lab') && (
        <group position={[0, kind === 'hab' ? h * 0.14 : 0, d / 2 + 0.006]}>
          <mesh material={mats.dark}>
            <boxGeometry args={[w * 0.66, h * (kind === 'hab' ? 0.42 : 0.6), 0.012]} />
          </mesh>
          <mesh position={[0, 0, 0.007]} material={mats.solar}>
            <boxGeometry args={[w * 0.62, h * (kind === 'hab' ? 0.38 : 0.56), 0.004]} />
          </mesh>
        </group>
      )}
      {/* type-specific parts */}
      {kind === 'hab' && (
        <group position={[0, -h * 0.18, d / 2 + 0.012]}>
          {[-0.45, -0.15, 0.15, 0.45].map((x) => (
            <mesh key={x} position={[x * w, 0, 0]} material={mats.glass}>
              <boxGeometry args={[0.16, 0.12, 0.02]} />
            </mesh>
          ))}
        </group>
      )}
      {kind === 'lab' && (
        <group position={[0, h / 2, 0]}>
          {[-0.36, -0.12, 0.12, 0.36].map((z) => (
            <mesh key={z} position={[0, 0.2, z * d]} material={mats.metal}>
              <boxGeometry args={[w * 0.7, 0.4, 0.025]} />
            </mesh>
          ))}
          <mesh position={[0, 0.02, 0]} material={mats.dark}>
            <boxGeometry args={[w * 0.74, 0.04, d * 0.84]} />
          </mesh>
        </group>
      )}
      {kind === 'solar' && (
        <group position={[0, h / 2, 0]}>
          <mesh position={[0, 0.35, 0]} material={mats.metal}>
            <cylinderGeometry args={[0.035, 0.035, 0.7, 8]} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[0, 0.78, s * 0.42]} rotation={[0.12 * s, 0, 0]}>
              <mesh material={mats.solar}>
                <boxGeometry args={[0.55, 0.9, 0.02]} />
              </mesh>
              <mesh position={[0, 0, -0.013]} material={mats.gold}>
                <boxGeometry args={[0.57, 0.92, 0.006]} />
              </mesh>
            </group>
          ))}
        </group>
      )}
      {kind === 'engine' && (
        <group position={[0, 0, -d / 2]}>
          {[
            [-0.28, 0.18],
            [0.28, 0.18],
            [0, -0.2],
          ].map(([x, y]) => (
            <group key={`${x}${y}`} position={[x, y, -0.12]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.dark}>
                <cylinderGeometry args={[0.1, 0.17, 0.26, 16, 1, true]} />
              </mesh>
              <mesh position={[0, 0, -0.1]} material={mats.glow}>
                <circleGeometry args={[0.13, 16]} />
              </mesh>
            </group>
          ))}
        </group>
      )}
      {/* a thin gold foil strip on the front edge */}
      <mesh position={[0, h / 2 - 0.05, d / 2 + 0.004]} material={mats.gold}>
        <boxGeometry args={[w * 0.5, 0.03, 0.01]} />
      </mesh>
      {/* status light */}
      <mesh position={[w / 2 - 0.12, h / 2 - 0.12, d / 2 + 0.01]} material={mats.amber}>
        <circleGeometry args={[0.035, 10]} />
      </mesh>
    </group>
  );
}

/** Jointed arm between two neighbouring modules. */
function Connector({ k, mats }) {
  const a = angleOf(k + 0.5);
  const len = 2 * R * Math.sin(Math.PI / MODULES) - 1.0;
  return (
    <group position={[Math.cos(a) * R, Math.sin(a) * R, 0]} rotation={[0, 0, a - Math.PI / 2]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={mats.metal}>
        <cylinderGeometry args={[0.11, 0.11, len, 14]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * len) / 3, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.dark}>
          <torusGeometry args={[0.125, 0.03, 8, 18]} />
        </mesh>
      ))}
      {/* hinge knuckle */}
      <mesh material={mats.metal}>
        <sphereGeometry args={[0.2, 16, 12]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.dark}>
        <cylinderGeometry args={[0.09, 0.09, 0.5, 12]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} material={mats.gold}>
        <boxGeometry args={[0.18, 0.05, 0.18]} />
      </mesh>
    </group>
  );
}

function Spoke({ angle, mats }) {
  const r0 = 1.05;
  const r1 = R - 0.62;
  const L = r1 - r0;
  const mid = (r0 + r1) / 2;
  return (
    <group position={[Math.cos(angle) * mid, Math.sin(angle) * mid, -0.1]} rotation={[0, 0, angle - Math.PI / 2]}>
      <mesh material={mats.metal}>
        <cylinderGeometry args={[0.055, 0.055, L, 10]} />
      </mesh>
      {[-0.3, 0, 0.3].map((t) => (
        <mesh key={t} position={[0, t * L, 0]} material={mats.dark}>
          <cylinderGeometry args={[0.085, 0.085, 0.1, 12]} />
        </mesh>
      ))}
    </group>
  );
}

/** The central hub; clicking it opens the website contact card. */
function Hub({ mats, hullMat, glowMat, st, onHub }) {
  const handlers = {
    onPointerOver: (e) => {
      e.stopPropagation();
      st.current.hubHover = true;
    },
    onPointerOut: () => {
      st.current.hubHover = false;
    },
    onClick: (e) => {
      e.stopPropagation();
      if (e.delta > 6) return; // that was a drag
      onHub?.();
    },
  };
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={hullMat}>
        <cylinderGeometry args={[0.95, 0.95, 1.5, 8]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.95]} material={mats.dark}>
        <cylinderGeometry args={[0.55, 0.85, 0.4, 8]} />
      </mesh>
      <mesh position={[0, 0, 0.78]} material={mats.gold}>
        <torusGeometry args={[0.7, 0.07, 10, 32]} />
      </mesh>
      <mesh position={[0, 0, 0.76]} material={glowMat}>
        <circleGeometry args={[0.36, 24]} />
      </mesh>
      {/* the hub's clickable area: a little larger than the hub itself (invisible) */}
      <mesh position={[0, 0, 0.9]} {...handlers}>
        <circleGeometry args={[1.45, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.2]} rotation={[0, 0, a]} material={mats.metal}>
            <boxGeometry args={[0.35, 0.28, 0.6]} />
          </mesh>
        );
      })}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scene                                                                     */
/* -------------------------------------------------------------------------- */

function Station({ st, onOver, onOut, onPick, onHub, shadows }) {
  const mats = useMaterials();
  const { camera, size, gl } = useThree();
  const tiltRef = useRef(null);
  // modules, arms and hub shade one another
  useEffect(() => {
    if (!shadows || !tiltRef.current) return;
    tiltRef.current.traverse((o) => {
      if (o.isMesh && !o.material.transparent) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }, [shadows]);
  const spinRef = useRef(null);
  const modRefs = useRef([]);
  const innerRefs = useRef([]);
  const armsRef = useRef(null);
  const hubRef = useRef(null);
  // one hull material per module, so each can glow on its own
  const hullMats = useMemo(
    () =>
      KINDS.map((_, k) => {
        const t = mats.hull[k % 3];
        return new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 2.6, roughness: 0.6, metalness: 0.2, emissive: '#e9a94a', emissiveIntensity: 0 });
      }),
    [mats],
  );
  const hubMat = useMemo(() => new THREE.MeshStandardMaterial({ map: mats.hull[1].map, bumpMap: mats.hull[1].bump, bumpScale: 1.6, roughness: 0.6, metalness: 0.2 }), [mats]);
  // the hub's core light: breathes, and flares when hovered (it opens the website card)
  const hubGlow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffc46b', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const tv = useMemo(() => new THREE.Vector3(), []);
  // where each module flies in from when the ring assembles
  const scatter = useMemo(() => {
    const r = mulberry32(42);
    return KINDS.map(() => ({ out: 5 + r() * 5, z: (r() - 0.5) * 10, spin: (r() - 0.5) * Math.PI * 2 }));
  }, []);
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = st.current;
    // assemble
    if (s.assemble) s.build = Math.min(1, s.build + dt / (s.reduced ? 0.01 : 2.4));
    // spin: idle drift and drag velocity — or, when a card beside the ring asks for its module,
    // turn the ring until that module sits level with the card (on the card's side), then stop.
    if (s.focusFrom === 'card' && s.focus != null && s.targetY != null && tiltRef.current) {
      const screenY = (x, y) => {
        tiltRef.current.localToWorld(tv.set(x, y, 0));
        tv.project(camera);
        return ((1 - tv.y) / 2) * size.height;
      };
      // Find the ring angle φ (on the card's side) where the module's on-screen height matches
      // the card's: on that half of the ring the height changes steadily with φ, so bisect.
      const left = s.focusSide === 'left';
      let lo = left ? Math.PI / 2 + 0.04 : -Math.PI / 2 + 0.04;
      let hi = left ? (Math.PI * 3) / 2 - 0.04 : Math.PI / 2 - 0.04;
      for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        const y = screenY(Math.cos(mid) * R, Math.sin(mid) * R);
        // left half: lower on screen as φ grows; right half: higher as φ grows
        if (left ? y < s.targetY : y > s.targetY) lo = mid;
        else hi = mid;
      }
      const phi = (lo + hi) / 2;
      let target = phi - angleOf(s.focus);
      target += Math.round((s.angle - target) / (Math.PI * 2)) * Math.PI * 2;
      s.angle += (target - s.angle) * (1 - Math.exp(-dt * 3.2));
      s.vel = 0;
    } else if (s.focusFrom === 'card') {
      const rest = Math.round(s.angle / (Math.PI * 2)) * Math.PI * 2;
      s.angle += (rest - s.angle) * (1 - Math.exp(-dt * 4));
      s.vel = 0;
    } else {
      if (!s.dragging) {
        const idle = s.reduced || s.hover != null ? 0 : 0.09;
        s.vel += (idle - s.vel) * (1 - Math.exp(-dt * 1.6));
        s.angle += s.vel * dt;
      }
    }
    // tilt toward the pointer
    s.tx += (s.px * 0.14 - s.tx) * (1 - Math.exp(-dt * 3));
    s.ty += (s.py * 0.1 - s.ty) * (1 - Math.exp(-dt * 3));
    if (tiltRef.current) {
      tiltRef.current.rotation.x = -0.42 + s.ty;
      tiltRef.current.rotation.y = 0.2 + s.tx;
    }
    if (spinRef.current) spinRef.current.rotation.z = s.angle;

    const t = performance.now() / 1000;
    for (let k = 0; k < MODULES; k++) {
      const inner = innerRefs.current[k];
      if (inner) {
        const p = Math.min(1, Math.max(0, s.build * 1.7 - k * 0.055));
        const e = 1 - Math.pow(1 - p, 3);
        const sc = scatter[k];
        inner.position.set(0, (1 - e) * sc.out, (1 - e) * sc.z);
        inner.rotation.set((1 - e) * sc.spin, (k % 2 ? 0.32 : -0.32) + (1 - e) * sc.spin * 0.6, 0);
        inner.visible = p > 0.001;
      }
      // glow: the focused module (gold), plus a faint breathing on every module while hovering any
      const m = hullMats[k];
      const target = s.focus === k ? 0.42 + Math.sin(t * 5) * 0.1 : 0;
      m.emissiveIntensity += (target - m.emissiveIntensity) * (1 - Math.exp(-dt * 8));
      // project each module's centre to screen space for the link line
      const g = modRefs.current[k];
      if (g) {
        g.getWorldPosition(v);
        v.project(camera);
        s.points[k] = [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
      }
    }
    const arms = Math.min(1, Math.max(0, (s.build - 0.55) / 0.35));
    if (armsRef.current) {
      armsRef.current.scale.setScalar(Math.max(arms, 0.0001));
      armsRef.current.visible = arms > 0.001;
    }
    if (hubRef.current) {
      const hb = Math.min(1, Math.max(0, (s.build - 0.25) / 0.5));
      hubRef.current.scale.setScalar(Math.max(1 - Math.pow(1 - hb, 3), 0.0001));
    }
    // hub light: breathes; flares while hovered or while its card is open
    const hubOn = s.hubHover || s.coreOpen;
    hubGlow.opacity += ((hubOn ? 1 : 0.55 + Math.sin(t * 2.2) * 0.25) - hubGlow.opacity) * (1 - Math.exp(-dt * 8));
    hubGlow.color.set(hubOn ? '#ffe3a6' : '#ffc46b');
    gl.domElement.style.cursor = s.hover != null || s.hubHover ? 'pointer' : s.dragging ? 'grabbing' : 'grab';
  });

  return (
    <>
      <ambientLight intensity={0.18} color="#9fb0d8" />
      <hemisphereLight args={['#d6e0ff', '#2a2218', 0.4]} />
      <directionalLight
        position={[8, 7, 10]}
        intensity={3}
        color="#fff3e2"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
      <directionalLight position={[-10, -5, -4]} intensity={0.6} color="#9db4e8" />
      <directionalLight position={[0, -8, 6]} intensity={0.35} color="#e9c27a" />
      <group ref={tiltRef}>
        <group ref={spinRef}>
          {KINDS.map((_, k) => {
            const a = angleOf(k);
            return (
              <group key={k} ref={(el) => (modRefs.current[k] = el)} position={[Math.cos(a) * R, Math.sin(a) * R, 0]} rotation={[0, 0, a - Math.PI / 2]}>
                <group ref={(el) => (innerRefs.current[k] = el)}>
                  <Module k={k} mats={mats} hullMat={hullMats[k]} onOver={onOver} onOut={onOut} onPick={onPick} />
                </group>
              </group>
            );
          })}
          <group ref={armsRef}>
            {KINDS.map((_, k) => (
              <Connector key={k} k={k} mats={mats} />
            ))}
            {[0, 1, 2, 3].map((i) => (
              <Spoke key={i} angle={angleOf(i * 3 + 1)} mats={mats} />
            ))}
          </group>
          <group ref={hubRef}>
            <Hub mats={mats} hullMat={hubMat} glowMat={hubGlow} st={st} onHub={onHub} />
          </group>
        </group>
      </group>
    </>
  );
}

/**
 * The station canvas. `st` is a shared mutable state ref (focus, hover, drag, projected
 * points); the page reads `st.current.points` to draw the link line.
 */
export default function StationRing({ st, onOver, onOut, onPick, onHub, active, quality }) {
  const wrapRef = useRef(null);
  // drag to spin (horizontal); vertical swipes still scroll the page
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    let last = null;
    let lastT = 0;
    const down = (e) => {
      last = e.clientX;
      lastT = performance.now();
      st.current.dragging = true;
      st.current.vel = 0;
    };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      st.current.px = ((e.clientX - r.left) / r.width) * 2 - 1;
      st.current.py = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (last == null) return;
      const now = performance.now();
      const dx = e.clientX - last;
      const dt = Math.max((now - lastT) / 1000, 0.008);
      last = e.clientX;
      lastT = now;
      // the ring follows the finger; the throw speed carries on after release
      st.current.angle -= dx * 0.006;
      st.current.vel = Math.max(-5, Math.min(5, st.current.vel * 0.6 + ((-dx * 0.006) / dt) * 0.4));
    };
    const up = () => {
      last = null;
      st.current.dragging = false;
    };
    const leave = () => {
      up();
      st.current.px = 0;
      st.current.py = 0;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave);
    };
  }, [st]);

  return (
    <div ref={wrapRef} className="cts__canvas">
      <Canvas
        shadows={quality !== 'low'}
        frameloop={active ? 'always' : 'never'}
        dpr={[1, quality === 'low' ? 1.5 : 2]}
        camera={{ position: [0, 0, 20], fov: 36, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000', 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Station st={st} onOver={onOver} onOut={onOut} onPick={onPick} onHub={onHub} shadows={quality !== 'low'} />
      </Canvas>
    </div>
  );
}
