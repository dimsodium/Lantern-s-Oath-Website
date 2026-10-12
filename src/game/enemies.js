import { W, H, rand, randInt, pick, angleTo, dist2 } from './util.js';
import { drawSprite } from './sprites.js';

// Enemy definitions. Each enemy is a plain object; `def` holds its behaviour.
// update(e, g, dt) moves/fires; g is the Game (see engine.js helpers: aimed, ring, shoot...).
export const DEFS = {
  // ---------------- Level 1 ----------------
  drone: {
    hp: 3, r: 17, score: 100, sprite: 'drone',
    formations: ['line', 'column', 'v'],
    init(e) {
      e.vy = rand(120, 150);
      e.cd = rand(1, 2.6);
      e.ph = rand(0, 6);
    },
    update(e, g, dt) {
      e.y += e.vy * dt;
      e.x += Math.sin(e.t * 2 + e.ph) * 30 * dt;
      e.cd -= dt;
      if (e.cd <= 0) {
        e.cd = rand(2.2, 3.4) / g.diff;
        if (e.y > 20 && e.y < g.player.y - 140) g.aimed(e.x, e.y + 12, 220, 1, 0);
      }
    },
  },

  skimmer: {
    hp: 2, r: 15, score: 120, sprite: 'skimmer',
    formations: ['column', 'single', 'snake'],
    init(e) {
      e.vy = rand(210, 250);
      e.x0 = e.x;
      e.amp = e.amp ?? rand(60, 140);
      e.freq = rand(2, 3);
      e.ph = e.ph ?? 0;
    },
    update(e, g, dt) {
      e.y += e.vy * dt;
      e.x = e.x0 + Math.sin(e.t * e.freq + e.ph) * e.amp;
      e.rot = -Math.cos(e.t * e.freq + e.ph) * 0.45;
      if (g.diff > 1.35 && !e.shot && e.y > 180) {
        e.shot = true;
        g.aimed(e.x, e.y, 250, 1, 0);
      }
    },
  },

  gunship: {
    hp: 11, r: 27, score: 300, sprite: 'gunship', elite: true,
    formations: ['single', 'pair'],
    init(e) {
      e.ty = rand(130, 290);
      e.stay = rand(3.5, 5);
      e.cd = 0.9;
    },
    update(e, g, dt) {
      if (e.mode !== 'leave') {
        e.y += (e.ty - e.y) * Math.min(1, dt * 2);
        e.stay -= dt;
        e.cd -= dt;
        if (e.cd <= 0 && e.y > e.ty - 30) {
          e.cd = 1.6 / g.diff;
          g.aimed(e.x, e.y + 26, 250, 3, 0.32);
        }
        if (e.stay <= 0) e.mode = 'leave';
      } else {
        e.y -= 170 * dt;
      }
    },
  },

  // ---------------- Level 2 ----------------
  wisp: {
    hp: 3, r: 14, score: 120, sprite: 'wisp',
    formations: ['cluster'],
    init(e) {
      e.vx = rand(-40, 40);
      e.vy = 150;
      e.life = rand(5, 7);
    },
    update(e, g, dt) {
      if (e.t < e.life) {
        const a = angleTo(e.x, e.y, g.player.x, g.player.y);
        const sp = 120 + 40 * g.diff;
        const k = Math.min(1, dt * 1.1);
        e.vx += (Math.cos(a) * sp - e.vx) * k;
        e.vy += (Math.sin(a) * sp - e.vy) * k;
      } else {
        e.vy += 260 * dt; // burns out and falls away
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (Math.random() < dt * 30) {
        g.particle(e.x, e.y, rand(-20, 20), rand(-20, 20), 0.35, rand(2, 4), '#ff6b81');
      }
    },
  },

  lancer: {
    hp: 5, r: 16, score: 160, sprite: 'lancer',
    formations: ['line', 'single'],
    init(e) {
      e.ty = rand(100, 250);
      e.mode = 'enter';
      e.ang = Math.PI / 2;
    },
    update(e, g, dt) {
      if (e.mode === 'enter') {
        e.y += (e.ty - e.y) * Math.min(1, dt * 2.5);
        if (Math.abs(e.ty - e.y) < 6) {
          e.mode = 'aim';
          e.aimT = 0.9;
        }
      } else if (e.mode === 'aim') {
        e.aimT -= dt;
        if (e.aimT > 0.35) e.ang = angleTo(e.x, e.y, g.player.x, g.player.y);
        if (e.aimT <= 0) {
          e.mode = 'dash';
          e.vx = Math.cos(e.ang) * 640;
          e.vy = Math.sin(e.ang) * 640;
        }
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
      e.rot = e.ang - Math.PI / 2;
    },
    draw(ctx, e) {
      if (e.mode === 'aim' && Math.floor(e.aimT * 14) % 2 === 0) {
        ctx.strokeStyle = 'rgba(255,77,109,.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.ang) * 1200, e.y + Math.sin(e.ang) * 1200);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      drawSprite(ctx, 'lancer', e.x, e.y, e.rot);
    },
  },

  mine: {
    hp: 6, r: 18, score: 150, sprite: 'mine',
    formations: ['scatter'],
    init(e) {
      e.vy = rand(60, 85);
      e.vx = rand(-20, 20);
      e.spin = rand(-1.2, 1.2);
    },
    update(e, g, dt) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.rot += e.spin * dt;
      if (e.y > 0 && dist2(e.x, e.y, g.player.x, g.player.y) < 110 * 110) {
        g.killEnemy(e, false);
      }
    },
    onDeath(e, g) {
      g.ring(e.x, e.y, 10, 165, rand(0, 1));
    },
  },

  // ---------------- Level 3 ----------------
  shade: {
    hp: 6, r: 18, score: 200, sprite: 'shade',
    formations: ['single', 'pair'],
    init(e) {
      e.alpha = 0;
      e.cycles = 3;
      e.mode = 'in';
      e.x = rand(80, W - 80);
      e.y = rand(90, H * 0.42);
      e.intangible = true;
      e.noCull = true;
    },
    update(e, g, dt) {
      if (e.mode === 'in') {
        e.alpha = Math.min(1, e.alpha + dt * 2);
        if (e.alpha >= 1) {
          e.mode = 'fire';
          e.mt = 0.55;
        }
      } else if (e.mode === 'fire') {
        e.mt -= dt;
        if (e.mt <= 0) {
          g.aimed(e.x, e.y + 10, 230, g.diff > 1.4 ? 5 : 4, 0.7);
          e.mode = 'hold';
          e.mt = 0.5;
        }
      } else if (e.mode === 'hold') {
        e.mt -= dt;
        if (e.mt <= 0) e.mode = 'out';
      } else {
        e.alpha = Math.max(0, e.alpha - dt * 2.2);
        if (e.alpha <= 0) {
          e.cycles -= 1;
          if (e.cycles <= 0) {
            e.dead = true;
            return;
          }
          e.x = rand(80, W - 80);
          e.y = rand(90, H * 0.42);
          e.mode = 'in';
        }
      }
      e.intangible = e.alpha < 0.5;
      e.y += Math.sin(e.t * 2) * 10 * dt;
    },
    draw(ctx, e) {
      ctx.globalAlpha = e.alpha;
      drawSprite(ctx, 'shade', e.x, e.y);
      ctx.globalAlpha = 1;
    },
  },

  splitter: {
    hp: 8, r: 22, score: 180, sprite: 'splitter',
    formations: ['line', 'single', 'scatter'],
    init(e) {
      e.vy = rand(100, 125);
      e.spin = rand(-1.5, 1.5);
      e.cd = rand(1.5, 3);
    },
    update(e, g, dt) {
      e.y += e.vy * dt;
      e.rot += e.spin * dt;
      e.cd -= dt;
      if (e.cd <= 0) {
        e.cd = rand(2.6, 3.6) / g.diff;
        if (e.y > 20 && e.y < g.player.y - 120) g.aimed(e.x, e.y, 210, 2, 0.25);
      }
    },
    onDeath(e, g) {
      g.spawnEnemy('shard', e.x - 8, e.y, { dir: -1 });
      g.spawnEnemy('shard', e.x + 8, e.y, { dir: 1 });
    },
  },

  shard: {
    hp: 2, r: 11, score: 60, sprite: 'shard',
    formations: ['single'],
    init(e) {
      e.vx = (e.dir || 1) * rand(160, 220);
      e.vy = rand(150, 200);
    },
    update(e, g, dt) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < 14 || e.x > W - 14) e.vx *= -1;
      e.rot += 6 * dt;
    },
  },

  sentinel: {
    hp: 16, r: 27, score: 400, sprite: 'sentinel', elite: true,
    formations: ['single'],
    init(e) {
      e.ty = rand(140, 260);
      e.stay = 5;
      e.st = 0;
      e.sa = rand(0, 6);
    },
    update(e, g, dt) {
      e.rot += dt * 1.5;
      if (e.mode !== 'leave') {
        e.y += (e.ty - e.y) * Math.min(1, dt * 2);
        if (Math.abs(e.ty - e.y) < 20) {
          e.stay -= dt;
          e.st -= dt;
          if (e.st <= 0) {
            e.st = 0.16 / Math.sqrt(g.diff);
            e.sa += 0.38;
            g.shoot(e.x, e.y, e.sa, 165);
            g.shoot(e.x, e.y, e.sa + Math.PI, 165);
          }
          if (e.stay <= 0) e.mode = 'leave';
        }
      } else {
        e.y -= 160 * dt;
      }
    },
  },
};

