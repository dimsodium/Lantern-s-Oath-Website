// Image files for the game's sprites (public/sprites). Generated from the artifact's embedded sprite data.
import pixelSprites from "./data/pixel-sprites.json";
import manhunterMeta from "./data/manhunter.json";

const u = (p) => import.meta.env.BASE_URL + p;

// Pixel-map sprites (rats, fist): each letter is a palette colour, '.' is clear.
export const PIXEL_SPRITES = pixelSprites;

// Otto Zundapt, front view (from the user's turnaround sheet).
export const OTTO_FRONT = u("sprites/otto/front.png");

// Otto from every direction, in animatable parts (head, body, each arm). A string names the view a
// diagonal borrows; eye/jets/launcher are pixel positions on that view.
export const OTTO_DIRS = {
  "down": {
    "parts": {
      "head": u("sprites/otto/down/parts/head.png"),
      "body": u("sprites/otto/down/parts/body.png"),
      "armL": u("sprites/otto/down/parts/armL.png"),
      "armR": u("sprites/otto/down/parts/armR.png"),
    },
    "order": ["body", "armL", "armR", "head"],
    "eye": [28.4, 9.2],
    "jets": [20, 34],
    "launcher": {
      "arm": "armL",
      "muzzle": [8.5, 52.0],
    },
  },
  "up": {
    "parts": {
      "head": u("sprites/otto/up/parts/head.png"),
      "body": u("sprites/otto/up/parts/body.png"),
      "armL": u("sprites/otto/up/parts/armL.png"),
      "armR": u("sprites/otto/up/parts/armR.png"),
    },
    "order": ["head", "body", "armL", "armR"],
    "eye": null,
    "jets": [18, 34],
    "launcher": {
      "arm": "armR",
      "muzzle": [45.5, 53.0],
    },
  },
  "right": {
    "parts": {
      "head": u("sprites/otto/right/parts/head.png"),
      "body": u("sprites/otto/right/parts/body.png"),
      "armL": u("sprites/otto/right/parts/armL.png"),
      "armR": u("sprites/otto/right/parts/armR.png"),
    },
    "order": ["body", "head", "armL", "armR"],
    "eye": null,
    "jets": [27],
    "launcher": {
      "arm": "armR",
      "muzzle": [23.5, 48.0],
    },
  },
  "left": {
    "parts": {
      "head": u("sprites/otto/left/parts/head.png"),
      "body": u("sprites/otto/left/parts/body.png"),
      "armL": u("sprites/otto/right/parts/armL.png"),
      "armR": u("sprites/otto/left/parts/armR.png"),
    },
    "order": ["body", "head", "armL", "armR"],
    "eye": [18.8, 9.5],
    "jets": [26],
    "launcher": null,
  },
  "downright": {
    "parts": {
      "head": u("sprites/otto/downright/parts/head.png"),
      "body": u("sprites/otto/downright/parts/body.png"),
      "armL": u("sprites/otto/downright/parts/armL.png"),
      "armR": u("sprites/otto/downright/parts/armR.png"),
    },
    "order": ["body", "armL", "armR", "head"],
    "eye": [31.1, 9.1],
    "jets": [20, 34],
    "launcher": {
      "arm": "armL",
      "muzzle": [12.5, 51.0],
    },
  },
  "upright": {
    "parts": {
      "head": u("sprites/otto/upright/parts/head.png"),
      "body": u("sprites/otto/upright/parts/body.png"),
      "armL": u("sprites/otto/upright/parts/armL.png"),
      "armR": u("sprites/otto/upright/parts/armR.png"),
    },
    "order": ["head", "body", "armL", "armR"],
    "eye": null,
    "jets": [20, 34],
    "launcher": {
      "arm": "armR",
      "muzzle": [44.5, 53.0],
    },
  },
  "downleft": {
    "parts": {
      "head": u("sprites/otto/downleft/parts/head.png"),
      "body": u("sprites/otto/downleft/parts/body.png"),
      "armL": u("sprites/otto/downleft/parts/armL.png"),
      "armR": u("sprites/otto/downleft/parts/armR.png"),
    },
    "order": ["body", "armL", "armR", "head"],
    "eye": [21.9, 9.1],
    "jets": [20, 33],
    "launcher": {
      "arm": "armL",
      "muzzle": [7.5, 53.0],
    },
  },
  "upleft": {
    "parts": {
      "head": u("sprites/otto/upleft/parts/head.png"),
      "body": u("sprites/otto/upleft/parts/body.png"),
      "armL": u("sprites/otto/upleft/parts/armL.png"),
      "armR": u("sprites/otto/upleft/parts/armR.png"),
    },
    "order": ["head", "body", "armL", "armR"],
    "eye": null,
    "jets": [20, 34],
    "launcher": {
      "arm": "armR",
      "muzzle": [43.5, 53.0],
    },
  },
};

