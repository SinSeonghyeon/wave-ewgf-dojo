// Backend Worker tests: node --test tests/board.test.cjs (no deps; handler called directly with tests/fake-d1.js = real SQLite + worker/schema.sql)
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const fakeD1 = require('./fake-d1');
const worker = () => import(pathToFileURL(path.join(__dirname, '../worker/index.js')).href);
const NOW = Date.UTC(2026, 8, 12, 3, 0);           // Sat 2026-09-12 12:00 KST
const ORIGIN = 'https://sinseonghyeon.github.io';  // the site's origin (worker default allow-list); every test request carries it unless overridden
const req = (p, init = {}) => new Request('https://board.test' + p, {...init, headers: {origin: ORIGIN, ...(init.headers || {})}});
const post = (p, body, now = NOW, headers = {}) => async (w, env) => w.handle(req(p, {method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body)}), env, now);
const submit = (body, now) => post('/submit', body, now);
const entry = (over = {}) => ({board: 'wave10', nick: 'alpha', score: 4.2, tie: 12, win: 12, lang: 'ko', detail: {dashes: 42, chain: 12}, ...over});
// Claim a nickname and return its token; `owned(env)` gives a submit/post helper that attaches the right token for each nick.
const claim = async (w, env, nick, now = NOW) => { const r = await post('/nick', {nick}, now)(w, env); const j = await r.json(); return {status: r.status, ...j}; };
const owned = (w, env) => { const tokens = {}; return {
  async submit(over = {}, now = NOW) { const e = entry(over); tokens[e.nick] ??= (await claim(w, env, e.nick, now)).token; return submit({...e, token: tokens[e.nick]}, now)(w, env); },
  async post(body, now = NOW, headers = {}) { tokens[body.nick] ??= (await claim(w, env, body.nick, now)).token; return post('/posts', {...body, token: tokens[body.nick]}, now, headers)(w, env); },
  tokens}; };
const ch = code => String.fromCharCode(code);

test('week and day keys follow KST: week flips Sunday 15:00 UTC, day flips 15:00 UTC', async () => {
  const w = await worker();
  assert.equal(w.weekKey(Date.UTC(2026, 8, 13, 14, 59)), '2026-09-07');
  assert.equal(w.weekKey(Date.UTC(2026, 8, 13, 15, 0)), '2026-09-14');
  assert.equal(w.weekKey(Date.UTC(2026, 8, 6, 15, 0)), '2026-09-07');
  assert.equal(w.weekKey(Date.UTC(1970, 0, 1)), '1969-12-29');
  const b = w.weekBounds('2026-09-07');
  assert.equal(b.start, Date.UTC(2026, 8, 6, 15, 0)); assert.equal(b.end - b.start, 7 * 86400e3);
  assert.equal(w.dayKey(Date.UTC(2026, 8, 12, 14, 59)), '2026-09-12'); assert.equal(w.dayKey(Date.UTC(2026, 8, 12, 15, 0)), '2026-09-13');
});

test('validate normalises the nickname and rejects out-of-range or malformed entries', async () => {
  const {validate, cleanText} = await worker();
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
  assert.equal(validate(entry({board: 'rush30', score: 87, tie: 9, detail: {kills: 9, whiffs: 4, dashPts: 42}})).error, undefined);
  assert.equal(validate(entry({board: 'rush30', score: 87, tie: 9, detail: {kills: 9, whiffs: 4}})).error, 'detail.dashPts');
  assert.equal(validate(entry({board: 'rush30', score: 2001, tie: 9, detail: {kills: 9, whiffs: 4, dashPts: 42}})).error, 'score');
  assert.equal(cleanText('  a \n b  ', 200), 'a b'); assert.equal(cleanText('', 200), undefined); assert.equal(cleanText('x'.repeat(201), 200), undefined);
  assert.equal(cleanText('한'.repeat(200), 200).length, 200, 'limit counts code points'); assert.equal(cleanText(5, 200), undefined);
});

