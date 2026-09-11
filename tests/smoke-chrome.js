// Browser smoke test: node tests/smoke-chrome.js
// Launches headless Chrome over CDP (no npm deps), loads index.html, feeds a 6N23+2 via keyboard,
// switches ko/en/ja, runs a wave10 drill in ja, and fails if any JS error was logged.
const {spawn} = require('child_process');
const path = require('path');
const os = require('os'); const fs = require('fs');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
if(!CHROME){ console.error('Chrome/Edge not found'); process.exit(2); }
const PORT = 9333;
const target = 'file:///' + path.resolve(__dirname,'../index.html').replace(/\\/g,'/');
const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${PORT}`,'--user-data-dir='+path.join(os.tmpdir(),'dojo-smoke-profile'),'--window-size=1280,900','about:blank'], {stdio:'ignore'});
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async () => {
  let list;
  for(let i=0;i<40;i++){ try{ list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if(list.length) break; }catch(e){} await sleep(250); }
  const page = list.find(t=>t.type==='page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r=>ws.onopen=r);
  let id=0; const pending=new Map(); const errors=[];
  ws.onmessage = ev => { const m=JSON.parse(ev.data); if(m.id&&pending.has(m.id)){ pending.get(m.id)(m); pending.delete(m.id);}
    if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
    if(m.method==='Log.entryAdded' && m.params.entry.level==='error') errors.push(m.params.entry.text);
    if(m.method==='Runtime.consoleAPICalled' && m.params.type==='error') errors.push(m.params.args.map(a=>a.value).join(' ')); };
  const send = (method, params={}) => new Promise(r=>{ const i=++id; pending.set(i,r); ws.send(JSON.stringify({id:i,method,params})); });
  const evalJs = async expr => { const r = await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true}); if(r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description||'eval error'); return r.result.result.value; };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Page.navigate',{url:target});
  await sleep(1500);
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
  out.errors = errors;
  console.log(JSON.stringify(out,null,1));
  if(errors.length){ console.error('JS ERRORS:', errors); ws.close(); chrome.kill(); process.exit(1); }
  ws.close(); chrome.kill();
  process.exit(0);
})().catch(e => { console.error('FAIL', e); chrome.kill(); process.exit(1); });
