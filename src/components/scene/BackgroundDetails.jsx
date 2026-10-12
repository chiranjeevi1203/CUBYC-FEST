import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { BACKGROUND, mulberry32 } from '../../config/experience';
import { getScene } from '../../store/useExperience';
import { interaction } from '../../lib/interaction';
import { cometShader, skyStarShader } from '../../lib/shaders';
import { useShaderMaterial } from '../../lib/useShaderMaterial';

const SHELL = 620;
// The galactic band's orientation: its plane contains the landing view direction
// (down toward the sun), rolled so it crosses the frame diagonally.
const BAND_ROTATION = new THREE.Euler(-0.78, 0, 0.5);
// Longitude of the bright galactic core on the band (in view, offset from the sun).
const CORE_LON = Math.PI * 1.5 + 0.38;
const coreWeight = (lon, k) => {
  const d = Math.atan2(Math.sin(lon - CORE_LON), Math.cos(lon - CORE_LON));
  return Math.exp(-d * d * k);
};
const ADDITIVE = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

function gaussian(rand) {
  return Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-6))) * Math.cos(2 * Math.PI * rand());
}

function canvasTexture(size, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  paint(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* -------------------------------------------------------------------------- */
/*  Milky Way: a dense, dusty band of stars across the sky + soft glow        */
/* -------------------------------------------------------------------------- */

function MilkyWay({ count }) {
  const { geometry, glowSprites, glowTexture } = useMemo(() => {
    const rand = mulberry32(3141);
    const positions = [];
    const colors = [];
    const sizes = [];
    const phases = [];
    const warm = new THREE.Color('#ffd9a8');
    const cool = new THREE.Color('#c8d6ff');
    const white = new THREE.Color('#ffffff');
    const c = new THREE.Color();
    let placed = 0;
    while (placed < count) {
      const lon = rand() * Math.PI * 2;
      const width = 0.11 * (1 + 0.6 * Math.sin(lon * 3 + 1.2)) * (1 + 0.9 * coreWeight(lon, 2));
      const lat = gaussian(rand) * width;
      // Dark dust lane down the middle of the band.
      if (Math.abs(lat) < width * 0.18 && rand() < 0.65) continue;
      const cl = Math.cos(lat);
      positions.push(cl * Math.cos(lon) * SHELL, Math.sin(lat) * SHELL, cl * Math.sin(lon) * SHELL);
      const core = coreWeight(lon, 1.5);
      c.copy(cool).lerp(white, rand() * 0.6).lerp(warm, core * 0.8 * rand());
      colors.push(c.r, c.g, c.b);
      sizes.push(0.7 + Math.pow(rand(), 5) * 2.4);
      phases.push(rand());
      placed++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));

    const tex = canvasTexture(256, (ctx, s) => {
      const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, 'rgba(255,255,255,0.55)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.18)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);
    });
    const sprites = Array.from({ length: 14 }, (_, i) => {
      const lon = (i / 14) * Math.PI * 2 + rand() * 0.2;
      const core = coreWeight(lon, 1.5);
      return {
        position: [Math.cos(lon) * SHELL * 0.97, gaussian(rand) * 8, Math.sin(lon) * SHELL * 0.97],
        size: 150 + rand() * 120 + core * 140,
        color: new THREE.Color(core > 0.4 ? '#ffcf9a' : i % 2 ? '#8a7cff' : '#9fb6ff'),
        opacity: 0.05 + core * 0.08 + rand() * 0.03,
      };
    });
    return { geometry: g, glowSprites: sprites, glowTexture: tex };
  }, [count]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } }), []);
  const material = useShaderMaterial(skyStarShader, uniforms, ADDITIVE);
  const glowMaterials = useMemo(
    () =>
      glowSprites.map(
        (s) => new THREE.MeshBasicMaterial({ map: glowTexture, color: s.color, ...ADDITIVE, opacity: 0, toneMapped: false }),
      ),
    [glowSprites, glowTexture],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      glowTexture.dispose();
      glowMaterials.forEach((m) => m.dispose());
    },
    [geometry, glowTexture, glowMaterials],
  );

  useFrame(({ clock, gl }) => {
    const s = getScene();
    const vis = s.stars * (1 - s.speed * 0.75);
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uOpacity.value = vis;
    uniforms.uPixelRatio.value = gl.getPixelRatio();
    glowMaterials.forEach((m, i) => {
      m.opacity = glowSprites[i].opacity * vis;
    });
  });

  return (
    <group rotation={BAND_ROTATION}>
      <MilkyWayBand />
      <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-6} />
      {glowSprites.map((s, i) => (
        <Billboard key={i} position={s.position}>
          <mesh material={glowMaterials[i]} renderOrder={-7}>
            <planeGeometry args={[s.size, s.size * 0.55]} />
          </mesh>
        </Billboard>
      ))}
    </group>
  );
}

