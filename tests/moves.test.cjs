// 기술 온오프 (결정 32(move-toggle)): a move that is off is judged as if it did not exist; modes force the moves they need.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {boot, dash, mistInput} = require('./helpers/app.cjs');
const off = (...ks) => ({moves:Object.fromEntries(ks.map(k=>[k,0]))});

test('stored move toggles load as 0/1 only, default on',()=>{
  assert.deepEqual({...boot().store.moves},{ewgf:1,mist:1,tongbal:1,hellsweep:1,giwon:1});
  const a=boot({moves:{giwon:0,tongbal:'x',ewgf:2}});
  assert.deepEqual({...a.store.moves},{ewgf:1,mist:1,tongbal:1,hellsweep:1,giwon:0});
});
test('기원권 off: ↘+RP falls through to the failed EWGF, and the 6→↘ fault is not held for it',()=>{
  let a=boot(off('giwon'));a.onDir('df',1000);a.onButton(2,1100);
  assert.equal(a.store.life.giwon,0);assert.equal(a.session.attempts[0].kind,'no_cd');
  a=boot(off('giwon'));a.onDir('f',1000);a.onDir('df',1020);assert.equal(a.cd.gFault,null,'fired at once');assert.equal(a.get('rKind').textContent,'MISS');
  a=boot();a.onDir('df',1000);a.onButton(2,1100);assert.equal(a.store.life.giwon,1,'on by default');
});
test('통발 off: f,f+2 is an early-stage EWGF miss; 나락 off: 4 is ignored',()=>{
  let a=boot(off('tongbal'));a.onDir('f',1000);a.onDir('n',1020);a.onDir('f',1040);a.onButton(2,1200);
  assert.equal(a.store.life.tongbal,0);assert.equal(a.session.attempts[0].kind,'early_stage');
  a=boot(off('hellsweep'));dash(a);a.onButton(4,1200);
  assert.equal(a.store.life.hellsweep,0);assert.equal(a.get('rTitle').textContent,'Crouch dash','the dash card stays');
  a=boot(off('hellsweep'));a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.onButton(4,1050);assert.equal(a.cd.pending,null,'no pending 4');
});
test('초풍 off: no EWGF-family result at all; an RP with ↘ held becomes 기원권',()=>{
  let a=boot(off('ewgf'));dash(a);a.onButton(2,1060);
  assert.equal(a.session.tries,0);assert.equal(a.session.attempts.length,0);assert.equal(a.store.life.giwon,1,'6N23+RP → 기원권');
  a=boot(off('ewgf'));dash(a);a.onDir('n',1080);a.onButton(2,1100);a.tick(1300);
  assert.equal(a.session.tries,0);assert.equal(a.store.life.giwon,0);
  a=boot(off('ewgf'));a.onButton(2,1000);a.tick(1200);assert.equal(a.session.tries,0);assert.equal(a.get('rKind').textContent,'READY');
  a=boot(off('ewgf','giwon'));dash(a);a.onButton(2,1060);a.tick(1300);assert.equal(a.session.tries,0);assert.equal(a.store.life.giwon,0,'nothing left to fall to');
});
test('무족초 off (or 초풍 off): 6N3+RP takes the ordinary path, never the mist route',()=>{
  for(const s of [off('mist'),off('ewgf')]){
    const a=boot(s);mistInput(a);a.tick(1300);
    assert.ok(!a.session.attempts.some(x=>x.inputRoute==='mist'),JSON.stringify(s));
  }
  assert.equal(boot(off('ewgf')).moveOn('mist'),false,'mist needs EWGF');
  const a=boot();assert.equal(mistInput(a).inputRoute,'mist','on by default');
});
test('modes force the moves they need, and the mode description lists what is off',()=>{
  let a=boot(off('ewgf','giwon','tongbal'));a.setMode('ewgf20');dash(a);a.onButton(2,1060);
  assert.equal(a.session.attempts[0].kind,'ewgf','EWGF ×20 forces EWGF');
  assert.match(a.get('dDesc').textContent,/f,f\+2, d\/f\+2|통발, 기원권/);assert.doesNotMatch(a.get('dDesc').textContent,/EWGF,|초풍,/);
  a=boot(off('ewgf','giwon'));a.setMode('giwon');assert.deepEqual([...a.movesOff()],[]);
  a.onDir('df',1000);a.onButton(2,1100);assert.equal(a.store.life.giwon,1,'the link mode forces 기원권');
  a=boot(off('giwon'));a.setMode('rush30');assert.deepEqual([...a.movesOff()],['giwon'],'every other mode follows the setting');
});
test('MOVE_FORCED names real modes and real move ids',()=>{
  const a=boot();
  for(const [m,ks] of Object.entries(a.MOVE_FORCED)){ assert.ok(m in a.MODES,m); for(const k of ks) assert.ok(a.MOVE_IDS.includes(k),k); }
});
test('초풍 off: the 기원권 coach drops the "aiming for EWGF" hint',()=>{
  let a=boot();a.onDir('df',1000);a.onButton(2,1100);
  assert.ok(a.get('coachMsg').innerHTML.includes(a.T('a.giwon.hint')),'hint with EWGF on');
  a=boot(off('ewgf'));a.onDir('df',1000);a.onButton(2,1100);
  assert.equal(a.store.life.giwon,1);assert.ok(!a.get('coachMsg').innerHTML.includes(a.T('a.giwon.hint')),'no EWGF hint');
});
