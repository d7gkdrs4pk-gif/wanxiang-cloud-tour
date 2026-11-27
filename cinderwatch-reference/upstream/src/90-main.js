
const CAM = { yaw: PI / 4, elev: 38 * PI / 180, dist: 90, x: 0, y: 0, z: 0, zoom: 1, fx: 0, fz: 0, sx: 0, sz: 0 };
const _cr = new THREE.Vector3(), _cu = new THREE.Vector3(), _cd = new THREE.Vector3(), _ct = new THREE.Vector3();
function applyCamera() {
  const cam = R.cam, e = CAM.elev, sy = Math.sin(CAM.yaw), cy = Math.cos(CAM.yaw);
  _cd.set(Math.cos(e) * sy, Math.sin(e), Math.cos(e) * cy); _cr.set(cy, 0, -sy); _cu.set(-Math.sin(e) * sy, Math.cos(e), -Math.sin(e) * cy);
  const aspect = R.dw / R.dh, base = Math.max(R.viewH, 45 / aspect), vh = base / CAM.zoom;
  R.px = vh / R.ih; R.viewW = vh * aspect; R.dofScale = base / R.viewH / CAM.zoom;
  _ct.set(CAM.x, CAM.y, CAM.z).addScaledVector(_cr, FX.shakeX).addScaledVector(_cu, FX.shakeY);
  const u = _ct.dot(_cr), v = _ct.dot(_cu), us = Math.round(u / R.px) * R.px, vs = Math.round(v / R.px) * R.px;
  R.sub.set((u - us) / R.px, (v - vs) / R.px);
  R.ditherOfs.set(((Math.round(us / R.px) % 8) + 8) % 8, ((Math.round(vs / R.px) % 8) + 8) % 8);
  _ct.addScaledVector(_cr, us - u).addScaledVector(_cu, vs - v);
  cam.left = -vh * aspect / 2; cam.right = vh * aspect / 2; cam.top = vh / 2; cam.bottom = -vh / 2; cam.near = 1; cam.far = 210;
  cam.position.copy(_ct).addScaledVector(_cd, CAM.dist); cam.up.set(0, 1, 0); cam.lookAt(_ct);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  R.focusZ = CAM.dist;
  R.dofNear = (BH - _ct.x) * _cd.x - _ct.y * _cd.y + (BH - _ct.z) * _cd.z - 3.5;
}
function updateCamera(dt) {
  const B = G.B; let wx = 0, wz = 0, ws = 7, boss = false;
  if (G.phase === 'play' || G.phase === 'defeat') {
    for (const m of G.mons) {
      if (m.dead || (!m.vis && !m.fly)) continue;
      let w = 1 + 2.5 * m.prog; if (m.foe) w *= 2.4; if (m.flash > 0) w *= 1.5; if (m.def.boss) { w *= 16; boss = true; }
      wx += m.x * w; wz += m.z * w; ws += w;
    }
    for (const t of G.towers) if (t.recent > 5) { const w = Math.min(4, t.recent / 20); wx += t.x * w; wz += t.z * w; ws += w; }
  }
  let tx = wx / ws, tz = wz / ws; const l = Math.hypot(tx, tz), lim = 6.5; if (l > lim) { tx *= lim / l; tz *= lim / l; }
  const away = G.phase === 'clear' || G.phase === 'crumble' || G.phase === 'rise';
  if (away) { tx = 0; tz = 0; }
  CAM.fx = damp(CAM.fx, tx, .9, dt); CAM.fz = damp(CAM.fz, tz, .9, dt);
  CAM.sx = damp(CAM.sx, CAM.fx, .8, dt); CAM.sz = damp(CAM.sz, CAM.fz, .8, dt);
  CAM.x = CAM.sx; CAM.z = CAM.sz;
  const zt = away ? .62 : (G.phase === 'defeat' ? .92 : (boss ? 1.14 : 1));
  CAM.zoom = damp(CAM.zoom, zt, zt < CAM.zoom ? 1.1 : .7, dt);
  CAM.y = damp(CAM.y, away ? -2.2 : .4, 1, dt);
  const lk = window.__cw && window.__cw.lock; if (lk) { CAM.x = lk[0]; CAM.z = lk[1]; CAM.zoom = lk[2] || 1; }
}

