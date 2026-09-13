// Mishima Dojo backend — Cloudflare Worker + D1. Cumulative leaderboard (no reset), visit counter, message board.
// Routes:  POST /nick {nick} → {ok,nick,token} | 409 {error:'taken'}   (nicknames are unique, case-insensitive; the token proves ownership)
//          GET  /top?board=wave10[&nick=x] → {season,board,total,rows[≤10],me,cut10}   (cut10: score at the top-10% boundary, null on an empty board)
//          POST /submit {board,nick,token,score,tie,detail,win,lang} → {ok,id,rank,improved} + the /top shape   (403 {error:'auth'} on a bad token)
//                (one row per nick per board: a worse result leaves the stored best untouched, improved=false)
//          GET  /visits → {day,today,total}   ·   POST /visits → counts one visit for today (KST) and returns the same
//          GET  /posts → {rows[≤50: {id,nick,text,created_at,up,down}]}   ·   POST /posts {nick,token,text} → {ok,id,rows}   ·   DELETE /posts/:id (Bearer ADMIN_TOKEN, also drops its votes)
//          POST /vote {nick,token,id,v: 1|-1|0} → {ok,id,mine,rows}   (2026-09-13: sets the caller's like/dislike on post `id`, 0 clears it; one vote per nick per post;
//                400 id/v · 403 auth · 404 {error:'post'} · 429 rate via VOTE_LIMIT)
//          Admin (Bearer ADMIN_TOKEN, no Origin needed):  DELETE /scores/:id → {ok,deleted}   ·   GET /ban → {rows}   ·   POST /ban {nick} → {ok,nick,registered}
//                DELETE /ban?nick=x → {ok,deleted}   ·   GET /scores?board=x → {season,board,rows} (every row of the board, banned marked, with ids and public ranks)
//          GET  / → health   ·   OPTIONS * → CORS preflight
// No accounts and no automatic anti-cheat (2026-09-12): a nickname is claimed once (POST /nick) and the browser keeps the returned
// token; scores and posts must carry it. POST /posts and /nick are rate-limited per IP through the optional POST_LIMIT / NICK_LIMIT
// rate-limit bindings (wrangler.toml); nothing about the visitor is stored.
// Shadow ban (2026-09-13, user decision): the admin lists a nickname in `bans`. Its scores stay stored and keep being accepted. A request
// that names that nick (/top?nick=, /submit) gets the board exactly as it would look unbanned — own row in the list, counted in total and
// cut10 — so the player cannot tell; every other request skips the banned rows in the list, total, cut10 and rank counts. The per-nick
// lookup is public like the rest of /top, so anyone who names a banned nick sees its rows: the ban hides players from the board, not from
// a direct query. Unbanning (DELETE /ban) restores the rows for everyone; DELETE /scores/:id removes one row for good.
// Seasons (2026-09-14, user decision): the board no longer resets. Every row is stored under the season key SEASON ('all') in scores.week and the
// best result per nick per board simply accumulates. A reset (weekly or otherwise) comes back by changing seasonKey() alone — rows of other keys
// stay in the table and stop being listed. Existing weekly rows were folded into 'all' by migrate-2026-09-14-alltime.sql (best per nick kept).
// Pure helpers (seasonKey, weekKey, dayKey, validate, cleanText, nickKey, handle) and the contract (BOARDS, WINDOWS, SEASON) are exported for node tests.

