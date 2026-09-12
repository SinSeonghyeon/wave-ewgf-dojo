// Browser smoke test: node tests/smoke-chrome.js
// Launches headless Chrome over CDP (tools/cdp.js, no npm deps), loads index.html, feeds a 6N23+2 via keyboard,
// switches ko/en/ja, runs a wave10 trial in ja, opens the share card, then exercises the backend UI against the real worker/index.js
// handler served over local http with tests/fake-d1.js (first-run nickname gate incl. a taken name, auto-submit + result card with the
// tier banner after each trial, shoutbox post, nickname change, visit counter, ko re-render) and fails if any JS error was logged.
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
  { const w = await import(pathToFileURL(path.join(__dirname,'../worker/index.js')).href); // '점유됨' already belongs to someone else
    const r = await w.handle(new Request('http://x/nick', {method:'POST', body:JSON.stringify({nick:'점유됨'})}), {DB:db}); if(r.status!==200) throw new Error('seed nick failed'); }
  // Point a scratch copy of the app at the local worker (BOARD_URL is a const in the shipped file; the copy is never committed).
  const src = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  if(!/const BOARD_URL = '[^']*';/.test(src)) throw new Error('BOARD_URL constant not found in index.html');
  dir = fs.mkdtempSync(path.join(os.tmpdir(),'dojo-smoke-')); const page = path.join(dir,'index.html');
  fs.writeFileSync(page, src.replace(/const BOARD_URL = '[^']*';/, `const BOARD_URL = '${boardUrl}';`));
  for(const f of ['bgm.mp3','sfx-wave.mp3','sfx-ewgf.mp3']) fs.copyFileSync(path.join(__dirname,'..',f), path.join(dir,f)); // the scratch page plays real media; a missing file logs a resource error and fails the run
  const b = await launch({port:9333, profile:'dojo-smoke-profile'});
  const {send, evalJs, errors} = b;
  await b.navigate(fileUrl(page));
  const out = {};
  const snap = async () => evalJs(`(() => {
    const q=s=>document.querySelector(s); const css=getComputedStyle(document.documentElement);
    return {lang:document.documentElement.lang, title:document.title, h1:q('h1').textContent, tag:q('.brand p').textContent,
      modes:[...document.querySelectorAll('#modes button')].map(b=>b.textContent), hint:q('#hudHint').textContent, dName:q('#dName').textContent,
      rTitle:q('#rTitle').textContent, coach:q('#coachMsg').textContent.slice(0,40), setGear:!!q('#setOpen'), setOpen:q('#setDlg').open,
      pad:q('#padStatus').textContent, empty:q('#logBody').textContent, seg:[...q('#segBar').children].map(e=>e.textContent),
      display:css.getPropertyValue('--display').trim(), bests:q('#bests').textContent.slice(0,80), footer:q('footer').textContent.slice(0,40),
      histEmpty:q('#hist svg text:last-of-type')?.textContent, waveTop:q('#waveChart svg text')?.textContent, keyBtn:q('#keys .key b')?.textContent,
      langPressed:[...document.querySelectorAll('#langSel button')].map(b=>b.getAttribute('aria-pressed')).join('')};
  })()`);
  out.initial = await snap();
  const key = async (code, type='keydown') => send('Input.dispatchKeyEvent',{type: type==='keydown'?'keyDown':'keyUp', code, key: code.replace('Key','').toLowerCase(), windowsVirtualKeyCode: code.charCodeAt(code.length-1)});
  const tap = async (code, hold=20) => { await key(code); await sleep(hold); await key(code,'keyup'); };
  const q = s => `document.querySelector('${s}')`;
  // nickname gate (first visit): modal open, game keys ignored while it is up, Escape does not close it, a taken name is refused, a free one starts the app
  out.gate = {open:await evalJs(`${q('#nickDlg')}.open`), closeHidden:await evalJs(`${q('#nickClose')}.hidden`), laterHidden:await evalJs(`${q('#nickLater')}.hidden`), btn:await evalJs(`({hidden:${q('#nickBtn')}.hidden, text:${q('#nickBtn')}.textContent})`)};
  await tap('KeyD',20); await sleep(150); out.gate.inputsWhileOpen = await evalJs(`document.querySelectorAll('#inputs .chip').length`);
  await send('Input.dispatchKeyEvent',{type:'keyDown', code:'Escape', key:'Escape', windowsVirtualKeyCode:27}); await send('Input.dispatchKeyEvent',{type:'keyUp', code:'Escape', key:'Escape', windowsVirtualKeyCode:27}); await sleep(150);
  out.gate.afterEscape = await evalJs(`${q('#nickDlg')}.open`);
  await evalJs(`${q('#nickInput')}.value='a'; ${q('#nickSubmit')}.click()`); await sleep(150); out.gate.short = await evalJs(`${q('#nickMsg')}.textContent`);
  await evalJs(`${q('#nickInput')}.value=' 점유됨 '; ${q('#nickSubmit')}.click()`); await sleep(800); out.gate.taken = await evalJs(`({msg:${q('#nickMsg')}.textContent, open:${q('#nickDlg')}.open})`);
  await evalJs(`${q('#nickInput')}.value='스모크 테스트'; ${q('#nickSubmit')}.click()`); await sleep(800);
  out.gate.after = await evalJs(`({open:${q('#nickDlg')}.open, btn:${q('#nickBtn')}.textContent, postNick:${q('#postNickLabel')}.textContent, stored:(s=>({nick:s.nick, token:s.nickToken}))(JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')))})`);
  { const i = errors.findIndex(e => /status of 409/.test(e)); if(i>=0) errors.splice(i,1); } // Chrome logs the intentional 'taken' 409 as a resource error
  if(!out.gate.open || !out.gate.closeHidden || !out.gate.laterHidden || out.gate.btn.hidden || !out.gate.btn.text || /·/.test(out.gate.btn.text) || out.gate.inputsWhileOpen!==0 || !out.gate.afterEscape || !out.gate.short || !out.gate.taken.msg || out.gate.taken.msg===out.gate.short || !out.gate.taken.open
     || out.gate.after.open || !/스모크 테스트/.test(out.gate.after.btn) || out.gate.after.postNick!=='스모크 테스트' || out.gate.after.stored.nick!=='스모크 테스트' || !/^[0-9a-f]{48}$/.test(out.gate.after.stored.token)) errors.push('nickname gate check failed: '+JSON.stringify(out.gate));
  // simulate a few inputs via keyboard events to populate result/coach/log, then switch languages
  await tap('KeyD',20); await sleep(20); await key('KeyS'); await sleep(20); await key('KeyD'); await sleep(5); await key('KeyI'); await sleep(20); await key('KeyI','keyup'); await key('KeyD','keyup'); await key('KeyS','keyup'); await sleep(300);
  out.afterInput = await snap();
  // sound settings: the key events above were the unlocking gesture. Toggle off → slider → back on → one more EWGF with sound enabled (play() rejections would surface in errors)
  const soundSnap = () => evalJs(`(() => { const q=s=>document.querySelector(s); const st=JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')); return {on:q('#soundSel button[aria-pressed=\"true\"]').dataset.sound, bgm:q('#bgmVol').value, sfx:q('#sfxVol').value, out:q('#sfxVolOut').textContent, disabled:q('#sfxVol').disabled, stSound:st.sound, stSfx:st.sfxVol}; })()`);
  out.sound = {initial: await soundSnap()};
  // settings dialog: gear on the stage opens it (game input paused), close button closes it
  await evalJs(`document.querySelector('#setOpen').click()`); await sleep(150);
  out.sound.dlgOpen = await evalJs(`document.querySelector('#setDlg').open`);
  await tap('KeyD',20); await sleep(100); out.sound.pausedWhileOpen = await evalJs(`document.querySelector('#rTitle').textContent`);
  await evalJs(`document.querySelector('#setClose').click()`); await sleep(100);
  out.sound.dlgClosed = !(await evalJs(`document.querySelector('#setDlg').open`));
  if(!out.sound.dlgOpen || !out.sound.dlgClosed) errors.push('settings dialog check failed: '+JSON.stringify(out.sound));
  await evalJs(`document.querySelector('#soundSel button[data-sound=\"0\"]').click()`); await sleep(100);
  await evalJs(`const s=document.querySelector('#sfxVol'); s.value=30; s.dispatchEvent(new Event('input')); s.dispatchEvent(new Event('change'))`); await sleep(100);
  out.sound.off = await soundSnap();
  await evalJs(`document.querySelector('#soundSel button[data-sound=\"1\"]').click()`); await sleep(100);
  await tap('KeyD',20); await sleep(20); await key('KeyS'); await sleep(20); await key('KeyD'); await sleep(5); await key('KeyI'); await sleep(20); await key('KeyI','keyup'); await key('KeyD','keyup'); await key('KeyS','keyup'); await sleep(400);
  out.sound.on = await soundSnap();
  // f,N,f double tap → dash visual in a real browser (no judging change)
  await tap('KeyD',20); await sleep(40); await tap('KeyD',20); await sleep(100);
  out.dash = await evalJs(`document.querySelector('#rTitle').textContent`);
  if(out.sound.off.on!=='0' || out.sound.off.stSound!==0 || out.sound.off.stSfx!==30 || !out.sound.off.disabled || out.sound.on.on!=='1' || out.sound.on.disabled) errors.push('sound settings check failed: '+JSON.stringify(out.sound));
  for(const l of ['en','ja','ko']){
    await evalJs(`document.querySelector('#langSel button[data-lang="${l}"]').click()`); await sleep(200);
    out[l] = await snap();
    out[l].stored = await evalJs(`JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).lang`);
  }
  // trial flow in ja: wave10 start → wait → end record text
  await evalJs(`document.querySelector('#langSel button[data-lang="ja"]').click()`);
  await evalJs(`document.querySelector('#modes button[data-mode="wave10"]').click(); document.querySelector('#dStart').click()`);
  await sleep(3300); await tap('KeyD'); await sleep(20); await key('KeyS'); await sleep(20); await key('KeyD'); await sleep(30); await key('KeyS','keyup'); await key('KeyD','keyup'); await sleep(200);
  out.trialJa = await evalJs(`({prog:document.querySelector('#dProg').textContent, dName:document.querySelector('#dName').textContent, hint:document.querySelector('#hudHint').textContent})`);
  // share card: wait for the 10s trial to end, open the card, try copy (must not throw even where the clipboard is unavailable), close
  for(let i=0;i<40;i++){ if(!(await evalJs(`document.querySelector('#dShare').hidden`))) break; await sleep(300); }
  for(let i=0;i<20;i++){ if(/位|rank|위/.test(await evalJs(`${q('#dRank')}.textContent`)) && await evalJs(`${q('#shareDlg')}.open`)) break; await sleep(300); } await sleep(400);
  out.trialEnd = await evalJs(`({prog:document.querySelector('#dProg').textContent, shareHidden:document.querySelector('#dShare').hidden, shareLabel:document.querySelector('#dShare').textContent, rank:${q('#dRank')}.textContent,
    autoOpen:${q('#shareDlg')}.open, banner:{hidden:${q('#shareRank')}.hidden, cls:${q('#shareRank')}.className, tier:${q('#shareTier')}.textContent, line:${q('#shareRankLine')}.textContent, msg:${q('#shareTierMsg')}.textContent}})`);
  if(!/登録完了 · 1位 \/ 1人 · 上位 100%/.test(out.trialEnd.rank) || !out.trialEnd.autoOpen || out.trialEnd.banner.hidden || out.trialEnd.banner.cls!=='share-rank t2' || out.trialEnd.banner.tier!=='上級' || !/1位 \/ 1人/.test(out.trialEnd.banner.line) || !out.trialEnd.banner.msg) errors.push('trial end auto-submit/result card check failed: '+JSON.stringify(out.trialEnd));
  await evalJs(`document.querySelector('#dShare').click()`); await sleep(800);
  out.card = await evalJs(`(() => { const c=document.querySelector('#shareCanvas'); const d=document.querySelector('#shareDlg');
    return {open:d.open, w:c.width, h:c.height, png:c.toDataURL('image/png').slice(0,22), title:d.querySelector('h2').textContent, buttons:[...d.querySelectorAll('button')].map(b=>b.textContent)}; })()`);
  await evalJs(`document.querySelector('#shareCopy').click()`); await sleep(600);
  out.card.copyMsg = await evalJs(`document.querySelector('#shareMsg').textContent`);
  await evalJs(`document.querySelector('#langSel button[data-lang="en"]').click()`); await sleep(400);
  out.card.copyMsgEn = await evalJs(`document.querySelector('#shareMsg').textContent`);
  await evalJs(`document.querySelector('#shareClose').click()`); await sleep(100);
  out.card.closed = !(await evalJs(`document.querySelector('#shareDlg').open`));
  if(!out.card.open || out.card.w!==1200 || out.card.h!==630 || !out.card.png.startsWith('data:image/png;base64') || out.trialEnd.shareHidden) errors.push('share card check failed: '+JSON.stringify(out.card));
  // backend (UI is in en here): the first trial was auto-submitted at the gate nickname → my row on the always-visible board card
  out.board = await evalJs(`(() => { const q=s=>document.querySelector(s); return {cardHidden:q('#boardCard').hidden, postsHidden:q('#postsCard').hidden, rank:q('#dRank').textContent, retryHidden:q('#dRankRetry').hidden,
    week:q('#boardWeek').textContent, me:q('#boardMe').textContent, visits:q('#visits').textContent, rows:[...document.querySelectorAll('#boardList tbody tr')].map(r=>[...r.children].map(c=>c.textContent)), meRow:!!q('#boardList tr.me'),
    tabs:[...document.querySelectorAll('#boardTabs button')].map(b=>b.textContent+':'+b.getAttribute('aria-pressed'))}; })()`);
  // second trial: submitted automatically again, 0 dashes → the stored best stands; the result card reopens with the "kept" line
  await evalJs(`${q('#dStart')}.click()`); await sleep(3300);
  out.board.auto = {during:await evalJs(`({rank:${q('#dRank')}.textContent, open:${q('#shareDlg')}.open})`)};
  for(let i=0;i<40;i++){ if(/rank/.test(await evalJs(`${q('#dRank')}.textContent`)) && await evalJs(`${q('#shareDlg')}.open`)) break; await sleep(300); }
  await sleep(400);
  out.board.auto.after = await evalJs(`({rank:${q('#dRank')}.textContent, me:${q('#boardMe')}.textContent, rows:document.querySelectorAll('#boardList tbody tr').length, open:${q('#shareDlg')}.open, line:${q('#shareRankLine')}.textContent, tier:${q('#shareTier')}.textContent})`);
  await evalJs(`${q('#shareClose')}.click()`); await sleep(100);
  await evalJs(`${q('#boardTabs button[data-board="ewgf20"]')}.click()`); await sleep(800);
  out.board.ewgfTab = await evalJs(`({empty:${q('#boardList .empty')}?.textContent, me:${q('#boardMe')}.textContent, pressed:${q('#boardTabs button[data-board="ewgf20"]')}.getAttribute('aria-pressed')})`);
  // shoutbox: empty → post one line under the claimed nickname → shows; change the nickname through the header button → label follows
  out.posts = {empty:await evalJs(`${q('#postList .empty')}?.textContent`)};
  await evalJs(`${q('#postText')}.value='  스모크   테스트 글 '; ${q('#postSend')}.click()`); await sleep(1000);
  out.posts.after = await evalJs(`({msg:${q('#postMsg')}.textContent, text:${q('#postText')}.value, items:[...document.querySelectorAll('#postList .post')].map(p=>[p.querySelector('b').textContent, p.querySelector('p').textContent])})`);
  await evalJs(`${q('#nickBtn')}.click()`); await sleep(150);
  out.nick2 = {open:await evalJs(`${q('#nickDlg')}.open`), closeHidden:await evalJs(`${q('#nickClose')}.hidden`), prefilled:await evalJs(`${q('#nickInput')}.value`)};
  await evalJs(`${q('#nickInput')}.value='스모크2'; ${q('#nickSubmit')}.click()`); await sleep(800);
  out.nick2.after = await evalJs(`({open:${q('#nickDlg')}.open, btn:${q('#nickBtn')}.textContent, postNick:${q('#postNickLabel')}.textContent, me:${q('#boardMe')}.textContent})`);
  await evalJs(`${q('#langSel button[data-lang="ko"]')}.click()`); await sleep(300);
  out.ko2 = await evalJs(`({title:${q('#boardCard h2')}.textContent, empty:${q('#boardList .empty')}?.textContent, me:${q('#boardMe')}.textContent, rank:${q('#dRank')}.textContent, visits:${q('#visits')}.textContent, postsTitle:${q('#postsCard h2')}.textContent, nickBtn:${q('#nickBtn')}.textContent})`);
  out.db = {scores:db.rows.map(r => ({board:r.board, nick:r.nick, score:r.score, tie:r.tie, win:r.win, week:r.week})), posts:db.posts.map(p => [p.nick, p.text]), visits:db.visits, nicks:db.db.prepare('SELECT key,nick FROM nicks ORDER BY key').all().map(r => [r.key, r.nick])};
  const bd = out.board, auto = bd.auto;
  if(bd.cardHidden || bd.postsHidden || !/rank 1 of 1 · top 100%/.test(bd.rank) || !bd.retryHidden || !/^\d+\/\d+ – \d+\/\d+ \(KST\)/.test(bd.week) || !/1 entries/.test(bd.week) || !/rank 1 of 1 · top 100%/.test(bd.me) || !bd.meRow || bd.rows.length!==1 || bd.rows[0][1]!=='스모크 테스트' || bd.rows[0][0]!=='1' || !/^Today 1 · total 1 visits$/.test(bd.visits)) errors.push('leaderboard check failed: '+JSON.stringify(bd));
  if(!auto || auto.during.rank!=='' || auto.during.open || !/best stands · rank 1 of 1/.test(auto.after.rank) || auto.after.rows!==1 || !auto.after.open || !/best stands/.test(auto.after.line) || auto.after.tier!=='Expert') errors.push('leaderboard auto-submit check failed: '+JSON.stringify(auto));
  if(!bd.ewgfTab.empty || !/No entry from you/.test(bd.ewgfTab.me) || bd.ewgfTab.pressed!=='true') errors.push('leaderboard tab check failed: '+JSON.stringify(bd.ewgfTab));
  if(!out.posts.empty || out.posts.after.msg!=='' || out.posts.after.text!=='' || JSON.stringify(out.posts.after.items)!==JSON.stringify([['스모크 테스트','스모크 테스트 글']])) errors.push('shoutbox check failed: '+JSON.stringify(out.posts));
  if(!out.nick2.open || out.nick2.closeHidden || out.nick2.prefilled!=='스모크 테스트' || out.nick2.after.open || !/스모크2/.test(out.nick2.after.btn) || out.nick2.after.postNick!=='스모크2' || !/No entry from you/.test(out.nick2.after.me)) errors.push('nickname change check failed: '+JSON.stringify(out.nick2));
  if(out.ko2.title!=='주간 순위' || !/아직 없습니다/.test(out.ko2.empty||'') || !/등록한 기록이 없습니다/.test(out.ko2.me) || !/최고 기록 유지 · 1위 \/ 1명 · 상위 100%/.test(out.ko2.rank) || !/^오늘 방문 1 · 누적 1$/.test(out.ko2.visits) || out.ko2.postsTitle!=='한마디' || out.ko2.nickBtn!=='닉네임 · 스모크2') errors.push('backend ko re-render check failed: '+JSON.stringify(out.ko2));
  if(out.db.scores.length!==1 || out.db.scores[0].board!=='wave10' || out.db.scores[0].nick!=='스모크 테스트' || out.db.scores[0].win!==12 || JSON.stringify(out.db.posts)!==JSON.stringify([['스모크 테스트','스모크 테스트 글']]) || out.db.visits.length!==1 || out.db.visits[0].n!==1
     || JSON.stringify(out.db.nicks)!==JSON.stringify([['스모크 테스트','스모크 테스트'],['스모크2','스모크2'],['점유됨','점유됨']])) errors.push('backend storage check failed: '+JSON.stringify(out.db));
  for(const s of JSON.stringify([out.gate, bd, out.posts, out.nick2, out.ko2, out.trialEnd]).match(/\b(board|mode|share|rec|posts|nick|tier)\.[a-zA-Z0-9.]+/g)||[]) errors.push('raw i18n key leaked into backend UI: '+s);
  out.errors = errors;
  console.log(JSON.stringify(out,null,1));
  b.close(); srv.close(); rmTmp();
  if(errors.length){ console.error('JS ERRORS:', errors); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error('FAIL', e); rmTmp(); process.exit(1); });
