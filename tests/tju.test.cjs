// 브라이언·도발 제트어퍼 (결정 37(tju), 결정 34(char-select)): the taunt (1+3+4 on one frame) is read frame by frame on the
// 결정 2(ewgf-judge) 60Hz grid against the measured TJ model — knee on 28f, first input cancels up to 32f, a follow-up combos when
// it lands by 44f, the Jet Upper is 6 N 4+RP with 14f startup — and nothing of it touches the EWGF statistics.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {boot, dash, F, samplePad} = require('./helpers/app.cjs');
const br = (saved={}) => boot({char:'bryan', ...saved});
const at = (s0, f) => (s0 + f - 1) * F;                   // the centre of frame f of a taunt pressed on slot s0 (frame 1 = the press)
function taunt(a, s0){ const t = s0*F; for(const n of [1,3,4]) a.onButton(n,t); return t; }
// a taunt on slot s0, then 6 on frame six held f frames, N held n frames, 4 and the RP `early` frames after it
function tju(a, s0, {six=29, f=1, n=1, early=0, end=40}={}){
  taunt(a,s0); a.onDir('f',at(s0,six)); a.onDir('n',at(s0,six+f)); a.onDir('b',at(s0,six+f+n)); a.onButton(2,at(s0,six+f+n+early));
  a.onDir('n',at(s0,six+f+n+early+3)); a.tick(at(s0,end));
  return a.tjp.last;
}
const pick = (o, ks) => Object.fromEntries(ks.map(k => [k, o[k]]));
const key = (a, type, code, t) => a.events[type]({code, timeStamp:t, target:{tagName:'BODY'}, preventDefault(){}});

