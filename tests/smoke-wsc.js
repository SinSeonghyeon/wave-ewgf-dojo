// WSC UI smoke: real browser input listeners, deterministic event timestamps, no live backend.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {launch,fileUrl,sleep}=require('../tools/cdp');
const out=path.resolve(__dirname,'../.sandbox/wsc/browser');fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8').replace(/const BOARD_URL = '[^']*';/,"const BOARD_URL = '';");
const latestNoticeId=html.match(/const NOTICES = \[\s*\{id:'([^']+)'/)[1];
const page=path.join(out,'index.html');fs.writeFileSync(page,html);
for(const name of ['favicon.png','donate-kakao.png','bgm.mp3','sfx-wave.mp3','sfx-ewgf.mp3','sfx-wsc.mp3','sfx-hellsweep.mp3','sfx-tongbal.mp3','sfx-hit.mp3','sfx-backdash.mp3'])fs.copyFileSync(path.resolve(__dirname,'..',name),path.join(out,name));
(async()=>{
 const b=await launch({port:9335,profile:'dojo-wsc-smoke',windowSize:'1366,1000'});
 try{
  await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('wave-ewgf-dojo-v1',JSON.stringify({v:4,lang:'ko',sound:0,fx:0,noticeSeen:${JSON.stringify(latestNoticeId)},visitDay:new Date(Date.now()+9*3600e3).toISOString().slice(0,10)}));`});
  await b.navigate(fileUrl(page));
  const click=async sel=>b.evalJs(`document.querySelector(${JSON.stringify(sel)}).click()`);
  // Keyboard events use the same event.timeStamp path as hardware; dispatch a whole command in one JS turn.
  const command=async(A,B,side=1,waves=1)=>{
   await sleep(waves*80+240); // keep event times chronological across consecutive commands
   return b.evalJs(`(()=>{
    let t=performance.now()-(${waves}*80+200);const F=1000/60,f=${side}===1?'KeyD':'KeyA',back=${side}===1?'KeyA':'KeyD';
    const key=(code,at,up=false)=>{const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:at});window.dispatchEvent(e);};
    for(let wave=0;wave<${waves};wave++){
     key(f,t);key(f,t+10,true);key('KeyS',t+20);key(f,t+30);
     if(wave+1<${waves}){key('KeyS',t+40,true);key(f,t+50,true);t+=80;}
    }
    key('KeyS',t+40,true);key(f,t+50,true);key(back,t+30+(${A}-1)*F);
    ${B==null?'':`key('KeyI',t+30+(${A}-1+${B})*F);key('KeyI',t+31+(${A}-1+${B})*F,true);`}
    key(back,t+32+(${A}-1+${B??0})*F,true);
    return {result:document.querySelector('#wscResult').textContent,detail:document.querySelector('#wscDetail').textContent,ab:document.querySelector('#wscAB').textContent,stats:document.querySelector('#wscStats').textContent,old:[document.querySelector('#stTry').textContent,document.querySelector('#stDash').textContent]};
   })()`);
  };
  await click('[data-mode="wsc"]');
  for(const [A,B] of [[8,1],[9,1],[9,2],[10,1],[10,2],[10,3]]){
   const r=await command(A,B);assert.match(r.result,/웨캔기어 성공/);assert.match(r.ab,new RegExp(`${A}f`));assert.match(r.ab,new RegExp(`${B}f`));assert.deepEqual(r.old,['0','0']);
  }
  assert.match((await command(8,2)).detail,/RP가 늦/);
  assert.match((await command(8,0)).detail,/동시/);
  assert.equal(await b.evalJs(`document.querySelector('#wscSteps')===null`),true);
  assert.equal(await b.evalJs(`document.querySelector('#dShare').hidden`),true);
  assert.notEqual(await b.evalJs(`getComputedStyle(document.querySelector('#inputs')).display`),'none');
  assert.match(await b.evalJs(`document.querySelector('#inputs').textContent`),/f/);
  assert.notEqual(await b.evalJs(`getComputedStyle(document.querySelector('#resultCard')).display`),'none');
  const shots=[];
  for(const width of [1366,390]) for(const lang of ['ko','en','ja']) for(const side of [1,-1]){
   await b.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390});
   await b.send('Emulation.setTouchEmulationEnabled',{enabled:width===390});
   await b.send('Emulation.setEmulatedMedia',{features:[{name:'pointer',value:width===390?'coarse':'fine'},{name:'prefers-reduced-motion',value:'reduce'}]});
   await click(`[data-lang="${lang}"]`);await click(`[data-side="${side}"]`);
   const r=await command(9,2,side);assert.match(r.result,lang==='ko'?/웨캔기어 성공/:lang==='en'?/upper success/:/キャンセル成功/);
   await click('#wscChallengeBtn');
   assert.equal(await b.evalJs(`document.querySelector('#wscTask').hidden`),false);
   const layout=await b.evalJs(`(()=>{const q=s=>document.querySelector(s),r=q('#wscPanel').getBoundingClientRect(),axis=q('.wsc-scroll');return {width:document.documentElement.scrollWidth,panelRight:r.right,panelX:r.x,panelY:r.y,stageRight:q('#stageBox').getBoundingClientRect().right,stageBottom:q('#stageBox').getBoundingClientRect().bottom,negative:q('#wscAxis').querySelector('[data-frame^="-"]')!==null,command:q('#wscCommand').textContent,cells:q('#wscAxis').children.length,scroll:axis.scrollWidth>axis.clientWidth,records:getComputedStyle(q('.records')).display,missing:[...q('#wscPanel').querySelectorAll('[data-i18n]')].filter(e=>!e.textContent||e.textContent.startsWith('wsc.')).length};})()`);
   assert.ok(layout.width<=width,JSON.stringify(layout));assert.ok(layout.panelRight<=width);assert.equal(layout.command,'6N23 · '+(side===1?'←':'→')+' · RP');assert.equal(layout.cells,15);assert.equal(layout.negative,false);assert.equal(await b.evalJs(`document.querySelector('#wscAxis').firstElementChild.dataset.frame`),'1');if(width===1366)assert.ok(layout.panelX>layout.stageRight);else assert.ok(layout.panelY>layout.stageBottom);assert.equal(layout.missing,0);assert.equal(layout.records,'none');if(width===390)assert.ok(layout.scroll);
   await b.evalJs(`document.querySelector('#wscPanel').scrollIntoView({block:'center'})`);await sleep(100);
   const shot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
   const name=`wsc-${width}-${lang}-${side===1?'1p':'2p'}.png`;fs.writeFileSync(path.join(out,name),Buffer.from(shot.result.data,'base64'));shots.push(name);await click('#wscChallengeBtn');
   // Actual RAF progression, with d/f at performance.now(): no synthetic tick calls.
   await b.evalJs(`(()=>{const t=performance.now()-30,f=${side}===1?'KeyD':'KeyA';for(const [code,dt,up] of [[f,0,false],[f,10,true],['KeyS',20,false],[f,30,false]]){const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true});Object.defineProperty(e,'timeStamp',{value:t+dt});dispatchEvent(e);}})()`);
   const initial=Number(await b.evalJs(`document.querySelector('#wscLive').dataset.frame`));await sleep(70);
   const live=await b.evalJs(`(()=>{const q=s=>document.querySelector(s),c=q('#wscAxis .current'),r=c&&c.getBoundingClientRect(),b=q('.wsc-scroll').getBoundingClientRect();return {frame:Number(q('#wscLive').dataset.frame),text:q('#wscLive').textContent,current:c&&Number(c.dataset.frame),visible:r&&r.left>=b.left-1&&r.right<=b.right+1};})()`);
   assert.ok(live.frame>initial,JSON.stringify(live));assert.equal(live.current,Math.min(live.frame,15));assert.ok(live.visible);assert.match(live.text,/A [0-9]+f/);
   await b.evalJs(`document.querySelector('#wscLive').scrollIntoView({block:'center'})`);
   const liveShot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(out,'live-'+name),Buffer.from(liveShot.result.data,'base64'));
   await click('#setOpen');await click('#setClose');
   assert.equal(await b.evalJs(`document.querySelectorAll('#wscAxis .current').length`),0);
  }
  // Modal/side changes cancel unfinished attempts, rather than creating a failed record.
  await click('[data-lang="ko"]');await click('[data-side="1"]');
  await b.evalJs(`(()=>{let t=performance.now();for(const [code,up] of [['KeyD',false],['KeyD',true],['KeyS',false],['KeyD',false]]){const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true});Object.defineProperty(e,'timeStamp',{value:t+=10});dispatchEvent(e);}})()`);
  await click('#setOpen');await click('#setClose');assert.match(await b.evalJs(`document.querySelector('#wscResult').textContent`),/취소/);
  // Complete an actual 10-task challenge after its real countdown; no existing trial/board runs.
  await click('#wscChallengeBtn');assert.match(await b.evalJs(`document.querySelector('#wscChallengeStatus').textContent`),/초 후/);
  await command(8,1);assert.doesNotMatch(await b.evalJs(`document.querySelector('#wscChallengeStatus').textContent`),/성공/);
  await sleep(3100);
  for(let i=0;i<10;i++){const n=Number(await b.evalJs(`document.querySelector('#wscTask').dataset.n`));assert.ok(n>=0&&n<=3);await command(8,i<8?1:2,1,n+1);}
  assert.match(await b.evalJs(`document.querySelector('#wscChallengeStatus').textContent`),/8\/10.*80%.*8연속/);
  assert.equal(await b.evalJs(`document.querySelector('#dShare').hidden`),true);
  assert.equal(await b.evalJs(`document.querySelector('#hudScore').textContent`),'');
  await click('#wscChallengeBtn');await click('#setOpen');await click('#setClose');
  assert.match(await b.evalJs(`document.querySelector('#wscChallengeStatus').textContent`),/도전 취소/);
  // Same WSC command in every mode and on either side, without EWGF tries.
  for(const mode of ['free','wsc','wave10','ewgf20','combo10','rush30','bd10'])for(const side of [1,-1]){
   await click(`[data-mode="${mode}"]`);await click(`[data-side="${side}"]`);
   const before=await b.evalJs(`document.querySelector('#stTry').textContent`);await command(8,1,side);
   assert.match(await b.evalJs(`document.querySelector('#rTitle').textContent`),/웨캔기어 성공/);
   assert.equal(await b.evalJs(`document.querySelector('#stTry').textContent`),before);
  }
  await click('[data-mode="wsc"]');await click('[data-side="1"]');
  for(const move of ['ewgf','hellsweep','tongbal']){
   const result=await b.evalJs(`(()=>{
    const t=performance.now(),key=(code,dt,up=false)=>{const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true});Object.defineProperty(e,'timeStamp',{value:t+dt});dispatchEvent(e);};
    key('KeyD',0);key('KeyD',10,true);
    if('${move}'!=='tongbal')key('KeyS',20);
    key('KeyD',30);key('${move}'==='hellsweep'?'KeyK':'KeyI',30);key('${move}'==='hellsweep'?'KeyK':'KeyI',31,true);key('KeyD',32,true);key('KeyS',32,true);
    return document.querySelector('#rTitle').textContent;
   })()`);
   assert.match(result,move==='ewgf'?/초풍/:move==='hellsweep'?/나락/:/통발/);
  }
  // Render the simple uppercut with effects enabled (the earlier layout checks use static effects).
  await b.send('Emulation.setDeviceMetricsOverride',{width:1366,height:1000,deviceScaleFactor:1,mobile:false});
  await b.send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await b.send('Emulation.setEmulatedMedia',{features:[{name:'pointer',value:'fine'},{name:'prefers-reduced-motion',value:'no-preference'}]});
  await b.navigate(fileUrl(page));await click('[data-mode="wsc"]');await click('#setOpen');await click('[data-fx="1"]');await click('#setClose');
  await command(8,1);await sleep(120);
  const motionShot=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'wsc-uppercut.png'),Buffer.from(motionShot.result.data,'base64'));
  await click('[data-mode="free"]');assert.notEqual(await b.evalJs(`getComputedStyle(document.querySelector('.records')).display`),'none');
  assert.doesNotMatch(await b.evalJs(`document.querySelector('#rTitle').textContent`),/웨캔/);
  assert.equal(await b.evalJs(`document.querySelector('#winSel')===null`),true);
  assert.deepEqual(b.errors,[]);console.log(JSON.stringify({ok:true,shots,errors:b.errors},null,2));
 }finally{b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
