// Turso (libSQL) connection + schema + data access.
import { createClient } from '@libsql/client';

let client;
let schemaReady;

export function db() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error('TURSO_DATABASE_URL is not set');
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return client;
}

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS players (
     uid           TEXT PRIMARY KEY,
     display_name  TEXT,
     email         TEXT,
     highest_level INTEGER NOT NULL DEFAULT 1,
     best_score    INTEGER NOT NULL DEFAULT 0,
     completed     INTEGER NOT NULL DEFAULT 0,
     created_at    TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS runs (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     uid        TEXT NOT NULL REFERENCES players(uid),
     level      INTEGER NOT NULL,
     score      INTEGER NOT NULL,
     cleared    INTEGER NOT NULL,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE INDEX IF NOT EXISTS idx_players_best ON players(best_score DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_runs_uid ON runs(uid)`,
];

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = db().batch(SCHEMA, 'write').catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

const MAX_LEVEL = 3;
const MAX_SCORE = 5_000_000;

function toProgress(row) {
  return {
    displayName: row.display_name,
    highestLevel: Number(row.highest_level),
    bestScore: Number(row.best_score),
    completed: Boolean(Number(row.completed)),
  };
}

// Creates the player row on first visit; keeps name/email in sync with Firebase.
export async function getOrCreatePlayer(user) {
  await ensureSchema();
  // Never derive the public name from the email address (the leaderboard is public).
  const name = (user.name || `Warden-${user.uid.slice(0, 5)}`).slice(0, 24);
  await db().execute({
    sql: `INSERT INTO players (uid, display_name, email) VALUES (?, ?, ?)
          ON CONFLICT(uid) DO UPDATE SET
            display_name = COALESCE(excluded.display_name, players.display_name),
            email = excluded.email`,
    args: [user.uid, name, user.email || null],
  });
  const { rows } = await db().execute({ sql: 'SELECT * FROM players WHERE uid = ?', args: [user.uid] });
  return toProgress(rows[0]);
}

export class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function validateRun(body) {
  const level = Number(body?.level);
  const score = Number(body?.score);
  const cleared = body?.cleared === true;
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) throw new ValidationError('Invalid level');
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) throw new ValidationError('Invalid score');
  return { level, score, cleared };
}

// Records a finished level attempt and updates the player's progress.
export async function recordRun(user, run) {
  const current = await getOrCreatePlayer(user);
  if (run.level > current.highestLevel) throw new ValidationError('That level is still locked', 403);

  let highest = current.highestLevel;
  let completed = current.completed;
  if (run.cleared && run.level === highest && highest < MAX_LEVEL) highest += 1;
  if (run.cleared && run.level === MAX_LEVEL) completed = true;

  await db().batch(
    [
      {
        sql: 'INSERT INTO runs (uid, level, score, cleared) VALUES (?, ?, ?, ?)',
        args: [user.uid, run.level, run.score, run.cleared ? 1 : 0],
      },
      {
        sql: `UPDATE players SET highest_level = ?, best_score = MAX(best_score, ?), completed = ?,
              updated_at = datetime('now') WHERE uid = ?`,
        args: [highest, run.score, completed ? 1 : 0, user.uid],
      },
    ],
    'write'
  );
  const { rows } = await db().execute({ sql: 'SELECT * FROM players WHERE uid = ?', args: [user.uid] });
  return toProgress(rows[0]);
}

export async function topPlayers(limit = 10) {
  await ensureSchema();
  const { rows } = await db().execute({
    sql: `SELECT display_name, best_score, highest_level, completed FROM players
          WHERE best_score > 0 ORDER BY best_score DESC, updated_at ASC LIMIT ?`,
    args: [limit],
  });
  return rows.map((r) => ({
    name: r.display_name || 'Unknown Warden',
    bestScore: Number(r.best_score),
    highestLevel: Number(r.highest_level),
    completed: Boolean(Number(r.completed)),
  }));
}
