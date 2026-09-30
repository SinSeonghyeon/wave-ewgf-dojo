// Dialogs and interruptions: settings/donate/reward flows cancelling trials, daily gift, donation nudges.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {html, boot, dash} = require('./helpers/app.cjs');
test('dash progress is flushed on pagehide even when blur clears the chain first',()=>{
  let saved;
  const a=boot(undefined,undefined,{localStorage:{getItem:()=>null,setItem:(k,v)=>saved=JSON.parse(v)}});
  dash(a);a.events.blur();a.events.pagehide();
  assert.equal(saved.life.dashes,1);assert.equal(saved.life.maxChain,1);
});
test('daily gift updates attendance before the minute timer at KST midnight',()=>{
  let wall=Date.parse('2026-09-13T14:59:59Z');
  class ClockDate extends Date { constructor(...args){super(...(args.length?args:[wall]));} static now(){return wall;} }
  const a=boot(undefined,undefined,{Date:ClockDate});a.dailyGift();
  wall+=2000;a.dailyGift();
  assert.equal(a.store.life.days,2);assert.equal(a.store.life.giftDay,'2026-09-14');
  assert.equal(a.store.pendingRewards.at(-1).day,2);a.dailyGift();assert.equal(a.store.life.days,2);
  assert.equal(new Set(a.store.pendingRewards.filter(j=>j.kind==='daily').map(j=>j.id)).size,2,'unclaimed daily gifts are excluded from the next day pool');
});
test('donation prompts are capped daily and an active header nudge defers across blocking UI',()=>{
  let wall=Date.parse('2026-09-15T03:00:00Z');
  class ClockDate extends Date { constructor(...args){super(...(args.length?args:[wall]));} static now(){return wall;} }
  const a=boot({v:4,lang:'ko'},undefined,{Date:ClockDate});a.get('nickDlg').open=false;
  assert.equal(a.takeResultDonate(false),false);
  assert.equal(a.takeResultDonate(true),true);
  assert.equal(a.takeResultDonate(true),false,'a second personal best on the same KST day is quiet');
  a.practiceInput();
  for(let ms=2000;ms<=601000;ms+=1000){ a.time(ms); if(ms%20000===0) a.practiceInput(); a.practiceTick(ms); }
  assert.equal(a.store.donatePlayMs,a.DONATE_ACTIVE_MS);
  assert.equal(a.get('donateBubble').hidden,false);
  assert.equal(a.get('donateNudge').dataset.active,'true');
  a.setMode('wave10');a.startTrial();
  assert.equal(a.get('donateNudge').dataset.active,'false','a countdown immediately hides the active nudge');
  assert.equal(a.store.donateNudgeDay,'','blocking UI does not consume the day');
  a.endTrial(true);a.time(602000);
  assert.equal(a.practiceTick(602000),true,'the deferred nudge returns after the countdown is cancelled');
  assert.equal(a.practiceTick(603000),false,'the visible nudge is still capped for the rest of its KST day');
});
test('dirty practice time is persisted on pagehide before its 30-second checkpoint',()=>{
  let saved;
  const a=boot({v:4,lang:'ko'},undefined,{localStorage:{getItem:()=>JSON.stringify({v:4,lang:'ko'}),setItem:(k,v)=>saved=JSON.parse(v)}});
  a.get('nickDlg').open=false;a.practiceInput();a.time(12000);a.practiceTick(12000);
  assert.equal(a.store.donatePlayMs,1000);a.events.pagehide();
  assert.equal(saved.donatePlayMs,1000);
});
test('deferring an active reward also stops its synthesized chime',()=>{
  let disconnected=0;
  class AudioContext {
    constructor(){this.currentTime=0;this.state='running';}
    createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){disconnected++;}};}
    createOscillator(){return {frequency:{},connect(){},start(){},stop(){}};}
  }
  const a=boot({v:4,fx:0},undefined,{AudioContext});a.setMode('wave10');a.dailyGift();a.claimRewards();
  assert.equal(a.get('jackpot').dataset.phase,'reveal');assert.equal(disconnected,0);
  a.startTrial();assert.equal(disconnected,1);assert.equal(a.get('jackpot').hidden,true);
});
test('active reward is closed at every phase, translated and discarded by data reset',()=>{
  for(const phase of ['egg','white','reveal','out']) for(const target of ['trial','settings','wardrobe','donate']){
    const a=boot();a.setMode('wave10');a.dailyGift();a.claimRewards();
    const step=()=>{for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();}};
    if(phase!=='egg') step();if(phase==='reveal'||phase==='out') step();
    if(phase==='out') a.get('jpOk').click();
    assert.equal(a.get('jackpot').dataset.phase,phase);
    if(target==='trial') a.startTrial();
    else a.get({settings:'setOpen',wardrobe:'fitOpen',donate:'donateTop'}[target]).click();
    assert.equal(a.get('jackpot').hidden,true,phase+' '+target);
    step();assert.equal(a.get('jackpot').hidden,true,'stale callbacks cannot reveal');
    if(target==='trial') a.endTrial(true);
    else a.get({settings:'setDlg',wardrobe:'fitDlg',donate:'donateDlg'}[target]).open=false;
    a.renderRewards();
    assert.equal(a.get('jackpot').hidden,true,'interrupted reveal never resumes automatically');
    assert.ok(Object.keys(a.store.ach).length>0,'claimed reward stays owned');
  }
  const a=boot();a.dailyGift();a.claimRewards();const id=a.DAILY_IDS.find(id=>a.store.ach[id]);
  for(const lang of ['ko','ja','en']){a.setLang(lang);assert.equal(a.get('jpItem').textContent,a.T('item.'+id));assert.equal(a.get('jpTitle').textContent,a.T('fit.dailyTitle',1));}
  a.get('dataReset').click();
  for(let n=0;n<3;n++) for(const [id,fn] of [...a.timers]){a.timers.delete(id);fn();}
  assert.equal(a.get('jackpot').hidden,true);assert.equal(a.store.pendingRewards.length,0);
});
test('settings cancel countdown and running trial without saving or submitting',()=>{
  for(const running of [false,true]){
    const a=boot();a.setMode('wave10');a.startTrial();
    const id=a.trial.cdTimer;
    if(running){const count=a.timers.get(id);count();count();count();}
    a.get('setOpen').click();a.trialTick(30000);
    assert.equal(a.get('setDlg').open,true);assert.equal(a.trial.running,false);
    assert.equal(a.trial.cdTimer,null);assert.equal(a.timers.has(id),false);
    assert.equal(a.store.records.wave10.length,0);assert.equal(a.trial.result,null);
    assert.equal(a.trial.openTimer,null);assert.equal(a.get('dStart').disabled,false);
  }
});
test('donate cancels countdown and running trials in every language without results or submissions',()=>{
  for(const lang of ['ko','en','ja']) for(const mode of ['wave10','ewgf20','combo10','rush30']) for(const running of [false,true]){
    const requests=[];
    const a=boot({nick:'Tester',nickToken:'a'.repeat(48)},async url=>{requests.push(url);throw new Error('offline');});
    a.setLang(lang);a.setMode(mode);a.startTrial();
    const id=a.trial.cdTimer;
    if(running){const count=a.timers.get(id);count();count();count();}
    a.get('donateTop').click();a.time(30000);a.trialTick(30000);
    assert.equal(a.get('donateDlg').open,true);assert.equal(a.trial.running,false);
    assert.equal(a.trial.cdTimer,null);assert.equal(a.timers.has(id),false);
    assert.equal(a.store.records[mode].length,0);assert.equal(a.trial.result,null);
    assert.equal(a.trial.openTimer,null);assert.equal(a.get('dStart').disabled,false);
    assert.equal(requests.filter(url=>url.endsWith('/submit')).length,0);
  }
});
test('every donate entry discards held directions and pending RP without counting a failure',()=>{
  for(const id of ['donateTop','donateShareBtn','donateBtn']){
    const a=boot();a.events.keydown({code:'KeyD',timeStamp:1000,preventDefault(){}});
    a.onDir('n',1020);a.onDir('d',1040);a.onButton(2,1050);
    assert.ok(a.cd.pending);assert.equal(a.held.size,1);
    a.get(id).click();a.events.keyup({code:'KeyD',timeStamp:1100});a.tick(2000);
    assert.equal(a.held.size,0);assert.equal(a.cd.pending,null);assert.equal(a.cd.state,0);
    assert.equal(a.session.attempts.length,0);
  }
});
test('settings discard held directions and pending RP without counting a failure',()=>{
  const a=boot();a.events.keydown({code:'KeyD',timeStamp:1000,preventDefault(){}});
  a.onDir('n',1020);a.onDir('d',1040);a.onButton(2,1050);
  assert.ok(a.cd.pending);assert.equal(a.held.size,1);
  a.get('setOpen').click();a.events.keyup({code:'KeyD',timeStamp:1100});a.tick(2000);
  assert.equal(a.held.size,0);assert.equal(a.cd.pending,null);assert.equal(a.cd.state,0);
  assert.equal(a.session.attempts.length,0);
});
test('donate: header/footer stay visible while the result prompt waits for a daily personal best; chooser orders and opens both methods',()=>{
  const a=boot({v:4,lang:'ko'});
  for(const l of ['ko','en','ja']){
    a.setLang(l);const h=a.get('donateOptions').innerHTML, kakao=h.indexOf('data-opt="kakao"'), kofi=h.indexOf('data-opt="kofi"');
    assert.ok(kakao>=0&&kofi>=0,l+' both options');assert.equal(kakao<kofi,l==='ko',l+' order');
    assert.ok(h.includes('href="https://ko-fi.com/'),l+' ko-fi https link');assert.doesNotMatch(h,/donate.[a-zA-Z]+</,l+' no raw keys');
    for(const id of ['donate','donateTop']) assert.equal(a.get(id).hidden,false,l+' '+id+' visible');
    assert.equal(a.get('donateShare').hidden,true,l+' result prompt hidden without a personal best');
  }
  for(const id of ['donateTop','donateShareBtn','donateBtn']) assert.ok(html.includes('id="'+id+'" type="button"'),id+' is a button');
  assert.ok(html.indexOf('id="donateShareBtn"')>html.indexOf('id="shareDlg"')&&html.indexOf('id="donateShareBtn"')<html.indexOf('id="donateDlg"'),'result-dialog button lives inside #shareDlg (not on the canvas)');
  a.get('donateTop').click();assert.equal(a.get('donateChoose').hidden,false);assert.equal(a.get('donateKakao').hidden,true);
  let prevented=false;a.get('donateOptions').click({target:{closest:()=>({dataset:{opt:'kakao'}})},preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(a.get('donateKakao').hidden,false);assert.equal(a.get('donateChoose').hidden,true);
  assert.equal(a.get('donateOpen').href,'https://qr.kakaopay.com/Ej8EBCpJu');assert.equal(a.get('donateQr').src,'donate-kakao.png');
  a.get('donateBack').click();assert.equal(a.get('donateChoose').hidden,false);
  assert.ok(fs.existsSync(require('node:path').join(__dirname,'..','donate-kakao.png')),'QR image exists');
});
