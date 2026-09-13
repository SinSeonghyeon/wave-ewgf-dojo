-- 2026-09-14: weekly boards → one cumulative board that never resets (AGENTS.md design decision 19).
-- Folds every nick's weekly rows into its single best per board (same order as the Worker's BY_RANK: score, then tie, then the
-- older row) and moves them under the season key 'all' that the Worker now reads and writes. Idempotent: a second run changes nothing.
-- Run once after `npx wrangler deploy` of the new Worker (rows the old Worker writes in between are folded too if you run it again):
--   npx wrangler d1 execute mishima-dojo-board --remote --file=migrate-2026-09-14-alltime.sql
-- If --file is refused with 401 (code 10000, seen 2026-09-13), run the two statements below one at a time with --command "...".
DELETE FROM scores WHERE EXISTS (
  SELECT 1 FROM scores b
  WHERE b.board = scores.board AND b.nick = scores.nick AND b.id <> scores.id
    AND (b.score > scores.score OR (b.score = scores.score AND (b.tie > scores.tie OR (b.tie = scores.tie AND b.id < scores.id))))
);
UPDATE scores SET week = 'all' WHERE week <> 'all';
