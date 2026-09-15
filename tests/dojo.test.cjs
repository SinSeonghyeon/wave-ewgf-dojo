// No dependencies: execute the shipped script with deterministic browser/time stubs.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const BANNED = /데빌진|화랑|카즈야|헤이하치|진 카자마|Jin\b|Hwoarang|Kazuya|Heihachi|Devil Jin|仁|風間|カズヤ|平八|ファラン|デビル/; // official character names (design decision 3); 三島 alone is the app's own name (三島道場), so the item/bd tests add it themselves
function boot(saved,fetch,env={}){ // fetch: optional stub for the backend calls (default: none, every call fails inside its try/catch)
  let now=1000, pads=[];
  const elements=new Map(), events={}, timers=new Map(); let next=1;
  function element(){
    return {textContent:'',innerHTML:'',style:{setProperty(k,v){this[k]=v;}},dataset:{},children:[],clientWidth:800,clientHeight:360,offsetWidth:180,offsetHeight:55,
      classList:{add(){},toggle(){}},setAttribute(){},addEventListener(type,fn){this[type]=fn;},
      querySelectorAll(){return [];},querySelector(){return element();},
      getBoundingClientRect(){return {width:800,height:360};},getContext(){return {setTransform(){}};}};
  }
  const get=id=>{if(!elements.has(id)) elements.set(id,element()); return elements.get(id);};
  get('jackpot').hidden=true;
  for(const id of ['setDlg','donateDlg','fitDlg','noticeDlg']) get(id).showModal=function(){this.open=true;};
  const context=vm.createContext({performance:{now:()=>now},document:{getElementById:get,querySelectorAll:()=>[],hasFocus:()=>true,hidden:false},
    navigator:{getGamepads:()=>pads},localStorage:{getItem:()=>saved===undefined?null:JSON.stringify(saved),setItem(){}},
    matchMedia:()=>({matches:false}),devicePixelRatio:1,requestAnimationFrame(){},
    addEventListener:(name,fn)=>events[name]=fn,
    setInterval:fn=>{const id=next++;timers.set(id,fn);return id;},clearInterval:id=>timers.delete(id),
    setTimeout:fn=>{const id=next++;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),...(fetch?{fetch}:{}),...env});
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\}\)\(\);\s*$/, 'globalThis.app={onDir,onButton,cd,bd,BD,bdRec,poseAt,session,trial,store,setMode,startTrial,endTrial,pollPad,clearCommand,renderBests,setLang,T,I18N,histBins,buildCard,buildOgCard,shareSource,SITE_URL,BOARD_URL,BOARDS,WINDOWS,boardEntry,boardRowText,nickOk,pctTop,tierOf,board,live,boardSubmit,boardLoad,boardDelete,renderBoard,visitsLoad,claimNick,openNick,postVote,replySend,renderPosts,anim,world,combo,taps,pops,snd,fx,DONATE,donateOptions,takeResultDonate,practiceInput,practiceTick,DONATE_ACTIVE_MS,touchKeys,touchPress,applyTouchUI,applyTouchLayout,unlockAudio,bgmSync,sfxSync,playSfx,setBgm,held,tick,trialTick,strike,rushStrike,rushSpawn,tryHit,updateDummy,FF_MS,RUSH_PTS,HIT_TYPE,openShare,renderWave,waveTop,ACH,ITEMS,SLOTS,ITEM_SLOT,DAILY_IDS,checkAch,setFit,currentLook,lookOf,openFit,bumpVisitDay,dailyGift,claimRewards,renderRewards,pendingReward,owned,renderFit,NOTICES,NOTICE_LATEST,renderNotices,openNotices,hadStore,noticeAutoTry};})();');
  vm.runInContext(script,context);
  return {...context.app,events,get,timers,time:t=>now=t,pads:p=>pads=p};
}
function dash(a,t=1000){a.onDir('f',t);a.onDir('n',t+20);a.onDir('d',t+40);a.onDir('df',t+60);}
const F=1000/60, fr=n=>Math.round(n*F); // backdash tests speak in frames
function bdOut(a,t,tap=2,n=2){a.onDir('b',t);a.onDir('n',t+fr(tap));const o=t+fr(tap)+fr(n);a.onDir('b',o);return o;} // b,N,b → the backdash comes out at the returned time
function bdSet(a,o,h,db=2,tap=2,n=2){const c=o+fr(h);a.onDir('db',c);a.onDir('b',c+fr(db));a.onDir('n',c+fr(db)+fr(tap));const o2=c+fr(db)+fr(tap)+fr(n);a.onDir('b',o2);return o2;} // cancel h frames after the backdash, roll into the next one

test('idle pad polls after timestamp zero allow delayed device timestamps to recover',()=>{
  const a=boot();
  const sample=(now, timestamp, indices=[])=>{a.time(now);a.pads([{index:0,id:'pad',mapping:'standard',axes:[0,0],timestamp,
    buttons:Array.from({length:16},(_,i)=>({pressed:indices.includes(i),value:0}))}]);a.pollPad();};
  sample(1000,0);sample(1080,0);sample(1090,1000);
  a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);
  sample(1100,1050,[13,15]);sample(1110,1050,[13,15]);sample(1120,1052,[13,15,3]);
  assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.session.attempts[0].off,2);
});

test('dash progress is flushed on pagehide even when blur clears the chain first',()=>{
  let saved;
  const a=boot(undefined,undefined,{localStorage:{getItem:()=>null,setItem:(k,v)=>saved=JSON.parse(v)}});
  dash(a);a.events.blur();a.events.pagehide();
  assert.equal(saved.life.dashes,1);assert.equal(saved.life.maxChain,1);
});

test('daily gift updates attendance before the minute timer at KST midnight',()=>{
  let wall=Date.parse('2026-09-13T14:59:59Z');
  class ClockDate extends Date { constructor(...args){super(...(args.length?args:[wall]));} static now(){return wall;} }
  const a=boot(undefined,undefined,{Date:ClockDate});a.dailyGift();
  wall+=2000;a.dailyGift();
  assert.equal(a.store.life.days,2);assert.equal(a.store.life.giftDay,'2026-09-14');
  assert.equal(a.store.pendingRewards.at(-1).day,2);a.dailyGift();assert.equal(a.store.life.days,2);
  assert.equal(new Set(a.store.pendingRewards.filter(j=>j.kind==='daily').map(j=>j.id)).size,2,'unclaimed daily gifts are excluded from the next day pool');
});

test('donation prompts are capped daily and an active header nudge defers across blocking UI',()=>{
  let wall=Date.parse('2026-09-15T03:00:00Z');
  class ClockDate extends Date { constructor(...args){super(...(args.length?args:[wall]));} static now(){return wall;} }
  const a=boot({v:4,lang:'ko'},undefined,{Date:ClockDate});a.get('nickDlg').open=false;
  assert.equal(a.takeResultDonate(false),false);
  assert.equal(a.takeResultDonate(true),true);
  assert.equal(a.takeResultDonate(true),false,'a second personal best on the same KST day is quiet');
  a.practiceInput();
  for(let ms=2000;ms<=601000;ms+=1000){ a.time(ms); if(ms%20000===0) a.practiceInput(); a.practiceTick(ms); }
  assert.equal(a.store.donatePlayMs,a.DONATE_ACTIVE_MS);
  assert.equal(a.get('donateBubble').hidden,false);
  assert.equal(a.get('donateNudge').dataset.active,'true');
  a.setMode('wave10');a.startTrial();
  assert.equal(a.get('donateNudge').dataset.active,'false','a countdown immediately hides the active nudge');
  assert.equal(a.store.donateNudgeDay,'','blocking UI does not consume the day');
  a.endTrial(true);a.time(602000);
  assert.equal(a.practiceTick(602000),true,'the deferred nudge returns after the countdown is cancelled');
  assert.equal(a.practiceTick(603000),false,'the visible nudge is still capped for the rest of its KST day');
});

test('dirty practice time is persisted on pagehide before its 30-second checkpoint',()=>{
  let saved;
  const a=boot({v:4,lang:'ko'},undefined,{localStorage:{getItem:()=>JSON.stringify({v:4,lang:'ko'}),setItem:(k,v)=>saved=JSON.parse(v)}});
  a.get('nickDlg').open=false;a.practiceInput();a.time(12000);a.practiceTick(12000);
  assert.equal(a.store.donatePlayMs,1000);a.events.pagehide();
  assert.equal(saved.donatePlayMs,1000);
});

test('deferring an active reward also stops its synthesized chime',()=>{
  let disconnected=0;
  class AudioContext {
    constructor(){this.currentTime=0;this.state='running';}
    createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){disconnected++;}};}
    createOscillator(){return {frequency:{},connect(){},start(){},stop(){}};}
  }
  const a=boot({v:4,fx:0},undefined,{AudioContext});a.setMode('wave10');a.dailyGift();a.claimRewards();
  assert.equal(a.get('jackpot').dataset.phase,'reveal');assert.equal(disconnected,0);
  a.startTrial();assert.equal(disconnected,1);assert.equal(a.get('jackpot').hidden,true);
});

test('active reward is closed at every phase, translated and discarded by data reset',()=>{
  for(const phase of ['egg','white','reveal','out']) for(const target of ['trial','settings','wardrobe','donate']){
    const a=boot();a.setMode('wave10');a.dailyGift();a.claimRewards();
    const step=()=>{for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();}};
    if(phase!=='egg') step();if(phase==='reveal'||phase==='out') step();
    if(phase==='out') a.get('jpOk').click();
    assert.equal(a.get('jackpot').dataset.phase,phase);
    if(target==='trial') a.startTrial();
    else a.get({settings:'setOpen',wardrobe:'fitOpen',donate:'donateTop'}[target]).click();
    assert.equal(a.get('jackpot').hidden,true,phase+' '+target);
    step();assert.equal(a.get('jackpot').hidden,true,'stale callbacks cannot reveal');
    if(target==='trial') a.endTrial(true);
    else a.get({settings:'setDlg',wardrobe:'fitDlg',donate:'donateDlg'}[target]).open=false;
    a.renderRewards();
    assert.equal(a.get('jackpot').hidden,true,'interrupted reveal never resumes automatically');
    assert.ok(Object.keys(a.store.ach).length>0,'claimed reward stays owned');
  }
  const a=boot();a.dailyGift();a.claimRewards();const id=a.DAILY_IDS.find(id=>a.store.ach[id]);
  for(const lang of ['ko','ja','en']){a.setLang(lang);assert.equal(a.get('jpItem').textContent,a.T('item.'+id));assert.equal(a.get('jpTitle').textContent,a.T('fit.dailyTitle',1));}
  a.get('dataReset').click();
  for(let n=0;n<3;n++) for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();}
  assert.equal(a.get('jackpot').hidden,true);assert.equal(a.store.pendingRewards.length,0);
});
test('default window and legacy or invalid saved windows use Normal 12ms',()=>{
  for(const saved of [undefined,{v:3,window:8},{v:4},{v:4,window:100},{v:4,window:'12'}]){
    assert.equal(boot(saved).store.window,12);
  }
});

test('valid saved window choices survive the default change',()=>{
  for(const window of [8,12,15]) assert.equal(boot({v:4,window}).store.window,window);
});

test('EWGF accepts both window boundaries and rejects inputs just outside',()=>{
  for(const saved of [undefined,...[8,12,15].map(window=>({v:4,window}))]){
    const window=saved?.window??12;
    for(const off of [-window-1,-window,window,window+1]){
      const a=boot(saved);
      a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);
      if(off<0){a.onButton(2,1060+off);a.onDir('df',1060);}
      else {a.onDir('df',1060);a.onButton(2,1060+off);}
      assert.equal(a.session.attempts.length,1);
      assert.equal(a.session.attempts[0].off,off);
      assert.equal(a.session.attempts[0].kind,Math.abs(off)<=window?'ewgf':off<0?'early':'wgf');
    }
  }
});

