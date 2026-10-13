import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BODY_BY_KEY, PALETTE, STAR_COLORS, mulberry32 } from '../../config/experience';
import { planetShader, ringShader, skyStarShader, sunShader } from '../../lib/shaders';
import { auraShader, backdropShader, emberShader, environmentShader } from '../../lib/deptShaders';
import { useShaderMaterial } from '../../lib/useShaderMaterial';
import StationModel from '../scene/StationModel';

/**
 * The department page's own WebGL scene. Everything is driven by one mutable
 * state object (`st`, tweened by GSAP in DepartmentView and read here every
 * frame), so nothing re-renders per frame:
 *
 *   st.approach  0 → 1  the world rises into place; its radiation swells as we near it
 *   st.swap      { t, dir }  wheel rotation to the next / previous world
 *   st.dive      0 → 1  fall into the world (it fills the screen from below)
 *   st.warp      0 → 1  atmosphere-entry streaks
 *   st.pointer   NDC pointer → st.hover (0…1 proximity), st.inside (over the disc)
 *
 * The camera never moves: worlds are posed in a fixed, fitted frame (st.layout).
 */

export const CAMERA_Z = 12;
export const CAMERA_FOV = 35;

const PLANET_TYPE = { rocky: 0, gas: 1, earth: 2, sun: 3, station: 4 };
const ADDITIVE = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const AURA_SCALE = 3.4; // aura quad half-size, in body radii
// Tips each world toward the camera: enough for rings to read as ellipses, little elsewhere.
const depthTip = (body) => (body.type === 'station' ? 0.42 : body.ring ? 0.3 : 0.1);
// Real axial tilt — capped for ringed worlds so Uranus' rings don't turn edge-on.
const axialTilt = (body) => (body.type === 'sun' ? 0 : body.ring ? Math.sign(body.tilt) * Math.min(Math.abs(body.tilt), 0.45) : body.tilt ?? 0);
const lerp = THREE.MathUtils.lerp;
const ease = (k, delta) => 1 - Math.exp(-delta * k);

export function createDeptState() {
  return {
    approach: 0,
    dive: 0,
    warp: 0,
    swap: { t: 1, dir: 1 },
    pointer: { x: 0, y: -2, active: false },
    hover: 0,
    inside: false,
    travel: 0,
    layout: { W: 1, H: 1, R: 1, cy: 0, D: 1, theta: 1, cover: 1, aspect: 1, portrait: false },
  };
}

/** Once fully inside a world its interior covers the screen: skip drawing the space view behind it. */
const spaceHidden = (st) => st.dive > 0.985;

/** Body radius for this world (ringed worlds shrink so their rings still read). */
// The station's size is its habitat ring; its solar wings reach ~2.5× further, so it stays narrower.
const radiusFor = (body, L) => L.R * (body.type === 'station' ? (L.portrait ? 0.36 : 0.56) : body.ring ? 0.78 : 1);
// Worlds rise from the bottom edge; the station floats just above it, fully in view.
const liftFor = (body, L) => (body.type === 'station' ? L.R * 0.5 : 0);

/**
 * Where a world sits right now. role: 'current' | 'from' (rotating out) | 'to' (rotating in).
 * The worlds hang off a wheel whose hub is far below the screen, so a swap reads as a rotation.
 */
