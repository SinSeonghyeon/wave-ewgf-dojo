// No dependencies: execute the shipped script with deterministic browser/time stubs.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function boot(saved){
  let now=1000, pads=[];
  const elements=new Map(), events={}, timers=new Map(); let next=1;
  function element(){
    return {textContent:'',innerHTML:'',style:{},dataset:{},children:[],clientWidth:800,
      classList:{add(){},toggle(){}},setAttribute(){},addEventListener(type,fn){this[type]=fn;},
      querySelectorAll(){return [];},querySelector(){return element();},
      getBoundingClientRect(){return {width:800,height:360};},getContext(){return {setTransform(){}};}};
  }
  const get=id=>{if(!elements.has(id)) elements.set(id,element()); return elements.get(id);};
  const context=vm.createContext({performance:{now:()=>now},document:{getElementById:get,querySelectorAll:()=>[],hasFocus:()=>true,hidden:false},
    navigator:{getGamepads:()=>pads},localStorage:{getItem:()=>saved===undefined?null:JSON.stringify(saved),setItem(){}},
    matchMedia:()=>({matches:false}),devicePixelRatio:1,requestAnimationFrame(){},
    addEventListener:(name,fn)=>events[name]=fn,
    setInterval:fn=>{const id=next++;timers.set(id,fn);return id;},clearInterval:id=>timers.delete(id),
    setTimeout:fn=>{const id=next++;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)});
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\}\)\(\);\s*$/, 'globalThis.app={onDir,onButton,cd,session,drill,store,setMode,startDrill,endDrill,pollPad,clearCommand,renderBests,setLang,T,I18N,histBins,buildCard,buildOgCard,shareSource,SITE_URL,BOARD_URL,BOARDS,WINDOWS,boardEntry,boardRowText,nickOk};})();');
  vm.runInContext(script,context);
  return {...context.app,events,get,timers,time:t=>now=t,pads:p=>pads=p};
}
function dash(a,t=1000){a.onDir('f',t);a.onDir('n',t+20);a.onDir('d',t+40);a.onDir('df',t+60);}
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
  const a=boot();a.setMode('wave10');a.startDrill();const id=a.drill.cdTimer;a.setMode('free');
  assert.equal(a.timers.has(id),false);assert.equal(a.drill.running,false);assert.equal(a.get('dStart').disabled,false);
  a.setMode('ewgf20');a.startDrill();a.get('dReset').click();assert.equal(a.drill.cdTimer,null);assert.equal(a.cd.state,0);
});
test('drill start discards commands begun during countdown',()=>{
  const a=boot();a.setMode('ewgf20');a.startDrill();dash(a);const countdown=a.timers.get(a.drill.cdTimer);
  a.time(4000);countdown();countdown();countdown();a.onButton(2,4001);
  assert.equal(a.session.attempts.at(-1).kind,'no_cd');assert.equal(a.drill.count,1);
});
test('wave deadline excludes dash arriving at the end boundary',()=>{
  const a=boot();a.setMode('wave10');a.startDrill();const countdown=a.timers.get(a.drill.cdTimer);countdown();countdown();countdown();
  dash(a,10940);assert.equal(a.drill.running,false);assert.equal(a.store.records.wave10[0].dashes,0);
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
test('blur clears unfinished input and cancels drill',()=>{
  const a=boot();a.setMode('wave10');a.startDrill();dash(a);a.events.blur();
  assert.equal(a.cd.state,0);assert.equal(a.cd.chain,0);assert.equal(a.drill.cdTimer,null);
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
test('histBins puts offsets on the window boundary inside and just outside in the late bin',()=>{
  const a=boot();const bins=a.histBins([{off:0},{off:-12},{off:12},{off:13},{off:null}],12);
  assert.equal(bins.length,16);assert.equal(bins[0].f,-6);assert.equal(bins[15].f,9);
  assert.equal(bins[6].n,1);assert.equal(bins[6].kind,'ewgf');assert.equal(bins[5].n,1);assert.equal(bins[5].kind,'early');
  assert.equal(bins[7].n,2);assert.equal(bins[7].kind,'wgf');assert.equal(bins.reduce((s,b)=>s+b.n,0),4);
  assert.equal(a.histBins([{off:30}],8)[8].kind,'wgf');assert.equal(a.histBins([],8)[4].kind,'early');
});
test('wave10 drill result becomes a share card model in the current language',()=>{
  const a=boot({v:4,lang:'ko'});assert.equal(a.get('dShare').hidden,false);
  a.setMode('wave10');assert.equal(a.get('dShare').hidden,true);assert.equal(a.get('dShare').textContent,'공유 카드');
  a.startDrill();const countdown=a.timers.get(a.drill.cdTimer);a.time(4000);countdown();countdown();countdown();
  dash(a,4100);a.onDir('f',4200);a.onDir('n',4220);dash(a,4240);
  assert.equal(a.shareSource(),null);
  a.endDrill();assert.equal(a.drill.result.rec.dashes,2);assert.equal(a.get('dShare').hidden,false);
  const src=a.shareSource();assert.equal(src.kind,'drill');assert.equal(src.cycles.length,1);
  const m=a.buildCard(src);
  assert.equal(m.app,'미시마 도장');assert.equal(m.modeName,'웨이브 10초');assert.equal(m.hero.value,'0.2');assert.equal(m.hero.label,'대시/초');
  assert.equal(m.chart.type,'wave');assert.equal(m.chart.pts.length,1);assert.equal(m.url,a.SITE_URL);
  assert.deepEqual(Array.from(m.metrics,x=>x.value),['2','2','0']);assert.equal(m.windowText,'초풍 판정 폭 보통 0.7f');
  assert.ok(m.tweet.includes('0.2 대시/초'));assert.ok(m.tweet.includes('최고 연속 2'));assert.ok(m.tweet.endsWith('\n'+a.SITE_URL));
  assert.match(m.file,/^mishima-dojo-wave10-\d{8}\.png$/);
  a.setLang('en');const e=a.buildCard(src);assert.equal(e.modeName,'Wave 10s');assert.equal(e.sub,'10s over · 2 dashes (0.2 dashes/s)');assert.equal(e.hero.label,'dashes/s');
  a.startDrill();assert.equal(a.drill.result,null);assert.equal(a.get('dShare').hidden,true);
});
test('completed EWGF card preserves the judgment window after settings change',()=>{
  const a=boot({v:4,lang:'ko',window:12});a.setMode('ewgf20');a.startDrill();
  const countdown=a.timers.get(a.drill.cdTimer);a.time(4000);countdown();countdown();countdown();
  for(let i=0;i<20;i++){a.clearCommand();dash(a,4100+i*200);a.onButton(2,4170+i*200);}
  assert.equal(a.drill.running,false);assert.equal(a.drill.result.rec.hits,20);
  a.store.window=8;
  const src=a.shareSource(), m=a.buildCard(src);
  assert.equal(src.window,12);assert.equal(m.hero.value,'100%');
  assert.equal(m.windowText,'초풍 판정 폭 보통 0.7f');assert.match(m.tweet,/보통 0\.7f/);
  assert.equal(m.chart.window,12);
});

test('wave drill card counts only attempts made during the completed drill',()=>{
  const a=boot({v:4,lang:'ko'});dash(a);a.onButton(2,1060);
  a.setMode('wave10');a.startDrill();
  const countdown=a.timers.get(a.drill.cdTimer);a.time(4000);countdown();countdown();countdown();
  dash(a,4100);a.onButton(2,4160);a.endDrill();
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
  for(const banned of ['<script','http://']) assert.equal(head.includes(banned),false,'head must not contain '+banned);
  assert.match(html,/document\.title = T\('app\.docTitle'\)/);
});

test('leaderboard entry is built only from a finished drill, one metric pair per board',()=>{
  const a=boot({v:4,lang:'ko',window:8});
  assert.match(a.BOARD_URL,/^$|^https:\/\/[^/]+$/,'BOARD_URL is empty or an https origin without trailing slash');
  assert.equal(a.boardEntry(null,'wave10'),null);assert.equal(a.boardEntry(a.drill.result,'free'),null);
  const plain=x=>JSON.parse(JSON.stringify(x)); // vm-realm objects have a foreign prototype; compare by value
  const run=(mode,play)=>{a.setMode(mode);a.startDrill();const cd=a.timers.get(a.drill.cdTimer);a.time(4000);cd();cd();cd();play();a.endDrill();return a.boardEntry(a.drill.result,mode);};
  const wave=run('wave10',()=>{dash(a,4100);a.time(14100);});
  assert.deepEqual(plain(wave),{board:'wave10',win:8,lang:'ko',score:0.1,tie:1,detail:{dashes:1,chain:1}});
  assert.deepEqual(plain(a.boardRowText('wave10',wave)),{label:'0.1 대시/초',sub:'1회 · 최고 연속 1'});
  const ewgf=run('ewgf20',()=>{dash(a,4100);a.onButton(2,4160);});
  assert.deepEqual(plain(ewgf),{board:'ewgf20',win:8,lang:'ko',score:5,tie:0,detail:{hits:1,target:20,mean:0}});
  assert.equal(Object.is(ewgf.tie,-0),false,'tie must not be -0');
  const combo=run('combo10',()=>{dash(a,4100);for(const t of [4200,4400]){a.onDir('f',t);a.onDir('n',t+20);dash(a,t+40);}a.onButton(2,4500);});
  assert.equal(combo.board,'combo10');assert.equal(combo.score,10);assert.deepEqual(plain(Object.keys(combo.detail)),['hits','target','mean','dps']);
  assert.equal(combo.detail.hits,1);assert.ok(combo.detail.dps>4&&combo.detail.dps<8,'mean dash/s of the drill cycles');assert.equal(combo.tie,combo.detail.dps);
  assert.equal(a.boardRowText('combo10',combo).sub,'1/10 · 평균 +0.0f · '+combo.detail.dps.toFixed(1)+' 대시/초','combo10 shows its tie-breaker');
  assert.equal(a.boardRowText('combo10',{score:50,detail:{hits:5,target:10,mean:1}}).sub,'5/10 · 평균 +0.1f','rows without dps (old records) render as before');
  a.setLang('en');assert.equal(a.boardRowText('ewgf20',ewgf).sub,'1/20 · avg +0.0f');
  a.setMode('free');assert.equal(a.boardEntry(a.drill.result,'free'),null);
  for(const [n,ok] of [['ab',true],['한글닉네임열두글자까지만',true],['a',false],['1234567890123',false],['ab\u200bcd',false],['a\u0000b',false]]) assert.equal(a.nickOk(n),ok,JSON.stringify(n));
});

test('app and worker agree on the leaderboard contract (boards, windows, detail fields)',async()=>{
  const w=await import(require('node:url').pathToFileURL(require('node:path').join(__dirname,'../worker/index.js')).href);
  const a=boot({v:4,lang:'ko',window:15});
  assert.deepEqual([...a.WINDOWS],w.WINDOWS);assert.deepEqual([...a.BOARDS],Object.keys(w.BOARDS));
  assert.deepEqual(html.match(/<button data-board="(\w+)"/g).map(x=>x.match(/"(\w+)"/)[1]),Object.keys(w.BOARDS),'#boardTabs buttons');
  const run=(mode,play)=>{a.setMode(mode);a.startDrill();const cd=a.timers.get(a.drill.cdTimer);a.time(4000);cd();cd();cd();play();a.endDrill();return JSON.parse(JSON.stringify(a.boardEntry(a.drill.result,mode)));};
  const entries={wave10:run('wave10',()=>{dash(a,4100);a.time(14100);}),ewgf20:run('ewgf20',()=>{dash(a,4100);a.onButton(2,4160);}),
    combo10:run('combo10',()=>{dash(a,4100);for(const t of [4200,4400]){a.onDir('f',t);a.onDir('n',t+20);dash(a,t+40);}a.onButton(2,4500);})};
  for(const [m,e] of Object.entries(entries)){
    const v=w.validate({...e,nick:'smoke'});assert.equal(v.error,undefined,m+': '+JSON.stringify(e));
    assert.deepEqual(Object.keys(v.value.detail),Object.keys(e.detail),m+' detail fields');assert.equal(v.value.win,15);
  }
});
