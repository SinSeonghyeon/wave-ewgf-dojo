// Mishima Dojo backend — Cloudflare Worker + D1. Cumulative leaderboard (no reset), visit counter, message board.
// Routes:  POST /nick {nick} → {ok,nick,token} | 409 {error:'taken'}   (nicknames are unique, case-insensitive; the token proves ownership)
//          GET  /top?board=wave10[&nick=x] → {season,board,total,rows[≤10],me,cut10}   (cut10: score at the top-10% boundary, null on an empty board)
//          POST /submit {board,nick,token,score,tie,detail,win,lang[,replay]} → {ok,id,rank,improved} + the /top shape   (403 {error:'auth'} on a bad token)
//                (one row per nick per board: a worse result leaves the stored best untouched, improved=false)
//          DELETE /score {board,nick,token} → {ok,deleted} + the /top shape   (the token owner can delete only their own row on that board)
//          GET  /visits → {day,today,total}   ·   POST /visits → counts one visit for today (KST) and returns the same
//          GET  /posts → {rows[≤50: {id,nick,text,created_at,edited_at,deleted,up,down,replies[]}], crowns:{nick:[[board,rank]…]}}   ·   POST /posts {nick,token,text} → {ok,id,rows,crowns}
//          POST /reply {nick,token,id,text} → {ok,id,postId,rows} (many one-level replies per post)   ·   DELETE /posts/:id (Bearer ADMIN_TOKEN, also drops votes/replies)
//          POST /vote {nick,token,id,v: 1|-1|0} → {ok,id,mine,rows}   (2026-09-13: sets the caller's like/dislike on post `id`, 0 clears it; one vote per nick per post;
//                400 id/v · 403 auth · 404 {error:'post'} · 429 rate via VOTE_LIMIT)
//          Admin (Bearer ADMIN_TOKEN, no Origin needed):  DELETE /scores/:id → {ok,deleted}   ·   GET /ban → {rows}   ·   POST /ban {nick} → {ok,nick,registered}
//                DELETE /ban?nick=x → {ok,deleted}   ·   GET /scores?board=x → {season,board,rows} (every row of the board, banned marked, with ids and public ranks)
//          GET  /replay?id=N → {ok,id,board,nick,score,tie,detail,win,created_at,replay}   (결정 39(replay): only rows in a board's public top 10 keep one; 404 {error:'replay'} otherwise)
//          POST /edit {nick,token,kind:'post'|'reply',id,text} → {ok,id,rows}   ·   DELETE /post {nick,token,kind,id} → {ok,id,rows}   (결정 40(post-edit): own posts/replies only,
//                403 {error:'owner'}; a post other people replied to stays as a deleted placeholder; 429 rate via VOTE_LIMIT)
//          GET  / → health   ·   OPTIONS * → CORS preflight
// No accounts and no automatic anti-cheat (2026-09-12): a nickname is claimed once (POST /nick) and the browser keeps the returned
// token; scores and posts must carry it. POST /posts and /nick are rate-limited per IP through the optional POST_LIMIT / NICK_LIMIT
// rate-limit bindings (wrangler.toml); nothing about the visitor is stored.
// Shadow ban (2026-09-13, user decision): the admin lists a nickname in `bans`. Its scores stay stored and keep being accepted. A request
// that names that nick (/top?nick=, /submit) gets the board exactly as it would look unbanned — own row in the list, counted in total and
// cut10 — so the player cannot tell; every other request skips the banned rows in the list, total, cut10 and rank counts. The per-nick
// lookup is public like the rest of /top, so anyone who names a banned nick sees its rows: the ban hides players from the board, not from
// a direct query. Unbanning (DELETE /ban) restores the rows for everyone; DELETE /scores/:id removes one row for good.
// Seasons (2026-09-14, user decision): the board does not reset on a schedule. Every row is stored under the season key SEASON in scores.week and the
// best result per nick per board simply accumulates. A reset comes back by changing seasonKey() alone — rows of other keys stay in the table and
// stop being listed. Existing weekly rows were folded into 'all' by migrate-2026-09-14-alltime.sql (best per nick kept); 2026-10-16 the boards
// started season 's2' once, with replays (결정 19(cumulative-ranking) · 결정 39(replay)), and the 'all' rows stay in D1 unlisted.
// Pure helpers (seasonKey, weekKey, dayKey, validate, cleanText, nickKey, handle) and the contract (BOARDS, WINDOWS, SEASON) are exported for node tests.

