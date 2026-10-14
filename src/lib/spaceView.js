/**
 * The view out of the bridge window on the rules page: a full-screen fragment
 * shader (drawn with createShaderLayer from ./blackHole). Stars stream past in
 * depth layers as the craft flies on, faint spiral galaxies and a violet/gold
 * nebula hang in the distance, and the whole sky shifts a touch with uLook.
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

  // A small spiral galaxy: bright core, two wound arms, tilted disk.
  vec3 galaxy(vec2 p, vec2 c, float size, float tilt, float rot, vec3 tint) {
    vec2 q = p - c;
    float ct = cos(rot);
    float st = sin(rot);
    q = vec2(ct * q.x - st * q.y, st * q.x + ct * q.y);
    q.y /= tilt;
    float r = length(q) / size;
    if (r > 2.2) return vec3(0.0);
    float a = atan(q.y, q.x);
    float arms = 0.5 + 0.5 * cos(2.0 * a - log(r + 0.05) * 4.2);
    float disk = exp(-r * 2.6) * (0.35 + 0.9 * arms * smoothstep(0.05, 0.4, r));
    float core = exp(-r * r * 60.0) * 1.3;
    float dust = noise(q / size * 6.0) * 0.4;
    return tint * disk * (1.0 - dust * smoothstep(0.1, 0.6, r)) + vec3(1.0, 0.92, 0.8) * core;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec2 view = uv + uLook * 0.035;
    vec3 col = vec3(0.004, 0.006, 0.016);

    // Distant nebula and galaxies (almost no parallax).
    vec2 sky = view + vec2(uTravel * 0.0015, 0.0);
    float neb = fbm(sky * 1.6 + 4.0);
    col += mix(vec3(0.06, 0.03, 0.13), vec3(0.12, 0.08, 0.04), smoothstep(0.4, 0.8, fbm(sky * 0.9 + 20.0))) * smoothstep(0.42, 0.9, neb) * 1.4;
    col += galaxy(sky, vec2(-0.55, 0.22), 0.11, 0.42, 0.5, vec3(0.75, 0.62, 0.95));
    col += galaxy(sky, vec2(0.62, 0.3), 0.06, 0.7, -0.8, vec3(0.95, 0.78, 0.55));
    col += galaxy(sky, vec2(0.18, -0.05), 0.035, 0.35, 1.9, vec3(0.6, 0.7, 1.0)) * 0.8;

    // Background star dust.
    vec2 g = floor(view * 420.0);
    col += vec3(0.9, 0.92, 1.0) * step(0.996, hash(g)) * 0.5;

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
      float star = step(0.82, h) * pow(smoothstep(size, 0.0, d), 2.0) * fade;
      col += mix(vec3(0.8, 0.88, 1.0), vec3(1.0, 0.9, 0.75), h) * star * 1.4;
    }

    // Shield shimmer across the glass.
    float sh = fbm(uv * 3.0 + vec2(uTime * 0.12, -uTime * 0.08));
    col += vec3(0.95, 0.78, 0.45) * smoothstep(0.55, 0.85, sh) * 0.06 * uShield;
    col += vec3(0.95, 0.78, 0.45) * pow(length(uv) * 0.9, 3.0) * 0.08 * uShield;

    col = 1.0 - exp(-col * 1.5);
    gl_FragColor = vec4(col * uIntro, 1.0);
  }
`;