test('normal EWGF consumes its command',()=>{
  const a=boot();dash(a);a.onButton(2,1060);a.onButton(2,1064);
  assert.deepEqual(Array.from(a.session.attempts,x=>x.kind),['ewgf','no_cd']);
});
test('explicit cancel and separate start form a three-dash chain',()=>{
  const a=boot();dash(a);
  for(const t of [1100,1300]){a.onDir('f',t);a.onDir('n',t+20);dash(a,t+40);}
  assert.equal(a.cd.chain,3);a.onButton(2,1400);assert.equal(a.session.attempts[0].chain,3);
});
test('cancel cannot substitute for next starting forward',()=>{
  const a=boot();dash(a);a.onDir('f',1080);a.onDir('n',1100);a.onDir('d',1120);a.onDir('df',1140);
  assert.equal(a.session.dashes,1);assert.equal(a.cd.chain,0);
});
test('input deadlines work without animation frames',()=>{
  const a=boot();a.onDir('f',1000);a.onDir('n',1300);a.onDir('d',1320);a.onDir('df',1340);
  assert.equal(a.session.dashes,0);
  dash(a,2000);a.onButton(2,3000);assert.equal(a.session.attempts.at(-1).kind,'no_cd');
});
test('negative offset is judged once against incoming diagonal',()=>{
  const a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.onButton(2,1056);a.onDir('df',1060);
  assert.equal(a.session.attempts[0].off,-4);assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.cd.pending,null);
});
test('expired pending button cannot become an EWGF',()=>{
  const a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.onButton(2,1050);a.onDir('df',1180);
  assert.equal(a.session.attempts[0].kind,'no_df');assert.equal(a.session.dashes,0);
});
test('mode switch and session reset cancel countdowns',()=>{
  const a=boot();a.setMode('wave10');a.startTrial();const id=a.trial.cdTimer;a.setMode('free');
  assert.equal(a.timers.has(id),false);assert.equal(a.trial.running,false);assert.equal(a.get('dStart').disabled,false);
  a.setMode('ewgf20');a.startTrial();a.get('dReset').click();assert.equal(a.trial.cdTimer,null);assert.equal(a.cd.state,0);
});
test('trial start discards commands begun during countdown',()=>{
  const a=boot();a.setMode('ewgf20');a.startTrial();dash(a);const countdown=a.timers.get(a.trial.cdTimer);
  a.time(4000);countdown();countdown();countdown();a.onButton(2,4001);
  assert.equal(a.session.attempts.at(-1).kind,'no_cd');assert.equal(a.trial.count,1);
});
test('gamepad input is judged at the device timestamp, so a late poll cannot open a gap between d/f and RP',()=>{
  const a=boot();const btns=()=>Array.from({length:16},()=>({pressed:false,value:0}));
  a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);
  let b=btns();b[13].pressed=true;b[15].pressed=true;a.time(1100);a.pads([{index:0,id:'t',mapping:'standard',axes:[0,0],buttons:b,timestamp:1050}]);a.pollPad(); // d/f reported at 1050, read late at 1100
  b=btns();b[13].pressed=true;b[15].pressed=true;b[3].pressed=true;a.time(1120);a.pads([{index:0,id:'t',mapping:'standard',axes:[0,0],buttons:b,timestamp:1052}]);a.pollPad(); // RP 2ms after d/f on the device, read 20ms later
  assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.session.attempts[0].off,2,'offset from device time, not from the poll time (which would be 20)');
  // no usable timestamp (0 / missing / older than the last judged time) → poll time as before
  const c=boot();c.onDir('f',1000);c.onDir('n',1020);c.onDir('d',1040);
  b=btns();b[13].pressed=true;b[15].pressed=true;c.time(1060);c.pads([{index:0,id:'t',mapping:'standard',axes:[0,0],buttons:b,timestamp:0}]);c.pollPad();
  b=btns();b[13].pressed=true;b[15].pressed=true;b[3].pressed=true;c.time(1075);c.pads([{index:0,id:'t',mapping:'standard',axes:[0,0],buttons:b}]);c.pollPad();
  assert.equal(c.session.attempts[0].off,15);
  b=btns();b[13].pressed=true;b[15].pressed=true;c.time(1200);c.pads([{index:0,id:'t',mapping:'standard',axes:[0,0],buttons:b,timestamp:900}]);c.pollPad(); // RP released, d/f still held; a stale timestamp never moves time backwards
  b=btns();b[13].pressed=true;b[15].pressed=true;b[3].pressed=true;c.time(1210);c.pads([{index:0,id:'t',mapping:'standard',axes:[0,0],buttons:b,timestamp:900}]);c.pollPad();
  assert.equal(c.session.attempts[1].t,1210,'judged at the poll time, not at the stale 900');
});
test('wave deadline excludes dash arriving at the end boundary',()=>{
  const a=boot();a.setMode('wave10');a.startTrial();const countdown=a.timers.get(a.trial.cdTimer);countdown();countdown();countdown();
  dash(a,10940);assert.equal(a.trial.running,false);assert.equal(a.store.records.wave10[0].dashes,0);
});
test('gamepad simultaneous diagonal and RP processes direction first',()=>{
  const a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.time(1060);
  const buttons=Array.from({length:16},()=>({pressed:false,value:0}));buttons[3].pressed=true;buttons[13].pressed=true;buttons[15].pressed=true;
  a.pads([{index:0,id:'test',mapping:'standard',axes:[0,0],buttons}]);a.pollPad();
  assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.session.attempts[0].off,0);
  a.events.gamepaddisconnected({gamepad:{index:0}});a.time(1080);a.pollPad();
  assert.equal(a.session.attempts.length,2);
});
test('invalid saved types fall back safely and stored text is escaped',()=>{
  const a=boot({v:4,side:0,window:100,keys:{up:4},records:{wave10:null,ewgf20:[null],combo10:[{date:0,score:10,label:'<img src=x>',sub:'<script>'}]}});
  assert.equal(a.store.side,1);assert.equal(a.store.window,12);assert.equal(a.store.keys.up,'KeyW');
  assert.equal(a.store.records.ewgf20.length,0);assert.ok(a.get('bests').innerHTML.includes('&lt;img src=x&gt;'));
});
test('each keyboard action accepts one alternate key and old saves keep their primary keys',()=>{
  const ev=(code,timeStamp=1000)=>({code,timeStamp,target:{tagName:'DIV'},preventDefault(){}});
  const a=boot({v:4,keys:{right:'KeyD'},altKeys:{right:'KeyO',b2:'KeyP',b3:'KeyP',up:4}});
  assert.equal(a.store.keys.right,'KeyD');assert.equal(a.store.altKeys.right,'KeyO');
  assert.equal(a.store.altKeys.b3,'','a duplicate alternate is dropped');assert.equal(a.store.altKeys.up,'','an invalid alternate is dropped');
  a.events.keydown(ev('KeyD'));a.events.keydown(ev('KeyO',1010));a.events.keyup(ev('KeyD',1020));
  assert.equal(a.cd.state,1,'releasing the primary keeps right held through the alternate');
  a.events.keyup(ev('KeyO',1030));assert.equal(a.cd.state,2,'releasing both produces neutral');
  a.events.keydown(ev('KeyS',1040));a.events.keydown(ev('KeyO',1060));a.events.keydown(ev('KeyP',1060));
  assert.equal(a.session.attempts.at(-1).kind,'ewgf','alternate direction and button follow the normal judging path');
  a.events.keydown(ev('KeyI',1061));
  assert.equal(a.session.attempts.length,1,'primary + alternate for one held button produces one logical press');
  a.events.keyup(ev('KeyP',1070));a.events.keydown(ev('KeyP',1080));
  assert.equal(a.session.attempts.length,1,'re-pressing either binding while its partner is held stays suppressed');
  a.events.keyup(ev('KeyI',1090));a.events.keyup(ev('KeyP',1090));
  a.events.keydown(ev('KeyI',1100));a.events.keydown(ev('KeyP',1101));
  assert.equal(a.session.attempts.length,2,'alternate after its held primary is also one logical press');
  a.events.keyup(ev('KeyI',1110));a.events.keyup(ev('KeyP',1110));
  assert.match(a.get('keys').innerHTML,/data-k="right" data-alt="0"[\s\S]*data-k="right" data-alt="1"[\s\S]*>O</);
});
test('blur clears unfinished input and cancels trial',()=>{
  const a=boot();a.setMode('wave10');a.startTrial();dash(a);a.events.blur();
  assert.equal(a.cd.state,0);assert.equal(a.cd.chain,0);assert.equal(a.trial.cdTimer,null);
});
test('session totals survive the 300-attempt history limit',()=>{
  const a=boot();dash(a);a.onButton(2,1060);
  for(let i=0;i<301;i++) a.onButton(2,2000+i*10);
  assert.equal(a.session.attempts.length,300);assert.equal(a.session.tries,302);assert.equal(a.session.hits,1);
  assert.equal(a.get('stTry').textContent,302);
  a.get('dReset').click();assert.equal(a.session.tries,0);assert.equal(a.session.hits,0);
});
test('language falls back to English without navigator.language and honours saved lang',()=>{
  const a=boot();assert.equal(a.store.lang,'en');assert.equal(a.get('dName').textContent,'Free practice');
  const b=boot({v:4,lang:'ja'});assert.equal(b.store.lang,'ja');assert.equal(b.get('dName').textContent,'自由練習');
  const c=boot({v:4,lang:'xx'});assert.equal(c.store.lang,'en');
});
test('switching language re-renders result, coach, log and records in place',()=>{
  const a=boot({v:4,lang:'ko',records:{wave10:[{date:0,score:4.2,dashes:42,chain:9,label:'x',sub:'y'}],ewgf20:[{date:0,score:80,hits:16,target:20,mean:5,label:'80%',sub:'old'}],combo10:[]}});
  dash(a);a.onButton(2,1090);
  assert.equal(a.get('rTitle').textContent,'풍신권');assert.ok(a.get('logBody').innerHTML.includes('풍신권(늦음)'));
  assert.ok(a.get('bests').innerHTML.includes('4.2 대시/초'));assert.ok(a.get('bests').innerHTML.includes('16/20 · 평균'));
  a.setLang('en');
  assert.equal(a.store.lang,'en');assert.equal(a.get('rTitle').textContent,'Wind God Fist');
  assert.ok(a.get('coachMsg').innerHTML.startsWith('So close.'));assert.ok(a.get('logBody').innerHTML.includes('WGF (late)'));
  assert.ok(a.get('bests').innerHTML.includes('4.2 dashes/s'));assert.ok(a.get('bests').innerHTML.includes('16/20 · avg'));
  a.setLang('ja');assert.equal(a.get('rTitle').textContent,'風神拳');assert.equal(a.get('dName').textContent,'自由練習');
  a.setLang('nope');assert.equal(a.store.lang,'ja');
});
test('every dictionary key exists in all three languages',()=>{
  const a=boot();const langs=['ko','en','ja'];
  for(const l of langs){a.setLang(l);assert.equal(a.T('app.title')!=='app.title',true);}
  for(const key of ['a.ewgf.title','trend.stable','set.padNote','footer','mode.combo10.desc']){for(const l of langs){a.setLang(l);assert.notEqual(a.T(key),key);}}
});
test('the three dictionaries share exactly the same key set',()=>{
  const {I18N}=boot();const ko=Object.keys(I18N.ko).sort();
  for(const l of ['en','ja']) assert.deepEqual(Object.keys(I18N[l]).sort(),ko,'keys differ in '+l);
});
test('announcements render in every language and persist the latest read marker',()=>{
  let saved;
  const a=boot({v:4,lang:'ko'},undefined,{localStorage:{getItem:()=>JSON.stringify({v:4,lang:'ko'}),setItem:(k,v)=>saved=JSON.parse(v)}});
  assert.ok(a.NOTICES.length);assert.equal(a.NOTICES[0].items.length,5);assert.equal(a.get('noticeBadge').hidden,false);assert.match(a.get('noticeList').innerHTML,/9월 15일 기능 업데이트/);
  a.setMode('wave10');a.startTrial();a.openNotices();
  assert.equal(a.get('noticeDlg').open,true);assert.equal(a.trial.cdTimer,null,'opening an announcement cancels a countdown');
  assert.equal(a.store.noticeSeen,a.NOTICE_LATEST);assert.equal(saved.noticeSeen,a.NOTICE_LATEST);assert.equal(a.get('noticeBadge').hidden,true);
  a.setLang('en');assert.match(a.get('noticeList').innerHTML,/September 15 feature update/);
  a.setLang('ja');assert.match(a.get('noticeList').innerHTML,/9月15日 機能アップデート/);
  const read=boot({v:4,noticeSeen:a.NOTICE_LATEST});assert.equal(read.get('noticeBadge').hidden,true);
  const invalid=boot({v:4,noticeSeen:'removed-notice'});assert.equal(invalid.store.noticeSeen,'');assert.equal(invalid.get('noticeBadge').hidden,false);
});
test('announcement dates are formatted as date-only values in UTC',()=>{
  let options;
  function DateTimeFormat(locale,opts){options=opts;return {format:()=> 'fixed date'};}
  const a=boot(undefined,undefined,{Intl:{DateTimeFormat}});
  assert.equal(options.timeZone,'UTC');assert.match(a.get('noticeList').innerHTML,/fixed date/);
});
test('a new announcement auto-opens once for returning browsers, but not on their first visit or during play',()=>{
  const first=boot();assert.equal(first.hadStore,false);assert.equal(first.noticeAutoTry(),false);assert.equal(!!first.get('noticeDlg').open,false);
  const returning=boot({v:4});assert.equal(returning.hadStore,true);assert.equal(returning.noticeAutoTry(),true);assert.equal(returning.get('noticeDlg').open,true);assert.equal(returning.store.noticeSeen,returning.NOTICE_LATEST);
  const busy=boot({v:4});busy.setMode('wave10');busy.startTrial();assert.equal(busy.noticeAutoTry(),false);assert.equal(!!busy.get('noticeDlg').open,false);assert.notEqual(busy.trial.cdTimer,null,'automatic notice never cancels an active countdown');
  const read=boot({v:4,noticeSeen:returning.NOTICE_LATEST});assert.equal(read.noticeAutoTry(),false);assert.equal(!!read.get('noticeDlg').open,false);
});
test('histBins puts offsets on the window boundary inside and just outside in the late bin',()=>{
  const a=boot();const bins=a.histBins([{off:0},{off:-12},{off:12},{off:13},{off:null}],12);
  assert.equal(bins.length,16);assert.equal(bins[0].f,-6);assert.equal(bins[15].f,9);
  assert.equal(bins[6].n,1);assert.equal(bins[6].kind,'ewgf');assert.equal(bins[5].n,1);assert.equal(bins[5].kind,'early');
  assert.equal(bins[7].n,2);assert.equal(bins[7].kind,'wgf');assert.equal(bins.reduce((s,b)=>s+b.n,0),4);
  assert.equal(a.histBins([{off:30}],8)[8].kind,'wgf');assert.equal(a.histBins([],8)[4].kind,'early');
});
test('wave10 trial result becomes a share card model in the current language',()=>{
  const a=boot({v:4,lang:'ko'});assert.equal(a.get('dShare').hidden,false);
  a.setMode('wave10');assert.equal(a.get('dShare').hidden,true);assert.equal(a.get('dShare').textContent,'공유 카드');
  a.startTrial();const countdown=a.timers.get(a.trial.cdTimer);a.time(4000);countdown();countdown();countdown();
  dash(a,4100);a.onDir('f',4200);a.onDir('n',4220);dash(a,4240);
  assert.equal(a.shareSource(),null);
  a.endTrial();assert.equal(a.trial.result.rec.dashes,2);assert.equal(a.get('dShare').hidden,false);
  const src=a.shareSource();assert.equal(src.kind,'trial');assert.equal(src.cycles.length,1);
  const m=a.buildCard(src);
  assert.equal(m.app,'미시마 도장');assert.equal(m.modeName,'웨이브 10초');assert.equal(m.hero.value,'0.2');assert.equal(m.hero.label,'대시/초');
  assert.equal(m.chart.type,'wave');assert.equal(m.chart.pts.length,1);assert.equal(m.url,a.SITE_URL);
  assert.deepEqual(Array.from(m.metrics,x=>x.value),['2','2','0']);assert.equal(m.windowText,'초풍 판정 폭 보통 0.7f');
  assert.ok(m.tweet.includes('0.2 대시/초'));assert.ok(m.tweet.includes('최고 연속 2'));assert.ok(m.tweet.endsWith('\n'+a.SITE_URL));
  assert.match(m.file,/^mishima-dojo-wave10-\d{8}\.png$/);
  a.setLang('en');const e=a.buildCard(src);assert.equal(e.modeName,'Wave 10s');assert.equal(e.sub,'10s over · 2 dashes (0.2 dashes/s)');assert.equal(e.hero.label,'dashes/s');
  a.startTrial();assert.equal(a.trial.result,null);assert.equal(a.get('dShare').hidden,true);
});
test('completed EWGF card preserves the judgment window after settings change',()=>{
  const a=boot({v:4,lang:'ko',window:12});a.setMode('ewgf20');a.startTrial();
  const countdown=a.timers.get(a.trial.cdTimer);a.time(4000);countdown();countdown();countdown();
  for(let i=0;i<20;i++){a.clearCommand();dash(a,4100+i*200);a.onButton(2,4170+i*200);}
  assert.equal(a.trial.running,false);assert.equal(a.trial.result.rec.hits,20);
  a.store.window=8;
  const src=a.shareSource(), m=a.buildCard(src);
  assert.equal(src.window,12);assert.equal(m.hero.value,'100%');
  assert.equal(m.windowText,'초풍 판정 폭 보통 0.7f');assert.match(m.tweet,/보통 0\.7f/);
  assert.equal(m.chart.window,12);
});

test('wave trial card counts only attempts made during the completed trial',()=>{
  const a=boot({v:4,lang:'ko'});dash(a);a.onButton(2,1060);
  a.setMode('wave10');a.startTrial();
  const countdown=a.timers.get(a.trial.cdTimer);a.time(4000);countdown();countdown();countdown();
  dash(a,4100);a.onButton(2,4160);a.endTrial();
  a.clearCommand();dash(a,4500);a.onButton(2,4560);
  assert.equal(a.session.attempts.length,3);
  const src=a.shareSource(), m=a.buildCard(src);
  assert.equal(src.attempts.length,1);assert.equal(src.attempts[0].t,4160);
  assert.equal(m.metrics[2].value,'1');
});

test('free-practice session card uses live stats and never leaks raw i18n keys',()=>{
  const a=boot({v:4,lang:'ko'});
  let m=a.buildCard(a.shareSource());assert.equal(m.hero.label,'최고 대시/초');assert.equal(m.chart,null);assert.equal(m.sub,'이번 세션 통계');
  dash(a);a.onButton(2,1060);
  const expect={ko:['초풍 성공률','자유 연습'],en:['EWGF success rate','Free practice'],ja:['最風成功率','自由練習']};
  for(const l of ['ko','en','ja']){
    a.setLang(l);m=a.buildCard(a.shareSource());
    assert.equal(m.hero.value,'100%');assert.equal(m.hero.label,expect[l][0]);assert.equal(m.modeName,expect[l][1]);
    assert.equal(m.chart.type,'hist');assert.equal(m.chart.bins.reduce((s,b)=>s+b.n,0),1);assert.equal(m.metrics.length,4);
    for(const s of [m.sub,m.hero.label,m.windowText,m.tweet,...m.metrics.flatMap(x=>[x.label,x.value])]) assert.doesNotMatch(s,/(^|\s)(card|share|set|mode|rec)\.[a-zA-Z0-9]+/);
  }
  assert.equal(m.metrics[0].value,'1 / 1');
});