function poseFor(role, body, st, out) {
  const L = st.layout;
  const R = radiusFor(body, L);
  const t = st.swap.t;
  let a = 0;
  if (role === 'from') a = st.swap.dir * t * L.theta;
  else if (role === 'to') a = -st.swap.dir * (1 - t) * L.theta;

  const dv = st.dive;
  const yc = lerp(L.cy + liftFor(body, L), -L.H * 0.15, dv);
  const rise = (1 - st.approach) * R * 1.15;
  out.x = -L.D * Math.sin(a);
  out.y = yc - L.D + L.D * Math.cos(a) - rise;
  out.rot = a;
  const grow = lerp(1, L.cover / R, dv * dv * (3 - 2 * dv));
  out.r = R * grow * (0.86 + 0.14 * st.approach) * (1 + st.hover * 0.025 * (1 - dv));
  // Rotating-out worlds dim a touch so the incoming one leads.
  out.fade = role === 'from' ? 1 - t * 0.35 : 1;
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Layout + pointer                                                          */
/* -------------------------------------------------------------------------- */

function Controller({ st, rootRef }) {
  const { size } = useThree();
  const last = useRef({ r: -1, top: -1 });

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const L = st.layout;
    const H = 2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    const W = H * (size.width / size.height);
    const portrait = size.width < size.height * 0.9;
    L.W = W;
    L.H = H;
    L.aspect = size.width / size.height;
    L.portrait = portrait;
    // The world rises from the bottom edge: exactly a semicircle is on screen.
    L.R = portrait ? Math.min(W * 0.46, H * 0.3) : Math.min(W * 0.26, H * 0.43);
    L.cy = -H / 2;
    // Wheel hub far below, so a swap swings the world fully off the side.
    const reach = W / 2 + L.R * 2.6;
    L.D = Math.max(H * 1.6, reach / Math.sin(1.05));
    L.theta = Math.asin(Math.min(reach / L.D, 1));
    // Radius that covers the whole screen once dived in (stays in front of the camera).
    L.cover = Math.min(Math.hypot(W / 2, H / 2 + H * 0.15) * 1.06, CAMERA_Z * 0.86);

    // Pointer proximity → radiation swells as you near the world.
    const px = st.pointer.x * (W / 2);
    const py = st.pointer.y * (H / 2);
    const d = Math.hypot(px, py - L.cy);
    const near = st.pointer.active ? 1 - THREE.MathUtils.smoothstep(d, L.R * 0.9, L.R * 2.1) : 0;
    st.hover += (near - st.hover) * ease(4, delta);
    st.inside = st.pointer.active && d < L.R && st.dive < 0.02 && st.swap.t > 0.98;

    // Expose the world's on-screen size to the DOM (buttons sit beside the semicircle).
    const el = rootRef.current;
    if (el) {
      const rPx = Math.round((L.R / W) * size.width);
      const topPx = Math.round(((H / 2 - (L.cy + L.R)) / H) * size.height);
      if (rPx !== last.current.r || topPx !== last.current.top) {
        last.current = { r: rPx, top: topPx };
        el.style.setProperty('--dept-r', `${rPx}px`);
        el.style.setProperty('--dept-top', `${topPx}px`);
      }
      el.classList.toggle('is-over-world', st.inside);
    }

    // Distance flown inside the world (speeds up during entry).
    st.travel += delta * (0.55 + st.warp * 7);
  }, -1);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Backdrop + stars                                                          */
/* -------------------------------------------------------------------------- */

function Backdrop({ st, bodyKey }) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uGlow: { value: 0 },
      uTint: { value: new THREE.Color() },
      uCenter: { value: new THREE.Vector2(0.5, 0) },
      uRadius: { value: 0.3 },
    }),
    [],
  );
  const material = useShaderMaterial(backdropShader, uniforms, { depthTest: false, depthWrite: false });
  const target = useMemo(() => new THREE.Color(), []);

  const mesh = useRef(null);

  useFrame(({ clock }, delta) => {
    mesh.current.visible = !spaceHidden(st);
    if (!mesh.current.visible) return;
    const L = st.layout;
    const body = BODY_BY_KEY[bodyKey];
    target.set(body.atmosphere);
    uniforms.uTint.value.lerp(target, ease(2.5, Math.min(delta, 0.1)));
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uAspect.value = L.aspect;
    uniforms.uCenter.value.set(0.5, 0);
    uniforms.uRadius.value = radiusFor(body, L) / L.H;
    uniforms.uGlow.value = (0.35 + 0.65 * st.approach) * (1 + st.hover * 0.2) * (body.type === 'sun' ? 0.9 : body.type === 'station' ? 0.3 : 0.4);
  });

  return (
    <mesh ref={mesh} material={material} renderOrder={-10} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

function Stars({ st, quality }) {
  const points = useRef(null);
  const count = quality === 'low' ? 700 : 1500;
  const geometry = useMemo(() => {
    const rand = mulberry32(2027);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      positions.set([(rand() - 0.5) * 140, (rand() - 0.5) * 80, -40 - rand() * 20], i * 3);
      c.set(STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)]);
      colors.set([c.r, c.g, c.b], i * 3);
      sizes[i] = 0.7 + Math.pow(rand(), 4) * 3;
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

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } }), []);
  const material = useShaderMaterial(skyStarShader, uniforms, ADDITIVE);

  useFrame(({ clock, gl }, delta) => {
    const p = points.current;
    p.visible = !spaceHidden(st);
    if (!p.visible) return;
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uPixelRatio.value = gl.getPixelRatio();
    uniforms.uOpacity.value = 0.25 + 0.75 * st.approach;
    // Gentle parallax with the pointer; the field streams downward as we dive.
    const k = ease(2, Math.min(delta, 0.1));
    p.position.x += ((st.pointer.active ? -st.pointer.x : 0) * 1.6 - p.position.x) * k;
    p.position.y += ((st.pointer.active ? -st.pointer.y : 0) * 0.9 - st.dive * 6 - p.position.y) * k;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} renderOrder={-5} />;
}

