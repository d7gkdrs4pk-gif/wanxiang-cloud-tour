const PI = Math.PI, TAU = Math.PI * 2, HPI = Math.PI / 2;
const clamp = (x, a, b) => x < a ? a : (x > b ? b : x);
const sat = x => x < 0 ? 0 : (x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const damp = (a, b, l, dt) => b + (a - b) * Math.exp(-l * dt);
const easeOut = t => 1 - Math.pow(1 - sat(t), 3);
const easeIn = t => { t = sat(t); return t * t * t; };
const easeInOut = t => { t = sat(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOutBack = t => { t = sat(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
function angDiff(a, b) { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; }
function angDamp(a, b, l, dt) { return a + angDiff(a, b) * (1 - Math.exp(-l * dt)); }

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  const f = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  f.range = (a, b) => a + (b - a) * f();
  f.int = (a, b) => Math.floor(a + (b - a + 1) * f());
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.sign = () => f() < .5 ? -1 : 1;
  f.chance = p => f() < p;
  return f;
}
const rnd = makeRng(0xC1DE5);
const rr = (a, b) => a + (b - a) * rnd();

function h2(x, y, s) {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s = 0, oct = 4) {
  let a = .5, f = 1, sum = 0, n = 0;
  for (let i = 0; i < oct; i++) { sum += a * vnoise(x * f, y * f, s + i * 17); n += a; a *= .5; f *= 2.03; }
  return sum / n;
}
function pnoise(x, y, per, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = k => ((k % per) + per) % per;
  const a = h2(m(xi), m(yi), s), b = h2(m(xi + 1), m(yi), s), c = h2(m(xi), m(yi + 1), s), d = h2(m(xi + 1), m(yi + 1), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function pfbm(x, y, per, s = 0, oct = 3) {
  let a = .5, f = 1, sum = 0, n = 0;
  for (let i = 0; i < oct; i++) { sum += a * pnoise(x * f, y * f, per * f, s + i * 31); n += a; a *= .5; f *= 2; }
  return sum / n;
}
function n1(t, s = 0) { return vnoise(t, s * 7.31, 91) * 2 - 1; }

const _tc = new THREE.Color();
function C(hex, mul = 1) { _tc.set(hex); return [_tc.r * mul, _tc.g * mul, _tc.b * mul]; }
function mixC(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function mulC(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }

function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
function swapRemove(arr, i) { const last = arr.pop(); if (i < arr.length) arr[i] = last; }

const HASH = (() => {
  const o = {};
  try {
    for (const kv of location.hash.replace(/^#/, '').split('&')) { if (!kv) continue; const [k, v] = kv.split('='); o[k] = v === undefined ? '1' : decodeURIComponent(v); }
  } catch (e) {}
  return o;
})();
