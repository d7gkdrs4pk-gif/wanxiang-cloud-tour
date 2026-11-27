
const _segq = new THREE.Quaternion(), _segd = new THREE.Vector3(), _upv = new THREE.Vector3(0, 1, 0);
Soup.prototype.seg = function (a, b, r0, r1, c, o = {}) {
  _segd.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = _segd.length(); if (len < 1e-5) return this; _segd.multiplyScalar(1 / len);
  _segq.setFromUnitVectors(_upv, _segd);
  o.q = _segq; o.s = [r0, len, r0]; o.p = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; o.c = c;
  return this.add(gCyl(o.n || 6, Math.round(clamp(r1 / r0, 0, 2.5) * 10) / 10), o);
};

function clothPanel(S, o) {
  const nx = o.nx || 4, ny = o.ny || 6, rng = o.rng, sway = o.sway === undefined ? .8 : o.sway;
  const yAt = j => o.yTop - o.len * j / ny, sw = j => Math.pow(j / ny, 1.3) * sway;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (j >= ny - 2 && rng() < (o.rag === undefined ? .4 : o.rag)) continue;
    if (j === ny - 1 && (i & 1)) continue;
    const xa = lerp(o.x0, o.x1, i / nx), xb = lerp(o.x0, o.x1, (i + 1) / nx);
    const emblem = o.col2 && i >= 1 && i < nx - 1 && j >= 1 && j <= 2;
    const c = mulC(emblem ? o.col2 : o.col, .78 + .3 * rng());
    const q = [[xa, yAt(j), sw(j)], [xb, yAt(j), sw(j)], [xb, yAt(j + 1), sw(j + 1)], [xa, yAt(j + 1), sw(j + 1)]];
    for (const [order, nz] of [[[0, 3, 2, 0, 2, 1], 1], [[0, 1, 2, 0, 2, 3], -1]]) for (const k of order) S.v(q[k][0], q[k][1], o.z, 0, 0, nz, c[0], c[1], c[2], q[k][0] * .5, q[k][1] * .5, L_CLOTH, .95, q[k][2], 0);
  }
}