/* -------------------------------------------------------------------------- */
/*  A world: planet / moon / sun, its ring, radiation aura and ejecta         */
/* -------------------------------------------------------------------------- */

/**
 * How much light each body really throws around itself.
 * limb: thin atmosphere / chromosphere · halo: scattered haze / inner corona · faint: wide outer light.
 * Airless worlds (the Moon, Mercury) barely glow; thick or tall atmospheres (Venus, Earth, the ice giants) show a clear limb.
 */
const ATMOSPHERE = {
  sun: { limb: 0.55, halo: 0.48, faint: 0.07 },
  mercury: { limb: 0.05, halo: 0.015, faint: 0 },
  venus: { limb: 0.5, halo: 0.1, faint: 0.012 },
  earth: { limb: 0.6, halo: 0.09, faint: 0.012 },
  moon: { limb: 0.04, halo: 0.012, faint: 0 },
  mars: { limb: 0.22, halo: 0.04, faint: 0.006 },
  jupiter: { limb: 0.3, halo: 0.05, faint: 0.008 },
  saturn: { limb: 0.26, halo: 0.045, faint: 0.008 },
  uranus: { limb: 0.38, halo: 0.07, faint: 0.01 },
  neptune: { limb: 0.42, halo: 0.08, faint: 0.01 },
};
// Screen-space direction of the key light (upper left), matching sunPos in World.
const LIGHT_DIR = new THREE.Vector2(-7, 8).normalize();

function makeAuraUniforms(body) {
  const isSun = body.type === 'sun';
  const a = ATMOSPHERE[body.key] ?? ATMOSPHERE.earth;
  const near = new THREE.Color(isSun ? PALETTE.sunGlowInner : body.atmosphere);
  return {
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uInner: { value: 1 / AURA_SCALE },
    uLimb: { value: a.limb },
    uHalo: { value: a.halo },
    uFaint: { value: a.faint },
    uIsSun: { value: isSun ? 1 : 0 },
    uSeed: { value: body.seed },
    uLight: { value: LIGHT_DIR.clone() },
    uColor: { value: near },
    // Corona reddens outward; planetary haze just thins out in its own colour.
    uColor2: { value: isSun ? new THREE.Color(PALETTE.sunGlowOuter) : near.clone().multiplyScalar(0.7) },
  };
}

function SunSurface() {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: 1 },
      uCore: { value: new THREE.Color(PALETTE.sunCore) },
      uMid: { value: new THREE.Color(PALETTE.sunMid) },
      uEdge: { value: new THREE.Color(PALETTE.sunEdge) },
    }),
    [],
  );
  const material = useShaderMaterial(sunShader, uniforms);
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
  });
  // No separate glow shell: the aura's chromosphere limb hugs the surface instead.
  return (
    <mesh material={material}>
      <sphereGeometry args={[1, 96, 96]} />
    </mesh>
  );
}

function PlanetSurface({ body, spinRef, sunPos }) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: 1 },
      uType: { value: PLANET_TYPE[body.type] },
      uBands: { value: body.bands ?? 8 },
      uSpot: { value: body.spot ?? 0 },
      uSeed: { value: body.seed },
      uSunPos: { value: sunPos },
      uColorA: { value: new THREE.Color(body.colors[0]) },
      uColorB: { value: new THREE.Color(body.colors[1]) },
      uColorC: { value: new THREE.Color(body.colors[2]) },
      uAtmo: { value: new THREE.Color(body.atmosphere) },
      uSpotColor: { value: new THREE.Color(body.spotColor ?? '#000000') },
      // Seen this close, the landing's quantised watercolour light reads as seams: soften it.
      uSmooth: { value: 1 },
    }),
    [body, sunPos],
  );
  const material = useShaderMaterial(planetShader, uniforms);
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh ref={spinRef} material={material}>
      <sphereGeometry args={[1, 96, 96]} />
    </mesh>
  );
}