function sfx(name, x, z, gain = 1, p = 0) {
  if (!AU.ready) return;
  const dx = x - CAM.x, dz = z - CAM.z, u = dx * Math.cos(CAM.yaw) - dz * Math.sin(CAM.yaw);
  AU.play(name, clamp(u / ((R.viewW || 40) * .5), -1, 1) * .75, gain * clamp(1.12 - Math.hypot(dx, dz) / 46, .4, 1) * (.72 + .28 * CAM.zoom), p);
}

const _mm = new THREE.Matrix4(), _mq = new THREE.Quaternion(), _mv = new THREE.Vector3(), _ms = new THREE.Vector3(1, 1, 1), _torch = [];
function step(rdt) {
  G.slowmo = Math.max(0, G.slowmo - rdt);
  const dt = rdt * (G.slowmo > 0 ? lerp(1, .32, sat(G.slowmo / .35)) : 1);
  G.t += dt; SH.uTime.value = G.t;
  const B = G.B;
  beginParts(); G.hbars.length = 0;
  updateFX(dt, G.t);
  const live = G.phase === 'play' || G.phase === 'defeat' || G.phase === 'clear';
  if (live) {
    updateWaves(dt); aiThink(dt);
    for (const t of G.towers) if (t.alive) t.update(dt);
    updateUnits(dt);
    for (let i = G.mons.length - 1; i >= 0; i--) if (G.mons[i].dead) swapRemove(G.mons, i);
    updateProjectiles(dt);
    for (const m of G.mons) drawMonster(m, G.t);
    for (const f of G.men) if (!f.dead) drawFootman(f);
    if (G.phase === 'play') for (const p of B.pads) if (!p.tower) { _mm.compose(_mv.set(p.x, p.y, p.z), _mq.setFromAxisAngle(_upv, p.face), _ms); KIT.marker.put(_mm, 0, null); }
  }
  if (live && B.fallAt && rnd() < dt * 7) { const f = B.fallAt; fxSmoke(f.x + f.ox * .3 + rr(-.5, .5) * Math.abs(f.oz), f.y - rr(.2, 1.4), f.z + f.oz * .3 + rr(-.5, .5) * Math.abs(f.ox), f.ox * .4, rr(-.6, .1), f.oz * .4, rr(.8, 1.5), .35, .7, .3, .36, .48, .3, { drag: .8 }); }
  updateDebris(dt, FX.groundAt, d => { UI.coinFrom(d.p.x, d.p.y, d.p.z, d.value || 0); fxTimed(5, d.p.x, d.p.y, d.p.z, .5, .5, 2.4, 1.8, .6, .8, .12); });
  updatePhase(dt);
  updateCamera(dt);
  updateLights(dt, G.t, CAM.x, CAM.z);
  _torch.length = 0;
  for (const m of G.mons) if (m.torch && !m.dead && m.vis) _torch.push(m);
  for (const f of G.men) if (f.torch && !f.dead) _torch.push(f);
  for (const a of G.arrows) _torch.push(a);
  updateTorchLights(dt, _torch, CAM.x, CAM.z);
  collectMistLights();
  endParts(); endFX();
  UI.update(rdt);
  if (AU.ready) { let lit = 0; for (const t of G.towers) if (t.alive && t.em.on > .5 && t.kind !== 'spire') lit++; AU.setAmbience(sat((.3 + lit * .06) * LT.beaconOn + .05), G.phase === 'play' ? .5 : .85, G.bossAlive && G.phase === 'play' ? 1 : 0); AU.update(rdt); }
}

