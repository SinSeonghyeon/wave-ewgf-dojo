// 기원권 strike and the 기원초 link judging (every mode).
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {BANNED, boot, dash, F, mistInput, giwonRec, giwon, linkAfter} = require('./helpers/app.cjs');
test('기원권 is a strike in either arrival order and on both sides, and never an EWGF attempt',()=>{
  const orders = [
    ['d/f then RP',        a=>{a.onDir('df',1000);a.onButton(2,1000);}],
    ['d/f then a late RP', a=>{a.onDir('df',1000);a.onButton(2,1900);}],
    ['down, RP, right',    a=>{a.onDir('d',1000);a.onButton(2,1000.2);a.onDir('df',1000.4);}],
    ['right, RP, down',    a=>{a.onDir('f',1000);a.onButton(2,1000.2);a.onDir('df',1000.4);}],
    ['down, right, RP',    a=>{a.onDir('d',1000);a.onDir('df',1000.2);a.onButton(2,1000.4);}],
    ['through one 6 frame',a=>{a.onDir('f',1000);a.onDir('df',1000+F);a.onButton(2,1000+2*F);}],
  ];
  for(const side of [1,-1]) for(const [label,play] of orders){
    const a=boot({v:4,side}); play(a); a.tick(2500);
    assert.equal(a.store.life.giwon,1,side+' '+label);
    assert.equal(a.get('rKind').textContent,'DEMON SLAYER',side+' '+label);
    assert.equal(a.get('rTitle').textContent,a.T('a.giwon.title'));
    assert.equal(a.anim.kind,'giwon');
    // strike, not attempt (결정 12(strikes)): no tries/hits/histogram/streak/lifetime EWGF stats
    assert.equal(a.session.tries,0,side+' '+label);assert.equal(a.session.hits,0);
    assert.equal(a.session.attempts.length,0);assert.equal(a.combo.n,0);
    assert.equal(a.store.life.tries,0);assert.equal(a.store.life.ewgf,0);assert.equal(a.session.dashes,0);
    assert.equal(a.session.log.length,1);assert.equal(a.session.log[0].cls,'ok');
    assert.equal(a.get('coachMsg').innerHTML,a.T('a.giwon.coach')+a.T('a.giwon.hint'),'the EWGF hint rides along (사용자 결정)');
  }
  // an RP with no held diagonal is still "no command"
  const b=boot();b.onDir('d',1000);b.onButton(2,1000.2);b.tick(1200);
  assert.equal(b.store.life.giwon,0);assert.equal(b.session.attempts[0].kind,'no_cd');
  const c=boot();c.onButton(2,1000);assert.equal(c.session.attempts[0].kind,'no_cd');assert.equal(c.store.life.giwon,0);
});
test('the 6 → 3 fault is staged so a 기원권 roll never prints a MISS, and still fires without one',()=>{
  const a=boot();a.onDir('f',1000);a.onDir('df',1000+F);a.onButton(2,1000+2*F);a.tick(2000);
  assert.equal(a.store.life.giwon,1);assert.equal(a.session.log.length,1,'no MISS in front of the 기원권');
  const b=boot();b.onDir('f',1000);b.onDir('df',1000+F);b.onDir('n',1000+4*F);      // the ↘ leaves without an RP
  assert.equal(b.get('rTitle').textContent,b.T('fault.f_before_d.title'));
  const c=boot();c.onDir('f',1000);c.onDir('df',1000+F);c.tick(1000+F+c.GIWON.FAULT_MS+1); // or the stage times out
  assert.equal(c.get('rTitle').textContent,c.T('fault.f_before_d.title'));
  const d=boot();d.onDir('f',1000);d.onDir('df',1000+F);d.tick(1000+F+d.GIWON.FAULT_MS-1);
  assert.notEqual(d.get('rTitle').textContent,d.T('fault.f_before_d.title'),'still waiting inside GIWON.FAULT_MS');
});
test('기원초 판정은 초풍이 경직 해제 뒤 목표 프레임까지 발동했는가 하나다',()=>{
  // 해제 뒤 실시간 입력: 눌린 칸이 그대로 발동 칸이고 GP_TARGET까지만 인정된다
  for(const fire of [1,2,5]){
    const a=boot(), l=linkAfter(giwon(a),{fire}).giwonLink;
    assert.equal(l.fire,fire,'fire '+fire);
    assert.equal(l.cell,a.GP_FREE+fire,'fire '+fire);
    assert.equal(l.ewgf,true,'fire '+fire);
    assert.equal(a.linkOk(l),fire<=a.GP_FIRE_MAX,'only up to GP_TARGET counts: fire '+fire);
  }
  // 선입력으로 경직을 넘는 방향은 시작 6 하나뿐이다: 중립을 경직 중에 풀면 커맨드가 이어지지 않는다
  const buf=boot().GIWON.BUFFER_F;
  for(const early of [2,4,buf]){
    const a=boot();linkAfter(giwon(a),{fire:-early});
    assert.equal(a.session.attempts.length,0,'the whole command cannot be pre-input: '+early);
    assert.equal(a.store.life.giwon,2,'the neutral is eaten, so the held 대각 + buffered RP is just another 기원권: '+early);
  }
  // 버퍼 창보다 이른 버튼은 버려져서 아무 시도도 나오지 않는다
  const drop=boot();giwon(drop);const rec=giwonRec(drop,1000);
  drop.onDir('n',1100);drop.onDir('f',rec-(buf+4)*F);
  drop.onButton(2,rec-(buf+2)*F);drop.tick(rec+4*F);
  assert.equal(drop.session.attempts.length,0,'a button before the buffer window never comes out');
  // 초풍이 아니면(RP가 한 칸 늦은 풍신권) 발동 칸과 무관하게 실패다
  const wgf=boot(), w=linkAfter(giwon(wgf),{rp:F}).giwonLink;
  assert.equal(w.ewgf,false);assert.equal(wgf.linkOk(w),false);
  // 중립은 경직 해제 프레임에 들어가야 하고, 시작 6은 그 앞 어디서든 선입력이면 된다
  const ref=boot(), rr=linkAfter(giwon(ref),{pre:3}).giwonLink;
  assert.equal(rr.n,0);assert.equal(rr.f,-3);assert.equal(rr.buffered,true);
  const out=boot(), ro=linkAfter(giwon(out),{pre:buf+3}).giwonLink;
  assert.equal(ro.buffered,false,'the start 6 sat in front of the buffer window');
  assert.equal(out.linkOk(ro),true,'but the criterion is the fire frame, not where the 6 went in');
});
test('기원초 판정은 루트를 보지 않고, 기원권 하나에 링크 하나이며 취소 지점마다 사라진다',()=>{
  // 루트는 판정에 들어가지 않는다: 같은 규칙을 그대로 적용하고 발동 칸만 본다
  const m=boot(), ml=linkAfter(giwon(m),{});
  assert.equal(ml.kind,'ewgf');assert.equal(ml.inputRoute,'mist');assert.equal(ml.giwonLink.route,'mist');
  assert.equal(m.linkOk(ml.giwonLink),true,'6N3+RP is out on the target frame');
  const std=boot(), sl=linkAfter(giwon(std),{route:'standard',fire:2});
  assert.equal(sl.kind,'ewgf');assert.equal(sl.inputRoute,'standard');assert.equal(sl.giwonLink.route,'standard');
  assert.equal(std.linkOk(sl.giwonLink),false,'6N23 needs one more frame than the target allows — said by the frame, not by the route');
  for(const mode of ['free','giwon']) for(const delay of [1,2]){
    const noN=boot();noN.setMode(mode);giwon(noN);
    const rec=giwonRec(noN,1000);
    noN.onDir('f',rec-3*F);noN.onDir('d',rec);noN.onDir('df',rec+delay*F);noN.onButton(2,rec+delay*F);
    const hit=noN.session.attempts.at(-1);
    assert.equal(hit.kind,'ewgf');assert.equal(hit.inputRoute,'noNeutral');
    assert.equal(hit.giwonLink.cell,noN.GP_FREE+delay);
    assert.equal(noN.linkOk(hit.giwonLink),delay===1,'623 uses the same fire-frame deadline');
    assert.equal(noN.store.life.giwon,1,'the linked RP must not become a second giwon');
    assert.equal(noN.session.dashes,1);
  }
  // both routes reach the same verdict shape; the route is recorded, never judged
  assert.deepEqual(Object.keys(sl.giwonLink).sort(),Object.keys(ml.giwonLink).sort());
  // only the first following EWGF carries the link
  const a=giwon(boot());linkAfter(a,{});
  a.onDir('n',6000);mistInput(a,{start:6100});
  assert.equal(a.session.attempts.at(-1).giwonLink,undefined,'one link per 기원권');
  // the window closes after GIWON.LINK_MS
  const late=giwon(boot());late.onDir('n',1100);
  const t=1000+late.GIWON.LINK_MS+200;
  late.onDir('f',t);late.onDir('n',t+F);late.onDir('df',t+2*F);late.onButton(2,t+2*F);
  assert.equal(late.session.attempts.at(-1).giwonLink,undefined,'past GIWON.LINK_MS');
  for(const cancel of [x=>x.resetInput(),x=>x.setMode('ewgf20'),x=>x.events.blur(),x=>x.endTrial(true)]){
    const b=giwon(boot());cancel(b);b.setMode('free');
    const rec2=giwonRec(b,1000);b.onDir('f',rec2);b.onDir('n',rec2+F);b.onDir('df',rec2+2*F);b.onButton(2,rec2+2*F);
    assert.equal(b.session.attempts.at(-1).giwonLink,undefined);
  }
});
test('기원권 constants drive the contact time, the text and the counter sound',()=>{
  const a=boot();
  assert.equal(a.HIT_CONTACT_MS.giwon,Math.round(a.GIWON.ACTIVE_F*F),'contact time derives from ACTIVE_F, not a tuned number');
  assert.equal(a.SFX_START.giwon,0);assert.equal(a.SFX_START.giwonCh,0);
  for(const l of ['ko','en','ja']){
    a.setLang(l);
    const assume=String(a.T('link.assume',a.GIWON.RECOVERY_F,a.GIWON.GROUND_F));
    assert.ok(assume.includes(String(a.GIWON.RECOVERY_F)),l+' names the recovery constant');
    assert.ok(assume.includes(String(a.GIWON.GROUND_F)),l+' names the grounded-window constant');
    assert.ok(String(a.T('link.nobufHint',a.GIWON.BUFFER_F)).includes(String(a.GIWON.BUFFER_F)),l+' names the buffer constant');
    assert.ok(String(a.T('link.ok',a.GP_TARGET)).includes(String(a.GP_TARGET)),l+' names the target frame');
    assert.ok(String(a.T('link.fireLate',a.GP_TARGET+2,2,a.GP_TARGET)).includes(String(a.GP_TARGET)),l);
    for(const k of ['a.giwon.title','a.giwon.sub','a.giwon.coach','a.giwon.hint','res.giwon','pop.giwon','link.title','link.memoOk','link.segTitle','link.noEwgf'])
      assert.doesNotMatch(String(a.T(k)),BANNED,l+' '+k);
    assert.equal(a.T('link.segNames').length,4,l);
    assert.doesNotMatch(String(a.T('link.ok',a.GP_TARGET))+a.T('link.fireLate',50,2,a.GP_TARGET)+a.T('link.nobufHint',8)+a.T('link.memo',48)+assume,BANNED,l);
  }
});
test('기원초 text and segment bar follow the language and never claim a real punish',()=>{
  for(const l of ['ko','en','ja']){
    const a=boot();a.setLang(l);a.get('segBar').children=Array.from({length:5},()=>({style:{}}));
    linkAfter(giwon(a),{});
    assert.equal(a.get('rTitle').textContent,a.T('link.title'));
    assert.equal(a.get('segTitle').textContent,a.T('link.segTitle'));
    assert.equal(a.get('coachMsg').innerHTML,a.T('link.ok',a.GP_TARGET)+a.T('link.assume',a.GIWON.RECOVERY_F,a.GIWON.GROUND_F));
    assert.equal(a.session.log[0].memo(),a.T('link.memoOk')+' · '+a.T('route.mist'));
    assert.ok(a.get('segBar').children[0].textContent.includes(String(a.GP_TARGET)),l+': the first column is the fire frame');
    a.setLang(l==='ko'?'ja':'ko');   // a language switch redraws the same verdict
    assert.equal(a.get('rTitle').textContent,a.T('link.title'));
    assert.equal(a.get('segTitle').textContent,a.T('link.segTitle'));
    const b=boot();b.setLang(l);const bl=linkAfter(giwon(b),{fire:4}).giwonLink;
    assert.equal(b.get('coachMsg').innerHTML,b.T('link.fireLate',bl.cell,bl.fire-b.GP_FIRE_MAX,b.GP_TARGET)+b.T('link.nobufHint',b.GP_BUF_A,b.GP_BUF_B));
    assert.equal(b.session.log[0].memo(),b.T('link.memo',bl.cell)+' · '+b.T('route.mist'));
  }
});
test('기원권 counter leaves the dummy crumpled in place until a follow-up or CRUMPLE_MS',()=>{
  const a=boot();a.store.fx=1;a.world.charX=120;a.world.dummyX=190;
  Object.assign(a.world.dummy,{alive:true,hit:0,type:null,y:0});
  a.time(1000);giwon(a,1000);
  const d=a.world.dummy,contact=1000+a.HIT_CONTACT_MS.giwon;
  assert.equal(d.move,'giwon');assert.equal(Math.round(d.launchAt),contact);
  assert.equal(Math.round(d.crumpleUntil),contact+a.GIWON.CRUMPLE_MS);
  a.updateDummy(contact+1);
  assert.equal(d.y,0,'folds in place instead of flying');assert.equal(d.alive,true);
  a.updateDummy(contact+a.GIWON.CRUMPLE_MS-1);assert.equal(d.y,0);
  a.updateDummy(contact+a.GIWON.CRUMPLE_MS+1);assert.ok(d.y<0,'then the usual launch takes over');
  // a follow-up lands on the crumpled dummy, which an ordinary knocked dummy would refuse
  const b=boot();b.store.fx=1;b.world.charX=120;b.world.dummyX=190;
  Object.assign(b.world.dummy,{alive:true,hit:0,type:null,y:0});
  b.time(1000);giwon(b,1000);b.updateDummy(1000+b.HIT_CONTACT_MS.giwon+1);
  b.time(1000+b.HIT_CONTACT_MS.giwon+50);
  assert.equal(b.tryHit('ewgf'),true,'grounded follow-up connects');
  assert.equal(b.world.dummy.crumpleUntil,0);
  // rush30 targets: 기원권 is in no HIT_TYPE, so it is always a whiff and never scores
  const c=boot();c.setMode('rush30');c.startTrial();const countdown=c.timers.get(c.trial.cdTimer);countdown();countdown();countdown();
  c.world.charX=120;c.world.dummyX=190;Object.assign(c.world.dummy,{alive:true,hit:0,type:'mid',y:0});
  c.rushStrike('giwon',2000);
  assert.equal(c.trial.score,0);assert.equal(c.trial.whiffs,1);assert.equal(c.world.dummy.crumpleUntil,0);
});
test('counter zoom scales the room camera and the 2D layer together, and is skipped without effects',()=>{
  const a=boot();a.store.fx=1;
  assert.equal(a.zoomAt(5000),1,'no zoom armed');
  a.giwonZoomStart(5000);
  assert.equal(a.zoomAt(5000),1);
  assert.ok(Math.abs(a.zoomAt(5000+a.GIWON_ZOOM.IN_MS)-a.GIWON_ZOOM.PEAK)<1e-9,'peaks at IN_MS');
  const quarter=a.zoomAt(5000+a.GIWON_ZOOM.IN_MS+a.GIWON_ZOOM.OUT_MS*0.25);
  const mid=a.zoomAt(5000+a.GIWON_ZOOM.IN_MS+a.GIWON_ZOOM.OUT_MS*0.5);
  assert.ok(mid>1&&mid<a.GIWON_ZOOM.PEAK);
  assert.ok(quarter>mid&&a.GIWON_ZOOM.PEAK-quarter>mid-1,'ease-out: more than half the push is gone by the quarter mark');
  assert.equal(a.zoomAt(5000+a.GIWON_ZOOM.IN_MS+a.GIWON_ZOOM.OUT_MS),1,'settles back exactly');
  // the same factor: a zoomed camera is a uniform screen scale about (centre, ground line)
  const z=1.12, plain=a.roomCamera(800,360,288,0), zoomed=a.roomCamera(800,360,288,0,z);
  assert.ok(Math.abs(zoomed.f-plain.f*z)<1e-9);
  for(const p of [[0,0,-3],[2,1.5,1],[-4,3,4]]){
    const q0=a.roomProject(p,plain,800,360), q1=a.roomProject(p,zoomed,800,360);
    assert.ok(Math.abs(q1[0]-(400+(q0[0]-400)*z))<1e-6,'x scales about the centre');
    assert.ok(Math.abs(q1[1]-(288+(q0[1]-288)*z))<1e-6,'y scales about the ground line, so the feet stay put');
  }
  assert.deepEqual(a.roomCamera(800,360,288,0,1),plain,'zoom 1 is the untouched camera');
  a.store.fx=0;a.giwonZoomStart(6000);assert.equal(a.zoomAt(6000+30),1,'effects off: no zoom');
});
test('기원권 leaves 통발, 나락, 무족초, the wave and WSC tasks alone',()=>{
  const a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('f',1040);a.onButton(2,1060);
  assert.equal(a.store.life.tongbal,1);assert.equal(a.store.life.giwon,0,'f,f+2 still wins over a held forward');
  const b=boot();dash(b);b.onButton(4,1070);
  assert.equal(b.store.life.hellsweep,1);assert.equal(b.store.life.giwon,0,'6N23+4 is untouched');
  const c=boot();mistInput(c);
  assert.equal(c.session.hits,1);assert.equal(c.store.life.giwon,0,'6N3+RP is still the mist route');
  const d=boot();dash(d,1000);d.onDir('f',1080);d.onDir('n',1100);d.onDir('f',1120);d.onDir('n',1140);d.onDir('d',1160);d.onDir('df',1180);
  assert.equal(d.session.dashes,2);assert.equal(d.cd.chain,2,'wave cancel/start unaffected');
  const e=boot();e.setMode('wsc');e.onDir('df',1000);e.onButton(2,1000);
  assert.equal(e.store.life.giwon,0,'wsc blocks the lifetime counters like every other move');
  assert.equal(e.wsc.session.tries,0,'and 기원권 consumes no WSC task');assert.equal(e.wsc.active,null);
  assert.equal(e.get('rKind').textContent,'DEMON SLAYER','but it is still judged and drawn');
});