test('OG card model has tagline and chart but no personal numbers, in all three languages',()=>{
  const a=boot({v:4,lang:'ko'});
  const names={ko:['미시마 도장','철권 초풍·웨이브 대시 연습'],en:['Mishima Dojo','Tekken EWGF & wave dash practice'],ja:['三島道場','鉄拳 最風・ウェーブ練習']};
  for(const l of ['ko','en','ja']){
    a.setLang(l);const m=a.buildOgCard();
    assert.equal(m.app,names[l][0]);assert.equal(m.tagline[0],names[l][1]);assert.equal(m.tagline.length,2);
    assert.equal(m.hero,null);assert.equal(m.metrics.length,0);assert.equal(m.url,a.SITE_URL);
    assert.equal(m.chart.type,'hist');assert.equal(m.chart.window,a.store.window);assert.equal(m.chart.bins.reduce((s,b)=>s+b.n,0),40);
    assert.equal(m.chips.map(c=>c.cmd).join(' '),'6N23 6N23+2');assert.equal(m.modeName,m.chips.map(c=>c.cmd+' '+c.tag).join(' · '));
    for(const s of [m.modeName,m.keywords,m.note,m.windowText,m.dateText,...m.tagline,...m.chips.map(c=>c.tag)]) assert.doesNotMatch(s,/(^|\s)(og|app|card)\.[a-zA-Z0-9]+/);
    assert.notEqual(a.T('app.docTitle'),a.T('app.title'));assert.ok(a.T('app.docTitle').startsWith(a.T('app.title')));
  }
});
test('static head carries the SEO and Open Graph tags that crawlers read without JS',()=>{
  const head=html.slice(0,html.indexOf('<style>'));
  const a=boot({v:4,lang:'ko'}), url=a.SITE_URL;
  // static <title> = Korean doc title + English suffix, so the crawler title and the in-app title cannot drift apart
  assert.ok(head.includes(`<title>${a.T('app.docTitle')} (Mishima Dojo EWGF Trainer)</title>`));
  assert.equal(head.match(/<meta name="twitter:/g).length,1,'X falls back to og:* tags; keep only twitter:card');
  assert.match(head,/<meta name="description" content="[^"]{80,300}">/);
  assert.match(head,/<meta name="robots" content="index,follow">/);
  assert.ok(head.includes(`<link rel="canonical" href="${url}">`));
  assert.ok(head.includes(`<meta property="og:url" content="${url}">`));
  assert.ok(head.includes(`<meta property="og:image" content="${url}og.png">`));
  assert.ok(head.includes('<meta property="og:image:width" content="1200">'));assert.ok(head.includes('<meta property="og:image:height" content="630">'));
  assert.ok(head.includes('<meta name="twitter:card" content="summary_large_image">'));
  const bg=html.match(/:root\{[^}]*--bg:(#[0-9A-Fa-f]{6})/)[1];assert.ok(head.includes(`<meta name="theme-color" content="${bg}">`));
  assert.equal(head.includes('http://'),false,'head must not contain http://');
  // exactly two script tags in the whole file, in this order: the head JSON-LD data block (no code) and the single inline app script — no <script src>, no module (single file, no libraries)
  assert.deepEqual(html.match(/<script\b[^>]*>/g),['<script type="application/ld+json">','<script>'],'only the JSON-LD data block and one inline app script');
  const ldm=head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);assert.ok(ldm,'the JSON-LD block sits in the head');
  const ld=JSON.parse(ldm[1]);
  assert.equal(ld['@type'],'WebApplication');assert.equal(ld.url,url);assert.equal(ld.image,url+'og.png');assert.equal(ld.isAccessibleForFree,true);
  assert.deepEqual(ld.inLanguage,['ko','en','ja']);assert.ok(ld.name.includes(a.T('app.title')));
  assert.equal(ld.description,head.match(/<meta name="description" content="([^"]*)">/)[1],'JSON-LD description is the meta description, not a third copy');
  // robots.txt / sitemap.xml are static crawler files at the site root: they must exist and carry the same canonical URL as SITE_URL
  const root=f=>fs.readFileSync(require('node:path').join(__dirname,'..',f),'utf8');
  assert.ok(root('robots.txt').includes(`Sitemap: ${url}sitemap.xml`),'robots.txt points at the sitemap on the canonical host');
  const sm=root('sitemap.xml');assert.deepEqual(sm.match(/<loc>[^<]*<\/loc>/g),[`<loc>${url}</loc>`,`<loc>${url}en/</loc>`,`<loc>${url}ja/</loc>`],'sitemap lists the app and the two landing pages once each');
  assert.doesNotMatch(sm,/<lastmod>|<changefreq>/,'no hand-maintained lastmod/changefreq (nothing regenerates them; Google ignores changefreq and distrusts stale lastmod)');
  assert.match(html,/document\.title = T\('app\.docTitle'\)/);
});

test('leaderboard entry is built only from a finished trial, one metric pair per board',()=>{
  const a=boot({v:4,lang:'ko',window:8});
  assert.match(a.BOARD_URL,/^$|^https:\/\/[^/]+$/,'BOARD_URL is empty or an https origin without trailing slash');
  assert.equal(a.boardEntry(null,'wave10'),null);assert.equal(a.boardEntry(a.trial.result,'free'),null);
  const plain=x=>JSON.parse(JSON.stringify(x)); // vm-realm objects have a foreign prototype; compare by value
  const run=(mode,play)=>{a.setMode(mode);a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();play();a.endTrial();return a.boardEntry(a.trial.result,mode);};
  const wave=run('wave10',()=>{dash(a,4100);a.time(14100);});
  assert.deepEqual(plain(wave),{board:'wave10',win:8,lang:'ko',score:0.1,tie:1,detail:{dashes:1,chain:1}});
  assert.deepEqual(plain(a.boardRowText('wave10',wave)),{label:'0.1 대시/초',sub:'1회 · 최고 연속 1'});
  const ewgf=run('ewgf20',()=>{dash(a,4100);a.onButton(2,4160);});
  assert.deepEqual(plain(ewgf),{board:'ewgf20',win:8,lang:'ko',score:5,tie:0,detail:{hits:1,target:20,mean:0}});
  assert.equal(Object.is(ewgf.tie,-0),false,'tie must not be -0');
  const combo=run('combo10',()=>{dash(a,4100);for(const t of [4200,4400]){a.onDir('f',t);a.onDir('n',t+20);dash(a,t+40);}a.onButton(2,4500);});
  assert.equal(combo.board,'combo10');assert.equal(combo.score,10);assert.deepEqual(plain(Object.keys(combo.detail)),['hits','target','mean','dps']);
  assert.equal(combo.detail.hits,1);assert.ok(combo.detail.dps>4&&combo.detail.dps<8,'mean dash/s of the trial cycles');assert.equal(combo.tie,combo.detail.dps);
  assert.equal(a.boardRowText('combo10',combo).sub,'1/10 · 평균 +0.0f · '+combo.detail.dps.toFixed(1)+' 대시/초','combo10 shows its tie-breaker');
  assert.equal(a.boardRowText('combo10',{score:50,detail:{hits:5,target:10,mean:1}}).sub,'5/10 · 평균 +0.1f','rows without dps (old records) render as before');
  a.setLang('en');assert.equal(a.boardRowText('ewgf20',ewgf).sub,'1/20 · avg +0.0f');
  a.setMode('free');assert.equal(a.boardEntry(a.trial.result,'free'),null);
  for(const [n,ok] of [['ab',true],['한글닉네임열두글자까지만',true],['三島 道場',true],['ＡＢＣ',true],['🔥🔥',true],['a',false],['1234567890123',false],['ab\u200bcd',false],['a\u0000b',false],
    ['\u3164\u3164',false],['ab\u2060',false],['ab\u00ad',false],['ab\ufe0f',false],['ab\ue000',false]]) assert.equal(a.nickOk(n),ok,JSON.stringify(n)); // fillers, word joiner, soft hyphen, variation selector, private use: blank-looking names
});

test('trial end submits only with a claimed nickname (token); a failed submit shows retry; result card opens; tiers by top-%',async()=>{
  const t=boot();
  assert.equal(t.pctTop(1,1),100);assert.equal(t.pctTop(1,200),1);assert.equal(t.pctTop(3,42),8);assert.equal(t.pctTop(0,0),1);
  assert.deepEqual([[1,1000],[2,100],[10,100],[11,100],[20,100],[21,100],[50,100],[51,100],[70,100],[71,100],[1,1],[1,5],[2,10],[5,10],[7,10],[8,10]].map(([r,n])=>t.tierOf(r,n)),[0,1,1,2,2,3,3,4,4,5,1,1,2,3,4,5],'SS 1% · S 10% · A 20% · B 50% · C 70% · D; tiny boards are scored as ten players');
  assert.deepEqual([0,1,2,3,4,5].map(i=>t.T('tier.'+i+'.title')),['SS','S','A','B','C','D']);
  const run=a=>{a.setMode('wave10');a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();dash(a,4100);a.time(14100);a.endTrial();};
  const noToken=boot({v:4,lang:'ko',window:12,nick:'tester'}); run(noToken); await new Promise(r=>setImmediate(r));
  assert.equal(noToken.trial.result.submit,undefined,'a nickname without its token is not ours to submit with');
  assert.equal(noToken.get('dRank').textContent,'닉네임을 정하면 순위에 등록됩니다.');assert.equal(noToken.get('dRankRetry').hidden,true);
  assert.equal(noToken.get('nickBtn').hidden,false);assert.equal(noToken.get('nickBtn').textContent,'닉네임 정하기','the header button is the way back into the gate');
  assert.equal(boot({v:4,nickToken:'ab'.repeat(24)}).store.nickToken,'','a token without its nickname is dropped');
  assert.ok(noToken.timers.get(noToken.trial.openTimer),'result card is scheduled to open');
  const tok='ab'.repeat(24);
  const owner=boot({v:4,lang:'ko',window:12,nick:'tester',nickToken:tok}); assert.equal(owner.store.nickToken,tok);
  run(owner); await new Promise(r=>setImmediate(r));
  const s=owner.trial.result.submit; // the vm has no fetch, so the auto-submit fails and the retry button appears
  assert.equal(s.state,'fail');assert.equal(owner.get('dRankRetry').hidden,false);
  assert.equal(owner.get('dRank').textContent,'등록에 실패했습니다. 잠시 후 다시 시도하세요.');
  owner.setLang('en');assert.equal(owner.get('dRank').textContent,'Submission failed. Try again later.');
  owner.setMode('free');assert.equal(owner.get('dRank').textContent,'');assert.equal(owner.get('dRankRetry').hidden,true);
  assert.equal(boot({v:4,nickToken:'zz'}).store.nickToken,'','malformed token is dropped');
  // share card model carries the rank line and tier title when the submit succeeded
  const card=boot({v:4,lang:'ko',window:12}); run(card); card.trial.result.submit={state:'done',rank:3,total:42,improved:true};
  const m=card.buildCard(card.shareSource());
  assert.equal(m.rankText,'3위 / 42명 · 상위 8% · S');assert.match(m.tweet,/\n3위 \/ 42명 · 상위 8% · S\n/);
  // the banner comment is per trial mode (tier.N.<mode>): the same grade reads differently in wave10 and rush30, and every mode has all six in every language
  for(const l of ['ko','en','ja']){card.setLang(l);for(const mode of card.BOARDS)for(let i=0;i<6;i++)assert.notEqual(card.T('tier.'+i+'.'+mode),'tier.'+i+'.'+mode,l+' '+mode+' '+i);}
  card.setLang('ko');const banner=card.get('shareTierMsg');
  await card.openShare().catch(()=>{}); // the banner is filled synchronously; the canvas draw rejects in this harness (no 2d context)
  assert.equal(card.trial.result.personalBest,true);assert.equal(card.get('donateShare').hidden,false,'the first personal best gets today\'s result prompt');
  assert.equal(card.get('shareTier').textContent,'S');assert.equal(card.get('shareRank').className,'share-rank t1');assert.equal(banner.textContent,card.T('tier.1.wave10'));
  card.trial.result.submit={state:'done',rank:40,total:42,improved:true};await card.openShare().catch(()=>{});
  assert.equal(card.get('donateShare').hidden,false,'a duplicate opening keeps the prompt claimed for this result');
  assert.equal(card.get('shareTier').textContent,'D');assert.equal(banner.textContent,'사람이... 맞으시죠? 6N23 6 N, 다시 갑시다.');
  card.trial.result.submit={state:'busy'};assert.equal(card.buildCard(card.shareSource()).rankText,'');
});

// Backend stub: every fetch is recorded and stays pending until the test answers it (in any order).
function backend(){
  const calls=[];
  const fetch=(url,init)=>new Promise(resolve=>calls.push({url:String(url),method:init&&init.method||'GET',body:init&&init.body?JSON.parse(init.body):null,
    resolve:(data,status=200)=>resolve({ok:status<400,status,json:async()=>data})}));
  const find=(path,method='GET')=>calls.find(c=>c.url.includes(path)&&c.method===method&&!c.done);
  const answer=(path,method,data,status)=>{const c=find(path,method);if(!c)throw new Error('no pending '+method+' '+path);c.done=true;c.resolve(data,status);return c;};
  return {fetch,calls,find,answer,flush:()=>new Promise(r=>setImmediate(r))};
}
const topRes=(nick,rank=1,total=1)=>({season:'all',board:'wave10',total,rows:[{id:7,rank,nick,score:0.1,tie:1,detail:{dashes:1,chain:1},win:12,created_at:1}],me:{id:7,rank,nick,score:0.1,tie:1,detail:{dashes:1,chain:1},win:12,created_at:1}});
test('backend races: a late submit after a rename or a tab switch does not overwrite the board; a 403 mid-card waits; visits count once',async()=>{
  const tok='ab'.repeat(24), run=a=>{a.setMode('wave10');a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();dash(a,4100);a.time(14100);a.endTrial();};
  // rename while the submit is in flight: the submit's board snapshot belongs to the old nickname and is discarded
  let b=backend(), a=boot({v:4,lang:'ko',window:12,nick:'old',nickToken:tok},b.fetch);
  assert.ok(b.find('/top?board=wave10&nick=old'),'my row is requested only with a claimed nickname');
  run(a); await b.flush(); const sub=b.find('/submit','POST'); assert.equal(sub.body.nick,'old'); assert.equal(sub.body.token,tok);
  a.claimNick('new'); await b.flush(); b.answer('/nick','POST',{ok:true,nick:'new',token:'cd'.repeat(24)}); await b.flush();
  assert.equal(a.store.nick,'new'); assert.ok(b.find('/top?board=wave10&nick=new'),'board reloaded for the new nickname');
  b.answer('/submit','POST',{ok:true,id:7,rank:1,total:1,improved:true,...topRes('old')}); await b.flush();
  assert.equal(a.trial.result.submit.state,'done'); assert.equal(a.board.data.wave10,undefined,'stale board for the old nickname is not shown');
  b.answer('/top?board=wave10&nick=new','GET',{...topRes('new'),me:null}); await b.flush(); assert.equal(a.board.data.wave10.me,null);
  // tab switched while the submit is in flight: the response is stored for its board but the user is not yanked back and their load survives
  b=backend(); a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch); run(a); await b.flush();
  a.board.tab='ewgf20'; a.boardLoad(); await b.flush(); assert.ok(b.find('/top?board=ewgf20'));
  b.answer('/submit','POST',{ok:true,id:7,rank:1,total:1,improved:true,...topRes('me')}); await b.flush();
  assert.equal(a.board.tab,'ewgf20'); assert.equal(a.board.data.wave10.me.nick,'me');
  b.answer('/top?board=ewgf20','GET',{...topRes('me'),board:'ewgf20',rows:[],me:null,total:0}); await b.flush();
  assert.equal(a.board.data.ewgf20.total,0,'the ewgf20 load was not dropped by the submit'); assert.equal(a.board.msg,'');
  // token rejected while the result card is about to open: the gate waits for the card to close, then asks once
  b=backend(); a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch); run(a); await b.flush();
  b.answer('/submit','POST',{error:'auth'},403); await b.flush();
  assert.equal(a.trial.result.submit.error,'auth'); assert.equal(a.store.nickToken,''); assert.equal(a.live.nickLost,true); assert.equal(a.live.nickMsg,'','gate not opened over the card');
  assert.equal(a.get('nickBtn').textContent,'닉네임 정하기'); assert.equal(a.get('dRank').textContent,'닉네임 확인에 실패했습니다. 닉네임을 다시 정해 주세요.');
  a.get('shareDlg').close(); assert.equal(a.live.nickLost,false); assert.deepEqual([...a.live.nickMsg],['nick.expired'],'gate opens once the card is closed');
  a.claimNick('me2'); await b.flush(); b.answer('/nick','POST',{ok:true,nick:'me2',token:'ef'.repeat(24)}); await b.flush();
  assert.equal(b.find('/submit','POST').body.nick,'me2','the failed result is resubmitted under the new nickname');
  // visit counter: the day is marked before the POST answers, and a second load meanwhile neither POSTs nor GETs again
  b=backend(); a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch);
  assert.equal(b.find('/visits','POST').method,'POST'); assert.match(a.store.visitDay,/^\d{4}-\d\d-\d\d$/,'marked at once');
  a.visitsLoad(); await b.flush(); assert.equal(b.calls.filter(c=>c.url.includes('/visits')).length,1,'no second request while one is in flight');
  b.answer('/visits','POST',{day:'x',today:1,total:1}); await b.flush(); assert.equal(a.live.visits.today,1);
  a.visitsLoad(); await b.flush(); assert.equal(b.find('/visits','GET').method,'GET','same day again: read only');
  // a nickname claim that fails on the server side (not a taken name) offers to practise without a ranking; a taken name does not
  b=backend(); a=boot({v:4,lang:'ko',window:12},b.fetch); a.claimNick('fresh'); await b.flush(); b.answer('/nick','POST',{error:'server'},500); await b.flush();
  assert.equal(a.live.nickLater,true); assert.equal(a.get('nickLater').hidden,false);
  a.claimNick('fresh'); await b.flush(); b.answer('/nick','POST',{error:'taken'},409); await b.flush(); assert.equal(a.live.nickLater,false); assert.equal(a.get('nickLater').hidden,true);
});

test('leaderboard delete is shown only on my row, confirms, sends owner credentials and refreshes from the server response',async()=>{
  const tok='ab'.repeat(24), b=backend(); let allow=false;
  const a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch,{confirm:()=>allow});
  a.board.data.wave10={...topRes('me'),rows:[{...topRes('other').rows[0],id:8},topRes('me').rows[0]]}; a.renderBoard();
  let html=a.get('boardList').innerHTML;
  assert.equal((html.match(/data-delete-score/g)||[]).length,1,'only my row has a delete button');
  assert.match(html,/class="me"[\s\S]*data-delete-score[\s\S]*>삭제</);
  await a.boardDelete(); assert.equal(b.find('/score','DELETE'),undefined,'cancel sends nothing');
  allow=true; const pending=a.boardDelete(); await b.flush();
  const call=b.find('/score','DELETE'); assert.deepEqual(call.body,{board:'wave10',nick:'me',token:tok});
  assert.equal(a.board.deleting,true); assert.equal(a.get('boardMsg').textContent,'기록 삭제 중…');
  b.answer('/score','DELETE',{season:'all',board:'wave10',ok:true,deleted:1,total:1,rows:[{...topRes('other').rows[0],id:8}],me:null,cut10:.1}); await pending;
  assert.equal(a.board.deleting,false); assert.equal(a.board.data.wave10.me,null); assert.equal(a.get('boardMe').textContent,'등록한 기록이 없습니다');
  assert.equal(a.get('boardMsg').textContent,'내 기록을 삭제했습니다.'); assert.doesNotMatch(a.get('boardList').innerHTML,/data-delete-score/);
});

test('leaderboard delete reloads after a rename and never marks the old nickname as mine',async()=>{
  const oldToken='ab'.repeat(24), newToken='cd'.repeat(24), b=backend();
  const a=boot({v:4,lang:'ko',window:12,nick:'old',nickToken:oldToken},b.fetch,{confirm:()=>true});
  a.board.data.wave10=topRes('old'); a.renderBoard();
  const deleting=a.boardDelete(); await b.flush();
  a.claimNick('new'); await b.flush(); b.answer('/nick','POST',{ok:true,nick:'new',token:newToken}); await b.flush();
  assert.equal(a.board.loadAfterDelete,true,'the new owner load is queued while deletion is active');
  assert.equal(b.find('/top?board=wave10&nick=new'),undefined,'the queued load does not race the delete');
  assert.doesNotMatch(a.get('boardList').innerHTML,/data-delete-score/,'the old owner row immediately loses its delete button');
  b.answer('/score','DELETE',{season:'all',board:'wave10',ok:true,deleted:1,total:0,rows:[],me:null,cut10:null}); await deleting; await b.flush();
  assert.ok(b.find('/top?board=wave10&nick=new'),'deletion completion reloads the board for the new owner');
  b.answer('/top?board=wave10&nick=new','GET',{season:'all',board:'wave10',total:0,rows:[],me:null,cut10:null}); await b.flush();
  assert.equal(a.board.data.wave10.me,null); assert.equal(a.get('boardMe').textContent,'등록한 기록이 없습니다');
});

test('leaderboard submit and delete are serialized in both directions',async()=>{
  const tok='ab'.repeat(24), run=a=>{a.setMode('wave10');a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();dash(a,4100);a.time(14100);a.endTrial();};
  // An existing in-flight submit disables and rejects deletion until its response has settled.
  let b=backend(), a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch,{confirm:()=>true});
  a.board.data.wave10=topRes('me'); run(a); await b.flush();
  assert.equal(a.board.submitting,true); assert.match(a.get('boardList').innerHTML,/data-delete-score[^>]* disabled/);
  await a.boardDelete(); assert.equal(b.find('/score','DELETE'),undefined,'delete cannot overlap an active submit');
  b.answer('/submit','POST',{ok:true,id:7,rank:1,total:1,improved:true,...topRes('me')}); await b.flush();
  assert.equal(a.board.submitting,false); assert.doesNotMatch(a.get('boardList').innerHTML,/data-delete-score[^>]* disabled/);
  let deleting=a.boardDelete(); await b.flush(); assert.ok(b.find('/score','DELETE'),'delete is available once submit settles');
  b.answer('/score','DELETE',{season:'all',board:'wave10',ok:true,deleted:1,total:0,rows:[],me:null,cut10:null}); await deleting;

  // If deletion starts first, a newly completed trial waits and submits only after deletion finishes.
  b=backend(); a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch,{confirm:()=>true});
  a.board.data.wave10=topRes('me'); deleting=a.boardDelete(); await b.flush(); run(a); await b.flush();
  assert.equal(a.board.submitAfterDelete,true); assert.equal(b.find('/submit','POST'),undefined,'submit is queued behind delete');
  b.answer('/score','DELETE',{season:'all',board:'wave10',ok:true,deleted:1,total:0,rows:[],me:null,cut10:null}); await deleting; await b.flush();
  assert.ok(b.find('/submit','POST'),'queued trial submits after delete settles');
  b.answer('/submit','POST',{ok:true,id:9,rank:1,total:1,improved:true,...topRes('me')}); await b.flush();
  assert.equal(a.board.submitting,false); assert.equal(a.trial.result.submit.state,'done');
});

