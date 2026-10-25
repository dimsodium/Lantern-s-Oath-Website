// Level 2 backdrop: a pixel-art desert under a greenish-blue sky, drawn once into a canvas the size of the screen.
// It is painted at half resolution (2x2 screen pixels per art pixel) for chunky pixel art, and built to read as far
// away: a high horizon, small low dunes that fade into the sky the farther back they are (atmospheric haze), and a
// sand floor in perspective (pale and fine near the horizon, warmer and coarser up close, rocks sized by distance).
// Sky: the four teal hues, darkest at the top (farther away) to lightest at the horizon, joined by checker dither.

const SKY = [[36, 110, 97], [38, 116, 103], [40, 122, 108], [42, 128, 113]];   // far (top) -> near (horizon)
const CLOUD = [[64, 148, 131], [92, 170, 153], [124, 192, 176]];               // shadow, body, highlight
const DUNE_BACK = { lit: [222, 196, 150], mid: [202, 172, 126], dark: [178, 146, 104] };
const DUNE_FRONT = { lit: [240, 168, 92], mid: [222, 140, 70], dark: [196, 112, 52] };
const SAND_FAR = [226, 200, 150], SAND_NEAR = [238, 190, 112], GRAIN = [214, 164, 92];
const ROCK = { lit: [196, 150, 104], mid: [160, 116, 78], dark: [116, 80, 52], line: [74, 50, 34] };

export const HORIZON_FRAC = 0.4;   // the dunes' base, as a fraction of the screen height
// Screen y (in a 540-high game) where the sand floor begins: characters' feet stay below this line.
export const floorY = (H) => Math.round(Math.ceil(H / 2) * HORIZON_FRAC) * 2;

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const haze = (pal, t) => ({ lit: mix(pal.lit, SKY[3], t), mid: mix(pal.mid, SKY[3], t), dark: mix(pal.dark, SKY[3], t) });

