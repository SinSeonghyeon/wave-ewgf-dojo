// WSC (웨캔기어): recognition, A/B timing, 10-task challenge, isolation, rankings.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {html, boot, dash, F, backend, topRes, wscPrefix, wscRun, wscChainRun} = require('./helpers/app.cjs');
test('WSC six success combinations and rejected timings use approved independent rounded intervals',()=>{
  for(const [A,B,ok] of [[8,1,true],[9,1,true],[9,2,true],[10,1,true],[10,2,true],[10,3,true],[7,1,false],[8,2,false],[8,3,false],[9,3,false],[10,4,false],[11,1,false],[12,4,false],[8,0,false],[8,-1,false]]){
    const a=boot();a.setMode('wsc');const r=wscRun(a,A,B);
    assert.equal(r.ok,ok,`${A}+${B}`);assert.equal(r.a,A);assert.equal(r.b,B);assert.equal(a.wsc.session.tries,1);
  }
  const a=boot();
  for(const [raw,expected] of [[7.5-.0001,7],[7.5,8],[7.5+.0001,8],[10.5-.0001,10],[10.5,11],[10.5+.0001,11]]) assert.equal(a.wscFrames(raw*F),expected);
  for(const [raw,ok] of [[.5-.0001,false],[.5,true],[1.5-.0001,true],[1.5,false],[0,false]]) assert.equal(a.wscJudge(7*F,raw*F).ok,ok);
  assert.equal(a.wscJudge(7*F,null).ok,false);
});
test('WSC isolates all existing statistics, achievements, records, board and sharing',()=>{
  const a=boot();dash(a);a.onButton(2,1060);const before=JSON.stringify([a.session,a.store.life,a.store.ach,a.store.pendingRewards,a.store.records]);
  a.setMode('wsc');wscRun(a,8,1,2000);wscRun(a,9,3,3000);
  assert.equal(JSON.stringify([a.session,a.store.life,a.store.ach,a.store.pendingRewards,a.store.records]),before);
  assert.equal(a.shareSource(),null);assert.equal(a.boardEntry({rec:{score:1}},'wsc'),null);assert.equal(a.get('dShare').hidden,true);assert.equal(a.BOARDS.includes('wsc'),true);
  a.setMode('free');assert.equal(JSON.stringify([a.session,a.store.life,a.store.ach,a.store.pendingRewards,a.store.records]),before,'leaving WSC preserves existing practice data');
  assert.equal(boot().wsc.session.tries,0);
});
test('WSC always evaluates the full command and only completed attempts enter the single session rate',()=>{
  const a=boot();a.setMode('wsc');const df=wscPrefix(a);a.onDir('b',df+7*F);
  assert.equal(a.wsc.last,null);assert.equal(a.wsc.session.tries,0);assert.match(a.get('wscAB').innerHTML,/8f/);
  a.onButton(2,df+8*F);assert.equal(a.wsc.last.ok,true);assert.equal(a.wsc.session.tries,1);
  a.onButton(2,1400);assert.equal(a.wsc.session.tries,1);
  wscRun(a,7,1,2000);wscRun(a,9,2,3000);wscRun(a,9,3,4000);
  assert.equal(a.wsc.session.tries,4);assert.equal(a.wsc.session.hits,2);
  const df2=wscPrefix(a,5000);a.onDir('b',df2+7*F);a.onButton(1,df2+8*F);assert.equal(a.wsc.last.reason,'button');
  wscPrefix(a,6000);a.onButton(2,6130);assert.equal(a.wsc.last,null);assert.equal(a.get('rTitle').textContent,a.T('a.wgf.title'));
  wscPrefix(a,7000);a.tick(8031);assert.equal(a.wsc.last.reason,'aborted');assert.equal(a.wsc.session.tries,5);assert.equal(a.wsc.session.aborted,1);
  for(const cancel of [()=>a.resetInput(),()=>a.events.blur(),()=>a.get('setOpen').click(),()=>a.setMode('free')]){
    a.setMode('wsc');a.get('setDlg').open=false;wscPrefix(a,9000);const before=a.wsc.session.tries;cancel();assert.equal(a.wsc.active,null);assert.equal(a.wsc.session.tries,before);
  }
  assert.doesNotMatch(html,/id="wscSteps"|data-step=/);
  a.setMode('wsc');wscRun(a,8,1,10000);assert.doesNotMatch(a.get('wscAxis').innerHTML,/data-frame="-/);assert.equal(a.wsc.last.events[0].dir,'df');
});
test('WSC permits neutral and one forward, rejects other directions, replaces only complete wave prefixes',()=>{
  for(const dirs of [[],['n'],['f'],['f','n']]) for(const release of [false,true]){
    const a=boot();a.setMode('wsc');const df=wscPrefix(a,1000);
    dirs.forEach((d,i)=>a.onDir(d,df+20+i*20));a.onDir('b',df+8*F);if(release)a.onDir('n',df+8*F+2);a.onButton(2,df+9*F);assert.equal(a.wsc.last.ok,true,dirs+' / '+release);
  }
  for(const dirs of [['f','n','f'],['u'],['uf'],['ub'],['n','df'],['d','df'],['db','u']]){
    const a=boot();a.setMode('wsc');const df=wscPrefix(a);dirs.forEach((d,i)=>a.onDir(d,df+10+i*10));a.onDir('b',df+7*F);a.onButton(2,df+8*F);assert.equal(a.wsc.last.ok,false,dirs.join(','));
  }
  for(const d of ['f','df','d','db','u','ub','uf']){const a=boot();a.setMode('wsc');const df=wscPrefix(a);a.onDir('b',df+7*F);a.onDir(d,df+7*F+1);a.onButton(2,df+8*F);assert.equal(a.wsc.last.reason,'direction');}
  const a=boot();a.setMode('wsc');wscPrefix(a);a.onDir('f',1080);a.onDir('n',1090);const df=wscPrefix(a,1100);a.onDir('b',df+9*F);a.onButton(2,df+12*F);
  assert.equal(a.wsc.last.ok,true);assert.equal(a.wsc.last.df,df);assert.equal(a.wsc.session.tries,1);
  const b=boot();b.setMode('wsc');b.onDir('f',1000);b.onDir('df',1020);b.onButton(2,1100);assert.equal(b.wsc.session.tries,0);assert.equal(b.wsc.session.errors,1);
});
// 한마디 #105: 웨캔기어를 연속 성공해도 연속이 2회 정도로 끊겼다. 3→4 사이에 ↓·↙를 지나면(→를 먼저 떼기, ↓→ 누른 채 ←,
// 스틱으로 아래를 굴리기) 'direction' 실패였다. 사용자 결정(2026-10-11): A 구간의 ↓·↙ 허용, A는 여전히 4가 들어온 프레임.
test('WSC A window lets 3→4 pass through down and down-back; A is still timed by the back input',()=>{
  for(const dirs of [['d'],['db'],['d','db'],['d','n'],['n','d','db'],['f','d'],['d','db','n']])for(const [A,B,ok] of [[8,1,true],[9,2,true],[10,3,true],[7,1,false],[11,1,false],[8,2,false]]){
    const a=boot();a.setMode('wsc');const df=wscPrefix(a);dirs.forEach((d,i)=>a.onDir(d,df+F+i*5));a.onDir('b',df+(A-1)*F);a.onButton(2,df+(A-1+B)*F);
    assert.equal(a.wsc.last.ok,ok,dirs+' '+A+'+'+B);assert.equal(a.wsc.last.a,A);assert.equal(a.wsc.last.b,B);
  }
  // real keyboard release orders: → released before ↓, and ← pressed while ↓→ are held (SOCD ←→ = neutral x → ↓, then ↙)
  const a=boot();a.setMode('wsc');
  const key=(code,t,up=false)=>a.events[up?'keyup':'keydown']({code,timeStamp:t,target:{tagName:'BODY'},preventDefault(){},repeat:false});
  const orders=[
    t=>{key('KeyD',t+40,true);key('KeyS',t+45,true);key('KeyA',t+30+8*F);},            // 3 → 2 → N → 4
    t=>{key('KeyA',t+40);key('KeyD',t+45,true);key('KeyS',t+30+8*F,true);},            // 3 → 2 → 1 → 4 (A from the 4)
    t=>{key('KeyS',t+40,true);key('KeyD',t+45,true);key('KeyA',t+30+8*F);},            // 3 → 6 → N → 4 (already allowed)
  ];
  for(let i=0;i<8;i++){
    const t=1000+i*1000;key('KeyD',t);key('KeyD',t+10,true);key('KeyS',t+20);key('KeyD',t+30);
    orders[i%3](t);key('KeyI',t+30+9*F);key('KeyI',t+30+9*F+5,true);key('KeyA',t+30+9*F+6,true);
  }
  const s=a.wsc.session;assert.deepEqual([s.tries,s.hits,s.streak,s.best],[8,8,8,8]);
  // other modes: the same keyboard path still yields the WSC (no EWGF try), and plain EWGF is untouched
  const b=boot();b.setMode('free');const df=wscPrefix(b);b.onDir('d',df+F);b.onDir('db',df+2*F);b.onDir('b',df+7*F);b.onButton(2,df+8*F);
  assert.equal(b.wsc.last.ok,true);assert.equal(b.session.tries,0);
  const c=boot();c.setMode('free');const df2=wscPrefix(c);c.onButton(2,df2);assert.equal(c.session.tries,1);assert.equal(c.session.hits,1);
});
test('neutral omission completes standalone and linked waves',()=>{
  const a=boot();a.onDir('f',1000);a.onDir('d',1020);a.onDir('df',1040);
  a.onDir('f',1100);a.onDir('n',1120);a.onDir('f',1140);a.onDir('d',1160);a.onDir('df',1180);
  assert.equal(a.session.dashes,2);assert.equal(a.cd.chain,2);assert.equal(a.store.life.dashes,2);
});
test('WSC translated results, touch/keyboard/pad input paths, side mirroring and no repeated held RP',()=>{
  for(const side of [1,-1]){
    const a=boot({v:4,side});a.setMode('wsc');
    const forward=side===1?'right':'left',back=side===1?'left':'right';
    a.touchKeys([forward],1000);a.touchKeys([],1010);a.touchKeys(['down'],1020);a.touchKeys([forward,'down'],1030);a.touchKeys([back],1030+7*F);a.touchPress(2,1030+8*F);
    assert.equal(a.wsc.last.ok,true);assert.equal(a.get('wscCommand').textContent,'6N23 · '+(side===1?'←':'→')+' · RP');
    for(const lang of ['ko','en','ja']){a.setLang(lang);assert.ok(a.get('wscResult').textContent.includes(a.T('wsc.success')));assert.doesNotMatch(a.get('wscDetail').textContent,/wsc\./);}
  }
  const a=boot();a.setMode('wsc');
  const key=(code,t,up=false)=>a.events[up?'keyup':'keydown']({code,timeStamp:t,target:{tagName:'BODY'},preventDefault(){},repeat:false});
  key('KeyD',1000);key('KeyD',1010,true);key('KeyS',1020);key('KeyD',1030);key('KeyS',1040,true);key('KeyD',1050,true);key('KeyA',1030+7*F);key('KeyI',1030+8*F);key('KeyI',1250);
  assert.equal(a.wsc.last.ok,true);assert.equal(a.wsc.session.tries,1);
  const b=boot();b.setMode('wsc');
  const sample=(t,idx)=>{b.time(t);b.pads([{index:0,id:'test',mapping:'standard',axes:[0,0],timestamp:t,buttons:Array.from({length:16},(_,i)=>({pressed:idx.includes(i),value:idx.includes(i)?1:0}))}]);b.pollPad();};
  sample(1000,[15]);sample(1010,[]);sample(1020,[13]);sample(1030,[13,15]);sample(1030+7*F,[14]);sample(1030+8*F,[14,3]);sample(1300,[14,3]);
  assert.equal(b.wsc.last.ok,true);assert.equal(b.wsc.session.tries,1);
});
test('WSC deadlines are independent of 60/120Hz ticks; hidden tabs cancel and a new full command replaces an unfinished RP',()=>{
  for(const hz of [60,120]){
    const a=boot();a.setMode('wsc');
    const events=[[1000,()=>a.onDir('f',1000)],[1010,()=>a.onDir('n',1010)],[1020,()=>a.onDir('d',1020)],[1030,()=>a.onDir('df',1030)],
      [1030+8*F,()=>a.onDir('b',1030+8*F)],[1030+10*F,()=>a.onButton(2,1030+10*F)]];
    for(let t=1000;t<1300;t+=1000/hz) events.push([t,()=>a.tick(t)]);
    events.sort((x,y)=>x[0]-y[0]).forEach(x=>x[1]());assert.equal(a.wsc.last.ok,true);assert.equal(a.wsc.last.b,2);
    wscPrefix(a,2000);a.document.hidden=true;a.events.visibilitychange();assert.equal(a.wsc.active,null);assert.equal(a.wsc.session.tries,1);
  }
  const a=boot();a.setMode('wsc');let df=wscPrefix(a);a.onDir('b',df+7*F);
  df=wscPrefix(a,1300);a.onDir('b',df+7*F);a.onButton(2,df+8*F);assert.equal(a.wsc.last.ok,true);assert.equal(a.wsc.last.df,df);assert.equal(a.wsc.session.tries,1);
});
test('WSC 10-try challenge counts down, completes once, exposes a separate ranking result and preserves practice totals',()=>{
  const a=boot();a.setMode('wsc');wscRun(a,8,1);const before=JSON.stringify([a.session,a.store.life,a.store.records,a.store.ach,a.store.pendingRewards]);
  a.time(2000);a.wscStartChallenge();assert.equal(a.wsc.challenge.status,'countdown');
  wscRun(a,8,1,2100);assert.equal(a.wsc.challenge.stats.tries,0);assert.equal(a.wsc.session.tries,1);
  a.tick(5000);assert.equal(a.wsc.challenge.status,'running');
  wscPrefix(a,5100);a.tick(6131);assert.equal(a.wsc.challenge.stats.aborted,1);assert.equal(a.wsc.challenge.stats.tries,0);
  for(let i=0;i<10;i++){
    for(const lang of ['ko','en','ja']){a.setLang(lang);assert.doesNotMatch(a.get('wscChallengeStatus').textContent,/wsc\./);}
    const r=wscChainRun(a,1+i%4,i<8?1:2,7000+i*1000);assert.equal(r.ok,i<8);
  }
  assert.equal(a.wsc.challenge.status,'done');assert.equal(a.wsc.challenge.stats.tries,10);assert.equal(a.wsc.challenge.stats.hits,8);assert.equal(a.wsc.challenge.stats.best,8);
  assert.equal(a.wsc.session.tries,11);assert.equal(a.trial.result,null);assert.equal(a.shareSource(),null);assert.equal(a.get('hudScore').textContent,'');
  wscRun(a,8,1,20000);assert.equal(a.wsc.challenge.stats.tries,10);assert.equal(a.wsc.session.tries,12);
  for(const lang of ['ko','en','ja']){a.setLang(lang);assert.match(a.get('wscChallengeStatus').textContent,/80%/);}
  assert.equal(JSON.stringify([a.session,a.store.life,a.store.records,a.store.ach,a.store.pendingRewards]),before);
  assert.doesNotMatch(html,/id="wscTask"/);
});
// 한마디 #105: 도전에서 웨이브 횟수 과제를 안 맞추면 기상어퍼 연출·소리는 나오는데 집계는 실패라 연속이 끊겼다.
// 사용자 결정(2026-10-11): 웨이브 횟수 과제를 없앤다 — 도전도 타이밍만 본다.
test('WSC challenge and session streaks follow timing only, whatever wave count leads in',()=>{
  for(const side of [1,-1]){
    const a=boot({fx:0});a.store.side=side;a.setMode('wsc');a.wscStartChallenge();a.tick(4000);
    for(let i=0;i<8;i++){const r=wscChainRun(a,1+(i*3)%4,1,5000+i*1000);assert.equal(r.ok,true,String(i));assert.equal('taskN' in r||'waves' in r||'timingOK' in r,false);}
    for(const st of [a.wsc.challenge.stats,a.wsc.session])assert.deepEqual([st.tries,st.hits,st.streak,st.best],[8,8,8,8]);
  }
  // a broken lead-in still fails on its own merits (direction / missing back), not on a wave count
  for(const broken of ['direction','reuse']){
    const a=boot();a.setMode('wsc');a.wscStartChallenge();a.tick(4000);const df=wscPrefix(a,5000);
    if(broken==='direction'){a.onDir('u',df+10);a.onDir('b',df+7*F);a.onButton(2,df+8*F);assert.equal(a.wsc.last.reason,'direction');}
    else{a.onDir('f',df+20);a.onDir('n',df+30);a.onDir('d',df+40);a.onDir('df',df+50);a.onDir('b',df+7*F);a.onButton(2,df+8*F);assert.equal(a.wsc.last.ok,false);}
    assert.equal(a.wsc.challenge.stats.hits,0,broken);
  }
});
test('WSC challenge cancels on blur, hidden, mode, side reset, modal and explicit cancel without saving a result',()=>{
  for(const running of [false,true])for(const reason of ['blur','hidden','mode','side','modal','cancel','reset']){
    const a=boot();a.setMode('wsc');a.wscStartChallenge();if(running)a.tick(4000);
    if(reason==='blur')a.events.blur();
    if(reason==='hidden'){a.document.hidden=true;a.events.visibilitychange();}
    if(reason==='mode')a.setMode('free');
    if(reason==='side'){a.store.side=-1;a.resetInput();}
    if(reason==='modal')a.get('setOpen').click();
    if(reason==='cancel')a.wscStartChallenge();
    if(reason==='reset')a.resetSession();
    assert.equal(a.wsc.challenge.status,reason==='reset'?'idle':'cancelled',reason);a.tick(10000);assert.notEqual(a.wsc.challenge.status,'running');assert.equal(a.trial.result,null);assert.equal(a.get('hudCenter').textContent,'');
  }
});
test('WSC successful uppercut has its own rise and recovery, hits only the visual dummy and respects effects settings',()=>{
  for(const fx of [0,1]){
    const a=boot({v:4,fx});a.setMode('wsc');a.world.charX=120;a.world.dummyX=180;a.time(1500);wscRun(a,8,1);
    assert.equal(a.anim.kind==='wsc',!!fx);assert.equal(a.world.dummy.hit,1);
    if(fx){const low=a.poseAt(1500),high=a.poseAt(1670),recover=a.poseAt(1900);assert.ok(low.crouch>high.crouch);assert.ok(high.armR>recover.armR);assert.equal(a.snd.pool.wave,undefined);assert.equal(a.snd.pool.ewgf,undefined);}
    assert.equal(a.session.tries,0);assert.equal(a.store.life.ewgf,0);assert.equal(a.store.life.dashes,0);
  }
});
test('WSC A counts d/f as frame 1 while B remains zero-based elapsed time',()=>{
  const a=boot();assert.equal(a.wscA(0),1);
  for(const [raw,A] of [[6.5-.0001,7],[6.5,8],[6.5+.0001,8],[7.5-.0001,8],[7.5,9],[8.5,10],[9.5-.0001,10],[9.5,11]]) assert.equal(a.wscJudge(raw*F,F).a,A);
  for(const [elapsed,A,maxB] of [[7,8,1],[8,9,2],[9,10,3]]){
    assert.equal(a.wscJudge(elapsed*F,maxB*F).ok,true);assert.equal(a.wscJudge(elapsed*F,(maxB+1)*F).ok,false);
  }
  assert.equal(a.wscJudge(10*F,F).ok,false,'10 elapsed frames is now A=11');
  a.setMode('wsc');const df=wscPrefix(a);a.onDir('b',df+7*F);a.onButton(2,df+8*F);
  assert.equal(a.wsc.last.a,8);assert.equal(a.wsc.last.b,1);assert.ok(Math.abs(a.wsc.last.aRaw-7*F)<1e-9);
  assert.match(a.get('wscAxis').innerHTML,/data-frame="1"/);assert.doesNotMatch(a.get('wscAxis').innerHTML,/data-frame="0"/);
  assert.match(a.get('wscAB').innerHTML,/7.00f/);
});
test('all modes share WSC recognition without counting the finisher as an EWGF or scoring it',()=>{
  for(const mode of ['free','wsc','wave10','ewgf20','combo10','rush30','bd10'])for(const side of [1,-1]){
    const a=boot({fx:1});a.store.side=side;a.setMode(mode);
    if(!['free','wsc'].includes(mode)){a.trial.running=true;a.trial.tStart=1000;a.trial.dur=10000;a.trial.target=20;a.trial.dist=0;a.trial.bdCount=0;a.trial.bdTop=0;a.trial.score=0;a.trial.kills=0;a.trial.dashPts=0;}
    const df=wscPrefix(a);const before=JSON.stringify([a.session.tries,a.session.hits,a.session.attempts,a.store.life,a.trial.count,a.trial.score,a.trial.dist,a.store.ach,a.store.records]);
    a.onDir('b',df+7*F);a.onButton(2,df+8*F);
    assert.equal(a.wsc.last.ok,true,mode);assert.equal(a.anim.kind,'wsc',mode);assert.equal(a.get('rTitle').textContent,a.T('wsc.success'),mode);
    assert.equal(JSON.stringify([a.session.tries,a.session.hits,a.session.attempts,a.store.life,a.trial.count,a.trial.score,a.trial.dist,a.store.ach,a.store.records]),before,mode);
    a.tick(2500);assert.equal(a.wsc.session.tries,1);
  }
});
test('WSC practice accepts EWGF, early RP, hellsweep and demon paw with isolated records and an unchanged challenge',()=>{
  for(const move of ['ewgf','pending','hellsweep','tongbal']){
    const a=boot({fx:1});a.setMode('wsc');a.wscStartChallenge();a.tick(4000);
    const before=JSON.stringify([a.session,a.store.life,a.store.ach,a.store.pendingRewards,a.store.records]);
    if(move==='tongbal'){a.onDir('f',5000);a.onDir('n',5020);a.onDir('f',5040);a.onButton(2,5050);}
    else if(move==='pending'){a.onDir('f',5000);a.onDir('n',5010);a.onDir('d',5020);a.onButton(2,5030);a.onDir('df',5030);}
    else{const df=wscPrefix(a,5000);a.onButton(move==='hellsweep'?4:2,df);}
    assert.equal(a.anim.kind,move==='pending'?'ewgf':move,move);assert.equal(a.wsc.active,null,move);assert.equal(a.wsc.session.tries,0,move);assert.equal(a.wsc.challenge.stats.tries,0,move);
    a.tick(7000);assert.equal(a.wsc.session.aborted,0,move);
    assert.equal(JSON.stringify([a.session,a.store.life,a.store.ach,a.store.pendingRewards,a.store.records]),before,move);
  }
});
test('live WSC frame display uses elapsed time, A starts at one, B starts at zero, and completion freezes it',()=>{
  const a=boot();a.setMode('wsc');const df=wscPrefix(a);
  assert.equal(a.get('wscLive').dataset.frame,'1');a.tick(df+4*F);assert.equal(a.get('wscLive').dataset.frame,'5');assert.match(a.get('wscLive').textContent,/A 5f/);
  a.onDir('b',df+7*F);assert.match(a.get('wscLive').textContent,/A 8f.*B 0f/);
  a.tick(df+8*F);assert.match(a.get('wscLive').textContent,/A 8f.*B 1f/);
  a.onButton(2,df+8*F);assert.equal(a.get('wscLive').dataset.frame,'');const text=a.get('wscLive').textContent;a.tick(df+10*F);assert.equal(a.get('wscLive').textContent,text);
  wscPrefix(a,2000);a.tick(2530);assert.equal(a.get('wscLive').dataset.frame,'31');a.resetInput();a.renderWsc();assert.equal(a.get('wscLive').dataset.frame,'');
});
test('WSC challenge defers automatic notices and donation nudges through countdown and running',()=>{
  const a=boot({v:4,lang:'ko'});a.get('nickDlg').open=false;a.setMode('wsc');
  a.practiceInput();a.store.donatePlayMs=a.DONATE_ACTIVE_MS;a.practiceTick();
  assert.equal(a.get('donateNudge').dataset.active,'true');
  a.wscStartChallenge();
  assert.equal(a.get('donateNudge').dataset.active,'false');
  for(const running of [false,true]){
    if(running)a.tick(4000);
    const status=a.wsc.challenge.status;
    assert.equal(a.noticeAutoTry(),false);assert.equal(!!a.get('noticeDlg').open,false);
    assert.equal(a.practiceTick(),false);assert.equal(a.wsc.challenge.status,status);
  }
  a.wscStartChallenge();assert.equal(a.practiceTick(),true);
  assert.equal(a.noticeAutoTry(),true);
});
test('WSC timeline includes frame 15 but never piles later inputs into it',()=>{
  const a=boot();a.setMode('wsc');
  a.wsc.last={a:15,b:2,aRaw:14*F,bRaw:2*F,aOK:false,bOK:false,ok:false,reason:'late',df:1000,
    events:[{t:1000,dir:'df'},{t:1000+14*F,dir:'b'},{t:1000+15*F,btn:2},{t:1000+20*F,btn:1}]};
  a.renderWsc();
  const axis=a.get('wscAxis').innerHTML;
  assert.match(axis,/data-frame="15"><b>←<\/b>15f/);
  assert.doesNotMatch(axis,/RP|LP|15\+/);
  assert.match(a.get('wscAB').innerHTML,/15f/);assert.match(a.get('wscAB').innerHTML,/2f/);
});
test('WSC submits only a completed challenge, retries failure once and remains separate from ordinary trials',async()=>{
  const sent=[];let fail=true;
  const a=boot({nick:'tester',nickToken:'a'.repeat(48),fx:0},async(url,init)=>{
    if(url.endsWith('/submit')){sent.push(JSON.parse(init.body));if(fail)return {ok:false,json:async()=>({error:'server'})};return {ok:true,json:async()=>({rank:1,total:1,improved:true,rows:[],me:null})};}
    return {ok:true,json:async()=>({rows:[],total:0})};
  });
  a.setMode('wsc');a.wscStartChallenge();a.tick(4000);
  for(let i=0;i<9;i++)wscChainRun(a,1,i===4?2:1,5000+i*1000);
  assert.equal(sent.length,0);assert.equal(a.rankingResult(),undefined);
  wscChainRun(a,1,1,14000);await new Promise(setImmediate);
  assert.equal(sent.length,1);assert.equal(a.rankingResult().submit.state,'fail');
  assert.deepEqual(sent[0].detail,{hits:9,target:10,best:5});assert.equal(sent[0].board,'wsc');assert.equal(sent[0].score,9);assert.equal(sent[0].tie,5);
  assert.equal(a.trial.result,null);assert.equal(a.session.tries,0);assert.equal(a.shareSource(),null);
  fail=false;await a.boardSubmit();assert.equal(sent.length,2);assert.equal(a.rankingResult().submit.state,'done');await a.boardSubmit();assert.equal(sent.length,2);
  a.wscStartChallenge();a.tick(17000);a.wscStartChallenge();await a.boardSubmit();assert.equal(sent.length,2,'cancelled challenges never submit');
});
test('completed WSC submissions survive a busy request, mode changes and a new challenge',async()=>{
  const b=backend(), a=boot({nick:'tester',nickToken:'a'.repeat(48)},b.fetch);
  const result=hits=>({completed:true,window:8,rec:{hits,target:10,best:hits}});
  a.setMode('wsc');const first=a.wsc.challenge.result=result(5);a.boardSubmit();
  const second=a.wsc.challenge.result=result(7);a.boardSubmit();a.boardSubmit();
  a.wscStartChallenge();a.setMode('free');
  b.answer('/submit','POST',{rank:1,total:1,rows:[],me:null});await b.flush();
  assert.equal(first.submit.state,'done');
  assert.equal(b.find('/submit','POST')?.body.score,7,'queued payload survives the UI result being replaced');
  b.answer('/submit','POST',{rank:1,total:1,rows:[],me:null});await b.flush();
  assert.equal(second.submit.state,'done');
  assert.equal(b.calls.filter(c=>c.url.includes('/submit')).length,2,'duplicate enqueue is ignored');
});
test('data reset clears the retained WSC ranking result and both sessions from every mode',()=>{
  for(const mode of ['free','wsc']){
    const a=boot(undefined,undefined,{confirm:()=>true});a.setMode(mode);
    a.session.tries=5;a.wsc.session.tries=4;
    a.wsc.challenge={status:'done',stats:{tries:10,hits:8,best:4},result:{completed:true,window:8,rec:{hits:8,target:10,best:4}}};
    a.onDir('f',1000);a.get('dataReset').click();
    assert.equal(a.session.tries,0,mode);assert.equal(a.wsc.session.tries,0,mode);
    assert.equal(a.wsc.challenge.result,undefined,mode);assert.equal(a.history.length,0,mode);
    assert.equal(a.wsc.notice,'ready',mode);
    assert.equal(a.get('dRank').textContent,'',mode);
  }
});
test('WSC queue keeps completed payloads during deletion and drops unsent work on data reset',async()=>{
  for(const reset of [false,true]){
    const b=backend(),a=boot({nick:'tester',nickToken:'a'.repeat(48)},b.fetch,{confirm:()=>true});
    a.board.data.wave10=topRes('tester');const deleting=a.boardDelete();
    a.setMode('wsc');a.wsc.challenge.result={completed:true,window:8,rec:{hits:6,target:10,best:3}};
    a.boardSubmit();a.setMode('free');
    if(reset)a.get('dataReset').click();
    b.answer('/score','DELETE',{rows:[],total:0,me:null});await deleting;await b.flush();
    assert.equal(b.find('/submit','POST')?.body.score,reset?undefined:6);
    if(!reset){b.answer('/submit','POST',{rank:1,total:1,rows:[],me:null});await b.flush();}
  }
});
test('a stale WSC auth failure cannot log out a newly claimed identity or submit its queued results',async()=>{
  const b=backend(),a=boot({nick:'old',nickToken:'a'.repeat(48)},b.fetch);
  a.setMode('wsc');a.wsc.challenge.result={completed:true,window:8,rec:{hits:5,target:10,best:3}};a.boardSubmit();
  const queued=a.wsc.challenge.result={completed:true,window:8,rec:{hits:7,target:10,best:4}};a.boardSubmit();
  a.store.nick='new';a.store.nickToken='b'.repeat(48);
  b.answer('/submit','POST',{error:'auth'},403);await b.flush();
  assert.equal(a.store.nick,'new');assert.equal(a.store.nickToken,'b'.repeat(48));
  assert.equal(b.calls.filter(c=>c.url.includes('/submit')).length,1);
  assert.equal(queued.submit.state,'fail');
  a.boardSubmit();assert.equal(b.find('/submit','POST').body.nick,'new','explicit retry uses the current identity');
  b.answer('/submit','POST',{rank:1,total:1,rows:[],me:null});await b.flush();
});
