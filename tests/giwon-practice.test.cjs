// 기원초 연습 mode: recovery timeline, stats, 10-try challenge, stage feedback.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {html, BANNED, boot, dash, F, fr, giwonRec, giwon, linkAfter, gpBoot, gpAttempt, gpCounters, gpCells} = require('./helpers/app.cjs');
test('기원초 연습 모드는 경직을 프레임 칸으로 그리고 상수에서 목표 칸을 얻는다',()=>{
  const a=gpBoot();
  assert.equal(a.GP_FREE,a.GIWON.ACTIVE_F+a.GIWON.RECOVERY_F+2,'the free frame derives from the constants, not a tuned number');
  assert.equal(a.GP_TARGET,a.GP_FREE+1,'the gold column is the frame the EWGF has to be out by');
  assert.equal(a.GP_FIRE_MAX,a.GP_TARGET-a.GP_FREE);
  assert.equal(a.GP_HIT,a.GIWON.ACTIVE_F+1);
  assert.equal(a.GP_NEAR,a.GIWON.BUFFER_F,'the whole pre-input window stays individual cells');
  assert.ok(a.GP_LAST>a.GP_TARGET,'a late EWGF still lands on the axis');
  assert.equal(a.get('gpPanel').hidden,false);assert.equal(a.get('gpTimeline').hidden,false);
  assert.equal(a.TRIAL_MODES.includes('giwon'),false,'unlimited practice, not a timed trial');
  assert.equal(a.BOARDS.includes('giwon'),true,'only its completed 10-try challenge has a board (결정 31(giwon-board))');
  a.setMode('free');
  assert.equal(a.get('gpPanel').hidden,true);assert.equal(a.get('gpTimeline').hidden,true);
  a.setMode('giwon');
  // the axis covers 1..GP_LAST exactly once, with only the two dead spans collapsed
  const segs=a.gpSegments();
  let next=1;
  for(const g of segs){assert.equal(g.a,next,'no gap or overlap at '+g.a);assert.ok(g.b>=g.a);next=g.b+1;}
  assert.equal(next-1,a.GP_LAST,'the axis ends at GP_LAST');
  assert.deepEqual(Array.from(segs.filter(g=>g.span),g=>[g.span,g.a,g.b]),[['startup',2,a.GP_HIT-1],['rec',a.GP_HIT+1,a.GP_FREE-a.GP_NEAR-1]],'only the startup and the middle of the recovery collapse');
  assert.ok(segs.some(g=>g.a===g.b&&g.a===a.GP_HIT)&&segs.some(g=>g.a===g.b&&g.a===a.GP_TARGET),'the counter frame and the fire target are never swallowed by a span');
  assert.ok(segs.length<=18,'few enough cells to fit the panel without sideways scrolling: '+segs.length); // the browser smoke checks the real width
  const cells=gpCells(a);
  assert.deepEqual([...cells.keys()],Array.from(segs,g=>g.a),'one cell per segment');
  assert.equal(cells.get(1),'mark','the 기원권 sits on cell 1 before anything is pressed');
  assert.equal(cells.get(2),'span','the startup collapses');
  assert.equal(cells.get(a.GP_HIT),'hit');
  assert.equal(cells.get(a.GP_HIT+1),'span rec','and so does the middle of the recovery');
  assert.equal(cells.get(a.GP_FREE-1),'','해제 바로 앞 칸은 선입력 창이 아니다 — 평범한 칸이다 (사용자 확인 2026-09-28)');
  assert.equal(cells.get(a.GP_BUF_B),'buf','the last frame of the pre-input window');
  assert.equal(cells.get(a.GP_BUF_A),'buf','and the window starts here');
  assert.equal(cells.get(a.GP_BUF_A-1),undefined,'one frame earlier is swallowed by the collapsed recovery');
  assert.equal(cells.get(a.GP_FREE),'b','the frame the recovery ends: free to act');
  assert.equal(cells.get(a.GP_TARGET),'a','the EWGF has to be out by the gold cell');
  assert.equal(cells.get(a.GP_TARGET+1),'');assert.equal(cells.get(a.GP_LAST),'');
  // the spans are labelled with the number of frames they swallow, from the constants
  assert.match(a.get('gpAxis').innerHTML,new RegExp(a.T('gp.spanRec',a.GP_FREE-a.GP_NEAR-1-a.GP_HIT)));
  assert.match(a.get('gpAxis').innerHTML,new RegExp(a.T('gp.spanStartup',a.GP_HIT-2)));
});
test('기원초 연습 칸은 경직 해제 기준이라 그려진 목표 칸과 판정 오차가 어긋나지 않는다',()=>{
  const a=gpBoot();giwon(a,1000);
  const r=a.gp.run;
  assert.ok(r,'a 기원권 opens an attempt');
  assert.equal(a.gpCell(r,r.t0),1,'the 기원권 itself is cell 1');
  assert.equal(a.gpCell(r,r.tHit),a.GP_HIT,'the counter contact is the red cell');
  assert.equal(a.gpCell(r,r.tRec),a.GP_FREE);
  for(const off of [-3,-1,0,2,5]) assert.equal(a.gpCell(r,r.tRec+off*F)-a.GP_FREE,off,'cell − free frame is exactly the judged fire offset');
  // inputs are drawn on the cell they were pressed on, even when the buffer carries them out later
  a.onDir('n',1100);a.onDir('f',r.tRec-2*F);
  assert.equal(gpCells(a).get(a.GP_FREE-2),'buf mark','a pre-input is drawn where it was pressed');
});
test('연습 모드 통계는 목표 칸 발동을 따로 세고, 실패는 연속을 끊는다',()=>{
  const a=gpBoot();
  gpAttempt(a,{},1000);                              // out on GP_TARGET
  assert.deepEqual(gpCounters(a.gp.session),{tries:1,hits:1,onTime:1,streak:1,best:1,aborted:0});
  assert.equal(a.gp.last.ok,true);assert.equal(a.gp.last.cell,a.GP_TARGET);assert.equal(a.gp.last.onTime,true);
  assert.equal(a.get('gpResult').textContent,a.T('gp.success'));
  assert.equal(a.get('gpDetail').textContent,a.T('link.ok',a.GP_TARGET));
  gpAttempt(a,{fire:4},5000);                        // late
  assert.deepEqual(gpCounters(a.gp.session),{tries:2,hits:1,onTime:1,streak:0,best:1,aborted:0});
  assert.equal(a.gp.last.cell,a.GP_FREE+4);assert.equal(a.get('gpResult').textContent,a.T('gp.fail'));
  assert.equal(a.get('gpDetail').textContent,a.linkWhy(a.gp.last));
  assert.ok(a.get('gpDetail').textContent.includes(String(a.GP_FREE+4)),'the coach names the frame it came out on');
  gpAttempt(a,{},9000);                              // back on time: best survives a broken streak
  assert.deepEqual(gpCounters(a.gp.session),{tries:3,hits:2,onTime:2,streak:1,best:1,aborted:0});
  // a WGF is never the link, however early it comes out
  gpAttempt(a,{rp:F},13000);
  assert.equal(a.gp.last.ewgf,false);assert.equal(a.gp.last.ok,false);
  assert.equal(a.get('gpDetail').textContent,a.T('link.noEwgf'));
  // the start 6 outside the buffer window is reported, but the verdict still follows the fire frame
  gpAttempt(a,{pre:a.GIWON.BUFFER_F+3},17000);
  assert.equal(a.gp.last.buffered,false);assert.equal(a.gp.last.ok,true);
  // 6N23 takes one frame more than the target allows: graded late without naming the route
  gpAttempt(a,{route:'standard',fire:2},21000);
  assert.equal(a.gp.last.route,'standard');assert.equal(a.gp.last.ok,false);
  assert.equal((a.get('gpRows').innerHTML.match(/<tr>/g)||[]).length,6,'every graded attempt is listed');
  assert.ok(a.get('gpStats').innerHTML.includes('50%'),'3 of 6');
});
test('연습 모드는 이어지지 않은 기원권을 중단으로 남기고 평가 분모에서 뺀다',()=>{
  const a=gpBoot();giwon(a,1000);
  assert.equal(a.gp.notice,'live');assert.ok(a.gp.run);
  a.tick(1000+a.GIWON.LINK_MS+50);
  assert.equal(a.gp.run,null);
  assert.deepEqual(gpCounters(a.gp.session),{tries:0,hits:0,onTime:0,streak:0,best:0,aborted:1},'never graded, only recorded as abandoned');
  assert.equal(a.get('gpResult').textContent,a.T('gp.aborted'));
  assert.equal(a.get('gpDetail').textContent,a.T('gp.abortedNote'));
  assert.equal(a.get('gpRows').innerHTML,'','an abandoned attempt is not a row');
  // 바로 다시 치는 것은 중단이 아니다: 열려 있던 시도를 조용히 넘겨받는다 (사용자 요청 2026-09-27)
  a.onDir('n',3000);giwon(a,3100);
  assert.equal(a.gp.session.aborted,1);
  a.onButton(2,3400);                                           // inside the recovery: no second 기원권, no new attempt
  assert.equal(a.gp.run.t0,3100);assert.equal(a.gp.session.aborted,1);
  giwon(a,4000);                                                // past the recovery: this one replaces the open attempt
  assert.deepEqual(gpCounters(a.gp.session),{tries:0,hits:0,onTime:0,streak:0,best:0,aborted:1},'only the LINK_MS timeout counts as abandoned');
  assert.equal(a.gp.run.t0,4000);assert.equal(a.gp.notice,'live');
  a.tick(4000+a.GIWON.LINK_MS+50);
  assert.equal(a.gp.session.aborted,2,'letting the window run out still counts');
  // every cancel point that clears the link clears the open attempt too
  for(const cancel of [x=>x.resetInput(),x=>x.events.blur(),x=>x.setMode('free')]){
    const b=gpBoot();giwon(b,1000);cancel(b);
    assert.equal(b.gp.run,null);assert.equal(b.gp.session.tries,0);
  }
});
test('연습 모드 라이브 표시는 경직 해제까지 남은 프레임을 센다',()=>{
  const a=gpBoot();
  assert.equal(a.get('gpLive').textContent,a.T('gp.liveReady'));
  giwon(a,1000);const r=a.gp.run;
  a.tick(r.tRec-10*F);
  assert.equal(a.get('gpLive').textContent,a.T('gp.liveWait',10));
  assert.equal(a.get('gpLive').dataset.frame,String(a.GP_FREE-10));
  a.tick(r.tRec);assert.equal(a.get('gpLive').textContent,a.T('gp.liveNow'));
  a.tick(r.tRec+3*F);
  assert.equal(a.get('gpLive').textContent,a.T('gp.livePast',3));
  assert.equal(a.get('gpLive').dataset.frame,String(a.GP_FREE+3));
  a.time(9000);a.renderGpLive(9000);
  assert.equal(a.get('gpLive').dataset.frame,String(a.GP_LAST),'the live cell never runs off the axis');
  linkAfter(a,{t0:1000});
  assert.equal(a.get('gpLive').textContent,a.T('gp.liveDone'));
});
test('연습 모드는 판정을 바꾸지 않고 초풍 통계도 막지 않는다',()=>{
  const free=boot();giwon(free,1000);
  assert.equal(free.gp.run,null,'other modes open no practice attempt');
  assert.equal(free.gp.session.tries,0);
  const a=gpBoot();const r=gpAttempt(a,{start:0});
  assert.equal(r.kind,'ewgf');assert.equal(r.fastest,true);assert.equal(r.inputRoute,'mist');
  assert.equal(a.session.tries,1,'unlike wsc, the follow-up EWGF is a real EWGF and still counts');
  assert.equal(a.session.hits,1);assert.equal(a.store.life.ewgf,1);
  assert.equal(a.store.life.giwon,1,'and the 기원권 keeps its own lifetime counter');
  assert.ok(r.giwonLink,'and it carries the link verdict');
  // the other moves are judged here exactly as everywhere else
  const b=gpBoot();b.onDir('f',1000);b.onDir('n',1020);b.onDir('f',1040);b.onButton(2,1060);
  assert.equal(b.store.life.tongbal,1);assert.equal(b.gp.session.tries,0,'통발 opens no practice attempt');
  const c=gpBoot();dash(c);c.onButton(4,1070);
  assert.equal(c.store.life.hellsweep,1);assert.equal(c.gp.run,null);
});
test('연습 모드 문구는 세 언어에 있고 언어 전환에 다시 그린다',()=>{
  const a=gpBoot();gpAttempt(a,{fire:4});
  for(const key of ['mode.giwon.name','mode.giwon.desc','hint.giwon',...Object.keys(a.I18N.ko).filter(k=>k.startsWith('gp.'))]){
    for(const lang of ['ko','en','ja']) assert.notEqual(a.I18N[lang][key],undefined,lang+' is missing '+key);
    assert.doesNotMatch(String(a.I18N.ko[key]),BANNED,key);
  }
  for(const lang of ['ko','en','ja']){
    a.setLang(lang);
    assert.equal(a.get('gpResult').textContent,a.I18N[lang]['gp.fail'],lang+': the last result is redrawn');
    assert.ok(a.get('gpGuide').textContent.includes(String(a.GP_TARGET)),lang+': the guide reads the constants');
    assert.ok(a.get('gpGuide').textContent.includes(String(a.GIWON.RECOVERY_F)),lang);
    assert.ok(a.get('gpLegend').textContent.includes(String(a.GP_HIT)),lang);
    assert.ok(a.get('gpStats').innerHTML.includes(a.I18N[lang]['gp.onTime'](a.GP_TARGET)),lang);
    assert.ok(a.get('gpAB').innerHTML.includes(a.I18N[lang]['gp.startLabel']),lang);
    assert.equal(a.get('gpDetail').textContent,a.linkWhy(a.gp.last),lang);
    assert.ok(a.get('gpAB').innerHTML.includes(a.I18N[lang]['gp.fireLabel']),lang+': the fire frame is the graded box');
    assert.ok(a.get('gpAB').innerHTML.includes(a.I18N[lang]['gp.nLabel']),lang+': the neutral stays as a reference');
    assert.ok(a.get('gpAB').innerHTML.includes(String(a.GIWON.BUFFER_F)),lang+': the 시작 6 box names the buffer window');
  }
});
test('기원권 모션은 어퍼컷이 아니라 돌아 나가는 라이트 훅이다',()=>{
  const a=boot();a.anim.t0=0;
  const poseOf=(kind,t)=>{a.anim.kind=kind;return a.poseAt(t);};
  const crouchDash=poseOf('cd',100),sweep=poseOf('hellsweep',150),straight=poseOf('tongbal',150);
  a.anim.kind='giwon';const p=t=>a.poseAt(t),phases=[0,30,54,80,120,149,200,280,400,530].map(p);
  assert.ok(crouchDash.crouch>0.8&&sweep.crouch>0.8,'the crouching moves really do sink');
  assert.ok(phases.every(x=>x.crouch<=0.26),'the hook stays tall: the sink is what read as an uppercut');
  assert.ok(phases.every(x=>x.sink===undefined&&x.sweep===undefined),'no lift and no spin either');
  assert.ok(p(30).armR<p(0).armR,'the shoulder cocks back first');
  assert.ok(p(60).reach>0&&p(120).reach>p(60).reach&&p(200).reach>p(120).reach,'then the fist travels forward');
  assert.ok(Math.max(...phases.map(x=>x.armR))>p(280).armR,'it overshoots the hold and settles back: a whip, not a lift');
  assert.ok(phases.slice(0,8).every(x=>x.armL<-50),'the back glove stays tucked at the chin the whole way');
  assert.ok(p(200).step>p(0).step,'the body steps in behind it');
  assert.ok(p(200).reach<straight.reach&&p(200).step<straight.step,'a bent-elbow hook, much shorter than the 통발 straight');
  assert.equal(p(560).reach,undefined,'back to idle after the recovery');
});
test('기원권 경직은 걷기·대시·기술을 막고 마지막 BUFFER_F의 버튼 하나만 버퍼한다',()=>{
  const rec=a=>giwonRec(a,1000), buf=a=>rec(a)-a.GIWON.BUFFER_F*F;
  // pressed before the buffer window: dropped outright, and the link is still waiting
  const drop=giwon(boot());drop.onDir('n',1100);
  drop.onButton(2,buf(drop)-F);
  drop.tick(rec(drop)+F);
  assert.equal(drop.session.attempts.length,0,'no attempt came out of a swallowed button');
  assert.equal(drop.store.life.giwon,1,'and no second 기원권 either: the recovery cannot be cancelled');
  assert.equal(drop.session.tries,0);
  // pressed inside the buffer window: held back, then judged on the recovery-end frame
  const b=giwon(boot());b.onDir('n',1100);
  const at=rec(b)-2*F;
  b.onDir('f',at-2*F);b.onButton(2,at);       // the start 6 is pre-input; the RP waits in the buffer
  assert.equal(b.session.attempts.length,0,'nothing while the recovery runs');
  b.tick(rec(b)-F);
  assert.equal(b.session.attempts.length,0,'not one frame early');
  b.tick(rec(b)+50);
  assert.equal(b.session.attempts.length,1,'the buffered button fires once the recovery is over');
  assert.equal(b.session.attempts[0].t,at,'judged at the time it was actually pressed, not when the tick ran');
  // 방향 중에 경직을 넘는 것은 시작 6뿐이다: 경직 중에 푼 중립도 대각도 커맨드를 잇지 못한다
  const half=giwon(boot());half.onDir('n',1100);
  half.onDir('f',rec(half)-5*F);half.onDir('n',rec(half)-4*F);half.onDir('df',rec(half)-3*F);
  assert.equal(half.cd.state,1,'the command is still sitting on the pre-input start 6');
  // one slot, and the last press overwrites it: several commands do not all come out
  const one=giwon(boot());one.onDir('n',1100);
  one.onButton(2,buf(one)+F);one.onButton(2,buf(one)+2*F);
  one.tick(rec(one));
  assert.equal(one.session.attempts.length,1,'the buffer holds one button, not a queue');
  const over=giwon(boot());over.onDir('n',1100);
  over.onDir('f',buf(over)-2*F);
  over.onButton(4,buf(over)+F);over.onButton(2,buf(over)+2*F);   // two requests, one slot: only the last survives
  over.tick(rec(over)+50);
  assert.equal(over.store.life.hellsweep,0,'the overwritten 4 never came out');
  assert.equal(over.session.attempts.length,1,'only the button that was in the slot last');
  // nothing moves during the recovery either (walking is checked in the browser smoke)
  const m=giwon(boot());m.onDir('n',1100);
  m.onDir('b',1200);m.onDir('n',1220);m.onDir('b',1240);
  assert.equal(m.anim.kind,'giwon','a b,N,b inside the recovery starts no backdash');
  assert.ok(m.bdRec.until<1240,'and opens no backdash recovery');
  assert.equal(m.session.dashes,0);
  const free=rec(m)+20;
  m.time(free);m.onDir('n',free);m.onDir('b',free+20);m.onDir('n',free+40);m.onDir('b',free+60);
  assert.equal(m.anim.kind,'backdash','once the recovery is over a b,N,b comes out again');
  // the frame the recovery ends is already free
  const after=giwon(boot());after.onDir('n',1100);
  after.onButton(2,rec(after));
  assert.equal(after.session.attempts.length,1,'a button on the recovery-end frame is judged straight away');
  // every cancel point drops the buffered button with the link
  for(const cancel of [x=>x.resetInput(),x=>x.events.blur(),x=>x.setMode('ewgf20')]){
    const c=giwon(boot());c.onDir('n',1100);c.onButton(2,buf(c)+F);
    cancel(c);c.setMode('free');c.tick(rec(c)+200);
    assert.equal(c.session.attempts.length,0,'a cancelled recovery never replays its button');
  }
  // the practice panel is the only place a dropped button is reported
  const g=gpBoot();giwon(g,1000);g.onDir('n',1100);
  g.onButton(2,buf(g)-F);
  assert.equal(g.gp.notice,'eaten');
  assert.equal(g.get('gpResult').textContent,g.T('gp.eaten'));
  assert.equal(g.gp.run.t0,1000,'the attempt is still open: the link window has not closed');
  assert.equal(g.gp.session.tries,0);
});
test('묶은 칸은 덮는 시간만큼 넓고 프레임 눈금과 진행 표시를 갖는다',()=>{
  const a=gpBoot(), html=a.get('gpAxis').innerHTML;
  const startup=html.match(/class="wsc-cell span" data-frame="2" data-to="(\d+)" data-label="([^"]*)" style="--n:(\d+)"/);
  assert.ok(startup,html.slice(0,240));
  assert.equal(Number(startup[1]),a.GP_HIT-1);
  assert.equal(startup[2],a.T('gp.spanStartup',a.GP_HIT-2),'the label says how many frames it swallowed');
  assert.equal(Number(startup[3]),a.GP_HIT-2,'--n draws one tick per frame inside the cell');
  const recovery=html.match(/class="wsc-cell span rec" data-frame="(\d+)" data-to="(\d+)" data-label="([^"]*)" style="--n:(\d+)"/);
  assert.ok(recovery,html.slice(0,400));
  assert.equal(Number(recovery[1]),a.GP_HIT+1);assert.equal(Number(recovery[2]),a.GP_FREE-a.GP_NEAR-1);
  assert.equal(recovery[3],a.T('gp.spanRec',Number(recovery[4])));
  assert.equal(Number(recovery[4]),a.GP_FREE-a.GP_NEAR-1-a.GP_HIT);
  // 폭은 축의 grid-template-columns가 갖는다: 판정하는 프레임은 1fr, 묶은 칸은 덮는 시간만큼 넓다
  const segs=a.gpSegments(), cols=a.get('gpAxis').style['grid-template-columns'].split(' ').map(x=>Number(x.match(/([\d.]+)fr/)[1]));
  assert.equal(cols.length,segs.length,'one column per segment');
  const wStart=cols[segs.findIndex(s=>s.span==='startup')], wRec=cols[segs.findIndex(s=>s.span==='rec')];
  assert.ok(wRec>wStart,'the longer span is the wider cell: time reads as width');
  segs.forEach((s,i)=>{ if(!s.span) assert.equal(cols[i],1,'a judged frame is one column wide'); });
  // a single frame is a plain cell with no width override, and its label is the frame number
  assert.match(html,new RegExp('data-frame="'+a.GP_TARGET+'" data-to="'+a.GP_TARGET+'" data-label="'+a.GP_TARGET+'f"><b>'));
  for(const lang of ['ko','en','ja']){
    a.setLang(lang);
    assert.match(a.get('gpAxis').innerHTML,new RegExp(a.I18N[lang]['gp.spanRec'](a.GP_FREE-a.GP_NEAR-1-a.GP_HIT).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),lang);
  }
});
test('축 위 구간 이름이 선입력 창·중립·공격 칸을 정확히 가리킨다',()=>{
  const a=gpBoot(), segs=a.gpSegments(), col=f=>segs.findIndex(s=>f>=s.a&&f<=s.b)+1;
  const html=a.get('gpAxis').innerHTML;
  for(const [cls,key,x,y] of [['buf','gp.bandBuf',a.GP_BUF_A,a.GP_BUF_B],
                              ['free','gp.bandFree',a.GP_FREE,a.GP_FREE],
                              ['fire','gp.bandFire',a.GP_TARGET,a.GP_TARGET]]){
    const m=html.match(new RegExp('<u class="gp-band '+cls+'" style="grid-column:(\\d+)/(\\d+)">([^<]*)</u>'));
    assert.ok(m,cls+' band missing: '+html.slice(0,200));
    assert.equal(Number(m[1]),col(x),cls+' starts on the right column');
    assert.equal(Number(m[2]),col(y)+1,cls+' ends on the right column');
    assert.equal(m[3],a.T(key));
  }
  const buf=html.match(/gp-band buf" style="grid-column:(\d+)\/(\d+)/);
  assert.equal(Number(buf[2])-Number(buf[1]),a.GP_BUF_B-a.GP_BUF_A+1,'선입력 띠는 창 전체를 덮는다');
  for(const lang of ['ko','en','ja']){
    a.setLang(lang);
    for(const key of ['gp.bandBuf','gp.bandFree','gp.bandFire'])
      assert.match(a.get('gpAxis').innerHTML,new RegExp('>'+a.I18N[lang][key]+'<'),lang+' '+key);
  }
});
test('경직의 끝은 60Hz 칸으로 본다: GP_FREE 칸에 들어온 중립은 버려지지 않는다',()=>{
  // 사용자 보고 2026-09-28: 그려진 48f 칸에 중립을 넣어도 실패하고 한 칸 늦게 넣어야 성공했다.
  // 원인은 경직 판단만 원시 시각(t < tRec)이어서 그 칸의 앞쪽 절반이 경직으로 버려진 것.
  for(const off of [-8, -4, -1, 0, 4, 8]){       // GP_FREE 칸 안에서 tRec 앞뒤로 흔들어도 결과는 같아야 한다
    const a=gpBoot(), t0=1000, tRec=t0+(a.GP_FREE-1)*F;
    a.onDir('df',t0); a.onButton(2,t0);          // 기원권
    a.onDir('n',t0+100);                         // ↘를 놓는다
    a.onDir('f',tRec-5*F);                       // 시작 6: 선입력 창(-5f)
    a.onDir('n',tRec+off*.5);                    // 중립: 그려진 칸은 GP_FREE 하나뿐
    a.onDir('d',tRec+F); a.onDir('df',tRec+F); a.onButton(2,tRec+F);
    a.tick(tRec+6*F);
    const link=a.session.attempts.at(-1).giwonLink, r=a.gp.last;
    assert.equal(a.gpCell(r,tRec+off*.5),a.GP_FREE,'off='+off+': 중립이 그려지는 칸');
    assert.equal(link.n,0,'off='+off+': 중립 오차 0f');
    assert.ok(link.ewgf&&a.linkOk(link),'off='+off+': '+a.linkWhy(link));
  }
});
test('기원초 성공 팝은 초풍이 아니라 기원초이고, 연속은 기존 N초를 그대로 쓴다',()=>{
  const a=gpBoot();
  gpAttempt(a,{},1000);
  assert.equal(a.pops.at(-1).text,a.T('pop.giwoncho'),'첫 성공은 기원초');
  const late=boot(); late.setMode('giwon'); gpAttempt(late,{fire:4},1000);
  assert.equal(late.pops.at(-1).text,late.T('pop.mistEwgf'),'연결하지 못한 초풍은 원래 루트 표기 그대로');
  gpAttempt(a,{},4000);   // 같은 연속 안의 두 번째 성공
  assert.equal(a.pops.at(-1).text,a.T('pop.streak',2),'연속 2회부터는 기존 N초 표기 (결정 27(mist)과 같은 규칙)');
  for(const lang of ['ko','en','ja']) assert.ok(a.I18N[lang]['pop.giwoncho'],lang);
});
test('기원초 성공은 팡파르와 폭죽을 내고, 연출 끄기에서는 소리만 남는다',()=>{
  const a=gpBoot();
  gpAttempt(a,{},1000);
  const sparks=a.sparks.length, rings=a.impacts.length;
  assert.ok(sparks>40,'폭죽과 색종이가 함께 뿌려진다: '+sparks);
  assert.ok(rings>=3,'폭죽 고리 세 발: '+rings);
  assert.ok(a.impacts.some(p=>p.t0>a.impacts[0].t0),'고리는 시차를 두고 터진다');
  const off=boot(); off.setMode('giwon'); off.store.fx=0;
  off.sparks.length=0; off.impacts.length=0;
  gpAttempt(off,{},1000);
  assert.equal(off.sparks.length,0,'연출 끄기에서는 파티클이 없다');
  assert.equal(off.impacts.length,0);
  assert.ok(off.gp.last.ok,'그래도 판정은 성공 그대로');
});
test('challenge countdown stays at three when an animation timestamp predates its click',()=>{
  for(const mode of ['wsc','giwon']){
    const a=boot();a.setMode(mode);
    if(mode==='wsc') a.wscStartChallenge();else a.gpStartChallenge();
    const c=mode==='wsc'?a.wsc.challenge:a.gp.challenge;
    a.tick(c.startAt-3001);
    assert.equal(c.remaining,3,mode+' must not display a fourth second');
    a.tick(c.startAt-1000);assert.equal(c.remaining,1);
    a.tick(c.startAt);assert.equal(c.status,'running');
  }
});
test('기원초 10회 도전은 평가된 시도만 세고, 완주하면 등록할 결과를 만든다',()=>{
  const a=gpBoot();
  assert.equal(a.gp.challenge.status,'idle');
  a.gpStartChallenge();
  assert.equal(a.gp.challenge.status,'countdown');
  a.gpTick(a.gp.challenge.startAt-1500);
  assert.equal(a.gp.challenge.status,'countdown','카운트다운 중에는 아직 시작하지 않는다');
  a.gpTick(a.gp.challenge.startAt);
  assert.equal(a.gp.challenge.status,'running');
  let t=20000;
  for(let i=0;i<a.GP_CHALLENGE;i++){ gpAttempt(a,i%3===0?{fire:4}:{},t); t+=3000; }
  const c=a.gp.challenge;
  assert.equal(c.status,'done');
  assert.equal(c.stats.tries,a.GP_CHALLENGE);
  assert.equal(c.stats.hits,a.GP_CHALLENGE-Math.ceil(a.GP_CHALLENGE/3),'늦은 초풍은 실패로 센다');
  assert.ok(c.stats.best>=1&&c.stats.best<a.GP_CHALLENGE);
  assert.equal(a.gp.session.tries,a.GP_CHALLENGE,'세션 통계도 같이 쌓인다');
  assert.deepEqual(JSON.parse(JSON.stringify(c.result.rec)),{hits:c.stats.hits,target:a.GP_CHALLENGE,best:c.stats.best},'완주 결과가 기원초 보드로 간다 (결정 31(giwon-board))');
  assert.equal(a.rankingResult(),c.result);
  assert.deepEqual(JSON.parse(JSON.stringify(a.boardEntry(c.result,'giwon'))),{board:'giwon',win:c.result.window,lang:a.store.lang,score:c.stats.hits,tie:c.stats.best,detail:{hits:c.stats.hits,target:a.GP_CHALLENGE,best:c.stats.best}});
  assert.equal(a.boardEntry({completed:false,rec:c.result.rec},'giwon'),null,'미완주는 등록하지 않는다');
  assert.equal(a.boardEntry({completed:true,rec:{...c.result.rec,target:9}},'giwon'),null);
});
test('기원초 도전은 중단을 분모에서 빼고, 모드를 벗어나면 취소된다',()=>{
  const a=gpBoot();
  a.gpStartChallenge(); a.gpTick(a.gp.challenge.startAt);
  giwon(a,1000); a.tick(1000+a.GIWON.LINK_MS+50);   // 잇지 않은 기원권 = 중단
  assert.equal(a.gp.session.aborted,1);
  assert.equal(a.gp.challenge.stats.tries,0,'중단은 도전 분모에 들어가지 않는다');
  gpAttempt(a,{},5000);
  assert.equal(a.gp.challenge.stats.tries,1);
  a.setMode('free');
  assert.equal(a.gp.challenge.status,'cancelled','모드를 벗어나면 도전이 끝난다');
});
test('기원초 성공과 늦은 초풍은 더미 반응이 다르고, 성공은 화면까지 터뜨린다',()=>{
  const land=(opts)=>{ // 한 번의 기원권 → 이어지는 초풍 → 더미가 날아가기 시작하는 순간
    const a=boot();a.store.fx=1;a.world.charX=120;a.world.dummyX=190;
    Object.assign(a.world.dummy,{alive:true,hit:0,type:null,y:0});
    a.time(1000);giwon(a,1000);
    a.updateDummy(1000+a.HIT_CONTACT_MS.giwon+1);          // 기원권 카운터: 제자리 배잡기
    const r=linkAfter(a,opts), d=a.world.dummy;
    assert.ok(d.hit&&d.launchAt,'the bag is still waiting to be launched when the link is judged');
    const power=d.power;
    d.crumpleUntil=0;a.sparks.length=0;
    a.updateDummy(d.launchAt+1);
    return {power, vy:d.vy, vx:Math.abs(d.vx), spin:d.spin, sparks:a.sparks.length, ok:a.linkOk(r.giwonLink)};
  };
  const hit=land({}), slow=land({fire:4});
  assert.equal(hit.ok,true);assert.equal(hit.power,'link');
  assert.equal(slow.ok,false);assert.equal(slow.power,'weak');
  assert.ok(hit.vy<slow.vy*2,'the linked EWGF launches the bag far higher: '+JSON.stringify([hit.vy,slow.vy]));
  assert.ok(hit.vx>slow.vx*3,'and much further');
  assert.ok(hit.spin>slow.spin*2,'spinning instead of tipping over');
  assert.ok(hit.sparks>slow.sparks*4,'a burst instead of a puff: '+JSON.stringify([hit.sparks,slow.sparks]));
  // 연출 전용이다: 판정·통계는 그대로
  const plain=boot();plain.store.fx=1;linkAfter(giwon(plain),{});
  assert.equal(plain.session.hits,1);assert.ok(!plain.world.dummy.power,'no dummy in reach, no power flag');
});
test('같은 더미에 기원권을 두 번 맞히면 배잡기가 풀리고 살살 날아간다',()=>{
  const a=boot();a.store.fx=1;a.world.charX=120;a.world.dummyX=190;
  Object.assign(a.world.dummy,{alive:true,hit:0,type:null,y:0});
  a.time(1000);giwon(a,1000);
  const d=a.world.dummy, hitAt=d.launchAt;
  a.updateDummy(hitAt+1);
  assert.ok(d.crumpleUntil>0&&d.y===0,'the first 기원권 folds the bag in place');
  assert.equal(d.power,null,'and nothing has been graded yet');
  a.onDir('n',1900);a.time(1900);giwon(a,1900);                 // 경직이 풀린 뒤의 두 번째 기원권: 연결에 실패했다는 뜻이다
  assert.equal(d.crumpleUntil,0,'the second one is a failed link, so the bag is let go');
  assert.equal(d.power,'weak','and it leaves with the soft reaction');
  a.updateDummy(d.launchAt+1);
  assert.ok(d.y<0&&d.vy>-3,'it barely lifts: '+JSON.stringify({y:d.y,vy:d.vy}));
  assert.ok(Math.abs(d.vx)<1,'and hardly travels');
  assert.equal(a.store.life.giwon,2,'both 기원권 still count as moves');
  // 그리고 그것은 새 시도가 아니다: 연습 모드의 타임라인은 처음부터 다시 돌지 않는다
  const g=gpBoot();g.store.fx=1;g.world.charX=120;g.world.dummyX=190;
  Object.assign(g.world.dummy,{alive:true,hit:0,type:null,y:0});
  g.time(1000);giwon(g,1000);g.updateDummy(g.world.dummy.launchAt+1);
  const run=g.gp.run;assert.ok(run,'the first 기원권 opens an attempt');
  g.onDir('n',1900);g.time(1900);giwon(g,1900);                 // 배잡기 중인 같은 더미를 또 친다
  assert.equal(g.gp.run,run,'the open attempt is untouched: the timeline does not replay');
  assert.equal(g.gp.session.tries,0);assert.equal(g.gp.session.aborted,0);
  // 더미가 날아가 다시 서면 그때부터가 새 시도다
  g.world.dummy.alive=true;g.world.dummy.hit=0;g.world.dummy.y=0;g.world.dummy.crumpleUntil=0;g.world.dummy.move=null;
  g.tick(1900+g.GIWON.LINK_MS+50);
  g.onDir('n',6000);g.time(6100);giwon(g,6100);
  assert.notEqual(g.gp.run,run,'a fresh bag opens a fresh attempt');
  assert.equal(g.gp.run.t0,6100);
  // 사거리 밖이거나 이미 날아간 뒤에는 관여하지 않는다
  const b=boot();b.world.charX=120;b.world.dummyX=190;
  Object.assign(b.world.dummy,{alive:true,hit:0,type:null,y:0});
  b.time(1000);giwon(b,1000);b.updateDummy(b.world.dummy.launchAt+1);
  b.world.dummy.crumpleUntil=0;b.world.dummy.hit=0;b.world.dummy.alive=false;
  b.onDir('n',1900);b.time(1900);giwon(b,1900);
  assert.ok(!b.world.dummy.power,'no bag, no reaction flag');
});
test('경직 게이지는 해제까지 채워지고 해제 뒤 짧게 남았다가 스스로 사라진다',()=>{
  const a=boot();
  const calls=[];const g=new Proxy({},{get:(_,k)=>{ if(k==='save'||k==='restore'||k==='beginPath'||k==='fill'||k==='stroke'||k==='roundRect'||k==='arc'||k==='moveTo'||k==='lineTo') return ()=>calls.push(k);
    if(k==='fillRect') return (x,y,w)=>calls.push('fillRect:'+Math.round(w)); return undefined; },set:()=>true});
  a.drawStiffGauge(g,0,0,1000);
  assert.equal(calls.length,0,'nothing is drawn before a 기원권');
  giwon(a,1000);const rec=giwonRec(a,1000);
  a.drawStiffGauge(g,0,0,1000+1);
  const early=calls.filter(c=>c.startsWith('fillRect:')).map(c=>Number(c.split(':')[1]));
  assert.equal(early[0],a.STIFF_BAR.w,'the track is full width');
  assert.ok(early[1]<3,'and the fill starts empty: '+early[1]);
  calls.length=0;a.drawStiffGauge(g,0,0,rec-2*F);
  const late=calls.filter(c=>c.startsWith('fillRect:')).map(c=>Number(c.split(':')[1]));
  assert.ok(late[1]>a.STIFF_BAR.w*0.9,'nearly full one frame before the release: '+late[1]);
  calls.length=0;a.drawStiffGauge(g,0,0,rec+40);
  assert.ok(calls.includes('arc'),'the release is marked with a ring');
  calls.length=0;a.drawStiffGauge(g,0,0,rec+a.STIFF_BAR.flashMs+1);
  assert.equal(calls.length,0,'and the gauge clears itself afterwards');
  // 앵커는 서 있는 더미를 따라가다가, 더미가 뜨면 캐릭터 위로 튀지 않고 그 자리에 남는다
  const c=boot();c.world.charX=120;c.world.dummyX=190;
  Object.assign(c.world.dummy,{alive:true,hit:0,type:null,y:0});
  c.time(1000);giwon(c,1000);
  c.stiffAnchor();
  const anchored=c.stiffAnchor().ax;
  assert.equal(anchored,c.world.dummyX,'the gauge sits over the bag');
  c.world.dummy.y=-40;                    // 더미가 떠오른다
  assert.equal(c.stiffAnchor().ax,anchored,'and stays there instead of jumping to the fighter');
  c.world.dummy.alive=false;
  assert.equal(c.stiffAnchor().ax,anchored,'even once the bag is gone');
  // 칠 더미가 아예 없으면 캐릭터 위에 한 번만 자리를 잡는다
  const n=boot();n.world.dummy.alive=false;n.time(1000);giwon(n,1000);
  assert.equal(n.stiffAnchor().ax,n.world.charX,'no bag, so it sits over the fighter');
  // 취소 지점에서는 바로 사라진다
  const b=boot();giwon(b,1000);b.resetInput();
  calls.length=0;b.drawStiffGauge(g,0,0,1200);
  assert.equal(calls.length,0,'a cancelled recovery takes the gauge with it');
});
test('아직 서 있는 더미를 다시 칠 때 직전 판정과 눈금이 남는다',()=>{
  const a=gpBoot();
  gpAttempt(a,{fire:4},1000);
  const first=a.gp.last, marks=gpCells(a);
  assert.equal(first.ok,false);assert.equal(a.get('gpResult').textContent,a.T('gp.fail'));
  giwon(a,5000);                                   // 같은 흐름에서 바로 다음 기원권
  assert.equal(a.gp.last,first,'the verdict panel still shows what was just read');
  assert.equal(a.get('gpResult').textContent,a.T('gp.fail'));
  assert.equal(a.get('gpDetail').textContent,a.linkWhy(first));
  assert.deepEqual(gpCells(a),marks,'and the axis keeps the previous marks until the new attempt has an input');
  assert.equal(a.gp.session.aborted,0,'re-hitting is not an abandoned attempt');
  a.onDir('n',5100);                               // 첫 입력이 들어오면 새 시도로 넘어간다
  assert.notDeepEqual(gpCells(a),marks,'the new attempt takes the axis over');
  // 이어지지 않고 버려진 시도는 그대로 중단으로 남는다
  a.tick(5000+a.GIWON.LINK_MS+50);
  assert.equal(a.gp.session.aborted,1);assert.equal(a.get('gpResult').textContent,a.T('gp.aborted'));
  giwon(a,9000);
  assert.equal(a.gp.session.aborted,1,'the abandoned record is kept, not rewritten');
  assert.ok(a.gp.last&&a.gp.last.aborted,'and it is still the last attempt');
});
test('기원초 연습은 더미 한 개를 항상 사거리 안에 세워 둔다',()=>{
  const a=gpBoot();
  a.world.charX=200;a.world.dummyX=900;Object.assign(a.world.dummy,{alive:true,hit:0,type:null,y:0});
  a.updateDummy(1000);
  assert.equal(a.world.dummyX,200+a.GP_DUMMY_PX,'parked in front of the character instead of the random far distance');
  a.world.charX=264;a.updateDummy(1016);
  assert.equal(a.world.dummyX,264+a.GP_DUMMY_PX,'and it follows the small steps the moves take');
  a.store.side=-1;a.updateDummy(1032);
  assert.equal(a.world.dummyX,264-a.GP_DUMMY_PX,'2P side too');
  a.store.side=1;a.updateDummy(1048);
  a.time(2000);
  assert.equal(a.tryHit('giwon'),true,'which puts it inside 기원권 reach every time');
  // it stays exactly one bag: knocked, then back in front after the short respawn
  const d=a.world.dummy;
  let landed=0;
  for(let t=2000;t<6000&&!landed;t+=16){ a.updateDummy(t); if(!d.alive) landed=t; }
  assert.ok(landed,'the bag lands');
  assert.equal(Math.round(d.respawn-landed),a.GP_DUMMY_MS,'a short respawn so the next rep has a target');
  a.updateDummy(d.respawn+1);
  assert.equal(d.alive,true);assert.equal(a.world.dummyX,a.world.charX+a.GP_DUMMY_PX);
  // other modes keep the random far bag
  const b=boot();b.world.charX=200;b.world.dummyX=900;Object.assign(b.world.dummy,{alive:true,hit:0,type:null,y:0});
  b.updateDummy(1000);
  assert.equal(b.world.dummyX,900,'free practice leaves the bag where it stands');
  // and rush30 targets are untouched by the practice-mode parking
  const c=boot();c.setMode('rush30');c.world.charX=200;c.world.dummyX=700;
  Object.assign(c.world.dummy,{alive:true,hit:0,type:'mid',y:0});
  c.updateDummy(1000);
  assert.equal(c.world.dummyX,700);
});
test('기원권 경직 중 ↘에서 6으로 미끄러진 시작 6도 선입력으로 남는다',()=>{
  // ↘를 뗄 때 중립을 거치지 않고 6으로 미끄러지는 것은 경직 중 6을 잡아 두는 가장 흔한 손이다
  for(const via of [[],['n']]){
    const a=gpBoot();a.store.fx=0;a.time(1000);giwon(a,1000);
    if(via.length) a.onDir('n',1000+10*F);
    const rec=giwonRec(a,1000);
    a.time(rec-5*F);a.onDir('f',rec-5*F);
    a.time(rec);a.onDir('n',rec);
    a.time(rec+F);a.onDir('d',rec+F);a.onDir('df',rec+F+1);a.onButton(2,rec+F+2);
    assert.equal(a.store.life.giwon,1,'the follow-up is an EWGF, not a second 기원권 ('+(via.join()||'slide')+')');
    assert.ok(a.gp.last&&a.gp.last.ok&&a.gp.last.cell===a.GP_TARGET,JSON.stringify(a.gp.last&&{ok:a.gp.last.ok,cell:a.gp.last.cell}));
  }
});
test('버퍼된 버튼은 해제 칸의 첫 입력보다 먼저 나간다',()=>{
  const a=giwon(boot());a.onDir('n',1100);
  const rec=giwonRec(a,1000), slotStart=(a.frameSlot(rec)-0.5)*F;
  a.onButton(2,rec-2*F);                          // buffered
  a.time(slotStart+1);a.onButton(2,slotStart+1);  // the release slot has started, raw tRec has not
  assert.equal(a.session.attempts.length,2,'both buttons were judged');
  assert.equal(a.session.attempts[0].t,rec-2*F,'the buffered one first, at its own press time');
});
test('재타격 기원권 뒤의 초풍은 앞 시도의 눈금에 기록되지 않고 그 시도를 중단으로 닫는다',()=>{
  const g=gpBoot();g.store.fx=1;g.world.charX=120;g.world.dummyX=190;
  Object.assign(g.world.dummy,{alive:true,hit:0,type:null,y:0});
  g.time(1000);giwon(g,1000);g.updateDummy(g.world.dummy.launchAt+1);
  const run=g.gp.run;
  g.onDir('n',1900);g.time(1900);giwon(g,1900);   // rehit: no new run
  assert.equal(g.gp.run,run);
  const rec=giwonRec(g,1900);
  g.onDir('n',2000);g.onDir('f',rec-3*F);g.onDir('n',rec);g.onDir('d',rec+F);g.onDir('df',rec+F+1);g.time(rec+F+2);g.onButton(2,rec+F+2);
  assert.equal(g.gp.run,null,'the stale run is closed');
  assert.equal(g.gp.session.tries,0,'and not graded against the other 기원권');
  assert.equal(g.gp.session.aborted,1);
});
test('기원초 10회 도전 중에는 보상 상자·후원 말풍선·자동 공지가 끼어들지 않는다',()=>{
  const a=gpBoot();a.store.pendingRewards.push({kind:'ach',id:'x',at:0,day:1});
  a.renderRewards();assert.equal(a.get('rewardOpen').disabled,false,'claimable while idle');
  a.gpStartChallenge();
  assert.equal(a.gp.challenge.status,'countdown');
  assert.equal(a.get('rewardOpen').disabled,true,'held during the challenge');
});
test('기원초 10회는 완주만 자동 등록하고, 실패는 재시도하며, 취소한 도전은 보내지 않는다',async()=>{
  const sent=[];let fail=true;
  const a=boot({nick:'tester',nickToken:'a'.repeat(48),fx:0},async(url,init)=>{
    if(url.endsWith('/submit')){sent.push(JSON.parse(init.body));if(fail)return {ok:false,json:async()=>({error:'server'})};return {ok:true,json:async()=>({rank:1,total:1,improved:true,rows:[],me:null})};}
    return {ok:true,json:async()=>({rows:[],total:0})};
  });
  a.setMode('giwon');a.gpStartChallenge();a.gpTick(a.gp.challenge.startAt);
  let t=20000;
  for(let i=0;i<a.GP_CHALLENGE-1;i++){ gpAttempt(a,i===4?{fire:4}:{},t); t+=3000; }
  assert.equal(sent.length,0,'nothing before the last try');assert.equal(a.rankingResult(),undefined);
  gpAttempt(a,{},t);await new Promise(setImmediate);
  assert.equal(sent.length,1);assert.equal(sent[0].board,'giwon');assert.equal(sent[0].score,9);assert.equal(sent[0].tie,5);
  assert.deepEqual(sent[0].detail,{hits:9,target:10,best:5});
  assert.equal(a.rankingResult().submit.state,'fail');assert.equal(a.trial.result,null,'separate from ordinary trials');
  fail=false;await a.boardSubmit();assert.equal(sent.length,2);assert.equal(a.rankingResult().submit.state,'done');
  await a.boardSubmit();assert.equal(sent.length,2,'a done result is not sent twice');
  a.gpStartChallenge();a.gpStartChallenge();await a.boardSubmit();assert.equal(sent.length,2,'cancelled challenges never submit');
  const w=await import(require('node:url').pathToFileURL(require('node:path').join(__dirname,'../worker/index.js')).href);
  assert.equal(w.validate({...sent[0],nick:'smoke'}).error,undefined,'the worker accepts what the app sends');
});
test('설정의 기록 초기화는 기원초 패널도 바로 비운다',()=>{
  const a=gpBoot();gpAttempt(a);
  assert.notEqual(a.get('gpRows').innerHTML,'','시도 한 줄이 그려졌다');
  a.resetSession();
  assert.equal(a.gp.session.tries,0);assert.equal(a.get('gpRows').innerHTML,'','초기화 뒤 옛 행이 남지 않는다');
});
