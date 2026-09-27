// Real settings DOM + simulated Gamepad API. No live backend or physical controller needed.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {launch,fileUrl,sleep}=require('../tools/cdp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.sandbox/pad-settings/browser');
fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(path.join(root,'index.html'),'utf8')
  .replace(/<script async src="https:\/\/pagead2[^>]*><\/script>/,'') // Keep third-party ad diagnostics out of the local input fixture.
  .replace(/const BOARD_URL = '[^']*';/,"const BOARD_URL = '';")
  .replace(/\}\)\(\);\s*<\/script>/,'window.bindTest={store,session,pollPad,setLang};})();</script>');
fs.writeFileSync(path.join(out,'index.html'),source);
for(const file of ['favicon.png','donate-kakao.png','sfx-wave.mp3','sfx-ewgf.mp3','sfx-wsc.mp3','sfx-tongbal.mp3','sfx-hellsweep.mp3','sfx-hit.mp3','sfx-backdash.mp3']) fs.copyFileSync(path.join(root,file),path.join(out,file));
fs.cpSync(path.join(root,'bgm'),path.join(out,'bgm'),{recursive:true});
(async()=>{
 const b=await launch({port:9365,profile:'dojo-bindings-smoke',windowSize:'1100,1000'});
 try{
  await b.send('Emulation.setFocusEmulationEnabled',{enabled:true});
  await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`if(!sessionStorage.getItem('bindingsFixture')){localStorage.clear();localStorage.setItem('wave-ewgf-dojo-v1',JSON.stringify({lang:'ko',sound:0,noticeSeen:'${source.match(/const NOTICES = \[\s*\{id:'([^']+)'/)[1]}'}));sessionStorage.setItem('bindingsFixture','1');}addEventListener('gamepadconnected',e=>e.stopImmediatePropagation());addEventListener('gamepaddisconnected',e=>e.stopImmediatePropagation());window.testPad={index:0,id:'Test Controller',mapping:'standard',axes:[0,0,0,0,-1],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[testPad]});`});
  await b.navigate(fileUrl(path.join(out,'index.html')));
  const click=selector=>b.evalJs(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const sample=(indices=[],axes=[0,0,0,0,-1])=>b.evalJs(`testPad.buttons.forEach((v,i)=>{v.pressed=${JSON.stringify(indices)}.includes(i);v.value=v.pressed?1:0;});testPad.axes=${JSON.stringify(axes)};bindTest.pollPad();`);
  const key=async code=>{await b.send('Input.dispatchKeyEvent',{type:'keyDown',windowsVirtualKeyCode:code==='Escape'?27:undefined,key:code==='Escape'?'Escape':code.slice(3),code});await b.send('Input.dispatchKeyEvent',{type:'keyUp',windowsVirtualKeyCode:code==='Escape'?27:undefined,key:code==='Escape'?'Escape':code.slice(3),code});};
  await click('#setOpen');await click('#bindingTabs [data-device="pad"]');
  assert.equal(await b.evalJs(`document.querySelector('#padBindings').hidden`),false);
  await click('[data-pad="b2"]');await sample();await sample([7]);
  assert.equal(await b.evalJs('bindTest.store.padKeys.b2'),'b7',JSON.stringify(await b.evalJs(`({focus:document.hasFocus(),hidden:document.hidden,dialog:document.querySelector('#setDlg').open,message:document.querySelector('#bindingMessage').textContent,live:document.querySelector('#padLive').textContent})`)));
  assert.equal(await b.evalJs('bindTest.session.tries'),0);
  assert.match(await b.evalJs(`document.querySelector('[data-pad="b2"]').textContent`),/7/);
  await sample();await click('[data-pad="b1"]');await sample();await sample([7]);
  assert.deepEqual(await b.evalJs('[bindTest.store.padKeys.b1,bindTest.store.padKeys.b2]'),['b7','b2']);
  await click('[data-pad="up"]');await sample();await key('Escape');await sample([6]);
  assert.equal(await b.evalJs('bindTest.store.padKeys.up'),'auto');
  assert.equal(await b.evalJs(`document.querySelector('#setDlg').open`),true,'Escape cancels listening before closing settings');
  await click('[data-pad="up"]');await click('#bindingClear');assert.equal(await b.evalJs('bindTest.store.padKeys.up'),'none');
  await sample();await click('[data-pad="up"]');await sample();await sample([],[0,0,-1,0,-1]);
  assert.equal(await b.evalJs('bindTest.store.padKeys.up'),'a2-');
  await sample();await click('[data-pad="right"]');await sample([15],[1,0,0,0,-1]);
  assert.equal(await b.evalJs('bindTest.store.padKeys.right'),'b15','duplicated d-pad axis/button reports still bind');
  await sample();await click('[data-pad="b2"][data-pad-alt="1"]');await sample([8]);
  assert.equal(await b.evalJs('bindTest.store.padAltKeys.b2'),'b8');
  await click('[data-pad="b2"][data-pad-alt="1"]');await click('#bindingClear');
  assert.deepEqual(await b.evalJs('[bindTest.store.padKeys.b2,bindTest.store.padAltKeys.b2]'),['b2','none']);
  await sample();await click('[data-pad="b2"][data-pad-alt="1"]');await sample([8]);
  assert.equal(await b.evalJs('bindTest.store.padKeys.b2'),'b2');
  await click('#bindingTabs [data-device="kb"]');await click('[data-k="b2"][data-alt="1"]');await key('KeyP');
  assert.equal(await b.evalJs('bindTest.store.altKeys.b2'),'KeyP');
  await click('[data-k="b1"][data-alt="1"]');await key('KeyP');
  assert.match(await b.evalJs(`document.querySelector('#bindingMessage').textContent`),/사용 중/);
  await click('#bindingCancel');await click('#setClose');
  await sample([2]);assert.equal(await b.evalJs('bindTest.session.tries'),0,'release gate prevents accidental RP after closing');
  await sample();await sample([2]);assert.equal(await b.evalJs('bindTest.session.tries'),1);
  await b.navigate(fileUrl(path.join(out,'index.html')));
  assert.deepEqual(await b.evalJs('[bindTest.store.padKeys.b2,bindTest.store.padKeys.up,bindTest.store.altKeys.b2]'),['b2','a2-','KeyP']);
  assert.equal(await b.evalJs('bindTest.store.padAltKeys.b2'),'b8');
  await click('#setOpen');
  await sample();await click('#bindingTabs [data-device="kb"]');await click('[data-k="b1"][data-alt="1"]');
  await sample([9]);assert.equal(await b.evalJs(`document.querySelector('#padBindings').hidden`),false);
  assert.equal(await b.evalJs('bindTest.store.altKeys.b1'),'','device switch cancels keyboard capture');
  await key('KeyO');assert.equal(await b.evalJs(`document.querySelector('#keyboardBindings').hidden`),false);
  await sample([9]);assert.equal(await b.evalJs(`document.querySelector('#keyboardBindings').hidden`),false,'held pad must not bounce back');
  await sample();await sample([9]);assert.equal(await b.evalJs(`document.querySelector('#padBindings').hidden`),false);
  await click('[data-pad="b4"][data-pad-alt="1"]');await key('KeyL');
  assert.equal(await b.evalJs('bindTest.store.padAltKeys.b4'),'none','keyboard switch cancels pad capture');
  assert.equal(await b.evalJs(`document.querySelector('#keyboardBindings').hidden`),false);
  await sample();
  const beforeCheck=await b.evalJs('JSON.stringify(bindTest.store)');
  await click('#bindingCheck');assert.equal(await b.evalJs(`document.querySelector('#bindingCheck').getAttribute('aria-pressed')`),'true');
  await b.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyI',key:'i'});
  await b.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyP',key:'p'});
  assert.equal(await b.evalJs(`document.querySelectorAll('#keys [data-k="b2"].checked').length`),2);
  await b.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyI',key:'i'});
  assert.equal(await b.evalJs(`document.querySelectorAll('#keys [data-k="b2"].checked').length`),1);
  await sample([2,8]);assert.equal(await b.evalJs(`document.querySelectorAll('#padKeys [data-pad="b2"].checked').length`),2);
  assert.equal(await b.evalJs(`document.querySelector('#padBindings').hidden`),false);
  await b.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyP',key:'p',autoRepeat:true});
  assert.equal(await b.evalJs(`document.querySelector('#padBindings').hidden`),false,'keyboard autorepeat must not steal the pad tab during input check');
  await b.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyP',key:'p'});
  await click('[data-pad="b2"]');await click('#bindingReset');
  assert.equal(await b.evalJs('JSON.stringify(bindTest.store)'),beforeCheck,'check mode cannot edit or reset bindings');
  await sample();assert.equal(await b.evalJs(`document.querySelectorAll('.key-bind.checked').length`),0);
  await b.send('Input.dispatchKeyEvent',{type:'keyDown',code:'ArrowLeft',key:'ArrowLeft'});
  assert.equal(await b.evalJs(`document.querySelector('#keys [data-action="left"]').classList.contains('checked')`),true,'always-enabled arrow key highlights its action');
  await b.send('Input.dispatchKeyEvent',{type:'keyUp',code:'ArrowLeft',key:'ArrowLeft'});
  await click('#bindingCheck');assert.equal(await b.evalJs(`document.querySelector('#bindingCheck').getAttribute('aria-pressed')`),'false');
  await click('#bindingCheck');await key('Escape');await sleep(60);await click('#setOpen');
  assert.equal(await b.evalJs(`document.querySelector('#bindingCheck').getAttribute('aria-pressed')`),'false','closing settings exits check mode');
  for(const lang of ['ko','en','ja']){
   await b.evalJs(`bindTest.setLang('${lang}')`);
   for(const width of [1100,390,320]){
    await b.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
    for(const device of ['kb','pad']){
     await click(`#bindingTabs [data-device="${device}"]`);await b.evalJs(`document.querySelector('#setDlg').scrollTop=0`);await sleep(60);
     const bounds=await b.evalJs(`(()=>{const d=document.querySelector('#setDlg'),r=d.getBoundingClientRect();return {overflow:d.scrollWidth>d.clientWidth+1,left:r.left,right:r.right,viewport:innerWidth,small:[...document.querySelectorAll('${device==='pad'?'#padKeys':'#keys'} .key-bind')].some(e=>e.getBoundingClientRect().height<44)};})()`);
     assert.equal(await b.evalJs(`getComputedStyle(document.querySelector('${device==='pad'?'#padKeys':'#keys'}')).gridTemplateColumns.split(' ').length`),2,'both devices use the keyboard two-column grid');
     assert.equal(bounds.overflow,false,`${lang}/${width}/${device} horizontal overflow`);assert.ok(bounds.left>=0&&bounds.right<=bounds.viewport,JSON.stringify(bounds));assert.equal(bounds.small,false);
     if(lang==='ko' && width!==320){const shot=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,`${device}-${width}.png`),Buffer.from(shot.result.data,'base64'));}
    }
   }
  }
  await b.evalJs("bindTest.setLang('ko')");await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:true});
  await click('#bindingCheck');await sample([2,8]);await b.evalJs("document.querySelector('#setDlg').scrollTop=0");
  const checkShot=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'check-pad-390.png'),Buffer.from(checkShot.result.data,'base64'));
  await sample();await click('#bindingCheck');await click('#bindingTabs [data-device="pad"]');
  await b.evalJs('window.confirm=()=>true');await click('#bindingReset');
  assert.equal(await b.evalJs('bindTest.store.padAltKeys.b2'),'none');
  assert.equal(await b.evalJs('bindTest.store.padKeys.b2'),'b3');assert.equal(await b.evalJs('bindTest.store.altKeys.b2'),'KeyP','pad reset preserves keyboard');
  await click('#bindingTabs [data-device="kb"]');await click('#bindingReset');assert.equal(await b.evalJs('bindTest.store.altKeys.b2'),'');
  assert.deepEqual(b.errors,[]);console.log('Bindings smoke passed: input-check highlights/release/edit protection/close cleanup, matching layouts, automatic device switching/capture cancellation, alternate capture/persistence/reset, idle -1 axis capture, duplicated d-pad reports, swap, clear, Escape, conflict, persistence, release gate, reset; 18 layouts; JS errors 0.');
 }finally{b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