const PROP = {
  barrel(S, x, y, z, s = 1, rng) {
    const c = mulC(COL.wood, .8 + .3 * rng());
    S.cyl(.2 * s, .27 * s, x, y + .135 * s, z, c, { n: 8, l: L_WOOD, rt: 1.16 });
    S.cyl(.232 * s, .27 * s, x, y + .405 * s, z, c, { n: 8, l: L_WOOD, rt: .86 });
    for (const h of [.06, .27, .48]) S.cyl((h === .27 ? .242 : .215) * s, .035 * s, x, y + h * s, z, COL.iron, { n: 8, l: L_METAL, rough: .6 });
  },
  crate(S, x, y, z, s, rng, ry = 0) {
    const c = mulC(COL.woodL, .75 + .3 * rng()), o = () => ({ l: L_WOOD, r: [0, ry, 0] });
    S.box(s, s, s, x, y + s / 2, z, c, o());
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.box(s * .12, s * 1.04, s * .12, x + (dx * Math.cos(ry) + dz * Math.sin(ry)) * s * .47, y + s / 2, z + (-dx * Math.sin(ry) + dz * Math.cos(ry)) * s * .47, COL.woodD, o());
    S.box(s * 1.04, s * .1, s * 1.04, x, y + s * .97, z, COL.woodD, o());
  },
  tree(S, rng, h) {
    const bark = mulC(COL.bark, .8 + .4 * rng());
    const branch = (a, d, len, r, depth) => {
      const b = [a[0] + d[0] * len, a[1] + d[1] * len, a[2] + d[2] * len];
      S.seg(a, b, r, r * .64, bark, { l: L_WOOD, n: depth > 1 ? 4 : 6, sway: depth >= 2 ? .35 + depth * .15 : 0 });
      if (depth >= 4 || len < .3) return;
      const kids = depth === 0 ? rng.int(2, 3) : rng.int(1, 2);
      for (let k = 0; k < kids; k++) {
        const nd = [d[0] + rng.range(-1, 1), d[1] * .5 + rng.range(.05, .7), d[2] + rng.range(-1, 1)], l = Math.hypot(nd[0], nd[1], nd[2]);
        branch(b, [nd[0] / l, nd[1] / l, nd[2] / l], len * rng.range(.55, .8), r * .58, depth + 1);
      }
      if (depth < 2) { const nd = [d[0] + rng.range(-.3, .3), 1, d[2] + rng.range(-.3, .3)], l = Math.hypot(nd[0], nd[1], nd[2]); branch(b, [nd[0] / l, nd[1] / l, nd[2] / l], len * .72, r * .64, depth + 1); }
    };
    S.cyl(h * .12, .3, 0, .1, 0, bark, { n: 6, l: L_WOOD, rt: .7 });
    branch([0, .05, 0], [rng.range(-.15, .15), 1, rng.range(-.15, .15)], h * .42, h * .075, 0);
  },
  stump(S, rng) {
    S.cyl(.3, .45, 0, .2, 0, COL.bark, { n: 7, l: L_WOOD, rt: .8 }); S.cyl(.235, .04, 0, .44, 0, COL.woodL, { n: 7, l: L_WOOD });
    for (let k = 0; k < 3; k++) { const a = rng() * TAU; S.seg([Math.cos(a) * .2, .12, Math.sin(a) * .2], [Math.cos(a) * .6, -.05, Math.sin(a) * .6], .09, .04, COL.bark, { l: L_WOOD, n: 5 }); }
  },
  grave(S, rng) {
    const T = new Soup(), w = rng.range(.44, .62), h = rng.range(.62, 1.0), c = mixC(COL.stoneD, COL.stoneL, rng()), kind = rng.int(0, 3);
    if (kind === 0) { T.box(w, h * .8, .15, 0, h * .4, 0, c, { l: L_ROCK }); T.cyl(w / 2, .15, 0, h * .8, 0, c, { n: 8, l: L_ROCK, r: [HPI, 0, 0] }); }
    else if (kind === 1) { T.box(.15, h * 1.15, .14, 0, h * .57, 0, c, { l: L_ROCK }); T.box(w * 1.1, .15, .14, 0, h * .8, 0, c, { l: L_ROCK }); }
    else if (kind === 2) { T.box(w, h * .9, .16, 0, h * .45, 0, c, { l: L_ROCK }); T.box(w * .7, .14, .16, 0, h * .95, 0, c, { l: L_ROCK }); T.box(w * 1.2, .12, .3, 0, .06, 0, mulC(c, .8), { l: L_ROCK }); }
    else { T.box(w * .9, h * .55, .15, 0, h * .27, 0, c, { l: L_ROCK }); T.box(w * .5, h * .2, .15, -w * .18, h * .62, 0, c, { l: L_ROCK, r: [0, 0, .3] }); }
    S.merge(T, { r: [rng.range(-.2, .2), rng.range(-.3, .3), rng.range(-.16, .16)], ao: [0, .4, .55] });
    S.ico(.5, 0, .0, .62, mulC(COL.earthD, 1.1), { sc: [.75, .22, 1.25], l: L_DIRT, d: 1 });
  },
  cart(S, rng, broken) {
    const w = COL.wood, wd = COL.woodD, o = () => ({ l: L_WOOD });
    S.box(1.6, .08, .9, 0, .56, 0, w, o());
    for (const zz of [-.45, .45]) { S.box(1.6, .28, .06, 0, .74, zz, w, o()); for (const xx of [-.7, 0, .7]) S.box(.07, .4, .08, xx, .74, zz * 1.04, wd, o()); }
    S.box(.06, .28, .9, -.8, .74, 0, w, o());
    const wheel = (x, z, lean) => {
      const T = new Soup();
      T.add(gTorus(10, .13, 4), { s: .4, c: wd, l: L_WOOD }); T.cyl(.07, .14, 0, 0, 0, COL.iron, { n: 6, l: L_METAL, r: [HPI, 0, 0] });
      for (let k = 0; k < 4; k++) T.box(.74, .05, .05, 0, 0, 0, w, { l: L_WOOD, r: [0, 0, k * PI / 4] });
      S.merge(T, { p: [x, lean ? .12 : .4, z], r: [lean ? 1.35 : 0, 0, lean ? .3 : 0] });
    };
    wheel(-.25, .56, false); if (!broken) wheel(-.25, -.56, false); else wheel(.5, -1.0, true);
    S.box(.08, .08, 1.2, -.25, .4, 0, wd, o());
    for (const zz of [-.3, .3]) S.seg([.8, .54, zz], [2.0, broken ? .1 : .34, zz * 1.1], .04, .035, wd, { l: L_WOOD });
    S.ico(.26, .35, .74, .1, COL.clothT, { sc: [1.2, .7, 1], l: L_CLOTH, d: 1 }); S.ico(.24, -.05, .72, -.18, mulC(COL.clothT, .8), { sc: [1, .7, 1.2], l: L_CLOTH, d: 1 });
    PROP.barrel(S, -.5, .6, .12, .8, rng);
  },
  bones(S, rng, n = 5) {
    for (let k = 0; k < n; k++) { const a = rng() * TAU, l = rng.range(.2, .45), x = rng.range(-.4, .4), z = rng.range(-.4, .4); S.seg([x, .04, z], [x + Math.cos(a) * l, .05 + rng() * .08, z + Math.sin(a) * l], .03, .03, mulC(COL.bone, .7 + .3 * rng()), { l: L_BONE, n: 5 }); }
    if (rng() < .7) PROP.skull(S, rng.range(-.2, .2), .13, rng.range(-.2, .2), .15, rng() * TAU);
  },
  skull(S, x, y, z, r, ry) {
    const T = new Soup();
    T.sph(r, 0, 0, 0, COL.bone, { sc: [1, .95, 1.1], l: L_BONE, w: 7, h: 5 }); T.box(r * 1.1, r * .55, r * .8, 0, -r * .65, r * .32, COL.boneD, { l: L_BONE });
    for (const s of [-1, 1]) T.box(r * .42, r * .38, r * .2, s * r * .42, -r * .05, r * 1.0, COL.black, { jit: 0 });
    S.merge(T, { p: [x, y, z], ry, ao: null });
  },
  ribcage(S, rng) {
    const b = COL.bone;
    S.seg([-1.6, .5, 0], [1.6, .7, 0], .1, .08, b, { l: L_BONE });
    for (let k = 0; k < 6; k++) {
      const x = -1.3 + k * .5, s = 1 - Math.abs(k - 2.5) * .12;
      for (const side of [-1, 1]) {
        if (rng() < .15) continue;
        let p = [x, .55, 0]; const pts = [[x, .95 * s, side * .55 * s], [x + .05, 1.25 * s, side * .95 * s], [x + .1, .85 * s, side * 1.15 * s], [x + .12, .1, side * 1.05 * s]];
        for (const q of pts) { S.seg(p, q, .06, .05, mulC(b, .8 + .2 * rng()), { l: L_BONE, n: 5 }); p = q; }
      }
    }
    S.ico(.5, 2.15, .55, 0, b, { sc: [1.35, .8, .85], l: L_BONE, d: 1 }); S.ico(.3, 2.85, .4, 0, COL.boneD, { sc: [1.3, .6, .7], l: L_BONE, d: 1 });
    for (const side of [-1, 1]) { S.seg([2.0, .8, side * .3], [1.7, 1.4, side * .75], .1, .02, b, { l: L_BONE, n: 5 }); S.box(.2, .16, .08, 2.3, .62, side * .4, COL.black, { jit: 0 }); }
  },
  web(S, a, b, c) {
    const col = mulC(COL.stoneL, 1.5), th = .011;
    const lerp3 = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)];
    for (let k = 0; k <= 4; k++) S.seg(a, lerp3(b, c, k / 4), th, th, col, { n: 3, emis: .015, jit: 0, sway: .25 });
    for (let r = 1; r <= 3; r++) for (let k = 0; k < 4; k++) S.seg(lerp3(a, lerp3(b, c, k / 4), r / 3.3), lerp3(a, lerp3(b, c, (k + 1) / 4), r / 3.3 - .04), th, th, col, { n: 3, emis: .015, jit: 0, sway: .25 });
  },
  banner(S, rng, col, h = 2.8) {
    S.seg([0, 0, 0], [0, h, 0], .055, .04, COL.woodD, { l: L_WOOD }); S.seg([-.08, h - .2, 0], [.82, h - .2, 0], .03, .03, COL.woodD, { l: L_WOOD, n: 5 });
    S.cone(.07, .2, 0, h + .1, 0, COL.iron, { n: 4, l: L_METAL });
    clothPanel(S, { x0: .04, x1: .78, yTop: h - .23, len: 1.45, z: 0, col, col2: mulC(COL.gold, .6), rng });
  },
  fence(S, rng, len) {
    const nP = Math.max(2, Math.round(len) + 1);
    for (let k = 0; k < nP; k++) {
      const x = -len / 2 + k * len / (nP - 1), lean = rng.range(-.14, .14), hh = rng.range(.72, .95);
      S.box(.1, hh, .1, x, hh / 2, 0, mulC(COL.wood, .7 + .3 * rng()), { l: L_WOOD, r: [lean, 0, rng.range(-.12, .12)] });
      if (k < nP - 1) for (const y of [.36, .68]) { if (rng() < .22) continue; const drop = rng() < .15 ? -.3 : 0; S.seg([x, y, 0], [x + len / (nP - 1), y + drop + rng.range(-.04, .04), 0], .035, .035, mulC(COL.woodL, .7 + .3 * rng()), { l: L_WOOD, n: 4 }); }
    }
  },
  palisade(S, rng, len) {
    for (let x = -len / 2; x < len / 2; x += .27) {
      if (rng() < .1) continue;
      const hh = rng.range(1.25, 1.75), lean = [rng.range(-.1, .1), 0, rng.range(-.12, .12)], c = mulC(COL.wood, .65 + .35 * rng()), T = new Soup();
      T.cyl(.12, hh, 0, hh / 2, 0, c, { n: 6, l: L_WOOD }); T.cone(.12, .3, 0, hh + .15, 0, mulC(c, 1.15), { n: 6, l: L_WOOD });
      S.merge(T, { p: [x, -.1, rng.range(-.04, .04)], r: lean, ao: [0, .5, .6] });
    }
    S.box(len, .09, .07, 0, .95, .13, COL.woodD, { l: L_WOOD });
  },
  well(S, rng) {
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; S.box(.44, .56, .26, Math.cos(a) * .68, .28, Math.sin(a) * .68, mixC(COL.stoneD, COL.stoneL, rng()), { l: L_MASON, r: [0, -a + HPI, 0] }); }
    S.cyl(.6, .06, 0, .3, 0, COL.black, { n: 10, jit: 0 });
    for (const s of [-1, 1]) S.box(.1, 1.7, .1, s * .72, .85, 0, COL.woodD, { l: L_WOOD });
    S.seg([-.8, 1.45, 0], [.8, 1.45, 0], .05, .05, COL.wood, { l: L_WOOD });
    for (const s of [-1, 1]) S.box(1.75, .05, .62, 0, 1.86, s * .26, COL.slate, { l: L_SLATE, r: [s * .62, 0, 0] });
    S.seg([.15, 1.45, 0], [.15, .75, 0], .012, .012, COL.rope, { n: 3 }); S.cyl(.12, .2, .15, .68, 0, COL.wood, { n: 7, l: L_WOOD, rt: 1.2 });
  },
  wallRun(S, rng, len, hMax) {
    let x = -len / 2, k = 0, h = hMax * rng.range(.5, 1);
    while (x < len / 2) {
      const w = rng.range(.9, 1.4); h = clamp(h + rng.range(-1.1, .7), .5, hMax);
      const edge = Math.min(1, (len / 2 - Math.abs(x + w / 2)) / 1.4 + .25), hh = h * edge, c = mixC(COL.stoneD, COL.stone, rng());
      S.box(w, hh, .62, x + w / 2, hh / 2, 0, c, { l: L_MASON });
      for (let j = 0; j < 3; j++) if (rng() < .6) S.box(w * rng.range(.25, .45), rng.range(.2, .5), .62, x + w * (.2 + j * .3), hh + .15, 0, mixC(COL.stoneD, COL.stoneL, rng()), { l: L_MASON });
      if (hh > 2.2 && rng() < .5) S.box(.3, .8, .7, x + w / 2, hh * .62, 0, COL.black, { jit: 0 });
      if (rng() < .5) S.rock(rng.range(.2, .4), x + rng.range(0, w), .1, rng.sign() * rng.range(.5, .9), mixC(COL.stoneD, COL.stone, rng()));
      x += w; k++;
    }
    S.box(len * .9, .22, .86, 0, .08, 0, COL.stoneD, { l: L_MASON });
  },
  towerRuin(S, rng) {
    const R = 1.35, n = 10, hs = [];
    for (let k = 0; k < n; k++) hs.push(clamp(4.4 - k * .42 + rng.range(-.4, .4), .7, 4.6));
    S.cyl(R + .35, .4, 0, .2, 0, COL.stoneD, { n: 10, l: L_MASON });
    for (let k = 0; k < n; k++) {
      if (k === n - 1) continue;
      const a = k / n * TAU, c = mixC(COL.stoneD, COL.stone, rng());
      S.box(.92, hs[k], .42, Math.cos(a) * R, hs[k] / 2 + .3, Math.sin(a) * R, c, { l: L_MASON, r: [0, -a + HPI, 0] });
      if (rng() < .7) S.box(.4, rng.range(.2, .5), .42, Math.cos(a + .1) * R, hs[k] + .5, Math.sin(a + .1) * R, mixC(COL.stoneD, COL.stoneL, rng()), { l: L_MASON, r: [0, -a + HPI, 0] });
      if (hs[k] > 2.6 && (k & 1)) S.box(.2, .6, .5, Math.cos(a) * R, hs[k] * .65, Math.sin(a) * R, COL.black, { jit: 0, r: [0, -a + HPI, 0] });
    }
    for (let k = 0; k < 3; k++) { const a = rng() * TAU; S.seg([Math.cos(a) * R, 2.1, Math.sin(a) * R], [Math.cos(a + 2.4) * R * .6, 2.0 - rng() * .8, Math.sin(a + 2.4) * R * .6], .07, .06, COL.woodD, { l: L_WOOD, n: 4 }); }
    for (let k = 0; k < 7; k++) { const a = rng() * TAU, d = rng.range(1.9, 3.0); S.box(rng.range(.3, .6), rng.range(.2, .4), rng.range(.3, .5), Math.cos(a) * d, .12, Math.sin(a) * d, mixC(COL.stoneD, COL.stone, rng()), { l: L_MASON, r: [rng() * .5, rng() * 3, rng() * .5] }); }
  },
  signpost(S, rng) {
    S.box(.1, 1.7, .1, 0, .85, 0, COL.woodD, { l: L_WOOD, r: [0, 0, .06] });
    S.box(.8, .2, .05, .28, 1.45, .06, COL.woodL, { l: L_WOOD, r: [0, .2, -.08] }); S.box(.7, .18, .05, -.22, 1.15, .06, COL.wood, { l: L_WOOD, r: [0, -.25, .1] });
  },
  gibbet(S, rng) {
    S.box(.16, 3.0, .16, 0, 1.5, 0, COL.woodD, { l: L_WOOD }); S.box(1.2, .13, .13, .5, 2.9, 0, COL.woodD, { l: L_WOOD }); S.seg([0, 2.2, 0], [.6, 2.85, 0], .05, .05, COL.wood, { l: L_WOOD, n: 4 });
    S.seg([.95, 2.85, 0], [.95, 2.3, 0], .015, .015, COL.iron, { n: 3 });
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; S.seg([.95 + Math.cos(a) * .2, 2.3, Math.sin(a) * .2], [.95 + Math.cos(a) * .2, 1.5, Math.sin(a) * .2], .014, .014, COL.iron, { n: 3, l: L_METAL, sway: .12 }); }
    for (const y of [2.3, 1.9, 1.5]) S.add(gTorus(8, .08, 3), { s: .2, p: [.95, y, 0], r: [HPI, 0, 0], c: COL.iron, l: L_METAL, sway: .12 });
    PROP.skull(S, .95, 1.72, 0, .11, 1);
  },
  cairn(S, rng) { let y = 0, r = rng.range(.3, .42); for (let k = 0; k < 4; k++) { S.rock(r, rng.range(-.05, .05), y + r * .45, rng.range(-.05, .05), mixC(COL.stoneD, COL.stoneL, rng()), { sq: .6 }); y += r * .72; r *= .74; } },
  statue(S, rng) {
    const c = COL.stone, m = () => ({ l: L_ROCK });
    S.box(1.1, .6, 1.1, 0, .3, 0, COL.stoneD, { l: L_MASON }); S.box(.9, .15, .9, 0, .67, 0, COL.stoneL, { l: L_MASON });
    for (const s of [-1, 1]) S.box(.2, .75, .22, s * .16, 1.1, 0, c, m());
    S.box(.62, .7, .34, 0, 1.8, 0, c, m()); S.box(.2, .7, .2, -.42, 1.75, .05, c, { l: L_ROCK, r: [.2, 0, .15] });
    S.box(.2, .35, .2, .42, 1.95, 0, c, m()); S.box(.1, 1.3, .08, -.5, 1.25, .2, COL.stoneL, m());
    S.rock(.2, .7, .1, .5, c); S.rock(.16, .5, .08, .75, c);
  },
  tuft(S, rng) {
    const c = mulC(mixC(COL.grass, COL.thatch, rng() * .6), .8 + .5 * rng());
    for (let k = 0; k < rng.int(3, 5); k++) {
      const a = rng() * TAU, l = rng.range(.22, .42), bx = Math.cos(a) * .06, bz = Math.sin(a) * .06, tx = Math.cos(a) * l * .5, tz = Math.sin(a) * l * .5, w = .035;
      const A = [bx - Math.sin(a) * w, 0, bz + Math.cos(a) * w], Bp = [bx + Math.sin(a) * w, 0, bz - Math.cos(a) * w], T = [tx, l, tz];
      for (const [p, sw] of [[A, 0], [Bp, 0], [T, .7], [A, 0], [T, .7], [Bp, 0]]) S.v(p[0], p[1], p[2], 0, 1, 0, c[0], c[1], c[2], 0, 0, L_PLAIN, 1, sw, 0);
    }
  },
};

