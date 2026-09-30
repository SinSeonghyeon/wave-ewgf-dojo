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
  // Inspect the entire notice list, including retained entries: checking only the newest
  // card against an already-overwritten dictionary missed a mixed-language regression.
  await evalJs(`document.querySelector('#noticeOpen').click()`);
  for(const lang of ['ja','ko','en','ja','ko']){
    await evalJs(`document.querySelector('#langSel button[data-lang="${lang}"]').click()`);
    const notice=await evalJs(`(()=>{const list=document.querySelector('#noticeList'),first=list.querySelector('.notice-item');return {lang:document.documentElement.lang,count:list.querySelectorAll('.notice-item').length,title:first.querySelector('h3').textContent,highlight:first.querySelector('.notice-highlight h4').textContent,items:first.querySelectorAll(':scope > ul > li').length,text:list.textContent}})()`);
    assert.equal(notice.lang,lang);assert.equal(notice.count,5);assert.equal(notice.items,8);
    assert.equal(notice.title,{ko:'9월 30일 업데이트 · 주인장 소식',en:'September 30 update · A note from the creator',ja:'9月30日の更新・運営者からのお知らせ'}[lang]);
    assert.equal(notice.highlight,dict[lang]['notice.wedding.title']);
    if(lang!=='ja')assert.doesNotMatch(notice.text,/[\u3040-\u30ff]/,lang+' must not show Japanese notice text');
    for(const width of [320,390,1280]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
      const overflow=await evalJs(`(()=>{const d=document.querySelector('#noticeDlg');if(d.scrollWidth<=d.clientWidth+1)return null;const wide=[...d.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>d.getBoundingClientRect().right+1).slice(0,3).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().width)+'px '+JSON.stringify(e.textContent.slice(0,30)));return {scroll:d.scrollWidth,client:d.clientWidth,wide};})()`);
      assert.equal(overflow,null,`notice dialog overflows horizontally (${lang}, ${width}px): ${JSON.stringify(overflow)}`);
      const capture=await send('Page.captureScreenshot',{format:'png'});
      const folder=path.resolve(__dirname,'../.sandbox/notices');fs.mkdirSync(folder,{recursive:true});
      fs.writeFileSync(path.join(folder,`${lang}-${width}.png`),Buffer.from(capture.result.data,'base64'));
    }
  }
  await evalJs(`document.querySelector('#noticeClose').click()`);
  // QR is generated on demand, and must resolve from every locale to the shared root asset.
  await evalJs(`document.querySelector('#donateTop').click()`);await sleep(300);
  assert.ok(seen.includes('/donate-kakao.png'));
  await evalJs(`document.querySelector('#donateClose').click();document.querySelector('#bgmBtn').click()`);await sleep(500);
  await evalJs(`document.querySelector('#bgmNext').click()`);await sleep(500);
  assert.ok(new Set(seen.filter(p=>p.startsWith('/bgm/')&&p.endsWith('.mp3'))).size>=2,'current and next BGM use root assets');
  assert.ok(seen.includes('/bgm/playlist.json'));assert.ok(seen.includes('/sfx/wave.mp3'));
  assert.deepEqual(missing,[]);
  const errors=browser.errors.filter(e=>!e.includes('ERR_BLOCKED_BY_CLIENT'));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({locales:['ko','en','ja'],staticHtml:true,sharedStorage:true,sessionPreserved:true,missing,errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{browser?.close();server?.close();});
