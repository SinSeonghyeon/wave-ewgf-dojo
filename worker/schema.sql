-- Mishima Dojo backend (Cloudflare D1 / SQLite). Idempotent: safe to re-run.
-- Apply: npx wrangler d1 execute mishima-dojo-board --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  week       TEXT    NOT NULL,             -- Monday of the KST week, 'YYYY-MM-DD'
  board      TEXT    NOT NULL,             -- wave10 | ewgf20 | combo10
  nick       TEXT    NOT NULL,             -- 2..12 code points
  score      REAL    NOT NULL,             -- primary metric (wave10: dash/s, others: success %)
  tie        REAL    NOT NULL DEFAULT 0,   -- secondary metric, higher wins (wave10: best chain, ewgf20: -|mean offset|, combo10: mean dash/s)
  detail     TEXT    NOT NULL DEFAULT '{}',-- JSON: wave10 {dashes,chain} · ewgf20 {hits,target,mean} · combo10 {hits,target,mean,dps}
  win        INTEGER NOT NULL,             -- EWGF window in ms: 8 / 12 / 15
  lang       TEXT    NOT NULL DEFAULT 'ko',
  created_at INTEGER NOT NULL              -- epoch ms
);
CREATE INDEX IF NOT EXISTS scores_rank ON scores(week, board, score DESC, tie DESC, id ASC);
-- One row per nick per board per week (2026-09-12 decision): /submit upserts and keeps the better result.
CREATE UNIQUE INDEX IF NOT EXISTS scores_nick ON scores(week, board, nick);

-- Claimed nicknames: key = NFKC-lowercased nick (unique), token = secret the claiming browser keeps (localStorage).
CREATE TABLE IF NOT EXISTS nicks (
  key        TEXT PRIMARY KEY,
  nick       TEXT    NOT NULL,             -- display spelling as claimed
  token      TEXT    NOT NULL,             -- 48 hex chars; scores/posts must present it
  created_at INTEGER NOT NULL
);

-- Visit counter: one row per KST day, n = visits counted that day (the app counts each browser once per day).
CREATE TABLE IF NOT EXISTS visits (
  day TEXT PRIMARY KEY,                    -- 'YYYY-MM-DD' (KST)
  n   INTEGER NOT NULL DEFAULT 0
);

-- Message board: nickname + one line of text, newest first, no threads.
CREATE TABLE IF NOT EXISTS posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nick       TEXT    NOT NULL,             -- 2..12 code points
  text       TEXT    NOT NULL,             -- 1..200 code points, whitespace collapsed
  created_at INTEGER NOT NULL              -- epoch ms
);
