
Object.assign(G, {
  press: 1, bountyMul: 1, dmgMul: 1, waveKills: 0, waveLeaks: 0, leaks: 0, leakTypes: {}, slowmo: 0, bossDown: false,
  queue: [], waveT: 0, nextIn: 0, spawning: false, bossWave: false, bossAlive: false, k: 0, phaseT: 0, banner: null, started: false, timeScale: 1, trickle: 0, clearT: 0,
});

function waveNumber() { return G.level * 5 + (G.phase === 'rise' ? 1 : Math.max(1, G.k)); }
function buildWave(k, level) {
  const q = [], boss = k === 5, lv = 1 + .15 * level;
  let budget = (34 + 25 * (k - 1)) * lv * G.press * (boss ? .7 : 1);
  const hpMul = (1 + .13 * (k - 1)) * (1 + .22 * level) * (.85 + .15 * G.press);
  const cost = { skel: 4, rat: 1.7, slime: 9.5, knight: 12.5, bat: 4.6 };
  const menu = [['skel', 5]];
  if (k >= 2 || level > 0) menu.push(['rat', k === 2 ? 6 : 3]);
  if (k >= 3 || level > 0) { menu.push(['slime', k === 3 ? 4 : 2]); menu.push(['bat', k === 3 ? 2 : 1.2]); }
  if (k >= 4 || level > 0) menu.push(['knight', k === 4 ? 4 : 2]);
  if (k === 2 && level === 0) menu.push(['bat', 1]);
  const tot = menu.reduce((a, b) => a + b[1], 0);
  let t = .6;
  if (boss) q.push({ t: 2.2, type: (level % 2) ? 'ogre' : 'giant', hpMul: (1 + .4 * level) * Math.pow(G.press, .4) });
  while (budget > 0) {
    let r = rnd() * tot, type = 'skel'; for (const [ty, w] of menu) { r -= w; if (r <= 0) { type = ty; break; } }
    const n = type === 'rat' ? Math.floor(rr(5, 9)) : type === 'bat' ? Math.floor(rr(2, 4)) : type === 'slime' ? Math.floor(rr(1, 3)) : type === 'knight' ? Math.floor(rr(1, 3)) : Math.floor(rr(3, 6));
    const gap = type === 'rat' ? .2 : type === 'bat' ? .35 : type === 'slime' ? .9 : .5;
    for (let i = 0; i < n && budget > 0; i++) { q.push({ t, type, hpMul }); t += gap * rr(.8, 1.25); budget -= cost[type]; }
    t += rr(1.1, 2.3) * (boss ? 1.5 : 1);
  }
  q.sort((a, b) => a.t - b.t);
  return q;
}
function startWave() {
  G.k = G.k % 5 + 1; G.queue = buildWave(G.k, G.level); G.waveT = 0; G.spawning = true; G.bossWave = G.k === 5; G.waveKills = 0; G.waveLeaks = 0; G.bossDown = false; G.trickle = 6; G.trickleN = 0;
  sfx(G.bossWave ? 'hornBoss' : 'horn', G.B.cave.x, G.B.cave.z, 1.1);
  UI.banner(G.bossWave ? 'Wave ' + waveNumber() + ' · ' + MON[(G.level % 2) ? 'ogre' : 'giant'].name : 'Wave ' + waveNumber(), G.bossWave ? 3.6 : 2.2, G.bossWave);
}
function endWave() {
  const l = G.waveLeaks;
  if (l === 0) G.press *= 1.17; else if (l >= 6) G.press *= .8; else if (l >= 3) G.press *= .9;
  if (G.lives <= 6) G.press *= .9;
  G.press = clamp(G.press, .6, 2.2);
  G.gold += 24 + 9 * G.k + 10 * G.level;
}
function updateWaves(dt) {
  if (G.phase !== 'play') return;
  const B = G.B;
  if (G.spawning) {
    G.waveT += dt;
    while (G.queue.length && G.queue[0].t <= G.waveT) {
      if (G.mons.length > 84) break;
      const e = G.queue.shift(); spawnMonster(e.type, { hpMul: e.hpMul });
    }
    if (!G.queue.length) {
      G.bossAlive = G.mons.some(m => m.def.boss && !m.dead);
      if (G.bossWave && G.bossAlive) {
        G.trickle -= dt;
        if (G.trickle <= 0 && G.trickleN < 9) { G.trickleN++; G.trickle = rr(3.2, 4.6); const ty = ['skel', 'skel', 'rat', 'rat', 'bat', 'knight'][Math.floor(rnd() * 6)], n = ty === 'rat' ? 4 : 2, hpMul = (1 + .5) * (1 + .22 * G.level); for (let i = 0; i < n; i++) G.queue.push({ t: G.waveT + i * .4, type: ty, hpMul }); }
      } else { G.spawning = false; endWave(); G.nextIn = G.bossWave ? -1 : 6.5; G.clearT = 0; }
    }
  } else if (G.bossWave) {
    G.clearT += dt;
    if (!G.mons.some(m => !m.dead) || G.clearT > 40) { setPhase('clear'); }
  } else {
    G.nextIn -= dt;
    if (G.nextIn <= 0) startWave();
  }
  if (G.lives <= 0 && G.phase === 'play') setPhase('defeat');
}
function callWaveEarly() { if (G.phase === 'play' && !G.spawning && !G.bossWave && G.nextIn > .4) { G.gold += Math.round(G.nextIn * 3); G.nextIn = .05; return true; } return false; }

