
const R = {
  renderer: null, scene: null, cam: null, canvas: null,
  dw: 2, dh: 2, iw: 2, ih: 2, maxIH: 620, quality: 1,
  viewH: 27, px: 0.04,
  sub: new THREE.Vector2(), ditherOfs: new THREE.Vector2(),
  focusZ: 60, fade: 0, exposure: 1.0,
  rt: {}, mats: {}, fsScene: null, fsCam: null, fsMesh: null,
  NL: 12, lightPos: [], lightCol: [],
};

const FS_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const GLSL_BAYER = `
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

function fsMat(frag, uniforms) {
  return new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped: false });
}

function initRenderer() {
  const canvas = R.canvas = document.getElementById('gl');
  const r = R.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
  r.setPixelRatio(1);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
  r.toneMapping = THREE.NoToneMapping;
  r.setClearColor(new THREE.Color(0.0035, 0.005, 0.011), 1);
  r.info.autoReset = false;
  R.scene = new THREE.Scene();
  R.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 220);
  R.scene.add(R.cam);
  for (let i = 0; i < R.NL; i++) { R.lightPos.push(new THREE.Vector3()); R.lightCol.push(new THREE.Vector3()); }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  R.fsScene = new THREE.Scene(); R.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  R.fsMesh = new THREE.Mesh(g, null); R.fsMesh.frustumCulled = false; R.fsScene.add(R.fsMesh);

  const M = R.mats;
  M.atmo = fsMat(`
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor; uniform sampler2D tDepth;
uniform mat4 uInvVP; uniform vec3 uCamDir; uniform vec2 uPx; uniform float uTime;
uniform vec3 uLightPos[${R.NL}]; uniform vec3 uLightCol[${R.NL}];
uniform vec3 uMistAmb; uniform vec4 uMist;
uniform vec3 uAO;
uniform vec2 uDither; uniform vec2 uWind;
${GLSL_BAYER}
vec3 wpos(vec2 uv, float d){ vec4 p = uInvVP * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y); }
void main(){
  vec3 col = texture2D(tColor, vUv).rgb;
  float d = texture2D(tDepth, vUv).x;
  if (d < 0.9999) {
    vec3 P = wpos(vUv, d);
    float dr = texture2D(tDepth, vUv + vec2(uPx.x, 0.0)).x, dl = texture2D(tDepth, vUv - vec2(uPx.x, 0.0)).x;
    float du = texture2D(tDepth, vUv + vec2(0.0, uPx.y)).x, dd = texture2D(tDepth, vUv - vec2(0.0, uPx.y)).x;
    vec3 ddx = abs(dr - d) < abs(d - dl) ? wpos(vUv + vec2(uPx.x, 0.0), dr) - P : P - wpos(vUv - vec2(uPx.x, 0.0), dl);
    vec3 ddy = abs(du - d) < abs(d - dd) ? wpos(vUv + vec2(0.0, uPx.y), du) - P : P - wpos(vUv - vec2(0.0, uPx.y), dd);
    vec3 N = normalize(cross(ddx, ddy)); if (dot(N, uCamDir) > 0.0) N = -N;
    float occ = 0.0, ang = bayer4(gl_FragCoord.xy + uDither) * 6.2831853;
    for (int i = 0; i < 10; i++) {
      float fi = (float(i) + 0.5) / 10.0, a = ang + float(i) * 2.39996;
      vec2 suv = vUv + vec2(cos(a), sin(a)) * uAO.y * sqrt(fi) * uPx;
      vec3 V = wpos(suv, texture2D(tDepth, suv).x) - P;
      float vv = dot(V, V);
      occ += max(0.0, dot(V, N) - 0.035) / (vv + 0.03) * step(vv, uAO.z);
    }
    float ao = clamp(1.0 - occ * uAO.x * 0.1, 0.0, 1.0);
    col *= ao;
    float n = vn(P.xz * 0.16 + uWind) * 0.65 + vn(P.xz * 0.47 - uWind * 1.7) * 0.35;
    float tau = min(uMist.z * exp(-(max(P.y, -1.0) - uMist.x) / uMist.y), 1.25) * smoothstep(0.34, 0.86, n) * smoothstep(-2.4, -1.1, P.y);
    float f = 1.0 - exp(-tau);
    vec3 L = uMistAmb; vec3 Pm = P + vec3(0.0, 0.35, 0.0);
    for (int i = 0; i < ${R.NL}; i++) { vec3 dv = uLightPos[i] - Pm; L += uLightCol[i] / (dot(dv, dv) + 2.0); }
    col = mix(col, L * uMist.w, f);
  }
  gl_FragColor = vec4(col, 1.0);
}`, {
    tColor: { value: null }, tDepth: { value: null }, uInvVP: { value: new THREE.Matrix4() }, uCamDir: { value: new THREE.Vector3() }, uPx: { value: new THREE.Vector2() }, uTime: SH.uTime,
    uLightPos: { value: R.lightPos }, uLightCol: { value: R.lightCol }, uMistAmb: { value: new THREE.Vector3(0.05, 0.08, 0.14) }, uMist: { value: new THREE.Vector4(-0.3, 0.42, 0.75, 0.1) },
    uAO: { value: new THREE.Vector3(1.0, 18, 0.7) }, uDither: { value: R.ditherOfs }, uWind: { value: new THREE.Vector2() },
  });

  M.dof = fsMat(`
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uPx;
uniform vec4 uDof; uniform vec3 uNear;
uniform vec2 uDither;
${GLSL_BAYER}
float cocAt(float d){ float z = d - uDof.x; return z > 0.0 ? clamp((z - uDof.y) / uDof.z, 0.0, 1.0) * uDof.w : clamp((-z - uNear.x) / uNear.y, 0.0, 1.0) * uDof.w * uNear.z; }
void main(){
  float dc = texture2D(tDepth, vUv).x, cc = cocAt(dc);
  vec3 col = texture2D(tColor, vUv).rgb; float tot = 1.0;
  float rad = 0.75, ang = bayer4(gl_FragCoord.xy + uDither) * 6.2831853;
  for (int i = 0; i < 40; i++) {
    ang += 2.39996323;
    vec2 tc = vUv + vec2(cos(ang), sin(ang)) * uPx * rad;
    float sd = texture2D(tDepth, tc).x, sc = cocAt(sd);
    if (sd > dc) sc = clamp(sc, 0.0, cc * 2.0);
    float m = smoothstep(rad - 0.5, rad + 0.5, sc);
    col += mix(col / tot, texture2D(tColor, tc).rgb, m); tot += 1.0;
    rad += 1.35 / rad; if (rad > uDof.w) break;
  }
  gl_FragColor = vec4(col / tot, 1.0);
}`, { tColor: { value: null }, tDepth: { value: null }, uPx: { value: new THREE.Vector2() }, uDof: { value: new THREE.Vector4(0.3, 0.02, 0.06, 9) }, uNear: { value: new THREE.Vector3(0.05, 0.04, 0.5) }, uDither: { value: R.ditherOfs } });

  M.bright = fsMat(`
