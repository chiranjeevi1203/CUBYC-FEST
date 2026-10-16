/**
 * The view out of the bridge window on the rules page: a full-screen fragment
 * shader (drawn with createShaderLayer from ./blackHole). Stars stream past in
 * depth layers as the craft flies on, the violet band of the Milky Way
 * (glowing clouds, a pink-white core and dark dust lanes) fills the sky behind, and the view shifts a touch
 * with uLook.
 */
export const SPACE_FRAG = /* glsl */ `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uTravel;   // distance flown (accumulated on the CPU from the throttle)
  uniform vec2 uLook;      // pointer parallax, -1…1
  uniform float uIntro;
  uniform float uShield;   // 0…1 shield shimmer on the glass

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float f = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      f += a * noise(p);
      p = p * 2.03 + 11.0;
      a *= 0.5;
    }
    return f;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec2 view = uv + uLook * 0.035;
    // Deep indigo night sky, brighter violet-blue toward the galactic band.
    vec2 sky = view + vec2(uTravel * 0.0015, 0.0);
    // The Milky Way: a near-vertical band, leaning slightly, through the middle.
    float across = sky.x + sky.y * 0.18 + 0.02;
    float band = exp(-pow(across * 2.4, 2.0));
    float halo = exp(-pow(across * 1.1, 2.0));
    vec3 col = mix(vec3(0.012, 0.014, 0.07), vec3(0.03, 0.035, 0.16), halo);

    // Glowing violet clouds with fine structure (domain-warped noise).
    vec2 w = sky * 1.6 + vec2(fbm(sky * 1.3 + 3.0), fbm(sky * 1.3 + 9.0)) * 0.8;
    float cloud = fbm(w * 1.5 + 2.0);
    float dens = smoothstep(0.32, 0.85, cloud) * band;
    col += vec3(0.16, 0.12, 0.42) * dens * 1.15;             // blue-violet body
    col += vec3(0.32, 0.16, 0.42) * pow(dens, 2.0) * 1.1;     // magenta-violet core
    col += vec3(0.05, 0.05, 0.16) * band * 0.9;              // soft glow of the band
    // Bright pink-white core near the lower middle (the galactic centre)
    float core = exp(-dot(sky - vec2(-0.08, -0.12), sky - vec2(-0.08, -0.12)) * 26.0) * band;
    col += vec3(0.62, 0.42, 0.72) * core * (0.55 + 0.6 * cloud);
    // Dark dust lanes winding through the band
    float lane = smoothstep(0.52, 0.78, fbm(w * 2.2 + 15.0));
    col *= 1.0 - 0.55 * lane * band;

    // Dense fine star field, thicker inside the band.
    for (int k = 0; k < 2; k++) {
      vec2 g = floor(view * (520.0 + float(k) * 260.0) + float(k) * 31.0);
      float dust = step(0.9978 - band * 0.006 - float(k) * 0.001, hash(g));
      col += mix(vec3(0.72, 0.78, 1.0), vec3(1.0, 0.95, 0.98), hash(g + 2.0)) * dust * (0.22 + 0.4 * hash(g + 5.0));
    }

    // Bright stars with soft glows (slow twinkle).
    for (int k = 0; k < 2; k++) {
      float sc = 16.0 + float(k) * 12.0;
      vec2 cp = view * sc + float(k) * 17.0;
      vec2 id = floor(cp);
      vec2 f = fract(cp) - 0.5;
      float h = hash(id + float(k) * 3.7);
      vec2 o = (vec2(hash(id + 1.3), hash(id + 8.1)) - 0.5) * 0.7;
      float d = length(f - o);
      float on = step(0.9, h);
      float tw = 0.75 + 0.25 * sin(uTime * (1.0 + h * 2.0) + h * 40.0);
      col += mix(vec3(0.8, 0.82, 1.0), vec3(1.0, 0.9, 1.0), h) * on * tw * (exp(-d * 60.0) * 1.5 + exp(-d * 13.0) * 0.2);
    }

    // Stars streaming past in depth layers (flying forward).
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float z = fract(uTravel * 0.02 + fi * 0.25);       // 1 = far, 0 = passing the window
      float depth = mix(2.5, 0.05, z);
      vec2 p = view * depth + vec2(fi * 7.3, fi * 3.1);
      vec2 cell = floor(p * 9.0);
      vec2 f = fract(p * 9.0) - 0.5;
      float h = hash(cell + fi * 13.0);
      vec2 o = vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5;
      float d = length(f - o * 0.6);
      float size = mix(0.012, 0.045, z);
      float fade = smoothstep(0.0, 0.25, z) * (1.0 - smoothstep(0.85, 1.0, z));
      float star = step(0.88, h) * pow(smoothstep(size, 0.0, d), 2.0) * fade;
      col += mix(vec3(0.8, 0.82, 1.0), vec3(0.98, 0.95, 1.0), h) * star * 1.4;
    }

    // Shield shimmer across the glass.
    float sh = fbm(uv * 3.0 + vec2(uTime * 0.12, -uTime * 0.08));
    col += vec3(0.95, 0.78, 0.45) * smoothstep(0.55, 0.85, sh) * 0.06 * uShield;
    col += vec3(0.95, 0.78, 0.45) * pow(length(uv) * 0.9, 3.0) * 0.08 * uShield;

    col = 1.0 - exp(-col * 1.5);
    gl_FragColor = vec4(col * uIntro, 1.0);
  }
`;