test('nick: claim once, case/width-insensitive uniqueness, token proves ownership on submit and posts', async () => {
  const w = await worker(); const env = {DB: fakeD1()};
  assert.equal(w.nickKey(' Kazu YA '), ' kazu ya '); assert.equal(w.nickKey('ＡＢＣ'), 'abc', 'NFKC folds full-width');
  const a = await claim(w, env, '  Al   pha ');
  assert.equal(a.status, 200); assert.equal(a.ok, true); assert.equal(a.nick, 'Al pha'); assert.match(a.token, /^[0-9a-f]{48}$/);
  for (const dup of ['al pha', 'AL PHA', 'Al  pha', 'ａｌ ｐｈａ']) { const r = await claim(w, env, dup); assert.equal(r.status, 409, dup); assert.equal(r.error, 'taken'); }
  assert.notEqual((await claim(w, env, 'alpha')).status, 409, 'different spelling without the space is a different nickname');
  for (const [k, body] of Object.entries({nick: {nick: 'a'}, 'nick zw': {nick: 'ab' + ch(0x200b)}, 'nick filler': {nick: ch(0x3164) + ch(0x3164)}, 'nick wj': {nick: 'ab' + ch(0x2060)}, 'nick vs': {nick: 'ab' + ch(0xfe0f)}, 'nick pua': {nick: 'ab' + ch(0xe000)}, body: null})) { const r = await post('/nick', body)(w, env); assert.equal(r.status, 400, k); assert.equal((await r.json()).error, k.split(' ')[0]); }
  assert.equal((await claim(w, env, '三島 道場')).status, 200); assert.equal((await claim(w, env, '🔥🔥')).status, 200, 'CJK and emoji nicknames stay allowed');
  assert.equal(w.cleanText(ch(0x2060), 200), undefined, 'a blank-looking post is refused too');
  // submit: missing/wrong token → 403, right token → stored under the registered spelling
  assert.equal((await submit(entry({nick: 'al pha'}))(w, env)).status, 403);
  const bad = await submit(entry({nick: 'al pha', token: 'nope'}))(w, env); assert.equal(bad.status, 403); assert.deepEqual(await bad.json(), {error: 'auth'});
  assert.equal((await submit(entry({nick: 'unknown', token: a.token}))(w, env)).status, 403, 'unregistered nickname');
  const ok = await (await submit(entry({nick: 'AL PHA', token: a.token}))(w, env)).json(); assert.equal(ok.ok, true); assert.equal(ok.me.nick, 'Al pha');
  assert.equal(env.DB.rows.length, 1); assert.equal(env.DB.rows[0].nick, 'Al pha');
  // posts: same rule; the rate limit is consulted only after the token passes
  assert.equal((await post('/posts', {nick: 'al pha', text: 'hi'})(w, env)).status, 403);
  const keys = []; const limited = {DB: env.DB, POST_LIMIT: {async limit({key}) { keys.push(key); return {success: true}; }}};
  assert.equal((await post('/posts', {nick: 'al pha', token: 'nope', text: 'hi'}, NOW, {'cf-connecting-ip': '203.0.113.7'})(w, limited)).status, 403); assert.deepEqual(keys, []);
  const p = await (await post('/posts', {nick: 'al pha', token: a.token, text: 'hi'})(w, env)).json(); assert.equal(p.rows[0].nick, 'Al pha');
  // nick claims can be rate-limited too
  const nickLimited = {DB: env.DB, NICK_LIMIT: {async limit() { return {success: false}; }}};
  const r = await post('/nick', {nick: 'bravo'})(w, nickLimited); assert.equal(r.status, 429); assert.deepEqual(await r.json(), {error: 'rate'});
});