function buildBridge(B) {
  const i = B.ci0, x = B.px[i], z = B.pz[i], ang = Math.atan2(B.tz[i], B.tx[i]), rng = B.rng, T = new Soup();
  const y0 = B.py[i], bed = B.wlc - .5 - y0, spring = B.wlc + .08 - y0, wHalf = ROAD_HALF + .34, A = 1.3;
  const yd = u => B.py[clamp(Math.round(i + u / PATH_STEP), 0, B.n - 1)] - y0;
  const crown = yd(0) - .34;
  const yArch = u => spring + (crown - spring) * Math.sqrt(Math.max(0, 1 - (u / A) * (u / A)));
  const mc = () => mixC(COL.stoneD, COL.stoneL, rng());
  for (let k = -5; k < 5; k++) {
    const u = (k + .5) * .62, top = yd(u);
    T.box(.63, .26, wHalf * 2 - .1, u, top - .16, 0, COL.stoneD, { l: L_MASON });
    for (const side of [-1, 1]) {
      const zz = side * wHalf;
      T.box(.63, .52, .3, u, top + .22, zz, mc(), { l: L_MASON });
      if (k % 2 === 0) T.box(.3, .14, .36, u, top + .55, zz, mc(), { l: L_MASON });
      const bot = Math.abs(u) < A ? yArch(u) : bed - .3;
      if (top - .05 - bot > .04) T.box(.63, top - .05 - bot, .3, u, (top - .05 + bot) / 2, zz, mc(), { l: L_MASON });
    }
  }
  for (const side of [-1, 1]) {
    for (let k = 0; k <= 8; k++) { const th = PI * k / 8, u = Math.cos(th) * A; T.box(.42, .22, .38, u, spring + (crown - spring) * Math.sin(th) - .05, side * wHalf, COL.stoneL, { l: L_MASON, r: [0, 0, th - HPI] }); }
    for (const u of [-3.25, 3.25]) { const t = yd(u); T.box(.5, 1.25, .5, u, t + .3, side * wHalf, mc(), { l: L_MASON }); T.box(.62, .13, .62, u, t + .98, side * wHalf, COL.stoneL, { l: L_MASON }); T.cone(.2, .25, u, t + 1.15, side * wHalf, COL.stoneD, { n: 4, l: L_ROCK }); }
  }
  B.put(T, x, z, { y: y0, ry: -ang, ao: null });
  B.bridge = { x, z, y: y0 };
}

