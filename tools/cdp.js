// Shared headless Chrome/Edge driver over the DevTools protocol (CDP). No npm dependencies (Node 18+: fetch, WebSocket).
// Used by tests/smoke-chrome.js and tools/make-og.js. Each caller picks its own port/profile so both can run at once.
//
//   const {launch, fileUrl, sleep} = require('./cdp');
//   const b = await launch({port:9333, profile:'dojo-smoke-profile'});
//   await b.navigate(fileUrl('index.html'));     // waits `settle` ms (default 1500) for the page to boot
//   const v = await b.evalJs(`document.title`);   // throws on a JS exception inside the page
//   b.errors                                      // uncaught exceptions, console.error, browser error log entries
//   b.close();
const {spawn} = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const fileUrl = p => 'file:///' + path.resolve(p).replace(/\\/g,'/');

async function launch({port, profile, windowSize='1280,900'}){
  if(!CHROME){ console.error('Chrome/Edge not found'); process.exit(2); }
  const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,'--user-data-dir='+path.join(os.tmpdir(),profile),'--window-size='+windowSize,'about:blank'], {stdio:'ignore'});
  const kill = () => { try{ chrome.kill(); }catch(e){} };
  try{
    let list;
    for(let i=0;i<40;i++){ try{ list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if(list.length) break; }catch(e){} await sleep(250); }
    const page = list && list.find(t=>t.type==='page');
    if(!page) throw new Error('no page target on port '+port);
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen=res; ws.onerror=rej; });
    let id=0; const pending=new Map(); const errors=[];
    ws.onmessage = ev => { const m=JSON.parse(ev.data); if(m.id&&pending.has(m.id)){ pending.get(m.id)(m); pending.delete(m.id); }
      if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
      if(m.method==='Log.entryAdded' && m.params.entry.level==='error') errors.push(m.params.entry.text);
      if(m.method==='Runtime.consoleAPICalled' && m.params.type==='error') errors.push(m.params.args.map(a=>a.value).join(' ')); };
    const send = (method, params={}) => new Promise(r=>{ const i=++id; pending.set(i,r); ws.send(JSON.stringify({id:i,method,params})); });
    const evalJs = async expr => { const r = await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true}); if(r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description||'eval error'); return r.result.result.value; };
    const navigate = async (url, settle=1500) => { await send('Page.navigate',{url}); await sleep(settle); };
    const close = () => { try{ ws.close(); }catch(e){} kill(); };
    await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
    return {send, evalJs, navigate, errors, close};
  }catch(e){ kill(); throw e; }
}

module.exports = {launch, fileUrl, sleep};
