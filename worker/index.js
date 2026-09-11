// Mishima Dojo weekly leaderboard — Cloudflare Worker + D1.
// Routes:  GET /top?board=wave10   → {week,start,end,board,total,rows[≤20]}
//          POST /submit {board,nick,score,tie,detail,win,lang} → same shape + {ok,id,rank}
//          GET /                   → health   ·   OPTIONS * → CORS preflight
// No auth, no anti-cheat by decision (2026-09-12): the server only checks shapes and ranges.
// Pure helpers (weekKey, weekBounds, validate, handle) and the contract (BOARDS, WINDOWS) are exported for node tests.

const KST = 9 * 3600e3, DAY = 86400e3, WEEK = 7 * DAY, TOP = 20;
export const BOARDS = {
  wave10:  {score: [0, 20],  tie: [0, 500],   detail: {dashes: [0, 200], chain: [0, 200]}},
  ewgf20:  {score: [0, 100], tie: [-500, 0],  detail: {hits: [0, 20], target: [20, 20], mean: [-500, 500]}},
  combo10: {score: [0, 100], tie: [0, 20],    detail: {hits: [0, 10], target: [10, 10], mean: [-500, 500], dps: [0, 20]}},
};
export const WINDOWS = [8, 12, 15];
const LANGS = ['ko', 'en', 'ja'];
const boardSpec = b => typeof b === 'string' && Object.hasOwn(BOARDS, b) ? BOARDS[b] : undefined; // plain lookup would accept 'constructor'
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

// Monday (YYYY-MM-DD) of the KST week containing `ms`. Weeks reset Monday 00:00 KST = Sunday 15:00 UTC.
export function weekKey(ms) {
  const day = Math.floor((ms + KST) / DAY);      // KST days since epoch
  const dow = (day + 4) % 7;                     // 1970-01-01 was a Thursday → 0=Sun … 6=Sat
  const monday = day - ((dow + 6) % 7);
  return new Date(monday * DAY).toISOString().slice(0, 10);
}
export function weekBounds(key) {
  const start = Date.parse(key + 'T00:00:00+09:00');
  return {start, end: start + WEEK};
}

const num = (v, [lo, hi]) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi) ? v : undefined;
export function validate(body) {
  if (!body || typeof body !== 'object') return {error: 'body'};
  const spec = boardSpec(body.board);
  if (!spec) return {error: 'board'};
  const nick = typeof body.nick === 'string' ? body.nick.replace(/\s+/g, ' ').trim() : '';
  const len = [...nick].length;
  if (len < 2 || len > 12 || /[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e]/.test(nick)) return {error: 'nick'};
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
const rankRows = rows => rows.map((r, i) => {
  const prev = rows[i - 1];
  r.rank = prev && prev.score === r.score && prev.tie === r.tie ? prev.rank : i + 1;
  return r;
});
function safeParse(s) { try { return JSON.parse(s) || {}; } catch (e) { return {}; } }

async function top(db, board, week) {
  const {results} = await db.prepare('SELECT id,nick,score,tie,detail,win,created_at FROM scores WHERE week=? AND board=? ORDER BY score DESC, tie DESC, id ASC LIMIT ' + TOP).bind(week, board).all();
  const total = await db.prepare('SELECT COUNT(*) AS n FROM scores WHERE week=? AND board=?').bind(week, board).first('n');
  const rows = rankRows(results.map(r => ({...r, detail: safeParse(r.detail)})));
  return {week, ...weekBounds(week), board, total: total || 0, rows};
}

export async function handle(request, env, now = Date.now()) {
  const url = new URL(request.url), path = url.pathname.replace(/\/+$/, '') || '/';
  if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS});
  if (path === '/' && request.method === 'GET') return json({ok: true, service: 'mishima-dojo-board', week: weekKey(now)});
  if (path === '/top' && request.method === 'GET') {
    const board = url.searchParams.get('board');
    if (!boardSpec(board)) return json({error: 'board'}, 400);
    return json(await top(env.DB, board, weekKey(now)));
  }
  if (path === '/submit' && request.method === 'POST') {
    const text = await request.text();
    if (text.length > 2000) return json({error: 'too_large'}, 413);
    let body; try { body = JSON.parse(text); } catch (e) { return json({error: 'json'}, 400); }
    const v = validate(body);
    if (v.error) return json({error: v.error}, 400);
    const e = v.value, week = weekKey(now);
    const ins = await env.DB.prepare('INSERT INTO scores (week,board,nick,score,tie,detail,win,lang,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(week, e.board, e.nick, e.score, e.tie, JSON.stringify(e.detail), e.win, e.lang, now).run();
    const better = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE week=? AND board=? AND (score>? OR (score=? AND tie>?))')
      .bind(week, e.board, e.score, e.score, e.tie).first('n');
    return json({ok: true, id: ins.meta.last_row_id, rank: (better || 0) + 1, ...await top(env.DB, e.board, week)});
  }
  return json({error: 'not_found'}, 404);
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch (e) { return json({error: 'server', message: String(e && e.message || e)}, 500); }
  },
};
