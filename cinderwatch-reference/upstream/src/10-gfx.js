
const L_DIRT = 0, L_ROCK = 1, L_MASON = 2, L_WOOD = 3, L_COBBLE = 4, L_METAL = 5, L_SLATE = 6, L_CLOTH = 7, L_PLAIN = 8, L_BONE = 9, L_THATCH = 10;
const TEX_LAYERS = 11, TEX_N = 64;

function pnoise2(x, y, perX, perY, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const mx = k => ((k % perX) + perX) % perX, my = k => ((k % perY) + perY) % perY;
  const a = h2(mx(xi), my(yi), s), b = h2(mx(xi + 1), my(yi), s), c = h2(mx(xi), my(yi + 1), s), d = h2(mx(xi + 1), my(yi + 1), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function makeDetailTextures() {
  const N = TEX_N, data = new Uint8Array(N * N * 4 * TEX_LAYERS);
  const put = (layer, x, y, r, g, b, h) => {
    const i = ((layer * N + y) * N + x) * 4;
    data[i] = clamp(r * 127.5, 0, 255); data[i + 1] = clamp(g * 127.5, 0, 255); data[i + 2] = clamp(b * 127.5, 0, 255); data[i + 3] = clamp(h * 255, 0, 255);
  };
  const CG = 8, CS = N / CG, sites = [];
  for (let j = 0; j < CG; j++) for (let i = 0; i < CG; i++) sites.push([(i + .2 + .6 * h2(i, j, 11)) * CS, (j + .2 + .6 * h2(i, j, 12)) * CS, h2(i, j, 13), h2(i, j, 14)]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    {
      const n = pfbm(x / 8, y / 8, 8, 1, 4), sp = h2(x, y, 3), n2 = pfbm(x / 16, y / 16, 4, 5, 2);
      let m = .78 + .34 * n + (n2 - .5) * .2, h = .35 + .35 * n;
      if (sp > .985) { m += .14; h += .4; } else if (sp < .03) { m -= .1; h -= .12; }
      put(L_DIRT, x, y, m * 1.02, m, m * .97, h);
    }
    {
      const n = pfbm(x / 8, y / 8, 8, 21, 4), n2 = pfbm(x / 16, y / 16, 4, 23, 3), n3 = pfbm(x / 16 + 9, y / 16 + 3, 4, 27, 3);
      const crack = (Math.abs(n2 - .5) < .022 || Math.abs(n3 - .52) < .016) ? 1 : 0;
      const strata = Math.sin((y + n2 * 26) * TAU / 16) * .05;
      const m = .74 + .42 * n + strata - crack * .34 + (h2(x, y, 29) - .5) * .08, h = .3 + .6 * n - crack * .4;
      put(L_ROCK, x, y, m, m, m * 1.03, h);
    }
    {
      const row = Math.floor(y / 8), ox = (row & 1) ? 8 : 0, bx = Math.floor((x + ox) / 16), lx = (x + ox) % 16, ly = y % 8;
      const id = h2(bx % 4, row, 31), id2 = h2(bx % 4, row, 32);
      const mortar = (ly === 0 || lx === 0);
      const n = pnoise2(x / 2, y / 2, 32, 32, 33) - .5;
      let m = .8 + .32 * id + n * .2, h = .66 + .2 * id2 + n * .15;
      if (id2 > .86) { m -= .12; h -= .22; }
      if (ly === 1 || lx === 1) { m += .09; }
      if (ly === 7 || lx === 15) { m -= .1; }
      let r = m * (1 + (id - .5) * .06), g = m, b = m * (1 - (id - .5) * .08);
      if (mortar) { r = g = b = .46 + n * .1; h = .12; }
      put(L_MASON, x, y, r, g, b, h);
    }
    {
      const pl = Math.floor(x / 8), lx = x % 8, id = h2(pl, 0, 41);
      const grain = pnoise2(x * 1.25, y / 7, 80, 9, 42 + pl), g2 = pnoise2(x * 2.5, y / 3, 160, 21, 44);
      let m = .8 + .28 * id + (grain - .5) * .34 + (g2 - .5) * .12, h = .55 + grain * .25;
      const joint = Math.floor(8 + id * 48);
      if (lx === 0 || y === joint) { m = .42; h = .1; }
      else if (lx === 1) m += .06; else if (lx === 7) m -= .08;
      if ((y === (joint + 3) % N || y === (joint + N - 3) % N) && (lx === 2 || lx === 6)) { m = .38; h = .8; }
      const knot = dist2(lx, y, 4, (joint + 29) % N); if (knot < 5 && id > .5) { m -= .2 * (1 - knot / 5); }
      put(L_WOOD, x, y, m * 1.03, m, m * .95, h);
    }
    {
      let d1 = 1e9, d2 = 1e9, s1 = null;
      for (const s of sites) {
        let dx = Math.abs(x + .5 - s[0]), dy = Math.abs(y + .5 - s[1]); if (dx > N / 2) dx = N - dx; if (dy > N / 2) dy = N - dy;
        const d = Math.sqrt(dx * dx * .85 + dy * dy * 1.15);
        if (d < d1) { d2 = d1; d1 = d; s1 = s; } else if (d < d2) d2 = d;
      }
      const edge = d2 - d1, n = pnoise2(x / 2, y / 2, 32, 32, 51) - .5;
      let m, h, r, g, b;
      if (edge < 1.15) { m = .36 + n * .1; h = .04; r = m * 1.04; g = m; b = m * .95; }
      else {
        const dome = smooth(1.15, 4.2, edge);
        m = .7 + .42 * s1[2] + n * .16 + dome * .1; h = .25 + .7 * dome + n * .1;
        const warm = (s1[3] - .5) * .12; r = m * (1 + warm); g = m; b = m * (1 - warm);
        if (s1[2] > .9) { r *= .8; g *= .8; b *= .82; h *= .7; }
      }
      put(L_COBBLE, x, y, r, g, b, h);
    }
    {
      const st = pnoise2(x / 3, y * 1.5, 21, 96, 61) - .5, rust = pfbm(x / 16, y / 16, 4, 63, 3), pit = h2(x, y, 65);
      let m = .92 + st * .22, r = m, g = m, b = m * 1.03, h = .5 + st * .12;
      if (rust > .58) { const k = smooth(.58, .72, rust); r = lerp(r, m * 1.05, k); g = lerp(g, m * .74, k); b = lerp(b, m * .55, k); h -= .08 * k; }
      if (pit < .03) { r *= .7; g *= .7; b *= .7; h -= .2; }
      if ((x % 16 === 2 || x % 16 === 13) && (y % 16 === 2 || y % 16 === 13)) { r *= 1.25; g *= 1.25; b *= 1.25; h = 1; }
      put(L_METAL, x, y, r, g, b, h);
    }
    {
      const row = Math.floor(y / 8), ox = (row & 1) ? 4 : 0, bx = Math.floor((x + ox) / 8), lx = (x + ox) % 8, ly = y % 8;
      const id = h2(bx % 8, row, 71), n = pnoise2(x / 2, y / 2, 32, 32, 73) - .5;
      let m = .78 + .34 * id + n * .14, h = .3 + .55 * (ly / 7);
      if (ly === 7) { m += .1; } if (ly === 0) { m -= .3; h = .1; } if (lx === 0) { m -= .2; h -= .2; }
      put(L_SLATE, x, y, m * .98, m, m * 1.05, h);
    }
    {
      const w = ((x + y) & 1) ? 1.05 : .95, n = pfbm(x / 16, y / 16, 4, 81, 3), st = pfbm(x / 8 + 3, y / 8, 8, 83, 2);
      let m = w * (.84 + .3 * n); if (st > .66) m *= .78;
      put(L_CLOTH, x, y, m, m, m, .5 + (w - 1) * .8);
    }
    { const n = pnoise2(x / 2, y / 2, 32, 32, 91) - .5; put(L_PLAIN, x, y, 1 + n * .07, 1 + n * .07, 1 + n * .07, .5 + n * .1); }
    {
      const st = pnoise2(x / 2, y / 6, 32, 11, 95) - .5, pit = h2(x, y, 97);
      let m = .96 + st * .2; if (pit < .04) m -= .22;
      put(L_BONE, x, y, m * 1.02, m, m * .94, .5 + st * .25);
    }
    {
      const st = pnoise2(x * 1.6, y / 5, 103, 13, 101), row = (y % 16);
      let m = .76 + .42 * st; if (row === 0) m -= .3; if (row === 1) m += .08;
      put(L_THATCH, x, y, m * 1.04, m, m * .88, .3 + st * .5 + (row / 16) * .2);
    }
  }
  const mk = (linear) => {
    const t = new THREE.DataArrayTexture(data, N, N, TEX_LAYERS);
    t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = linear ? THREE.LinearFilter : THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
  };
  return { albedo: mk(false), height: mk(true) };
}

THREE.ShaderChunk.lights_pars_begin = THREE.ShaderChunk.lights_pars_begin.replace('max( pow( lightDistance, decayExponent ), 0.01 )', '( pow( lightDistance, decayExponent ) + 1.6 )');
THREE.ShaderChunk.lights_fragment_begin = THREE.ShaderChunk.lights_fragment_begin.split('RE_Direct( directLight,').join('if ( directLight.visible ) RE_Direct( directLight,');
const SH = {
  uTime: { value: 0 }, uTexA: { value: null }, uTexH: { value: null }, uBump: { value: 0.055 },
  uSky: { value: new THREE.Color(0.012, 0.022, 0.045) }, uWind: { value: 1 },
};

function litMaterial(kind, params = {}) {
  const mat = new THREE.MeshStandardMaterial(Object.assign({ vertexColors: kind !== 'water', roughness: 1, metalness: 0 }, params));
  const inst = kind === 'inst', water = kind === 'water';
  mat.customProgramCacheKey = () => 'cw-' + kind;
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = SH.uTime; sh.uniforms.uTexA = SH.uTexA; sh.uniforms.uTexH = SH.uTexH; sh.uniforms.uBump = SH.uBump; sh.uniforms.uSky = SH.uSky; sh.uniforms.uWind = SH.uWind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 aSurf; varying vec4 vSurf; varying vec2 vTuv; uniform float uTime; uniform float uWind;
${inst ? 'attribute float aFlash; varying float vFlash;' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vSurf = aSurf; vTuv = uv;
${inst ? 'vFlash = aFlash;' : ''}
${(!water && !inst) ? `if (aSurf.z > 0.0) {
  float ph = uTime * 1.6 + position.x * 0.9 + position.z * 0.7;
  float g = sin(ph) * 0.6 + sin(ph * 2.3 + 1.7) * 0.4;
  transformed.x += g * 0.07 * aSurf.z * uWind; transformed.z += cos(ph * 0.8) * 0.05 * aSurf.z * uWind; transformed.y += sin(ph * 1.9) * 0.02 * aSurf.z * uWind;
}` : ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
precision highp sampler2DArray;
uniform sampler2DArray uTexA; uniform sampler2DArray uTexH; uniform float uBump; uniform float uTime; uniform vec3 uSky;
varying vec4 vSurf; varying vec2 vTuv;
${inst ? 'varying float vFlash;' : ''}
vec3 cwBump(vec3 P, vec3 N, float dBx, float dBy, float sc) {
  vec3 dPdx = dFdx(P), dPdy = dFdy(P);
  vec3 R1 = cross(dPdy, N), R2 = cross(N, dPdx);
  float det = dot(dPdx, R1);
  vec3 grad = sign(det) * (dBx * R1 + dBy * R2);
  return normalize(abs(det) * N - sc * grad);
}
float cwH(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float cwN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(cwH(i), cwH(i + vec2(1.0, 0.0)), f.x), mix(cwH(i + vec2(0.0, 1.0)), cwH(i + vec2(1.0, 1.0)), f.x), f.y); }
float cwRipple(vec2 p, float t, float flow) {
  float a = cwN(vec2(p.x * 2.6, p.y * 1.3 - t * flow * 1.0));
  float b = cwN(vec2(p.x * 5.2 + 3.7, p.y * 2.6 - t * (0.15 + flow * 1.4)));
  return a * 1.0 + b * 0.9;
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float cwL = floor(vSurf.x + 0.5);
${water ? 'vec4 cwT = vec4(0.5);' : 'vec4 cwT = texture(uTexA, vec3(vTuv, cwL)); diffuseColor.rgb *= cwT.rgb * 2.0;'}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(vSurf.y * (1.15 - 0.3 * cwT.a), 0.045, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
${water ? `{
  float h0 = cwRipple(vTuv, uTime, vSurf.z);
  normal = cwBump(-vViewPosition, normal, dFdx(h0), dFdy(h0), 0.03 + 0.09 * min(vSurf.z, 1.0));
}` : `{
  vec2 cdx = dFdx(vTuv), cdy = dFdy(vTuv);
  float h0 = texture(uTexH, vec3(vTuv, cwL)).a;
  float hx = texture(uTexH, vec3(vTuv + cdx, cwL)).a - h0;
  float hy = texture(uTexH, vec3(vTuv + cdy, cwL)).a - h0;
  normal = cwBump(-vViewPosition, normal, hx, hy, uBump);
}`}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * vSurf.w * 6.0;
${inst ? 'totalEmissiveRadiance += vec3(1.0, 0.8, 0.55) * vFlash * 0.55;' : ''}`)
      .replace('#include <opaque_fragment>', `${water ? 'outgoingLight += uSky * (0.4 + 4.0 * pow(1.0 - clamp(normal.z, 0.0, 1.0), 2.0)) * (1.5 - 0.6 * min(vSurf.z, 1.0));' : ''}
#include <opaque_fragment>`);
  };
  return mat;
}

const ZERO3 = [0, 0, 0], WHITE = [1, 1, 1];
const GEO_CACHE = {};
function baseGeo(key, make) {
  let e = GEO_CACHE[key];
  if (!e) { let g = make(); if (g.index) g = g.toNonIndexed(); e = GEO_CACHE[key] = { pos: g.attributes.position.array, nrm: g.attributes.normal.array }; }
  return e;
}
const gBox = () => baseGeo('box', () => new THREE.BoxGeometry(1, 1, 1));
const gCyl = (n = 8, rt = 1, open = false) => baseGeo('cyl' + n + '_' + rt + (open ? 'o' : ''), () => new THREE.CylinderGeometry(rt, 1, 1, n, 1, open));
const gIco = (d = 1) => baseGeo('ico' + d, () => new THREE.IcosahedronGeometry(1, d));
const gSph = (w = 8, h = 6) => baseGeo('sph' + w + '_' + h, () => new THREE.SphereGeometry(1, w, h));
const gDome = (w = 8, h = 4) => baseGeo('dome' + w + '_' + h, () => new THREE.SphereGeometry(1, w, h, 0, TAU, 0, HPI));
const gOct = () => baseGeo('oct', () => new THREE.OctahedronGeometry(1, 0));
const gTorus = (n = 10, t = 0.2, m = 5) => baseGeo('tor' + n + '_' + t + '_' + m, () => new THREE.TorusGeometry(1, t, m, n));

const _sv = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], _sn = new THREE.Vector3(), _snv = new THREE.Vector3();
const _sq = new THREE.Quaternion(), _se = new THREE.Euler(), _sa = new THREE.Vector3(), _sb = new THREE.Vector3(), _ss = new THREE.Vector3(), _sm = new THREE.Matrix4(), _sp = new THREE.Vector3();
let soupRng = makeRng(777);

class Soup {
  constructor() { this.P = []; this.N = []; this.K = []; this.U = []; this.S = []; }
  get verts() { return this.P.length / 3; }
  clear() { this.P.length = this.N.length = this.K.length = this.U.length = this.S.length = 0; return this; }
  v(x, y, z, nx, ny, nz, r, g, b, u, w, layer, rough, sway = 0, emis = 0) {
    this.P.push(x, y, z); this.N.push(nx, ny, nz); this.K.push(r, g, b); this.U.push(u, w); this.S.push(layer, rough, sway, emis);
  }
  tri(a, b, c, col, layer, rough, o) {
    _sa.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _sb.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]); _sn.crossVectors(_sa, _sb);
    const len = _sn.length(); if (len < 1e-10) return; _sn.multiplyScalar(1 / len);
    const ax = Math.abs(_sn.x), ay = Math.abs(_sn.y), az = Math.abs(_sn.z), mode = (ay >= ax && ay >= az) ? 0 : (ax >= az ? 1 : 2);
    const sw = o && o.sway || 0, em = o && o.emis || 0, uvs = o && o.uvs || 0.25;
    for (const p of [a, b, c]) {
      const u = mode === 0 ? p[0] : (mode === 1 ? p[2] : p[0]), w = mode === 0 ? p[2] : p[1];
      const cc = p.length > 3 ? p[3] : col;
      this.v(p[0], p[1], p[2], _sn.x, _sn.y, _sn.z, cc[0], cc[1], cc[2], u * uvs, w * uvs, layer, rough, sw, em);
    }
  }
  quad(a, b, c, d, col, layer, rough, o) { this.tri(a, b, c, col, layer, rough, o); this.tri(a, c, d, col, layer, rough, o); }
  add(src, o) {
    const sp = src.pos, sn = src.nrm, n = sp.length;
    let sx = 1, sy = 1, sz = 1; const s = o.s;
    if (s !== undefined) { if (typeof s === 'number') sx = sy = sz = s; else { sx = s[0]; sy = s[1]; sz = s[2]; } }
    const q = _sq; if (o.q) q.copy(o.q); else if (o.r) q.setFromEuler(_se.set(o.r[0], o.r[1], o.r[2], o.ro || 'XYZ')); else q.identity();
    const p = o.p || ZERO3, px = p[0], py = p[1], pz = p[2];
    const c = o.c || WHITE, jit = o.jit === undefined ? 0.07 : o.jit, k = 1 + (soupRng() * 2 - 1) * jit;
    const cr = c[0] * k, cg = c[1] * k, cb = c[2] * k;
    const layer = o.l === undefined ? L_PLAIN : o.l, rough = o.rough === undefined ? 0.92 : o.rough, sway = o.sway || 0, emis = o.emis || 0;
    const uvs = o.uvs === undefined ? 0.25 : o.uvs, uo = Math.floor(soupRng() * 64) / 16, vo = Math.floor(soupRng() * 64) / 16;
    const smoothN = !!o.smooth, deform = o.deform, grad = o.grad, cf = o.cf, swayf = o.swayf, c2 = o.c2;
    const P = this.P, N = this.N, K = this.K, U = this.U, S = this.S, start = P.length;
    for (let i = 0; i < n; i += 9) {
      for (let j = 0; j < 3; j++) { const v = _sv[j]; v.set(sp[i + j * 3] * sx, sp[i + j * 3 + 1] * sy, sp[i + j * 3 + 2] * sz); if (deform) deform(v); }
      _sa.subVectors(_sv[1], _sv[0]); _sb.subVectors(_sv[2], _sv[0]); _sn.crossVectors(_sa, _sb);
      const len = _sn.length(); if (len < 1e-12) continue; _sn.multiplyScalar(1 / len);
      const ax = Math.abs(_sn.x), ay = Math.abs(_sn.y), az = Math.abs(_sn.z), mode = (ay >= ax && ay >= az) ? 0 : (ax >= az ? 1 : 2);
      for (let j = 0; j < 3; j++) {
        const v = _sv[j];
        const u = mode === 0 ? v.x : (mode === 1 ? v.z : v.x), w = mode === 0 ? v.z : v.y;
        U.push(u * uvs + uo, w * uvs + vo);
        let g = 1; if (grad) g = lerp(grad[2], 1, smooth(grad[0], grad[1], v.y));
        if (cf) g *= cf(v);
        if (c2) { const t = c2[3](v); K.push(lerp(cr, c2[0], t) * g, lerp(cg, c2[1], t) * g, lerp(cb, c2[2], t) * g); }
        else K.push(cr * g, cg * g, cb * g);
        S.push(layer, rough, swayf ? swayf(v) : sway, emis);
        if (smoothN) _snv.set(sn[i + j * 3] / sx, sn[i + j * 3 + 1] / sy, sn[i + j * 3 + 2] / sz).normalize().applyQuaternion(q);
        else _snv.copy(_sn).applyQuaternion(q);
        N.push(_snv.x, _snv.y, _snv.z);
        v.applyQuaternion(q);
        P.push(v.x + px, v.y + py, v.z + pz);
      }
    }
    if (o.dbl) this._double(start);
    return this;
  }
  _double(start) {
    const P = this.P, N = this.N, K = this.K, U = this.U, S = this.S, end = P.length;
    for (let i = start; i < end; i += 9) {
      for (const j of [0, 2, 1]) {
        const a = i + j * 3, vi = a / 3;
        P.push(P[a], P[a + 1], P[a + 2]); N.push(-N[a], -N[a + 1], -N[a + 2]); K.push(K[a], K[a + 1], K[a + 2]);
        U.push(U[vi * 2], U[vi * 2 + 1]); S.push(S[vi * 4], S[vi * 4 + 1], S[vi * 4 + 2], S[vi * 4 + 3]);
      }
    }
  }
  box(w, h, d, x, y, z, c, o = {}) { o.s = [w, h, d]; o.p = [x, y, z]; o.c = c; return this.add(gBox(), o); }
  cyl(r, h, x, y, z, c, o = {}) { o.s = [r, h, o.rz === undefined ? r : o.rz]; o.p = [x, y, z]; o.c = c; return this.add(gCyl(o.n || 8, o.rt === undefined ? 1 : o.rt, o.open), o); }
  cone(r, h, x, y, z, c, o = {}) { o.s = [r, h, r]; o.p = [x, y, z]; o.c = c; return this.add(gCyl(o.n || 6, 0), o); }
  ico(r, x, y, z, c, o = {}) { o.s = o.sc ? [r * o.sc[0], r * o.sc[1], r * o.sc[2]] : r; o.p = [x, y, z]; o.c = c; return this.add(gIco(o.d === undefined ? 1 : o.d), o); }
  sph(r, x, y, z, c, o = {}) { o.s = o.sc ? [r * o.sc[0], r * o.sc[1], r * o.sc[2]] : r; o.p = [x, y, z]; o.c = c; if (o.smooth === undefined) o.smooth = true; return this.add(gSph(o.w || 8, o.h || 6), o); }
  rock(r, x, y, z, c, o = {}) {
    const sd = soupRng() * 100, f = 1.5 / r, sq = o.sq === undefined ? 0.75 : o.sq;
    o.deform = v => { const k = .72 + .56 * vnoise(v.x * f + v.y * f * .7 + sd, v.z * f - v.y * f * .6 + sd, 7); v.multiplyScalar(k); v.y *= sq; };
    if (o.l === undefined) o.l = L_ROCK; if (o.r === undefined) o.r = [soupRng() * .5, soupRng() * TAU, soupRng() * .5];
    o.s = r; o.p = [x, y, z]; o.c = c; return this.add(gIco(o.d === undefined ? 1 : o.d), o);
  }
  merge(o2, opt = {}) {
    const p = opt.p || ZERO3, s = opt.s === undefined ? 1 : opt.s, q = _sq;
    if (opt.q) q.copy(opt.q); else if (opt.r) q.setFromEuler(_se.set(opt.r[0], opt.r[1], opt.r[2])); else q.setFromEuler(_se.set(0, opt.ry || 0, 0));
    const tint = opt.tint, ao = opt.ao, nv = o2.P.length;
    const P = this.P, N = this.N, K = this.K;
    for (let i = 0; i < nv; i += 3) {
      const ly = o2.P[i + 1];
      _sp.set(o2.P[i] * s, ly * s, o2.P[i + 2] * s).applyQuaternion(q); P.push(_sp.x + p[0], _sp.y + p[1], _sp.z + p[2]);
      _sp.set(o2.N[i], o2.N[i + 1], o2.N[i + 2]).applyQuaternion(q); N.push(_sp.x, _sp.y, _sp.z);
      let g = 1; if (ao) g = lerp(ao[2], 1, smooth(ao[0], ao[1], ly));
      if (tint) K.push(o2.K[i] * tint[0] * g, o2.K[i + 1] * tint[1] * g, o2.K[i + 2] * tint[2] * g); else K.push(o2.K[i] * g, o2.K[i + 1] * g, o2.K[i + 2] * g);
    }
    for (let i = 0; i < o2.U.length; i++) this.U.push(o2.U[i]);
    for (let i = 0; i < o2.S.length; i++) this.S.push(o2.S[i]);
    return this;
  }
  mirrorXZ() {
    const P = this.P, N = this.N, K = this.K, U = this.U, S = this.S;
    for (let i = 0; i < P.length; i += 3) { let t = P[i]; P[i] = P[i + 2]; P[i + 2] = t; t = N[i]; N[i] = N[i + 2]; N[i + 2] = t; }
    const sw = (arr, a, b, n) => { for (let k = 0; k < n; k++) { const t = arr[a + k]; arr[a + k] = arr[b + k]; arr[b + k] = t; } };
    for (let v = 0; v < P.length / 3; v += 3) { sw(P, (v + 1) * 3, (v + 2) * 3, 3); sw(N, (v + 1) * 3, (v + 2) * 3, 3); sw(K, (v + 1) * 3, (v + 2) * 3, 3); sw(U, (v + 1) * 2, (v + 2) * 2, 2); sw(S, (v + 1) * 4, (v + 2) * 4, 4); }
    return this;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.P), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.N), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.K), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(this.U), 2));
    g.setAttribute('aSurf', new THREE.BufferAttribute(new Float32Array(this.S), 4));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

