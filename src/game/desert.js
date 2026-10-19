// Level 2 backdrop: a pixel-art desert under a greenish-blue sky, drawn once into a canvas the size of the screen.
// It is painted at half resolution (2x2 screen pixels per art pixel) for chunky pixel art.
// Sky: the four teal hues, darkest at the top (farther away) to lightest at the horizon, joined by checkerboard
// dither bands. Then soft teal clouds, two layers of dunes (pale tan behind, orange in front, each with a lit and a
// shaded face), and the flat sand floor the fight happens over, with pebbles and rocks.

const SKY = [[36, 110, 97], [38, 116, 103], [40, 122, 108], [42, 128, 113]];   // far (top) -> near (horizon)
const CLOUD = [[64, 148, 131], [92, 170, 153], [124, 192, 176]];               // shadow, body, highlight
const DUNE_BACK = { lit: [222, 196, 150], mid: [202, 172, 126], dark: [178, 146, 104] };
const DUNE_FRONT = { lit: [240, 168, 92], mid: [222, 140, 70], dark: [196, 112, 52] };
const SAND = [[240, 200, 128], [230, 186, 110], [218, 170, 96]];
const ROCK = { lit: [196, 150, 104], mid: [160, 116, 78], dark: [116, 80, 52], line: [74, 50, 34] };

