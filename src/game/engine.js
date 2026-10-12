import { W, H, rand, pick, clamp, dist2, angleTo, segDist2, weighted, setLogicalWidth } from './util.js';
import { Input } from './input.js';
import { Starfield } from './starfield.js';
import { LEVELS } from './levels.js';
import { createEnemy, drawEnemy, spawnFormation } from './enemies.js';
import { createBoss, updateBoss, drawBoss } from './bosses.js';
import { drawSprite, preloadSprites, EMERALD } from './sprites.js';
import { drawHud } from './hud.js';
import { Sfx } from './audio.js';

const PLAYER_SPEED = 360;
const SHIELD_RADIUS = 40;
const MAX_BULLETS = 600;

/**
 * Lantern's Oath game engine.
 * Events emitted through onEvent: { type: 'levelClear' | 'victory' | 'gameOver', level, score, stats }
 */
export class Game {
  constructor(canvas, onEvent = () => {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onEvent = onEvent;
    this.input = new Input(canvas);
    this.stars = new Starfield();
    this.state = 'idle'; // idle | playing | ended
    this.paused = false;
    this.autoFire = false;
    this.time = 0;
    this.last = 0;
    preloadSprites();
    this.resize();
    addEventListener('resize', () => this.resize());
    this.reset(0, {});
    requestAnimationFrame((t) => this.frame(t));
  }

  // Fill the window: pick a logical width matching the window's shape, then
  // size the canvas to fit (letterboxed only on very tall or very wide screens).
  resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setLogicalWidth((H * vw) / vh);
    const scale = Math.min(vw / W, vh / H);
    const cssW = Math.round(W * scale);
    const cssH = Math.round(H * scale);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.scale = this.canvas.width / W;
    this.stars.resize(W, H);
    if (this.player) this.player.x = clamp(this.player.x, 26, W - 26);
  }

  // ---------------------------------------------------------------- lifecycle
  reset(levelIndex, carry) {
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    this.player = {
      x: W / 2, y: H - 150, hp: 100, maxHp: 100, energy: 100, oath: 0,
      power: clamp(carry.power || 1, 1, 3), fireCd: 0, inv: 0, shield: false,
      regenDelay: 0, alive: true, tilt: 0, volley: 0,
    };
    this.score = carry.score || 0;
    this.displayScore = this.score;
    this.enemies = [];
    this.shots = [];
    this.bullets = [];
    this.particles = [];
    this.pickups = [];
    this.texts = [];
    this.hazards = [];
    this.timers = [];
    this.elapsed = 0;
    this.progress = 0;
    this.diff = 1;
    this.spawnTimer = 2.2;
    this.boss = null;
    this.bossState = 'none'; // none | warning | fight | dead
    this.preBossT = 0;
    this.banner = null;
    this.ending = null;
    this.endTimer = 0;
    this.shake = 0;
    this.flash = 0;
    this.flashColor = '#ff2040';
    this.slowmo = 0;
    this.stats = { kills: 0, hitsTaken: 0, time: 0 };
    this.stars.setTheme(this.level.theme);
  }

  start(levelIndex, carry = {}) {
    this.reset(levelIndex, carry);
    this.state = 'playing';
    this.paused = false;
    this.showBanner(`Level ${this.level.id}`, this.level.name, 2.8);
    Sfx.unlock();
  }

  setPaused(p) {
    if (this.state !== 'playing') return;
    this.paused = p;
    this.input.keys.clear();
    this.input.pointer.active = false;
  }

  showBanner(text, sub, dur, warning = false) {
    this.banner = { text, sub, t: dur, max: dur, warning };
  }

