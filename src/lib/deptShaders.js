/**
 * GLSL for the department pages: the radiation aura around each world, the
 * particles it sheds, the space backdrop and the full-screen "inside the
 * world" environment. Same conventions as shaders.js (linear colours in,
 * <colorspace_fragment> out).
 */
import { noise } from './shaders';

const quadVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Covers the screen regardless of camera (plane 2×2 in clip space).
const screenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const hash = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
`;

/* ------------------------------------------------------------------------ */
/*  Light around a world, modelled on what each body really shows            */
/*   Sun:     thin chromosphere rim → K-corona (fast falloff) → faint F-corona, */
/*            with slow, low-contrast streamers                                */
/*   Planets: a thin atmospheric limb (one scale height), brightest on the    */
/*            sunlit side, plus a whisper of forward-scattered haze           */
/* ------------------------------------------------------------------------ */

export const auraShader = {
  vertexShader: quadVertex,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uIntensity;
    uniform float uInner;   // body radius as a fraction of the quad half-size
    uniform float uLimb;    // thin atmospheric limb / chromosphere
    uniform float uHalo;    // scattered haze / inner corona
    uniform float uFaint;   // very wide, very faint outer light
    uniform float uIsSun;
    uniform float uSeed;
    uniform vec2 uLight;    // direction to the light in screen space (planets)
    uniform vec3 uColor;    // near the surface
    uniform vec3 uColor2;   // farther out
    varying vec2 vUv;
    ${noise}
    void main() {
      vec2 c = (vUv - 0.5) * 2.0;
      float d = length(c);
      // 0 at the body's limb → 1 at the quad edge.
      float x = max(d - uInner, 0.0) / (1.0 - uInner);
      vec2 dir = c / max(d, 1e-4);

      // Planets only glow where their air is sunlit; the night limb barely shows.
      float lit = mix(0.12 + 0.88 * smoothstep(-0.55, 0.85, dot(dir, uLight)), 1.0, uIsSun);

      // Coronal streamers: broad, slow, low contrast (sun only).
      float ang = atan(c.y, c.x);
      vec2 a = vec2(cos(ang), sin(ang));
      float s1 = snoise(vec3(a * 1.4 + uSeed, uTime * 0.035)) * 0.5 + 0.5;
      float s2 = snoise(vec3(a * 3.6 - uSeed, uTime * 0.06 + 5.0)) * 0.5 + 0.5;
      float streamer = mix(1.0, 0.72 + 0.56 * s1 * (0.55 + 0.45 * s2), uIsSun);

      float limb = exp(-x * mix(60.0, 48.0, uIsSun)) * uLimb;
      float halo = exp(-x * mix(15.0, 8.0, uIsSun)) * uHalo * streamer;
      float faint = exp(-x * 2.4) * uFaint * mix(1.0, streamer, 0.6);
      float glow = (limb + halo + faint) * lit;

      float edge = 1.0 - smoothstep(0.84, 1.0, d);
      float inside = smoothstep(uInner * 0.985, uInner, d);
      vec3 col = mix(uColor2, uColor, exp(-x * 7.0));
      gl_FragColor = vec4(col, clamp(glow * uIntensity * edge * inside, 0.0, 1.0));
      #include <colorspace_fragment>
    }
  `,
};

/* ------------------------------------------------------------------------ */
/*  Ejecta: motes streaming off the limb (embers for the sun)                */
/* ------------------------------------------------------------------------ */

export const emberShader = {
  vertexShader: /* glsl */ `
    attribute float aAngle;
    attribute float aPhase;
    attribute float aSpeed;
    attribute float aSize;
    uniform float uTime;
    uniform float uRadius;
    uniform float uReach;
    uniform vec3 uCenter;
    uniform float uPixelRatio;
    uniform float uBoost;
    varying float vAlpha;
    void main() {
      float f = fract(aPhase + uTime * aSpeed * (0.6 + uBoost * 0.8));
      float a = aAngle + sin(uTime * 0.3 + aPhase * 6.28) * 0.04;
      vec2 dir = vec2(cos(a), sin(a));
      float r = uRadius * (1.0 + f * uReach);
      vec3 p = uCenter + vec3(dir * r, 0.2);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = aSize * uPixelRatio * (1.0 - f * 0.6);
      vAlpha = sin(f * 3.14159) * smoothstep(0.0, 0.08, f);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(uColor, a * a * vAlpha * uOpacity);
      #include <colorspace_fragment>
    }
  `,
};

/* ------------------------------------------------------------------------ */
/*  Space backdrop: deep navy with a glow pooling up from the world          */
/* ------------------------------------------------------------------------ */

