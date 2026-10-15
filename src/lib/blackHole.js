/**
 * Gargantua for the gallery page: two full-screen fragment shaders on tiny raw
 * WebGL canvases (no scene graph needed for a single quad each).
 *
 *   BACKGROUND  stars + violet nebula, gravitationally lensed around the hole
 *   PHOTOS      the falling photos: subdivided quads bent by the lens equation
 *               (primary arc + faint mirrored secondary image), stretched by tides
 *               and redshifted as they near the horizon (createPhotoLayer)
 *   HOLE        ray-traced Schwarzschild black hole on a transparent canvas ABOVE
 *               the photos: every pixel's light path is integrated through the
 *               curved space-time, so the shadow, photon ring and the disk's
 *               lensed image over and under the hole all emerge from the physics.
 *               Thin disk from the ISCO out, Doppler beaming + gravitational redshift.
 *
 * Shared uniforms: uRes (px), uCenter (px, GL coords — y up), uR (horizon radius,
 * px), uTime (s), uIntro (0 → 1 as the hole forms), uSpread (disk reach).
 */

const HEADER = /* glsl */ `
  precision highp float;
  uniform vec2 uRes;
  uniform vec2 uCenter;
  uniform float uR;
  uniform float uTime;
  uniform float uIntro;
  uniform float uSpread;

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
      p = p * 2.03 + 17.0;
      a *= 0.5;
    }
    return f;
  }
`;

