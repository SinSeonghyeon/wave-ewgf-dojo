// Leaderboard Worker tests: node --test tests/board.test.cjs (no deps; handler called directly with a fake D1)
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const fakeD1 = require('./fake-d1');
const worker = () => import(pathToFileURL(path.join(__dirname, '../worker/index.js')).href);
const NOW = Date.UTC(2026, 8, 12, 3, 0);           // Sat 2026-09-12 12:00 KST
const req = (p, init) => new Request('https://board.test' + p, init);
const post = (body, now = NOW) => async (w, env) => w.handle(req('/submit', {method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body)}), env, now);
const entry = (over = {}) => ({board: 'wave10', nick: 'alpha', score: 4.2, tie: 12, win: 12, lang: 'ko', detail: {dashes: 42, chain: 12}, ...over});
const ch = code => String.fromCharCode(code);

test('week key is the Monday of the KST week and flips at Sunday 15:00 UTC', async () => {
  const w = await worker();
  assert.equal(w.weekKey(Date.UTC(2026, 8, 13, 14, 59)), '2026-09-07');
  assert.equal(w.weekKey(Date.UTC(2026, 8, 13, 15, 0)), '2026-09-14');
  assert.equal(w.weekKey(Date.UTC(2026, 8, 6, 15, 0)), '2026-09-07');
  assert.equal(w.weekKey(Date.UTC(1970, 0, 1)), '1969-12-29');
  const b = w.weekBounds('2026-09-07');
  assert.equal(b.start, Date.UTC(2026, 8, 6, 15, 0)); assert.equal(b.end - b.start, 7 * 86400e3);
});

test('validate normalises the nickname and rejects out-of-range or malformed entries', async () => {
  const {validate} = await worker();
  assert.equal(validate(entry({nick: '  al   pha  '})).value.nick, 'al pha');
  assert.deepEqual(validate(entry({lang: 'xx', detail: {dashes: 42, chain: 12, extra: 1}})).value, {board: 'wave10', nick: 'alpha', score: 4.2, tie: 12, win: 12, lang: 'ko', detail: {dashes: 42, chain: 12}});
  assert.equal(validate(entry({nick: '한글닉네임열두글자까지만'})).value.nick, '한글닉네임열두글자까지만');
  const bad = {
    board: entry({board: 'free'}), nick: entry({nick: 'a'}), 'nick long': entry({nick: '1234567890123'}), 'nick ctrl': entry({nick: 'a' + ch(0) + 'b'}), 'nick zwsp': entry({nick: 'ab' + ch(0x200b) + 'cd'}),
    score: entry({score: 21}), 'score nan': entry({score: 'a'}), tie: entry({tie: -1}), win: entry({win: 10}), 'detail.chain': entry({detail: {dashes: 1}}),
    'detail.mean': entry({board: 'ewgf20', tie: -3, detail: {hits: 20, target: 20, mean: 501}}), body: null, 'detail.target': entry({board: 'combo10', tie: 5, detail: {hits: 3, target: 20, mean: 0, dps: 5}}),
  };
  for (const [k, v] of Object.entries(bad)) assert.equal(validate(v).error, k.split(' ')[0], k);
  assert.equal(validate(entry({board: 'ewgf20', score: 85, tie: -2.5, detail: {hits: 17, target: 20, mean: -2.5}})).error, undefined);
  assert.equal(validate(entry({board: 'combo10', score: 70, tie: 5.5, detail: {hits: 7, target: 10, mean: 1, dps: 5.5}})).error, undefined);
});