const KST = 9 * 3600e3, DAY = 86400e3, TOP = 10, POSTS = 50, TEXT_MAX = 200, BODY_MAX = 2000;
// Local N-try challenges (결정 26(wsc-board)·31(giwon-board)): whole counts, score = hits, tie = best streak. validate() adds the cross-field checks for every board using this spec.
const CHALLENGE_10 = {score:[0,10], tie:[0,10], detail:{hits:[0,10], target:[10,10], best:[0,10]}};
export const BOARDS = {
  wave10:  {score: [0, 20],  tie: [0, 500],   detail: {dashes: [0, 200], chain: [0, 200]}},
  ewgf20:  {score: [0, 100], tie: [-500, 0],  detail: {hits: [0, 20], target: [20, 20], mean: [-500, 500]}},
  combo10: {score: [0, 100], tie: [0, 20],    detail: {hits: [0, 10], target: [10, 10], mean: [-500, 500], dps: [0, 20]}},
  rush30:  {score: [0, 2000], tie: [0, 500],  detail: {kills: [0, 500], whiffs: [0, 2000], dashPts: [0, 1000]}}, // 더미 격파 30초 (2026-09-13): score = points, tie = dummies destroyed
  bd10:    {score: [0, 60],   tie: [0, 200],  detail: {dashes: [0, 200], top: [0, 200], chain: [0, 200]}},      // 백대시 10초 (2026-09-13): score = metres retreated, tie = 'very fast' sets (theoretical max ≈ 24 m with a 3f hand, 2026-10-08 model)
  wsc:     CHALLENGE_10, // 웨캔기어 10회 (2026-09-19)
  giwon:   CHALLENGE_10, // 기원초 10회 (2026-09-30)
  jfsr:    CHALLENGE_10, // 초스카이 10회 (2026-10-11, 결정 33(jfsr))
  tju:     CHALLENGE_10, // 도발 제트어퍼 10회 (2026-10-15, 결정 37(tju))
};
// 결정 34(char-select): every board mixes characters; detail.char says whose record a row is. Optional — older sites send none
// and those rows read as the default character. Anything outside this list is dropped, never rejected.
export const CHARS = ['kazuya', 'hwoarang', 'bryan'];
// 결정 38(challenge-mode)·41(crown): the boards 도전 모드 plays. A nickname in the public top 10 of any of them wears a crown on the message board.
// The other boards stay valid for /submit and /top (switched off in the app, not removed).
export const CROWN_BOARDS = ['wave10', 'rush30', 'bd10'];
// 결정 39(replay): a finished run may carry the inputs it was played with. Only rows in a board's public top 10 keep theirs.
// ev = [Δt µs, code, …]: code 0..8 direction, 16+mask a button press (mask = attack bits 1·2·4·8, one or more), 32 a late frame tick, 33 start, 34 go.
export const REPLAY_MAX = 60000, REPLAY_EVENTS = 8000, SUBMIT_MAX = REPLAY_MAX + 4000;
const REPLAY_CODES = new Set([...Array(9).keys(), ...Array.from({length: 15}, (_, i) => 17 + i), 32, 33, 34]);
export const WINDOWS = [8, 12, 15];
const LANGS = ['ko', 'en', 'ja'];
// Characters that render blank or hijack layout: control (Cc), format (Cf: zero-width, bidi, soft hyphen, word joiner, BOM), private-use
// (Co), unassigned (Cn), line/paragraph separators, Hangul fillers (U+115F/1160/3164/FFA0), combining grapheme joiner and variation
// selectors. Without these a nickname made of fillers passes as a distinct blank name. Mirrored by NICK_BAD in the app (src/js/29-backend.js).
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
// Season key every score is stored under and every board is read from. One constant = one cumulative board with no scheduled reset
// (2026-09-14 user decision). 'all' = 2026-09-14 … the replay release; 's2' since then (2026-10-16 user decision: the old top rows carry no
// replay). Setting 'all' back lists the old season again. To reset weekly instead, return weekKey(now) here.
export const SEASON = 's2';
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
// CROSS JOIN fixes the loop order: scan the small ban list, then look up each registered key (never scan all nicks).
const BANNED = 'SELECT nick FROM bans UNION SELECT n.nick FROM bans b CROSS JOIN nicks n ON n.key=b.key';
const VISIBLE = `nick NOT IN (${BANNED})`; // rows of banned nicks exist but never reach other players
const SCOPE = 'FROM scores WHERE week=? AND board=?', BY_RANK = 'ORDER BY score DESC, tie DESC, id ASC'; // scores.week holds the season key (see seasonKey)