export const BACKGROUND_FRAG = /* glsl */ `${HEADER}
  float starLayer(vec2 q, float scale, float seed) {
    vec2 g = q * scale;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(id + seed);
    vec2 o = vec2(hash(id + seed + 3.1), hash(id + seed + 7.7)) - 0.5;
    float d = length(f - o * 0.7);
    float on = step(0.93, h);
    float tw = 0.65 + 0.35 * sin(uTime * (0.8 + h * 2.5) + h * 40.0);
    return on * smoothstep(0.09, 0.0, d) * tw * (0.4 + (h - 0.93) * 9.0);
  }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 p = (frag - uCenter) / uR;
    float r = length(p);

    // Point-mass lens: the sky behind is seen at beta = theta - E^2 / theta.
    float E = 2.3;
    vec2 beta = p - (E * E) * p / max(r * r, 0.02);
    vec2 sky = (beta * uR + uCenter) / uRes.y + vec2(uTime * 0.004, 0.0);

    vec3 col = vec3(0.008, 0.01, 0.024);
    // Violet / indigo nebula, like the landing sky.
    float neb = fbm(sky * 2.2);
    col += mix(vec3(0.01, 0.025, 0.08), vec3(0.02, 0.04, 0.12), sky.x * 0.5) * smoothstep(0.4, 0.9, neb) * 1.1;
    // Stars (three depths).
    float s = starLayer(sky, 140.0, 1.0) + starLayer(sky, 260.0, 7.0) * 0.7 + starLayer(sky, 520.0, 13.0) * 0.45;
    col += mix(vec3(0.75, 0.86, 1.0), vec3(1.0, 0.98, 0.95), hash(floor(sky * 140.0))) * s;
    // Warm light spilling from the disk around the hole.
    col += vec3(0.18, 0.45, 1.0) * exp(-max(r - 1.0, 0.0) * 0.8) * 0.09 * uIntro;
    // Vignette.
    vec2 v = frag / uRes - 0.5;
    col *= 1.0 - dot(v, v) * 1.1;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const HOLE_FRAG = /* glsl */ `${HEADER}
  // Units: Schwarzschild radius = 1. Light orbits in the Schwarzschild metric
  // obey  d2x/dt2 = -1.5 h^2 x / r^5  (h = |x × v|, conserved), integrated per pixel.
  const float RIN = 3.0;      // innermost stable circular orbit
  const float B = 2.598;      // critical impact parameter = shadow radius
  const float D = 30.0;       // camera distance
  const float INCL = 0.14;    // camera elevation above the disk plane (rad)

  vec3 blackbody(float t) {
    vec3 c1 = vec3(0.02, 0.06, 0.32);
    vec3 c2 = vec3(0.08, 0.34, 1.0);
    vec3 c3 = vec3(0.42, 0.76, 1.0);
    vec3 c4 = vec3(0.9, 0.97, 1.0);
    if (t < 0.45) return mix(c1, c2, t / 0.45);
    if (t < 0.9) return mix(c2, c3, (t - 0.45) / 0.45);
    return mix(c3, c4, clamp((t - 0.9) / 0.6, 0.0, 1.0));
  }

  void main() {
    vec2 p = (gl_FragCoord.xy - uCenter) / uR; // in shadow radii
    // Tilt the whole picture so the disk runs low-left → high-right.
    const float TILT = 0.3;
    p = vec2(cos(TILT) * p.x + sin(TILT) * p.y, -sin(TILT) * p.x + cos(TILT) * p.y);
    float rout = 15.0 * uSpread;
    // Outside anything the disk (or its lensed images) can reach: fully transparent.
    vec2 reach = p / vec2(rout / B + 0.6, 3.1);
    if (dot(reach, reach) > 1.0 && dot(p, p) > 9.0) {
      gl_FragColor = vec4(0.0);
      return;
    }

    vec3 camPos = vec3(0.0, sin(INCL), cos(INCL)) * D;
    vec3 fwd = normalize(-camPos);
    vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, fwd);
    vec3 pos = camPos;
    vec3 vel = normalize(fwd + (right * p.x + up * p.y) * (B / D));
    vec3 hv = cross(pos, vel);
    float h2 = dot(hv, hv);

    vec3 col = vec3(0.0);
    float T = 1.0;           // transmittance (front-to-back)
    bool captured = false;
    bool escaped = false;

    for (int i = 0; i < 420; i++) {
      float r2 = dot(pos, pos);
      float r = sqrt(r2);
      float dt = clamp(0.04 * r * r / (r + 2.0), 0.018, 1.2);
      vec3 prev = pos;
      vel += -1.5 * h2 * pos / (r2 * r2 * r) * dt;
      pos += vel * dt;
      if (dot(pos, pos) < 1.0) {
        captured = true;
        break;
      }
      // Crossing the disk plane (y = 0)?
      if (prev.y * pos.y < 0.0) {
        vec3 hit = mix(prev, pos, prev.y / (prev.y - pos.y));
        float rr = length(hit.xz);
        if (rr > RIN * 0.92 && rr < rout) {
          float ang = atan(hit.z, hit.x);
          float omega = 2.6 / pow(rr, 1.5);                // Keplerian: inner gas laps faster
          float a2 = ang - uTime * omega;
          vec2 q = vec2(cos(a2), sin(a2)) * rr;
          float turb = fbm(q * 0.55 + 7.0);
          // Irregular filaments wound along the orbit (long in angle, thin in radius).
          float fil = noise(vec2(rr * 7.0 + turb * 2.5, a2 * 1.4)) * 0.65 + noise(vec2(rr * 17.0, a2 * 2.6 + 3.0)) * 0.35;
          fil = smoothstep(0.15, 0.95, fil);
          // Fine-scale clumps and lanes (visible now that the disk renders at full resolution).
          float micro = noise(vec2(rr * 38.0, a2 * 6.0)) * 0.5 + noise(vec2(rr * 80.0, a2 * 11.0 + 5.0)) * 0.3 + noise(vec2(rr * 150.0, a2 * 18.0 + 9.0)) * 0.2;
          fil *= 0.7 + 0.45 * micro;
          float x = RIN / rr;
          float temp = pow(x, 0.75) * pow(max(1.0 - sqrt(x), 0.0), 0.25) * 2.4;
          // Doppler beaming + gravitational redshift.
          vec3 orbit = normalize(vec3(-hit.z, 0.0, hit.x));
          float beta = sqrt(0.5 / rr);
          float cosT = dot(orbit, -normalize(vel));
          float g = sqrt(1.0 - beta * beta) / (1.0 - beta * cosT) * sqrt(max(1.0 - 1.0 / rr, 0.0));
          float I = temp * pow(g, 3.0) * (0.45 + 0.8 * turb) * (0.6 + 0.4 * fil);
          vec3 emis = blackbody(clamp(temp * g * 1.05, 0.0, 1.5)) * I * 2.6;
          float edge = smoothstep(RIN * 0.92, RIN + 1.0, rr) * (1.0 - smoothstep(rout * 0.6, rout, rr));
          float a = clamp(edge * (0.55 + 0.45 * turb) * (0.75 + 0.25 * fil), 0.0, 0.97);
          col += T * emis * a;
          T *= 1.0 - a;
          if (T < 0.02) break;
        }
      }
      if (r > D * 1.15 && dot(pos, vel) > 0.0) {
        escaped = true;
        break;
      }
    }
    // Rays still skimming the photon sphere when steps run out never get out either.
    if (!escaped && T > 0.02 && length(pos) < 8.0) captured = true;

    float alpha = captured ? 1.0 : 1.0 - T;
    col += vec3(0.1, 0.32, 0.9) * (1.0 - T) * 0.12;
    col = 1.0 - exp(-col * 1.45);
    // Keep the hues rich after tone mapping (no washed-out grey).
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, 1.25);
    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha) * uIntro; // premultiplied
  }