function buildPads(B) {
  for (const p of B.pads) {
    const T = new Soup(), rng = B.rng;
    T.cyl(1.36, .34, 0, .12, 0, mulC(COL.stoneD, .8), { n: 8, l: L_MASON, r: [0, PI / 8, 0] });
    T.cyl(1.16, .05, 0, .3, 0, mulC(COL.stoneD, 1.05), { n: 8, l: L_MASON, r: [0, PI / 8, 0] });
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; T.box(.46, .2, .28, Math.cos(a) * 1.34, .1 + rng() * .06, Math.sin(a) * 1.34, mixC(COL.stoneD, COL.stone, rng() * .6), { l: L_ROCK, r: [rng.range(-.1, .1), -a + HPI, 0] }); }
    B.put(T, p.x, p.z, { y: p.y0, ry: rng() * TAU, ao: [0, .3, .7] });
  }
}

function buildKeep(B) {
  const rng = B.rng, kx = B.kx, ky = B.keepY, oz = -12.35;
  const TG = new Soup(), TT = new Soup();
  const st = COL.stone, sdk = COL.stoneD, sl = COL.stoneL;
  const mc = () => mixC(sdk, sl, rng() * .8 + .1);
  const mas = (S, w, h, d, x, y, z, c, o = {}) => S.box(w, h, d, x, y, z, c || mc(), Object.assign({ l: L_MASON }, o));
  mas(TG, 10.6, .5, 6.0, 0, -.2, -2.9, sdk);
  for (let k = 0; k < 9; k++) mas(TG, 1.1, .16, .55, -4.4 + k * 1.1, .1, .25, mc());
  const tower = (x, z, w, h, broken) => {
    mas(TG, w + .34, .6, w + .34, x, .3, z, sdk); mas(TG, w, h, w, x, h / 2, z, st, { jit: .03 });
    for (let c = 0; c < 4; c++) mas(TG, w + .04, .22, w + .04, x, .9 + c * (h - 1.2) / 3.2, z, mc());
    mas(TG, w + .36, .3, w + .36, x, h + .12, z, sl);
    for (const [dx, dz] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) { if (broken && rng() < .55) continue; mas(TG, .42, broken ? rng.range(.2, .5) : .48, .42, x + dx * (w / 2 - .05), h + .5, z + dz * (w / 2 - .05)); }
    TG.box(.14, .8, .1, x, h * .62, z + w / 2 + .01, COL.black, { jit: 0 }); TG.box(.1, .8, .14, x + w / 2 + .01, h * .5, z, COL.black, { jit: 0 });
    if (broken) for (let k = 0; k < 3; k++) TG.rock(rng.range(.22, .4), x + rng.range(-1.2, 1.4), .15, z + rng.range(.9, 1.6), mc());
  };
  tower(2.3, -.75, 1.95, 3.9, true);
  mas(TG, 2.7, 1.25, 1.3, 0, 3.2, -.75, st);
  for (let k = 0; k <= 8; k++) { const th = PI * k / 8; mas(TG, .4, .3, 1.4, Math.cos(th) * 1.12, 1.5 + Math.sin(th) * 1.12, -.75, sl, { r: [0, 0, th - HPI] }); }
  for (const s of [-1, 1]) { mas(TG, .5, .9, 1.3, s * 1.12, 2.3, -.75, st); mas(TG, .3, 1.5, 1.34, s * 1.2, .75, -.75, sl); }
  TG.box(2.2, 2.7, .2, 0, 1.35, -1.3, COL.black, { jit: 0 }); TG.box(2.2, .2, 1.2, 0, 2.75, -.8, COL.black, { jit: 0 });
  for (const bx of [-.8, -.4, 0, .4, .8]) { TG.box(.07, .95, .07, bx, 2.15, -.3, COL.iron, { l: L_METAL }); TG.cone(.06, .16, bx, 1.6, -.3, COL.iron, { n: 4, l: L_METAL, r: [PI, 0, 0] }); }
  for (const by of [1.95, 2.4]) TG.box(2.0, .07, .07, 0, by, -.3, COL.iron, { l: L_METAL });
  for (const bx of [-1.02, -.34, .34, 1.02]) mas(TG, .42, .44, .42, bx, 4.05, -.3);
  mas(TG, 2.9, .2, 1.5, 0, 3.9, -.75, sl);
  const run = (x0, dir, hs) => hs.forEach((h, k) => {
    const x = x0 + dir * (k + .5) * 1.35; mas(TG, 1.35, h, .95, x, h / 2, -.95, k & 1 ? st : mc());
    if (h > 2.4) { mas(TG, 1.45, .2, 1.1, x, h + .1, -.95, sl); for (const dx of [-.4, .4]) mas(TG, .4, .42, .3, x + dx, h + .4, -.55); }
    else for (let j = 0; j < 3; j++) if (rng() < .7) mas(TG, rng.range(.3, .55), rng.range(.2, .6), .9, x + rng.range(-.4, .4), h + .15, -.95);
    if (h < 1.6) for (let j = 0; j < 3; j++) TG.rock(rng.range(.2, .42), x + rng.range(-.7, .7), .12, rng.range(-.2, .9) - .5, mc());
  });
  run(-3.3, -1, [3.1, 3.1, 2.3, 1.3, .6]); run(3.3, 1, [3.0, 2.0, 1.1]);
  for (let k = 0; k < 5; k++) { const h = [3.4, 2.4, 3.6, 1.6, 2.8][k], x = -4.7 + k * 1.3; mas(TG, 1.3, h, .7, x, h / 2, -5.3); if (h > 3) TG.box(.36, 1.0, .74, x, h * .62, -5.3, COL.black, { jit: 0 }); }
  mas(TG, .7, 2.6, 3.4, -5.0, 1.3, -3.4); mas(TG, .7, 1.2, 1.0, -5.0, .6, -1.5);
  for (let k = 0; k < 4; k++) TG.seg([-4.6, 2.5 - k * .12, -4.9 + k * .7], [-1.6 + rng() * .8, 1.2 + rng(), -4.6 + k * .7], .08, .07, COL.woodD, { l: L_WOOD, n: 4 });
  PROP.barrel(TG, -3.6, .05, -2.2, 1.1, rng); PROP.barrel(TG, -3.1, .05, -2.6, 1, rng); PROP.crate(TG, -3.9, .05, -3.2, .55, rng, .4);
  clothPanel(TG, { x0: 1.85, x1: 2.75, yTop: 3.2, len: 1.6, z: .25, col: COL.clothR, col2: mulC(COL.gold, .6), rng, sway: .5, rag: .7 });
  for (const s of [-1, 1]) { TG.seg([s * 1.32, 1.9, -.08], [s * 1.32, 2.1, .32], .035, .03, COL.iron, { l: L_METAL, n: 4 }); TG.cyl(.09, .14, s * 1.32, 2.14, .34, COL.iron, { n: 6, l: L_METAL, rt: 1.4 }); B.fires.push({ x: kx + s * 1.32, y: ky + 2.3, z: oz + .34, size: .42, type: 'sconce' }); }
  TG.cyl(1.5, 2.4, 2.4, 1.2, -4.2, sdk, { n: 8, l: L_MASON, rt: .92 });
  for (let k = 0; k < 8; k++) { const a = (k + .5) / 8 * TAU, h = rng.range(.2, 1.3); if (rng() < .3) continue; mas(TG, .9, h, .4, 2.4 + Math.cos(a) * 1.2, 2.4 + h / 2, -4.2 + Math.sin(a) * 1.2, null, { r: [0, -a + HPI, 0] }); }
  const bx = -2.6, bz = -.95, bh = 7.3;
  TT.cyl(1.9, 1.3, bx, .65, bz, sdk, { n: 8, l: L_MASON, rt: .84 });
  TT.cyl(1.52, bh, bx, bh / 2, bz, st, { n: 8, l: L_MASON, rt: .9, jit: .03 });
  for (let c = 0; c < 6; c++) TT.cyl(1.54 - c * .027, .2, bx, 1.7 + c * 1.0, bz, mc(), { n: 8, l: L_MASON });
  TT.cyl(1.42, .55, bx, bh - .15, bz, sl, { n: 8, l: L_MASON, rt: 1.26 });
  TT.cyl(1.82, .22, bx, bh + .22, bz, st, { n: 8, l: L_MASON });
  for (let k = 0; k < 8; k++) { const a = (k + .5) / 8 * TAU; if (k === 1) continue; mas(TT, .6, .5, .32, bx + Math.cos(a) * 1.6, bh + .58, bz + Math.sin(a) * 1.6, null, { r: [0, -a + HPI, 0] }); }
  for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + .4; TT.box(.12, .9, .12, bx + Math.cos(a) * 1.45, bh * (.4 + (k & 1) * .22), bz + Math.sin(a) * 1.45, COL.black, { jit: 0, r: [0, -a, 0] }); }
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + .2; TT.seg([bx + Math.cos(a) * 1.4, bh - .55, bz + Math.sin(a) * 1.4], [bx + Math.cos(a) * 2.2, bh - .4, bz + Math.sin(a) * 2.2], .07, .06, COL.woodD, { l: L_WOOD, n: 4 }); }
  TT.cyl(.6, .55, bx, bh + .6, bz, sdk, { n: 8, l: L_MASON });
  TT.cyl(.72, .4, bx, bh + 1.06, bz, COL.iron, { n: 8, l: L_METAL, rt: 1.4, rough: .7 });
  for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + .5; TT.seg([bx + Math.cos(a) * .72, bh + .35, bz + Math.sin(a) * .72], [bx + Math.cos(a) * .96, bh + 1.22, bz + Math.sin(a) * .96], .04, .04, COL.iron, { l: L_METAL, n: 4 }); }
  TT.cyl(.9, .1, bx, bh + 1.24, bz, COL.ember, { n: 8, emis: .5, jit: 0 });
  for (let k = 0; k < 4; k++) { const a = k * 1.3; TT.seg([bx + Math.cos(a) * .7, bh + 1.28, bz + Math.sin(a) * .7], [bx - Math.cos(a) * .6, bh + 1.48, bz - Math.sin(a) * .6], .1, .09, mulC(COL.bark, .7), { l: L_WOOD, n: 5, emis: .05 }); }
  clothPanel(TT, { x0: bx - .45, x1: bx + .45, yTop: 5.2, len: 2.3, z: bz + 1.5, col: COL.clothR, col2: mulC(COL.gold, .6), rng, sway: .45 });
  B.structs.push({ soup: new Soup().merge(TG, { p: [kx, ky, oz], ao: [0, .9, .7] }), cx: kx, cy: ky, cz: oz - 2.5, kind: 'keep' });
  B.structs.push({ soup: new Soup().merge(TT, { p: [kx, ky, oz], ao: [0, 1.4, .65] }), cx: kx + bx, cy: ky, cz: oz + bz, kind: 'beaconTower' });
  B.beacon = { x: kx + bx, y: ky + bh + 1.45, z: oz + bz };
  B.gate = { x: kx, y: ky, z: -11.4 };
}