export const backdropShader = {
  vertexShader: screenVertex,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uAspect;
    uniform float uGlow;
    uniform vec3 uTint;
    uniform vec2 uCenter;  // body centre in uv
    uniform float uRadius; // body radius in uv-height units
    varying vec2 vUv;
    ${noise}
    void main() {
      vec2 p = vUv - uCenter;
      p.x *= uAspect;
      float d = length(p) / max(uRadius, 0.001);
      vec3 col = vec3(0.012, 0.016, 0.04);
      // Faint violet/indigo nebula, like the landing sky.
      vec2 q = vec2(vUv.x * uAspect, vUv.y);
      float neb = fbm3(vec3(q * 1.6, uTime * 0.01)) * 0.5 + 0.5;
      col += mix(vec3(0.05, 0.03, 0.14), vec3(0.02, 0.05, 0.13), vUv.x) * neb * 0.7;
      // The world lights the space around it.
      col += uTint * exp(-max(d - 1.0, 0.0) * 1.6) * 0.09 * uGlow;
      col += uTint * exp(-max(d - 1.0, 0.0) * 5.0) * 0.07 * uGlow;
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }
  `,
};

/* ------------------------------------------------------------------------ */
/*  Inside the world: flying low over its surface, under its sky             */
/* ------------------------------------------------------------------------ */

export const environmentShader = {
  vertexShader: screenVertex,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uType;     // 0 rocky, 1 gas, 2 earth, 3 sun, 4 space station
    uniform float uReveal;
    uniform float uWarp;     // atmosphere-entry streaks
    uniform float uTravel;   // distance flown (accumulated on the CPU)
    uniform float uAspect;
    uniform float uSeed;
    uniform float uThin;     // 1 = thin / no atmosphere (stars in the sky)
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    uniform vec3 uAtmo;
    varying vec2 vUv;
    ${noise}
    ${hash}

    vec3 plasma(vec2 sp, float t) {
      vec3 q = vec3(sp * 0.35, t * 0.06);
      float n = fbm3(q + snoise(q * 1.7 + vec3(0.0, 0.0, t * 0.05)) * 0.6);
      float cells = snoise(vec3(sp * 1.6 + n * 1.4, t * 0.25));
      float heat = 0.5 + 0.45 * n + 0.14 * cells;
      vec3 col = mix(uColorB * 0.55, uColorA, smoothstep(0.15, 0.7, heat));
      return mix(col, uColorC, smoothstep(0.68, 1.05, heat));
    }

    vec3 surface(vec2 sp, float t) {
      if (uType > 2.5) return plasma(sp, t);
      float n = fbm3(vec3(sp * 0.22, uSeed));
      float fine = snoise(vec3(sp * 1.1, uSeed * 2.0));
      if (uType > 1.5) {
        // Earth: oceans and continents under drifting cloud decks.
        float land = smoothstep(0.02, 0.14, n + fine * 0.1);
        vec3 ocean = mix(uColorA * 0.7, uColorA * 1.15, fine * 0.5 + 0.5);
        vec3 ground = mix(uColorB, uColorC * 0.8, smoothstep(0.2, 0.55, n));
        vec3 col = mix(ocean, ground, land);
        float clouds = smoothstep(0.05, 0.55, fbm3(vec3(sp * 0.3 + vec2(t * 0.04, 0.0), 7.0 + uSeed)));
        return mix(col, vec3(0.95, 0.97, 1.0), clouds * 0.85);
      }
      if (uType > 0.5) {
        // Gas giant: banded cloud tops, sheared by the wind.
        float warp = n * 1.6 + fine * 0.2;
        float b = sin(sp.x * 0.55 + warp * 2.2) * 0.5 + 0.5;
        float b2 = sin(sp.x * 1.3 + warp * 3.1 + 1.7) * 0.5 + 0.5;
        vec3 col = mix(uColorA, uColorB, b);
        col = mix(col, uColorC, b2 * 0.5);
        float puff = fbm3(vec3(sp * 0.5, t * 0.05 + uSeed));
        return col * (0.85 + puff * 0.3);
      }
      // Rocky: mottled regolith, craters and ridges.
      float m = smoothstep(-0.3, 0.5, n + fine * 0.2);
      vec3 col = mix(uColorA, uColorB, m);
      col = mix(col, uColorC, smoothstep(0.35, 0.9, fine * 0.5 + n) * 0.5);
      float crater = smoothstep(0.55, 0.7, snoise(vec3(sp * 0.7, uSeed * 4.0)));
      return col * (1.0 - crater * 0.3);
    }

    // Inside the station: gliding down the habitat-ring corridor. Navy wall panels,
    // a few ivory ones, gold light bands, and warm light at the far end.
    vec3 corridor(vec2 q) {
      float r = length(q);
      float a = atan(q.y, q.x);
      float z = 0.3 / max(r, 0.015) + uTravel * 0.5;
      vec2 cell = vec2(a / 6.2831853 * 14.0, z * 1.6);
      vec2 f = abs(fract(cell) - 0.5);
      float seam = smoothstep(0.44, 0.5, max(f.x, f.y));
      float hp = hash12(floor(cell) + uSeed);
      vec3 wall = mix(uColorB * 1.35 + 0.012, uColorA * 0.16, step(0.9, hp));
      float band = 1.0 - smoothstep(0.0, 0.03, abs(fract(z * 0.35) - 0.5));
      vec3 col = wall * (1.0 - seam * 0.5) + uColorC * seam * 0.07 + uColorC * band * 0.45;
      col *= smoothstep(0.0, 0.45, r);                   // depth falls into shadow…
      col *= 1.0 - smoothstep(0.35, 0.95, r) * 0.55;     // …and the walls beside us stay quiet
      col += uColorC * exp(-r * 11.0) * 0.45;            // warm light at the far end
      return col;
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime;
      vec2 p = uv - 0.5;
      p.x *= uAspect;
      float hz = 0.36 + sin(p.x * 0.5 + t * 0.15) * 0.006 * step(uType, 3.5);
      vec3 haze = uType > 3.5 ? uColorC * 0.6 : uType > 2.5 ? mix(uColorA, uColorC, 0.4) : uAtmo;
      vec3 col;

      if (uType > 3.5) {
        col = corridor(vec2(p.x, uv.y - hz));
      } else if (uv.y < hz) {
        // Perspective plane: depth grows toward the horizon.
        float dy = hz - uv.y;
        float z = 0.42 / (dy + 0.006);
        vec2 sp = vec2(p.x * z * 1.4, z + uTravel);
        vec3 s = surface(sp, t);
        float fog = 1.0 - exp(-z * 0.09);
        col = mix(s, haze * 0.9, fog);
      } else {
        // Sky: bright limb at the horizon fading to the deep sky above.
        float h = (uv.y - hz) / (1.0 - hz);
        vec3 high = uType > 2.5 ? uColorB * 0.18 : (uType > 1.5 ? vec3(0.015, 0.03, 0.09) : uAtmo * 0.06);
        col = mix(haze * 0.95, high, pow(clamp(h, 0.0, 1.0), 0.45));
        if (uType > 2.5) {
          // Corona loops arcing over the plasma.
          float loops = snoise(vec3(p.x * 2.0, h * 3.0 - t * 0.1, uSeed));
          col += uColorC * smoothstep(0.55, 0.9, loops) * (1.0 - h) * 0.35;
        } else if (uType > 0.5 && uType < 1.5) {
          // High wispy bands overhead on the giants.
          float wisp = fbm3(vec3(p.x * 1.4 + t * 0.03, h * 6.0, uSeed));
          col = mix(col, uColorC * 0.5, smoothstep(0.1, 0.6, wisp) * (1.0 - h) * 0.5);
        }
        // Thin atmospheres show the stars.
        vec2 gs = uv * vec2(uAspect * 220.0, 220.0);
        vec2 g = floor(gs);
        vec2 f = fract(gs) - 0.5;
        float star = step(0.9965, hash12(g)) * smoothstep(0.42, 0.0, length(f)) * (0.55 + 0.45 * sin(t * 2.0 + hash12(g + 7.0) * 30.0));
        col += vec3(star) * smoothstep(0.15, 0.7, h) * mix(0.18, 0.9, uThin);
      }

      // Horizon glow (worlds only).
      col += haze * exp(-abs(uv.y - hz) * 30.0) * 0.45 * step(uType, 3.5);

      // Atmosphere-entry streaks, radiating from the vanishing point.
      vec2 q = vec2(p.x, uv.y - hz);
      float r = length(q);
      float a = atan(q.y, q.x);
      float lane = floor(a * 70.0);
      float hl = hash12(vec2(lane, 3.7));
      float seg = fract(r * 1.4 - uTravel * 0.09 + hl * 9.0);
      float streak = step(0.72, hl) * smoothstep(0.0, 0.12, seg) * (1.0 - smoothstep(0.12, 0.6, seg)) * smoothstep(0.04, 0.45, r);
      col += mix(haze, vec3(1.0), 0.4) * streak * uWarp * 0.9;
      col = mix(col, haze * 1.3 + 0.1, uWarp * 0.22 * (1.0 - smoothstep(0.0, 0.9, r)));

      // Keep it a backdrop: calmer at the top where the copy sits, vignetted.
      col *= mix(1.0, 0.5, smoothstep(0.42, 1.0, uv.y));
      col *= 0.66;
      vec2 v = uv - 0.5;
      col *= 1.0 - dot(v, v) * 0.9;

      gl_FragColor = vec4(col, uReveal);
      #include <colorspace_fragment>
    }
  `,
};
