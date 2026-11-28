// Original, dependency-free forest sample simulation. All x/y positions are
// ground/foot coordinates. Call step with real elapsed seconds; menus pause it.
const WORLD = 1536, PLAYER_R = 15, ATTACK_HIT = .22, ATTACK_END = .56;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
const ENEMY = {
  seed: { name: '苔芽', hp: 2, r: 13, speed: 61, damage: 10, xp: 2 },
  moth: { name: '月蛾', hp: 2, r: 11, speed: 94, damage: 8, xp: 3 },
  shroom: { name: '伞灵', hp: 4, r: 18, speed: 44, damage: 14, xp: 4 },
  stag: { name: '古木灵鹿', hp: 90, r: 32, speed: 69, damage: 23, xp: 0 }
};

export class ForestRun {
  constructor(options = {}) {
    this.seed = ((typeof options === 'number' ? options : options.seed) ?? 0xF01736) >>> 0;
    this.width = this.height = WORLD;
    this.obstacles = [];
    this.restart();
  }

  _random() {
    let t = this._rng = (this._rng + 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  restart(seed) {
    if (Number.isFinite(seed)) this.seed = seed >>> 0;
    this._rng = this.seed; this._id = 0; this.time = 0; this.kills = 0;
    this.phase = 'play'; this.bossSpawned = false; this.chestSpawned = false;
    this.chestOpened = false; this.levelChoices = []; this.upgradeTitle = '';
    this.upgradeSource = null; this.result = null; this._spawnIn = 1.7;
    this.stats = { damage: 2, interval: 1.05, range: 106, pulseDamage: 3,
      pulseRadius: 188, pulseInterval: 8, armor: 0, regen: 0, magnet: 124 };
    this.player = { x: 768, y: 940, r: PLAYER_R, hp: 100, maxHp: 100,
      level: 1, xp: 0, nextXp: 8, dirX: 0, dirY: -1, moving: false,
      attackT: -1, attackPhase: 'idle', attackDirX: 0, attackDirY: -1,
      attackCooldown: .25, pulseT: 0, pulseCooldown: 0, invuln: 1.3,
      hurtT: 0, speed: 188, walkT: 0 };
    this.enemies = []; this.projectiles = []; this.drops = [];
    this.effects = []; this.numbers = [];
    this.notice = { text: '左侧拖动走位，靠近敌人自动出剑', t: 0, duration: 6 };
    this._pushOut(this.player);
    return this._ui();
  }

  get level() { return this.player.level; }

  setObstacles(obstacles = []) {
    this.obstacles = obstacles.filter(o => o && Number.isFinite(o.x) &&
      Number.isFinite(o.y) && Number.isFinite(o.r) && o.r > 0)
      .map(o => ({ x: o.x, y: o.y, r: o.r }));
    this._pushOut(this.player);
    for (const e of this.enemies) this._pushOut(e);
    for (const d of this.drops) this._pushOut(d);
  }

  _legal(x, y, r) {
    if (x < r + 8 || y < r + 8 || x > WORLD - r - 8 || y > WORLD - r - 8) return false;
    return !this.obstacles.some(o => (x - o.x) ** 2 + (y - o.y) ** 2 < (r + o.r) ** 2);
  }

  _pushOut(a) {
    const r = a.r || 5;
    for (let pass = 0; pass < 8; pass++) {
      a.x = clamp(a.x, r + 8, WORLD - r - 8);
      a.y = clamp(a.y, r + 8, WORLD - r - 8);
      let pushed = false;
      this.obstacles.forEach((o, i) => {
        const dx = a.x - o.x, dy = a.y - o.y, d = Math.hypot(dx, dy), min = r + o.r;
        if (d < min) {
          const angle = (i + 1) * 2.399963;
          a.x = o.x + (d > .0001 ? dx / d : Math.cos(angle)) * (min + .01);
          a.y = o.y + (d > .0001 ? dy / d : Math.sin(angle)) * (min + .01);
          pushed = true;
        }
      });
      if (!pushed) break;
    }
    a.x = clamp(a.x, r + 8, WORLD - r - 8);
    a.y = clamp(a.y, r + 8, WORLD - r - 8);
  }

  _move(a, dx, dy) {
    const r = a.r || 5;
    if (this._legal(a.x + dx, a.y + dy, r)) { a.x += dx; a.y += dy; return; }
    if (this._legal(a.x + dx, a.y, r)) a.x += dx;
    if (this._legal(a.x, a.y + dy, r)) a.y += dy;
  }

  _effect(type, x, y, r, duration, extra = {}) {
    const effect = { id: ++this._id, type, x, y, r, t: 0, duration, ...extra };
    this.effects.push(effect);
    if (this.effects.length > 110) this.effects.shift();
    return effect;
  }

  _number(x, y, text, color = '#fff0c9') {
    this.numbers.push({ id: ++this._id, x, y, text: String(text), color, t: 0, duration: .72 });
    if (this.numbers.length > 60) this.numbers.shift();
  }

  _nearest() {
    let target = null, distance = Infinity;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < distance) { target = e; distance = d; }
    }
    return { target, distance };
  }