// The playable Lantern, front view.
export const HERO = u("sprites/hero/base.png");

// The Lantern's direction models (left-facing ones are mirrored at load), plus the construct fist.
export const HERO_DIRS = {
  "downright": u("sprites/hero/dirs/downright.png"),
  "down": u("sprites/hero/dirs/down.png"),
  "right": u("sprites/hero/dirs/right.png"),
  "upright": u("sprites/hero/dirs/upright.png"),
  "up": u("sprites/hero/dirs/up.png"),
  "fist": u("sprites/hero/dirs/fist.png"),
};

// The power battery lantern he recharges from.
export const LANTERN = u("sprites/lantern.png");

// Fast-flight pose (Shift): arms straight down, legs together.
export const HERO_FLY = {
  "down": u("sprites/hero/fly/down.png"),
  "downright": u("sprites/hero/fly/downright.png"),
  "right": u("sprites/hero/fly/right.png"),
  "upright": u("sprites/hero/fly/upright.png"),
  "up": u("sprites/hero/fly/up.png"),
};

// Lantern's Oath recharge pose, holding the power battery.
export const HERO_CHARGE = u("sprites/hero/charge.png");

// Human form (plain Hal) when the ring runs dry.
export const HERO_HUMAN = {
  "down": u("sprites/hero/human/down.png"),
  "downright": u("sprites/hero/human/downright.png"),
  "right": u("sprites/hero/human/right.png"),
  "upright": u("sprites/hero/human/upright.png"),
  "up": u("sprites/hero/human/up.png"),
};

// Human-form recharge pose.
export const HERO_CHARGE_HUMAN = u("sprites/hero/charge-human.png");

