// Strikes (통발·나락) and rush30 (더미 격파) scoring.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {boot, dash} = require('./helpers/app.cjs');
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
  for(const cancel of [a=>a.resetSession(),a=>a.events.blur(),a=>a.get('setOpen').click(),a=>a.setMode('free')]){
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
  a.updateDummy(4279);assert.equal(a.world.dummy.y,0,'launch delay is preserved');
  a.updateDummy(4280);assert.ok(a.world.dummy.y<0);
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