function buildCave(B) {
  const rng = B.rng, zc = B.zc, T = new Soup(), D = new Soup();
  let i0 = 0; for (let i = 0; i < B.n; i++) if (B.px[i] >= -14.6) { i0 = i; break; }
  const y0 = B.py[i0], ox = -14.5;
  const rk = (r, x, y, z, o = {}) => T.rock(r, x, y, z, mixC(COL.stoneD, COL.stone, rng() * .7), o);
  for (const s of [-1, 1]) { rk(1.3, .1, .65, s * 2.45); rk(1.1, .2, 1.9, s * 2.3); rk(.95, .2, 2.95, s * 1.95); rk(.62, 1.0, .3, s * 2.15); rk(.45, 1.5, .2, s * 1.95); }
  rk(1.35, .15, 3.65, 0, { sq: .55 }); rk(1.05, .25, 3.55, -1.05, { sq: .6 }); rk(1.05, .25, 3.55, 1.05, { sq: .6 });
  for (let k = 0; k < 4; k++) rk(2.3, -1.2 - k * .85, 4.3 + k * .3, rng.range(-.6, .6), { sq: .58 });
  for (const zz of [-1.25, -.75, -.2, .35, .9, 1.3]) T.cone(.15 + rng() * .06, .45 + rng() * .5, .3 + rng() * .2, 2.85, zz, mulC(COL.stoneL, .9), { n: 5, l: L_ROCK, r: [PI, 0, 0] });
  T.box(3.8, .2, 3.7, -1.9, 3.05, 0, COL.black, { jit: 0 }); T.box(.2, 3.4, 3.7, -3.45, 1.5, 0, COL.black, { jit: 0 });
  for (const s of [-1, 1]) T.box(3.8, 3.2, .2, -1.9, 1.5, s * 1.82, mulC(COL.stoneD, .25), { l: L_ROCK, jit: 0 });
  for (const s of [-1, 1]) { T.seg([1.7, 0, s * 2.5], [1.78, 1.6, s * 2.55], .055, .035, COL.woodD, { l: L_WOOD }); PROP.skull(T, 1.78, 1.72, s * 2.55, .17, s * .5 + 1.2); }
  const Bn = new Soup(); PROP.bones(Bn, rng, 6); T.merge(Bn, { p: [2.2, .02, 2.2], ao: null }); const Bn2 = new Soup(); PROP.bones(Bn2, rng, 5); T.merge(Bn2, { p: [2.6, .02, -2.3], ao: null });
  for (const xx of [-.35, -.95, -1.55, -2.2, -2.85]) D.quad([xx, 0, 1.8], [xx, 0, -1.8], [xx, 3.0, -1.8], [xx, 3.0, 1.8], WHITE, L_PLAIN, 1);
  B.structs.push({ soup: new Soup().merge(T, { p: [ox, y0, zc], ao: null }), cx: ox - 1.2, cy: y0, cz: zc, kind: 'cave', extras: [{ soup: new Soup().merge(D, { p: [ox, y0, zc], ao: null }), mat: MAT.dark, order: 2 }] });
  B.cave = { x: ox, y: y0, z: zc, s: Math.max(.6, (i0 - 5) * PATH_STEP) };
}

