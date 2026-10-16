// 결정 39(replay) browser smoke: node tests/smoke-replay.js
// Real 도전 모드 runs on keyboard events (the real frame loop, real event times) are submitted to the local worker (worker/index.js +
// tests/fake-d1.js over http), then ▶ on the board row opens the dialog: the ?replay=1 frame plays the same run on its own copy of the app
// (input ledger, HUD, REPLAY badge) and the parent reports the same score. wave10 and rush30 (seeded dummy order + hit bits). The replay
// window must send nothing to the worker and change nothing in this browser's records.
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const {pathToFileURL} = require('url');
const {launch, sleep, stageAssets} = require('../tools/cdp');
const {assemble} = require('../tools/assemble');
const {tracksAt} = require('../tools/update-bgm');
const fakeD1 = require('./fake-d1');

const TYPES = {'.html':'text/html; charset=utf-8', '.png':'image/png', '.mp3':'audio/mpeg', '.json':'application/json', '.js':'text/javascript'};
const listen = srv => new Promise(r => srv.listen(0, '127.0.0.1', () => r('http://127.0.0.1:'+srv.address().port)));

let dir, browser, servers = [];
(async () => {
  const worker = await import(pathToFileURL(path.join(__dirname, '../worker/index.js')).href);
  const db = fakeD1(), env = {DB:db, ALLOWED_ORIGINS:''}, calls = [];
  const api = http.createServer(async (req, res) => {
    try{
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = ['GET','HEAD','OPTIONS'].includes(req.method) ? undefined : Buffer.concat(chunks);
      if(req.method!=='OPTIONS') calls.push(req.method+' '+req.url.split('?')[0]);
      const out = await worker.default.fetch(new Request('http://127.0.0.1'+req.url, {method:req.method, headers:req.headers, body}), env);
      res.writeHead(out.status, Object.fromEntries(out.headers)); res.end(Buffer.from(await out.arrayBuffer()));
    }catch(e){ res.writeHead(500); res.end(String(e)); }
  });
  const apiUrl = await listen(api); servers.push(api);
  // The page is served over http like Pages, so the frame is same-origin with its parent and postMessage names a real origin.
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dojo-replay-'));
  const src = assemble();
  if(!/const BOARD_URL = '[^']*';/.test(src)) throw new Error('BOARD_URL constant not found');
  const notice = src.match(/const NOTICES = \[\s*\{id:'([^']+)'/)[1];
  fs.writeFileSync(path.join(dir, 'index.html'), src.replace(/const BOARD_URL = '[^']*';/, `const BOARD_URL = '${apiUrl}';`));
  stageAssets(src, dir);
  fs.writeFileSync(path.join(dir, 'bgm/playlist.json'), JSON.stringify(tracksAt(path.join(__dirname, '../bgm')))); // what Pages serves (tools/build-site.js); the live page reads it at boot
  const site = http.createServer((req, res) => {
    const p = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if(!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, {'content-type':TYPES[path.extname(p)] || 'application/octet-stream'}); res.end(fs.readFileSync(p));
  });
  const siteUrl = await listen(site); servers.push(site);
  env.ALLOWED_ORIGINS = siteUrl;
  // A registered nickname, so the runs submit without the first-run gate.
  const reg = await (await worker.handle(new Request('http://x/nick', {method:'POST', body:JSON.stringify({nick:'다시보기'})}), {DB:db, ALLOWED_ORIGINS:'*'})).json();
  if(!reg.token) throw new Error('nick seed failed');
  const day = new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
  const seed = {v:4, lang:'ko', sound:0, fx:1, noticeSeen:notice, visitDay:day, nick:'다시보기', nickToken:reg.token};

  const probe = http.createServer(); const port = +(await listen(probe)).split(':').pop(); await new Promise(r => probe.close(r));
  const b = browser = await launch({port, profile:'dojo-replay-'+process.pid+'-'+Date.now(), windowSize:'1366,1000', webgl:!process.env.CI});
  const {send, evalJs, errors} = b;
  // Seed once, in the top page only: the frame boots from the same storage and must find it untouched.
  await send('Page.addScriptToEvaluateOnNewDocument', {source:`
    Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
    for(const type of ['gamepadconnected','gamepaddisconnected']) window.addEventListener(type,e=>e.stopImmediatePropagation(),true);
    if(window.parent===window && !sessionStorage.getItem('seeded')){ sessionStorage.setItem('seeded','1'); localStorage.setItem('wave-ewgf-dojo-v1', ${JSON.stringify(JSON.stringify(seed))}); }
  `});
  await b.navigate(siteUrl+'/index.html', 1500);
  const waitFor = async (expr, timeout = 8000) => {
    const until = Date.now()+timeout;
    while(Date.now() < until){ if(await evalJs(expr)) return; await sleep(100); }
    throw new Error('timed out: '+expr);
  };
  await waitFor(`!document.querySelector('#nickDlg').open && document.querySelector('#boardCard') && !document.querySelector('#boardCard').hidden`);
  const fail = [];

  // Keyboard on the live page at real times (KeyD = 6, KeyS = 2, KeyI = RP, KeyU = LP). steps: [code, 'down'|'up', gap ms before it]
  const play = steps => evalJs(`(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    for(const [code,type,gap] of ${JSON.stringify(steps)}){ await wait(gap); window.dispatchEvent(new KeyboardEvent('key'+type,{code,bubbles:true,cancelable:true})); }
  })()`);
  // 6N23, then (6 N 6N23) again and again: each step 26~33 ms after the last, so no two share a 60Hz frame
  const waves = (n, strike) => {
    const s = [['KeyD','down',30],['KeyD','up',28],['KeyS','down',27],['KeyD','down',29]];
    for(let i=1;i<n;i++){
      if(strike && i%3===0) s.push(['KeyI','down',26],['KeyI','up',40]);                        // 3+RP: an EWGF try (a strike in rush30)
      s.push(['KeyS','up',31],['KeyD','up',27],['KeyD','down',33],['KeyD','up',26],['KeyS','down',30],['KeyD','down',28]);
    }
    s.push(['KeyS','up',30],['KeyD','up',30]);
    return s;
  };
  const records = () => evalJs(`JSON.stringify((s=>({records:s.records, stats:s.stats, life:s.life}))(JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1'))))`);

  for(const [board, secs, n] of [['wave10', 10, 40], ['rush30', 30, 60]]){
    console.log('Smoke: '+board+' run → submit');
    const before = db.rows.filter(r => r.board===board).length;
    await evalJs(`document.querySelector('#challengeOpen').click(); document.querySelector('#challengeList [data-mode="${board}"]').click(); document.querySelector('#dStart').click()`);
    await sleep(3250);
    await play(waves(n, board==='rush30'));
    await waitFor(`!document.querySelector('#dStart').disabled && !document.querySelector('#dShare').hidden`, secs*1000+8000);
    await waitFor(`/1위/.test(document.querySelector('#dRank').textContent)`, 8000);
    const row = db.rows.find(r => r.board===board);
    if(db.rows.filter(r => r.board===board).length!==before+1 || !row) { fail.push(board+': no board row'); continue; }
    await evalJs(`document.querySelector('#shareDlg').open && document.querySelector('#shareDlg').close()`);

    console.log('Smoke: '+board+' ▶ replay');
    await evalJs(`document.querySelector('#boardTabs button[data-board="${board}"]').click()`);
    await waitFor(`!!document.querySelector('#boardList .board-replay')`);
    const kept = await records(), callsAt = calls.length;
    await evalJs(`document.querySelector('#boardList .board-replay').click()`);
    await waitFor(`document.querySelector('#replayDlg').open && !!document.querySelector('#replayFrame iframe')`);
    const who = await evalJs(`document.querySelector('#replayWho').textContent`);
    if(!/^1위 다시보기 · /.test(who)) fail.push(board+': who line '+who);
    // midway: the frame is the app in replay view, playing the run on its own
    await sleep(3000 + 45*17 + Math.min(secs, 10)*500);
    const mid = await evalJs(`(()=>{const w=document.querySelector('#replayFrame iframe').contentWindow,d=w.document;
      return {view:d.body.classList.contains('replay-view'), badge:d.querySelector('#stageBox').dataset.badge, chips:d.querySelectorAll('#inputs .chip').length,
        timer:d.querySelector('#hudTimer').textContent, header:getComputedStyle(d.querySelector('header.top')).display, board:d.querySelector('#boardCard').hidden && d.querySelector('#postsCard').hidden, msg:document.querySelector('#replayMsg').textContent};})()`);
    if(!mid.view || mid.badge!=='REPLAY' || mid.chips<5 || !/\d/.test(mid.timer) || mid.header!=='none' || !mid.board || mid.msg!=='재생 중…') fail.push(board+': mid-replay '+JSON.stringify(mid));
    await waitFor(`/다시보기 끝|다릅니다/.test(document.querySelector('#replayMsg').textContent)`, secs*1000+10000);
    const end = await evalJs(`({msg:document.querySelector('#replayMsg').textContent, chips:document.querySelector('#replayFrame iframe').contentDocument.querySelectorAll('#inputs .chip').length,
      result:document.querySelector('#replayFrame iframe').contentDocument.querySelector('#dProg').textContent})`);
    if(!/^다시보기 끝 · /.test(end.msg)) fail.push(board+': the replay did not end on the board score '+JSON.stringify({end, row:{score:row.score, tie:row.tie}}));
    if(kept !== await records()) fail.push(board+': the replay window changed stored records');
    const sent = calls.slice(callsAt);
    if(JSON.stringify(sent)!==JSON.stringify(['GET /replay'])) fail.push(board+': requests while replaying '+JSON.stringify(sent));
    // 처음부터: a fresh frame plays again; closing removes it
    await evalJs(`document.querySelector('#replayRestart').click()`); await sleep(300);
    const again = await evalJs(`({frames:document.querySelectorAll('#replayFrame iframe').length, msg:document.querySelector('#replayMsg').textContent})`);
    if(again.frames!==1 || again.msg!=='재생 중…') fail.push(board+': restart '+JSON.stringify(again));
    await evalJs(`document.querySelector('#replayClose').click()`); await sleep(200);
    const closed = await evalJs(`({open:document.querySelector('#replayDlg').open, frames:document.querySelectorAll('#replayFrame iframe').length})`);
    if(closed.open || closed.frames) fail.push(board+': close '+JSON.stringify(closed));
    console.log(JSON.stringify({board, row:{score:row.score, tie:row.tie}, mid, end}));
  }

  const errs = errors.filter(e => !/ERR_BLOCKED_BY_CLIENT|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|googlesyndication/.test(e));
  if(errs.length) fail.push('page errors: '+JSON.stringify(errs));
  if(fail.length){ console.error('replay smoke FAILED:\n'+fail.join('\n')); process.exitCode = 1; }
  else console.log('replay smoke ok');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => {
  try{ browser && browser.close(); }catch(e){}
  for(const s of servers) try{ s.close(); }catch(e){}
  if(dir) try{ fs.rmSync(dir, {recursive:true, force:true}); }catch(e){}
});
