import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import {
  BELT,
  EARTH_ORBIT_SPEED,
  MOONS,
  ORBIT_SCALE,
  PALETTE,
  PLANETS,
  PLANET_SCALE,
  SCROLL_EARTH_ORBITS,
  SOLAR,
  STATIONS,
  BODIES,
  mulberry32,
} from '../../config/experience';
import StationModel from './StationModel';
import { getScene, useExperience } from '../../store/useExperience';
import { interaction } from '../../lib/interaction';

/** Is this body hovered or focused? (planet index or 'sun') */
/** Eased 0…1 visibility of the whole system (fades out past the explore section). */
const fade = { value: 1 };
/** Eased scroll progress through the explore section → extra simulated time (in Earth orbits). */
const orbitScroll = { value: 0 };
/** Eased 0…1 presence of the explore section (trails glow brighter there). */
const sectionGlow = { value: 0 };
const SCROLL_RADIANS = SCROLL_EARTH_ORBITS * Math.PI * 2;
// Asteroid belt period ≈ 4.6 years → same scaling as the planets.
const BELT_SPEED = (EARTH_ORBIT_SPEED * 365.25) / 1680;
/** Current orbital angle of every planet (read by the motion trails). */
const planetAngles = PLANETS.map((p) => p.angle);

/** Extra angle a body has travelled because of scrolling (true speed ratios). */
const scrollAngle = (speed) => orbitScroll.value * SCROLL_RADIANS * (speed / EARTH_ORBIT_SPEED);
const sysFade = () => fade.value;

function isHighlighted(id) {
  return interaction.hover === id || useExperience.getState().focus === id;
}
import { fresnelShader, particleShader, planetShader, ringShader, sunGlowShader, sunShader } from '../../lib/shaders';
import { useShaderMaterial } from '../../lib/useShaderMaterial';

// World-space sun position (planet lighting + ring shadows use it).
const SUN_WORLD = new THREE.Vector3(...SOLAR.position);
const PLANET_TYPE = { rocky: 0, gas: 1, earth: 2 };
const ADDITIVE = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const ORBIT_SEGMENTS = 256;

/* -------------------------------------------------------------------------- */
/*  Sun: plasma sphere + fresnel shell + two camera-facing corona layers      */
/* -------------------------------------------------------------------------- */

function makeGlowUniforms(intensity, falloff) {
  return {
    uTime: { value: 0 },
    uReveal: { value: 0 },
    uIntensity: { value: intensity },
    uFalloff: { value: falloff },
    uInner: { value: new THREE.Color(PALETTE.sunGlowInner) },
    uOuter: { value: new THREE.Color(PALETTE.sunGlowOuter) },
  };
}