// Frame animations: punch 4f, idle breathing 4f @6fps, one-two 6f, Oath power-up 5f @10fps, Beware My Power.
export const HERO_ANIM = {
  "punch": {
    "down": [u("sprites/hero/anim/punch/down-0.png"), u("sprites/hero/anim/punch/down-1.png"), u("sprites/hero/anim/punch/down-2.png"), u("sprites/hero/anim/punch/down-3.png")],
    "downright": [u("sprites/hero/anim/punch/downright-0.png"), u("sprites/hero/anim/punch/downright-1.png"), u("sprites/hero/anim/punch/downright-2.png"), u("sprites/hero/anim/punch/downright-3.png")],
    "right": [u("sprites/hero/anim/punch/right-0.png"), u("sprites/hero/anim/punch/right-1.png"), u("sprites/hero/anim/punch/right-2.png"), u("sprites/hero/anim/punch/right-3.png")],
    "upright": [u("sprites/hero/anim/punch/upright-0.png"), u("sprites/hero/anim/punch/upright-1.png"), u("sprites/hero/anim/punch/upright-2.png"), u("sprites/hero/anim/punch/upright-3.png")],
    "up": [u("sprites/hero/anim/punch/up-0.png"), u("sprites/hero/anim/punch/up-1.png"), u("sprites/hero/anim/punch/up-2.png"), u("sprites/hero/anim/punch/up-3.png")],
  },
  "idle": {
    "down": [u("sprites/hero/anim/idle/down-0.png"), u("sprites/hero/anim/idle/down-1.png"), u("sprites/hero/anim/idle/down-2.png"), u("sprites/hero/anim/idle/down-1.png")],
    "downright": [u("sprites/hero/anim/idle/downright-0.png"), u("sprites/hero/anim/idle/downright-1.png"), u("sprites/hero/anim/idle/downright-2.png"), u("sprites/hero/anim/idle/downright-1.png")],
    "right": [u("sprites/hero/anim/idle/right-0.png"), u("sprites/hero/anim/idle/right-1.png"), u("sprites/hero/anim/idle/right-2.png"), u("sprites/hero/anim/idle/right-1.png")],
    "upright": [u("sprites/hero/anim/idle/upright-0.png"), u("sprites/hero/anim/idle/upright-1.png"), u("sprites/hero/anim/idle/upright-2.png"), u("sprites/hero/anim/idle/upright-1.png")],
    "up": [u("sprites/hero/anim/idle/up-0.png"), u("sprites/hero/anim/idle/up-1.png"), u("sprites/hero/anim/idle/up-2.png"), u("sprites/hero/anim/idle/up-1.png")],
  },
  "punchHuman": {
    "down": [u("sprites/hero/anim/punchHuman/down-0.png"), u("sprites/hero/anim/punchHuman/down-1.png"), u("sprites/hero/anim/punchHuman/down-2.png"), u("sprites/hero/anim/punchHuman/down-3.png")],
    "downright": [u("sprites/hero/anim/punchHuman/downright-0.png"), u("sprites/hero/anim/punchHuman/downright-1.png"), u("sprites/hero/anim/punchHuman/downright-2.png"), u("sprites/hero/anim/punchHuman/downright-3.png")],
    "right": [u("sprites/hero/anim/punchHuman/right-0.png"), u("sprites/hero/anim/punchHuman/right-1.png"), u("sprites/hero/anim/punchHuman/right-2.png"), u("sprites/hero/anim/punchHuman/right-3.png")],
    "upright": [u("sprites/hero/anim/punchHuman/upright-0.png"), u("sprites/hero/anim/punchHuman/upright-1.png"), u("sprites/hero/anim/punchHuman/upright-2.png"), u("sprites/hero/anim/punchHuman/upright-3.png")],
    "up": [u("sprites/hero/anim/punchHuman/up-0.png"), u("sprites/hero/anim/punchHuman/up-1.png"), u("sprites/hero/anim/punchHuman/up-2.png"), u("sprites/hero/anim/punchHuman/up-3.png")],
  },
  "idleHuman": {
    "down": [u("sprites/hero/anim/idleHuman/down-0.png"), u("sprites/hero/anim/idleHuman/down-1.png"), u("sprites/hero/anim/idleHuman/down-2.png"), u("sprites/hero/anim/idleHuman/down-1.png")],
    "downright": [u("sprites/hero/anim/idleHuman/downright-0.png"), u("sprites/hero/anim/idleHuman/downright-1.png"), u("sprites/hero/anim/idleHuman/downright-2.png"), u("sprites/hero/anim/idleHuman/downright-1.png")],
    "right": [u("sprites/hero/anim/idleHuman/right-0.png"), u("sprites/hero/anim/idleHuman/right-1.png"), u("sprites/hero/anim/idleHuman/right-2.png"), u("sprites/hero/anim/idleHuman/right-1.png")],
    "upright": [u("sprites/hero/anim/idleHuman/upright-0.png"), u("sprites/hero/anim/idleHuman/upright-1.png"), u("sprites/hero/anim/idleHuman/upright-2.png"), u("sprites/hero/anim/idleHuman/upright-1.png")],
    "up": [u("sprites/hero/anim/idleHuman/up-0.png"), u("sprites/hero/anim/idleHuman/up-1.png"), u("sprites/hero/anim/idleHuman/up-2.png"), u("sprites/hero/anim/idleHuman/up-1.png")],
  },
  "oath": [u("sprites/hero/anim/oath-0.png"), u("sprites/hero/anim/oath-1.png"), u("sprites/hero/anim/oath-2.png"), u("sprites/hero/anim/oath-3.png"), u("sprites/hero/anim/oath-4.png")],
  "oathHuman": [u("sprites/hero/anim/oathHuman-0.png"), u("sprites/hero/anim/oathHuman-1.png"), u("sprites/hero/anim/oathHuman-2.png"), u("sprites/hero/anim/oathHuman-3.png"), u("sprites/hero/anim/oathHuman-4.png")],
  "bmp": [u("sprites/hero/anim/bmp-0.png"), u("sprites/hero/anim/bmp-1.png"), u("sprites/hero/anim/bmp-2.png"), u("sprites/hero/anim/bmp-3.png")],
  "onetwo": {
    "down": [u("sprites/hero/anim/onetwo/down-0.png"), u("sprites/hero/anim/onetwo/down-1.png"), u("sprites/hero/anim/onetwo/down-2.png"), u("sprites/hero/anim/onetwo/down-3.png"), u("sprites/hero/anim/onetwo/down-4.png"), u("sprites/hero/anim/onetwo/down-5.png")],
    "downright": [u("sprites/hero/anim/onetwo/downright-0.png"), u("sprites/hero/anim/onetwo/downright-1.png"), u("sprites/hero/anim/onetwo/downright-2.png"), u("sprites/hero/anim/onetwo/downright-3.png"), u("sprites/hero/anim/onetwo/downright-4.png"), u("sprites/hero/anim/onetwo/downright-5.png")],
    "right": [u("sprites/hero/anim/onetwo/right-0.png"), u("sprites/hero/anim/onetwo/right-1.png"), u("sprites/hero/anim/onetwo/right-2.png"), u("sprites/hero/anim/onetwo/right-3.png"), u("sprites/hero/anim/onetwo/right-4.png"), u("sprites/hero/anim/onetwo/right-5.png")],
    "upright": [u("sprites/hero/anim/onetwo/upright-0.png"), u("sprites/hero/anim/onetwo/upright-1.png"), u("sprites/hero/anim/onetwo/upright-2.png"), u("sprites/hero/anim/onetwo/upright-3.png"), u("sprites/hero/anim/onetwo/upright-4.png"), u("sprites/hero/anim/onetwo/upright-5.png")],
    "up": [u("sprites/hero/anim/onetwo/up-0.png"), u("sprites/hero/anim/onetwo/up-1.png"), u("sprites/hero/anim/onetwo/up-2.png"), u("sprites/hero/anim/onetwo/up-3.png"), u("sprites/hero/anim/onetwo/up-4.png"), u("sprites/hero/anim/onetwo/up-5.png")],
  },
  "onetwoHuman": {
    "down": [u("sprites/hero/anim/onetwoHuman/down-0.png"), u("sprites/hero/anim/onetwoHuman/down-1.png"), u("sprites/hero/anim/onetwoHuman/down-2.png"), u("sprites/hero/anim/onetwoHuman/down-3.png"), u("sprites/hero/anim/onetwoHuman/down-4.png"), u("sprites/hero/anim/onetwoHuman/down-5.png")],
    "downright": [u("sprites/hero/anim/onetwoHuman/downright-0.png"), u("sprites/hero/anim/onetwoHuman/downright-1.png"), u("sprites/hero/anim/onetwoHuman/downright-2.png"), u("sprites/hero/anim/onetwoHuman/downright-3.png"), u("sprites/hero/anim/onetwoHuman/downright-4.png"), u("sprites/hero/anim/onetwoHuman/downright-5.png")],
    "right": [u("sprites/hero/anim/onetwoHuman/right-0.png"), u("sprites/hero/anim/onetwoHuman/right-1.png"), u("sprites/hero/anim/onetwoHuman/right-2.png"), u("sprites/hero/anim/onetwoHuman/right-3.png"), u("sprites/hero/anim/onetwoHuman/right-4.png"), u("sprites/hero/anim/onetwoHuman/right-5.png")],
    "upright": [u("sprites/hero/anim/onetwoHuman/upright-0.png"), u("sprites/hero/anim/onetwoHuman/upright-1.png"), u("sprites/hero/anim/onetwoHuman/upright-2.png"), u("sprites/hero/anim/onetwoHuman/upright-3.png"), u("sprites/hero/anim/onetwoHuman/upright-4.png"), u("sprites/hero/anim/onetwoHuman/upright-5.png")],
    "up": [u("sprites/hero/anim/onetwoHuman/up-0.png"), u("sprites/hero/anim/onetwoHuman/up-1.png"), u("sprites/hero/anim/onetwoHuman/up-2.png"), u("sprites/hero/anim/onetwoHuman/up-3.png"), u("sprites/hero/anim/onetwoHuman/up-4.png"), u("sprites/hero/anim/onetwoHuman/up-5.png")],
  },
  "onetwoRing": [[21, 19], [31, 18], [26, 18], [19, 19], [18, 20], [21, 19]],
  "fps": {
    "idle": 6,
    "oath": 10,
  },
};