function scatterProps(B) {
  const rng = B.rng, placed = [], H = B.heightAt;
  const free = (x, z, r, roadMin = .6) => {
    if (Math.abs(x) > BH - .7 - r || Math.abs(z) > BH - .7 - r) return false;
    if (B.dRoadAt(x, z) < ROAD_HALF + roadMin + r) return false;
    if (B.dStrAt(x, z) < 1.5 + r) return false;
    for (const p of B.pads) if (dist2(x, z, p.x, p.z) < (2.15 + r) * (2.15 + r)) return false;
    if (Math.abs(x - B.kx) < 5.7 + r && z < -11.2 + r) return false;
    if (x < -12.4 && Math.abs(z - B.zc) < 3.4 + r) return false;
    for (const q of placed) if (dist2(x, z, q[0], q[1]) < (q[2] + r) * (q[2] + r)) return false;
    return true;
  };
  const slope = (x, z) => Math.abs(H(x + .5, z) - H(x - .5, z)) + Math.abs(H(x, z + .5) - H(x, z - .5));
  const find = (r, o = {}) => {
    for (let t = 0; t < 90; t++) {
      const x = rng.range(-BH + 1, BH - 1), z = rng.range(-BH + 1, BH - 1);
      if (!free(x, z, r, o.roadMin)) continue;
      if (!o.steep && slope(x, z) > (o.maxSlope || .32)) continue;
      const dr = B.dRoadAt(x, z); if (o.near && dr > o.near) continue; if (o.far && dr < o.far) continue;
      return [x, z];
    }
    return null;
  };
  const drop = (build, r, o = {}) => { const p = o.at || find(r, o); if (!p) return null; const T = new Soup(); build(T); B.put(T, p[0], p[1], { ry: o.ry === undefined ? rng() * TAU : o.ry, s: o.s, r: o.r, dy: o.dy, ao: o.ao }); placed.push([p[0], p[1], r]); return p; };
  const beside = (smin, smax, d, r) => {
    for (let t = 0; t < 40; t++) {
      const i = clamp(Math.round(rng.range(smin, smax) / PATH_STEP), 2, B.n - 3), side = rng.sign();
      const x = B.px[i] - B.tz[i] * side * (ROAD_HALF + d), z = B.pz[i] + B.tx[i] * side * (ROAD_HALF + d);
      if (free(x, z, r, d - r - .05) && slope(x, z) < .4) return [x, z, Math.atan2(B.tz[i], B.tx[i]), side];
    }
    return null;
  };
  drop(T => PROP.towerRuin(T, rng), 2.9, { far: 3.6 });
  drop(T => PROP.well(T, rng), 1.3, { near: 5.5, far: 2.6 });
  drop(T => PROP.statue(T, rng), 1.2, { near: 6, far: 2.4 });
  drop(T => PROP.ribcage(T, rng), 2.4, { far: 2.8 });
  for (let k = 0; k < 3; k++) { const len = rng.range(4, 7); drop(T => PROP.wallRun(T, rng, len, rng.range(1.8, 3.2)), len * .5, { far: 1.6 }); }
  { const g = find(3.2, { far: 3.4 }); if (g) {
      const ry = rng() * TAU, cs = Math.cos(ry), sn = Math.sin(ry);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { if (rng() < .2) continue; const lx = (c - 1.5) * 1.15 + rng.range(-.15, .15), lz = (r - 1) * 1.5 + rng.range(-.15, .15), T = new Soup(); PROP.grave(T, rng); B.put(T, g[0] + lx * cs + lz * sn, g[1] - lx * sn + lz * cs, { ry: ry + rng.range(-.2, .2) }); }
      for (const [lx, lz, a, len] of [[0, -2.5, 0, 4.6], [-2.8, -.2, HPI, 4.2], [2.8, .5, HPI, 3]]) { const T = new Soup(); PROP.fence(T, rng, len); B.put(T, g[0] + lx * cs + lz * sn, g[1] - lx * sn + lz * cs, { ry: ry + a }); }
      const T = new Soup(); PROP.tree(T, rng, 3.6); B.put(T, g[0] + 2.3 * cs - 2.0 * sn, g[1] - 2.3 * sn - 2.0 * cs, {});
      placed.push([g[0], g[1], 3.2]);
    } }
  for (let k = 0; k < 2; k++) { const p = beside(10, B.L - 8, 1.25, 1.1); if (p) drop(T => PROP.cart(T, rng, k === 1), 1.1, { at: p, ry: -p[2] + rng.range(-.3, .3), r: k === 1 ? [0, -p[2] + .4, .22] : undefined }); }
  for (let k = 0; k < 4; k++) { const p = beside(8, B.L - 6, .75, .3); if (p) { const len = rng.range(2.6, 4.2); drop(T => PROP.palisade(T, rng, len), 1.0, { at: p, ry: -p[2] }); } }
  for (let k = 0; k < 4; k++) { const p = beside(8, B.L - 6, 1.0, .4); if (p) { const len = rng.range(2.5, 4.5); drop(T => PROP.fence(T, rng, len), 1.2, { at: p, ry: -p[2] + rng.range(-.15, .15) }); } }
  for (let k = 0; k < 4; k++) { const p = beside(8, B.L - 5, .8, .25); if (p) drop(T => PROP.banner(T, rng, k & 1 ? COL.clothR : COL.clothB), .3, { at: p, ry: -p[2] + HPI * p[3] }); }
  { const p = beside(B.L * .3, B.L * .7, .8, .3); if (p) drop(T => PROP.signpost(T, rng), .3, { at: p, ry: -p[2] }); }
  { const p = beside(12, B.L * .6, 1.3, .6); if (p) drop(T => PROP.gibbet(T, rng), .6, { at: p, ry: -p[2] + HPI }); }
  for (const pad of B.pads) {
    if (rng() < .35) continue;
    const a = rng() * TAU, x = pad.x + Math.cos(a) * 2.25, z = pad.z + Math.sin(a) * 2.25;
    if (B.dRoadAt(x, z) < ROAD_HALF + .7 || B.dStrAt(x, z) < 1.8) continue;
    const T = new Soup(); PROP.barrel(T, 0, 0, 0, 1, rng); if (rng() < .6) PROP.barrel(T, .5, 0, .15, .9, rng); if (rng() < .7) PROP.crate(T, -.1, 0, .55, .5, rng, rng()); if (rng() < .4) PROP.crate(T, -.12, .5, .55, .38, rng, rng());
    B.put(T, x, z, { ry: rng() * TAU }); placed.push([x, z, .8]);
  }
  for (let k = 0; k < 6; k++) { const x = B.lay.cave.x + rng.range(1.8, 7), z = B.zc + rng.sign() * rng.range(1.9, 5); if (free(x, z, .4, .2)) drop(T => PROP.bones(T, rng, rng.int(4, 7)), .5, { at: [x, z], ao: null }); }
  for (let k = 0; k < 5; k++) drop(T => PROP.bones(T, rng, rng.int(3, 5)), .45, { ao: null });
  for (let k = 0; k < 3; k++) drop(T => PROP.cairn(T, rng), .5, {});
  const trees = [];
  for (let k = 0; k < 13; k++) { const h = rng.range(2.6, 4.6), p = drop(T => PROP.tree(T, rng, h), .55, { far: 1.0 }); if (p) trees.push([p, h]); }
  for (let k = 0; k < 4 && k < trees.length; k++) {
    const [p, h] = trees[k], y = H(p[0], p[1]), a = rng() * TAU, T = new Soup();
    PROP.web(T, [0, h * .42, 0], [Math.cos(a) * .9, h * .55, Math.sin(a) * .9], [Math.cos(a) * .7, h * .18, Math.sin(a) * .7]);
    B.put(T, p[0], p[1], { y, ao: null });
  }
  for (let k = 0; k < 6; k++) drop(T => PROP.stump(T, rng), .4, {});
  for (let k = 0; k < 70; k++) { const r = rng() < .2 ? rng.range(.6, 1.25) : rng.range(.16, .5); drop(T => T.rock(r, 0, r * .28, 0, mixC(COL.stoneD, COL.stone, rng())), r * .8, { steep: true, roadMin: .25, ao: [0, r * .6, .6] }); }
  for (let k = 0; k < 320; k++) {
    const x = rng.range(-BH + .8, BH - .8), z = rng.range(-BH + .8, BH - .8);
    if (B.dRoadAt(x, z) < ROAD_HALF + .35 || B.dStrAt(x, z) < 1.1 || slope(x, z) > .5) continue;
    if (Math.abs(x - B.kx) < 5.4 && z < -11.6) continue;
    const T = new Soup(); PROP.tuft(T, rng); B.put(T, x, z, { ao: null, s: rng.range(.8, 1.5) });
  }
  for (let k = 0; k < 60; k++) {
    const i = rng.int(16, B.n - 12), side = rng.sign(), d = ROAD_HALF + rng.range(.1, .45), x = B.px[i] - B.tz[i] * side * d, z = B.pz[i] + B.tx[i] * side * d;
    if (B.dStrAt(x, z) < 2.4) continue;
    const r = rng.range(.08, .17), T = new Soup(); T.rock(r, 0, r * .3, 0, mixC(COL.roadD, COL.stone, rng())); B.put(T, x, z, { ao: null });
  }
}