test('submit keeps one row per nick per week: better results replace, worse ones are ignored, ranks share on exact ties', async () => {
  const w = await worker(); const env = {DB: fakeD1()}; const me = owned(w, env);
  const r1 = await (await me.submit({nick: 'alpha', score: 4.2, tie: 12})).json();
  assert.equal(r1.ok, true); assert.equal(r1.rank, 1); assert.equal(r1.total, 1); assert.equal(r1.week, '2026-09-07'); assert.equal(r1.id, 1); assert.equal(r1.improved, true);
  assert.equal(r1.me.id, 1); assert.equal(r1.me.rank, 1); assert.deepEqual(r1.me.detail, {dashes: 42, chain: 12});
  const r2 = await (await me.submit({nick: 'bravo', score: 4.5, tie: 3})).json();
  assert.equal(r2.rank, 1); assert.equal(r2.total, 2);
  const r3 = await (await me.submit({nick: 'charlie', score: 4.2, tie: 20})).json();
  assert.equal(r3.rank, 2, 'same score, better tie beats alpha');
  const r4 = await (await me.submit({nick: 'delta', score: 4.2, tie: 12})).json();
  assert.equal(r4.rank, 3, 'exact tie shares the rank');
  assert.deepEqual(r4.rows.map(r => [r.rank, r.nick]), [[1, 'bravo'], [2, 'charlie'], [3, 'alpha'], [3, 'delta']]);
  // alpha again: worse → stored row untouched, improved=false, rank of the stored row; better → replaced in place (same id)
  const worse = await (await me.submit({nick: 'alpha', score: 3, tie: 30}, NOW + 1000)).json();
  assert.equal(worse.improved, false); assert.equal(worse.id, 1); assert.equal(worse.rank, 3); assert.equal(worse.total, 4); assert.equal(worse.me.score, 4.2);
  const better = await (await me.submit({nick: 'alpha', score: 4.2, tie: 25, detail: {dashes: 42, chain: 25}}, NOW + 2000)).json();
  assert.equal(better.improved, true); assert.equal(better.id, 1); assert.equal(better.rank, 2); assert.equal(better.total, 4);
  assert.deepEqual(better.rows.map(r => [r.rank, r.nick, r.tie]), [[1, 'bravo', 3], [2, 'alpha', 25], [3, 'charlie', 20], [4, 'delta', 12]]);
  assert.equal(better.me.created_at, NOW + 2000);
  // other board and other week are isolated; the same nick may hold a row in each
  await me.submit({board: 'ewgf20', nick: 'alpha', score: 90, tie: -1, detail: {hits: 18, target: 20, mean: 1}});
  await me.submit({nick: 'alpha', score: 9}, NOW - 7 * 86400e3);
  const top = await (await w.handle(req('/top?board=wave10'), env, NOW)).json();
  assert.equal(top.total, 4); assert.equal(top.rows.length, 4); assert.equal(top.rows[0].nick, 'bravo'); assert.equal(top.start, Date.UTC(2026, 8, 6, 15)); assert.equal(top.me, null);
  const ewgf = await (await w.handle(req('/top?board=ewgf20&nick=alpha'), env, NOW)).json();
  assert.deepEqual(ewgf.rows.map(r => r.nick), ['alpha']); assert.equal(ewgf.me.rank, 1);
  const nextWeek = await (await w.handle(req('/top?board=wave10&nick=alpha'), env, NOW + 7 * 86400e3)).json();
  assert.equal(nextWeek.total, 0); assert.deepEqual(nextWeek.rows, []); assert.equal(nextWeek.me, null);
  assert.equal(env.DB.rows.length, 6);
});

