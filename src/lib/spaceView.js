/**
 * The view out of the bridge window on the rules page: a full-screen fragment
 * shader (drawn with createShaderLayer from ./blackHole). Stars stream past in
 * depth layers as the craft flies on, a teal nebula
 * with glowing cyan filaments fills the sky behind, and the view shifts a touch
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
    // Deep blue-teal space, a little lighter across the middle.
    vec3 col = mix(vec3(0.004, 0.016, 0.026), vec3(0.008, 0.03, 0.045), smoothstep(0.9, 0.0, abs(uv.y + uv.x * 0.35)));

    // Teal nebula (almost no parallax): a soft cloud band crossing the sky
    // diagonally, threaded with bright wispy cyan filaments.
    vec2 sky = view + vec2(uTravel * 0.0015, 0.0);
    vec2 w = sky * 1.3 + vec2(fbm(sky * 1.1 + 3.0), fbm(sky * 1.1 + 9.0)) * 0.9; // domain warp
    float cloud = fbm(w * 1.4 + 2.0);
    float band = exp(-pow((sky.y + sky.x * 0.55 - 0.05) * 2.1, 2.0));          // the diagonal lane
    float fil = 1.0 - abs(2.0 * fbm(w * 3.2 + 7.0) - 1.0);                      // ridged filaments
    fil = pow(fil, 6.0);
    float dens = smoothstep(0.45, 0.88, cloud) * (0.12 + 0.88 * band);
    col += vec3(0.015, 0.12, 0.17) * dens * 0.7;
    col += vec3(0.1, 0.55, 0.75) * fil * dens * 0.85;
    // Dark dust lanes inside the cloud
    col *= 1.0 - 0.45 * smoothstep(0.55, 0.8, fbm(w * 2.4 + 15.0)) * dens;

    // Fine star dust, thicker inside the nebula.
    vec2 g = floor(view * 420.0);
    float dust = step(0.9965 - dens * 0.008, hash(g));
    col += vec3(0.75, 0.9, 1.0) * dust * (0.35 + 0.4 * hash(g + 5.0));

    // Bright blue-white stars with soft glows (slow twinkle).
    for (int k = 0; k < 2; k++) {
      float sc = 18.0 + float(k) * 13.0;
      vec2 cp = view * sc + float(k) * 17.0;
      vec2 id = floor(cp);
      vec2 f = fract(cp) - 0.5;
      float h = hash(id + float(k) * 3.7);
      vec2 o = (vec2(hash(id + 1.3), hash(id + 8.1)) - 0.5) * 0.7;
      float d = length(f - o);
      float on = step(0.86, h);
      float tw = 0.75 + 0.25 * sin(uTime * (1.0 + h * 2.0) + h * 40.0);
      col += vec3(0.65, 0.88, 1.0) * on * tw * (exp(-d * 60.0) * 1.4 + exp(-d * 14.0) * 0.18);
    }

    // Two small crescent moons far off in the sky.
    for (int m = 0; m < 2; m++) {
      vec2 mc = m == 0 ? vec2(0.62, 0.36) : vec2(-0.72, -0.34);
      float mr = m == 0 ? 0.018 : 0.012;
      vec2 q = (sky - mc) / mr;
      float body = 1.0 - smoothstep(0.92, 1.0, length(q));
      float lit = 1.0 - smoothstep(0.85, 1.0, length(q - vec2(-0.32, 0.26)));
      float crescent = body * (1.0 - lit);
      col = mix(col, vec3(0.02, 0.04, 0.06), body * 0.85);
      col += vec3(0.75, 0.85, 0.9) * crescent * 0.85;
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
      float star = step(0.82, h) * pow(smoothstep(size, 0.0, d), 2.0) * fade;
      col += mix(vec3(0.7, 0.88, 1.0), vec3(0.92, 0.97, 1.0), h) * star * 1.4;
    }

    // Shield shimmer across the glass.
    float sh = fbm(uv * 3.0 + vec2(uTime * 0.12, -uTime * 0.08));
    col += vec3(0.95, 0.78, 0.45) * smoothstep(0.55, 0.85, sh) * 0.06 * uShield;
    col += vec3(0.95, 0.78, 0.45) * pow(length(uv) * 0.9, 3.0) * 0.08 * uShield;

    col = 1.0 - exp(-col * 1.5);
    gl_FragColor = vec4(col * uIntro, 1.0);
  }
`;
