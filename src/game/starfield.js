import { W, H, rand } from './util.js';

const LAYERS = [
  { n: 150, speed: 0.22, size: [0.6, 1.1], alpha: [0.25, 0.55] },
  { n: 90, speed: 0.5, size: [1.0, 1.6], alpha: [0.45, 0.8] },
  { n: 34, speed: 1.0, size: [1.6, 2.4], alpha: [0.75, 1] },
];

const DEFAULT_THEME = {
  bg: '#02040a',
  nebula: ['rgba(61,255,143,0.06)', 'rgba(70,110,255,0.07)'],
};

// Parallax field of small white stars over a deep-space background.
export class Starfield {
  constructor(w = W, h = H) {
    this.w = w;
    this.h = h;
    this.stars = [];
    LAYERS.forEach((layer) => {
      const count = Math.round(layer.n * ((w * h) / (W * H)) ** 0.5);
      for (let i = 0; i < count; i++) {
        this.stars.push({
          x: rand(0, w),
          y: rand(0, h),
          s: rand(...layer.size),
          a: rand(...layer.alpha),
          tw: rand(0, Math.PI * 2),
          speed: layer.speed,
        });
      }
    });
    this.setTheme(DEFAULT_THEME);
  }

  resize(w, h) {
    const sx = w / this.w;
    const sy = h / this.h;
    this.stars.forEach((s) => {
      s.x *= sx;
      s.y *= sy;
    });
    this.w = w;
    this.h = h;
  }

  setTheme(theme) {
    this.theme = theme;
    this.nebulae = theme.nebula.map((col, i) => ({
      x: rand(0.15, 0.85) * this.w,
      y: (i / theme.nebula.length) * this.h + rand(0, 200),
      r: rand(260, 440),
      col,
    }));
  }

  update(dt, speed) {
    for (const s of this.stars) {
      s.y += speed * s.speed * dt;
      if (s.y > this.h + 3) {
        s.y = -3;
        s.x = rand(0, this.w);
      }
    }
    for (const n of this.nebulae) {
      n.y += speed * 0.08 * dt;
      if (n.y - n.r > this.h) {
        n.y = -n.r;
        n.x = rand(0.15, 0.85) * this.w;
      }
    }
  }

  draw(ctx, time) {
    ctx.fillStyle = this.theme.bg;
    ctx.fillRect(0, 0, this.w, this.h);
    for (const n of this.nebulae) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) {
      ctx.globalAlpha = s.a * (0.7 + 0.3 * Math.sin(time * 2.2 + s.tw));
      if (s.s > 1.5) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.s / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
    }
    ctx.globalAlpha = 1;
  }
}
