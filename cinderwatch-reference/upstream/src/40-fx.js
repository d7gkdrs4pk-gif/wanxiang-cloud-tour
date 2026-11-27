
const LT = {
  hemi: null, moon: null, fill: null, beacon: null, spots: [], towers: [], flashes: [], torches: [],
  beaconBase: 1500, beaconLevel: 1, beaconGutter: 0, beaconOn: 1, cold: 0, emitters: [], spotTimer: 0,
};
function initLights() {
  const S = R.scene;
  LT.hemi = new THREE.HemisphereLight(0x6d83bd, 0x1c1f2a, 1.15); S.add(LT.hemi);
  const moon = LT.moon = new THREE.DirectionalLight(0xa9c0f6, 1.55); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  const sc = moon.shadow.camera; sc.left = -31; sc.right = 31; sc.top = 31; sc.bottom = -31; sc.near = 5; sc.far = 130; moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.06;
  S.add(moon); S.add(moon.target);
  LT.fill = new THREE.DirectionalLight(0x4a5f96, 0.3); LT.fill.position.set(30, 14, 34); S.add(LT.fill);
  const b = LT.beacon = new THREE.PointLight(0xff8a3a, 0, 80, 2); b.castShadow = true; b.shadow.mapSize.set(1024, 1024);
  b.shadow.camera.near = .5; b.shadow.camera.far = 80; b.shadow.bias = -0.004; b.shadow.normalBias = 0.05; S.add(b);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.SpotLight(0xff9646, 0, 17, 1.12, .85, 2); s.castShadow = true; s.shadow.mapSize.set(1024, 1024);
    s.shadow.camera.near = .4; s.shadow.camera.far = 18; s.shadow.bias = -0.0025; s.shadow.normalBias = 0.04;
    s.position.set(0, 4, 0); S.add(s); S.add(s.target); LT.spots.push({ l: s, owner: null, fade: 0, want: null });
  }
  for (let i = 0; i < 12; i++) { const l = new THREE.PointLight(0xff9646, 0, 11, 2); S.add(l); LT.towers.push(l); }
  for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffc070, 0, 22, 2); S.add(l); LT.flashes.push({ l, t: 1, dur: 1, i0: 0 }); }
  for (let i = 0; i < 5; i++) { const l = new THREE.PointLight(0xff9a50, 0, 7, 2); S.add(l); LT.torches.push({ l, owner: null, cur: 0 }); }
}
function setMoon(B) {
  const m = B.mirrored; LT.moon.position.set(m ? -34 : 14, 44, m ? 14 : -34); LT.moon.target.position.set(0, 0, 0);
}
function lightFlash(x, y, z, color, intensity, dur, range = 24) {
  let best = LT.flashes[0];
  for (const f of LT.flashes) { if (f.t >= 1) { best = f; break; } if (f.l.intensity < best.l.intensity) best = f; }
  best.l.position.set(x, y, z); best.l.color.set(color); best.l.distance = range; best.i0 = intensity; best.t = 0; best.dur = dur; best.l.intensity = intensity;
}
function updateLights(dt, t, focusX, focusZ) {
  LT.beaconGutter = Math.max(0, LT.beaconGutter - dt * 1.6);
  const flick = .86 + .1 * n1(t * 6.3, 1) + .06 * n1(t * 17, 2);
  const lvl = LT.beaconLevel * LT.beaconOn * (1 - .55 * LT.beaconGutter * (0.6 + .4 * Math.sin(t * 40)));
  LT.beacon.intensity = LT.beaconBase * (.35 + .65 * lvl) * (lvl > 0.001 ? 1 : 0) * flick * LT.beaconOn;
  if (LT.beaconPos) LT.beacon.position.set(LT.beaconPos.x + n1(t * 5, 3) * .1, LT.beaconPos.y + .5 + n1(t * 4, 4) * .08, LT.beaconPos.z + n1(t * 5, 5) * .1);
  for (const f of LT.flashes) { if (f.t < 1) { f.t += dt / f.dur; const k = Math.max(0, 1 - f.t); f.l.intensity = f.i0 * k * k; } else f.l.intensity = 0; }
  LT.spotTimer -= dt;
  if (LT.spotTimer <= 0) {
    LT.spotTimer = .4;
    const lit = LT.emitters.filter(e => e && e.alive && e.on > .5 && e.spot);
    const key = e => dist2(e.x, e.z, focusX, focusZ) - (e._spot > .2 ? 12 : 0);
    lit.sort((a, b) => key(a) - key(b));
    const want = lit.slice(0, 3);
    for (const s of LT.spots) s.want = (s.owner && want.includes(s.owner)) ? s.owner : null;
    for (const e of want) if (!LT.spots.some(s => s.want === e)) { const s = LT.spots.find(s => !s.want); if (s) s.want = e; }
  }
  for (const e of LT.emitters) if (e) e._spot = 0;
  for (const s of LT.spots) {
    if (s.owner && (!s.owner.alive || s.owner.on < .05)) { if (s.want === s.owner) s.want = null; }
    if (s.owner !== s.want) { s.fade = Math.max(0, s.fade - dt * 4); if (s.fade <= 0) s.owner = s.want; }
    else if (s.owner) s.fade = Math.min(1, s.fade + dt * 3);
    const e = s.owner;
    if (e) {
      e._spot = s.fade;
      s.l.position.set(e.x, e.y + .25, e.z); s.l.target.position.set(e.x + (e.dx || 0) * 1.2, e.y - 3, e.z + (e.dz || 0) * 1.2);
      s.l.color.setRGB(e.r, e.g, e.b); s.l.intensity = e.I * e.on * (e.fl || 1) * s.fade * 1.25;
    } else s.l.intensity = 0;
  }
  for (let i = 0; i < LT.towers.length; i++) {
    const l = LT.towers[i], e = LT.emitters[i];
    if (e && e.alive) {
      e.fl = .86 + .1 * n1(t * 7 + e.seed, e.seed) + .05 * n1(t * 19 + e.seed, e.seed + 1);
      l.position.set(e.x, e.y, e.z); l.color.setRGB(e.r, e.g, e.b); l.distance = e.range;
      l.intensity = e.I * e.on * e.fl * (1 - .68 * (e._spot || 0));
    } else l.intensity = 0;
  }
}
function updateTorchLights(dt, cands, focusX, focusZ) {
  for (const c of cands) c._ls = c.lI / (1 + dist2(c.lx, c.lz, focusX, focusZ) * .03);
  cands.sort((a, b) => b._ls - a._ls);
  const top = cands.slice(0, 9);
  for (const s of LT.torches) if (s.owner && (!s.owner.alive || !top.includes(s.owner))) s.releasing = true;
  for (let i = 0; i < Math.min(5, top.length); i++) {
    const c = top[i]; if (LT.torches.some(s => s.owner === c)) continue;
    const s = LT.torches.find(s => !s.owner); if (s) { s.owner = c; s.releasing = false; s.cur = 0; }
  }
  for (const s of LT.torches) {
    const o = s.owner;
    if (!o) { s.l.intensity = 0; continue; }
    s.cur = damp(s.cur, s.releasing ? 0 : o.lI, s.releasing ? 20 : 12, dt);
    if (s.releasing && s.cur < .5) { s.owner = null; s.cur = 0; s.l.intensity = 0; continue; }
    if (o.alive) { s.l.position.set(o.lx, o.ly, o.lz); s.l.color.setHex(o.lCol || 0xff9a50); }
    s.l.intensity = s.cur * (.85 + .15 * n1(SH.uTime.value * 9, o.lseed || 0));
  }
}
function collectMistLights() {
  let k = 0; const put = (l, gain) => { if (k >= R.NL) return; R.lightPos[k].copy(l.position); R.lightCol[k].set(l.color.r, l.color.g, l.color.b).multiplyScalar(l.intensity * gain); k++; };
  put(LT.beacon, .05);
  for (const f of LT.flashes) put(f.l, .06);
  const tw = LT.towers.filter(l => l.intensity > 0).sort((a, b) => b.intensity - a.intensity);
  for (const l of tw) put(l, .16);
  for (; k < R.NL; k++) R.lightCol[k].set(0, 0, 0);
}

