// Crouch dash / EWGF judging: 60Hz slots, wave chains, 623, mist EWGF, pending buttons, deadlines, streaks.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {boot, dash, F, mistInput} = require('./helpers/app.cjs');
test('mist EWGF distinguishes fastest input, timing failures and missing forward/neutral frames',()=>{
  for(const [f,n,rp,kind,fastest] of [[1,1,0,'ewgf',true],[3,2,0,'ewgf',false],[1,1,F,'wgf',false],[1,1,-F,'early',false],[0,1,0,'early_stage',false],[1,0,0,'early_stage',false]]){
    const a=boot(),r=mistInput(a,{f,n,rp});
    assert.equal(r.kind,kind);assert.equal(r.fastest,fastest);assert.equal(r.inputRoute,'mist');
    assert.equal(r.fFrames,f);assert.equal(r.nFrames,n);assert.equal(r.frameOff,Math.round(rp/F));
    assert.equal(a.session.tries,1);assert.equal(a.session.dashes,0);assert.equal(a.cd.chain,0);
    assert.equal(a.store.life.dashes,0);assert.equal(a.session.hits,kind==='ewgf'?1:0);
    if(f===0||n===0)assert.equal(a.get('rTitle').textContent,a.T('mist.missingFrame'));
  }
});
test('mist uses shared slot boundaries and accepts either RP/diagonal event order',()=>{
  const edge=62.5*F;
  for(const [df,rp] of [[edge-.001,edge-.002],[edge,edge-.001],[edge-.001,edge],[edge,edge],[edge,edge+.001]]){
    const a=boot();a.onDir('f',1000);a.onDir('n',1017);
    if(rp<df){a.onButton(2,rp);a.onDir('df',df);}else{a.onDir('df',df);a.onButton(2,rp);}
    const r=a.session.attempts[0],delta=a.frameSlot(rp)-a.frameSlot(df);
    assert.equal(r.kind,delta===0?'ewgf':delta<0?'early':'wgf');assert.equal(r.frameOff,delta);
  }
  for(const middle of ['d','f',null])for(const rpFirst of [true,false]){
    const a=boot();const r=mistInput(a,{intermediate:middle,rpFirst});
    assert.equal(r.kind,'ewgf');assert.equal(r.fastest,true);assert.equal(a.session.tries,1);
    assert.equal(a.session.dashes,0);assert.equal(a.wsc.active,null);assert.equal(a.anim.kind,'ewgf');
    a.tick(1100);assert.equal(a.session.tries,1,'no replay after resolution');
  }
});
test('mist success pop uses its own label and the same streak priority as dash EWGF',()=>{
  for(const lang of ['ko','en','ja']){
    const a=boot();a.setLang(lang);mistInput(a);
    assert.equal(a.pops.at(-1).text,a.T('pop.mistEwgf'));
    assert.equal(a.get('rTitle').textContent,a.T('mist.fastest'));
    a.onDir('n',1100);mistInput(a,{start:1300});
    assert.equal(a.pops.at(-1).text,a.T('pop.streak',2));
    a.onDir('n',1400);mistInput(a,{start:5000,f:2,n:2});
    assert.equal(a.pops.at(-1).text,a.T('pop.mistEwgf'));
    assert.equal(a.get('rTitle').textContent,a.T('mist.title'));
  }
});
test('mist staging cannot hide a forward/down reversal inside the final slot',()=>{
  for(const directions of [['f','d'],['d','f']])for(const rpFirst of [false,true]){
    const a=boot();a.onDir('f',1000);a.onDir('n',1017);
    if(rpFirst)a.onButton(2,1032);
    a.onDir(directions[0],1033);a.onDir(directions[1],1034);a.onDir('df',1035);
    if(!rpFirst)a.onButton(2,1035);
    a.tick(1100);
    const accepted=directions[0]==='f'&&!rpFirst;
    assert.equal(a.session.hits,accepted?1:0,JSON.stringify({directions,rpFirst}));
    assert.equal(a.session.dashes,directions[0]==='f'?1:0);assert.equal(a.store.life.ewgf,accepted?1:0);
    assert.equal(a.session.tries+a.store.life.giwon,1,'the RP is judged exactly once');
    if(a.session.attempts.length) assert.notEqual(a.session.attempts[0].inputRoute,'mist');
    a.onDir('n',2200);mistInput(a,{start:2300});assert.equal(a.session.hits,accepted?2:1);
  }
});
test('mist slot differences are not rounded elapsed intervals; zero-slot neutral cannot be promoted',()=>{
  const a=boot();a.onDir('f',1008);a.onDir('n',1009);a.onDir('df',1026);a.onButton(2,1026);
  assert.equal(a.session.attempts[0].fastest,true);assert.equal(a.session.attempts[0].fFrames,1);
  const b=boot();b.onDir('f',1000);b.onDir('n',1026);b.onDir('df',1041);b.onButton(2,1041);
  assert.equal(b.session.attempts[0].nFrames,0);assert.equal(b.session.hits,0);
});
test('unresolved same-slot directions replay the original wave, WSC or tongbal exactly once',()=>{
  for(const mode of ['free','wsc']){
    const a=boot();a.setMode(mode);a.onDir('f',1000);a.onDir('n',1017);a.onDir('d',1033);a.onDir('df',1034);
    assert.equal(a.session.dashes,0);a.tick(1050);
    assert.equal(a.session.dashes,mode==='free'?1:0);assert.equal(a.wsc.active.df,1034);
    a.onDir('b',1034+7*F);a.onButton(2,1034+8*F);assert.equal(a.get('rTitle').textContent,a.T('wsc.success'));
  }
  const a=boot();a.onDir('f',1000);a.onDir('n',1017);a.onDir('f',1033);a.onButton(2,1033);a.tick(1050);
  assert.equal(a.store.life.tongbal,1);assert.equal(a.session.tries,0);assert.equal(a.session.dashes,0);
});
test('mist candidate expiration, repetition and cancellation never leak a later success',()=>{
  let a=boot();a.onDir('f',1000);a.onDir('n',1017);a.onButton(2,1033);a.tick(1154);
  assert.equal(a.session.attempts[0].kind,'no_df');a.onDir('df',1155);assert.equal(a.session.tries,1);
  a=boot();a.onDir('f',1000);a.onDir('n',1017);a.onDir('df',1033);a.tick(1484);a.onButton(2,1485);
  assert.equal(a.session.tries,0);assert.equal(a.store.life.giwon,1,'the lapsed candidate leaves a held ↘: 기원권, not an EWGF');
  a=boot();a.onDir('f',1000);a.onDir('n',1017);a.onDir('df',1033);a.onDir('n',1400);a.tick(1484);a.onButton(2,1485);
  assert.equal(a.session.attempts[0].kind,'no_cd');assert.equal(a.session.hits,0);
  a=boot();mistInput(a);a.onButton(2,1034);
  assert.deepEqual(Array.from(a.session.attempts,r=>r.kind),['ewgf']);assert.equal(a.store.life.giwon,1);
  for(const cancel of [a=>a.resetInput(),a=>a.clearCommand(),a=>a.setMode('ewgf20'),a=>a.events.blur(),a=>a.get('setOpen').click()]){
    a=boot();a.onDir('f',1000);a.onDir('n',1017);a.onButton(2,1032);a.onDir('d',1033);cancel(a);a.tick(1050);a.onDir('df',1060);
    assert.equal(a.session.tries,0);assert.equal(a.session.dashes,0);
  }
  a=boot();a.onDir('f',1000);a.onDir('n',1017);a.onDir('df',1033);a.onButton(4,1033);a.tick(1600);
  assert.equal(a.session.tries,0);assert.equal(a.store.life.hellsweep,0);
});
test('mist neutral timeout does not drop a staged down or a pending RP',()=>{
  const a=boot();a.onDir('f',1000);a.onDir('n',1017);a.onDir('d',1265);
  a.tick(1270);a.onDir('df',1285);a.onButton(2,1285);
  assert.equal(a.session.dashes,1);assert.equal(a.session.hits,1);
  assert.equal(a.session.attempts[0].inputRoute,'standard');
  const b=boot();b.onDir('f',1000);b.onDir('n',1017);b.onButton(2,1260);
  b.tick(1270);b.tick(1400);
  assert.equal(b.session.tries,1);assert.equal(b.session.attempts[0].kind,'no_df');
  assert.equal(b.session.attempts[0].t,1260,'retain the original button time');
  const c=boot();c.onDir('f',1000);c.onDir('n',1017);c.onDir('d',1265);c.onButton(2,1266);
  c.tick(1270);c.onDir('df',1271);
  assert.equal(c.session.tries,1);assert.equal(c.session.hits,1,'replay staged down before its pending RP');
  assert.equal(c.session.attempts[0].inputRoute,'standard');
});
test('mist release before RP does not swallow the next standalone command',()=>{
  for(const intermediate of [null,'d']){
    const a=boot();a.onDir('f',1000);a.onDir('n',1017);
    if(intermediate)a.onDir(intermediate,1032);
    a.onDir('df',1033);a.onDir('n',1034);a.onButton(2,1035);
    assert.equal(a.session.hits,1);
    mistInput(a,{start:1100});
    assert.equal(a.session.hits,2);assert.equal(a.session.attempts[1].inputRoute,'mist');
  }
});
test('mist never replaces real down holds, omitted-neutral inputs, dash EWGF or wave links',()=>{
  const a=boot();dash(a);a.onButton(2,1060);assert.equal(a.session.attempts[0].inputRoute,'standard');
  const b=boot();b.onDir('f',1000);b.onDir('d',1017);b.onDir('df',1033);b.onButton(2,1033);
  assert.equal(b.session.attempts[0].inputRoute,'noNeutral');assert.equal(b.session.dashes,1);
  assert.equal(b.session.attempts[0].kind,'ewgf');assert.equal(b.session.hits,1);
  const c=boot();c.onDir('f',1000);c.onDir('n',1017);c.onDir('f',1033);c.onDir('n',1050);c.onDir('df',1067);c.onButton(2,1067);
  assert.equal(c.session.hits,0);assert.equal(c.session.attempts.length,0);assert.equal(c.store.life.giwon,1,'no mist candidate here; the held ↘ makes it a 기원권');
  const d=boot();dash(d);d.onDir('f',1080);d.onDir('n',1100);d.onDir('f',1120);d.onDir('n',1140);d.onDir('df',1160);d.onButton(2,1160);
  assert.equal(d.session.dashes,1);assert.equal(d.session.hits,0);
});
test('623 shares wave and EWGF judging across modes, including early RP and late WGF',()=>{
  for(const mode of ['free','wave10','ewgf20','combo10','rush30','bd10','wsc'])for(const offset of [-2,0,20]){
    const a=boot();a.setMode(mode);
    if(!['free','wsc'].includes(mode)){a.startTrial();const go=a.timers.get(a.trial.cdTimer);go();go();go();}
    a.onDir('f',1100);a.onDir('d',1120);
    if(offset<0)a.onButton(2,1140+offset);
    a.onDir('df',1140);
    if(offset>=0){ // an early RP resolves inside completeCD and clears the command, so read the cycle first
      assert.equal(a.cd.chainCycles.length,1);assert.equal(a.cd.chainCycles[0].nGap,0,'the omitted neutral is a zero-length segment');
      a.onButton(2,1140+offset);
    }
    assert.equal(a.session.dashes,mode==='wsc'?0:1);
    assert.equal(a.session.hits,mode==='wsc'||offset===20?0:1);
    assert.equal(a.session.tries,mode==='wsc'?0:1);
    if(mode!=='wsc'){
      assert.equal(a.session.attempts[0].inputRoute,'noNeutral');
      assert.equal(a.session.attempts[0].kind,offset===20?'wgf':'ewgf');
    }else assert.equal(a.wsc.session.tries,0);
    if(mode==='wave10'||mode==='ewgf20'||mode==='combo10')assert.equal(a.trial.count,1);
    if(mode==='rush30')assert.equal(a.trial.dashPts,1);
    const expected=offset===20?'a.wgf.title':mode==='combo10'?'a.combo.title':'a.ewgf.title';
    for(const lang of ['ko','en','ja']){a.setLang(lang);assert.equal(a.get('rTitle').textContent,a.T(expected));}
  }
});
test('623 provenance survives release/cancel and resets for a standard or mist input',()=>{
  for(const release of ['n','f']){
    const a=boot();a.onDir('f',1000);a.onDir('d',1020);a.onDir('df',1035);a.onDir(release,1036);a.onButton(2,1037);
    assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.session.attempts[0].inputRoute,'noNeutral');
    a.resetInput();a.onDir('f',1100);a.onDir('n',1120);a.onDir('d',1120);a.onDir('df',1140);a.onButton(2,1140);
    assert.equal(a.session.attempts[1].kind,'ewgf');assert.equal(a.session.attempts[1].inputRoute,'standard');
    a.onDir('n',1200);mistInput(a,{start:1300});assert.equal(a.session.attempts[2].inputRoute,'mist');assert.equal(a.session.hits,3);
  }
  for(const early of [false,true]){
    const a=boot();a.onDir('f',1000);a.onDir('d',1020);
    if(early)a.onButton(4,1039);
    a.onDir('df',1040);if(!early)a.onButton(4,1040);
    assert.equal(a.store.life.hellsweep,1);assert.equal(a.session.tries,0);
  }
});
test('623 wave chains retain distinct cancel/start forwards and zero neutral gaps',()=>{
  for(const mode of ['free','wave10','rush30']){
    const a=boot();a.setMode(mode);
    if(mode!=='free'){a.startTrial();const go=a.timers.get(a.trial.cdTimer);go();go();go();}
    a.onDir('f',1100);a.onDir('d',1120);a.onDir('df',1140);
    a.onDir('f',1160);a.onDir('n',1180);a.onDir('f',1200);a.onDir('d',1220);a.onDir('df',1240);
    assert.equal(a.session.dashes,2);assert.equal(a.cd.chain,2);
    assert.deepEqual(Array.from(a.cd.chainCycles,c=>c.nGap),[0,0]);
    if(mode==='wave10')assert.equal(a.trial.count,2);
    if(mode==='rush30')assert.equal(a.trial.dashPts,3);
    a.onDir('f',1260);a.onDir('d',1280);a.onDir('df',1300);
    assert.equal(a.session.dashes,2,'cancel forward cannot double as start forward');
  }
  // the one release between d/f and the cancel 6 may be neutral or down (cd states 4 -> 7)
  for(const release of ['n','d']){
    const a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.onDir('df',1060);
    a.onDir(release,1080);a.onDir('f',1100);a.onDir('n',1120);a.onDir('f',1140);a.onDir('d',1160);a.onDir('df',1180);
    assert.equal(a.cd.chain,2,release);
  }
});
test('623 seeds and refreshes WSC challenge prefixes without consuming tasks early',()=>{
  for(const initialNeutral of [false,true]){
    const a=boot();a.setMode('wsc');a.wscStartChallenge();a.time(4100);a.tick(4100);
    a.wsc.challenge.taskN=1;
    a.onDir('f',4200);if(initialNeutral)a.onDir('n',4210);a.onDir('d',4220);a.onDir('df',4240);
    assert.equal(a.wsc.active.waves,1);assert.equal(a.wsc.challenge.stats.tries,0);
    a.onDir('f',4260);a.onDir('n',4280);a.onDir('f',4300);a.onDir('d',4320);a.onDir('df',4340);
    assert.equal(a.wsc.active.waves,2);assert.equal(a.wsc.active.df,4340);
    a.onDir('b',4340+7*F);a.onButton(2,4340+8*F);
    assert.equal(a.wsc.session.hits,1);assert.equal(a.wsc.challenge.stats.hits,1);
    assert.equal(a.session.tries,0);assert.equal(a.store.life.dashes,0);
  }
  // the WSC wave counter must agree with cd.chain for either release direction, 623 or 6N23
  for(const release of ['n','d'])for(const neutral of [false,true]){
    const a=boot();a.setMode('wsc');
    a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.onDir('df',1060);
    a.onDir(release,1080);a.onDir('f',1100);a.onDir('n',1120);a.onDir('f',1140);
    if(neutral)a.onDir('n',1150);
    a.onDir('d',1160);a.onDir('df',1180);
    assert.equal(a.wsc.active.waves,2,JSON.stringify({release,neutral}));
  }
});
test('mist uses existing trial scores without wave credits and does not consume WSC tasks',()=>{
  for(const mode of ['wave10','ewgf20','combo10','rush30','bd10']){
    const a=boot();a.setMode(mode);a.startTrial();const go=a.timers.get(a.trial.cdTimer);go();go();go();
    const before=a.trial.count;mistInput(a,{start:4100});
    assert.equal(a.session.dashes,0);assert.equal(a.store.life.dashes,0);
    if(mode==='ewgf20'||mode==='combo10')assert.equal(a.trial.count,before+1);else assert.equal(a.trial.count,before);
    if(mode==='rush30')assert.equal(a.trial.dashPts,0);
    if(mode==='combo10')assert.notEqual(a.get('rTitle').textContent,'최속 무족초!');
    if(mode==='bd10')assert.equal(a.trial.dist,0);
  }
  const a=boot();a.setMode('wsc');a.wscStartChallenge();a.time(4100);a.tick(4100);
  const task=a.wsc.challenge.taskN;mistInput(a,{start:4200});
  assert.equal(a.wsc.challenge.taskN,task);assert.equal(a.wsc.challenge.stats.tries,0);assert.equal(a.wsc.session.tries,0);
  assert.equal(a.session.tries,0);assert.equal(a.store.life.ewgf,0);assert.equal(a.anim.kind,'ewgf');
});
test('mist result, log, coach and segments translate without losing timing or streak',()=>{
  const a=boot();a.get('segBar').children=Array.from({length:5},()=>({style:{}}));mistInput(a,{f:3,n:2});
  for(const lang of ['en','ja','ko']){
    a.setLang(lang);assert.equal(a.get('rTitle').textContent,a.T('mist.title'));
    assert.equal(a.get('rKind').textContent,a.T('route.mist'));assert.equal(a.get('rOff').textContent,a.T('mist.frames',3,2,0));
    assert.equal(a.get('coachMsg').innerHTML,a.T('mist.improve',2,1));assert.equal(a.get('segTitle').textContent,a.T('mist.segTitle'));
    assert.ok(a.get('logBody').innerHTML.includes(a.T('route.mist')));assert.equal(a.get('segBar').children[3].textContent,'');
  }
  a.onDir('n',1100);mistInput(a,{start:2000});assert.equal(a.combo.n,2);assert.equal(a.session.hits,2);
});
test('staged wave input before a trial deadline is counted, but input on the boundary is excluded',()=>{
  for(const df of [10991,11000]){
    const a=boot();a.setMode('wave10');a.startTrial();const go=a.timers.get(a.trial.cdTimer);go();go();go();
    a.onDir('f',10940);a.onDir('n',10960);a.onDir('d',10990);a.onDir('df',df);a.trialTick(11010);
    assert.equal(a.store.records.wave10[0].dashes,df<11000?1:0);
  }
});
test('mist gamepad late RP retains its path and release order does not create a false dash',()=>{
  const a=boot();
  const sample=(t,indices)=>{a.time(t);a.pads([{index:0,id:'pad',mapping:'standard',axes:[0,0],timestamp:t,buttons:Array.from({length:16},(_,i)=>({pressed:indices.includes(i),value:0}))}]);a.pollPad();};
  sample(1000,[15]);sample(1017,[]);sample(1034,[13,15]);sample(1050,[13,15,3]);
  assert.equal(a.session.attempts[0].inputRoute,'mist');assert.equal(a.session.attempts[0].kind,'wgf');assert.equal(a.session.dashes,0);
  sample(1051,[15]);sample(1052,[]);sample(1100,[15]);sample(1117,[]);sample(1134,[13,15,3]);
  assert.equal(a.session.attempts[1].inputRoute,'mist');assert.equal(a.session.attempts[1].fastest,true);
});
test('staged directions reach backdash recovery immediately and replay without duplicate correction',()=>{
  for(const intermediate of [false,true]){
    const a=boot();a.bdRec.until=2000;
    a.onDir('f',1000);a.onDir('n',1017);
    if(intermediate)a.onDir('d',1033);
    a.onDir('df',1034);assert.ok(a.bdRec.until<=1034);
    a.onButton(2,1034);a.onDir('f',1035);a.onDir('n',1036);a.tick(1100);
    assert.equal(a.session.dashes,0);assert.equal(a.session.hits,1);assert.equal(a.session.bd.dist,0);
  }
});
test('default window and legacy or invalid saved windows use Normal 12ms',()=>{
  for(const saved of [undefined,{v:3,window:8},{v:4},{v:4,window:100},{v:4,window:'12'}]){
    assert.equal(boot(saved).store.window,12);
  }
});
test('valid saved window choices survive the default change',()=>{
  for(const window of [8,12,15]) assert.equal(boot({v:4,window}).store.window,window);
});
test('EWGF compares absolute rounded 60Hz slots, independently of legacy window and render ticks',()=>{
  const slot=t=>Math.floor(t/F+0.5), edge=63.5*F;
  for(const window of [8,12,15]) for(const [df,rp] of [[1007,1009],[1000,1007],[edge-.001,edge],[edge,edge+.001],[edge,edge-.001],[1060,1056],[1060,1060],[1060,1070]]){
    const a=boot({v:4,window});a.onDir('f',df-60);a.onDir('n',df-40);a.onDir('d',df-20);
    if(rp<df){a.onButton(2,rp);a.onDir('df',df);}else{a.onDir('df',df);a.onButton(2,rp);}
    const expected=slot(rp)===slot(df)?'ewgf':slot(rp)<slot(df)?'early':'wgf';
    assert.equal(a.session.attempts.length,1);assert.equal(a.session.attempts[0].kind,expected,JSON.stringify({df,rp,window}));
    assert.equal(a.session.attempts[0].frameOff,slot(rp)-slot(df));
    const bins=a.histBins(a.session.attempts,window);assert.equal(bins[6+slot(rp)-slot(df)].n,1);
  }
});
test('normal EWGF consumes its command',()=>{
  const a=boot();dash(a);a.onButton(2,1060);a.onDir('n',1062);a.onButton(2,1064);
  assert.deepEqual(Array.from(a.session.attempts,x=>x.kind),['ewgf','no_cd']);
  const b=boot();dash(b);b.onButton(2,1060);b.onButton(2,1064);   // ↘ never released: d/f+RP is 기원권
  assert.deepEqual(Array.from(b.session.attempts,x=>x.kind),['ewgf']);assert.equal(b.store.life.giwon,1);
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
  dash(a,2000);a.onDir('n',2100);a.onButton(2,3000);assert.equal(a.session.attempts.at(-1).kind,'no_cd');
});
test('negative offset is judged once against incoming diagonal',()=>{
  const a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.onButton(2,1056);a.onDir('df',1060);
  assert.equal(a.session.attempts[0].off,-4);assert.equal(a.session.attempts[0].kind,'early');assert.equal(a.cd.pending,null);
});
test('expired pending button cannot become an EWGF',()=>{
  const a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.onButton(2,1050);a.onDir('df',1180);
  assert.equal(a.session.attempts[0].kind,'no_df');assert.equal(a.session.dashes,0);
});
test('mode switch and session reset cancel countdowns',()=>{
  const a=boot();a.setMode('wave10');a.startTrial();const id=a.trial.cdTimer;a.setMode('free');
  assert.equal(a.timers.has(id),false);assert.equal(a.trial.running,false);assert.equal(a.get('dStart').disabled,false);
  a.setMode('ewgf20');a.startTrial();a.resetSession();assert.equal(a.trial.cdTimer,null);assert.equal(a.cd.state,0);
});
test('trial start discards commands begun during countdown',()=>{
  const a=boot();a.setMode('ewgf20');a.startTrial();dash(a);a.onDir('n',1080);const countdown=a.timers.get(a.trial.cdTimer);
  a.time(4000);countdown();countdown();countdown();a.onButton(2,4001);
  assert.equal(a.session.attempts.at(-1).kind,'no_cd');assert.equal(a.trial.count,1);
});
test('wave deadline excludes dash arriving at the end boundary',()=>{
  const a=boot();a.setMode('wave10');a.startTrial();const countdown=a.timers.get(a.trial.cdTimer);countdown();countdown();countdown();
  dash(a,10940);assert.equal(a.trial.running,false);assert.equal(a.store.records.wave10[0].dashes,0);
});
test('blur clears unfinished input and cancels trial',()=>{
  const a=boot();a.setMode('wave10');a.startTrial();dash(a);a.events.blur();
  assert.equal(a.cd.state,0);assert.equal(a.cd.chain,0);assert.equal(a.trial.cdTimer,null);
});
test('session totals survive the 300-attempt history limit',()=>{
  const a=boot();dash(a);a.onButton(2,1060);a.onDir('n',1070);
  for(let i=0;i<301;i++) a.onButton(2,2000+i*10);
  assert.equal(a.session.attempts.length,300);assert.equal(a.session.tries,302);assert.equal(a.session.hits,1);
  assert.equal(a.get('stTry').textContent,302);
  a.resetSession();assert.equal(a.session.tries,0);assert.equal(a.session.hits,0);
});
test('EWGF streak counts consecutive successes, resets on failure, fault, 3s gap, mode/reset/blur, and caps the look at level 6',()=>{
  const a=boot();
  const hit=t=>{dash(a,t);a.onButton(2,t+60);};
  hit(1000);assert.equal(a.combo.n,1);assert.equal(a.pops.at(-1).text,'EWGF!');assert.equal(a.pops.at(-1).lvl,1);assert.equal(a.session.attempts.at(-1).streak,1);
  hit(2000);hit(3000);assert.equal(a.combo.n,3);assert.equal(a.pops.at(-1).text,'EWGF ×3');assert.equal(a.pops.at(-1).lvl,3);
  assert.match(a.get('rOff').textContent,/streak 3/);
  hit(6100);assert.equal(a.combo.n,1,'more than 3s since the last EWGF starts over');
  hit(7000);hit(8000);hit(9000);assert.equal(a.pops.at(-1).text,'EWGF ×4!');hit(10000);assert.equal(a.pops.at(-1).text,'EWGF ×5!!');assert.equal(a.pops.at(-1).lvl,5);
  hit(11000);hit(12000);assert.equal(a.combo.n,7);assert.equal(a.pops.at(-1).text,'EWGF ×7!!');assert.equal(a.pops.at(-1).lvl,6,'look frozen at 6');
  dash(a,13000);a.onButton(2,13100);assert.equal(a.session.attempts.at(-1).kind,'wgf');assert.equal(a.combo.n,0,'a late WGF breaks the streak');
  hit(14000);a.onDir('f',15000);a.onDir('df',15010);a.tick(15600);assert.equal(a.combo.n,0,'a fault breaks the streak (staged until the ↘ leaves)');
  hit(16000);a.setMode('ewgf20');assert.equal(a.combo.n,0);a.setMode('free');
  hit(17000);a.resetSession();assert.equal(a.combo.n,0);
  hit(18000);a.events.blur();assert.equal(a.combo.n,0);
  a.setLang('ko');hit(19000);hit(20000);hit(21000);assert.equal(a.pops.at(-1).text,'3초');hit(22000);assert.equal(a.pops.at(-1).text,'4초!');hit(23000);assert.equal(a.pops.at(-1).text,'5초!!');
});
test('f,N,f is a dash; the wave cancel 6 alone is not but cancel 6 → N → start 6 is a short dash without the Dash EWGF label; slow or broken pairs do nothing',()=>{
  let a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('f',1040);
  a.tick(1050); // the final forward slot can also become the three-button mist diagonal
  assert.equal(a.anim.kind,'dash');assert.ok(a.anim.moveTo>a.anim.moveFrom);assert.equal(a.cd.dashT,1040);assert.equal(a.cd.dashWave,false);assert.equal(a.cd.state,1,'second f is still the start 6');
  a=boot();dash(a);a.onDir('f',1100);
  assert.equal(a.anim.kind,'cd','the cancel 6 alone is not a dash');assert.ok(a.cd.dashT<0);
  a.onDir('n',1120);a.onDir('f',1140);
  assert.equal(a.anim.kind,'dash','cancel 6 → N → start 6 is a dash (2026-09-12)');assert.equal(a.cd.dashT,1140);assert.equal(a.cd.dashWave,true);assert.equal(a.cd.state,1);
  assert.equal(a.anim.moveTo-a.anim.moveFrom,24,'wave restart dash is the short one');
  a.onDir('n',1160);a.onDir('d',1180);a.onDir('df',1200);assert.equal(a.cd.chain,2,'judging unchanged');
  a.onButton(2,1200);assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.session.attempts[0].dash,false,'no Dash EWGF label after a wave restart');assert.equal(a.get('rTitle').textContent,'EWGF!');
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('f',1300);assert.notEqual(a.anim.kind,'dash','too slow');
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1030);a.onDir('n',1040);a.onDir('f',1050);assert.notEqual(a.anim.kind,'dash','d breaks the pair');
  a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('b',1040);a.onDir('n',1060);a.onDir('b',1080);
  assert.equal(a.anim.kind,'backdash');assert.ok(a.anim.moveTo<a.anim.moveFrom);assert.equal(a.cd.state,0);
  a=boot({v:4,side:-1});a.onDir('b',1000);a.onDir('n',1020);a.onDir('b',1040);assert.equal(a.anim.kind,'backdash');assert.ok(a.anim.moveTo>a.anim.moveFrom,'2P side mirrors');
});
test('dash EWGF (f,f,N,d,df+2) is judged as a normal EWGF and labeled Dash EWGF',()=>{
  const a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('f',1040);a.onDir('n',1060);a.onDir('d',1080);a.onDir('df',1100);a.onButton(2,1100);
  const at=a.session.attempts[0];assert.equal(at.kind,'ewgf');assert.equal(at.off,0);assert.equal(at.dash,true);
  assert.equal(a.get('rTitle').textContent,'Dash EWGF!');assert.equal(a.get('rKind').textContent,'DASH ELECTRIC WIND GOD FIST');assert.equal(a.pops.at(-1).text,'Dash EWGF!');
  assert.ok(a.get('logBody').innerHTML.includes('Dash EWGF'));
  a.onDir('f',2000);a.onDir('n',2020);a.onDir('f',2040);a.onDir('n',2060);a.onDir('d',2080);a.onDir('df',2100);a.onButton(2,2100);
  assert.equal(a.session.attempts[1].dash,true);assert.equal(a.pops.at(-1).text,'EWGF ×2','second in a row shows the streak');
  dash(a,3000);a.onButton(2,3060);assert.equal(a.session.attempts[2].dash,false);assert.equal(a.get('rTitle').textContent,'EWGF!');
});
