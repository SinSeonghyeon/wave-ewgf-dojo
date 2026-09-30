// Input layer: keyboard/pad bindings and remapping, device timestamps, touch buttons, the input ledger.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {html, boot, samplePad} = require('./helpers/app.cjs');
test('idle pad polls after timestamp zero allow delayed device timestamps to recover',()=>{
  const a=boot();
  const sample=(now, timestamp, indices=[])=>{a.time(now);a.pads([{index:0,id:'pad',mapping:'standard',axes:[0,0],timestamp,
    buttons:Array.from({length:16},(_,i)=>({pressed:indices.includes(i),value:0}))}]);a.pollPad();};
  sample(1000,0);sample(1080,0);sample(1090,1000);
  a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);
  sample(1100,1050,[13,15]);sample(1110,1050,[13,15]);sample(1120,1052,[13,15,3]);
  assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.session.attempts[0].off,2);
});
test('gamepad input is judged at the device timestamp, so a late poll cannot open a gap between d/f and RP',()=>{
  const a=boot();const btns=()=>Array.from({length:16},()=>({pressed:false,value:0}));
  a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);
  let b=btns();b[13].pressed=true;b[15].pressed=true;a.time(1100);a.pads([{index:0,id:'t',mapping:'standard',axes:[0,0],buttons:b,timestamp:1050}]);a.pollPad(); // d/f reported at 1050, read late at 1100
  b=btns();b[13].pressed=true;b[15].pressed=true;b[3].pressed=true;a.time(1120);a.pads([{index:0,id:'t',mapping:'standard',axes:[0,0],buttons:b,timestamp:1052}]);a.pollPad(); // RP 2ms after d/f on the device, read 20ms later
  assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.session.attempts[0].off,2,'offset from device time, not from the poll time (which would be 20)');
  // no usable timestamp (0 / missing / older than the last judged time) → poll time as before
  const c=boot();c.onDir('f',1000);c.onDir('n',1020);c.onDir('d',1040);
  b=btns();b[13].pressed=true;b[15].pressed=true;c.time(1060);c.pads([{index:0,id:'t',mapping:'standard',axes:[0,0],buttons:b,timestamp:0}]);c.pollPad();
  b=btns();b[13].pressed=true;b[15].pressed=true;b[3].pressed=true;c.time(1075);c.pads([{index:0,id:'t',mapping:'standard',axes:[0,0],buttons:b}]);c.pollPad();
  assert.equal(c.session.attempts[0].off,15);
  const poll=(t,keys,stamp)=>{const p=btns();for(const i of keys)p[i].pressed=true;c.time(t);c.pads([{index:0,id:'t',mapping:'standard',axes:[0,0],buttons:p,...(stamp===undefined?{}:{timestamp:stamp})}]);c.pollPad();};
  poll(1200,[],900);        // everything released; a stale timestamp never moves time backwards
  poll(1201,[15]);poll(1202,[]);poll(1203,[13]);  // a fresh f,N,d prefix, so the next press is an EWGF attempt and not a d/f+RP 기원권
  poll(1210,[13,15,3],900);
  assert.equal(c.session.attempts[1].t,1210,'judged at the poll time, not at the stale 900');
});
test('gamepad simultaneous diagonal and RP processes direction first',()=>{
  const a=boot();a.onDir('f',1000);a.onDir('n',1020);a.onDir('d',1040);a.time(1060);
  const buttons=Array.from({length:16},()=>({pressed:false,value:0}));buttons[3].pressed=true;buttons[13].pressed=true;buttons[15].pressed=true;
  a.pads([{index:0,id:'test',mapping:'standard',axes:[0,0],buttons}]);a.pollPad();
  assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.session.attempts[0].off,0);
  a.events.gamepaddisconnected({gamepad:{index:0}});a.time(1080);a.pollPad();
  assert.equal(a.session.attempts.length,1);assert.equal(a.store.life.giwon,1,'re-detected pad still holds d/f+RP: judged again, as 기원권');
});
test('pad swaps reject automatic-direction collisions on the displaced assignment atomically',()=>{
  const a=boot({padKeys:{left:'b6'},padAltKeys:{right:'b15'}});
  a.get('setDlg').open=true;samplePad(a);a.beginPadBinding('right',true);
  const before=JSON.stringify([a.store.padKeys,a.store.padAltKeys]);
  samplePad(a,[6]);
  assert.equal(JSON.stringify([a.store.padKeys,a.store.padAltKeys]),before);
  assert.equal(a.get('bindingMessage').textContent,a.T('set.padConflict'));
});
test('stored primary pad bindings cannot overlap another automatic direction',()=>{
  for(const padKeys of [{b2:'b15'},{left:'a0+'}]){
    const a=boot({padKeys});
    assert.deepEqual(JSON.parse(JSON.stringify(a.store.padKeys)),JSON.parse(JSON.stringify(a.DEFAULT_PAD)));
  }
});
test('held keyboard autorepeat does not steal the pad tab during input check',()=>{
  const a=boot();a.get('setDlg').open=true;samplePad(a);a.setBindingCheck(true);
  const ev={code:'KeyI',target:{tagName:'DIV'},preventDefault(){}};
  a.events.keydown(ev);samplePad(a,[7]);
  a.events.keydown({...ev,repeat:true});
  assert.equal(a.get('padBindings').hidden,false);
  a.events.keyup(ev);a.events.keydown(ev);
  assert.equal(a.get('keyboardBindings').hidden,false);
});
test('hiding the document cancels capture even when background polling never runs',()=>{
  const a=boot();a.get('setDlg').open=true;samplePad(a);a.beginPadBinding('b2');
  a.document.hidden=true;a.events.visibilitychange();
  a.document.hidden=false;a.events.visibilitychange();samplePad(a,[7]);
  assert.equal(a.store.padKeys.b2,'b3');
});
test('pad remapping waits for release, swaps buttons, saves and never judges settings input',()=>{
  const a=boot();a.get('setDlg').open=true;samplePad(a,[3]);a.beginPadBinding('b1');samplePad(a,[3]);
  assert.equal(a.store.padKeys.b1,'b2');samplePad(a);samplePad(a,[3]);
  assert.equal(a.store.padKeys.b1,'b3');assert.equal(a.store.padKeys.b2,'b2');assert.equal(a.session.tries,0);
  const restored=boot(JSON.parse(JSON.stringify(a.store)));assert.equal(restored.store.padKeys.b2,'b2');
  a.get('setDlg').open=false;samplePad(a,[2]);assert.equal(a.session.tries,0,'held input is blocked on closing');
  samplePad(a);samplePad(a,[2]);assert.equal(a.session.tries,1,'new RP uses saved button');
});
test('pad directions accept signed axes and DirectInput hats, preserve side conversion and reject automatic collisions',()=>{
  const a=boot();a.get('setDlg').open=true;samplePad(a);a.beginPadBinding('right');samplePad(a);samplePad(a,[],[0,0,1]);
  assert.equal(a.store.padKeys.right,'a2+');a.get('setDlg').open=false;samplePad(a);samplePad(a,[],[0,0,1]);assert.equal(a.cd.state,1);
  a.resetInput();a.store.side=-1;samplePad(a);samplePad(a,[],[0,0,1]);assert.equal(a.cd.state,0,'physical right becomes back for 2P');
  a.get('setDlg').open=true;a.beginPadBinding('b2');samplePad(a);samplePad(a,[12]);assert.equal(a.store.padKeys.b2,'b3');assert.equal(a.get('bindingMessage').textContent,a.T('set.padConflict'));
  a.store.padKeys.up='none';a.beginPadBinding('up');samplePad(a,[],[0,0,0,0,0,0,0,0,0,1.29],'');samplePad(a,[],[0,0,0,0,0,0,0,0,0,-1],'');assert.equal(a.store.padKeys.up,'hu');
});
test('pad capture cancels on Escape, disconnect and focus loss; invalid storage falls back',()=>{
  const a=boot();a.get('setDlg').open=true;samplePad(a);a.beginPadBinding('b2');samplePad(a);
  a.events.keydown({code:'Escape',preventDefault(){}});samplePad(a,[7]);assert.equal(a.store.padKeys.b2,'b3');
  a.beginPadBinding('b2');samplePad(a);a.events.gamepaddisconnected({gamepad:{index:0}});samplePad(a,[7]);assert.equal(a.store.padKeys.b2,'b3');
  a.beginPadBinding('b2');samplePad(a);a.events.blur();samplePad(a,[7]);assert.equal(a.store.padKeys.b2,'b3');
  for(const bad of [{b2:'a0+'},{b2:'b2'},{right:'<script>'},{b2:'b128'}]) assert.deepEqual(JSON.parse(JSON.stringify(boot({padKeys:bad}).store.padKeys)),JSON.parse(JSON.stringify(a.DEFAULT_PAD)));
  assert.equal(boot({padKeys:{b1:'none',b2:'none'}}).store.padKeys.b2,'none');
});
test('remapped pad diagonal and RP still share the device timestamp',()=>{
  const a=boot({padKeys:{right:'a2+',down:'a3+',b2:'b7'}});a.onDir('f',1000);a.onDir('n',1020);a.time(1060);
  samplePad(a,[],[0,0,0,1]);a.time(1080);samplePad(a,[7],[0,0,1,1]);
  assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.session.attempts[0].off,0);
});
test('ambiguous pad capture requires a fresh press and unmapped axes cannot lock practice after a modal',()=>{
  const a=boot();a.get('setDlg').open=true;samplePad(a);a.beginPadBinding('b2');samplePad(a);samplePad(a,[6,7]);samplePad(a,[7]);
  assert.equal(a.store.padKeys.b2,'b3');samplePad(a);samplePad(a,[7]);assert.equal(a.store.padKeys.b2,'b7');
  a.get('setDlg').open=false;samplePad(a,[],[0,0,-1]);samplePad(a,[7],[0,0,-1]);assert.equal(a.session.tries,1);
});
test('pad capture accepts a fresh attack or direction while an unrelated axis stays at its idle endpoint',()=>{
  const a=boot();a.get('setDlg').open=true;samplePad(a,[],[0,0,-1]);
  a.beginPadBinding('b2');samplePad(a,[],[0,0,-1]);samplePad(a,[7],[0,0,-1]);
  assert.equal(a.store.padKeys.b2,'b7','an idle trigger axis must not prevent button capture');
  samplePad(a,[],[0,0,-1]);a.beginPadBinding('right');samplePad(a,[],[0,0,-1]);samplePad(a,[],[1,0,-1]);
  assert.equal(a.store.padKeys.right,'a0+','only the newly changed direction should be captured');
});
test('settings follow fresh device input without bouncing on held buttons or idle axes',()=>{
  const a=boot();a.get('setDlg').open=true;samplePad(a,[],[0,0,-1]);a.setBindingDevice('kb');
  samplePad(a,[],[0,0,-1]);assert.equal(a.get('padBindings').hidden,true);
  samplePad(a,[7],[0,0,-1]);assert.equal(a.get('padBindings').hidden,false);
  a.events.keydown({code:'KeyP',target:{tagName:'DIV'},preventDefault(){}});assert.equal(a.get('keyboardBindings').hidden,false);
  samplePad(a,[7],[0,0,-1]);samplePad(a,[],[0,0,-1]);assert.equal(a.get('keyboardBindings').hidden,false,'held and released inputs must not switch back');
  samplePad(a,[7],[0,0,-1]);assert.equal(a.get('padBindings').hidden,false);
  assert.equal(a.session.tries,0);assert.equal(a.store.padKeys.b2,'b3');
});
test('input check highlights exact keyboard slots without editing bindings or judging moves',()=>{
  const a=boot({altKeys:{b2:'KeyP'}});a.get('setDlg').open=true;a.setBindingCheck(true);
  const before=JSON.stringify(a.store), ev=code=>({code,target:{tagName:'DIV'},preventDefault(){}});
  a.events.keydown(ev('KeyI'));a.events.keydown(ev('KeyP'));
  assert.equal(a.bindingChecked('kb','b2',false),true);assert.equal(a.bindingChecked('kb','b2',true),true);
  a.events.keyup(ev('KeyI'));assert.equal(a.bindingChecked('kb','b2',false),false);assert.equal(a.bindingChecked('kb','b2',true),true);
  a.events.keydown(ev('KeyZ'));assert.equal(a.bindingChecked('kb','b1',false),false);
  a.beginPadBinding('b2');a.clearBinding();assert.equal(JSON.stringify(a.store),before);assert.equal(a.session.tries,0);
  a.setBindingCheck(false);assert.equal(a.bindingChecked('kb','b2',true),false);
});
test('input check highlights pad primary, alternate and automatic directions and clears stale input',()=>{
  const a=boot({padAltKeys:{b2:'b7'}});a.get('setDlg').open=true;samplePad(a);a.setBindingCheck(true);
  samplePad(a,[3,7,13,15]);
  for(const [slot,alt] of [['b2',false],['b2',true],['down',false],['right',false]]) assert.equal(a.bindingChecked('pad',slot,alt),true);
  samplePad(a,[7]);assert.equal(a.bindingChecked('pad','b2',false),false);assert.equal(a.bindingChecked('pad','b2',true),true);
  a.events.gamepaddisconnected({gamepad:{index:0}});assert.equal(a.bindingChecked('pad','b2',true),false);
  a.events.keydown({code:'KeyI',target:{tagName:'DIV'},preventDefault(){}});a.events.blur();assert.equal(a.bindingChecked('kb','b2',false),false);
  samplePad(a,[7]);a.document.hidden=true;a.events.visibilitychange();assert.equal(a.bindingChecked('pad','b2',true),false);
  assert.equal(a.session.tries,0);assert.equal(a.store.padAltKeys.b2,'b7');
});
test('first controller button switches tabs, while opening settings with an already-held button only establishes a baseline',()=>{
  const a=boot();a.get('setDlg').open=true;samplePad(a,[7],[0,0,-1]);assert.equal(a.get('padBindings').hidden,false);
  const b=boot();b.pads([{index:0,id:'held',mapping:'standard',axes:[0,0,-1],buttons:Array.from({length:16},(_,i)=>({pressed:i===7,value:0}))}]);
  b.get('setDlg').open=true;b.pollPad(true);b.pollPad();assert.equal(b.get('keyboardBindings').hidden,false);
});
test('automatic switching cancels capture and respects UI navigation, text fields and key repeats',()=>{
  const a=boot();a.get('setDlg').open=true;samplePad(a);a.beginPadBinding('b2',true);
  a.events.keydown({code:'KeyP',target:{tagName:'DIV'},preventDefault(){}});
  assert.equal(a.get('keyboardBindings').hidden,false);assert.equal(a.store.padAltKeys.b2,'none');
  samplePad(a,[7]);assert.equal(a.store.padAltKeys.b2,'none');assert.equal(a.get('padBindings').hidden,false);
  for(const extra of [{code:'Tab'},{code:'Enter',target:{tagName:'BUTTON'}},{code:'KeyP',repeat:true},{code:'KeyP',ctrlKey:true},{code:'KeyP',target:{tagName:'INPUT'}}]){
    a.events.keydown({code:'KeyP',target:{tagName:'DIV'},preventDefault(){},...extra});assert.equal(a.get('padBindings').hidden,false);
  }
  a.setBindingDevice('kb');a.get('setDlg').open=false;samplePad(a);samplePad(a,[8]);assert.equal(a.get('keyboardBindings').hidden,false,'normal play must not change settings tabs');
});
test('alternate pad inputs capture, persist and reject duplicate inputs within the same action',()=>{
  const a=boot();a.get('setDlg').open=true;samplePad(a,[],[0,0,-1]);a.beginPadBinding('b2',true);samplePad(a,[7],[0,0,-1]);
  assert.equal(a.store.padAltKeys.b2,'b7');assert.equal(a.store.padKeys.b2,'b3');
  samplePad(a,[],[0,0,-1]);a.beginPadBinding('b2',true);samplePad(a,[3],[0,0,-1]);assert.equal(a.store.padAltKeys.b2,'b7');
  assert.equal(a.get('bindingMessage').textContent,a.T('set.padConflict'));
  const restored=boot(JSON.parse(JSON.stringify(a.store)));assert.equal(restored.store.padAltKeys.b2,'b7');
  const bad=boot({padAltKeys:{b1:'b3',b2:'a0+',b3:'b7',b4:'b7',up:'auto',left:'b15'}});
  assert.equal(bad.store.padAltKeys.b1,'none');assert.equal(bad.store.padAltKeys.b2,'none');assert.equal(bad.store.padAltKeys.b3,'b7');assert.equal(bad.store.padAltKeys.b4,'none');assert.equal(bad.store.padAltKeys.up,'none');assert.equal(bad.store.padAltKeys.left,'none');
});
test('primary and alternate pad attacks form one logical press until both are released',()=>{
  const a=boot({padAltKeys:{b2:'b7'}});samplePad(a,[7]);assert.equal(a.session.tries,1);
  samplePad(a,[3,7]);samplePad(a,[3]);samplePad(a,[3,7]);samplePad(a,[7]);assert.equal(a.session.tries,1);
  samplePad(a);samplePad(a,[3,7]);assert.equal(a.session.tries,2);
  a.get('setDlg').open=true;samplePad(a,[7]);a.get('setDlg').open=false;samplePad(a,[7]);assert.equal(a.session.tries,2);
  samplePad(a);samplePad(a,[7]);assert.equal(a.session.tries,3,'release gate covers alternate buttons');
});
test('alternate pad directions retain a held direction and share the EWGF timing path',()=>{
  const a=boot({padAltKeys:{right:'a2+',down:'b6',b2:'b7'}});
  a.time(1000);samplePad(a,[15]);a.time(1005);samplePad(a,[15],[0,0,1]);samplePad(a,[],[0,0,1]);assert.equal(a.cd.state,1);
  a.time(1020);samplePad(a);assert.equal(a.cd.state,2);
  a.time(1040);samplePad(a,[6]);a.time(1060);samplePad(a,[6,7],[0,0,1]);
  assert.equal(a.session.attempts[0].kind,'ewgf');assert.equal(a.session.attempts[0].off,0);
});
test('pad capture collapses duplicate d-pad reports and never binds already-held inputs on release',()=>{
  const a=boot();a.get('setDlg').open=true;samplePad(a,[7],[0,0,-1]);a.beginPadBinding('b2');
  samplePad(a,[7],[0,0,-1]);samplePad(a,[],[0,0,-1]);assert.equal(a.store.padKeys.b2,'b3');
  samplePad(a,[7],[0,0,-1]);assert.equal(a.store.padKeys.b2,'b7');
  samplePad(a,[],[0,0,-1]);a.beginPadBinding('right');samplePad(a,[15],[1,0,-1]);assert.equal(a.store.padKeys.right,'b15');
  samplePad(a,[],[0,0,-1]);a.beginPadBinding('left');samplePad(a,[6,7],[0,0,-1]);samplePad(a,[6],[0,0,-1]);
  assert.equal(a.store.padKeys.left,'auto','releasing part of an ambiguous press must not bind the remainder');
});
test('invalid saved types fall back safely and stored text is escaped',()=>{
  const a=boot({v:4,side:0,window:100,keys:{up:4},records:{wave10:null,ewgf20:[null],combo10:[{date:0,score:10,label:'<img src=x>',sub:'<script>'}]}});
  assert.equal(a.store.side,1);assert.equal(a.store.window,12);assert.equal(a.store.keys.up,'KeyW');
  assert.equal(a.store.records.ewgf20.length,0);assert.ok(a.get('bests').innerHTML.includes('&lt;img src=x&gt;'));
});
test('each keyboard action accepts one alternate key and old saves keep their primary keys',()=>{
  const ev=(code,timeStamp=1000)=>({code,timeStamp,target:{tagName:'DIV'},preventDefault(){}});
  const a=boot({v:4,keys:{right:'KeyD'},altKeys:{right:'KeyO',b2:'KeyP',b3:'KeyP',up:4}});
  assert.equal(a.store.keys.right,'KeyD');assert.equal(a.store.altKeys.right,'KeyO');
  assert.equal(a.store.altKeys.b3,'','a duplicate alternate is dropped');assert.equal(a.store.altKeys.up,'','an invalid alternate is dropped');
  a.events.keydown(ev('KeyD'));a.events.keydown(ev('KeyO',1010));a.events.keyup(ev('KeyD',1020));
  assert.equal(a.cd.state,1,'releasing the primary keeps right held through the alternate');
  a.events.keyup(ev('KeyO',1030));assert.equal(a.cd.state,2,'releasing both produces neutral');
  a.events.keydown(ev('KeyS',1040));a.events.keydown(ev('KeyO',1060));a.events.keydown(ev('KeyP',1060));
  assert.equal(a.session.attempts.at(-1).kind,'ewgf','alternate direction and button follow the normal judging path');
  a.events.keydown(ev('KeyI',1061));
  assert.equal(a.session.attempts.length,1,'primary + alternate for one held button produces one logical press');
  a.events.keyup(ev('KeyP',1070));a.events.keydown(ev('KeyP',1080));
  assert.equal(a.session.attempts.length,1,'re-pressing either binding while its partner is held stays suppressed');
  a.events.keyup(ev('KeyI',1090));a.events.keyup(ev('KeyP',1090));
  a.events.keydown(ev('KeyI',1100));a.events.keydown(ev('KeyP',1101));
  assert.equal(a.session.attempts.length,1);assert.equal(a.store.life.giwon,1,'alternate after its held primary is also one logical press (d/f still held → 기원권)');
  a.events.keyup(ev('KeyI',1110));a.events.keyup(ev('KeyP',1110));
  assert.match(a.get('keys').innerHTML,/data-k="right" data-alt="0"[\s\S]*data-k="right" data-alt="1"[\s\S]*>O</);
});
test('three touch direction buttons combine down+side into diagonals and feed the normal EWGF path',()=>{
  const a=boot();
  assert.equal(a.touchKeys([],990),'n');
  assert.equal(a.touchKeys(['right'],1000),'f');
  assert.equal(a.touchKeys([],1020),'n');
  assert.equal(a.touchKeys(['down'],1040),'d');
  assert.equal(a.touchKeys(['down','right'],1060),'df');
  a.touchPress(2,1064);
  assert.equal(a.session.attempts.length,1);
  assert.equal(a.session.attempts[0].kind,'ewgf');
  assert.equal(a.session.attempts[0].off,4);
  assert.equal(a.get('srcBadge').textContent,a.T('src.touch'));
  assert.equal(a.touchKeys(['left'],1100),'b');
  assert.equal(a.touchKeys(['down','left'],1140),'db');
  assert.equal(a.touchKeys(['left','right'],1160),'n','opposite horizontal buttons cancel each other');
  const p2=boot({v:4,side:-1});                            // 2P: screen right is back
  assert.equal(p2.touchKeys(['right'],1000),'b');
});
test('touch input pauses behind modals and is cleared by blur; the setting survives reload only with valid values',()=>{
  const a=boot();
  a.touchKeys(['right'],1000);a.touchKeys([],1020);a.touchKeys(['down'],1040);a.touchKeys(['down','right'],1060);
  a.get('setDlg').showModal(); a.touchPress(2,1064);
  assert.equal(a.session.attempts.length,0);              // button ignored while settings are open
  a.get('setDlg').open=false;
  a.touchKeys(['right'],2000); a.events.blur();            // blur resets every source, including the on-screen buttons
  assert.equal(a.cd.state,0);
  assert.equal(a.touchKeys(['right'],3000),'f'); assert.equal(a.cd.state,1);
  assert.equal(boot().store.touch,'auto');
  assert.equal(boot({v:4,touch:'on'}).store.touch,'on');
  assert.equal(boot({v:4,touch:'off'}).store.touch,'off');
  assert.equal(boot({v:4,touch:'yes'}).store.touch,'auto');
  assert.equal(boot().store.touchSize,100);
  const tuned=boot({v:4,touchSize:300,touchX:65,touchY:35});
  assert.equal(tuned.store.touchSize,300);assert.equal(tuned.store.touchX,65);assert.equal(tuned.store.touchY,35);
  tuned.get('touchSize').value='295';tuned.get('touchSize').input();tuned.get('touchX').value='40';tuned.get('touchX').input();tuned.get('touchY').value='60';tuned.get('touchY').input();
  assert.equal(tuned.store.touchSize,295);assert.equal(tuned.store.touchX,40);assert.equal(tuned.store.touchY,60);assert.equal(tuned.get('touchSizeOut').textContent,'295%');
  assert.match(tuned.get('tdirs').style.left,/px$/);assert.match(tuned.get('tdirs').style.bottom,/px$/);
  for(const bad of [{touchSize:301},{touchSize:305},{touchX:-5},{touchY:101},{touchSize:'100'}]){ const b=boot({v:4,...bad}); assert.equal(b.store.touchSize,100);assert.equal(b.store.touchX,0);assert.equal(b.store.touchY,0); }
  assert.match(html,/id="touchSize" min="70" max="300" step="5" value="100"/);
  assert.doesNotThrow(()=>{const b=boot({v:4,touch:'on'}); b.applyTouchUI();});
  assert.match(html,/<meta name="viewport" content="width=device-width/);
  assert.match(html,/^<!doctype html>\s*(<!--[\s\S]*?-->\s*)?<html lang="ko">/i);
});
test('touch UI: idle badge follows the active input type and blur clears held direction buttons',()=>{
  const on=boot({v:4,touch:'on',lang:'ko'});
  assert.equal(on.get('srcBadge').textContent,'👆 터치 대기');
  on.setLang('en');assert.equal(on.get('srcBadge').textContent,'👆 Touch ready');
  assert.equal(boot({v:4,lang:'en'}).get('srcBadge').textContent,'⌨ Keyboard ready');
  const p2=boot({v:4,side:-1});
  p2.touchKeys(['right'],1000);assert.equal(p2.cd.state,0,'screen right is back for 2P');
  p2.events.blur();assert.equal(p2.touchKeys([],1020),'n');assert.equal(p2.cd.state,0);
  assert.match(html,/id="tdirs"[\s\S]*data-dir="left"[\s\S]*data-dir="down"[\s\S]*data-dir="right"/);
});
test('input ledger: direction hold excludes button gaps, newest row is first and 2P arrows mirror',()=>{
  const a=boot();a.onDir('f',1000);a.onButton(1,1020);a.onDir('n',1050);
  const rows=a.historyRows(1100);
  assert.equal(rows[0].label,'★');assert.equal(rows[0].frames,'3f');
  assert.equal(rows[1].label,'1');assert.equal(rows[1].frames,'1f');assert.equal(rows[1].title,a.T('inputs.gap'));
  assert.equal(rows[2].label,'→');assert.equal(rows[2].frames,'3f');assert.equal(rows[2].title,a.T('inputs.hold'));
  a.store.side=-1;assert.equal(a.historyRows(1100)[2].label,'←');
  const tries=a.session.tries;for(let i=0;i<15;i++)a.historyRows(1200+i*100);assert.equal(a.session.tries,tries);
});
test('input ledger groups same-slot directions and buttons while preserving frame boundaries and forty rows',()=>{
  const a=boot();
  a.onDir('d',1000);a.onButton(2,1001);a.onDir('df',1002);a.onButton(1,1003);
  let rows=a.historyRows(1052);
  assert.equal(rows.length,1);assert.equal(rows[0].label,'↘+1+2');assert.equal(rows[0].frames,'3f');
  a.store.side=-1;assert.equal(a.historyRows(1052)[0].label,'↙+1+2');
  a.onButton(3,1009);rows=a.historyRows(1052);
  assert.equal(rows.length,2,'nearby inputs across a 60Hz boundary stay separate');assert.equal(rows[0].label,'3');
  for(let i=0;i<45;i++){a.onButton(1,1100+i*20);a.onButton(2,1100+i*20);}
  rows=a.historyRows(2100);assert.equal(rows.length,40);assert.ok(rows.every(r=>r.label==='1+2'));
  assert.equal(rows[0].frames,'1f','button groups use the gap before the first button');
});
test('input ledger merges delayed device events into their slot and updates chronological gaps',()=>{
  const a=boot();
  a.onDir('d',1000);a.onButton(1,1020);a.onDir('df',1002);a.onButton(2,1001);
  let rows=a.historyRows(1052);
  assert.equal(rows.length,2);assert.equal(rows[1].label,'↘+2');
  assert.equal(rows[1].frames,'3f');assert.equal(rows[0].frames,'1f');
  a.onDir('n',1040);a.onDir('f',1030);
  rows=a.historyRows(1052);
  assert.equal(rows.length,3);assert.equal(rows[0].label,'★','last timestamp wins within a direction group');
  assert.equal(rows[2].frames,'2f','hold ends at the first direction in the next group');
  for(let i=0;i<45;i++)a.onButton(1,1100+i*20);
  const before=JSON.stringify(a.historyRows(2100));
  a.onButton(2,1001);
  assert.equal(JSON.stringify(a.historyRows(2100)),before,'expired device samples cannot evict recent rows');
});
test('input ledger freezes on reset, retains the full forty-entry buffer and translates descriptions',()=>{
  const a=boot();a.onDir('f',1000);a.time(1100);a.resetInput();
  assert.equal(a.historyRows(9000)[0].frames,'6f');
  a.onDir('d',9100);assert.equal(a.historyRows(9200)[1].frames,'6f','a reset must not count time spent in a dialog as a held direction');
  for(let i=0;i<60;i++)a.onDir(i%2?'d':'n',9300+i*20);
  assert.equal(a.historyRows(11000).length,40);a.setLang('ja');
  assert.equal(a.historyRows(9600)[0].title,a.T('inputs.hold'));
});
test('unchanged input history does not replace DOM on animation ticks',()=>{
  const a=boot();a.onDir('f',1000);a.time(1100);a.resetInput();a.renderHistory(1100);
  const box=a.get('inputs');let writes=0,markup=box.innerHTML;
  Object.defineProperty(box,'innerHTML',{get:()=>markup,set:v=>{writes++;markup=v;}});
  a.renderHistory(1200);a.renderHistory(1300);
  assert.equal(writes,0,'stopped hold frames are unchanged');
  a.setLang('ja');assert.ok(writes>0,'localized titles still update');
});