let _last = 0, _acc = 0, _frames = 0, _slow = 0, _fast = 0, _hold = 0, _back = 12;
function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - _last) / 1000, rdt = Math.min(.05, Math.max(.001, raw)); _last = now; R.frameDt = rdt;
  step(rdt);
  R.fade = Math.min(1, R.fade + rdt * 1.6);
  applyCamera(); renderFrame(); UI.draw();
  if (document.hidden || raw > .25) { _acc = 0; _frames = 0; return; }
  _acc += raw; _frames++;
  if (_acc >= 2) {
    const ms = _acc / _frames * 1000;
    R.fpsText = (1000 / ms).toFixed(0) + ' fps  ' + R.iw + 'x' + R.ih + '  calls ' + R.renderer.info.render.calls + '  mons ' + G.mons.length;
    if (ms > 22.5) { _slow++; _fast = 0; } else { _slow = 0; _fast = ms < 18.6 ? _fast + 1 : 0; }
    _hold -= _acc;
    if (!HASH.noscale) {
      if (_slow >= 2 && R.quality > .55) { R.quality = Math.max(.55, R.quality - .15); resizeRenderer(); _slow = 0; _hold = _back; _back = Math.min(480, _back * 2); }
      else if (_fast >= 3 && R.quality < 1 && _hold <= 0) { R.quality = Math.min(1, R.quality + .15); resizeRenderer(); _fast = 0; }
    }
    _acc = 0; _frames = 0;
  }
}

function boot() {
  initRenderer(); initMaterials(); resizeRenderer(); initLights(); initFX(); initKits(); UI.init();
  KIT.marker = new PartBatch(S => { S.box(.07, .75, .07, 0, .37, 0, COL.woodD, { l: L_WOOD, r: [0, 0, .08] }); clothPanel(S, { x0: .03, x1: .36, yTop: .72, len: .26, z: 0, col: COL.clothT, rng: makeRng(9), nx: 2, ny: 2, rag: 0, sway: 0 }); S.rock(.12, -.2, .04, .15, COL.stone, {}); S.rock(.09, .22, .03, -.12, COL.stoneD, {}); }, 14, { rad: .1 });
  G.boardSeed = HASH.seed ? +HASH.seed : 1 + Math.floor(Math.random() * 9000);
  G.boardIndex = +(HASH.board || 0); G.level = +(HASH.level || 0);
  const B = G.B = buildBoard(G.boardSeed++, G.boardIndex++);
  R.scene.add(B.group); activateBoard(B, true);
  beginBattle(true);
  window.addEventListener('resize', resizeRenderer);
  window.__cw = { G, R, CAM, UI, LT, FX, AI, step, setPhase, spawnMonster, MAT, tick(dt, render) { R.frameDt = dt; step(dt); R.fade = 1; applyCamera(); if (render) renderFrame(); UI.draw(); }, bench(n = 40) { const gl = R.renderer.getContext(), px = new Uint8Array(4); applyCamera(); renderFrame(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t0 = performance.now(); for (let i = 0; i < n; i++) { applyCamera(); renderFrame(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return +((performance.now() - t0) / n).toFixed(2); }, build(i, kind, lvl) { const pad = G.B.pads[i]; if (pad.tower) return; G.gold += 999; const t = buildTower(pad, kind, false); for (let k = 0; k < 90; k++) step(1 / 30); for (let l = 0; l < (lvl || 0); l++) { G.gold += 999; upgradeTower(t); for (let k = 0; k < 90; k++) step(1 / 30); } return t.kind + t.lvl; } };
  if (HASH.k) G.k = +HASH.k;
  if (HASH.ff) { const n = Math.round(+HASH.ff * 30); for (let i = 0; i < n; i++) step(1 / 30); CAM.sx = CAM.fx; CAM.sz = CAM.fz; R.fade = 1; }
  if (HASH.phase) setPhase(HASH.phase);
  if (HASH.cam) { const c = HASH.cam.split(',').map(Number); window.__cw.lock = c; }
  if (HASH.manual) return;
  _last = performance.now();
  requestAnimationFrame(frame);
}
boot();
