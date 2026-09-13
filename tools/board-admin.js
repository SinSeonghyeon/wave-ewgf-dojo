// Leaderboard moderation from the terminal (admin only).
//   node tools/board-admin.js            interactive menu (or double-click tools/admin.cmd): pick a board by number, then a row by number
//                                        and choose ban / unban / delete. Also lists posts and the ban list.
// Direct commands (same actions without the menu):
//   top <board> [week]   every row of that board's week with ids, ranks and ban marks (board: wave10 | ewgf20 | combo10 | rush30; week: any YYYY-MM-DD in that KST week)
//   ban <nick>           shadow-ban a nickname: its rows disappear from the public list/total/cut10, the owner still sees their own rank
//   unban <nick>         lift the ban; the stored rows show again
//   bans                 list banned nicknames
//   del <id>             delete one score row for good (ids from `top`)
//   delpost <id>         delete one message-board post (ids from GET /posts)
// Token: env ADMIN_TOKEN, else .sandbox/admin-token.txt (gitignored). Worker address: env BOARD_URL, else the live one below.
// No dependencies (Node 18+, global fetch). Exits 1 on any non-2xx response.
const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');

const BOARD_URL = (process.env.BOARD_URL || 'https://mishima-dojo-board.mishima-dojo.workers.dev').replace(/\/+$/, '');
const tokenFile = path.join(__dirname, '..', '.sandbox', 'admin-token.txt');
const token = (process.env.ADMIN_TOKEN || (fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, 'utf8') : '')).trim();
const [cmd, ...args] = process.argv.slice(2);
const BOARDS = [['wave10', '웨이브 10초'], ['ewgf20', '초풍 20회'], ['combo10', '웨이브 초풍 10회'], ['rush30', '더미 격파 30초']]; // worker BOARDS keys + the app's mode.<id>.name (ko); the menu is built from this list

const usage = () => { // the comment block at the top of this file is the help text
  const head = []; for (const l of fs.readFileSync(__filename, 'utf8').split('\n')) { if (!l.startsWith('//')) break; head.push(l.slice(3)); }
  console.error(head.join('\n')); process.exit(1);
};
if (!token) { console.error('관리자 토큰이 없습니다: 환경변수 ADMIN_TOKEN 또는 .sandbox/admin-token.txt'); process.exit(1); }