// ---- Level 2 ----
// Manhunter (from the user's reference sprite): five views in parts so the arms can swing for punches and shots;
// the three left-facing views are mirrored at load. The right view also has the side-on stun frames
// (stun_half: dropping; stun_kneel: down on one knee, back arched, head down looking at the ground,
// arms resting on the knee; whole 48x66 sprites with the feet at x=20), mirrored for left with the rest. Pivots, hand tips and eyes per view are in data/manhunter.json.
export const MANHUNTER = { meta: manhunterMeta, parts: {
  down: { head: u("sprites/manhunter/down/head.png"), body: u("sprites/manhunter/down/body.png"), armL: u("sprites/manhunter/down/armL.png"), armR: u("sprites/manhunter/down/armR.png") },
  downright: { head: u("sprites/manhunter/downright/head.png"), body: u("sprites/manhunter/downright/body.png"), armL: u("sprites/manhunter/downright/armL.png"), armR: u("sprites/manhunter/downright/armR.png") },
  right: { stun_half: u("sprites/manhunter/right/stun_half.png"), stun_kneel: u("sprites/manhunter/right/stun_kneel.png"), head: u("sprites/manhunter/right/head.png"), body: u("sprites/manhunter/right/body.png"), armL: u("sprites/manhunter/right/armL.png"), armR: u("sprites/manhunter/right/armR.png") },
  upright: { head: u("sprites/manhunter/upright/head.png"), body: u("sprites/manhunter/upright/body.png"), armL: u("sprites/manhunter/upright/armL.png"), armR: u("sprites/manhunter/upright/armR.png") },
  up: { head: u("sprites/manhunter/up/head.png"), body: u("sprites/manhunter/up/body.png"), armL: u("sprites/manhunter/up/armL.png"), armR: u("sprites/manhunter/up/armR.png") },
} };

// The small sand tornado the Manhunters throw (4 spinning frames), and their red and green laser shots (pointing right)
export const TORNADO = [u("sprites/tornado/0.png"), u("sprites/tornado/1.png"), u("sprites/tornado/2.png"), u("sprites/tornado/3.png")];
export const BOLTS = { red: u("sprites/bolt/red.png"), green: u("sprites/bolt/green.png") };