test('submit ranks by score then tie with shared ranks, top list is per board and per week', async () => {
  const w = await worker(); const env = {DB: fakeD1()};
  const r1 = await (await post(entry({nick: 'alpha', score: 4.2, tie: 12}))(w, env)).json();
  assert.equal(r1.ok, true); assert.equal(r1.rank, 1); assert.equal(r1.total, 1); assert.equal(r1.week, '2026-09-07'); assert.equal(r1.id, 1);
  const r2 = await (await post(entry({nick: 'bravo', score: 4.5, tie: 3}))(w, env)).json();
  assert.equal(r2.rank, 1); assert.equal(r2.total, 2);
  const r3 = await (await post(entry({nick: 'charlie', score: 4.2, tie: 20}))(w, env)).json();
  assert.equal(r3.rank, 2, 'same score, better tie beats alpha');
  const r4 = await (await post(entry({nick: 'delta', score: 4.2, tie: 12}))(w, env)).json();
  assert.equal(r4.rank, 3, 'exact tie shares the rank');
  assert.deepEqual(r4.rows.map(r => [r.rank, r.nick]), [[1, 'bravo'], [2, 'charlie'], [3, 'alpha'], [3, 'delta']]);
  assert.deepEqual(r4.rows[0].detail, {dashes: 42, chain: 12}); assert.equal(r4.rows[0].win, 12);
  // other board and other week are isolated
  await post(entry({board: 'ewgf20', nick: 'echo', score: 90, tie: -1, detail: {hits: 18, target: 20, mean: 1}}))(w, env);
  await post(entry({nick: 'lastweek', score: 9}), NOW - 7 * 86400e3)(w, env);
  const top = await (await w.handle(req('/top?board=wave10'), env, NOW)).json();
  assert.equal(top.total, 4); assert.equal(top.rows.length, 4); assert.equal(top.rows[0].nick, 'bravo'); assert.equal(top.start, Date.UTC(2026, 8, 6, 15));
  const ewgf = await (await w.handle(req('/top?board=ewgf20'), env, NOW)).json();
  assert.deepEqual(ewgf.rows.map(r => r.nick), ['echo']);
  const nextWeek = await (await w.handle(req('/top?board=wave10'), env, NOW + 7 * 86400e3)).json();
  assert.equal(nextWeek.total, 0); assert.deepEqual(nextWeek.rows, []);
  assert.equal(env.DB.rows.length, 6);
});

test('top list is capped at 20 while total and rank keep counting', async () => {
  const w = await worker(); const env = {DB: fakeD1()};
  for (let i = 0; i < 25; i++) await post(entry({nick: 'p' + i, score: i / 10, tie: 0}))(w, env);
  const last = await (await post(entry({nick: 'slow', score: 0, tie: 0}))(w, env)).json();
  assert.equal(last.total, 26); assert.equal(last.rank, 25, 'ties with p0'); assert.equal(last.rows.length, 20); assert.equal(last.rows[0].nick, 'p24');
});

test('http surface: CORS preflight, health, 400/404/413 and 500 without leaking a stack', async () => {
  const w = await worker(); const env = {DB: fakeD1()};
  const pre = await w.handle(req('/submit', {method: 'OPTIONS'}), env, NOW);
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-origin'), '*'); assert.match(pre.headers.get('access-control-allow-headers'), /content-type/);
  const health = await w.handle(req('/'), env, NOW); assert.equal(health.status, 200); assert.equal((await health.json()).week, '2026-09-07');
  assert.equal((await w.handle(req('/top'), env, NOW)).status, 400);
  assert.equal((await w.handle(req('/top?board=free'), env, NOW)).status, 400);
  for (const b of ['constructor', '__proto__', 'toString']) {
    assert.equal((await w.handle(req('/top?board=' + b), env, NOW)).status, 400, 'inherited key ' + b);
    const r = await post(entry({board: b}))(w, env); assert.equal(r.status, 400); assert.deepEqual(await r.json(), {error: 'board'});
  }
  assert.equal((await w.handle(req('/nope'), env, NOW)).status, 404);
  assert.equal((await w.handle(req('/top', {method: 'POST'}), env, NOW)).status, 404);
  const badJson = await post('{oops')(w, env); assert.equal(badJson.status, 400); assert.deepEqual(await badJson.json(), {error: 'json'});
  const badNick = await post(entry({nick: 'x'}))(w, env); assert.equal(badNick.status, 400); assert.deepEqual(await badNick.json(), {error: 'nick'});
  assert.equal((await post('x'.repeat(2001))(w, env)).status, 413);
  assert.equal(env.DB.rows.length, 0, 'rejected submissions are never stored');
  for (const res of [pre, health, badJson]) assert.equal(res.headers.get('access-control-allow-origin'), '*');
  const boom = await w.default.fetch(req('/top?board=wave10'), {DB: {prepare() { throw new Error('db down'); }}});
  assert.equal(boom.status, 500); const j = await boom.json(); assert.equal(j.error, 'server'); assert.equal(j.message, 'db down'); assert.equal(j.stack, undefined);
});
