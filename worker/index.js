// Mishima Dojo backend — Cloudflare Worker + D1. Weekly leaderboard, visit counter, message board.
// Routes:  POST /nick {nick} → {ok,nick,token} | 409 {error:'taken'}   (nicknames are unique, case-insensitive; the token proves ownership)
//          GET  /top?board=wave10[&nick=x] → {week,start,end,board,total,rows[≤10],me}
//          POST /submit {board,nick,token,score,tie,detail,win,lang} → {ok,id,rank,improved} + the /top shape   (403 {error:'auth'} on a bad token)
//                (one row per nick per board per week: a worse result leaves the stored best untouched, improved=false)
//          GET  /visits → {day,today,total}   ·   POST /visits → counts one visit for today (KST) and returns the same
//          GET  /posts → {rows[≤50]}   ·   POST /posts {nick,token,text} → {ok,id,rows}   ·   DELETE /posts/:id (Bearer ADMIN_TOKEN)
//          GET  / → health   ·   OPTIONS * → CORS preflight
// No accounts, no anti-cheat by decision (2026-09-12): a nickname is claimed once (POST /nick) and the browser keeps the returned
// token; scores and posts must carry it. POST /posts and /nick are rate-limited per IP through the optional POST_LIMIT / NICK_LIMIT
// rate-limit bindings (wrangler.toml); nothing about the visitor is stored.
// Pure helpers (weekKey, weekBounds, dayKey, validate, cleanText, nickKey, handle) and the contract (BOARDS, WINDOWS) are exported for node tests.

const KST = 9 * 3600e3, DAY = 86400e3, WEEK = 7 * DAY, TOP = 10, POSTS = 50, TEXT_MAX = 200;
export const BOARDS = {
  wave10:  {score: [0, 20],  tie: [0, 500],   detail: {dashes: [0, 200], chain: [0, 200]}},
  ewgf20:  {score: [0, 100], tie: [-500, 0],  detail: {hits: [0, 20], target: [20, 20], mean: [-500, 500]}},
  combo10: {score: [0, 100], tie: [0, 20],    detail: {hits: [0, 10], target: [10, 10], mean: [-500, 500], dps: [0, 20]}},
};
export const WINDOWS = [8, 12, 15];
const LANGS = ['ko', 'en', 'ja'];
// Characters that render blank or hijack layout: control (Cc), format (Cf: zero-width, bidi, soft hyphen, word joiner, BOM), private-use
// (Co), unassigned (Cn), line/paragraph separators, Hangul fillers (U+115F/1160/3164/FFA0), combining grapheme joiner and variation
// selectors. Without these a nickname made of fillers passes as a distinct blank name. Mirrored by NICK_BAD in index.html.
const BAD_CHARS = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}\u034f\u115f\u1160\u3164\uffa0\ufe00-\ufe0f\u{e0100}-\u{e01ef}]/u;
const boardSpec = b => typeof b === 'string' && Object.hasOwn(BOARDS, b) ? BOARDS[b] : undefined; // plain lookup would accept 'constructor'
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
  'access-control-max-age': '86400',
};

const kstDay = ms => Math.floor((ms + KST) / DAY);       // KST days since epoch
const isoDay = day => new Date(day * DAY).toISOString().slice(0, 10);
// Monday (YYYY-MM-DD) of the KST week containing `ms`. Weeks reset Monday 00:00 KST = Sunday 15:00 UTC.
export function weekKey(ms) {
  const day = kstDay(ms), dow = (day + 4) % 7;          // 1970-01-01 was a Thursday → 0=Sun … 6=Sat
  return isoDay(day - ((dow + 6) % 7));
}
export function weekBounds(key) {
  const start = Date.parse(key + 'T00:00:00+09:00');
  return {start, end: start + WEEK};
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

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {status, headers: {'content-type': 'application/json; charset=utf-8', ...CORS}});
function safeParse(s) { try { return JSON.parse(s) || {}; } catch (e) { return {}; } }
const parseRow = r => ({...r, detail: safeParse(r.detail)});
const rankRows = rows => rows.map((r, i) => {
  const prev = rows[i - 1];
  r.rank = prev && prev.score === r.score && prev.tie === r.tie ? prev.rank : i + 1;
  return r;
});
const ROW = 'id,nick,score,tie,detail,win,created_at';

