import { W, H } from './util.js';
import { EMERALD } from './sprites.js';

const FONT = '"Chakra Petch", "Segoe UI", system-ui, sans-serif';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(4,10,8,0.62)';
  ctx.strokeStyle = 'rgba(61,255,143,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, color, label, flash) {
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `600 10px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, x, y - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.globalAlpha = flash ? 0.6 + 0.4 * Math.sin(performance.now() / 90) : 1;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
  ctx.globalAlpha = 1;
}

export function drawHud(ctx, g) {
  const p = g.player;
  ctx.save();

  // Vitals panel (top-left)
  panel(ctx, 14, 14, 232, 112);
  const hpFrac = p.hp / p.maxHp;
  const hpCol = hpFrac > 0.5 ? EMERALD : hpFrac > 0.25 ? '#ffd75a' : '#ff5a5a';
  bar(ctx, 28, 36, 204, 9, hpFrac, hpCol, 'VITALITY', hpFrac <= 0.25);
  bar(ctx, 28, 66, 204, 7, p.energy / 100, '#7ee6ff', p.shield ? 'RING CHARGE · SHIELD UP' : 'RING CHARGE');
  const ready = p.oath >= 100;
  bar(ctx, 28, 96, 204, 7, p.oath / 100, ready ? '#fff4b0' : '#c9ffd9', ready ? 'OATH · PRESS E' : 'OATH', ready);
  // power pips
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `600 10px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('POWER', 28, 116);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < p.power ? '#ffd75a' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(80 + i * 14, 116, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (g.autoFire) {
    ctx.fillStyle = EMERALD;
    ctx.fillText('AUTO-FIRE', 160, 116);
  }

  // Score (top centre)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText(`LEVEL ${g.level.id} · ${g.level.name.toUpperCase()}`, W / 2, 18);
  ctx.fillStyle = '#fff';
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(String(Math.floor(g.displayScore)).padStart(7, '0'), W / 2, 34);

  // Boss health
  const b = g.boss;
  if (b && !b.dead && g.bossState === 'fight') {
    const bw = 420;
    const bx = (W - bw) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx - 2, 76, bw + 4, 14);
    ctx.fillStyle = g.level.theme.accent;
    ctx.fillRect(bx, 78, (b.hp / b.maxHp) * bw, 10);
    ctx.font = `700 12px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`${b.name} — ${b.title.toUpperCase()}`, W / 2, 94);
  }

  // Journey progress (bottom centre)
  if (g.bossState === 'none') {
    const pw = 300;
    const px = (W - pw) / 2;
    const py = H - 22;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(px, py, pw, 4);
    ctx.fillStyle = EMERALD;
    ctx.fillRect(px, py, pw * g.progress, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `600 10px ${FONT}`;
    ctx.textBaseline = 'bottom';
    ctx.fillText('DISTANCE TO BOSS', W / 2, py - 4);
  }

  // Centre banner (level intro, warnings)
  if (g.banner && g.banner.t > 0) {
    const bn = g.banner;
    const life = bn.t / bn.max;
    const a = Math.min(1, life * 4, (1 - life) * 6 + 0.001);
    ctx.globalAlpha = Math.min(1, a);
    ctx.textBaseline = 'middle';
    if (bn.warning) {
      ctx.fillStyle = 'rgba(120,0,20,0.35)';
      ctx.fillRect(0, H / 2 - 70, W, 140);
      ctx.fillStyle = Math.floor(bn.t * 6) % 2 ? '#ff5a5a' : '#ffd0d0';
      ctx.font = `700 54px ${FONT}`;
      ctx.fillText('WARNING', W / 2, H / 2 - 18);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = `700 46px "Cinzel", Georgia, serif`;
      ctx.fillText(bn.text, W / 2, H / 2 - 18);
    }
    ctx.font = `600 16px ${FONT}`;
    ctx.fillStyle = bn.warning ? '#ffd0d0' : EMERALD;
    ctx.fillText(bn.sub || '', W / 2, H / 2 + 30);
    ctx.globalAlpha = 1;
  }

  // Damage vignette
  if (g.flash > 0) {
    ctx.fillStyle = g.flashColor;
    ctx.globalAlpha = Math.min(0.5, g.flash);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
