/* ---------- input layer ---------- */
const held = new Set();               // keyboard codes
let padDir = {x:0,y:0}, padBtn = [false,false,false,false,false];
let touchDir = {x:0,y:0};              // on-screen pad (touch controls); merged like padDir
let kbDir = {x:0,y:0};
let curDir = 'n';
let heldDir = 'n', prevDir = 'n', heldDirT = 0; // 판정 경로가 마지막으로 본 방향과 그 직전 방향·시각. ↘+RP(기원권)처럼 "지금 눌려 있는 방향"을 보는 분기가 쓴다
let lastInputT = performance.now();
const history = [];                    // {t, dir|btn}
const srcBadge = $('srcBadge');
let lastSrc = '';
function setSrc(src){ lastSrc=src; srcBadge.textContent = T(src==='pad'?'src.pad':src==='touch'?'src.touch':'src.kb'); srcBadge.classList.add('on'); }

function dirName(x,y){
  const fx = x*store.side;             // +1 forward
  if(y<0){ return fx>0?'df':fx<0?'db':'d'; }
  if(y>0){ return fx>0?'uf':fx<0?'ub':'u'; }
  return fx>0?'f':fx<0?'b':'n';
}
function recomputeDir(t, src){
  const x = clamp(kbDir.x + padDir.x + touchDir.x, -1, 1), y = clamp(kbDir.y + padDir.y + touchDir.y, -1, 1);
  const d = dirName(x,y);
  if(d!==curDir){ curDir = d; onDir(d, t); }
  if(src && src!==lastSrc) setSrc(src);
}
function kbVector(){
  const k = store.keys;
  const a = store.altKeys;
  const up = held.has(k.up)||held.has(a.up)||held.has('ArrowUp'), dn = held.has(k.down)||held.has(a.down)||held.has('ArrowDown');
  const lf = held.has(k.left)||held.has(a.left)||held.has('ArrowLeft'), rt = held.has(k.right)||held.has(a.right)||held.has('ArrowRight');
  kbDir = { x:(rt?1:0)-(lf?1:0), y:(up?1:0)-(dn?1:0) };
}
const mappedCodes = () => new Set([...Object.values(store.keys),...Object.values(store.altKeys).filter(Boolean),'ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
const buttonForCode = code => {
  for(let n=1;n<=4;n++) if(code===store.keys['b'+n] || code===store.altKeys['b'+n]) return n;
  return 0;
};
const buttonHeld = n => held.has(store.keys['b'+n]) || (!!store.altKeys['b'+n] && held.has(store.altKeys['b'+n]));
const modalOpen = () => $('nickDlg').open || $('shareDlg').open || $('setDlg').open || $('donateDlg').open || $('fitDlg').open || $('noticeDlg').open; // any dialog pauses game input (called at pad-poll rate, so no DOM query)
let listening = null; // key remap target: {slot, alt}
let bindingDevice='kb', bindingMessage=['set.bindIdle'], padCapture=null, padNeedsRelease=false, bindingPadPrevious=null;
let bindingCheck=false, bindingCheckPad=[], bindingCheckSignature='';
const bindingCheckHeld=new Set();
function bindingFeedback(key,...args){ bindingMessage=[key,...args]; $('bindingMessage').textContent=T(...bindingMessage); }
function cancelBinding(){ listening=null; padCapture=null; bindingFeedback(bindingCheck?'set.bindCheckHelp':'set.bindCancelled'); renderKeys(); }
function setBindingDevice(device,automatic=false){
  listening=null; padCapture=null; bindingDevice=device;
  bindingFeedback(bindingCheck?'set.bindCheckHelp':automatic?(device==='pad'?'set.autoPad':'set.autoKeyboard'):'set.bindIdle'); renderKeys();
  if(automatic) $('bindingTabs').querySelector('[data-device="'+device+'"]')?.focus?.();
}
function clearBinding(){
  if(bindingCheck) return;
  if(padCapture) store[padCapture.field][padCapture.slot]='none';
  else if(listening?.alt) store.altKeys[listening.slot]='';
  else return;
  listening=null; padCapture=null; padNeedsRelease=true; resetInput(); save(); bindingFeedback('set.bindSaved'); renderKeys();
}
function setBindingCheck(on){
  bindingCheck=!!on; listening=null; padCapture=null; bindingCheckHeld.clear(); bindingCheckPad=[];
  bindingFeedback(bindingCheck?'set.bindCheckHelp':'set.bindIdle'); renderKeys();
  if(bindingCheck) pollPad(true);
}
function clearBindingCheckInput(){
  bindingCheckHeld.clear(); bindingCheckPad=[]; renderBindingCheck();
}
function suspendBindings(){
  clearBindingCheckInput();
  if(listening || padCapture) cancelBinding();
  bindingPadPrevious=null; padNeedsRelease=true;
}
function bindingChecked(device,k,alt){
  if(!bindingCheck) return false;
  if(device==='kb') return bindingCheckHeld.has(store[alt?'altKeys':'keys'][k]);
  const code=store[alt?'padAltKeys':'padKeys'][k];
  return code==='auto'?PAD_AUTO_INPUTS[k].some(v=>bindingCheckPad.includes(v)):bindingCheckPad.includes(code);
}
function renderBindingCheck(force=false){
  const signature=JSON.stringify([bindingCheck,bindingDevice,[...bindingCheckHeld].sort(),bindingCheckPad]);
  if(!force && signature===bindingCheckSignature) return;
  bindingCheckSignature=signature;
  $('bindingCheck').setAttribute('aria-pressed',String(bindingCheck)); $('bindingReset').disabled=bindingCheck;
  for(const [id,device] of [['keys','kb'],['padKeys','pad']]){
    $(id).querySelectorAll('.key-bind').forEach(b=>{
      b.disabled=bindingCheck;
      b.classList.toggle('checked',bindingChecked(device,device==='kb'?b.dataset.k:b.dataset.pad,(device==='kb'?b.dataset.alt:b.dataset.padAlt)==='1'));
    });
    $(id).querySelectorAll('.key').forEach(row=>{
      const k=row.dataset.action, arrow={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[k];
      row.classList.toggle('checked',bindingChecked(device,k,false) || bindingChecked(device,k,true) || (bindingCheck && device==='kb' && !!arrow && bindingCheckHeld.has(arrow)));
    });
  }
}
addEventListener('keydown', e => {
  if(padCapture && e.code==='Escape'){ e.preventDefault(); cancelBinding(); return; }
  const formInput=e.target && (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable);
  const navigation=['Tab','Escape','ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(e.code) || (e.target?.tagName==='BUTTON' && ['Enter','Space'].includes(e.code));
  if($('setDlg').open && bindingCheck && !formInput && !['Escape','Tab'].includes(e.code) && (!navigation || mappedCodes().has(e.code))){
    e.preventDefault();
    if(e.repeat) return;
    if(bindingDevice!=='kb') setBindingDevice('kb',true);
    bindingCheckHeld.add(e.code); renderBindingCheck(); return;
  }
  if($('setDlg').open && bindingDevice!=='kb' && !e.repeat && !formInput && !navigation && !e.ctrlKey && !e.metaKey && !e.altKey){
    e.preventDefault(); setBindingDevice('kb',true); return; // Switching devices cancels capture; it never assigns this key.
  }
  if(listening){
    e.preventDefault();
    if(e.code==='Escape'){ cancelBinding(); return; }
    if(e.repeat) return;
    if(listening.alt && (e.code==='Delete' || e.code==='Backspace')){
      store.altKeys[listening.slot]=''; listening=null; resetInput(); save(); bindingFeedback('set.bindSaved'); renderKeys(); return;
    }
    const allKeys = [...Object.entries(store.keys).map(([slot,code])=>({slot,alt:false,code})), ...Object.entries(store.altKeys).map(([slot,code])=>({slot,alt:true,code}))];
    if(!validKey(listening.slot,e.code) || allKeys.some(x=>x.code===e.code && (x.slot!==listening.slot || x.alt!==listening.alt))){
      bindingFeedback('set.keyConflict'); return;
    }
    store[listening.alt?'altKeys':'keys'][listening.slot]=e.code; listening=null; resetInput(); save(); bindingFeedback('set.bindSaved'); renderKeys(); return;
  }
  if(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if(modalOpen()) return;
  if(!mappedCodes().has(e.code)) return;
  e.preventDefault(); unlockAudio();
  if(e.repeat || held.has(e.code)) return;
  const button = buttonForCode(e.code), alreadyPressed = button && buttonHeld(button);
  held.add(e.code);
  const t = e.timeStamp || performance.now();
  if(button){ if(!alreadyPressed) onButton(button,t); }
  else { kbVector(); recomputeDir(t,'kb'); }
  if(lastSrc!=='kb') setSrc('kb');
});
addEventListener('keyup', e => {
  if(bindingCheckHeld.delete(e.code)) renderBindingCheck();
  if(!held.has(e.code)) return;
  held.delete(e.code);
  kbVector(); recomputeDir(e.timeStamp||performance.now(),'kb');
});
function resetInput(){
  historyStopT=performance.now();
  const openHistory=history.slice().reverse().find(e=>e.dir); if(openHistory && openHistory.endT==null) openHistory.endT=historyStopT;
  wscCancel(); gpChallengeCancel();
  held.clear(); kbVector(); padDir={x:0,y:0}; padBtn.fill(false); touchDir={x:0,y:0}; curDir='n'; heldDir='n'; prevDir='n'; heldDirT=0; touchRelease();
  clearCommand(); resetCombo(); resetTaps(); bdClear(); giwonClear(); updateHud(); renderWsc();
}
addEventListener('blur', () => { suspendBindings(); resetInput(); endTrial(true); bgmSync(); });

/* gamepad */
let padIndex = null, padLastT = 0; // padLastT: last judged pad time (keeps t monotonic across the timestamp fallback)
function renderPadStatus(){ $('padStatus').textContent = ui.padId==null ? T('set.padNone') : T('set.padOn') + ui.padId; if(ui.padId==null) $('padLive').textContent=T('set.padConnect'); }
addEventListener('gamepadconnected', e => { padIndex = e.gamepad.index; ui.padId = e.gamepad.id.slice(0,40); renderPadStatus(); });
function releasePad(){
  bindingCheckPad=[]; renderBindingCheck();
  if(padCapture) cancelBinding();
  bindingPadPrevious=null; padIndex=null; padDir={x:0,y:0}; padBtn.fill(false); clearCommand();
  recomputeDir(performance.now()); updateHud();   // keyboard/touch directions still held stay in effect
  ui.padId=null; renderPadStatus();
}
addEventListener('gamepaddisconnected', e => { if(e.gamepad.index===padIndex) releasePad(); });
const HAT = [[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]]; // 위부터 시계방향 8방향
function hatVec(v){
  if(v==null || v<-1.01 || v>1.01) return [0,0];   // 중립(약 1.29)은 범위 밖
  return HAT[Math.round((v+1)*3.5)] || [0,0];
}
function padInputs(gp){
  const inputs=[];
  gp.buttons.forEach((b,i)=>{ if(i<128 && (b.pressed || b.value>0.5)) inputs.push('b'+i); });
  gp.axes.forEach((v,i)=>{ if(i<32 && !(i===9 && gp.mapping!=='standard') && Math.abs(v)>0.5 && Math.abs(v)<=1.01) inputs.push('a'+i+(v>0?'+':'-')); });
  const [x,y]=gp.mapping==='standard'?[0,0]:hatVec(gp.axes[9]);
  if(x) inputs.push(x>0?'hr':'hl'); if(y) inputs.push(y>0?'hu':'hd');
  return inputs;
}
function padBindingName(code){
  if(code==='auto') return T('set.padAuto');
  if(code==='none') return T('set.padUnassigned');
  if(code[0]==='b') return T('set.padButton',+code.slice(1));
  if(code[0]==='h') return T('set.padHat',({u:'↑',d:'↓',l:'←',r:'→'})[code[1]]);
  return T('set.padAxis',+code.slice(1,-1),code.slice(-1));
}
function padBindingShort(code){
  if(code[0]==='b') return T('set.padButtonShort',+code.slice(1));
  if(code[0]==='a' && code!=='auto') return T('set.padAxisShort',+code.slice(1,-1),code.slice(-1));
  if(code[0]==='h') return ({u:'↑',d:'↓',l:'←',r:'→'})[code[1]];
  return code==='none'?'—':padBindingName(code);
}
function padBindingEntries(){
  return ['padKeys','padAltKeys'].flatMap(field=>Object.entries(store[field]).map(([slot,code])=>({field,slot,code})));
}
function beginPadBinding(slot,alt=false){
  if(bindingCheck) return;
  bindingDevice='pad'; listening=null; padCapture={slot,field:alt?'padAltKeys':'padKeys',previous:null}; padNeedsRelease=true;
  bindingFeedback(ui.padId==null?'set.padConnect':'set.bindRelease'); renderKeys();
  pollPad(true); // Snapshot held inputs at the click, before the next physical press.
}
function capturePad(inputs){
  if(bindingCheck || !padCapture) return;
  const {slot,field,previous}=padCapture;
  padCapture.previous=new Set(inputs);
  if(previous===null){ bindingFeedback('set.bindListen'); return; }
  // Some controllers report idle trigger axes as -1. Do not wait for every
  // axis to become zero; only newly pressed inputs can change an assignment.
  let candidates=inputs.filter(v=>!previous.has(v) && (!slot.startsWith('b') || v[0]==='b'));
  if(!candidates.length) return;
  // A d-pad can report the same physical direction as both button and axis.
  // Collapse only known aliases; unrelated simultaneous inputs stay ambiguous.
  if(candidates.length>1 && Object.values(PAD_AUTO_INPUTS).some(group=>candidates.every(v=>group.includes(v)))){
    candidates=[candidates.find(v=>v[0]==='b') || candidates.find(v=>v[0]==='h') || candidates[0]];
  }
  if(candidates.length!==1){ bindingFeedback('set.padSingle'); return; }
  const code=candidates[0];
  const others=padBindingEntries().filter(e=>e.slot!==slot || e.field!==field);
  if(padAutoConflict(store.padKeys,slot,code)){ bindingFeedback('set.padConflict'); return; }
  const other=others.find(e=>e.code===code), oldBinding=store[field][slot];
  if(other && (other.slot===slot || oldBinding==='auto' || !validPadBinding(other.slot,oldBinding) || padAutoConflict(store.padKeys,other.slot,oldBinding))){ bindingFeedback('set.padConflict'); return; }
  if(other) store[other.field][other.slot]=oldBinding;
  store[field][slot]=code; padCapture=null; resetInput(); save(); bindingFeedback(other?'set.padSwapped':'set.bindSaved'); renderKeys();
}
function pollPad(snapshotOnly=false){
  if(document.hidden || !document.hasFocus()){ suspendBindings(); return; }
  let pads;
  try{ pads = navigator.getGamepads ? navigator.getGamepads() : []; }catch(e){ if(padIndex!==null) releasePad(); return; }
  let gp = null;
  for(const p of pads){ if(p && (padIndex===null || p.index===padIndex)){ gp=p; break; } }
  if(!gp){ if(padIndex!==null) releasePad(); return; }
  if(padIndex===null){ padIndex=gp.index; ui.padId=gp.id.slice(0,40); renderPadStatus(); }
  const inputs=padInputs(gp);
  const samePad=bindingPadPrevious?.index===gp.index && bindingPadPrevious.id===gp.id;
  const newPadInput=!snapshotOnly && inputs.some(code=>samePad?!bindingPadPrevious.inputs.has(code):code[0]==='b');
  bindingPadPrevious={index:gp.index,id:gp.id,inputs:new Set(inputs)};
  if(modalOpen()){
    padNeedsRelease=true;
    if($('setDlg').open){
      if(newPadInput && bindingDevice!=='pad') setBindingDevice('pad',true);
      const text=T('set.padLive',inputs.length?inputs.map(padBindingName).join(' · '):T('set.padNeutral'));
      if($('padLive').textContent!==text) $('padLive').textContent=text;
      if(bindingCheck){ bindingCheckPad=inputs; renderBindingCheck(); }
      else capturePad(inputs);
    }
    return;
  }
  if(padNeedsRelease){
    const active=padBindingEntries().some(({slot,code})=>code==='auto'?PAD_AUTO_INPUTS[slot].some(v=>inputs.includes(v)):inputs.includes(code));
    if(active) return; padNeedsRelease=false;
  }
  const now = performance.now(), ts = gp.timestamp; // judge at the device's own update time, not the poll time: a late 4ms timer (busy frame) must not turn a simultaneous d/f+2 into a 1f gap
  const t = (Number.isFinite(ts) && ts > 0 && ts <= now && ts >= padLastT) ? ts : now; // only changed input advances the judgment clock
  const b = gp.buttons, ax = gp.axes;
  const on = i => !!(b[i] && (b[i].pressed || b[i].value>0.5));
  const [hx,hy] = gp.mapping==='standard' ? [0,0] : hatVec(ax[9]); // DirectInput hat 축
  const auto={right:Number(on(15))+Number(ax[0]>0.5)+Number(hx>0),left:Number(on(14))+Number(ax[0]<-0.5)+Number(hx<0),up:Number(on(12))+Number(ax[1]<-0.5)+Number(hy>0),down:Number(on(13))+Number(ax[1]>0.5)+Number(hy<0)};
  const direction=k=>Math.max(store.padKeys[k]==='auto'?auto[k]:Number(inputs.includes(store.padKeys[k])),Number(inputs.includes(store.padAltKeys[k])));
  const x = Number(direction('right'))-Number(direction('left'));
  const y = Number(direction('up'))-Number(direction('down'));
  const nx = clamp(x,-1,1), ny = clamp(y,-1,1);
  let changed = false;
  if(nx!==padDir.x || ny!==padDir.y){ padDir={x:nx,y:ny}; changed=true; }
  const pressed = ['b1','b2','b3','b4'].map(k=>inputs.includes(store.padKeys[k]) || inputs.includes(store.padAltKeys[k]));
  if(changed || pressed.some((p,i)=>p!==padBtn[i])) padLastT = t;
  if(changed) recomputeDir(t,'pad'); // Direction must precede buttons in the same sample for d/f+2.
  pressed.forEach((p,i)=>{ if(p && !padBtn[i]){ unlockAudio(); onButton(i+1,t); } padBtn[i]=p; }); // Two physical buttons form one held logical attack.
  if(padBtn.some(Boolean) && lastSrc!=='pad') setSrc('pad');
}
setInterval(pollPad, 4);