test('post votes: cancel/switch through an idempotent set, validated local cache, cleared on rename, nickname gate, deleted post',async()=>{
  const tok='ab'.repeat(24), rows=(up,down)=>[{id:7,nick:'x',text:'hi',created_at:1,up,down}], mine=()=>JSON.parse(JSON.stringify(a.store.votes)); // votes come from the vm realm: compare as plain JSON
  let b=backend(); let a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok,votes:{'7':1,'x':1,'8':5,'9':-1,'12345678901234':1}},b.fetch);
  assert.deepEqual(mine(),{'7':1,'9':-1},'only numeric ids with 1/-1 survive the loader');
  b.answer('/posts','GET',{rows:rows(1,0)}); await b.flush();
  assert.deepEqual(mine(),{'7':1},'votes on posts no longer listed are forgotten');
  let html=a.get('postList').innerHTML;
  assert.match(html,/data-id="7" data-v="1" aria-pressed="true"[^>]*aria-label="좋아요"[^>]*>👍 1</,'my like is marked');
  assert.match(html,/data-id="7" data-v="-1" aria-pressed="false"[^>]*aria-label="싫어요"[^>]*>👎 0</);
  // pressing my current vote cancels (v:0); the response's `mine` and rows replace the cache and the list
  a.postVote(7,1); await b.flush(); let c=b.find('/vote','POST'); assert.deepEqual(c.body,{nick:'me',token:tok,id:7,v:0});
  assert.match(a.get('postList').innerHTML,/data-id="7" data-v="1" aria-pressed="true" [^>]*disabled/,'vote buttons are disabled while a request is in flight');
  a.postVote(7,-1); await b.flush(); assert.equal(b.calls.filter(x=>x.url.includes('/vote')).length,1,'no second request while one is in flight');
  b.answer('/vote','POST',{ok:true,id:7,mine:0,rows:rows(0,0)}); await b.flush();
  assert.deepEqual(mine(),{}); assert.match(a.get('postList').innerHTML,/data-v="1" aria-pressed="false"[^>]*>👍 0</);
  // the other button switches; a stale cache is corrected by the server's answer, not by the click
  a.postVote(7,-1); await b.flush(); assert.equal(b.find('/vote','POST').body.v,-1);
  b.answer('/vote','POST',{ok:true,id:7,mine:-1,rows:rows(0,1)}); await b.flush(); assert.deepEqual(mine(),{'7':-1});
  assert.match(a.get('postList').innerHTML,/data-v="-1" aria-pressed="true"[^>]*>👎 1</);
  // errors: rate → message, 404 post → list reload, 403 → nickname lost and votes dropped
  a.postVote(7,1); await b.flush(); b.answer('/vote','POST',{error:'rate'},429); await b.flush();
  assert.deepEqual([...a.live.postsMsg],['posts.voteFast']); assert.equal(a.get('postMsg').textContent,'너무 빠릅니다. 잠시 후 다시 눌러 주세요.'); assert.deepEqual(mine(),{'7':-1});
  a.postVote(7,1); await b.flush(); b.answer('/vote','POST',{ok:true,id:7,mine:1,rows:rows(1,0)}); await b.flush(); assert.equal(a.live.postsMsg,'','a success clears the vote message');
  a.postVote(7,1); await b.flush(); b.answer('/vote','POST',{error:'post'},404); await b.flush();
  assert.ok(b.find('/posts','GET'),'a deleted post triggers a list reload'); assert.deepEqual(mine(),{}); b.answer('/posts','GET',{rows:[]}); await b.flush();
  assert.match(a.get('postList').innerHTML,/class="empty"/);
  a.get('nickDlg').showModal=function(){this.open=true;}; // the stub dialog has no showModal by default
  a.postVote(7,1); await b.flush(); b.answer('/vote','POST',{error:'auth'},403); await b.flush();
  assert.equal(a.store.nickToken,''); assert.deepEqual(mine(),{}); assert.equal(a.get('nickDlg').open,true,'gate opens on a lost token');
  // without a nickname the gate opens and nothing is sent
  b=backend(); a=boot({v:4,lang:'ko',window:12},b.fetch); const before=b.calls.length;
  a.get('nickDlg').showModal=function(){this.open=true;}; a.get('nickDlg').open=false; a.postVote(7,1); await b.flush(); assert.equal(b.calls.length,before); assert.equal(a.get('nickDlg').open,true);
  // bad arguments are ignored; a rename to another nickname drops the cache, a case change of the same name keeps it
  b=backend(); a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok,votes:{'7':1}},b.fetch); b.answer('/posts','GET',{rows:rows(1,0)}); await b.flush();
  a.postVote('7',1); a.postVote(7,2); await b.flush(); assert.equal(b.find('/vote','POST'),undefined);
  a.claimNick('ME'); await b.flush(); b.answer('/nick','POST',{ok:true,nick:'ME',token:'cd'.repeat(24)}); await b.flush(); assert.deepEqual(mine(),{'7':1});
  a.claimNick('other'); await b.flush(); b.answer('/nick','POST',{ok:true,nick:'other',token:'ef'.repeat(24)}); await b.flush(); assert.deepEqual(mine(),{});
  // a rename while a vote is in flight: the answer updates the list but not the new nickname's cache; a saved cache without a nickname is dropped on load
  a.postVote(7,1); await b.flush(); a.claimNick('third'); await b.flush(); b.answer('/nick','POST',{ok:true,nick:'third',token:'ab'.repeat(24)}); await b.flush();
  b.answer('/vote','POST',{ok:true,id:7,mine:1,rows:rows(1,0)}); await b.flush(); assert.deepEqual(mine(),{},'the old nickname\'s vote is not remembered under the new one'); assert.equal(a.live.voting,false); assert.match(a.get('postList').innerHTML,/>👍 1</);
  a=boot({v:4,lang:'ko',window:12,votes:{'7':1}},b.fetch); assert.deepEqual(JSON.parse(JSON.stringify(a.store.votes)),{});
  // old worker without counts: buttons still render with 0
  a.live.posts=[{id:7,nick:'x',text:'hi',created_at:1}]; a.renderPosts(); assert.match(a.get('postList').innerHTML,/>👍 0<[\s\S]*>👎 0</);
});

test('post replies: render many, submit one level deep, keep text on failure, close on success, and gate by nickname',async()=>{
  const tok='ab'.repeat(24), rows=replies=>[{id:7,nick:'original',text:'question',created_at:1,up:0,down:0,replies}];
  let b=backend(), a=boot({v:4,lang:'ko',window:12,nick:'me',nickToken:tok},b.fetch);
  b.answer('/posts','GET',{rows:rows([{id:1,post_id:7,nick:'one',text:'first',created_at:2},{id:2,post_id:7,nick:'two',text:'second',created_at:3}])}); await b.flush();
  let html=a.get('postList').innerHTML; assert.match(html,/답글 2/); assert.ok(html.indexOf('first')<html.indexOf('second'),'replies render oldest first');
  a.live.replyTo=7; a.live.replyText='draft'; a.renderPosts(); html=a.get('postList').innerHTML;
  assert.match(html,/class="reply-form" data-id="7"/); assert.match(html,/value="draft"/); assert.match(html,/placeholder="답글 쓰기 \(200자\)"/);
  a.postVote(7,1); await b.flush(); a.replySend(7,'must wait'); await b.flush();
  assert.equal(b.calls.filter(x=>x.url.includes('/reply')).length,0,'a reply cannot race a vote snapshot');
  assert.match(a.get('postList').innerHTML,/class="reply-form"[\s\S]*<input[^>]* disabled/);
  b.answer('/vote','POST',{ok:true,id:7,mine:1,rows:rows([{id:1,post_id:7,nick:'one',text:'first',created_at:2},{id:2,post_id:7,nick:'two',text:'second',created_at:3}])}); await b.flush();
  a.replySend(7,' hello   reply '); await b.flush(); let c=b.find('/reply','POST');
  assert.deepEqual(c.body,{nick:'me',token:tok,id:7,text:'hello reply'}); assert.equal(a.live.replying,true); assert.match(a.get('postMsg').textContent,/답글 보내는 중/);
  const votesBefore=b.calls.filter(x=>x.url.includes('/vote')).length; a.postVote(7,-1); await b.flush();
  assert.equal(b.calls.filter(x=>x.url.includes('/vote')).length,votesBefore,'a vote cannot race a reply snapshot');
  b.answer('/reply','POST',{ok:true,id:3,postId:7,rows:rows([{id:3,post_id:7,nick:'me',text:'hello reply',created_at:4}])}); await b.flush();
  assert.equal(a.live.replying,false); assert.equal(a.live.replyTo,0); assert.equal(a.live.replyText,''); assert.match(a.get('postList').innerHTML,/hello reply/); assert.doesNotMatch(a.get('postList').innerHTML,/reply-form/);
  a.live.replyTo=7; a.replySend(7,'retry me'); await b.flush(); b.answer('/reply','POST',{error:'rate'},429); await b.flush();
  assert.equal(a.live.replyText,'retry me'); assert.equal(a.live.replyTo,7); assert.equal(a.get('postMsg').textContent,'너무 빠릅니다. 1분에 3개까지 남길 수 있습니다.');
  a.setLang('ja'); assert.match(a.get('postList').innerHTML,/返信 1件/); assert.match(a.get('postList').innerHTML,/キャンセル/);
  a.replySend(7,'gone'); await b.flush(); b.answer('/reply','POST',{error:'post'},404); await b.flush(); assert.ok(b.find('/posts','GET'),'a deleted parent reloads the list');
  b=backend(); a=boot({v:4,lang:'ko',window:12},b.fetch); const before=b.calls.length; a.get('nickDlg').showModal=function(){this.open=true;};
  a.replySend(7,'hi'); await b.flush(); assert.equal(b.calls.length,before); assert.equal(a.get('nickDlg').open,true);
});

test('app and worker agree on the leaderboard contract (boards, windows, detail fields)',async()=>{
  const w=await import(require('node:url').pathToFileURL(require('node:path').join(__dirname,'../worker/index.js')).href);
  const a=boot({v:4,lang:'ko',window:15});
  assert.deepEqual([...a.WINDOWS],w.WINDOWS);assert.deepEqual([...a.BOARDS],Object.keys(w.BOARDS));
  assert.deepEqual(html.match(/<button data-board="(\w+)"/g).map(x=>x.match(/"(\w+)"/)[1]),Object.keys(w.BOARDS),'#boardTabs buttons');
  const run=(mode,play)=>{a.setMode(mode);a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();play();a.endTrial();return JSON.parse(JSON.stringify(a.boardEntry(a.trial.result,mode)));};
  const entries={wave10:run('wave10',()=>{dash(a,4100);a.time(14100);}),ewgf20:run('ewgf20',()=>{dash(a,4100);a.onButton(2,4160);}),
    combo10:run('combo10',()=>{dash(a,4100);for(const t of [4200,4400]){a.onDir('f',t);a.onDir('n',t+20);dash(a,t+40);}a.onButton(2,4500);}),
    rush30:run('rush30',()=>{dash(a,4100);a.world.dummyX=a.world.charX+60;a.world.dummy.type='low';dash(a,4300);a.onButton(4,4400);a.time(34100);a.trialTick(34100);}),
    bd10:run('bd10',()=>{const o=bdOut(a,4100);a.onDir('db',o+fr(a.BD.MOVE_F));a.time(14100);})};
  for(const [m,e] of Object.entries(entries)){
    const v=w.validate({...e,nick:'smoke'});assert.equal(v.error,undefined,m+': '+JSON.stringify(e));
    assert.deepEqual(Object.keys(v.value.detail),Object.keys(e.detail),m+' detail fields');assert.equal(v.value.win,15);
  }
});

/* ---- sound / streak popup / movement (2026-09-12) ---- */
test('sound settings: defaults, invalid saves fall back, valid saves survive, sliders write the store',()=>{
  const a=boot();assert.equal(a.store.sound,1);assert.equal(a.store.bgm,1);assert.equal(a.store.bgmVol,100);assert.equal(a.store.sfxVol,100);assert.equal(a.snd.ok,false);
  const b=boot({v:4,sound:2,bgm:2,bgmVol:'50',sfxVol:150});assert.equal(b.store.sound,1);assert.equal(b.store.bgm,1);assert.equal(b.store.bgmVol,100);assert.equal(b.store.sfxVol,100);
  const c=boot({v:4,sound:0,bgm:0,bgmVol:0,sfxVol:35});assert.equal(c.store.sound,0);assert.equal(c.store.bgm,0);assert.equal(c.store.bgmVol,0);assert.equal(c.store.sfxVol,35);
  assert.equal(c.get('sfxVol').disabled,true);assert.equal(c.get('sfxVolOut').textContent,'35%');
  a.get('sfxVol').value='35';a.get('sfxVol').input();assert.equal(a.store.sfxVol,35);assert.equal(a.get('sfxVolOut').textContent,'35%');
  a.get('bgmVol').value='abc';a.get('bgmVol').input();assert.equal(a.store.bgmVol,0);
  // fx paths that call playSfx must be harmless without Audio
  a.fx.crouchDash();a.fx.ewgf(5);a.fx.ewgf(1,true);a.fx.dash();a.fx.backdash();
  assert.deepEqual(Object.keys(html.match(/const SND = \{([^}]*)\}/)[1].split(',').reduce((o,kv)=>{o[kv.split(':')[0].trim()]=1;return o;},{})),['bgm','wave','ewgf']);
  for(const f of ['bgm.mp3','sfx-wave.mp3','sfx-ewgf.mp3']) assert.ok(fs.existsSync(require('node:path').join(__dirname,'..',f)),f+' exists');
});
test('EWGF streak counts consecutive successes, resets on failure, fault, 3s gap, mode/reset/blur, and caps the look at level 6',()=>{
  const a=boot();
  const hit=t=>{dash(a,t);a.onButton(2,t+60);};
  hit(1000);assert.equal(a.combo.n,1);assert.equal(a.pops.at(-1).text,'EWGF!');assert.equal(a.pops.at(-1).lvl,1);assert.equal(a.session.attempts.at(-1).streak,1);
  hit(2000);hit(3000);assert.equal(a.combo.n,3);assert.equal(a.pops.at(-1).text,'EWGF ×3');assert.equal(a.pops.at(-1).lvl,3);
  assert.match(a.get('rOff').textContent,/streak 3/);
  hit(6100);assert.equal(a.combo.n,1,'more than 3s since the last EWGF starts over');
  hit(7000);hit(8000);hit(9000);assert.equal(a.pops.at(-1).text,'EWGF ×4!');hit(10000);assert.equal(a.pops.at(-1).text,'EWGF ×5!!');assert.equal(a.pops.at(-1).lvl,5);
  hit(11000);hit(12000);assert.equal(a.combo.n,7);assert.equal(a.pops.at(-1).text,'EWGF ×7!!');assert.equal(a.pops.at(-1).lvl,6,'look frozen at 6');
  dash(a,13000);a.onButton(2,13100);assert.equal(a.session.attempts.at(-1).kind,'wgf');assert.equal(a.combo.n,0,'a late WGF breaks the streak');
  hit(14000);a.onDir('f',15000);a.onDir('df',15010);assert.equal(a.combo.n,0,'a fault breaks the streak');
  hit(16000);a.setMode('ewgf20');assert.equal(a.combo.n,0);a.setMode('free');
  hit(17000);a.get('dReset').click();assert.equal(a.combo.n,0);
  hit(18000);a.events.blur();assert.equal(a.combo.n,0);
  a.setLang('ko');hit(19000);hit(20000);hit(21000);assert.equal(a.pops.at(-1).text,'3초');hit(22000);assert.equal(a.pops.at(-1).text,'4초!');hit(23000);assert.equal(a.pops.at(-1).text,'5초!!');
});
test('f,N,f is a dash; the wave cancel 6 alone is not but cancel 6 → N → start 6 is a short dash without the Dash EWGF label; slow or broken pairs do nothing',()=>{
  let a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('f',1040);
  assert.equal(a.anim.kind,'dash');assert.ok(a.anim.moveTo>a.anim.moveFrom);assert.equal(a.cd.dashT,1040);assert.equal(a.cd.dashWave,false);assert.equal(a.cd.state,1,'second f is still the start 6');
  a=boot();dash(a);a.onDir('f',1100);
  assert.equal(a.anim.kind,'cd','the cancel 6 alone is not a dash');assert.ok(a.cd.dashT<0);
  a.onDir('n',1120);a.onDir('f',1140);
  assert.equal(a.anim.kind,'dash','cancel 6 → N → start 6 is a dash (2026-09-12)');assert.equal(a.cd.dashT,1140);assert.equal(a.cd.dashWave,true);assert.equal(a.cd.state,1);
  assert.equal(a.anim.moveTo-a.anim.moveFrom,24,'wave restart dash is the short one');
  a.onDir('n',1160);a.onDir('d',1180);a.onDir('df',1200);assert.equal(a.cd.chain,2,'judging unchanged');
  a.onButton(2,1200);assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.session.attempts[0].dash,false,'no Dash EWGF label after a wave restart');assert.equal(a.get('rTitle').textContent,'EWGF!');
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('f',1300);assert.notEqual(a.anim.kind,'dash','too slow');
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1030);a.onDir('n',1040);a.onDir('f',1050);assert.notEqual(a.anim.kind,'dash','d breaks the pair');
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('b',1040);a.onDir('n',1060);a.onDir('b',1080);
  assert.equal(a.anim.kind,'backdash');assert.ok(a.anim.moveTo<a.anim.moveFrom);assert.equal(a.cd.state,0);
  a=boot({v:4,side:-1});a.onDir('b',1000);a.onDir('n',1020);a.onDir('b',1040);assert.equal(a.anim.kind,'backdash');assert.ok(a.anim.moveTo>a.anim.moveFrom,'2P side mirrors');
});
test('dash EWGF (f,f,N,d,df+2) is judged as a normal EWGF and labeled Dash EWGF',()=>{
  const a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('f',1040);a.onDir('n',1060);a.onDir('d',1080);a.onDir('df',1100);a.onButton(2,1100);
  const at=a.session.attempts[0];assert.equal(at.kind,'ewgf');assert.equal(at.off,0);assert.equal(at.dash,true);
  assert.equal(a.get('rTitle').textContent,'Dash EWGF!');assert.equal(a.get('rKind').textContent,'DASH ELECTRIC WIND GOD FIST');assert.equal(a.pops.at(-1).text,'Dash EWGF!');
  assert.ok(a.get('logBody').innerHTML.includes('Dash EWGF'));
  a.onDir('f',2000);a.onDir('n',2020);a.onDir('f',2040);a.onDir('n',2060);a.onDir('d',2080);a.onDir('df',2100);a.onButton(2,2100);
  assert.equal(a.session.attempts[1].dash,true);assert.equal(a.pops.at(-1).text,'EWGF ×2','second in a row shows the streak');
  dash(a,3000);a.onButton(2,3060);assert.equal(a.session.attempts[2].dash,false);assert.equal(a.get('rTitle').textContent,'EWGF!');
});