// 결정 39(replay): the cleaned replay as stored JSON, null when none was sent, undefined when it is malformed (the score still counts; the replay is dropped).
// The server checks shape and size only — like scores, a replay is not proof of anything (no automatic anti-cheat, 2026-09-12).
export function cleanReplay(r, board) {
  if (r == null) return null;
  if (typeof r !== 'object' || Array.isArray(r) || r.v !== 1 || r.board !== board) return undefined;
  const ev = r.ev;
  if (!Array.isArray(ev) || ev.length < 2 || ev.length % 2 || ev.length > REPLAY_EVENTS * 2) return undefined;
  for (let i = 0; i < ev.length; i += 2) if (!Number.isInteger(ev[i]) || Math.abs(ev[i]) > 36e8 || !REPLAY_CODES.has(ev[i + 1])) return undefined;
  const out = {v: 1, board, ev};
  if (r.char !== undefined) { if (!CHARS.includes(r.char)) return undefined; out.char = r.char; }
  if (r.win !== undefined) { if (!WINDOWS.includes(r.win)) return undefined; out.win = r.win; }
  if (r.init !== undefined) { if (!Number.isInteger(r.init) || r.init < 0 || r.init > 80) return undefined; out.init = r.init; } // held direction*9 + previous direction (9 directions each)
  if (r.seed !== undefined) { if (!Number.isSafeInteger(r.seed) || r.seed < 0) return undefined; out.seed = r.seed; }
  if (r.hits !== undefined) { if (typeof r.hits !== 'string' || !/^[01]{0,2000}$/.test(r.hits)) return undefined; out.hits = r.hits; }
  if (r.moves !== undefined) {
    if (!r.moves || typeof r.moves !== 'object' || Array.isArray(r.moves)) return undefined;
    const keys = Object.keys(r.moves); if (keys.length > 12 || keys.some(k => !/^[a-z]{2,12}$/.test(k) || ![0, 1].includes(r.moves[k]))) return undefined;
    out.moves = Object.fromEntries(keys.map(k => [k, r.moves[k]]));
  }
  const s = JSON.stringify(out);
  return s.length <= REPLAY_MAX ? s : undefined;
}
// Ids of a board's public top 10 (banned rows skipped, the order /top lists): the rows a replay may stay with. An index range read of ~10 rows.
async function publicTop(db, board, season) {
  const {results} = await db.prepare(`SELECT id ${SCOPE} AND ${VISIBLE} ${BY_RANK} LIMIT ${TOP}`).bind(season, board).all();
  return results.map(r => r.id);
}
// After a submit changed the stored best of row `id`: keep `data` with it when the row sits in the public top 10, drop its old replay otherwise
// (it showed another run), and drop every replay of the board that fell out of the top 10. Returns the top 10 ids it kept replays for.
async function keepReplay(db, board, season, id, data, now) {
  const ids = await publicTop(db, board, season);
  if (data && ids.includes(id)) await db.prepare('INSERT OR REPLACE INTO replays (score_id,board,data,created_at) VALUES (?,?,?,?)').bind(id, board, data, now).run();
  else await db.prepare('DELETE FROM replays WHERE score_id=?').bind(id).run();
  if (ids.length) await db.prepare(`DELETE FROM replays WHERE board=? AND score_id NOT IN (${ids.map(() => '?').join(',')})`).bind(board, ...ids).run();
  return ids;
}
// 결정 41(crown): nickKey → [[board, rank], …] over the public top 10 of CROWN_BOARDS (shared places like /top). Cached per isolate for a few
// minutes so a refresh of the message board does not re-read the boards (결정 24(d1-quota)); this isolate's own score changes clear it.
const CROWN_TTL = 5 * 60e3;
let crownCache = null;
const dropCrowns = () => { crownCache = null; };
async function crowns(db, season, now) {
  if (crownCache && crownCache.db === db && crownCache.season === season && now - crownCache.at < CROWN_TTL && now >= crownCache.at) return crownCache.map;
  const one = `SELECT * FROM (SELECT board,nick,score,tie,id ${SCOPE} AND ${VISIBLE} ${BY_RANK} LIMIT ${TOP})`;
  const {results} = await db.prepare(CROWN_BOARDS.map(() => one).join(' UNION ALL ')).bind(...CROWN_BOARDS.flatMap(b => [season, b])).all();
  const map = new Map();
  for (const board of CROWN_BOARDS) {
    const rows = rankRows(results.filter(r => r.board === board).sort((a, b) => b.score - a.score || b.tie - a.tie || a.id - b.id));
    for (const r of rows) { const k = nickKey(r.nick), list = map.get(k) || []; list.push([board, r.rank]); map.set(k, list); }
  }
  crownCache = {db, season, at: now, map};
  return map;
}

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
  if (CHARS.includes(body.detail?.char)) detail.char = body.detail.char;
  if(BOARDS[body.board]===CHALLENGE_10){
    if(!Number.isInteger(score)||!Number.isInteger(tie)||!Number.isInteger(detail.hits)||!Number.isInteger(detail.best)||score!==detail.hits||tie!==detail.best||tie>score||(score>0&&tie<1))return {error:'detail'};
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
  // One ranked scan replaces the old top/count/cut/mine/rank query chain. `pos` picks the display rows and the
  // top-10% boundary while RANK preserves shared places for equal score+tie. This is the main D1 rows-read control.
  const {results} = await db.prepare(`WITH ranked AS (
    SELECT ${ROW}, RANK() OVER (ORDER BY score DESC, tie DESC) AS rank,
      ROW_NUMBER() OVER (${BY_RANK}) AS pos, COUNT(*) OVER () AS total
    ${where}
  ) SELECT ranked.*, EXISTS(SELECT 1 FROM replays WHERE score_id=ranked.id) AS replay FROM ranked
    WHERE pos<=? OR nick=? OR pos=MAX(1,CAST((total+9)/10 AS INTEGER))
    ORDER BY pos`).bind(...args, TOP, nick || '').all(); // replay: one primary-key lookup per picked row (결정 39(replay))
  const total = Number(results[0]?.total || 0);
  const cutPos = Math.max(1, Math.ceil(total / 10));
  const picked = results.map(r => ({...parseRow(r), replay: !!r.replay}));
  const rows = picked.filter(r => r.pos <= TOP).map(({pos, total: _total, ...r}) => r);
  const mine = nick ? picked.find(r => r.nick === nick) || null : null;
  const cut = picked.find(r => r.pos === cutPos);
  if (mine) { delete mine.pos; delete mine.total; }
  return {season, board, total, rows, me: mine, cut10: cut?.score ?? null};
}

