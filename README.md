# Lantern's Oath

A vertical-scrolling space shooter on the web. You play the last Warden of the Emerald Lantern, who carries a green ring powered by willpower through three levels. Each level ends in a boss.

- **Hosting:** Vercel (static site + serverless API routes in `/api`)
- **Login:** Firebase Authentication (email/password + Google)
- **Database:** Turso (libSQL) stores each player's unlocked level, best score and run history

---

## How the site flows

1. **Home** (`index.html`): game description, full controls, the three levels, the leaderboard, and a centered **Play Now** button.
2. **Login** (`login.html`): sign in or create an account (email/password or Google). Players who are already signed in go straight to the game.
3. **Game** (`game.html`): a level briefing, then play. The **pause icon in the top-right corner** pauses the game at any moment. Pressing it again resumes. (`P` / `Esc` also work, and the game auto-pauses if you switch tabs.)

Clearing a level saves progress to Turso and unlocks the next level. Players can replay any level they've unlocked.

## The game

| Level | Setting | Enemies (easy → hard) | Boss |
|---|---|---|---|
| 1 | The Drift | Drones → Skimmers → Gunships | **RUSTMAW**, Tyrant of the Drift |
| 2 | The Ember Nebula | Homing Wisps → Lancers (telegraphed dives) → Proximity Mines | **VEXA**, the Ember Matriarch |
| 3 | The Hollow | Crystal Splitters → phasing Shades → spiral Sentinels | **THE HOLLOW KING**, Devourer of Light |

Each level ramps up in four phases as you fly further: more enemies, faster fire and tougher units. Then a WARNING appears and the boss arrives. Every boss changes attack patterns when its health gets low (the Hollow King has three phases).

**Controls:** WASD / arrows move anywhere on screen · Space/J fire · Shift/K shield (drains ring charge) · E/L Oath Burst (clears all enemy fire when the Oath meter is full) · F auto-fire · M mute · P/Esc pause. On touch screens, drag to fly (firing is automatic) and use the on-screen Shield/Burst buttons.

The play area resizes to fill the browser window. The hero, enemies and bosses are drawn in code in `src/game/sprites.js`, so no image files are needed.

---

## Setup

### 1. Firebase (login)
1. Create a project at <https://console.firebase.google.com>.
2. **Build → Authentication → Get started** → enable **Email/Password** and **Google**.
3. **Project settings → Your apps → Add app → Web**. Copy `apiKey`, `authDomain`, `projectId`, `appId`.
4. After deploying, go to **Authentication → Settings → Authorized domains** and add your Vercel domain (e.g. `lanterns-oath.vercel.app`). Without this, Google sign-in fails on the live site.

### 2. Turso (database)
```bash
# install the CLI: https://docs.turso.tech/cli/installation
turso auth login
turso db create lanterns-oath
turso db show lanterns-oath --url        # → TURSO_DATABASE_URL
turso db tokens create lanterns-oath     # → TURSO_AUTH_TOKEN
```
The tables are created automatically on the first API request. `schema.sql` is included if you want to create them by hand (`turso db shell lanterns-oath < schema.sql`).

### 3. Environment variables
Copy `.env.example` to `.env.local` for local development. Add the same keys in **Vercel → Project → Settings → Environment Variables**:

| Variable | Where it's used |
|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Browser (login) |
| `FIREBASE_PROJECT_ID` | Server: verifies sign-in tokens |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Server: database |

No Firebase service-account key is needed. The API verifies sign-in tokens with Google's public keys.

### 4. Run locally
```bash
npm install
npm run dev        # site only (http://localhost:5173). Progress falls back to browser storage
npx vercel dev     # site + /api routes together (needs `npx vercel link` once)
```
If the `VITE_FIREBASE_*` variables are missing, the login page shows a **Play as guest** option so you can test the game without setting up Firebase.

### 5. Deploy to Vercel
Push this folder to a GitHub repo, then **Vercel → Add New → Project → import the repo**. Vercel detects Vite automatically (`vercel.json` sets the build to `dist`). Add the environment variables and deploy. Or run `npx vercel --prod` from this folder.

---

## API

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/progress` | Bearer Firebase ID token | Returns `{ displayName, highestLevel, bestScore, completed }` and creates the player on first visit |
| `POST /api/progress` | Bearer Firebase ID token | Body `{ level, score, cleared }`. Records a run and unlocks the next level. Rejects locked levels (403) and invalid scores (400) |
| `GET /api/leaderboard` | none | Top 10 by best score (display names only, never emails) |

## Project layout
```
index.html · login.html · game.html   the three pages
src/
  home.js · login.js · game-page.js   page logic (pause button, overlays, saving)
  firebase.js                         Firebase Auth wrapper
  api.js                              calls /api, falls back to browser storage
  styles.css · bg.js                  styling + animated starfield background
  game/
    engine.js     game loop, player, collisions, scoring
    levels.js     the three levels: lengths, difficulty phases, themes
    enemies.js    enemy behaviours + spawn formations
    bosses.js     boss attack patterns
    sprites.js    all character/enemy art (drawn in code)
    hud.js · starfield.js · input.js · audio.js · util.js
api/
  progress.js · leaderboard.js        Vercel serverless functions
  _lib/db.js · _lib/auth.js           Turso access + Firebase token verification
```

**Tuning:** level length and difficulty are in `src/game/levels.js`, boss health is in `src/game/bosses.js`, and player speed, fire rate and damage are in `src/game/engine.js`.
