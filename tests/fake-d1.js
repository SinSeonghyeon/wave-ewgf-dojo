// Minimal in-memory stand-in for the D1 binding used by worker/index.js (only the four statements it issues).
// Shared by tests/board.test.cjs (handler unit tests) and tests/smoke-chrome.js (real browser against a local http wrapper).
module.exports = function fakeD1(rows = []) {
  let nextId = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  const scope = (week, board) => rows.filter(x => x.week === week && x.board === board);
  return {
    rows,
    prepare(sql) {
      let args = [];
      const st = {
        bind(...a) { args = a; return st; },
        async run() {
          if (!/^INSERT INTO scores/.test(sql)) throw new Error('fakeD1 run: ' + sql);
          const [week, board, nick, score, tie, detail, win, lang, created_at] = args;
          rows.push({id: nextId, week, board, nick, score, tie, detail, win, lang, created_at});
          return {success: true, meta: {last_row_id: nextId++}};
        },
        async all() {
          const m = sql.match(/ORDER BY score DESC, tie DESC, id ASC LIMIT (\d+)/);
          if (!m) throw new Error('fakeD1 all: ' + sql);
          const results = scope(args[0], args[1]).sort((a, b) => b.score - a.score || b.tie - a.tie || a.id - b.id).slice(0, +m[1])
            .map(({id, nick, score, tie, detail, win, created_at}) => ({id, nick, score, tie, detail, win, created_at}));
          return {results};
        },
        async first(col) {
          if (!/COUNT\(\*\) AS n/.test(sql)) throw new Error('fakeD1 first: ' + sql);
          const [week, board, s1, s2, t] = args;
          const n = scope(week, board).filter(x => args.length < 3 || x.score > s1 || (x.score === s2 && x.tie > t)).length;
          return col ? n : {n};
        },
      };
      return st;
    },
  };
};
