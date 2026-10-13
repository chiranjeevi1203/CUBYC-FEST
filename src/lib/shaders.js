/**
 * GLSL for every procedural surface in the loader.
 * Colours arrive as THREE.Color uniforms (linear space); each fragment shader
 * finishes with <colorspace_fragment> so output matches the sRGB canvas.
 */

// Ashima Arts / Stefan Gustavson 3D simplex noise (MIT) + fractal helpers.
export const noise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p) {
  float f = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    f += a * snoise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return f;
}

float fbm3(vec3 p) {
  float f = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    f += a * snoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return f;
}
`;

/* ------------------------------------------------------------------------ */
/*  Stars                                                                    */
/* ------------------------------------------------------------------------ */

// Distant sky stars — constant pixel size, twinkling.
export const skyStarShader = {
  vertexShader: /* glsl */ `
    attribute float aSize;
    attribute float aPhase;
    attribute vec3 aColor;
    uniform float uTime;
    uniform float uPixelRatio;
    varying vec3 vColor;
    varying float vTwinkle;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vTwinkle = 0.6 + 0.4 * sin(uTime * (0.8 + aPhase * 2.2) + aPhase * 6.2831);
      gl_PointSize = aSize * uPixelRatio;
      vColor = aColor;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uOpacity;
    varying vec3 vColor;
    varying float vTwinkle;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d);
      a *= a;
      gl_FragColor = vec4(vColor, a * vTwinkle * uOpacity);
      #include <colorspace_fragment>
    }
  `,
};

// World-space particles with perspective size attenuation (parallax stars, asteroid belt).
export const particleShader = {
  vertexShader: /* glsl */ `
    attribute float aSize;
    attribute vec3 aColor;
    uniform float uPixelRatio;
    uniform float uScale;
    varying vec3 vColor;
    varying float vNear;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      float depth = max(-mv.z, 0.001);
      gl_PointSize = clamp(aSize * uPixelRatio * uScale / depth, 0.0, 16.0);
      vColor = aColor;
      vNear = smoothstep(0.5, 8.0, depth);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uOpacity;
    varying vec3 vColor;
    varying float vNear;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.05, d);
      gl_FragColor = vec4(vColor, a * uOpacity * vNear);
      #include <colorspace_fragment>
    }
  `,
};

/* ------------------------------------------------------------------------ */
/*  The Sun                                                                  */
/* ------------------------------------------------------------------------ */

export const sunShader = {
  vertexShader: /* glsl */ `
    varying vec3 vPos;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vPos = position;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewDir = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uReveal;
    uniform vec3 uCore;
    uniform vec3 uMid;
    uniform vec3 uEdge;
    varying vec3 vPos;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    ${noise}
    void main() {
      vec3 p = normalize(vPos);
      float t = uTime * 0.08;

      // Convective plasma: large flowing cells + fine granulation
      float n = fbm(p * 2.6 + vec3(t, t * 0.6, -t));
      float cells = snoise(p * 13.0 + n * 2.2 + vec3(0.0, t * 3.0, 0.0));
      float heat = 0.55 + 0.38 * n + 0.14 * cells;

      vec3 col = mix(uEdge, uMid, smoothstep(0.15, 0.65, heat));
      col = mix(col, uCore, smoothstep(0.6, 1.0, heat));

      // Limb darkening + warm rim
      float ndv = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
      float limb = pow(1.0 - ndv, 1.6);
      col = mix(col, uEdge * 0.85, limb * 0.55);
      col *= 1.25 + (1.0 - limb) * 0.35;

      gl_FragColor = vec4(col, uReveal);
      #include <colorspace_fragment>
    }
  `,
};

export const sunGlowShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uReveal;
    uniform float uIntensity;
    uniform float uFalloff;
    uniform vec3 uInner;
    uniform vec3 uOuter;
    varying vec2 vUv;
    ${noise}
    void main() {
      vec2 c = (vUv - 0.5) * 2.0;
      float d = length(c);
      float ang = atan(c.y, c.x);
      vec2 dir = vec2(cos(ang), sin(ang));
      // Seamless angular noise for soft coronal streamers
      float rays = snoise(vec3(dir * 1.5, uTime * 0.15)) * 0.5 + 0.5;
      float rays2 = snoise(vec3(dir * 5.0, uTime * 0.3 + 3.0)) * 0.5 + 0.5;
      float falloff = max(1.0 - d, 0.0);
      float glow = pow(falloff, uFalloff) * (0.7 + 0.6 * rays * rays2);
      glow += pow(falloff, 7.0) * 1.4;
      vec3 col = mix(uOuter, uInner, pow(falloff, 2.5));
      gl_FragColor = vec4(col, clamp(glow * uReveal * uIntensity, 0.0, 1.0));
      #include <colorspace_fragment>
    }
  `,
};

