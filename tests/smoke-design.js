// Visual regression for the wide dojo: local assets, camera motion, fixed ledger and responsive bounds.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {launch,fileUrl,sleep}=require('../tools/cdp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.sandbox/dojo-design');
fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(path.join(root,'index.html'),'utf8')
  .replace(/function renderPosts\(\)\{\s*if\(!BOARD_URL\) return;/,'function renderPosts(){')
  .replace(/const BOARD_URL = '[^']*';/,"const BOARD_URL = '';")
  .replace(/\}\)\(\);\s*<\/script>/,'window.designTest={session,wsc,world,store,onDir,onButton,historyRows,dojo3d,roomCamera,roomProject,ROOM,roomAtlas,live,renderPosts,drawFighter,poseAt,anim,get scale(){return stageScale;}};})();</script>');
const noticeId=source.match(/const NOTICES = \[\s*\{id:'([^']+)'/)[1];
fs.writeFileSync(path.join(out,'index.html'),source);
for(const file of ['favicon.png','donate-kakao.png','sfx-wave.mp3','sfx-ewgf.mp3','sfx-wsc.mp3','sfx-tongbal.mp3','sfx-hellsweep.mp3','sfx-hit.mp3','sfx-backdash.mp3'])fs.copyFileSync(path.join(root,file),path.join(out,file));
  fs.cpSync(path.join(root,'bgm'),path.join(out,'bgm'),{recursive:true});
(async()=>{
 const b=await launch({port:9357,profile:'dojo-design-smoke',windowSize:'1440,1000'});
 try{
  await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.clear();localStorage.setItem('wave-ewgf-dojo-v1',JSON.stringify({v:4,lang:'ko',sound:0,noticeSeen:${JSON.stringify(noticeId)}}));`});
  await b.navigate(fileUrl(path.join(out,'index.html')));
  assert.equal(await b.evalJs('designTest.dojo3d && designTest.dojo3d.ready'),true,'native WebGL dojo initializes');
  assert.equal(await b.evalJs('designTest.roomAtlas.complete && designTest.roomAtlas.naturalWidth>0'),true,'embedded material atlas decodes');
  // Local fixture only: no publishing or backend calls. Exercise the visible community layout.
  await b.evalJs(`(()=>{const a=designTest;document.body.classList.add('has-community');document.querySelector('#postsCard').hidden=false;a.live.posts=[{id:1,nick:'도장 수련생',text:'오늘 처음으로 웨이브가 이어졌어요. 꾸준히 연습해봅니다!',created_at:Date.now(),likes:3,dislikes:0,replies:[]},{id:2,nick:'새벽 연습',text:'뒤 입력 타이밍을 조금 늦추니 웨캔기어가 되네요.',created_at:Date.now(),likes:2,dislikes:0,replies:[]}];a.live.posts.push(...Array.from({length:6},(_,i)=>({id:i+3,nick:'수련생'+i,text:'오늘도 초풍 연습하고 갑니다!',created_at:Date.now(),up:0,down:0,replies:[]})));a.renderPosts();document.querySelector('#postNickLabel').textContent='도장 수련생';})()`);
  assert.equal(await b.evalJs(`document.querySelector('#dReset')`),null);
  assert.equal(await b.evalJs(`document.querySelectorAll('#postList .post').length`),8);
  assert.ok(await b.evalJs(`(()=>{const r=document.querySelector('#postList').getBoundingClientRect();return [...document.querySelectorAll('#postList .post')].filter(e=>{const p=e.getBoundingClientRect();return p.top>=r.top-1&&p.bottom<=r.bottom+1;}).length>=5;})()`),'at least five short posts fit beside the taller scene');
  const bounds=()=>b.evalJs(`(()=>{const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {width:innerWidth,scroll:document.documentElement.scrollWidth,stage:r('#stageBox'),ledger:r('.input-ledger'),result:r('#resultCard'),stats:r('.stats'),canvas:r('#stage')};})()`);
  const first=await bounds();assert.ok(first.stage.height>=465 && first.stage.height<=510,'taller desktop stage');assert.ok(await b.evalJs('designTest.scale<=1.15'),'smaller 2D fighter');assert.ok(first.stats.top>=first.stage.bottom,'statistics below stage');
  const before=await b.evalJs('({x:designTest.world.charX,cam:designTest.world.camX})');
  for(let i=0;i<8;i++){
   await b.evalJs(`(()=>{const t=performance.now();for(const [d,dt] of [['f',0],['n',20],['d',40],['df',60],['f',80],['n',100]])designTest.onDir(d,t+dt);})()`);await sleep(150);
  }
  await sleep(400);const after=await b.evalJs('({x:designTest.world.charX,cam:designTest.world.camX,rows:designTest.historyRows().length})');
  assert.ok(after.x>before.x+100 && after.cam>before.cam+100,'wave advances both fighter and camera');assert.equal(after.rows,40);
  const ledger=await b.evalJs(`(()=>{const e=document.querySelector('#inputs'),h=e.firstElementChild.getBoundingClientRect().height;e.scrollTop=e.scrollHeight;return {visible:Math.floor(e.clientHeight/h),scrolled:e.scrollTop};})()`);
  assert.ok(ledger.visible>7,'desktop shows more than seven inputs');assert.ok(ledger.scrolled>0,'old inputs remain accessible');
  await b.evalJs(`document.querySelector('#inputs').scrollTop=0`);
  assert.equal((await bounds()).ledger.x,first.ledger.x,'input ledger remains fixed while scenery scrolls');
  const shot=async(name)=>{const r=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.result.data,'base64'));};
  await shot('desktop-wave');
  for(const width of [1440,1024,768,390,320]){
   await b.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
   await b.send('Emulation.setTouchEmulationEnabled',{enabled:width<500,maxTouchPoints:5});
   for(const lang of ['ko','en','ja']){
    await b.evalJs(`document.querySelector('[data-lang="${lang}"]').click()`);
    const trackLayout=await b.evalJs(`(()=>{const label=document.querySelector('#bgmTrack'),original=label.textContent,stage=document.querySelector('#stageBox');label.textContent='BGM';const short=stage.getBoundingClientRect().top;label.textContent='TEKKEN 7 鉄拳7 DUOMO DI SIRIO — long filename';const long=stage.getBoundingClientRect().top;label.textContent=original;return {short,long};})()`);
    assert.equal(trackLayout.short,trackLayout.long,`${width}/${lang}: song title must not move the play/touch area`);
    for(const mode of ['free','wsc']){
     await b.evalJs(`document.querySelector('[data-mode="${mode}"]').click()`);await sleep(80);
     const grouped=await b.evalJs(`(()=>{const a=designTest,t=Math.ceil(performance.now()/(1000/60))*(1000/60);a.onDir('df',t);for(const n of [4,2,1,3])a.onButton(n,t);const row=document.querySelector('#inputs .chip'),g=row.querySelector('.g').getBoundingClientRect(),f=row.querySelector('.f').getBoundingClientRect();return {label:row.querySelector('.g').textContent,frames:row.querySelectorAll('.f').length,overlap:g.right>f.left,overflow:row.scrollWidth>row.clientWidth};})()`);
     assert.equal(grouped.label,'↘+1+2+3+4');assert.equal(grouped.frames,1);assert.equal(grouped.overlap,false);assert.equal(grouped.overflow,false);
     const layout=await b.evalJs(`(()=>{const r=id=>document.getElementById(id).getBoundingClientRect().toJSON();return {stage:r('stageBox'),posts:r('postsCard'),panel:r('wscPanel'),start:r('wscChallengeBtn')};})()`);
     if(width>=1100)assert.ok(layout.posts.left>=layout.stage.right,'community beside stage');
     else assert.ok(layout.posts.top>=layout.stage.bottom,'community below stage on smaller screens');
     if(mode==='wsc'){
       assert.ok(layout.panel.top>=layout.stage.bottom,'WSC evaluation below play');
       const side=await b.evalJs(`document.querySelector('#sideSel').getBoundingClientRect().toJSON()`);
       assert.ok(layout.start.right<=side.left&&side.left-layout.start.right<20,'challenge start beside side buttons');
       assert.ok(layout.start.top>=layout.stage.top&&layout.start.bottom<layout.stage.top+100,'challenge start at stage top');
     }
     const r=await bounds();assert.ok(r.scroll<=r.width,`${width}/${lang}/${mode}: no horizontal overflow`);
     assert.ok(r.ledger.left>=r.stage.left&&r.ledger.right<=r.stage.right&&r.ledger.bottom<=r.stage.bottom,`${width}/${lang}/${mode}: ledger inside stage`);
     assert.ok(r.result.left>=r.ledger.right,`${width}/${lang}/${mode}: feedback does not overlap input ledger`);
     assert.ok(Math.abs(r.canvas.width-r.stage.width)<3,`${width}/${lang}/${mode}: canvas fills stage`);
     if(lang==='ko' && [1440,390].includes(width))await shot(`${mode}-${width}`);
    }
   }
  }
  // Countdown and the running trial clock occupy the upper center, separate from the toolbar.
  for(const width of [1440,390]){
    await b.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
    await b.send('Emulation.setTouchEmulationEnabled',{enabled:width<500,maxTouchPoints:5});
    await b.evalJs(`document.querySelector('[data-lang="ko"]').click()`);
    await b.evalJs(`document.querySelector('[data-mode="wave10"]').click();document.querySelector('#dStart').click()`);
    const clock=async id=>b.evalJs(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect(),s=document.querySelector('#stageBox').getBoundingClientRect();return {center:(r.left+r.right-s.left-s.right)/2,top:r.top-s.top,text:document.getElementById('${id}').textContent};})()`);
    const countdown=await clock('hudCenter');assert.ok(Math.abs(countdown.center)<2);assert.ok(countdown.top<80);assert.match(countdown.text,/3/);
    await sleep(3550);const running=await clock('hudTimer');assert.ok(Math.abs(running.center)<2);assert.ok(running.top<80);assert.match(running.text,/\d+\.\d/);
    await shot('timer-'+width);await b.evalJs(`document.querySelector('[data-mode="free"]').click()`);
  }
  // The returned fist must match the actual hand draw point under the caller transform.
  const fistError=await b.evalJs(`(()=>{const c=document.createElement('canvas'),g=c.getContext('2d'),a=designTest;let worst=0;
    for(const scale of [.9,1,1.15,2.3])for(const side of [-1,1])for(const dt of [80,180,300,410]){
      g.setTransform(scale,0,0,scale,7,-4);a.anim.kind='ewgf';a.anim.t0=1000;a.anim.electric=true;
      const hand=a.drawFighter(g,300,200,a.poseAt(1000+dt),side,1,null);
      // Re-render with identity: the public hand coordinate must be invariant to caller scaling/shake.
      g.setTransform(1,0,0,1,0,0);const ref=a.drawFighter(g,300,200,a.poseAt(1000+dt),side,1,null);
      worst=Math.max(worst,Math.abs(hand[0]-ref[0]),Math.abs(hand[1]-ref[1]));
    }return worst;})()`);
  assert.ok(fistError<1e-8,'fist anchor follows both facings and every uppercut pose');
  // The remaining settings reset clears both modes, including the retained WSC result.
  for(const mode of ['free','wsc']){
    const cleared=await b.evalJs(`(()=>{document.querySelector('[data-mode="${mode}"]').click();const a=designTest;
      a.session.tries=5;a.wsc.session.tries=4;a.wsc.challenge={status:'done',stats:{tries:10,hits:8,best:4},result:{completed:true,window:8,rec:{hits:8,target:10,best:4}}};
      document.querySelector('#setOpen').click();window.confirm=()=>true;document.querySelector('#dataReset').click();document.querySelector('#setDlg').close();
      return {tries:a.session.tries,wsc:a.wsc.session.tries,result:!!a.wsc.challenge.result,rows:a.historyRows().length,rank:document.querySelector('#dRank').textContent};})()`);
    assert.deepEqual(cleared,{tries:0,wsc:0,result:false,rows:0,rank:''},mode+' settings reset');
  }
  // Context loss must leave a correctly projected CPU room and working practice, then recover.
  const hasLoss=await b.evalJs(`!!(window.lossExt=designTest.dojo3d.gl.getExtension('WEBGL_lose_context'))`);
  if(hasLoss){
    await b.evalJs(`window.lossExt.loseContext()`);await sleep(200);
    assert.equal(await b.evalJs(`document.querySelector('#stageBox').dataset.renderer`),'canvas');
    await b.evalJs(`window.lossExt.restoreContext()`);
    for(let i=0;i<30;i++){if(await b.evalJs(`designTest.dojo3d.ready`))break;await sleep(100);}
    assert.equal(await b.evalJs(`designTest.dojo3d.ready`),true,await b.evalJs(`designTest.dojo3d.error`));await sleep(100);
    assert.equal(await b.evalJs(`document.querySelector('#stageBox').dataset.renderer`),'webgl');
  }
  await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`const nativeContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl'?null:nativeContext.call(this,kind,...args);};`});
  await b.navigate(fileUrl(path.join(out,'index.html')));
  assert.equal(await b.evalJs(`document.querySelector('#stageBox').dataset.renderer`),'canvas','no-WebGL browser stays usable');
  assert.deepEqual(b.errors,[]);console.log('PASS: WebGL/materials, taller stage and five visible posts, camera/2D alignment, fixed ledger; 30 responsive combinations; context loss/restore and no-WebGL fallback; errors=[]');
 }finally{b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
