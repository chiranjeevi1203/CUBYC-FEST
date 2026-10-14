/**
 * Background for the events page: a great comet over a deep star field (after
 * astrophotos like NEOWISE). A cyan-white nucleus low on the left; a broad,
 * curving white-gold dust tail sweeping up and right; fine blue ion streaks
 * fanning almost straight up. Coloured stars (a few with diffraction spikes),
 * shooting stars every few seconds and, now and then, a small comet gliding by.
 *
 * Same uniforms as SPACE_FRAG (drawn with createShaderLayer from ./blackHole).
 */
export const COMET_FRAG = /* glsl */ `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uTravel;
  uniform vec2 uLook;
  uniform float uIntro;
  uniform float uShield;

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
    for (int i = 0; i < 4; i++) {
      f += a * noise(p);
      p = p * 2.03 + 7.0;
      a *= 0.5;
    }
    return f;
  }

  // Star colours from blue-white to amber.
  vec3 starColor(float h) {
    if (h < 0.25) return vec3(0.68, 0.8, 1.0);
    if (h < 0.7) return vec3(1.0, 0.98, 0.94);
    if (h < 0.9) return vec3(1.0, 0.86, 0.62);
    return vec3(1.0, 0.7, 0.48);
  }

  vec3 starLayer(vec2 q, float scale, float seed, float density, float spikes) {
    vec2 g = q * scale;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(id + seed);
    if (h < 1.0 - density) return vec3(0.0);
    vec2 o = vec2(hash(id + seed + 3.1), hash(id + seed + 7.7)) - 0.5;
    vec2 d = f - o * 0.6;
    float bright = hash(id + seed + 11.0);
    float tw = 0.75 + 0.25 * sin(uTime * (0.6 + bright * 2.0) + bright * 40.0);
    float core = smoothstep(0.08 + bright * 0.06, 0.0, length(d));
    float halo = exp(-dot(d, d) * 90.0) * 0.25 * bright;
    // Diffraction spikes on the brightest stars.
    float sp = spikes * step(0.86, bright) * (exp(-abs(d.x) * 120.0) + exp(-abs(d.y) * 120.0)) * exp(-length(d) * 7.0);
    return starColor(hash(id + seed + 5.0)) * (core + halo + sp * 0.9) * tw;
  }

  // A bright streak from head back along -dir; returns intensity at p.
  float streak(vec2 p, vec2 head, vec2 dir, float len, float width) {
    vec2 v = p - head;
    float along = -dot(v, dir);              // 0 at the head, grows down the tail
    float perp = dot(v, vec2(-dir.y, dir.x));
    if (along < -width * 3.0 || along > len) return 0.0;
    float fade = pow(1.0 - clamp(along / len, 0.0, 1.0), 2.0);
    float w = width * (0.35 + 0.65 * fade);
    return exp(-perp * perp / (w * w)) * fade + exp(-dot(v, v) / (width * width * 4.0)) * 0.8;
  }

  void main() {
    float a = uRes.x / uRes.y;
    vec2 p = gl_FragCoord.xy / uRes.y;
    vec2 look = uLook * 0.012;
    vec3 col = vec3(0.004, 0.006, 0.014);

    // Faint blue sky glow toward the upper right (where the tails spread).
    col += vec3(0.02, 0.05, 0.1) * smoothstep(0.2, 1.2, p.x / a + p.y) * 0.8;

    // Stars: dense faint field + sparse bright ones (slight parallax).
    col += starLayer(p + look * 0.5, 260.0, 1.0, 0.16, 0.0) * 0.6;
    col += starLayer(p + look, 110.0, 4.0, 0.12, 0.0) * 0.9;
    col += starLayer(p + look * 1.6, 34.0, 9.0, 0.16, 1.0) * 1.3;

    /* ---------------- The great comet ---------------- */
    vec2 N = vec2(a * (a < 1.0 ? 0.16 : 0.13), a < 1.0 ? 0.2 : 0.16) + look * 0.8;
    vec2 v = p - N;
    float r = length(v);
    float ang = atan(v.x, v.y);              // 0 = straight up, + = toward the right

    // Ion tail: fine blue streaks fanning nearly straight up.
    float ionC = 0.07 + r * 0.1;
    float ionW = 0.05 + r * 0.24;
    float ion = exp(-pow((ang - ionC) / ionW, 2.0)) * smoothstep(0.0, 0.03, r) * exp(-r * 1.15);
    float rays = noise(vec2(ang * 120.0, r * 1.4 - uTime * 0.04)) * 0.65 + noise(vec2(ang * 300.0, r * 3.0)) * 0.35;
    ion *= 0.35 + 1.1 * pow(rays, 2.2);
    col += vec3(0.28, 0.56, 1.0) * ion * 0.8 + vec3(0.12, 0.28, 0.55) * exp(-pow((ang - ionC) / (ionW * 1.6), 2.0)) * exp(-r * 1.6) * smoothstep(0.0, 0.05, r) * 0.25;

    // Dust tail: broad, curving away to the right, white-gold near the head.
    float dustC = 0.32 + r * 0.42;
    float dustW = 0.07 + r * 0.32;
    float dust = exp(-pow((ang - dustC) / dustW, 2.0)) * smoothstep(0.0, 0.02, r) * exp(-r * 1.45);
    dust *= 0.8 + 0.35 * fbm(vec2(ang * 9.0, r * 5.0 - uTime * 0.03));
    vec3 dustCol = mix(vec3(1.0, 0.94, 0.8), vec3(0.62, 0.78, 1.0), smoothstep(0.05, 0.9, r));
    col += dustCol * dust * 0.85;

    // Coma + nucleus.
    col += vec3(0.55, 0.9, 1.0) * exp(-r / 0.014) * 0.9;
    col += vec3(0.9, 1.0, 1.0) * exp(-r * r / 0.000035) * 1.6;

    /* ---------------- Shooting stars ---------------- */
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float period = 5.5 + fi * 2.7;
      float t = (uTime + fi * 3.3) / period;
      float n = floor(t);
      float ph = fract(t);
      float life = 0.11;
      if (ph < life) {
        float k = ph / life;
        vec2 start = vec2((0.35 + hash(vec2(n, fi)) * 0.75) * a, 0.6 + hash(vec2(fi, n)) * 0.35);
        vec2 dir = normalize(vec2(-0.75 - hash(vec2(n + 3.0, fi)) * 0.5, -0.45));
        vec2 head = start + dir * k * 0.55;
        float s = streak(p, head, dir, 0.16 + 0.1 * k, 0.0016);
        col += vec3(1.0, 0.95, 0.85) * s * sin(k * 3.14159) * 1.4;
      }
    }

    /* ---------------- A small comet gliding by ---------------- */
    {
      float period = 26.0;
      float t = uTime / period + 0.35;
      float n = floor(t);
      float ph = fract(t);
      if (ph < 0.42) {
        float k = ph / 0.42;
        float y0 = 0.55 + hash(vec2(n, 2.0)) * 0.35;
        vec2 dir = normalize(vec2(1.0, -0.18 - hash(vec2(n, 5.0)) * 0.2));
        vec2 head = vec2(-0.1, y0) + dir * k * (a + 0.3);
        float s = streak(p, head, dir, 0.22, 0.0042);
        float fade = sin(k * 3.14159);
        col += vec3(0.45, 0.72, 1.0) * s * fade * 0.55;
        col += vec3(0.9, 1.0, 1.0) * exp(-dot(p - head, p - head) / 0.000012) * fade * 1.2;
      }
    }

    vec2 vg = gl_FragCoord.xy / uRes - 0.5;
    col *= 1.0 - dot(vg, vg) * 0.9;
    col = 1.0 - exp(-col * 1.35);
    gl_FragColor = vec4(col * uIntro, 1.0);
  }
`;