const SPR_VERT = `
attribute vec3 iPos; attribute vec4 iSize; attribute vec4 iCol; attribute vec4 iMisc;
varying vec2 vUv; varying vec4 vCol; varying vec4 vMisc;
#ifdef LIT
uniform vec3 uLightPos[${12}]; uniform vec3 uLightCol[${12}]; uniform vec3 uAmb;
#endif
void main(){
  vUv = position.xy; vCol = iCol; vMisc = iMisc;
  vec2 q = position.xy; q.y += iSize.w;
  float c = cos(iSize.z), s = sin(iSize.z); q = vec2(q.x * c - q.y * s, q.x * s + q.y * c) * iSize.xy * 0.5;
  #ifdef LIT
  vec3 L = uAmb; for (int i = 0; i < 12; i++) { vec3 d = uLightPos[i] - iPos; L += uLightCol[i] / (dot(d, d) + 3.0); }
  vCol.rgb *= L;
  #endif
  if (iMisc.w > 0.5) { gl_Position = projectionMatrix * viewMatrix * vec4(iPos + vec3(q.x, 0.0, q.y), 1.0); }
  else { vec4 mv = viewMatrix * vec4(iPos, 1.0); mv.xy += q; gl_Position = projectionMatrix * mv; }
}`;
const SPR_NOISE = `
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }`;
const SPR_FRAG_ADD = `
precision highp float; varying vec2 vUv; varying vec4 vCol; varying vec4 vMisc; uniform float uTime;
${SPR_NOISE}
void main(){
  int type = int(vMisc.x + 0.5); float seed = vMisc.y, age = vMisc.z; vec2 p = vUv; float r = length(p);
  vec3 col = vCol.rgb; float a = 0.0;
  if (type == 0) { a = smoothstep(1.0, 0.0, r); a *= a; }
  else if (type == 1) {
    float y = p.y * 0.5 + 0.5, t = uTime * 1.5 + seed * 17.0;
    float n1 = noise(vec2(p.x * 2.6 + seed * 7.0, y * 3.2 - t * 2.3)), n2 = noise(vec2(p.x * 5.5 - seed * 3.0, y * 6.0 - t * 3.9));
    float x = p.x + (n1 - 0.5) * 0.55 * y;
    float w = mix(0.66, 0.02, pow(y, 0.85));
    float body = 1.0 - smoothstep(w * 0.35, w, abs(x));
    float d = body * (1.08 - y) + (n1 * 0.62 + n2 * 0.38 - 0.5) * (0.28 + 0.6 * y) - smoothstep(0.0, 0.07, 0.07 - y) * 0.6;
    a = smoothstep(0.1, 0.16, d);
    col *= mix(vec3(1.0, 0.24, 0.03), vec3(1.0, 0.56, 0.1), smoothstep(0.26, 0.3, d));
    col = mix(col, vCol.rgb * vec3(1.0, 0.86, 0.42), smoothstep(0.46, 0.52, d));
    col = mix(col, vCol.rgb * vec3(1.15, 1.05, 0.8), smoothstep(0.7, 0.78, d));
  }
  else if (type == 2) { a = pow(max(0.0, 1.0 - r), 2.4); }
  else if (type == 3) {
    float n = noise(p * 2.4 + seed * 13.0 + vec2(0.0, -age * 1.6)) * 0.6 + noise(p * 5.2 - seed * 7.0) * 0.4;
    float d = (1.0 - r) + (n - 0.5) * 0.95 - age * 0.95;
    a = smoothstep(0.02, 0.1, d);
    vec3 hot = mix(vec3(0.9, 0.2, 0.03), vec3(1.0, 0.62, 0.16), smoothstep(0.16, 0.24, d));
    hot = mix(hot, vec3(1.1, 0.95, 0.7), smoothstep(0.42, 0.52, d));
    col *= hot * (1.0 - age * 0.55);
  }
  else if (type == 4) { float R0 = 0.25 + 0.75 * sqrt(age); a = smoothstep(0.14, 0.0, abs(r - R0)) * (1.0 - age) * (1.0 - age); }
  else if (type == 5) { float th = atan(p.y, p.x); a = pow(max(0.0, 1.0 - r), 1.6) * (0.25 + 0.75 * pow(abs(cos(th * 2.5 + seed)), 6.0)) * (1.0 - age); a += pow(max(0.0, 1.0 - r * 2.2), 2.0); }
  else if (type == 6) { a = smoothstep(1.0, 0.0, abs(p.y)) * smoothstep(1.0, 0.3, abs(p.x)); }
  else if (type == 7) {
    float th = atan(p.y, p.x), front = mix(-1.5, 1.5, smoothstep(0.0, 0.55, age));
    float band = smoothstep(0.5, 0.74, r) * smoothstep(1.0, 0.9, r);
    float trail = smoothstep(front - 1.5, front, th) * step(th, front) * step(-1.6, th);
    a = band * trail * (1.0 - smoothstep(0.45, 1.0, age));
  }
  gl_FragColor = vec4(col * a * vCol.a, 1.0);
}`;
const SPR_FRAG_ALPHA = `
precision highp float; varying vec2 vUv; varying vec4 vCol; varying vec4 vMisc; uniform float uTime;
${SPR_NOISE}
void main(){
  float seed = vMisc.y, age = vMisc.z; vec2 p = vUv; float r = length(p);
  float n = noise(p * 1.7 + seed * 9.0 + vec2(0.0, -age * 0.6)) * 0.65 + noise(p * 3.9 + seed * 5.0) * 0.35;
  float a = smoothstep(1.0, 0.25, r + (n - 0.5) * 0.9);
  a = floor(a * 4.0 + 0.5) / 4.0;
  gl_FragColor = vec4(vCol.rgb * (0.7 + 0.5 * n), a * vCol.a);
}`;

