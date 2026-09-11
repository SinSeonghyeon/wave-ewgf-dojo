-- Mishima Dojo weekly leaderboard (Cloudflare D1 / SQLite).
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
