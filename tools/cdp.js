// Shared headless Chrome/Edge driver over the DevTools protocol (CDP). No npm dependencies (Node 18+: fetch, WebSocket).
// Used by tests/smoke-chrome.js and tools/make-og.js. Each caller picks its own port/profile so both can run at once.
//
//   const {launch, fileUrl, sleep} = require('./cdp');
//   const b = await launch({port:9333, profile:'dojo-smoke-profile'});
//   await b.navigate(fileUrl(page));             // waits `settle` ms (default 1500) for the page to boot
//   const v = await b.evalJs(`document.title`);   // throws on a JS exception inside the page
//   b.errors                                      // uncaught exceptions, console.error, browser error log entries
//   b.close();
const {spawn} = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// CHROME_PATH overrides the search (CI sets it). Windows paths first, then the usual Linux/macOS locations.
const CHROME = [process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&fs.existsSync(p));
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const fileUrl = p => require('url').pathToFileURL(path.resolve(p)).href;

async function launch({port, profile, windowSize='1280,900'}){
  if(!CHROME){ console.error('Chrome/Edge not found'); process.exit(2); }
  // CI runners (Ubuntu 24.04) block the Chrome sandbox's user namespaces and have no GPU, so WebGL needs SwiftShader there.
  // Locally the sandbox stays on and nothing changes.
  const chrome = spawn(CHROME, ['--headless=new','--disable-gpu',...(process.env.CI?['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]),'--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,'--user-data-dir='+path.join(os.tmpdir(),profile),'--window-size='+windowSize,'about:blank'], {stdio:'ignore'});
  const kill = () => { try{ chrome.kill(); }catch(e){} };
  try{
    let list;
    for(let i=0;i<40;i++){ try{ list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if(list.length) break; }catch(e){} await sleep(250); }
    const page = list && list.find(t=>t.type==='page');
    if(!page) throw new Error('no page target on port '+port);
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      const timer=setTimeout(()=>{ws.close();rej(new Error('CDP WebSocket connection timed out'));},10000);
      ws.onopen=()=>{clearTimeout(timer);res();};ws.onerror=e=>{clearTimeout(timer);rej(e);};
    });
    let id=0; const pending=new Map(); const errors=[];
    ws.onmessage = ev => { const m=JSON.parse(ev.data); if(m.id&&pending.has(m.id)){ pending.get(m.id)(m); pending.delete(m.id); }
      if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
      // A report-only CSP entry is the browser saying it logged something and took no action; the AdSense
      // script (결정 4(single-page)) trips one from Google's own frame, on and off with the network. Never the page's error.
      if(m.method==='Log.entryAdded' && m.params.entry.level==='error'
         && !/report-only Content Security Policy/i.test(m.params.entry.text||'')
         && !/googlesyndication\.com|doubleclick\.net/.test(m.params.entry.url||'')) errors.push(m.params.entry.text);
      if(m.method==='Runtime.consoleAPICalled' && m.params.type==='error') errors.push(m.params.args.map(a=>a.value).join(' ')); };
    const send = (method, params={}) => new Promise((resolve,reject)=>{
      const i=++id, timer=setTimeout(()=>{pending.delete(i);reject(new Error('CDP timeout: '+method+(params.expression ? ' '+params.expression.slice(0,160) : '')));},15000);
      pending.set(i,m=>{clearTimeout(timer);if(m.error) reject(new Error(method+': '+m.error.message));else resolve(m);});
      ws.send(JSON.stringify({id:i,method,params}));
    });
    const evalJs = async expr => { const r = await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true}); if(r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description||'eval error'); return r.result.result.value; };
    const navigate = async (url, settle=1500) => { await send('Page.navigate',{url}); await sleep(settle); };
    const close = () => { try{ ws.close(); }catch(e){} kill(); };
    await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
    return {send, evalJs, navigate, errors, close};
  }catch(e){ kill(); throw e; }
}

// Every sound file the assembled page's SND table points at. The smoke pages copy/serve these, so a new SFX only needs the SND entry.
const sfxFiles = html => [...new Set([...(html.match(/const SND = \{([^}]*)\}/)||['',''])[1].matchAll(/'(sfx\/[^']+\.mp3)'/g)].map(m=>m[1]))];
// Copies what a scratch file:// copy of the page loads next to it: images, every SND file and (optionally) bgm/.
function stageAssets(html, dir, {bgm=true}={}){
  const root = path.resolve(__dirname, '..');
  for(const f of ['favicon.png','donate-kakao.png',...sfxFiles(html)]){
    fs.mkdirSync(path.dirname(path.join(dir,f)), {recursive:true});
    fs.copyFileSync(path.join(root,f), path.join(dir,f));
  }
  if(bgm) fs.cpSync(path.join(root,'bgm'), path.join(dir,'bgm'), {recursive:true});
}
module.exports = {launch, fileUrl, sleep, sfxFiles, stageAssets};
