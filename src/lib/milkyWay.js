/**
 * The Milky Way, edge-on: a full-screen fragment shader for the schedule page
 * (drawn with createShaderLayer from ./blackHole). A diagonal galactic band of
 * dense star clouds with dark dust lanes down its middle, a warm bulge, cool
 * blue-violet arms, and sharp foreground stars. uOffset pans the sky (parallax).
 */
export const MILKY_FRAG = /* glsl */ `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uOffset;
  uniform float uIntro;
  uniform float uWarm;   // 0 → 1: Day 2 tints the galaxy a little warmer

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
    for (int i = 0; i < 6; i++) {
      f += a * noise(p);
      p = p * 2.02 + 13.7;
      a *= 0.5;
    }
    return f;
  }
  float stars(vec2 q, float scale, float seed, float density) {
    vec2 g = q * scale;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(id + seed);
    vec2 o = vec2(hash(id + seed + 3.1), hash(id + seed + 7.7)) - 0.5;
    float d = length(f - o * 0.7);
    float on = step(1.0 - density, h);
    float tw = 0.7 + 0.3 * sin(uTime * (0.6 + h * 2.0) + h * 50.0);
    return on * smoothstep(0.1, 0.0, d) * tw;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uRes.y;
    vec2 q = uv + vec2(uOffset, 0.0);
    // Galactic plane: a tilted line across the screen.
    vec2 n = normalize(vec2(-0.32, 1.0));
    float y = dot(q - vec2(0.0, 0.5), n) + 0.06 * sin(q.x * 1.3);
    float along = dot(q, vec2(n.y, -n.x));
    float band = exp(-y * y / 0.022);
    float halo = exp(-y * y / 0.11);
    // Bulge: brighter, warmer region along the band.
    float core = exp(-pow(along - 0.95 - uOffset * 0.2, 2.0) / 0.35) * band;

    vec2 bp = vec2(along * 3.0, y * 9.0);
    float clouds = fbm(bp * 1.4);
    float fine = fbm(bp * 4.5 + 4.0);
    // Dust lanes: dark filaments threading the centre of the band.
    float dust = smoothstep(0.42, 0.72, fbm(vec2(along * 4.2, y * 26.0) + 9.0)) * exp(-y * y / 0.006);

    vec3 cool = mix(vec3(0.2, 0.22, 0.42), vec3(0.32, 0.26, 0.5), clouds);
    vec3 warm = mix(vec3(0.95, 0.72, 0.45), vec3(1.0, 0.86, 0.66), fine);
    vec3 glow = mix(cool, warm, clamp(core * 1.6 + uWarm * 0.25, 0.0, 1.0));
    float lum = band * (0.25 + 0.75 * clouds) * (0.6 + 0.6 * fine) + halo * 0.08;
    lum *= 1.0 - dust * 0.85;
    vec3 col = vec3(0.006, 0.008, 0.02) + glow * lum * 0.85 + warm * core * 0.35 * (1.0 - dust);
    // Faint violet nebulosity off the plane, like the landing sky.
    col += vec3(0.05, 0.03, 0.11) * smoothstep(0.45, 0.85, fbm(q * 2.5 + 30.0)) * (1.0 - band);

    // Star fields: dense inside the band, sparse outside.
    float s = stars(q, 220.0, 1.0, 0.04 + band * 0.22) * (0.5 + band) + stars(q, 520.0, 5.0, 0.03 + band * 0.35) * 0.55 * (0.4 + band);
    s += stars(q + vec2(uOffset * 0.6, 0.0), 90.0, 9.0, 0.03) * 1.3; // bright foreground stars (parallax)
    col += vec3(1.0, 0.96, 0.9) * s;

    vec2 v = gl_FragCoord.xy / uRes - 0.5;
    col *= 1.0 - dot(v, v) * 1.2;
    col = 1.0 - exp(-col * 1.6);
    gl_FragColor = vec4(col * uIntro, 1.0);
  }
`;
