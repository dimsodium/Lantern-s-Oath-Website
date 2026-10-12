-- Lantern's Oath — Turso schema.
-- The API creates these automatically on first request; run this manually only if you prefer:
--   turso db shell <your-db> < schema.sql
CREATE TABLE IF NOT EXISTS players (
  uid           TEXT PRIMARY KEY,          -- Firebase user id
  display_name  TEXT,
  email         TEXT,
  highest_level INTEGER NOT NULL DEFAULT 1, -- highest unlocked level (1-3)
  best_score    INTEGER NOT NULL DEFAULT 0,
  completed     INTEGER NOT NULL DEFAULT 0, -- 1 once the Hollow King is defeated
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS runs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  uid        TEXT NOT NULL REFERENCES players(uid),
  level      INTEGER NOT NULL,
  score      INTEGER NOT NULL,
  cleared    INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_players_best ON players(best_score DESC);
CREATE INDEX IF NOT EXISTS idx_runs_uid ON runs(uid);