test('top list is capped at 10 while total and my rank keep counting below the list', async () => {
  const w = await worker(); const env = {DB: fakeD1()}; const me = owned(w, env);
  for (let i = 0; i < 15; i++) await me.submit({nick: 'p' + i, score: i / 10, tie: 0});
  const last = await (await me.submit({nick: 'slow', score: 0, tie: 0})).json();
  assert.equal(last.total, 16); assert.equal(last.rank, 15, 'ties with p0'); assert.equal(last.rows.length, 10); assert.equal(last.rows[0].nick, 'p14');
  assert.equal(last.me.nick, 'slow'); assert.equal(last.me.rank, 15); assert.equal(last.rows.some(r => r.nick === 'slow'), false, 'below the top list');
  const mid = await (await w.handle(req('/top?board=wave10&nick=' + encodeURIComponent('  p3 ')), env, NOW)).json();
  assert.equal(mid.me.rank, 12, 'nick is normalised before lookup');
  assert.equal(last.cut10, 1.3, 'top-10% boundary of 16 players is 2nd place (ceil(16/10)=2)');
  assert.equal(mid.cut10, 1.3);
  const empty = await (await w.handle(req('/top?board=ewgf20'), env, NOW)).json(); assert.equal(empty.cut10, null, 'empty board has no boundary');
  const few = {DB: fakeD1()}; const m2 = owned(w, few); for (const s of [4.5, 6.2, 5.1]) await m2.submit({nick: 'n' + s, score: s, tie: 1});
  assert.equal((await (await w.handle(req('/top?board=wave10'), few, NOW)).json()).cut10, 6.2, 'under ten players the boundary is 1st place, like the app grades');
});

test('visits: POST counts one visit for the KST day, GET only reads, total sums all days', async () => {
  const w = await worker(); const env = {DB: fakeD1()};
  const v0 = await (await w.handle(req('/visits'), env, NOW)).json();
  assert.deepEqual(v0, {day: '2026-09-12', today: 0, total: 0});
  await w.handle(req('/visits', {method: 'POST'}), env, NOW);
  const v1 = await (await w.handle(req('/visits', {method: 'POST'}), env, NOW + 60e3)).json();
  assert.deepEqual(v1, {day: '2026-09-12', today: 2, total: 2});
  const v2 = await (await w.handle(req('/visits', {method: 'POST'}), env, NOW + 86400e3)).json();
  assert.deepEqual(v2, {day: '2026-09-13', today: 1, total: 3});
  assert.deepEqual((await (await w.handle(req('/visits'), env, NOW)).json()), {day: '2026-09-12', today: 2, total: 3});
  assert.deepEqual(env.DB.visits, [{day: '2026-09-12', n: 2}, {day: '2026-09-13', n: 1}]);
});