/* ------------------------------------------------------------------------ */
/*  Watercolour planets                                                      */
/* ------------------------------------------------------------------------ */

export const planetShader = {
  vertexShader: /* glsl */ `
    varying vec3 vObj;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    void main() {
      vObj = position;
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorldPos = world.xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uReveal;
    uniform float uType;     // 0 rocky, 1 gas, 2 earth
    uniform float uBands;
    uniform float uSpot;
    uniform float uSeed;
    uniform vec3 uSunPos;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    uniform vec3 uAtmo;
    uniform vec3 uSpotColor;
    uniform float uSmooth;   // 0 = painterly steps (landing), 1 = smooth (close-ups); unset → 0
    varying vec3 vObj;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    ${noise}
    void main() {
      vec3 p = normalize(vObj);
      vec3 N = normalize(vWorldNormal);
      vec3 L = normalize(uSunPos - vWorldPos);
      vec3 V = normalize(cameraPosition - vWorldPos);

      float n = fbm(p * 2.5 + uSeed);
      float fine = snoise(p * 9.0 + uSeed * 2.0);
      vec3 base;

      if (uType < 0.5) {
        // Rocky: mottled washes with darker crater-like blooms
        float m = smoothstep(-0.3, 0.5, n + fine * 0.2);
        base = mix(uColorA, uColorB, m);
        base = mix(base, uColorC, smoothstep(0.3, 0.85, fine * 0.5 + n) * 0.55);
        float blooms = smoothstep(0.55, 0.75, snoise(p * 6.0 + uSeed * 4.0));
        base *= 1.0 - blooms * 0.25;
      } else if (uType < 1.5) {
        // Gas giant: turbulent latitudinal bands painted with brush streaks
        float lat = p.y;
        float warp = n * 0.32 + fine * 0.05;
        float b = sin((lat + warp) * uBands) * 0.5 + 0.5;
        float b2 = sin((lat + warp * 1.6) * uBands * 2.3 + 1.7) * 0.5 + 0.5;
        float streak = snoise(vec3(p.x * 2.0, p.y * 38.0, p.z * 2.0) + uSeed) * 0.5 + 0.5;
        base = mix(uColorA, uColorB, b);
        base = mix(base, uColorC, b2 * 0.45);
        base *= 0.92 + streak * 0.14;
        float lon = atan(p.z, p.x);
        vec2 sd = vec2((lon - 0.8) * 0.55, (p.y + 0.32) * 1.4);
        float spot = 1.0 - smoothstep(0.07, 0.15, length(sd) + n * 0.03);
        base = mix(base, uSpotColor, spot * uSpot);
      } else {
        // Earth: oceans, continents, polar caps and drifting cloud washes
        float land = smoothstep(0.02, 0.12, n + fine * 0.15);
        vec3 ocean = mix(uColorA * 0.85, uColorA * 1.2, fine * 0.5 + 0.5);
        vec3 green = mix(uColorB, uColorC * 0.8, smoothstep(0.2, 0.55, n));
        base = mix(ocean, green, land);
        float ice = smoothstep(0.78, 0.9, abs(p.y) + n * 0.1);
        base = mix(base, vec3(0.92), ice);
        float clouds = smoothstep(0.2, 0.6, fbm3(p * 4.0 + vec3(uTime * 0.03, 0.0, 0.0) + 10.0));
        base = mix(base, vec3(0.97), clouds * 0.5);
      }

      // Painterly light: wrapped diffuse with soft quantised steps
      float ndl = dot(N, L);
      float wrap = clamp((ndl + 0.35) / 1.35, 0.0, 1.0);
      float stepped = floor(wrap * 4.0 + 0.5) / 4.0;
      float light = mix(wrap, stepped, 0.35 * (1.0 - uSmooth));

      // Violet-tinted shadows — the illustrator's trick instead of black
      vec3 shadowTint = vec3(0.07, 0.05, 0.2);
      vec3 col = mix(base * shadowTint * 2.2 + shadowTint * 0.25, base * 1.1, light);

      // Pigment granulation + uneven wash
      float grain = snoise(p * 64.0 + uSeed) * 0.5 + 0.5;
      float bleed = fbm3(p * 5.0 + uSeed * 3.0);
      col *= 0.9 + grain * 0.16 + bleed * 0.1;

      // Wet edge where pigment pools along the terminator
      float edge = smoothstep(0.1, 0.0, abs(ndl + 0.05 + bleed * 0.1));
      col = mix(col, col * 0.72, edge * 0.55 * (1.0 - uSmooth * 0.75));

      // Pigment pooling at the silhouette
      float rim = 1.0 - max(dot(N, V), 0.0);
      col *= 1.0 - smoothstep(0.6, 1.0, rim) * 0.3;

      // Gold illustrated rim-light on the sunlit side + soft atmosphere
      vec3 gold = vec3(1.0, 0.72, 0.36);
      float lit = clamp(ndl + 0.25, 0.0, 1.0);
      col += gold * pow(rim, 3.5) * lit * 0.55;
      col += uAtmo * pow(rim, 2.4) * (0.15 + lit * 0.45);

      gl_FragColor = vec4(col, uReveal);
      #include <colorspace_fragment>
    }
  `,
};

