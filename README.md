# Lantern's Oath

A top-down pixel-art brawler on the web. You fly a Green Lantern through waves of space rats with your ring's constructs (fist, boulder, beam, lasso and forcefield), climb to the top of the level, and fight the mini-boss **Otto Zundapt**. Beat him and the fight moves to a desert for **Level 2**, against two Manhunters, **Zephelone** and **Asmodius**. Your attacks hit 35% harder there, and you can counter their rush: land three hits while one charges in (the pips over his head) and he drops to one knee, stunned for 3 seconds. Hold the ring beam on one of their tornadoes for 5 seconds and it turns green and flies back along the beam into them. When the meter fills: *Beware My Power*.

- **Hosting:** Vercel (static Vite site + serverless API routes in `/api`)
- **Login:** Firebase Authentication (email/password + Google), with guest play always available
- **Database:** Turso (libSQL) stores each signed-in player's highest level, best score and run history

---

## How the site flows

Everything is one page (`index.html`) with hash routes:

| Route | What's there |
|---|---|
| `#home` | Title screen: Mogo (click him), **PLAY NOW**, and a menu with Options (Start Level 1, Test Boss Fight, Test Level 2, Reset Settings), Controls, and Settings (background: stars / screen shake / Mogo; sound: music and SFX on/off with volume bars). The chiptune theme plays here. |
| `#controls` | Every key, with pixel-art key icons, and how a run works. |
| `#login` | Sign in or create an account (email or Google), or play as a guest with a pilot name. Without Firebase keys it's guest-only. |
| `#play` | The game canvas, plus your highest level and best score. |

Signed out, `#play` sends you to `#login`. Signed in (account or guest), `#login` goes straight to `#play`. `/login`, `/play` and `/controls` redirect to the matching hash on Vercel.

## Controls

| Key | Action |
|---|---|
| W A S D / arrows | Fly. Your Lantern faces the mouse, so attacks go wherever you aim. |
| Shift (held) | Fly faster (sips ring charge) |
| Space (held) | Forcefield: blocks hits and bats Otto's saws back at him, cracks as it takes damage |
| C | Punch (a free one-two) |
| 1 | Construct fist: a half-circle sweep |
| 2 | Construct boulder: smashes through everything (2 s cooldown) |
| 3 (held) | Ring beam |
| 4 | Construct rope: lassos up to four rats and reels them in; with no rats in reach, ties up one boss where he stands for 2 s (up to 3 s while 4 is held). No damage (3 s cooldown) |
| V | Beware My Power: needs a full meter and a full ring |
| G (tap / hold) | Tap: recite the Oath and fully recharge over ~6 s. Hold: quick top-up. |
| P / Esc | Pause menu (Options, Controls, Settings) |

On touch screens, drag on the left to fly and use the buttons on the right.

The ring never refills by itself. If it runs dry while your health is at half or lower, the Lantern drops back to plain Hal (no suit, no flight boost) until you recharge.

---

## Project layout

```
index.html                 the whole site's markup (home, controls, login, play)
src/
  main.js                  entry: styles, starfield, app, Mogo, home menu
  app.js                   routing, sign-in forms, saving progress at the end of a run
  firebase.js              Firebase Auth wrapper + guest mode
  api.js                   calls /api/progress, falls back to browser storage
  styles.css
  site/
    starfield.js           drifting pixel stars behind every page
    audio.js               all sound: synthesized SFX, held loops (beam, laser, boulder), the home theme
    mogo.js                click Mogo: the construct speech bubble and typed-out line
    home-menu.js           Options / Settings menu under PLAY NOW
  game/
    config.js              tuning: every gameplay number (speeds, damage, costs, cooldowns, boss stats)
    art.js                 loads and bakes the sprites (shading, mirroring, Otto cut into animatable parts)
    assets.js              paths to every sprite image
    data/pixel-sprites.json  pixel-map sprites (rats, fist) and their palette
    game.js                createGame(canvas, opts): game loop, player, rats, Otto, the Manhunters, constructs, HUD, pause menu, input
    desert.js              the Level 2 backdrop: a pixel desert under a teal sky, drawn once
    data/manhunter.json    Manhunter arm pivots, hand tips and eyes for each view
public/
  img/                     site art (logo, wordmark, Mogo, key icons, lantern knob)
  sprites/                 game sprites (hero poses and animations, Otto from every direction)
  sfx/                     the two recorded sounds (Mogo's message, fast flight)
api/
  progress.js · leaderboard.js        Vercel serverless functions
  _lib/db.js · _lib/auth.js           Turso access + Firebase token verification
```

**Tuning:** everything lives in `src/game/config.js`: `L2` for the Manhunters (health, speeds, damage, timings), `T` for the player, constructs, rats and Otto; `FLOW` and `BOSS_STOP` for how the climb and rat spawning ramp up.

**Settings** are saved in the browser under `lo-settings` and shared by the home menu, the pause menu and the sound engine (a `lo-settings` window event tells them to re-read).

---

## Setup

### 1. Firebase (login)
1. Create a project at <https://console.firebase.google.com>.
2. **Build → Authentication → Get started**, then enable **Email/Password** and **Google**.
3. **Project settings → Your apps → Add app → Web**. Copy `apiKey`, `authDomain`, `projectId` and `appId`.
4. After deploying, go to **Authentication → Settings → Authorized domains** and add your Vercel domain. Without this, Google sign-in fails on the live site.

### 2. Turso (database)
```bash
turso auth login
turso db create lanterns-oath
turso db show lanterns-oath --url        # → TURSO_DATABASE_URL
turso db tokens create lanterns-oath     # → TURSO_AUTH_TOKEN
```
Tables are created automatically on the first API request (`schema.sql` is there if you'd rather create them by hand).

### 3. Environment variables
Copy `.env.example` to `.env.local` for local development, and add the same keys in **Vercel → Project → Settings → Environment Variables**:

| Variable | Used by |
|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Browser (login) |
| `FIREBASE_PROJECT_ID` | Server: verifies sign-in tokens |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Server: database |

### 4. Run locally
```bash
npm install
npm run dev        # site only (http://localhost:5173); progress falls back to browser storage
npx vercel dev     # site + /api routes together (run `npx vercel link` once first)
```

### 5. Deploy to Vercel
Push to GitHub, then **Vercel → Add New → Project** and import the repo. Vercel detects Vite (`vercel.json` sets the output to `dist`). Add the environment variables and deploy, or run `npx vercel --prod`.

---

## API

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/progress` | Bearer Firebase ID token | `{ displayName, highestLevel, bestScore, completed }`; creates the player on first visit |
| `POST /api/progress` | Bearer Firebase ID token | Body `{ level, score, cleared }`: records a run and unlocks the next level |
| `GET /api/leaderboard` | none | Top 10 by best score (display names only) |

A run is reported when the Lantern goes down or Otto is defeated. Test Boss Fight runs are never saved.

## Credits
Recorded sounds: "Windows error" by freesound_community and "fast whoosh" by studiokolomna, both on Pixabay (Pixabay Content License). Everything else is synthesized live with Web Audio.