`;


const VERT = 'attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';

/** A canvas that draws one full-screen fragment shader. Returns null if WebGL is unavailable. */
export function createShaderLayer(canvas, frag, { alpha = false } = {}) {
  const gl = canvas.getContext('webgl', {
    alpha,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  // One oversized triangle covers the screen.
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {};
  const u = (name) => (name in uniforms ? uniforms[name] : (uniforms[name] = gl.getUniformLocation(prog, name)));

  return {
    resize(w, h, dpr) {
      const W = Math.max(1, Math.round(w * dpr));
      const H = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      gl.viewport(0, 0, W, H);
    },
    draw(values) {
      for (const [name, v] of Object.entries(values)) {
        const l = u(name);
        if (l === null) continue;
        if (Array.isArray(v)) gl.uniform2f(l, v[0], v[1]);
        else gl.uniform1f(l, v);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      // No loseContext(): a remount (e.g. React StrictMode) reuses this canvas's context.
    },
  };
}

/* ------------------------------------------------------------------------ */
/*  Photos falling in: subdivided quads bent by the lens equation            */
/* ------------------------------------------------------------------------ */

const PHOTO_VERT = /* glsl */ `
  attribute vec2 aUv;
  uniform vec2 uRes;      // px
  uniform vec2 uHole;     // px (GL, y up)
  uniform float uR;       // shadow radius, px
  uniform float uE;       // Einstein radius, shadow radii
  uniform vec2 uCard;     // card centre in the source plane, px (GL)
  uniform vec2 uSize;     // px
  uniform float uRot;
  uniform float uTidal;   // radial stretch
  uniform float uImage;   // +1 primary image, -1 secondary (mirrored, opposite side)
  varying vec2 vUv;
  varying float vRed;
  void main() {
    vec2 local = (aUv - 0.5) * uSize;
    float c = cos(uRot);
    float s = sin(uRot);
    local = vec2(c * local.x - s * local.y, s * local.x + c * local.y);
    vec2 cen = (uCard - uHole) / uR;
    vec2 b = (uCard + local - uHole) / uR;
    // Tides: stretch along the line to the hole, squeeze across it (spaghettification).
    float dc = max(length(cen), 1e-4);
    vec2 rad = cen / dc;
    vec2 off = b - cen;
    float along = dot(off, rad);
    vec2 across = off - along * rad;
    b = cen + rad * along * (1.0 + uTidal) + across / (1.0 + uTidal * 0.7);
    // Point-mass lens: image positions theta = b (1 ± sqrt(1 + 4E^2/|b|^2)) / 2.
    float bl = max(length(b), 1e-4);
    float k = sqrt(1.0 + 4.0 * uE * uE / (bl * bl));
    vec2 th = b * (1.0 + uImage * k) * 0.5;
    vRed = 1.0 - smoothstep(0.35, 2.4, bl);
    vUv = aUv;
    vec2 px = uHole + th * uR;
    gl_Position = vec4(px / uRes * 2.0 - 1.0, 0.0, 1.0);
  }
`;

const PHOTO_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform vec2 uSize;
  uniform float uAlpha;
  uniform float uHot;
  varying vec2 vUv;
  varying float vRed;
  void main() {
    vec3 c = texture2D(uTex, vUv).rgb;
    // Gold hairlines (outer edge + inset line), like the site's frames.
    vec2 px = vUv * uSize;
    vec2 e2 = min(px, uSize - px);
    float e = min(e2.x, e2.y);
    float outer = 1.0 - smoothstep(0.6, 1.8, e);
    float inner = 1.0 - smoothstep(0.0, 1.0, abs(e - 7.0));
    vec3 gold = vec3(0.96, 0.84, 0.6);
    c = mix(c, gold, clamp(outer * (0.55 + 0.45 * uHot) + inner * (0.22 + 0.3 * uHot), 0.0, 1.0));
    c *= 1.0 + uHot * 0.12;
    // Light climbing out of the well is redshifted and dimmed.
    c = mix(c, c * vec3(0.32, 0.55, 1.0), vRed * 0.85) * (1.0 - vRed * 0.55);
    float a = uAlpha * (1.0 - smoothstep(0.75, 1.0, vRed));
    gl_FragColor = vec4(c * a, a);
  }
`;

