// Procedurally drawn sprites, pre-rendered once to offscreen canvases (2x for crispness).
// All character and enemy designs here are original to Lantern's Oath.

export const EMERALD = '#3dff8f';
const R = 2; // internal resolution multiplier
const cache = new Map();

function make(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * R);
  c.height = Math.ceil(h * R);
  const x = c.getContext('2d');
  x.scale(R, R);
  x.translate(w / 2, h / 2);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  draw(x, w, h);
  c.lw = w;
  c.lh = h;
  cache.set(key, c);
  return c;
}

function glowCircle(c, x, y, r, inner, outer) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function poly(c, pts) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
}

function linGrad(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  return g;
}

const SPRITES = {
  // The Warden — original hero, seen from behind, flying upward with both fists forward.
  player: () =>
    make('player', 76, 100, (c) => {
      // flowing cape
      c.fillStyle = linGrad(c, 0, -14, 0, 46, [[0, '#0f4a32'], [1, '#03130c']]);
      c.beginPath();
      c.moveTo(-12, -14);
      c.bezierCurveTo(-32, 6, -30, 30, -24, 46);
      c.lineTo(-13, 39);
      c.lineTo(-6, 48);
      c.lineTo(1, 40);
      c.lineTo(9, 48);
      c.lineTo(15, 39);
      c.lineTo(24, 45);
      c.bezierCurveTo(30, 28, 32, 6, 12, -14);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(61,255,143,.35)';
      c.lineWidth = 1;
      c.stroke();
      // legs
      c.fillStyle = '#121c19';
      poly(c, [-9, 8, -8, 33, -3, 36, -1, 8]);
      c.fill();
      poly(c, [9, 8, 8, 33, 3, 36, 1, 8]);
      c.fill();
      // arms raised forward
      c.fillStyle = '#16231f';
      poly(c, [-13, -12, -6, -36, -2, -34, -8, -8]);
      c.fill();
      poly(c, [13, -12, 6, -36, 2, -34, 8, -8]);
      c.fill();
      // torso
      c.fillStyle = linGrad(c, -13, 0, 13, 0, [[0, '#0b1814'], [0.5, '#1f4032'], [1, '#0b1814']]);
      poly(c, [-14, -13, 14, -13, 9, 10, -9, 10]);
      c.fill();
      // emerald suit seams
      c.strokeStyle = EMERALD;
      c.shadowColor = EMERALD;
      c.shadowBlur = 6;
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(-13, -12);
      c.lineTo(-8.5, 9);
      c.moveTo(13, -12);
      c.lineTo(8.5, 9);
      c.moveTo(-9, 10);
      c.lineTo(9, 10);
      c.moveTo(-8, 30);
      c.lineTo(-4, 31);
      c.moveTo(8, 30);
      c.lineTo(4, 31);
      c.stroke();
      // shard emblem on the back
      c.fillStyle = EMERALD;
      poly(c, [0, -9, 4, -3, 0, 4, -4, -3]);
      c.fill();
      c.shadowBlur = 0;
      // head
      c.fillStyle = '#0d241b';
      c.beginPath();
      c.arc(0, -19, 7, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(61,255,143,.55)';
      c.lineWidth = 1;
      c.stroke();
      // ring light at the fists
      glowCircle(c, 0, -38, 16, '#f0fff4', 'rgba(61,255,143,.85)');
    }),

  // ---------- Level 1: the Drift (salvage machines) ----------
  drone: () =>
    make('drone', 46, 46, (c) => {
      c.fillStyle = '#3a4252';
      c.fillRect(-21, -4, 8, 8);
      c.fillRect(13, -4, 8, 8);
      const hex = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        hex.push(Math.cos(a) * 16, Math.sin(a) * 16);
      }
      c.fillStyle = linGrad(c, 0, -16, 0, 16, [[0, '#6a7489'], [1, '#262c38']]);
      poly(c, hex);
      c.fill();
      c.strokeStyle = '#9aa6bb';
      c.lineWidth = 1.5;
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.15)';
      c.beginPath();
      c.arc(0, 0, 10, 0, Math.PI * 2);
      c.stroke();
      glowCircle(c, 0, 3, 11, '#fff2d6', 'rgba(255,138,61,.95)');
    }),

  skimmer: () =>
    make('skimmer', 54, 44, (c) => {
      glowCircle(c, 0, -14, 10, '#ffe0b0', 'rgba(255,150,60,.6)');
      c.fillStyle = linGrad(c, 0, -14, 0, 18, [[0, '#4a5a78'], [1, '#1d2433']]);
      poly(c, [0, 18, -25, -12, -9, -6, 0, -15, 9, -6, 25, -12]);
      c.fill();
      c.strokeStyle = '#ff9a4a';
      c.lineWidth = 1.5;
      c.stroke();
      c.fillStyle = '#ffb86b';
      poly(c, [0, 10, -4, 0, 0, -4, 4, 0]);
      c.fill();
    }),

  gunship: () =>
    make('gunship', 72, 66, (c) => {
      c.fillStyle = '#2b313d';
      c.fillRect(-20, 8, 7, 22);
      c.fillRect(13, 8, 7, 22);
      c.fillStyle = '#ff8a3d';
      c.fillRect(-19, 27, 5, 4);
      c.fillRect(14, 27, 5, 4);
      c.fillStyle = linGrad(c, 0, -28, 0, 20, [[0, '#7a8296'], [1, '#2a303c']]);
      poly(c, [-30, -10, -18, -28, 18, -28, 30, -10, 26, 16, -26, 16]);
      c.fill();
      c.strokeStyle = '#aab4c8';
      c.lineWidth = 1.5;
      c.stroke();
      c.strokeStyle = 'rgba(0,0,0,.35)';
      c.beginPath();
      c.moveTo(-22, -2);
      c.lineTo(22, -2);
      c.moveTo(-10, -26);
      c.lineTo(-10, 14);
      c.moveTo(10, -26);
      c.lineTo(10, 14);
      c.stroke();
      glowCircle(c, 0, 6, 12, '#fff2d6', 'rgba(255,138,61,.9)');
    }),

  // ---------- Level 2: the Ember Nebula (crimson brood) ----------
  wisp: () =>
    make('wisp', 44, 44, (c) => {
      glowCircle(c, 0, 0, 22, '#fff0e8', 'rgba(255,70,90,.75)');
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(0, 0, 4, 0, Math.PI * 2);
      c.fill();
    }),

  lancer: () =>
    make('lancer', 40, 70, (c) => {
      c.fillStyle = linGrad(c, -12, 0, 12, 0, [[0, '#2a0a12'], [0.5, '#5c1626'], [1, '#2a0a12']]);
      poly(c, [0, 33, -10, 2, -15, -24, 0, -14, 15, -24, 10, 2]);
      c.fill();
      c.strokeStyle = '#ff4d6d';
      c.shadowColor = '#ff4d6d';
      c.shadowBlur = 8;
      c.lineWidth = 1.6;
      c.stroke();
      c.beginPath();
      c.moveTo(0, -10);
      c.lineTo(0, 26);
      c.stroke();
      c.shadowBlur = 0;
      glowCircle(c, 0, -2, 7, '#fff', 'rgba(255,77,109,.9)');
    }),

  mine: () =>
    make('mine', 50, 50, (c) => {
      c.strokeStyle = '#ff6b5a';
      c.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i;
        c.beginPath();
        c.moveTo(Math.cos(a) * 13, Math.sin(a) * 13);
        c.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
        c.stroke();
      }
      c.fillStyle = linGrad(c, 0, -15, 0, 15, [[0, '#6e1e22'], [1, '#2a0a0c']]);
      c.beginPath();
      c.arc(0, 0, 15, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ff9a7a';
      c.lineWidth = 1.2;
      c.stroke();
      glowCircle(c, 0, 0, 9, '#fff4d0', 'rgba(255,120,60,.95)');
    }),

  // ---------- Level 3: the Hollow (void wraiths) ----------
  shade: () =>
    make('shade', 56, 66, (c) => {
      c.fillStyle = linGrad(c, 0, -30, 0, 30, [[0, '#3a1660'], [1, 'rgba(20,6,40,0.1)']]);
      c.beginPath();
      c.moveTo(0, -30);
      c.bezierCurveTo(22, -26, 24, 4, 24, 26);
      c.lineTo(14, 18);
      c.lineTo(8, 30);
      c.lineTo(0, 20);
      c.lineTo(-8, 30);
      c.lineTo(-14, 18);
      c.lineTo(-24, 26);
      c.bezierCurveTo(-24, 4, -22, -26, 0, -30);
      c.fill();
      c.strokeStyle = 'rgba(199,125,255,.7)';
      c.lineWidth = 1.2;
      c.stroke();
      c.fillStyle = '#0a0214';
      c.beginPath();
      c.ellipse(0, -8, 11, 13, 0, 0, Math.PI * 2);
      c.fill();
      glowCircle(c, -4, -6, 5, '#fff', 'rgba(220,170,255,.9)');
      glowCircle(c, 4, -6, 5, '#fff', 'rgba(220,170,255,.9)');
    }),

  splitter: () =>
    make('splitter', 54, 60, (c) => {
      c.fillStyle = linGrad(c, -22, -26, 22, 26, [[0, '#b38cff'], [0.5, '#5a2aa0'], [1, '#22104a']]);
      poly(c, [0, -27, 22, -4, 0, 27, -22, -4]);
      c.fill();
      c.strokeStyle = '#e2ccff';
      c.lineWidth = 1.4;
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.35)';
      c.beginPath();
      c.moveTo(0, -27);
      c.lineTo(0, 27);
      c.moveTo(-22, -4);
      c.lineTo(22, -4);
      c.stroke();
      glowCircle(c, 0, -4, 8, '#fff', 'rgba(199,125,255,.9)');
    }),

  shard: () =>
    make('shard', 28, 30, (c) => {
      c.fillStyle = linGrad(c, -10, -12, 10, 12, [[0, '#c9a6ff'], [1, '#3a1a70']]);
      poly(c, [0, -13, 10, -2, 0, 13, -10, -2]);
      c.fill();
      c.strokeStyle = '#efe2ff';
      c.lineWidth = 1;
      c.stroke();
    }),

  sentinel: () =>
    make('sentinel', 66, 66, (c) => {
      c.strokeStyle = '#7d4bc4';
      c.lineWidth = 5;
      c.beginPath();
      c.arc(0, 0, 24, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = '#d6b8ff';
      c.lineWidth = 1.2;
      c.stroke();
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i;
        c.fillStyle = '#2a1050';
        c.beginPath();
        c.arc(Math.cos(a) * 24, Math.sin(a) * 24, 6, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#c77dff';
        c.stroke();
      }
      c.fillStyle = '#12051f';
      c.beginPath();
      c.arc(0, 0, 13, 0, Math.PI * 2);
      c.fill();
      glowCircle(c, 0, 0, 11, '#fff', 'rgba(199,125,255,.95)');
    }),

  // ---------- Bosses ----------
  rustmaw: () =>
    make('rustmaw', 280, 190, (c) => {
      // claws
      for (const s of [-1, 1]) {
        c.fillStyle = '#4a2c1a';
        poly(c, [s * 84, -20, s * 118, 10, s * 112, 62, s * 96, 70, s * 98, 22, s * 76, 6]);
        c.fill();
        c.strokeStyle = '#c27a3a';
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = '#2e1a10';
        poly(c, [s * 96, 66, s * 88, 88, s * 104, 74]);
        c.fill();
        poly(c, [s * 112, 60, s * 124, 84, s * 108, 72]);
        c.fill();
      }
      // engines
      for (const s of [-1, 1]) {
        c.fillStyle = '#2b2f38';
        c.fillRect(s * 52 - 12, -86, 24, 24);
        glowCircle(c, s * 52, -88, 14, '#fff2d6', 'rgba(255,138,61,.8)');
      }
      // main hull
      c.fillStyle = linGrad(c, 0, -70, 0, 70, [[0, '#a8622f'], [0.5, '#6e3c1e'], [1, '#2e1a10']]);
      poly(c, [-90, -40, -60, -70, 60, -70, 90, -40, 82, 30, 40, 66, -40, 66, -82, 30]);
      c.fill();
      c.strokeStyle = '#e09a55';
      c.lineWidth = 2.5;
      c.stroke();
      // plating
      c.strokeStyle = 'rgba(0,0,0,.4)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-80, -20);
      c.lineTo(80, -20);
      c.moveTo(-40, -68);
      c.lineTo(-48, 64);
      c.moveTo(40, -68);
      c.lineTo(48, 64);
      c.stroke();
      c.fillStyle = '#c9884a';
      for (const [x, y] of [[-70, -32], [70, -32], [-64, 20], [64, 20], [-20, -56], [20, -56]]) {
        c.beginPath();
        c.arc(x, y, 3, 0, Math.PI * 2);
        c.fill();
      }
      // furnace maw
      c.fillStyle = '#1a0d06';
      c.beginPath();
      c.arc(0, 22, 30, 0, Math.PI * 2);
      c.fill();
      glowCircle(c, 0, 22, 30, '#fff6dc', 'rgba(255,120,40,.95)');
      c.strokeStyle = '#2e1a10';
      c.lineWidth = 4;
      c.beginPath();
      for (let i = -2; i <= 2; i++) {
        c.moveTo(i * 10, 2);
        c.lineTo(i * 10, 44);
      }
      c.stroke();
    }),

  vexa: () =>
    make('vexa', 320, 220, (c) => {
      // membrane wings
      for (const s of [-1, 1]) {
        c.fillStyle = linGrad(c, 0, 0, s * 150, 0, [[0, 'rgba(120,10,30,.95)'], [1, 'rgba(255,70,90,.25)']]);
        c.beginPath();
        c.moveTo(s * 20, -30);
        c.bezierCurveTo(s * 90, -110, s * 150, -70, s * 156, -20);
        c.bezierCurveTo(s * 130, -10, s * 120, 20, s * 140, 50);
        c.bezierCurveTo(s * 100, 30, s * 70, 50, s * 60, 80);
        c.bezierCurveTo(s * 40, 40, s * 30, 30, s * 20, 20);
        c.closePath();
        c.fill();
        c.strokeStyle = '#ff6b81';
        c.lineWidth = 1.6;
        c.stroke();
        c.strokeStyle = 'rgba(255,140,150,.45)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(s * 22, -10);
        c.lineTo(s * 150, -40);
        c.moveTo(s * 22, 0);
        c.lineTo(s * 130, 40);
        c.moveTo(s * 22, 10);
        c.lineTo(s * 70, 70);
        c.stroke();
      }
      // tendrils toward the player
      c.strokeStyle = '#8a1430';
      c.lineWidth = 4;
      for (const x of [-18, -6, 6, 18]) {
        c.beginPath();
        c.moveTo(x, 30);
        c.bezierCurveTo(x * 1.6, 60, x * 0.4, 80, x * 1.3, 100);
        c.stroke();
      }
      // body
      c.fillStyle = linGrad(c, 0, -60, 0, 50, [[0, '#ff5a70'], [0.5, '#8a1430'], [1, '#2a0510']]);
      c.beginPath();
      c.ellipse(0, -5, 32, 56, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ffb3be';
      c.lineWidth = 2;
      c.stroke();
      // crest
      c.fillStyle = '#2a0510';
      poly(c, [0, -84, 12, -52, 0, -60, -12, -52]);
      c.fill();
      // eye
      c.fillStyle = '#1a0308';
      c.beginPath();
      c.ellipse(0, 4, 18, 12, 0, 0, Math.PI * 2);
      c.fill();
      glowCircle(c, 0, 4, 18, '#fff', 'rgba(255,77,109,.95)');
    }),

  hollow: () =>
    make('hollow', 280, 280, (c) => {
      // crown spikes
      c.fillStyle = '#1a0830';
      c.strokeStyle = '#c77dff';
      c.lineWidth = 1.6;
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (Math.PI / 8) * i;
        const len = i % 2 ? 112 : 128;
        const x0 = Math.cos(a - 0.12) * 70;
        const y0 = Math.sin(a - 0.12) * 70;
        const x1 = Math.cos(a + 0.12) * 70;
        const y1 = Math.sin(a + 0.12) * 70;
        poly(c, [x0, y0, Math.cos(a) * len, Math.sin(a) * len, x1, y1]);
        c.fill();
        c.stroke();
      }
      // cloak body
      c.fillStyle = linGrad(c, 0, 0, 0, 130, [[0, '#24093f'], [1, 'rgba(10,2,20,0)']]);
      c.beginPath();
      c.moveTo(-74, 10);
      c.bezierCurveTo(-90, 70, -70, 110, -50, 132);
      c.lineTo(-30, 112);
      c.lineTo(-14, 136);
      c.lineTo(0, 114);
      c.lineTo(14, 136);
      c.lineTo(30, 112);
      c.lineTo(50, 132);
      c.bezierCurveTo(70, 110, 90, 70, 74, 10);
      c.closePath();
      c.fill();
      // core orb
      const g = c.createRadialGradient(0, 0, 10, 0, 0, 76);
      g.addColorStop(0, '#000');
      g.addColorStop(0.7, '#14052a');
      g.addColorStop(1, '#5a2aa0');
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, 0, 76, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#c77dff';
      c.lineWidth = 2.5;
      c.stroke();
      // hollow eye
      c.strokeStyle = '#f3e8ff';
      c.shadowColor = '#c77dff';
      c.shadowBlur = 18;
      c.lineWidth = 5;
      c.beginPath();
      c.arc(0, 4, 24, 0, Math.PI * 2);
      c.stroke();
      c.shadowBlur = 0;
    }),

  // ---------- Pickups ----------
  heal: () =>
    make('heal', 34, 34, (c) => {
      glowCircle(c, 0, 0, 17, 'rgba(255,255,255,.9)', 'rgba(61,255,143,.5)');
      c.fillStyle = '#04120c';
      c.beginPath();
      c.arc(0, 0, 10, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = EMERALD;
      c.fillRect(-2.5, -7, 5, 14);
      c.fillRect(-7, -2.5, 14, 5);
    }),
  power: () =>
    make('power', 34, 34, (c) => {
      glowCircle(c, 0, 0, 17, 'rgba(255,255,255,.9)', 'rgba(255,215,90,.55)');
      c.fillStyle = '#1a1404';
      poly(c, [0, -11, 10, 0, 0, 11, -10, 0]);
      c.fill();
      c.fillStyle = '#ffd75a';
      c.font = 'bold 12px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('P', 0, 1);
    }),
  energy: () =>
    make('energy', 34, 34, (c) => {
      glowCircle(c, 0, 0, 17, 'rgba(255,255,255,.9)', 'rgba(90,220,255,.55)');
      c.fillStyle = '#04121a';
      c.beginPath();
      c.arc(0, 0, 10, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#7ee6ff';
      poly(c, [2, -8, -5, 1, 0, 1, -2, 8, 5, -1, 0, -1]);
      c.fill();
    }),
};

export function getSprite(key) {
  return SPRITES[key]();
}

export function drawSprite(ctx, key, x, y, rot = 0, scale = 1) {
  const s = SPRITES[key]();
  if (!rot && scale === 1) {
    ctx.drawImage(s, x - s.lw / 2, y - s.lh / 2, s.lw, s.lh);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.drawImage(s, -s.lw / 2, -s.lh / 2, s.lw, s.lh);
  ctx.restore();
}

// Warm all sprite caches (avoids a hitch the first time an enemy appears).
export function preloadSprites() {
  Object.keys(SPRITES).forEach((k) => SPRITES[k]());
}