function padCoverage(pad, range, air) {
  const B = G.B; let c = 0; const r2 = range * range;
  for (let i = 0; i < B.n; i += 2) if (dist2(pad.x, pad.z, B.px[i], B.pz[i]) < r2) c += PATH_STEP * 2;
  return c;
}
function buildTower(pad, kind, byPlayer) {
  const def = TOWER[kind]; if (pad.tower || G.gold < def.cost[0] || G.phase !== 'play') return null;
  G.gold -= def.cost[0]; UI.goldShown = Math.min(UI.goldShown, G.gold);
  const t = new Tower(pad, kind, G.B.pads.indexOf(pad)); G.towers.push(t); UI.ping(pad.x, pad.y, pad.z, byPlayer); return t;
}
function upgradeTower(t, byPlayer) {
  if (!t || t.lvl >= 2 || t.state !== 'active' || G.phase !== 'play') return false; const c = t.def.cost[t.lvl + 1]; if (G.gold < c) return false;
  G.gold -= c; UI.goldShown = Math.min(UI.goldShown, G.gold); t.upgrade(); UI.ping(t.x, t.y, t.z, byPlayer); return true;
}
function sellTower(t) {
  if (!t || !t.alive || G.phase !== 'play') return false; const refund = Math.round(t.spent * .6);
  G.gold += refund; t.sell(); const i = G.towers.indexOf(t); if (i >= 0) G.towers.splice(i, 1); return true;
}

