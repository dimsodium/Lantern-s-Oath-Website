// Lantern's Oath — Level 1: Space Rat Attack, then Level 2: the desert and the Manhunters.
// Top-down, Pokemon Diamond/Pearl style movement through a starlit station deck.
// Usage: const game = createGame(canvas, { pilot, testBoss, onLevelEnd({ level, score, bossDefeated }), onQuit() });
//        game.destroy() when leaving the page.
import { W, H, C, T, BOSS_STOP, FLOW, L2 } from "./config.js";
import { ART, FLASH, bigRat, bigRatFlash, shieldImg, hero, guideLantern, ottoParts, ottoDirs, tintCanvas, loadArt, mhDirs, tornadoImgs, boltImgs } from "./art.js";
import { makeDesert, floorY } from "./desert.js";
import { audio } from "../site/audio.js";

const SFX = (n, a) => audio.sfx(n, a);

export function createGame(canvas, opts = {}) {
  loadArt();
  // Test Boss Fight (Options on the home page): start straight in Otto Zundapt's arena, exactly like level 1's
  // boss fight. Nothing is saved to progress or scores.
  let testBoss = !!opts.testBoss;
  try { if (sessionStorage.getItem("lo-test-boss") === "1") { testBoss = true; sessionStorage.removeItem("lo-test-boss"); } } catch (e) {}
  // Test Level 2 (home Options or the pause menu): straight into the desert fight. Nothing is saved.
  let testL2 = !!opts.testLevel2;
  try { if (sessionStorage.getItem("lo-test-level2") === "1") { testL2 = true; testBoss = false; sessionStorage.removeItem("lo-test-level2"); } } catch (e) {}
  let resumeLevel = 1, desertImg = null;   // once a run reaches level 2, a retry starts there
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const keys = new Set();
  const pressed = new Set();
  let s, raf = 0, last = 0, destroyed = false;

  const stars = Array.from({ length: 700 }, () => ({
    x: Math.random() * W, y: Math.random() * H * 3, z: 0.15 + Math.random() * 0.5, g: Math.random() < 0.12, tw: Math.random() * 6,
  }));

  // Player settings from the pause menu, remembered in this browser when storage is available
  const settings = { shake: true, manyStars: true, noMogo: false, music: true, sfx: true, musicVol: 1, sfxVol: 1 };
  try { Object.assign(settings, JSON.parse(localStorage.getItem("lo-settings") || "{}")); } catch (e) {}
  const saveSettings = () => { try { localStorage.setItem("lo-settings", JSON.stringify(settings)); } catch (e) {} };
  let menu = null; // pause menu page: null (main), "options", "controls", "settings", or "background" / "sound" (under settings)
  const pause = () => { s.mode = "paused"; menu = null; keys.clear(); };
  const resume = () => { s.mode = "play"; menu = null; keys.clear(); };

  function reset() {
    s = {
      mode: "title", t: 0, score: 0, camY: 0,
      waveOn: false, spawnT: 0.6, goT: 0, kills: 0,
      p: { x: W / 2, y: H - 30, dir: "up", aim: -Math.PI / 2, walk: 0, moving: false, hp: T.hp, charge: T.charge, bmp: 0,
        inv: 0, flash: 0, drainT: 0, shield: false, shieldHp: T.shield.hp, shieldDown: 0, rope: null, beam: false, punch: null, cd: 0, boulderCd: 0, ropeCd: 0, bmpAnim: 0, hitList: null },
      rats: [], boulders: [], blades: [], fx: [], rings: [], boss: null, banner: null,
      endTimer: 0, reported: false, shake: 0, whiteout: 0, ghosts: [], bmpWave: null, laserHitT: 0, test: testBoss || testL2,
      level: 1, l2: null, hunters: [], tornados: [], bolts: [], meleeOwner: null,
    };
    if (testBoss) { s.camY = BOSS_STOP; s.p.y = BOSS_STOP + H - 40; }
    if (testL2 || resumeLevel === 2) enterLevel2(true);
  }
  reset();

  // ---------- Helpers ----------
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const center = (e, h) => ({ x: e.x, y: e.y - h / 2 });
  function sparks(x, y, color, n = 10, sp = 80) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = sp * (0.3 + Math.random());
      s.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3 + Math.random() * 0.35, color });
    }
  }
  function useCharge(n) {
    if (s.p.charge < n) return false;
    s.p.charge -= n; s.p.drainT = T.regenDelay;
    return true;
  }
  function hurtPlayer(n, fromX, fromY) {
    const p = s.p;
    if (p.inv > 0 || p.bmpAnim > 0 || s.mode !== "play") return;
    if (p.oath && p.oath.safe) { p.oathHit = 0.25; return; }   // powered down and reciting the Oath: nothing gets through
    if (p.recharge && (p.lanternHp || 0) > 0 && p.lanternA > 0.3) {
      // the lantern construct around him is a forcefield: it takes the hit (3 in all), then shatters
      p.lanternHp--; p.oathHit = 0.25; p.inv = 0.35; s.shake = Math.max(s.shake, 0.08);
      const a = Math.atan2(fromY - (p.y - 22), fromX - p.x);
      sparks(p.x + Math.cos(a) * 26, p.y - 22 + Math.sin(a) * 30, C.bright, 10, 90);
      if (p.lanternHp <= 0) {
        s.shake = 0.2; sparks(p.x, p.y - 22, C.bright, 26, 150); sparks(p.x, p.y - 22, "#ffffff", 10, 120);
        s.rings.push({ x: p.x, y: p.y - 22, r: 10, life: 0.25, sp: 160, thin: true });
      }
      return;
    }
    p.hp = Math.max(0, p.hp - n); p.inv = 0.7; p.flash = 0.15; s.shake = 0.18; SFX("hurt");
    if (p.recharge) p.rechargeLock = T.recharge.hitLock;   // a hit knocks him out of recharging
    const a = Math.atan2(p.y - fromY, p.x - fromX);
    // knocked back smoothly over a few frames instead of teleporting 8px
    p.kvx = Math.cos(a) * 110; p.kvy = Math.sin(a) * 110;
    sparks(p.x, p.y - 24, C.hp, 8, 70);
    if (p.hp <= 0) {
      s.mode = "over"; s.endTimer = 0; sparks(p.x, p.y - 24, C.green, 30, 120); report(false);
    }
  }
  // The forcefield soaks up hits and slowly breaks apart; at zero it shatters for a moment.
  function hitShield(n) {
    const p = s.p;
    p.shieldHp -= n;   // silent: no hit sound on the forcefield (it still makes its shatter sound)
    if (p.shieldHp <= 0) {
      p.shieldHp = 0; p.shield = false; p.shieldDown = T.shield.broken; s.shake = 0.25;
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2;
        s.fx.push({ x: p.x + Math.cos(a) * T.shield.r, y: p.y - 28 + Math.sin(a) * T.shield.r, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.5 + Math.random() * 0.3, color: i % 3 ? C.green : C.bright });
      }
      s.banner = { text: "FORCEFIELD BROKEN", t: 1.1 }; SFX("shieldBreak");
    }
  }
  function report(bossDefeated) {
    const level = s.level || 1;
    if (s.reported === level) return;
    s.reported = level;
    if (s.test) return;   // a test fight doesn't count toward progress
    opts.onLevelEnd?.({ level, score: s.score, bossDefeated });
  }
  function gainBmp(n) { s.p.bmp = Math.min(100, s.p.bmp + n); }
  function hitRat(r, dmg, kx, ky) {
    if (r.hp <= 0) return;
    r.hp -= dmg; r.flash = 0.1; r.stun = 0.28; r.kx = kx; r.ky = ky;
    r.state = "walk"; r.t = 0;
    sparks(r.x, r.y - 12, C.bright, 5, 60);
    if (r.hp <= 0) {
      s.score += 100; gainBmp(T.bmp.perKill); SFX("ratDie");
      sparks(r.x, r.y - 12, "#c3c9ce", 14, 100); sparks(r.x, r.y - 12, "#8a6644", 8, 70);
    }
  }
  function hitBoss(dmg) {
    const b = s.boss;
    if (!b || b.state === "enter" || b.state === "dead") return;
    b.hp = Math.max(0, b.hp - dmg); b.flash = 0.08;
    s.score += Math.round(dmg * 10); gainBmp(dmg * T.bmp.perBossHp);
    if (b.hp <= 0) {
      b.state = "dead"; b.t = 0; s.blades = []; s.shake = 0.5;
    }
  }
  // Hitbox helpers: rats ~ 14x22 at the feet; the boss ~ 40x66.
  // Enemy hitboxes are fitted to the solid pixels of the enemy's own sprite, so the box
  // always has the body's proportions. Every enemy type should build its box with spriteBox().
  const bodyCache = new WeakMap();
  function bodyBounds(img) {
    let b = bodyCache.get(img);
    if (b) return b;
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 40) {
      if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    b = x1 < 0 ? { x0: 0, y0: 0, x1: img.width - 1, y1: img.height - 1 } : { x0, y0, x1, y1 };
    bodyCache.set(img, b);
    return b;
  }
  // Box for a sprite drawn with its top-left corner at (left, top)
  function spriteBox(img, left, top) {
    const b = bodyBounds(img);
    return { x: left + (b.x0 + b.x1 + 1) / 2, y: top + (b.y0 + b.y1 + 1) / 2, w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1 };
  }
  const RAT_LIFT = 5, BOSS_LIFT = 8;
  const ratBox = (r) => { const img = ART[r.face < 0 ? "rat0L" : "rat0"]; return spriteBox(img, r.x - img.width / 2, r.y - img.height - RAT_LIFT); };
  // Otto's hitbox is his drawn model, pixel for pixel (coat, head, gold arms, booster feet, for the way he faces),
  // grown outward by a pad where a hit should count when it only grazes him. A distance field per facing makes
  // that a single lookup. Point hits use bossHit; the box (the model's own bounds) is for the beam and bumping.
  const BPAD = 24, ottoMasks = {};
  function ottoMask(dir) {
    if (ottoMasks[dir]) return ottoMasks[dir];
    const m = ottoDirs[dir];
    if (!m) return null;
    const pw = m.parts.body.width, ph = m.parts.body.height, W2 = pw + BPAD * 2, H2 = ph + BPAD * 2;
    const c = document.createElement("canvas"); c.width = W2; c.height = H2;
    const x = c.getContext("2d");
    for (const k of Object.keys(m.parts)) x.drawImage(m.parts[k], BPAD, BPAD);
    const a = x.getImageData(0, 0, W2, H2).data, d = new Float32Array(W2 * H2);
    let x0 = W2, x1 = -1, y0 = H2, y1 = -1;
    for (let i = 0; i < W2 * H2; i++) {
      if (a[i * 4 + 3] > 0) { d[i] = 0; const X = i % W2, Y = (i / W2) | 0; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); }
      else d[i] = 1e9;
    }
    // two-pass chamfer distance (1, 1.414) from every pixel to his nearest opaque pixel
    const D = 1.414;
    for (let Y = 0; Y < H2; Y++) for (let X = 0; X < W2; X++) {
      const i = Y * W2 + X; let v = d[i];
      if (X > 0) v = Math.min(v, d[i - 1] + 1);
      if (Y > 0) { v = Math.min(v, d[i - W2] + 1); if (X > 0) v = Math.min(v, d[i - W2 - 1] + D); if (X < W2 - 1) v = Math.min(v, d[i - W2 + 1] + D); }
      d[i] = v;
    }
    for (let Y = H2 - 1; Y >= 0; Y--) for (let X = W2 - 1; X >= 0; X--) {
      const i = Y * W2 + X; let v = d[i];
      if (X < W2 - 1) v = Math.min(v, d[i + 1] + 1);
      if (Y < H2 - 1) { v = Math.min(v, d[i + W2] + 1); if (X < W2 - 1) v = Math.min(v, d[i + W2 + 1] + D); if (X > 0) v = Math.min(v, d[i + W2 - 1] + D); }
      d[i] = v;
    }
    return (ottoMasks[dir] = { W2, H2, d, box: { x0: x0 - BPAD, x1: x1 - BPAD, y0: y0 - BPAD, y1: y1 - BPAD } });
  }
  const bossBox = (b) => {
    const mk = ottoMask(b.dir || "down"), left = b.x - 26, top = b.y - 73 - (b.lift ?? BOSS_LIFT);
    if (mk) { const q = mk.box; return { x: left + (q.x0 + q.x1 + 1) / 2, y: top + (q.y0 + q.y1 + 1) / 2, w: q.x1 - q.x0 + 1, h: q.y1 - q.y0 + 1 }; }
    return (bigRat && bigRat.complete && bigRat.width) ? spriteBox(bigRat, left, top) : { x: b.x, y: b.y - 36, w: 40, h: 66 };
  };
  // Is (px, py) on Otto, or within pad pixels of him?
  function bossHit(b, px, py, pad = 0) {
    const mk = ottoMask(b.dir || "down");
    if (!mk) return inBox(px, py, bossBox(b), pad);
    const X = Math.round(px - (b.x - 26)) + BPAD, Y = Math.round(py - (b.y - 73 - (b.lift ?? BOSS_LIFT))) + BPAD;
    if (X < 0 || Y < 0 || X >= mk.W2 || Y >= mk.H2) return false;
    return mk.d[Y * mk.W2 + X] <= Math.min(pad, BPAD - 1);
  }
  const inBox = (px, py, bx, pad = 0) => Math.abs(px - bx.x) < bx.w / 2 + pad && Math.abs(py - bx.y) < bx.h / 2 + pad;
  // The Lantern aims along p.aim (radians). The sprite shows the nearest of 4 directions.
  const aimVec = (a = s.p.aim) => [Math.cos(a), Math.sin(a)];
  const DIR8 = ["right", "downright", "down", "downleft", "left", "upleft", "up", "upright"];
  const dirOf = (a) => DIR8[Math.round((((a * 180) / Math.PI) % 360 + 360) % 360 / 45) % 8];
  // The power ring sits on the Lantern's right glove; every construct comes out of it.
  // The ring is on his left hand, the grey fist held out in front (between pixels 23 and 24 of row 22 in every model).
  const facingLeft = () => (s.p.bodyDir || s.p.dir || "").includes("left");
  const PUNCH_ARM = [[-1, 1], [3, 0], [2, 0], [1, 0]];
  const punchFrame = (pu) => Math.min(3, Math.floor(pu.t / T[pu.kind].time * 4));
  const oneTwoFrame = (pu) => Math.min(5, Math.floor(pu.t / T.punch.time * 6));   // the 6-frame one-two (build-tools/anim.py)
  const sprArms = (pu) => !!(pu && pu.kind === "punch" && hero && hero.onetwoRing && hero.anim && hero.anim[s.p.human ? "onetwoHuman" : "onetwo"]);   // suit or jacket arms
  function ringPos() {
    const p = s.p, hv = p.hover ?? 7;
    if (sprArms(p.punch)) {
      // the ring rides on his ring fist through the one-two
      const [fx, fy] = hero.onetwoRing[oneTwoFrame(p.punch)];
      return { x: facingLeft() ? p.x + 13 - fx + 0.5 : p.x - 14 + fx + 0.5, y: p.y - hv - 43 + fy + 0.5 };
    }
    const arm = p.punch && hero && hero.anim ? PUNCH_ARM[punchFrame(p.punch)] : [0, 0];
    return { x: p.x - 14 + (facingLeft() ? 4 - arm[0] : 24 + arm[0]), y: p.y - hv - 43 + 22.5 + arm[1] };
  }
  // Hitbox: his body from hair to boots (not the raised fist), in the same proportions as the 28x43 model.
  function playerBox() {
    const p = s.p, hv = p.hover ?? 7;
    return { x: p.x + (facingLeft() ? 3.5 : -3.5), y: p.y - hv - 21.5, w: 18, h: 41 };
  }
  const boxDist = (px, py, bx) => Math.hypot(Math.max(0, Math.abs(px - bx.x) - bx.w / 2), Math.max(0, Math.abs(py - bx.y) - bx.h / 2));
  function handPos() { return ringPos(); }
  // does a rotated rectangle (centre cx,cy, half-sizes hw,hh, turned by ang) overlap an axis-aligned box {x,y,w,h}?
  function obbHitsBox(cx, cy, hw, hh, ang, bx) {
    const c = Math.cos(ang), sn = Math.sin(ang), dx = cx - bx.x, dy = cy - bx.y;
    const ex = Math.abs(c) * hw + Math.abs(sn) * hh, ey = Math.abs(sn) * hw + Math.abs(c) * hh;   // its extents on x and y
    if (Math.abs(dx) > bx.w / 2 + ex || Math.abs(dy) > bx.h / 2 + ey) return false;
    const ru = Math.abs(c) * bx.w / 2 + Math.abs(sn) * bx.h / 2, rv = Math.abs(sn) * bx.w / 2 + Math.abs(c) * bx.h / 2;   // the box on its axes
    return Math.abs(dx * c + dy * sn) <= hw + ru && Math.abs(-dx * sn + dy * c) <= hh + rv;
  }
  // his other glove, down at his side (sprite pixel 2.5, 29; mirrored when he faces left)
  function offHandPos() { const p = s.p, hv = p.hover ?? 7; return { x: p.x - 14 + (facingLeft() ? 25.5 : 2.5), y: p.y - hv - 43 + 29 }; }
  function ringFlash() { s.ringFlash = 0.25; }

  // ---------- Rats ----------
  function spawnRat(side) {
    if (!side) side = Math.random() < 0.5 ? -1 : 1;
    s.rats.push({
      x: side < 0 ? -10 : W + 10, y: s.camY + 70 + Math.random() * (H - 110), hp: T.rat.hp,
      face: side < 0 ? 1 : -1, state: "walk", t: 0, cd: 0.6, walk: Math.random(), flash: 0, stun: 0, kx: 0, ky: 0,
      speed: T.rat.speed * (0.85 + Math.random() * 0.3),
    });
  }
  function startBoss() {
    s.boss = { x: W / 2, y: s.camY - 10, hp: T.boss.hp, max: T.boss.hp, state: "enter", t: 0, step: 0, shots: 0,
      flash: 0, sway: 0, aim: Math.PI / 2, laser: false };
    s.banner = { text: "OTTO ZUNDAPT", t: 2.2, sub: "MINI-BOSS" };
  }

  // ---------- Beware My Power ----------
  function bewareMyPower() {
    const p = s.p;
    if (p.bmp < 100 || p.charge < T.charge - 0.5 || p.bmpAnim > 0) return;   // needs a full meter AND a fully charged ring
    if (p.punch || p.rope || p.beam || p.shield) return;   // one ability at a time: waits for the current one to finish
    p.bmp = 0; p.bmpAnim = 1.8; p.charge = 0; p.oath = null; p.chargeFull = 0; p.bmpDrained = true;   // it pours every bit of the ring's energy into the blast
    p.shield = false; p.beam = false; p.punch = null;
    s.banner = { text: "BEWARE MY POWER!", t: 1.8, big: true }; SFX("bmpCharge");
  }
  // Suiting back up from human form throws out a shockwave of ring light that hurts everything close by
  function suitUpBurst() {
    const p = s.p, A = T.suitUp, cx = p.x, cy = p.y - 22;
    s.rings.push({ x: cx, y: cy, r: 8, life: A.r / 420 + 0.05 }); s.shake = Math.max(s.shake, 0.18);
    sparks(cx, cy, "#ffffff", 16, 160);
    for (const r of s.rats) if (r.hp > 0) {
      const b = ratBox(r), dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy) || 1;
      if (d < A.r + Math.max(b.w, b.h) / 2) { hitRat(r, A.dmg, dx / d * A.knock, dy / d * A.knock); sparks(b.x, b.y, C.bright, 6, 70); }
    }
    for (const h of s.hunters) if (hunterLive(h)) {
      const b = hunterBox(h);
      if (Math.hypot(b.x - cx, b.y - cy) < A.r + Math.max(b.w, b.h) / 2) { hitHunter(h, A.bossDmg); sparks(b.x, b.y, C.bright, 10, 90); }
    }
    if (s.boss && s.boss.state !== "enter" && s.boss.state !== "dead") {
      const b = bossBox(s.boss);
      if (Math.hypot(b.x - cx, b.y - cy) < A.r + Math.max(b.w, b.h) / 2) { hitBoss(A.bossDmg); sparks(b.x, b.y, C.bright, 10, 90); }
    }
  }
  function bmpBurst() {
    const p = s.p;
    // a see-through sphere of ring energy sweeps out (35% wider than the original burst)
    s.bmpWave = { x: p.x, y: p.y - 28, t: 0, sp: 420 * 1.35, life: 0.8 };
    s.whiteout = 0.12; s.shake = 0.5; SFX("bmp");
    for (const r of s.rats) if (r.hp > 0) {
      // each rat it kills leaves a green outline of itself for half a second, which then fades away
      const img = ART["rat0" + (r.face < 0 ? "L" : "")];
      if (img) s.ghosts.push({ img: ghostOf(img), x: Math.round(r.x - img.width / 2), y: Math.round(r.y - img.height - 5), t: 0 });
      r.hp = 1; hitRat(r, 1, 0, 0);
    }
    if (s.boss && s.boss.state !== "enter" && s.boss.state !== "dead") hitBoss(Math.round(s.boss.max * 0.65));   // half the boss's health, plus 30%
    for (const h of s.hunters) if (hunterLive(h)) hitHunter(h, Math.round(h.max * 0.65));   // each Manhunter takes the same 65%
    s.bolts = []; s.tornados = [];
    s.blades = [];
  }

  // ---------- Update ----------
  function update(dt) {
    {   // held sounds follow the action, and fall silent whenever it stops
      const on = s.mode === "play" && !s.dialog && !(s.p.bmpAnim > 0);
      audio.loop("beam", on && s.p.beam);
      audio.loop("laser", on && !!s.boss && s.boss.state === "laser");
      audio.loop("boulder", on && s.boulders.length > 0);
    }
    for (const f of s.fx) { f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.92; f.vy *= 0.92; }
    s.fx = s.fx.filter((f) => f.life > 0);
    for (const r of s.rings) { r.life -= dt; r.r += (r.sp || 420) * dt; }
    for (const g of s.ghosts) g.t += dt;
    s.ghosts = s.ghosts.filter((g) => g.t < 0.95);
    if (s.bmpWave && (s.bmpWave.t += dt) >= s.bmpWave.life) s.bmpWave = null;
    s.rings = s.rings.filter((r) => r.life > 0);
    s.shake = Math.max(0, s.shake - dt); s.whiteout = Math.max(0, s.whiteout - dt);
    if (s.banner) { s.banner.t -= dt; if (s.banner.t <= 0) s.banner = null; }
    if (s.mode === "title" || s.mode === "paused") { pressed.clear(); return; }
    if (s.mode === "over" || s.mode === "won") {
      s.endTimer += dt; pressed.clear();
      // no win screen: a moment to watch him go down, then back to the home page
      if (s.mode === "won" && s.endTimer > 2 && !s.leftLevel) { s.leftLevel = true; if (opts.onQuit) opts.onQuit(); else location.href = "/"; }
      return;
    }
    // Otto's intro line: everything holds still while he talks. Enter, Space, a click or a tap skips ahead.
    if (s.dialog) {
      const dl = s.dialog, full = dl.lines.join(" ").length;
      dl.t += dt;
      const shown = Math.min(full, Math.floor(dl.t * DIALOG_CPS));
      if (shown >= full && dl.doneAt == null) dl.doneAt = dl.t;
      if (pressed.has("Enter") || pressed.has(" ") || pressed.has("tap")) { if (dl.doneAt == null) { dl.t = full / DIALOG_CPS + 0.01; dl.doneAt = dl.t; } else dl.close = true; }
      if (dl.close || (dl.doneAt != null && dl.t > dl.doneAt + 2)) { s.dialog = null; if (dl.onClose) dl.onClose(); }
      pressed.clear();
      return;
    }

    s.t += dt;
    const p = s.p;
    p.inv = Math.max(0, p.inv - dt); p.flash = Math.max(0, p.flash - dt); p.cd = Math.max(0, p.cd - dt);
    p.boulderCd = Math.max(0, (p.boulderCd || 0) - dt); p.ropeCd = Math.max(0, (p.ropeCd || 0) - dt);

    // Beware My Power freezes the action while it plays out.
    if (p.bmpAnim > 0) {
      const before = p.bmpAnim;
      p.bmpAnim -= dt;
      if (before > 0.75 && p.bmpAnim <= 0.75) bmpBurst();
      if (Math.random() < 0.6) sparks(p.x + (Math.random() - 0.5) * 30, p.y - 24 + (Math.random() - 0.5) * 30, C.bright, 1, 20);
      pressed.clear();
      return;
    }

    // Facing: the most recently pressed arrow that is still held.
    let dx = 0, dy = 0;
    // W A S D to walk (arrow keys work too)
    if (keys.has("a") || keys.has("ArrowLeft")) dx--;
    if (keys.has("d") || keys.has("ArrowRight")) dx++;
    if (keys.has("w") || keys.has("ArrowUp")) dy--;
    if (keys.has("s") || keys.has("ArrowDown")) dy++;
    if (touchMove.active) {
      const tx = touchMove.x - touchMove.ox, ty = touchMove.y - touchMove.oy;
      if (Math.hypot(tx, ty) > 6) { dx = Math.abs(tx) > 6 ? Math.sign(tx) : 0; dy = Math.abs(ty) > 6 ? Math.sign(ty) : 0; p.aim = Math.atan2(ty, tx); }
    } else if (mouse.on) {
      // Mouse cursor sets where the Lantern looks, so attacks can go any direction
      { const pb = playerBox(); p.aim = Math.atan2(mouse.y - (pb.y - s.camY), mouse.x - pb.x); }
    } else if (dx || dy) p.aim = Math.atan2(dy, dx);
    // Recharge: hold G to call up a power battery and charge the ring from it. He stays put and can't use constructs.
    // Tap G (press and let go) to recite the Lantern's Oath; hold G for a quick recharge. G again stops the oath.
    // One ability at a time: a punch, fist, rope, beam or forcefield has to finish (or be let go) before another
    // starts, and recharging (G) and Beware My Power wait for it too. A thrown boulder counts until it leaves his hand.
    const abilityFree = () => !p.punch && !p.rope && !p.beam && !p.shield && !(p.boulderCd > T.boulder.cooldown - T.boulder.cd);
    p.rechargeLock = Math.max(0, (p.rechargeLock || 0) - dt);
    const gHeld = !!(keys.has("g") || touchBtn.charge || pressed.has("g"));   // pressed catches a tap shorter than a frame
    if (gHeld && !p.gPrev) { p.gHeldT = 0; p.gSwallow = !!p.oath; if (p.oath) { p.oath = null; s.oathEcho = 0.6; } }
    if (gHeld) p.gHeldT = (p.gHeldT || 0) + dt;
    if (!gHeld && p.gPrev && !p.gSwallow && p.gHeldT < T.recharge.tap && p.rechargeLock <= 0 && p.charge < T.charge && abilityFree()) {
      p.oath = { t: 0, from: p.charge, safe: !!p.human }; s.oathEcho = 0;   // started powered down: invincible until the Oath is done
    }
    p.gPrev = gHeld;
    if (p.oath && p.rechargeLock > 0) { p.oath = null; s.oathEcho = 0.6; }
    const wasCharging = p.recharge;
    p.recharge = !!p.oath || (gHeld && !p.gSwallow && (wasCharging || abilityFree()) && p.rechargeLock <= 0);
    p.rechargeT = p.recharge ? (p.rechargeT || 0) + dt : 0;
    p.lanternA = Math.max(0, Math.min(1, (p.lanternA || 0) + (p.recharge ? 6 : -5) * dt));
    if (p.recharge) {
      if (!wasCharging) { p.lanternSide = Math.cos(p.aim) < 0 ? -1 : 1; ringFlash(); p.lanternHp = T.recharge.guard; }
      dx = dy = 0;
      p.aim = p.lanternSide < 0 ? Math.PI : 0;
      const before = p.charge;
      if (p.oath) {
        p.oath.t += dt;
        p.charge = Math.max(p.charge, p.oath.from + (T.charge - p.oath.from) * Math.min(1, p.oath.t / T.recharge.oath));
        if (p.oath.t >= T.recharge.oath) {
          // "...Green Lantern's LIGHT!": a flash of ring light rolls out from him
          if (p.oath.safe) p.inv = 1;   // a moment's grace as he suits back up
          p.charge = T.charge; p.oath = null; s.oathEcho = 1.6;
          s.rings.push({ x: p.x, y: p.y - 22, r: 6, life: 0.5 }); s.whiteout = Math.max(s.whiteout, 0.12);
          sparks(p.x + p.lanternSide * 10, p.y - 30, C.bright, 24, 120);
        }
      } else if (p.rechargeT > T.recharge.spinUp) p.charge = Math.min(T.charge, p.charge + T.recharge.rate * dt);
      if (before < T.charge && p.charge >= T.charge) { p.chargeFull = 0.8; ringFlash(); }
    }
    s.oathEcho = Math.max(0, (s.oathEcho || 0) - dt);
    p.chargeFull = Math.max(0, (p.chargeFull || 0) - dt);
    // With the ring empty AND his health down to half or less (and not mid-blast) he drops back to plain human
    // form: no suit, no glow, no flight. Once human he stays that way until charge is back in the ring.
    const human = (p.charge < 1 || !!(p.oath && p.oath.safe)) && !(p.bmpAnim > 0) && (p.human || p.hp <= T.hp / 2 || !!p.bmpDrained);   // Beware My Power drains him all the way back to human   // a powered-down Oath suits him up on "LIGHT!"
    if (human !== !!p.human) {
      p.human = human; p.morph = 0.35; p.bmpDrained = false;
      sparks(p.x, p.y - 22, human ? "#9aa59f" : C.bright, human ? 10 : 18, human ? 50 : 90);
      if (!human) { ringFlash(); s.rings.push({ x: p.x, y: p.y - 22, r: 3, life: 0.35 }); suitUpBurst(); }
    }
    p.morph = Math.max(0, (p.morph || 0) - dt); p.oathHit = Math.max(0, (p.oathHit || 0) - dt);
    p.dir = dirOf(p.aim); p.mv = [dx, dy];
    // Turning: he never snaps between facings. His head swings round first, one direction at a time, and his
    // body follows a beat behind; a half turn goes the long way round through facing the camera.
    {
      const ti = DIR8.indexOf(p.dir);
      if (p.headI == null) { p.headI = p.bodyI = ti; p.headT = p.bodyT = 0; }
      const step = (i, t) => {
        const d = (t - i + 8) % 8;
        if (!d) return i;
        const fwd = d < 4 || (d === 4 && (2 - i + 8) % 8 >= 1 && (2 - i + 8) % 8 <= 3);
        return (i + (fwd ? 1 : 7)) % 8;
      };
      p.headT -= dt; p.bodyT -= dt;
      if (p.headT <= 0 && p.headI !== ti) { p.headI = step(p.headI, ti); p.headT = 0.045; }
      if (p.bodyT <= 0 && p.bodyI !== p.headI) { p.bodyI = step(p.bodyI, p.headI); p.bodyT = 0.065; }
      p.headDir = DIR8[p.headI]; p.bodyDir = DIR8[p.bodyI];
    }

    // Constructs
    s.ringFlash = Math.max(0, (s.ringFlash || 0) - dt);
    p.shieldDown = Math.max(0, p.shieldDown - dt);
    const shieldWas = p.shield;
    if (p.shieldDown > 0) p.shield = false;
    else p.shield = !p.recharge && (keys.has(" ") || touchBtn.shield) && (p.shield || abilityFree()) && (p.shield ? useCharge(T.shield.drain * dt) : useCharge(T.shield.start));
    if (p.shield && !shieldWas) SFX("shield");
    if (!p.shield && p.shieldDown <= 0) p.shieldHp = Math.min(T.shield.hp, p.shieldHp + T.shield.mend * dt);
    if (p.shieldDown <= 0 && p.shieldHp <= 0) p.shieldHp = T.shield.hp * 0.5;
    const beamHeld = keys.has("3") || touchBtn.beam;
    const wasShield = p.shieldT > 0;
    p.shieldT = p.shield ? (p.shieldT || 0) + dt : 0;
    if (p.shield && !wasShield) ringFlash();
    p.beam = !p.shield && !p.recharge && beamHeld && (p.beam || abilityFree()) && (p.beam ? useCharge(T.beam.drain * dt) : useCharge(T.beam.start));
    if (p.recharge) pressed.clear();
    if ((pressed.has("c") || pressed.has("punch")) && abilityFree() && p.cd <= 0) {
      p.punchHand = p.punchHand ? 0 : 1;   // every jab swaps hands: ring hand, other hand, ring hand...
      p.punch = { t: 0, aim: p.aim, hit: new Set(), kind: "punch", off: p.punchHand === 0 }; p.cd = T.punch.cd; SFX("punch");
    }
    if ((pressed.has("1") || pressed.has("fist")) && abilityFree() && p.cd <= 0 && useCharge(T.fist.cost)) {
      p.punch = { t: 0, aim: p.aim, hit: new Set(), kind: "fist", trail: [] }; p.cd = T.fist.cd; ringFlash(); SFX("fist");
    }
    if ((pressed.has("2") || pressed.has("boulder")) && abilityFree() && p.cd <= 0 && p.boulderCd <= 0 && useCharge(T.boulder.cost)) {
      const d = aimVec(), h = handPos();
      s.boulders.push({ x: h.x + d[0] * 10, y: h.y + d[1] * 10, vx: d[0] * T.boulder.speed, vy: d[1] * T.boulder.speed, rot: 0, hit: new Set(), age: 0 });
      ringFlash(); SFX("boulder");
      p.cd = T.boulder.cd; p.boulderCd = T.boulder.cooldown;
    }
    if ((pressed.has("4") || pressed.has("rope")) && abilityFree() && p.cd <= 0 && p.ropeCd <= 0) {
      // The lasso catches at most four rats: the closest ones on screen
      const grabbed = s.rats.filter((r) => r.hp > 0 && r.y > s.camY - 10 && r.y < s.camY + H + 20 && r.x > -20 && r.x < W + 20)
        .sort((a, b) => dist(a, p) - dist(b, p)).slice(0, T.rope.max);
      if (grabbed.length && useCharge(T.rope.cost)) {
        const cx = W / 2, cy = s.camY + H / 2 + 10;
        ringFlash();
        p.rope = { t: 0, cx, cy, end: grabbed.length > 1 ? 16 : 0, list: grabbed.map((r) => ({ r, sx: r.x, sy: r.y, a: Math.atan2(r.y - cy, r.x - cx) })) };
        // Spread rats that share an angle so they don't stack on the circle
        p.rope.list.sort((m, n) => m.a - n.a).forEach((g, i, l) => { if (i && g.a - l[i - 1].a < 0.5) g.a = l[i - 1].a + 0.5; });
        p.cd = T.rope.cd; p.ropeCd = T.rope.cooldown; SFX("rope");
      }
    }
    if (pressed.has("v") || pressed.has("power")) bewareMyPower();
    pressed.clear();

    // Movement
    const slow = p.shield ? 0.5 : p.beam ? 0.35 : p.punch ? 0.6 : 1;
    p.moving = !!(dx || dy);
    if (p.moving) {
      const n = Math.hypot(dx, dy);
      // Hold Shift to fly faster
      const boost = keys.has("Shift") && !p.human && p.charge > 0 ? T.boost : 1; p.boosting = boost > 1;   // no flying boost without the suit or with an empty ring
      if (p.boosting) p.charge = Math.max(0, p.charge - T.boostDrain * dt);
      if (p.boosting && s.t - (p.boostEnd ?? -9) > 0.35 && !p.boostOn) SFX("goneFast");   // "gone fast": the whoosh as fast flight kicks in
      p.boostOn = p.boosting; if (p.boosting) p.boostEnd = s.t;
      p.x += (dx / n) * T.speed * slow * boost * dt; p.y += (dy / n) * T.speed * slow * boost * dt;
      p.walk += dt * 7 * slow;
    } else { p.walk = 0; p.boosting = false; p.boostOn = false; }
    // Flight pose eases smoothly between hovering and flying, and toward the direction of travel
    {
      const n2 = Math.hypot(dx, dy) || 1, k = 1 - Math.exp(-9 * dt);
      p.fly = (p.fly || 0) + ((p.moving ? (p.boosting ? 1.5 : 1) : 0) - (p.fly || 0)) * k;
      p.leanX = (p.leanX || 0) + ((p.moving ? dx / n2 : 0) - (p.leanX || 0)) * k;
      p.leanY = (p.leanY || 0) + ((p.moving ? dy / n2 : 0) - (p.leanY || 0)) * k;
      p.hoverPh = (p.hoverPh || 0) + dt * (2.4 + Math.min(1, p.fly) * 2);
      // green afterimages trail behind him while he boosts
      p.ghosts = (p.ghosts || []).filter((g) => (g.life -= dt) > 0);
      p.ghostT = (p.ghostT || 0) - dt;
      p.superFly = !!(p.moving && p.boosting && !p.punch && !p.beam && !p.rope && !p.shield);
      // light streaks hang off his body: they grow in, point back along his flight and bend when he turns
      const k2 = 1 - Math.exp(-3.5 * dt);
      p.trailX = (p.trailX || 0) + ((p.leanX || 0) - (p.trailX || 0)) * k2;
      p.trailY = (p.trailY || 0) + ((p.leanY || 0) - (p.trailY || 0)) * k2;
      p.streak = (p.streak || 0) + ((p.superFly ? 1 : 0) - (p.streak || 0)) * (1 - Math.exp(-(p.superFly ? 8 : 6) * dt));
      if (p.moving && p.boosting && !p.superFly && p.ghostT <= 0) { p.ghostT = 0.045; p.ghosts.push({ x: p.x, y: p.y, hover: p.hover ?? 8, dir: p.dir || "down", life: 0.22 }); }
    }
    if (p.kvx || p.kvy) { p.x += (p.kvx || 0) * dt; p.y += (p.kvy || 0) * dt; const f = Math.exp(-12 * dt); p.kvx *= f; p.kvy *= f; if (Math.hypot(p.kvx, p.kvy) < 2) p.kvx = p.kvy = 0; }
    p.x = Math.max(8, Math.min(W - 8, p.x));

    // Camera follows upward only, as far as the player's kills have opened up the climb.
    const limitY = s.test ? BOSS_STOP : Math.max(BOSS_STOP, FLOW.startY - s.kills * FLOW.gate);
    const target = p.y - H * 0.62;
    // Ease toward the target instead of snapping, so the screen never jumps
    const camGoal = Math.max(target, limitY);
    if (camGoal < s.camY) s.camY += (camGoal - s.camY) * Math.min(1, dt * 9);
    p.y = Math.max(s.camY + 30, Math.min(s.camY + H - 3, p.y));
    if (s.level === 2 && s.l2) {   // level 2: on the sand floor, never up over the dunes (eased in during the fade)
      const top = s.camY + L2_FLOOR;
      if (p.y < top) p.y = s.l2.fade >= 1 ? top : p.y + (top - p.y) * Math.min(1, dt * 6);
    }

    // Spawning: a steady stream of rats that grows as you climb, until the mini-boss arena
    const alive = s.rats.filter((r) => r.hp > 0).length;
    const atBoss = s.camY <= BOSS_STOP + 0.5;
    if (!s.boss && !atBoss) {
      const k = Math.min(1, Math.max(0, s.camY / BOSS_STOP)), lerp = ([a0, a1]) => a0 + (a1 - a0) * k;
      s.spawnT -= dt;
      if (s.spawnT <= 0 && alive < Math.round(lerp(FLOW.maxAlive))) {
        // two at a time, one from each side (never past the cap)
        const n = Math.min(FLOW.perSpawn, Math.round(lerp(FLOW.maxAlive)) - alive), side = Math.random() < 0.5 ? -1 : 1;
        for (let i = 0; i < n; i++) spawnRat(i % 2 ? -side : side);
        s.spawnT = lerp(FLOW.interval);
      }
    }
    if (atBoss && !s.boss && alive === 0 && s.level === 1) startBoss();
    s.waveOn = alive > 0;
    // Show the "move forward" arrow whenever there is more of the climb open ahead
    s.goT = !s.boss && !atBoss && s.camY - limitY > 20 ? 0.5 : 0;

    // Punch
    if (p.punch) {
      const pu = p.punch, A = T[pu.kind]; pu.t += dt;
      const u = Math.min(1, pu.t / A.time), k = Math.sin(u * Math.PI);
      let d, pad;
      if (pu.kind === "fist") {
        // Construct hook, alternating each throw. Facing left: left-to-right, then right-to-left. Facing right:
        // right-to-left, then left-to-right. Facing forward or back: left-to-right, then right-to-left.
        if (pu.sign === undefined) {
          const c = Math.cos(pu.aim), facing = c < -0.35 ? "left" : c > 0.35 ? "right" : "fwd";
          p.fistAlt = p.fistFacing === facing && s.t - (p.fistLast ?? -9) < 1.5 ? 1 - (p.fistAlt || 0) : 0;
          p.fistFacing = facing; p.fistLast = s.t;
          const want = (facing === "right" ? -1 : 1) * (p.fistAlt ? -1 : 1);   // +1: screen left to right
          const x0 = Math.cos(pu.aim + A.swing), x1 = Math.cos(pu.aim - A.swing);
          pu.sign = Math.abs(x0 - x1) < 0.02 ? (p.fistAlt ? -1 : 1) : want * x0 <= want * x1 ? 1 : -1;
        }
        const e = u * u * (3 - 2 * u);
        const off = pu.sign * A.swing * (1 - 2 * e);
        const grow = Math.min(1, pu.t / 0.07);
        const ang = pu.aim + off, rad = 18 + A.reach * (0.45 + 0.55 * k);   // (it grows in size, not reach, so both ends match)   // held in close to him
        pu.ang = ang; pu.grow = grow;
        // The arc is centred on his chest (not the ring hand), so both ends of the swing sit the same distance from
        // him. It never sweeps across his body: the radius grows until the fist clears him at this angle AND at
        // the mirrored angle on the other side of the swing, so both sides always reach equally far.
        const rp = ringPos(), cx = s.p.x, cy = rp.y, mir = 2 * pu.aim - ang;
        const fi = hero ? hero.fist : ART.fist, gs = hero ? A.scale : 1;   // cleared at full size the whole swing
        const hw = fi.width * gs / 2 + 1, hh = fi.height * gs / 2 + 1, pb = playerBox();
        let r = rad;
        for (let push = 0; push < 60 && (obbHitsBox(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, hw, hh, ang, pb) ||
          obbHitsBox(cx + Math.cos(mir) * r, cy + Math.sin(mir) * r, hw, hh, mir, pb)); push++) r++;
        pu.x = cx + Math.cos(ang) * r; pu.y = cy + Math.sin(ang) * r;
        pu.trail.push([pu.x, pu.y]); if (pu.trail.length > 7) pu.trail.shift();
        const kn = ang - pu.sign * 0.7; d = [Math.cos(kn), Math.sin(kn)]; pad = 20;
        pu.jab = u > 0.08 && u < 0.92 ? 1 : 0;
      } else {
        // C: the one-two (from the user's boxing reference). His ring hand snaps out in a jab and back to guard,
        // then the other fist fires the cross; each punch can land once. Hits reach out along his aim from his chest.
        const ph = u < 0.5 ? 0 : 1;
        if (pu.phase !== ph) { pu.phase = ph; pu.off = ph === 1; pu.hit = new Set(); if (ph) SFX("punch"); }
        const v = Math.min(1, (u - ph * 0.5) / 0.5);
        const hv = p.hover ?? 7, h = sprArms(pu) ? { x: p.x + (facingLeft() ? -6 : 6), y: p.y - hv - 24 } : pu.off ? offHandPos() : handPos(); d = aimVec(pu.aim); pad = 7;
        const j = v < 0.35 ? 1 - Math.pow(1 - v / 0.35, 2) : 1 - Math.pow((v - 0.35) / 0.65, 2);
        pu.jab = j; pu.hx = h.x; pu.hy = h.y;
        pu.x = h.x + d[0] * (1 + j * (A.reach + 3)); pu.y = h.y + d[1] * (1 + j * (A.reach + 3));
      }
      if (pu.jab > 0.45) {
        for (const r of s.rats) if (r.hp > 0 && !pu.hit.has(r) && inBox(pu.x, pu.y, ratBox(r), pad)) {
          pu.hit.add(r); hitRat(r, A.dmg, d[0] * A.knock, d[1] * A.knock); s.shake = pu.kind === "fist" ? 0.08 : 0.04; SFX("hit");
        }
        for (const h of s.hunters) if (hunterLive(h) && !pu.hit.has(h) && inBox(pu.x, pu.y, hunterBox(h), pad)) { pu.hit.add(h); hitHunter(h, A.bossDmg); SFX("hit"); sparks(pu.x, pu.y, pu.kind === "fist" ? C.bright : "#ffffff", 8, 80); }
        if (s.boss && !pu.hit.has(s.boss) && bossHit(s.boss, pu.x, pu.y, pad)) { pu.hit.add(s.boss); hitBoss(A.bossDmg); SFX("hit"); sparks(pu.x, pu.y, pu.kind === "fist" ? C.bright : "#ffffff", 8, 80); }
      }
      if (pu.t >= A.time) p.punch = null;
    }

    // Rope: lassos every rat on screen and drags them all into the middle
    if (p.rope) {
      const R = T.rope, ro = p.rope; ro.t += dt;
      if (!ro.cinched && ro.t >= R.whirl + R.reach + R.form * 0.6) { ro.cinched = true; SFX("cinch"); }
      // 1) he whirls a lasso over his ring hand, 2) a loop flies out to every rat, 3) it drops over each one and
      // cinches tight, 4) all of them are reeled into the middle, slow at first, then fast, then settling
      const k = Math.max(0, Math.min(1, (ro.t - R.whirl - R.reach - R.form) / R.pull)), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      for (const g of ro.list) {
        if (g.r.hp <= 0) continue;
        g.r.stun = Math.max(g.r.stun, 0.2); g.r.kx = 0; g.r.ky = 0; g.r.state = "walk";
        if (k > 0) {
          if (g.px == null) { g.px = g.r.x; g.py = g.r.y; }
          const tx = ro.cx + Math.cos(g.a) * ro.end, ty = ro.cy + Math.sin(g.a) * ro.end * 0.8;
          g.r.x = g.px + (tx - g.px) * e; g.r.y = g.py + (ty - g.py) * e;
          if (k >= 1 && !g.done) { g.done = true; g.r.stun = R.hold; sparks(g.r.x, g.r.y - 10, C.bright, 6, 50); }
        }
      }
      if (ro.t > R.whirl + R.reach + R.form + R.pull + 0.35) p.rope = null;
    }

    // Boulders
    for (const b of s.boulders) {
      b.age = (b.age || 0) + dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot += dt * 10;
      // The boulder smashes through every enemy in its path, hitting each one once.
      const sp = Math.hypot(b.vx, b.vy) || 1;
      for (const r of s.rats) if (r.hp > 0 && !b.hit.has(r) && inBox(b.x, b.y, ratBox(r), 26)) {
        b.hit.add(r); hitRat(r, T.boulder.dmg, (b.vx / sp) * T.boulder.knock, (b.vy / sp) * T.boulder.knock);
        sparks(b.x, b.y, C.green, 12, 100); s.shake = Math.max(s.shake, 0.08); SFX("boulderHit");
      }
      for (const h of s.hunters) if (hunterLive(h) && !b.hit.has(h) && inBox(b.x, b.y, hunterBox(h), 22)) {
        b.hit.add(h); hitHunter(h, 5); SFX("boulderHit"); sparks(b.x, b.y, C.green, 18, 110); s.shake = Math.max(s.shake, 0.1);
      }
      if (s.boss && !b.hit.has(s.boss) && bossHit(s.boss, b.x, b.y, 22)) {
        b.hit.add(s.boss); hitBoss(5); SFX("boulderHit"); sparks(b.x, b.y, C.green, 18, 110); s.shake = Math.max(s.shake, 0.1);
      }
      if (b.x < -20 || b.x > W + 20 || b.y < s.camY - 20 || b.y > s.camY + H + 20) b.dead = true;
    }
    s.boulders = s.boulders.filter((b) => !b.dead);

    // Beam: stops at the first enemy in its line and hits only that one
    // The beam flows like a stream of light: its tip whips after the aim instead of snapping to it,
    // and the body bends between the ring (pointing at the aim) and the tip.
    const wasHit = p.beamHit, wasTarget = p.beamTarget;
    p.beamLen = 420; p.beamHit = false; p.beamTarget = null;
    if (!p.beam) p.beamAng = null;
    else {
      if (p.beamAng == null) { p.beamAng = p.aim; p.beamBorn = s.t; }
      let da = p.aim - p.beamAng; da = Math.atan2(Math.sin(da), Math.cos(da));
      p.beamAng += da * Math.min(1, dt * 9);
    }
    if (p.beam) {
      const h = handPos(), d = aimVec(p.beamAng);
      p.beamFrom = h;
      const lineDist = (box) => {
        const ox = box.x - h.x, oy = box.y - h.y, along = ox * d[0] + oy * d[1];
        if (along <= 0 || Math.abs(ox * d[1] - oy * d[0]) >= Math.max(box.w, box.h) / 2 + 10) return Infinity;   // a generous hitbox: grazing an enemy counts
        return Math.max(4, along - (Math.abs(d[0]) * box.w + Math.abs(d[1]) * box.h) / 2);
      };
      let best = null, bestD = Infinity;
      for (const r of s.rats) if (r.hp > 0) { const dd = lineDist(ratBox(r)); if (dd < bestD) { bestD = dd; best = r; } }
      if (s.boss) { const dd = lineDist(bossBox(s.boss)); if (dd < bestD) { bestD = dd; best = s.boss; } }
      for (const h of s.hunters) if (hunterLive(h)) { const dd = lineDist(hunterBox(h)); if (dd < bestD) { bestD = dd; best = h; } }
      if (best && bestD < 420) {
        p.beamLen = bestD; p.beamHit = true; p.beamTarget = best;
        const tx = h.x + d[0] * bestD, ty = h.y + d[1] * bestD;
        // Impact: a burst of energy the moment it connects (or jumps to a new target), then a steady splash
        if (!wasHit || wasTarget !== best) {
          s.rings.push({ x: tx, y: ty, r: 3, life: 0.32, sp: 150, thin: true });
          sparks(tx, ty, C.bright, 14, 150); sparks(tx, ty, "#ffffff", 6, 110);
          s.shake = Math.max(s.shake, 0.06);
        }
        p.beamSplash = (p.beamSplash || 0) - dt;
        if (p.beamSplash <= 0) {
          p.beamSplash = 0.05;
          for (let i = 0; i < 3; i++) {   // light spraying back off the target
            const a = p.beamAng + Math.PI + (Math.random() - 0.5) * 2.2, v = 60 + Math.random() * 90;
            s.fx.push({ x: tx, y: ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.2 + Math.random() * 0.25, color: Math.random() < 0.4 ? "#ffffff" : C.bright });
          }
        }
        if (best.isHunter) { best.beamAcc = (best.beamAcc || 0) + T.beam.dps * dt; if (best.beamAcc >= 1) { best.beamAcc -= 1; hitHunter(best, 1, "beam"); } }
        else if (best === s.boss) { s.boss.beamAcc = (s.boss.beamAcc || 0) + T.beam.dps * dt; if (s.boss.beamAcc >= 1) { s.boss.beamAcc -= 1; hitBoss(1); } }
        else {
          const r = best;
          r.beamAcc = (r.beamAcc || 0) + T.beam.dps * dt;
          r.x += d[0] * 25 * dt; r.y += d[1] * 25 * dt;
          if (r.beamAcc >= 1) { r.beamAcc -= 1; hitRat(r, 1, d[0] * 30, d[1] * 30); }
        }
      }
    }

    p.drainT -= dt;
    gainBmp(T.bmp.passive * dt);

    // Rats
    const pb = playerBox(), pc = { x: pb.x, y: pb.y };
    for (const r of s.rats) {
      if (r.hp <= 0) continue;
      r.t += dt; r.cd -= dt; r.flash = Math.max(0, r.flash - dt);
      if (r.stun > 0) {
        r.stun -= dt; r.x += r.kx * dt; r.y += r.ky * dt; r.kx *= 0.85; r.ky *= 0.85;
        continue;
      }
      const rb0 = ratBox(r), rc = { x: rb0.x, y: rb0.y }, d = p.shield ? dist(rc, pc) : boxDist(rc.x, rc.y, pb) + 9;
      // With the forcefield up, rats stop at its edge and attack the forcefield itself
      const reach = p.shield ? T.shield.r + 6 : T.rat.reach;
      if (r.state === "walk") {
        const a = Math.atan2(pc.y - rc.y, pc.x - rc.x);
        if (d > reach - 3) { r.x += Math.cos(a) * r.speed * dt; r.y += Math.sin(a) * r.speed * dt; r.walk += dt * 6; }
        r.face = pc.x >= r.x ? 1 : -1;
        if (d < reach && r.cd <= 0) { r.state = "windup"; r.t = 0; }
      } else if (r.state === "windup") {
        if (r.t >= T.rat.windup) {
          r.state = "swing"; r.t = 0; SFX("ratSwing");
          const dNow = p.shield ? dist(rc, pc) : boxDist(rc.x, rc.y, pb) + 9;
          if (p.shield && dNow < T.shield.r + 14) {
            const a = Math.atan2(rc.y - pc.y, rc.x - pc.x);
            sparks(pc.x + Math.cos(a) * T.shield.r, pc.y + Math.sin(a) * T.shield.r, C.bright, 8, 70);
            r.kx = Math.cos(a) * 60; r.ky = Math.sin(a) * 60; r.stun = 0.15;
            hitShield(T.shield.ratHit);
          } else if (!p.shield && dNow < T.rat.reach + 6) hurtPlayer(T.rat.dmg, rc.x, rc.y);
        }
      } else if (r.state === "swing" && r.t > 0.22) { r.state = "walk"; r.cd = T.rat.cd; }
      // The forcefield keeps rats from walking inside it
      if (p.shield && dist(rc, pc) < T.shield.r + 3) { const a = Math.atan2(rc.y - pc.y, rc.x - pc.x); r.x += Math.cos(a) * 60 * dt; r.y += Math.sin(a) * 60 * dt; }
      // Keep rats from stacking
      for (const o of s.rats) if (o !== r && o.hp > 0) {
        const dd = Math.hypot(r.x - o.x, r.y - o.y);
        if (dd < 12 && dd > 0) { r.x += ((r.x - o.x) / dd) * 20 * dt; r.y += ((r.y - o.y) / dd) * 20 * dt; }
      }
    }
    for (const r of s.rats) if (r.hp <= 0) { s.kills++; s.p.hp = Math.min(T.hp, s.p.hp + FLOW.heal); }
    s.rats = s.rats.filter((r) => r.hp > 0);

    // Boss
    const b = s.boss;
    if (b) updateBoss(b, dt, pc, pb);
    if (s.level === 2) updateLevel2(dt, pc, pb);

    // Blades
    for (const bl of s.blades) {
      bl.x += bl.vx * dt; bl.y += bl.vy * dt; bl.rot += dt * 14;
      if (!bl.friendly) {
        const dd = Math.hypot(bl.x - pc.x, bl.y - pc.y);
        if (p.shield && dd < T.shield.r + T.boss.sawR - 2) {
          // The forcefield bats the blade away; after that it can only hurt Otto
          bl.friendly = true;
          const a = Math.atan2(bl.y - pc.y, bl.x - pc.x);
          bl.vx = Math.cos(a) * 190; bl.vy = Math.sin(a) * 190; SFX("reflect");
          sparks(bl.x, bl.y, C.bright, 8, 70); hitShield(T.shield.sawHit);
        } else if (!p.shield && boxDist(bl.x, bl.y, pb) < T.boss.sawR - 2) { hurtPlayer(T.boss.bladeDmg, bl.x, bl.y); bl.dead = true; }
      }
      else if (s.boss && s.boss.state !== "dead" && s.boss.state !== "enter" && bossHit(s.boss, bl.x, bl.y, T.boss.sawR - 4)) {
        // a blade the forcefield batted away cuts Otto if it hits him
        hitBoss(T.boss.reflectDmg); bl.dead = true; SFX("hit");
        sparks(bl.x, bl.y, "#ffffff", 12, 110); sparks(bl.x, bl.y, C.gold, 8, 80); s.shake = Math.max(s.shake, 0.12);
        s.rings.push({ x: bl.x, y: bl.y, r: 4, life: 0.3, color: C.gold });
      }
      if (bl.x < -24 || bl.x > W + 24 || bl.y < s.camY - 30 || bl.y > s.camY + H + 20) bl.dead = true;
    }
    s.blades = s.blades.filter((x) => !x.dead);

    if (p.hp > 0 && p.hp < 30 && Math.random() < dt * 2) sparks(p.x, p.y - 20, C.hp, 1, 15);
  }

  const OTTO_FACE = { downright: 35, down: 90, downleft: 145, upleft: 215, up: 270, upright: 325 };   // centre angle of each view
  function eyes(b) { const q = b.pose || {}, m = ottoDirs[b.dir || "down"], e = (m && m.eye) || [31.5, 10.5]; return { x: b.x - 26 + e[0] + (q.hx || 0), y: b.y - 73 - (b.lift || 0) + e[1] + (q.hy || 0) }; }
  // Where his throwing hand is during a frisbee throw: swung back behind him, then whipped across to the front.
  // The muzzle of the saw-blade launcher that is his right hand, wherever the arm is pointing right now
  // (the arm turns about its shoulder, so the muzzle swings with it). Facing away from his right hand, the blade
  // leaves from his hidden side.
  function throwHand(b) {
    const model = ottoDirs[b.dir || "down"], L = model && model.launcher;
    const X = b.x - 26, Y = b.y - 73 - (b.lift ?? BOSS_LIFT), q = b.pose || {};
    if (!L) return { x: b.x - 10, y: b.y - 30, behind: true };
    const left = L.arm === "armL", pv = shoulderOf(model.parts[L.arm]), ang = (left ? q.la : q.ra) || 0, dy = (left ? q.lay : q.ray) || 0;
    const vx = L.muzzle[0] - pv.x, vy = L.muzzle[1] - pv.y, c = Math.cos(ang), sn = Math.sin(ang);
    return { x: X + pv.x + vx * c - vy * sn, y: Y + dy + pv.y + vx * sn + vy * c, behind: false, sx: X + pv.x, sy: Y + dy + pv.y };
  }
  function fireBlade(b, angle, from) {
    const e = from || { x: b.x, y: b.y - 40 };
    s.blades.push({ x: e.x, y: e.y, vx: Math.cos(angle) * T.boss.bladeSpeed, vy: Math.sin(angle) * T.boss.bladeSpeed, rot: 0 });
  }
  function updateBoss(b, dt, pc, pb) {
    b.t += dt; b.flash = Math.max(0, b.flash - dt);
    const homeY = s.camY + 110;
    if (b.state !== "dead") {
      // Otto Zundapt, the Big Space Rat, is solid, and touching him hurts
      const bx = bossBox(b);
      if (Math.abs(pb.x - bx.x) < (pb.w + bx.w) / 2 && Math.abs(pb.y - bx.y) < (pb.h + bx.h) / 2) {
        const crushing = b.crush && b.crush.phase !== "recover";   // the slam itself does the damage, not the bump
        if (!s.p.shield && b.state !== "enter" && !crushing) hurtPlayer(T.boss.touchDmg, bx.x, bx.y);
        else if (s.p.shield && b.state !== "enter") hitShield(T.shield.touchDps * dt);
        const ox = pb.x - bx.x, push = (bx.w + pb.w) / 2 + 1 - Math.abs(ox), pushY = bx.y + bx.h / 2 + pb.h / 2 + 1 - pb.y;
        // slide him out of the boss over a few frames rather than snapping
        const step = 260 * dt;
        if (push < pushY) s.p.x += Math.sign(ox || 1) * Math.min(push, step); else s.p.y += Math.min(pushY, step);
      }
    }
    if (b.state === "enter") {
      b.y += 30 * dt;
      if (b.y >= homeY) {
        // in position: he says his line, then the fight starts
        b.y = homeY; b.state = "talk";
        s.dialog = { t: 0, who: "otto", lines: ["YOU WILL BE DESTROYED", "LANTERN!"], onClose: () => { if (s.boss === b) { b.state = "rest"; b.t = 0; b.next = "triple"; b.wait = 0.8; } } };
      }
      return;
    }
    if (b.state === "dead") {
      if (Math.random() < 0.5) sparks(b.x + (Math.random() - 0.5) * 40, b.y - Math.random() * 70, Math.random() < 0.5 ? C.gold : "#ffffff", 6, 90);
      if (b.t > 1.4 && !b.lastWords) {
        // his dying line, cursing the pilot by the name they signed in with, then he's gone
        b.lastWords = true;
        const name = String(opts.pilot || "").trim().toUpperCase() || "LANTERN";
        s.dialog = { t: 0, who: "otto", lines: ["CURSE YOU", name + "!"], onClose: () => {
          s.boss = null; s.score += 3000 + s.p.hp * 10;
          report(true);          // level 1 cleared
          enterLevel2(false);    // ...and on to the desert
        } };
      }
      return;
    }
    const rage = b.hp < b.max / 2 ? 1.3 : 1;
    // He roams the whole arena, flying from one random spot to the next (slowly while firing the laser)
    const px0 = b.x, py0 = b.y;
    if (b.state === "crush") { b.goal = null; } else {
    if (!b.goal || Math.hypot(b.goal.x - b.x, b.goal.y - b.y) < 6) b.goal = { x: 50 + Math.random() * (W - 100), y: s.camY + 90 + Math.random() * (H - 140) };
    { const gx = b.goal.x - b.x, gy = b.goal.y - b.y, gd = Math.hypot(gx, gy) || 1, sp = T.boss.roam * rage * (b.laser ? 0.35 : b.throw ? 0.5 : 1);
      b.x += (gx / gd) * Math.min(gd, sp * dt); b.y += (gy / gd) * Math.min(gd, sp * dt); }
    }
    const aimAt = () => Math.atan2(pc.y - (b.y - 40), pc.x - b.x);
    // Frisbee throw: wind the saw back, whip it across, let go at the release point
    if (b.throw) {
      const th = b.throw; th.t += dt;
      if (!th.done && th.t >= T.boss.release) { th.done = true; const h = throwHand(b); fireBlade(b, Math.atan2(pc.y - h.y, pc.x - h.x), h); sparks(h.x, h.y, "#ffd34a", 6, 70); SFX("blade"); }
      if (th.t >= T.boss.throwT) b.throw = null;
    }
    const throwSaw = () => { b.throw = { t: 0, side: pc.x >= b.x ? 1 : -1, aim: aimAt(), done: false }; b.shots++; };

    if (b.state === "rest") {
      if (b.t >= b.wait / rage) { b.state = b.next; b.t = 0; b.shots = 0; }
    } else if (b.state === "triple") {
      // Two saws, thrown one after another
      if (!b.throw && b.shots < 2 && b.t >= 0.75 / rage * b.shots) throwSaw();
      if (b.shots >= 2 && !b.throw) { b.state = "rest"; b.t = 0; b.wait = 0.9; b.next = "wave1"; }
    } else if (b.state === "wave1" || b.state === "wave2") {
      // One saw at a time
      if (!b.throw && b.shots < 1) throwSaw();
      if (b.shots >= 1 && !b.throw) { b.next = b.state === "wave1" ? "wave2" : "charge"; b.state = "rest"; b.t = 0; b.wait = 1.0; }
    } else if (b.state === "charge") {
      b.laser = false; b.aim = aimAt();
      if (!b.chargeSnd) { b.chargeSnd = true; SFX("laserCharge"); }
      if (b.t >= 0.9) { b.state = "laser"; b.t = 0; b.laser = true; b.chargeSnd = false; }
    } else if (b.state === "laser") {
      // Continuous goggle laser locked onto the Lantern's hitbox: only the forcefield stops it
      const e = eyes(b);
      b.aim = Math.atan2(pc.y - e.y, pc.x - e.x);
      const dx = Math.cos(b.aim), dy = Math.sin(b.aim);
      // Distance from player to the laser line
      const px = pc.x - e.x, py = pc.y - e.y, along = px * dx + py * dy;
      const off = Math.abs(px * dy - py * dx);
      b.laserLen = 900;
      if (along > 0 && s.p.shield) {
        if (off < T.shield.r) { b.laserLen = Math.max(0, along - Math.sqrt(Math.max(0, T.shield.r ** 2 - off ** 2))); if (Math.random() < 0.5) sparks(e.x + dx * b.laserLen, e.y + dy * b.laserLen, C.bright, 2, 60); hitShield(T.shield.laserDps * dt); }
      } else if (along > 0) {
        b.laserLen = along + 3;
        if (Math.random() < 0.5) sparks(pc.x - dx * 3, pc.y - dy * 3, "#ff8a8a", 2, 60);
        s.laserHitT += dt;
        if (s.laserHitT > 0.12) { hurtPlayer(Math.round(T.boss.laserDps * s.laserHitT), e.x, e.y); s.laserHitT = 0; s.p.inv = Math.min(s.p.inv, 0.1); }
      }
      if (b.t >= 2.0) { b.laser = false; b.state = "rest"; b.t = 0; b.wait = 1.4; b.next = "crush"; }
    } else if (b.state === "crush") {
      // Crush: raise both gold arms, charge at the Lantern, and slam them into the ground where he stood
      const A = T.boss.crush;
      if (!b.crush) b.crush = { phase: "wind", t: 0 };
      const cr = b.crush; cr.t += dt;
      if (cr.blast) cr.blast = Math.max(0, cr.blast - dt);
      if (cr.phase === "wind" && cr.t >= A.wind / rage) {
        cr.phase = "dash"; cr.t = 0; SFX("dash");
        cr.to = { x: Math.max(40, Math.min(W - 40, s.p.x)), y: Math.max(s.camY + 90, Math.min(s.camY + H - 20, s.p.y + 6)) };
        // he always reaches the circle: the dash takes as long as the distance needs (never less than a beat)
        cr.from = { x: b.x, y: b.y }; cr.dur = Math.max(0.3, Math.hypot(cr.to.x - b.x, cr.to.y - b.y) / (A.speed * rage));
      } else if (cr.phase === "dash") {
        const u = Math.min(1, cr.t / cr.dur), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        b.x = cr.from.x + (cr.to.x - cr.from.x) * e; b.y = cr.from.y + (cr.to.y - cr.from.y) * e;
        if (Math.random() < 0.6) sparks(b.x + (Math.random() - 0.5) * 30, b.y - 2, "#9aa3ab", 1, 30);
        if (u >= 1) { b.x = cr.to.x; b.y = cr.to.y; cr.phase = "slam"; cr.t = 0; }
      } else if (cr.phase === "slam" && cr.t >= A.slam) {
        cr.phase = "recover"; cr.t = 0;
        // the ground slam: a shockwave of dust and gold, and anything close takes the hit
        // he lands dead centre in the marked circle, and the whole circle is the blast
        const gx = cr.to.x, gy = cr.to.y - 4;
        s.rings.push({ x: gx, y: gy, r: 6, life: 0.3, sp: 190, thin: true, color: C.gold });
        cr.blast = 0.35; SFX("slam");
        s.shake = Math.max(s.shake, 0.35);
        sparks(gx, gy, C.gold, 16, 150); sparks(gx, gy, "#9aa3ab", 14, 110);
        // hit if any part of his boots is inside the circle (it lies flat on the ground: an ellipse)
        const fx = Math.max(s.p.x - 6, Math.min(s.p.x + 6, gx)), fy = s.p.y - 2;
        if (((fx - gx) / A.r) ** 2 + ((fy - gy) / (A.r * 0.45)) ** 2 <= 1) {
          if (s.p.shield) hitShield(A.shieldHit);
          else hurtPlayer(A.dmg, gx, gy);
        }
      } else if (cr.phase === "recover" && cr.t >= A.recover) {
        b.crush = null; b.state = "rest"; b.t = 0; b.wait = 1.0; b.next = "triple";
      }
    }
    // ---- Animated pose: parts of his sprite (head, each gold arm) move on their own ----
    const vx = (b.x - px0) / Math.max(dt, 1e-4), vy = (b.y - py0) / Math.max(dt, 1e-4), spd = Math.hypot(vx, vy);
    // He always tracks the Lantern, like the mouse turns the hero: a facing angle eases round toward him and
    // picks the nearest of six views (no flat side views), so he turns smoothly through the diagonals
    const ta = Math.atan2(pc.y - (b.y - 36), pc.x - b.x);
    if (b.faceA == null) b.faceA = ta;
    { const da = Math.atan2(Math.sin(ta - b.faceA), Math.cos(ta - b.faceA)); b.faceA += da * Math.min(1, dt * 7); }
    const fdeg = ((b.faceA * 180 / Math.PI) % 360 + 360) % 360;
    const sector = (d) => { const c = OTTO_FACE[d]; return Math.abs(((fdeg - c + 540) % 360) - 180); };
    let d = b.dir && OTTO_FACE[b.dir] != null && sector(b.dir) < 36 ? b.dir : null;   // a little hysteresis: no flicker on the seams
    if (!d) d = Object.keys(OTTO_FACE).reduce((a, k) => (sector(k) < sector(a) ? k : a), "down");
    // the goggle laser needs his eyes: while it charges and fires he keeps a front three-quarter view
    if ((b.state === "charge" || b.state === "laser") && d.startsWith("up")) d = pc.x >= b.x ? "downright" : "downleft";
    b.dir = d;
    // inside a view the head keeps turning a little, so the tracking reads as continuous between view changes
    const lean = Math.max(-1, Math.min(1, (((fdeg - OTTO_FACE[d] + 540) % 360) - 180) / 30));
    b.faceLean = (d.startsWith("up") ? 1 : -1) * lean * 1.6;
    b.walkPh = (b.walkPh || 0) + dt * (4 + spd * 0.06);
    const mv = Math.min(1, spd / 40), sw = Math.sin(b.walkPh);
    let tg;
    if (b.state === "charge" || b.state === "laser") {
      // firing the goggle laser: arms thrown back, head pushed forward along the beam
      const k = b.state === "laser" ? 1 : Math.min(1, b.t / 0.5), ax = Math.cos(b.aim || Math.PI / 2), ay = Math.sin(b.aim || Math.PI / 2);
      const tr = b.state === "laser" ? (Math.random() - 0.5) * 1.2 : 0;
      tg = { hx: ax * 4 * k + tr, hy: (ay * 3 + 2) * k, la: 0.22 * k, lay: -2 * k, ra: -0.22 * k, ray: -2 * k, lift: 0 };
    } else if (b.state === "crush" && b.crush) {
      // arms swing round from the shoulder: up and over his head, then down in front for the slam
      const ph = b.crush.phase, r = 1 - b.crush.t / T.boss.crush.recover;
      if (ph === "wind" || ph === "dash") tg = { hx: 0, hy: -1, la: -0.12, lay: 0, ra: 0.12, ray: 0, lift: 1 };   // both arms swung forward and up over his head
      else if (ph === "slam") tg = { hx: 0, hy: 3, la: -0.2, lay: 3, ra: 0.2, ray: 3, lift: 0 };   // smashed down in front
      else tg = { hx: 0, hy: 2 * r, la: -0.2 * r, lay: 3 * r, ra: 0.2 * r, ray: 3 * r, lift: 0 };
    } else {
      // flying about: arms swing from the shoulder in turn, head bobs and leans into the direction he's going
      tg = { hx: Math.max(-3, Math.min(3, vx / 25)), hy: Math.abs(Math.sin(b.walkPh)) * 1.5 * mv + Math.max(0, vy / 40),
             la: sw * 0.16 * mv, lay: Math.max(0, sw) * mv, ra: sw * 0.16 * mv, ray: Math.max(0, -sw) * mv, lift: 0 };
    }
    if (b.throw && ottoDirs[b.dir] && ottoDirs[b.dir].launcher && !(b.state === "crush")) {
      // the launcher arm swings up to point at the Lantern, and kicks back as it fires
      const L = ottoDirs[b.dir].launcher, model = ottoDirs[b.dir], pv = shoulderOf(model.parts[L.arm]);
      const sx = b.x - 26 + pv.x, sy = b.y - 73 - (b.lift ?? BOSS_LIFT) + pv.y;
      let ang = Math.atan2(pc.y - sy, pc.x - sx) - Math.PI / 2;
      ang = Math.max(-1.35, Math.min(1.35, ang));
      const kick = b.throw.done && b.throw.t < T.boss.release + 0.12 ? -Math.sign(ang || 1) * 0.25 : 0;
      if (L.arm === "armL") { tg.la = ang + kick; tg.lay = kick ? -2 : 0; } else { tg.ra = ang + kick; tg.ray = kick ? -2 : 0; }
    }
    tg.hx = Math.max(-4, Math.min(4, tg.hx + (b.faceLean || 0)));
    if (!b.pose || b.pose.la == null) b.pose = { hx: 0, hy: 0, la: 0, lay: 0, ra: 0, ray: 0, lift: 0 };
    const ease = Math.min(1, dt * (b.crush && b.crush.phase === "slam" ? 45 : 14));
    for (const k in tg) b.pose[k] += (tg[k] - b.pose[k]) * ease;
  }

  // ---------- Level 2: the desert and the two Manhunters ----------
  // After Otto Zundapt falls the sky turns to a desert. Two Manhunters fly in, one from each side. They take turns
  // to punch (only one comes in for a body shot at a time), throw pairs of sand tornadoes and fire pairs of red and
  // green laser shots, one from each hand: the left one fires left hand then right, the right one right then left.
  // A shot is thrown like a ki blast: the arm swings up to point at the Lantern and energy gathers in the open palm.
  const MH_W = 36, MH_H = 66;
  const L2_FLOOR = floorY(H) + L2.floorMargin;   // screen y: feet stay on the sand, never up over the dunes
  const [TW, TH] = L2.tornado.size;
  function enterLevel2(instant) {
    s.level = 2; s.l2 = { t: instant ? L2.spawnAt - 0.5 : 0, fade: instant ? 1 : 0, spawned: false, won: false, wonT: 0, turn: -1, move: 0 };
    s.boss = null; s.blades = []; s.rats = []; s.hunters = []; s.tornados = []; s.bolts = []; s.meleeOwner = null;
    s.camY = BOSS_STOP; s.kills = Math.max(s.kills, 99);
    if (instant) { s.p.x = W / 2; s.p.y = BOSS_STOP + H - 40; }
    s.p.hp = T.hp;   // a breather between levels: back to full health
    s.banner = { text: "LEVEL 2", sub: "THE DESERT", t: 2.4 };
    if (!s.test) resumeLevel = 2;   // dying from here on retries level 2
  }
  function spawnHunters() {
    s.l2.spawned = true;
    for (const side of [-1, 1]) {
      s.hunters.push({ isHunter: true, side, name: L2.names[side < 0 ? 0 : 1], x: side < 0 ? -30 : W + 30, y: s.camY + L2_FLOOR + 70, homeX: side < 0 ? W * 0.27 : W * 0.73, guard: L2.guard.hits,
        hp: L2.hp, max: L2.hp, state: "enter", t: 0, flash: 0, dir: "down", faceA: Math.PI / 2,
        pose: { la: 0, ra: 0, lx: 0, rx: 0, hy: 0 }, wait: side < 0 ? 0.4 : 0, seq: null, goal: null, hand: "armL" });
    }
    s.banner = { text: L2.names.join(" & "), sub: "DEFEAT BOTH", t: 2.2 };
  }
  const hunterLive = (h) => h.state !== "enter" && h.state !== "dead";
  const hunterBox = (h) => { const sk = h.sink || 0; return { x: h.x, y: h.y - (h.lift ?? L2.lift) - 33 + sk / 2, w: 26, h: 60 - sk }; };
  function hitHunter(h, dmg, kind) {
    if (!hunterLive(h)) return;
    dmg *= L2.dmgBoost;   // level 2: every Lantern attack hits 35% harder
    h.hp = Math.max(0, h.hp - dmg); h.flash = 0.08;
    // countering the rush: hits while he charges in wear down his guard; empty it and he drops to one knee
    if (h.state === "melee" && h.melee && h.melee.phase !== "recover" && h.hp > 0) {
      if (kind === "beam") { h.guardBeam = (h.guardBeam || 0) + 1; if (h.guardBeam >= L2.guard.beamTicks) { h.guardBeam = 0; h.guard--; } }
      else h.guard--;
      sparks(h.x, h.y - (h.lift ?? L2.lift) - 70, "#ffd34a", 5, 60);
      if (h.guard <= 0) stunHunter(h);
    }
    s.score += Math.round(dmg * 10); gainBmp(dmg * T.bmp.perBossHp);
    if (h.hp <= 0) {
      const hadTurn = s.l2 && s.l2.turn === h.side && h.state !== "rest";
      h.state = "dead"; h.t = 0; h.seq = null; h.melee = null; h.stun = null; h.sink = 0;
      if (hadTurn) endTurn(h);
      if (s.meleeOwner === h) s.meleeOwner = null;
      s.shake = Math.max(s.shake, 0.4);
      const b = hunterBox(h); sparks(b.x, b.y, C.red, 24, 140); sparks(b.x, b.y, "#5a8cff", 16, 120);
    }
  }
  // Shoulder and hand of one arm, in world coordinates, for the facing and pose being drawn.
  // ang turns the arm about its shoulder; ext slides it out along itself (a punch or a thrust palm).
  function mhJoint(h, arm) {
    const m = mhDirs[h.dir] || mhDirs.down, X = Math.round(h.x - MH_W / 2), Y = Math.round(h.y - MH_H - (h.lift ?? L2.lift));
    if (!m) return { sx: h.x, sy: Y + 15, x: h.x, y: Y + 38, a0: Math.PI / 2 };
    const sh = m.shoulder[arm], hd = m.hand[arm], ang = arm === "armL" ? h.pose.la : h.pose.ra, ext = arm === "armL" ? h.pose.lx : h.pose.rx;
    const vx = hd[0] - sh[0], vy = hd[1] - sh[1], c = Math.cos(ang), sn = Math.sin(ang), len = Math.hypot(vx, vy) || 1;
    const rx = vx * c - vy * sn, ry = vx * sn + vy * c;
    return { sx: X + sh[0], sy: Y + sh[1], x: X + sh[0] + rx + (rx / len) * ext, y: Y + sh[1] + ry + (ry / len) * ext, a0: Math.atan2(vy, vx) };
  }
  // the turn that points an arm at (tx, ty), kept to a natural reach
  function armAim(h, arm, tx, ty) {
    const j = mhJoint(h, arm);
    let a = Math.atan2(ty - j.sy, tx - j.sx) - j.a0;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    return Math.max(-2.7, Math.min(2.7, a));
  }
  // Guard broken: a stagger, a fall onto one knee (side-on, facing the Lantern), 3 seconds stunned, then back up
  function stunHunter(h) {
    const hadTurn = s.l2 && s.l2.turn === h.side;
    h.state = "stun"; h.t = 0; h.seq = null; h.melee = null; h.guardBeam = 0;
    if (hadTurn) endTurn(h);
    if (s.meleeOwner === h) s.meleeOwner = null;
    h.stun = { t: 0, side: s.p.x >= h.x ? 1 : -1, landed: false };
    s.banner = { text: h.name + " STUNNED", t: 1.2 };
    s.shake = Math.max(s.shake, 0.2); SFX("stun");
    const b = hunterBox(h); sparks(b.x, b.y, "#c8f0ff", 18, 130); sparks(b.x, b.y, "#ffffff", 8, 100);
    s.rings.push({ x: b.x, y: b.y, r: 4, life: 0.3, sp: 180, thin: true, color: "#c8f0ff" });
  }
  const HAND_ORDER = (h) => (h.side < 0 ? ["armL", "armR"] : ["armR", "armL"]);
  const CYCLE = ["laser", "tornado", "melee"];
  // Turn order: Zephelone (left) leads, Asmodius copies the same move, then the next move in the cycle.
  // A Manhunter that is down, stunned or not in yet is skipped; on his own, one just works through the cycle.
  const canAct = (h) => h && !h.gone && (h.state === "rest" || h.state === "shoot" || h.state === "melee");
  function myTurn(h) {
    const other = s.hunters.find((o) => o !== h);
    return s.l2.turn === h.side || !canAct(other);
  }
  function endTurn(h) {
    const L = s.l2, other = s.hunters.find((o) => o !== h && canAct(o));
    if (other && h.side === -1) { L.turn = other.side; }                 // the leader went: now the copy
    else { L.move++; L.turn = other ? other.side : h.side; }             // pair done (or solo): next move
    if (other && L.turn === other.side && other.state === "rest") { other.t = 0; other.wait = L2.rest[0] + Math.random() * (L2.rest[1] - L2.rest[0]); }
  }
  function updateLevel2(dt, pc, pb) {
    const L = s.l2;
    L.t += dt; L.fade = Math.min(1, L.fade + dt / L2.fade);
    if (!L.spawned && L.t >= L2.spawnAt) spawnHunters();
    for (const h of s.hunters) updateHunter(h, dt, pc, pb);
    s.hunters = s.hunters.filter((h) => !h.gone);
    // their shots
    for (const b of s.bolts) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (s.p.shield && Math.hypot(b.x - pc.x, b.y - pc.y) < T.shield.r + 2) {
        b.dead = true; hitShield(L2.bolt.shieldHit); sparks(b.x, b.y, b.color === "red" ? "#ff8080" : C.bright, 8, 80);
      } else if (!s.p.shield && boxDist(b.x, b.y, pb) < 3) {
        b.dead = true; hurtPlayer(L2.bolt.dmg, b.x - b.vx * 0.05, b.y - b.vy * 0.05); sparks(b.x, b.y, b.color === "red" ? C.red : C.green, 8, 80);
      }
      if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < s.camY - 30 || b.y > s.camY + H + 30) b.dead = true;
    }
    s.bolts = s.bolts.filter((b) => !b.dead);
    for (const tw of s.tornados) {
      tw.t += dt; tw.x += tw.vx * dt; tw.y += tw.vy * dt;
      if (Math.random() < 0.5) s.fx.push({ x: tw.x + (Math.random() - 0.5) * 16, y: tw.y - Math.random() * 20, vx: (Math.random() - 0.5) * 40, vy: -10 - Math.random() * 20, life: 0.3, color: Math.random() < 0.5 ? "#e6c088" : "#b06a40" });
      const cy = tw.y - TH / 2, boxes = tornadoBoxes(tw);
      const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
      if (s.p.shield && boxes.some((bx) => boxDist(pc.x, pc.y, bx) < T.shield.r)) {
        tw.dead = true; hitShield(L2.tornado.shieldHit); sparks(tw.x, cy, "#e6c088", 16, 110); sparks(tw.x, cy, "#9aa3ab", 10, 90);
      } else if (!s.p.shield && boxes.some((bx) => overlap(bx, pb))) {
        tw.dead = true; hurtPlayer(L2.tornado.dmg, tw.x, cy); sparks(tw.x, cy, "#e6c088", 16, 110);
      }
      if (tw.t > L2.tornado.life || tw.x < -30 || tw.x > W + 30 || tw.y < s.camY - 30 || tw.y > s.camY + H + 40) tw.dead = true;
    }
    s.tornados = s.tornados.filter((t) => !t.dead);
    // both down: the level is won
    if (L.spawned && !L.won && s.hunters.length === 0) {
      L.won = true; L.wonT = 0; s.bolts = []; s.tornados = [];
      s.banner = { text: L2.names.join(" & ") + " DEFEATED", t: 2 };
      s.score += 4000 + s.p.hp * 10;
    }
    if (L.won && (L.wonT += dt) > 1.6 && s.mode === "play") { s.mode = "won"; s.endTimer = 0; report(true); }
  }
  // The tornado's hitbox: three stacked boxes that follow its funnel (wide top, narrow tip), scaled from the sprite
  // size, and swaying with it exactly as it is drawn.
  function tornadoBoxes(tw) {
    const wob = Math.round(Math.sin(tw.t * 9) * 1.5);
    return L2.tornado.boxes.map(([top, bot, cx, hw]) => ({ x: tw.x + wob + cx * TW, y: tw.y - (top + bot) / 2 * TH, w: hw * 2 * TW, h: (top - bot) * TH }));
  }
  function updateHunter(h, dt, pc, pb) {
    h.t += dt; h.flash = Math.max(0, h.flash - dt);
    const P = L2.punch;
    if (h.state === "dead") {
      if (Math.random() < 0.6) sparks(h.x + (Math.random() - 0.5) * 30, h.y - 10 - Math.random() * 56, Math.random() < 0.5 ? C.red : "#5a8cff", 4, 80);
      if (h.t > 1.2) { h.gone = true; s.rings.push({ x: h.x, y: h.y - 36, r: 6, life: 0.35, sp: 200, thin: true, color: C.red }); }
      return;
    }
    const chest = { x: h.x, y: h.y - (h.lift ?? L2.lift) - 40 };
    // always tracking the Lantern: the facing eases round and picks the nearest of eight views
    const ta = Math.atan2(pc.y - chest.y, pc.x - chest.x);
    { const da = Math.atan2(Math.sin(ta - h.faceA), Math.cos(ta - h.faceA)); h.faceA += da * Math.min(1, dt * 8); }
    if (h.state !== "stun") h.dir = dirOf(h.faceA);
    let tg = { la: 0, ra: 0, lx: 0, rx: 0, hy: 0 }, ease = 10;
    const px0 = h.x, py0 = h.y;
    if (h.state === "stun") {
      // stagger -> drop -> on one knee for 3 s (crackling with energy) -> back up. Side-on, facing the Lantern.
      const G = L2.guard, st = h.stun; st.t += dt;
      h.dir = st.side > 0 ? "right" : "left";
      const tFall = G.stagger, tKneel = G.stagger + G.fall, tRise = tKneel + G.stun, tEnd = tRise + G.rise;
      if (st.t < tFall) { h.frame = null; h.sink = 0; tg = { la: -0.5 * st.side, ra: -0.5 * st.side, lx: 0, rx: 0, hy: -2 }; ease = 20; }
      else if (st.t < tKneel) { h.frame = "stun_half"; h.sink = 16; tg = { la: 0.25 * st.side, ra: 0.25 * st.side, lx: 0, rx: 0, hy: 1 }; ease = 18; }
      else if (st.t < tRise) {
        if (!st.landed) { st.landed = true; s.shake = Math.max(s.shake, 0.15); sparks(h.x, h.y, "#e6c088", 14, 90); SFX("boulderHit"); }
        h.frame = "stun_kneel"; h.sink = 26;   // back arched over the raised knee, head down, arms resting on the knee
        if (Math.random() < dt * 2.5) SFX("zap");
      } else if (st.t < tEnd) { h.frame = "stun_half"; h.sink = 16; }
      else { h.state = "rest"; h.t = 0; h.stun = null; h.frame = null; h.sink = 0; h.guard = G.hits; h.wait = 0.4; }
    } else if (h.state === "enter") {
      const dx = h.homeX - h.x; h.x += Math.sign(dx) * Math.min(Math.abs(dx), L2.enterSpeed * dt);
      if (Math.abs(dx) < 2) { h.state = "rest"; h.t = 0; }
    } else if (h.state === "rest") {
      // drift about their own half of the arena between attacks
      const lo = h.side < 0 ? 50 : W / 2 + 40, hi = h.side < 0 ? W / 2 - 40 : W - 50;
      if (!h.goal || Math.hypot(h.goal.x - h.x, h.goal.y - h.y) < 6) h.goal = { x: lo + Math.random() * (hi - lo), y: s.camY + L2_FLOOR + 20 + Math.random() * (H - L2_FLOOR - 50) };
      const gx = h.goal.x - h.x, gy = h.goal.y - h.y, gd = Math.hypot(gx, gy) || 1;
      h.x += (gx / gd) * Math.min(gd, L2.speed * dt); h.y += (gy / gd) * Math.min(gd, L2.speed * dt);
      if (h.t >= h.wait && myTurn(h) && !(s.meleeOwner && s.meleeOwner !== h)) {
        const next = CYCLE[s.l2.move % CYCLE.length];   // the same move the other one just made (or leads the next)
        s.l2.turn = h.side; h.t = 0;
        if (next === "melee") { h.state = "melee"; s.meleeOwner = h; h.guard = L2.guard.hits; h.guardBeam = 0; h.melee = { phase: "approach", t: 0, arm: h.hand = h.hand === "armL" ? "armR" : "armL", hit: false }; }
        else { h.state = "shoot"; h.seq = { kind: next, hands: HAND_ORDER(h), i: 0, t: 0, phase: "charge" }; SFX("mhCharge"); }
      }
    } else if (h.state === "shoot") {
      const q = h.seq, A = L2[q.kind === "laser" ? "bolt" : "tornado"], arm = q.hands[q.i];
      q.t += dt;
      const aim = armAim(h, arm, pc.x, pc.y);
      if (arm === "armL") { tg.la = aim; tg.lx = q.phase === "charge" ? 4 : 6; } else { tg.ra = aim; tg.rx = q.phase === "charge" ? 4 : 6; }   // palm thrust out at the Lantern
      if (q.phase === "charge" && q.t >= A.charge) {
        const j = mhJoint(h, arm), a = Math.atan2(pc.y - j.y, pc.x - j.x);
        if (q.kind === "laser") {
          s.bolts.push({ x: j.x, y: j.y, vx: Math.cos(a) * A.speed, vy: Math.sin(a) * A.speed, color: arm === "armL" ? "red" : "green", life: 3 });
          SFX("bolt");
        } else {
          s.tornados.push({ x: j.x, y: j.y + TH / 2, vx: Math.cos(a) * A.speed, vy: Math.sin(a) * A.speed, t: 0 });
          SFX("tornado");
        }
        sparks(j.x, j.y, q.kind === "laser" ? (arm === "armL" ? C.red : C.green) : "#e6c088", 8, 90);
        q.phase = "recoil"; q.t = 0;
        if (arm === "armL") tg.lx = -3; else tg.rx = -3;
      } else if (q.phase === "recoil" && q.t >= A.gap) {
        q.i++; q.t = 0; q.phase = "charge";
        if (q.i >= q.hands.length) { h.seq = null; h.state = "rest"; h.t = 0; h.wait = L2.rest[0] + Math.random() * (L2.rest[1] - L2.rest[0]); endTurn(h); }
        else SFX("mhCharge");
      }
      ease = 16;
    } else if (h.state === "melee") {
      const mo = h.melee, arm = mo.arm; mo.t += dt;
      const d = Math.hypot(pc.x - h.x, pc.y - chest.y);
      if (mo.phase === "approach") {
        const gx = pc.x - h.x, gy = pc.y + 26 - h.y, gd = Math.hypot(gx, gy) || 1;
        h.x += (gx / gd) * Math.min(gd, P.approach * dt); h.y += (gy / gd) * Math.min(gd, P.approach * dt);
        if (d < P.reach + 6) { mo.phase = "wind"; mo.t = 0; }
        else if (mo.t > P.maxApproach) { mo.phase = "recover"; mo.t = 0; }
      } else if (mo.phase === "wind") {
        if (mo.t >= P.wind) { mo.phase = "strike"; mo.t = 0; SFX("ratSwing"); mo.dir = Math.atan2(pc.y - chest.y, pc.x - chest.x); }
      } else if (mo.phase === "strike") {
        h.x += Math.cos(mo.dir) * (P.lunge / P.strike) * dt; h.y += Math.sin(mo.dir) * (P.lunge / P.strike) * dt;
        if (!mo.hit && mo.t >= P.strike * 0.5) {
          mo.hit = true;
          const j = mhJoint(h, arm);
          if (s.p.shield && Math.hypot(j.x - pc.x, j.y - pc.y) < T.shield.r + 8) {
            hitShield(P.shieldHit); sparks(j.x, j.y, C.bright, 10, 90); s.shake = Math.max(s.shake, 0.1);
            h.x -= Math.cos(mo.dir) * 14; h.y -= Math.sin(mo.dir) * 14;
          } else if (!s.p.shield && boxDist(j.x, j.y, pb) < 9) {
            hurtPlayer(P.dmg, h.x, chest.y); SFX("hit"); s.shake = Math.max(s.shake, 0.14);
          }
        }
        if (mo.t >= P.strike) { mo.phase = "recover"; mo.t = 0; }
      } else if (mo.phase === "recover" && mo.t >= P.recover) {
        h.melee = null; h.state = "rest"; h.t = 0; h.wait = L2.rest[0] + Math.random() * (L2.rest[1] - L2.rest[0]);
        if (s.meleeOwner === h) s.meleeOwner = null;
        endTurn(h);
      }
      if (h.melee) {
        // the punching arm: cocked back on the wind-up, driven straight into his middle on the strike
        const aim = armAim(h, arm, pc.x, pc.y), ext = mo.phase === "wind" ? -5 : mo.phase === "strike" ? 10 : mo.phase === "recover" ? 4 * (1 - mo.t / P.recover) : 0;
        const up = mo.phase === "approach" ? aim * 0.35 : aim;
        if (arm === "armL") { tg.la = up; tg.lx = ext; } else { tg.ra = up; tg.rx = ext; }
        ease = mo.phase === "strike" ? 40 : 14;
      }
    }
    // stay inside the arena
    h.x = Math.max(20, Math.min(W - 20, h.x)); if (h.state !== "enter") h.x = Math.max(20, Math.min(W - 20, h.x));
    h.y = Math.max(s.camY + L2_FLOOR, Math.min(s.camY + H - 6, h.y));
    // solid: the Lantern can't fly through them
    if (h.state !== "enter") {
      const bx = hunterBox(h);
      if (Math.abs(pb.x - bx.x) < (pb.w + bx.w) / 2 && Math.abs(pb.y - bx.y) < (pb.h + bx.h) / 2) {
        const ox = pb.x - bx.x, push = (bx.w + pb.w) / 2 + 1 - Math.abs(ox), step = 260 * dt;
        s.p.x += Math.sign(ox || 1) * Math.min(push, step);
        if (s.p.shield) hitShield(T.shield.touchDps * dt);
      }
    }
    // idle sway when nothing else moves the arms
    const spd = Math.hypot(h.x - px0, h.y - py0) / Math.max(dt, 1e-4), sw = Math.sin(h.t * 5 + h.side) * Math.min(1, spd / 50);
    if (h.state === "rest" || h.state === "enter") { tg.la += sw * 0.12; tg.ra += sw * 0.12; tg.hy = Math.abs(sw); }
    const k = Math.min(1, dt * ease);
    for (const key in tg) h.pose[key] += (tg[key] - h.pose[key]) * k;
  }
  function drawHunter(h) {
    const m = mhDirs[h.dir] || mhDirs.down;
    if (!m) return;
    const bob = h.state === "dead" ? 0 : Math.sin(s.t * 3 + h.side) * 1.5;
    h.lift = h.state === "stun" ? (h.stun.t < L2.guard.stagger ? Math.round(L2.lift * (1 - h.stun.t / L2.guard.stagger)) : 0) : Math.round(L2.lift + bob);   // knocked out of the air
    // the stun frames are whole side-on sprites (48 wide, feet at x=20 facing right; mirrored for left)
    const fr = h.state === "stun" && h.frame ? h.frame : null;
    const face = h.dir && h.dir.includes("left") ? -1 : 1, sink = h.sink || 0;
    ctx.fillStyle = "rgba(0,0,0,.32)"; ctx.beginPath(); ctx.ellipse(Math.round(h.x), Math.round(h.y - 1), 13, 3, 0, 0, 7); ctx.fill();
    if (h.state === "dead" && Math.floor(h.t * 10) % 2) ctx.globalAlpha = 0.5;
    const X = Math.round(h.x - MH_W / 2), Y = Math.round(h.y - MH_H - h.lift), parts = h.flash > 0 ? m.flash : m.parts;
    if (fr && parts[fr]) {
      const img = parts[fr], ax = face > 0 ? 20 : img.width - 20;
      ctx.drawImage(img, Math.round(h.x) - ax, Math.round(h.y) - img.height);
    } else for (const k of m.order) {
      if (k === "armL" || k === "armR") {
        const sh = m.shoulder[k], hd = m.hand[k], ang = k === "armL" ? h.pose.la : h.pose.ra, ext = k === "armL" ? h.pose.lx : h.pose.rx;
        const a = Math.atan2(hd[1] - sh[1], hd[0] - sh[0]) + ang;
        ctx.save(); ctx.translate(X + sh[0] + Math.cos(a) * ext, Y + sh[1] + Math.sin(a) * ext); ctx.rotate(ang);
        ctx.drawImage(parts[k], -sh[0], -sh[1]); ctx.restore();
      } else ctx.drawImage(parts[k], X, Y + (k === "head" ? Math.round(h.pose.hy || 0) : 0));
    }
    ctx.globalAlpha = 1;
    // their eyes glow when they're about to strike
    if (m.eye && h.state !== "dead" && (h.seq || h.melee)) {
      ctx.fillStyle = "#c8ffff"; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(s.t * 30);
      for (const [ex, ey] of m.eye) ctx.fillRect(X + ex - 1, Y + ey - 1 + Math.round(h.pose.hy || 0), 2, 2);
      ctx.globalAlpha = 1;
    }
    // his guard during a rush: three pips over his head. Land three hits before he connects to stun him.
    if (h.state === "melee" && h.melee && h.melee.phase !== "recover") {
      const n = L2.guard.hits, bw = 7, gx = Math.round(h.x - (n * (bw + 2) - 2) / 2), gy = Y - 8;
      ctx.fillStyle = "#000"; ctx.fillRect(gx - 2, gy - 2, n * (bw + 2) + 2, 7);
      for (let i = 0; i < n; i++) {
        const on = i < h.guard;
        ctx.fillStyle = on ? "#ffd34a" : "#3a3020"; ctx.fillRect(gx + i * (bw + 2), gy, bw, 3);
        if (on) { ctx.fillStyle = "#fff4c0"; ctx.fillRect(gx + i * (bw + 2), gy, bw, 1); }
      }
    }
    // stunned: crackling energy arcs off him and sparkles of light run down his legs
    if (h.state === "stun" && fr === "stun_kneel") {
      const by = Math.round(h.y) - 66 + sink - 6;
      if (Math.floor(s.t * 20) % 3 !== 0) {
        ctx.strokeStyle = "#e8fbff"; ctx.lineWidth = 1; ctx.shadowColor = "#7fd8ff"; ctx.shadowBlur = 6;
        for (let a = 0; a < 2; a++) {   // two forking bolts from the shoulders and back
          let x0 = h.x - face * (6 + Math.random() * 6), y0 = by + 14 + Math.random() * 14;
          ctx.beginPath(); ctx.moveTo(Math.round(x0), Math.round(y0));
          for (let k = 0; k < 4; k++) { x0 += -face * (2 + Math.random() * 4); y0 += (Math.random() - 0.6) * 8; ctx.lineTo(Math.round(x0), Math.round(y0)); }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }
      for (let i = 0; i < 6; i++) {
        const px = h.x + (Math.random() - 0.5) * 16, py = by + 42 + Math.random() * 10;
        ctx.fillStyle = Math.random() < 0.5 ? "#ffffff" : "#8fdcff"; ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
      }
      if (Math.floor(s.t * 6) % 2) text("STUNNED", h.x, by + 2, 5, "#8fdcff");
    }
    // energy gathering in the open palm, ki-blast style, before each shot
    const q = h.seq;
    if (q && q.phase === "charge") {
      const arm = q.hands[q.i], j = mhJoint(h, arm), A = L2[q.kind === "laser" ? "bolt" : "tornado"], k = Math.min(1, q.t / A.charge);
      if (q.kind === "laser") {
        const col = arm === "armL" ? [255, 59, 59] : [47, 216, 95], r = 3 + 6 * k + Math.sin(s.t * 40) * 0.6;
        const g = ctx.createRadialGradient(j.x, j.y, 0, j.x, j.y, r * 2.4);
        g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3, "rgba(255,255,255,0.9)"); g.addColorStop(0.45, `rgba(${col},0.95)`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(j.x, j.y, r * 2.4, 0, 7); ctx.fill();
        // sparks being drawn in toward the palm
        for (let i = 0; i < 4; i++) { const a = s.t * 9 + i * 1.57, d = r * 3 * (1 - ((s.t * 3 + i * 0.25) % 1)); ctx.fillStyle = `rgb(${col})`; ctx.fillRect(Math.round(j.x + Math.cos(a) * d), Math.round(j.y + Math.sin(a) * d), 1, 1); }
      } else {
        // sand whirling round the palm
        for (let i = 0; i < 6; i++) {
          const a = s.t * 14 + i * 1.05, r = 3 + 5 * k;
          ctx.fillStyle = i % 2 ? "#e6c088" : "#8a8f96"; ctx.fillRect(Math.round(j.x + Math.cos(a) * r), Math.round(j.y + Math.sin(a) * r * 0.6), 2, 2);
        }
      }
    }
  }
  function drawL2Shots() {
    for (const tw of s.tornados) {
      const img = tornadoImgs[Math.floor(tw.t * 14) % tornadoImgs.length];
      if (!img || !img.complete) continue;
      const wob = Math.round(Math.sin(tw.t * 9) * 1.5);
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(Math.round(tw.x - 5), Math.round(tw.y), 10, 2);
      ctx.drawImage(img, Math.round(tw.x - img.width / 2 + wob), Math.round(tw.y - img.height));
    }
    for (const b of s.bolts) {
      const img = boltImgs[b.color];
      if (!img || !img.complete) continue;
      ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.shadowColor = b.color === "red" ? C.red : C.green; ctx.shadowBlur = 6;
      ctx.drawImage(img, -img.width + 3, -Math.floor(img.height / 2)); ctx.restore();
    }
  }

  // ---------- Draw ----------
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function drawBackground() {
    if (s.level === 2 && s.l2 && s.l2.fade >= 1) { desertImg = desertImg || makeDesert(W, H); ctx.drawImage(desertImg, 0, 0); return; }
    drawSpace();
    if (s.level === 2 && s.l2) {   // the space backdrop gives way to the desert
      desertImg = desertImg || makeDesert(W, H);
      ctx.globalAlpha = s.l2.fade; ctx.drawImage(desertImg, 0, 0); ctx.globalAlpha = 1;
    }
  }
  function drawSpace() {
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < stars.length; i++) {
      const st = stars[i];
      if (!settings.manyStars && i % 3) continue;
      const y = ((st.y - s.camY * st.z) % (H * 3) + H * 3) % (H * 3);
      if (y > H) continue;
      const tw = 0.5 + 0.5 * Math.sin(s.t * 2 + st.tw);
      ctx.globalAlpha = 0.55 + tw * 0.45;
      ctx.fillStyle = st.g ? "#ffffff" : "#c9d2dc";
      ctx.fillRect(st.x | 0, y | 0, st.z > 0.5 ? 2 : 1, st.z > 0.5 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }
  function blit(img, x, y, flipX) { ctx.drawImage(img, Math.round(x), Math.round(y)); }
  function drawPlayer() {
    const p = s.p;
    if (s.mode === "over" && s.endTimer > 0.1) return;
    // brief see-through blink while invincible, instead of vanishing every other frame
    const blink = p.inv > 0 && Math.floor(p.inv * 12) % 2 && p.bmpAnim <= 0;
    const lift = p.bmpAnim > 0 ? -Math.min(8, (1.8 - p.bmpAnim) * 14) : 0;
    // The Lantern flies: a smooth, floaty bob while hovering that tightens up once he's under way.
    const fly = Math.min(1, p.fly || 0), ph = p.hoverPh || 0;
    const bob = Math.sin(ph) * (2.2 - fly * 1.4);
    const hover = p.human ? 0 : Math.round(8 + bob);   // on foot in human form
    p.hover = hover;
    // shadow shrinks and fades as he rises
    const sw = Math.round(16 - bob * 1.5);
    ctx.globalAlpha = 0.6 - bob * 0.05; ctx.fillStyle = "#000";
    ctx.fillRect(Math.round(p.x - sw / 2), p.y - 2, sw, 2); ctx.fillRect(Math.round(p.x - sw / 2 + 3), p.y - 3, sw - 6, 1);
    // ring energy glowing under the boots; it streams out behind him in flight
    ctx.globalAlpha = p.human ? 0 : 0.35 + 0.25 * Math.sin(s.t * 9);
    ctx.fillStyle = C.green; ctx.fillRect(p.x - 3, p.y - hover + 1, 6, 1);
    ctx.globalAlpha = p.human ? 0 : 0.18; ctx.fillRect(p.x - 2, p.y - hover + 3, 4, 1);
    ctx.globalAlpha = 1;
    if (p.moving && p.boosting) for (let i = 0; i < 2; i++) s.fx.push({ x: p.x + (Math.random() - 0.5) * 10, y: p.y - hover - Math.random() * 30, vx: -(p.mv?.[0] || 0) * 60, vy: -(p.mv?.[1] || 0) * 60, life: 0.2, color: i ? C.green : C.bright });
    if (p.moving && !p.human && Math.random() < 0.6) s.fx.push({ x: p.x + (Math.random() - 0.5) * 6, y: p.y - hover + 1, vx: -(p.leanX || 0) * 30, vy: 14 - (p.leanY || 0) * 30, life: 0.25, color: Math.random() < 0.5 ? C.bright : C.green });
    const dir = p.bodyDir || p.dir || "down", headDir = p.headDir || dir;
    if ((p.lanternA || 0) > 0) drawRechargeLantern(p, hover);
    if (hero && (p.streak || 0) > 0.03) drawFlightStreaks(p, hover);
    if (hero && p.ghosts) for (const g of p.ghosts) {
      ctx.globalAlpha = 0.28 * (g.life / 0.22);
      ctx.drawImage(hero.ghost[g.dir], Math.round(g.x - 14), Math.round(g.y - 43 - g.hover));
    }
    ctx.globalAlpha = 1;
    if (blink) ctx.globalAlpha = 0.45;
    if (p.bmpAnim > 0) { ctx.shadowColor = C.green; ctx.shadowBlur = 12; }
    // Animated frame for this moment: punch (over the punch's length), or breathing while he holds still
    const animFrame = (human) => {
      if (!hero || !hero.anim || p.flash > 0) return null;
      const set = (k) => hero.anim[k + (human ? "Human" : "")] || {};
      if (p.punch && sprArms(p.punch) && set("onetwo")[dir]) return set("onetwo")[dir][oneTwoFrame(p.punch)];
      if (p.punch && p.punch.off) { const fr = set("idle")[dir]; return noGlove(fr ? fr[0] : (human ? hero.human : hero)[dir], dir); }
      if (p.punch) { const fr = set("punch")[dir]; return fr ? fr[punchFrame(p.punch)] : null; }
      if (!p.moving) { const fr = set("idle")[dir]; return fr ? fr[Math.floor(s.t * hero.animFps.idle) % fr.length] : null; }
      return null;
    };
    // Oath / quick-charge power-up loop
    const oathFrame = (human, left) => {
      const fr = hero && hero.anim && p.flash <= 0 && hero.anim[human ? "oathHuman" : "oath"];
      return fr ? fr[left ? 1 : 0][Math.floor(s.t * hero.animFps.oath) % fr[0].length] : null;
    };
    if (hero && p.bmpAnim > 0 && hero.anim && hero.anim.bmp) {
      // Beware My Power: he faces out, crosses his forearms into an X while the power builds (straining), and
      // flings them apart at the instant the energy burst fires (bmpBurst, 1.05s in), holding it to the end
      const e = 1.8 - p.bmpAnim, fr = hero.anim.bmp;
      const img = e < 0.15 ? fr[0] : e < 1.05 ? fr[1 + (Math.floor(s.t * 12) % 2)] : fr[3];
      ctx.drawImage(img, Math.round(p.x - 14 - 8), Math.round(p.y - 43 + lift - hover));
    } else if (hero && p.human && hero.human && hero.human[dir]) {
      // Human form: Hal in his flight jacket, walking with a little step bounce; he still holds the battery to recharge
      const left = p.lanternSide < 0;
      if (p.recharge && hero.humanCharge) ctx.drawImage(oathFrame(true, left) || (p.flash > 0 ? hero.humanChargeFlash[left ? 1 : 0] : hero.humanCharge[left ? 1 : 0]), Math.round(p.x - (left ? 18 : 14)), Math.round(p.y - 43 + lift));
      else {
        const step = p.moving ? Math.round(Math.abs(Math.sin(p.walk * 1.2)) * -1) : 0;
        const af = animFrame(true), img = af || (p.flash > 0 ? hero.humanFlash : hero.human)[dir];
        const hx0 = Math.round(p.x - (facingLeft() ? img.width - 14 : 14)), hy0 = Math.round(p.y - 43 + lift + step);
        const himg = headDir !== dir && !p.punch && (p.flash > 0 ? hero.humanFlash : hero.human)[headDir];
        if (himg) {   // mid-turn: his head already faces the new way
          ctx.drawImage(img, 0, 15, img.width, img.height - 15, hx0, hy0 + 15, img.width, img.height - 15);
          ctx.drawImage(himg, 0, 0, himg.width, 15, Math.round(p.x - 14), hy0, himg.width, 15);
        } else ctx.drawImage(img, hx0, hy0);
      }
      if (p.morph > 0) { ctx.globalAlpha = p.morph / 0.35 * 0.8; ctx.drawImage(hero.flash[dir], Math.round(p.x - 14), Math.round(p.y - 43 + lift)); ctx.globalAlpha = blink ? 0.45 : 1; }
    } else if (hero && p.superFly && hero.fly && hero.fly[dir]) {
      // Fast flight: arms down, legs together, tilted into the flight and wrapped in a green aura
      const img = p.flash > 0 ? hero.flash[dir] : hero.fly[dir];
      const cx = Math.round(p.x), cy = Math.round(p.y - 43 + lift - hover) + 21;
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate((p.leanX || 0) * 0.24);
      // the aura hugs his outline: a wide soft halo, then a bright rim two pixels out, then the sprite itself
      // with a faint wash of green light over it
      const pulse = 0.85 + 0.15 * Math.sin(s.t * 14), vis = blink ? 0.45 : 1;
      ctx.shadowColor = C.green; ctx.shadowBlur = 16;
      ctx.globalAlpha = 0.45 * pulse * vis; ctx.drawImage(hero.flyGlow[dir], -14, -21);
      ctx.shadowBlur = 6; ctx.globalAlpha = 0.55 * pulse * vis;
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.drawImage(hero.flyGlow[dir], -14 + ox, -21 + oy);
      ctx.shadowBlur = 0; ctx.globalAlpha = vis;
      ctx.drawImage(img, -14, -21);
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.14 * pulse * vis;
      ctx.drawImage(hero.flyGlow[dir], -14, -21);
      ctx.restore();
    } else if (hero && p.recharge && hero.charge) {
      // Recharging: he holds the power battery up in front of him, his ring pressed to it
      const left = p.lanternSide < 0, img = oathFrame(false, left) || (p.flash > 0 ? hero.chargeFlash[left ? 1 : 0] : hero.charge[left ? 1 : 0]);
      const y0 = Math.round(p.y - 43 + lift - hover);
      if (p.oath) {
        ctx.globalAlpha = (0.35 + 0.2 * Math.sin(s.t * 8)) * (blink ? 0.45 : 1);
        for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(hero.chargeGlow[left ? 1 : 0], Math.round(p.x - (left ? 18 : 14)) + ox, y0 + oy);
        ctx.globalAlpha = blink ? 0.45 : 1;
      }
      ctx.drawImage(img, Math.round(p.x - (left ? 18 : 14)), y0);
    } else if (hero) {
      const img = animFrame(false) || (p.flash > 0 ? hero.flash : hero)[dir], iw = img.width;
      const x0 = Math.round(p.x - (facingLeft() ? iw - 14 : 14)), y0 = Math.round(p.y - 43 + lift - hover);
      // Flying: his head leads into the move while his legs trail behind and ripple in the slipstream.
      // Hovering: the legs drift lazily a beat behind the bob.
      const lX = p.leanX || 0, lY = p.leanY || 0;
      const lx = Math.round(-lX * (1.2 + fly) + Math.sin(ph * 0.5) * 0.8 * (1 - fly));
      const ly = Math.round(Math.max(-1, -lY * 2) + Math.sin(s.t * 13) * 0.7 * fly + Math.sin(ph - 0.9) * 0.6 * (1 - fly));
      const hx = Math.round(lX * 1.3), hy = Math.round(Math.max(0, lY) * 1.2);
      if (ly > 0) ctx.drawImage(img, 0, 33, iw, 10, x0 + lx, y0 + 33, iw, 10); // fills the seam when the legs stretch
      ctx.drawImage(img, 0, 33, iw, 10, x0 + lx, y0 + 33 + ly, iw, 10);
      ctx.drawImage(img, 0, 15, iw, 18, x0, y0 + 15, iw, 18);
      const himg = headDir !== dir && !p.punch && (p.flash > 0 ? hero.flash : hero)[headDir];
      if (himg) ctx.drawImage(himg, 0, 0, himg.width, 15, Math.round(p.x - 14) + hx, y0 + hy, himg.width, 15);   // mid-turn: head leads
      else ctx.drawImage(img, 0, 0, iw, 15, x0 + hx, y0 + hy, iw, 15);
    } else {
      const img = (p.flash > 0 ? FLASH : ART)[(dir.includes("up") ? "up" : dir.includes("down") ? "down" : dir) + "0"];
      blit(img, p.x - img.width / 2, p.y - img.height + lift - hover);
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    if ((p.lanternA || 0) > 0) drawLanternConstruct(p, hover);
    // the power ring on his glove, flaring whenever a construct comes out of it
    const rp = ringPos(), rx = Math.round(rp.x), ry = Math.round(rp.y + lift);
    const fl = Math.max(s.ringFlash || 0, p.beam || p.rope ? 0.12 : 0);
    if (p.human) { ctx.fillStyle = C.green; ctx.fillRect(rx, ry, 1, 1); }   // just the ring on his finger, unlit
    else if (fl > 0) {
      ctx.globalAlpha = Math.min(1, fl * 5) * 0.8; ctx.fillStyle = C.bright;
      const rr = Math.round(2 + (0.25 - Math.min(0.25, s.ringFlash || 0)) * 16);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.fillRect(Math.round(rx + Math.cos(a) * rr), Math.round(ry + Math.sin(a) * rr), 1, 1); }
      ctx.fillStyle = "#ffffff"; ctx.fillRect(rx - 1, ry - 1, 3, 3);
      ctx.globalAlpha = 1;
    }
  }
  // Character dialogue: a portrait in a framed square on the left, a grey speech box with a notch pointing at it on
  // the right, and the line typing out with a blinking bar cursor (layout from the user's reference textbox).
  const DIALOG_CPS = 12;   // letters typed per second
  function drawDialog(dl) {
    const px = 40, py = 372, ps = 116, bx = 176, by = 380, bw = W - bx - 40, bh = 100;
    const talking = dl.doneAt == null;
    ctx.save();
    // portrait frame
    ctx.fillStyle = "#c9ced6"; ctx.fillRect(px, py, ps, ps);
    ctx.fillStyle = "#1d2124"; ctx.fillRect(px + 3, py + 3, ps - 6, ps - 6);
    ctx.fillStyle = "#7d848d"; ctx.fillRect(px + 5, py + 5, ps - 10, 1); ctx.fillRect(px + 5, py + ps - 6, ps - 10, 1); ctx.fillRect(px + 5, py + 5, 1, ps - 10); ctx.fillRect(px + ps - 6, py + 5, 1, ps - 10);
    if (dl.who === "otto" && bigRat && bigRat.complete) {
      // Otto's face, cropped from his sprite and blown up in chunky pixels
      ctx.imageSmoothingEnabled = false;
      ctx.save(); ctx.beginPath(); ctx.rect(px + 6, py + 6, ps - 12, ps - 12); ctx.clip();
      // he shakes with rage while he spits the line out, and still trembles a little after
      const amp = talking ? 3 : 1, jx = Math.round((Math.random() - 0.5) * 2 * amp), jy = Math.round((Math.random() - 0.5) * 2 * amp);
      if (talking && Math.floor(dl.t * 8) % 2 === 0) { ctx.fillStyle = "rgba(200,30,30,0.22)"; ctx.fillRect(px + 6, py + 6, ps - 12, ps - 12); }
      ctx.drawImage(bigRat, 11, 0, 32, 30, px + 10 + jx, py + 12 + jy, 96, 90);
      ctx.restore();
    }
    // speech box: grey with stepped corners and a notch pointing at the portrait
    const fill = "#8b9099", cut = 6;
    ctx.fillStyle = fill;
    ctx.fillRect(bx + cut, by, bw - cut * 2, bh); ctx.fillRect(bx, by + cut, bw, bh - cut * 2);
    ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
    for (let i = 0; i < 10; i++) ctx.fillRect(bx - 10 + i, by + 46 - i, 1, i * 2 + 1);
    ctx.fillStyle = "#a4a9b1"; ctx.fillRect(bx + cut, by + 2, bw - cut * 2, 2);
    ctx.fillStyle = "#6c717a"; ctx.fillRect(bx + cut, by + bh - 4, bw - cut * 2, 2);
    // typed text, word-wrapped onto the given lines, with a blinking bar at the end
    let left = Math.floor(dl.t * DIALOG_CPS);
    ctx.font = '12px "Press Start 2P", monospace'; ctx.textAlign = "left"; ctx.textBaseline = "top";
    dl.lines.forEach((ln, i) => {
      const part = ln.slice(0, Math.max(0, left)); left -= ln.length + 1;
      const typingLine = talking && part.length > 0 && part.length < ln.length + 1 && left < 0;
      const settled = typingLine ? part.slice(0, -1) : part, fresh = typingLine ? part.slice(-1) : "";
      ctx.fillStyle = "#3a3e45"; ctx.fillText(settled, bx + 22 + 1, by + 22 + i * 24 + 1);
      ctx.fillStyle = "#f4f5f7"; ctx.fillText(settled, bx + 22, by + 22 + i * 24);
      if (fresh) {
        // the letter being typed lands with a little bump
        const fx = bx + 22 + ctx.measureText(settled).width, k = (dl.t * DIALOG_CPS) % 1;
        ctx.fillStyle = "#3a3e45"; ctx.fillText(fresh, fx + 1, by + 22 + i * 24 + 1 - Math.round(2 * (1 - k)));
        ctx.fillStyle = "#ffffff"; ctx.fillText(fresh, fx, by + 22 + i * 24 - Math.round(2 * (1 - k)));
      }
      const typingHere = left < 0 && left + ln.length + 1 >= 0;
      if ((typingHere || (dl.doneAt != null && i === dl.lines.length - 1)) && Math.floor(dl.t * 3) % 2 === 0) {
        ctx.fillRect(bx + 22 + ctx.measureText(part).width + 3, by + 20 + i * 24, 2, 16);
      }
    });
    ctx.restore();
  }
  // The Lantern's Oath, spoken line by line while the ring fills (tap G). It types out, then lingers a moment.
  const OATH = [[0, "In brightest day,"], [1.03, "in blackest night,"], [2.06, "no evil shall escape my sight."], [3.25, "Let those who worship evil's might,"], [4.45, "beware my power..."], [5.3, "Green...", "Lantern's...", "LIGHT!"]];   // paced to the 6.5s Oath
  function drawOath(p) {
    const live = p.oath, echo = s.oathEcho || 0;
    if (!live && echo <= 0) return;
    if (live) s.oathShown = live.t;
    const t = live ? live.t : s.oathShown || 0;
    ctx.save();
    ctx.globalAlpha = live ? 1 : Math.min(1, echo / 0.6);
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(110, 134, W - 220, 108);
    ctx.fillStyle = C.green; ctx.fillRect(110, 134, W - 220, 2); ctx.fillRect(110, 240, W - 220, 2);
    text("THE LANTERN'S OATH", W / 2, 146, 6, C.muted);
    OATH.forEach((ln, i) => {
      const y = 164 + i * 14, start = ln[0];
      if (t < start) return;
      if (ln.length > 2) {
        // "Green... Lantern's... LIGHT!" lands word by word, the last one big and bright
        const words = ln.slice(1), at = [start, start + 0.43, start + 0.92];
        const shown = words.filter((w, j) => t >= at[j]);
        const last = shown.length === 3;
        text(shown.slice(0, 2).join(" ") + (last ? " " : ""), W / 2 - (last ? 40 : 0), y, 8, C.bright);
        if (last) text("LIGHT!", W / 2 + 86, y - 1, 11, Math.floor(s.t * 12) % 2 ? "#ffffff" : C.bright);
        return;
      }
      const n = Math.min(ln[1].length, Math.floor((t - start) * 40));
      text(ln[1].slice(0, n), W / 2, y, 8, i === OATH.length - 2 ? C.bright : C.text);
    });
    // progress pips along the bottom edge
    if (live) { ctx.fillStyle = C.bright; ctx.fillRect(110, 240, Math.round((W - 220) * Math.min(1, t / T.recharge.oath)), 2); }
    ctx.restore();
  }
  // Recharging: a power battery lantern hangs in the air in front of him and ring energy streams
  // from it into the ring on his glove. (Placeholder pose until the recharge animation art is in.)
  function drawRechargeLantern(p, hover) {
    if (!guideLantern || !guideLantern.complete) return;
    const a = p.lanternA, side = p.lanternSide || 1, k = 0.5 + 0.5 * a, held = !!(hero && hero.charge);
    const lw = Math.round(guideLantern.width * 0.5 * k), lh = Math.round(guideLantern.height * 0.5 * k);
    const lx = held ? Math.round(p.x + side * 10.5) : Math.round(p.x + side * 34), ly = held ? Math.round(p.y - 43 - hover + 16) : Math.round(p.y - hover - 22 + Math.sin(s.t * 3) * 1.5);
    const charging = p.oath || (p.recharge && p.rechargeT > T.recharge.spinUp), pulse = 0.5 + 0.5 * Math.sin(s.t * 10);
    if (held) {
      // the battery in his hands glows brighter the fuller the ring gets; light motes swirl up around him during the oath
      ctx.globalAlpha = a * (0.4 + (charging ? 0.3 * pulse : 0));
      const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 22 + 10 * (p.charge / T.charge));
      g.addColorStop(0, "rgba(141,255,173,0.95)"); g.addColorStop(1, "rgba(47,216,95,0)");
      ctx.fillStyle = g; ctx.fillRect(lx - 34, ly - 34, 68, 68);
      if (charging && Math.random() < (p.oath ? 0.9 : 0.5)) {
        const ang = Math.random() * Math.PI * 2, rr = 14 + Math.random() * 10;
        s.fx.push({ x: p.x + Math.cos(ang) * rr, y: p.y - 22 + Math.sin(ang) * rr, vx: (lx - p.x - Math.cos(ang) * rr) * 3, vy: (ly - p.y + 22 - Math.sin(ang) * rr) * 3, life: 0.3, color: Math.random() < 0.5 ? C.bright : "#ffffff" });
      }
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalAlpha = a * (0.35 + (charging ? 0.25 * pulse : 0));
    const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 26);
    g.addColorStop(0, "rgba(141,255,173,0.9)"); g.addColorStop(1, "rgba(47,216,95,0)");
    ctx.fillStyle = g; ctx.fillRect(lx - 26, ly - 26, 52, 52);
    ctx.globalAlpha = a;
    ctx.drawImage(guideLantern, lx - Math.round(lw / 2), ly - Math.round(lh / 2), lw, lh);
    if (charging) {
      // a flickering line of ring energy plus motes of light flowing from the lantern into the ring
      const rp = ringPos(), dx = rp.x - lx, dy = rp.y - ly, n = Math.max(1, Math.round(Math.hypot(dx, dy)));
      for (let i = 0; i <= n; i++) {
        const t = i / n, w = Math.random() < 0.15 ? 0 : 1;
        ctx.globalAlpha = a * w * (0.55 + 0.45 * Math.sin(s.t * 30 - i * 0.9));
        ctx.fillStyle = (i + Math.floor(s.t * 20)) % 4 ? C.green : C.bright;
        ctx.fillRect(Math.round(lx + dx * t), Math.round(ly + dy * t), 1, 1);
      }
      if (Math.random() < 0.7) s.fx.push({ x: lx + (Math.random() - 0.5) * 6, y: ly + (Math.random() - 0.5) * 6, vx: dx * 3, vy: dy * 3, life: 0.3, color: Math.random() < 0.5 ? C.bright : "#ffffff" });
    }
    ctx.globalAlpha = 1;
  }
  // G: a see-through construct of the power battery (the guide lantern's shape) builds up around him while he
  // recharges. During a powered-down Oath it is the shell keeping him safe, and it flares white when hit.
  let lanternGhost = null, lanternEdge = null, lanternFlash = null;
  function buildLanternGhost() {
    const w = guideLantern.width, h = guideLantern.height, c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"); x.drawImage(guideLantern, 0, 0);
    const d = x.getImageData(0, 0, w, h), px = d.data;
    const ramp = [[14, 92, 39], [47, 216, 95], [141, 255, 173], [232, 255, 233]];
    for (let i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue;
      const L = (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) / 255, f = Math.min(2.999, L * 3.4), k = Math.floor(f), t = f - k;
      for (let j = 0; j < 3; j++) px[i + j] = Math.round(ramp[k][j] + (ramp[Math.min(3, k + 1)][j] - ramp[k][j]) * t);
    }
    x.putImageData(d, 0, 0);
    lanternGhost = c;
    // a 1px rim just outside the lantern's silhouette (hollow, so he stays visible inside)
    const rim = (col) => {
      const r = document.createElement("canvas"); r.width = w + 2; r.height = h + 2; const rx = r.getContext("2d"), sil = tintCanvas(guideLantern, col);
      for (const [ox, oy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) rx.drawImage(sil, ox, oy);
      rx.globalCompositeOperation = "destination-out"; rx.drawImage(sil, 1, 1);
      return r;
    };
    lanternEdge = rim(C.bright); lanternFlash = rim("#ffffff");
  }
  function drawLanternConstruct(p, hover) {
    if (!guideLantern || !guideLantern.complete || !guideLantern.width) return;
    if (!lanternGhost) buildLanternGhost();
    const guard = p.lanternHp || 0;
    if (guard <= 0 && !(p.oath && p.oath.safe)) return;   // shattered
    const a = p.lanternA, k = 1.0 + 0.45 * a * (1 - Math.pow(1 - a, 3)), safe = !!(p.oath && p.oath.safe), hit = p.oathHit > 0;
    const w = Math.round(lanternGhost.width * k), h = Math.round(lanternGhost.height * k);
    const cx = Math.round(p.x), cy = Math.round(p.y - hover - 22 + Math.sin(s.t * 2.5) * 1);
    const x0 = cx - Math.round(w / 2), y0 = cy - Math.round(h * 0.56);   // the lantern's body is centred on his chest
    ctx.save();
    ctx.globalAlpha = a * (hit ? 0.95 : 0.55 + 0.15 * Math.sin(s.t * 4));   // a bright rim so the shape reads
    ctx.drawImage(hit ? lanternFlash : lanternEdge, x0 - Math.round(k), y0 - Math.round(k), Math.round((lanternGhost.width + 2) * k), Math.round((lanternGhost.height + 2) * k));
    ctx.globalAlpha = (a * (safe ? 0.34 : 0.25) + (hit ? 0.2 : 0)) * (safe ? 1 : 0.55 + 0.15 * guard);   // fades as it takes hits
    ctx.drawImage(lanternGhost, x0, y0, w, h);
    if (!safe) {
      // a crack for each hit taken
      ctx.globalAlpha = a * 0.9; ctx.fillStyle = "#ffffff";
      const cracks = [[[-10, -6], [-4, 2], [-8, 9]], [[9, -10], [4, -2], [11, 5]], [[-2, 12], [3, 4], [-1, -4]]];
      for (let i = 0; i < T.recharge.guard - guard; i++) {
        const c = cracks[i]; for (let j = 0; j < c.length - 1; j++) {
          const [ax, ay] = c[j], [bx, by] = c[j + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
          for (let t = 0; t <= n; t++) ctx.fillRect(Math.round(cx + (ax + (bx - ax) * t / n) * k), Math.round(cy + (ay + (by - ay) * t / n) * k), 1, 1);
        }
      }
    }
    // light rising through the construct
    if (Math.random() < 0.5 * a) s.fx.push({ x: cx + (Math.random() - 0.5) * w * 0.6, y: p.y - hover - 4, vx: 0, vy: -50 - Math.random() * 40, life: 0.4, color: Math.random() < 0.5 ? C.bright : "#ffffff" });
    ctx.restore();
  }
  // Long comet streaks of ring light trailing from his fists and boots, following the path he just flew
  // Comet streaks of ring light fixed to his fists and boots. They are drawn from where he is right now
  // (never from old positions), so they stay attached while the screen scrolls.
  // Fast flight (Shift): soft beams of ring light stream back from his fists, boots and body, like a comet
  // tail. Each beam leaves the body narrow and bright, spreads out as it trails behind, and fades away. They follow
  // his heading and bend toward where he was flying a moment ago, so a turn sweeps the light round behind him.
  function drawFlightStreaks(p, hover) {
    const amt = p.streak || 0, live = p.superFly;
    const nrm = (x, y) => { const l = Math.hypot(x, y); return l > 0.05 ? [x / l, y / l] : [0, -1]; };
    const d1 = nrm(p.leanX || 0, p.leanY || 0), d2 = nrm(p.trailX || 0, p.trailY || 0);
    const ang = live ? (p.leanX || 0) * 0.24 : 0, ca = Math.cos(ang), sa = Math.sin(ang);
    const mir = facingLeft() ? -1 : 1;
    // measured from the flight-pose sprite: [x, y, source width, spread width, length, strength]
    // left fist, right fist, left boot, right boot, and one wide, faint beam off his whole body
    const lanes = [[-10, 11, 3, 13, 105, 1], [4.5, 11, 3, 13, 105, 1], [-6, 20.5, 3.5, 15, 125, 1], [1.5, 20.5, 3.5, 15, 125, 1], [-3, 2, 14, 30, 95, 0.5]]
      .map(([x, y, w0, w1, len, k]) => [x * mir * ca - y * sa, x * mir * sa + y * ca - 22, w0, w1, len, k]);
    const ox = Math.round(p.x), oy = Math.round(p.y - hover), N = 16; // world coords: the camera shift is already applied
    // a tapered ribbon along the beam's curve: narrow at the body, wider at the tail, its colour fading out
    // toward the tail (color has an ALPHA placeholder; a0 is the opacity where it leaves the body)
    function ribbon(x0, y0, x1, y1, x2, y2, reach, wa, wb, color, a0) {
      const pt = (t) => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1 + t * t * x2, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2];
      const L = [], R = [];
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * reach, a = pt(Math.max(0, t - 0.02)), b = pt(Math.min(1, t + 0.02)), c = pt(t);
        const [tx, ty] = nrm(b[0] - a[0], b[1] - a[1]), hw = (wa + (wb - wa) * Math.pow(i / N, 0.8)) / 2;
        L.push([c[0] - ty * hw, c[1] + tx * hw]); R.push([c[0] + ty * hw, c[1] - tx * hw]);
      }
      const end = pt(reach), g = ctx.createLinearGradient(x0, y0, end[0], end[1]);
      g.addColorStop(0, color.replace("ALPHA", a0)); g.addColorStop(0.35, color.replace("ALPHA", a0 * 0.55)); g.addColorStop(1, color.replace("ALPHA", 0));
      ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
      for (const q of L) ctx.lineTo(q[0], q[1]);
      for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
      ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    }
    const shimmer = 0.88 + 0.12 * Math.sin(s.t * 23);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";   // overlapping light adds up, brightest where the beams meet
    for (const [ax, ay, w0, w1, len, k] of lanes) {
      const x0 = ox + ax, y0 = oy + ay, L = len * amt;
      const x1 = x0 - d1[0] * L * 0.5, y1 = y0 - d1[1] * L * 0.5;
      const x2 = x1 - d2[0] * L * 0.5, y2 = y1 - d2[1] * L * 0.5;
      const a = amt * k * shimmer;
      ribbon(x0, y0, x1, y1, x2, y2, 1, w0 * 2.2, w1 * 1.6, "rgba(23,165,64,ALPHA)", 0.30 * a);     // outer haze
      ribbon(x0, y0, x1, y1, x2, y2, 0.85, w0 * 1.2, w1, "rgba(47,216,95,ALPHA)", 0.45 * a);        // the beam
      if (k >= 1) ribbon(x0, y0, x1, y1, x2, y2, 0.45, w0 * 0.7, w0 * 1.6, "rgba(220,255,226,ALPHA)", 0.75 * a);   // hot core by the body
    }
    ctx.restore();
  }
  function drawRat(r) {
    const atk = r.state === "swing";
    // no walk cycle (rats fly on their jetpacks); the attack is a side punch: wind back, sweep round, hook
    const base = r.state === "windup" ? "ratWind" : atk ? (r.t < 0.05 ? "ratSweep" : "ratHook") : "rat0";
    const name = base + (r.face < 0 ? "L" : "");
    const img = (r.flash > 0 || (r.state === "windup" && Math.floor(r.t * 16) % 2) ? FLASH : ART)[name];
    // Rats ride jetpacks: they hover above their shadow with a flame under the pack.
    const lift = Math.round(5 + Math.sin(s.t * 5 + r.walk * 3) * 1.2);
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(r.x - 6, r.y - 2, 12, 2);
    const top = r.y - img.height - lift;
    // jetpack strapped to the back with the flame blasting behind and down
    drawJetpack(r.x - r.face * 7, top + 15, 4, 7, 0.9);
    blit(img, r.x - img.width / 2, top);
    ctx.fillStyle = "#3b4546"; ctx.fillRect(Math.round(r.x - r.face * 5) - 1, top + 16, 2, 1);
    if (atk && r.t < 0.16) {
      // the swoosh of the hook: an arc sweeping from behind him round to the front
      const cx = r.x, cy = top + 16, prog = Math.min(1, r.t / 0.1);
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 9; i++) {
        const u = i / 8; if (u > prog) break;
        const an = Math.PI * (1 - u) * 0.9 - 0.2;   // from the back, over the top, out to the side
        ctx.globalAlpha = 0.25 + 0.6 * u * (1 - r.t / 0.16);
        ctx.fillRect(Math.round(cx + r.face * Math.cos(an) * 12), Math.round(cy - Math.sin(an) * 7), 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }
  // A grey jetpack tank (centre x, top y) with a flickering flame underneath.
  // A green outline of a sprite: just its edge pixels, in ring light (what an enemy leaves behind when the burst kills it)
  const ghostCache = new Map();
  function ghostOf(img) {
    if (ghostCache.has(img)) return ghostCache.get(img);
    const w = img.width + 2, h = img.height + 2, c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.drawImage(img, 1, 1);
    const src = g.getImageData(0, 0, w, h).data, out = g.createImageData(w, h), o = out.data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!solid(x, y) || (solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1))) continue;
      const i = (y * w + x) * 4; o[i] = 47; o[i + 1] = 216; o[i + 2] = 95; o[i + 3] = 255;
    }
    g.clearRect(0, 0, w, h); g.putImageData(out, 0, 0);
    ghostCache.set(img, c); return c;
  }
  function drawJetpack(cx, ty, w, h, flame = 1) {
    const x = Math.round(cx - w / 2), y = Math.round(ty);
    ctx.fillStyle = "#1b1b23"; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = "#7d8c8e"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#c3c9ce"; ctx.fillRect(x, y, 1, h - 1);
    ctx.fillStyle = "#4a4a50"; ctx.fillRect(x + w - 1, y + 1, 1, h - 1); ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillStyle = "#ff3b3b"; ctx.fillRect(x + 1, y + 2, w - 2, 1);
    const fl = Math.round((3 + Math.random() * 3) * flame);
    ctx.fillStyle = "#ff8a2a"; ctx.fillRect(x + 1, y + h + 1, w - 2, fl);
    ctx.fillStyle = "#ffd34a"; ctx.fillRect(x + Math.floor(w / 2) - 1, y + h + 1, 2, Math.max(1, fl - 2));
  }
  // Otto's booster flame, from the user's reference art (build-tools/otto_jet.png): white-hot at the nozzle, then
  // pale yellow, light orange, orange, red-orange, fading salmon; peach glow either side of the hot part. Each of
  // its pixels is 2x2 of his. The tail flickers, the two feet out of step.
  const JET = [
    [["#ffdfb8", 0.55], ["#ff8a00"], ["#ffffff"], ["#ffffff"], ["#ff8a00"], ["#ffdfb8", 0.55]],
    [["#f3e0cd", 0.45], ["#ff8a00"], ["#fff498"], ["#fff498"], ["#ff8a00"], ["#f4dbbf", 0.45]],
    [null, ["#ff8a00"], ["#ffbe4c"], ["#ffbe4c"], ["#ff8a00"], null],
    [null, ["#ff7b2c"], ["#ff8a00"], ["#ff8a00"], ["#ff7b2c"], null],
    [null, null, ["#ff6000"], ["#ff6000"], null, null],
    [null, null, ["#ff7f48"], ["#f67841"], null, null],
    [null, null, ["#f2cdbd", 0.6], ["#ffddcd", 0.6], null, null],
  ];
  function drawOttoJet(cx, top, seed) {
    const ph = Math.floor(s.t * 14 + seed) % 3, rows = JET.length - (ph === 0 ? 1 : 0), x0 = cx - 6;
    for (let r = 0; r < rows; r++) for (let c = 0; c < 6; c++) {
      const px = JET[r][c];
      if (!px) continue;
      ctx.globalAlpha = (px[1] || 1) * (ph === 2 && r >= 5 ? 0.75 : 1);
      ctx.fillStyle = px[0]; ctx.fillRect(x0 + c * 2, top + r * 2, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  // Where an arm part meets his shoulder: the middle of its topmost few rows of pixels (cached per image)
  const shoulders = new WeakMap();
  function shoulderOf(im) {
    let v = shoulders.get(im);
    if (v) return v;
    const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
    const x = c.getContext("2d"); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let top = -1, sx = 0, n = 0;
    for (let y = 0; y < c.height && (top < 0 || y < top + 4); y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3]) { if (top < 0) top = y; sx += i; n++; }
    v = n ? { x: sx / n, y: top + 3 } : { x: 0, y: 0 };
    shoulders.set(im, v); return v;
  }
  function drawBoss(b) {
    if (!bigRat || !bigRat.complete) return;
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(b.x - 18, b.y - 3, 36, 4);
    const bl = b.state === "dead" ? 0 : Math.round(8 + Math.sin(s.t * 3) * 2);
    b.lift = bl;
    // jet flames blast below his boots
    const img = b.flash > 0 && bigRatFlash ? bigRatFlash : bigRat;
    const shake = b.state === "dead" ? (Math.random() - 0.5) * 4 : 0;
    if (b.state === "dead" && Math.floor(b.t * 10) % 2) ctx.globalAlpha = 0.5;
    const th = b.throw, lean = 0;
    // drawn in parts so he animates: coat and legs, then each gold arm, then his head on top
    const q = b.pose || {}, X = b.x - 26 + shake, Y = b.y - 73 - bl, R = Math.round;
    const model = ottoDirs[b.dir || "down"];
    const parts = model ? (img === bigRat ? model.parts : model.flash) : ottoParts && ottoParts[img === bigRat ? 0 : 1];
    const part = (k, dx, dy, ang, lift) => {
      if (!parts) { if (k === "body") ctx.drawImage(img, R(X), R(Y)); return; }
      if (Math.abs(ang || 0) < 0.02 && (lift || 0) < 0.02) { ctx.drawImage(parts[k], R(X + dx), R(Y + dy)); return; }
      // an arm turns about its shoulder, so it never comes away from his body. Raising it, it swings toward us:
      // it foreshortens, then folds over the shoulder with the fist on top.
      const pv = shoulderOf(parts[k]), px = R(X + dx) + pv.x, py = R(Y + dy) + pv.y;
      let sy = Math.cos(Math.min(1, lift || 0) * Math.PI);
      if (Math.abs(sy) < 0.2) sy = sy < 0 ? -0.2 : 0.2;
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang || 0); ctx.scale(1, sy); ctx.drawImage(parts[k], -pv.x, -pv.y); ctx.restore();
    };
    if (b.state === "crush" && b.crush && b.crush.blast > 0) {
      // the impact fills the whole circle with a flash of gold
      const to = b.crush.to, k = b.crush.blast / 0.35;
      ctx.save(); ctx.globalAlpha = 0.45 * k; ctx.fillStyle = C.gold;
      ctx.beginPath(); ctx.ellipse(to.x, to.y - 4, T.boss.crush.r, T.boss.crush.r * 0.45, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.9 * k; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
    if (b.state === "crush" && b.crush && b.crush.phase === "dash") {
      // where he's going to land: a pulsing gold ring
      const to = b.crush.to; ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(s.t * 20); ctx.strokeStyle = C.gold; ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.ellipse(to.x, to.y - 4, T.boss.crush.r, T.boss.crush.r * 0.45, 0, 0, 7); ctx.stroke(); ctx.restore();
    }
    const off = { body: [lean * 0.5, 0, 0], armL: [lean, q.lay || 0, q.la || 0, q.lift || 0], armR: [lean, q.ray || 0, q.ra || 0, q.lift || 0], head: [(q.hx || 0) + lean, q.hy || 0, 0, 0] };
    for (const k of (model ? model.order : ["body", "armL", "armR", "head"])) part(k, off[k][0], off[k][1], off[k][2], off[k][3]);
    if (bl && b.state !== "dead") {   // flames out of the booster nozzles that are his feet
      const fy = R(Y) + 68;
      for (const cx of (model && model.jets) || [19, 35]) drawOttoJet(R(X + lean * 0.5) + cx, fy, cx);
    }
    ctx.globalAlpha = 1;
    if (th && b.state !== "dead" && !throwHand(b).behind) drawThrow(b, th);
    const e = eyes(b);
    if (b.state === "charge") {
      const k = b.t / 0.9;
      ctx.fillStyle = C.red; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(b.t * 30);
      ctx.fillRect(e.x - 6, e.y - 2, 4 + k * 2, 4); ctx.fillRect(e.x + 3, e.y - 2, 4 + k * 2, 4);
      ctx.globalAlpha = 0.35; ctx.strokeStyle = C.red; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(b.aim) * 400, e.y + Math.sin(b.aim) * 400); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  // His gold arm and the saw he is about to throw (drawn behind him while it is wound back over his shoulder)
  function drawThrow(b, th) {
    const h = throwHand(b), x = Math.round(h.x), y = Math.round(h.y);
    if (!th.done) {
      // the launcher spins up: a red glow swelling at the muzzle
      const k = th.t / T.boss.release;
      ctx.globalAlpha = 0.35 + 0.4 * k; ctx.fillStyle = C.red;
      ctx.beginPath(); ctx.arc(x, y, 2 + 3 * k, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.fillStyle = "#ffd0d0"; ctx.fillRect(x - 1, y - 1, 2, 2);
    } else if (th.t < T.boss.release + 0.09) {
      // muzzle flash as the blade leaves
      ctx.globalAlpha = 1; ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 3, y - 1, 6, 3);
      ctx.fillStyle = "#ffd34a"; ctx.fillRect(x - 2, y + 2, 4, 2);
      ctx.globalAlpha = 0.6; ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x + (Math.random() - 0.5) * 12), Math.round(y + (Math.random() - 0.5) * 8), 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  function drawLaser(b) {
    const e = eyes(b), L = b.laserLen ?? 900, dx = Math.cos(b.aim), dy = Math.sin(b.aim);
    for (const [w, col, a] of [[9, C.red, 0.35], [5, C.red, 0.9], [2, "#ffd0d0", 1]]) {
      ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = w + Math.random() * 1.5;
      ctx.beginPath(); ctx.moveTo(e.x - 4, e.y); ctx.lineTo(e.x + dx * L, e.y + dy * L); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(e.x + 4, e.y); ctx.lineTo(e.x + dx * L, e.y + dy * L); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawRope() {
    const ro = s.p.rope, h = handPos(), R = T.rope;
    const t = ro.t, tw = t - R.whirl;                                   // time since the throw
    const endT = R.whirl + R.reach + R.form + R.pull;
    const fade = t > endT ? Math.max(0, 1 - (t - endT) / 0.35) : 1;
    const pullK = Math.max(0, Math.min(1, (tw - R.reach - R.form) / R.pull));
    const ease = (u) => 1 - Math.pow(1 - u, 3);
    const px = (x, y, i, a) => { ctx.globalAlpha = a; ctx.fillStyle = i % 4 ? C.green : C.bright; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); };
    // the rope: a smooth curve, sampled every pixel and a half so it reads as one unbroken cord
    const cord = (x0, y0, cx, cy, x1, y1, a) => {
      const n = Math.max(3, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 1.5));
      for (let i = 0; i <= n; i++) {
        const u = i / n, v = 1 - u;
        px(v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1, i, a);
      }
    };
    // a lasso loop: an ellipse of rope tilted toward the viewer, with its knot (the honda) as a bright bead
    const loop = (x, y, r, flat, spin, a) => {
      const n = Math.max(12, Math.round(r * 2.4));
      for (let i = 0; i < n; i++) { const an = (i / n) * Math.PI * 2 + spin; px(x + Math.cos(an) * r, y + Math.sin(an) * r * flat, i, a); }
      ctx.globalAlpha = a; ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(x + Math.cos(spin) * r) - 1, Math.round(y + Math.sin(spin) * r * flat) - 1, 3, 3);
      return { x: x + Math.cos(spin) * r, y: y + Math.sin(spin) * r * flat };
    };
    if (tw < 0) {
      // whirling the lasso over his ring hand, the loop opening up as it spins
      const w = t / R.whirl, r = 5 + 6 * w, spin = t * 26;
      const k = loop(h.x, h.y - 12 - 3 * w, r, 0.38, spin, 0.95);
      cord(h.x, h.y, h.x, h.y - 6, k.x, k.y, 0.95);
      ctx.globalAlpha = 1; return;
    }
    for (const g of ro.list) {
      if (g.r.hp <= 0) continue;
      const gb = ratBox(g.r), bx = gb.x, by = gb.y;
      const fly = ease(Math.min(1, tw / R.reach)), formK = Math.max(0, Math.min(1, (tw - R.reach) / R.form));
      // where the loop is: flying from his hand to the rat, then settling down over it
      const lx = h.x + (bx - h.x) * fly, ly = h.y - 10 * (1 - fly) + (by - h.y) * fly - Math.sin(fly * Math.PI) * 14;
      const r = fly < 1 ? 7 + 7 * fly : 14 - (14 - R.loop) * ease(formK) - pullK * 1.5;
      const flat = fly < 1 ? 0.4 : 0.4 + 0.45 * ease(formK);
      const spin = (fly < 1 ? tw * 24 : R.reach * 24 + formK * 4) + g.a, drop = fly < 1 ? 0 : -6 * (1 - ease(formK));
      const knot = loop(lx, ly + drop, r, flat, spin, fade);
      if (fly >= 1) { ctx.globalAlpha = fade * 0.14; ctx.fillStyle = C.green; ctx.beginPath(); ctx.ellipse(bx, by + drop, r, r * flat, 0, 0, 7); ctx.fill(); }
      // the rope from his ring: slack and arcing while it flies, pulled taut for the reel-in, let go at the end
      if (pullK < 1) {
        const dx = knot.x - h.x, dy = knot.y - h.y, d = Math.hypot(dx, dy) || 1;
        const slack = (fly < 1 ? 0.22 : 0.12 * (1 - formK) + 0.05) * (1 - pullK) * d;
        const wob = pullK > 0 ? Math.sin(t * 40 + g.a * 3) * 1.2 : 0;
        const mx = (h.x + knot.x) / 2 + (-dy / d) * wob, my = (h.y + knot.y) / 2 + slack + (dx / d) * wob;
        cord(h.x, h.y, mx, my, knot.x, knot.y, fade * (1 - pullK * pullK));
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawBeam() {
    const p = s.p, h = handPos(), len = Math.round(p.beamLen || 420), cy = s.camY;
    const aim = p.aim, tip = p.beamAng ?? aim, grow = Math.min(1, (s.t - (p.beamBorn ?? s.t)) / 0.12);
    const L = len * grow;
    // Bezier from the ring (leaving along the aim) to the tip (along the lagging beam angle)
    const x0 = h.x, y0 = h.y - cy, x2 = x0 + Math.cos(tip) * L, y2 = y0 + Math.sin(tip) * L;
    const x1 = x0 + Math.cos(aim) * L * 0.5, y1 = y0 + Math.sin(aim) * L * 0.5;
    const n = Math.max(2, Math.ceil(L / 2)), pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      const x = v * v * x0 + 2 * v * u * x1 + u * u * x2, y = v * v * y0 + 2 * v * u * y1 + u * u * y2;
      const tx = 2 * v * (x1 - x0) + 2 * u * (x2 - x1), ty = 2 * v * (y1 - y0) + 2 * u * (y2 - y1), tl = Math.hypot(tx, ty) || 1;
      const dist = u * L;
      // a ripple that runs down the beam, pinned at the ring and at the target
      const wob = Math.sin(s.t * 16 - dist * 0.07) * 2.2 * Math.sin(Math.PI * u);
      const w = 5 + 1.6 * Math.sin(s.t * 22 - dist * 0.16) + (p.beamHit ? 1.5 * u : -2 * u * u);
      pts.push([x - ty / tl * wob, y + tx / tl * wob, w]);
    }
    const layer = (extra, col, a) => {
      ctx.globalAlpha = a; ctx.fillStyle = col;
      for (const [x, y, w] of pts) { const ww = Math.max(1, Math.round(w + extra)); ctx.fillRect(Math.round(x - ww / 2), Math.round(y - ww / 2), ww, ww); }
    };
    layer(6, C.deep, 0.45); layer(3, C.green, 0.85); layer(0, C.bright, 1); layer(-3.5, "#ffffff", 1);
    // pulses of energy travelling from the ring to the tip
    for (let k = 0; k < 5; k++) {
      const u = ((s.t * 2.6 + k / 5) % 1), q = pts[Math.round(u * n)];
      if (!q) continue;
      ctx.globalAlpha = 1; ctx.fillStyle = "#ffffff"; const r = Math.round(q[2] * 0.6 + 2);
      ctx.fillRect(Math.round(q[0] - r / 2), Math.round(q[1] - r / 2), r, r);
      ctx.fillStyle = C.bright; ctx.fillRect(Math.round(q[0] - r / 2) - 1, Math.round(q[1]) , r + 2, 1);
    }
    // loose motes streaming along it
    for (let i = 0; i < 10; i++) {
      const q = pts[Math.floor(Math.random() * pts.length)];
      ctx.globalAlpha = 0.9; ctx.fillStyle = Math.random() < 0.5 ? C.bright : "#ffffff";
      ctx.fillRect(Math.round(q[0] + (Math.random() - 0.5) * 12), Math.round(q[1] + (Math.random() - 0.5) * 12), 2, 1);
    }
    // Glow at the ring
    ctx.globalAlpha = 0.8; ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(x0) - 3, Math.round(y0) - 3, 6, 6);
    // Burst where the beam hits an enemy: a flickering pixel starburst that swells and spins
    if (p.beamHit && grow >= 1) {
      ctx.save(); ctx.translate(Math.round(x2), Math.round(y2));
      const k = Math.floor(s.t * 20) % 2, R = 20 + k * 4 + Math.round(3 * Math.sin(s.t * 13));
      const gl = ctx.createRadialGradient(0, 0, 2, 0, 0, R + 8); gl.addColorStop(0, "rgba(141,255,173,0.85)"); gl.addColorStop(1, "rgba(47,216,95,0)");
      ctx.globalAlpha = 1; ctx.fillStyle = gl; ctx.fillRect(-R - 8, -R - 8, 2 * R + 16, 2 * R + 16);
      const spin = s.t * 3;
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + spin + (k ? Math.PI / 8 : 0), long = i % 2 ? 0.6 : 1;
        for (let t = 2; t < R * long; t += 2) {
          ctx.fillStyle = t < R * long * 0.5 ? "#ffffff" : C.bright;
          ctx.fillRect(Math.round(Math.cos(a) * t) - 1, Math.round(Math.sin(a) * t) - 1, 3, 3);
        }
      }
      ctx.fillStyle = C.green; ctx.fillRect(-9, -7, 18, 14); ctx.fillRect(-7, -9, 14, 18);
      ctx.fillStyle = C.bright; ctx.fillRect(-7, -5, 14, 10); ctx.fillRect(-5, -7, 10, 14);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(-4, -3, 8, 6); ctx.fillRect(-3, -4, 6, 8);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  // A copy of a hero frame with the glove at his side painted out, so that hand can punch without showing twice
  const gloveless = new Map();
  function noGlove(img, dir) {
    if (!img) return null;
    if (gloveless.has(img)) return gloveless.get(img);
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const left = dir.includes("left"), d = g.getImageData(0, 0, c.width, c.height), px = d.data;
    const at = (x, y) => (y * c.width + (left ? c.width - 1 - x : x)) * 4;
    const fill = px.slice(at(3, 22), at(3, 22) + 4);   // his sleeve just above the glove
    for (let y = 24; y <= 33; y++) for (let x = 0; x <= 5; x++) {
      const i = at(x, y);
      if (px[i + 3] > 0 && Math.min(px[i], px[i + 1], px[i + 2]) > 150) { px[i] = fill[0]; px[i + 1] = fill[1]; px[i + 2] = fill[2]; }
    }
    g.putImageData(d, 0, 0); gloveless.set(img, c); return c;
  }
  function drawPunch() {
    const pu = s.p.punch;
    if (!pu || pu.x === undefined) return;
    const d = aimVec(pu.aim), x = pu.x, y = pu.y - s.camY;
    const h = pu.hx != null ? { x: pu.hx, y: pu.hy } : handPos();
    if (pu.kind === "fist") return drawConstructFist(pu);
    if (sprArms(pu)) return;   // his sprite arms throw it
    if (pu.kind === "punch" || pu.kind === "fist") {
      // his own arm reaching out from the shoulder to the glove; the fist ability throws harder, so the arm is
      // thicker and the ring fist is lit with ring light
      const big = pu.kind === "fist", aw = big ? 4 : 3, gr = 3;
      const hx = h.x, hy = h.y - s.camY, n = Math.ceil(Math.hypot(x - hx, y - hy));
      ctx.fillStyle = "#3b4546";
      for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(hx + (x - hx) * i / Math.max(1, n)) - (aw >> 1), Math.round(hy + (y - hy) * i / Math.max(1, n)) - (aw >> 1), aw, aw);
      if (big && !pu.off) { ctx.shadowColor = C.green; ctx.shadowBlur = 6; }
      ctx.fillStyle = "#1b1b23"; ctx.fillRect(Math.round(x) - gr, Math.round(y) - gr, gr * 2 + 1, gr * 2 + 1);
      ctx.shadowBlur = 0;
      ctx.fillStyle = big && !pu.off ? "#b9c2c0" : "#f2f2f2"; ctx.fillRect(Math.round(x) - gr + 1, Math.round(y) - gr + 1, gr * 2 - 1, gr * 2 - 1);
      ctx.fillStyle = "#c7c7c7"; ctx.fillRect(Math.round(x) - gr + 1, Math.round(y) + gr - 1, gr * 2 - 1, 1);
      if (big && !pu.off) { ctx.fillStyle = C.bright; ctx.fillRect(Math.round(x) - 1, Math.round(y), 2, 1); }   // the ring on his grey glove
      if (pu.jab > 0.8) { ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.7; ctx.fillRect(Math.round(x + d[0] * 5) - 1, Math.round(y + d[1] * 5) - 1, 3, 3); ctx.globalAlpha = 1; }
      return;
    }
  }
  function drawConstructFist(pu) {
    const img = hero ? hero.fist : ART.fist, x = pu.x, y = pu.y - s.camY;
    // Green energy arc left behind by the hook
    pu.trail.forEach(([tx, ty], i) => {
      ctx.globalAlpha = 0.15 + (i / pu.trail.length) * 0.5; ctx.fillStyle = i % 2 ? C.bright : C.green;
      ctx.fillRect(Math.round(tx) - 5, Math.round(ty - s.camY) - 5, 10, 10);
    });
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(pu.ang);
    ctx.shadowColor = C.green; ctx.shadowBlur = 6;
    const gs = (hero ? T.fist.scale : 1) * (0.2 + 0.8 * (pu.grow ?? 1));
    ctx.drawImage(img, -img.width * gs / 2, -img.height * gs / 2, img.width * gs, img.height * gs);
    ctx.restore();
  }
  function bar(x, y, w, h, frac, fill, dark) {
    ctx.fillStyle = "#000"; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = "#1b1b23"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = dark; ctx.fillRect(x, y, Math.round(w * frac), h);
    ctx.fillStyle = fill; ctx.fillRect(x, y, Math.round(w * frac), h - 2);
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(x, y, Math.round(w * frac), 1);
  }
  function text(str, x, y, size, color, align = "center") {
    ctx.font = `${size}px "Press Start 2P", monospace`;
    ctx.textAlign = align; ctx.textBaseline = "middle";
    ctx.fillStyle = "#000"; ctx.fillText(str, x + 1, y + 1);
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  // ---------- Ability boxes (under the Beware My Power bar) ----------
  // Small pixel icons, built once: boulder, ring beam, rope loop and the Beware My Power burst
  const icons = {};
  function pixelIcon(w, h, paint) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { const col = paint(px, py); if (col) { x.fillStyle = col; x.fillRect(px, py, 1, 1); } }
    return c;
  }
  function buildIcons() {
    // Ring beam: the ring on the left with a white-hot beam streaming right
    icons.beam = pixelIcon(26, 18, (x, y) => {
      const dx = x - 7, dy = y - 9, r = Math.hypot(dx, dy);
      if (r <= 7.5 && r > 5.5) return r > 6.8 ? "#0e5c27" : "#2fd85f";
      if (r <= 5.5 && r > 3.5) return "#0e5c27";
      if (r <= 3.5) return r < 2 ? "#e8ffe9" : "#8dffad";
      const spread = 3 + (x - 12) * 0.25;
      if (x >= 12 && Math.abs(dy) <= spread) { const k = Math.abs(dy) / spread; return k < 0.3 ? "#ffffff" : k < 0.65 ? "#8dffad" : (x + y) % 3 ? "#2fd85f" : "#0e5c27"; }
      return null;
    });
    // Rope construct: a looped green rope (traced from your reference), two pixels per rope cell
    const ROPE = [".#######...", "#########..", "###....###.", "###.....###", ".###....###", "..#########", "....#######", ".......###.", ".......###.", ".......###.", "#....####..", "########...", "######....."];
    icons.rope = pixelIcon(24, 28, (x, y) => {
      const cx = Math.floor((x - 1) / 2), cy = Math.floor((y - 1) / 2), on = (i, j) => ROPE[j] && ROPE[j][i] === "#";
      if (on(cx, cy) && x >= 1 && y >= 1) return (x + y * 3) % 5 === 0 ? "#8dffad" : (y - 1) % 2 ? "#1f9a45" : "#2fd85f";
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = Math.floor((x - 1 + ox) / 2), ny = Math.floor((y - 1 + oy) / 2); if (on(nx, ny)) return "#063a18"; }
      return null;
    });
    // Beware My Power: a spiky green burst with a white-hot core
    // Beware My Power: a jagged energy explosion, uneven spikes bursting out of a white-hot core with shards flying off
    const SPIKES = [1, 0.55, 0.85, 0.45, 1, 0.6, 0.9, 0.5, 0.95, 0.4, 0.8, 0.55];
    const SHARDS = [[2, 3], [22, 2], [24, 17], [1, 20], [12, 0], [13, 25], [25, 9]];
    icons.burst = pixelIcon(26, 26, (x, y) => {
      if (SHARDS.some(([sx, sy]) => sx === x && sy === y)) return "#8dffad";
      const dx = x - 12.5, dy = y - 12.5, r = Math.hypot(dx, dy);
      const u = ((Math.atan2(dy, dx) + Math.PI * 1.04) / (Math.PI * 2)) * SPIKES.length;
      const i = Math.floor(u) % SPIKES.length, f = u - Math.floor(u);
      const tri = 1 - Math.abs(f * 2 - 1);                     // sharp triangular spike
      const edge = 5.5 + SPIKES[i] * 7.5 * Math.pow(tri, 1.6);
      if (r > edge + 1) return null;
      if (r > edge) return "#063a18";
      const inner = r / edge;
      return r < 2.6 ? "#ffffff" : r < 4.2 ? "#e8ffe9" : inner < 0.62 ? "#8dffad" : inner < 0.85 ? "#2fd85f" : "#1a8f3e";
    });
  }
  function drawAbilityBar(p, full) {
    if (!icons.beam) buildIcons();
    const fistImg = hero ? hero.fist : ART.fist;
    const boxes = [
      { key: "1", img: fistImg, w: 26, h: 20, ready: p.charge >= T.fist.cost && p.cd <= 0, cd: 0 },
      { key: "2", img: ART.boulder, w: 16, h: 14, ready: p.charge >= T.boulder.cost && p.boulderCd <= 0, cd: p.boulderCd / T.boulder.cooldown, left: p.boulderCd },
      { key: "3", img: icons.beam, w: 26, h: 18, ready: p.charge >= T.beam.start, cd: 0, on: p.beam },
      { key: "4", img: icons.rope, w: 18, h: 21, ready: p.charge >= T.rope.cost && p.ropeCd <= 0, cd: p.ropeCd / T.rope.cooldown, left: p.ropeCd },
      { key: "V", img: icons.burst, w: 24, h: 24, ready: full, cd: 1 - p.bmp / 100, glow: full },
      { key: "G", img: guideLantern && guideLantern.complete ? guideLantern : null, w: 18, h: 20, ready: p.charge < T.charge, cd: 0, on: p.recharge },
    ];
    const size = 30, gap = 5, y = 38;
    boxes.forEach((bx, i) => {
      const x = 40 + i * (size + gap);
      ctx.fillStyle = "#000"; ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
      ctx.fillStyle = bx.glow && Math.floor(s.t * 6) % 2 ? C.bright : bx.ready ? C.green : "#2b3a30"; ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
      ctx.fillStyle = bx.on ? "#0e3d1c" : "#07140c"; ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      if (bx.img) { ctx.globalAlpha = bx.ready ? 1 : 0.4; ctx.drawImage(bx.img, Math.round(x + (size - bx.w) / 2), Math.round(y + (size - bx.h) / 2), bx.w, bx.h); ctx.globalAlpha = 1; }
      // recharge shade drains from the top down as the cooldown (or the V meter) fills
      if (bx.cd > 0) { ctx.globalAlpha = 0.55; ctx.fillStyle = "#000"; ctx.fillRect(x + 1, y + 1, size - 2, Math.round((size - 2) * Math.min(1, bx.cd))); ctx.globalAlpha = 1; }
      if (bx.left > 0) text(bx.left.toFixed(1), x + size / 2, y + size / 2 + 1, 6, "#ffffff");
      text(bx.key, x + 4, y + 5, 5, bx.ready ? "#ffffff" : C.muted, "left");
    });
  }
  // A power battery lantern floats ahead near the top of the screen to guide the way up,
  // glowing, with motes of green light drifting from the Lantern up toward it.
  function drawGoArrow() {
    if (!guideLantern || !guideLantern.complete) return;
    const lw = guideLantern.width, lh = guideLantern.height;
    const cx = Math.round(W / 2 + Math.sin(s.t * 0.9) * 24), cy = Math.round(78 + Math.sin(s.t * 2.2) * 5);
    // soft glow
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 60);
    g.addColorStop(0, "rgba(141,255,173,0.45)"); g.addColorStop(1, "rgba(47,216,95,0)");
    ctx.fillStyle = g; ctx.fillRect(cx - 60, cy - 60, 120, 120);
    ctx.drawImage(guideLantern, cx - Math.round(lw / 2), cy - Math.round(lh / 2));
  }
  function drawHud() {
    const p = s.p;
    // Top left: lantern symbol + ring charge, with the Beware My Power meter under it
    ctx.drawImage(ART.symbol, 6, 6, ART.symbol.width * 2, ART.symbol.height * 2);
    const filling = p.recharge && p.rechargeT > T.recharge.spinUp;
    bar(40, 8, 160, 13, p.charge / T.charge, p.chargeFull > 0 && Math.floor(s.t * 10) % 2 ? "#ffffff" : filling && Math.floor(s.t * 8) % 2 ? C.bright : C.green, C.deep);
    // ring charge as a percentage, right of the bar, in the ring's green pixel digits
    const pct = Math.max(0, Math.min(100, Math.round(p.charge / T.charge * 100)));
    ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = C.deep; ctx.fillText(pct + "%", 207, 16); ctx.fillText(pct + "%", 206, 16);
    ctx.fillStyle = C.green; ctx.fillText(pct + "%", 205, 15);
    const full = p.bmp >= 100;
    // Ring warnings stay on screen, steady (no blinking), all in the ring's green. Once the ring drops below 25% the
    // recharge reminder holds until the ring is charged all the way back to full.
    const ringFull = p.charge >= T.charge - 0.5;
    if (ringFull) p.warnLow = false;
    if (p.charge < T.charge * 0.25) p.warnLow = true;
    let warnY = 78;
    const warn = (msg) => { text(msg, 40, warnY, 6, C.green, "left"); warnY += 12; };
    if (p.warnLow) warn("PRESS G TO RECHARGE");
    drawOath(p);
    bar(40, 26, 160, 5, p.bmp / 100, full && Math.floor(s.t * 6) % 2 ? "#ffffff" : C.bright, C.green);
    drawAbilityBar(p, full && ringFull);
    // Beware My Power is ready but the ring isn't full: stays up until the ring is full (or the meter is spent)
    if (full && !ringFull) warn("V NEEDS FULL RING CHARGE 100%");
    // nearly dry: shown only while the ring is at 5% or less
    if (pct <= 5) warn("RING CHARGE " + pct + "%");
    // Bottom left: the ring (your one life), heart and health
    ctx.drawImage(ART.ring, 6, H - 31, ART.ring.width * 2, ART.ring.height * 2);
    ctx.drawImage(ART.heart, 34, H - 26, ART.heart.width * 2, ART.heart.height * 2);
    bar(58, H - 23, 160, 13, p.hp / T.hp, p.hp < 30 && Math.floor(s.t * 5) % 2 ? "#ff8a8a" : C.hp, C.hpDark);
    // Boss bar, top right
    const b = s.boss;
    if (b && b.state !== "enter") {
      text("OTTO ZUNDAPT", W - 58, 12, 8, C.gold, "right");
      bar(W - 298, 22, 240, 13, b.hp / b.max, C.red, "#7a1018");
    }
    if (s.level === 2 && s.hunters.some((h) => h.state !== "enter")) {
      s.hunters.forEach((h, i) => {
        const y = 10 + i * 24;
        text(h.name, W - 298, y, 6, C.red, "left");
        bar(W - 298, y + 6, 240, 9, h.hp / h.max, C.red, "#7a1018");
      });
    }
    if (s.goT > 0 && !s.boss) drawGoArrow();
  }
  // On-screen pause button, top right: two bars while playing, a play arrow while paused
  const PAUSE_BTN = { x: W - 46, y: 6, w: 40, h: 40 };
  const onPauseBtn = (c) => c.x >= PAUSE_BTN.x - 4 && c.x <= PAUSE_BTN.x + PAUSE_BTN.w + 4 && c.y >= PAUSE_BTN.y - 4 && c.y <= PAUSE_BTN.y + PAUSE_BTN.h + 4;
  // Same pixel key as the Pause card on the controls page (img/key-p.svg, 20x20), drawn at 2x
  const PAUSE_KEY = [[1,0,18,20,"#0d0d0d"],[0,1,20,18,"#0d0d0d"],[1,1,18,18,"#2a2a2a"],[2,1,16,3,"#8b9298"],[1,4,3,12,"#3e3e3e"],[16,4,3,12,"#3e3e3e"],[2,16,16,3,"#1c1c1c"],[4,4,12,12,"#a8afb4"],[5,5,10,10,"#5c6266"],[2,2,1,1,"#a8afb4"],[17,2,1,1,"#a8afb4"],[2,17,1,1,"#a8afb4"],[17,17,1,1,"#a8afb4"],[7,6,2,7,"#ffffff"],[11,6,2,7,"#ffffff"]];
  function drawPauseButton() {
    const { x, y } = PAUSE_BTN, k = PAUSE_BTN.w / 20;
    const paused = s.mode === "paused";
    // While paused the two bars become a play arrow on the same key
    for (const [rx, ry, rw, rh, col] of PAUSE_KEY) {
      if (paused && col === "#ffffff") continue;
      ctx.fillStyle = col; ctx.fillRect(x + rx * k, y + ry * k, rw * k, rh * k);
    }
    if (paused) {
      ctx.fillStyle = "#ffffff";
      // 10px long (4px shorter than the 14px bars span), 14px tall, centred on the key face
      for (let i = 0; i < 10; i++) { const hh = Math.max(1, Math.round(7 * (1 - i / 10))); ctx.fillRect(x + 15 + i, y + 19 - hh, 1, hh * 2); }
    }
  }
  // ---------- Pause menu ----------
  const CONTROL_ROWS = [["W A S D", "MOVE"], ["SHIFT", "FLY FASTER"], ["MOUSE", "AIM"], ["SPACE (HOLD)", "FORCEFIELD"], ["1", "FIST"], ["2", "BOULDER"], ["3 (HOLD)", "BEAM"], ["4", "ROPE"], ["C", "PUNCH"], ["V", "BEWARE MY POWER"], ["G / HOLD G", "OATH / QUICK CHARGE"], ["P", "PAUSE"]];
  function menuButtons() {
    const bw = 240, bh = 40, gap = 14, x = W / 2 - bw / 2;
    const stack = (labels, top) => labels.map(([id, label], i) => ({ id, label, x, y: top + i * (bh + gap), w: bw, h: bh }));
    if (menu === "options") return stack([["resume", "RESUME"], ["restart", s.test ? "RESTART TEST" : "RESTART LEVEL"], ["testboss", "TEST BOSS FIGHT"], ["testl2", "TEST LEVEL 2"], ["quit", "QUIT TO HOME"], ["back", "BACK"]], 133);
    if (menu === "settings") return stack([["background", "BACKGROUND"], ["sound", "SOUND"], ["back", "BACK"]], 205);
    if (menu === "background") return stack([["stars", "STARS: " + (settings.manyStars ? "MANY" : "FEW")], ["shake", "SCREEN SHAKE: " + (settings.shake ? "ON" : "OFF")], ["mogo", "MOGO: " + (settings.noMogo ? "OFF" : "ON")], ["tosettings", "BACK"]], 205);
    if (menu === "sound") {
      // MUSIC and SFX buttons, each with its volume bar right next to it (10% steps)
      const b = stack([["music", "MUSIC: " + (settings.music ? "ON" : "OFF")], ["sfx", "SFX: " + (settings.sfx ? "ON" : "OFF")], ["tosettings", "BACK"]], 205);
      const out = [];
      b.forEach((m, i) => {
        if (i < 2) { m.x = W / 2 - 245; m.w = 200; out.push(m, { id: m.id + "Vol", bar: true, x: W / 2 - 25, y: m.y + 7, w: 185, h: 26 }); }
        else out.push(m);
      });
      return out;
    }
    if (menu === "controls") return stack([["back", "BACK"]], 440);
    return stack([["options", "OPTIONS"], ["controls", "CONTROLS"], ["settings", "SETTINGS"]], 205);
  }
  // Chunky grey pixel button: dark outline with clipped corners, light top edge, deep bottom lip
  function pixelButton(b, hot) {
    const { x, y, w, h } = b;
    ctx.fillStyle = "#14171d"; ctx.fillRect(x + 4, y, w - 8, h + 4); ctx.fillRect(x, y + 4, w, h - 4); ctx.fillRect(x + 2, y + 2, w - 4, h);
    ctx.fillStyle = "#3a4152"; ctx.fillRect(x + 4, y + h - 6, w - 8, 6); ctx.fillRect(x + 2, y + h - 8, w - 4, 4);
    ctx.fillStyle = hot ? "#a3abc2" : "#8a92a8"; ctx.fillRect(x + 4, y + 3, w - 8, h - 11); ctx.fillRect(x + 3, y + 5, w - 6, h - 15);
    ctx.fillStyle = hot ? "#cdd3e2" : "#b3bacb"; ctx.fillRect(x + 5, y + 3, w - 10, 3); ctx.fillRect(x + 3, y + 6, 2, h - 18);
    ctx.fillStyle = "#5d6579"; ctx.fillRect(x + 4, y + h - 9, w - 8, 2);
    ctx.font = '11px "Press Start 2P", monospace'; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = hot ? "#000" : "#1b1f27"; ctx.fillText(b.label, x + w / 2, y + h / 2 - 2);
  }
  // A volume bar like a pixel MP bar: black frame, pale inner rim, dark track, green fill, and the percent beside it
  // the knob on a volume bar is the power lantern (public/img/lantern-knob.png)
  const ringKnob = new Image(); ringKnob.src = import.meta.env.BASE_URL + "img/lantern-knob.png";
  function volumeBar(b) {
    const v = settings[b.id] ?? 1, { x, y, w, h } = b, iw = w - 10, n = Math.round(v * 10);
    ctx.fillStyle = "#000"; ctx.fillRect(x + 2, y, w - 4, h); ctx.fillRect(x, y + 2, w, h - 4);
    ctx.fillStyle = "#d8d0cc"; ctx.fillRect(x + 3, y + 2, w - 6, h - 4); ctx.fillRect(x + 2, y + 3, w - 4, h - 6);
    ctx.fillStyle = "#2a2f3a"; ctx.fillRect(x + 5, y + 5, iw, h - 10);
    ctx.fillStyle = C.green; ctx.fillRect(x + 5, y + 5, Math.round(iw * n / 10), h - 10);
    ctx.fillStyle = C.bright; ctx.fillRect(x + 5, y + 5, Math.round(iw * n / 10), 2);
    if (ringKnob.complete && ringKnob.width) ctx.drawImage(ringKnob, Math.round(x + 5 + iw * n / 10 - ringKnob.width / 2), Math.round(y + h / 2 - ringKnob.height / 2));
    text(n * 10 + "%", x + w + 30, y + h / 2, 8, "#b3bacb");
  }
  function drawPauseMenu() {
    ctx.globalAlpha = 0.65; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    const title = { options: "OPTIONS", controls: "CONTROLS", settings: "SETTINGS", sound: "SOUND", background: "BACKGROUND" }[menu] || "PAUSED";
    text(title, W / 2, menu === "controls" ? 70 : 150, 16, "#b3bacb"); // same grey as the menu buttons
    if (menu === "controls") {
      // Compact grey panel; each control sits in its own outlined box with black lettering
      const px = W / 2 - 170, py = 96, pw = 340, rowH = 22, gap = 4;
      pixelButton({ x: px, y: py, w: pw, h: 14 + CONTROL_ROWS.length * (rowH + gap) + 6, label: "" }, false);
      ctx.font = '8px "Press Start 2P", monospace'; ctx.textBaseline = "middle";
      CONTROL_ROWS.forEach(([k, v], i) => {
        const bx = px + 12, by = py + 12 + i * (rowH + gap), bw = pw - 24;
        ctx.fillStyle = "#14171d"; ctx.fillRect(bx, by, bw, rowH);
        ctx.fillStyle = "#c9cfdc"; ctx.fillRect(bx + 2, by + 2, bw - 4, rowH - 4);
        ctx.fillStyle = "#14171d"; ctx.fillRect(bx + 128, by + 2, 2, rowH - 4);
        ctx.fillStyle = "#000"; ctx.textAlign = "center"; ctx.fillText(k, bx + 65, by + rowH / 2 + 1);
        ctx.textAlign = "left"; ctx.fillText(v, bx + 142, by + rowH / 2 + 1);
      });
    }
    for (const b of menuButtons()) b.bar ? volumeBar(b) : pixelButton(b, mouse.on && inRect(mouse, b));
    if (!menu) text("CLICK OUTSIDE OR PRESS P TO RESUME", W / 2, 386, 7, C.muted);
  }
  const inRect = (c, b) => c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h + 4;
  function menuClick(c) {
    const b = menuButtons().find((m) => inRect(c, m));
    if (b && b.bar) {   // click along the bar: snaps to the nearest 10%
      settings[b.id] = Math.max(0, Math.min(10, Math.round((c.x - b.x - 5) / (b.w - 10) * 10))) / 10;
      saveSettings(); window.dispatchEvent(new Event("lo-settings")); return;
    }
    if (!b) { if (menu) menu = null; else resume(); return; }
    if (b.id === "back") menu = null;
    else if (b.id === "options" || b.id === "controls" || b.id === "settings" || b.id === "sound" || b.id === "background") menu = b.id;
    else if (b.id === "tosettings") menu = "settings";
    else if (b.id === "resume") resume();
    else if (b.id === "restart") { reset(); s.mode = "play"; menu = null; keys.clear(); }
    else if (b.id === "testboss") { testBoss = true; testL2 = false; resumeLevel = 1; reset(); s.mode = "play"; menu = null; keys.clear(); }
    else if (b.id === "testl2") { testL2 = true; testBoss = false; reset(); s.mode = "play"; menu = null; keys.clear(); }
    else if (b.id === "quit") { menu = null; if (opts.onQuit) opts.onQuit(); else location.href = "/"; }
    else if (b.id === "shake") { settings.shake = !settings.shake; saveSettings(); }
    else if (b.id === "stars") { settings.manyStars = !settings.manyStars; saveSettings(); }
    else if (b.id === "mogo") { settings.noMogo = !settings.noMogo; saveSettings(); window.dispatchEvent(new Event("lo-settings")); }
    else if (b.id === "music" || b.id === "sfx") { settings[b.id] = !settings[b.id]; saveSettings(); window.dispatchEvent(new Event("lo-settings")); }
  }
  function drawTouchButtons() {
    if (!usedTouch) return;
    for (const bt of BUTTONS) {
      ctx.globalAlpha = touchBtn[bt.id] ? 0.7 : 0.35;
      ctx.fillStyle = bt.id === "power" ? (s.p.bmp >= 100 ? C.bright : "#3a4a3e") : C.green;
      ctx.beginPath(); ctx.arc(bt.x, bt.y, bt.r, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
      text(bt.label, bt.x, bt.y + 1, 5, "#04130a");
    }
    ctx.globalAlpha = 0.25; ctx.strokeStyle = C.text; ctx.lineWidth = 1;
    if (touchMove.active) { ctx.beginPath(); ctx.arc(touchMove.ox, touchMove.oy, 18, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.save();
    if (s.shake > 0 && settings.shake) ctx.translate(Math.round((Math.random() - 0.5) * 3), Math.round((Math.random() - 0.5) * 3));
    drawBackground();
    ctx.save();
    ctx.translate(0, -Math.round(s.camY));
    // Depth-sorted characters, like an overworld
    const list = [];
    if (s.mode !== "title") list.push({ y: s.p.y, d: drawPlayer });
    for (const r of s.rats) if (r.hp > 0) list.push({ y: r.y, d: () => drawRat(r) });
    if (s.boss) list.push({ y: s.boss.y, d: () => drawBoss(s.boss) });
    for (const h of s.hunters) list.push({ y: h.y, d: () => drawHunter(h) });
    list.sort((a, b) => a.y - b.y).forEach((e) => e.d());
    for (const bo of s.boulders) {
      ctx.save(); ctx.translate(Math.round(bo.x), Math.round(bo.y)); ctx.rotate(Math.round(bo.rot * 2) / 2 * (Math.PI / 2));
      const bs = T.boulder.size * (0.15 + 0.85 * Math.min(1, (bo.age || 0) / 0.12)), bw = ART.boulder.width * bs, bh = ART.boulder.height * bs;
      ctx.shadowColor = C.green; ctx.shadowBlur = 10; ctx.drawImage(ART.boulder, -bw / 2, -bh / 2, bw, bh); ctx.restore();
    }
    for (const bl of s.blades) {
      ctx.save(); ctx.translate(Math.round(bl.x), Math.round(bl.y)); ctx.rotate(Math.floor(bl.rot * 2) * Math.PI / 10);
      if (bl.friendly) { ctx.shadowColor = C.green; ctx.shadowBlur = 8; } else { ctx.shadowColor = "#000"; ctx.shadowBlur = 3; }
      const sw = ART.saw.width; if (!bl.friendly) { ctx.rotate(-Math.floor(bl.rot * 2) * Math.PI / 10); ctx.scale(1, 0.7); ctx.rotate(Math.floor(bl.rot * 2) * Math.PI / 10); }
      ctx.drawImage(ART.saw, -sw / 2, -sw / 2); ctx.restore();
    }
    if (s.boss && s.boss.laser) drawLaser(s.boss);
    if (s.level === 2) drawL2Shots();
    if (s.p.rope) drawRope();
    if (s.p.shield) {
      ctx.globalAlpha = 0.85 + 0.15 * Math.sin(s.t * 12);
      const f = s.p.shieldHp / T.shield.hp, img = shieldImg[f > 0.75 ? 0 : f > 0.5 ? 1 : f > 0.25 ? 2 : 3];
      if (f <= 0.25) ctx.globalAlpha *= Math.random() < 0.25 ? 0.4 : 1;
      const g = Math.min(1, (s.p.shieldT || 1) / 0.15), rp = ringPos();
      const pbx = playerBox(), scx = rp.x + (pbx.x - rp.x) * g, scy = rp.y + (pbx.y - rp.y) * g, sr = T.shield.r * (0.1 + 0.9 * g);
      ctx.drawImage(img, Math.round(scx - sr), Math.round(scy - sr), Math.round(sr * 2), Math.round(sr * 2));
      ctx.globalAlpha = 1;
    }
    for (const f of s.fx) { ctx.globalAlpha = Math.min(1, f.life * 3); ctx.fillStyle = f.color; ctx.fillRect(f.x | 0, f.y | 0, 2, 2); }
    ctx.globalAlpha = 1;
    for (const r of s.rings) {
      ctx.globalAlpha = Math.min(1, r.life * 2);
      const lw = r.thin ? 0.5 : 1;
      ctx.strokeStyle = r.color || C.bright; ctx.lineWidth = 6 * lw; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke();
      ctx.strokeStyle = C.green; ctx.lineWidth = 3 * lw; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 0.7, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const g of s.ghosts) {   // outlines of rats the burst killed: held for half a second, then fading out
      ctx.globalAlpha = g.t < 0.5 ? 0.9 : Math.max(0, 0.9 * (1 - (g.t - 0.5) / 0.45));
      ctx.shadowColor = C.green; ctx.shadowBlur = 4;
      ctx.drawImage(g.img, g.x - 1, g.y - 1);
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    if (s.bmpWave) {
      // Beware My Power's burst is a construct: a see-through sphere of ring light with an energy lattice inside
      const w = s.bmpWave, r = 4 + w.sp * w.t, a = 1 - w.t / w.life;
      ctx.save();
      ctx.beginPath(); ctx.arc(w.x, w.y, r, 0, 7); ctx.clip();
      ctx.globalAlpha = 0.16 * a; ctx.fillStyle = C.green; ctx.fillRect(w.x - r, w.y - r, r * 2, r * 2);
      ctx.globalAlpha = 0.3 * a; ctx.strokeStyle = C.bright; ctx.lineWidth = 1.5;
      for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.arc(w.x, w.y, r * k / 5, 0, 7); ctx.stroke(); }
      ctx.globalAlpha = 0.18 * a;
      for (let k = 0; k < 16; k++) { const an = k * Math.PI / 8 + w.t; ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + Math.cos(an) * r, w.y + Math.sin(an) * r); ctx.stroke(); }
      ctx.restore();
      ctx.globalAlpha = 0.75 * a; ctx.strokeStyle = C.bright; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(w.x, w.y, r, 0, 7); ctx.stroke();
      ctx.globalAlpha = 0.9 * a; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(w.x, w.y, r, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (s.p.bmpAnim > 0) {
      const p = s.p, k = Math.min(1, (1.8 - p.bmpAnim) / 1.05);
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(s.t * 30);
      ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(p.x, p.y - 28, 8 + k * 22, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (s.p.beam) { ctx.save(); drawBeam(); ctx.restore(); }
    ctx.save(); drawPunch(); ctx.restore();
    ctx.restore();

    if (s.whiteout > 0) { ctx.globalAlpha = s.whiteout * 2; ctx.fillStyle = "#e8ffe9"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (s.p.bmpAnim > 0.75) { ctx.globalAlpha = 0.25; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }

    if (s.mode !== "title") drawHud();
    if (s.mode === "play" || s.mode === "paused") drawPauseButton();
    if (s.banner) {
      const bn = s.banner;
      if (bn.big) { text("BEWARE", W / 2, H / 2 - 50, 14, C.green); text("MY POWER!", W / 2, H / 2 - 30, 14, C.green); }
      else {
        ctx.globalAlpha = Math.min(1, bn.t * 2);
        text(bn.text, W / 2, H / 2 - 40, bn.sub ? 12 : 10, C.green);
        if (bn.sub) text(bn.sub, W / 2, H / 2 - 24, 5, C.green);
        ctx.globalAlpha = 1;
      }
    }
    drawTouchButtons();

    if (s.mode === "title") {
      ctx.globalAlpha = 0.55; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(0, (H - 320) / 2);
      const l2 = s.level === 2;
      text(s.test ? "TEST MODE" : l2 ? "LEVEL 2" : "LEVEL 1", W / 2, 62, 8, C.muted);
      text(l2 ? (s.test ? "TEST LEVEL 2" : L2.names.join(" & ")) : s.test ? "TEST BOSS FIGHT" : "SPACE RAT ATTACK", W / 2, 82, 11, C.green);
      text(l2 ? "Two Manhunters wait in the desert." : s.test ? "Straight to Otto Zundapt." : "Space rats are boarding", W / 2, 108, 6, C.text);
      text(s.test ? "Nothing here is saved." : l2 ? "Defeat them both." : "the station. Hold the line.", W / 2, 120, 6, C.text);
      const rows = [["W A S D", "MOVE"], ["SHIFT", "FLY FASTER"], ["MOUSE", "AIM"], ["SPACE (HOLD)", "FORCEFIELD"], ["1", "FIST"], ["2", "BOULDER"], ["3 (HOLD)", "BEAM"], ["4", "ROPE"], ["C", "PUNCH"], ["V", "BEWARE MY POWER"], ["G / HOLD G", "OATH / QUICK CHARGE"], ["P", "PAUSE"]];
      rows.forEach(([k, v], i) => { text(k, W / 2 - 6, 138 + i * 11, 6, C.bright, "right"); text(v, W / 2 + 6, 138 + i * 11, 6, C.text, "left"); });
      if (Math.floor(performance.now() / 500) % 2 === 0) text("PRESS ENTER OR TAP", W / 2, 278, 8, C.bright);
      ctx.restore();
    } else if (s.mode === "paused") {
      drawPauseMenu();
      drawPauseButton();
    } else if (s.mode === "over" && s.endTimer > 0.8) {
      ctx.globalAlpha = 0.65; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      text("YOUR LIGHT", W / 2, H / 2 - 42, 12, C.red);
      text("FADED", W / 2, H / 2 - 24, 12, C.red);
      text("SCORE " + s.score, W / 2, H / 2 + 4, 8, C.text);
      text("ENTER OR TAP TO RETRY", W / 2, H / 2 + 34, 6, C.bright);
    }
    if (s.dialog && s.mode === "play") drawDialog(s.dialog);
  }

  function frame(now) {
    if (destroyed) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  // ---------- Input ----------
  const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "];
  let lastArrow = null;
  function startOrRestart() {
    if (s.mode === "title") { s.mode = "play"; return true; }
    if (s.mode === "over" && s.endTimer > 0.8) { reset(); s.mode = "play"; return true; }
    return false;
  }
  function norm(e) { const k = e.key === "Spacebar" ? " " : e.key; return k.length === 1 ? k.toLowerCase() : k; }
  function onKeyDown(e) {
    const k = norm(e);
    if (GAME_KEYS.includes(k)) e.preventDefault();
    if ((k === "Enter" || k === " ") && !e.repeat && startOrRestart()) return;
    if (k === "p" && (s.mode === "play" || s.mode === "paused")) { if (s.mode === "play") pause(); else resume(); return; }
    if (k === "Escape" && s.mode === "paused") { if (menu) menu = null; else resume(); return; }
    if (k === "Escape" && s.mode === "play") { pause(); return; }
    if (k.startsWith("Arrow")) {
      lastArrow = k;
      if (s.mode === "play" && !mouse.on) s.p.aim = { ArrowLeft: Math.PI, ArrowRight: 0, ArrowUp: -Math.PI / 2, ArrowDown: Math.PI / 2 }[k];
    }
    if ("wasd".includes(k) && k.length === 1 && s.mode === "play" && !mouse.on) {
      s.p.aim = { a: Math.PI, d: 0, w: -Math.PI / 2, s: Math.PI / 2 }[k];
    }
    if (!e.repeat) pressed.add(k);
    keys.add(k);
  }
  const onKeyUp = (e) => keys.delete(norm(e));
  const onBlur = () => { keys.clear(); if (s.mode === "play") pause(); };

  // Touch: drag anywhere on the left side to walk; buttons on the right for constructs.
  let usedTouch = false;
  const touchMove = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
  const touchBtn = {};
  const BUTTONS = [
    { id: "punch", label: "PUNCH", x: W - 86, y: H - 18, r: 13, tap: true },
    { id: "fist", label: "FIST", x: W - 52, y: H - 24, r: 15, tap: true },
    { id: "boulder", label: "ROCK", x: W - 20, y: H - 44, r: 15, tap: true },
    { id: "beam", label: "BEAM", x: W - 58, y: H - 58, r: 14 },
    { id: "shield", label: "FIELD", x: W - 24, y: H - 80, r: 15 },
    { id: "rope", label: "ROPE", x: W - 62, y: H - 92, r: 13, tap: true },
    { id: "power", label: "POWER", x: W - 24, y: H - 114, r: 13, tap: true },
    { id: "charge", label: "CHARGE", x: W - 62, y: H - 126, r: 13 },
  ];
  const ptrBtn = new Map();
  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  function onDown(e) {
    canvas.focus();
    // Clicking or tapping anywhere while paused resumes; the on-screen button pauses
    // Paused: the menu buttons work, the pause button or a click outside the buttons resumes
    if (s.mode === "paused") { e.preventDefault(); const c = toCanvas(e); if (onPauseBtn(c)) resume(); else menuClick(c); return; }
    if (s.mode === "play" && onPauseBtn(toCanvas(e))) { e.preventDefault(); pause(); return; }
    if (s.mode === "play" && s.dialog) { e.preventDefault(); pressed.add("tap"); return; }
    if (e.pointerType === "mouse") { startOrRestart(); return; }
    e.preventDefault();
    usedTouch = true;
    if (startOrRestart()) return;
    const c = toCanvas(e);
    const bt = BUTTONS.find((b) => Math.hypot(c.x - b.x, c.y - b.y) < b.r + 4);
    if (bt) { ptrBtn.set(e.pointerId, bt.id); touchBtn[bt.id] = true; if (bt.tap) pressed.add(bt.id); return; }
    if (!touchMove.active) Object.assign(touchMove, { active: true, id: e.pointerId, ox: c.x, oy: c.y, x: c.x, y: c.y });
  }
  const mouse = { on: false, x: 0, y: 0 };
  function onMove(e) {
    if (e.pointerType === "mouse") {
      const r = canvas.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { const c = toCanvas(e); mouse.on = true; mouse.x = c.x; mouse.y = c.y; }
      return;
    }
    if (touchMove.active && e.pointerId === touchMove.id) { const c = toCanvas(e); touchMove.x = c.x; touchMove.y = c.y; }
  }
  function onUp(e) {
    if (ptrBtn.has(e.pointerId)) { touchBtn[ptrBtn.get(e.pointerId)] = false; ptrBtn.delete(e.pointerId); }
    if (e.pointerId === touchMove.id) touchMove.active = false;
  }

  addEventListener("keydown", onKeyDown);
  addEventListener("keyup", onKeyUp);
  addEventListener("blur", onBlur);
  canvas.addEventListener("pointerdown", onDown);
  addEventListener("pointermove", onMove);
  addEventListener("pointerup", onUp);
  addEventListener("pointercancel", onUp);
  canvas.style.touchAction = "none";
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); audio.stopLoops();
      removeEventListener("keydown", onKeyDown); removeEventListener("keyup", onKeyUp); removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onDown);
      removeEventListener("pointermove", onMove); removeEventListener("pointerup", onUp); removeEventListener("pointercancel", onUp);
    },
    // For testing: jump straight to a point in the level.
    debug: { state: () => s, T, ratBox, bossBox, stunHunter, hitHunter },
  };
}
