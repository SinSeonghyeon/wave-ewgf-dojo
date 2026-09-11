// Browser smoke test: node tests/smoke-chrome.js
// Launches headless Chrome over CDP (tools/cdp.js, no npm deps), loads index.html, feeds a 6N23+2 via keyboard,
// switches ko/en/ja, runs a wave10 drill in ja, opens the share card, submits the result to the weekly leaderboard
// (the real worker/index.js handler served over local http with tests/fake-d1.js), and fails if any JS error was logged.
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const {pathToFileURL} = require('url');
const {launch, fileUrl, sleep} = require('../tools/cdp');
const fakeD1 = require('./fake-d1');

// Wrap the Cloudflare Worker handler in a plain http server so the browser talks to the real code path (CORS included).
async function serveWorker(db){
  const worker = await import(pathToFileURL(path.join(__dirname,'../worker/index.js')).href);
  const srv = http.createServer(async (req, res) => {
    try{
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = ['GET','HEAD','OPTIONS'].includes(req.method) ? undefined : Buffer.concat(chunks);
      const out = await worker.default.fetch(new Request('http://127.0.0.1'+req.url, {method:req.method, headers:req.headers, body}), {DB:db});
      res.writeHead(out.status, Object.fromEntries(out.headers)); res.end(Buffer.from(await out.arrayBuffer()));
    }catch(e){ res.writeHead(500); res.end(String(e)); }
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return {srv, url:'http://127.0.0.1:'+srv.address().port};
}

let dir; const rmTmp = () => { if(dir) try{ fs.rmSync(dir,{recursive:true,force:true}); }catch(e){} };
(async () => {
  const db = fakeD1();
  const {srv, url:boardUrl} = await serveWorker(db);
  // Point a scratch copy of the app at the local worker (BOARD_URL is a const in the shipped file; the copy is never committed).
  const src = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  if(!/const BOARD_URL = '[^']*';/.test(src)) throw new Error('BOARD_URL constant not found in index.html');
  dir = fs.mkdtempSync(path.join(os.tmpdir(),'dojo-smoke-')); const page = path.join(dir,'index.html');
  fs.writeFileSync(page, src.replace(/const BOARD_URL = '[^']*';/, `const BOARD_URL = '${boardUrl}';`));
  const b = await launch({port:9333, profile:'dojo-smoke-profile'});
  const {send, evalJs, errors} = b;
  await b.navigate(fileUrl(page));
  const out = {};
  const snap = async () => evalJs(`(() => {
    const q=s=>document.querySelector(s); const css=getComputedStyle(document.documentElement);
    return {lang:document.documentElement.lang, title:document.title, h1:q('h1').textContent, tag:q('.brand p').textContent,
      modes:[...document.querySelectorAll('#modes button')].map(b=>b.textContent), hint:q('#hudHint').textContent, dName:q('#dName').textContent,
      rTitle:q('#rTitle').textContent, coach:q('#coachMsg').textContent.slice(0,40), more:q('#setSummary').getAttribute('data-more'),
      pad:q('#padStatus').textContent, empty:q('#logBody').textContent, seg:[...q('#segBar').children].map(e=>e.textContent),
      display:css.getPropertyValue('--display').trim(), bests:q('#bests').textContent.slice(0,80), footer:q('footer').textContent.slice(0,40),
      histEmpty:q('#hist svg text:last-of-type')?.textContent, waveTop:q('#waveChart svg text')?.textContent, keyBtn:q('#keys .key b')?.textContent,
      langPressed:[...document.querySelectorAll('#langSel button')].map(b=>b.getAttribute('aria-pressed')).join('')};
  })()`);
  out.initial = await snap();
  // simulate a few inputs via keyboard events to populate result/coach/log, then switch languages
  const key = async (code, type='keydown') => send('Input.dispatchKeyEvent',{type: type==='keydown'?'keyDown':'keyUp', code, key: code.replace('Key','').toLowerCase(), windowsVirtualKeyCode: code.charCodeAt(code.length-1)});
  const tap = async (code, hold=20) => { await key(code); await sleep(hold); await key(code,'keyup'); };
  await tap('KeyD',20); await sleep(20); await key('KeyS'); await sleep(20); await key('KeyD'); await sleep(5); await key('KeyI'); await sleep(20); await key('KeyI','keyup'); await key('KeyD','keyup'); await key('KeyS','keyup'); await sleep(300);
  out.afterInput = await snap();
  for(const l of ['en','ja','ko']){
    await evalJs(`document.querySelector('#langSel button[data-lang="${l}"]').click()`); await sleep(200);
    out[l] = await snap();
    out[l].stored = await evalJs(`JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).lang`);
  }
  // drill flow in ja: wave10 start → wait → end record text
  await evalJs(`document.querySelector('#langSel button[data-lang="ja"]').click()`);
  await evalJs(`document.querySelector('#modes button[data-mode="wave10"]').click(); document.querySelector('#dStart').click()`);
  await sleep(3300); await tap('KeyD'); await sleep(20); await key('KeyS'); await sleep(20); await key('KeyD'); await sleep(30); await key('KeyS','keyup'); await key('KeyD','keyup'); await sleep(200);
  out.drillJa = await evalJs(`({prog:document.querySelector('#dProg').textContent, dName:document.querySelector('#dName').textContent, hint:document.querySelector('#hudHint').textContent})`);
  // share card: wait for the 10s drill to end, open the card, try copy (must not throw even where the clipboard is unavailable), close
  for(let i=0;i<40;i++){ if(!(await evalJs(`document.querySelector('#dShare').hidden`))) break; await sleep(300); }
  out.drillEnd = await evalJs(`({prog:document.querySelector('#dProg').textContent, shareHidden:document.querySelector('#dShare').hidden, shareLabel:document.querySelector('#dShare').textContent})`);
  await evalJs(`document.querySelector('#dShare').click()`); await sleep(800);
  out.card = await evalJs(`(() => { const c=document.querySelector('#shareCanvas'); const d=document.querySelector('#shareDlg');
    return {open:d.open, w:c.width, h:c.height, png:c.toDataURL('image/png').slice(0,22), title:d.querySelector('h2').textContent, buttons:[...d.querySelectorAll('button')].map(b=>b.textContent)}; })()`);
  await evalJs(`document.querySelector('#shareCopy').click()`); await sleep(600);
  out.card.copyMsg = await evalJs(`document.querySelector('#shareMsg').textContent`);
  await evalJs(`document.querySelector('#langSel button[data-lang="en"]').click()`); await sleep(400);
  out.card.copyMsgEn = await evalJs(`document.querySelector('#shareMsg').textContent`);
  await evalJs(`document.querySelector('#shareClose').click()`); await sleep(100);
  out.card.closed = !(await evalJs(`document.querySelector('#shareDlg').open`));
  if(!out.card.open || out.card.w!==1200 || out.card.h!==630 || !out.card.png.startsWith('data:image/png;base64') || out.drillEnd.shareHidden) errors.push('share card check failed: '+JSON.stringify(out.card));
  // weekly leaderboard (UI is in en here): open on the finished wave10 result → submit with a nickname → my row highlighted → other board empty → ko re-render → close
  await evalJs(`document.querySelector('#dBoard').click()`); await sleep(800);
  out.board = await evalJs(`(() => { const q=s=>document.querySelector(s); return {open:q('#boardDlg').open, btnHidden:q('#dBoard').hidden, title:q('#boardTitle').textContent, week:q('#boardWeek').textContent,
    formHidden:q('#boardForm').hidden, my:q('#boardMyScore').textContent, hint:q('#boardMyHint').textContent, empty:q('#boardList .empty')?.textContent, msg:q('#boardMsg').textContent,
    tabs:[...document.querySelectorAll('#boardTabs button')].map(b=>b.textContent+':'+b.getAttribute('aria-pressed'))}; })()`);
  await evalJs(`document.querySelector('#boardNick').value='스모크 테스트'; document.querySelector('#boardSubmit').click()`); await sleep(1000);
  out.board.afterSubmit = await evalJs(`({msg:document.querySelector('#boardMsg').textContent, formHidden:document.querySelector('#boardForm').hidden, week:document.querySelector('#boardWeek').textContent,
    rows:[...document.querySelectorAll('#boardList tbody tr')].map(r=>[...r.children].map(c=>c.textContent)), me:!!document.querySelector('#boardList tr.me')})`);
  await evalJs(`document.querySelector('#boardTabs button[data-board="ewgf20"]').click()`); await sleep(800);
  out.board.ewgfTab = await evalJs(`({empty:document.querySelector('#boardList .empty')?.textContent, formHidden:document.querySelector('#boardForm').hidden, pressed:document.querySelector('#boardTabs button[data-board="ewgf20"]').getAttribute('aria-pressed')})`);
  await evalJs(`document.querySelector('#langSel button[data-lang="ko"]').click()`); await sleep(300);
  out.board.ko = await evalJs(`({title:document.querySelector('#boardTitle').textContent, empty:document.querySelector('#boardList .empty')?.textContent, week:document.querySelector('#boardWeek').textContent})`);
  await evalJs(`document.querySelector('#boardClose').click()`); await sleep(100);
  out.board.closed = !(await evalJs(`document.querySelector('#boardDlg').open`));
  out.board.stored = db.rows.map(r => ({board:r.board, nick:r.nick, score:r.score, tie:r.tie, win:r.win, week:r.week}));
  const bd = out.board, sub = bd.afterSubmit;
  if(!bd.open || bd.btnHidden || bd.formHidden || !bd.empty || !bd.my || !/^\d+\/\d+ – \d+\/\d+ \(KST\)/.test(bd.week)) errors.push('leaderboard open check failed: '+JSON.stringify(bd));
  if(!sub || !sub.formHidden || !sub.me || sub.rows.length!==1 || sub.rows[0][1]!=='스모크 테스트' || sub.rows[0][0]!=='1' || !/rank 1 of 1/.test(sub.msg) || !/1 entries/.test(sub.week)) errors.push('leaderboard submit check failed: '+JSON.stringify(sub));
  if(!bd.ewgfTab.empty || bd.ewgfTab.formHidden!==true || bd.ewgfTab.pressed!=='true' || bd.ko.title!=='주간 순위' || !/아직 없습니다/.test(bd.ko.empty||'') || !bd.closed) errors.push('leaderboard tab/lang check failed: '+JSON.stringify(bd));
  if(bd.stored.length!==1 || bd.stored[0].board!=='wave10' || bd.stored[0].nick!=='스모크 테스트' || bd.stored[0].win!==12) errors.push('leaderboard storage check failed: '+JSON.stringify(bd.stored));
  for(const s of JSON.stringify(bd).match(/\b(board|mode|share|rec)\.[a-zA-Z]+/g)||[]) errors.push('raw i18n key leaked into leaderboard UI: '+s);
  out.errors = errors;
  console.log(JSON.stringify(out,null,1));
  b.close(); srv.close(); rmTmp();
  if(errors.length){ console.error('JS ERRORS:', errors); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error('FAIL', e); rmTmp(); process.exit(1); });