const AI = { think: .15, wait: 0, last: '' };
function aiThink(dt) {
  if (G.phase !== 'play' || UI.playerActive()) return;
  AI.think -= dt; if (AI.think > 0) return; AI.think = .5;
  const B = G.B, towers = G.towers.filter(t => t.alive), empty = B.pads.filter(p => !p.tower), N = towers.length;
  const cnt = { archer: 0, bombard: 0, spire: 0, guard: 0 }; for (const t of towers) cnt[t.kind]++;
  const ideal = { archer: .36, bombard: .22, spire: .2, guard: .22 };
  const lt = G.leakTypes, air = (lt.bat || 0), armor = (lt.knight || 0) + (lt.giant || 0) + (lt.ogre || 0), swarm = (lt.rat || 0) + (lt.slimelet || 0);
  const gatePress = sat(G.leaks / 8);
  const opts = [];
  for (const kind of TOWER_KINDS) {
    const def = TOWER[kind];
    let need = ideal[kind] * (N + 1.6) - cnt[kind] + .35;
    if (kind === 'archer') need += air * .12 + (N === 0 ? 1 : 0); if (kind === 'spire') need += air * .08 + armor * .1; if (kind === 'bombard') need += armor * .08 + swarm * .06 + (N >= 2 && cnt.bombard === 0 ? .5 : 0); if (kind === 'guard') need += swarm * .04 + (N >= 1 && cnt.guard === 0 ? .9 : 0);
    if (need <= 0) continue;
    for (const pad of empty) {
      const cov = padCoverage(pad, def.range[0]) / (def.range[0] * 2);
      let sc = need * (.55 + cov * .5);
      const rel = pad.s / B.L;
      if (N < 2) sc *= 1 - Math.abs(rel - .42) * .9;
      sc *= 1 + gatePress * (rel - .5) * .8;
      let syn = 0;
      for (const t of towers) { const d = Math.hypot(t.x - pad.x, t.z - pad.z); if (kind === 'guard' && t.kind !== 'guard' && d < t.range + 1.5) syn += .16; if (kind !== 'guard' && t.kind === 'guard' && d < def.range[0] + 1) syn += .2; if (t.kind === kind && d < 6) syn -= .12; }
      if (kind === 'guard') { sc *= .8 + .5 * rel; for (const t of towers) if (t.kind === 'guard' && Math.abs(t.pad.s - pad.s) < 9) syn -= .5; }
      sc *= 1 + syn;
      opts.push({ sc, cost: def.cost[0], act: 'build', kind, pad });
    }
  }
  for (const t of towers) {
    if (t.state !== 'active' || t.lvl >= 2) continue;
    const c = t.def.cost[t.lvl + 1], use = sat(t.recent / 60);
    let sc = (.5 + use * .9 + (t.lvl === 0 ? .12 : 0)) * (N >= 4 ? 1.25 : .7) * (empty.length === 0 ? 1.6 : 1) * (110 / c);
    if (t.kind === 'archer') sc *= 1 + air * .06; if (t.kind === 'spire') sc *= 1 + armor * .05;
    opts.push({ sc, cost: c, act: 'up', t });
  }
  if (!opts.length) return;
  opts.sort((a, b) => b.sc - a.sc);
  let pick = opts[0];
  if (pick.cost > G.gold) {
    AI.wait += .5;
    const aff = opts.find(o => o.cost <= G.gold && o.sc > pick.sc * (AI.wait > 9 ? .45 : .8));
    if (!aff) return; pick = aff;
  }
  AI.wait = 0;
  if (pick.act === 'build') buildTower(pick.pad, pick.kind, false); else upgradeTower(pick.t, false);
  AI.think = N < 3 ? .12 : .8;
}

