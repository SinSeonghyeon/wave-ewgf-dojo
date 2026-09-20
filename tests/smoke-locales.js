// Exercise the generated Pages artifact over HTTP, including URLs, shared storage and real asset paths.
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
const {buildSite,dictionaries}=require('../tools/build-site');
const {launch,sleep}=require('../tools/cdp');
let browser, server;
(async()=>{
  const {output}=buildSite(), seen=[], missing=[];
  const source=fs.readFileSync(path.join(output,'index.html'),'utf8'), dict=dictionaries(source);
  server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost'), pathname=decodeURIComponent(url.pathname);
    const filename=path.resolve(output,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
    if(!filename.startsWith(output+path.sep)||!fs.existsSync(filename)){missing.push(pathname);res.writeHead(404);res.end();return;}
    seen.push(pathname);
    const ext=path.extname(filename), types={'.html':'text/html; charset=utf-8','.json':'application/json','.png':'image/png','.mp3':'audio/mpeg'};
    let data=fs.readFileSync(filename);
    if(ext==='.html')data=Buffer.from(data.toString().replace(/const BOARD_URL = '[^']*';/,"const BOARD_URL = '';"));
    res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});res.end(data);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const probe=http.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  browser=await launch({port,profile:'dojo-locales-'+process.pid+'-'+Date.now()});
  const {send,evalJs,navigate}=browser;
  // External fonts/ads aren't part of URL routing; exercise local resources without third-party requests.
  await send('Network.enable');
  await send('Network.setBlockedURLs',{urls:['https://pagead2.googlesyndication.com/*','https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    Object.defineProperty(navigator,'language',{value:'en-US'});
    Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
    for(const type of ['gamepadconnected','gamepaddisconnected'])addEventListener(type,e=>e.stopImmediatePropagation(),true);
  `});
  // No-JS inspection proves the searchable content is localized in the response itself.
  await send('Emulation.setScriptExecutionDisabled',{value:true});
  for(const lang of ['ko','en','ja']){
    await navigate(base+'/'+lang+'/',200);
    assert.equal(await evalJs('document.documentElement.lang'),lang);
    assert.equal(await evalJs('document.title'),dict[lang]['app.docTitle']);
    assert.equal(await evalJs(`document.querySelector('[data-i18n="about.what.p"]').textContent`),dict[lang]['about.what.p']);
    assert.equal(await evalJs('!!document.querySelector("#stage")'),true);
  }
  await send('Emulation.setScriptExecutionDisabled',{value:false});
  await navigate(base+'/',400);
  assert.equal(await evalJs('document.documentElement.lang'),'en','root detects English');
  // Seed after the outgoing root page has flushed its settings on pagehide, before the next app boots.
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(!sessionStorage.localeSeeded){sessionStorage.localeSeeded='1';localStorage.setItem('wave-ewgf-dojo-v1',JSON.stringify({v:4,lang:'ja',nick:'locale-test',nickToken:'ab'.repeat(24),bgmVol:37,sound:0,noticeSeen:${JSON.stringify(source.match(/const NOTICES = \[\s*\{id:'([^']+)'/)[1])}}));}`});
  for(const lang of ['ko','en','ja']){
    await navigate(base+'/'+lang+'/',500);
    const state=await evalJs(`({lang:document.documentElement.lang,title:document.title,canonical:document.querySelector('link[rel="canonical"]').href,nick:JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).nick,vol:JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).bgmVol})`);
    assert.equal(state.lang,lang);assert.equal(state.title,dict[lang]['app.docTitle']);
    assert.equal(state.canonical,'https://mishimaryu.com/'+lang+'/');assert.equal(state.nick,'locale-test');assert.equal(state.vol,37);
    // Trigger actual input and local audio preloads; settings language switching must not reload or clear statistics.
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'s',code:'KeyS',windowsVirtualKeyCode:83});
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'s',code:'KeyS',windowsVirtualKeyCode:83});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
    await sleep(150);
    const before=await evalJs(`document.querySelector('#stDash').textContent`);assert.ok(Number(before)>0);
    await evalJs(`window.localeSessionMarker=1;document.querySelector('#langSel button[data-lang="ko"]').click()`);
    assert.equal(await evalJs('location.pathname'),'/ko/');assert.equal(await evalJs('window.localeSessionMarker'),1);
    assert.equal(await evalJs(`document.querySelector('#stDash').textContent`),before);
    await send('Page.reload');await sleep(500);assert.equal(await evalJs('document.documentElement.lang'),'ko');
    await evalJs(`document.querySelector('.section-links a').click()`);
    assert.equal(await evalJs('location.pathname'),'/ko/','fragment navigation stays in language app');
  }
  // QR is generated on demand, and must resolve from every locale to the shared root asset.
  await evalJs(`document.querySelector('#donateTop').click()`);await sleep(300);
  assert.ok(seen.includes('/donate-kakao.png'));
  await evalJs(`document.querySelector('#donateClose').click();document.querySelector('#bgmBtn').click()`);await sleep(500);
  await evalJs(`document.querySelector('#bgmNext').click()`);await sleep(500);
  assert.ok(new Set(seen.filter(p=>p.startsWith('/bgm/')&&p.endsWith('.mp3'))).size>=2,'current and next BGM use root assets');
  assert.ok(seen.includes('/bgm/playlist.json'));assert.ok(seen.includes('/sfx-wave.mp3'));
  assert.deepEqual(missing,[]);
  const errors=browser.errors.filter(e=>!e.includes('ERR_BLOCKED_BY_CLIENT'));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({locales:['ko','en','ja'],staticHtml:true,sharedStorage:true,sessionPreserved:true,missing,errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{browser?.close();server?.close();});