/* ---- 통발 / 나락 / 더미 격파 (2026-09-13) ---- */
test('f,f+2 (통발) is judged from a plain dash or the wave restart dash and never becomes an EWGF attempt',()=>{
  const clean=a=>{assert.equal(a.session.attempts.length,0,'not an attempt');assert.equal(a.session.tries,0);assert.equal(a.combo.n,0);assert.equal(a.cd.state,0,'command consumed');};
  let a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('f',1040);a.onButton(2,1200);                     // (a) f,N,f + 2 while f is held
  assert.equal(a.get('rTitle').textContent,'f,f+2');assert.equal(a.anim.kind,'tongbal');assert.equal(a.pops.at(-1).text,'f,f+2');assert.ok(a.get('logBody').innerHTML.includes('f,f+2'));clean(a);
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('f',1040);a.onDir('n',1080);a.onButton(2,1040+a.FF_MS); // (b) released f, 2 at the edge of the window
  assert.equal(a.get('rTitle').textContent,'f,f+2');clean(a);
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('f',1040);a.onDir('n',1080);a.onButton(2,1041+a.FF_MS); // (b') one ms late → early stage
  assert.equal(a.session.attempts[0].kind,'early_stage');
  a=boot();dash(a);a.onDir('f',1100);a.onDir('n',1120);a.onDir('f',1140);a.onButton(2,1180);                // (c) 6N23 6 N 6 + 2
  assert.equal(a.get('rTitle').textContent,'f,f+2');clean(a);
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('f',1040);a.onDir('n',1060);a.onDir('d',1080);a.onDir('df',1100);a.onButton(2,1100); // (d) 대초 still an EWGF
  assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.session.attempts[0].dash,true);
  a=boot();a.onDir('f',1000);a.onButton(2,1100);assert.equal(a.session.attempts[0].kind,'early_stage','(e) single f + 2');
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('f',1040);a.onButton(2,1400);assert.equal(a.session.attempts[0].kind,'no_cd','(f) state 1 expired');
  a=boot();dash(a);a.onDir('f',1100);a.onButton(2,1150);assert.equal(a.session.attempts[0].kind,'wgf','the cancel 6 alone + 2 is still a late WGF');
});
test('hell sweep (6N23+4) is judged without a just frame, through the pending path, and stays out of the EWGF stats and streak',()=>{
  const clean=a=>{assert.equal(a.session.attempts.length,0);assert.equal(a.session.tries,0);assert.equal(a.cd.state,0);assert.equal(a.cd.pending,null);};
  let a=boot();dash(a);a.onButton(4,1200);
  assert.equal(a.get('rTitle').textContent,'Hell Sweep');assert.equal(a.anim.kind,'hellsweep');assert.equal(a.pops.at(-1).text,'SWEEP');assert.ok(a.get('logBody').innerHTML.includes('Hell sweep'));clean(a);
  a=boot();dash(a);a.onDir('n',1080);a.onButton(4,1150);assert.equal(a.get('rTitle').textContent,'Hell Sweep','after releasing d/f (state 7)');clean(a);
  a=boot();dash(a);a.onDir('f',1100);a.onButton(4,1300);assert.equal(a.get('rTitle').textContent,'Hell Sweep','within 250ms of the cancel 6');clean(a);
  a=boot();dash(a);a.onDir('f',1100);a.onButton(4,1320);assert.equal(a.get('rTitle').textContent,'Crouch dash','too long after the cancel 6: ignored, the dash card stays');
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.onButton(4,1050);assert.equal(a.cd.pending.btn,4);a.onDir('df',1060);
  assert.equal(a.get('rTitle').textContent,'Hell Sweep','4 within the window before d/f');clean(a);
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.onButton(4,1040);a.onDir('df',1040+a.store.window+1);
  assert.equal(a.get('rTitle').textContent,'4 before d/f');assert.equal(a.get('rKind').textContent,'MISS');clean(a);
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.onButton(4,1050);a.tick(1300);assert.equal(a.get('rKind').textContent,'READY','expired 4 is silent');assert.equal(a.cd.pending,null);
  a=boot();a.onDir('f',1000);a.onButton(4,1010);a.onDir('n',1020);a.onButton(4,1030);assert.equal(a.get('rKind').textContent,'READY','4 in state 1/2 is ignored');assert.equal(a.cd.state,2);
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.onButton(2,1045);a.onButton(4,1050);assert.equal(a.cd.pending.btn,2,'pending 2 keeps priority');a.onDir('df',1055);
  assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.session.attempts[0].off,-10);
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.onButton(4,1045);a.onButton(2,1050);assert.equal(a.cd.pending.btn,2,'pending 4 is replaced by 2');a.onDir('df',1055);
  assert.equal(a.session.attempts.length,1);assert.equal(a.session.attempts[0].kind,'ewgf');
  a=boot();dash(a,1000);a.onButton(2,1060);dash(a,2000);a.onButton(4,2100);dash(a,2500);a.onButton(2,2560);
  assert.equal(a.combo.n,2,'a hell sweep between two EWGFs does not break the streak');assert.equal(a.session.tries,2);
  a=boot();a.setMode('ewgf20');a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();dash(a,4100);a.onButton(4,4200);
  assert.equal(a.trial.count,0,'a hell sweep does not count toward an EWGF trial');assert.equal(a.get('rTitle').textContent,'Hell Sweep');
});
test('rush30: typed dummies, wave points by chain, 10 for the right move, 5 for a WGF up high, whiffs for the rest, record and board entry',async()=>{
  const w=await import(require('node:url').pathToFileURL(require('node:path').join(__dirname,'../worker/index.js')).href);
  const a=boot({v:4,lang:'en'});a.setMode('rush30');
  assert.equal(a.get('dStart').hidden,false);assert.ok(a.get('hudHint').textContent.includes('EWGF'));
  a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();
  assert.equal(a.trial.running,true);assert.ok(['high','mid','low'].includes(a.world.dummy.type),'a typed dummy at GO');assert.equal(a.get('hudScore').textContent,'0 PTS');
  const d=a.world.dummy, near=()=>{a.world.dummyX=a.world.charX+60;d.alive=true;d.hit=0;};
  a.world.dummyX=a.world.charX+400; // out of reach
  dash(a,4100);assert.equal(a.trial.score,1);for(const t of [4200,4400]){a.onDir('f',t);a.onDir('n',t+20);dash(a,t+40);}
  assert.equal(a.trial.score,1+2+3,'1, 2, 3 points by chain length');assert.equal(a.trial.dashPts,6);
  for(const t of [4600,4800,5000]){a.onDir('f',t);a.onDir('n',t+20);dash(a,t+40);}assert.equal(a.trial.score,15,'chain 4+ still 3 points');
  a.clearCommand();a.trialTick(6000);assert.equal(a.get('hudScore').textContent,'15 PTS');assert.ok(a.get('dProg').textContent.includes('15 pts'));
  // wrong move → whiff, dummy stands
  d.type='mid';near();dash(a,7000);a.onButton(2,7060);assert.equal(a.session.attempts[0].kind,'ewgf');
  assert.equal(a.trial.whiffs,1);assert.equal(a.trial.score,16,'the dash still scored 1, the whiff nothing');assert.equal(d.hit,0);assert.equal(a.pops.at(-1).text,'whiff');
  // right move → +10, knocked (consumed immediately; launch waits 110ms and respawn is scheduled at the hit)
  near();a.onDir('f',8000);a.onDir('n',8020);a.onDir('f',8040);a.onButton(2,8100);
  assert.equal(a.trial.score,26);assert.equal(a.trial.kills,1);assert.equal(a.pops.at(-1).text,'+10');assert.ok(d.respawn>0);
  for(const [id,fn] of [...a.timers]) if(fn.toString().includes('d.hit=1')){fn();a.timers.delete(id);}
  assert.equal(d.hit,1);
  a.onButton(4,8200);assert.equal(a.trial.whiffs,1,'a stray 4 with no command does nothing');
  near();d.hit=1;d.type='low';dash(a,9000);a.onButton(4,9100);assert.equal(a.trial.whiffs,2,'a flying dummy is not a target');d.hit=0;
  near();dash(a,10000);a.onButton(4,10100);assert.equal(a.trial.score,27+1+10);assert.equal(a.trial.kills,2,'hell sweep on the low dummy');
  near();d.type='high';dash(a,11000);a.onButton(2,11060+a.store.window+20);assert.equal(a.session.attempts.at(-1).kind,'wgf');
  assert.equal(a.trial.score,38+1+5,'a WGF on the high dummy scores 5');assert.equal(a.trial.kills,3);assert.equal(a.pops.at(-1).text,'+5');
  near();d.type='high';dash(a,12000);a.onButton(4,12100);assert.equal(a.trial.whiffs,3,'hell sweep on the high dummy whiffs');
  a.world.dummyX=a.world.charX+300;d.type='high';dash(a,13000);a.onButton(2,13060);assert.equal(a.trial.whiffs,4,'out of reach whiffs');
  assert.equal(a.session.tries,3);assert.equal(a.session.hits,2,'EWGF stats count only EWGF attempts (f,f+2 and the sweeps are not tries)');
  // 30 seconds → record, share model, board entry validates against the worker
  a.trialTick(4000+30000);assert.equal(a.trial.running,false);assert.equal(a.world.dummy.type,null,'plain dummy is back');
  const rec=a.store.records.rush30[0];assert.equal(rec.score,46);assert.equal(rec.kills,3);assert.equal(rec.whiffs,4);assert.equal(rec.dashPts,21,'15 from the chain + 1 per single dash');
  assert.equal(rec.label,'46 pts');assert.equal(rec.sub,'3 destroyed · 4 whiffs · wave 21 pts');assert.ok(a.get('bests').innerHTML.includes('46 pts'));
  const e=JSON.parse(JSON.stringify(a.boardEntry(a.trial.result,'rush30')));
  assert.deepEqual(e,{board:'rush30',win:12,lang:'en',score:46,tie:3,detail:{kills:3,whiffs:4,dashPts:21}});assert.equal(w.validate({...e,nick:'smoke'}).error,undefined);
  assert.equal(a.boardRowText('rush30',{score:46,detail:e.detail}).sub,'3 destroyed · 4 whiffs · wave 21 pts');
  const card=a.buildCard(a.shareSource());assert.equal(card.hero.value,'46');assert.equal(card.hero.label,'Points');assert.equal(card.metrics[0].value,'3');assert.ok(card.sub.includes('46 pts'));
  assert.doesNotMatch(JSON.stringify(card),/(^|[\s"])(card|rec|trial|mode)\.[a-zA-Z0-9]+/);
  a.setLang('ko');assert.ok(a.get('bests').innerHTML.includes('46점'));
  // cancel paths hand the stage back to the plain dummy
  for(const cancel of [a=>a.get('dReset').click(),a=>a.events.blur(),a=>a.get('setOpen').click(),a=>a.setMode('free')]){
    const b=boot();b.setMode('rush30');b.startTrial();const c=b.timers.get(b.trial.cdTimer);b.time(4000);c();c();c();assert.ok(b.world.dummy.type);
    cancel(b);assert.equal(b.trial.running,false);assert.equal(b.world.dummy.type,null);assert.equal(b.get('hudScore').textContent,'');assert.equal(b.store.records.rush30.length,0);
  }
});

test('rush30: a finisher keeps the wave chain so a kill does not cost the dash-point streak (a long pause still ends it)',()=>{
  const a=boot();a.setMode('rush30');a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();
  const d=a.world.dummy; d.type='high'; a.world.dummyX=a.world.charX+60; d.alive=true; d.hit=0;
  dash(a,4100);for(const t of [4200,4400]){a.onDir('f',t);a.onDir('n',t+20);dash(a,t+40);}   // three cancel-linked dashes → chain 3
  assert.equal(a.cd.chain,3);assert.equal(a.trial.dashPts,1+2+3);
  a.onButton(2,4500);assert.equal(a.trial.kills,1,'EWGF on the high dummy destroys it');assert.equal(a.cd.chain,3,'the wave chain survives the kill');
  const before=a.trial.dashPts;
  a.onDir('f',4560);a.onDir('n',4580);a.onDir('d',4600);a.onDir('df',4620);                  // keep waving within 700ms
  assert.equal(a.cd.chain,4);assert.equal(a.trial.dashPts-before,3,'the dash right after a kill still scores 3');
  a.onDir('f',5400);a.onDir('n',5420);a.onDir('d',5440);a.onDir('df',5460);                  // >700ms gap
  assert.equal(a.cd.chain,1,'a long pause still ends the chain');
});
test('rush30: a second tongbal 60ms later cannot score the same dummy',()=>{
  const a=boot();a.setMode('rush30');a.startTrial();const count=a.timers.get(a.trial.cdTimer);a.time(4000);count();count();count();
  a.world.dummy.type='mid';a.world.dummyX=a.world.charX+60;
  for(const t of [4100,4160]){
    a.time(t);a.onDir('f',t);a.onDir('n',t+10);a.onDir('f',t+20);a.onButton(2,t+20);a.onDir('n',t+30);
  }
  assert.equal(a.trial.kills,1);assert.equal(a.trial.score,10);assert.equal(a.trial.whiffs,1);
  a.updateDummy(4209);assert.equal(a.world.dummy.y,0,'launch delay is preserved');
  a.updateDummy(4210);assert.ok(a.world.dummy.y<0);
  a.endTrial();assert.equal(a.trial.result.rec.score,10);assert.equal(a.boardEntry(a.trial.result,'rush30').tie,1);
});

test('rush30: all moves respawn on the first frame at or after 700ms at every refresh rate',()=>{
  for(const hz of [30,60,144]) for(const move of ['ewgf','wgf','tongbal','hellsweep']){
    const a=boot();a.rushSpawn();a.world.dummy.type=a.HIT_TYPE[move];a.world.dummyX=a.world.charX+60;
    assert.equal(a.tryHit(move),true);
    const deadline=a.world.dummy.respawn;
    for(let n=1;;n++){
      const t=1000+n*1000/hz;a.time(t);a.updateDummy(t);
      if(t<deadline){assert.equal(a.world.dummy.respawn,deadline);assert.equal(a.tryHit(move),false);}
      else {assert.ok(t-deadline<1000/hz+0.001);assert.equal(a.world.dummy.respawn,0);assert.equal(a.world.dummy.hit,0);assert.equal(a.world.dummy.alive,true);assert.equal(a.world.dummy.y,0);break;}
    }
  }
  const a=boot();a.rushSpawn();a.world.dummy.type='high';a.world.dummyX=a.world.charX+60;a.tryHit('ewgf');
  a.updateDummy(1700);assert.equal(a.world.dummy.hit,0,'deadline wins even if no launch frame ran');
});

test('settings cancel countdown and running trial without saving or submitting',()=>{
  for(const running of [false,true]){
    const a=boot();a.setMode('wave10');a.startTrial();
    const id=a.trial.cdTimer;
    if(running){const count=a.timers.get(id);count();count();count();}
    a.get('setOpen').click();a.trialTick(30000);
    assert.equal(a.get('setDlg').open,true);assert.equal(a.trial.running,false);
    assert.equal(a.trial.cdTimer,null);assert.equal(a.timers.has(id),false);
    assert.equal(a.store.records.wave10.length,0);assert.equal(a.trial.result,null);
    assert.equal(a.trial.openTimer,null);assert.equal(a.get('dStart').disabled,false);
  }
});
test('donate cancels countdown and running trials in every language without results or submissions',()=>{
  for(const lang of ['ko','en','ja']) for(const mode of ['wave10','ewgf20','combo10','rush30']) for(const running of [false,true]){
    const requests=[];
    const a=boot({nick:'Tester',nickToken:'a'.repeat(48)},async url=>{requests.push(url);throw new Error('offline');});
    a.setLang(lang);a.setMode(mode);a.startTrial();
    const id=a.trial.cdTimer;
    if(running){const count=a.timers.get(id);count();count();count();}
    a.get('donateTop').click();a.time(30000);a.trialTick(30000);
    assert.equal(a.get('donateDlg').open,true);assert.equal(a.trial.running,false);
    assert.equal(a.trial.cdTimer,null);assert.equal(a.timers.has(id),false);
    assert.equal(a.store.records[mode].length,0);assert.equal(a.trial.result,null);
    assert.equal(a.trial.openTimer,null);assert.equal(a.get('dStart').disabled,false);
    assert.equal(requests.filter(url=>url.endsWith('/submit')).length,0);
  }
});
test('every donate entry discards held directions and pending RP without counting a failure',()=>{
  for(const id of ['donateTop','donateShareBtn','donateBtn']){
    const a=boot();a.events.keydown({code:'KeyD',timeStamp:1000,preventDefault(){}});
    a.onDir('n',1020);a.onDir('d',1040);a.onButton(2,1050);
    assert.ok(a.cd.pending);assert.equal(a.held.size,1);
    a.get(id).click();a.events.keyup({code:'KeyD',timeStamp:1100});a.tick(2000);
    assert.equal(a.held.size,0);assert.equal(a.cd.pending,null);assert.equal(a.cd.state,0);
    assert.equal(a.session.attempts.length,0);
  }
});
test('settings discard held directions and pending RP without counting a failure',()=>{
  const a=boot();a.events.keydown({code:'KeyD',timeStamp:1000,preventDefault(){}});
  a.onDir('n',1020);a.onDir('d',1040);a.onButton(2,1050);
  assert.ok(a.cd.pending);assert.equal(a.held.size,1);
  a.get('setOpen').click();a.events.keyup({code:'KeyD',timeStamp:1100});a.tick(2000);
  assert.equal(a.held.size,0);assert.equal(a.cd.pending,null);assert.equal(a.cd.state,0);
  assert.equal(a.session.attempts.length,0);
});
class AudioStub {
  constructor(){this.paused=true;this.volume=1;this.currentTime=0;}
  play(){this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
}
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
  for(const voices of Object.values(a.snd.pool)) for(const voice of voices) assert.equal(voice.volume,.25);
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

test('donate: header/footer stay visible while the result prompt waits for a daily personal best; chooser orders and opens both methods',()=>{
  const a=boot({v:4,lang:'ko'});
  for(const l of ['ko','en','ja']){
    a.setLang(l);const h=a.get('donateOptions').innerHTML, kakao=h.indexOf('data-opt="kakao"'), kofi=h.indexOf('data-opt="kofi"');
    assert.ok(kakao>=0&&kofi>=0,l+' both options');assert.equal(kakao<kofi,l==='ko',l+' order');
    assert.ok(h.includes('href="https://ko-fi.com/'),l+' ko-fi https link');assert.doesNotMatch(h,/donate.[a-zA-Z]+</,l+' no raw keys');
    for(const id of ['donate','donateTop']) assert.equal(a.get(id).hidden,false,l+' '+id+' visible');
    assert.equal(a.get('donateShare').hidden,true,l+' result prompt hidden without a personal best');
  }
  for(const id of ['donateTop','donateShareBtn','donateBtn']) assert.ok(html.includes('id="'+id+'" type="button"'),id+' is a button');
  assert.ok(html.indexOf('id="donateShareBtn"')>html.indexOf('id="shareDlg"')&&html.indexOf('id="donateShareBtn"')<html.indexOf('id="donateDlg"'),'result-dialog button lives inside #shareDlg (not on the canvas)');
  a.get('donateTop').click();assert.equal(a.get('donateChoose').hidden,false);assert.equal(a.get('donateKakao').hidden,true);
  let prevented=false;a.get('donateOptions').click({target:{closest:()=>({dataset:{opt:'kakao'}})},preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(a.get('donateKakao').hidden,false);assert.equal(a.get('donateChoose').hidden,true);
  assert.equal(a.get('donateOpen').href,'https://qr.kakaopay.com/Ej8EBCpJu');assert.equal(a.get('donateQr').src,'donate-kakao.png');
  a.get('donateBack').click();assert.equal(a.get('donateChoose').hidden,false);
  assert.ok(fs.existsSync(require('node:path').join(__dirname,'..','donate-kakao.png')),'QR image exists');
});

test('three touch direction buttons combine down+side into diagonals and feed the normal EWGF path',()=>{
  const a=boot();
  assert.equal(a.touchKeys([],990),'n');
  assert.equal(a.touchKeys(['right'],1000),'f');
  assert.equal(a.touchKeys([],1020),'n');
  assert.equal(a.touchKeys(['down'],1040),'d');
  assert.equal(a.touchKeys(['down','right'],1060),'df');
  a.touchPress(2,1064);
  assert.equal(a.session.attempts.length,1);
  assert.equal(a.session.attempts[0].kind,'ewgf');
  assert.equal(a.session.attempts[0].off,4);
  assert.equal(a.get('srcBadge').textContent,a.T('src.touch'));
  assert.equal(a.touchKeys(['left'],1100),'b');
  assert.equal(a.touchKeys(['down','left'],1140),'db');
  assert.equal(a.touchKeys(['left','right'],1160),'n','opposite horizontal buttons cancel each other');
  const p2=boot({v:4,side:-1});                            // 2P: screen right is back
  assert.equal(p2.touchKeys(['right'],1000),'b');
});

test('touch input pauses behind modals and is cleared by blur; the setting survives reload only with valid values',()=>{
  const a=boot();
  a.touchKeys(['right'],1000);a.touchKeys([],1020);a.touchKeys(['down'],1040);a.touchKeys(['down','right'],1060);
  a.get('setDlg').showModal(); a.touchPress(2,1064);
  assert.equal(a.session.attempts.length,0);              // button ignored while settings are open
  a.get('setDlg').open=false;
  a.touchKeys(['right'],2000); a.events.blur();            // blur resets every source, including the on-screen buttons
  assert.equal(a.cd.state,0);
  assert.equal(a.touchKeys(['right'],3000),'f'); assert.equal(a.cd.state,1);
  assert.equal(boot().store.touch,'auto');
  assert.equal(boot({v:4,touch:'on'}).store.touch,'on');
  assert.equal(boot({v:4,touch:'off'}).store.touch,'off');
  assert.equal(boot({v:4,touch:'yes'}).store.touch,'auto');
  const tuned=boot({v:4,touchSize:130,touchX:65,touchY:35});
  assert.equal(tuned.store.touchSize,130);assert.equal(tuned.store.touchX,65);assert.equal(tuned.store.touchY,35);
  tuned.get('touchSize').value='120';tuned.get('touchSize').input();tuned.get('touchX').value='40';tuned.get('touchX').input();tuned.get('touchY').value='60';tuned.get('touchY').input();
  assert.equal(tuned.store.touchSize,120);assert.equal(tuned.store.touchX,40);assert.equal(tuned.store.touchY,60);assert.equal(tuned.get('touchSizeOut').textContent,'120%');
  assert.match(tuned.get('tdirs').style.left,/px$/);assert.match(tuned.get('tdirs').style.bottom,/px$/);
  for(const bad of [{touchSize:131},{touchX:-5},{touchY:101},{touchSize:'100'}]){ const b=boot({v:4,...bad}); assert.equal(b.store.touchSize,100);assert.equal(b.store.touchX,0);assert.equal(b.store.touchY,0); }
  assert.doesNotThrow(()=>{const b=boot({v:4,touch:'on'}); b.applyTouchUI();});
  assert.match(html,/<meta name="viewport" content="width=device-width/);
  assert.match(html,/^<!doctype html>\s*(<!--[\s\S]*?-->\s*)?<html lang="ko">/i);
});

test('touch UI: idle badge follows the active input type and blur clears held direction buttons',()=>{
  const on=boot({v:4,touch:'on',lang:'ko'});
  assert.equal(on.get('srcBadge').textContent,'👆 터치 대기');
  on.setLang('en');assert.equal(on.get('srcBadge').textContent,'👆 Touch ready');
  assert.equal(boot({v:4,lang:'en'}).get('srcBadge').textContent,'⌨ Keyboard ready');
  const p2=boot({v:4,side:-1});
  p2.touchKeys(['right'],1000);assert.equal(p2.cd.state,0,'screen right is back for 2P');
  p2.events.blur();assert.equal(p2.touchKeys([],1020),'n');assert.equal(p2.cd.state,0);
  assert.match(html,/id="tdirs"[\s\S]*data-dir="left"[\s\S]*data-dir="down"[\s\S]*data-dir="right"/);
});

test('wave chart top band and coach tempo follow the wave10 top-10% cut (cut10), falling back to 5 dashes/s',()=>{
  const a=boot({v:4,lang:'ko',window:12}), chart=a.get('waveChart'), coach=a.get('coachMsg');
  const chain=t=>{dash(a,t);for(const d of [t+100,t+300]){a.onDir('f',d);a.onDir('n',d+20);dash(a,d+40);}}; // start 6 every 200ms = 5.0 dashes/s
  assert.equal(a.waveTop(),null);a.renderWave();assert.match(chart.innerHTML,/상급 \(5 이상\)/,'no board yet: fixed label');
  assert.doesNotMatch(chart.innerHTML,/>10</,'default axis tops out at 8');
  chain(1000);assert.ok(coach.innerHTML.startsWith('<strong>상위권 속도</strong>'),coach.innerHTML);
  a.board.data.wave10={...topRes('x'),cut10:8.5};assert.equal(a.waveTop(),8.5);a.renderWave();
  assert.match(chart.innerHTML,/상위 10% \(8\.5 이상\)/);assert.match(chart.innerHTML,/>10</,'axis grows so the band stays on the chart');
  a.clearCommand();chain(3000);assert.ok(coach.innerHTML.startsWith('빠른 편입니다.'),'5.0 dashes/s is below an 8.5 cut: '+coach.innerHTML);
  a.board.data.wave10={...topRes('x'),cut10:4.5};a.clearCommand();chain(5000);assert.ok(coach.innerHTML.startsWith('<strong>상위권 속도</strong>'),'5.0 dashes/s clears a 4.5 cut: '+coach.innerHTML);a.board.data.wave10={...topRes('x'),cut10:6.2};
  assert.equal(a.buildCard(a.shareSource()).chart.top,6.2,'the share card shades the same band');
  a.setLang('en');a.renderWave();assert.match(chart.innerHTML,/Top 10% \(6\.2\+\)/);
  for(const bad of [{cut10:null},{cut10:0},{cut10:'7'},{}]){a.board.data.wave10={...topRes('x'),...bad,cut10:bad.cut10};assert.equal(a.waveTop(),null,JSON.stringify(bad));}
});


test('backend does no recurring D1 reads; shoutbox refresh is explicit and the last wave cut stays cached',async()=>{
  const b=backend(),a=boot({v:4,lang:'ko'},b.fetch);
  b.answer('/top?board=wave10','GET',{...topRes('x'),cut10:8.5});
  b.answer('/posts','GET',{rows:[]}); b.answer('/visits','POST',{day:'x',today:1,total:1}); await b.flush();
  const before=b.calls.length, periodic=[...a.timers.values()].find(fn=>String(fn).includes('bumpVisitDay()'));
  assert.ok(periodic,'the local KST-day rollover timer remains');
  for(let i=0;i<20;i++) periodic();
  assert.equal(b.calls.length,before,'the timer does not poll rankings, posts or visits during the same KST day');
  assert.equal(a.waveTop(),8.5,'the last successful cut remains cached until a user action or submission updates it');
  assert.equal(a.get('postsRefresh').disabled,false); assert.equal(a.get('postsRefresh').textContent,'새로고침');
  a.get('postsRefresh').click(); await b.flush();
  assert.equal(b.calls.filter(c=>c.url.endsWith('/posts')).length,2,'the refresh button performs exactly one new posts request');
  assert.equal(a.get('postsRefresh').disabled,true); assert.equal(a.get('postsRefresh').textContent,'불러오는 중…');
  a.get('postsRefresh').click(); await b.flush();
  assert.equal(b.calls.filter(c=>c.url.endsWith('/posts')).length,2,'repeat clicks are ignored while loading');
  b.answer('/posts','GET',{rows:[]}); await b.flush();
  assert.equal(a.get('postsRefresh').disabled,false); assert.equal(a.get('postsRefresh').textContent,'새로고침');
  a.setLang('en'); assert.equal(a.get('postsRefresh').textContent,'Refresh');
});
test('shoutbox explains only a real D1 quota failure in plain language',async()=>{
  const b=backend(),a=boot({v:4,lang:'ko'},b.fetch);
  b.answer('/top?board=wave10','GET',{...topRes('x'),cut10:8.5});
  b.answer('/posts','GET',{error:'server',message:"Exceeded D1's free tier daily row read limit"},500); b.answer('/visits','POST',{day:'x',today:1,total:1}); await b.flush();
  assert.equal(a.get('postMsg').textContent,'오늘 무료 서버 사용량을 다 써서 한마디를 이용할 수 없습니다. 더 좋은 서버를 쓰려면 후원이 절실합니다 ㅜㅜ');
  a.get('postsRefresh').click(); await b.flush(); b.answer('/posts','GET',{rows:[]}); await b.flush();
  assert.equal(a.get('postMsg').textContent,'','a later successful refresh clears the quota notice');
});
/* ---------- 옷장·업적 (wardrobe + achievements, 4-9) ---------- */
const J=x=>JSON.parse(JSON.stringify(x));
const kstToday=()=>new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
test('wardrobe: lifetime counters grow with dashes, EWGFs and strikes, survive a session reset, and unlock items exactly once',()=>{
  const a=boot();
  assert.deepEqual(J(a.store.fit),{head:'base',top:'base',arms:'base',legs:'base',shoes:'base',skin:'base'});
  assert.equal(a.store.life.days,1,'boot counts the first visit day');assert.equal(a.store.life.dashes,0);
  dash(a,1000);a.onButton(2,1060);
  assert.equal(a.store.life.dashes,1);assert.equal(a.store.life.ewgf,1);assert.equal(a.store.life.tries,1);assert.equal(a.store.life.maxStreak,1);
  assert.ok(a.pendingReward('red_top'),'first EWGF reserves the crimson top');assert.equal(a.store.ach.red_head,undefined,'10 dashes not yet');
  assert.equal(a.store.pendingRewards.length,1);assert.equal(a.get('jackpot').hidden,true);assert.equal(a.owned('red_top'),false);assert.equal(a.setFit('top','red_top'),false);a.claimRewards();assert.equal(a.get('jpItem').textContent,'Crimson Dobok Top');
  a.get('dReset').click();assert.equal(a.store.life.ewgf,1,'session reset keeps lifetime counters');assert.equal(a.session.hits,0);
  for(let i=0;i<9;i++){const t=3000+i*1000;a.onDir('f',t);a.onDir('n',t+20);dash(a,t+40);}
  assert.equal(a.store.life.dashes,10);assert.ok(a.pendingReward('red_head'),'10 dashes → pending headband');assert.equal(a.store.life.maxChain,1);
  assert.deepEqual(J(a.store.pendingRewards.map(j=>j.id)),['red_head'],'queued behind the reveal still playing');
  const before=a.store.ach.red_top;dash(a,20000);a.onButton(2,20060);assert.equal(a.store.ach.red_top,before,'an unlock is never rewritten');
  // strikes count too, and the 0.5f window feeds its own counter
  a.onDir('f',30000);a.onDir('n',30020);a.onDir('f',30040);a.onButton(2,30100);assert.equal(a.store.life.tongbal,1);
  dash(a,31000);a.onButton(4,31070);assert.equal(a.store.life.hellsweep,1);assert.ok(a.pendingReward('red_arms'),'one of each strike → pending wrist wraps');
  a.store.window=8;dash(a,32000);a.onButton(2,32060);assert.equal(a.store.life.tightEwgf,1);assert.equal(a.store.life.ewgf,3);
  assert.equal(a.session.tries,2,'session stats untouched by the wardrobe (reset above, then two EWGF attempts)');
});
test('wardrobe: donate and trials reserve rewards; closing dialogs and trials never claims automatically',()=>{
  const a=boot({v:4,lang:'ko'});
  a.get('donateTop').click();
  assert.equal(a.store.life.donate,1);assert.ok(a.pendingReward('bowl_head'));a.claimRewards();assert.equal(a.owned('bowl_head'),false);assert.deepEqual(J(a.store.pendingRewards.map(j=>j.id)),['bowl_head'],'held: the donate dialog is open');
  a.get('donateDlg').open=false;a.get('donateDlg').close();for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();}
  assert.equal(a.store.pendingRewards.length,1);assert.equal(a.get('jackpot').hidden,true);a.claimRewards();assert.equal(a.store.pendingRewards.length,0);assert.equal(a.get('jpTitle').textContent,'업적 달성!');assert.equal(a.get('jpAch').textContent,'후원 생각이 있었군요..!?');assert.equal(a.get('jpItem').textContent,'밥그릇 투구');
  for(let n=0;n<4;n++) for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();} // egg → white → reveal
  assert.equal(a.get('jackpot').dataset.phase,'reveal','the card waits for 확인');a.get('jpOk').click();assert.equal(a.get('jackpot').dataset.phase,'out');for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();}assert.equal(a.get('jackpot').hidden,true);
  // a finished rush30 unlocks the foot guards but the reveal waits 2.3s behind the result
  const b=boot({v:4,lang:'en'});b.setMode('rush30');b.startTrial();const cd=b.timers.get(b.trial.cdTimer);b.time(4000);cd();cd();cd();
  b.time(34100);b.trialTick(34100);assert.equal(b.trial.running,false);assert.equal(b.store.life.trials.rush30,1);assert.ok(b.pendingReward('red_shoes'));
  assert.deepEqual(J(b.store.pendingRewards.map(j=>j.id)),['red_shoes'],'held during the result flash');
  const openTimer=b.trial.openTimer; // the result card draws on a canvas this harness does not have
  for(const [id,fn] of [...b.timers]) if(id!==openTimer){b.timers.delete(id);fn();} // let the fixed hold expire while card preparation remains pending
  b.renderRewards();assert.equal(b.get('rewardOpen').disabled,true);b.claimRewards();assert.equal(b.store.pendingRewards.length,1,'the pending result dialog still blocks claiming after the fixed hold');
  b.timers.delete(openTimer);b.trial.openTimer=null;b.renderRewards();
  assert.equal(b.get('rewardOpen').disabled,false);assert.equal(b.get('jackpot').hidden,true);b.claimRewards();assert.equal(b.store.pendingRewards.length,0);assert.equal(b.get('jpItem').textContent,'Foot Guards');
  // a cancelled trial (mode switch) releases a held reveal on the next tick without a result
  const c=boot();c.store.life.dashes=9;c.setMode('wave10');c.startTrial();const cd2=c.timers.get(c.trial.cdTimer);c.time(4000);cd2();cd2();cd2();
  dash(c,4100);assert.ok(c.pendingReward('red_head'));c.claimRewards();assert.equal(c.owned('red_head'),false);assert.equal(c.store.pendingRewards.length,1,'held during the trial');
  c.setMode('free');for(const [id,fn] of [...c.timers]){c.timers.delete(id);fn();}assert.equal(c.store.pendingRewards.length,1);assert.equal(c.get('jackpot').hidden,true);c.claimRewards();assert.equal(c.store.pendingRewards.length,0);
});
test('wardrobe: saved progress is validated on load, an unowned outfit falls back to base, and setFit refuses locked items',()=>{
  const a=boot({v:4,visitDay:'2000-01-01',life:{dashes:'x',ewgf:-1,tongbal:7,days:2,giftDay:'2026-09-01',trials:{rush30:1,bogus:3}},ach:{red_top:1,bogus:2,red_head:'x',daily_arms_blue:5},fit:{top:'red_top',head:'red_head',arms:'daily_arms_blue',legs:'nope',skin:42}});
  assert.equal(a.store.life.dashes,0);assert.equal(a.store.life.ewgf,0);assert.equal(a.store.life.tongbal,7);assert.equal(a.store.life.giftDay,'2026-09-01');
  assert.deepEqual(J(a.store.life.trials),{wave10:0,ewgf20:0,combo10:0,rush30:1,bd10:0},'an old save gains the bd10 counter at 0');
  assert.deepEqual(J(Object.keys(a.store.ach).sort()),['daily_arms_blue','red_top'],'only existing owned items restored');
  assert.equal(a.store.life.days,3,'a new KST day counts');assert.deepEqual(J(a.store.pendingRewards.map(j=>j.id).sort()),['red_shoes','red_skin']);
  assert.deepEqual(J(a.store.fit),{head:'base',top:'red_top',arms:'daily_arms_blue',legs:'base',shoes:'base',skin:'base'});
  assert.equal(a.setFit('legs','devil_legs'),false);assert.equal(a.store.fit.legs,'base');
  assert.equal(a.setFit('top','base'),true);assert.equal(a.store.fit.top,'base');assert.equal(a.setFit('top','red_top'),true);
  assert.equal(a.setFit('hat','base'),false);assert.equal(a.setFit('top','nope'),false);
  assert.equal(a.currentLook().top,a.ITEMS.top.red_top);assert.equal(a.lookOf({top:'zzz'}).top,a.ITEMS.top.base);
  a.get('fitReset').click();assert.equal(a.store.fit.top,'base');
});
test('wardrobe: items, achievements and strings agree (25 achievements = 25 items, 12 daily gifts, ko/en/ja names, no official character names)',()=>{
  const {ACH,ITEMS,SLOTS,ITEM_SLOT,DAILY_IDS,I18N}=boot();
  assert.deepEqual(J(SLOTS),['head','top','arms','legs','shoes','skin']);
  const ids=Object.keys(ACH);assert.equal(ids.length,25);assert.equal(DAILY_IDS.length,12);
  for(const id of ids) assert.ok(ITEM_SLOT[id],id+' unlocks a real item');
  for(const s of SLOTS){ assert.ok(ITEMS[s].base,s+' has a base'); for(const id of Object.keys(ITEMS[s])){ if(id==='base') continue;
    const it=ITEMS[s][id]; if(it.set==='daily') assert.equal(ACH[id],undefined,id+' is a gift, not an achievement'); else assert.ok(ACH[id],id+' needs an achievement');
    if(it.set && it.set!=='daily') assert.equal(id,it.set+'_'+s,'set items are named set_slot'); }
    assert.equal(DAILY_IDS.filter(id=>ITEM_SLOT[id]===s).length,2,s+': two daily gifts'); assert.equal(ids.filter(id=>ITEM_SLOT[id]===s&&ITEMS[s][id].set).length,4,s+': four set items'); }
  for(const a of Object.values(ACH)){ assert.ok(a.target>0); assert.equal(typeof a.stat({dashes:0,ewgf:0,tries:0,tongbal:0,hellsweep:0,maxChain:0,maxStreak:0,tightEwgf:0,days:0,donate:0,giftDay:'',trials:{wave10:0,ewgf20:0,combo10:0,rush30:0}}),'number'); }
  const banned=new RegExp(BANNED.source+'|三島');
  for(const l of ['ko','en','ja']){ const D=I18N[l];
    for(const s of SLOTS){ assert.equal(typeof D['slot.'+s],'string',l+' slot.'+s); assert.equal(typeof D['item.base.'+s],'string',l+' item.base.'+s); }
    for(const id of Object.keys(ITEM_SLOT)) assert.equal(typeof D['item.'+id],'string',l+' item.'+id);
    for(const id of ids){ assert.equal(typeof D['ach.'+id],'string',l+' ach.'+id); assert.equal(typeof D['ach.'+id+'.d'],'string',l+' ach.'+id+'.d'); }
    for(const k of Object.keys(D)) if(/^(item|ach|set)\./.test(k) && typeof D[k]==='string') assert.doesNotMatch(D[k],banned,l+' '+k+' must not name an official character'); }
});
test('wardrobe: the daily gift is one random unowned item per KST day on the first gesture, never twice, nothing once the pool is empty',()=>{
  let a=boot(undefined,undefined,{Math:Object.assign(Object.create(Math),{random:()=>0})});
  assert.equal(a.store.life.giftDay,'');a.unlockAudio();
  assert.equal(a.store.life.giftDay,kstToday());assert.ok(a.pendingReward('daily_head_blue'));assert.equal(a.owned('daily_head_blue'),false);a.claimRewards();assert.ok(a.store.ach.daily_head_blue,'random()=0 → the first daily item');assert.equal(a.get('jpItem').textContent,'Blue Dye');assert.match(a.get('jpTitle').textContent,/^Day 1 /);
  a.unlockAudio();assert.equal(Object.keys(a.store.ach).filter(id=>id.startsWith('daily_')).length,1,'same day: nothing more');
  a=boot({v:4,visitDay:kstToday(),life:{days:4,giftDay:kstToday()},ach:{daily_head_blue:1}},undefined,{Math:Object.assign(Object.create(Math),{random:()=>0})});
  assert.equal(a.store.life.days,4,'same day again: not counted');assert.equal(a.dailyGift(),null,'already given today');
  a=boot({v:4,visitDay:'2000-01-01',life:{giftDay:'2000-01-01'},ach:{daily_head_blue:1}},undefined,{Math:Object.assign(Object.create(Math),{random:()=>0.99})});
  assert.equal(a.dailyGift(),'daily_skin_dark','random()→1 picks the last unowned item');assert.equal(a.dailyGift(),null);
  const all=Object.fromEntries(a.DAILY_IDS.map(id=>[id,1]));a=boot({v:4,visitDay:'2000-01-01',life:{giftDay:'2000-01-01'},ach:all});
  assert.equal(a.dailyGift(),null,'pool empty');assert.equal(a.store.life.giftDay,kstToday(),'still marked so the check runs once a day');
  a.openFit();assert.equal(a.get('fitDaily').textContent,'All daily gifts collected');
});
test('wardrobe dialog: opens from the stage button, cancels a trial, lists chips and achievements with progress, and re-renders on language switch',()=>{
  const a=boot({v:4,lang:'ko'});a.setMode('wave10');a.startTrial();
  a.get('fitOpen').click();assert.equal(a.get('fitDlg').open,true);assert.equal(a.trial.cdTimer,null,'countdown cancelled');
  assert.match(a.get('fitSlots').innerHTML,/data-id="red_top"[^>]*aria-disabled="true"/);assert.match(a.get('fitSlots').innerHTML,/🔒 붉은 도복 상의/);assert.match(a.get('fitSlots').innerHTML,/data-id="base" aria-pressed="true"/);
  assert.match(a.get('fitAch').innerHTML,/달성 0 \/ 25/);assert.match(a.get('fitAch').innerHTML,/첫 초풍<\/b><span class="d">초풍 1회 성공<\/span><span class="p">0 \/ 1<\/span><span class="i">보상: 붉은 도복 상의/);
  assert.match(a.get('fitAch').innerHTML,/특별/);assert.match(a.get('fitAch').innerHTML,/수령 대기/);
  a.get('fitDlg').open=false;a.get('fitDlg').close();dash(a,5000);a.onButton(2,5060);
  a.claimRewards();a.get('fitOpen').click();assert.match(a.get('fitSlots').innerHTML,/class="fit-chip" data-slot="top" data-id="red_top" aria-pressed="false">붉은 도복 상의/);
  assert.match(a.get('fitAch').innerHTML,/달성 1 \/ 25/);assert.match(a.get('fitAch').innerHTML,/class="ach-row done"><b>✓ 첫 초풍/);
  a.setLang('en');assert.match(a.get('fitSlots').innerHTML,/Bare chest/);assert.match(a.get('fitAch').innerHTML,/1 \/ 25 achieved/);assert.match(a.get('fitAch').innerHTML,/First EWGF/);
  assert.equal(a.get('fitDaily').textContent,'Daily gifts 1 / 12 · one on the first visit each day','the wardrobe button was the first gesture of the day: one gift');
  a.get('fitSlots').click({target:{closest:()=>({dataset:{slot:'top',id:'red_top'}})}});assert.equal(a.store.fit.top,'red_top');
  assert.match(a.get('fitSlots').innerHTML,/data-id="red_top" aria-pressed="true"/);
  a.get('fitDlg').open=false;a.get('fitDlg').close();assert.equal(a.setFit('top','red_top'),true);
  assert.deepEqual(Object.keys(a.currentLook()),['head','top','arms','legs','shoes','skin']);
});
test('settings: data reset wipes records, lifetime stats, achievements and the outfit but keeps nickname, settings and the visit day',()=>{
  const tok='ab'.repeat(24), a=boot({v:4,lang:'ko',window:8,sound:0,nick:'me',nickToken:tok,visitDay:kstToday(),records:{wave10:[{date:1,score:2,dashes:20,chain:5,label:'x',sub:'y'}]},life:{dashes:50,ewgf:7,days:9},ach:{red_top:1,daily_head_blue:2},fit:{top:'red_top'}},undefined,{confirm:()=>false});
  a.get('dataReset').click();assert.equal(a.store.life.dashes,50,'cancelled confirm changes nothing');
  const b=boot({v:4,lang:'ko',window:8,sound:0,nick:'me',nickToken:tok,visitDay:kstToday(),records:{wave10:[{date:1,score:2,dashes:20,chain:5,label:'x',sub:'y'}]},life:{dashes:50,ewgf:7,days:9},ach:{red_top:1,daily_head_blue:2},fit:{top:'red_top'}},undefined,{confirm:()=>true});
  dash(b,1000);b.get('dataReset').click();
  assert.equal(b.store.records.wave10.length,0);assert.equal(b.store.life.dashes,0);assert.equal(b.store.life.days,1);assert.deepEqual(J(b.store.ach),{});assert.equal(b.store.fit.top,'base');assert.equal(b.session.dashes,0,'session reset too');
  assert.equal(b.store.nick,'me');assert.equal(b.store.nickToken,tok);assert.equal(b.store.window,8);assert.equal(b.store.sound,0);assert.equal(b.store.visitDay,kstToday());
  assert.equal(b.get('coachMsg').innerHTML,'기록과 업적을 초기화했습니다.');
  const c=boot(undefined,undefined,{confirm:undefined});dash(c,1000);c.get('dataReset').click();assert.equal(c.store.life.dashes,0,'no confirm available (harness): resets');
});

/* ---------- backdash practice (414 N 414 N …, 2026-09-13, 설계 결정 17) ---------- */
test('backdash machine is inert during the wave and other trials, and free practice stays silent until the first 1 cancel',()=>{
  let a=boot();dash(a);a.onDir('f',1100);a.onDir('n',1120);dash(a,1140);assert.equal(a.bd.state,0,'the wave never enters the backdash machine');
  for(const m of ['wave10','ewgf20','combo10','rush30']){
    a=boot({v:4});a.setMode(m);a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();
    const title=a.get('rTitle').textContent;const o=bdOut(a,4100);a.onDir('db',o+fr(10));bdOut(a,o+fr(14));
    assert.equal(a.bd.state,0,m+': not judged in another trial');assert.equal(a.anim.kind,'backdash',m+': the b,N,b visual is unchanged (the db cancelled the recovery)');
    assert.equal(a.trial.count||0,0,m);assert.equal(a.session.bd.count,0,m);assert.equal(a.get('rTitle').textContent,title,m+': no card');
  }
  a=boot();const title=a.get('rTitle').textContent,logs=a.session.log.length;
  let o=bdOut(a,1000);assert.equal(a.bd.state,3);assert.equal(a.bd.chain,1);assert.equal(a.anim.kind,'backdash');
  assert.equal(a.get('rTitle').textContent,title,'b,N,b alone is repositioning: no card');assert.equal(a.session.log.length,logs);assert.equal(a.get('hudChainL').textContent,'WAVE');
  a.onDir('n',o+fr(12));assert.equal(a.get('rTitle').textContent,title,'…and releasing it says nothing either');assert.equal(a.session.bd.dist,1,'the distance is still counted');
  o=bdOut(a,3000);a.onDir('db',o+fr(10));assert.equal(a.bd.engaged,true);assert.equal(a.get('rKind').textContent,'BACKDASH','the first 1 cancel switches the feedback on');
  assert.equal(a.get('hudChainL').textContent,'BACKDASH');assert.equal(a.get('hudChainN').textContent,1);
  a.onDir('n',o+fr(14));a.tick(o+fr(14)+3100);assert.equal(a.bd.engaged,false,'silent again after 3s without a backdash');
  assert.equal(a.get('hudChainL').textContent,'WAVE');
});

test('backdash sets: distance by cancel frame, set speed grades from BD.TIERS, chain, cancel feedback and the biggest-loss coach line',()=>{
  const a=boot({v:4,lang:'ko'});const {BD}=a;const mps=(dist,period)=>Math.round(dist*6000/period)/100;
  let o=bdOut(a,1000);a.onDir('db',o+fr(BD.MOVE_F));
  assert.equal(a.session.bd.dist,1,'cancel at MOVE_F earns the full metre');assert.equal(a.bd.state,4);
  assert.equal(a.get('rOff').textContent,a.T('bd.cancel',BD.MOVE_F,0,'1.0'));assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.cancelOk'));
  let c=o+fr(BD.MOVE_F);a.onDir('b',c+fr(2));a.onDir('n',c+fr(4));o=c+fr(6);a.onDir('b',o); // 1 held 2f, 4N4 4f → period 16f
  const v1=mps(1,BD.MOVE_F+6);assert.ok(v1>=BD.TIERS[0].mps,'this set is very fast');
  assert.equal(a.bd.chain,2);assert.equal(a.get('rTitle').textContent,a.T('bd.title',2,a.T('bd.grade.top')));assert.equal(a.get('rOff').textContent,a.T('bd.sub',v1.toFixed(1),BD.MOVE_F,2,4));
  assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.good'));assert.equal(JSON.stringify(a.session.log[0].res),'["res.bd_top"]');assert.equal(a.session.log[0].type,'log.tBack');assert.equal(a.session.bd.top,1);
  // early cancel: less distance, the coach says how many frames early, and the set drops a grade
  a.onDir('db',o+fr(BD.MIN_F));assert.equal(a.session.bd.dist,1+BD.MIN_F/BD.MOVE_F);assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.early',BD.MOVE_F-BD.MIN_F));
  c=o+fr(BD.MIN_F);a.onDir('b',c+fr(2));a.onDir('n',c+fr(4));o=c+fr(6);a.onDir('b',o);
  const v2=mps(BD.MIN_F/BD.MOVE_F,BD.MIN_F+6);const g2=(BD.TIERS.find(x=>v2>=x.mps)||{k:'slow'}).k;
  assert.equal(a.get('rTitle').textContent,a.T('bd.title',g2==='slow'?1:3,a.T('bd.grade.'+g2)));assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.early',BD.MOVE_F-BD.MIN_F),'the early cancel is the biggest loss');
  // late cancel
  a.onDir('db',o+fr(BD.MOVE_F+5));assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.late',5));
  c=o+fr(BD.MOVE_F+5);a.onDir('b',c+fr(2));a.onDir('n',c+fr(4));o=c+fr(6);a.onDir('b',o);assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.late',4));
  // 1 held too long, then 4N4 too long
  a.onDir('db',o+fr(BD.MOVE_F));c=o+fr(BD.MOVE_F);a.onDir('b',c+fr(10));a.onDir('n',c+fr(12));o=c+fr(14);a.onDir('b',o);assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.db',8));
  a.onDir('db',o+fr(BD.MOVE_F));c=o+fr(BD.MOVE_F);a.onDir('b',c+fr(2));a.onDir('n',c+fr(10));o=c+fr(12);a.onDir('b',o);assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.tap',6));
  // slow set resets the chain to 1 but the backdash still counts
  const before=a.session.bd.count;a.onDir('db',o+fr(BD.MOVE_F));c=o+fr(BD.MOVE_F);a.onDir('b',c+fr(30));a.onDir('n',c+fr(32));o=c+fr(34);a.onDir('b',o);
  assert.equal(a.bd.chain,1);assert.equal(a.get('rTitle').textContent,a.T('bd.title',1,a.T('bd.grade.slow')));assert.equal(a.session.log[0].res[0],'res.bd_slow');assert.equal(a.session.bd.count,before+1);
  // a chain of 3+ leaves a summary log line when it breaks; the dictionaries name no official character
  const b=boot({v:4,lang:'en'});let p=bdOut(b,1000);for(let i=0;i<3;i++) p=bdSet(b,p,BD.MOVE_F);assert.equal(b.bd.chain,4);b.onDir('n',p+fr(12));
  assert.equal(JSON.stringify(b.session.log[1].res),'["bd.chain.end",4]');assert.equal(b.session.log[0].res[0],'bd.f.noCancel.title');
  const banned=new RegExp(BANNED.source+'|三島');
  for(const l of ['ko','en','ja']){b.setLang(l);for(const k of Object.keys(b.I18N[l])) if(/^(bd\.|mode\.bd10|hint\.bd10|tier\.\d\.bd10)/.test(k)) assert.doesNotMatch(String(b.T(k,3,2,1,0)),banned,l+' '+k);}
});

test('backdash faults: 1 before MIN_F cancels the dash, no cancel locks RECOVER_F of stiffness, sidestep and neutral-after-1 break the set, LINK_MAX_F ends it, 2P mirrors',()=>{
  const {BD}=boot();let a=boot({v:4,lang:'ko'});
  let o=bdOut(a,1000);a.onDir('db',o+fr(BD.MIN_F-1));assert.equal(a.bd.state,0);assert.equal(a.session.bd.count,0,'no backdash, no distance');
  // no cancel → stiff for RECOVER_F frames from the backdash, counted from the output
  o=bdOut(a,2000);a.onDir('n',o+fr(12));assert.equal(a.session.bd.dist,1);assert.equal(a.bd.chain,0);
  const t2=bdOut(a,o+fr(BD.RECOVER_F-6));assert.ok(t2<o+fr(BD.RECOVER_F));assert.equal(a.bd.state,0,'still recovering: nothing comes out');assert.equal(a.session.bd.count,1);
  bdOut(a,o+fr(BD.RECOVER_F+2));assert.equal(a.bd.state,3,'after the recovery the next one is fine');
  // engaged first, then the loud faults
  a=boot({v:4,lang:'ko'});o=bdOut(a,1000);o=bdSet(a,o,BD.MOVE_F);assert.equal(a.bd.chain,2);
  a.onDir('d',o+fr(BD.MOVE_F));assert.equal(a.get('rTitle').textContent,a.T('bd.f.side.title'));assert.equal(a.bd.chain,0);assert.equal(a.session.bd.dist,2,'a sidestep cancel still moved');
  o=bdOut(a,o+fr(30));a.onDir('db',o+fr(BD.MOVE_F));a.onDir('n',o+fr(BD.MOVE_F+2));assert.equal(a.get('rTitle').textContent,a.T('bd.f.neutral1.title'));assert.equal(a.bd.state,0);
  o=bdOut(a,o+fr(60));a.onDir('db',o+fr(BD.MOVE_F));a.onDir('b',o+fr(BD.MOVE_F+2));a.onDir('d',o+fr(BD.MOVE_F+4));assert.equal(a.get('rTitle').textContent,a.T('bd.f.dir.title'));
  o=bdOut(a,o+fr(90));a.onDir('db',o+fr(BD.MOVE_F));a.tick(o+fr(BD.MOVE_F+BD.LINK_MAX_F+1));assert.equal(a.bd.state,0,'sitting longer than LINK_MAX_F is just a crouch');assert.equal(a.bd.chain,0);
  o=bdOut(a,o+fr(200));a.onDir('db',o+fr(BD.MOVE_F));a.onDir('b',o+fr(BD.MOVE_F+2));a.onDir('n',o+fr(BD.MOVE_F+4));a.onDir('b',o+fr(BD.MOVE_F+4)+260);assert.equal(a.get('rTitle').textContent,a.T('bd.f.nLong.title'));assert.equal(a.bd.state,1,'the late b starts a new pair');
  a=boot({v:4,side:-1});o=bdOut(a,1000);o=bdSet(a,o,BD.MOVE_F);assert.equal(a.bd.chain,2,'2P side: same directions, same judging');assert.ok(a.anim.moveTo>a.anim.moveFrom,'visual mirrors');
});

test('bd10: countdown, distance on the HUD, record, share card, board entry against the worker, and leaving clears',async()=>{
  const w=await import(require('node:url').pathToFileURL(require('node:path').join(__dirname,'../worker/index.js')).href);
  const a=boot({v:4,lang:'en'});const {BD}=a;a.setMode('bd10');
  assert.equal(a.get('dStart').hidden,false);assert.match(a.get('hudHint').textContent,/4 N 4/);assert.match(a.get('dDesc').textContent,new RegExp(BD.RECOVER_F+'f'));
  a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();
  assert.equal(a.trial.running,true);assert.equal(a.get('hudScore').textContent,'0.0 m');
  let o=bdOut(a,4100);o=bdSet(a,o,BD.MOVE_F);assert.equal(a.get('hudScore').textContent,'1.0 m');assert.equal(a.get('dProg').textContent,a.T('trial.bdProg',1,'1.0'));
  o=bdSet(a,o,BD.MOVE_F);assert.equal(a.get('hudScore').textContent,'2.0 m');a.onDir('n',o+fr(12)); // three backdashes: 1 + 1 + 1 (the last one ran out), two very fast sets, chain 3
  assert.equal(a.trial.dist,3);assert.equal(a.trial.bdCount,3);assert.equal(a.trial.bdTop,2);assert.equal(a.trial.bestChain,3);assert.equal(a.get('hudScore').textContent,'3.0 m');
  a.time(14100);a.trialTick(14100);assert.equal(a.trial.running,false);assert.equal(a.bd.state,0,'endTrial clears the machine');
  const rec=a.store.records.bd10[0];assert.equal(rec.score,3);assert.equal(rec.dashes,3);assert.equal(rec.top,2);assert.equal(rec.chain,3);assert.equal(a.get('hudCenter').textContent,'3.0 m');
  assert.equal(a.get('dProg').textContent,a.T('trial.bdEnd','3.0',3));assert.equal(a.store.life.trials.bd10,1);
  const e=JSON.parse(JSON.stringify(a.boardEntry(a.trial.result,'bd10')));assert.deepEqual(e,{board:'bd10',win:a.store.window,lang:'en',score:3,tie:2,detail:{dashes:3,top:2,chain:3}});
  assert.equal(w.validate({...e,nick:'smoke'}).error,undefined);
  const card=a.buildCard({kind:'trial',mode:'bd10',rec,attempts:[],cycles:[],window:a.store.window});assert.equal(card.hero.value,'3.0 m');assert.equal(card.chart,null);
  assert.doesNotMatch(JSON.stringify(card),/NaN|undefined|(^|[\s"])(card|rec|trial|mode|bd)\.[a-zA-Z0-9]+/);
  a.renderBests();assert.match(a.get('bests').innerHTML,/3\.0 m/);
  a.setMode('free');assert.equal(a.get('hudScore').textContent,'');assert.equal(a.bd.chain,0);
});

test('backdash recovery is a stage mechanic in every mode: no second backdash or back walk for RECOVER_F, a crouch/sidestep ends it, the stance holds meanwhile',()=>{
  const {BD}=boot();
  for(const m of ['free','wave10']){
    const a=boot({v:4});a.setMode(m);a.time(1000);const o=bdOut(a,1000);assert.equal(a.anim.moveT0,1000);
    assert.equal(a.bdRec.until,o+BD.RECOVER_F*F);assert.equal(a.anim.kind,'backdash');
    a.onDir('n',o+fr(12));a.time(2000);bdOut(a,o+fr(14));assert.equal(a.anim.moveT0,1000,m+': a b,N,b inside the recovery does not move');assert.equal(a.pops.length,0,'no STIFF pop');
    assert.equal(a.poseAt(1300).sweat,true,'still not idle: the recovery stance (240ms of dash, then the settle pose)');assert.equal(a.anim.kind,'backdash');
    assert.equal(a.poseAt(o+BD.RECOVER_F*F+1).sweat,undefined,'idle again once the recovery is over');
    a.time(1000);a.onDir('b',2500);a.onDir('n',2520);a.onDir('b',2540);a.onDir('d',2560);assert.equal(a.bdRec.until,2560,'a crouch ends the recovery early');a.onDir('n',2580);
    a.time(3000);bdOut(a,2600);assert.equal(a.anim.moveT0,3000,m+': and the next backdash comes out');
  }
  // a d/b during the dash stops the movement where it is (all modes) and sits
  const a=boot({v:4});a.setMode('ewgf20');const o=bdOut(a,1000);assert.ok(a.anim.moveDur>0);a.onDir('db',o+fr(BD.MOVE_F));assert.equal(a.anim.moveDur,0);assert.equal(a.anim.kind,'bdCrouch');
  assert.equal(a.bd.state,0,'judging still off outside free/bd10');
});

test('the segment bar shows the last backdash: 4 tap · N · hold until the cancel · 1 held until the next 4',()=>{
  const a=boot({v:4,lang:'ko'});const {BD}=a;
  let o=bdOut(a,1000,3,2);assert.equal(a.bd.seg,null,'nothing until the backdash is cancelled or released');
  a.onDir('db',o+fr(BD.MOVE_F));assert.deepEqual(JSON.parse(JSON.stringify(a.bd.seg)),{bd:true,tap:fr(3),n:fr(2),hold:fr(BD.MOVE_F),db:null});
  assert.equal(a.get('segTitle').textContent,a.T('seg.titleBd'));
  const c=o+fr(BD.MOVE_F);a.onDir('b',c+fr(4));assert.equal(a.bd.seg.db,fr(4),'the 1 hold closes the bar');a.onDir('n',c+fr(6));o=c+fr(8);a.onDir('b',o);
  assert.equal(a.bd.seg.db,fr(4),'the finished bar stays through the next backdash');a.onDir('n',o+fr(12));
  assert.deepEqual(JSON.parse(JSON.stringify(a.bd.seg)),{bd:true,tap:fr(2),n:fr(2),hold:fr(12),db:0},'released without a cancel: hold until the release, no 1');
  a.setLang('en');assert.equal(a.get('segTitle').textContent,'Last backdash segments (ms)');
  dash(a,5000);assert.equal(a.get('segTitle').textContent,a.T('seg.title'),'a crouch dash takes the bar back');
});

test('review fixes (2026-09-13): one 4N4 pairing rule, provisional no-cancel metre, chain 1 records, silent bar, HUD after bd10, d/f and 1-hold faults, cancel card, one trial-mode list',()=>{
  const {BD}=boot();const near=(x,y,m)=>assert.ok(Math.abs(x-y)<1e-9,m+': '+x+' vs '+y);
  // judging pairs the second 4 the way tapDetect does (within TAP_MS of the first 4, not of the N): no credited backdash without a drawn one
  let a=boot({v:4,lang:'ko'});a.onDir('b',1000);a.onDir('n',1200);a.onDir('b',1300);
  assert.equal(a.bd.state,1,'too slow to pair: the late 4 is a new first tap');assert.notEqual(a.anim.kind,'backdash');assert.equal(a.bd.chain,0);
  a.onDir('n',1320);a.onDir('b',1340);assert.equal(a.bd.state,3);assert.equal(a.anim.kind,'backdash','the judged backdash is the drawn one');
  // released without a cancel, then crouched/sidestepped inside the recovery: the metre shrinks to what was travelled (release-then-crouch spam earns nothing)
  a=boot({v:4,lang:'ko'});let o=bdOut(a,1000);a.onDir('n',o+fr(2));assert.equal(a.session.bd.dist,1);a.onDir('db',o+fr(3));assert.equal(a.session.bd.dist,0,'crouched before MIN_F: nothing');
  o=bdOut(a,2000);a.onDir('n',o+fr(2));a.onDir('d',o+fr(8));near(a.session.bd.dist,0.8,'sidestep at 8f');
  o=bdOut(a,3000);a.onDir('n',o+fr(2));a.tick(o+fr(BD.RECOVER_F+1));a.onDir('db',o+fr(BD.RECOVER_F+2));near(a.session.bd.dist,1.8,'after the recovery the full metre stays');
  // free practice before the first 1 cancel: a release or sidestep leaves the segment bar alone
  a=boot({v:4,lang:'ko'});dash(a,1000);o=bdOut(a,3000);a.onDir('n',o+fr(12));assert.equal(a.bd.seg,null);assert.equal(a.get('segTitle').textContent,a.T('seg.title'),'release: the wave bar stays');
  o=bdOut(a,5000);a.onDir('d',o+fr(8));assert.equal(a.bd.seg,null);assert.equal(a.get('segTitle').textContent,a.T('seg.title'),'sidestep: the wave bar stays');
  // engaged: d/f is a crouch (it cancels the recovery), so its distance counts; any direction while holding the 1 ends the set with a card
  a=boot({v:4,lang:'ko'});o=bdOut(a,1000);o=bdSet(a,o,BD.MOVE_F);assert.equal(a.bd.chain,2);
  a.onDir('df',o+fr(BD.MOVE_F));assert.equal(a.session.bd.dist,2,'d/f credits the distance');assert.equal(a.get('rTitle').textContent,a.T('bd.f.dir.title'));assert.equal(a.bd.chain,0);
  o=bdOut(a,o+fr(60));a.onDir('db',o+fr(BD.MOVE_F));a.onDir('d',o+fr(BD.MOVE_F+2));assert.equal(a.get('rTitle').textContent,a.T('bd.f.dir.title'),'1 → 2 says why the set ended');assert.equal(a.bd.state,0);
  // the cancel line redraws the backdash card even if another card was shown in between
  a=boot({v:4,lang:'ko'});o=bdOut(a,1000);o=bdSet(a,o,BD.MOVE_F);const title=a.get('rTitle').textContent;assert.equal(title,a.T('bd.title',2,a.T('bd.grade.top')));
  a.onButton(2,o+fr(3));assert.notEqual(a.get('rKind').textContent,'BACKDASH','a stray 2 shows its own card');
  a.onDir('db',o+fr(BD.MOVE_F));assert.equal(a.get('rKind').textContent,'BACKDASH');assert.equal(a.get('rTitle').textContent,title);assert.equal(a.get('rOff').textContent,a.T('bd.cancel',BD.MOVE_F,0,'1.0'));
  // bd10: an isolated backdash is a chain of 1 on the record; the HUD chain widget is redrawn when the trial ends
  a=boot({v:4,lang:'en'});a.setMode('bd10');a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();
  o=bdOut(a,4100);a.onDir('n',o+fr(12));assert.equal(a.trial.bestChain,1,'an isolated backdash is a chain of 1');assert.equal(a.session.bd.bestChain,1);
  o=bdOut(a,o+fr(40));o=bdSet(a,o,BD.MOVE_F);o=bdSet(a,o,BD.MOVE_F);assert.equal(a.get('hudChainL').textContent,'BACKDASH');assert.equal(a.get('hudChainN').textContent,3);
  a.time(14100);a.trialTick(14100);assert.equal(a.trial.running,false);assert.equal(a.store.records.bd10[0].chain,3);
  assert.equal(a.get('hudChainN').textContent,0);assert.equal(a.get('hudChainL').textContent,'WAVE','endTrial redraws the chain widget');
  // records, lifetime trial counters and the reset button all follow the one trial-mode list; the admin CLI knows every board
  assert.deepEqual(Object.keys(a.store.records),[...a.BOARDS]);assert.deepEqual(Object.keys(a.store.life.trials),[...a.BOARDS]);
  const b=boot(undefined,undefined,{confirm:()=>true});b.get('dataReset').click();assert.deepEqual(Object.keys(b.store.records),[...b.BOARDS]);assert.deepEqual(Object.keys(b.store.life.trials),[...b.BOARDS]);
  const adm=fs.readFileSync(require('node:path').join(__dirname,'../tools/board-admin.js'),'utf8');for(const id of a.BOARDS) assert.ok(adm.includes("['"+id+"', '"),'board-admin.js lists '+id);
});

test('search text: about block, hreflang set, ?lang= override and the /en/ /ja/ landing pages',()=>{
  const path=require('node:path');
  const a=boot({v:4,lang:'ko'});
  const u=a.SITE_URL, alt={ko:u,en:u+'en/',ja:u+'ja/','x-default':u};
  const MODES=['mode.wave10.name','mode.ewgf20.name','mode.combo10.name','mode.rush30.name','mode.bd10.name'];
  const pages={'index.html':html};
  for(const l of ['en','ja']) pages[l+'/index.html']=fs.readFileSync(path.join(__dirname,'..',l,'index.html'),'utf8');
  for(const [name,page] of Object.entries(pages)){
    const head=page.slice(0,page.indexOf('<style>'));
    for(const [l,h] of Object.entries(alt)) assert.ok(head.includes(`<link rel="alternate" hreflang="${l}" href="${h}">`),name+' hreflang '+l);
    assert.equal((head.match(/rel="canonical"/g)||[]).length,1,name+' has exactly one canonical');
    assert.equal(head.includes('http://'),false,name+' head must not contain http://');
  }
  // landing pages: static, script-free, canonical to themselves, open the app in their language (and ko on request), no official character names (design decision 3), mode names as the app shows them
  for(const l of ['en','ja']){
    const page=pages[l+'/index.html'];
    assert.ok(page.includes(`<html lang="${l}">`),l+' lang attribute');
    assert.ok(page.includes(`<link rel="canonical" href="${alt[l]}">`),l+' canonical');
    assert.equal((page.match(/<script/g)||[]).length,0,l+' landing page has no script');
    assert.ok(page.includes(`href="../?lang=${l}"`),l+' start button opens the app in '+l);
    assert.ok(page.includes('href="../?lang=ko"'),l+' Korean link asks for ko instead of the saved language');
    assert.ok(page.includes('https://ko-fi.com/misimadojo')&&page.includes('mailto:tlstjdgus3@gmail.com'),l+' donate + contact match the app');
    assert.doesNotMatch(page,BANNED,l+' landing page uses no official character names');
    assert.ok(page.includes(u+'og.png'),l+' og image');
    for(const k of MODES) assert.ok(page.includes(a.I18N[l][k]),l+' landing names the mode as the app does: '+a.I18N[l][k]);
  }
  // sitemap: the three URLs, each carrying the same four hreflang alternates as the page heads (decision 4)
  const sitemap=fs.readFileSync(path.join(__dirname,'..','sitemap.xml'),'utf8');
  assert.ok(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'),'sitemap declares the xhtml namespace for hreflang links');
  const blocks=sitemap.match(/<url>[\s\S]*?<\/url>/g)||[];
  const locOf=b=>b.match(/<loc>([^<]*)<\/loc>/)[1];
  assert.deepEqual(blocks.map(locOf),[alt.ko,alt.en,alt.ja],'sitemap lists the app and the two landing pages once each');
  for(const b of blocks){ const links={}; for(const m of b.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)) links[m[1]]=m[2]; assert.deepEqual(links,alt,'sitemap hreflang set for '+locOf(b)); }
  // about block: crawlable Korean text in the markup equals the ko dictionary, sits before the footer; every about.* key exists in all three languages and quotes real labels
  const keys=Object.keys(a.I18N.ko).filter(k=>k.startsWith('about.'));
  assert.ok(keys.length>=19,'about.* keys present');
  for(const k of keys) assert.ok(html.includes(`data-i18n="${k}">${a.T(k)}<`),k+' static text matches the ko dictionary');
  const about=html.indexOf('<details class="about" id="about">');assert.ok(about>0&&about<html.indexOf('<footer>'),'about block sits right above the footer');
  for(const l of ['ko','en','ja']){ const D=a.I18N[l];
    for(const k of keys){ assert.equal(typeof D[k],'string',l+' '+k); assert.doesNotMatch(D[k],BANNED,l+' '+k+' uses no official character names'); }
    assert.match(D['about.what.p'],/8/,l+' about text names Tekken 8');
    for(const k of MODES) assert.ok(D['about.modes.p'].includes(D[k]),l+' about.modes.p names the mode as the app does: '+D[k]);
    for(const k of ['r.noCancel.title','fault.cancel_as_start.title']) assert.ok(D['about.a2'].includes(D[k]),l+' about.a2 quotes the real fault label: '+D[k]);
  }
  // ?lang= is a one-shot command: it beats the saved language, is saved at once and removed from the URL; junk is ignored. visitDay=today keeps bumpVisitDay from saving on its own.
  const env=(search,saves,replaced)=>({location:{search,pathname:'/',hash:''},URLSearchParams,window:{history:{replaceState:(s,t,url)=>replaced.push(url)}},
    localStorage:{getItem:()=>JSON.stringify({v:4,lang:'ko',visitDay:kstToday()}),setItem:(k,v)=>saves.push(JSON.parse(v).lang)}});
  let saves=[],replaced=[];
  const b=boot(undefined,undefined,env('?lang=ja',saves,replaced));assert.equal(b.store.lang,'ja');assert.deepEqual(saves,['ja'],'saved at once');assert.deepEqual(replaced,['/'],'parameter dropped from the URL');
  saves=[];replaced=[];
  const c=boot(undefined,undefined,env('?lang=xx',saves,replaced));assert.equal(c.store.lang,'ko');assert.deepEqual(saves,[]);assert.deepEqual(replaced,[],'junk leaves the URL alone');
  const d=boot({v:4,lang:'en'},undefined,{location:{search:'',pathname:'/',hash:''},URLSearchParams});assert.equal(d.store.lang,'en');
});

test('rewards: pending items survive reload, exclude duplicates, and claim as one saved batch',()=>{
  let saved;
  const a=boot(undefined,undefined,{localStorage:{getItem:()=>null,setItem:(k,v)=>saved=JSON.parse(v)}});
  a.dailyGift();a.store.life.ewgf=1;a.checkAch();a.checkAch();
  assert.equal(a.store.pendingRewards.length,2);assert.equal(Object.keys(a.store.ach).length,0);
  assert.equal(a.get('rewardCount').textContent,'2');assert.equal(a.get('rewardOpen').disabled,false);
  assert.equal(a.get('rewardToast').textContent,'2 rewards arrived!');assert.equal(a.get('jackpot').hidden,true);
  const b=boot(saved);assert.deepEqual(J(b.store.pendingRewards),saved.pendingRewards);
  const ids=b.store.pendingRewards.map(j=>j.id);b.get('rewardOpen').click();b.get('rewardOpen').click();
  assert.equal(b.store.pendingRewards.length,0);for(const id of ids) assert.equal(b.owned(id),true);
  assert.match(b.get('jpAch').textContent,/\+1 more/);assert.equal(b.get('rewardOpen').disabled,true);
  b.store.life.dashes=10;b.checkAch();assert.equal(b.store.pendingRewards.length,1);b.claimRewards();assert.equal(b.owned('red_head'),false);
  b.get('setOpen').click();b.get('setDlg').open=false;b.get('setDlg').close();b.renderRewards();
  assert.equal(b.get('jackpot').hidden,true);assert.equal(b.store.pendingRewards.length,1);
  a.claimRewards();assert.equal(saved.pendingRewards.length,0);for(const id of ids) assert.ok(saved.ach[id]);
  const c=boot(saved);assert.equal(c.store.pendingRewards.length,0);assert.equal(c.get('jackpot').hidden,true);
});

test('rewards: saved queue validation, pending outfits, reset and static translated notices',()=>{
  const j={id:'red_top',kind:'ach',at:1,day:1};
  const a=boot({v:4,fx:0,visitDay:kstToday(),life:{days:1},ach:{red_head:1},fit:{top:'red_top'},pendingRewards:[j,j,null,{...j,id:'red_head'},{...j,id:'bogus'},{...j,kind:'daily'},{...j,id:'red_arms',at:-1},{...j,id:'red_legs',day:1.5}]});
  assert.deepEqual(J(a.store.pendingRewards),[j]);assert.equal(a.store.fit.top,'base');assert.equal(a.setFit('top','red_top'),false);
  a.renderFit();assert.match(a.get('fitAch').innerHTML,/Unclaimed/);
  a.dailyGift();assert.equal(a.get('rewardOpen').dataset.motion,'false');
  for(const lang of ['ko','ja','en']){a.setLang(lang);assert.equal(a.get('rewardToast').textContent,a.T('reward.daily'));}
  for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();}
  assert.equal(a.get('rewardToast').hidden,true);assert.equal(a.get('jackpot').hidden,true);
  a.get('dataReset').click();assert.equal(a.store.pendingRewards.length,0);assert.equal(a.get('rewardCount').hidden,true);
});

test('reward toast batches arrivals, flies to the chest without claiming and cancels on reset',()=>{
  const a=boot(), toast=a.get('rewardToast');let flight, cancelled=0;
  toast.animate=(frames,options)=>{assert.equal(options.duration,550);assert.match(frames[1].transform,/scale\(\.12\)/);return flight={cancel(){cancelled++;}};};
  const step=()=>{for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();}};
  a.dailyGift();a.store.life.ewgf=1;a.checkAch();assert.equal(toast.textContent,'2 rewards arrived!');step();
  assert.ok(flight);flight.onfinish();assert.equal(toast.hidden,true);assert.equal(a.get('rewardOpen').dataset.arrival,'true');
  assert.equal(a.store.pendingRewards.length,2);assert.equal(Object.keys(a.store.ach).length,0);assert.equal(a.get('jackpot').hidden,true);
  step();assert.equal(a.get('rewardOpen').dataset.arrival,'false');
  a.store.life.dashes=10;a.checkAch();step();a.get('dataReset').click();assert.equal(cancelled,2);assert.equal(toast.hidden,true);assert.equal(a.store.pendingRewards.length,0);
});