async function visits(db, now, hit) {
  const day = dayKey(now);
  if (hit) await db.prepare('INSERT INTO visits (day,n) VALUES (?,1) ON CONFLICT(day) DO UPDATE SET n=n+1').bind(day).run();
  const today = await db.prepare('SELECT n FROM visits WHERE day=?').bind(day).first('n');
  const total = await db.prepare('SELECT SUM(n) AS n FROM visits').first('n');
  return {day, today: today || 0, total: total || 0};
}

async function posts(db, now) { // up/down = like/dislike counts from `votes`; replies are one level deep and oldest first
  // Limit parents before joining votes: old posts and their reactions must not be scanned for every refresh.
  const {results} = await db.prepare(`WITH latest AS (
      SELECT id,nick,text,created_at,edited_at,deleted FROM posts ORDER BY id DESC LIMIT ${POSTS}
    ) SELECT p.id,p.nick,p.text,p.created_at,p.edited_at,p.deleted, COALESCE(SUM(v.v=1),0) AS up, COALESCE(SUM(v.v=-1),0) AS down
      FROM latest p LEFT JOIN votes v ON v.post_id=p.id GROUP BY p.id ORDER BY p.id DESC`).all();
  const ids = results.map(post => post.id); // use exactly the parent snapshot above: a new post between the two SELECTs must not move the 50th parent out of the reply query
  const replies = ids.length ? (await db.prepare(`SELECT id,post_id,nick,text,created_at,edited_at FROM replies WHERE post_id IN (${ids.map(() => '?').join(',')}) ORDER BY id ASC`).bind(...ids).all()).results : [];
  const byPost = new Map();
  for (const reply of replies) { const list = byPost.get(reply.post_id) || []; list.push(reply); byPost.set(reply.post_id, list); }
  for (const post of results) {
    post.replies = byPost.get(post.id) || [];
    post.deleted = post.deleted ? 1 : 0;
    if (post.deleted) { post.nick = ''; post.text = ''; } // 결정 40(post-edit): a deleted post others replied to keeps only its place in the thread
  }
  // 결정 41(crown): the crowns of the nicknames on this page only
  const top = await crowns(db, seasonKey(now), now), worn = Object.create(null); // a nick like '__proto__' is a plain key here
  for (const r of [...results, ...replies]) { const c = r.nick && top.get(nickKey(r.nick)); if (c) worn[r.nick] = c; }
  return {rows: results, crowns: worn};
}

