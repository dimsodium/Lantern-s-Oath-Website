// Sprite loading and baking: pixel-map sprites, the Lantern's eight-direction models and animations,
// Otto Zundapt cut into animatable parts, the forcefield and the saw blade.
import { C, T } from "./config.js";
import { PIXEL_SPRITES, OTTO_FRONT, OTTO_DIRS, HERO_DIRS, LANTERN, HERO_FLY, HERO_CHARGE, HERO_HUMAN, HERO_CHARGE_HUMAN, HERO_ANIM, MANHUNTER, TORNADO, BOLTS } from "./assets.js";

// ---------- Sprites ----------
export const ART = {}, FLASH = {};
// Filled in as the images load; the game reads them every frame (ES module live bindings).
export let bigRat = null, bigRatFlash = null, shieldImg = null, hero = null, guideLantern = null;
function bake(rows, tint, flip) {
  const c = document.createElement("canvas");
  c.width = rows[0].length; c.height = rows.length;
  const x = c.getContext("2d");
  const pal = PIXEL_SPRITES.pal;
  rows.forEach((row, y) => [...row].forEach((ch, i) => {
    if (ch === ".") return;
    x.fillStyle = tint || pal[ch];
    x.fillRect(flip ? c.width - 1 - i : i, y, 1, 1);
  }));
  return c;
}
// Volume for the Lantern's flat sprites, applied after any mirroring so the light always comes from the upper left:
// every part of him (each region bounded by his outline or a darker inner line) gets a lit top-left edge and a
// shaded bottom-right edge, his body rounds off like a cylinder across each row, and shade gathers toward his boots.
function shade3d(img) {
  const c = document.createElement("canvas"), w = img.width, h = img.height;
  c.width = w; c.height = h;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, w, h), a = d.data, n = w * h;
  const op = new Uint8Array(n), lum = new Float32Array(n), inner = new Uint8Array(n);
  for (let i = 0; i < n; i++) { op[i] = a[i * 4 + 3] > 0 ? 1 : 0; lum[i] = 0.3 * a[i * 4] + 0.59 * a[i * 4 + 1] + 0.11 * a[i * 4 + 2]; }
  const O = (X, Y) => X >= 0 && Y >= 0 && X < w && Y < h && op[Y * w + X];
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) inner[Y * w + X] = O(X, Y) && O(X - 1, Y) && O(X + 1, Y) && O(X, Y - 1) && O(X, Y + 1) ? 1 : 0;
  const wall = (X, Y, dx, dy) => { const nx = X + dx, ny = Y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) return true; const j = ny * w + nx; return !inner[j] || lum[j] < lum[Y * w + X] * 0.62; };
  for (let Y = 0; Y < h; Y++) {
    let x0 = -1, x1 = -1;
    for (let X = 0; X < w; X++) if (op[Y * w + X]) { if (x0 < 0) x0 = X; x1 = X; }
    const span = Math.max(1, x1 - x0), row = 1.06 - 0.16 * (Y / Math.max(1, h - 1));
    for (let X = 0; X < w; X++) {
      const i = Y * w + X;
      if (!inner[i] || lum[i] >= 245) continue;
      const ul = wall(X, Y, 0, -1) || wall(X, Y, -1, 0), dr = wall(X, Y, 0, 1) || wall(X, Y, 1, 0);
      let k = 1;
      k += ul ? 0.2 : (wall(X, Y, 0, -2) || wall(X, Y, -2, 0)) ? 0.08 : 0;
      k -= dr ? 0.2 : (wall(X, Y, 0, 2) || wall(X, Y, 2, 0)) ? 0.08 : 0;
      k *= row;
      if (x1 - x0 >= 2) k *= 1.07 - 0.17 * Math.pow(Math.min(1, Math.max(0, (X - x0) / span)), 1.4);
      const add = k > 1 ? 6 : 0;
      for (let c2 = 0; c2 < 3; c2++) a[i * 4 + c2] = Math.max(0, Math.min(255, a[i * 4 + c2] * k + add));
    }
  }
  x.putImageData(d, 0, 0);
  return c;
}
export function tintCanvas(img, color) {
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
// The forcefield is built from bricks of ring light: rings of staggered bricks around him, bright mortar between
// them. As it takes hits, whole bricks fall out and the rim breaks in pieces.
function makeShield(R, crack = 0) {
  const size = R * 2 + 1, c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d"), BH = 5, BW = 9;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const dx = px - R, dy = py - R, d = Math.hypot(dx, dy);
    if (d > R) continue;
    const rim = d / R, ring = Math.floor(d / BH), inR = d - ring * BH;
    const circ = Math.max(1, 2 * Math.PI * (ring + 0.5) * BH), n = ring === 0 ? 1 : Math.max(3, Math.round(circ / BW));
    const u = ((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * n + (ring % 2 ? 0.5 : 0);
    const brick = Math.floor(u), along = (u - brick) * (circ / n);   // px from the brick's leading edge
    const mortar = ring > 0 && (inR < 1 || along < 1);
    const cellH = Math.abs(Math.sin(ring * 12.9898 + (brick % n) * 78.233) * 43758.5453) % 1;
    const segH = Math.abs(Math.sin(Math.floor((Math.atan2(dy, dx) + Math.PI) * 3) * 91.17) * 3758.5) % 1;
    if (crack > 0 && d <= R - 1.2 && ring > 0 && cellH < crack * 0.6) {
      // a missing brick leaves a dark hole with a jagged edge
      if (mortar) { x.globalAlpha = 0.9; x.fillStyle = C.deep; x.fillRect(px, py, 1, 1); }
      continue;
    }
    if (crack > 0 && d > R - 1.2 && segH < crack * 0.5) continue;
    let col, a;
    if (d > R - 1.2) { col = C.bright; a = 1; }
    else if (mortar) { col = rim > 0.6 ? C.bright : C.green; a = 0.6 + rim * 0.35; }
    else {
      // brick face: lit along its top/leading edge, darker toward the back
      const lit = inR > BH - 2 || along < 2.2;
      col = lit ? C.green : C.deep; a = (lit ? 0.32 : 0.22) + rim * rim * 0.3;
    }
    if (dx < -R * 0.3 && dy < -R * 0.3 && d > R * 0.55 && d < R * 0.75 && !mortar) { col = C.white; a = 0.7; }
    x.globalAlpha = a; x.fillStyle = col; x.fillRect(px, py, 1, 1);
  }
  return c;
}
// A grey circular saw blade, drawn pixel by pixel so it stays crisp.
function makeSaw(R) {
  const size = R * 2 + 3, c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d"), N = 10, m = R + 1;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const dx = px - m, dy = py - m, d = Math.hypot(dx, dy);
    const th = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2) * N;
    const edge = R - 2.4 + 2.6 * (th - Math.floor(th)); // sawtooth teeth
    if (d > edge + 0.6) continue;
    let col;
    if (d > edge - 0.6) col = "#1b1b23";
    else if (d > R - 3.2) col = (th - Math.floor(th)) > 0.6 ? "#e3e8ec" : "#a9b1b8";
    else if (d > R - 4.4) col = "#5d656d";
    else if (d > 3.2) col = (dx + dy < -2) ? "#9aa3ab" : "#7d868e";
    else if (d > 2) col = "#2c3238";
    else col = "#c9d0d6";
    x.fillStyle = col; x.fillRect(px, py, 1, 1);
  }
  return c;
}
// Otto Zundapt is cut into parts so he can animate: head, each gold arm, and the coat and legs. Arm pixels are
// the non-white ones out at his sides (the white lab coat stays with the body).
export let ottoParts = null;
export const ottoDirs = {};
function splitOtto(src, imgs) {
  const w = src.width, h = src.height, c0 = document.createElement("canvas"); c0.width = w; c0.height = h;
  const x0 = c0.getContext("2d"); x0.drawImage(src, 0, 0); const px = x0.getImageData(0, 0, w, h).data;
  const coat = (i) => Math.min(px[i], px[i + 1], px[i + 2]) > 105 && Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]) < 45;
  const cls = (x, y, i) => y < 17 ? "head" : y >= 61 ? "body"
    : (x <= (y < 38 ? 16 : 13) && (x < 11 || !coat(i))) ? "armL"
    : (x >= (y < 38 ? 39 : 41) && (x >= 43 || !coat(i))) ? "armR" : "body";
  return imgs.map((img) => {
    const out = {}, d = document.createElement("canvas"); d.width = w; d.height = h; const dx = d.getContext("2d"); dx.drawImage(img, 0, 0);
    const all = dx.getImageData(0, 0, w, h);
    for (const k of ["head", "body", "armL", "armR"]) {
      const c = document.createElement("canvas"); c.width = w; c.height = h; const cx = c.getContext("2d"), id = cx.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (px[i + 3] && cls(x, y, i) === k) for (let j = 0; j < 4; j++) id.data[i + j] = all.data[i + j]; }
      cx.putImageData(id, 0, 0); out[k] = c;
    }
    return out;
  });
}
export function loadArt() {
  if (ART.down0) return;
  loadLevel2Art();
  const m = PIXEL_SPRITES.maps;
  // The rats' side punch with their metal arm: cocked back behind the body, swept round the front, then a hook
  // thrown out to the side. Built from the standing rat by swapping the arm rows.
  const ratEdit = (rows) => { const a = m.rat0.slice(); for (const k in rows) a[k] = rows[k]; return a; };
  m.ratWind = ratEdit({ 14: "kkkkk.kOOOOOOk........", 15: "kMMNMkOQOOOOOk........", 16: "kNMMMkOQOOOOOk........", 17: ".kkkkkfQOOOOOk........", 18: ".....kkQOOOOOk........" });
  m.ratSweep = ratEdit({ 16: ".....kOQOOOOkkkkk.....", 17: ".....kfQOOOOOkMMMMk...", 18: ".....kkQOOOOOkMNMMk...", 19: "......kQQQQQQkkkkk...." });
  m.ratHook = ratEdit({ 14: "......kOOOOOOk...kkkk.", 15: ".....kOQOOOOOkkkkkMMMk", 16: ".....kOQOOOOkMMMMMMNMk", 17: ".....kfQOOOOOkNMMNMMMk", 18: ".....kkQOOOOOk...kkkk." });
  for (const k in m) { ART[k] = bake(m[k]); FLASH[k] = bake(m[k], "#ffffff"); }
  ART.left0 = bake(m.right0, null, true); ART.left1 = bake(m.right1, null, true);
  FLASH.left0 = bake(m.right0, "#ffffff", true); FLASH.left1 = bake(m.right1, "#ffffff", true);
  for (const k of ["rat0", "rat1", "ratAtk", "ratWind", "ratSweep", "ratHook"]) { ART[k + "L"] = bake(m[k], null, true); FLASH[k + "L"] = bake(m[k], "#ffffff", true); }
  shieldImg = [0, 0.3, 0.55, 0.8].map((k) => makeShield(T.shield.r, k));
  ART.saw = makeSaw(T.boss.sawR);
  // The Lantern: eight models from the reference art. The left-facing three are the right-facing ones mirrored.
  const flip = (src) => { const c = document.createElement("canvas"); c.width = src.width; c.height = src.height; const x = c.getContext("2d"); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; };
  const dirs = HERO_DIRS, want = ["down", "downright", "right", "upright", "up", "fist"], got = {};
  for (const k of want) {
    const im = new Image();
    im.onload = () => {
      got[k] = im;
      if (want.every((n) => got[n])) {
        const h = { fist: got.fist, flash: {}, ghost: {} };
        for (const d of want) if (d !== "fist") { h[d] = shade3d(got[d]); h.flash[d] = tintCanvas(got[d], "#ffffff"); h.ghost[d] = tintCanvas(got[d], "#2fd85f"); }
        for (const d of ["right", "downright", "upright"]) { const l = d.replace("right", "left"); h[l] = shade3d(flip(got[d])); h.flash[l] = flip(h.flash[d]); h.ghost[l] = flip(h.ghost[d]); }
        // Fast-flight pose (Shift): arms straight down with fists, legs together
        h.fly = {}; h.flyGlow = {};
        const fd = HERO_FLY || {};
        for (const d of Object.keys(fd)) {
          const fi = new Image();
          fi.onload = () => {
            h.fly[d] = shade3d(fi); h.flyGlow[d] = tintCanvas(fi, "#8dffad");
            if (d.includes("right")) { const l = d.replace("right", "left"); h.fly[l] = shade3d(flip(fi)); h.flyGlow[l] = flip(h.flyGlow[d]); }
          };
          fi.src = fd[d];
        }
        // Human form when the ring is empty (build-tools/human.py), and its recharge pose
        h.human = {}; h.humanFlash = {};
        const hd = HERO_HUMAN || {};
        for (const d of Object.keys(hd)) {
          const hi = new Image();
          hi.onload = () => {
            h.human[d] = shade3d(hi); h.humanFlash[d] = tintCanvas(hi, "#ffffff");
            if (d.includes("right")) { const l = d.replace("right", "left"); h.human[l] = shade3d(flip(hi)); h.humanFlash[l] = flip(h.humanFlash[d]); }
          };
          hi.src = hd[d];
        }
        if (HERO_CHARGE_HUMAN) {
          const hc = new Image();
          hc.onload = () => { h.humanChargeFlash = [hc, flip(hc)].map((c) => tintCanvas(c, "#ffffff")); h.humanCharge = [shade3d(hc), shade3d(flip(hc))]; };
          hc.src = HERO_CHARGE_HUMAN;
        }
        // Lantern's Oath recharge pose, holding the power battery (build-tools/charge_pose.py)
        if (HERO_CHARGE) {
          const ci = new Image();
          ci.onload = () => { const raw = [ci, flip(ci)]; h.charge = raw.map(shade3d); h.chargeFlash = raw.map((c) => tintCanvas(c, "#ffffff")); h.chargeGlow = raw.map((c) => tintCanvas(c, "#8dffad")); };
          ci.src = HERO_CHARGE;
        }
        // Frame animations (build-tools/anim.py): punch, idle breathing and the Oath power-up, suit and human
        h.anim = {};
        const an = HERO_ANIM || {};
        const loadSeq = (urls, done) => { const out = []; urls.forEach((u, i) => { const im2 = new Image(); im2.onload = () => { out[i] = im2; if (out.filter(Boolean).length === urls.length) done(out); }; im2.src = u; }); };
        for (const set of ["punch", "idle", "punchHuman", "idleHuman", "onetwo", "onetwoHuman"]) {
          h.anim[set] = {};
          for (const d of Object.keys(an[set] || {})) loadSeq(an[set][d], (fr) => {
            h.anim[set][d] = fr.map(shade3d);
            if (d.includes("right")) h.anim[set][d.replace("right", "left")] = fr.map((f) => shade3d(flip(f)));
          });
        }
        if (an.bmp) loadSeq(an.bmp, (fr) => { h.anim.bmp = fr.map(shade3d); });   // Beware My Power: arms cross into an X, then break apart
        for (const set of ["oath", "oathHuman"]) if (an[set]) loadSeq(an[set], (fr) => { h.anim[set] = [fr.map(shade3d), fr.map((f) => shade3d(flip(f)))]; });
        h.onetwoRing = an.onetwoRing || null;
        h.animFps = an.fps || { idle: 6, oath: 10 };
        hero = h;
      }
    };
    im.src = dirs[k];
  }
  guideLantern = new Image(); guideLantern.src = LANTERN;
  bigRat = new Image();
  bigRat.onload = () => { bigRatFlash = tintCanvas(bigRat, "#ffffff"); ottoParts = splitOtto(bigRat, [bigRat, bigRatFlash]); };
  // Otto from every direction (build-tools/otto_ref.py): his front, back, right and left views from the user's
  // turnaround sheet, in parts so he animates. A diagonal names the view it uses; a view the sheet lacks is mirrored.
  const od = OTTO_DIRS || {};
  const flipC = (src) => { const c = document.createElement("canvas"); c.width = src.width; c.height = src.height; const x = c.getContext("2d"); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; };
  const alias = () => { for (const d of Object.keys(od)) if (typeof od[d] === "string" && ottoDirs[od[d]]) ottoDirs[d] = ottoDirs[od[d]]; };
  for (const d of Object.keys(od)) {
    const m = od[d];
    if (typeof m === "string") continue;
    const parts = {}, keys = Object.keys(m.parts);
    let left = keys.length;
    for (const k of keys) {
      const im = new Image();
      im.onload = () => {
        parts[k] = im;
        if (--left) return;
        const flash = {}; for (const kk of keys) flash[kk] = tintCanvas(parts[kk], "#ffffff");
        ottoDirs[d] = { parts, flash, order: m.order, eye: m.eye, jets: m.jets || [19, 35], launcher: m.launcher || null };
        const l = d.replace("right", "left");
        if (d.includes("right") && !od[l]) {
          // mirrored: what was on screen-left is now on screen-right
          const sw = { armL: "armR", armR: "armL" }, mp = {}, mf = {};
          for (const kk of keys) { mp[sw[kk] || kk] = flipC(parts[kk]); mf[sw[kk] || kk] = flipC(flash[kk]); }
          ottoDirs[l] = { parts: mp, flash: mf, order: m.order.map((o) => sw[o] || o), eye: m.eye && [im.width - m.eye[0], m.eye[1]], jets: (m.jets || [19, 35]).map((j) => im.width - j) };
        }
        alias();
      };
      im.src = m.parts[k];
    }
  }
  bigRat.src = OTTO_FRONT;
}

