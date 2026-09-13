// In-memory stand-in for the D1 binding used by worker/index.js: a real SQLite (node:sqlite, Node 22.13+) loaded with
// worker/schema.sql, wrapped in D1's prepare().bind().run()/all()/first() shape. Shared by tests/board.test.cjs and tests/smoke-chrome.js.
const {DatabaseSync} = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const plain = rows => rows.map(r => ({...r})); // node:sqlite rows have a null prototype; give tests ordinary objects
const SCHEMA = fs.readFileSync(path.join(__dirname, '../worker/schema.sql'), 'utf8');

module.exports = function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA);
  return {
    db,
    get rows() { return plain(db.prepare('SELECT * FROM scores ORDER BY id').all()); },
    get posts() { return plain(db.prepare('SELECT * FROM posts ORDER BY id').all()); },
    get bans() { return plain(db.prepare('SELECT * FROM bans ORDER BY created_at').all()); },
    get votes() { return plain(db.prepare('SELECT * FROM votes ORDER BY post_id, key').all()); },
    get visits() { return plain(db.prepare('SELECT * FROM visits ORDER BY day').all()); },
    prepare(sql) {
      let args = [];
      const st = {
        bind(...a) { args = a; return st; },
        async run() { const r = db.prepare(sql).run(...args); return {success: true, meta: {last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes)}}; },
        async all() { return {results: db.prepare(sql).all(...args)}; },
        async first(col) { const r = db.prepare(sql).get(...args); return r == null ? null : col ? (r[col] ?? null) : r; },
      };
      return st;
    },
  };
};