const KST = 9 * 3600e3, DAY = 86400e3, TOP = 10, POSTS = 50, TEXT_MAX = 200;
export const BOARDS = {
  wave10:  {score: [0, 20],  tie: [0, 500],   detail: {dashes: [0, 200], chain: [0, 200]}},
  ewgf20:  {score: [0, 100], tie: [-500, 0],  detail: {hits: [0, 20], target: [20, 20], mean: [-500, 500]}},
  combo10: {score: [0, 100], tie: [0, 20],    detail: {hits: [0, 10], target: [10, 10], mean: [-500, 500], dps: [0, 20]}},
  rush30:  {score: [0, 2000], tie: [0, 500],  detail: {kills: [0, 500], whiffs: [0, 2000], dashPts: [0, 1000]}}, // 더미 격파 30초 (2026-09-13): score = points, tie = dummies destroyed
  bd10:    {score: [0, 60],   tie: [0, 200],  detail: {dashes: [0, 200], top: [0, 200], chain: [0, 200]}},      // 백대시 10초 (2026-09-13): score = metres retreated, tie = 'very fast' sets (theoretical max ≈ 46 m)
};
export const WINDOWS = [8, 12, 15];
const LANGS = ['ko', 'en', 'ja'];
// Characters that render blank or hijack layout: control (Cc), format (Cf: zero-width, bidi, soft hyphen, word joiner, BOM), private-use
// (Co), unassigned (Cn), line/paragraph separators, Hangul fillers (U+115F/1160/3164/FFA0), combining grapheme joiner and variation
// selectors. Without these a nickname made of fillers passes as a distinct blank name. Mirrored by NICK_BAD in index.html.
const BAD_CHARS = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}\u034f\u115f\u1160\u3164\uffa0\ufe00-\ufe0f\u{e0100}-\u{e01ef}]/u;
const boardSpec = b => typeof b === 'string' && Object.hasOwn(BOARDS, b) ? BOARDS[b] : undefined; // plain lookup would accept 'constructor'
// Origin lock (2026-09-12): only the site's own origin(s) may use this API from a browser. A copied page hosted elsewhere gets no
// CORS headers on reads and 403 {error:'origin'} on POST, so it has no leaderboard, posts or visit counter. The list comes from
// env.ALLOWED_ORIGINS (comma-separated, wrangler.toml [vars]); '*' allows any origin (tests). The admin routes (admin() below) are
// protected by ADMIN_TOKEN only and skip this gate, so the admin can curl them without an Origin header.
const DEFAULT_ORIGINS = 'https://mishimaryu.com, https://www.mishimaryu.com, https://sinseonghyeon.github.io'; // custom domain (2026-09-13) + the GitHub Pages origin it redirects from
const originList = env => String(env && env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map(s => s.trim()).filter(Boolean);
export const originOk = (request, env) => { const list = originList(env); if (list.includes('*')) return true; const o = request.headers.get('origin'); return !!o && list.includes(o); };
const corsHeaders = (request, env) => {
  const h = {'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS', 'access-control-allow-headers': 'content-type, authorization', 'access-control-max-age': '86400', 'vary': 'origin'};
  if (originOk(request, env)) h['access-control-allow-origin'] = request.headers.get('origin') || '*';
  return h;
};
const withCors = (res, request, env) => { for (const [k, v] of Object.entries(corsHeaders(request, env))) res.headers.set(k, v); return res; };

const kstDay = ms => Math.floor((ms + KST) / DAY);       // KST days since epoch
const isoDay = day => new Date(day * DAY).toISOString().slice(0, 10);
// Season key every score is stored under and every board is read from. One constant = one cumulative board that never resets
// (2026-09-14 user decision: bring a reset back only once there is real traffic). To reset weekly again, return weekKey(now) here.
export const SEASON = 'all';
export const seasonKey = now => SEASON; // eslint-disable-line no-unused-vars — `now` is the hook a future reset keys on
// Monday (YYYY-MM-DD) of the KST week containing `ms` (Monday 00:00 KST = Sunday 15:00 UTC). Unused by the live board; kept as the ready-made weekly key.
export function weekKey(ms) {
  const day = kstDay(ms), dow = (day + 4) % 7;          // 1970-01-01 was a Thursday → 0=Sun … 6=Sat
  return isoDay(day - ((dow + 6) % 7));
}
export const dayKey = ms => isoDay(kstDay(ms));         // KST calendar day 'YYYY-MM-DD'

const num = (v, [lo, hi]) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi) ? v : undefined;
// Collapse whitespace; undefined when the text is empty, too long or carries control/zero-width characters.
export function cleanText(v, max) {
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
  const len = [...s].length;
  return len >= 1 && len <= max && !BAD_CHARS.test(s) ? s : undefined;
}
const cleanNick = v => { const n = cleanText(v, 12); return n && [...n].length >= 2 ? n : undefined; };
export const nickKey = n => n.normalize('NFKC').toLowerCase(); // uniqueness key: 'Kazu YA' and 'kazu ya' are the same nickname
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
// Registered display nick for (nick, token), or null when the nickname is unknown or the token does not match.
async function owner(db, nick, token) {
  const n = cleanNick(nick); if (!n || typeof token !== 'string' || !token) return null;
  const row = await db.prepare('SELECT nick, token FROM nicks WHERE key=?').bind(nickKey(n)).first();
  return row && row.token === token ? row.nick : null;
}
async function limited(env, binding, key) { // Cloudflare rate-limit binding; absent in tests and when not configured
  if (!env[binding]) return false;
  const {success} = await env[binding].limit({key});
  return !success;
}
const ip = request => request.headers.get('cf-connecting-ip') || '';
const isAdmin = (request, env) => !!env.ADMIN_TOKEN && (request.headers.get('authorization') || '') === 'Bearer ' + env.ADMIN_TOKEN;
// Banned spellings: what `bans` stores plus, when that key is registered, the registered spelling (/submit stores rows under it). So a
// nick banned before anyone claimed it stays hidden after someone claims it in another case. Unregistered legacy rows match by exact spelling.
const BANNED = 'SELECT nick FROM bans UNION SELECT n.nick FROM nicks n JOIN bans b ON b.key=n.key';
const VISIBLE = `nick NOT IN (${BANNED})`; // rows of banned nicks exist but never reach other players
const SCOPE = 'FROM scores WHERE week=? AND board=?', BY_RANK = 'ORDER BY score DESC, tie DESC, id ASC'; // scores.week holds the season key (see seasonKey)