async function call(method, p, body) {
  const res = await fetch(BOARD_URL + p, {method, headers: {authorization: 'Bearer ' + token, ...(body ? {'content-type': 'application/json'} : {})}, body: body ? JSON.stringify(body) : undefined});
  const text = await res.text(); let j; try { j = JSON.parse(text); } catch (e) { j = {raw: text}; }
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${JSON.stringify(j)}` + (res.status === 404 ? '\n(워커가 아직 배포되지 않았을 수 있습니다: worker/README.md "순위 조작 대응")' : ''));
  return j;
}
const when = ms => { const d = new Date(ms + 9 * 3600e3); return d.toISOString().replace('T', ' ').slice(5, 16); }; // MM-DD HH:MM in KST
const width = s => [...s].reduce((n, c) => n + (c.codePointAt(0) > 0x2e7f ? 2 : 1), 0); // Hangul/CJK take two columns
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - width(s)));

// Rows of one board with the public rank the worker computed (banned rows are marked and have none). Returns the rows so the menu can index them.
async function showBoard(board, week) {
  const j = await call('GET', '/scores?board=' + encodeURIComponent(board) + (week ? '&week=' + encodeURIComponent(week) : ''));
  const name = (BOARDS.find(b => b[0] === board) || [board, board])[1];
  console.log(`\n${name} (${j.board}) · ${j.week} 주 · ${j.rows.length}행 (순위는 보이는 행 기준, BAN = 차단됨)`);
  j.rows.forEach((r, i) => console.log([String(i + 1).padStart(4) + ')', String(r.banned ? 'BAN' : r.rank + '위').padStart(5), pad(r.nick, 14), String(r.score).padStart(7), String(r.tie).padStart(7), JSON.stringify(r.detail), when(r.created_at)].join('  ')));
  if (!j.rows.length) console.log('  (기록 없음)');
  return j.rows;
}
async function showPosts() {
  const j = await call('GET', '/posts');
  console.log(`\n한마디 · 최신 ${j.rows.length}개`);
  j.rows.forEach((p, i) => console.log(String(i + 1).padStart(4) + ')', pad(p.nick, 14), when(p.created_at), p.text));
  if (!j.rows.length) console.log('  (글 없음)');
  return j.rows;
}
async function showBans() {
  const j = await call('GET', '/ban');
  console.log('\n차단 목록' + (j.rows.length ? '' : ' · 없음'));
  j.rows.forEach((b, i) => console.log(String(i + 1).padStart(4) + ')', pad(b.nick, 14), when(b.created_at)));
  return j.rows;
}
const ban = async nick => { const j = await call('POST', '/ban', {nick}); console.log(`"${j.nick}" 차단됨` + (j.registered ? '' : ' (등록되지 않은 닉네임: 이 표기 그대로 걸러짐)')); };
const unban = async nick => { const j = await call('DELETE', '/ban?nick=' + encodeURIComponent(nick)); console.log(j.deleted ? `"${nick}" 차단 해제됨` : `"${nick}"은(는) 차단돼 있지 않았음`); };
const delScore = async id => { const j = await call('DELETE', '/scores/' + id); console.log(j.deleted ? `기록 ${id} 삭제됨` : `기록 ${id} 없음`); };
const delPost = async id => { const j = await call('DELETE', '/posts/' + id); console.log(j.deleted ? `글 ${id} 삭제됨` : `글 ${id} 없음`); };

// Interactive menu: numbers only, every screen prints what the numbers mean, destructive steps ask once more. A failed request
// (deploy race, network) prints its error and returns to the menu instead of ending the session.
async function menu() {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  // Own line queue instead of rl.question(): lines that arrive while no question is pending (pasted or piped input) are kept, not dropped.
  const lines = [], waiting = []; let closed = false;
  rl.on('line', l => waiting.length ? waiting.shift()(l) : lines.push(l));
  rl.on('close', () => { closed = true; while (waiting.length) waiting.shift()(''); });
  const ask = async q => {
    if (lines.length) { const l = lines.shift(); process.stdout.write(q + (process.stdin.isTTY ? '' : l + '\n')); return l.trim(); }
    if (closed) { process.stdout.write(q); return ''; }
    rl.setPrompt(q); rl.prompt(); // readline owns the prompt, so its redraw on Backspace/arrow keys keeps the question instead of wiping it
    return (await new Promise(r => waiting.push(r))).trim();
  };
  const attempt = async f => { try { return await f(); } catch (e) { console.error(e.message || e); return null; } };
  const pick = async (rows, q) => { const n = await ask(q); return /^\d+$/.test(n) && +n >= 1 && +n <= rows.length ? rows[+n - 1] : null; }; // Enter or anything else = back
  const confirm = async q => { if ((await ask(q + ' y 입력: ')) === 'y') return true; console.log('취소'); return false; };
  const POSTS_N = String(BOARDS.length + 1), BANS_N = String(BOARDS.length + 2);
  const mainMenu = BOARDS.map((b, i) => `[${i + 1}] ${b[1]}`).join('  ') + `  [${POSTS_N}] 한마디  [${BANS_N}] 차단 목록  [0] 종료`;
  console.log(`미시마 도장 순위 관리 · ${BOARD_URL}`);
  try {
    for (;;) {
      console.log('\n' + mainMenu);
      const c = await ask('번호: ');
      if (c === '0' || c === '') break;
      const board = /^\d+$/.test(c) ? BOARDS[+c - 1] : undefined;
      if (board) {
        for (;;) {
          const rows = await attempt(() => showBoard(board[0])); if (!rows) break;
          const r = await pick(rows, '\n행 번호를 고르면 그 닉네임을 처리합니다 (Enter = 뒤로): '); if (!r) break;
          console.log(`\n"${r.nick}" (${r.score} / ${r.tie}, ${r.banned ? '차단됨' : '차단 아님'})`);
          const a = await ask('[1] 차단 (섀도 밴)  [2] 차단 해제  [3] 이 기록만 삭제  [Enter] 취소 → ');
          if (a === '1') await attempt(() => ban(r.nick));
          else if (a === '2') await attempt(() => unban(r.nick));
          else if (a === '3' && await confirm(`기록 ${r.id} ("${r.nick}" ${r.score})을 영구 삭제합니다.`)) await attempt(() => delScore(r.id));
        }
      } else if (c === POSTS_N) {
        const rows = await attempt(showPosts); if (!rows) continue;
        const p = await pick(rows, '\n지울 글 번호 (Enter = 뒤로): ');
        if (p && await confirm(`"${p.nick}: ${p.text}" 삭제합니다.`)) await attempt(() => delPost(p.id));
      } else if (c === BANS_N) {
        const rows = await attempt(showBans); if (!rows) continue;
        const b = await pick(rows, '\n해제할 번호 (Enter = 뒤로): ');
        if (b) await attempt(() => unban(b.nick));
      }
    }
  } finally { rl.close(); }
}

(async () => {
  if (!cmd) return menu();
  if (cmd === 'top') { const [board, week] = args; if (!board) usage(); await showBoard(board, week); }
  else if (cmd === 'ban') { const nick = args.join(' '); if (!nick) usage(); await ban(nick); }
  else if (cmd === 'unban') { const nick = args.join(' '); if (!nick) usage(); await unban(nick); }
  else if (cmd === 'bans') await showBans();
  else if (cmd === 'del' || cmd === 'delpost') { const id = args[0]; if (!/^\d+$/.test(id || '')) usage(); await (cmd === 'del' ? delScore : delPost)(id); }
  else usage();
})().catch(e => { console.error(e.message || e); process.exitCode = 1; }); // no process.exit() after fetch: Node on Windows can abort in libuv while a socket is closing
