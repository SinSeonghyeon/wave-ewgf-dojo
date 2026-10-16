-- 2026-10-16 한마디 본인 수정·삭제 (AGENTS.md 결정 40(post-edit)): edited_at / deleted columns on posts and replies.
-- Run ONCE on the existing database, BEFORE deploying the Worker that reads them (worker/README.md "배포 순서"):
--   npx wrangler d1 execute mishima-dojo-board --remote --file=migrate-2026-10-16-post-edit.sql
-- SQLite has no ADD COLUMN IF NOT EXISTS: a second run fails with "duplicate column name" and changes nothing (safe to ignore).
-- A fresh database gets the columns from schema.sql and must not run this file.
ALTER TABLE posts ADD COLUMN edited_at INTEGER;
ALTER TABLE posts ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE replies ADD COLUMN edited_at INTEGER;