precision highp float; varying vec2 vUv; uniform sampler2D tColor; uniform vec2 uPx; uniform vec2 uThr;
void main(){
  vec3 c = texture2D(tColor, vUv + uPx * vec2(-0.5, -0.5)).rgb + texture2D(tColor, vUv + uPx * vec2(0.5, -0.5)).rgb + texture2D(tColor, vUv + uPx * vec2(-0.5, 0.5)).rgb + texture2D(tColor, vUv + uPx * vec2(0.5, 0.5)).rgb;
  c *= 0.25; float l = max(c.r, max(c.g, c.b));
  c *= smoothstep(uThr.x, uThr.x + uThr.y, l);
  gl_FragColor = vec4(min(c, vec3(24.0)), 1.0);
}`, { tColor: { value: null }, uPx: { value: new THREE.Vector2() }, uThr: { value: new THREE.Vector2(1.1, 1.6) } });
  M.blur = fsMat(`
precision highp float; varying vec2 vUv; uniform sampler2D tColor; uniform vec2 uDir;
void main(){
  vec3 c = texture2D(tColor, vUv).rgb * 0.227027;
  c += (texture2D(tColor, vUv + uDir * 1.3846).rgb + texture2D(tColor, vUv - uDir * 1.3846).rgb) * 0.316216;
  c += (texture2D(tColor, vUv + uDir * 3.2308).rgb + texture2D(tColor, vUv - uDir * 3.2308).rgb) * 0.070270;
  gl_FragColor = vec4(c, 1.0);
}`, { tColor: { value: null }, uDir: { value: new THREE.Vector2() } });

  M.comp = fsMat(`