function setPhase(p) {
  G.phase = p; G.phaseT = 0;
  if (p === 'clear') { G.advance = true; UI.banner('The pass holds', 3.2, false); UI.closeMenu(); }
  if (p === 'defeat') { UI.banner('The beacon is out', 4.2, true); UI.closeMenu(); sfx('beaconOut', G.B.beacon.x, G.B.beacon.z, 1.2); fxEmbers(G.B.beacon.x, G.B.beacon.y, G.B.beacon.z, 60, .8); for (let i = 0; i < 14; i++) fxSmoke(G.B.beacon.x + rr(-.4, .4), G.B.beacon.y + rr(0, 1), G.B.beacon.z + rr(-.4, .4), rr(-.3, .3), rr(.8, 2), rr(-.3, .3), rr(2, 4), 1, 2, .2, .2, .22, .6, { drag: .5, rise: .2 }); }
  if (p === 'crumble') startCrumble();
  if (p === 'rise') startRise();
}
function startCrumble() {
  const B = G.B;
  for (const m of G.mons) if (!m.dead) { shatter(e => rigMonster(e), m, [0, 1, 0], { spread: 1.2, life: 1 }); removeMonster(m); }
  for (const f of G.men) if (!f.dead) { f.weapon = KIT.item.blade; shatter(e => rigHuman(KIT.foot, SPEC.foot, e), f, [0, 1, 0], { spread: 1, life: 1 }); f.dead = f.gone = true; f.alive = false; if (f.flame) removeFlame(f.flame); }
  G.mons.length = 0; G.men.length = 0; G.arrows.length = 0; G.shells.length = 0; G.stuck.length = 0;
  for (const t of G.towers) {
    t.em.alive = false; LT.emitters[t.idx] = null; removeFlame(t.flame); removeFlame(t.flame2); t.flame = t.flame2 = null; t.archers.length = 0; t.alive = false; t.state = 'gone';
    let best = null, bd = 1e9; for (const p of B.pieces) if (p.kind === 'chunk') { const d = dist2(p.cx, p.cz, t.x, t.z); if (d < bd) { bd = d; best = p; } }
    if (best) best.mesh.attach(t.group);
  }
  for (const f of B.flames) removeFlame(f); B.flames.length = 0;
  for (const p of B.pieces) { p.t = 0; p.delay = .25 + rnd() * .9 + sat((36 - (p.cx + p.cz)) / 72) * 1.3 + (p.kind !== 'chunk' ? .2 : 0); p.vy = 0; }
  FX.groundAt = () => -500; clearFX(); setBoardCasting(B, true);
  sfx('crumble', 0, 0, 1.3); FX.shake = 1.2;
}
function startRise() {
  if (G.B) { for (const t of G.towers) { t.clearModel(false); } G.towers.length = 0; clearDebris(); disposeBoard(G.B); }
  for (let i = 0; i < LT.emitters.length; i++) LT.emitters[i] = null;
  const B = G.B = buildBoard(G.boardSeed++, G.boardIndex++);
  R.scene.add(B.group); activateBoard(B, false);
  setBoardCasting(B, true);
  for (const p of B.pieces) { p.t = 0; p.delay = sat((p.cx + p.cz + 36) / 72) * 1.7 + rnd() * .25 + (p.kind === 'chunk' ? 0 : 2.0 + rnd() * .3); p.mesh.visible = false; }
  sfx('rise', 0, 0, 1.2);
}
function activateBoard(B, lit) {
  B.flames = [];
  const b = B.beacon;
  B.beaconFlame = addFlame({ x: b.x, y: b.y - .12, z: b.z, size: 2.3, layers: 3, embers: 2.6, glow: 1.1, smoke: 5, on: lit ? 1 : 0 }); B.flames.push(B.beaconFlame);
  for (const f of B.fires) B.flames.push(addFlame({ x: f.x, y: f.y, z: f.z, size: f.size, embers: .5, glow: .8, on: lit ? 1 : 0 }));
  LT.beaconPos = b; LT.beaconOn = lit ? 1 : 0; LT.beaconLevel = 1; setMoon(B);
  FX.groundAt = B.heightAt;
  G.padCov = null;
}
function beginBattle(first) {
  const B = G.B;
  G.lives = G.maxLives; G.gold = 300 + 110 * G.level; G.bountyMul = 1 + .3 * G.level; G.dmgMul = 1.55 + .2 * G.level; G.press = lerp(G.press, 1, .5); UI.goldShown = G.gold; G.k = 0; G.leaks = 0; G.leakTypes = {}; G.spawning = false; G.bossWave = false; G.nextIn = first ? .9 : 1.6; G.queue = []; AI.think = .15; AI.wait = 0;
  const n = 4 + Math.min(3, G.level);
  for (let i = 0; i < n; i++) spawnMonster(i === n - 1 && G.level > 0 ? 'knight' : 'skel', { s: B.cave.s + 2.2 + i * 1.15, lat: rr(-.7, .7), hpMul: 1 + .22 * G.level });
  G.phase = 'play'; G.phaseT = 0;
}
function updatePhase(dt) {
  G.phaseT += dt; const B = G.B, t = G.phaseT;
  const want = G.phase === 'defeat' ? 0 : (G.phase === 'rise' ? (t > B.igniteAt ? 1 : 0) : 1);
  LT.beaconOn = damp(LT.beaconOn, want, want ? 3 : 1.6, dt);
  LT.beaconLevel = damp(LT.beaconLevel, G.lives / G.maxLives, 3, dt);
  if (B.beaconFlame) { const f = B.beaconFlame, lv = LT.beaconLevel; f.on = LT.beaconOn; f.size = 2.35 * (.42 + .58 * lv) * (1 - .32 * LT.beaconGutter); f.embers = 1 + 2 * lv + 6 * LT.beaconGutter; }
  for (let i = 1; i < B.flames.length; i++) B.flames[i].on = LT.beaconOn;
  if (G.phase === 'clear') { if (t > 2.6) setPhase('crumble'); }
  else if (G.phase === 'defeat') {
    for (const tw of G.towers) { tw.em.on = damp(tw.em.on, 0, 1.5 + tw.idx * .15, dt); if (tw.flame) tw.flame.on = tw.em.on; if (tw.flame2) tw.flame2.on = tw.em.on; }
    if (t > 4.4) { G.level = 0; G.press = Math.max(.8, G.press * .85); G.run++; setPhase('crumble'); }
  } else if (G.phase === 'crumble') {
    let done = true;
    for (const p of B.pieces) {
      const u = t - p.delay;
      if (u < 0) { p.mesh.position.set(p.cx + rr(-.03, .03) * sat(t * 2), p.cy, p.cz + rr(-.03, .03) * sat(t * 2)); done = false; continue; }
      const y = p.cy - 9 * u * u - u * 1.2; p.mesh.position.set(p.cx, y, p.cz); p.mesh.rotation.set(p.spin.x * u * .5, p.spin.y * u * .25, p.spin.z * u * .5);
      if (!p.dusted) { p.dusted = true; fxDust(p.cx, 0, p.cz, 5, 2.2, { speed: 2.5, life: 1.4 }); FX.shake = Math.min(1, FX.shake + .12); }
      if (y > -60) done = false; else p.mesh.visible = false;
    }
    if (done || t > 5.2) { if (G.advance) { G.level++; G.advance = false; } setPhase('rise'); }
  } else if (G.phase === 'rise') {
    let done = true;
    for (const p of B.pieces) {
      const u = (t - p.delay) / (p.kind === 'chunk' ? 1.15 : .8);
      if (u < 0) { done = false; continue; }
      p.mesh.visible = true;
      if (u >= 1) { p.mesh.position.set(p.cx, p.cy, p.cz); p.mesh.rotation.set(0, 0, 0); if (!p.set) { p.set = true; if (p.kind !== 'chunk') { fxDust(p.cx, p.cy + .2, p.cz, 12, 2.2, { speed: 3 }); FX.shake = Math.min(1, FX.shake + .3); sfx('hammer', p.cx, p.cz, 1, .1); } } continue; }
      done = false; const e = easeOut(u), k = 1 - e;
      if (p.kind === 'chunk') { p.mesh.position.set(p.cx, p.cy - 30 * k, p.cz); p.mesh.rotation.set(p.spin.x * k * .7, p.spin.y * k * .5, p.spin.z * k * .7); }
      else { const d = 1 - u * u; p.mesh.position.set(p.cx, p.cy + 16 * d, p.cz); p.mesh.rotation.set(0, 0, 0); }
    }
    if (done && !B.igniteAt) { B.igniteAt = t + .25; }
    if (B.igniteAt && t > B.igniteAt && !B.lit) { B.lit = true; sfx('ignite', B.beacon.x, B.beacon.z, 1.3, 1); lightFlash(B.beacon.x, B.beacon.y + 1, B.beacon.z, 0xffa050, 2600, .7, 60); fxEmbers(B.beacon.x, B.beacon.y, B.beacon.z, 50, .6); FX.shake = .5; }
    if (B.lit && t > B.igniteAt + .7) { setBoardCasting(B, false); beginBattle(false); }
  }
}