test('posts: newest first, capped at 50, validated, rate-limited per IP when the binding exists, admin delete', async () => {
  const w = await worker(); const env = {DB: fakeD1()}; const me = owned(w, env);
  assert.deepEqual(await (await w.handle(req('/posts'), env, NOW)).json(), {rows: []});
  const p1 = await (await me.post({nick: 'alpha', text: ' 웨이브  판정이\n너무 빡세요 '})).json();
  assert.equal(p1.ok, true); assert.equal(p1.id, 1); assert.deepEqual(p1.rows.map(r => [r.nick, r.text, r.created_at]), [['alpha', '웨이브 판정이 너무 빡세요', NOW]]);
  const tok = me.tokens.alpha;
  for (const [k, body] of Object.entries({nick: {nick: 'a', text: 'hi', token: tok}, text: {nick: 'alpha', token: tok, text: '   '}, 'text long': {nick: 'alpha', token: tok, text: 'x'.repeat(201)}, 'text ctrl': {nick: 'alpha', token: tok, text: 'a' + ch(0x202e) + 'b'}, body: null})) {
    const r = await post('/posts', body)(w, env); assert.equal(r.status, 400, k); assert.equal((await r.json()).error, k.split(' ')[0], k);
  }
  for (let i = 2; i <= 55; i++) await me.post({nick: 'p' + i, text: 'msg ' + i}, NOW + i);
  const list = await (await w.handle(req('/posts'), env, NOW)).json();
  assert.equal(list.rows.length, 50); assert.equal(list.rows[0].text, 'msg 55'); assert.equal(list.rows[49].text, 'msg 6');
  assert.equal(env.DB.posts.length, 55, 'rows below the cap are kept, only the listing is capped');
  // rate limit binding: consulted with the client IP, 429 when it says no, skipped when absent
  const keys = []; const limited = {DB: env.DB, POST_LIMIT: {async limit({key}) { keys.push(key); return {success: keys.length <= 1}; }}};
  const ok = await post('/posts', {nick: 'alpha', token: tok, text: 'one'}, NOW, {'cf-connecting-ip': '203.0.113.7'})(w, limited); assert.equal(ok.status, 200);
  const no = await post('/posts', {nick: 'alpha', token: tok, text: 'two'}, NOW, {'cf-connecting-ip': '203.0.113.7'})(w, limited); assert.equal(no.status, 429); assert.deepEqual(await no.json(), {error: 'rate'});
  assert.deepEqual(keys, ['post:203.0.113.7', 'post:203.0.113.7']); assert.equal(env.DB.posts.length, 56);
  // admin delete: 403 without the secret or with a wrong one, never when the secret is unset
  assert.equal((await w.handle(req('/posts/1', {method: 'DELETE'}), env, NOW)).status, 403);
  assert.equal((await w.handle(req('/posts/1', {method: 'DELETE', headers: {authorization: 'Bearer s3cret'}}), env, NOW)).status, 403, 'no ADMIN_TOKEN configured');
  const admin = {DB: env.DB, ADMIN_TOKEN: 's3cret'};
  assert.equal((await w.handle(req('/posts/1', {method: 'DELETE', headers: {authorization: 'Bearer nope'}}), admin, NOW)).status, 403);
  const d = await (await w.handle(req('/posts/1', {method: 'DELETE', headers: {authorization: 'Bearer s3cret'}}), admin, NOW)).json();
  assert.deepEqual(d, {ok: true, deleted: 1}); assert.equal(env.DB.posts.length, 55); assert.equal(env.DB.posts.some(p => p.id === 1), false);
  assert.deepEqual(await (await w.handle(req('/posts/1', {method: 'DELETE', headers: {authorization: 'Bearer s3cret'}}), admin, NOW)).json(), {ok: true, deleted: 0});
  assert.equal((await w.handle(req('/posts/abc', {method: 'DELETE', headers: {authorization: 'Bearer s3cret'}}), admin, NOW)).status, 404);
});

test('http surface: CORS preflight, health, 400/404/413 and 500 without leaking a stack', async () => {
  const w = await worker(); const env = {DB: fakeD1()};
  const pre = await w.handle(req('/submit', {method: 'OPTIONS'}), env, NOW);
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-origin'), ORIGIN, 'echoes the allowed origin, never *');
  assert.match(pre.headers.get('access-control-allow-headers'), /content-type/); assert.match(pre.headers.get('access-control-allow-methods'), /DELETE/);
  const health = await w.handle(req('/'), env, NOW); assert.equal(health.status, 200); assert.equal((await health.json()).week, '2026-09-07');
  assert.equal((await w.handle(req('/top'), env, NOW)).status, 400);
  assert.equal((await w.handle(req('/top?board=free'), env, NOW)).status, 400);
  for (const b of ['constructor', '__proto__', 'toString']) {
    assert.equal((await w.handle(req('/top?board=' + b), env, NOW)).status, 400, 'inherited key ' + b);
    const r = await submit(entry({board: b}))(w, env); assert.equal(r.status, 400); assert.deepEqual(await r.json(), {error: 'board'});
  }
  assert.equal((await w.handle(req('/nope'), env, NOW)).status, 404);
  assert.equal((await w.handle(req('/top', {method: 'POST'}), env, NOW)).status, 404);
  assert.equal((await w.handle(req('/visits', {method: 'DELETE'}), env, NOW)).status, 404);
  const badJson = await submit('{oops')(w, env); assert.equal(badJson.status, 400); assert.deepEqual(await badJson.json(), {error: 'json'});
  const badNick = await submit(entry({nick: 'x'}))(w, env); assert.equal(badNick.status, 400); assert.deepEqual(await badNick.json(), {error: 'nick'});
  assert.equal((await submit('x'.repeat(2001))(w, env)).status, 413);
  assert.equal((await post('/posts', 'x'.repeat(2001))(w, env)).status, 413);
  assert.equal((await submit(entry())(w, env)).status, 403, 'valid shape but no token');
  assert.equal(env.DB.rows.length, 0, 'rejected submissions are never stored'); assert.equal(env.DB.posts.length, 0);
  for (const res of [pre, health, badJson]) assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  const boom = await w.default.fetch(req('/top?board=wave10'), {DB: {prepare() { throw new Error('db down'); }}});
  assert.equal(boom.status, 500); const j = await boom.json(); assert.equal(j.error, 'server'); assert.equal(j.message, 'db down'); assert.equal(j.stack, undefined);
});

