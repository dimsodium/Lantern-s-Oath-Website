// Shared constants and math helpers.
// The game runs at a fixed logical height (960) and is scaled to fit the screen.
// The logical width adapts to the window shape so the play area fills the screen
// (ES module live binding: every importer sees the updated W).
export let W = 720;
export const H = 960;
export const MIN_W = 600;
export const MAX_W = 1600;
export function setLogicalWidth(w) {
  W = Math.round(Math.min(MAX_W, Math.max(MIN_W, w)));
  return W;
}

export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};
export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

// Squared distance from point P to segment AB.
export function segDist2(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len = abx * abx + aby * aby || 1;
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / len, 0, 1);
  return dist2(px, py, ax + abx * t, ay + aby * t);
}

// Weighted random choice from { key: weight } map.
export function weighted(map) {
  const entries = Object.entries(map);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}