export function makeDesert(W, H) {
  const w = Math.ceil(W / 2), h = Math.ceil(H / 2);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d");
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const px = (X, Y, col) => { x.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; x.fillRect(X, Y, 1, 1); };
  const horizon = Math.round(h * HORIZON_FRAC);

  // ---- sky ----
  for (let Y = 0; Y < horizon; Y++) {
    const f = Y / horizon * SKY.length, i = Math.min(SKY.length - 1, Math.floor(f)), frac = f - i;
    for (let X = 0; X < w; X++) {
      let col = SKY[i];
      if (i < SKY.length - 1 && frac > 0.82 && (X + Y) % 2 === 0) col = SKY[i + 1];
      if (i > 0 && frac < 0.1 && (X + Y) % 2 === 1) col = SKY[i - 1];
      px(X, Y, col);
    }
  }
  // ---- clouds: bigger up high (closer), small and flat toward the horizon (far away) ----
  const cloud = (cx, cy, size, flat) => {
    const blobs = [];
    for (let i = 0; i < 4 + size; i++) blobs.push([cx + (i - (3 + size) / 2) * (3 + size * 1.1) + rnd() * 3, cy - 1 - rnd() * size * 1.6 * flat, 2 + rnd() * (2 + size * 1.3)]);
    for (let Y = Math.floor(cy - size * 4 - 6); Y <= cy + 1; Y++) for (let X = Math.floor(cx - size * 8 - 10); X < cx + size * 8 + 10; X++) {
      let inside = false, top = false;
      for (const [bx, by, r] of blobs) { const d = Math.hypot(X - bx, (Y - by) / flat); if (d <= r) { inside = true; if (Y < by - r * 0.35 * flat) top = true; } }
      if (!inside || X < 0 || X >= w || Y < 0 || Y >= horizon) continue;
      px(X, Y, Y >= cy ? CLOUD[0] : top ? CLOUD[2] : CLOUD[1]);
    }
  };
  cloud(w * 0.18, h * 0.1, 3, 1); cloud(w * 0.62, h * 0.07, 3, 1); cloud(w * 0.4, h * 0.16, 1, 0.8); cloud(w * 0.86, h * 0.19, 1, 0.7);
  for (let i = 0; i < 10; i++) cloud(w * (i / 9) + rnd() * 8 - 4, horizon - 8 - rnd() * 3, 1, 0.5);   // a thin far-off bank

  // ---- dunes, far to near: each farther row is smaller, flatter and more washed out by haze ----
  const dune = (peakX, height, halfW, pal, ripple) => {
    const peakY = horizon - height;
    for (let Y = Math.floor(peakY); Y < horizon + 1; Y++) {
      const t = (Y - peakY) / (horizon - peakY), half = halfW * Math.pow(t, 0.7);
      const crest = peakX + halfW * 0.55 * Math.pow(t, 1.4) - halfW * 0.08 * Math.sin(t * 3.1);
      for (let X = Math.floor(peakX - half); X <= peakX + half * 1.15; X++) {
        if (X < 0 || X >= w) continue;
        let col = X < crest ? pal.lit : pal.mid;
        if (X >= crest && X < crest + 1 + t * 3) col = pal.dark;
        px(X, Y, col);
      }
      if (ripple && rnd() < 0.04 && t > 0.4) {
        const rx = Math.floor(peakX - half * 0.6 + rnd() * half * 0.5);
        for (let k = 0; k < 3; k++) px(rx + k, Y - Math.floor(k / 2), pal.dark);
      }
    }
  };
  const far = haze(DUNE_BACK, 0.55), mid = haze(DUNE_BACK, 0.3), near = haze(DUNE_FRONT, 0.18);
  for (const [fx, ht, hw] of [[0.05, 12, 34], [0.3, 10, 30], [0.52, 13, 36], [0.78, 11, 32], [0.98, 12, 30]]) dune(w * fx, ht, hw, far, false);
  for (const [fx, ht, hw] of [[0.14, 15, 40], [0.45, 14, 38], [0.9, 16, 42]]) dune(w * fx, ht, hw, mid, true);
  for (const [fx, ht, hw] of [[0.28, 13, 44], [0.7, 18, 52]]) dune(w * fx, ht, hw, near, true);

  // ---- the sand floor in perspective ----
  for (let Y = horizon; Y < h; Y++) {
    const t = (Y - horizon) / (h - horizon), base = mix(SAND_FAR, SAND_NEAR, Math.pow(t, 0.6));
    for (let X = 0; X < w; X++) {
      let col = base;
      if (t < 0.06 && (X + Y) % 2) col = mix(base, SKY[3], 0.25);   // haze right at the horizon
      px(X, Y, col);
    }
    // wind streaks: thin and close together far away, longer and spaced out up close
    const n = Math.round(2 + t * 6);
    for (let i = 0; i < n; i++) {
      if (rnd() > 0.35 + t * 0.4) continue;
      const len = Math.round(1 + t * 6 + rnd() * t * 6), sx = Math.floor(rnd() * w);
      for (let k = 0; k < len; k++) px(sx + k, Y, mix(base, GRAIN, 0.35 + t * 0.5));
    }
  }
  // pebbles get bigger and darker toward the front
  for (let i = 0; i < 90; i++) {
    const t = Math.pow(rnd(), 0.7), Y = Math.floor(horizon + 3 + t * (h - horizon - 4)), X = Math.floor(rnd() * w);
    const col = mix(SAND_FAR, ROCK.mid, 0.4 + t * 0.6);
    px(X, Y, col); if (t > 0.6) px(X + 1, Y, col);
  }
  // rocks: rounded humps, outlined, lit from the upper left, sized by how close they are
  const rock = (cx, cy, r) => {
    for (let Y = cy - r; Y <= cy; Y++) for (let X = cx - r * 1.4; X <= cx + r * 1.4; X++) {
      const d = Math.hypot((X - cx) / 1.4, (Y - cy) * 1.1);
      if (d > r) continue;
      px(Math.round(X), Y, d > r - 1 ? ROCK.line : (X < cx - r * 0.2 && Y < cy - r * 0.4) ? ROCK.lit : Y > cy - 2 ? ROCK.dark : ROCK.mid);
    }
  };
  for (const [fx, fy] of [[0.06, 0.98], [0.62, 0.97], [0.41, 0.82], [0.87, 0.74], [0.2, 0.62], [0.74, 0.55], [0.5, 0.38], [0.11, 0.33], [0.93, 0.28]]) {
    const Y = Math.round(horizon + fy * (h - horizon) - 1), r = Math.max(2, Math.round(2 + fy * fy * 8));
    rock(Math.round(w * fx), Y, r);
  }

  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const o = out.getContext("2d"); o.imageSmoothingEnabled = false; o.drawImage(c, 0, 0, W, H);
  return out;
}