export const ringShader = {
  vertexShader: /* glsl */ `
    varying float vR;
    varying vec3 vWorldPos;
    void main() {
      vR = length(position.xy);
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorldPos = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uInner;
    uniform float uOuter;
    uniform float uReveal;
    uniform float uOpacity;
    uniform float uSeed;
    uniform float uPlanetR;
    uniform vec3 uPlanetPos;
    uniform vec3 uSunPos;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    varying float vR;
    varying vec3 vWorldPos;
    ${noise}
    void main() {
      float r = clamp((vR - uInner) / (uOuter - uInner), 0.0, 1.0);
      float wobble = snoise(vec3(r * 18.0, uSeed, 0.0));
      float bands = 0.55 + 0.45 * sin(r * 58.0 + wobble * 2.0);
      float fine = 0.75 + 0.25 * sin(r * 190.0 + wobble);
      float gap = smoothstep(0.56, 0.58, r) * (1.0 - smoothstep(0.63, 0.65, r));
      float edgeFade = smoothstep(0.0, 0.06, r) * (1.0 - smoothstep(0.9, 1.0, r));
      float alpha = bands * fine * edgeFade * (1.0 - gap * 0.92) * uOpacity;

      vec3 col = mix(uColorB, uColorA, bands);
      col += vec3(1.0, 0.75, 0.4) * pow(bands, 6.0) * 0.12;

      // The planet casts its shadow across the rings
      vec3 L = normalize(uSunPos - vWorldPos);
      vec3 oc = vWorldPos - uPlanetPos;
      float b = dot(oc, L);
      float c = dot(oc, oc) - uPlanetR * uPlanetR;
      float h = b * b - c;
      float shadow = (h > 0.0 && b < 0.0) ? 0.22 : 1.0;
      col *= shadow;

      gl_FragColor = vec4(col, alpha * uReveal);
      #include <colorspace_fragment>
    }
  `,
};

/* ------------------------------------------------------------------------ */
/*  Spiral galaxy (REF-1) — assembles from a scattered halo                  */
/* ------------------------------------------------------------------------ */

export const galaxyShader = {
  vertexShader: /* glsl */ `
    attribute vec3 aScatter;
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aDelay;
    uniform float uAssembly;
    uniform float uRotation;
    uniform float uSize;
    uniform float uPixelRatio;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      // Each particle starts its flight a little later than the last (aDelay ∈ [0, 0.35]).
      float a = clamp((uAssembly - aDelay) / 0.65, 0.0, 1.0);
      a = 1.0 - pow(1.0 - a, 3.0);
      vec3 p = mix(aScatter, position, a);

      // Differential rotation: the core turns faster than the rim.
      float r = length(position.xz);
      float ang = uRotation / (1.0 + r * 0.035);
      float c = cos(ang);
      float s = sin(ang);
      p.xz = mat2(c, -s, s, c) * p.xz;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float depth = max(-mv.z, 0.001);
      gl_PointSize = clamp(aSize * uSize * uPixelRatio / depth, 0.0, 24.0);
      vColor = aColor;
      // Fade sprites that pass right by the lens during the dive.
      vAlpha = mix(0.3, 1.0, a) * smoothstep(3.0, 22.0, depth);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uOpacity;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float strength = pow(1.0 - clamp(d, 0.0, 1.0), 2.4);
      gl_FragColor = vec4(vColor, strength * vAlpha * uOpacity);
      #include <colorspace_fragment>
    }
  `,
};