export function validate(body) {
  if (!body || typeof body !== 'object') return {error: 'body'};
  const spec = boardSpec(body.board);
  if (!spec) return {error: 'board'};
  const nick = cleanNick(body.nick); if (!nick) return {error: 'nick'};
  const score = num(body.score, spec.score); if (score === undefined) return {error: 'score'};
  const tie = num(body.tie ?? 0, spec.tie); if (tie === undefined) return {error: 'tie'};
  if (!WINDOWS.includes(body.win)) return {error: 'win'};
  const detail = {};
  for (const [k, range] of Object.entries(spec.detail)) {
    const v = num(body.detail?.[k], range); if (v === undefined) return {error: 'detail.' + k};
    detail[k] = v;
  }
  return {value: {board: body.board, nick, score, tie, win: body.win, lang: LANGS.includes(body.lang) ? body.lang : 'ko', detail}};
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {status, headers: {'content-type': 'application/json; charset=utf-8'}}); // CORS headers are added once in handle()
function safeParse(s) { try { return JSON.parse(s) || {}; } catch (e) { return {}; } }
const parseRow = r => ({...r, detail: safeParse(r.detail)});
const rankRows = rows => rows.map((r, i) => {
  const prev = rows[i - 1];
  r.rank = prev && prev.score === r.score && prev.tie === r.tie ? prev.rank : i + 1;
  return r;
});
const ROW = 'id,nick,score,tie,detail,win,created_at';

// Top list plus, when `nick` is given, that nick's own row with its rank even when it sits below the top list. The requester's own rows
// pass the ban filter (`OR nick=?`), so a banned player gets the board they would see unbanned; see the header comment.
async function top(db, board, season, nick) {
  const where = `${SCOPE} AND (${VISIBLE} OR nick=?)`, args = [season, board, nick || ''];
  const {results} = await db.prepare(`SELECT ${ROW} ${where} ${BY_RANK} LIMIT ${TOP}`).bind(...args).all();
  const total = await db.prepare(`SELECT COUNT(*) AS n ${where}`).bind(...args).first('n');
  const rows = rankRows(results.map(parseRow));
  // Score you need to sit in the top 10% (the app shades the wave chart with it). Boards under ten players count as ten, like the app's grades: 1st place's score.
  const cut10 = total ? await db.prepare(`SELECT score ${where} ${BY_RANK} LIMIT 1 OFFSET ?`).bind(...args, Math.ceil(Math.max(total, 10) / 10) - 1).first('score') : null;
  let me = null;
  if (nick) {
    const mine = await db.prepare(`SELECT ${ROW} ${SCOPE} AND nick=?`).bind(season, board, nick).first();
    if (mine) {
      me = parseRow(mine);
      const listed = rows.find(r => r.id === me.id);
      me.rank = listed ? listed.rank : 1 + (await db.prepare(`SELECT COUNT(*) AS n ${where} AND (score>? OR (score=? AND tie>?))`).bind(...args, me.score, me.score, me.tie).first('n') || 0);
    }
  }
  return {season, board, total: total || 0, rows, me, cut10: cut10 ?? null};
}

async function visits(db, now, hit) {
  const day = dayKey(now);
  if (hit) await db.prepare('INSERT INTO visits (day,n) VALUES (?,1) ON CONFLICT(day) DO UPDATE SET n=n+1').bind(day).run();
  const today = await db.prepare('SELECT n FROM visits WHERE day=?').bind(day).first('n');
  const total = await db.prepare('SELECT SUM(n) AS n FROM visits').first('n');
  return {day, today: today || 0, total: total || 0};
}