test('Bryan: the backdash yes, no wave and none of the Mishima moves; the tju tab and its board',()=>{
  const a=br();
  assert.deepEqual(Object.keys(a.MODES).filter(a.modeAvail),['free','tju','ju','backdash','bd10']);
  assert.equal(boot().modeAvail('tju'),false);assert.equal(boot({char:'hwoarang'}).modeAvail('tju'),false);
  assert.ok(a.BOARDS.includes('tju'));assert.equal(a.boardMixed('tju'),false);assert.equal(a.boardMixed('bd10'),true);
  dash(a,1000);assert.equal(a.session.dashes,0,'no crouch dash, so no wave');
  a.onDir('n',1500);a.onDir('df',2000);a.onButton(2,2000);assert.equal(a.store.life.giwon,0,'no 기원권');assert.equal(a.session.tries,0,'no EWGF');
  assert.equal(a.bdActive(),true,'Korean backdash judging is on');
  assert.equal(a.get('hudChainL').textContent,'BACKDASH','the stage counter counts backdashes, not waves');
  a.setChar('kazuya');assert.equal(a.get('hudChainL').textContent,'WAVE');a.setChar('bryan');
  assert.equal(a.moveOn('tju'),true);assert.equal(a.moveOn('ewgf'),false);
});
test('the coach box follows the character: Bryan starts on the taunt rhythm, not the crouch dash',()=>{
  const a=br();
  assert.equal(a.get('coachMsg').innerHTML,a.T('tj.c.intro'));assert.equal(a.get('segTitle').textContent,a.T('tj.segTitle'));
  assert.match(a.T('tj.c.intro'),/1\+3\+4.*28f.*29f.*30f.*31f.*44f/);
  a.setChar('kazuya');assert.equal(a.get('coachMsg').innerHTML,a.T('coach.intro'));assert.equal(a.get('segTitle').textContent,a.T('seg.title'));
  a.setCoach(['trend.few']);a.setChar('bryan');assert.equal(a.ui.coach[0],'tj.c.intro','advice for Kazuya does not follow onto Bryan');
  const k=boot();k.setCoach(['trend.few']);k.setChar('hwoarang');assert.equal(k.ui.coach[0],'trend.few','Kazuya ↔ Hwoarang keep the last advice as before');
});
test('도발 제트어퍼: 29f 6 · 30f N · 31f 4+RP lands on 44f; a frame later is guarded',()=>{
  const a=br();a.setMode('tju');
  let r=tju(a,600);
  assert.deepEqual(pick(r,['kind','cancel','knee','double']),{kind:'tju',cancel:29,knee:true,double:null});
  assert.deepEqual(pick(r.move,['key','f','hit','fF','nF','early']),{key:'ju',f:31,hit:44,fF:1,nF:1,early:0});
  assert.equal(a.get('rTitle').textContent,a.T('tj.r.tju'));
  assert.equal(a.store.life.tju,1);assert.equal(a.tjp.session.hits,1);
  assert.equal(a.session.tries,0,'the EWGF stats stay untouched');assert.equal(a.session.attempts.length,0);
  r=tju(a,800,{six:30});
  assert.equal(r.kind,'guard');assert.equal(r.move.hit,45);assert.equal(a.get('rTitle').textContent,a.T('tj.r.guard',a.tjLabel('ju')));
  assert.equal(a.tjp.session.tries,2);assert.equal(a.tjp.session.six,1);
});
test('one 29f: the Jet Upper\'s 6 is the frame right after the knee (a just frame), and every "29f" reads that one constant',()=>{
  const a=br();a.setMode('tju');const {TJ,TJ_SIX,TJ_GO}=a;
  assert.equal(TJ_SIX,TJ.KNEE_F+1,'ADV = JU_F + 2: the texts that say "6 on the frame after the knee" rely on it');assert.equal(TJ_SIX,TJ_GO-2);
  taunt(a,600);a.onDir('f',at(600,TJ_SIX));a.tick(at(600,60));  // cancel on the 6 frame, then nothing
  const r=a.tjp.last;assert.deepEqual(pick(r,['kind','cancel']),{kind:'cancel',cancel:TJ_SIX});
  assert.equal(a.tjp.session.six,1,'the count');assert.deepEqual([...a.tjFix(r)],['tj.c.cancelSix',TJ_SIX],'the coach');
  assert.equal(a.get('rKind').textContent,'CANCEL');
  assert.match(a.get('tjStats').innerHTML,new RegExp('<b>1</b>'+a.T('tj.sixCount',TJ_SIX)),'the label names the frame it counts');
  assert.deepEqual([...a.tjFix({kind:'early',cancel:27,knee:false})],['tj.c.early',27,TJ.KNEE_F,TJ_SIX]);
  assert.equal(a.tjFollowKind(true,{key:'ju',su:14,hit:44}),'tju');assert.equal(a.tjFollowKind(true,{key:'b+4',su:16,hit:45}),'guard');
  assert.equal(a.tjFollowKind(false,{key:'ju',su:14,hit:42}),'early','nothing combos before the knee');assert.equal(a.tjFollowKind(true,{key:'x',su:null,hit:null}),'unknown');
});
test('a miss names what came out instead, with the frame it lands on',()=>{
  const cases=[ // [attempt, kind, fields of the verdict, fields of the move]
    [{six:27},'early',{cancel:27,knee:false},{hit:42}],      // cancelled before the knee
    [{six:28},'early',{cancel:28,knee:false},{hit:43}],
    [{n:2},'guard',{cancel:29,knee:true},{nF:2,hit:45}],
    [{f:2},'guard',{cancel:29,knee:true},{fF:2,hit:45}],
    [{early:1},'guard',{cancel:29,knee:true},{early:1,f:32,hit:45}], // 4 one frame before the RP: the Jet Upper starts from the RP
  ];
  for(const [o,kind,row,mv] of cases){
    const a=br();const r=tju(a,600,o);
    assert.equal(r.kind,kind,JSON.stringify(o));assert.deepEqual(pick(r,Object.keys(row)),row,JSON.stringify(o));
    assert.deepEqual(pick(r.move,Object.keys(mv)),mv,JSON.stringify(o));
  }
  let a=br();taunt(a,600);a.onDir('f',at(600,29));a.onDir('b',at(600,30));a.onButton(2,at(600,30));a.tick(at(600,40));
  assert.deepEqual(pick(a.tjp.last.move,['key','why','hit']),{key:'b+2',why:'noN',hit:46},'no neutral: b+2 (17f)');assert.equal(a.tjp.last.kind,'guard');
  a=br();taunt(a,600);a.onDir('f',at(600,29));a.onDir('n',at(600,30));a.onButton(2,at(600,31));a.onDir('b',at(600,32));a.tick(at(600,40));
  assert.deepEqual(pick(a.tjp.last.move,['key','why','hit']),{key:'2',why:'rpFirst',hit:40},'RP before the 4: 2 (10f), which still combos');assert.equal(a.tjp.last.kind,'combo');
  a=br();taunt(a,600);a.onDir('f',at(600,29));a.onDir('n',at(600,30)-3);a.onDir('b',at(600,30)+3);a.onButton(2,at(600,30)+4);a.tick(at(600,40));
  assert.equal(a.tjp.last.move.key,'b+2','6 → N → 4 inside one frame never had its N');
});
test('a slow Jet Upper after the cancel is judged as the follow-up (guard), not dropped by the follow-up deadline (review 2026-10-15)',()=>{
  // the 6 comes two frames after another first input, then the longest measured 6 · N · 4-early (5·6·3f): its RP is 16 frames after the cancel
  let a=br();taunt(a,600);a.onDir('d',at(600,29));a.onDir('f',at(600,31));a.onDir('n',at(600,36));a.onDir('b',at(600,42));a.onButton(2,at(600,45));a.tick(at(600,70));
  assert.deepEqual(pick(a.tjp.last,['kind','cancel']),{kind:'guard',cancel:29});
  assert.deepEqual(pick(a.tjp.last.move,['key','fF','nF','early','hit','out']),{key:'ju',fF:5,nF:6,early:3,hit:58,out:false});
  assert.deepEqual([...a.tjFix(a.tjp.last)],['tj.c.sixLate',31,a.TJ_SIX],'what to fix: the 6 came late');
  // past the measured windows it is still this taunt's follow-up, flagged out
  a=br();const r=tju(a,600,{f:6,n:7,early:4,end:70});
  assert.deepEqual(pick(r,['kind','cancel']),{kind:'guard',cancel:29});assert.equal(r.move.out,true);
  // with nothing more after the cancel the deadline still ends it: WAIT_F frames after the cancel, or after the last step of a 6 N 4
  a=br();taunt(a,600);a.onDir('f',at(600,29));a.tick(at(600,29+a.TJ.WAIT_F+1));assert.equal(a.tjp.last,null,'still waiting while 29f + WAIT_F is not over');
  a.tick(at(600,29+a.TJ.WAIT_F+2));assert.deepEqual(pick(a.tjp.last,['kind','cancel']),{kind:'cancel',cancel:29});
  for(const k of ['JU_F_MAX','JU_N_MAX','JU_B_EARLY']) assert.ok(a.TJ.WAIT_F>a.TJ[k],'every measured step fits the deadline ('+k+')');
});
test('other follow-ups combo when they land by 44f (F14): b+4 only on 29f, a jab up to 32f',()=>{
  const follow=(dir,btn,f)=>{ const a=br();taunt(a,600);if(dir)a.onDir(dir,at(600,f));a.onButton(btn,at(600,f));a.tick(at(600,40));return a.tjp.last; };
  assert.deepEqual(pick(follow('b',4,29),['kind','cancel']),{kind:'combo',cancel:29});assert.equal(follow('b',4,29).move.hit,44);
  assert.equal(follow('b',4,30).kind,'guard');
  assert.deepEqual([follow(null,1,32).kind,follow(null,1,32).move.hit],['combo',41]);
  assert.deepEqual([follow('d',2,31).kind,follow('d',2,31).move.key],['combo','d+2']);
});
test('an input delivered late lands on its own frame even when the clock has already run past it (review 2026-10-15)',()=>{
  let a=br();taunt(a,600);a.tick(at(600,32));               // the clock has read up to 30f: the knee is counted as landed
  a.onDir('f',at(600,28));a.onDir('n',at(600,29));a.onDir('b',at(600,30));a.onButton(2,at(600,30));a.tick(at(600,45));
  assert.deepEqual(pick(a.tjp.last,['kind','cancel','knee']),{kind:'early',cancel:28,knee:false},'a 6 on 28f still cancels before the knee');
  a=br();taunt(a,600);a.tick(at(600,37));                  // the clock is past 32f: the taunt reads as locked
  a.onButton(1,at(600,30));a.tick(at(600,45));
  assert.deepEqual(pick(a.tjp.last,['kind','cancel','knee']),{kind:'combo',cancel:30,knee:true},'an LP on 30f still cancels into a combo');
});
test('an uncancelled taunt plays out to 77f: inputs from 33f are ignored, the run stays busy',()=>{
  let a=br();a.setMode('tju');taunt(a,600);a.tick(at(600,60));
  assert.equal(a.tjBusy(),true);assert.equal(a.tjp.last,null);
  a.tick(at(600,80));assert.equal(a.tjp.last.kind,'none');assert.equal(a.tjp.run,null);assert.equal(a.tjp.last.knee,true);
  a=br();taunt(a,600);a.onDir('f',at(600,33));assert.equal(a.tjLocked(at(600,33)),true,'33f: locked');
  a.onDir('n',at(600,34));a.onDir('b',at(600,35));a.onButton(2,at(600,35));a.tick(at(600,60));
  assert.deepEqual(pick(a.tjp.last,['kind','ignored','cancel']),{kind:'late',ignored:33,cancel:null});assert.equal(a.tjBusy(),true,'the taunt plays on');
  a.tick(at(600,80));assert.equal(a.tjp.run,null);assert.equal(a.tjLocked(at(600,80)),false);
});
test('a double taunt keeps the first press; a taunt after the cancel starts a new one; 1·3·4 over two frames is no taunt',()=>{
  let a=br();taunt(a,600);taunt(a,609);
  a.onDir('f',at(600,29));a.onDir('n',at(600,30));a.onDir('b',at(600,31));a.onButton(2,at(600,31));a.tick(at(600,40));
  assert.deepEqual(pick(a.tjp.last,['kind','double']),{kind:'tju',double:10});
  a=br();taunt(a,600);taunt(a,628);a.tick(at(600,40));
  assert.deepEqual(pick(a.tjp.last,['kind','cancel','again']),{kind:'cancel',cancel:29,again:true});assert.equal(a.tjp.run.s0,628,'the cancel drill');
  a=br();const t=600*F;a.onButton(1,t);a.onButton(3,t+F);a.onButton(4,t+F);a.tick(t+5*F);
  assert.equal(a.tjp.run,null);assert.equal(a.tjp.session.tries,0);assert.equal(a.get('rKind').textContent,'MISS');
});
test('a Jet Upper on its own: the fastest is 6 1f · N 1f · 4+RP together (16f from the 6); the measured leniency',()=>{
  const ju=(f,n,early,o={})=>{ const a=br(), s=600;
    a.onDir('f',s*F);
    if(!o.noN) a.onDir('n',(s+f)*F);
    if(o.rpFirst){ a.onButton(2,(s+f+n)*F); a.onDir('b',(s+f+n+1)*F); }
    else { a.onDir('b',(s+f+(o.noN?0:n))*F); a.onButton(2,(s+f+(o.noN?0:n)+early)*F); }
    a.tick((s+f+n+early+6)*F); return a.tjp.ju; };
  assert.deepEqual(pick(ju(1,1,0),['kind','fast','total']),{kind:'ju',fast:true,total:16});
  assert.deepEqual(pick(ju(3,2,0),['kind','fast','fF','nF','total']),{kind:'ju',fast:false,fF:3,nF:2,total:19});
  assert.deepEqual(pick(ju(1,1,2),['kind','early','total']),{kind:'ju',early:2,total:18});
  assert.equal(ju(5,6,3).kind,'ju','6 up to 5f, N up to 6f, 4 up to 3f early (F5)');
  assert.equal(ju(6,1,0).kind,'slow');assert.equal(ju(1,7,0).kind,'slow');assert.equal(ju(1,1,4).kind,'slow');
  assert.equal(ju(1,1,0,{noN:true}).kind,'b2');assert.equal(ju(1,1,0,{rpFirst:true}).kind,'rp');
  const a=br();a.onDir('f',600*F);a.onDir('n',601*F);a.onDir('b',602*F);a.onButton(2,602*F);a.tick(610*F);
  assert.equal(a.tjp.session.juTries,1);assert.equal(a.tjp.session.tries,0,'never a taunt try');assert.equal(a.get('rTitle').textContent,a.T('tj.j.juFast'));
});
test('keyboard: the 1+3+4 key is one taunt press, and 6 held + 4 is a neutral frame (SOCD, F15)',()=>{
  const a=br();a.setMode('tju');
  key(a,'keydown','KeyL',at(600,1));key(a,'keyup','KeyL',at(600,4));a.tick(at(600,4)); // the frame is read once a later one has begun
  assert.equal(a.tjp.run&&a.tjp.run.s0,600);
  key(a,'keydown','KeyD',at(600,29));                      // 6
  key(a,'keydown','KeyA',at(600,30));                      // 6+4 = N
  key(a,'keyup','KeyD',at(600,31));key(a,'keydown','KeyI',at(600,31)); // 4 + RP
  a.tick(at(600,40));
  assert.deepEqual(pick(a.tjp.last,['kind','cancel']),{kind:'tju',cancel:29});
  key(a,'keyup','KeyA',at(600,45));key(a,'keyup','KeyI',at(600,45));
  key(a,'keydown','KeyL',at(700,1));key(a,'keydown','KeyU',at(700,1));key(a,'keydown','KeyJ',at(700,1));key(a,'keydown','KeyK',at(700,1)); // the key and the buttons together: one taunt
  a.tick(at(700,10));assert.equal(a.tjp.run.s0,700);assert.equal(a.tjp.run.double,null);
  const k=boot();dash(k,1000);key(k,'keydown','KeyL',1070);key(k,'keyup','KeyL',1100);
  assert.equal(k.store.life.hellsweep,0,'Kazuya: the 1+3+4 key does nothing (no 나락 from its 4)');assert.equal(k.session.log.length,0);
});
test('the 1+3+4 key, pad button and touch button are one chord input 1+3+4 (결정 35(button-chord), 결정 37(tju))',()=>{
  const btns=a=>JSON.stringify(a.history.filter(e=>e.btn).map(e=>e.btn));
  let a=br();key(a,'keydown','KeyL',at(600,1));assert.equal(btns(a),'["1+3+4"]','one input, not three presses');
  key(a,'keyup','KeyL',at(600,4));a.tick(at(600,4));assert.equal(a.tjp.run&&a.tjp.run.s0,600,'and it is a taunt');
  a=br();a.time(at(600,1));samplePad(a,[5]);assert.equal(btns(a),'["1+3+4"]','pad RB');
  a=br();const tb=a.get('tbtns');tb.pointerdown({pointerId:1,timeStamp:at(600,1),preventDefault(){},target:{closest:()=>({dataset:{btn:'t'},classList:{add(){},remove(){}},setPointerCapture(){}})}});
  assert.equal(btns(a),'["1+3+4"]','touch taunt button');
  const k=boot();k.time(1000);samplePad(k,[5]);key(k,'keydown','KeyL',1010);assert.equal(btns(k),'[]','Kazuya: neither presses anything');
});
test('the 1+3+4 key: L and pad RB by default; an older save that already uses them keeps every binding',()=>{
  let a=boot();assert.equal(a.store.keys.bt,'KeyL');assert.equal(a.store.padKeys.bt,'b5');
  a=boot({v:4,keys:{up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',b1:'KeyU',b2:'KeyI',b3:'KeyJ',b4:'KeyL'}});
  assert.equal(a.store.keys.b4,'KeyL','the saved 4 key stays');assert.equal(a.store.keys.bt,'','the 1+3+4 key is left unbound');
  a=boot({v:4,keys:{up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',b1:'KeyU',b2:'KeyI',b3:'KeyJ',b4:'KeyK'}});assert.equal(a.store.keys.bt,'KeyL','a free default is taken');
  a=boot({v:4,padKeys:{up:'auto',down:'auto',left:'auto',right:'auto',b1:'b2',b2:'b3',b3:'b0',b4:'b5'}});
  assert.equal(a.store.padKeys.b4,'b5');assert.equal(a.store.padKeys.bt,'none');
  // the saved primaries are refused (a duplicate) and the defaults stand: a saved alternate on RB / L still keeps it (review 2026-10-15)
  a=boot({v:4,padKeys:{up:'auto',down:'auto',left:'auto',right:'auto',b1:'b2',b2:'b3',b3:'b1',b4:'b1'},padAltKeys:{b2:'b5'}});
  assert.equal(a.store.padAltKeys.b2,'b5');assert.equal(a.store.padKeys.bt,'none');
  a=boot({v:4,keys:{up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',b1:'KeyU',b2:'KeyU',b3:'KeyJ',b4:'KeyK'},altKeys:{b2:'KeyL'}});
  assert.equal(a.store.altKeys.b2,'KeyL');assert.equal(a.store.keys.bt,'');
  a=boot({v:4,altKeys:{up:'KeyL'}});assert.equal(a.store.altKeys.up,'KeyL','a save with alternates only');assert.equal(a.store.keys.bt,'');
  // saved unbound, it stays unbound once its key is free again — the keyboard like the pad (review 2026-10-15)
  a=boot({v:4,keys:{up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',b1:'KeyU',b2:'KeyI',b3:'KeyJ',b4:'KeyK',bt:''}});assert.equal(a.store.keys.bt,'','keyboard');
  a=boot({v:4,padKeys:{up:'auto',down:'auto',left:'auto',right:'auto',b1:'b2',b2:'b3',b3:'b0',b4:'b1',bt:'none'}});assert.equal(a.store.padKeys.bt,'none','pad');
});
test('the move toggle and the mode: off = no taunt reading, the tju mode forces it; leaving the mode ends a taunt',()=>{
  let a=br();a.setMove('tju',false);taunt(a,600);a.tick(at(600,40));assert.equal(a.tjp.run,null);assert.equal(a.tjp.view,null);
  a.setMode('tju');assert.equal(a.moveOn('tju'),true);taunt(a,700);assert.equal(a.tjp.run!=null||a.tjIn.open!=null,true);
  a.tick(at(700,3));assert.equal(a.tjp.run.s0,700);a.setMode('free');assert.equal(a.tjp.run,null,'resetInput ends the taunt');
});
test('a direction held from the challenge countdown reads the same in the challenge as in free play (review 2026-10-15)',()=>{
  for(const challenge of [false,true]){
    const a=br();a.setMode('tju');
    if(challenge){ a.time(100*F);a.tjStartChallenge();assert.equal(a.tjp.challenge.status,'countdown'); }
    a.onDir('f',150*F);                                     // 6 pressed in the countdown (or long before the taunt) and held
    a.time(400*F);a.tick(400*F);if(challenge) assert.equal(a.tjp.challenge.status,'running');
    taunt(a,600);a.onDir('n',at(600,29));a.tick(at(600,80)); // let go on 29f: a direction change, so a cancel
    assert.deepEqual(pick(a.tjp.last,['kind','cancel']),{kind:'cancel',cancel:29},challenge ? 'challenge' : 'free play');
  }
});
test('a guarded follow-up shows GUARD on the frame it lands — after the knee\'s reel, never on the reeling bag (review 2026-10-15)',()=>{
  const a=br();a.setMode('tju');const t0=taunt(a,600);
  a.onDir('b',at(600,30));a.onButton(4,at(600,30));a.tick(at(600,40));   // b+4 (16f) on 30f lands on 45f: guarded
  assert.deepEqual(pick(a.tjp.last,['kind']),{kind:'guard'});assert.equal(a.tjp.last.move.hit,45);
  assert.equal(a.world.dummy.guardAt,t0+44*F,'GUARD on 45f');assert.ok(a.world.dummy.guardAt>=t0+a.TJ_LAST*F,'the reel ends with 44f');
});
test('the timeline: 1f, 2~12f, 13~34f one by one, the ignored 35~77f in one cell; the recipe, the +16 band and the follow-up bars',()=>{
  const a=br();a.setMode('tju');tju(a,600);
  const html=a.get('tjAxis').innerHTML, cells=[...html.matchAll(/class="wsc-cell([^"]*)" data-frame="(\d+)" data-to="(\d+)"/g)];
  assert.equal(cells.length,25);
  assert.deepEqual(cells.slice(0,3).map(m=>[+m[2],+m[3]]),[[1,1],[2,12],[13,13]]);assert.deepEqual([+cells.at(-1)[2],+cells.at(-1)[3]],[35,77]);
  assert.deepEqual(cells.filter(m=>+m[2]>32).map(m=>+m[2]),[33,34,35],'two ignored frames keep a cell, the rest share one');
  const cls=f=>cells.find(m=>+m[2]===f)[1];
  assert.match(cls(28),/knee on/);for(const f of [29,30,31]) assert.match(cls(f),/\bgo\b/);assert.match(cls(33),/\blate\b/);
  assert.match(cls(35),/\blast\b.*\bspan\b/,'44f is a tick inside the collapsed cell');assert.match(html,/style="--n:43;--hit:0\.2093"/);
  assert.match(html,new RegExp('<em>'+a.T('tj.tHit')+' 44f</em>'));
  assert.match(a.get('tjAxis').style['grid-template-columns'],/^minmax\(0,1fr\) minmax\(0,1\.4fr\)( minmax\(0,1fr\)){22} minmax\(0,2fr\)$/);
  assert.match(html,/tj-band cancel" style="grid-row:1;grid-column:1\/23"/);assert.match(html,/tj-band ignore" style="grid-row:1;grid-column:23\/26"/);
  // a band ending inside the collapsed cell stops where 44f falls in it: 33 of its 43 frames are left uncovered
  assert.match(html,/tj-band adv" style="grid-row:3;grid-column:19\/26;margin-right:19\.19%"/);
  assert.match(html,/tj-band cmd" style="grid-row:4;grid-column:19\/21">/);assert.match(html,/tj-band cmd lbl l" style="grid-row:4;grid-column:1\/21">/);
  assert.match(html,/tj-band su ok" style="grid-row:4;grid-column:21\/26;margin-right:25\.58%">/);assert.match(html,/tj-band su ok lbl" style="grid-row:4;grid-column:21\/26">/);
  assert.match(a.get('tjCommand').textContent,/29f → · 30f ★ · 31f ←\+RP/);
  tju(a,800,{six:30});assert.match(a.get('tjAxis').innerHTML,/tj-band su no/);
  assert.equal(a.get('tjRows').innerHTML.split('<tr>').length-1,2,'recent rows');
  // a follow-up that starts and lands inside the collapsed cell is cut at both ends: 6 on 32f, LP on 37f (10f) → 46f
  taunt(a,1000);a.onDir('f',at(1000,32));a.onDir('n',at(1000,33));a.onButton(1,at(1000,37));a.tick(at(1000,60));
  assert.equal(a.tjp.view.move.hit,46);
  assert.match(a.get('tjAxis').innerHTML,/tj-band su no" style="grid-row:4;grid-column:25\/26;margin-left:4\.65%;margin-right:72\.09%">/);
});
test('the taunt pose follows the measured video: arms spread from 10f, the knee rises from 22f to its top on 28f, the flex on 77f, then guard',()=>{
  const a=br(), idle=()=>({crouch:0, lean:4, armR:35, armL:-30, spread:0.25}), p=f=>a.tjTauntPose(f, idle), {END_F, KNEE_F}=a.TJ;
  for(const [f,pose] of a.TJ_POSE) for(const k in pose) assert.ok(Math.abs(p(f)[k]-pose[k])<1e-9, f+'f '+k+': the curve passes every keyframe');
  assert.ok(p(21).knee<0.01,'the knee waits for 22f');
  for(let f=22;f<KNEE_F;f++) assert.ok(p(f+1).knee>p(f).knee+0.05,'the knee rises every frame up to 28f ('+f+'f)');
  assert.ok(p(KNEE_F).knee>=0.95,'the knee is up when it lands');
  for(let f=14;f<=KNEE_F;f++) assert.ok(p(f).armR>=90 && p(f).armL<=-95,'arms spread to both sides while the knee comes up ('+f+'f)');
  assert.ok(p(KNEE_F).armL<p(22).armL,'and still opening when it lands');
  assert.ok(p(KNEE_F+2).armR<60 && p(KNEE_F+2).armL>0,'then the fists come in to the chest');
  for(let f=1;f<=END_F+a.TJ_FLEX_F+a.TJ_FLEX_BACK;f+=0.25){ const q=p(f); assert.ok(!q.jump && !(q.crouch<0) && !(q.knee<0) && !(q.knee>1.0001),f+'f: feet on the floor, no overshoot'); }
  assert.ok(p(END_F).armR>100 && p(END_F).lean>5,'the flex: front fist up, leaning in');
  for(const k of ['armR','armL','lean']) assert.equal(p(END_F+a.TJ_FLEX_F)[k],p(END_F)[k],'the flex holds after the taunt ('+k+')');
  const back=p(END_F+a.TJ_FLEX_F+a.TJ_FLEX_BACK);for(const k in idle()) assert.ok(Math.abs(back[k]-idle()[k])<1e-9,'then guard ('+k+')');
  a.fx.taunt(1000);assert.equal(a.poseAt(1000+(KNEE_F-1)*F).knee,a.tjTauntPose(KNEE_F,()=>({})).knee,'poseAt draws the table on the taunt frames');
  a.poseAt(1000+(END_F+a.TJ_FLEX_F)*F);assert.equal(a.anim.kind,'taunt','the flex is still the taunt');
  a.poseAt(1000+(END_F+a.TJ_FLEX_F+a.TJ_FLEX_BACK+1)*F);assert.equal(a.anim.kind,'idle');
  // a cancel eases back to guard from wherever the taunt was: the spread arms and the rising knee do not snap
  const c=br();c.fx.taunt(2000);c.time(2000+25*F);c.fx.tauntCut(false);
  const cut=c.poseAt(c.anim.t0), was=c.tjTauntPose(26,()=>({}));
  for(const k of ['armR','armL','knee','lean']) assert.ok(Math.abs(cut[k]-was[k])<1e-9,'the cancel starts from the 26f pose ('+k+')');
  assert.ok(c.poseAt(c.anim.t0+(c.TJ_CUT_F-1)*F).armR<was.armR-50,'and is nearly back to guard a frame before the end');
  c.poseAt(c.anim.t0+c.TJ_CUT_F*F);assert.equal(c.anim.kind,'idle');
});
test('the tju 10-try challenge: every taunt with a verdict is a try, only a finished run is registered, with the character',async()=>{
  const a=br();a.setMode('tju');a.tjStartChallenge();
  assert.equal(a.tjp.challenge.status,'countdown');a.time(10000);a.tick(10000);assert.equal(a.tjp.challenge.status,'running');
  for(let i=0;i<10;i++) tju(a,700+i*100,{six:i%3===2?30:29});
  const c=a.tjp.challenge;assert.equal(c.status,'done');assert.equal(c.stats.tries,10);assert.equal(c.stats.hits,7);
  const e=JSON.parse(JSON.stringify(a.boardEntry(c.result,'tju')));
  assert.deepEqual(e,{board:'tju',win:c.result.window,lang:a.store.lang,score:7,tie:2,detail:{hits:7,target:10,best:2,char:'bryan'}});
  const w=await import(pathToFileURL(path.join(__dirname,'../worker/index.js')).href);
  const v=w.validate({...e,nick:'smoke'});assert.equal(v.error,undefined);assert.equal(v.value.detail.char,'bryan');
});

// 최속 제트어퍼 연습 (2026-10-16): the Jet Upper alone on a 15-frame axis, frame 1 = the 6. s = the slot of the 6
function ju6(a, s, {f=1, n=1, early=0}={}){ a.onDir('f',s*F); a.onDir('n',(s+f)*F); a.onDir('b',(s+f+n)*F); a.onButton(2,(s+f+n+early)*F); a.tick((s+f+n+early+6)*F); return a.jup.last; }
const bands = a => [...a.get('juAxis').innerHTML.matchAll(/<u class="ju-band ([^"]*)" style="grid-row:(\d);grid-column:(\d+)\/(\d+)">([^<]*)<\/u>/g)].map(m => [m[1], +m[2], +m[3], +m[4], m[5]]);
const marks = a => [...a.get('juAxis').innerHTML.matchAll(/<b>([^<]*)<\/b>/g)].map(m => m[1]);
test('the 최속 제트어퍼 tab: Bryan only, practice only (no challenge, no board), the Jet Upper forced on, its own panel',()=>{
  const a=br();
  assert.equal(a.modeAvail('ju'),true);assert.equal(boot().modeAvail('ju'),false);assert.equal(boot({char:'hwoarang'}).modeAvail('ju'),false);
  assert.equal(a.BOARDS.includes('ju'),false);assert.equal('ju' in a.CHALLENGES,false);assert.equal(a.MODES.ju.start,false);
  a.setMove('tju',false);a.setMode('ju');assert.equal(a.moveOn('tju'),true,'the mode forces the move on');
  assert.equal(a.get('juTimeline').hidden,false);assert.equal(a.get('juPanel').hidden,false);assert.equal(a.get('tjTimeline').hidden,true);
  assert.equal(a.get('dGuide').dataset.page,'guide/tju/');assert.equal(a.get('hudHint').textContent,a.T('hint.ju'));
  assert.equal(a.JU_AXIS,a.TJ.JU_F_MAX+a.TJ.JU_N_MAX+a.TJ.JU_B_EARLY+1,'the slowest measured Jet Upper input fits the axis whole');assert.equal(a.JU_AXIS,15);
  a.setMode('tju');assert.equal(a.get('juTimeline').hidden,true);assert.equal(a.get('juPanel').hidden,true);
});
test('the fastest Jet Upper: 6 1f · N 1f · 4+RP together is a 3f input, drawn frame by frame; no taunt and no EWGF stats',()=>{
  const a=br();a.setMode('ju');const r=ju6(a,600);
  assert.deepEqual(pick(r,['kind','fast','s0','rp','input','fF','nF','early','total']),{kind:'ju',fast:true,s0:600,rp:602,input:3,fF:1,nF:1,early:0,total:16});
  for(const k of ['fF','nF','early','total']) assert.equal(r[k],a.tjp.ju[k],'the same numbers as the judging ('+k+')');
  assert.deepEqual(pick(a.jup.session,['tries','fast','ju','streak','best']),{tries:1,fast:1,ju:1,streak:1,best:1});
  assert.equal(a.tjp.session.tries,0,'not a taunt try');assert.equal(a.session.tries,0,'the EWGF stats stay untouched');
  assert.equal(a.get('rTitle').textContent,a.T('tj.j.juFast'));assert.equal(a.get('juResult').textContent,a.T('tj.res.juFast'));
  const m=marks(a);assert.equal(m.length,15);assert.deepEqual(m.slice(0,4),['→','★','←+RP','']);
  assert.match(a.get('juAxis').innerHTML,/class="wsc-cell go mark rp ok" data-frame="3"/);assert.match(a.get('juAxis').innerHTML,/class="wsc-cell after" data-frame="4"/);
  assert.deepEqual(bands(a),[['ok',1,1,2,'→ 1f'],['ok',1,2,3,'★ 1f'],['in ok',3,1,4,''],['in lbl',3,1,16,a.T('ju.barIn',3)+' · '+a.T('ju.bar.ju',14,16)]]);
  assert.equal(a.get('juAxis').style['grid-template-columns'],'repeat(15,minmax(0,1fr))');
  assert.match(a.get('juAB').innerHTML,/^(<div class="ok">.*?<\/div>){4}$/,'every tile is green');assert.match(a.get('juCommand').textContent,/^1f → · 2f ★ · 3f ←\+RP$/);
});
test('a slower input shows the frames it took: 6 or N held longer, the 4 before the RP, no neutral, the RP first',()=>{
  const cases=[ // [input, the try, the top-row bands]
    [{f:2},{kind:'ju',fast:false,input:4,fF:2,nF:1,early:0,total:17},[['no',1,1,3],['ok',1,3,4]]],
    [{n:3},{kind:'ju',input:5,fF:1,nF:3,early:0,total:18},[['ok',1,1,2],['no',1,2,5]]],
    [{early:2},{kind:'ju',input:5,fF:1,nF:1,early:2,total:18},[['ok',1,1,2],['ok',1,2,3],['no',1,3,5,'← 2f']]],
    [{f:5,n:6,early:3},{kind:'ju',input:15,fF:5,nF:6,early:3},[['no',1,1,6],['no',1,6,12],['no',1,12,15]]],
    [{f:6},{kind:'slow',input:8,fF:6},[['no',1,1,7],['ok',1,7,8]]],
  ];
  for(const [o,want,top] of cases){
    const a=br();a.setMode('ju');const r=ju6(a,600,o);
    assert.deepEqual(pick(r,Object.keys(want)),want,JSON.stringify(o));
    assert.deepEqual(bands(a).filter(b=>b[1]===1).map((b,i)=>b.slice(0,top[i]&&top[i].length>4?5:4)),top,JSON.stringify(o));
    assert.deepEqual(bands(a).find(b=>b[0]==='in no').slice(2,4),[1,Math.min(r.input,15)+1],'the input bar runs to the RP '+JSON.stringify(o));
  }
  let a=br();a.setMode('ju');a.onDir('f',600*F);a.onDir('b',602*F);a.onButton(2,602*F);a.tick(610*F);
  assert.deepEqual(pick(a.jup.last,['kind','input','fF','nF','early']),{kind:'b2',input:3,fF:2,nF:null,early:0},'no neutral: b+2');
  assert.ok(a.get('juAB').innerHTML.includes(a.T('ju.nNone')));assert.ok(bands(a).at(-1)[4].endsWith(a.T('ju.bar.b2')));
  a=br();a.setMode('ju');a.onDir('f',600*F);a.onDir('n',601*F);a.onButton(2,602*F);a.onDir('b',603*F);a.tick(610*F);
  assert.deepEqual(pick(a.jup.last,['kind','input','fF','nF','early']),{kind:'rp',input:3,fF:1,nF:1,early:null},'the RP first: 2');
  assert.ok(a.get('juRows').innerHTML.includes(a.T('ju.rpFirst')));
  assert.deepEqual(pick(a.jup.session,['tries','fast','ju','streak']),{tries:1,fast:0,ju:0,streak:0});
});
test('every RP outside a taunt is a try in this tab: a miss says why no Jet Upper came out',()=>{
  const miss=(fn,why)=>{ const a=br();a.setMode('ju');fn(a);a.tick(900*F);
    assert.deepEqual(pick(a.jup.last,['kind','why']),{kind:'none',why},why);assert.equal(a.jup.session.tries,1,why);
    assert.equal(a.get('rTitle').textContent,a.T('ju.r.none'),why);assert.equal(a.ui.coach[0],'ju.c.'+why,why);return a.jup.last; };
  let r=miss(a=>{a.onDir('b',600*F);a.onButton(2,601*F);},'noSix');assert.equal(r.input,null);
  r=miss(a=>{a.onDir('f',600*F);a.onDir('df',601*F);a.onDir('b',602*F);a.onButton(2,602*F);},'mixed');assert.deepEqual([...r.odd],['df']);assert.equal(r.input,3);
  r=miss(a=>{a.onDir('f',600*F);a.tick(620*F);a.onDir('n',620*F);a.onDir('b',621*F);a.onButton(2,621*F);},'stale');assert.equal(r.input,22);
  r=miss(a=>{a.onDir('f',600*F);a.onDir('n',601*F);a.onDir('b',602*F);a.onButton(2,602*F);a.onButton(3,602*F);},'btns');assert.equal(r.extra,'LK');
  miss(a=>{a.onDir('f',600*F);a.onDir('b',601*F);a.onDir('n',602*F);a.onDir('b',603*F);a.onButton(2,603*F);},'order');
  // too slow, but no N (b+2) or the RP first (2): out of order, not "in order but slow" (review 2026-10-16)
  miss(a=>{a.onDir('f',600*F);a.tick(621*F);a.onDir('b',621*F);a.onButton(2,621*F);},'order');
  miss(a=>{a.onDir('f',600*F);a.onDir('n',601*F);a.tick(622*F);a.onButton(2,622*F);},'order');
  // the arrows of a mixed-in direction follow the side like the axis does
  const s=br();s.setMode('ju');s.onDir('f',600*F);s.onDir('df',601*F);s.onDir('b',602*F);s.onButton(2,602*F);s.tick(620*F);
  assert.ok(bands(s).at(-1)[4].includes('↘'));s.store.side=-1;s.renderJu();
  assert.ok(bands(s).at(-1)[4].includes('↙'),'2P: the reason shows the mirrored arrow');assert.equal(s.get('juDetail').textContent,s.T('ju.c.mixed','↙'));
  // an input past the axis is drawn in the last cell with its frame number
  const a=br();a.setMode('ju');a.onDir('f',600*F);a.tick(620*F);a.onDir('n',620*F);a.onDir('b',621*F);a.onButton(2,621*F);a.tick(640*F);
  assert.ok(20>a.TJ_STALE_F,'the 6 was held past the reading limit');
  assert.deepEqual(marks(a).slice(0,2),['→','']);assert.equal(marks(a)[14],'★ 21f\n←+RP 22f');
});
test('an RP during the last try\'s move is no new try; outside this tab an RP alone is nothing, and a Jet Upper is no try of this tab',()=>{
  let a=br();a.setMode('ju');ju6(a,600);a.onButton(2,(602+a.TJ.JU_F-1)*F);a.tick(700*F);
  assert.equal(a.jup.session.tries,1,'mashing RP inside the Jet Upper');
  a.onButton(2,(602+a.TJ.JU_F+20)*F);a.tick(800*F);assert.equal(a.jup.session.tries,2);assert.equal(a.jup.last.why,'noSix');
  // a whole 6 N 4+RP inside the last Jet Upper is no try either (and no new result), the next one after it is
  a=br();a.setMode('ju');const first=ju6(a,600);const title=a.get('rTitle').textContent;ju6(a,605);
  assert.equal(a.jup.session.tries,1,'a Jet Upper mashed during the last one');assert.equal(a.jup.last,first);assert.equal(a.get('rTitle').textContent,title);
  ju6(a,600+a.TJ.JU_F);assert.equal(a.jup.session.tries,2);
  a=br();ju6(a,600);ju6(a,605);assert.equal(a.tjp.session.juTries,2,'other modes judge every Jet Upper as before');
  a=br();a.onDir('b',600*F);a.onButton(2,601*F);a.tick(610*F);assert.equal(a.jup.last,null);assert.notEqual(a.get('rTitle').textContent,a.T('ju.r.none'));
  ju6(a,700);assert.equal(a.jup.session.tries,0);assert.equal(a.tjp.session.juTries,1,'the free-play count of 16-tju.js still runs');
  a=br();a.setMode('ju');tju(a,600);
  assert.equal(a.tjp.last.kind,'tju','a taunt still works in this tab');assert.equal(a.jup.session.tries,0,'its Jet Upper is the taunt\'s follow-up, not a try here');
});
test('the axis follows a reading in progress, keeps the last try while a 6 is only held, and goes back to it when the reading drops',()=>{
  const a=br();a.setMode('ju');const last=ju6(a,600);
  a.onDir('n',620*F);a.onDir('f',630*F);a.time(634*F);a.tick(634*F);
  assert.equal(a.jup.shown,last,'a 6 alone (walking forward) leaves the last try up');assert.equal(a.get('juLive').textContent,a.T('ju.liveRun',5,3));
  a.onDir('n',632*F);a.time(636*F);a.tick(636*F);
  assert.equal(a.jup.shown,'630:2');assert.deepEqual(marks(a).slice(0,4),['→','','★','']);assert.equal(bands(a).length,0,'no verdict yet');
  a.time(660*F);a.tick(660*F);assert.equal(a.jup.shown,last,'held past the limit: the reading drops, the last try is back');
  assert.equal(a.get('juLive').textContent,a.T('ju.liveDone',3));
});
test('keyboard: 6, 6+4 (neutral) and 4+RP on three frames is the fastest; the stats, the averages and the session reset',()=>{
  const a=br();a.setMode('ju');
  key(a,'keydown','KeyD',600*F);key(a,'keydown','KeyA',601*F);key(a,'keyup','KeyD',602*F);key(a,'keydown','KeyI',602*F);a.tick(610*F);
  assert.deepEqual(pick(a.jup.last,['kind','fast','input']),{kind:'ju',fast:true,input:3});
  key(a,'keyup','KeyA',620*F);key(a,'keyup','KeyI',620*F);
  ju6(a,700,{n:2});ju6(a,800);
  assert.deepEqual(pick(a.jup.session,['tries','fast','ju','streak','best']),{tries:3,fast:2,ju:3,streak:1,best:1});
  assert.equal(a.get('juCounts').textContent,a.T('ju.avg','1.0f','1.3f','3.3f'));
  assert.ok(a.get('juStats').innerHTML.includes('<b>67%</b>'+a.T('ju.rate')));assert.equal(a.get('juRows').innerHTML.split('<tr>').length-1,3);
  a.resetSession();assert.equal(a.jup.last,null);assert.equal(a.jup.session.tries,0);
});
