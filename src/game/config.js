// Lantern's Oath tuning: screen size, colours, and every gameplay number.
export const W = 720, H = 540;
export const C = {
  green: "#2fd85f", bright: "#8dffad", deep: "#0e5c27", white: "#e8ffe9", text: "#d8f5e1",
  muted: "#8fb39b", red: "#ff3b3b", hp: "#e8323f", hpDark: "#8e1520", gold: "#ffd34a", ink: "#05080d",
};
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ---------- Tuning ----------
export const T = {
  speed: 70, boost: 2.125, boostDrain: 3, hp: 100, charge: 450, regenDelay: 0.4,   // fast flight sips a sliver of ring charge (per second)
  // The ring never refills by itself. Tap G: he recites the Lantern's Oath and the ring fills completely over
  // `oath` seconds. Hold G: a quick recharge (rate per second, 20% faster than the original 24) for as long as it is held.
  recharge: { rate: 28.8, oath: 6.5, guard: 3, tap: 0.25, spinUp: 0.35, hitLock: 0.6 },
  punch: { cost: 0, cd: 0.46, time: 0.44, reach: 12, dmg: 1, bossDmg: 1, knock: 70 },   // C: a one-two with his own arms, jab then cross, each hit dmg
  fist: { cost: 12, cd: 0.4, time: 0.36, reach: 26, scale: 2.4, dmg: 2, bossDmg: 3, knock: 150, swing: Math.PI / 2 },
  boulder: { cost: 100, cd: 0.5, cooldown: 2, speed: 165, dmg: 4, knock: 130, size: 4 },
  beam: { start: 3, drain: 15, dps: 8.82 },
  shield: { start: 3, drain: 6.09, r: 26, hp: 148.5, ratHit: 20, sawHit: 25, laserDps: 30, touchDps: 25, mend: 12, broken: 2.5 },
  rope: { cost: 52.8, cd: 0.5, cooldown: 3, max: 4, whirl: 0.24, reach: 0.3, form: 0.24, pull: 0.75, loop: 10, hold: 1.4 },
  bmp: { perKill: 9, perBossHp: 0.9, passive: 0.6 },
  suitUp: { r: 120, dmg: 3, bossDmg: 5, knock: 220 },   // the burst when he suits back up from human form
  rat: { hp: 3.4, speed: 40, reach: 17, windup: 0.38, dmg: 10, cd: 1.0 },
  boss: { hp: 80, sawR: 16, bladeSpeed: 115, roam: 55, throwT: 0.55, release: 0.32, bladeDmg: 14, reflectDmg: 6, laserDps: 12, touchDmg: 12,
    // crush: arms up, charge at the Lantern, slam both gold arms down. A gold ring marks where he'll land.
    crush: { wind: 0.55, speed: 250, maxDash: 0.9, slam: 0.12, recover: 0.6, r: 58, dmg: 20, shieldHit: 45 } },
};
// The level is one long climb (world y of the screen top runs from 0 up to BOSS_STOP).
// Rats keep coming, more of them and faster the higher you get; each kill opens up FLOW.gate more of the climb.
export const BOSS_STOP = -2660;
export const FLOW = { gate: 150, startY: -40, perSpawn: 2, maxAlive: [2, 8], interval: [2.4, 0.8], heal: 2 };
