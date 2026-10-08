// Backdash machine (414 N 414 N …), bd10 and its frame timeline.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {BANNED, boot, dash, F, fr, bdOut, bdSet, bdAt} = require('./helpers/app.cjs');
const near = (x,y,m) => assert.ok(Math.abs(x-y)<1e-9, m+': '+x+' vs '+y);
test('recommended cancel window is 11–13f in feedback and the timeline, with 10/14f outside',()=>{
  for(const h of [10,11,12,13,14]){
    const a=boot({v:4,lang:'ko'});a.setMode('bd10');const o=bdOut(a,1000); // the output frame is 1f: the 1 lands on frame h after h−1 frames
   a.onDir('db',bdAt(o,h));
    const inside=h>=11&&h<=13;
    assert.equal(a.get('coachMsg').innerHTML,inside?a.T('bd.coach.cancelOk'):h===10?a.T('bd.coach.cancelEarly',1):a.T('bd.coach.cancelLate',1));
    const wins=[...a.get('bdpAxis').innerHTML.matchAll(/class="wsc-cell[^"]*\bwin\b[^"]*" data-frame="(\d+)"/g)].map(m=>+m[1]);
    assert.deepEqual(wins,[11,12,13]);
  }
});
test('fractional frame intervals use the displayed cancel − 1 + hand formula for grading',()=>{
  for(const offset of [-0.4,0.4]){
    const a=boot({v:4});a.setMode('bd10');const o=bdOut(a,1000),c=bdAt(o,13)+offset*F;
    a.onDir('db',c);a.onDir('b',c+2*F);a.onDir('n',c+4*F);a.onDir('b',c+(7+offset)*F);
    const row=a.bdp.row;
    assert.equal(row.h,13);assert.equal(row.hand,7);
    assert.equal(row.mps,a.bdMps(row.dist,a.bdPeriod(row.h,row.hand)));
    assert.equal(row.g,'top','the same displayed intervals keep the same grade');
  }
});
test('timeline cursor follows the live set from its first frame, even over the previous set; stopped dashes keep their earned fill',()=>{
  const a=boot({v:4});a.setMode('bd10');let o=bdOut(a,1000);
  const cell={dataset:{frame:'5'},classList:{toggle(name,on){this[name]=on;}}};
  a.get('bdpAxis').querySelectorAll=()=>[cell];
  a.renderBdpLive(bdAt(o,5));assert.equal(cell.classList.current,true);
  o=bdSet(a,o,13);assert.notEqual(a.bdpView(),a.bdp.run,'before its 1 the axis still draws the finished set');
  a.renderBdpLive(bdAt(o,5));assert.equal(cell.classList.current,true,'the frame of the new set runs over it from the output');
  a.renderBdpLive(bdAt(o,6));assert.equal(cell.classList.current,false,'the cursor moves on');
  a.onDir('db',bdAt(o,4));a.renderBdpLive(bdAt(o,5));
  assert.equal(cell.classList.current,true,'and stays once the live set is displayed');
  a.onDir('n',bdAt(o,7));assert.equal(a.bdp.run,null);a.renderBdpLive(bdAt(o,5));assert.equal(cell.classList.current,false,'no cursor after a break');
  for(const release of [false,true]) for(const dir of ['d','u','df','db']){
    const b=boot({v:4});b.setMode('bd10');const start=bdOut(b,1000);
    if(release) b.onDir('n',start+F);
    b.onDir(dir,bdAt(start,3));
    const fills=[...b.get('bdpAxis').innerHTML.matchAll(/data-frame="(\d+)" style="--d:([\d.]+)"/g)];
    for(const [,f,d] of fills) if(+f>=3) assert.equal(+d,+(b.bdDist(3)/b.BD_FULL).toFixed(3),dir+' release='+release+' frame='+f);
    near(b.session.bd.dist,b.bdDist(3),'judged distance matches the frozen bar');
  }
});
test('backdash easing clamps a render timestamp before animation start instead of poisoning world coordinates',()=>{
  const a=boot();
  for(const k of [-1,-0.01,-0.0001]) assert.equal(a.bdEase(k),a.bdEase(0)); // a finite start (the output frame's 1f distance), never NaN or a negative progress
  assert.equal(a.bdEase(1.01),1);
});
test('localized backdash guides use the same speed thresholds and full distance as the model',()=>{
  const a=boot();
  for(const lang of ['ko','en','ja']){
    const guide=require('../src/pages/'+lang+'.js').pages.find(p=>p.slug==='guide/backdash/');
    const text=JSON.stringify(guide);
    for(const tier of a.BD_TIER_MPS) assert.ok(text.includes(tier.mps.toFixed(2)+' m/s'),lang+' '+tier.k);
    assert.ok(text.includes(String(a.BD_FULL)),lang+' full distance');
  }
});
/* ---------- the measured model (2026-10-02, 결정 17(backdash), .agents/docs/BACKDASH.md) ---------- */
test('backdash model: S-shaped measured curve, speed formula D(h)×60÷(h−1+hand) with the output frame as 1f, best cancel inside the window, tiers from hand speed',()=>{
  const {BD,BD_FULL,BD_LAST,BD_TIER_MPS,bdDist,bdBestH,bdTopMps,bdMps,bdPeriod,bdFrameNo}=boot();
  assert.equal(bdFrameNo(0),1,'a 1 on the output frame is 1f');assert.equal(bdFrameNo(F),2);assert.equal(bdFrameNo(-5),1);assert.equal(bdPeriod(12,6),17,'11 frames before the 1, then a 6f hand');
  assert.equal(bdDist(0),0);assert.equal(bdDist(BD_LAST),BD_FULL);assert.equal(bdDist(BD_LAST+20),BD_FULL,'nothing is credited after the dash stops');
  near(BD_FULL,0.638,'a full backdash in game metres');
  const step=h=>bdDist(h)-bdDist(h-1), fastest=[...Array(BD_LAST).keys()].map(i=>i+1).sort((a,b)=>step(b)-step(a))[0];
  assert.ok(fastest>=6&&fastest<=11,'fastest frame in the middle: '+fastest);assert.ok(bdDist(5)<0.3*BD_FULL,'slow off the mark');assert.ok(bdDist(13)>0.9*BD_FULL,'mostly done by 13f');
  for(let h=1;h<=BD_LAST;h++) assert.ok(step(h)>=0,'monotone at '+h);
  for(let c=3;c<=14;c++){const h=bdBestH(c);assert.ok(h>=BD.CANCEL_A&&h<=BD.CANCEL_B,'hand '+c+'f → best '+h+'f inside the window');
    for(let x=1;x<=BD_LAST+3;x++) assert.ok(bdMps(bdDist(x),bdPeriod(x,c))<=bdTopMps(c),'no cancel beats the formula at hand '+c);}
  assert.equal(bdBestH(6),12);assert.equal(bdBestH(7),13);assert.equal(bdTopMps(6),1.98);
  assert.deepEqual([...BD_TIER_MPS.map(x=>x.k)],['top','fast','ok']);assert.ok(BD_TIER_MPS[0].mps>BD_TIER_MPS[1].mps&&BD_TIER_MPS[1].mps>BD_TIER_MPS[2].mps);
  for(const x of BD_TIER_MPS) assert.equal(x.mps,bdTopMps(x.c),x.k+' = the best speed of a '+x.c+'f hand');
});
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
  a.onDir('n',o+fr(12));assert.equal(a.get('rTitle').textContent,title,'…and releasing it says nothing either');assert.equal(a.session.bd.dist,a.BD_FULL,'the distance is still counted');
  o=bdOut(a,3000);a.onDir('db',o+fr(10));assert.equal(a.bd.engaged,true);assert.equal(a.get('rKind').textContent,'BACKDASH','the first 1 cancel switches the feedback on');
  assert.equal(a.get('hudChainL').textContent,'BACKDASH');assert.equal(a.get('hudChainN').textContent,1);
  a.onDir('n',o+fr(14));a.tick(o+fr(14)+3100);assert.equal(a.bd.engaged,false,'silent again after 3s without a backdash');
  assert.equal(a.get('hudChainL').textContent,'WAVE');
});
test('backdash sets: distance from the curve, set speed graded by hand-speed tiers, chain, cancel-window feedback and the formula coach line',()=>{
  const a=boot({v:4,lang:'ko'});const {BD,BD_TIER_MPS,bdDist,bdBestH,bdMps,bdPeriod}=a;const H=bdBestH(6); // bdSet's hand: 1 held 2f + 4 N 4 in 4f = 6f
  const grade=v=>(BD_TIER_MPS.find(x=>v>=x.mps)||{k:'slow'}).k;
  let o=bdOut(a,1000);a.onDir('db',bdAt(o,H));
  assert.equal(a.session.bd.dist,bdDist(H),'cancel on frame H earns D(H)');assert.equal(a.bd.state,4);
  assert.equal(a.get('rOff').textContent,a.T('bd.cancel',H,0,bdDist(H).toFixed(2)));assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.cancelOk'));
  let c=bdAt(o,H);a.onDir('b',c+fr(2));a.onDir('n',c+fr(4));o=c+fr(6);a.onDir('b',o); // period H−1+6 = 17f
  const v1=bdMps(bdDist(H),bdPeriod(H,6));assert.equal(grade(v1),'top','the best cancel with a 6f hand is very fast');
  assert.equal(a.bd.chain,2);assert.equal(a.get('rTitle').textContent,a.T('bd.title',2,a.T('bd.grade.top')));assert.equal(a.get('rOff').textContent,a.T('bd.sub',v1.toFixed(2),H,6,H));
  assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.good'));assert.equal(JSON.stringify(a.session.log[0].res),'["res.bd_top"]');assert.equal(a.session.log[0].type,'log.tBack');assert.equal(a.session.bd.top,1);
  // early cancel (frame 8): shorter, the window line says how early, the set coach names the best frame for this hand
  a.onDir('db',bdAt(o,8));near(a.session.bd.dist,bdDist(H)+bdDist(8),'an early cancel keeps what the dash travelled');assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.cancelEarly',BD.CANCEL_A-8));
  c=bdAt(o,8);a.onDir('b',c+fr(2));a.onDir('n',c+fr(4));o=c+fr(6);a.onDir('b',o);
  const g2=grade(bdMps(bdDist(8),bdPeriod(8,6)));assert.notEqual(g2,'top');
  assert.equal(a.get('rTitle').textContent,a.T('bd.title',g2==='slow'?1:3,a.T('bd.grade.'+g2)));assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.early',H-1-8,H,6),'the early cancel is the biggest loss');
  // late cancel (frame 18)
  a.onDir('db',bdAt(o,18));assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.cancelLate',18-BD.CANCEL_B));
  c=bdAt(o,18);a.onDir('b',c+fr(2));a.onDir('n',c+fr(4));o=c+fr(6);a.onDir('b',o);assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.late',18-H-1,H,6));
  // 1 held too long, then 4N4 too long
  a.onDir('db',bdAt(o,H));c=bdAt(o,H);a.onDir('b',c+fr(10));a.onDir('n',c+fr(12));o=c+fr(14);a.onDir('b',o);assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.db',8));
  a.onDir('db',bdAt(o,H));c=bdAt(o,H);a.onDir('b',c+fr(2));a.onDir('n',c+fr(10));o=c+fr(12);a.onDir('b',o);assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.tap',6));
  // slow set resets the chain to 1 but the backdash still counts
  const before=a.session.bd.count;a.onDir('db',bdAt(o,H));c=bdAt(o,H);a.onDir('b',c+fr(30));a.onDir('n',c+fr(32));o=c+fr(34);a.onDir('b',o);
  assert.equal(a.bd.chain,1);assert.equal(a.get('rTitle').textContent,a.T('bd.title',1,a.T('bd.grade.slow')));assert.equal(a.session.log[0].res[0],'res.bd_slow');assert.equal(a.session.bd.count,before+1);
  // a chain of 3+ leaves a summary log line when it breaks; the dictionaries name no official character
  const b=boot({v:4,lang:'en'});let p=bdOut(b,1000);for(let i=0;i<3;i++) p=bdSet(b,p,H);assert.equal(b.bd.chain,4);b.onDir('n',p+fr(12));
  assert.equal(JSON.stringify(b.session.log[1].res),'["bd.chain.end",4]');assert.equal(b.session.log[0].res[0],'bd.f.noCancel.title');
  const banned=new RegExp(BANNED.source+'|三島');
  for(const l of ['ko','en','ja']){b.setLang(l);for(const k of Object.keys(b.I18N[l])) if(/^(bdp?\.|mode\.bd10|hint\.bd10|tier\.\d\.bd10)/.test(k)) assert.doesNotMatch(String(b.T(k,3,2,1,0,5)),banned,l+' '+k);}
});
test('backdash faults: an early 1 is a short backdash, no cancel locks RECOVER_F of stiffness, sidestep and neutral-after-1 break the set, LINK_MAX_F ends it, 2P mirrors',()=>{
  const {BD,BD_FULL,bdDist,bdBestH}=boot();const H=bdBestH(6);
  let a=boot({v:4,lang:'ko'});
  let o=bdOut(a,1000);a.onDir('db',bdAt(o,2));assert.equal(a.bd.state,4,'there is no frame too early to cancel');assert.equal(a.session.bd.count,1);assert.equal(a.session.bd.dist,bdDist(2),'it just barely moved');
  assert.equal(a.get('coachMsg').innerHTML,a.T('bd.coach.cancelEarly',BD.CANCEL_A-2));
  // no cancel → stiff for RECOVER_F frames from the backdash, counted from the output
  a=boot({v:4,lang:'ko'});o=bdOut(a,2000);a.onDir('n',o+fr(12));assert.equal(a.session.bd.dist,BD_FULL);assert.equal(a.bd.chain,0);
  const t2=bdOut(a,o+fr(BD.RECOVER_F-6));assert.ok(t2<o+fr(BD.RECOVER_F));assert.equal(a.bd.state,0,'still recovering: nothing comes out');assert.equal(a.session.bd.count,1);
  bdOut(a,o+fr(BD.RECOVER_F+2));assert.equal(a.bd.state,3,'after the recovery the next one is fine');
  // engaged first, then the loud faults
  a=boot({v:4,lang:'ko'});o=bdOut(a,1000);o=bdSet(a,o,H);assert.equal(a.bd.chain,2);
  a.onDir('d',bdAt(o,H));assert.equal(a.get('rTitle').textContent,a.T('bd.f.side.title'));assert.equal(a.bd.chain,0);near(a.session.bd.dist,2*bdDist(H),'a sidestep cancel still moved');
  o=bdOut(a,o+fr(30));a.onDir('db',o+fr(H));a.onDir('n',o+fr(H+2));assert.equal(a.get('rTitle').textContent,a.T('bd.f.neutral1.title'));assert.equal(a.bd.state,0);
  o=bdOut(a,o+fr(60));a.onDir('db',o+fr(H));a.onDir('b',o+fr(H+2));a.onDir('d',o+fr(H+4));assert.equal(a.get('rTitle').textContent,a.T('bd.f.dir.title'));
  o=bdOut(a,o+fr(90));a.onDir('db',o+fr(H));a.tick(o+fr(H+BD.LINK_MAX_F+1));assert.equal(a.bd.state,0,'sitting longer than LINK_MAX_F is just a crouch');assert.equal(a.bd.chain,0);
  o=bdOut(a,o+fr(200));a.onDir('db',o+fr(H));a.onDir('b',o+fr(H+2));a.onDir('n',o+fr(H+4));a.onDir('b',o+fr(H+4)+260);assert.equal(a.get('rTitle').textContent,a.T('bd.f.nLong.title'));assert.equal(a.bd.state,1,'the late b starts a new pair');
  a=boot({v:4,side:-1});o=bdOut(a,1000);o=bdSet(a,o,H);assert.equal(a.bd.chain,2,'2P side: same directions, same judging');assert.ok(a.anim.moveTo>a.anim.moveFrom,'visual mirrors');
});
test('bd10: countdown, distance on the HUD, record, share card, board entry against the worker, old-scale records left out of bests, and leaving clears',async()=>{
  const w=await import(require('node:url').pathToFileURL(require('node:path').join(__dirname,'../worker/index.js')).href);
  const old={date:1, score:40.7, dashes:41, top:41, chain:42, label:'40.7 m', sub:'old'}; // before the measured curve: 1.0 m per backdash
  const a=boot({v:4,lang:'en',records:{bd10:[old]}});const {BD,BD_FULL,bdDist,bdBestH}=a;const H=bdBestH(6),d1=bdDist(H);
  a.renderBests();assert.doesNotMatch(a.get('bests').innerHTML,/40\.7/,'an old-scale record is not a best any more');assert.equal(a.store.records.bd10.length,1,'…but it stays in storage');
  a.setMode('bd10');
  assert.equal(a.get('dStart').hidden,false);assert.match(a.get('hudHint').textContent,/4 N 4/);assert.match(a.get('dDesc').textContent,new RegExp(BD.RECOVER_F+'f'));assert.match(a.get('dDesc').textContent,new RegExp(BD_FULL.toFixed(2)+' m'));
  a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();
  assert.equal(a.trial.running,true);assert.equal(a.get('hudScore').textContent,'0.0 m');
  let o=bdOut(a,4100);o=bdSet(a,o,H);assert.equal(a.get('hudScore').textContent,d1.toFixed(1)+' m');assert.equal(a.get('dProg').textContent,a.T('trial.bdProg',1,d1.toFixed(1)));
  o=bdSet(a,o,H);a.onDir('n',o+fr(12)); // three backdashes: D(13) + D(13) + a full one that ran out, two very fast sets, chain 3
  const total=2*d1+BD_FULL;near(a.trial.dist,total,'trial distance');assert.equal(a.trial.bdCount,3);assert.equal(a.trial.bdTop,2);assert.equal(a.trial.bestChain,3);assert.equal(a.get('hudScore').textContent,total.toFixed(1)+' m');
  a.time(14100);a.trialTick(14100);assert.equal(a.trial.running,false);assert.equal(a.bd.state,0,'endTrial clears the machine');
  const rec=a.store.records.bd10[1];assert.equal(rec.score,+total.toFixed(2));assert.equal(rec.dashes,3);assert.equal(rec.top,2);assert.equal(rec.chain,3);assert.equal(rec.bdv,a.BD_REC_V);
  assert.equal(a.trial.result.personalBest,true,'the old 40.7 m does not block a personal best');assert.equal(a.get('hudCenter').textContent,total.toFixed(1)+' m');
  assert.equal(a.get('dProg').textContent,a.T('trial.bdEnd',total.toFixed(1),3));assert.equal(a.store.life.trials.bd10,1);
  const e=JSON.parse(JSON.stringify(a.boardEntry(a.trial.result,'bd10')));assert.deepEqual(e,{board:'bd10',win:a.store.window,lang:'en',score:+total.toFixed(2),tie:2,detail:{dashes:3,top:2,chain:3}});
  assert.equal(w.validate({...e,nick:'smoke'}).error,undefined);
  const card=a.buildCard({kind:'trial',mode:'bd10',rec,attempts:[],cycles:[],window:a.store.window});assert.equal(card.hero.value,total.toFixed(1)+' m');assert.equal(card.chart,null);
  assert.doesNotMatch(JSON.stringify(card),/NaN|undefined|(^|[\s"])(card|rec|trial|mode|bd)\.[a-zA-Z0-9]+/);
  a.renderBests();assert.match(a.get('bests').innerHTML,new RegExp(total.toFixed(1).replace('.','\\.')+' m'));
  a.setMode('free');assert.equal(a.get('hudScore').textContent,'');assert.equal(a.bd.chain,0);
});
test('backdash recovery is a stage mechanic in every mode: no second backdash or back walk for RECOVER_F, a crouch/sidestep ends it, the stance holds meanwhile',()=>{
  const {BD,BD_LAST}=boot();
  for(const m of ['free','wave10']){
    const a=boot({v:4});a.setMode(m);a.time(1000);const o=bdOut(a,1000);assert.equal(a.anim.moveT0,1000);
    assert.equal(a.bdRec.until,o+BD.RECOVER_F*F);assert.equal(a.anim.kind,'backdash');
    a.onDir('n',o+fr(12));a.time(2000);bdOut(a,o+fr(14));assert.equal(a.anim.moveT0,1000,m+': a b,N,b inside the recovery does not move');assert.equal(a.pops.length,0,'no STIFF pop');
    assert.equal(a.poseAt(1000+BD_LAST*F+20).sweat,true,'still not idle: the recovery stance after the dash');assert.equal(a.anim.kind,'backdash');
    assert.equal(a.poseAt(o+BD.RECOVER_F*F+1).sweat,undefined,'idle again once the recovery is over');
    a.time(1000);a.onDir('b',2500);a.onDir('n',2520);a.onDir('b',2540);a.onDir('d',2560);assert.equal(a.bdRec.until,2560,'a crouch ends the recovery early');a.onDir('n',2580);
    a.time(3000);bdOut(a,2600);assert.equal(a.anim.moveT0,3000,m+': and the next backdash comes out');
  }
  // a d/b during the dash stops the movement where it is (all modes) and sits
  const a=boot({v:4});a.setMode('ewgf20');const o=bdOut(a,1000);assert.ok(a.anim.moveDur>0);a.onDir('db',o+fr(13));assert.equal(a.anim.moveDur,0);assert.equal(a.anim.kind,'bdCrouch');
  assert.equal(a.bd.state,0,'judging still off outside free/bd10');
});
test('the backdash visual follows the measured S-curve: it stops where the judge credits (output = 1f), BD.PX wide',()=>{
  const a=boot({v:4});const {BD,BD_FULL,BD_LAST,BD_MOVE_MS,bdDist,bdEase,bdFrameNo}=a;a.time(1000);bdOut(a,1000);
  assert.equal(a.anim.moveEase,bdEase);near(BD_MOVE_MS,(BD_LAST-1)*F,'moving from 1f until it stops on BD_LAST');near(a.anim.moveDur,BD_MOVE_MS,'duration');near(a.anim.moveFrom-a.anim.moveTo,BD.PX,'1P moves left by BD.PX');
  assert.equal(bdEase(1),1);
  for(let e=0;e<BD_LAST;e++) near(bdEase(e*F/BD_MOVE_MS),bdDist(bdFrameNo(e*F))/BD_FULL,'a 1 or sidestep '+e+' frames after the output stops the stage at the judged distance');
  for(let k=0;k<1;k+=0.01) assert.ok(bdEase(k+0.01)>=bdEase(k)-1e-12,'monotone');
  assert.ok(bdEase(2*F/BD_MOVE_MS)<0.15,'slow off the mark: frame 3 (2 frames after the output) is under 15%');
});
test('the segment bar shows the last backdash: 4 tap · N · hold until the cancel · 1 held until the next 4',()=>{
  const a=boot({v:4,lang:'ko'});const H=a.bdBestH(6);
  let o=bdOut(a,1000,3,2);assert.equal(a.bd.seg,null,'nothing until the backdash is cancelled or released');
  a.onDir('db',o+fr(H));assert.deepEqual(JSON.parse(JSON.stringify(a.bd.seg)),{bd:true,tap:fr(3),n:fr(2),hold:fr(H),db:null});
  assert.equal(a.get('segTitle').textContent,a.T('seg.titleBd'));
  const c=o+fr(H);a.onDir('b',c+fr(4));assert.equal(a.bd.seg.db,fr(4),'the 1 hold closes the bar');a.onDir('n',c+fr(6));o=c+fr(8);a.onDir('b',o);
  assert.equal(a.bd.seg.db,fr(4),'the finished bar stays through the next backdash');a.onDir('n',o+fr(12));
  assert.deepEqual(JSON.parse(JSON.stringify(a.bd.seg)),{bd:true,tap:fr(2),n:fr(2),hold:fr(12),db:0},'released without a cancel: hold until the release, no 1');
  a.setLang('en');assert.equal(a.get('segTitle').textContent,'Last backdash segments (ms)');
  dash(a,5000);assert.equal(a.get('segTitle').textContent,a.T('seg.title'),'a crouch dash takes the bar back');
});
test('bd10 timeline: one set frame by frame (cancel cell, next backdash, curve fill), the formula, stats, recent sets, breaks and live frame',()=>{
  const a=boot({v:4,lang:'ko'});const {BD,BD_FULL,BDP_AXIS,bdDist,bdBestH,bdMps}=a;const H=bdBestH(6);
  assert.equal(a.get('bdpTimeline').hidden,true,'only in bd10');a.setMode('bd10');
  assert.equal(a.get('bdpTimeline').hidden,false);assert.equal(a.get('bdpPanel').hidden,false);assert.equal(a.get('bdpResult').textContent,a.T('bdp.ready'));
  const cells=()=>Object.fromEntries([...a.get('bdpAxis').innerHTML.matchAll(/<div class="wsc-cell([^"]*)" data-frame="(\d+)" style="--d:([\d.]+)"/g)].map(m=>[+m[2],{cls:m[1].trim().split(/\s+/).filter(Boolean),f:+m[2],d:+m[3]}])); // keyed by frame number
  assert.deepEqual(Object.keys(cells()).map(Number),[...Array(BDP_AXIS).keys()].map(i=>i+1),'frames 1..BD_NEXT_F');
  let o=bdOut(a,1000);assert.ok(a.bdp.run);assert.equal(a.bdp.run.t0,o);
  a.onDir('db',bdAt(o,H));assert.equal(a.bdp.run.h,H);
  let cs=cells();assert.deepEqual(cs[1].cls,['out','mark']);assert.ok(cs[H].cls.includes('cut')&&cs[H].cls.includes('win'));
  assert.equal(cs[5].d,+(bdDist(5)/BD_FULL).toFixed(3),'the fill is the curve');assert.equal(cs[H+3].d,+(bdDist(H)/BD_FULL).toFixed(3),'after the cancel the fill stays where the dash stopped');assert.ok(cs[H+3].cls.includes('hand'));
  for(let f=BD.CANCEL_A;f<=BD.CANCEL_B;f++) assert.ok(cs[f].cls.includes('win'),'window '+f);
  const c=bdAt(o,H);a.onDir('b',c+fr(2));a.onDir('n',c+fr(4));const o2=c+fr(6);a.onDir('b',o2);
  const row=a.bdp.last.row,v=bdMps(bdDist(H),a.bdPeriod(H,6));assert.equal(row.h,H);assert.equal(row.hand,6);assert.equal(row.best,H);assert.equal(row.mps,v);assert.equal(row.g,'top');
  cs=cells();assert.ok(cs[H+6].cls.includes('next'),'the next backdash closes the set');assert.ok(cs[H].cls.includes('cut'),'the finished set stays drawn until the next 1');
  assert.equal(a.get('bdpResult').textContent,a.T('bd.title',2,a.T('bd.grade.top')));
  assert.equal(a.get('bdpDetail').textContent,a.T('bdp.formula',bdDist(H).toFixed(3),H,6,v.toFixed(2)));
  assert.equal((a.get('bdpAB').innerHTML.match(/class="ok"/g)||[]).length,6,'the best cancel with a 6f hand passes every tile');
  assert.equal(row.db,2);assert.equal(row.tap,4);assert.match(a.get('bdpAB').innerHTML,new RegExp(a.T('bdp.tapLabel')+'<b>4f</b>'));
  // the hand under the axis: 1 hold from the cut to the roll back to 4, then 4 N 4 up to the next backdash, each against its target
  const ax=a.get('bdpAxis').innerHTML,sp=[...ax.matchAll(/<u class="gp-band span (ok|no)" style="grid-column:(\d+)\/(\d+)">([^<]*)<\/u>/g)].map(m=>({ok:m[1],a:+m[2],b:+m[3]-1,text:m[4]}));
  assert.deepEqual(JSON.parse(JSON.stringify(sp)),[{ok:'ok',a:H,b:H+1,text:a.T('bdp.spanDb',a.glyphFor('db'),2)},{ok:'ok',a:H+2,b:H+6,text:a.T('bdp.spanTap',4)}]);
  assert.ok(cs[H].cls.includes('best'),'the best cancel frame for this hand is marked');assert.match(ax,new RegExp('>'+a.T('bdp.bandCancel')+'</u>'));
  assert.match(a.get('bdpStats').innerHTML,/<b>1<\/b>/);assert.match(a.get('bdpRows').innerHTML,new RegExp(H+'f</td><td>6f</td><td>'+v.toFixed(2)));
  // the next set in progress: shown once its 1 is in
  a.onDir('db',bdAt(o2,8));cs=cells();assert.ok(cs[8].cls.includes('cut'));
  a.renderBdpLive(bdAt(o2,10));assert.equal(a.get('bdpLive').textContent,a.T('bdp.liveHand',2));
  // a break keeps the set on the axis with the reason
  a.onDir('n',o2+fr(9));assert.equal(a.bdp.run,null);assert.equal(a.bdp.last.fail,'neutral1');assert.equal(a.get('bdpResult').textContent,a.T('bdp.broke',a.T('bd.f.neutral1.title')));
  assert.equal((a.get('bdpAB').innerHTML.match(/class="ok"/g)||[]).length,6,'a chain always ends with a break: the tiles keep the last graded set');assert.equal(a.get('bdpDetail').textContent,a.T('bdp.formula',bdDist(H).toFixed(3),H,6,v.toFixed(2)));
  assert.doesNotMatch(a.get('bdpCommand').textContent,/→/,'no arrow separators in the command line');
  a.renderBdpLive(o2+fr(40));assert.equal(a.get('bdpLive').textContent,a.T('bdp.liveDone'));
  const o3=bdOut(a,o2+fr(60));a.renderBdpLive(bdAt(o3,5));assert.equal(a.get('bdpLive').textContent,a.T('bdp.liveDash',5,bdDist(5).toFixed(2)));
  a.onDir('n',o3+fr(12));assert.equal(a.get('bdpResult').textContent,a.T('bdp.broke',a.T('bd.f.noCancel.title')),'released without a cancel');
  // language switch redraws; leaving the mode hides it and drops the set in progress
  a.setLang('en');assert.equal(a.get('bdpGuide').textContent,a.T('bdp.guide',BD.CANCEL_A,BD.CANCEL_B,BD.HAND_F,a.BD_LAST,a.BD_NEXT_F,BD.DB_F,BD.TAP_F));
  a.setMode('free');assert.equal(a.get('bdpTimeline').hidden,true);assert.equal(a.get('bdpPanel').hidden,true);assert.equal(a.bdp.run,null);
  const before=a.bdp.session.sets;bdSet(a,bdOut(a,9000),H);assert.equal(a.bdp.session.sets,before,'free practice does not feed the bd10 panel');
});
test('review fixes (2026-09-13): one 4N4 pairing rule, provisional no-cancel distance, chain 1 records, silent bar, HUD after bd10, d/f and 1-hold faults, cancel card, one trial-mode list',()=>{
  const {BD,BD_FULL,bdDist,bdBestH}=boot();const H=bdBestH(6);
  // judging pairs the second 4 the way tapDetect does (within TAP_MS of the first 4, not of the N): no credited backdash without a drawn one
  let a=boot({v:4,lang:'ko'});a.onDir('b',1000);a.onDir('n',1200);a.onDir('b',1300);
  assert.equal(a.bd.state,1,'too slow to pair: the late 4 is a new first tap');assert.notEqual(a.anim.kind,'backdash');assert.equal(a.bd.chain,0);
  a.onDir('n',1320);a.onDir('b',1340);assert.equal(a.bd.state,3);assert.equal(a.anim.kind,'backdash','the judged backdash is the drawn one');
  // released without a cancel, then crouched/sidestepped inside the recovery: the distance shrinks to what was travelled (release-then-crouch spam earns no more than a cancel)
  a=boot({v:4,lang:'ko'});let o=bdOut(a,1000);a.onDir('n',o+fr(2));assert.equal(a.session.bd.dist,BD_FULL);a.onDir('db',bdAt(o,3));near(a.session.bd.dist,bdDist(3),'crouched at 3f: only what it travelled');
  o=bdOut(a,2000);a.onDir('n',o+fr(2));a.onDir('d',bdAt(o,8));near(a.session.bd.dist,bdDist(3)+bdDist(8),'sidestep at 8f');
  o=bdOut(a,3000);a.onDir('n',o+fr(2));a.tick(o+fr(BD.RECOVER_F+1));a.onDir('db',o+fr(BD.RECOVER_F+2));near(a.session.bd.dist,bdDist(3)+bdDist(8)+BD_FULL,'after the recovery the full backdash stays');
  // free practice before the first 1 cancel: a release or sidestep leaves the segment bar alone
  a=boot({v:4,lang:'ko'});dash(a,1000);o=bdOut(a,3000);a.onDir('n',o+fr(12));assert.equal(a.bd.seg,null);assert.equal(a.get('segTitle').textContent,a.T('seg.title'),'release: the wave bar stays');
  o=bdOut(a,5000);a.onDir('d',o+fr(8));assert.equal(a.bd.seg,null);assert.equal(a.get('segTitle').textContent,a.T('seg.title'),'sidestep: the wave bar stays');
  // engaged: d/f is a crouch (it cancels the recovery), so its distance counts; any direction while holding the 1 ends the set with a card
  a=boot({v:4,lang:'ko'});o=bdOut(a,1000);o=bdSet(a,o,H);assert.equal(a.bd.chain,2);
  a.onDir('df',bdAt(o,H));near(a.session.bd.dist,2*bdDist(H),'d/f credits the distance');assert.equal(a.get('rTitle').textContent,a.T('bd.f.dir.title'));assert.equal(a.bd.chain,0);
  o=bdOut(a,o+fr(60));a.onDir('db',o+fr(H));a.onDir('d',o+fr(H+2));assert.equal(a.get('rTitle').textContent,a.T('bd.f.dir.title'),'1 → 2 says why the set ended');assert.equal(a.bd.state,0);
  // the cancel line redraws the backdash card even if another card was shown in between
  a=boot({v:4,lang:'ko'});o=bdOut(a,1000);o=bdSet(a,o,H);const title=a.get('rTitle').textContent;assert.equal(title,a.T('bd.title',2,a.T('bd.grade.top')));
  a.onButton(2,o+fr(3));assert.notEqual(a.get('rKind').textContent,'BACKDASH','a stray 2 shows its own card');
  a.onDir('db',bdAt(o,H));assert.equal(a.get('rKind').textContent,'BACKDASH');assert.equal(a.get('rTitle').textContent,title);assert.equal(a.get('rOff').textContent,a.T('bd.cancel',H,0,bdDist(H).toFixed(2)));
  // bd10: an isolated backdash is a chain of 1 on the record; the HUD chain widget is redrawn when the trial ends
  a=boot({v:4,lang:'en'});a.setMode('bd10');a.startTrial();const cd=a.timers.get(a.trial.cdTimer);a.time(4000);cd();cd();cd();
  o=bdOut(a,4100);a.onDir('n',o+fr(12));assert.equal(a.trial.bestChain,1,'an isolated backdash is a chain of 1');assert.equal(a.session.bd.bestChain,1);
  o=bdOut(a,o+fr(40));o=bdSet(a,o,H);o=bdSet(a,o,H);assert.equal(a.get('hudChainL').textContent,'BACKDASH');assert.equal(a.get('hudChainN').textContent,3);
  a.time(14100);a.trialTick(14100);assert.equal(a.trial.running,false);assert.equal(a.store.records.bd10[0].chain,3);
  assert.equal(a.get('hudChainN').textContent,0);assert.equal(a.get('hudChainL').textContent,'WAVE','endTrial redraws the chain widget');
  // records, lifetime trial counters and the reset button all follow the one trial-mode list; the admin CLI knows every board
  assert.deepEqual(Object.keys(a.store.records),[...a.TRIAL_MODES]);assert.deepEqual(Object.keys(a.store.life.trials),[...a.TRIAL_MODES]);
  const b=boot(undefined,undefined,{confirm:()=>true});b.get('dataReset').click();assert.deepEqual(Object.keys(b.store.records),[...b.TRIAL_MODES]);assert.deepEqual(Object.keys(b.store.life.trials),[...b.TRIAL_MODES]);
  const adm=fs.readFileSync(require('node:path').join(__dirname,'../tools/board-admin.js'),'utf8');for(const id of a.BOARDS) assert.ok(adm.includes("['"+id+"', '"),'board-admin.js lists '+id);
});
test('bd10 timeline review fixes (2026-10-03): a cancel past the axis stays on it, a session reset clears the panel, the hand target is the sum of its parts',()=>{
  const a=boot({v:4,lang:'ko'});const {BD,BDP_AXIS,bdBestH}=a;a.setMode('bd10');
  assert.equal(BD.HAND_F,BD.DB_F+BD.TAP_F,'HAND_F = 1 hold + 4 N 4');
  const cols=()=>[...a.get('bdpAxis').innerHTML.matchAll(/grid-column:(\d+)\/(\d+)/g)].flatMap(m=>[+m[1],+m[2]]);
  let o=bdOut(a,1000);const late=BDP_AXIS+10;bdSet(a,o,late);
  assert.equal(a.bdp.last.row.h,late,'the judged cancel frame is kept');
  assert.ok(Math.max(...cols())<=BDP_AXIS+1,'no strip or band reaches past the last column: '+cols().join(','));
  assert.match(a.get('bdpAxis').innerHTML,new RegExp('class="wsc-cell[^"]*\\bcut\\b[^"]*" data-frame="'+BDP_AXIS+'"'),'the cut is drawn on the last cell');
  o=bdOut(a,5000);bdSet(a,o,bdBestH(6));assert.ok(a.bdp.session.sets>0&&a.bdp.row);
  a.resetSession();assert.equal(a.bdp.session.sets,0);assert.equal(a.bdp.row,null);assert.equal(a.bdp.last,null);
  assert.equal(a.get('bdpResult').textContent,a.T('bdp.ready'));assert.equal(a.get('bdpRows').innerHTML,'');assert.equal(a.get('bdpDetail').textContent,'');
  assert.match(a.get('bdpStats').innerHTML,/<b>0<\/b>/,'best chain tile reads the fresh session');
});
