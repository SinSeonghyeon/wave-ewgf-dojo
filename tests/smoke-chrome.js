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
      const out = await worker.default.fetch(new Request('http://127.0.0.1'+req.url, {method:req.method, headers:req.headers, body}), {DB:db, ALLOWED_ORIGINS:'null'}); // file:// pages send Origin: null
      res.writeHead(out.status, Object.fromEntries(out.headers)); res.end(Buffer.from(await out.arrayBuffer()));
    }catch(e){ res.writeHead(500); res.end(String(e)); }
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return {srv, url:'http://127.0.0.1:'+srv.address().port};
}

let dir, browser, server; const rmTmp = () => { if(dir) try{ fs.rmSync(dir,{recursive:true,force:true}); }catch(e){} };
(async () => {
  console.log('Smoke: preparing local backend and browser');
  const db = fakeD1();
  const {srv, url:boardUrl} = await serveWorker(db);
  server = srv;
  { const w = await import(pathToFileURL(path.join(__dirname,'../worker/index.js')).href); // '점유됨' already belongs to someone else
    const r = await w.handle(new Request('http://x/nick', {method:'POST', body:JSON.stringify({nick:'점유됨'})}), {DB:db, ALLOWED_ORIGINS:'*'}); if(r.status!==200) throw new Error('seed nick failed'); }
  // Point a scratch copy of the app at the local worker (BOARD_URL is a const in the shipped file; the copy is never committed).
  const src = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  if(!/const BOARD_URL = '[^']*';/.test(src)) throw new Error('BOARD_URL constant not found in index.html');
  const noticeMatch = src.match(/const NOTICES = \[\s*\{id:'([^']+)'/);
  if(!noticeMatch) throw new Error('latest notice id not found in index.html');
  const latestNoticeId = noticeMatch[1];
  dir = fs.mkdtempSync(path.join(os.tmpdir(),'dojo-smoke-')); const page = path.join(dir,'index.html'), returningPage = path.join(dir,'returning.html');
  const scratchSrc = src.replace(/const BOARD_URL = '[^']*';/, `const BOARD_URL = '${boardUrl}';`);
  fs.writeFileSync(page, scratchSrc); fs.writeFileSync(returningPage, scratchSrc);
  for(const f of ['bgm.mp3','sfx-wave.mp3','sfx-ewgf.mp3','donate-kakao.png']) fs.copyFileSync(path.join(__dirname,'..',f), path.join(dir,f)); // the scratch page plays real media; a missing file logs a resource error and fails the run
  try{ fs.rmSync(path.join(os.tmpdir(),'dojo-smoke-profile'),{recursive:true,force:true}); }catch(e){} // fresh localStorage every run (a navigation at the end of the run flushes it to disk)
  const b = await launch({port:9333, profile:'dojo-smoke-profile'});
  browser = b;
  console.log('Smoke: browser connected');
  const {send, evalJs, errors} = b;
  const waitFor = async (expr, timeout=5000) => {
    const until=Date.now()+timeout;
    while(Date.now()<until){ try{ if(await evalJs(expr)) return; }catch(e){ if(!/Execution context was destroyed|Cannot find context/.test(String(e))) throw e; } await sleep(100); }
    throw new Error('browser condition timed out: '+expr);
  };
  await b.navigate(fileUrl(page), 0);
  await waitFor(`location.pathname.endsWith('/index.html') && !!document.querySelector('#noticeDlg') && !!document.querySelector('#nickDlg')`);
  const out = {};
  const snap = async () => evalJs(`(() => {
    const q=s=>document.querySelector(s); const css=getComputedStyle(document.documentElement);
    return {lang:document.documentElement.lang, title:document.title, h1:q('h1').textContent, tag:q('.brand p').textContent,
      modes:[...document.querySelectorAll('#modes button')].map(b=>b.textContent), hint:q('#hudHint').textContent, dName:q('#dName').textContent,
      rTitle:q('#rTitle').textContent, coach:q('#coachMsg').textContent.slice(0,40), setGear:!!q('#setOpen'), setOpen:q('#setDlg').open,
      pad:q('#padStatus').textContent, empty:q('#logBody').textContent, seg:[...q('#segBar').children].map(e=>e.textContent),
      display:css.getPropertyValue('--display').trim(), bests:q('#bests').textContent.slice(0,80), footer:q('footer').textContent.slice(0,40),
      histEmpty:q('#hist svg text:last-of-type')?.textContent, waveTop:q('#waveChart svg text')?.textContent, keyBtn:q('#keys .key b')?.textContent,
      bgmTitle:q('#bgmBtn').title, langPressed:[...document.querySelectorAll('#langSel button')].map(b=>b.getAttribute('aria-pressed')).join('')};
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
  // announcements: unread badge → modal patch notes → browser-local read marker, with no automatic popup
  await waitFor(`!!document.querySelector('#noticeBadge') && !!document.querySelector('#noticeDlg')`);
  out.notice = await evalJs(`(() => { const q=s=>document.querySelector(s); return {badge:!q('#noticeBadge').hidden,open:q('#noticeDlg').open}; })()`);
  out.notice.latest = latestNoticeId;
  await evalJs(`document.querySelector('#noticeOpen').click()`); await sleep(100);
  Object.assign(out.notice, await evalJs(`(() => { const q=s=>document.querySelector(s),st=JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1'));return {afterOpen:q('#noticeDlg').open,items:q('#noticeList').children.length,title:q('#noticeList h3').textContent,seen:st.noticeSeen,badgeAfter:!q('#noticeBadge').hidden}; })()`));
  await evalJs(`document.querySelector('#noticeClose').click()`); await sleep(50); out.notice.closed = !(await evalJs(`document.querySelector('#noticeDlg').open`));
  if(!out.notice.latest || !out.notice.badge || out.notice.open || !out.notice.afterOpen || out.notice.items<1 || !out.notice.title || out.notice.seen!==out.notice.latest || out.notice.badgeAfter || !out.notice.closed) errors.push('announcement check failed: '+JSON.stringify(out.notice));
  // On a later visit, an unread latest id opens once after boot; the nickname gate is skipped because this is now a returning browser.
  await evalJs(`const st=JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1'));st.noticeSeen='';localStorage.setItem('wave-ewgf-dojo-v1',JSON.stringify(st))`);
  await b.navigate(fileUrl(returningPage), 0);
  await waitFor(`location.pathname.endsWith('/returning.html') && !!document.querySelector('#noticeDlg')`);
  await waitFor(`document.querySelector('#noticeDlg').open`, 3000);
  out.notice.returning = await evalJs(`({open:document.querySelector('#noticeDlg').open,seen:JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).noticeSeen,nickOpen:document.querySelector('#nickDlg').open})`);
  out.notice.returning.latest = latestNoticeId;
  await evalJs(`document.querySelector('#noticeClose').click()`);
  if(!out.notice.returning.latest || !out.notice.returning.open || out.notice.returning.seen!==out.notice.returning.latest || out.notice.returning.nickOpen) errors.push('returning visitor announcement failed: '+JSON.stringify(out.notice.returning));
  // simulate a few inputs via keyboard events to populate result/coach/log, then switch languages
  await tap('KeyD',20); await sleep(20); await key('KeyS'); await sleep(20); await key('KeyD'); await sleep(5); await key('KeyI'); await sleep(20); await key('KeyI','keyup'); await key('KeyD','keyup'); await key('KeyS','keyup'); await sleep(300);
  out.afterInput = await snap();
  // sound settings: the key events above were the unlocking gesture. Toggle off → slider → back on → one more EWGF with sound enabled (play() rejections would surface in errors)
  const soundSnap = () => evalJs(`(() => { const q=s=>document.querySelector(s); const st=JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')); return {on:q('#soundSel button[aria-pressed=\"true\"]').dataset.sound, bgm:q('#bgmVol').value, sfx:q('#sfxVol').value, out:q('#sfxVolOut').textContent, disabled:q('#sfxVol').disabled, stSound:st.sound, stSfx:st.sfxVol, bgmBtn:q('#bgmBtn').getAttribute('aria-pressed'), bgmSel:q('#bgmSel button[aria-pressed=true]').dataset.bgm, stBgm:st.bgm, bgmDisabled:q('#bgmVol').disabled}; })()`);
  out.sound = {initial: await soundSnap()};
  await evalJs(`document.querySelector('#bgmBtn').click()`);
  out.sound.headerOff = await soundSnap();
  await evalJs(`document.querySelector('#bgmBtn').click()`);
  out.sound.headerOn = await soundSnap();
  await evalJs(`document.querySelector('#setOpen').click(); document.querySelector('#bgmSel button[data-bgm="0"]').click()`);
  out.sound.settingsOff = await soundSnap();
  await evalJs(`document.querySelector('#setClose').click()`);
  await b.navigate(fileUrl(page), 700);
  out.sound.reloadedOff = await soundSnap();
  await evalJs(`document.querySelector('#setOpen').click(); document.querySelector('#bgmSel button[data-bgm="1"]').click(); document.querySelector('#setClose').click()`);
  out.sound.settingsOn = await soundSnap();
  await evalJs(`document.querySelector('#soundSel button[data-sound="0"]').click(); document.querySelector('#bgmBtn').click()`);
  out.sound.masterRestored = await soundSnap();
  for(const state of [out.sound.headerOff,out.sound.settingsOff,out.sound.reloadedOff]){
    if(state.bgmBtn!=='false' || state.bgmSel!=='0' || state.stBgm!==0 || !state.bgmDisabled || state.disabled) errors.push('BGM off sync failed: '+JSON.stringify(state));
  }
  for(const state of [out.sound.headerOn,out.sound.settingsOn,out.sound.masterRestored]){
    if(state.bgmBtn!=='true' || state.bgmSel!=='1' || state.stBgm!==1 || state.bgmDisabled || state.on!=='1' || state.stSound!==1) errors.push('BGM on sync failed: '+JSON.stringify(state));
  }
  // donate: footer button opens the chooser (KakaoPay first in ko), KakaoPay shows the QR view, back/close work; en lists Ko-fi first
  await evalJs(`document.querySelector('#langSel button[data-lang=\"ko\"]').click(); document.querySelector('#donateBtn').click()`); await sleep(150);
  out.donate = await evalJs(`(() => { const q=s=>document.querySelector(s); return {open:q('#donateDlg').open, first:q('#donateOptions [data-opt]').dataset.opt, chooseShown:!q('#donateChoose').hidden}; })()`);
  await evalJs(`document.querySelector('#donateOptions [data-opt=\"kakao\"]').click()`); await sleep(150);
  Object.assign(out.donate, await evalJs(`(() => { const q=s=>document.querySelector(s); return {qrShown:!q('#donateKakao').hidden, qr:q('#donateQr').naturalWidth, href:q('#donateOpen').href}; })()`));
  await evalJs(`document.querySelector('#donateBack').click()`); await sleep(50); out.donate.back = await evalJs(`!document.querySelector('#donateChoose').hidden`);
  await evalJs(`document.querySelector('#donateClose').click()`); await sleep(100); out.donate.closed = !(await evalJs(`document.querySelector('#donateDlg').open`));
  out.donate.enFirst = await evalJs(`(() => { document.querySelector('#langSel button[data-lang=\"en\"]').click(); const o=document.querySelector('#donateOptions [data-opt]'); return o.dataset.opt+' '+(o.href||''); })()`);
  out.donate.buttons = await evalJs(`['donateTop','donateShareBtn','donateBtn'].map(id => { const b=document.getElementById(id); return id+':'+(b?(b.hidden?'hidden':'shown'):'missing'); }).join(',')`);
  if(!out.donate.open || out.donate.first!=='kakao' || !out.donate.qrShown || !out.donate.qr || !out.donate.back || !out.donate.closed || !String(out.donate.enFirst).startsWith('kofi https://ko-fi.com/') || /missing|hidden/.test(out.donate.buttons)) errors.push('donate check failed: '+JSON.stringify(out.donate));
  // settings dialog: gear on the stage opens it (game input paused), close button closes it
  await evalJs(`document.querySelector('#setOpen').click()`); await sleep(150);
  out.sound.dlgOpen = await evalJs(`document.querySelector('#setDlg').open`);
  await tap('KeyD',20); await sleep(100); out.sound.pausedWhileOpen = await evalJs(`document.querySelector('#rTitle').textContent`);
  await evalJs(`document.querySelector('#setClose').click()`); await sleep(100);
  out.sound.dlgClosed = !(await evalJs(`document.querySelector('#setDlg').open`));
  if(!out.sound.dlgOpen || !out.sound.dlgClosed) errors.push('settings dialog check failed: '+JSON.stringify(out.sound));
  console.log('Smoke: wardrobe and manual reward claiming');
  const preReward = await evalJs(`(() => { const st=JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1'));return {pending:st.pendingRewards.length,bowl:!!st.ach.bowl_head,hidden:document.querySelector('#jackpot').hidden,count:document.querySelector('#rewardCount').textContent}; })()`);
  if(preReward.pending<2 || preReward.bowl || !preReward.hidden || +preReward.count!==preReward.pending) errors.push('rewards must wait for claim: '+JSON.stringify(preReward));
  await evalJs(`document.querySelector('#fitOpen').click()`);
  const pendingFit = await evalJs(`(() => { const b=document.querySelector('#fitSlots [data-id="bowl_head"]'); b.click(); return {locked:b.getAttribute('aria-disabled'),waiting:b.textContent,head:JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).fit.head}; })()`);
  if(pendingFit.locked!=='true' || pendingFit.head==='bowl_head' || !pendingFit.waiting.includes('Unclaimed')) errors.push('unclaimed outfit is wearable: '+JSON.stringify(pendingFit));
  await evalJs(`document.querySelector('#fitClose').click()`); await sleep(150);
  if(!(await evalJs(`document.querySelector('#jackpot').hidden`))) errors.push('dialog close auto-opened a reward');
  // Keyboard activation, same path as clicking the chest.
  await evalJs(`document.querySelector('#rewardOpen').focus()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',code:'Enter',key:'Enter',text:'\r',windowsVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'keyUp',code:'Enter',key:'Enter',windowsVirtualKeyCode:13});
  for(let i=0;i<30;i++){ if((await evalJs(`document.querySelector('#jackpot').dataset.phase`))==='reveal') break; await sleep(100); }
  out.fit = {};
  out.fit.reveal = await evalJs(`(() => { const j=document.querySelector('#jackpot'), ok=document.querySelector('#jpOk'), st=JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')); return {phase:j.dataset.phase,dim:getComputedStyle(j).backgroundColor,focused:document.activeElement===ok,pending:st.pendingRewards.length,bowl:!!st.ach.bowl_head,extra:document.querySelector('#jpAch').textContent}; })()`);
  await sleep(600);out.fit.stays=await evalJs(`document.querySelector('#jackpot').dataset.phase`);
  for(const lang of ['ko','ja','en']){
    await evalJs(`document.querySelector('#langSel button[data-lang="${lang}"]').click()`);
    if(!(await evalJs(`document.querySelector('#jpItem').textContent.length>0`))) errors.push('reward translation missing: '+lang);
  }
  await evalJs(`document.querySelector('#jpOk').click()`);await sleep(1000);
  if(!(await evalJs(`document.querySelector('#jackpot').hidden && document.querySelector('#rewardOpen').disabled`))) errors.push('claim should finish with an empty chest');
  if(out.fit.reveal.phase!=='reveal' || !out.fit.reveal.focused || out.fit.reveal.pending || !out.fit.reveal.bowl || !out.fit.reveal.extra.includes('more') || out.fit.stays!=='reveal') errors.push('manual reward reveal failed: '+JSON.stringify(out.fit));
  await evalJs(`document.querySelector('#fitOpen').click()`); await sleep(100);
  out.fit.wardrobe = await evalJs(`(() => { const b=document.querySelector('#fitSlots [data-id="bowl_head"]'), c=document.querySelector('#fitPreview'), before=c.toDataURL();b.click();document.querySelector('#fitTabs [data-view="ach"]').click();return {head:JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).fit.head,changed:c.toDataURL()!==before,rows:document.querySelectorAll('#fitAch .ach-row').length,done:document.querySelectorAll('#fitAch .ach-row.done').length}; })()`);
  if(out.fit.wardrobe.head!=='bowl_head' || !out.fit.wardrobe.changed || out.fit.wardrobe.rows!==25 || out.fit.wardrobe.done<1) errors.push('claimed wardrobe check failed: '+JSON.stringify(out.fit.wardrobe));
  await evalJs(`document.querySelector('#fitClose').click()`);
  await evalJs(`document.querySelector('#soundSel button[data-sound=\"0\"]').click()`); await sleep(100);
  await evalJs(`const s=document.querySelector('#sfxVol'); s.value=30; s.dispatchEvent(new Event('input')); s.dispatchEvent(new Event('change'))`); await sleep(100);
  out.sound.off = await soundSnap();
  await evalJs(`document.querySelector('#soundSel button[data-sound=\"1\"]').click()`); await sleep(100);
  await tap('KeyD',20); await sleep(20); await key('KeyS'); await sleep(20); await key('KeyD'); await sleep(5); await key('KeyI'); await sleep(20); await key('KeyI','keyup'); await key('KeyD','keyup'); await key('KeyS','keyup'); await sleep(400);
  out.sound.on = await soundSnap();
  // f,N,f double tap → dash visual in a real browser (no judging change)
  await tap('KeyD',20); await sleep(40); await tap('KeyD',20); await sleep(100);
  out.dash = await evalJs(`document.querySelector('#rTitle').textContent`);
  // f,f+2 and 6N23+4 in free practice, then a rush30 trial: a crouch dash scores, the HUD shows points, leaving the mode clears it without a record (2026-09-13)
  await sleep(700); await tap('KeyD',20); await sleep(40); await key('KeyD'); await sleep(30); await key('KeyI'); await sleep(20); await key('KeyI','keyup'); await key('KeyD','keyup'); await sleep(300);
  out.moves = {tongbal: await evalJs(`${q('#rTitle')}.textContent`)};
  await sleep(400); await tap('KeyD',20); await sleep(20); await key('KeyS'); await sleep(20); await key('KeyD'); await sleep(40); await key('KeyK'); await sleep(20); await key('KeyK','keyup'); await key('KeyD','keyup'); await key('KeyS','keyup'); await sleep(300);
  out.moves.sweep = await evalJs(`({title:${q('#rTitle')}.textContent, log:${q('#logBody')}.textContent.slice(0,60)})`);
  await evalJs(`${q('#modes button[data-mode="rush30"]')}.click(); ${q('#dStart')}.click()`); await sleep(3300);
  await tap('KeyD',20); await sleep(20); await key('KeyS'); await sleep(20); await key('KeyD'); await sleep(40); await key('KeyD','keyup'); await key('KeyS','keyup'); await sleep(400);
  out.moves.rush = await evalJs(`({score:${q('#hudScore')}.textContent, prog:${q('#dProg')}.textContent, timer:${q('#hudTimer')}.textContent, hint:${q('#hudHint')}.textContent, modes:document.querySelectorAll('#modes button').length})`);
  await evalJs(`${q('#modes button[data-mode="free"]')}.click()`); await sleep(200);
  out.moves.left = await evalJs(`({score:${q('#hudScore')}.textContent, records:JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).records.rush30.length})`);
  // backdash 10s (2026-09-13): 4 N 4, 1 cancel near 10f, roll 1→4 N 4 → distance on the HUD and a graded ×2 set on the card; leaving the mode clears it without a record
  await evalJs(`${q('#modes button[data-mode="bd10"]')}.click(); ${q('#dStart')}.click()`); await sleep(3300);
  await tap('KeyA',20); await sleep(30); await key('KeyA'); await sleep(170); await key('KeyS'); await sleep(30); await key('KeyS','keyup'); await sleep(30); await key('KeyA','keyup'); await sleep(30); await key('KeyA'); await sleep(120);
  out.moves.bd = await evalJs(`({score:${q('#hudScore')}.textContent, title:${q('#rTitle')}.textContent, kind:${q('#rKind')}.textContent, chain:${q('#hudChainL')}.textContent})`);
  await key('KeyA','keyup'); await sleep(300);
  out.moves.bdEnd = await evalJs(`({score:${q('#hudScore')}.textContent, prog:${q('#dProg')}.textContent, timer:${q('#hudTimer')}.textContent})`);
  await evalJs(`${q('#modes button[data-mode="free"]')}.click()`); await sleep(200);
  out.moves.bdLeft = await evalJs(`({score:${q('#hudScore')}.textContent, records:JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).records.bd10.length})`);
  if(!/^\d\.\d m$/.test(out.moves.bd.score) || out.moves.bd.kind!=='BACKDASH' || !/×2/.test(out.moves.bd.title) || out.moves.bd.chain!=='BACKDASH' || !/^\d\.\d m$/.test(out.moves.bdEnd.score) || parseFloat(out.moves.bdEnd.score)<=parseFloat(out.moves.bd.score)
     || !/^\d+\.\d$/.test(out.moves.bdEnd.timer) || out.moves.bdLeft.score!=='' || out.moves.bdLeft.records!==0) errors.push('bd10 check failed: '+JSON.stringify({bd:out.moves.bd, bdEnd:out.moves.bdEnd, bdLeft:out.moves.bdLeft}));
  if(!/f,f\+2|통발|66\+2/.test(out.moves.tongbal) || !/Hell Sweep|나락|奈落/.test(out.moves.sweep.title) || !/Move/.test(out.moves.sweep.log) || out.moves.rush.score!=='1 PTS' || !/^1 /.test(out.moves.rush.prog) || !/^\d+\.\d$/.test(out.moves.rush.timer)
     || !/6N23\+4/.test(out.moves.rush.hint) || out.moves.rush.modes!==6 || out.moves.left.score!=='' || out.moves.left.records!==0) errors.push('f,f+2 / hell sweep / rush30 check failed: '+JSON.stringify(out.moves));
  if(out.sound.off.on!=='0' || out.sound.off.stSound!==0 || out.sound.off.stSfx!==30 || !out.sound.off.disabled || out.sound.on.on!=='1' || out.sound.on.disabled) errors.push('sound settings check failed: '+JSON.stringify(out.sound));
  for(const l of ['en','ja','ko']){
    await evalJs(`document.querySelector('#langSel button[data-lang="${l}"]').click()`); await sleep(200);
    out[l] = await snap();
    if(out[l].bgmTitle!==({ko:'배경음 켜기/끄기',en:'BGM on/off',ja:'BGMのオン/オフ'})[l]) errors.push('BGM tooltip translation failed: '+l);
    out[l].stored = await evalJs(`JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).lang`);
  }
  // Opening support during countdown (en) or measurement (ja) must never save/submit a result.
  console.log('Smoke: trials, support cancellation and result cards');
  out.donate.cancel = [];
  for(const [lang,delay] of [['en',200],['ja',3300]]){
    const recordsBefore=await evalJs(`JSON.stringify(JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).records.wave10)`);
    await evalJs(`document.querySelector('#langSel button[data-lang="${lang}"]').click(); document.querySelector('#modes button[data-mode="wave10"]').click(); document.querySelector('#dStart').click()`);
    await sleep(delay);
    await evalJs(`document.querySelector('#donateTop').click()`);
    await sleep(14500); // beyond both the original countdown and the measurement deadline
    const state=await evalJs(`({open:document.querySelector('#donateDlg').open, resultOpen:document.querySelector('#shareDlg').open, startDisabled:document.querySelector('#dStart').disabled, shareHidden:document.querySelector('#dShare').hidden, records:JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).records.wave10.length})`);
    state.scores=db.rows.length;out.donate.cancel.push({lang,...state});
    const recordsAfter=await evalJs(`JSON.stringify(JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).records.wave10)`);
    if(!state.open || state.resultOpen || state.startDisabled || !state.shareHidden || recordsAfter!==recordsBefore || state.scores) errors.push('donate trial cancellation failed: '+JSON.stringify({lang,...state}));
    await evalJs(`document.querySelector('#donateClose').click()`);
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
  if(!/登録完了 · 1位 \/ 1人 · 上位 100%/.test(out.trialEnd.rank) || !out.trialEnd.autoOpen || out.trialEnd.banner.hidden || out.trialEnd.banner.cls!=='share-rank t1' || out.trialEnd.banner.tier!=='S' || !/人間じゃない|見事|上級|半分|温まって|人間…/.test(out.trialEnd.banner.msg) || !/1位 \/ 1人/.test(out.trialEnd.banner.line) || !out.trialEnd.banner.msg) errors.push('trial end auto-submit/result card check failed: '+JSON.stringify(out.trialEnd));
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
    info:q('#boardInfo').textContent, me:q('#boardMe').textContent, visits:q('#visits').textContent, rows:[...document.querySelectorAll('#boardList tbody tr')].map(r=>[...r.children].map(c=>c.textContent)), meRow:!!q('#boardList tr.me'),
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
  // like → count 1 and marked as mine (server row under my nick) → like again cancels → dislike
  const voteState = () => evalJs(`[...document.querySelectorAll('#postList .vote')].map(b=>b.textContent+':'+b.getAttribute('aria-pressed'))`);
  await evalJs(`${q('#postList .vote[data-v="1"]')}.click()`); await sleep(600); out.posts.like = {ui:await voteState(), db:db.votes.map(v => [v.post_id, v.key, v.v])};
  await evalJs(`${q('#postList .vote[data-v="1"]')}.click()`); await sleep(600); out.posts.unlike = {ui:await voteState(), db:db.votes.length};
  await evalJs(`${q('#postList .vote[data-v="-1"]')}.click()`); await sleep(600); out.posts.dislike = {ui:await voteState(), db:db.votes.map(v => [v.post_id, v.key, v.v]), msg:await evalJs(`${q('#postMsg')}.textContent`)};
  await evalJs(`${q('#nickBtn')}.click()`); await sleep(150);
  out.nick2 = {open:await evalJs(`${q('#nickDlg')}.open`), closeHidden:await evalJs(`${q('#nickClose')}.hidden`), prefilled:await evalJs(`${q('#nickInput')}.value`)};
  await evalJs(`${q('#nickInput')}.value='스모크2'; ${q('#nickSubmit')}.click()`); await sleep(800);
  out.nick2.after = await evalJs(`({open:${q('#nickDlg')}.open, btn:${q('#nickBtn')}.textContent, postNick:${q('#postNickLabel')}.textContent, me:${q('#boardMe')}.textContent})`);
  await evalJs(`${q('#langSel button[data-lang="ko"]')}.click()`); await sleep(300);
  out.ko2 = await evalJs(`({title:${q('#boardCard h2')}.textContent, empty:${q('#boardList .empty')}?.textContent, me:${q('#boardMe')}.textContent, rank:${q('#dRank')}.textContent, visits:${q('#visits')}.textContent, postsTitle:${q('#postsCard h2')}.textContent, nickBtn:${q('#nickBtn')}.textContent})`);
  out.db = {scores:db.rows.map(r => ({board:r.board, nick:r.nick, score:r.score, tie:r.tie, win:r.win, week:r.week})), posts:db.posts.map(p => [p.nick, p.text]), visits:db.visits, nicks:db.db.prepare('SELECT key,nick FROM nicks ORDER BY key').all().map(r => [r.key, r.nick])};
  const bd = out.board, auto = bd.auto;
  if(bd.tabs.length!==5 || !/rush30|Dummy Rush/.test(bd.tabs[3]||'') || !/bd10|Backdash/.test(bd.tabs[4]||'')) errors.push('leaderboard tabs check failed: '+JSON.stringify(bd.tabs));
  if(bd.cardHidden || bd.postsHidden || !/rank 1 of 1 · top 100%/.test(bd.rank) || !bd.retryHidden || bd.info!=='1 entries' || !/rank 1 of 1 · top 100%/.test(bd.me) || !bd.meRow || bd.rows.length!==1 || bd.rows[0][1]!=='스모크 테스트' || bd.rows[0][0]!=='1' || !/^Today 1 · total 1 visits$/.test(bd.visits)) errors.push('leaderboard check failed: '+JSON.stringify(bd));
  if(!auto || auto.during.rank!=='' || auto.during.open || !/best stands · rank 1 of 1/.test(auto.after.rank) || auto.after.rows!==1 || !auto.after.open || !/best stands/.test(auto.after.line) || auto.after.tier!=='S') errors.push('leaderboard auto-submit check failed: '+JSON.stringify(auto));
  if(!bd.ewgfTab.empty || !/No entry from you/.test(bd.ewgfTab.me) || bd.ewgfTab.pressed!=='true') errors.push('leaderboard tab check failed: '+JSON.stringify(bd.ewgfTab));
  if(!out.posts.empty || out.posts.after.msg!=='' || out.posts.after.text!=='' || JSON.stringify(out.posts.after.items)!==JSON.stringify([['스모크 테스트','스모크 테스트 글']])) errors.push('shoutbox check failed: '+JSON.stringify(out.posts));
  const votes = {like:JSON.stringify(out.posts.like), unlike:JSON.stringify(out.posts.unlike), dislike:JSON.stringify(out.posts.dislike)};
  if(votes.like!==JSON.stringify({ui:['👍 1:true','👎 0:false'], db:[[1,'스모크 테스트',1]]}) || votes.unlike!==JSON.stringify({ui:['👍 0:false','👎 0:false'], db:0}) || votes.dislike!==JSON.stringify({ui:['👍 0:false','👎 1:true'], db:[[1,'스모크 테스트',-1]], msg:''})) errors.push('post votes check failed: '+JSON.stringify(votes));
  if(!out.nick2.open || out.nick2.closeHidden || out.nick2.prefilled!=='스모크 테스트' || out.nick2.after.open || !/스모크2/.test(out.nick2.after.btn) || out.nick2.after.postNick!=='스모크2' || !/No entry from you/.test(out.nick2.after.me)) errors.push('nickname change check failed: '+JSON.stringify(out.nick2));
  if(out.ko2.title!=='순위' || !/아직 기록이 없습니다/.test(out.ko2.empty||'') || !/등록한 기록이 없습니다/.test(out.ko2.me) || !/최고 기록 유지 · 1위 \/ 1명 · 상위 100%/.test(out.ko2.rank) || !/^오늘 방문 1 · 누적 1$/.test(out.ko2.visits) || out.ko2.postsTitle!=='한마디' || out.ko2.nickBtn!=='닉네임 · 스모크2') errors.push('backend ko re-render check failed: '+JSON.stringify(out.ko2));
  if(out.db.scores.length!==1 || out.db.scores[0].board!=='wave10' || out.db.scores[0].week!=='all' || out.db.scores[0].nick!=='스모크 테스트' || out.db.scores[0].win!==12 || JSON.stringify(out.db.posts)!==JSON.stringify([['스모크 테스트','스모크 테스트 글']]) || out.db.visits.length!==1 || out.db.visits[0].n!==1
     || JSON.stringify(out.db.nicks)!==JSON.stringify([['스모크 테스트','스모크 테스트'],['스모크2','스모크2'],['점유됨','점유됨']])) errors.push('backend storage check failed: '+JSON.stringify(out.db));
  for(const s of JSON.stringify([out.gate, bd, out.posts, out.nick2, out.ko2, out.trialEnd]).match(/\b(board|mode|share|rec|posts|nick|tier)\.[a-zA-Z0-9.]+/g)||[]) errors.push('raw i18n key leaked into backend UI: '+s);
  // touch controls: three direction buttons feed the normal path; down+right forms d/f
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await send('Emulation.setEmulatedMedia',{features:[{name:'pointer',value:'coarse'},{name:'hover',value:'none'}]});
  await b.navigate(fileUrl(page), 1800);
  const tc = await evalJs(`(() => { const r = s => { const x = document.querySelector(s).getBoundingClientRect(); return {x:x.x, y:x.y, w:x.width, h:x.height}; };
    return {ui:document.documentElement.classList.contains('touch-ui'), compat:document.compatMode, width:innerWidth, scrollW:document.documentElement.scrollWidth, shown:getComputedStyle(${q('#touch')}).display,
      stage:r('#stageBox'), dirs:r('#tdirs'), btns:r('#tbtns'), left:r('#tdirs [data-dir="left"]'), down:r('#tdirs [data-dir="down"]'), right:r('#tdirs [data-dir="right"]'), b2:r('#tbtns [data-btn="2"]'), note:${q('.touch-note')}.textContent, sel:${q('#touchSel [data-touch="auto"]')}.getAttribute('aria-pressed'), badge:${q('#srcBadge')}.textContent, hint:r('#hudHint'), touchTop:r('#touch').y,
      tune:[${q('#touchSize')}.value,${q('#touchX')}.value,${q('#touchY')}.value]}; })()`);
  tc.reward = await evalJs(`(() => { const el=document.querySelector('#rewardOpen'), r=el.getBoundingClientRect(), fit=document.querySelector('#fitOpen').getBoundingClientRect(); return {hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2).closest('#rewardOpen')===el,top:r.top,bottom:r.bottom,fitBottom:fit.bottom}; })()`);
  if(!tc.reward.hit || tc.reward.top<tc.reward.fitBottom || tc.reward.bottom>tc.touchTop) errors.push('portrait reward button overlap: '+JSON.stringify(tc.reward));
  const center = r => ({x:r.x+r.w/2,y:r.y+r.h/2}), rc=center(tc.right), dc=center(tc.down);
  const tp = (x,y,id) => ({x, y, id, radiusX:6, radiusY:6, force:1});
  const touch = (type, pts) => send('Input.dispatchTouchEvent',{type, touchPoints:pts});
  await touch('touchStart',[tp(rc.x,rc.y,1)]); await sleep(40);                    // f
  await touch('touchEnd',[]); await sleep(30);                                    // N
  await touch('touchStart',[tp(dc.x,dc.y,1)]); await sleep(30);                    // d
  await touch('touchStart',[tp(dc.x,dc.y,1),tp(rc.x,rc.y,2),tp(tc.b2.x+tc.b2.w/2,tc.b2.y+tc.b2.h/2,3)]); await sleep(40); // d/f + 2
  await touch('touchEnd',[]); await sleep(300);
  // the reward card must sit above the touch overlay so 확인 is tappable on a phone (the card is centred, so its button lands in the pad zone)
  tc.jpHit = await evalJs(`(() => { const j=document.querySelector('#jackpot'), ok=document.querySelector('#jpOk'); j.hidden=false; j.dataset.phase='reveal'; const r=ok.getBoundingClientRect(); const el=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2); const pad=document.elementFromPoint(${rc.x}, ${rc.y}); j.hidden=true; delete j.dataset.phase; return {hit:el===ok, hitId:el&&el.id, inTouchZone:r.y+r.height/2>${tc.touchTop}, padStillReachable:!!pad&&!!pad.closest('#tdirs')}; })()`);
  tc.after = await evalJs(`({chips:[...document.querySelectorAll('#inputs .chip')].map(c => c.textContent.replace(/\\s+/g,'')).join(' '), title:${q('#rTitle')}.textContent, src:${q('#srcBadge')}.textContent,
    active:document.querySelectorAll('#tdirs button.on').length, log:${q('#logBody')}.textContent.slice(0,60)})`);
  // The default must remain usable even at the narrow supported viewport. A user-requested enlargement is intentionally not width-clamped.
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:700,deviceScaleFactor:2,mobile:true});
  await b.navigate(fileUrl(page), 1500);
  tc.narrow = await evalJs(`(() => { const r = s => { const x=document.querySelector(s).getBoundingClientRect(); return {x:x.x,w:x.width,r:x.right}; }; return {dirs:r('#tdirs'),btns:r('#tbtns')}; })()`);
  tc.narrowCustom = await evalJs(`(() => { const s=document.querySelector('#touchSize'); s.value='140'; s.dispatchEvent(new Event('input',{bubbles:true})); const d=document.querySelector('#tdirs').getBoundingClientRect(), b=document.querySelector('#tbtns').getBoundingClientRect(); const out={size:getComputedStyle(document.querySelector('#tdirs')).getPropertyValue('--touch-dir-size').trim(),dirs:{x:d.x,w:d.width,r:d.right},btns:{x:b.x,w:b.width,r:b.right}}; s.value='100'; s.dispatchEvent(new Event('input',{bubbles:true})); return out; })()`);
  // rotated phone: the stage widens to 16/9, pad and buttons stay inside the overlay (below the note, no overlap between them) and the mode hint sits just above it
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:2,mobile:true});
  await b.navigate(fileUrl(page), 1500);
  tc.land = await evalJs(`(() => { const r = s => { const x = document.querySelector(s).getBoundingClientRect(); return {x:x.x, y:x.y, w:x.width, h:x.height, r:x.right, b:x.bottom}; };
    return {reward:r('#rewardOpen'), fit:r('#fitOpen'), stage:r('#stageBox'), touch:r('#touch'), note:r('.touch-note'), dirs:r('#tdirs'), btns:r('#tbtns'), hint:r('#hudHint'), hintShown:getComputedStyle(${q('#hudHint')}).display, hintText:${q('#hudHint')}.textContent}; })()`);
  const L = tc.land, inside = (a, o) => a.y>=o.y-0.5 && a.b<=o.b+0.5 && a.x>=o.x-0.5 && a.r<=o.r+0.5;
  if(L.reward.y<L.fit.b || L.reward.b>L.touch.y || !inside(L.reward,L.stage)) errors.push('landscape reward button overlap: '+JSON.stringify(L));
  if(!(L.stage.w>L.stage.h) || !inside(L.dirs,L.touch) || !inside(L.btns,L.touch) || L.dirs.y<L.note.b-0.5 || L.btns.y<L.note.b-0.5 || L.dirs.r>L.btns.x || L.dirs.w<140 || L.btns.w<80
     || L.hintShown==='none' || L.hint.b>L.touch.y+0.5 || L.hint.y<L.stage.y+L.stage.h*0.46-1 || !L.hintText) errors.push('touch landscape layout check failed: '+JSON.stringify(L));
  await send('Emulation.setEmulatedMedia',{features:[{name:'pointer',value:'fine'},{name:'hover',value:'hover'}]});
  await send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await b.navigate(fileUrl(page), 1500);
  tc.desktop = await evalJs(`({ui:document.documentElement.classList.contains('touch-ui'), shown:getComputedStyle(${q('#touch')}).display})`);
  out.touch = tc;
  if(!tc.jpHit.hit) errors.push('reward 확인 button is covered by the touch overlay: '+JSON.stringify(tc.jpHit));
  if(!tc.ui || tc.compat!=='CSS1Compat' || tc.width!==390 || tc.scrollW>390 || tc.shown!=='block' || tc.sel!=='true' || tc.dirs.w<160 || tc.dirs.x+tc.dirs.w>tc.btns.x || tc.right.w<46 || tc.b2.w<56 || tc.dirs.y<tc.stage.y+tc.stage.h*0.5 || tc.badge!=='👆 터치 대기' || tc.hint.y<tc.stage.y+tc.stage.h*0.46-1 || tc.hint.y+tc.hint.h>tc.touchTop+0.5 || JSON.stringify(tc.tune)!=='["100","0","0"]'
     || tc.narrow.dirs.r>tc.narrow.btns.x || tc.narrowCustom.size!=='62px'
     || tc.after.title!=='초풍!' || tc.after.src!=='👆 터치' || !/^→[0-9f]* ★[0-9]+f ↓[0-9]+f ↘[0-9]+f/.test(tc.after.chips) || tc.after.active!==0 || tc.desktop.ui || tc.desktop.shown!=='none')
    errors.push('touch controls check failed: '+JSON.stringify(tc));
  const shotDir=path.join(__dirname,'../.sandbox/bgm-toggle');fs.mkdirSync(shotDir,{recursive:true});
  for(const width of [1366,390]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
    await sleep(250);
    const layout=await evalJs(`(() => {const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,height:b.height};};return {btn:r('#bgmBtn'),lang:r('#langSel'),scroll:document.documentElement.scrollWidth};})()`);
    if(layout.btn.right>width || layout.btn.x<0 || layout.scroll>width || layout.btn.height!==45 || layout.btn.right>layout.lang.x || Math.abs((layout.btn.y+layout.btn.height/2)-(layout.lang.y+layout.lang.height/2))>2) errors.push('BGM header layout failed: '+JSON.stringify({width,...layout}));
    const shot=await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(shotDir,`header-${width}.png`),Buffer.from(shot.result.data,'base64'));
  }
  out.errors = errors;
  console.log(JSON.stringify(out,null,1));
  b.close(); srv.close(); rmTmp();
  if(errors.length){ console.error('JS ERRORS:', errors); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error('FAIL', e); if(browser) browser.close(); if(server) server.close(); rmTmp(); process.exit(1); });