test('origin lock: only allowed origins get CORS headers and may POST; * opens it for tests; DELETE stays token-only', async () => {
  const w = await worker(); const env = {DB: fakeD1()};
  const foreign = {origin: 'https://evil.example'};
  // allowed origin: echoed back (never *), vary: origin, preflight 204
  let r = await w.handle(req('/top?board=wave10'), env, NOW);
  assert.equal(r.status, 200); assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN); assert.equal(r.headers.get('vary'), 'origin');
  assert.equal((await w.handle(req('/top', {method: 'OPTIONS'}), env, NOW)).status, 204);
  // foreign origin: reads answer but without the allow header (browser blocks), writes and preflight are refused
  r = await w.handle(req('/top?board=wave10', {headers: foreign}), env, NOW);
  assert.equal(r.status, 200); assert.equal(r.headers.get('access-control-allow-origin'), null);
  assert.equal((await w.handle(req('/top', {method: 'OPTIONS', headers: foreign}), env, NOW)).status, 403);
  r = await post('/nick', {nick: 'copycat'}, NOW, foreign)(w, env); assert.equal(r.status, 403); assert.equal((await r.json()).error, 'origin');
  r = await post('/visits', {}, NOW, foreign)(w, env); assert.equal(r.status, 403);
  // no Origin header at all (curl): POST refused, GET fine
  r = await w.handle(new Request('https://board.test/nick', {method: 'POST', body: JSON.stringify({nick: 'curl'})}), env, NOW); assert.equal(r.status, 403);
  assert.equal((await w.handle(new Request('https://board.test/visits'), env, NOW)).status, 200);
  // env.ALLOWED_ORIGINS: extra origin, or * for everything
  const custom = {DB: env.DB, ALLOWED_ORIGINS: ORIGIN + ', https://mishima-dojo.example'};
  r = await post('/nick', {nick: 'domain'}, NOW, {origin: 'https://mishima-dojo.example'})(w, custom); assert.equal(r.status, 200);
  assert.equal((await post('/nick', {nick: 'copycat'}, NOW, foreign)(w, custom)).status, 403);
  const open = {DB: env.DB, ALLOWED_ORIGINS: '*'};
  r = await post('/nick', {nick: 'copycat'}, NOW, foreign)(w, open); assert.equal(r.status, 200); assert.equal(r.headers.get('access-control-allow-origin'), 'https://evil.example');
  // admin DELETE needs no origin, only the token
  const admin = {DB: env.DB, ADMIN_TOKEN: 's3cret'};
  r = await w.handle(new Request('https://board.test/posts/1', {method: 'DELETE', headers: {authorization: 'Bearer s3cret'}}), admin, NOW); assert.notEqual(r.status, 403);
  // 500 path also carries CORS so the app can read the error
  const broken = {DB: {prepare() { throw new Error('boom'); }}};
  r = await w.default.fetch(req('/top?board=wave10'), broken); assert.equal(r.status, 500); assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);
});
