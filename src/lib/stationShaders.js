/**
 * GLSL for the space station. Lit the same way as the watercolour planets
 * (wrapped light, violet-tinted shadows, gold rim on the sunlit side), so the
 * station belongs to the same illustrated system.
 */

const litVertex = /* glsl */ `
  varying vec3 vObj;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vObj = position;
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/** Hull: painted ivory / gold metal with fine panel seams and a soft specular sheen. */
export const hullShader = {
  vertexShader: litVertex,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform vec3 uSunPos;
    uniform float uReveal;
    uniform float uSeams;    // 0…1 panel seam strength
    uniform float uGlow;     // hover / focus lift
    varying vec3 vObj;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    void main() {
      vec3 N = normalize(vWorldNormal);
      if (!gl_FrontFacing) N = -N;
      vec3 L = normalize(uSunPos - vWorldPos);
      vec3 V = normalize(cameraPosition - vWorldPos);
      float ndl = dot(N, L);

      // Panel seams along the geometry's uv grid.
      vec2 g = abs(fract(vUv * vec2(48.0, 4.0)) - 0.5);
      float seam = smoothstep(0.44, 0.5, max(g.x, g.y)) * uSeams;
      vec3 base = uColor * (1.0 - seam * 0.22);

      float wrap = clamp((ndl + 0.3) / 1.3, 0.0, 1.0);
      vec3 shadowTint = vec3(0.07, 0.05, 0.2);
      vec3 col = mix(base * shadowTint * 2.2 + shadowTint * 0.3, base * 1.05, wrap);

      // Soft metallic sheen + gold rim on the sunlit side (as on the planets).
      vec3 H = normalize(L + V);
      col += vec3(1.0, 0.88, 0.66) * pow(max(dot(N, H), 0.0), 36.0) * 0.45 * step(0.0, ndl);
      float rim = 1.0 - max(dot(N, V), 0.0);
      col += vec3(1.0, 0.72, 0.36) * pow(rim, 3.0) * clamp(ndl + 0.25, 0.0, 1.0) * 0.45;
      col *= 1.0 + uGlow * 0.18;

      gl_FragColor = vec4(col, uReveal);
      #include <colorspace_fragment>
    }
  `,
};

/** Solar arrays: deep navy cells in a fine gold grid, catching a cool sheen from the sun. */
export const panelShader = {
  vertexShader: litVertex,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform vec3 uGold;
    uniform vec3 uSunPos;
    uniform float uReveal;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    void main() {
      vec3 N = normalize(vWorldNormal);
      if (!gl_FrontFacing) N = -N;
      vec3 L = normalize(uSunPos - vWorldPos);
      vec3 V = normalize(cameraPosition - vWorldPos);

      vec2 g = abs(fract(vUv * vec2(9.0, 3.0)) - 0.5);
      float grid = smoothstep(0.43, 0.5, max(g.x, g.y));
      float frame = 1.0 - smoothstep(0.0, 0.035, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y) * 2.4));

      float lit = 0.45 + 0.55 * abs(dot(N, L));
      vec3 cell = uColor * (0.75 + 0.45 * vUv.y) * lit;
      float sheen = pow(max(dot(reflect(-L, N), V), 0.0), 10.0);
      cell += vec3(0.45, 0.58, 1.0) * sheen * 0.55;
      vec3 col = mix(cell, uGold * (0.55 + 0.45 * lit), clamp(grid * 0.55 + frame, 0.0, 1.0));

      gl_FragColor = vec4(col, uReveal);
      #include <colorspace_fragment>
    }
  `,
};

/** Window lights: warm points with a slow, staggered shimmer (constant pixel size). */
export const lightShader = {
  vertexShader: /* glsl */ `
    attribute float aPhase;
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSize;
    varying float vTwinkle;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vTwinkle = 0.65 + 0.35 * sin(uTime * 1.3 + aPhase * 6.2831);
      gl_PointSize = uSize * uPixelRatio;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying float vTwinkle;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(uColor, a * a * vTwinkle * uOpacity);
      #include <colorspace_fragment>
    }
  `,
};
