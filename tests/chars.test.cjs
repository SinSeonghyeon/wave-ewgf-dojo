// 캐릭터 선택 (결정 34(char-select)) and 초스카이 (결정 33(jfsr)): characters are data, the default character keeps every
// existing path, and a just-frame character judges 6N3+4 on one 60Hz frame through the shared staged-6N3 path.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {boot, dash, F} = require('./helpers/app.cjs');
const hw = (saved={}) => boot({char:'hwoarang', ...saved});
// 6 N 3 + 4: f and n held for f/n frames, the 4 rp ms after the d/f (negative = before it). Times sit on frame centres.
function jf(a, {start=1000, f=1, n=1, rp=0, mid=null}={}){
  const nt=start+f*F, df=nt+n*F, rt=df+rp;
  a.onDir('f',start); a.onDir('n',nt);
  if(rt<df) a.onButton(4,rt);
  if(mid) a.onDir(mid,df-.1);
  a.onDir('df',df);
  if(rt>=df) a.onButton(4,rt);
  a.onDir('n',Math.max(df,rt)+3*F); // let go, as a player does before the next try
  return a.jfp.last;
}

test('the default character is kazuya; a saved or addressed character loads, an unknown one does not',()=>{
  assert.equal(boot().store.char,'kazuya');
  assert.equal(hw().store.char,'hwoarang');
  assert.equal(boot({char:'nobody'}).store.char,'kazuya');
  const a=boot(undefined,undefined,{URLSearchParams,location:{search:'?c=hwoarang',pathname:'/',hash:''}});
  assert.equal(a.store.char,'hwoarang','?c= wins over the saved character');
});
test('modes and boards follow the character capabilities',()=>{
  const k=boot(), h=hw();
  for(const m of ['free','wsc','giwon','wave10','ewgf20','combo10','rush30','bd10']) assert.ok(k.modeAvail(m),'kazuya '+m);
  assert.equal(k.modeAvail('jfsr'),false);
  assert.deepEqual(Object.keys(k.MODES).filter(h.modeAvail),['free','jfsr','wave10','bd10']);
  assert.equal(k.boardMixed('wave10'),true);assert.equal(k.boardMixed('bd10'),true);
  assert.equal(k.boardMixed('ewgf20'),false);assert.equal(k.boardMixed('jfsr'),false);
  assert.ok(k.BOARDS.includes('jfsr'),'the jfsr challenge has a board');
});
test('switching character leaves a mode it cannot play and ends any trial',()=>{
  const a=boot();a.setMode('giwon');a.setChar('hwoarang');
  assert.equal(a.store.char,'hwoarang');assert.equal(a.get('dName').textContent,a.T('mode.free.name'));
  a.setMode('wave10');a.setChar('kazuya');assert.equal(a.get('dName').textContent,a.T('mode.wave10.name'),'a shared mode stays');
  assert.equal(a.get('dDesc').textContent.startsWith(a.T('mode.wave10.desc')),true);
  a.setChar('hwoarang');a.setMode('free');assert.equal(a.get('dDesc').textContent,a.T('mode.free.desc.hwoarang'),'a character may word a shared mode its own way');
});
test('초스카이: 6N3 + 4 on one frame is a success, f and n 1f each is the fastest',()=>{
  let a=hw(), r=jf(a);
  assert.equal(r.kind,'ok');assert.equal(r.fastest,true);assert.equal(r.rp,0);assert.equal(a.store.life.jfsr,1);
  assert.equal(a.get('rTitle').textContent,a.T('jf.fastest'));
  r=jf(a,{start:2000,f:2,n:3});assert.equal(r.kind,'ok');assert.equal(r.fastest,false);assert.equal(r.f,2);assert.equal(r.n,3);
  r=jf(a,{start:3000,rp:-5});assert.equal(r.kind,'ok','4 a few ms before the d/f inside the same frame');
  r=jf(a,{start:4000,mid:'d'});assert.equal(r.kind,'ok','a d passing inside the d/f frame is not a 2');
  assert.equal(a.session.tries,0,'초스카이 never touches the EWGF stats');assert.equal(a.session.attempts.length,0);
  assert.equal(a.jfp.session.tries,4);assert.equal(a.jfp.session.hits,4);assert.equal(a.jfp.session.fastest,3);
});
test('초스카이 misses name what the game would do',()=>{
  let a=hw();
  assert.equal(jf(a,{rp:F}).kind,'late');assert.equal(a.jfp.last.rp,1);
  assert.equal(jf(a,{start:2000,rp:-F}).kind,'early');
  assert.equal(jf(a,{start:3000,rp:F,mid:'d'}).kind,'late','a d inside the d/f frame is no 2, so a late 4 is still 3RK (not a crouch-dash Sky Rocket)');
  a=hw();dash(a,1000);a.onButton(4,1080);assert.equal(a.jfp.last.kind,'via2','6N23+4 = normal Sky Rocket');assert.equal(a.get('rTitle').textContent,a.T('jf.via2.title'));
  a=hw();a.onDir('f',1000);a.onDir('n',1000+F);a.onDir('d',1000+3*F);a.onButton(4,1000+3*F+5);a.tick(1400);assert.equal(a.jfp.last.kind,'d4','4 with the 2');
  a=hw();a.onDir('df',1000);a.onButton(4,1100);assert.equal(a.jfp.last.kind,'df4','3+4 without 6N');
  a=hw();a.onDir('f',1000);a.onDir('n',1000+F);a.onButton(4,1000+2*F);a.tick(1500);assert.equal(a.jfp.last,null,'6N+4 without a 3 is not an attempt');
  assert.equal(a.jfp.session.tries,0);
});
test('a wavedash in front is accepted for practice (the game refuses it)',()=>{
  let a=hw();dash(a,1000);                                  // 6N23
  a.onDir('f',1100);a.onDir('n',1100+F);a.onDir('df',1100+2*F);a.onButton(4,1100+2*F); // cancel 6 → N → 3+4
  assert.equal(a.jfp.last.kind,'ok');
  a=hw();dash(a,1000);
  a.onDir('f',1100);a.onDir('n',1100+2*F);a.onDir('f',1100+4*F);a.onDir('n',1100+5*F);a.onDir('df',1100+6*F);a.onButton(4,1100+6*F); // cancel 6 → N → 6 → N → 3+4
  assert.equal(a.jfp.last.kind,'ok');assert.equal(a.jfp.last.f,1);assert.equal(a.jfp.last.n,1);
});
test('Hwoarang owns none of the Mishima moves; the wave and the backdash still work',()=>{
  const a=hw();
  a.onDir('df',1000);a.onButton(2,1000);assert.equal(a.store.life.giwon,0,'no 기원권');
  dash(a,2000);a.onButton(2,2060);assert.equal(a.session.tries,0,'no EWGF');
  a.onDir('f',3000);a.onDir('n',3020);a.onDir('f',3040);a.onButton(2,3060);assert.equal(a.store.life.tongbal,0,'no 통발');
  assert.equal(a.moveOn('ewgf'),false);assert.equal(a.moveOn('jfsr'),true);
  const b=hw();dash(b,1000);b.onDir('f',1080);b.onDir('n',1100);dash(b,1120);assert.equal(b.cd.chain,2,'the wave links as before');
  assert.equal(b.bdActive(),true,'Korean backdash judging is on');
});
test('a character without a wave makes no crouch dash, and loses the modes that need one',()=>{
  const a=hw();
  a.CHARS.nowave={caps:{wave:false,kbd:false,wsc:false,giwon:false},moves:['jfsr'],jf:{move:'jfsr',btn:4}};
  a.store.moves.nowave={jfsr:1};a.store.char='nowave';
  dash(a,1000);assert.equal(a.session.dashes,0);assert.equal(a.cd.chain,0);
  assert.equal(a.modeAvail('wave10'),false);assert.equal(a.modeAvail('bd10'),false);assert.equal(a.bdActive(),false);
  assert.equal(jf(a,{start:2000}).kind,'ok','the 6N3 just frame does not need a wave');
  delete a.CHARS.nowave;delete a.store.moves.nowave;
});
test('the jfsr 10-try challenge registers only a finished run, with the character',async()=>{
  const a=hw();a.setMode('jfsr');a.jfStartChallenge();
  assert.equal(a.jfp.challenge.status,'countdown');a.time(10000);a.tick(10000);assert.equal(a.jfp.challenge.status,'running');
  for(let i=0;i<10;i++) jf(a,{start:11000+i*500,rp:i%3===2?F:0});
  const c=a.jfp.challenge;assert.equal(c.status,'done');assert.equal(c.stats.tries,10);assert.equal(c.stats.hits,7);
  const e=JSON.parse(JSON.stringify(a.boardEntry(c.result,'jfsr')));
  assert.deepEqual(e,{board:'jfsr',win:c.result.window,lang:a.store.lang,score:7,tie:2,detail:{hits:7,target:10,best:2,char:'hwoarang'}});
  const w=await import(pathToFileURL(path.join(__dirname,'../worker/index.js')).href);
  assert.equal(w.validate({...e,nick:'smoke'}).value.detail.char,'hwoarang');
  assert.equal(w.validate({...e,nick:'smoke',detail:{...e.detail,char:'nobody'}}).value.detail.char,undefined,'an unknown character is dropped, not rejected');
  assert.equal(w.validate({...e,nick:'smoke',detail:{hits:7,target:10,best:2}}).error,undefined,'older sites send no character');
});
test('a mixed board tags each row with its character; old rows read as kazuya',()=>{
  const a=boot();
  a.board.tab='wave10';a.boardSet('wave10',{season:'all',board:'wave10',total:2,rows:[{id:1,rank:1,nick:'aa',score:3,tie:1,detail:{dashes:30,chain:5,char:'hwoarang'}},{id:2,rank:2,nick:'bb',score:2,tie:1,detail:{dashes:20,chain:3}}],me:null,cut10:3});
  a.renderBoard();
  const html=a.get('boardList').innerHTML;
  assert.match(html,new RegExp('aa<small class="char-tag">'+a.T('char.hwoarang.name')));
  assert.match(html,new RegExp('bb<small class="char-tag">'+a.T('char.kazuya.name')));
  a.board.tab='ewgf20';a.boardSet('ewgf20',{season:'all',board:'ewgf20',total:1,rows:[{id:3,rank:1,nick:'cc',score:50,tie:0,detail:{hits:10,target:20,mean:0}}],me:null});
  a.renderBoard();assert.doesNotMatch(a.get('boardList').innerHTML,/char-tag/,'a one-character board has no tags');
});
test('초스카이 retry: a 6 after an abandoned 6N2 or 62 starts a fresh 6N3',()=>{
  let a=hw();a.onDir('f',1000);a.onDir('n',1000+F);a.onDir('d',1000+3*F);         // 6 N 2, given up
  assert.equal(jf(a,{start:1000+6*F}).kind,'ok');
  a=hw();a.onDir('f',1000);a.onDir('d',1000+F);                                      // 6 2 (623 roll), given up
  assert.equal(jf(a,{start:1000+6*F}).kind,'ok');
});
test('a 6N23 with the 2 and 3 on one frame is the same crouch dash for every character (mixed boards)',()=>{
  const run=char=>{ const a=boot({char}); let t=1000;
    a.onDir('f',t);a.onDir('n',t+2*F);a.onDir('d',t+4*F);a.onDir('df',t+4*F+5);
    for(let i=0;i<2;i++){ t+=8*F; a.onDir('f',t);a.onDir('n',t+2*F);a.onDir('f',t+4*F);a.onDir('n',t+6*F);a.onDir('d',t+8*F);a.onDir('df',t+8*F+5); t+=8*F; }
    a.tick(t+1000); return [a.session.dashes,a.session.bestChain]; };
  assert.deepEqual(run('hwoarang'),run('kazuya'));assert.deepEqual(run('kazuya'),[3,3]);
});
test('the worker accepts exactly the app characters',async()=>{
  const w=await import(pathToFileURL(path.join(__dirname,'../worker/index.js')).href);
  assert.deepEqual([...hw().CHAR_IDS],w.CHARS,'worker/index.js CHARS and src/js/02-chars.js CHARS must list the same ids');
});
test('결정 35(button-chord): a held LK turns the Sky Rocket RK into 3+4, which is not a Sky Rocket',()=>{
  const a=hw();a.events.keydown({code:'KeyJ',timeStamp:900,preventDefault(){}});
  assert.equal(jf(a),null,'no attempt from a chord');
});
