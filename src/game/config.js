// Lantern's Oath tuning: screen size, colours, and every gameplay number.
export const W = 720, H = 540;
export const C = {
  green: "#2fd85f", bright: "#8dffad", deep: "#0e5c27", white: "#e8ffe9", text: "#d8f5e1",
  muted: "#8fb39b", red: "#ff3b3b", hp: "#e8323f", hpDark: "#8e1520", gold: "#ffd34a", ink: "#05080d",
};
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ---------- Tuning ----------
export const T = {
  speed: 70, boost: 2.125, boostDrain: 3, hp: 130 /* 100 + 30% */, charge: 450, regenDelay: 0.4,   // fast flight sips a sliver of ring charge (per second)
  // The ring never refills by itself. Tap G: he recites the Lantern's Oath and the ring fills completely over
  // `oath` seconds. Hold G: a quick recharge (rate per second: the original 24, raised 20%, 20%, then 15%) for as long as it is held.
  recharge: { rate: 39.744, oath: 6.5, guard: 3, tap: 0.25, spinUp: 0.35, hitLock: 0.6 },
  punch: { cost: 0, cd: 0.46, time: 0.44, reach: 12, dmg: 1, bossDmg: 1, knock: 70 },   // C: a one-two with his own arms, jab then cross, each hit dmg
  fist: { cost: 12, cd: 0.4, time: 0.36, reach: 26, scale: 2.4, dmg: 2, bossDmg: 3, knock: 150, swing: Math.PI / 2 },
  boulder: { cost: 100, cd: 0.5, cooldown: 2, speed: 165, dmg: 4, knock: 130, size: 4 },
  beam: { start: 3, drain: 15, dps: 8.82 },
  shield: { start: 3, drain: 6.09, r: 26, hp: 222.75,   /* forcefield health: 148.5 + 50% */ ratHit: 20, sawHit: 25, laserDps: 30, touchDps: 25, mend: 12, broken: 2.5 },
  // the lasso does no damage. Rats (up to 4) are reeled in; with no rats in reach it ties up one boss (Otto or one
  // Manhunter) where he stands: bossHold s on a tap, up to bossHoldMax s while the lasso key stays held
  rope: { cost: 52.8, cd: 0.5, cooldown: 3, max: 4, whirl: 0.24, reach: 0.3, form: 0.24, pull: 0.75, loop: 10, hold: 1.4, bossHold: 2, bossHoldMax: 3 },
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

// ---- Level 2: the desert and the two Manhunters ----
// The two Manhunters are Zephelone (left) and Asmodius (right). Each has 1.5x Otto Zundapt's health, less 15%.
// They take turns and copy each other's move: Zephelone tornadoes, then Asmodius tornadoes; Zephelone lasers, then
// Asmodius lasers; and so on. Ranged attacks come in pairs, one from each hand: the left one fires left hand then right,
// the right one right hand then left. In level 2 every Lantern attack does 35% more damage.
export const L2 = {
  names: ["ZEPHELONE", "ASMODIUS"],
  hp: Math.round(T.boss.hp * 1.5 * 0.85), dmgBoost: 1.35, speed: 60, enterSpeed: 95, lift: 6, spawnAt: 2.4, fade: 1.5,
  floorMargin: 14,   // feet stay this far below the base of the dunes
  rest: [0.91, 1.625],   // the pause between attacks: 30% longer than the original 0.7-1.25 s
  // the rush: approach speed is 15% below the original 160
  punch: { reach: 30, approach: 136, maxApproach: 4.5, wind: 0.32, strike: 0.16, recover: 0.45, lunge: 12, dmg: 16, shieldHit: 30 },
  // countering the rush: 3 hits while he rushes in empties his guard bar and drops him to one knee for 3 seconds
  // (the beam counts one hit for every 4 of its damage ticks)
  guard: { hits: 3, beamTicks: 4, stagger: 0.16, fall: 0.18, stun: 3, rise: 0.32 },
  bolt: { charge: 0.38, gap: 0.22, speed: 270, dmg: 8, shieldHit: 14 },
  // size: the sprite in pixels. boxes: its funnel as fractions of that size, measured from the sprite
  // [top, bottom, centre x offset, half width] with 0 = bottom tip, 1 = top
  // after leaving the hand a tornado grows (easing out over `grow` s) until it is growTo x a Manhunter's height
  // one tornado per attack. shieldFrac: a hit on the forcefield takes this share of its full durability.
  // lock: once the Lantern is within `units` grid units (of `unit` px) of it, the tornado locks on and steers after him
  tornado: { grow: 2.5, growTo: 3, charge: 0.45, gap: 0.3, speed: 65,   /* 35% slower than the original 100 */ dmg: 12, shieldFrac: 0.5, life: 5, size: [40, 46],
    lock: { units: 8, unit: 16, turn: 2.2 },
  // a tornado that misses (passes the Lantern by, or runs out its life) shrinks and fades over `time` s, drifting
  // up toward the horizon as if it were moving off into the distance; it is harmless while it does
  fade: { time: 2.5, rise: 22 },
  // hold the ring beam (3) on a tornado for `beam` s (it stalls while the beam holds it) and it turns green and is
  // deflected along the beam at `speed`; it then hits a Manhunter it runs into for `dmg` (before Level 2's boost).
  // A deflected tornado never locks on to anyone. Off the beam, its charge drains at `decay` s per s.
  deflect: { beam: 5, stall: 0.15, speed: 140, dmg: 12, decay: 1 },
    boxes: [[1, 0.67, 0, 0.48], [0.67, 0.28, -0.01, 0.29], [0.28, 0, 0.04, 0.16]] },
};