// ---- Level 2: Manhunters, tornadoes, laser shots ----
// mhDirs[dir] = { parts, flash, order, shoulder, hand, eye } for all eight facings. A left-facing view is the
// matching right-facing one mirrored: what was on screen-left moves to screen-right, so the arms swap names.
export const mhDirs = {};
export const tornadoImgs = [];
// the same frames recoloured green (keeping their light and shade) for a tornado turned by the ring beam
export const tornadoGreen = [];
function greenCopy(img) {
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    const L = (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11) / 255;
    // the ring's green, #2fd85f (47, 216, 95): shaded darker in the funnel's shadows, lighter on its highlights
    const k = 1 + 1.6 * (L - 0.32), hi = Math.max(0, k - 1) * 0.5;
    a[i] = Math.min(255, Math.round(47 * Math.min(k, 1) + 208 * hi)); a[i + 1] = Math.min(255, Math.round(216 * Math.min(k, 1) + 39 * hi)); a[i + 2] = Math.min(255, Math.round(95 * Math.min(k, 1) + 160 * hi));
  }
  x.putImageData(d, 0, 0); return c;
}
export const boltImgs = {};
function loadLevel2Art() {
  const W = MANHUNTER.meta.size[0];
  const flip = (src) => { const c = document.createElement("canvas"); c.width = src.width; c.height = src.height; const x = c.getContext("2d"); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; };
  for (const d of Object.keys(MANHUNTER.parts)) {
    const urls = MANHUNTER.parts[d], m = MANHUNTER.meta.dirs[d], parts = {};
    let left = Object.keys(urls).length;
    for (const k of Object.keys(urls)) {
      const im = new Image();
      im.onload = () => {
        parts[k] = im;
        if (--left) return;
        const flash = {}; for (const kk of Object.keys(parts)) flash[kk] = tintCanvas(parts[kk], "#ffffff");
        mhDirs[d] = { parts, flash, order: m.order, shoulder: m.shoulder, hand: m.hand, eye: m.eye };   // (right/left also have stun_half / stun_kneel: the side-on stun frames)
        if (d.includes("right")) {
          const sw = { armL: "armR", armR: "armL" }, mp = {}, mf = {}, sh = {}, hd = {};
          for (const kk of Object.keys(parts)) { mp[sw[kk] || kk] = flip(parts[kk]); mf[sw[kk] || kk] = flip(flash[kk]); }
          for (const a of ["armL", "armR"]) { sh[sw[a]] = [W - m.shoulder[a][0], m.shoulder[a][1]]; hd[sw[a]] = [W - m.hand[a][0], m.hand[a][1]]; }
          mhDirs[d.replace("right", "left")] = { parts: mp, flash: mf, order: m.order.map((o) => sw[o] || o), shoulder: sh, hand: hd,
            eye: m.eye && m.eye.map(([ex, ey]) => [W - ex, ey]) };
        }
      };
      im.src = urls[k];
    }
  }
  TORNADO.forEach((u, i) => { const im = new Image(); im.onload = () => { tornadoGreen[i] = greenCopy(im); }; im.src = u; tornadoImgs[i] = im; });
  for (const k of Object.keys(BOLTS)) { const im = new Image(); im.src = BOLTS[k]; boltImgs[k] = im; }
}