/** A transparent canvas that draws the falling photos (textured, lensed grids). */
export function createPhotoLayer(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, PHOTO_VERT);
  const fs = sh(gl.FRAGMENT_SHADER, PHOTO_FRAG);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // Subdivided unit quad: enough vertices for the lens to bend photos into smooth arcs.
  const GX = 40;
  const GY = 28;
  const uv = [];
  for (let y = 0; y <= GY; y++) for (let x = 0; x <= GX; x++) uv.push(x / GX, y / GY);
  const idx = [];
  for (let y = 0; y < GY; y++) {
    for (let x = 0; x < GX; x++) {
      const i = y * (GX + 1) + x;
      idx.push(i, i + 1, i + GX + 1, i + 1, i + GX + 2, i + GX + 1);
    }
  }
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aUv');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const U = {};
  const u = (n) => (n in U ? U[n] : (U[n] = gl.getUniformLocation(prog, n)));
  const textures = [];

  return {
    /** Upload a photo (canvas / image) as texture `i`. */
    setTexture(i, source) {
      const tex = textures[i] ?? (textures[i] = gl.createTexture());
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    },
    resize(w, h, dpr) {
      const W = Math.max(1, Math.round(w * dpr));
      const H = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      gl.viewport(0, 0, W, H);
    },
    /** cards: [{ tex, card:[x,y], size:[w,h], rot, tidal, alpha, hot, secondary }] */
    draw(globals, cards) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u('uRes'), globals.res[0], globals.res[1]);
      gl.uniform2f(u('uHole'), globals.hole[0], globals.hole[1]);
      gl.uniform1f(u('uR'), globals.R);
      gl.uniform1f(u('uE'), globals.E);
      gl.uniform1i(u('uTex'), 0);
      gl.activeTexture(gl.TEXTURE0);
      for (const c of cards) {
        const tex = textures[c.tex];
        if (!tex || c.alpha <= 0.002) continue;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform2f(u('uCard'), c.card[0], c.card[1]);
        gl.uniform2f(u('uSize'), c.size[0], c.size[1]);
        gl.uniform1f(u('uRot'), c.rot);
        gl.uniform1f(u('uTidal'), c.tidal);
        gl.uniform1f(u('uHot'), c.hot);
        // Secondary (mirrored) image first, fainter, then the primary on top.
        gl.uniform1f(u('uImage'), -1);
        gl.uniform1f(u('uAlpha'), c.alpha * c.secondary);
        if (c.secondary > 0.01) gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
        gl.uniform1f(u('uImage'), 1);
        gl.uniform1f(u('uAlpha'), c.alpha);
        gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      }
    },
    destroy() {
      textures.forEach((t) => gl.deleteTexture(t));
      gl.deleteBuffer(vbo);
      gl.deleteBuffer(ibo);
      gl.deleteProgram(prog);
    },
  };
}

/**
 * The same ray-traced hole in the warm "Interstellar" palette: deep red →
 * orange → peach → white-hot, with a warm glow (used by the landing page's
 * Travel-back-in-time button).
 */
export const HOLE_FRAG_WARM = HOLE_FRAG.replace(
  `    vec3 c1 = vec3(0.02, 0.06, 0.32);
    vec3 c2 = vec3(0.08, 0.34, 1.0);
    vec3 c3 = vec3(0.42, 0.76, 1.0);
    vec3 c4 = vec3(0.9, 0.97, 1.0);`,
  `    vec3 c1 = vec3(0.32, 0.05, 0.03);
    vec3 c2 = vec3(1.0, 0.36, 0.12);
    vec3 c3 = vec3(1.0, 0.76, 0.56);
    vec3 c4 = vec3(1.0, 0.97, 0.93);`,
).replace('col += vec3(0.1, 0.32, 0.9) * (1.0 - T) * 0.12;', 'col += vec3(0.9, 0.42, 0.22) * (1.0 - T) * 0.12;');