// Top list plus, when `nick` is given, that nick's own row with its rank even when it sits below the top list.
async function top(db, board, week, nick) {
  const {results} = await db.prepare(`SELECT ${ROW} FROM scores WHERE week=? AND board=? ORDER BY score DESC, tie DESC, id ASC LIMIT ${TOP}`).bind(week, board).all();
  const total = await db.prepare('SELECT COUNT(*) AS n FROM scores WHERE week=? AND board=?').bind(week, board).first('n');
  const rows = rankRows(results.map(parseRow));
  let me = null;
  if (nick) {
    const mine = await db.prepare(`SELECT ${ROW} FROM scores WHERE week=? AND board=? AND nick=?`).bind(week, board, nick).first();
    if (mine) {
      me = parseRow(mine);
      const listed = rows.find(r => r.id === me.id);
      me.rank = listed ? listed.rank : 1 + (await db.prepare('SELECT COUNT(*) AS n FROM scores WHERE week=? AND board=? AND (score>? OR (score=? AND tie>?))')
        .bind(week, board, me.score, me.score, me.tie).first('n') || 0);
    }
  }
  return {week, ...weekBounds(week), board, total: total || 0, rows, me};
}

async function visits(db, now, hit) {
  const day = dayKey(now);
  if (hit) await db.prepare('INSERT INTO visits (day,n) VALUES (?,1) ON CONFLICT(day) DO UPDATE SET n=n+1').bind(day).run();
  const today = await db.prepare('SELECT n FROM visits WHERE day=?').bind(day).first('n');
  const total = await db.prepare('SELECT SUM(n) AS n FROM visits').first('n');
  return {day, today: today || 0, total: total || 0};
}

async function posts(db) {
  const {results} = await db.prepare(`SELECT id,nick,text,created_at FROM posts ORDER BY id DESC LIMIT ${POSTS}`).all();
  return {rows: results};
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > 2000) return {status: 413, error: 'too_large'};
  try { return {body: JSON.parse(text)}; } catch (e) { return {status: 400, error: 'json'}; }
}

export async function handle(request, env, now = Date.now()) {
  const url = new URL(request.url), path = url.pathname.replace(/\/+$/, '') || '/', method = request.method;
  if (method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS});
  if (path === '/' && method === 'GET') return json({ok: true, service: 'mishima-dojo-board', week: weekKey(now)});

  if (path === '/top' && method === 'GET') {
    const board = url.searchParams.get('board');
    if (!boardSpec(board)) return json({error: 'board'}, 400);
    return json(await top(env.DB, board, weekKey(now), cleanNick(url.searchParams.get('nick'))));
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
    const e = v.value, week = weekKey(now);
    const nick = await owner(env.DB, e.nick, body.token); if (!nick) return json({error: 'auth'}, 403);
    e.nick = nick; // stored under the registered spelling
    // One row per (week, board, nick); the UPDATE only fires when the new result beats the stored one.
    await env.DB.prepare('INSERT INTO scores (week,board,nick,score,tie,detail,win,lang,created_at) VALUES (?,?,?,?,?,?,?,?,?) ' +
      'ON CONFLICT(week,board,nick) DO UPDATE SET score=excluded.score, tie=excluded.tie, detail=excluded.detail, win=excluded.win, lang=excluded.lang, created_at=excluded.created_at ' +
      'WHERE excluded.score>scores.score OR (excluded.score=scores.score AND excluded.tie>scores.tie)')
      .bind(week, e.board, e.nick, e.score, e.tie, JSON.stringify(e.detail), e.win, e.lang, now).run();
    const t = await top(env.DB, e.board, week, e.nick);
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
  const del = method === 'DELETE' && path.match(/^\/posts\/(\d{1,12})$/);
  if (del) {
    const auth = request.headers.get('authorization') || '';
    if (!env.ADMIN_TOKEN || auth !== 'Bearer ' + env.ADMIN_TOKEN) return json({error: 'auth'}, 403);
    const r = await env.DB.prepare('DELETE FROM posts WHERE id=?').bind(+del[1]).run();
    return json({ok: true, deleted: r.meta.changes || 0});
  }
  return json({error: 'not_found'}, 404);
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch (e) { return json({error: 'server', message: String(e && e.message || e)}, 500); }
  },
};