const COL = {
  stone: C(0x767b88), stoneD: C(0x4c505c), stoneL: C(0x9499a4), basalt: C(0x30323c), basaltL: C(0x454856),
  earth: C(0x54473c), earthD: C(0x352d27), grass: C(0x55583f), grassD: C(0x3f4231), moss: C(0x48553a),
  road: C(0x8a8176), roadD: C(0x5e574e), mud: C(0x43362b),
  wood: C(0x7a5c40), woodD: C(0x4e3a26), woodL: C(0x9a7a54), bark: C(0x3a3029), rope: C(0x8a7754),
  iron: C(0x3c4049), ironL: C(0x646b78), steel: C(0x8a93a2), brass: C(0x9a7b3a), bronze: C(0x7a5a34), gold: C(0xe2aa3c),
  bone: C(0xe0d7c0), boneD: C(0xa39a84), clothR: C(0x7c2c24), clothB: C(0x2f4c6c), clothD: C(0x2a2622), clothT: C(0x8a8068),
  slate: C(0x424a5a), thatch: C(0x8a7646), black: C(0x08090c), ember: C(0xff7a2a), crystal: C(0x7fc4ff),
  slime: C(0x4a6a44), slimeD: C(0x28402c), rat: C(0x51453c), ratD: C(0x372e28), bat: C(0x2e2a36), ogre: C(0x93a076), ogreD: C(0x63704e), leather: C(0x5a4030), skin: C(0xb98a6a),
};
