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
$('setDlg').addEventListener('close', () => { setBindingCheck(false); cancelBinding(); padNeedsRelease=true; });
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
const KEYLABEL = {up:'↑',down:'↓',left:'←',right:'→',b1:'1 LP',b2:'2 RP',b3:'3 LK',b4:'4 RK'};
const pretty = c => c.replace(/^Key|^Digit|^Numpad/, m=>m==='Numpad'?'Num':'').replace('Arrow','');
function renderKeys(){
  renderBindings();
  const active = (k,alt) => listening && listening.slot===k && listening.alt===alt;
  const bind = (k,alt) => { const code=store[alt?'altKeys':'keys'][k], on=active(k,alt), name=KEYLABEL[k]+' · '+T(alt?'set.keyAlt':'set.keyPrimary'); return `<button type="button" class="key-bind${alt?' alt':''}${!code?' empty':''}${on?' listen':''}" data-k="${k}" data-alt="${alt?1:0}" aria-label="${escapeHTML(name)}" title="${escapeHTML(name)}"><span>${escapeHTML(T(alt?'set.keyAlt':'set.keyPrimary'))}</span><b>${on?escapeHTML(T('set.keyListen')):code?pretty(code):escapeHTML(T('set.keyAdd'))}</b></button>`; };
  $('keys').innerHTML = Object.keys(KEYLABEL).map(k => `<div class="key" data-action="${k}"><small>${KEYLABEL[k]}</small><div class="key-pair">${bind(k,false)}${bind(k,true)}</div></div>`).join('');
  $('keys').querySelectorAll('.key-bind').forEach(b => b.addEventListener('click', () => { if(bindingCheck) return; padCapture=null; listening = {slot:b.dataset.k,alt:b.dataset.alt==='1'}; bindingFeedback('set.bindListen'); renderKeys(); $('keys').querySelector('[data-k="'+b.dataset.k+'"][data-alt="'+b.dataset.alt+'"]')?.focus(); }));
  renderBindingCheck(true);
}
function renderBindings(){
  $('keyboardBindings').hidden=bindingDevice!=='kb'; $('padBindings').hidden=bindingDevice!=='pad';
  $('bindingTabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.device===bindingDevice)));
  $('bindingMessage').textContent=T(...bindingMessage); $('bindingCancel').hidden=!(listening || padCapture); $('bindingClear').hidden=!(padCapture || listening?.alt);
  const padSlot=(k,alt)=>{
    const field=alt?'padAltKeys':'padKeys', code=store[field][k], active=padCapture?.slot===k && padCapture.field===field;
    const label=T(alt?'set.keyAlt':'set.keyPrimary'), name=KEYLABEL[k]+' · '+label;
    return `<button type="button" class="key-bind${alt?' alt':''}${code==='none'?' empty':''}${active?' listen':''}" data-pad="${k}" data-pad-alt="${alt?1:0}" aria-label="${escapeHTML(name+' · '+padBindingName(code))}" title="${escapeHTML(name+' · '+padBindingName(code))}"><span>${escapeHTML(label)}</span><b>${escapeHTML(active?T('set.bindListen'):alt && code==='none'?T('set.keyAdd'):padBindingShort(code))}</b></button>`;
  };
  $('padKeys').innerHTML=Object.keys(KEYLABEL).map(k=>`<div class="key" data-action="${k}"><small>${KEYLABEL[k]}</small><div class="key-pair">${padSlot(k,false)}${padSlot(k,true)}</div></div>`).join('');
  const focusPad=(k,alt)=>$('padKeys').querySelector('[data-pad="'+k+'"][data-pad-alt="'+alt+'"]')?.focus();

  $('padKeys').querySelectorAll('[data-pad]').forEach(b=>b.addEventListener('click',()=>{ beginPadBinding(b.dataset.pad,b.dataset.padAlt==='1'); focusPad(b.dataset.pad,b.dataset.padAlt); }));
}
$('bindingTabs').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setBindingDevice(b.dataset.device)));
$('bindingClear').addEventListener('click',clearBinding);
$('bindingCheck').addEventListener('click',()=>setBindingCheck(!bindingCheck));
$('bindingCancel').addEventListener('click',cancelBinding);
$('bindingReset').addEventListener('click',()=>{
  if(bindingCheck) return;
  if(typeof confirm==='function' && !confirm(T('set.bindConfirm'))) return;
  cancelBinding();
  if(bindingDevice==='pad'){ store.padKeys={...DEFAULT_PAD}; store.padAltKeys=emptyPadAlt(); }
  else { store.keys={...DEFAULT_KEYS}; store.altKeys=Object.fromEntries(Object.keys(DEFAULT_KEYS).map(k=>[k,''])); }
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