precision highp float; varying vec2 vUv;
uniform sampler2D tColor; uniform sampler2D tBloomA; uniform sampler2D tBloomB;
uniform vec4 uGrade;
uniform vec3 uBloom;
uniform vec3 uLift; uniform vec2 uDither; uniform vec2 uRes;
${GLSL_BAYER}
vec3 filmic(vec3 x){ x = max(x, 0.0); return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main(){
  vec3 c = texture2D(tColor, vUv).rgb;
  c += texture2D(tBloomA, vUv).rgb * uBloom.x + texture2D(tBloomB, vUv).rgb * uBloom.y;
  c *= uGrade.x;
  vec2 q = (vUv - 0.5) * vec2(1.0, 0.92);
  float vig = smoothstep(0.9, 0.3, length(q) * 1.25);
  c *= mix(1.0 - uGrade.z, 1.0, vig);
  c = filmic(c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uGrade.y);
  c += uLift * (1.0 - smoothstep(0.0, 0.3, l)) * mix(0.55, 1.0, vig);
  c = pow(c, vec3(1.0 / 2.2)) * uGrade.w;
  float b = bayer8(gl_FragCoord.xy + uDither);
  c = floor(c * uBloom.z + b) / uBloom.z;
  gl_FragColor = vec4(c, 1.0);
}`, {
    tColor: { value: null }, tBloomA: { value: null }, tBloomB: { value: null },
    uGrade: { value: new THREE.Vector4(1.0, 0.92, 0.55, 1.0) }, uBloom: { value: new THREE.Vector3(0.35, 0.5, 28) },
    uLift: { value: new THREE.Vector3(0.010, 0.016, 0.030) }, uDither: { value: R.ditherOfs }, uRes: { value: new THREE.Vector2() },
  });

  M.up = fsMat(`
precision highp float; varying vec2 vUv;
uniform sampler2D tColor; uniform vec2 uTex; uniform vec2 uOut; uniform vec2 uSub; uniform float uGrain; uniform float uSeed;
${GLSL_BAYER}
void main(){
  vec2 texel = vUv * uTex + uSub, scale = max(uOut / uTex, vec2(1.0));
  vec2 tf = floor(texel), f = texel - tf, region = 0.5 - 0.5 / scale, cen = f - 0.5;
  vec2 off = (cen - clamp(cen, -region, region)) * scale + 0.5;
  vec3 c = texture2D(tColor, (tf + off) / uTex).rgb;
  float g = hash12(gl_FragCoord.xy + uSeed) - 0.5;
  c += g * uGrain * (0.35 + 0.65 * (1.0 - dot(c, vec3(0.333))));
  gl_FragColor = vec4(c, 1.0);
}`, { tColor: { value: null }, uTex: { value: new THREE.Vector2() }, uOut: { value: new THREE.Vector2() }, uSub: { value: R.sub }, uGrain: { value: 0.035 }, uSeed: { value: 0 } });
}

function resizeRenderer() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const dw = Math.max(8, Math.floor(window.innerWidth * dpr)), dh = Math.max(8, Math.floor(window.innerHeight * dpr));
  R.dw = dw; R.dh = dh; R.dpr = dpr;
  R.renderer.setSize(dw, dh, false);
  let ih = Math.round(Math.min(R.maxIH, dh / 2) * R.quality);
  ih = Math.max(ih, Math.min(dh, 240));
  let iw = Math.max(8, Math.round(dw * ih / dh));
  if (iw > 1500) { ih = Math.round(ih * 1500 / iw); iw = 1500; }
  R.iw = iw; R.ih = ih;
  for (const k in R.rt) { R.rt[k].dispose(); if (R.rt[k].depthTexture) R.rt[k].depthTexture.dispose(); }
  const mk = (w, h, type, filter, depth) => {
    const t = new THREE.WebGLRenderTarget(w, h, { type, format: THREE.RGBAFormat, minFilter: filter, magFilter: filter, depthBuffer: !!depth, stencilBuffer: false, generateMipmaps: false });
    if (depth) { t.depthTexture = new THREE.DepthTexture(w, h); t.depthTexture.type = THREE.UnsignedIntType; }
    return t;
  };
  const HF = THREE.HalfFloatType, NE = THREE.NearestFilter, LI = THREE.LinearFilter;
  R.rt.scene = mk(iw, ih, HF, NE, true);
  R.rt.atmo = mk(iw, ih, HF, NE, false);
  R.rt.dof = mk(iw, ih, HF, LI, false);
  const bw = Math.max(4, iw >> 1), bh = Math.max(4, ih >> 1), cw = Math.max(2, iw >> 2), ch = Math.max(2, ih >> 2);
  R.rt.bA = mk(bw, bh, HF, LI, false); R.rt.bA2 = mk(bw, bh, HF, LI, false);
  R.rt.bB = mk(cw, ch, HF, LI, false); R.rt.bB2 = mk(cw, ch, HF, LI, false);
  R.rt.final = mk(iw, ih, THREE.UnsignedByteType, LI, false);
  const hud = document.getElementById('hud'); hud.width = dw; hud.height = dh;
}

function fsPass(mat, target) {
  R.fsMesh.material = mat; R.renderer.setRenderTarget(target); R.renderer.render(R.fsScene, R.fsCam);
}

const _ivp = new THREE.Matrix4();
function renderFrame() {
  const r = R.renderer, M = R.mats, T = R.rt, cam = R.cam;
  r.info.reset();
  r.setRenderTarget(T.scene); r.render(R.scene, cam);
  const px = M.atmo.uniforms.uPx.value.set(1 / R.iw, 1 / R.ih);
  let u = M.atmo.uniforms;
  u.tColor.value = T.scene.texture; u.tDepth.value = T.scene.depthTexture;
  _ivp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).invert(); u.uInvVP.value.copy(_ivp);
  cam.getWorldDirection(u.uCamDir.value);
  u.uAO.value.y = 0.85 / R.px;
  u.uWind.value.set(SH.uTime.value * 0.05, SH.uTime.value * 0.021);
  fsPass(M.atmo, T.atmo);
  u = M.dof.uniforms; u.tColor.value = T.atmo.texture; u.tDepth.value = T.scene.depthTexture; u.uPx.value.copy(px);
  const zr = cam.far - cam.near;
  const dsc = R.dofScale || 1;
  u.uDof.value.set((R.focusZ - cam.near) / zr, 3.2 * dsc / zr, 11.5 * dsc / zr, HASH.nodof ? 0.6 : Math.max(2, R.ih * 0.0145));
  u.uNear.value.set(Math.max(5 * dsc, R.dofNear || 0) / zr, 8 * dsc / zr, 0.55);
  fsPass(M.dof, T.dof);
  u = M.bright.uniforms; u.tColor.value = T.dof.texture; u.uPx.value.copy(px); fsPass(M.bright, T.bA);
  u = M.blur.uniforms;
  u.tColor.value = T.bA.texture; u.uDir.value.set(1 / T.bA.width, 0); fsPass(M.blur, T.bA2);
  u.tColor.value = T.bA2.texture; u.uDir.value.set(0, 1 / T.bA.height); fsPass(M.blur, T.bA);
  u.tColor.value = T.bA.texture; u.uDir.value.set(1 / T.bB.width, 0); fsPass(M.blur, T.bB2);
  u.tColor.value = T.bB2.texture; u.uDir.value.set(0, 1 / T.bB.height); fsPass(M.blur, T.bB);
  u.tColor.value = T.bB.texture; u.uDir.value.set(1.6 / T.bB.width, 0); fsPass(M.blur, T.bB2);
  u.tColor.value = T.bB2.texture; u.uDir.value.set(0, 1.6 / T.bB.height); fsPass(M.blur, T.bB);
  u = M.comp.uniforms; u.tColor.value = T.dof.texture; u.tBloomA.value = T.bA.texture; u.tBloomB.value = T.bB.texture;
  u.uGrade.value.x = R.exposure; u.uGrade.value.w = R.fade; u.uRes.value.set(R.iw, R.ih);
  fsPass(M.comp, T.final);
  u = M.up.uniforms; u.tColor.value = T.final.texture; u.uTex.value.set(R.iw, R.ih); u.uOut.value.set(R.dw, R.dh); u.uSeed.value = (SH.uTime.value * 60 % 1000) * 7.13;
  fsPass(M.up, null);
}