async function readJson(request, max = BODY_MAX) {
  const text = await request.text();
  if (text.length > max) return {status: 413, error: 'too_large'};
  try { return {body: JSON.parse(text)}; } catch (e) { return {status: 400, error: 'json'}; }
}

export async function handle(request, env, now = Date.now()) { return withCors(await route(request, env, now), request, env); }
async function route(request, env, now) {
  const url = new URL(request.url), path = url.pathname.replace(/\/+$/, '') || '/', method = request.method;
  if (method === 'OPTIONS') return new Response(null, {status: originOk(request, env) ? 204 : 403});
  const mod = await admin(request, env, url, path, method, now); if (mod) return mod; // token-only routes, before the origin gate (curl sends no Origin)
  if ((method === 'POST' || (method === 'DELETE' && (path === '/score' || path === '/post'))) && !originOk(request, env)) return json({error: 'origin'}, 403);
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
  if (path === '/replay' && method === 'GET') { // 결정 39(replay): a stored replay with its row; banned rows never serve one
    const id = Number(url.searchParams.get('id')); if (!Number.isInteger(id) || id < 1 || id > 1e12) return json({error: 'id'}, 400);
    const row = await env.DB.prepare(`SELECT r.data, s.id, s.board, s.nick, s.score, s.tie, s.detail, s.win, s.created_at FROM replays r JOIN scores s ON s.id=r.score_id
      WHERE r.score_id=? AND s.week=? AND s.nick NOT IN (${BANNED})`).bind(id, seasonKey(now)).first();
    if (!row) return json({error: 'replay'}, 404);
    const {data, ...score} = row;
    return json({ok: true, ...parseRow(score), replay: safeParse(data)});
  }
  if (path === '/submit' && method === 'POST') {
    const {body, status, error} = await readJson(request, SUBMIT_MAX); if (error) return json({error}, status);
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
    const improved = t.me.created_at === now;
    if (improved) { // the stored best changed: its replay follows it (결정 39(replay)) and the crowns may move (결정 41(crown))
      dropCrowns();
      const replay = cleanReplay(body.replay, e.board);
      const ids = await keepReplay(env.DB, e.board, season, t.me.id, replay || null, now);
      // the replay flags in the answer follow what keepReplay left, without a second ranked scan (결정 24(d1-quota))
      t.me.replay = !!replay && ids.includes(t.me.id);
      for (const r of t.rows) r.replay = r.id === t.me.id ? t.me.replay : r.replay && ids.includes(r.id);
    }
    return json({ok: true, id: t.me.id, rank: t.me.rank, improved, ...t});
  }
  if (path === '/score' && method === 'DELETE') {
    const {body, status, error} = await readJson(request); if (error) return json({error}, status);
    if (!body || typeof body !== 'object') return json({error: 'body'}, 400);
    const board = body.board; if (!boardSpec(board)) return json({error: 'board'}, 400);
    if (!cleanNick(body.nick)) return json({error: 'nick'}, 400);
    const nick = await owner(env.DB, body.nick, body.token); if (!nick) return json({error: 'auth'}, 403);
    const season = seasonKey(now);
    await env.DB.prepare('DELETE FROM replays WHERE score_id IN (SELECT id FROM scores WHERE week=? AND board=? AND nick=?)').bind(season, board, nick).run(); // 결정 39(replay)
    const r = await env.DB.prepare('DELETE FROM scores WHERE week=? AND board=? AND nick=?').bind(season, board, nick).run();
    if (r.meta.changes) dropCrowns();
    return json({ok: true, deleted: r.meta.changes || 0, ...await top(env.DB, board, season, nick)});
  }

  if (path === '/visits' && (method === 'GET' || method === 'POST')) return json(await visits(env.DB, now, method === 'POST'));

  if (path === '/posts' && method === 'GET') return json(await posts(env.DB, now));
  if (path === '/posts' && method === 'POST') {
    const {body, status, error} = await readJson(request); if (error) return json({error}, status);
    if (!body || typeof body !== 'object') return json({error: 'body'}, 400);
    if (!cleanNick(body.nick)) return json({error: 'nick'}, 400);
    const text = cleanText(body.text, TEXT_MAX); if (!text) return json({error: 'text'}, 400);
    const nick = await owner(env.DB, body.nick, body.token); if (!nick) return json({error: 'auth'}, 403);
    if (await limited(env, 'POST_LIMIT', 'post:' + ip(request))) return json({error: 'rate'}, 429);
    const ins = await env.DB.prepare('INSERT INTO posts (nick,text,created_at) VALUES (?,?,?)').bind(nick, text, now).run();
    return json({ok: true, id: ins.meta.last_row_id, ...await posts(env.DB, now)});
  }
  if (path === '/reply' && method === 'POST') {
    const {body, status, error} = await readJson(request); if (error) return json({error}, status);
    if (!body || typeof body !== 'object') return json({error: 'body'}, 400);
    const id = body.id; if (!Number.isInteger(id) || id < 1 || id > 1e12) return json({error: 'id'}, 400);
    if (!cleanNick(body.nick)) return json({error: 'nick'}, 400);
    const text = cleanText(body.text, TEXT_MAX); if (!text) return json({error: 'text'}, 400);
    const nick = await owner(env.DB, body.nick, body.token); if (!nick) return json({error: 'auth'}, 403);
    if (await limited(env, 'POST_LIMIT', 'post:' + ip(request))) return json({error: 'rate'}, 429);
    const ins = await env.DB.prepare('INSERT INTO replies (post_id,nick,text,created_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM posts WHERE id=? AND deleted=0)').bind(id, nick, text, now, id).run(); // no new replies under a deleted post (결정 40(post-edit))
    if (!(ins.meta.changes || 0)) return json({error: 'post'}, 404); // parent validation and insertion are one SQLite statement, so admin deletion cannot leave an orphan
    return json({ok: true, id: ins.meta.last_row_id, postId: id, ...await posts(env.DB, now)});
  }
  if (path === '/vote' && method === 'POST') { // idempotent "set my vote on post id to v" (1 like, -1 dislike, 0 none): one row per (post, nick), so a stale client cannot double-count
    const {body, status, error} = await readJson(request); if (error) return json({error}, status);
    if (!body || typeof body !== 'object') return json({error: 'body'}, 400);
    const id = body.id; if (!Number.isInteger(id) || id < 1 || id > 1e12) return json({error: 'id'}, 400);
    const v = body.v; if (![1, -1, 0].includes(v)) return json({error: 'v'}, 400);
    if (!cleanNick(body.nick)) return json({error: 'nick'}, 400);
    const nick = await owner(env.DB, body.nick, body.token); if (!nick) return json({error: 'auth'}, 403);
    if (await limited(env, 'VOTE_LIMIT', 'vote:' + ip(request))) return json({error: 'rate'}, 429);
    if (!await env.DB.prepare('SELECT 1 FROM posts WHERE id=? AND deleted=0').bind(id).first()) return json({error: 'post'}, 404); // a deleted placeholder takes no votes
    const key = nickKey(nick);
    if (v === 0) await env.DB.prepare('DELETE FROM votes WHERE post_id=? AND key=?').bind(id, key).run();
    else { // the post check and the write are one statement, so a delete landing between them leaves no vote behind
      const set = await env.DB.prepare('INSERT INTO votes (post_id,key,v,created_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM posts WHERE id=? AND deleted=0) ON CONFLICT(post_id,key) DO UPDATE SET v=excluded.v, created_at=excluded.created_at').bind(id, key, v, now, id).run();
      if (!(set.meta.changes || 0)) return json({error: 'post'}, 404);
    }
    return json({ok: true, id, mine: v, ...await posts(env.DB, now)});
  }
  // 결정 40(post-edit): the author edits or deletes their own post or reply (nickname + token, like posting). Edits keep the text rules and mark edited_at.
  // Deleting a reply, or a post without replies, removes the row (and the post's votes). A post with replies (anyone's, the author's own too)
  // stays as a placeholder (deleted=1, no nick/text/votes on the wire) so the replies keep their thread; the last reply leaving takes it along.
  // Each step is one statement that re-checks the thread, so a reply or vote landing between the steps cannot leave an orphan (/reply and
  // /vote only write under a live post, deleted=0).
  if ((path === '/edit' && method === 'POST') || (path === '/post' && method === 'DELETE')) {
    const {body, status, error} = await readJson(request); if (error) return json({error}, status);
    if (!body || typeof body !== 'object') return json({error: 'body'}, 400);
    const kind = body.kind; if (kind !== 'post' && kind !== 'reply') return json({error: 'kind'}, 400);
    const id = body.id; if (!Number.isInteger(id) || id < 1 || id > 1e12) return json({error: 'id'}, 400);
    if (!cleanNick(body.nick)) return json({error: 'nick'}, 400);
    const editing = method === 'POST', text = editing ? cleanText(body.text, TEXT_MAX) : null; if (editing && !text) return json({error: 'text'}, 400);
    const nick = await owner(env.DB, body.nick, body.token); if (!nick) return json({error: 'auth'}, 403);
    if (await limited(env, 'VOTE_LIMIT', 'edit:' + ip(request))) return json({error: 'rate'}, 429);
    const db = env.DB, table = kind === 'post' ? 'posts' : 'replies'; // the table name comes from this whitelist, never from the client
    const row = await db.prepare(kind === 'post' ? 'SELECT nick, deleted FROM posts WHERE id=?' : 'SELECT nick, post_id FROM replies WHERE id=?').bind(id).first();
    if (!row || row.deleted) return json({error: 'post'}, 404);
    if (nickKey(row.nick) !== nickKey(nick)) return json({error: 'owner'}, 403);
    if (editing) {
      const set = await db.prepare(`UPDATE ${table} SET text=?, edited_at=? WHERE id=?${kind === 'post' ? ' AND deleted=0' : ''}`).bind(text, now, id).run();
      if (!(set.meta.changes || 0)) return json({error: 'post'}, 404); // deleted meanwhile
    } else if (kind === 'reply') {
      await db.prepare('DELETE FROM replies WHERE id=?').bind(id).run();
      await db.prepare('DELETE FROM posts WHERE id=? AND deleted=1 AND NOT EXISTS (SELECT 1 FROM replies WHERE post_id=?)').bind(row.post_id, row.post_id).run();
    } else {
      const gone = await db.prepare('DELETE FROM posts WHERE id=? AND NOT EXISTS (SELECT 1 FROM replies WHERE post_id=?)').bind(id, id).run();
      if (!gone.meta.changes) {
        await db.prepare('UPDATE posts SET deleted=1, text=\'\', edited_at=? WHERE id=?').bind(now, id).run();
        await db.prepare('DELETE FROM posts WHERE id=? AND deleted=1 AND NOT EXISTS (SELECT 1 FROM replies WHERE post_id=?)').bind(id, id).run(); // its last reply left in between
      }
      await db.prepare('DELETE FROM votes WHERE post_id=?').bind(id).run(); // after the post stopped taking votes
    }
    return json({ok: true, id, ...await posts(db, now)});
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
    if (del[1] === 'scores') { await db.prepare('DELETE FROM replays WHERE score_id=?').bind(+del[2]).run(); dropCrowns(); } // 결정 39(replay)·41(crown)
    if (del[1] === 'posts') {
      await db.prepare('DELETE FROM votes WHERE post_id=?').bind(+del[2]).run();
      await db.prepare('DELETE FROM replies WHERE post_id=?').bind(+del[2]).run(); // a deleted post takes its reactions and replies with it
    }
    return json({ok: true, deleted});
  }
  if (path === '/ban' && method === 'GET') return json({rows: (await db.prepare('SELECT key,nick,created_at FROM bans ORDER BY created_at DESC').all()).results});
  if (path === '/ban' && method === 'POST') { // stored under the registered spelling when the key is claimed (the list shows it as players do); the filter also joins nicks by key
    const {body, status, error} = await readJson(request); if (error) return json({error}, status);
    const n = cleanNick(body && body.nick); if (!n) return json({error: 'nick'}, 400);
    const reg = await db.prepare('SELECT nick FROM nicks WHERE key=?').bind(nickKey(n)).first('nick');
    const nick = reg || n;
    await db.prepare('INSERT OR REPLACE INTO bans (key,nick,created_at) VALUES (?,?,?)').bind(nickKey(nick), nick, now).run();
    dropCrowns();
    return json({ok: true, nick, registered: !!reg});
  }
  if (path === '/ban' && method === 'DELETE') {
    const n = cleanNick(url.searchParams.get('nick')); if (!n) return json({error: 'nick'}, 400);
    const r = await db.prepare('DELETE FROM bans WHERE key=?').bind(nickKey(n)).run();
    dropCrowns();
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
    catch (e) {
      const message = String(e && e.message || e);
      if (/exceeded D1's free tier daily row (?:read|write) limit/i.test(message)) return withCors(json({error: 'quota'}, 503), request, env);
      return withCors(json({error: 'server', message}, 500), request, env);
    }
  },
};