function Ring({ body, sunPos, groupRef, st }) {
  const uniforms = useMemo(
    () => ({
      uInner: { value: body.ring.inner },
      uOuter: { value: body.ring.outer },
      uReveal: { value: 1 },
      uOpacity: { value: body.ring.opacity },
      uSeed: { value: body.seed },
      uPlanetR: { value: 1 },
      uPlanetPos: { value: new THREE.Vector3() },
      uSunPos: { value: sunPos },
      uColorA: { value: new THREE.Color(body.ring.colors[0]) },
      uColorB: { value: new THREE.Color(body.ring.colors[1]) },
    }),
    [body, sunPos],
  );
  const material = useShaderMaterial(ringShader, uniforms, { transparent: true, depthWrite: false, side: THREE.DoubleSide });
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    g.getWorldPosition(uniforms.uPlanetPos.value);
    uniforms.uPlanetR.value = g.scale.x;
    // The rings would sweep through the camera on a dive: fade them first.
    uniforms.uReveal.value = 1 - THREE.MathUtils.smoothstep(st.dive, 0.05, 0.35);
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={material} renderOrder={3}>
      <ringGeometry args={[body.ring.inner, body.ring.outer, 192, 1]} />
    </mesh>
  );
}

function Ejecta({ body, st, quality, poseRef }) {
  const count = quality === 'low' ? 70 : 150;
  const isSun = body.type === 'sun';
  const geometry = useMemo(() => {
    const rand = mulberry32(Math.floor(body.seed * 1000));
    const angle = new Float32Array(count);
    const phase = new Float32Array(count);
    const speed = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      angle[i] = rand() * Math.PI * 2;
      phase[i] = rand();
      speed[i] = 0.04 + rand() * 0.09;
      sizes[i] = (isSun ? 2.5 : 1.6) + rand() * (isSun ? 4 : 2.6);
    }
    const g = new THREE.BufferGeometry();
    // Positions are computed in the shader; three still needs a position attribute.
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return g;
  }, [body, count, isSun]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRadius: { value: 1 },
      uReach: { value: isSun ? 0.75 : 0.55 },
      uCenter: { value: new THREE.Vector3() },
      uPixelRatio: { value: 1 },
      uBoost: { value: 0 },
      uColor: { value: new THREE.Color(isSun ? '#ffcf7a' : body.atmosphere) },
      uOpacity: { value: 0 },
    }),
    [body, isSun],
  );
  const material = useShaderMaterial(emberShader, uniforms, ADDITIVE);

  const points = useRef(null);
  useFrame(({ clock, gl }) => {
    points.current.visible = !spaceHidden(st);
    if (!points.current.visible) return;
    const p = poseRef.current;
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uPixelRatio.value = gl.getPixelRatio();
    uniforms.uCenter.value.set(p.x, p.y, 0);
    uniforms.uRadius.value = p.r;
    uniforms.uBoost.value = st.hover;
    uniforms.uOpacity.value = (0.12 + 0.18 * st.approach + st.hover * 0.08) * p.fade * (1 - st.dive);
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />;
}

function World({ bodyKey, role, st, quality }) {
  const body = BODY_BY_KEY[bodyKey];
  const isSun = body.type === 'sun';
  const isStation = body.type === 'station';
  const stationReveal = useMemo(() => ({ value: 1 }), []);
  const stationGlow = useMemo(() => ({ value: 0 }), []);
  const group = useRef(null);
  const tilt = useRef(null);
  const spin = useRef(null);
  const pose = useRef({ x: 0, y: 0, r: 1, rot: 0, fade: 1 });
  // Key light from the upper left: a sculpted, sunlit limb with a violet terminator on the right.
  const sunPos = useMemo(() => new THREE.Vector3(), []);
  const auraUniforms = useMemo(() => makeAuraUniforms(body), [body]);
  const auraMaterial = useShaderMaterial(auraShader, auraUniforms, ADDITIVE);
  const spinSpeed = 0.07 * Math.sign(body.dayLength ?? 1);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const p = poseFor(role, body, st, pose.current);
    const g = group.current;
    g.visible = !spaceHidden(st);
    if (!g.visible) return;
    g.position.set(p.x, p.y, 0);
    g.scale.setScalar(p.r);
    g.rotation.z = p.rot;
    sunPos.set(p.x - p.r * 7, p.y + p.r * 8, p.r * 4.5);
    if (spin.current) spin.current.rotation.y += delta * spinSpeed * (1 + st.dive * 4);
    else if (tilt.current) tilt.current.rotation.y += delta * (isStation ? 0.05 : 0.03);
    stationGlow.value = st.hover;

    // Radiation: swells as the world approaches, when the pointer nears it, and on entry.
    auraUniforms.uTime.value = clock.elapsedTime;
    auraUniforms.uIntensity.value =
      (0.4 + 0.6 * st.approach) * (1 + st.hover * 0.22) * (1 + st.dive * 0.9) * p.fade;
  });

  return (
    <>
      <group ref={group}>
        {/* A station has no atmosphere: no aura, just its own lights. */}
        {!isStation && (
          <mesh material={auraMaterial} renderOrder={1}>
            <planeGeometry args={[AURA_SCALE * 2, AURA_SCALE * 2]} />
          </mesh>
        )}
        <group rotation={[depthTip(body), 0, axialTilt(body)]} ref={tilt}>
          {isSun ? (
            <SunSurface />
          ) : isStation ? (
            <StationModel colors={body.colors} sunPos={sunPos} reveal={stationReveal} glow={stationGlow} spin={0.18} lightSize={3} quality={quality} />
          ) : (
            <PlanetSurface body={body} spinRef={spin} sunPos={sunPos} />
          )}
          {body.ring && <Ring body={body} sunPos={sunPos} groupRef={group} st={st} />}
        </group>
      </group>
      {/* World space (not scaled with the body): positioned from the pose in the shader. */}
      {isSun && <Ejecta body={body} st={st} quality={quality} poseRef={pose} />}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inside the world                                                          */
/* -------------------------------------------------------------------------- */

function Environment({ st, bodyKey }) {
  const body = BODY_BY_KEY[bodyKey];
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uType: { value: PLANET_TYPE[body.type] },
      uReveal: { value: 0 },
      uWarp: { value: 0 },
      uTravel: { value: 0 },
      uAspect: { value: 1 },
      uSeed: { value: body.seed },
      uThin: { value: body.key === 'moon' || body.key === 'mercury' ? 1 : body.key === 'mars' ? 0.5 : 0 },
      uColorA: { value: new THREE.Color(body.colors[0]) },
      uColorB: { value: new THREE.Color(body.colors[1]) },
      uColorC: { value: new THREE.Color(body.colors[2]) },
      uAtmo: { value: new THREE.Color(body.atmosphere) },
    }),
    [body],
  );
  const material = useShaderMaterial(environmentShader, uniforms, { transparent: true, depthTest: false, depthWrite: false });
  const mesh = useRef(null);

  useFrame(({ clock }) => {
    const reveal = THREE.MathUtils.smoothstep(st.dive, 0.55, 0.92);
    mesh.current.visible = reveal > 0.001;
    uniforms.uReveal.value = reveal;
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uWarp.value = st.warp;
    uniforms.uTravel.value = st.travel;
    uniforms.uAspect.value = st.layout.aspect;
  });

  return (
    <mesh ref={mesh} material={material} renderOrder={20} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * @param {object} props
 * @param {object} props.st       mutable state (createDeptState)
 * @param {{key:string, role:string}[]} props.worlds  bodies on screen (2 during a swap)
 * @param {string} props.envKey   world whose interior is shown on a dive
 */
export default function DeptScene({ st, worlds, envKey, quality, rootRef }) {
  return (
    <>
      <Controller st={st} rootRef={rootRef} />
      <Backdrop st={st} bodyKey={worlds[worlds.length - 1].key} />
      <Stars st={st} quality={quality} />
      {worlds.map((w) => (
        <World key={w.key} bodyKey={w.key} role={w.role} st={st} quality={quality} />
      ))}
      <Environment key={envKey} st={st} bodyKey={envKey} />
    </>
  );
}
