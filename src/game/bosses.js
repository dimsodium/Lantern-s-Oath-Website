import { W, rand, angleTo } from './util.js';
import { drawSprite } from './sprites.js';

// Boss definitions. Each boss flies in, then runs `fight` every frame.
// Patterns cycle in order; phase changes make them faster and denser.
export const BOSSES = {
  rustmaw: {
    name: 'RUSTMAW',
    title: 'Tyrant of the Drift',
    hp: 520,
    r: 78,
    score: 5000,
    sprite: 'rustmaw',
    fight(b, g, dt) {
      b.x = W / 2 + Math.sin(b.ft * 0.55) * 190;
      b.y = 190 + Math.sin(b.ft * 1.1) * 18;
      const p2 = b.hp < b.maxHp * 0.5;
      if (p2 && b.phase < 2) {
        b.phase = 2;
        g.bossRage(b, 'RUSTMAW OVERHEATS!');
      }
      if (b.stream > 0) {
        b.stream -= dt;
        b.st -= dt;
        if (b.st <= 0) {
          b.st = 0.075;
          b.sa += 0.3;
          g.shoot(b.x, b.y + 22, b.sa, 190);
          g.shoot(b.x, b.y + 22, b.sa + Math.PI, 190);
        }
        return;
      }
      b.cd -= dt;
      if (b.cd > 0) return;
      const pats = p2 ? ['fan', 'burst', 'stream', 'claws'] : ['fan', 'burst', 'claws'];
      const pat = pats[b.pi++ % pats.length];
      if (pat === 'fan') {
        g.aimed(b.x, b.y + 40, p2 ? 260 : 225, p2 ? 9 : 7, 1.1);
        b.cd = p2 ? 1.1 : 1.4;
      } else if (pat === 'burst') {
        for (let i = 0; i < 3; i++) {
          g.schedule(i * 0.2, () => !b.dead && g.aimed(b.x, b.y + 40, 330, 3, 0.2));
        }
        b.cd = 1.3;
      } else if (pat === 'claws') {
        g.ring(b.x - 100, b.y + 60, 12, 165, 0);
        g.ring(b.x + 100, b.y + 60, 12, 165, Math.PI / 12);
        b.cd = 1.6;
      } else if (pat === 'stream') {
        b.stream = 2.4;
        b.st = 0;
        b.sa = rand(0, 6);
        g.spawnEnemy('drone', b.x - 110, b.y);
        g.spawnEnemy('drone', b.x + 110, b.y);
        b.cd = 1.0;
      }
    },
    draw(ctx, b) {
      drawSprite(ctx, 'rustmaw', b.x, b.y);
      const pulse = 0.5 + 0.5 * Math.sin(b.t * 6);
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(b.x, b.y + 22, 0, b.x, b.y + 22, 44 + pulse * 10);
      gr.addColorStop(0, `rgba(255,170,80,${0.35 + pulse * 0.25})`);
      gr.addColorStop(1, 'rgba(255,100,30,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(b.x - 60, b.y - 40, 120, 120);
      ctx.globalCompositeOperation = 'source-over';
    },
  },

  vexa: {
    name: 'VEXA',
    title: 'The Ember Matriarch',
    hp: 820,
    r: 70,
    score: 8000,
    sprite: 'vexa',
    fight(b, g, dt) {
      b.x = W / 2 + Math.sin(b.ft * 0.6) * 200;
      b.y = 210 + Math.sin(b.ft * 1.2) * 55;
      const p2 = b.hp < b.maxHp * 0.5;
      if (p2 && b.phase < 2) {
        b.phase = 2;
        g.bossRage(b, 'VEXA IGNITES!');
      }
      b.cd -= dt;
      if (b.cd > 0) return;
      const pats = p2
        ? ['ring', 'beam', 'scatter', 'wisps', 'ring', 'beam']
        : ['ring', 'beam', 'wisps', 'scatter'];
      const pat = pats[b.pi++ % pats.length];
      if (pat === 'ring') {
        const off = rand(0, 1);
        g.ring(b.x, b.y, 20, 195, off);
        if (p2) g.schedule(0.3, () => !b.dead && g.ring(b.x, b.y, 20, 220, off + Math.PI / 20));
        b.cd = p2 ? 1.1 : 1.4;
      } else if (pat === 'beam') {
        const base = angleTo(b.x, b.y, g.player.x, g.player.y);
        const spread = p2 ? [-0.4, 0, 0.4] : [0];
        spread.forEach((a) =>
          g.beam(b, 0, 30, base + a, { warm: 0.95, active: 0.7, width: 26 })
        );
        b.cd = 2.0;
      } else if (pat === 'wisps') {
        const n = p2 ? 5 : 3;
        for (let i = 0; i < n; i++) {
          const a = (Math.PI * 2 * i) / n;
          g.spawnEnemy('wisp', b.x + Math.cos(a) * 70, b.y + Math.sin(a) * 50);
        }
        b.cd = 1.3;
      } else if (pat === 'scatter') {
        for (let i = 0; i < (p2 ? 20 : 15); i++) {
          g.shoot(b.x, b.y + 30, rand(0.35, Math.PI - 0.35), rand(140, 290));
        }
        b.cd = 1.2;
      }
    },
    draw(ctx, b) {
      const flap = 1 + Math.sin(b.t * 3) * 0.04;
      drawSprite(ctx, 'vexa', b.x, b.y, 0, flap);
    },
  },

  hollowKing: {
    name: 'THE HOLLOW KING',
    title: 'Devourer of Light',
    hp: 1300,
    r: 74,
    score: 15000,
    sprite: 'hollow',
    fight(b, g, dt) {
      const ratio = b.hp / b.maxHp;
      const phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
      if (phase > b.phase) {
        b.phase = phase;
        g.bossRage(b, phase === 2 ? 'THE HOLLOW KING SHIFTS' : 'THE HOLLOW KING UNRAVELS');
        b.pi = 0;
      }
      if (phase === 1) {
        b.x += (W / 2 + Math.sin(b.ft * 0.4) * 160 - b.x) * Math.min(1, dt * 3);
        b.y += (200 - b.y) * Math.min(1, dt * 3);
      } else if (phase === 3) {
        b.x += (W / 2 + Math.sin(b.ft * 0.8) * 130 - b.x) * Math.min(1, dt * 3);
        b.y += (220 + Math.cos(b.ft * 0.8) * 40 - b.y) * Math.min(1, dt * 3);
      }

      if (b.stream > 0) {
        b.stream -= dt;
        b.st -= dt;
        if (b.st <= 0) {
          b.st = 0.1;
          b.sa += 0.22;
          g.shoot(b.x, b.y, b.sa, 175);
          g.shoot(b.x, b.y, -b.sa + Math.PI / 2, 175);
        }
        return;
      }

      b.cd -= dt;
      if (b.cd > 0) return;
      const sets = {
        1: ['spiral', 'sniper', 'ring'],
        2: ['teleport', 'cross', 'teleport', 'shades', 'teleport', 'ring2', 'sniper'],
        3: ['flower', 'fan', 'cross', 'fan'],
      };
      const pats = sets[phase];
      const pat = pats[b.pi++ % pats.length];
      switch (pat) {
        case 'spiral':
          b.stream = 3;
          b.st = 0;
          b.sa = rand(0, 6);
          b.cd = 0.8;
          break;
        case 'sniper':
          for (let i = 0; i < 3; i++) {
            g.schedule(i * 0.22, () => !b.dead && g.aimed(b.x, b.y + 30, 420, 1, 0, { r: 6 }));
          }
          b.cd = 1.1;
          break;
        case 'ring':
          g.ring(b.x, b.y, 24, 175, rand(0, 1));
          b.cd = 1.2;
          break;
        case 'ring2': {
          const off = rand(0, 1);
          g.ring(b.x, b.y, 22, 190, off);
          g.schedule(0.3, () => !b.dead && g.ring(b.x, b.y, 22, 210, off + Math.PI / 22));
          b.cd = 1.4;
          break;
        }
        case 'teleport':
          g.poof(b.x, b.y, '#c77dff');
          b.x = rand(160, W - 160);
          b.y = rand(160, 280);
          g.poof(b.x, b.y, '#c77dff');
          b.cd = 0.5;
          break;
        case 'cross': {
          const base = rand(0, Math.PI / 2);
          const spin = (Math.random() < 0.5 ? -1 : 1) * 0.4;
          for (let i = 0; i < 4; i++) {
            g.beam(b, 0, 0, base + (i * Math.PI) / 2, {
              warm: 1.0, active: 1.6, width: 24, spin,
            });
          }
          b.cd = 2.8;
          break;
        }
        case 'shades':
          g.spawnEnemy('shade', 0, 0);
          g.spawnEnemy('shade', 0, 0);
          b.cd = 1.0;
          break;
        case 'flower':
          for (let i = 0; i < 8; i++) {
            g.schedule(i * 0.35, () => !b.dead && g.ring(b.x, b.y, 16, 185, i * 0.2));
          }
          b.cd = 3.0;
          break;
        case 'fan':
          g.aimed(b.x, b.y + 30, 280, 7, 0.9);
          b.cd = 0.9;
          break;
        default:
          b.cd = 0.5;
      }
    },
    draw(ctx, b) {
      drawSprite(ctx, 'hollow', b.x, b.y);
      // orbiting void shards
      ctx.fillStyle = '#d9b8ff';
      for (let i = 0; i < 6; i++) {
        const a = b.t * 0.9 + (i * Math.PI * 2) / 6;
        const x = b.x + Math.cos(a) * 104;
        const y = b.y + Math.sin(a) * 44;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a * 2);
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      const pulse = 0.5 + 0.5 * Math.sin(b.t * 4);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(199,125,255,${0.25 + pulse * 0.3})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y + 4, 30 + pulse * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    },
  },
};

export function createBoss(key) {
  const def = BOSSES[key];
  return {
    type: key,
    boss: true,
    def,
    name: def.name,
    title: def.title,
    x: W / 2,
    y: -180,
    r: def.r,
    hp: def.hp,
    maxHp: def.hp,
    score: def.score,
    t: 0,
    ft: 0,
    cd: 1.2,
    pi: 0,
    phase: 1,
    stream: 0,
    st: 0,
    sa: 0,
    hitT: 0,
    entering: true,
    intangible: true,
    dead: false,
    noCull: true,
  };
}

export function updateBoss(b, g, dt) {
  b.t += dt;
  if (b.hitT > 0) b.hitT -= dt;
  if (b.entering) {
    b.y += (200 - b.y) * Math.min(1, dt * 1.6);
    if (b.y > 185) {
      b.entering = false;
      b.intangible = false;
    }
    return;
  }
  b.ft += dt;
  b.def.fight(b, g, dt);
}

export function drawBoss(ctx, b) {
  b.def.draw(ctx, b);
  if (b.hitT > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, b.hitT * 10) * 0.35;
    b.def.draw(ctx, b);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