export function createEnemy(type, x, y, opts = {}, hpScale = 1) {
  const def = DEFS[type];
  const e = {
    type,
    def,
    x,
    y,
    r: def.r,
    hp: def.hp * hpScale,
    maxHp: def.hp * hpScale,
    score: def.score,
    elite: !!def.elite,
    t: 0,
    rot: 0,
    hitT: 0,
    dead: false,
    ...opts,
  };
  def.init?.(e);
  return e;
}

export function drawEnemy(ctx, e, g) {
  if (e.def.draw) e.def.draw(ctx, e, g);
  else drawSprite(ctx, e.def.sprite, e.x, e.y, e.rot);
  if (e.hitT > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, e.hitT * 10) * 0.6 * (e.alpha ?? 1);
    if (e.def.draw) e.def.draw(ctx, e, g);
    else drawSprite(ctx, e.def.sprite, e.x, e.y, e.rot);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

// Spawns a group of enemies in one of the type's formations.
export function spawnFormation(g, type) {
  const def = DEFS[type];
  const f = pick(def.formations);
  const more = Math.round(g.progress * 2);
  const s = (x, y, o) => g.spawnEnemy(type, x, y, o, true);
  switch (f) {
    case 'line': {
      const n = randInt(3, 3 + more);
      const gap = W / (n + 1);
      for (let i = 0; i < n; i++) s(gap * (i + 1), -30);
      break;
    }
    case 'column': {
      const n = randInt(3, 4 + more);
      const x = rand(90, W - 90);
      for (let i = 0; i < n; i++) s(x, -30 - i * 55);
      break;
    }
    case 'v': {
      const cx = rand(170, W - 170);
      for (let i = -2; i <= 2; i++) s(cx + i * 60, -30 - Math.abs(i) * 45);
      break;
    }
    case 'snake': {
      const n = randInt(4, 5 + more);
      const x = rand(200, W - 200);
      const amp = rand(80, 150);
      for (let i = 0; i < n; i++) s(x, -30 - i * 45, { amp, ph: -i * 0.5 });
      break;
    }
    case 'pair':
      s(W * 0.28, -40);
      s(W * 0.72, -40);
      break;
    case 'cluster': {
      const n = randInt(3, 4 + more);
      const cx = rand(130, W - 130);
      for (let i = 0; i < n; i++) s(cx + rand(-70, 70), -30 - rand(0, 90));
      break;
    }
    case 'scatter': {
      const n = randInt(2, 2 + Math.ceil(more / 2));
      for (let i = 0; i < n; i++) s(rand(60, W - 60), -30 - rand(0, 160));
      break;
    }
    default:
      s(rand(70, W - 70), -40);
  }
}
