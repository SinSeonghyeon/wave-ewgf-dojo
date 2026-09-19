const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {tracksAt} = require('../tools/update-bgm');
const {launch, sleep} = require('../tools/cdp');
(async()=>{
  const root=path.join(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8')
    .replace(/^const BGM_TRACKS=.*; \/\/ Generated local fallback.*$/m,'const BGM_TRACKS=[]; // HTTP test must discover songs from the manifest.')
    .replace(/const BOARD_URL = '[^']*';/, "const BOARD_URL = '';")
    .replace(/\}\)\(\);\s*<\/script>/, 'globalThis.soundTest={BGM_GAIN,BGM_TRACKS,bgmNext,bgmTogglePlay,SFX_START,snd,unlockAudio,playSfx,fx,world,impacts,store};})();</script>');
  const server=http.createServer((req,res)=>{
    const file=decodeURIComponent(req.url.slice(1));
    if(file===''){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html);}
    if(file==='bgm/playlist.json'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(tracksAt(path.join(root,'bgm'))));}
    if([...tracksAt(path.join(root,'bgm')),'sfx-wave.mp3','sfx-ewgf.mp3','sfx-wsc.mp3','sfx-hellsweep.mp3','sfx-tongbal.mp3','sfx-hit.mp3','sfx-backdash.mp3'].includes(file)){
      const data=fs.readFileSync(path.join(root,file)),range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
      res.setHeader('Content-Type','audio/mpeg');res.setHeader('Accept-Ranges','bytes');
      if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});return res.end(data.subarray(start,end+1));}
      res.setHeader('Content-Length',data.length);return res.end(data);
    }
    res.writeHead(204);res.end();
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let b,ws;
  try{
    const probe=http.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const debugPort=probe.address().port;await new Promise(r=>probe.close(r));
    b=await launch({port:debugPort,profile:'dojo-sound-smoke-'+Date.now()});
    const url=`http://127.0.0.1:${server.address().port}/`;
    await b.navigate(url);
    const {result:{targetId}}=await b.send('Target.createTarget',{url,newWindow:true});
    const targets=await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
    ws=new WebSocket(targets.find(t=>t.id===targetId).webSocketDebuggerUrl);
    await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
    let id=0;const pending=new Map();
    ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
    const send2=(method,params)=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}));});
    const evaluate=async(send,expression)=>{
      const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
      assert.ok(!r.error && !r.result.exceptionDetails,JSON.stringify(r));return r.result.result.value;
    };
    await sleep(1000);
    const state='({hidden:document.hidden,playing:!!soundTest.snd.bgm&&!soundTest.snd.bgm.paused})';
    await evaluate(b.send,'soundTest.unlockAudio()');await sleep(300);
    await evaluate(send2,'soundTest.unlockAudio()');await sleep(300);
    assert.deepEqual(await evaluate(b.send,state),{hidden:false,playing:true});
    assert.deepEqual(await evaluate(send2,state),{hidden:false,playing:false});
    await evaluate(b.send,`document.querySelector('#soundSel button[data-sound="0"]').click()`);await sleep(300);
    assert.equal((await evaluate(b.send,state)).playing,false);
    assert.equal((await evaluate(send2,state)).playing,true);
    await evaluate(b.send,`document.querySelector('#soundSel button[data-sound="1"]').click()`);await sleep(100);
    assert.equal((await evaluate(b.send,state)).playing,false);
    await b.send('Target.closeTarget',{targetId});await sleep(300);
    assert.equal((await evaluate(b.send,state)).playing,true);
    // Decode and actually play every supplied music file, then check pause/skip/end behavior.
    for(let track=0;track<tracksAt(path.join(root,'bgm')).length;track++){
      const media=await evaluate(b.send,`(async()=>{const s=soundTest;if(s.snd.track!==${track}){const native=Math.random,choices=s.BGM_TRACKS.map((_,i)=>i).filter(i=>i!==s.snd.track);Math.random=()=> (choices.indexOf(${track})+.1)/choices.length;try{s.bgmNext();}finally{Math.random=native;}}const a=s.snd.bgm;await new Promise((resolve,reject)=>{if(a.readyState>=2)return resolve();const timer=setTimeout(()=>reject(new Error('BGM decode timeout')),10000);a.addEventListener('canplay',()=>{clearTimeout(timer);resolve();},{once:true});a.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('BGM decode failed'));},{once:true});});return {track:s.snd.track,loop:a.loop,duration:a.duration,paused:a.paused,volume:a.volume,gain:s.BGM_GAIN[s.BGM_TRACKS[s.snd.track]]??1};})()`);
      assert.equal(media.track,track);assert.equal(media.loop,false);assert.ok(media.duration>0);assert.equal(media.paused,false);assert.ok(Math.abs(media.volume-media.gain)<1e-6);
    }
    await evaluate(b.send,'soundTest.bgmTogglePlay()');
    const paused=await evaluate(b.send,'({track:soundTest.snd.track,time:soundTest.snd.bgm.currentTime,paused:soundTest.snd.bgm.paused})');assert.equal(paused.paused,true);
    await evaluate(b.send,'soundTest.bgmNext()');assert.equal(await evaluate(b.send,'soundTest.snd.bgm.paused'),true);assert.notEqual(await evaluate(b.send,'soundTest.snd.track'),paused.track);
    await evaluate(b.send,'soundTest.bgmTogglePlay()');await sleep(100);
    const prior=await evaluate(b.send,'soundTest.snd.track');await evaluate(b.send,`soundTest.snd.bgm.dispatchEvent(new Event('ended'))`);assert.notEqual(await evaluate(b.send,'soundTest.snd.track'),prior);
    await evaluate(b.send,`soundTest.playSfx('ewgf');document.querySelector('#sfxVol').value=25;document.querySelector('#sfxVol').dispatchEvent(new Event('input'))`);
    assert.equal(await evaluate(b.send,`soundTest.snd.pool.ewgf.some(a=>!a.paused && a.volume===.25)`),true);
    await evaluate(b.send,`document.querySelector('#soundSel button[data-sound="0"]').click()`);
    assert.equal(await evaluate(b.send,`Object.values(soundTest.snd.pool).flat().every(a=>a.paused && a.volume===0)`),true);
    await evaluate(b.send,`document.querySelector('#soundSel button[data-sound="1"]').click()`);
    for(const name of ['wsc','hellsweep','tongbal','hit','backdash']){
      const media=await evaluate(b.send,`(async()=>{soundTest.playSfx('${name}');const a=soundTest.snd.pool.${name}.find(a=>!a.paused);if(!a)throw new Error('no playing voice: ${name}');await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('audio decode timeout')),8000);const done=()=>{clearTimeout(timeout);resolve();};if(a.readyState>=2)done();else{a.addEventListener('canplay',done,{once:true});a.addEventListener('error',()=>{clearTimeout(timeout);reject(new Error('audio decode failed'));},{once:true});}});return {ready:a.readyState,duration:a.duration,error:a.error&&a.error.code,volume:a.volume};})()`);
      assert.ok(media.ready>=2&&media.duration>0,JSON.stringify({name,media}));assert.equal(media.error,null);assert.equal(media.volume,['wsc','tongbal'].includes(name)?.2:.25);
    }
    const onset=await evaluate(b.send,`(async()=>{const ctx=new AudioContext(),buf=await ctx.decodeAudioData(await (await fetch('sfx-hit.mp3')).arrayBuffer()),x=buf.getChannelData(0),step=Math.round(buf.sampleRate*.01),bins=[];for(let i=0;i<x.length;i+=step){let sum=0;for(let j=i;j<Math.min(i+step,x.length);j++)sum+=x[j]*x[j];bins.push(Math.sqrt(sum/step));}const peak=Math.max(...bins),start=bins.findIndex(v=>v>=peak*.3)*.01;await ctx.close();soundTest.playSfx('hit');const a=soundTest.snd.pool.hit[soundTest.snd.idx.hit];await new Promise((resolve,reject)=>{const id=setTimeout(()=>reject(new Error('hit seek timeout')),3000);if(!a.seeking&&a.readyState>=2){clearTimeout(id);resolve();}else a.addEventListener('seeked',()=>{clearTimeout(id);resolve();},{once:true});});return {onset:start,offset:soundTest.SFX_START.hit,current:a.currentTime};})()`);
    assert.ok(Math.abs(onset.onset-onset.offset)<.011,JSON.stringify(onset));assert.ok(onset.current>=onset.offset-.01,JSON.stringify(onset));
    await evaluate(b.send,`soundTest.store.fx=1;soundTest.world.charX=120;soundTest.world.dummyX=180;Object.assign(soundTest.world.dummy,{alive:true,hit:0,type:null,y:0});soundTest.fx.tongbal()`);
    await sleep(210);
    assert.ok(await evaluate(b.send,`soundTest.impacts.length>0`));
    const shot=await b.send('Page.captureScreenshot',{format:'png'}),out=path.join(root,'.sandbox/wsc');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'impact.png'),Buffer.from(shot.result.data,'base64'));
    await evaluate(b.send,`document.querySelector('#soundSel button[data-sound="0"]').click()`);
    assert.equal(await evaluate(b.send,`Object.values(soundTest.snd.pool).flat().every(a=>a.paused && a.volume===0)`),true);
    assert.equal(b.errors.length,0,JSON.stringify(b.errors));
    console.log('Sound browser regression passed: folder BGM tracks with measured volume gains, no-repeat shuffle, pause/next/ended, two visible windows, mute/close handoff, active SFX volume and mute.');
  }finally{if(ws)ws.close();if(b)b.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