function Sun() {
  const group = useRef(null);
  const glowBoost = useRef(1);
  useEffect(() => {
    interaction.sun = { group: group.current, radius: SOLAR.sunRadius };
    return () => {
      interaction.sun = null;
    };
  }, []);
  const R = SOLAR.sunRadius;
  const sunUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uCore: { value: new THREE.Color(PALETTE.sunCore) },
      uMid: { value: new THREE.Color(PALETTE.sunMid) },
      uEdge: { value: new THREE.Color(PALETTE.sunEdge) },
    }),
    [],
  );
  const fresnelUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(PALETTE.sunFresnel) }, uReveal: { value: 0 } }),
    [],
  );
  const glowUniforms = useMemo(() => makeGlowUniforms(1.0, 2.6), []);
  const haloUniforms = useMemo(() => makeGlowUniforms(0.32, 3.4), []);

  const sunMaterial = useShaderMaterial(sunShader, sunUniforms, { transparent: true });
  const fresnelMaterial = useShaderMaterial(fresnelShader, fresnelUniforms, ADDITIVE);
  const glowMaterial = useShaderMaterial(sunGlowShader, glowUniforms, ADDITIVE);
  const haloMaterial = useShaderMaterial(sunGlowShader, haloUniforms, ADDITIVE);

  useFrame(({ clock }) => {
    const reveal = getScene().sun * sysFade();
    group.current.visible = reveal > 0.002;
    if (!group.current.visible) return;
    const t = clock.elapsedTime;
    // A golden point of light that swells into the full star.
    group.current.scale.setScalar(0.25 + 0.75 * reveal);
    // Hovered / focused: the corona swells a little.
    const target = isHighlighted('sun') ? 1.25 : 1;
    glowBoost.current += (target - glowBoost.current) * 0.08;
    glowUniforms.uIntensity.value = glowBoost.current;
    haloUniforms.uIntensity.value = 0.32 * glowBoost.current;
    for (const u of [sunUniforms, glowUniforms, haloUniforms]) {
      u.uTime.value = t;
      u.uReveal.value = reveal;
    }
    fresnelUniforms.uReveal.value = reveal;
  });

  return (
    <group ref={group}>
      <mesh material={sunMaterial}>
        <sphereGeometry args={[R, 96, 96]} />
      </mesh>
      <mesh material={fresnelMaterial} renderOrder={1}>
        <sphereGeometry args={[R * 1.22, 64, 64]} />
      </mesh>
      <Billboard>
        <mesh renderOrder={3} material={glowMaterial}>
          <planeGeometry args={[R * 7, R * 7]} />
        </mesh>
        <mesh renderOrder={2} material={haloMaterial}>
          <planeGeometry args={[R * 22, R * 22]} />
        </mesh>
      </Billboard>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Planets                                                                   */
/* -------------------------------------------------------------------------- */

/** Watercolour planet-shader uniforms — shared by planets and moons. */
function makePlanetUniforms(data) {
  return {
    uTime: { value: 0 },
    uReveal: { value: 0 },
    uType: { value: PLANET_TYPE[data.type] },
    uBands: { value: data.bands ?? 8 },
    uSpot: { value: data.spot ?? 0 },
    uSeed: { value: data.seed },
    uSunPos: { value: SUN_WORLD.clone() },
    uColorA: { value: new THREE.Color(data.colors[0]) },
    uColorB: { value: new THREE.Color(data.colors[1]) },
    uColorC: { value: new THREE.Color(data.colors[2]) },
    uAtmo: { value: new THREE.Color(data.atmosphere) },
    uSpotColor: { value: new THREE.Color(data.spotColor ?? '#000000') },
  };
}

function PlanetRing({ data, radius, index, planetGroup }) {
  const uniforms = useMemo(
    () => ({
      uInner: { value: radius * data.ring.inner },
      uOuter: { value: radius * data.ring.outer },
      uReveal: { value: 0 },
      uOpacity: { value: data.ring.opacity },
      uSeed: { value: data.seed },
      uPlanetR: { value: radius },
      uPlanetPos: { value: new THREE.Vector3() },
      uSunPos: { value: SUN_WORLD.clone() },
      uColorA: { value: new THREE.Color(data.ring.colors[0]) },
      uColorB: { value: new THREE.Color(data.ring.colors[1]) },
    }),
    [data, radius],
  );
  // The ring passes both in front of and behind the planet: transparent, double-sided,
  // depth-tested against the opaque-writing planet sphere.
  const material = useShaderMaterial(ringShader, uniforms, {
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  useFrame(() => {
    const v = (getScene().planets[index]?.v ?? 0) * sysFade();
    uniforms.uReveal.value = Math.min(v, 1);
    if (planetGroup.current) {
      planetGroup.current.getWorldPosition(uniforms.uPlanetPos.value);
      uniforms.uPlanetR.value = radius * planetGroup.current.scale.x;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <ringGeometry args={[radius * data.ring.inner, radius * data.ring.outer, 160, 1]} />
    </mesh>
  );
}

function Planet({ data, index }) {
  const orbitGroup = useRef(null);
  const body = useRef(null);
  const angle = useRef(data.angle);
  const radius = data.radius * PLANET_SCALE;
  const orbit = data.orbit * ORBIT_SCALE;

  const uniforms = useMemo(() => makePlanetUniforms(data), [data]);
  const material = useShaderMaterial(planetShader, uniforms, { transparent: true });
  const boost = useRef(1);

  useEffect(() => {
    interaction.bodies[index] = { group: orbitGroup.current, radius };
    return () => {
      interaction.bodies[index] = null;
    };
  }, [index, radius]);

  useFrame(({ clock }, delta) => {
    const v = (getScene().planets[index]?.v ?? 0) * sysFade();
    // Planets keep revolving forever, revealed or not, so the landing never "resets".
    angle.current += delta * data.speed;
    const g = orbitGroup.current;
    g.visible = v > 0.002;
    if (!g.visible) return;
    // Real-time orbit + scroll-driven orbit, both at the planet's true relative speed.
    const a = angle.current + scrollAngle(data.speed);
    planetAngles[index] = a;
    g.position.set(Math.cos(a) * orbit, 0, -Math.sin(a) * orbit);
    // Hovered / focused planets swell gently.
    boost.current += ((isHighlighted(index) ? 1.22 : 1) - boost.current) * (1 - Math.exp(-delta * 8));
    g.scale.setScalar((0.6 + 0.4 * Math.min(v, 1)) * boost.current);
    body.current.rotation.y += delta * data.spin;
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uReveal.value = Math.min(v, 1);
  });

  return (
    <group ref={orbitGroup}>
      <group rotation={[0, 0, data.tilt]}>
        <mesh ref={body} material={material}>
          <sphereGeometry args={[radius, 64, 64]} />
        </mesh>
        {data.ring && <PlanetRing data={data} radius={radius} index={index} planetGroup={orbitGroup} />}
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Moons: orbit their parent planet, same look + interactions as planets     */
/* -------------------------------------------------------------------------- */

const MOON_RING_SEGMENTS = 96;

function Moon({ data, index }) {
  const parentIndex = PLANETS.findIndex((p) => p.name === data.parent);
  const group = useRef(null);
  const body = useRef(null);
  const ring = useRef(null);
  const angle = useRef(data.angle);
  const boost = useRef(1);
  const glow = useRef(0);
  const radius = data.radius * PLANET_SCALE;

  const uniforms = useMemo(() => makePlanetUniforms(data), [data]);
  const material = useShaderMaterial(planetShader, uniforms, { transparent: true });

  // Thin gold orbit around the parent, tilted by the moon's real inclination.
  const { ringGeometry, ringMaterial } = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= MOON_RING_SEGMENTS; i++) {
      const a = (i / MOON_RING_SEGMENTS) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * data.distance, 0, -Math.sin(a) * data.distance));
    }
    return {
      ringGeometry: new THREE.BufferGeometry().setFromPoints(pts),
      ringMaterial: new THREE.LineBasicMaterial({
        color: PALETTE.orbit,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    };
  }, [data]);

  useEffect(() => {
    interaction.bodies[index] = { group: group.current, radius };
    return () => {
      interaction.bodies[index] = null;
      ringGeometry.dispose();
      ringMaterial.dispose();
    };
  }, [index, radius, ringGeometry, ringMaterial]);

  useFrame(({ clock }, delta) => {
    const s = getScene();
    // Revealed together with its parent planet.
    const v = (s.planets[parentIndex]?.v ?? 0) * sysFade();
    angle.current += delta * data.speed;
    const parent = interaction.bodies[parentIndex]?.group;
    const g = group.current;
    const visible = v > 0.002 && !!parent;
    g.visible = visible;
    ring.current.visible = visible;
    if (!visible) return;

    // Real-time + scroll-driven orbit at the moon's true relative speed, on an inclined plane.
    const a = angle.current + scrollAngle(data.speed);
    const d = data.distance;
    const ci = Math.cos(data.inclination);
    const si = Math.sin(data.inclination);
    g.position.set(parent.position.x + Math.cos(a) * d, parent.position.y + Math.sin(a) * d * si, parent.position.z - Math.sin(a) * d * ci);
    ring.current.position.copy(parent.position);

    boost.current += ((isHighlighted(index) ? 1.35 : 1) - boost.current) * (1 - Math.exp(-delta * 8));
    g.scale.setScalar((0.6 + 0.4 * Math.min(v, 1)) * boost.current);
    // Tidally locked: the same face always turns toward the parent planet.
    body.current.rotation.y = a + Math.PI / 2;

    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uReveal.value = Math.min(v, 1);

    glow.current += ((isHighlighted(index) ? 1 : 0) - glow.current) * (1 - Math.exp(-delta * 7));
    const o = s.orbits * sysFade();
    ringMaterial.opacity = Math.min(o * 1.4, 1) * (0.22 + glow.current * 0.6);
  });

  return (
    <>
      <group ref={group}>
        <group rotation={[0, 0, data.tilt]}>
          <mesh ref={body} material={material}>
            <sphereGeometry args={[radius, 48, 48]} />
          </mesh>
        </group>
      </group>
      <line ref={ring} geometry={ringGeometry} material={ringMaterial} rotation={[data.inclination, 0, 0]} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Space station: its own orbit (dashed), same reveal / hover / focus rules  */
/* -------------------------------------------------------------------------- */

// Revealed together with the planet just inside its orbit (Mars).
const STATION_REVEAL_WITH = PLANETS.findIndex((p) => p.name === 'Mars');
const STATION_ORBIT_SEGMENTS = 256;

function Station({ data, index }) {
  const orbitGroup = useRef(null);
  const angle = useRef(data.angle);
  const boost = useRef(1);
  const lineGlow = useRef(0);
  const size = data.size * PLANET_SCALE;
  const radius = data.radius * PLANET_SCALE;
  const orbit = data.orbit * ORBIT_SCALE;
  const sunPos = useMemo(() => SUN_WORLD.clone(), []);
  const reveal = useMemo(() => ({ value: 0 }), []);
  const glow = useMemo(() => ({ value: 0 }), []);

  // Dashed gold orbit: reads as a constructed path, distinct from the planets' orbits.
  const { line, lineMaterial } = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= STATION_ORBIT_SEGMENTS; i++) {
      const a = (i / STATION_ORBIT_SEGMENTS) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * orbit, 0, -Math.sin(a) * orbit));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const l = new THREE.Line(
      geometry,
      new THREE.LineDashedMaterial({ color: PALETTE.orbit, dashSize: 0.9, gapSize: 0.7, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
    );
    l.computeLineDistances();
    return { line: l, lineMaterial: l.material };
  }, [orbit]);

  useEffect(() => {
    interaction.bodies[index] = { group: orbitGroup.current, radius };
    return () => {
      interaction.bodies[index] = null;
      line.geometry.dispose();
      lineMaterial.dispose();
    };
  }, [index, radius, line, lineMaterial]);

  useFrame((_, delta) => {
    const s = getScene();
    const v = (s.planets[STATION_REVEAL_WITH]?.v ?? 0) * sysFade();
    angle.current += delta * data.speed;
    const g = orbitGroup.current;
    g.visible = v > 0.002;
    const k = 1 - Math.exp(-delta * 8);
    const hot = isHighlighted(index) ? 1 : 0;
    lineGlow.current += (hot - lineGlow.current) * (1 - Math.exp(-delta * 7));
    const o = Math.min(s.orbits * sysFade() * 1.4, 1);
    lineMaterial.opacity = o * (0.26 + lineGlow.current * 0.5);
    line.visible = o > 0.002;
    if (!g.visible) return;
    const a = angle.current + scrollAngle(data.speed);
    g.position.set(Math.cos(a) * orbit, 0, -Math.sin(a) * orbit);
    boost.current += ((hot ? 1.22 : 1) - boost.current) * k;
    g.scale.setScalar((0.6 + 0.4 * Math.min(v, 1)) * boost.current);
    reveal.value = Math.min(v, 1);
    glow.value += (hot - glow.value) * k;
  });

  return (
    <>
      <primitive object={line} />
      <group ref={orbitGroup}>
        {/* Gently tipped so the ring reads as an ellipse from the landing camera. */}
        <group rotation={[0.28, 0, 0.22]} scale={size}>
          <StationModel colors={data.colors} sunPos={sunPos} reveal={reveal} glow={glow} spin={0.35} lightSize={1.8} />
        </group>
      </group>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Orbit rings that draw themselves in + asteroid belt                       */
/* -------------------------------------------------------------------------- */

function OrbitLines() {
  const geometries = useMemo(
    () =>
      PLANETS.map((p) => {
        const r = p.orbit * ORBIT_SCALE;
        const pts = [];
        for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
          const a = (i / ORBIT_SEGMENTS) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * r, 0, -Math.sin(a) * r));
        }
        return new THREE.BufferGeometry().setFromPoints(pts);
      }),
    [],
  );
  // One material per orbit so a hovered / focused planet's orbit can light up.
  const materials = useMemo(
    () =>
      PLANETS.map(
        () =>
          new THREE.LineBasicMaterial({
            color: PALETTE.orbit,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [],
  );
  const glow = useRef(PLANETS.map(() => 0));

  useEffect(
    () => () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
    [geometries, materials],
  );

  useFrame((_, delta) => {
    const o = getScene().orbits * sysFade();
    const base = Math.min(o * 1.4, 1) * 0.32;
    const k = 1 - Math.exp(-delta * 7);
    materials.forEach((m, i) => {
      glow.current[i] += ((isHighlighted(i) ? 1 : 0) - glow.current[i]) * k;
      m.opacity = base + glow.current[i] * 0.55 * Math.min(o * 1.4, 1);
    });
    geometries.forEach((g, i) => {
      // Inner orbits finish drawing first.
      const progress = THREE.MathUtils.clamp(o * 1.5 - i * 0.06, 0, 1);
      g.setDrawRange(0, Math.floor(progress * ORBIT_SEGMENTS) + (progress > 0 ? 1 : 0));
    });
  });

  return geometries.map((g, i) => (
    // Plain THREE.Line (not LineLoop) so a partial draw range reads as an arc being traced.
    <line key={PLANETS[i].name} geometry={g} material={materials[i]} />
  ));
}

function AsteroidBelt({ quality }) {
  const points = useRef(null);
  const beltAngle = useRef(0);
  const count = quality === 'low' ? BELT.low : BELT.high;
  const geometry = useMemo(() => {
    const rand = mulberry32(777);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const gold = new THREE.Color(PALETTE.belt);
    const dust = new THREE.Color('#8a8296');
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = (BELT.inner + (rand() + rand()) * 0.5 * BELT.width) * ORBIT_SCALE;
      positions.set([Math.cos(a) * r, (rand() - 0.5) * 0.7, -Math.sin(a) * r], i * 3);
      c.copy(dust).lerp(gold, rand());
      colors.set([c.r, c.g, c.b], i * 3);
      sizes[i] = 0.3 + Math.pow(rand(), 3) * 1.1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return g;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({ uOpacity: { value: 0 }, uPixelRatio: { value: 1 }, uScale: { value: 70 } }),
    [],
  );
  const material = useShaderMaterial(particleShader, uniforms, ADDITIVE);

  useFrame(({ gl }, delta) => {
    const o = getScene().orbits * sysFade();
    points.current.visible = o > 0.002;
    beltAngle.current += delta * BELT_SPEED;
    points.current.rotation.y = beltAngle.current + scrollAngle(BELT_SPEED);
    uniforms.uOpacity.value = o * 0.85;
    uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  return <points ref={points} geometry={geometry} material={material} />;
}

/* -------------------------------------------------------------------------- */
/*  Motion trails: a soft golden arc fading out behind each planet            */
/* -------------------------------------------------------------------------- */

const TRAIL_POINTS = 48;
const TRAIL_LENGTH = 9; // world units along the orbit, same visual length for every planet

function MotionTrails() {
  const { geometries, material } = useMemo(() => {
    const head = new THREE.Color(PALETTE.orbit);
    const geos = PLANETS.map(() => {
      const g = new THREE.BufferGeometry();
      const positions = new Float32Array(TRAIL_POINTS * 3);
      const colors = new Float32Array(TRAIL_POINTS * 3);
      for (let i = 0; i < TRAIL_POINTS; i++) {
        // Additive blending: fading the colour to black fades the trail out.
        const t = Math.pow(i / (TRAIL_POINTS - 1), 1.6);
        colors.set([head.r * t, head.g * t, head.b * t], i * 3);
      }
      g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return g;
    });
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geometries: geos, material: mat };
  }, []);

  useEffect(
    () => () => {
      geometries.forEach((g) => g.dispose());
      material.dispose();
    },
    [geometries, material],
  );

  useFrame(() => {
    const vis = getScene().orbits * sysFade();
    material.opacity = vis * (0.35 + 0.65 * sectionGlow.value);
    if (material.opacity < 0.002) return;
    PLANETS.forEach((p, i) => {
      const r = p.orbit * ORBIT_SCALE;
      const arc = TRAIL_LENGTH / r;
      const head = planetAngles[i];
      const attr = geometries[i].attributes.position;
      for (let k = 0; k < TRAIL_POINTS; k++) {
        const a = head - arc + (arc * k) / (TRAIL_POINTS - 1);
        attr.setXYZ(k, Math.cos(a) * r, 0, -Math.sin(a) * r);
      }
      attr.needsUpdate = true;
    });
  });

  return geometries.map((g, i) => <line key={PLANETS[i].name} geometry={g} material={material} frustumCulled={false} />);
}

export default function SolarSystem({ quality }) {
  useFrame((_, delta) => {
    const k = 1 - Math.exp(-Math.min(delta, 0.1) * 5);
    fade.value += (interaction.systemFade - fade.value) * k;
    // Scroll-driven revolution is eased so wheel steps glide instead of jumping.
    orbitScroll.value += (interaction.orbitScroll - orbitScroll.value) * (1 - Math.exp(-Math.min(delta, 0.1) * 3));
    sectionGlow.value += (interaction.section - sectionGlow.value) * k;
  });

  return (
    <group position={SOLAR.position}>
      <Sun />
      {/* Ecliptic tilted ~18° for a diagonal, editorial composition. */}
      <group rotation={[0.08, 0, THREE.MathUtils.degToRad(-SOLAR.tiltDeg)]}>
        {PLANETS.map((planet, i) => (
          <Planet key={planet.name} data={planet} index={i} />
        ))}
        {MOONS.map((moon, i) => (
          <Moon key={moon.name} data={moon} index={PLANETS.length + i} />
        ))}
        {STATIONS.map((station) => (
          <Station key={station.key} data={station} index={BODIES.findIndex((b) => b.key === station.key)} />
        ))}
        <OrbitLines />
        <MotionTrails />
        <AsteroidBelt quality={quality} />
      </group>
    </group>
  );
}