  // ---------------------------------------------------------------- helpers used by enemies/bosses
  shoot(x, y, angle, speed, opts = {}) {
    if (this.bullets.length > MAX_BULLETS) return;
    this.bullets.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: opts.r || 7,
      dmg: opts.dmg || 9,
      color: opts.color || this.level.theme.bullet,
    });
  }

  aimed(x, y, speed, count, spread, opts) {
    const base = angleTo(x, y, this.player.x, this.player.y);
    if (count === 1) return this.shoot(x, y, base, speed, opts);
    for (let i = 0; i < count; i++) {
      this.shoot(x, y, base - spread / 2 + (spread * i) / (count - 1), speed, opts);
    }
  }

  ring(x, y, count, speed, offset = 0, opts) {
    for (let i = 0; i < count; i++) this.shoot(x, y, offset + (Math.PI * 2 * i) / count, speed, opts);
  }

  beam(owner, ox, oy, angle, { warm = 1, active = 0.7, width = 26, spin = 0 } = {}) {
    this.hazards.push({ owner, ox, oy, angle, warm, active, width, spin, t: 0 });
  }

  schedule(delay, fn) {
    this.timers.push({ t: delay, fn });
  }

  spawnEnemy(type, x, y, opts = {}, scaled = false) {
    const hpScale = scaled ? 1 + this.progress * 0.6 : 1;
    const e = createEnemy(type, x, y, opts, hpScale);
    this.enemies.push(e);
    return e;
  }

  particle(x, y, vx, vy, life, size, color, kind = 'spark') {
    if (this.particles.length > 900) return;
    this.particles.push({ x, y, vx, vy, life, max: life, size, color, kind });
  }

  explode(x, y, color, n = 18, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(60, 320) * power;
      this.particle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.3, 0.8), rand(2, 4.5) * power, pick([color, '#fff', color]));
    }
    this.particle(x, y, 0, 0, 0.45, 18 * power, color, 'ring');
  }

  poof(x, y, color) {
    for (let i = 0; i < 24; i++) {
      const a = rand(0, Math.PI * 2);
      this.particle(x, y, Math.cos(a) * 150, Math.sin(a) * 150, 0.5, 3, color);
    }
  }

  floatText(x, y, text, color = '#fff') {
    this.texts.push({ x, y, text, color, t: 0.9 });
  }

  bossRage(b, text) {
    this.shake = 14;
    this.flash = 0.35;
    this.flashColor = '#ffffff';
    this.showBanner(text, '', 1.6);
    this.explode(b.x, b.y, this.level.theme.accent, 40, 1.4);
    Sfx.play('bigExplode');
  }

  // ---------------------------------------------------------------- main loop
  frame(ts) {
    const raw = Math.min(0.033, (ts - (this.last || ts)) / 1000);
    this.last = ts;
    if (this.state === 'playing' && !this.paused) {
      const dt = this.slowmo > 0 ? raw * 0.35 : raw;
      if (this.slowmo > 0) this.slowmo -= raw;
      this.update(dt, raw);
    } else if (this.state !== 'playing') {
      this.time += raw;
      this.stars.update(raw, 50);
    }
    this.render();
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  update(dt, raw) {
    this.time += dt;
    this.elapsed += dt;
    this.stats.time += raw;
    const scroll = this.bossState === 'none' ? 170 : 70;
    this.stars.update(dt, scroll);
    this.displayScore += (this.score - this.displayScore) * Math.min(1, dt * 8);
    if (this.banner) this.banner.t -= raw;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - raw * 30);
    if (this.flash > 0) this.flash -= raw * 1.5;

    this.updateDirector(dt);

    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      tm.t -= dt;
      if (tm.t <= 0) {
        this.timers.splice(i, 1);
        tm.fn();
      }
    }

    this.updatePlayer(dt);
    this.updateShots(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateHazards(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);

    if (this.ending) {
      this.endTimer -= raw;
      if (this.endTimer <= 0) this.finish();
    }
  }

  updateDirector(dt) {
    const L = this.level;
    if (this.bossState === 'none') {
      this.progress = Math.min(1, this.elapsed / L.length);
      this.diff = 1 + this.progress * 0.8;
      if (this.progress < 1) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          const phase = L.phases.filter((p) => p.at <= this.progress).pop();
          this.spawnTimer = phase.every * rand(0.85, 1.15);
          spawnFormation(this, weighted(phase.pool));
        }
      } else {
        this.preBossT += dt;
        if (this.enemies.length === 0 || this.preBossT > 6) {
          this.bossState = 'warning';
          this.warnT = 3;
          const def = createBoss(L.boss);
          this.showBanner('WARNING', `${def.name} APPROACHES`, 3, true);
          Sfx.play('warning');
        }
      }
    } else if (this.bossState === 'warning') {
      this.warnT -= dt;
      if (this.warnT <= 0) {
        this.boss = createBoss(L.boss);
        this.enemies.push(this.boss);
        this.bossState = 'fight';
      }
    }
  }

  updatePlayer(dt) {
    const p = this.player;
    const inp = this.input;
    if (!p.alive) return;
    if (inp.hit('KeyF')) this.autoFire = !this.autoFire;

    let mx = 0;
    let my = 0;
    if (inp.down('ArrowLeft', 'KeyA')) mx -= 1;
    if (inp.down('ArrowRight', 'KeyD')) mx += 1;
    if (inp.down('ArrowUp', 'KeyW')) my -= 1;
    if (inp.down('ArrowDown', 'KeyS')) my += 1;
    if (mx && my) {
      mx *= Math.SQRT1_2;
      my *= Math.SQRT1_2;
    }
    p.x += mx * PLAYER_SPEED * dt;
    p.y += my * PLAYER_SPEED * dt;

    const ptr = inp.pointer;
    if (ptr.active) {
      // follow the finger, offset upward so the hero isn't hidden under it
      const tx = ptr.x;
      const ty = ptr.y - 70;
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = Math.min(d, 560 * dt);
      if (d > 0.5) {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
        mx = clamp(dx / 60, -1, 1);
      }
    }
    p.x = clamp(p.x, 26, W - 26);
    p.y = clamp(p.y, 60, H - 40);
    p.tilt += (mx * 0.18 - p.tilt) * Math.min(1, dt * 10);

    // Shield construct
    const wantShield = inp.down('ShiftLeft', 'ShiftRight', 'KeyK') || inp.virtual.shield;
    if (wantShield && (p.shield ? p.energy > 0 : p.energy >= 15)) {
      if (!p.shield) Sfx.play('shield');
      p.shield = true;
      p.energy = Math.max(0, p.energy - 32 * dt);
      p.regenDelay = 0.6;
    } else {
      p.shield = false;
    }
    if (!p.shield) {
      p.regenDelay -= dt;
      if (p.regenDelay <= 0) p.energy = Math.min(100, p.energy + 16 * dt);
    }

    // Oath Burst
    if ((inp.hit('KeyE', 'KeyL') || inp.virtual.burst) && p.oath >= 100) this.oathBurst();

    // Ring blasts
    p.fireCd -= dt;
    const firing = inp.down('Space', 'KeyJ') || this.autoFire || ptr.active;
    if (firing && p.fireCd <= 0) {
      p.fireCd = 0.12;
      this.firePlayer();
    }
    if (p.inv > 0) p.inv -= dt;

    // engine trail
    if (Math.random() < dt * 40) {
      this.particle(p.x + rand(-6, 6), p.y + 30, rand(-15, 15), rand(80, 160), 0.4, rand(1.5, 3), EMERALD);
    }
  }

  firePlayer() {
    const p = this.player;
    p.volley++;
    const y = p.y - 40;
    const add = (dx, ang, dmg, w = 4, len = 18) =>
      this.shots.push({ x: p.x + dx, y, vx: Math.sin(ang) * 950, vy: -Math.cos(ang) * 950, dmg, w, len });
    add(-7, 0, 1);
    add(7, 0, 1);
    if (p.power >= 2) {
      add(-12, -0.14, 0.7);
      add(12, 0.14, 0.7);
    }
    if (p.power >= 3 && p.volley % 2 === 0) add(0, 0, 2.2, 8, 30);
    Sfx.play('shoot');
  }

  oathBurst() {
    const p = this.player;
    p.oath = 0;
    p.inv = Math.max(p.inv, 1.2);
    this.shake = 16;
    this.flash = 0.45;
    this.flashColor = EMERALD;
    for (const b of this.bullets) {
      this.particle(b.x, b.y, 0, 0, 0.4, 3, EMERALD);
      this.score += 5;
    }
    this.bullets.length = 0;
    this.hazards.length = 0;
    this.particle(p.x, p.y, 0, 0, 0.8, 60, EMERALD, 'ring');
    this.particle(p.x, p.y, 0, 0, 1.0, 110, '#c9ffd9', 'ring');
    for (const e of this.enemies) {
      if (e.intangible && !e.boss) continue;
      this.damageEnemy(e, e.boss ? 45 : 25);
    }
    this.showBanner('OATH BURST', '', 0.9);
    Sfx.play('burst');
  }

  updateShots(dt) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y < -40 || s.x < -20 || s.x > W + 20) {
        this.shots.splice(i, 1);
        continue;
      }
      for (const e of this.enemies) {
        if (e.dead || e.intangible) continue;
        const rr = e.r + s.w;
        if (dist2(s.x, s.y, e.x, e.y) < rr * rr) {
          this.damageEnemy(e, s.dmg);
          this.particle(s.x, s.y, rand(-60, 60), rand(20, 120), 0.2, 2, EMERALD);
          this.shots.splice(i, 1);
          break;
        }
      }
    }
  }

  damageEnemy(e, dmg) {
    if (e.dead) return;
    e.hp -= dmg;
    e.hitT = 0.08;
    if (e.boss) {
      this.player.oath = Math.min(100, this.player.oath + dmg * 0.12);
      this.score += Math.round(dmg * 5);
    }
    if (e.hp <= 0) {
      if (e.boss) this.bossDefeated(e);
      else this.killEnemy(e, true);
    } else if (Math.random() < 0.3) {
      Sfx.play('enemyHit');
    }
  }

  killEnemy(e, byPlayer) {
    if (e.dead) return;
    e.dead = true;
    const color = this.level.theme.accent;
    this.explode(e.x, e.y, color, e.elite ? 30 : 16, e.elite ? 1.3 : 1);
    Sfx.play('explode');
    e.def.onDeath?.(e, this);
    if (!byPlayer) return;
    this.stats.kills++;
    this.score += e.score;
    this.floatText(e.x, e.y - 10, `+${e.score}`);
    this.player.oath = Math.min(100, this.player.oath + (e.elite ? 10 : 4));
    this.maybeDrop(e);
  }

  maybeDrop(e) {
    const m = e.elite ? 3.5 : 1;
    const p = this.player;
    const roll = Math.random();
    let type = null;
    if (roll < 0.05 * m) type = 'heal';
    else if (roll < 0.05 * m + (p.power < 3 ? 0.035 * m : 0)) type = 'power';
    else if (roll < 0.05 * m + 0.035 * m + 0.04 * m) type = 'energy';
    if (type) this.pickups.push({ type, x: e.x, y: e.y, vy: 70, t: 0 });
  }

  bossDefeated(b) {
    b.dead = true;
    this.bossState = 'dead';
    this.score += b.score;
    this.floatText(b.x, b.y, `+${b.score}`, '#fff4b0');
    this.bullets.length = 0;
    this.hazards.length = 0;
    this.slowmo = 1.4;
    this.shake = 22;
    this.flash = 0.6;
    this.flashColor = '#ffffff';
    Sfx.play('bigExplode');
    for (let i = 0; i < 7; i++) {
      this.schedule(i * 0.18, () => {
        this.explode(b.x + rand(-90, 90), b.y + rand(-60, 60), pick([this.level.theme.accent, '#fff', EMERALD]), 40, 1.6);
        Sfx.play('explode');
      });
    }
    for (const e of this.enemies) if (!e.boss && !e.dead) this.killEnemy(e, true);
    const last = this.levelIndex === LEVELS.length - 1;
    this.ending = last ? 'victory' : 'levelClear';
    this.endTimer = 3.2;
    this.showBanner(`${b.name} FALLS`, last ? 'The Hollow is purged.' : 'Trial complete', 3);
    this.schedule(0.8, () => Sfx.play('clear'));
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.boss) updateBoss(e, this, dt);
      else {
        e.t += dt;
        if (e.hitT > 0) e.hitT -= dt;
        e.def.update(e, this, dt);
      }
      if (e.dead) continue;
      if (!e.noCull && e.t > 1.5 && (e.y > H + 80 || e.y < -220 || e.x < -140 || e.x > W + 140)) {
        e.dead = true;
        continue;
      }
      // contact with the Warden
      if (p.alive && !e.intangible) {
        const rr = e.r + (p.shield ? SHIELD_RADIUS : 14);
        if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
          if (p.shield) {
            if (!e.boss) this.damageEnemy(e, 40 * dt + 0.5);
            const a = angleTo(e.x, e.y, p.x, p.y);
            p.x = clamp(p.x + Math.cos(a) * 6, 26, W - 26);
            p.y = clamp(p.y + Math.sin(a) * 6, 60, H - 40);
            p.energy = Math.max(0, p.energy - 20 * dt);
          } else {
            this.hurtPlayer(e.boss ? 25 : 20);
            if (!e.boss) this.damageEnemy(e, 4);
          }
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  updateBullets(dt) {
    const p = this.player;
    const bs = this.bullets;
    for (let i = bs.length - 1; i >= 0; i--) {
      const b = bs[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
        bs.splice(i, 1);
        continue;
      }
      if (!p.alive) continue;
      if (p.shield) {
        const rr = SHIELD_RADIUS + b.r;
        if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
          this.particle(b.x, b.y, rand(-60, 60), rand(-60, 60), 0.3, 2.5, EMERALD);
          p.energy = Math.max(0, p.energy - 2);
          bs.splice(i, 1);
          continue;
        }
      }
      const rr = 9 + b.r * 0.7;
      if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
        bs.splice(i, 1);
        this.hurtPlayer(b.dmg);
      }
    }
  }

  updateHazards(dt) {
    const p = this.player;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.t += dt;
      if (h.owner?.dead) {
        this.hazards.splice(i, 1);
        continue;
      }
      h.x = h.owner.x + h.ox;
      h.y = h.owner.y + h.oy;
      if (h.t > h.warm) {
        h.angle += h.spin * dt;
        if (p.alive) {
          const ex = h.x + Math.cos(h.angle) * 1500;
          const ey = h.y + Math.sin(h.angle) * 1500;
          const reach = h.width / 2 + (p.shield ? SHIELD_RADIUS : 8);
          if (segDist2(p.x, p.y, h.x, h.y, ex, ey) < reach * reach) {
            if (p.shield) p.energy = Math.max(0, p.energy - 60 * dt);
            else this.hurtPlayer(22);
          }
        }
      }
      if (h.t > h.warm + h.active) this.hazards.splice(i, 1);
    }
  }

  updatePickups(dt) {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i];
      k.t += dt;
      const d2 = dist2(k.x, k.y, p.x, p.y);
      if (p.alive && d2 < 120 * 120) {
        const a = angleTo(k.x, k.y, p.x, p.y);
        k.x += Math.cos(a) * 420 * dt;
        k.y += Math.sin(a) * 420 * dt;
      } else {
        k.y += k.vy * dt;
      }
      if (p.alive && d2 < 30 * 30) {
        this.collect(k);
        this.pickups.splice(i, 1);
      } else if (k.y > H + 30) {
        this.pickups.splice(i, 1);
      }
    }
  }

  collect(k) {
    const p = this.player;
    Sfx.play('pickup');
    if (k.type === 'heal') {
      p.hp = Math.min(p.maxHp, p.hp + 25);
      this.floatText(p.x, p.y - 50, '+25 VITALITY', EMERALD);
    } else if (k.type === 'power') {
      if (p.power < 3) {
        p.power++;
        this.floatText(p.x, p.y - 50, 'POWER UP!', '#ffd75a');
      } else {
        this.score += 500;
        this.floatText(p.x, p.y - 50, '+500', '#ffd75a');
      }
    } else {
      p.energy = 100;
      p.oath = Math.min(100, p.oath + 15);
      this.floatText(p.x, p.y - 50, 'RING CHARGED', '#7ee6ff');
    }
  }

  hurtPlayer(dmg) {
    const p = this.player;
    if (!p.alive || p.inv > 0 || this.ending === 'levelClear' || this.ending === 'victory') return;
    p.hp -= dmg;
    p.inv = 1.0;
    this.stats.hitsTaken++;
    this.shake = 10;
    this.flash = 0.35;
    this.flashColor = '#ff2040';
    Sfx.play('hit');
    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
      p.shield = false;
      this.explode(p.x, p.y, EMERALD, 60, 1.8);
      Sfx.play('bigExplode');
      this.ending = 'gameOver';
      this.endTimer = 2.2;
      this.slowmo = 1.2;
    }
  }

  updateParticles(dt) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const q = ps[i];
      q.life -= dt;
      if (q.life <= 0) {
        ps.splice(i, 1);
        continue;
      }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.96;
      q.vy *= 0.96;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t -= dt;
      t.y -= 40 * dt;
      if (t.t <= 0) this.texts.splice(i, 1);
    }
  }

  finish() {
    const type = this.ending;
    this.ending = null;
    this.state = 'ended';
    this.onEvent({
      type,
      level: this.level.id,
      levelIndex: this.levelIndex,
      score: this.score,
      power: this.player.power,
      stats: { ...this.stats, hp: Math.round(this.player.hp) },
    });
  }

  // ---------------------------------------------------------------- rendering
  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    if (this.shake > 0) ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
    this.stars.draw(ctx, this.time);
    if (this.state === 'idle') return;

    // beams (telegraph + active)
    for (const h of this.hazards) {
      if (h.x === undefined) continue;
      const ex = h.x + Math.cos(h.angle) * 1500;
      const ey = h.y + Math.sin(h.angle) * 1500;
      if (h.t <= h.warm) {
        ctx.strokeStyle = this.level.theme.accent;
        ctx.globalAlpha = 0.25 + 0.35 * (Math.floor(h.t * 16) % 2);
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.strokeStyle = this.level.theme.accent;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = h.width * 1.8;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = h.width * 0.45;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    for (const k of this.pickups) drawSprite(ctx, k.type, k.x, k.y + Math.sin(k.t * 5) * 3);

    for (const e of this.enemies) {
      if (e.boss) drawBoss(ctx, e);
      else drawEnemy(ctx, e, this);
    }

    // Player ring blasts
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.shots) {
      ctx.fillStyle = 'rgba(61,255,143,0.35)';
      ctx.fillRect(s.x - s.w, s.y - s.len / 2 - 2, s.w * 2, s.len + 4);
      ctx.fillStyle = '#d9ffe6';
      ctx.fillRect(s.x - s.w / 3, s.y - s.len / 2, (s.w * 2) / 3, s.len);
    }
    ctx.globalCompositeOperation = 'source-over';

    this.drawPlayer(ctx);

    // Enemy bullets
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.bullets) {
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Particles
    for (const q of this.particles) {
      const a = q.life / q.max;
      ctx.globalAlpha = a;
      if (q.kind === 'ring') {
        ctx.strokeStyle = q.color;
        ctx.lineWidth = 3 * a + 1;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * (1 + (1 - a) * 3), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = q.color;
        ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    ctx.font = '600 14px "Chakra Petch", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.t * 2);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    drawHud(ctx, this);
  }

  drawPlayer(ctx) {
    const p = this.player;
    if (!p.alive) return;
    if (p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0) ctx.globalAlpha = 0.45;
    drawSprite(ctx, 'player', p.x, p.y, p.tilt);
    ctx.globalAlpha = 1;
    if (p.shield) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 12);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(p.x, p.y, SHIELD_RADIUS * 0.6, p.x, p.y, SHIELD_RADIUS);
      g.addColorStop(0, 'rgba(61,255,143,0)');
      g.addColorStop(1, `rgba(61,255,143,${0.25 + pulse * 0.15})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, SHIELD_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,255,210,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + this.time;
        const x = p.x + Math.cos(a) * SHIELD_RADIUS;
        const y = p.y + Math.sin(a) * SHIELD_RADIUS;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