class SpriteBatch {
  constructor(cap, lit) {
    this.cap = cap; this.n = 0;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); this.aSize = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); this.aMisc = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    for (const a of [this.aPos, this.aSize, this.aCol, this.aMisc]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iSize', this.aSize); g.setAttribute('iCol', this.aCol); g.setAttribute('iMisc', this.aMisc);
    const uniforms = { uTime: SH.uTime };
    if (lit) { uniforms.uLightPos = { value: R.lightPos }; uniforms.uLightCol = { value: R.lightCol }; uniforms.uAmb = { value: new THREE.Vector3(.05, .065, .1) }; }
    const m = new THREE.ShaderMaterial({
      vertexShader: SPR_VERT, fragmentShader: lit ? SPR_FRAG_ALPHA : SPR_FRAG_ADD, uniforms, defines: lit ? { LIT: 1 } : {},
      transparent: true, depthWrite: false, depthTest: true,
      blending: lit ? THREE.NormalBlending : THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
    });
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = lit ? 3 : 4; this.geo = g;
  }
  begin() { this.n = 0; }
  push(x, y, z, w, h, rot, anchor, r, g, b, a, type, seed, age, ground) {
    if (this.n >= this.cap) return; const i = this.n++;
    const P = this.aPos.array, S = this.aSize.array, C = this.aCol.array, M = this.aMisc.array;
    P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; S[i * 4] = w; S[i * 4 + 1] = h; S[i * 4 + 2] = rot; S[i * 4 + 3] = anchor;
    C[i * 4] = r; C[i * 4 + 1] = g; C[i * 4 + 2] = b; C[i * 4 + 3] = a; M[i * 4] = type; M[i * 4 + 1] = seed; M[i * 4 + 2] = age; M[i * 4 + 3] = ground;
  }
  end() {
    this.geo.instanceCount = this.n;
    for (const a of [this.aPos, this.aSize, this.aCol, this.aMisc]) { a.clearUpdateRanges(); a.addUpdateRange(0, this.n * a.itemSize); a.needsUpdate = true; }
  }
}