export function makeDesert(W, H) {
  const w = Math.ceil(W / 2), h = Math.ceil(H / 2);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d");
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const px = (X, Y, col) => { x.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; x.fillRect(X, Y, 1, 1); };

  const horizon = Math.round(h * 0.6);     // where the dunes sit on the sand
  const floorTop = Math.round(h * 0.66);   // start of the flat sand floor
  // ---- sky: four bands, each boundary softened by a 2-row checker dither ----
  const skyH = horizon;
  for (let Y = 0; Y < skyH; Y++) {
    const f = Y / skyH * SKY.length, i = Math.min(SKY.length - 1, Math.floor(f)), frac = f - i;
    for (let X = 0; X < w; X++) {
      let col = SKY[i];
      if (i < SKY.length - 1 && frac > 0.82 && (X + Y) % 2 === 0) col = SKY[i + 1];
      if (i > 0 && frac < 0.1 && (X + Y) % 2 === 1) col = SKY[i - 1];
      px(X, Y, col);
    }
  }
  // ---- clouds: puffs built from overlapping circles, flat-bottomed, lit from above ----
  const cloud = (cx, cy, size) => {
    const blobs = [];
    for (let i = 0; i < 4 + size; i++) blobs.push([cx + (i - (3 + size) / 2) * (4 + size * 1.2) + rnd() * 3, cy - 1 - rnd() * size * 2.2, 4 + rnd() * (2 + size * 1.6)]);
    for (let Y = Math.floor(cy - size * 4 - 6); Y <= cy + 1; Y++) for (let X = Math.floor(cx - size * 8 - 10); X < cx + size * 8 + 10; X++) {
      let inside = false, top = false;
      for (const [bx, by, r] of blobs) { const d = Math.hypot(X - bx, Y - by); if (d <= r) { inside = true; if (Y < by - r * 0.35) top = true; } }
      if (!inside || X < 0 || X >= w || Y < 0) continue;
      px(X, Y, Y >= cy ? CLOUD[0] : top ? CLOUD[2] : CLOUD[1]);
    }
  };
  cloud(w * 0.2, h * 0.17, 3); cloud(w * 0.37, h * 0.23, 0); cloud(w * 0.64, h * 0.13, 3); cloud(w * 0.88, h * 0.28, 1);
  // a low bank of cloud along the horizon, behind the dunes
  for (let i = 0; i < 8; i++) cloud(w * (i / 7) + rnd() * 10 - 5, horizon - 24 - rnd() * 6, 3 + Math.round(rnd()));

  // ---- dunes: a peak with a lit left face and a shaded right face, a crest line between them ----
  const dune = (peakX, peakY, halfW, pal, ripple) => {
    for (let Y = Math.floor(peakY); Y < horizon + 2; Y++) {
      const t = (Y - peakY) / (horizon - peakY), half = halfW * Math.pow(t, 0.7);   // rounded shoulders, not a pyramid
      const crest = peakX + halfW * 0.55 * Math.pow(t, 1.4) - halfW * 0.08 * Math.sin(t * 3.1);   // the ridge curves down and to the right
      for (let X = Math.floor(peakX - half); X <= peakX + half * 1.15; X++) {
        if (X < 0 || X >= w) continue;
        let col = X < crest ? pal.lit : pal.mid;
        if (X >= crest && X < crest + 2 + t * 6) col = pal.dark;   // shadow under the crest
        px(X, Y, col);
      }
      if (ripple && rnd() < 0.05 && t > 0.3) {      // wind ripples on the lit face
        const rx = Math.floor(peakX - half * 0.6 + rnd() * half * 0.5);
        for (let k = 0; k < 4; k++) px(rx + k, Y - Math.floor(k / 2), pal.dark);
      }
    }
  };
  dune(w * 0.1, horizon - 40, 80, DUNE_BACK, true); dune(w * 0.46, horizon - 36, 76, DUNE_BACK, true);
  dune(w * 0.97, horizon - 32, 70, DUNE_BACK, false);
  dune(w * 0.25, horizon - 28, 74, DUNE_FRONT, true); dune(w * 0.74, horizon - 44, 100, DUNE_FRONT, true);

  // ---- the sand floor ----
  for (let Y = horizon; Y < h; Y++) for (let X = 0; X < w; X++) {
    const t = (Y - horizon) / (h - horizon);
    let col = SAND[0];
    if (Y < floorTop) col = (X + Y) % 2 ? SAND[0] : SAND[1];            // dithered strip where the dunes meet the floor
    else if (t > 0.55 && (X * 3 + Y * 5) % 11 === 0) col = SAND[2];     // grain, thicker toward the front
    else if (t > 0.3 && (X + Y * 7) % 23 === 0) col = SAND[1];
    px(X, Y, col);
  }
  // speckled streaks and pebbles
  for (let i = 0; i < 70; i++) {
    const X = Math.floor(rnd() * w), Y = Math.floor(floorTop + rnd() * (h - floorTop)), len = 1 + Math.floor(rnd() * 4);
    for (let k = 0; k < len; k++) px(X + k, Y, SAND[2]);
  }
  for (let i = 0; i < 26; i++) px(Math.floor(rnd() * w), Math.floor(floorTop + rnd() * (h - floorTop)), ROCK.mid);
  // rocks: rounded humps, outlined, lit from the upper left
  const rock = (cx, cy, r) => {
    for (let Y = cy - r; Y <= cy; Y++) for (let X = cx - r * 1.4; X <= cx + r * 1.4; X++) {
      const d = Math.hypot((X - cx) / 1.4, (Y - cy) * 1.1);
      if (d > r) continue;
      const edge = d > r - 1;
      px(Math.round(X), Y, edge ? ROCK.line : (X < cx - r * 0.2 && Y < cy - r * 0.4) ? ROCK.lit : Y > cy - 2 ? ROCK.dark : ROCK.mid);
    }
  };
  rock(Math.round(w * 0.05), h - 4, 11); rock(Math.round(w * 0.12), h - 2, 6); rock(Math.round(w * 0.41), h - 30, 7);
  rock(Math.round(w * 0.62), h - 6, 9); rock(Math.round(w * 0.7), h - 9, 5); rock(Math.round(w * 0.87), floorTop + 24, 6);
  rock(Math.round(w * 0.2), floorTop + 12, 4);

  // scale up 2x with crisp pixels
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const o = out.getContext("2d"); o.imageSmoothingEnabled = false; o.drawImage(c, 0, 0, W, H);
  return out;
}
