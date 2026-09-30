/* ---------- donate (nudges: 결정 21(donate-nudge)): plain external link per language, no scripts. Empty → footer row hidden for that language. ---------- */
// Two ways to give; every donate button (#donateTop header, #donateShareBtn result dialog, #donateBtn footer) opens #donateDlg to pick one.
// KakaoPay transfer links are phone-only (404 on desktop), so that choice shows a static QR (donate-kakao.png, regenerate if the URL
// changes) plus the direct link for phones. Ko-fi is a plain new-tab link. Order: ko puts KakaoPay first, other languages Ko-fi first.
const DONATE = { kakao:{url:'https://qr.kakaopay.com/Ej8EBCpJu', qr:ASSET_ROOT+'donate-kakao.png'}, kofi:{url:'https://ko-fi.com/misimadojo'} };
const donateOptions = lang => (lang==='ko' ? ['kakao','kofi'] : ['kofi','kakao']).filter(k => DONATE[k].url); // pure; unit-tested
const DONATE_ACTIVE_MS = 10*60*1000, DONATE_IDLE_MS = 30*1000;
let donateResultVisible = false, donateResultRec = null, donateNudgeTimer = null, practiceLastAt = 0, practiceTickAt = performance.now(), practiceSavedMs = store.donatePlayMs;
function takeResultDonate(personalBest, day=KST_DAY()){
  if(!personalBest || store.donateResultDay===day) return false;
  store.donateResultDay=day; save(); return true;
}
function renderDonate(){
  const opts = donateOptions(store.lang), any = opts.length>0;
  ['donate','donateTop'].forEach(id => { $(id).hidden = !any; });
  $('donateShare').hidden = !any || !donateResultVisible;
  $('donateOptions').innerHTML = opts.map(k => k==='kakao'
    ? `<button type="button" class="donate-opt" data-opt="kakao"><b>${escapeHTML(T('donate.kakao'))}</b><small>${escapeHTML(T('donate.kakaoSub'))}</small></button>`
    : `<a class="donate-opt" data-opt="kofi" href="${DONATE.kofi.url}" target="_blank" rel="noopener"><b>${escapeHTML(T('donate.kofi'))}</b><small>${escapeHTML(T('donate.kofiSub'))}</small></a>`).join('');
  $('donateOpen').href = DONATE.kakao.url; $('donateQr').src = DONATE.kakao.qr;
}
function donateView(v){ $('donateChoose').hidden = v==='kakao'; $('donateKakao').hidden = v!=='kakao'; }
function donateNudgeClear(){
  clearTimeout(donateNudgeTimer); donateNudgeTimer=null; $('donateBubble').hidden=true; $('donateNudge').dataset.active='false'; $('donateNudge').dataset.motion='false';
}
function donateNudgeBlocked(){ return challengeBusy() || document.hidden || trial.running || !!trial.cdTimer || !!trial.openTimer || !!modalOpen() || jackpotBusy || jackpotHold; }
function donateNudgeDefer(day=KST_DAY()){
  if(!donateNudgeTimer && $('donateNudge').dataset.active!=='true') return false;
  donateNudgeClear();
  if(store.donateNudgeDay===day){ store.donateNudgeDay=''; save(); }
  return true;
}
function donateNudgeMaybe(day=KST_DAY()){
  if(donateNudgeBlocked()){ donateNudgeDefer(day); return false; }
  if(store.donatePlayMs<DONATE_ACTIVE_MS || store.donateNudgeDay===day || !donateOptions(store.lang).length) return false;
  store.donateNudgeDay=day; save(); const n=$('donateNudge'); n.dataset.active='true'; n.dataset.motion=String(!reduced && !!store.fx); $('donateBubble').hidden=false;
  donateNudgeTimer=setTimeout(donateNudgeClear,8000); return true;
}
function practiceInput(){
  const day=KST_DAY(); if(store.donatePlayDay!==day){ store.donatePlayDay=day; store.donatePlayMs=0; practiceSavedMs=0; saveSoon(); }
  practiceLastAt=performance.now();
}
function practiceTick(now=performance.now()){
  const elapsed=Math.min(1000,Math.max(0,now-practiceTickAt)); practiceTickAt=now;
  const day=KST_DAY(); if(store.donatePlayDay!==day){ store.donatePlayDay=day; store.donatePlayMs=0; practiceSavedMs=0; saveSoon(); }
  if(!document.hidden && !modalOpen() && practiceLastAt && now-practiceLastAt<=DONATE_IDLE_MS && store.donatePlayMs<DONATE_ACTIVE_MS){
    store.donatePlayMs=Math.min(DONATE_ACTIVE_MS,store.donatePlayMs+elapsed);
    if(store.donatePlayMs-practiceSavedMs>=30000){ practiceSavedMs=store.donatePlayMs; saveSoon(); }
  }
  return donateNudgeMaybe(day);
}
setInterval(practiceTick,1000);
function openDonate(){ donateNudgeClear(); donateView('choose'); const d = $('donateDlg'); if(typeof d.showModal==='function' && !d.open){ endTrial(true); resetInput(); d.showModal(); jackpotPause(); store.life.donate++; save(); checkAch(); } } // opening the window is the 'thought about donating' achievement
['donateBtn','donateTop','donateShareBtn'].forEach(id => $(id).addEventListener('click', openDonate));
$('donateOptions').addEventListener('click', e => { const t = e.target && e.target.closest ? e.target.closest('[data-opt]') : null; if(!t) return; if(t.dataset.opt==='kakao'){ e.preventDefault(); donateView('kakao'); } else $('donateDlg').close(); });
$('donateBack').addEventListener('click', () => donateView('choose'));
$('donateClose').addEventListener('click', () => $('donateDlg').close());

