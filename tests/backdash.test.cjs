// Backdash machine (414 N 414 N …) and bd10.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {BANNED, boot, dash, F, fr, bdOut, bdSet} = require('./helpers/app.cjs');
/* ---------- backdash practice (414 N 414 N …, 2026-09-13, 결정 17(backdash)) ---------- */
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
  assert.deepEqual(Object.keys(a.store.records),[...a.TRIAL_MODES]);assert.deepEqual(Object.keys(a.store.life.trials),[...a.TRIAL_MODES]);
  const b=boot(undefined,undefined,{confirm:()=>true});b.get('dataReset').click();assert.deepEqual(Object.keys(b.store.records),[...b.TRIAL_MODES]);assert.deepEqual(Object.keys(b.store.life.trials),[...b.TRIAL_MODES]);
  const adm=fs.readFileSync(require('node:path').join(__dirname,'../tools/board-admin.js'),'utf8');for(const id of a.BOARDS) assert.ok(adm.includes("['"+id+"', '"),'board-admin.js lists '+id);
});