async function posts(db) { // up/down = like/dislike counts from `votes` (2026-09-13); the caller's own vote is never returned (the app remembers it)
  const {results} = await db.prepare('SELECT p.id,p.nick,p.text,p.created_at, COALESCE(SUM(v.v=1),0) AS up, COALESCE(SUM(v.v=-1),0) AS down ' +
    `FROM posts p LEFT JOIN votes v ON v.post_id=p.id GROUP BY p.id ORDER BY p.id DESC LIMIT ${POSTS}`).all();
  return {rows: results};
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > 2000) return {status: 413, error: 'too_large'};
  try { return {body: JSON.parse(text)}; } catch (e) { return {status: 400, error: 'json'}; }
}

export async function handle(request, env, now = Date.now()) { return withCors(await route(request, env, now), request, env); }
async function route(request, env, now) {
  const url = new URL(request.url), path = url.pathname.replace(/\/+$/, '') || '/', method = request.method;
  if (method === 'OPTIONS') return new Response(null, {status: originOk(request, env) ? 204 : 403});
  const mod = await admin(request, env, url, path, method, now); if (mod) return mod; // token-only routes, before the origin gate (curl sends no Origin)
  if (method === 'POST' && !originOk(request, env)) return json({error: 'origin'}, 403);
  if (path === '/' && method === 'GET') return json({ok: true, service: 'mishima-dojo-board', season: seasonKey(now)});

  if (path === '/top' && method === 'GET') {
    const board = url.searchParams.get('board');
    if (!boardSpec(board)) return json({error: 'board'}, 400);
    return json(await top(env.DB, board, seasonKey(now), cleanNick(url.searchParams.get('nick'))));
  }
  if (path === '/nick' && method === 'POST') {
    const {body, status, error} = await readJson(request); if (error) return json({error}, status);
    if (!body || typeof body !== 'object') return json({error: 'body'}, 400);
    const nick = cleanNick(body.nick); if (!nick) return json({error: 'nick'}, 400);
    if (await limited(env, 'NICK_LIMIT', 'nick:' + ip(request))) return json({error: 'rate'}, 429);
    const key = nickKey(nick), token = randomToken();
    const ins = await env.DB.prepare('INSERT OR IGNORE INTO nicks (key,nick,token,created_at) VALUES (?,?,?,?)').bind(key, nick, token, now).run();
    if (!ins.meta.changes) return json({error: 'taken'}, 409);
    return json({ok: true, nick, token});
  }
  if (path === '/submit' && method === 'POST') {
    const {body, status, error} = await readJson(request); if (error) return json({error}, status);
    const v = validate(body);
    if (v.error) return json({error: v.error}, 400);
    const e = v.value, season = seasonKey(now);
    const nick = await owner(env.DB, e.nick, body.token); if (!nick) return json({error: 'auth'}, 403);
    e.nick = nick; // stored under the registered spelling
    // One row per (season, board, nick); the UPDATE only fires when the new result beats the stored one.
    await env.DB.prepare('INSERT INTO scores (week,board,nick,score,tie,detail,win,lang,created_at) VALUES (?,?,?,?,?,?,?,?,?) ' +
      'ON CONFLICT(week,board,nick) DO UPDATE SET score=excluded.score, tie=excluded.tie, detail=excluded.detail, win=excluded.win, lang=excluded.lang, created_at=excluded.created_at ' +
      'WHERE excluded.score>scores.score OR (excluded.score=scores.score AND excluded.tie>scores.tie)')
      .bind(season, e.board, e.nick, e.score, e.tie, JSON.stringify(e.detail), e.win, e.lang, now).run();
    const t = await top(env.DB, e.board, season, e.nick);
    return json({ok: true, id: t.me.id, rank: t.me.rank, improved: t.me.created_at === now, ...t});
  }

  if (path === '/visits' && (method === 'GET' || method === 'POST')) return json(await visits(env.DB, now, method === 'POST'));

  if (path === '/posts' && method === 'GET') return json(await posts(env.DB));
  if (path === '/posts' && method === 'POST') {
    const {body, status, error} = await readJson(request); if (error) return json({error}, status);
    if (!body || typeof body !== 'object') return json({error: 'body'}, 400);
    if (!cleanNick(body.nick)) return json({error: 'nick'}, 400);
    const text = cleanText(body.text, TEXT_MAX); if (!text) return json({error: 'text'}, 400);
    const nick = await owner(env.DB, body.nick, body.token); if (!nick) return json({error: 'auth'}, 403);
    if (await limited(env, 'POST_LIMIT', 'post:' + ip(request))) return json({error: 'rate'}, 429);
    const ins = await env.DB.prepare('INSERT INTO posts (nick,text,created_at) VALUES (?,?,?)').bind(nick, text, now).run();
    return json({ok: true, id: ins.meta.last_row_id, ...await posts(env.DB)});
  }
  if (path === '/vote' && method === 'POST') { // idempotent "set my vote on post id to v" (1 like, -1 dislike, 0 none): one row per (post, nick), so a stale client cannot double-count
    const {body, status, error} = await readJson(request); if (error) return json({error}, status);
    if (!body || typeof body !== 'object') return json({error: 'body'}, 400);
    const id = body.id; if (!Number.isInteger(id) || id < 1 || id > 1e12) return json({error: 'id'}, 400);
    const v = body.v; if (![1, -1, 0].includes(v)) return json({error: 'v'}, 400);
    if (!cleanNick(body.nick)) return json({error: 'nick'}, 400);
    const nick = await owner(env.DB, body.nick, body.token); if (!nick) return json({error: 'auth'}, 403);
    if (await limited(env, 'VOTE_LIMIT', 'vote:' + ip(request))) return json({error: 'rate'}, 429);
    if (!await env.DB.prepare('SELECT 1 FROM posts WHERE id=?').bind(id).first()) return json({error: 'post'}, 404);
    const key = nickKey(nick);
    if (v === 0) await env.DB.prepare('DELETE FROM votes WHERE post_id=? AND key=?').bind(id, key).run();
    else await env.DB.prepare('INSERT INTO votes (post_id,key,v,created_at) VALUES (?,?,?,?) ON CONFLICT(post_id,key) DO UPDATE SET v=excluded.v, created_at=excluded.created_at').bind(id, key, v, now).run();
    return json({ok: true, id, mine: v, ...await posts(env.DB)});
  }
  return json({error: 'not_found'}, 404);
}

