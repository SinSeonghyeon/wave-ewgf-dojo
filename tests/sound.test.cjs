// Sound: settings, SFX routing/gain/contact cues, BGM lock, shuffled playlist, measured gains.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {html, boot, AudioStub, wscRun, giwon} = require('./helpers/app.cjs');
/* ---- sound / streak popup / movement (2026-09-12) ---- */
test('sound settings: defaults, invalid saves fall back, valid saves survive, sliders write the store',()=>{
  const a=boot();assert.equal(a.store.sound,1);assert.equal(a.store.bgm,1);assert.equal(a.store.bgmVol,100);assert.equal(a.store.sfxVol,100);assert.equal(a.snd.ok,false);
  const b=boot({v:4,sound:2,bgm:2,bgmVol:'50',sfxVol:150});assert.equal(b.store.sound,1);assert.equal(b.store.bgm,1);assert.equal(b.store.bgmVol,100);assert.equal(b.store.sfxVol,100);
  const c=boot({v:4,sound:0,bgm:0,bgmVol:0,sfxVol:35});assert.equal(c.store.sound,0);assert.equal(c.store.bgm,0);assert.equal(c.store.bgmVol,0);assert.equal(c.store.sfxVol,35);
  assert.equal(c.get('sfxVol').disabled,true);assert.equal(c.get('sfxVolOut').textContent,'35%');
  a.get('sfxVol').value='35';a.get('sfxVol').input();assert.equal(a.store.sfxVol,35);assert.equal(a.get('sfxVolOut').textContent,'35%');
  a.get('bgmVol').value='abc';a.get('bgmVol').input();assert.equal(a.store.bgmVol,0);
  // fx paths that call playSfx must be harmless without Audio
  a.fx.crouchDash();a.fx.ewgf(5);a.fx.ewgf(1,'pop.dashEwgf');a.fx.dash();a.fx.backdash();
  assert.deepEqual(Object.keys(html.match(/const SND = \{([^}]*)\}/)[1].split(',').reduce((o,kv)=>{o[kv.split(':')[0].trim()]=1;return o;},{})),['wave','ewgf','wsc','hellsweep','tongbal','hit','backdash','giwon','giwonCh']);
  for(const f of ['bgm/bgm.mp3','sfx/wave.mp3','sfx/ewgf.mp3','sfx/wsc.mp3','sfx/hellsweep.mp3','sfx/tongbal.mp3','sfx/hit.mp3','sfx/backdash.mp3','sfx/giwon.mp3','sfx/giwon-ch.mp3']) assert.ok(fs.existsSync(require('node:path').join(__dirname,'..',f)),f+' exists');
});
test('header BGM toggle preserves SFX and trials, restores music and the master',()=>{
  const a=boot(undefined,undefined,{Audio:AudioStub});a.unlockAudio();
  assert.equal(a.snd.bgm.paused,false);
  a.setMode('wave10');a.startTrial();
  const trial=JSON.stringify(a.trial), session=JSON.stringify(a.session);
  a.get('bgmBtn').click();
  assert.equal(a.store.bgm,0);assert.equal(a.store.sound,1);
  assert.equal(a.snd.bgm.paused,true);assert.equal(a.get('bgmVol').disabled,true);
  a.playSfx('wave');a.playSfx('ewgf');
  for(const name of ['wave','ewgf']) assert.ok(a.snd.pool[name].some(v=>!v.paused));
  a.get('bgmBtn').click();
  assert.equal(a.store.bgm,1);assert.equal(a.snd.bgm.paused,false);assert.equal(a.get('bgmVol').disabled,false);
  assert.equal(JSON.stringify(a.trial),trial);assert.equal(JSON.stringify(a.session),session);
  a.store.sound=0;a.bgmSync();a.store.sfxVol=35;
  a.get('bgmBtn').click();
  assert.equal(a.store.sound,1);assert.equal(a.store.bgm,1);assert.equal(a.store.sfxVol,35);
  assert.equal(a.snd.bgm.paused,false);
  a.setBgm(0);assert.equal(a.snd.bgm.paused,true);
  a.setBgm(1);assert.equal(a.snd.bgm.paused,false);
});
test('active SFX follow volume immediately and mute stops every voice',()=>{
  const a=boot(undefined,undefined,{Audio:AudioStub});a.unlockAudio();
  a.playSfx('wave');a.playSfx('ewgf');
  a.get('sfxVol').value='25';a.get('sfxVol').input();
  const GAIN={wsc:.8,tongbal:.8,giwonCh:.75};
  for(const [name,voices] of Object.entries(a.snd.pool)) for(const voice of voices) assert.equal(voice.volume,.25*(GAIN[name]??1),name);
  a.store.sound=0;a.sfxSync();
  for(const voices of Object.values(a.snd.pool)) for(const voice of voices){assert.equal(voice.paused,true);assert.equal(voice.volume,0);}
  a.store.sound=1;a.playSfx('ewgf');a.get('sfxVol').value='0';a.get('sfxVol').input();
  for(const voices of Object.values(a.snd.pool)) for(const voice of voices) assert.equal(voice.paused,true);
});
test('BGM lock prevents two windows playing and hands over when hidden or closed',async()=>{
  let busy=false;const queue=[];
  function drain(){
    if(busy)return;
    const r=queue.shift();if(!r)return;
    if(r.signal.aborted){r.resolve();drain();return;}
    busy=true;Promise.resolve(r.fn()).finally(()=>{busy=false;r.resolve();drain();});
  }
  const locks={request(name,{signal},fn){return new Promise(resolve=>{queue.push({signal,fn,resolve});drain();});}};
  const a=boot(undefined,undefined,{Audio:AudioStub,AbortController,navigator:{locks}});
  const b=boot(undefined,undefined,{Audio:AudioStub,AbortController,navigator:{locks}});
  a.unlockAudio();b.unlockAudio();
  assert.equal(a.snd.bgm.paused,false);assert.equal(b.snd.bgm,null);
  a.events.pagehide();await new Promise(setImmediate);
  assert.equal(a.snd.bgm.paused,true);assert.equal(b.snd.bgm.paused,false);
  a.events.pageshow();assert.equal(a.snd.bgm.paused,true);
  b.store.sound=0;b.bgmSync();await new Promise(setImmediate);
  assert.equal(b.snd.bgm.paused,true);assert.equal(a.snd.bgm.paused,false);
  a.events.pagehide();b.events.pagehide();
});
test('BGM cancels queued requests and interrupted play can resume',async()=>{
  let grant,signal;
  const a=boot(undefined,undefined,{Audio:AudioStub,AbortController,navigator:{locks:{request(n,o,fn){signal=o.signal;grant=fn;return Promise.resolve();}}}});
  a.unlockAudio();a.store.sound=0;a.bgmSync();assert.equal(signal.aborted,true);
  await grant();assert.equal(a.snd.bgm,null);
  class InterruptedAudio extends AudioStub {play(){this.paused=false;return Promise.reject({name:'AbortError'});}}
  const b=boot(undefined,undefined,{Audio:InterruptedAudio});b.unlockAudio();b.store.sound=0;b.bgmSync();
  await new Promise(setImmediate);assert.equal(b.snd.unlocked,true);
  b.store.sound=1;b.bgmSync();assert.equal(b.snd.bgm.paused,false);
});
test('provided move sounds are lazy, route by move and honor SFX volume and mute independently of effects',()=>{
  const played=[];class Sound extends AudioStub {play(){played.push(this.src);return super.play();}}
  const a=boot({fx:0,bgm:0,sfxVol:35},undefined,{Audio:Sound});
  assert.deepEqual(Object.keys(a.snd.pool),[]);a.unlockAudio();a.world.dummyX=10000;
  a.fx.tongbal();a.fx.hellsweep();a.setMode('wsc');wscRun(a,8,1);
  for(const file of ['sfx/tongbal.mp3','sfx/hellsweep.mp3','sfx/wsc.mp3']) assert.equal(played.filter(s=>s===file).length,1,file);
  for(const name of ['tongbal','hellsweep','wsc'])assert.ok(a.snd.pool[name].some(v=>!v.paused&&v.volume===(name==='hellsweep'?.35:.35*.8)));
  const n=played.length;a.store.sound=0;a.sfxSync();a.fx.tongbal();a.fx.hellsweep();wscRun(a,8,1,2000);assert.equal(played.length,n);
  a.store.sound=1;a.store.sfxVol=0;a.fx.tongbal();assert.equal(played.length,n);
});
test('contact sound and burst occur once at dummy launch, never on misses or mismatched targets',()=>{
  for(const fx of [0,1])for(const reduced of [false,true]){
    const played=[];class Sound extends AudioStub {play(){played.push(this.src);return super.play();}}
    const a=boot({fx,bgm:0},undefined,{Audio:Sound,matchMedia:()=>({matches:reduced})});a.unlockAudio();a.world.charX=120;a.world.dummyX=180;
    a.time(1000);assert.equal(a.tryHit('tongbal'),true);assert.equal(a.tryHit('tongbal'),false);a.updateDummy(1179);assert.equal(played.includes('sfx/hit.mp3'),false);
    a.updateDummy(1180);assert.equal(played.filter(s=>s==='sfx/hit.mp3').length,1);assert.equal(a.impacts.length,fx&&!reduced?1:0);assert.equal(a.sparks.length>0,!!fx&&!reduced);
    a.updateDummy(1190);assert.equal(played.filter(s=>s==='sfx/hit.mp3').length,1);
    a.world.dummy.hit=0;a.world.dummy.alive=true;a.world.dummyX=1000;assert.equal(a.tryHit('ewgf'),false);
    a.world.dummyX=180;a.world.dummy.type='low';assert.equal(a.tryHit('tongbal'),false);assert.equal(played.filter(s=>s==='sfx/hit.mp3').length,1);
    assert.equal(a.tryHit('hellsweep'),true);a.store.sound=0;a.updateDummy(1200);assert.equal(played.filter(s=>s==='sfx/hit.mp3').length,1);
  }
});
test('WSC move sound follows technique success even when the challenge asks for a different wave count',()=>{
  const played=[];class Sound extends AudioStub {play(){played.push(this.src);return super.play();}}
  const a=boot({fx:0,bgm:0},undefined,{Audio:Sound});a.unlockAudio();a.setMode('wsc');a.wscStartChallenge();a.tick(4000);a.wsc.challenge.taskN=1;
  wscRun(a,8,1,5000);assert.equal(a.wsc.last.ok,false);assert.equal(a.wsc.last.timingOK,true);assert.equal(a.wsc.challenge.stats.hits,0);assert.equal(played.filter(s=>s==='sfx/wsc.mp3').length,1);
  wscRun(a,8,2,6000);assert.equal(played.filter(s=>s==='sfx/wsc.mp3').length,1);
});
test('move gain survives live volume changes and every contact cue waits for the per-move timestamp',()=>{
  for(const move of ['ewgf','wgf','tongbal','hellsweep','wsc']){
    const played=[];class Sound extends AudioStub {play(){played.push(this.src);return super.play();}}
    const a=boot({bgm:0},undefined,{Audio:Sound});a.unlockAudio();a.time(1000);a.world.charX=120;a.world.dummyX=180;
    a.playSfx('tongbal');a.playSfx('wsc');a.store.sfxVol=50;a.sfxSync();
    for(const name of ['tongbal','wsc'])for(const v of a.snd.pool[name])assert.equal(v.volume,.4);
    a.playSfx('tongbal');assert.ok(a.snd.pool.tongbal.some(v=>!v.paused&&v.volume===.4));
    assert.equal(a.tryHit(move),true);const contact=1000+a.HIT_CONTACT_MS[move];assert.equal(a.world.dummy.launchAt,contact);
    a.updateDummy(contact-1);assert.equal(played.includes('sfx/hit.mp3'),false);assert.equal(a.impacts.length,0);assert.equal(a.world.dummy.y,0);
    a.updateDummy(contact);assert.equal(played.filter(s=>s==='sfx/hit.mp3').length,1);assert.equal(a.impacts.length,1);assert.ok(a.world.dummy.y<0);
    a.updateDummy(contact+1);assert.equal(played.filter(s=>s==='sfx/hit.mp3').length,1);
  }
});
test('hit playback skips the measured 120ms lead-in on every voice and after mute; other clips start at zero',()=>{
  const a=boot({bgm:0},undefined,{Audio:AudioStub});assert.equal(Object.keys(a.snd.pool).length,0);a.unlockAudio();
  for(const name of ['wsc','tongbal','hellsweep','hit'])assert.equal(a.snd.pool[name].length,3);
  for(let i=0;i<5;i++){a.playSfx('hit');assert.equal(a.snd.pool.hit[a.snd.idx.hit].currentTime,.12);}
  a.store.sound=0;a.sfxSync();a.store.sound=1;a.playSfx('hit');assert.equal(a.snd.pool.hit[a.snd.idx.hit].currentTime,.12);
  a.playSfx('wsc');assert.equal(a.snd.pool.wsc[a.snd.idx.wsc].currentTime,0);
});
test('backdash sound follows actual b,N,b output in every mode, not walking, held back or blocked repeats',()=>{
  for(const mode of ['free','wsc','bd10','wave10','ewgf20','combo10','rush30']){
    const played=[];class Sound extends AudioStub {play(){played.push(this.src);return super.play();}}
    const a=boot({bgm:0,fx:0},undefined,{Audio:Sound});a.unlockAudio();a.setMode(mode);
    a.onDir('b',1000);a.tick(1020);assert.equal(played.includes('sfx/backdash.mp3'),false);
    a.onDir('n',1030);a.onDir('b',1050);assert.equal(played.filter(s=>s==='sfx/backdash.mp3').length,1,mode);
    a.onDir('n',1080);a.onDir('b',1100);assert.equal(played.filter(s=>s==='sfx/backdash.mp3').length,1,mode);
    a.onDir('n',1600);a.onDir('b',1700);a.onDir('n',1720);a.onDir('b',1740);assert.equal(played.filter(s=>s==='sfx/backdash.mp3').length,2,mode);
    a.store.sound=0;a.sfxSync();a.fx.backdash();assert.equal(played.filter(s=>s==='sfx/backdash.mp3').length,2,mode);
  }
});
test('BGM playlist excludes the previous track, pauses independently and advances at track end',()=>{
  const a=boot(undefined,undefined,{Audio:AudioStub});
  assert.equal(a.snd.bgm,null,'no audio at boot');
  for(const f of a.BGM_TRACKS)assert.ok(fs.existsSync(require('node:path').join(__dirname,'..',f)));
  a.unlockAudio();assert.equal(a.snd.bgm.loop,false);
  const first=a.snd.track;a.snd.bgm.currentTime=35;
  a.bgmTogglePlay();assert.equal(a.snd.bgm.paused,true);assert.equal(a.snd.bgm.currentTime,35);assert.equal(a.store.bgm,1);
  a.bgmSync();assert.equal(a.snd.bgm.paused,true,'focus/volume sync cannot undo explicit pause');
  a.bgmNext();assert.notEqual(a.snd.track,first);assert.equal(a.snd.bgm.paused,true,'skip preserves pause');
  a.bgmTogglePlay();assert.equal(a.snd.bgm.paused,false);
  const next=a.snd.track;a.snd.bgm.onended();assert.notEqual(a.snd.track,next);assert.equal(a.snd.bgm.paused,false);
  assert.equal(a.store.bgmLast,a.BGM_TRACKS[a.snd.track]);
  a.setBgm(0);a.bgmNext();assert.equal(a.snd.bgm.paused,true,'skip does not unmute');
  a.bgmTogglePlay();assert.equal(a.store.bgm,1);assert.equal(a.snd.bgm.paused,false);
  const reloaded=boot({bgmLast:a.store.bgmLast},undefined,{Audio:AudioStub});reloaded.unlockAudio();assert.notEqual(reloaded.snd.track,a.snd.track,'reload avoids the previous track');
});
test('BGM shuffled rounds play every track once and preserve order across pause and sync',()=>{
  const a=boot(undefined,undefined,{Audio:AudioStub});a.unlockAudio();
  let previous=-1;
  for(let round=0;round<12;round++){
    const heard=[];
    for(let i=0;i<a.BGM_TRACKS.length;i++){
      assert.notEqual(a.snd.track,previous,'no repeat across round boundaries');
      heard.push(a.snd.track);previous=a.snd.track;
      const remaining=Array.from(a.snd.queue);
      a.bgmTogglePlay();a.bgmSync();a.bgmTogglePlay();
      assert.deepEqual(Array.from(a.snd.queue),remaining,'pause and resume preserve the queue');
      if(i%2)a.bgmNext();else a.snd.bgm.onended();
      if(remaining.length)assert.equal(a.BGM_TRACKS[a.snd.track],remaining[0],'next and ended follow the shuffled order');
    }
    assert.equal(new Set(heard).size,a.BGM_TRACKS.length,'each round contains every track once');
  }
});
test('BGM round boundary swaps a repeated first track and reload avoids the last track',()=>{
  const math=Object.create(Math);math.random=()=>.999999; // Fisher-Yates leaves the source order unchanged.
  const a=boot(undefined,undefined,{Audio:AudioStub,Math:math});
  a.bgmApplyTracks(['bgm/A.mp3','bgm/B.mp3','bgm/C.mp3']);a.unlockAudio();
  assert.equal(a.BGM_TRACKS[a.snd.track],'bgm/A.mp3');
  a.bgmNext();a.bgmNext();a.bgmNext(); // Second round starts A, then B, then C.
  // Force the next shuffle to start with C, the final song of this round.
  a.bgmApplyTracks(['bgm/C.mp3','bgm/A.mp3','bgm/B.mp3']);
  a.bgmNext();a.bgmNext();assert.equal(a.BGM_TRACKS[a.snd.track],'bgm/C.mp3');
  a.snd.bgm.onended();assert.equal(a.BGM_TRACKS[a.snd.track],'bgm/B.mp3');
  const reloaded=boot({bgmLast:'bgm/C.mp3'},undefined,{Audio:AudioStub,Math:math});
  reloaded.bgmApplyTracks(['bgm/C.mp3','bgm/A.mp3','bgm/B.mp3']);reloaded.unlockAudio();
  assert.equal(reloaded.BGM_TRACKS[reloaded.snd.track],'bgm/B.mp3');
});
test('BGM playlist normalization removes stale queue entries and preserves order-only updates',()=>{
  const math=Object.create(Math);math.random=()=>.999999;
  const a=boot(undefined,undefined,{Audio:AudioStub,Math:math});
  a.bgmApplyTracks(['bgm/A.mp3','bgm/C.mp3','bgm/B.mp3']);a.unlockAudio();
  const audio=a.snd.bgm;audio.currentTime=35;
  a.bgmApplyTracks(['bgm/B.mp3','bgm/A.mp3','bgm/C.mp3']);
  assert.deepEqual(Array.from(a.snd.queue),['bgm/C.mp3','bgm/B.mp3']);
  assert.equal(a.BGM_TRACKS[a.snd.track],'bgm/A.mp3');
  assert.equal(a.snd.bgm,audio);assert.equal(audio.currentTime,35);
  a.bgmApplyTracks(['bgm/A.mp3','bgm/A.mp3','bgm/B.mp3']);
  assert.deepEqual(Array.from(a.snd.queue),['bgm/B.mp3']);
  a.bgmNext();assert.equal(a.BGM_TRACKS[a.snd.track],'bgm/B.mp3');
  assert.equal(a.snd.bgm.src,'bgm/B.mp3');
  a.bgmApplyTracks(['bgm/B.mp3','bgm/A.mp3','bgm/A.mp3']);
  assert.deepEqual(Array.from(a.snd.queue),[],'duplicate-only changes must not start a new round');
});
test('measured BGM gains follow user volume through track changes without affecting effects',()=>{
  const a=boot(undefined,undefined,{Audio:AudioStub});a.unlockAudio();
  assert.equal(a.BGM_GAIN['bgm/bgm.mp3'],1);
  for(let track=0;track<a.BGM_TRACKS.length;track++){
    const gain=a.BGM_GAIN[a.BGM_TRACKS[track]];assert.ok(gain>0&&gain<=1);
    a.snd.track=track;a.store.bgmVol=40;a.bgmSync();
    assert.ok(Math.abs(a.snd.bgm.volume-.4*gain)<1e-8);
  }
  assert.equal(a.store.sfxVol,100);
  a.bgmApplyTracks(['bgm/unmeasured.mp3']);assert.equal(a.snd.bgm.volume,.4,'unmeasured tracks use the user volume');
});
test('folder playlist updates preserve current track, handle one/zero songs and reject unsafe paths',()=>{
  const a=boot(undefined,undefined,{Audio:AudioStub});a.unlockAudio();
  const current=a.BGM_TRACKS[a.snd.track],audio=a.snd.bgm;
  assert.equal(a.bgmApplyTracks(['bgm/new #日本語.MP3',current,current]),true);
  assert.equal(a.BGM_TRACKS.length,2);assert.equal(a.snd.bgm,audio);assert.equal(a.snd.track,1);
  assert.equal(a.bgmApplyTracks(['https://example.com/song.mp3']),false);
  assert.equal(a.bgmApplyTracks(['bgm/../song.mp3']),false);
  a.bgmApplyTracks(['bgm/new #日本語.MP3']);assert.equal(a.bgmPick(0),0);
  assert.equal(a.snd.bgm.src,'bgm/new%20%23%E6%97%A5%E6%9C%AC%E8%AA%9E.MP3');
  a.snd.bgm.onended();assert.equal(a.snd.track,0);assert.equal(a.snd.bgm.paused,false);
  const last=a.snd.bgm;a.bgmApplyTracks([]);assert.equal(last.paused,true);assert.equal(a.snd.bgm,null);assert.equal(a.bgmPick(0),-1);
  a.bgmNext();a.bgmSync();assert.equal(a.snd.bgm,null);
});
test('HTTP playlist loading waits before playback and reads new songs without the local fallback',async()=>{
  let resolve;
  const a=boot(undefined,url=>url==='bgm/playlist.json'?new Promise(r=>resolve=r):Promise.resolve({ok:true,json:async()=>({rows:[],total:0})}),{Audio:AudioStub,AbortController});
  const loading=a.bgmLoadTracks();a.unlockAudio();assert.equal(a.snd.bgm,null,'stale fallback must not play while manifest loads');
  resolve({ok:true,json:async()=>['bgm/added later.mp3']});await loading;
  assert.equal(a.snd.bgm.src,'bgm/added%20later.mp3');assert.equal(a.snd.bgm.paused,false);
});
test('folder scanner matches local fallback and excludes directories/non-MP3 files',()=>{
  const {tracksAt}=require('../tools/update-bgm');const path=require('node:path');
  assert.deepEqual(tracksAt(path.join(__dirname,'../bgm')),Array.from(boot().BGM_TRACKS));
  const dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'dojo-bgm-'));
  try{fs.writeFileSync(path.join(dir,'日本語 #1.MP3'),'');fs.writeFileSync(path.join(dir,'notes.txt'),'');fs.mkdirSync(path.join(dir,'folder.mp3'));assert.deepEqual(tracksAt(dir),['bgm/日本語 #1.MP3']);}
  finally{fs.rmSync(dir,{recursive:true,force:true});}
});