  attack() {
    const p = this.player;
    if (this.phase !== 'play' || p.attackT >= 0 || p.attackCooldown > .00001) return false;
    const { target } = this._nearest();
    let dx = target ? target.x - p.x : p.dirX, dy = target ? target.y - p.y : p.dirY;
    const n = Math.hypot(dx, dy) || 1;
    dx /= n; dy /= n;
    if (Math.abs(dx) + Math.abs(dy) < .01) dy = -1;
    p.dirX = p.attackDirX = dx; p.dirY = p.attackDirY = dy;
    p.attackT = 0; p.attackPhase = 'windup'; p.attackCooldown = this.stats.interval;
    this._meleeHit = false;
    this._effect('slash', p.x, p.y, this.stats.range, ATTACK_END,
      { dirX: dx, dirY: dy, angle: Math.atan2(dy, dx), followPlayer: true });
    return true;
  }

  _hitMelee() {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
      if (d > this.stats.range + e.r) continue;
      if (d > e.r + p.r && (dx * p.attackDirX + dy * p.attackDirY) / d < Math.cos(.98)) continue;
      this._damageEnemy(e, this.stats.damage, p.attackDirX, p.attackDirY);
      if (this.phase !== 'play') break;
    }
  }

  pulse() {
    const p = this.player;
    if (this.phase !== 'play' || p.pulseCooldown > .00001) return false;
    p.pulseCooldown = this.stats.pulseInterval; p.pulseT = .55;
    this._effect('pulse', p.x, p.y, this.stats.pulseRadius, .55);
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
      if (d <= this.stats.pulseRadius + e.r) this._damageEnemy(e, this.stats.pulseDamage, dx / (d || 1), dy / (d || 1));
      if (this.phase !== 'play') break;
    }
    this.enemies = this.enemies.filter(e => !e.dead);
    return true;
  }

  _drop(type, x, y, amount) {
    const d = { id: ++this._id, type, x, y, r: type === 'chest' ? 13 : type === 'health' ? 9 : 6,
      amount, value: amount, t: 0, bob: this._random() * Math.PI * 2 };
    this._pushOut(d); this.drops.push(d);
    // XP is merged instead of silently discarded when the field is crowded.
    if (this.drops.length > 100) {
      const xp = this.drops.filter(q => q.type === 'xp');
      if (xp.length > 1) { xp[1].amount += xp[0].amount; xp[1].value = xp[1].amount;
        this.drops.splice(this.drops.indexOf(xp[0]), 1); }
    }
  }

  _damageEnemy(e, damage, dx = 0, dy = 0) {
    if (e.dead) return;
    e.hp = Math.max(0, e.hp - damage); e.hurtT = .16;
    this._number(e.x, e.y - 22, damage);
    this._effect('impact', e.x, e.y, e.r + 8, .2, { enemyType: e.type });
    if (e.type !== 'stag') this._move(e, dx * 15, dy * 15);
    if (e.hp > 0) return;
    e.dead = true; this.kills++;
    this._effect('death', e.x, e.y, e.r * 1.6, .45, { enemyType: e.type });
    if (e.type === 'stag') { this._finish('won'); return; }
    this._drop('xp', e.x, e.y, ENEMY[e.type].xp);
    const healthChance = this.player.hp < this.player.maxHp * .6 ? .23 : .08;
    if (this._random() < healthChance) this._drop('health', e.x + 13, e.y + 5, 18);
  }

  _damagePlayer(amount, fromX, fromY) {
    const p = this.player;
    if (this.phase !== 'play' || p.invuln > 0) return false;
    const damage = Math.max(1, amount - this.stats.armor);
    p.hp = Math.max(0, p.hp - damage); p.invuln = .85; p.hurtT = .25;
    this._number(p.x, p.y - 32, '-' + damage, '#ffb4a5');
    const dx = p.x - fromX, dy = p.y - fromY, d = Math.hypot(dx, dy) || 1;
    this._move(p, dx / d * 20, dy / d * 20);
    if (p.hp <= 0) this._finish('lost');
    return true;
  }

  _spawn(type) {
    if (this.enemies.filter(e => !e.dead).length >= 42) return false;
    const p = this.player, spec = ENEMY[type];
    let position = null;
    for (let attempt = 0; attempt < 50; attempt++) {
      const angle = this._random() * Math.PI * 2, distance = (type === 'stag' ? 450 : 330) + this._random() * 170;
      const x = clamp(p.x + Math.cos(angle) * distance, spec.r + 20, WORLD - spec.r - 20);
      const y = clamp(p.y + Math.sin(angle) * distance, spec.r + 20, WORLD - spec.r - 20);
      if (Math.hypot(x - p.x, y - p.y) >= 290 && this._legal(x, y, spec.r)) { position = { x, y }; break; }
    }
    if (!position && type === 'stag') {
      // A dense but traversable forest must not defer the guardian forever
      // merely because the random ring samples happened to land on roots.
      let best = Infinity;
      for (let y = 80; y < WORLD - 80; y += 80) for (let x = 80; x < WORLD - 80; x += 80) {
        const d = Math.hypot(x - p.x, y - p.y);
        if (d >= 290 && Math.abs(d - 450) < best && this._legal(x, y, spec.r)) {
          position = { x, y }; best = Math.abs(d - 450);
        }
      }
    }
    if (!position) return false;
    const e = { id: ++this._id, type, name: spec.name, ...position, r: spec.r,
      hp: spec.hp, maxHp: spec.hp, speed: spec.speed, dirX: 0, dirY: 1,
      moving: false, mode: 'chase', attackT: 0, attackCooldown: type === 'stag' ? 2 : 0,
      hurtT: 0, spawnT: .65, animT: this._random() * 5, dead: false };
    this.enemies.push(e);
    this._effect('spawn', e.x, e.y, e.r + 12, .5, { enemyType: type });
    return true;
  }

  _chase(e, dt) {
    const p = this.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    let vx = dx / d, vy = dy / d;
    for (const o of this.obstacles) {
      const ax = e.x - o.x, ay = e.y - o.y, ad = Math.hypot(ax, ay) || .01;
      const reach = o.r + e.r + 44;
      if (ad >= reach) continue;
      const w = (reach - ad) / 44, sign = e.id % 2 ? 1 : -1;
      vx += ax / ad * w * 1.7 - ay / ad * w * sign * .8;
      vy += ay / ad * w * 1.7 + ax / ad * w * sign * .8;
    }
    const length = Math.hypot(vx, vy) || 1;
    e.dirX = vx / length; e.dirY = vy / length;
    const beforeX = e.x, beforeY = e.y;
    this._move(e, e.dirX * e.speed * dt, e.dirY * e.speed * dt);
    e.moving = Math.hypot(e.x - beforeX, e.y - beforeY) > .001;
  }

  _updateEnemy(e, dt) {
    e.animT += dt; e.hurtT = Math.max(0, e.hurtT - dt); e.spawnT = Math.max(0, e.spawnT - dt);
    e.attackCooldown = Math.max(0, e.attackCooldown - dt);
    if (e.type !== 'stag') {
      this._chase(e, dt);
      if (e.spawnT <= 0 && Math.hypot(e.x - this.player.x, e.y - this.player.y) < e.r + this.player.r + 3)
        this._damagePlayer(ENEMY[e.type].damage, e.x, e.y);
      return;
    }
    // The guardian never inflicts passive body-contact damage. Its only damage
    // follows this fixed visible circle; position stays still during the tell.
    if (e.mode === 'windup') {
      e.moving = false; e.attackT += dt;
      if (e.attackT >= .9) {
        this._effect('impact', e.x, e.y, 155, .48, { boss: true });
        if (Math.hypot(this.player.x - e.x, this.player.y - e.y) <= 155 + this.player.r)
          this._damagePlayer(ENEMY.stag.damage, e.x, e.y);
        e.mode = 'recover'; e.attackT = 0; e.attackCooldown = 2.5;
      }
    } else if (e.mode === 'recover') {
      e.moving = false; e.attackT += dt;
      if (e.attackT >= .72) { e.mode = 'chase'; e.attackT = 0; }
    } else if (e.attackCooldown <= 0 && Math.hypot(e.x - this.player.x, e.y - this.player.y) < 205) {
      e.mode = 'windup'; e.attackT = 0; e.moving = false;
      this._effect('warning', e.x, e.y, 155, .9, { boss: true, enemyId: e.id });
    } else this._chase(e, dt);
  }

  _separateEnemies() {
    for (let i = 0; i < this.enemies.length; i++) for (let j = i + 1; j < this.enemies.length; j++) {
      const a = this.enemies[i], b = this.enemies[j];
      if (a.dead || b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.r + b.r) * .83;
      if (d >= min || d < .001) continue;
      const amount = Math.min(1.1, (min - d) * .12), ux = dx / d * amount, uy = dy / d * amount;
      // Preserve the guardian's telegraphed center instead of moving its circle.
      if (a.type !== 'stag') this._move(a, -ux, -uy);
      if (b.type !== 'stag') this._move(b, ux, uy);
    }
  }

  _choices() {
    const options = [
      { id: 'power', title: '锋芒', description: '近战与灵息伤害各加1', kind: 'damage' },
      { id: 'quick', title: '疾刃', description: '出剑间隔缩短15%', kind: 'attack_speed' },
      { id: 'guard', title: '护身', description: '受到伤害减少1，恢复16生命', kind: 'armor' },
      { id: 'renew', title: '生息', description: '恢复32生命，并持续缓慢恢复', kind: 'recovery' },
      { id: 'vitality', title: '壮心', description: '生命上限加18，恢复30生命', kind: 'health' },
      { id: 'flow', title: '轻步', description: '移速加10%，拾取范围加28', kind: 'movement' }
    ].filter(o => !(o.id === 'quick' && this.stats.interval <= .63) &&
      !(o.id === 'guard' && this.stats.armor >= 5) && !(o.id === 'renew' && this.stats.regen >= 1.8));
    for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(this._random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
    return options.slice(0, 3);
  }

  _openUpgrade(source) {
    this.phase = 'upgrade'; this.upgradeSource = source;
    this.upgradeTitle = source === 'chest' ? '林间宝箱' : '林间赐福';
    this.levelChoices = this._choices(); this.player.moving = false;
  }

  _checkLevel() {
    const p = this.player;
    if (this.phase !== 'play' || p.xp < p.nextXp) return;
    p.xp -= p.nextXp; p.level++;
    p.nextXp = Math.ceil(p.nextXp * 1.35 + 3);
    this._effect('level', p.x, p.y, 70, .75);
    this._openUpgrade('level');
  }

  choose(id) {
    if (this.phase !== 'upgrade' || !this.levelChoices.some(c => c.id === id)) return false;
    const p = this.player, s = this.stats;
    if (id === 'power') { s.damage++; s.pulseDamage++; }
    if (id === 'quick') s.interval = Math.max(.62, s.interval * .85);
    if (id === 'guard') { s.armor = Math.min(5, s.armor + 1); this._heal(16); }
    if (id === 'renew') { s.regen = Math.min(1.8, s.regen + .55); this._heal(32); }
    if (id === 'vitality') { p.maxHp += 18; this._heal(30); }
    if (id === 'flow') { p.speed = Math.min(270, p.speed * 1.1); s.magnet += 28; }
    this.levelChoices = []; this.upgradeTitle = ''; this.upgradeSource = null;
    this.phase = 'play'; p.invuln = Math.max(p.invuln, .7);
    this._checkLevel();
    return true;
  }

  _heal(amount) {
    const p = this.player, gain = Math.min(amount, p.maxHp - p.hp);
    p.hp += gain;
    if (gain > 0) { this._number(p.x, p.y - 28, '+' + Math.round(gain), '#a9ecc3'); this._effect('heal', p.x, p.y, 35, .45); }
  }

  _updateDrops(dt) {
    const p = this.player;
    for (const d of this.drops) {
      d.t += dt;
      const dx = p.x - d.x, dy = p.y - d.y, distance = Math.hypot(dx, dy);
      if (d.type !== 'chest' && distance < this.stats.magnet && distance > 1) {
        const amount = Math.min(distance, (d.type === 'xp' ? 360 : 260) * dt);
        this._move(d, dx / distance * amount, dy / distance * amount);
      }
      if (Math.hypot(p.x - d.x, p.y - d.y) > p.r + d.r + 8) continue;
      d.collected = true;
      if (d.type === 'xp') { p.xp += d.amount; this._checkLevel(); }
      else if (d.type === 'health') this._heal(d.amount);
      else { this.chestOpened = true; this._effect('chest', d.x, d.y, 50, .7); this._openUpgrade('chest'); }
      if (this.phase !== 'play') break;
    }
    this.drops = this.drops.filter(d => !d.collected);
  }

  _finish(phase) {
    this.phase = phase; this.player.moving = false;
    this.levelChoices = []; this.upgradeTitle = ''; this.upgradeSource = null;
    this.result = { time: this.time, kills: this.kills, level: this.player.level, chestOpened: this.chestOpened };
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  _tick(dt, input) {
    this.time += dt;
    const p = this.player;
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter(e => e.t < e.duration);
    for (const n of this.numbers) n.t += dt;
    this.numbers = this.numbers.filter(n => n.t < n.duration);
    if (this.notice) { this.notice.t += dt; if (this.notice.t >= this.notice.duration) this.notice = null; }
    p.invuln = Math.max(0, p.invuln - dt); p.hurtT = Math.max(0, p.hurtT - dt);
    p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    p.pulseCooldown = Math.max(0, p.pulseCooldown - dt); p.pulseT = Math.max(0, p.pulseT - dt);
    if (this.stats.regen) p.hp = Math.min(p.maxHp, p.hp + this.stats.regen * dt);
    const oldX = p.x, oldY = p.y, speed = p.speed * (p.attackT >= 0 ? .83 : 1);
    this._move(p, input.x * speed * dt, input.y * speed * dt);
    for (const e of this.effects) if (e.followPlayer) { e.x = p.x; e.y = p.y; }
    p.moving = Math.hypot(p.x - oldX, p.y - oldY) > .001;
    if (p.moving) { p.walkT += dt; if (p.attackT < 0) { p.dirX = input.x; p.dirY = input.y; } }
    if (p.attackT >= 0) {
      p.attackT += dt;
      p.attackPhase = p.attackT < .15 ? 'windup' : p.attackT < .34 ? 'sweep' : 'recover';
      if (!this._meleeHit && p.attackT >= ATTACK_HIT) { this._meleeHit = true; this._hitMelee(); }
      if (p.attackT >= ATTACK_END) { p.attackT = -1; p.attackPhase = 'idle'; }
      if (this.phase !== 'play') return;
    }
    if (!this.bossSpawned && this.time >= 54) {
      if (this._spawn('stag')) { this.bossSpawned = true; this.notice = { text: '古木灵鹿现身 · 躲开红圈后反击', t: 0, duration: 5 }; }
    }
    if (!this.bossSpawned) {
      this._spawnIn -= dt;
      if (this._spawnIn <= 0) {
        this._spawnIn = this.time < 12 ? 2.1 : this.time < 30 ? 1.45 : 1.05;
        if (this.enemies.length < 32) {
          const r = this._random(); this._spawn(r < .52 ? 'seed' : r < .80 ? 'moth' : 'shroom');
          if (this.time > 26 && this._random() < .30) this._spawn(this._random() < .5 ? 'seed' : 'moth');
        }
      }
    }
    if (!this.chestSpawned && this.time >= 28 && this.kills >= 8) {
      this.chestSpawned = true;
      this._drop('chest', p.x + 72, p.y - 45, 1);
      this.notice = { text: '发现林间宝箱', t: 0, duration: 3 };
    }
    for (const e of this.enemies) { if (!e.dead) this._updateEnemy(e, dt); if (this.phase !== 'play') break; }
    this.enemies = this.enemies.filter(e => !e.dead);
    if (this.phase !== 'play') return;
    this._separateEnemies(); this._updateDrops(dt);
    if (this.phase !== 'play') return;
    const near = this._nearest();
    if (near.target && near.distance <= this.stats.range + near.target.r + 8) this.attack();
  }

  step(dt, input = {}) {
    if (this.phase !== 'play') return this._ui();
    let x = finite(input.x), y = finite(input.y), length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    let remaining = clamp(finite(dt), 0, .15);
    while (remaining > .000001 && this.phase === 'play') {
      const h = Math.min(remaining, 1 / 60); this._tick(h, { x, y }); remaining -= h;
    }
    return this._ui();
  }

  _ui() {
    const boss = this.enemies.find(e => e.type === 'stag' && !e.dead);
    return { phase: this.phase, time: this.time, kills: this.kills, level: this.player.level,
      player: { ...this.player }, bossSpawned: this.bossSpawned,
      boss: boss ? { hp: boss.hp, maxHp: boss.maxHp, name: boss.name, mode: boss.mode } : null,
      levelChoices: this.levelChoices.map(c => ({ ...c })), upgradeTitle: this.upgradeTitle,
      upgradeSource: this.upgradeSource, chestOpened: this.chestOpened,
      cooldowns: { attack: this.player.attackCooldown, pulse: this.player.pulseCooldown, pulseMax: this.stats.pulseInterval },
      notice: this.notice ? { ...this.notice } : null, result: this.result ? { ...this.result } : null };
  }

  snapshot() {
    // JSON round-trip prevents a QA consumer from mutating live state.
    return JSON.parse(JSON.stringify({ ...this._ui(), seed: this.seed, rngState: this._rng,
      world: { width: WORLD, height: WORLD }, stats: this.stats, chestSpawned: this.chestSpawned,
      enemies: this.enemies, projectiles: this.projectiles, drops: this.drops,
      effects: this.effects, numbers: this.numbers, obstacles: this.obstacles }));
  }
}
