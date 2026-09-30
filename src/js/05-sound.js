/* ---------- sound (local audio assets). Nothing is created until the first user gesture, so the unit-test vm and og generation never touch media. ---------- */
const SND = { wave:'sfx/wave.mp3', ewgf:'sfx/ewgf.mp3', wsc:'sfx/wsc.mp3', hellsweep:'sfx/hellsweep.mp3', tongbal:'sfx/tongbal.mp3', hit:'sfx/hit.mp3', backdash:'sfx/backdash.mp3', giwon:'sfx/giwon.mp3', giwonCh:'sfx/giwon-ch.mp3' };
const BGM_TRACKS=["bgm/TEKKEN 7 鉄拳7 DUOMO DI SIRIO.mp3","bgm/TEKKEN 7 鉄拳7 Infinite Azure - Round 1 (Moonsiders 1st).mp3","bgm/Tekken 6 Soundtrack High Rollers Club.mp3","bgm/Tekken 7 OST  Mishima DOJO.mp3","bgm/bgm.mp3"]; // Generated local fallback: node tools/update-bgm.js
const BGM_GAIN={"bgm/TEKKEN 7 鉄拳7 DUOMO DI SIRIO.mp3":0.356862,"bgm/TEKKEN 7 鉄拳7 Infinite Azure - Round 1 (Moonsiders 1st).mp3":0.356451,"bgm/Tekken 6 Soundtrack High Rollers Club.mp3":0.271331,"bgm/Tekken 7 OST  Mishima DOJO.mp3":0.277332,"bgm/bgm.mp3":1}; // Generated loudness gains: node tools/measure-bgm.js
const bgmVolume = () => store.bgmVol/100*(BGM_GAIN[BGM_TRACKS[snd.track]]??1);
function bgmApplyTracks(tracks){
  if(!Array.isArray(tracks)||!tracks.every(p=>typeof p==='string'&&/^bgm\/[^/\\]+\.mp3$/i.test(p)))return false;
  const current=BGM_TRACKS[snd.track], unique=[...new Set(tracks)];
  const changed=unique.length!==BGM_TRACKS.length||unique.some(p=>!BGM_TRACKS.includes(p));
  BGM_TRACKS.splice(0,BGM_TRACKS.length,...unique);
  snd.track=BGM_TRACKS.indexOf(current);
  if(changed)snd.queue=bgmShuffle(BGM_TRACKS.filter(p=>p!==current));
  if(snd.track<0&&snd.bgm){snd.bgm.pause();snd.bgm.onended=null;snd.bgm=null;}
  renderBgmPlayer();bgmSync();return true;
}
async function bgmLoadTracks(){
  snd.catalogReady=false;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),4000);
  try{const response=await fetch(ASSET_ROOT+'bgm/playlist.json',{cache:'no-store',signal:controller.signal});if(response.ok)bgmApplyTracks(await response.json());}catch(e){} // Raw local previews use the generated fallback.
  finally{clearTimeout(timeout);snd.catalogReady=true;renderBgmPlayer();bgmSync();}
}
const SFX_GAIN = {tongbal:0.8,wsc:0.8,giwonCh:0.75}; // giwonCh: 원본 최대 +2.4 dBFS라 감쇠하지 않으면 디코딩에서 클리핑한다(≤0.76). 기존 피격음(sfx/hit.mp3)과 체감도 맞는 값
// Decoded MP3: the cleaned hit transient begins at 120ms; skip its quiet lead-in, not the visual contact.
const SFX_START = {hit:0.12, giwon:0, giwonCh:0}; // 기원권 두 음원은 원본 그대로 재생한다(기술음의 120ms 선행 구간은 발동 모션 바람소리라 자르지 않는다)
const sfxVolume = name => (store.sound?store.sfxVol/100:0)*(SFX_GAIN[name]??1);
const snd = { ok: typeof Audio!=='undefined', unlocked:false, catalogReady:true, bgm:null, track:-1, queue:[], paused:false, pool:{}, idx:{}, lock:null, release:null };
function mkAudio(src, loop){ const a = new Audio(); a.preload='auto'; a.loop=!!loop; a.src=ASSET_ROOT+src; return a; }
function sfxPool(name){ return snd.pool[name] || (snd.pool[name] = [0,1,2].map(() => mkAudio(SND[name], false))); } // 3 voices so a fast wave can overlap
function playSfx(name){
  if(!snd.ok || !store.sound || !snd.unlocked || store.sfxVol<=0) return;
  const p = sfxPool(name), i = snd.idx[name] = ((snd.idx[name]||0)+1) % p.length, a = p[i];
  a.volume = sfxVolume(name); try{ a.currentTime = SFX_START[name]??0; }catch(e){}
  const r = a.play(); if(r && r.catch) r.catch(()=>{});
}
function sfxSync(){
  for(const [name,voices] of Object.entries(snd.pool)) for(const a of voices){
    a.volume = sfxVolume(name);
    if(!store.sound || store.sfxVol<=0){ a.pause(); try{ a.currentTime=0; }catch(e){} }
  }
}
function bgmShuffle(tracks){
  const queue=[...tracks];
  for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}
  return queue;
}
function bgmPick(previous){
  if(!snd.queue.length)snd.queue=bgmShuffle(BGM_TRACKS);
  // Only a fresh round can start with the previous track. Swap its first entry.
  if(snd.queue.length===BGM_TRACKS.length&&snd.queue.length>1&&snd.queue[0]===BGM_TRACKS[previous]){
    const j=1+Math.floor(Math.random()*(snd.queue.length-1));
    [snd.queue[0],snd.queue[j]]=[snd.queue[j],snd.queue[0]];
  }
  return BGM_TRACKS.indexOf(snd.queue.shift());
}
function bgmSelect(){
  snd.track=bgmPick(snd.track<0?BGM_TRACKS.indexOf(store.bgmLast):snd.track);
  if(snd.track<0)return;
  store.bgmLast=BGM_TRACKS[snd.track];save();
  const src=BGM_TRACKS[snd.track].split('/').map(encodeURIComponent).join('/');
  if(!snd.bgm){snd.bgm=mkAudio(src,false);snd.bgm.onended=()=>{bgmSelect();bgmSync();};}
  else{snd.bgm.pause();snd.bgm.src=ASSET_ROOT+src;}
  renderBgmPlayer();
}
function bgmNext(){unlockAudio();if(!snd.ok||!snd.catalogReady)return;bgmSelect();bgmSync();}
function bgmTogglePlay(){
  if(snd.paused||!store.sound||!store.bgm){snd.paused=false;setBgm(1);}
  else{snd.paused=true;bgmSync();}
  renderBgmPlayer();
}
function renderBgmPlayer(){
  const active=!!store.sound&&!!store.bgm&&!snd.paused;
  const label=T(active?'bgm.pause':'bgm.play'),b=$('bgmPlay');
  b.innerHTML='<span aria-hidden="true">'+(active?'Ⅱ':'▶')+'</span>';b.setAttribute('aria-label',label);b.title=label;
  const title=snd.track<0?T(BGM_TRACKS.length?'bgm.wait':'bgm.empty'):BGM_TRACKS[snd.track].slice(4).replace(/\.mp3$/i,'');$('bgmTrack').textContent=title;$('bgmTrack').title=title;
  $('bgmNext').disabled=BGM_TRACKS.length<2;$('bgmPlay').disabled=!BGM_TRACKS.length;
}
function bgmSync(){ // Web Lock keeps visible windows of this origin from playing together.
  if(!snd.ok) return;
  const locks = navigator.locks;
  const want = snd.catalogReady && BGM_TRACKS.length>0 && !!store.sound && !!store.bgm && !snd.paused && store.bgmVol>0 && snd.unlocked && !document.hidden && (!!locks || document.hasFocus());
  if(!want){
    if(snd.bgm) snd.bgm.pause();
    if(snd.lock){ snd.lock.abort(); snd.lock=null; }
    if(snd.release){ const release=snd.release; snd.release=null; release(); }
    return;
  }
  if(locks && !snd.release){
    if(!snd.lock){
      const request = snd.lock = new AbortController();
      locks.request('mishima-dojo-bgm', {signal:request.signal}, () => {
        if(snd.lock!==request) return;
        return new Promise(resolve => { snd.release=resolve; bgmSync(); });
      }).catch(() => {}).finally(() => { if(snd.lock===request) snd.lock=null; });
    }
    return;
  }
  if(want){
    if(!snd.bgm) bgmSelect();
    snd.bgm.volume = bgmVolume();
    if(snd.bgm.paused){ const r = snd.bgm.play(); if(r && r.catch) r.catch(e => { if(e.name==='NotAllowedError'){ snd.unlocked=false; bgmSync(); } }); } // interruption by pause is not an autoplay refusal
  } else if(snd.bgm && !snd.bgm.paused) snd.bgm.pause();
}
let chimeCtx = null; // wardrobe unlock chime: a soft rising four-note sine arpeggio synthesized with Web Audio (no audio file; follows the sound toggle and SFX volume)
function playChime(){
  if(!store.sound || store.sfxVol<=0 || typeof AudioContext==='undefined') return;
  try{
    chimeCtx = chimeCtx || new AudioContext(); if(chimeCtx.state==='suspended') chimeCtx.resume().catch(()=>{});
    const ac = chimeCtx, t0 = ac.currentTime + 0.01, v = store.sfxVol/100*0.22, bus = ac.createGain(); bus.gain.value = 1; bus.connect(ac.destination);
    [[523.25,0],[659.25,0.1],[783.99,0.2],[1046.5,0.32]].forEach(([f,d]) => { const o = ac.createOscillator(), e = ac.createGain(); o.type='sine'; o.frequency.value=f;
      e.gain.setValueAtTime(0.0001, t0+d); e.gain.exponentialRampToValueAtTime(v, t0+d+0.02); e.gain.exponentialRampToValueAtTime(0.0001, t0+d+1.1); o.connect(e); e.connect(bus); o.start(t0+d); o.stop(t0+d+1.2); });
    return () => bus.disconnect();
  }catch(e){}
}
// 기원초 성공 팡파르. 음원 파일을 늘리지 않으려고 playChime과 같은 합성 경로를 쓰고, 효과음 볼륨·음소거를 따른다.
function playFanfare(){
  if(!store.sound || store.sfxVol<=0 || typeof AudioContext==='undefined') return;
  try{
    chimeCtx = chimeCtx || new AudioContext(); if(chimeCtx.state==='suspended') chimeCtx.resume().catch(()=>{});
    const ac = chimeCtx, t0 = ac.currentTime + 0.01, v = store.sfxVol/100*0.16, bus = ac.createGain(); bus.gain.value = 1; bus.connect(ac.destination);
    // 짧은 상승 3화음 + 한 옥타브 위 꼬리. 차임(1.2초)보다 가볍고 빠르게 끝난다.
    [[523.25,0,.26],[659.25,.07,.26],[783.99,.14,.3],[1046.5,.21,.5]].forEach(([f,d,len]) => {
      const o = ac.createOscillator(), e = ac.createGain(); o.type='triangle'; o.frequency.value=f;
      e.gain.setValueAtTime(0.0001, t0+d); e.gain.exponentialRampToValueAtTime(v, t0+d+0.015); e.gain.exponentialRampToValueAtTime(0.0001, t0+d+len);
      o.connect(e); e.connect(bus); o.start(t0+d); o.stop(t0+d+len+0.02); });
    return () => bus.disconnect();
  }catch(e){}
}
function unlockAudio(){ dailyGift(); /* first gesture reserves the daily gift */ if(!snd.ok || snd.unlocked) return; snd.unlocked=true; Object.keys(SND).filter(name=>name!=='bgm').forEach(sfxPool); bgmSync(); }
addEventListener('pointerdown', unlockAudio);
addEventListener('visibilitychange', () => { if(document.hidden) { resetInput(); endTrial(true); } bgmSync(); });
addEventListener('focus', bgmSync);
addEventListener('pagehide', () => {
  if(saveTimer){ clearTimeout(saveTimer); saveTimer = null; }
  save(); // practice time may be dirty between its 30-second checkpoints even when no generic save is pending
  if(snd.bgm) snd.bgm.pause();
  if(snd.lock){ snd.lock.abort(); snd.lock=null; }
  if(snd.release){ const release=snd.release; snd.release=null; release(); }
});
addEventListener('pageshow', bgmSync);