// Moderation routes, ADMIN_TOKEN only (see the header comment): undefined when `path` is none of them, 403 without the token.
async function admin(request, env, url, path, method, now) {
  const del = method === 'DELETE' && path.match(/^\/(scores|posts)\/(\d{1,12})$/); // the table name comes from this whitelist, never from the client
  if (path !== '/ban' && path !== '/scores' && !del) return undefined;
  if (!isAdmin(request, env)) return json({error: 'auth'}, 403);
  const db = env.DB;
  if (del) {
    const deleted = (await db.prepare(`DELETE FROM ${del[1]} WHERE id=?`).bind(+del[2]).run()).meta.changes || 0;
    if (del[1] === 'posts') await db.prepare('DELETE FROM votes WHERE post_id=?').bind(+del[2]).run(); // a deleted post takes its votes with it
    return json({ok: true, deleted});
  }
  if (path === '/ban' && method === 'GET') return json({rows: (await db.prepare('SELECT key,nick,created_at FROM bans ORDER BY created_at DESC').all()).results});
  if (path === '/ban' && method === 'POST') { // stored under the registered spelling when the key is claimed (the list shows it as players do); the filter also joins nicks by key
    const {body, status, error} = await readJson(request); if (error) return json({error}, status);
    const n = cleanNick(body && body.nick); if (!n) return json({error: 'nick'}, 400);
    const reg = await db.prepare('SELECT nick FROM nicks WHERE key=?').bind(nickKey(n)).first('nick');
    const nick = reg || n;
    await db.prepare('INSERT OR REPLACE INTO bans (key,nick,created_at) VALUES (?,?,?)').bind(nickKey(nick), nick, now).run();
    return json({ok: true, nick, registered: !!reg});
  }
  if (path === '/ban' && method === 'DELETE') {
    const n = cleanNick(url.searchParams.get('nick')); if (!n) return json({error: 'nick'}, 400);
    const r = await db.prepare('DELETE FROM bans WHERE key=?').bind(nickKey(n)).run();
    return json({ok: true, deleted: r.meta.changes || 0});
  }
  if (path === '/scores' && method === 'GET') { // every row of one board with ids, ban marks and public ranks, so the admin can pick rows to delete
    const board = url.searchParams.get('board'); if (!boardSpec(board)) return json({error: 'board'}, 400);
    const season = seasonKey(now);
    const {results} = await db.prepare(`SELECT ${ROW}, nick IN (${BANNED}) AS banned ${SCOPE} ${BY_RANK}`).bind(season, board).all();
    const rows = results.map(parseRow); rankRows(rows.filter(r => !r.banned)); // the rank players see; banned rows get none
    return json({season, board, rows});
  }
  return json({error: 'not_found'}, 404);
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch (e) { return withCors(json({error: 'server', message: String(e && e.message || e)}, 500), request, env); }
  },
};
