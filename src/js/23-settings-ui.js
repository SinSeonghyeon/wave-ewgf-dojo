/* ---------- settings UI ---------- */
function segSel(id, attr, cb){
  const el = $(id); el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    el.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); cb(b.dataset[attr]);
  }));
  el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr])===String(store[attr==='win'?'window':attr])?'true':'false'));
}
// The saved window is retained for legacy data/Worker compatibility only; EWGF uses frameSlot().
segSel('touchSel','touch', v => { store.touch=v; save(); applyTouchUI(); });
function renderTouchSettings(){
  for(const k of ['touchSize','touchX','touchY']){ $(k).value=store[k]; $(k+'Out').textContent=store[k]+'%'; }
  applyTouchLayout();
}
for(const k of ['touchSize','touchX','touchY']) $(k).addEventListener('input', () => { store[k]=+$(k).value; save(); renderTouchSettings(); });
segSel('sideSel','side', v => { endTrial(true); store.side=+v; resetInput(); history.length=0; save(); renderHistory(); renderWsc(); });
segSel('fxSel','fx', v => { store.fx=+v; save(); rewardNoticeClear(); renderRewards(); });
segSel('langSel','lang', v => { setLang(v); });
$('setOpen').addEventListener('click', () => { unlockAudio(); const d = $('setDlg'); if(!d.open){ donateNudgeDefer(); endTrial(true); resetInput(); bindingPadPrevious=null; d.showModal(); pollPad(true); jackpotPause(); } });
$('setClose').addEventListener('click', () => { setBindingCheck(false); cancelBinding(); padNeedsRelease=true; $('setDlg').close(); });
$('setDlg').addEventListener('cancel', e => { if(listening || padCapture){ e.preventDefault(); cancelBinding(); } });
$('setDlg').addEventListener('close', () => { setBindingCheck(false); cancelBinding(); padNeedsRelease=true; showCtl(false); });
// 기술 온오프 (결정 32(move-toggle)): 버튼마다 따로 켜고 끈다. 무족초는 초풍이 꺼지면 누를 수 없다.
function renderMoveSel(){ $('moveSel').querySelectorAll('button').forEach(b => { const k=b.dataset.move; b.disabled = k==='mist' && store.moves.ewgf===0; b.setAttribute('aria-pressed', String(store.moves[k]!==0 && !b.disabled)); }); }
function setMove(k, on){ store.moves[k]=on?1:0; save(); resetInput(); renderMoveSel(); renderMode(); }
$('moveSel').querySelectorAll('button').forEach(b => b.addEventListener('click', () => setMove(b.dataset.move, !store.moves[b.dataset.move])));
renderMoveSel();
segSel('soundSel','sound', v => { store.sound=+v; save(); unlockAudio(); bgmSync(); sfxSync(); renderSound(); });
function setBgm(on){
  store.bgm=on?1:0;
  if(on) store.sound=1; // enabling music also restores the master; SFX volume stays as saved
  save(); unlockAudio(); bgmSync(); sfxSync(); renderSound();
}
segSel('bgmSel','bgm', v => setBgm(+v));
$('bgmBtn').addEventListener('click', () => setBgm(!(store.sound && store.bgm)));
$('bgmPlay').addEventListener('click',bgmTogglePlay);
$('bgmNext').addEventListener('click',bgmNext);
function renderSound(){ renderBgmPlayer(); // slider values + % readouts; language-independent, so it only runs at boot and on change
  $('bgmVol').value = store.bgmVol; $('bgmVolOut').textContent = store.bgmVol+'%';
  $('sfxVol').value = store.sfxVol; $('sfxVolOut').textContent = store.sfxVol+'%';
  $('bgmVol').disabled = !store.sound || !store.bgm;
  $('sfxVol').disabled = !store.sound;
  $('bgmBtn').setAttribute('aria-pressed', String(!!(store.sound && store.bgm)));
  document.querySelectorAll('#bgmSel button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.bgm===store.bgm)));
  document.querySelectorAll('#soundSel button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.sound===store.sound)));
}
const volOf = id => clamp(Math.round(+$(id).value)||0, 0, 100);
$('bgmVol').addEventListener('input', () => { store.bgmVol = volOf('bgmVol'); save(); renderSound(); bgmSync(); });
$('sfxVol').addEventListener('input', () => { store.sfxVol = volOf('sfxVol'); save(); sfxSync(); renderSound(); });
$('sfxVol').addEventListener('change', () => playSfx('wave')); // preview at the new level
$('dataReset').addEventListener('click', () => { // wipes records, lifetime stats, achievements and the outfit; nickname/token and settings stay (a dropped nickname would stay occupied on the server)
  if(typeof confirm==='function' && !confirm(T('set.resetConfirm'))) return;
  jackpotPause();
  store.records = perTrial(() => []); store.life = lifeDefault(); store.life.days = 1; store.ach = {}; store.fit = fitDefault(); lookCache = null; store.pendingRewards.length = 0; rewardNoticeClear(); save(); renderRewards();
  resetSession(); renderBests(); setCoach(['set.resetDone']); if($('fitDlg').open) renderFit();
});
renderSound();
const BTN_EN = ['','LP','RP','LK','RK']; // attack button n's Tekken name
const KEYLABEL = {up:'↑',down:'↓',left:'←',right:'→',...Object.fromEntries([1,2,3,4].map(n=>['b'+n,n+' '+BTN_EN[n]])),...Object.fromEntries(HOTKEYS.map(h=>[h,hotkeyButtons(h).join('+')]))};
const slotLabel = (k,alt) => T(isHotkey(k)?'set.hotKey':alt?'set.keyAlt':'set.keyPrimary'); // the caption inside a binding slot, shared by both devices
const pretty = c => c.replace(/^Key|^Digit|^Numpad/, m=>m==='Numpad'?'Num':'').replace('Arrow','');
// 결정 33(hotkeys): 철권 버튼 설정처럼 동작마다 4점 버튼 아이콘(LP RP 위, LK RK 아래, 눌리는 버튼만 밝게)과 표준 매핑 패드의 Xbox/PlayStation 기호
function btnDots(btns){
  const P = {1:[7,5],2:[16,5],3:[5,14],4:[14,14]};
  return `<svg class="dots" viewBox="0 0 21 19" aria-hidden="true">${[1,2,3,4].map(n => `<circle cx="${P[n][0]}" cy="${P[n][1]}" r="3.6"${btns.includes(n)?' class="on"':''}/>`).join('')}</svg>`;
}
const PAD_GLYPH = {xb:['A','B','X','Y','LB','RB','LT','RT','View','Menu','LS','RS'], ps:['✕','○','□','△','L1','R1','L2','R2','Create','Options','L3','R3']};
function padGlyph(code){ // standard-mapping buttons 0-11 get the controller's own symbol; everything else keeps the numbered label
  const i = /^b\d+$/.test(code) ? +code.slice(1) : -1;
  return ui.padStd && i>=0 && i<12 ? `<i class="pg ${i<4?'face':i<8?'sh':i<10?'sys':'stick'}">${PAD_GLYPH[ui.padPS?'ps':'xb'][i]}</i>` : escapeHTML(padBindingShort(code));
}
function actionLabel(k){
  if(isHotkey(k)){ const b=hotkeyButtons(k); return `${btnDots(b)}<span>${b.join('+')}<em>${b.map(n=>BTN_EN[n]).join('+')}</em></span>`; }
  return k[0]==='b' ? `${btnDots([+k[1]])}<span>${KEYLABEL[k]}</span>` : `<span>${KEYLABEL[k]}</span>`;
}
function bindingCards(id, slot){ // movement, attacks, then hotkeys (one input each, no alternate)
  const card = k => `<div class="key${isHotkey(k)?' hot':''}" data-action="${k}"><small>${actionLabel(k)}</small><div class="key-pair">${slot(k,false)}${isHotkey(k)?'':slot(k,true)}</div></div>`;
  const sec = key => `<div class="key-sec">${escapeHTML(T(key))}</div>`;
  $(id).innerHTML = sec('set.secMove') + ['up','down','left','right'].map(card).join('') + sec('set.secAtk') + ['b1','b2','b3','b4'].map(card).join('') + sec('set.secHot') + HOTKEYS.map(card).join('');
}
function renderKeys(){
  renderBindings();
  const active = (k,alt) => listening && listening.slot===k && listening.alt===alt;
  const bind = (k,alt) => { const code=store[keyField(k,alt)][k], on=active(k,alt), label=slotLabel(k,alt), name=KEYLABEL[k]+' · '+label; return `<button type="button" class="key-bind${alt?' alt':''}${!code?' empty':''}${on?' listen':''}" data-k="${k}" data-alt="${alt?1:0}" aria-label="${escapeHTML(name)}" title="${escapeHTML(name)}"><span>${escapeHTML(label)}</span><b>${on?escapeHTML(T('set.keyListen')):code?pretty(code):isHotkey(k)?'—':escapeHTML(T('set.keyAdd'))}</b></button>`; };
  bindingCards('keys', bind);
  $('keys').querySelectorAll('.key-bind').forEach(b => b.addEventListener('click', () => { if(bindingCheck) return; padCapture=null; listening = {slot:b.dataset.k,alt:b.dataset.alt==='1'}; bindingFeedback('set.bindListen'); renderKeys(); $('keys').querySelector('[data-k="'+b.dataset.k+'"][data-alt="'+b.dataset.alt+'"]')?.focus(); }));
  renderBindingCheck(true);
}
function renderBindings(){
  $('keyboardBindings').hidden=bindingDevice!=='kb'; $('padBindings').hidden=bindingDevice!=='pad';
  $('bindingTabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.device===bindingDevice)));
  $('bindingMessage').textContent=T(...bindingMessage); $('bindingCancel').hidden=!(listening || padCapture); $('bindingClear').hidden=!(padCapture || keyClearable(listening));
  const padSlot=(k,alt)=>{
    const field=padField(k,alt), code=store[field][k], active=padCapture?.slot===k && padCapture.field===field;
    const label=slotLabel(k,alt), name=KEYLABEL[k]+' · '+label;
    return `<button type="button" class="key-bind${alt?' alt':''}${code==='none'?' empty':''}${active?' listen':''}" data-pad="${k}" data-pad-alt="${alt?1:0}" aria-label="${escapeHTML(name+' · '+padBindingName(code))}" title="${escapeHTML(name+' · '+padBindingName(code))}"><span>${escapeHTML(label)}</span><b>${active?escapeHTML(T('set.bindListen')):alt && code==='none'?escapeHTML(T('set.keyAdd')):padGlyph(code)}</b></button>`;
  };
  bindingCards('padKeys', padSlot);
  const focusPad=(k,alt)=>$('padKeys').querySelector('[data-pad="'+k+'"][data-pad-alt="'+alt+'"]')?.focus();

  $('padKeys').querySelectorAll('[data-pad]').forEach(b=>b.addEventListener('click',()=>{ beginPadBinding(b.dataset.pad,b.dataset.padAlt==='1'); focusPad(b.dataset.pad,b.dataset.padAlt); }));
}
// 컨트롤러 설정 하위 화면: 설정 창 안에서 주 화면과 전환하고, 창을 닫으면 주 화면으로 돌아온다
function showCtl(on){ $('setMain').hidden=on; $('setCtl').hidden=!on; }
function ctlView(on){
  setBindingCheck(false); // also drops a capture and shows the idle prompt (cancelBinding would report a cancel nobody made)
  showCtl(on);
  (on?$('ctlBack'):$('ctlOpen')).focus?.();
}
$('ctlOpen').addEventListener('click',()=>ctlView(true));
$('ctlBack').addEventListener('click',()=>ctlView(false));
$('bindingTabs').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setBindingDevice(b.dataset.device)));
$('bindingClear').addEventListener('click',clearBinding);
$('bindingCheck').addEventListener('click',()=>setBindingCheck(!bindingCheck));
$('bindingCancel').addEventListener('click',cancelBinding);
$('bindingReset').addEventListener('click',()=>{
  if(bindingCheck) return;
  if(typeof confirm==='function' && !confirm(T('set.bindConfirm'))) return;
  cancelBinding();
  if(bindingDevice==='pad'){ store.padKeys={...DEFAULT_PAD}; store.padAltKeys=emptyPadAlt(); store.padHotKeys=emptyPadHotKeys(); }
  else { store.keys={...DEFAULT_KEYS}; store.altKeys=Object.fromEntries(Object.keys(DEFAULT_KEYS).map(k=>[k,''])); store.hotKeys=emptyHotKeys(); }
  padNeedsRelease=true; resetInput(); save(); bindingFeedback('set.bindSaved'); renderKeys();
});
$('modes').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { setMode(b.dataset.mode); if(b.scrollIntoView) b.scrollIntoView({block:'nearest', inline:'nearest'}); })); // a half-hidden tab slides fully into the scrolling list
$('modes').addEventListener('wheel', e => { const m = e.currentTarget; if(e.deltaX || !e.deltaY || m.scrollWidth <= m.clientWidth) return; m.scrollLeft += e.deltaY; e.preventDefault(); }, {passive:false}); // a plain mouse wheel over the list scrolls it sideways
$('dStart').addEventListener('click', startTrial);
function resetSession(){
  // Only the settings data reset calls this now: reset every mode, including retained ranking results.
  board.submitQueue.length=0; // Requests already sent cannot be recalled; unsent results are discarded.
  endTrial(true); resetInput();
  wsc.session=wscStats(); wsc.challenge={status:'idle',stats:null}; wsc.last=null; wsc.notice='ready';
  gp.session=gpStats(); gp.challenge={status:'idle',stats:null}; gp.last=null; gp.run=null; gp.notice='ready';
  clearShare(); renderWsc(); renderGp();
  Object.assign(session, sessionDefault()); history.length=0; lastInputT=performance.now();
  bdpReset(); // after the session: its stats tile reads session.bd.bestChain
  updateStats(); updateHud(); renderHistory(); renderLog(); renderHist(); renderWave(); coachTrend();
  showResult('', 'READY', ['ready.reset'], ['ready.title']);
}