/** Continuous luminous band (dust clouds, dark lane, warm core) painted on a canvas. */
function paintBand(ctx, w, h, rand, coreU) {
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 1400; i++) {
    const u = rand();
    const du = Math.min(Math.abs(u - coreU), 1 - Math.abs(u - coreU));
    const core = Math.exp(-du * du * 40);
    const v = 0.5 + gaussian(rand) * (0.1 + core * 0.08);
    const r = (6 + rand() * 34) * (1 + core * 0.8);
    const x = u * w;
    const y = v * h;
    const col = core > 0.35 && rand() < 0.7 ? '255,206,150' : rand() < 0.5 ? '160,178,255' : '196,180,255';
    const a = (0.035 + rand() * 0.06) * (0.6 + core);
    for (const ox of [x, x - w, x + w]) {
      const g = ctx.createRadialGradient(ox, y, 0, ox, y, r);
      g.addColorStop(0, `rgba(${col},${a})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(ox - r, y - r, r * 2, r * 2);
    }
  }
  // Dark dust lane wandering along the middle.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1600; i++) {
    const u = rand();
    const y = h * (0.5 + Math.sin(u * Math.PI * 6) * 0.03 + gaussian(rand) * 0.018);
    const r = 2 + rand() * 6;
    const g = ctx.createRadialGradient(u * w, y, 0, u * w, y, r);
    g.addColorStop(0, 'rgba(0,0,0,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(u * w - r, y - r, r * 2, r * 2);
  }
  // Feather the top / bottom edges.
  ctx.globalCompositeOperation = 'destination-in';
  const fade = ctx.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(0.3, 'rgba(0,0,0,1)');
  fade.addColorStop(0.7, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
}

function MilkyWayBand() {
  const { texture, material } = useMemo(() => {
    const rand = mulberry32(2718);
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 256;
    // CylinderGeometry: x = r·sin(θ), z = r·cos(θ); the band uses (cos lon, sin lon) → θ = π/2 − lon.
    const coreU = (((Math.PI / 2 - CORE_LON) / (Math.PI * 2)) % 1 + 1) % 1;
    paintBand(canvas.getContext('2d'), canvas.width, canvas.height, rand, coreU);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      ...ADDITIVE,
      side: THREE.BackSide,
      opacity: 0,
      toneMapped: false,
    });
    return { texture: tex, material: mat };
  }, []);

  useEffect(
    () => () => {
      texture.dispose();
      material.dispose();
    },
    [texture, material],
  );

  useFrame(() => {
    const s = getScene();
    // Subtle during the intro (the galaxy owns that shot), full on the landing page.
    material.opacity = 0.5 * s.stars * (1 - s.speed * 0.8) * (0.3 + 0.7 * s.parallax);
  });

  return (
    <mesh material={material} renderOrder={-8} frustumCulled={false}>
      <cylinderGeometry args={[SHELL * 0.99, SHELL * 0.99, SHELL * 0.42, 128, 1, true]} />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Distant spiral galaxies                                                   */
/* -------------------------------------------------------------------------- */

function paintGalaxy(ctx, s, rand, warm) {
  const cx = s / 2;
  const cy = s / 2;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.28);
  core.addColorStop(0, warm ? 'rgba(255,230,190,0.9)' : 'rgba(225,235,255,0.9)');
  core.addColorStop(0.3, warm ? 'rgba(255,190,130,0.25)' : 'rgba(150,170,255,0.25)');
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) {
    const arm = i % 2;
    const t = Math.pow(rand(), 0.7);
    const angle = t * 4.6 + arm * Math.PI;
    const r = t * s * 0.46;
    const spread = (rand() - 0.5) * s * 0.07 * (0.4 + t);
    const x = cx + Math.cos(angle) * r + Math.cos(angle + Math.PI / 2) * spread;
    const y = cy + Math.sin(angle) * r + Math.sin(angle + Math.PI / 2) * spread;
    const a = (1 - t) * 0.55 + 0.1;
    ctx.fillStyle = t < 0.25 ? `rgba(255,225,190,${a})` : `rgba(${170 + rand() * 60},${190 + rand() * 50},255,${a})`;
    ctx.fillRect(x, y, 1.2, 1.2);
  }
}

function DistantGalaxies({ count }) {
  const items = useMemo(() => {
    const rand = mulberry32(777);
    return Array.from({ length: count }, (_, i) => {
      const u = rand() * 1.4 - 0.7;
      const theta = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const texture = canvasTexture(256, (ctx, s) => paintGalaxy(ctx, s, rand, i % 2 === 0));
      return {
        position: [r * Math.cos(theta) * SHELL * 0.95, u * SHELL * 0.95, r * Math.sin(theta) * SHELL * 0.95],
        size: 26 + rand() * 34,
        squash: 0.35 + rand() * 0.5,
        roll: rand() * Math.PI,
        texture,
        material: new THREE.MeshBasicMaterial({ map: texture, ...ADDITIVE, opacity: 0, toneMapped: false }),
      };
    });
  }, [count]);

  useEffect(
    () => () =>
      items.forEach((g) => {
        g.texture.dispose();
        g.material.dispose();
      }),
    [items],
  );

  useFrame(() => {
    const s = getScene();
    const vis = s.stars * (1 - s.speed * 0.8);
    items.forEach((g) => {
      g.material.opacity = 0.7 * vis;
    });
  });

  return items.map((g, i) => (
    <Billboard key={i} position={g.position}>
      <mesh material={g.material} rotation={[0, 0, g.roll]} scale={[1, g.squash, 1]} renderOrder={-6}>
        <planeGeometry args={[g.size, g.size]} />
      </mesh>
    </Billboard>
  ));
}

/* -------------------------------------------------------------------------- */
/*  Bright stars with diffraction spikes                                      */
/* -------------------------------------------------------------------------- */

function FlareStars({ count }) {
  const meshes = useRef([]);
  const { items, texture } = useMemo(() => {
    const rand = mulberry32(99);
    const tex = canvasTexture(128, (ctx, s) => {
      const c = s / 2;
      const glow = ctx.createRadialGradient(c, c, 0, c, c, c * 0.5);
      glow.addColorStop(0, 'rgba(255,255,255,1)');
      glow.addColorStop(0.15, 'rgba(255,255,255,0.6)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, s, s);
      const spike = (horizontal) => {
        const g = horizontal ? ctx.createLinearGradient(0, c, s, c) : ctx.createLinearGradient(c, 0, c, s);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.95)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        if (horizontal) ctx.fillRect(0, c - 0.75, s, 1.5);
        else ctx.fillRect(c - 0.75, 0, 1.5, s);
      };
      spike(true);
      spike(false);
    });
    const tints = ['#ffffff', '#dfe8ff', '#ffe6c2', '#cfd8ff'];
    const list = Array.from({ length: count }, () => {
      const u = rand() * 1.6 - 0.8;
      const theta = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      return {
        position: [r * Math.cos(theta) * SHELL * 0.9, u * SHELL * 0.9, r * Math.sin(theta) * SHELL * 0.9],
        size: 6 + rand() * 9,
        phase: rand() * Math.PI * 2,
        speed: 0.6 + rand() * 1.4,
        material: new THREE.MeshBasicMaterial({
          map: tex,
          color: tints[Math.floor(rand() * tints.length)],
          ...ADDITIVE,
          opacity: 0,
          toneMapped: false,
        }),
      };
    });
    return { items: list, texture: tex };
  }, [count]);

  useEffect(
    () => () => {
      texture.dispose();
      items.forEach((f) => f.material.dispose());
    },
    [items, texture],
  );

  useFrame(({ clock }) => {
    const s = getScene();
    const vis = s.stars * (1 - s.speed * 0.8);
    const t = clock.elapsedTime;
    items.forEach((f, i) => {
      const tw = 0.7 + 0.3 * Math.sin(t * f.speed + f.phase);
      f.material.opacity = vis * tw;
      const m = meshes.current[i];
      if (m) m.scale.setScalar(0.85 + tw * 0.3);
    });
  });

  return items.map((f, i) => (
    <Billboard key={i} position={f.position}>
      <mesh
        ref={(m) => {
          meshes.current[i] = m;
        }}
        material={f.material}
        renderOrder={-5}
      >
        <planeGeometry args={[f.size, f.size]} />
      </mesh>
    </Billboard>
  ));
}

/* -------------------------------------------------------------------------- */
/*  Shooting stars — random on the landing page, or launched by a click       */
/* -------------------------------------------------------------------------- */

const SHOOT_DEPTH = 80;
const POOL = 5;

function ShootingStar({ register }) {
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#fff4dc') }, uOpacity: { value: 0 } }), []);
  const material = useShaderMaterial(cometShader, uniforms, ADDITIVE);
  return (
    <mesh ref={register} material={material} visible={false} frustumCulled={false}>
      <planeGeometry args={[0.45, 15]} />
    </mesh>
  );
}

function ShootingStars() {
  const group = useRef(null);
  const meshes = useRef([]);
  const slots = useRef(Array.from({ length: POOL }, () => ({ active: false })));
  const nextRandom = useRef(4);

  useFrame(({ camera, clock }, delta) => {
    const s = getScene();
    const t = clock.elapsedTime;
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);

    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * SHOOT_DEPTH;
    const halfW = halfH * camera.aspect;
    const launch = (x, y, fromClick) => {
      const slot = slots.current.find((sl) => !sl.active);
      if (!slot) return;
      const dirX = (fromClick ? (Math.random() < 0.5 ? -1 : 1) : x > 0 ? -1 : 1) * (0.7 + Math.random() * 0.3);
      const dirY = -(0.25 + Math.random() * 0.45);
      const len = Math.hypot(dirX, dirY);
      Object.assign(slot, {
        active: true,
        x,
        y,
        dx: dirX / len,
        dy: dirY / len,
        distance: 35 + Math.random() * 35,
        duration: 0.9 + Math.random() * 0.6,
        p: 0,
      });
    };

    // Clicks on empty space launch a star right from the cursor.
    while (interaction.spawns.length) {
      const sp = interaction.spawns.shift();
      launch(sp.x * halfW, sp.y * halfH, true);
    }
    // Random ones once the landing page is live.
    if (s.parallax > 0.5 && t > nextRandom.current) {
      launch((Math.random() * 1.6 - 0.8) * halfW, (0.2 + Math.random() * 0.7) * halfH, false);
      const [a, b] = BACKGROUND.shootingEvery;
      nextRandom.current = t + a + Math.random() * (b - a);
    } else if (s.parallax <= 0.5) {
      nextRandom.current = t + 3;
    }

    slots.current.forEach((sl, i) => {
      const m = meshes.current[i];
      if (!m) return;
      if (!sl.active) {
        m.visible = false;
        return;
      }
      sl.p += delta / sl.duration;
      if (sl.p >= 1) {
        sl.active = false;
        m.visible = false;
        return;
      }
      m.visible = true;
      m.position.set(sl.x + sl.dx * sl.distance * sl.p, sl.y + sl.dy * sl.distance * sl.p, -SHOOT_DEPTH);
      m.rotation.set(0, 0, Math.atan2(sl.dy, sl.dx) - Math.PI / 2);
      m.material.uniforms.uOpacity.value = Math.sin(Math.PI * sl.p);
    });
  });

  return (
    <group ref={group}>
      {Array.from({ length: POOL }, (_, i) => (
        <ShootingStar
          key={i}
          register={(m) => {
            meshes.current[i] = m;
          }}
        />
      ))}
    </group>
  );
}

/**
 * Extra depth behind the solar system: Milky Way band, distant galaxies and
 * flaring stars on a camera-locked sky shell, plus shooting stars.
 */
export default function BackgroundDetails({ quality }) {
  const shell = useRef(null);
  const low = quality === 'low';

  useFrame(({ camera }) => {
    const s = getScene();
    shell.current.position.copy(camera.position);
    // Counter-rotate gently with the pointer for a deep parallax layer.
    shell.current.rotation.set(s.pointer.y * 0.01, -s.pointer.x * 0.016 + interaction.yaw * 0.05, 0);
  });

  return (
    <>
      <group ref={shell}>
        <MilkyWay count={low ? BACKGROUND.milkyWay.low : BACKGROUND.milkyWay.high} />
        <DistantGalaxies count={BACKGROUND.galaxies} />
        <FlareStars count={low ? BACKGROUND.flareStars.low : BACKGROUND.flareStars.high} />
      </group>
      <ShootingStars />
    </>
  );
}