class SegBatch {
  constructor(cap) {
    this.cap = cap; this.n = 0;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
    this.aA = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); this.aB = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    for (const a of [this.aA, this.aB, this.aCol]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iA', this.aA); g.setAttribute('iB', this.aB); g.setAttribute('iCol', this.aCol);
    const m = new THREE.ShaderMaterial({
      vertexShader: `attribute vec4 iA; attribute vec4 iB; attribute vec4 iCol; varying vec4 vCol; varying vec2 vUv;
void main(){ vec4 a = viewMatrix * vec4(iA.xyz, 1.0), b = viewMatrix * vec4(iB.xyz, 1.0); vec2 d = b.xy - a.xy; float l = max(length(d), 1e-4); vec2 nrm = vec2(-d.y, d.x) / l;
  vec4 p = mix(a, b, position.x); p.xy += nrm * position.y * mix(iA.w, iB.w, position.x); vCol = iCol; vUv = position.xy; gl_Position = projectionMatrix * p; }`,
      fragmentShader: `precision highp float; varying vec4 vCol; varying vec2 vUv; void main(){ float a = 1.0 - abs(vUv.y); a = a * a * (3.0 - 2.0 * a); gl_FragColor = vec4(vCol.rgb * vCol.a * (0.35 + 0.65 * a) * step(0.0, a), 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; this.geo = g;
  }
  begin() { this.n = 0; }
  push(ax, ay, az, aw, bx, by, bz, bw, r, g, b, a) {
    if (this.n >= this.cap) return; const i = this.n++ * 4;
    const A = this.aA.array, Bq = this.aB.array, C = this.aCol.array;
    A[i] = ax; A[i + 1] = ay; A[i + 2] = az; A[i + 3] = aw; Bq[i] = bx; Bq[i + 1] = by; Bq[i + 2] = bz; Bq[i + 3] = bw; C[i] = r; C[i + 1] = g; C[i + 2] = b; C[i + 3] = a;
  }
  end() { this.geo.instanceCount = this.n; for (const a of [this.aA, this.aB, this.aCol]) { a.clearUpdateRanges(); a.addUpdateRange(0, this.n * 4); a.needsUpdate = true; } }
}

class DecalBatch {
  constructor(cap) {
    this.cap = cap; this.G = 4; this.next = 0; this.slots = [];
    const vps = (this.G + 1) * (this.G + 1), g = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(cap * vps * 3), 3); this.uv = new THREE.BufferAttribute(new Float32Array(cap * vps * 2), 2); this.col = new THREE.BufferAttribute(new Float32Array(cap * vps * 4), 4);
    this.pos.setUsage(THREE.DynamicDrawUsage); this.col.setUsage(THREE.DynamicDrawUsage);
    const idx = [];
    for (let s = 0; s < cap; s++) {
      this.slots.push({ life: 0, max: 1, a: 0, seed: 0 });
      for (let j = 0; j <= this.G; j++) for (let i = 0; i <= this.G; i++) { const o = s * vps + j * (this.G + 1) + i; this.uv.array[o * 2] = i / this.G * 2 - 1; this.uv.array[o * 2 + 1] = j / this.G * 2 - 1; }
      for (let j = 0; j < this.G; j++) for (let i = 0; i < this.G; i++) { const a = s * vps + j * (this.G + 1) + i, b = a + 1, c = a + this.G + 2, d = a + this.G + 1; idx.push(a, d, c, a, c, b); }
    }
    g.setAttribute('position', this.pos); g.setAttribute('uv', this.uv); g.setAttribute('aCol', this.col); g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      vertexShader: 'attribute vec4 aCol; varying vec4 vCol; varying vec2 vUv; void main(){ vCol = aCol; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `precision highp float; varying vec4 vCol; varying vec2 vUv; ${SPR_NOISE}
void main(){ float r = length(vUv); float sd = floor(vCol.a) ; float al = fract(vCol.a) * 1.02; float n = noise(vUv * 3.0 + sd * 3.7) * 0.6 + noise(vUv * 7.0 + sd) * 0.4;
  float a = smoothstep(1.0, 0.35, r + (n - 0.5) * 0.8); float th = atan(vUv.y, vUv.x); a *= 0.75 + 0.25 * noise(vec2(th * 3.0, sd));
  gl_FragColor = vec4(vCol.rgb, a * al); }`,
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    });
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 1; this.vps = vps;
  }
  add(heightAt, x, z, size, r, g, b, alpha, life) {
    const s = this.next; this.next = (this.next + 1) % this.cap; const sl = this.slots[s];
    sl.life = life; sl.max = life; sl.a = alpha; sl.seed = Math.floor(rnd() * 90) + 1; sl.r = r; sl.g = g; sl.b = b;
    const P = this.pos.array, rot = rnd() * TAU, cs = Math.cos(rot), sn = Math.sin(rot);
    for (let j = 0; j <= this.G; j++) for (let i = 0; i <= this.G; i++) {
      const o = (s * this.vps + j * (this.G + 1) + i) * 3, lx = (i / this.G * 2 - 1) * size, lz = (j / this.G * 2 - 1) * size, wx = x + lx * cs - lz * sn, wz = z + lx * sn + lz * cs;
      P[o] = wx; P[o + 1] = heightAt(wx, wz) + .05; P[o + 2] = wz;
    }
    this.pos.needsUpdate = true;
  }
  update(dt) {
    const C = this.col.array;
    for (let s = 0; s < this.cap; s++) {
      const sl = this.slots[s]; if (sl.life <= 0 && sl.dead) continue;
      sl.life -= dt; const k = sl.life <= 0 ? 0 : Math.min(1, sl.life / (sl.max * .25)) * sl.a; sl.dead = sl.life <= 0;
      for (let v = 0; v < this.vps; v++) { const o = (s * this.vps + v) * 4; C[o] = sl.r; C[o + 1] = sl.g; C[o + 2] = sl.b; C[o + 3] = sl.seed + Math.min(.97, k); }
    }
    this.col.needsUpdate = true;
  }
  clear() { for (const sl of this.slots) sl.life = 0; }
}

const FX = {
  add: null, alpha: null, segs: null, decals: null,
  parts: [], smokes: [], flames: [], timed: [], bolts: [], shake: 0, shakeX: 0, shakeY: 0, groundAt: () => 0,
};
function initFX() {
  FX.add = new SpriteBatch(2600, false); FX.alpha = new SpriteBatch(700, true); FX.segs = new SegBatch(600); FX.decals = new DecalBatch(40);
  R.scene.add(FX.add.mesh, FX.alpha.mesh, FX.segs.mesh, FX.decals.mesh);
}
function fxPart(x, y, z, vx, vy, vz, life, size, r, g, b, o) {
  if (FX.parts.length > 1700) return;
  FX.parts.push({ x, y, z, vx, vy, vz, life, max: life, size, r, g, b, grav: o && o.grav || 0, drag: o && o.drag || 0, streak: o && o.streak || 0, rise: o && o.rise || 0, bounce: o && o.bounce || 0, seed: rnd() * 100, wob: o && o.wob || 0 });
}
function fxSmoke(x, y, z, vx, vy, vz, life, size, grow, r, g, b, a, o) {
  if (FX.smokes.length > 640) return;
  FX.smokes.push({ x, y, z, vx, vy, vz, life, max: life, size, grow, r, g, b, a, drag: o && o.drag !== undefined ? o.drag : 1.2, seed: rnd() * 100, rise: o && o.rise || 0 });
}
function fxSparks(x, y, z, n, speed, r, g, b, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU, e = rr(o.lo === undefined ? .1 : o.lo, o.hi === undefined ? 1.3 : o.hi), s = speed * rr(.4, 1);
    fxPart(x, y, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s, Math.sin(a) * Math.cos(e) * s, rr(.25, .6) * (o.life || 1), o.size || .07, r, g, b, { grav: o.grav === undefined ? 9 : o.grav, drag: .6, streak: 1, bounce: .35 });
  }
}
function fxEmbers(x, y, z, n, spread, r = 1, g = .5, b = .12) {
  for (let i = 0; i < n; i++) fxPart(x + rr(-spread, spread), y + rr(0, spread), z + rr(-spread, spread), rr(-.25, .25), rr(.7, 1.9), rr(-.25, .25), rr(.9, 2.2), rr(.05, .09), r * rr(1.6, 3), g * rr(1.2, 2.4), b * 2, { drag: .3, wob: 1, rise: .25 });
}
function fxDust(x, y, z, n, size, o = {}) {
  const c = o.c || [.34, .3, .27];
  for (let i = 0; i < n; i++) { const a = rnd() * TAU, s = rr(.3, 1) * (o.speed || 1.3); fxSmoke(x + Math.cos(a) * size * .3, y + rr(0, .15), z + Math.sin(a) * size * .3, Math.cos(a) * s, rr(.2, .7) * (o.up || 1), Math.sin(a) * s, rr(.5, 1.1) * (o.life || 1), size * rr(.5, .9), size * 1.2, c[0], c[1], c[2], o.a || .5, { drag: 2.4 }); }
}
function fxTimed(type, x, y, z, w, h, r, g, b, a, life, o = {}) {
  FX.timed.push({ type, x, y, z, w, h, r, g, b, a, life, max: life, rot: o.rot || 0, ground: o.ground ? 1 : 0, grow: o.grow || 0, seed: rnd() * 50, anchor: o.anchor || 0 });
}
function fxExplosion(x, y, z, sc = 1) {
  lightFlash(x, y + 1.1, z, 0xffb060, 520 * sc * sc, .4, 20 + sc * 6);
  fxTimed(3, x, y + .45 * sc, z, 2.6 * sc, 2.6 * sc, 5.0, 4.2, 3.2, 1, .42, { grow: 1.3 });
  fxTimed(5, x, y + .4 * sc, z, 4.2 * sc, 4.2 * sc, 3.5, 2.4, 1.2, 1, .12);
  fxTimed(4, x, y + .08, z, 5.4 * sc, 5.4 * sc, 1.6, 1.0, .5, .55, .4, { ground: true });
  fxSparks(x, y + .2, z, Math.round(22 * sc), 7.5 * sc, 3.2, 1.7, .5, { size: .08 });
  for (let i = 0; i < 9 * sc; i++) { const a = rnd() * TAU, s = rr(.4, 1.6) * sc; fxSmoke(x + Math.cos(a) * .3, y + rr(.2, .7), z + Math.sin(a) * .3, Math.cos(a) * s, rr(.6, 1.7), Math.sin(a) * s, rr(1.6, 3.4), rr(.7, 1.1) * sc, 1.5 * sc, .2, .19, .19, .62, { drag: 1.5, rise: .25 }); }
  fxDust(x, y, z, 6, .9 * sc, { speed: 2.6 });
  FX.shake = Math.min(1.2, FX.shake + .32 * sc);
}
function fxBolt(a, b, life = .22, col = [.55, .8, 1.6], width = .09) {
  FX.bolts.push({ a: a.slice(), b: b.slice(), life, max: life, col, width, seed: Math.floor(rnd() * 1000), re: 0, pts: null });
}
function addFlame(o) {
  const f = Object.assign({ size: 1, r: 1, g: 1, b: 1, embers: 1, glow: 1, on: 1, seed: rnd() * 10, acc: rnd(), layers: 1, alive: true, smoke: 0 }, o);
  FX.flames.push(f); return f;
}
function removeFlame(f) { if (!f) return; f.alive = false; const i = FX.flames.indexOf(f); if (i >= 0) swapRemove(FX.flames, i); }

function updateFX(dt, t) {
  const A = FX.add, AL = FX.alpha, SG = FX.segs, groundAt = FX.groundAt;
  A.begin(); AL.begin(); SG.begin();
  const rx = Math.cos(CAM.yaw), rz = -Math.sin(CAM.yaw), se = Math.sin(CAM.elev), ce = Math.cos(CAM.elev), ux = -se * Math.sin(CAM.yaw), uy = ce, uz = -se * Math.cos(CAM.yaw);
  for (const f of FX.flames) {
    const on = f.on; if (on <= .01) continue;
    const s = f.size * (.9 + .1 * on), fl = .88 + .12 * n1(t * 8 + f.seed * 3, f.seed);
    for (let k = 0; k < f.layers; k++) {
      const kk = k / Math.max(1, f.layers), w = s * (1 - kk * .28) * (.92 + .08 * fl), h = s * (1.55 - kk * .2) * (.75 + .25 * on);
      A.push(f.x + (k ? Math.sin(f.seed * 9 + k * 2.1) * s * .16 : 0), f.y - s * .08, f.z + (k ? Math.cos(f.seed * 5 + k * 1.7) * s * .16 : 0), w, h, 0, 1, f.r * 3.3, f.g * 3.3, f.b * 3.3, on, 1, f.seed + k * 3.7, 0, 0);
    }
    if (f.glow > 0) A.push(f.x, f.y + s * .5, f.z, s * 4.2, s * 4.2, 0, 0, f.r * 1.0, f.g * .5, f.b * .16, .2 * f.glow * on * fl, 2, 0, 0, 0);
    f.acc += dt * (2.2 + 5 * s) * f.embers * on;
    while (f.acc >= 1) {
      f.acc -= 1;
      fxPart(f.x + rr(-.25, .25) * s, f.y + s * rr(.3, 1.1), f.z + rr(-.25, .25) * s, rr(-.3, .3), rr(.8, 2.0) * (0.7 + s * .3), rr(-.3, .3), rr(.8, 2.0) * (.7 + s * .35), rr(.045, .085), f.r * rr(1.8, 3.2), f.g * rr(.7, 1.4), f.b * .25, { drag: .25, wob: 1, rise: .3 });
    }
    if (f.smoke > 0) { f.sacc = (f.sacc || 0) + dt * f.smoke * on; while (f.sacc >= 1) { f.sacc -= 1; fxSmoke(f.x + rr(-.2, .2) * s, f.y + s * 1.3, f.z + rr(-.2, .2) * s, rr(-.15, .15), rr(.9, 1.5), rr(-.15, .15), rr(2.5, 4.5), s * .7, s * 1.6, .16, .15, .16, .22, { drag: .25, rise: .1 }); } }
  }
  const P = FX.parts;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.life -= dt; if (p.life <= 0) { swapRemove(P, i); continue; }
    p.vy += (p.rise - p.grav) * dt; const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy *= dr; p.vz *= dr;
    if (p.wob) { p.vx += n1(t * 1.7 + p.seed, p.seed) * dt * 1.4; p.vz += n1(t * 1.3 + p.seed * 2, p.seed + 3) * dt * 1.4; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.bounce) { const gy = groundAt(p.x, p.z) + .03; if (p.y < gy) { p.y = gy; p.vy = -p.vy * p.bounce; p.vx *= .6; p.vz *= .6; } }
    const k = p.life / p.max, fade = Math.min(1, k * 2.5) * (p.wob ? (.7 + .3 * Math.sin(t * 30 + p.seed)) : 1);
    if (p.streak) {
      const sx = p.vx * rx + p.vz * rz, sy = p.vx * ux + p.vy * uy + p.vz * uz, sp = Math.hypot(sx, sy);
      A.push(p.x, p.y, p.z, p.size * (1 + sp * .22), p.size * .8, Math.atan2(sy, sx), 0, p.r, p.g * (.4 + .6 * k), p.b * k, fade, 6, 0, 0, 0);
    } else A.push(p.x, p.y, p.z, p.size, p.size, 0, 0, p.r, p.g * (.35 + .65 * k), p.b * k, fade, 0, 0, 0, 0);
  }
  const Sm = FX.smokes;
  for (let i = Sm.length - 1; i >= 0; i--) {
    const p = Sm[i]; p.life -= dt; if (p.life <= 0) { swapRemove(Sm, i); continue; }
    const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy = p.vy * dr + p.rise * dt; p.vz *= dr;
    p.x += (p.vx + .12) * dt; p.y += p.vy * dt; p.z += (p.vz + .05) * dt;
    const k = 1 - p.life / p.max, sz = p.size + p.grow * (1 - Math.exp(-k * 3));
    AL.push(p.x, p.y, p.z, sz, sz, p.seed, 0, p.r, p.g, p.b, p.a * Math.min(1, k * 8) * (1 - k) * (1 - k * .3), 0, p.seed, k, 0);
  }
  const Tm = FX.timed;
  for (let i = Tm.length - 1; i >= 0; i--) {
    const s = Tm[i]; s.life -= dt; if (s.life <= 0) { swapRemove(Tm, i); continue; }
    const k = 1 - s.life / s.max, g = 1 + s.grow * (1 - Math.exp(-k * 4));
    A.push(s.x, s.y, s.z, s.w * g, s.h * g, s.rot, s.anchor, s.r, s.g, s.b, s.a, s.type, s.seed, k, s.ground);
  }
  const Bo = FX.bolts;
  for (let i = Bo.length - 1; i >= 0; i--) {
    const b = Bo[i]; b.life -= dt; if (b.life <= 0) { swapRemove(Bo, i); continue; }
    b.re -= dt;
    if (!b.pts || b.re <= 0) {
      b.re = .045; const n = Math.max(3, Math.round(Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1], b.b[2] - b.a[2]) / .45)), pts = [];
      for (let k = 0; k <= n; k++) { const u = k / n, j = Math.sin(u * PI) * .34; pts.push([lerp(b.a[0], b.b[0], u) + rr(-j, j), lerp(b.a[1], b.b[1], u) + rr(-j, j), lerp(b.a[2], b.b[2], u) + rr(-j, j)]); }
      b.pts = pts; b.fork = rnd() < .7 ? Math.floor(rr(1, n - 1)) : -1; b.fd = [rr(-1, 1), rr(-.2, .8), rr(-1, 1)];
    }
    const k = b.life / b.max, c = b.col, w = b.width * (.5 + .5 * k);
    for (let j = 0; j < b.pts.length - 1; j++) { const p = b.pts[j], q = b.pts[j + 1]; SG.push(p[0], p[1], p[2], w, q[0], q[1], q[2], w, c[0] * 4, c[1] * 4, c[2] * 4, k); SG.push(p[0], p[1], p[2], w * 3.5, q[0], q[1], q[2], w * 3.5, c[0], c[1], c[2], k * .35); }
    if (b.fork > 0) { const p = b.pts[b.fork]; SG.push(p[0], p[1], p[2], w * .7, p[0] + b.fd[0] * .7, p[1] + b.fd[1] * .7, p[2] + b.fd[2] * .7, w * .2, c[0] * 3, c[1] * 3, c[2] * 3, k); }
  }
  FX.decals.update(dt);
  FX.shake = Math.max(0, FX.shake - dt * 2.6);
  const sh = FX.shake * FX.shake; FX.shakeX = n1(t * 31, 7) * sh * .22; FX.shakeY = n1(t * 37, 9) * sh * .22;
}
function endFX() { FX.add.end(); FX.alpha.end(); FX.segs.end(); }
function clearFX() { FX.parts.length = 0; FX.smokes.length = 0; FX.timed.length = 0; FX.bolts.length = 0; FX.decals.clear(); }