/** Generic soft radial billboard (galaxy core glow). */
export const radialGlowShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uIntensity;
    varying vec2 vUv;
    void main() {
      float d = length(vUv - 0.5) * 2.0;
      float f = max(1.0 - d, 0.0);
      float glow = pow(f, 3.0) * 0.8 + pow(f, 10.0) * 1.6;
      gl_FragColor = vec4(uColor, clamp(glow * uIntensity, 0.0, 1.0));
      #include <colorspace_fragment>
    }
  `,
};

/* ------------------------------------------------------------------------ */
/*  FPV warp streaks (REF-2) — camera-space tube, radiating from centre      */
/* ------------------------------------------------------------------------ */

export const warpShader = {
  vertexShader: /* glsl */ `
    attribute float aTail;
    attribute float aZ;
    attribute float aSeed;
    attribute vec3 aColor;
    uniform float uTravel;
    uniform float uDepth;
    uniform float uLength;
    uniform float uSpeed;
    varying float vHead;
    varying float vFade;
    varying vec3 vColor;
    void main() {
      // Head z cycles from -depth toward the lens as travel accumulates.
      float z = -uDepth + mod(aZ + uTravel * (0.7 + aSeed * 0.6), uDepth) - 1.5;
      // Tail stretches back toward the vanishing point, proportional to speed.
      float len = uLength * uSpeed * (0.6 + aSeed * 0.8) + 0.05;
      vec3 p = vec3(position.xy, z - aTail * len);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      vHead = 1.0 - aTail;
      float far = smoothstep(-uDepth - 1.5, -uDepth * 0.55, z);
      float near = 1.0 - smoothstep(-14.0, -1.5, z);
      vFade = far * near;
      vColor = aColor;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uOpacity;
    varying float vHead;
    varying float vFade;
    varying vec3 vColor;
    void main() {
      gl_FragColor = vec4(vColor, vHead * vHead * vFade * uOpacity);
      #include <colorspace_fragment>
    }
  `,
};

/* ------------------------------------------------------------------------ */
/*  Sun fresnel shell                                                        */
/* ------------------------------------------------------------------------ */

export const fresnelShader = {
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uReveal;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      float f = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.2);
      gl_FragColor = vec4(uColor * 1.5, f * uReveal);
      #include <colorspace_fragment>
    }
  `,
};

/* ------------------------------------------------------------------------ */
/*  Comets & engine trails — long thin quads, uv.y = 1 at the head           */
/* ------------------------------------------------------------------------ */

const streakVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const cometShader = {
  vertexShader: streakVertex,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      float along = vUv.y;
      float across = abs(vUv.x - 0.5) * 2.0;
      // Tail tapers to a hair; head is a soft bright knot.
      float width = mix(0.08, 1.0, pow(along, 4.0));
      float body = (1.0 - smoothstep(0.0, width, across)) * pow(along, 2.4);
      float head = exp(-pow((1.0 - along) * 18.0, 2.0)) * (1.0 - smoothstep(0.0, 1.0, across));
      float alpha = clamp(body * 0.8 + head * 1.4, 0.0, 1.0) * uOpacity;
      vec3 col = mix(uColor * vec3(0.75, 0.82, 1.0), uColor, along);
      gl_FragColor = vec4(col, alpha);
      #include <colorspace_fragment>
    }
  `,
};

export const trailShader = {
  vertexShader: streakVertex,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      float across = abs(vUv.x - 0.5) * 2.0;
      float alpha = pow(vUv.y, 1.6) * (1.0 - smoothstep(0.0, 1.0, across)) * uOpacity;
      gl_FragColor = vec4(uColor, alpha);
      #include <colorspace_fragment>
    }
  `,
};
