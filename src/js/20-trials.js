/* ---------- trials ---------- */
// guide: the article under /<lang>/ that the ? button next to the mode name opens (src/pages/, built by tools/build-site.js)
// needs (결정 34(char-select)): the capability flags and moves a character must have for the mode to appear; the mode tabs,
// the board tabs and setChar all read modeAvailFor. A board that more than one character can reach shows whose record each row is.
const MODES = {
  free:   {start:false, guide:'guide/'},
  wave:   {start:false, guide:'guide/wave-dash/', needs:{cap:'wave'}, of:'wave10'}, // 웨이브 연습: free practice judging with the wave guidance (결정 38(challenge-mode))
  wsc:    {start:false, guide:'guide/wsc/', needs:{cap:'wsc'}},
  giwon:  {start:false, guide:'guide/giwon-link/', needs:{cap:'giwon'}}, // 기원초 연습: free practice plus the recovery timeline (결정 30(giwon))
  jfsr:   {start:false, guide:'guide/jfsr/', needs:{moves:['jfsr']}},  // 초스카이 연습 + 10회 도전 (결정 33(jfsr))
  tju:    {start:false, guide:'guide/tju/', needs:{moves:['tju']}},    // 도발 제트어퍼 연습: 프레임 타임라인 + 10회 도전 (결정 37(tju))
  ju:     {start:false, guide:'guide/tju/', needs:{moves:['tju']}},    // 최속 제트어퍼 연습: 6N4+RP alone on a frame timeline, no challenge (결정 37(tju))
  rush:   {start:false, guide:'guide/ewgf/', needs:{moves:['ewgf','tongbal','hellsweep']}, of:'rush30'}, // 더미 격파 연습: the typed dummies with no clock or points (rushIdle)
  backdash:{start:false, guide:'guide/backdash/', needs:{cap:'kbd'}, of:'bd10'}, // 백대시 연습: the 백대시 10초 timeline and panel with no clock (bdMode)
  wave10: {start:true, dur:10000, guide:'guide/wave-dash/', needs:{cap:'wave'}},
  ewgf20: {start:true, target:20, guide:'guide/ewgf/', needs:{moves:['ewgf']}},
  combo10:{start:true, target:10, guide:'guide/wave-dash/', needs:{cap:'wave', moves:['ewgf']}},
  rush30: {start:true, dur:30000, rush:true, guide:'guide/ewgf/', needs:{moves:['ewgf','tongbal','hellsweep']}}, // 더미 격파: typed dummies, points (see RUSH_PTS)
  bd10:   {start:true, dur:10000, bd:true, guide:'guide/backdash/', needs:{cap:'kbd'}},   // 백대시: metres retreated with cancelled backdashes (see BD)
};
// 결정 38(challenge-mode): each challenge keeps a practice tab — the same drill with no start, clock, score or board. of = the challenge whose
// timeline, panel and dummies it shares. Every check that a tab shares its challenge's drill reads of through these two (the body class and
// panels, bdMode, the 더미 격파 연습 dummies and chain, 웨이브 연습's backdash machine); the texts and guide stay the tab's own.
const modeKind = (m = mode) => MODES[m] && MODES[m].of || m;
const practiceOf = c => mode!==c && modeKind()===c; // the current tab is the practice tab of challenge c
function modeAvailFor(c, m){ const n = MODES[m] && MODES[m].needs || {}, C = CHARS[c]; return !!MODES[m] && (!n.cap || !!C.caps[n.cap]) && (n.moves||[]).every(k => C.moves.includes(k)); }
const modeAvail = m => modeAvailFor(charId(), m);
const boardMixed = m => CHAR_IDS.filter(c => modeAvailFor(c, m)).length>1; // rows carry a character tag (결정 34(char-select), 2026-10-11 Q27)
// Local N-try challenges with their own boards (결정 26(wsc-board)·31(giwon-board)): mode → target, where its challenge state lives, and the
// id prefix of its challenge button / panel / timeline (#wscPanel, #gpPanel …). BOARDS, boardEntry, rankingResult,
// renderMode and the busy/countdown checks all read this one table; a new challenge mode is one row here plus the worker's BOARDS.
const CHALLENGES = {wsc:{target:WSC_TARGET, state:()=>wsc.challenge, ui:'wsc'}, giwon:{target:GP_CHALLENGE, state:()=>gp.challenge, ui:'gp'}, jfsr:{target:JF_CHALLENGE, state:()=>jfp.challenge, ui:'jf'}, tju:{target:TJ_CHALLENGE, state:()=>tjp.challenge, ui:'tj'}};
// Modes with a frame timeline and panel but no local challenge: mode → the id prefix of #<ui>Timeline / #<ui>Panel (renderMode also sets
// body.<mode>-mode) — 백대시 10초 and 백대시 연습 (12-bd-practice.js) · 최속 제트어퍼 연습 (17-ju-practice.js)
const PANEL_MODES = {bd10:'bdp', ju:'ju'};
const BOARDS = [...TRIAL_MODES, ...Object.keys(CHALLENGES)]; // matches worker and tabs
// 결정 38(challenge-mode): the 도전 모드 window lists only the open-ended scores. These boards are switched off, not removed — their mode
// code, worker board and stored rows stay, only the tabs, buttons and texts that lead to them hide. Taking a board out of this set brings it back.
const BOARDS_OFF = new Set(['ewgf20','combo10','wsc','giwon','jfsr','tju']);
const boardOn = b => !BOARDS_OFF.has(b);
const CHALLENGE_MODES = TRIAL_MODES.filter(boardOn); // the 도전 모드 window, in TRIAL_MODES order (wave10 · rush30 · bd10)
const boardTabs = () => BOARDS.filter(b => boardOn(b) && modeAvail(b)); // the ranking tabs the current character sees
const challengeTarget = m => CHALLENGES[m] ? CHALLENGES[m].target : 0; // 0 = not a challenge board
const challengeStatus = m => CHALLENGES[m] ? CHALLENGES[m].state().status : ''; // '' for modes without a challenge
function challengeBusy(){ return Object.keys(CHALLENGES).some(m => ['countdown','running'].includes(challengeStatus(m))); } // any local challenge counting down or running
// bd10 records before the measured curve (2026-10-02) were in another scale (1.0 m per backdash): kept in storage, left out of bests and personal-best checks
const BD_REC_V = 2;
const trialRecs = m => m==='bd10' ? store.records[m].filter(r => r.bdv===BD_REC_V) : store.records[m];
function renderBdHud(){ // bd10 only: distance on the stage HUD and in the trial bar
  if(!(trial.running && mode==='bd10')) return;
  $('hudScore').textContent = trial.dist.toFixed(1)+' m';
  $('dProg').textContent = T('trial.bdProg', trial.bdCount, trial.dist.toFixed(1));
}
function renderRushHud(){ // rush30 only: score on the stage HUD and in the trial bar
  const on = trial.running && mode==='rush30';
  $('hudScore').textContent = on ? trial.score+' PTS' : '';
  if(on) $('dProg').textContent = T('trial.rushPts', trial.score, trial.kills);
}
function renderMode(){
  const M = MODES[mode];
  renderChallengeTab();
  $('dName').textContent=T('mode.'+mode+'.name');
  const guide=$('dGuide'); guide.dataset.page=M.guide; guide.setAttribute('href', ASSET_ROOT+store.lang+'/'+M.guide);
  const off=movesOff(); // 결정 32(move-toggle): 꺼 둔 기술을 모드 설명 끝에 적어 둔다 (모드가 강제로 켜는 기술은 빠진다)
  $('dDesc').textContent=T(charKey('mode.'+mode+'.desc'))+(off.length?T('moves.off',off.map(k=>T('move.'+k)).join(', ')):''); $('dStart').hidden=!M.start; $('dStartMode').textContent=M.start?T('mode.'+mode+'.name'):''; // charKey: a character may word a shared mode its own way (결정 34(char-select))
  $('hudHint').textContent = mode==='giwon' ? T('hint.giwon', GP_FREE, GP_TARGET) : T(charKey('hint.'+mode));
  const sb = $('dShare'); sb.textContent = T(M.start?'share.card':'share.session'); sb.hidden = !!M.start && !trial.result;
  if(mode==='wsc' || (!M.start && !charHas('ewgf'))) sb.hidden=true; // the session card is an EWGF summary (결정 34(char-select))
  for(const [m,{ui}] of Object.entries(CHALLENGES)){ // body.wsc-mode / body.giwon-mode and each mode's own button, panel and timeline
    if(document.body) document.body.classList.toggle(m+'-mode', mode===m);
    for(const part of ['ChallengeBtn','Panel','Timeline']) $(ui+part).hidden = mode!==m;
    if(!boardOn(m)) $(ui+'ChallengeBtn').hidden = $(ui+'ChallengeStatus').hidden = true; // 결정 38(challenge-mode): the practice stays, its 10-try challenge is off
  }
  for(const [m,ui] of Object.entries(PANEL_MODES)){ // the same for a timeline and panel with no challenge button (a practice tab shows its challenge's)
    if(document.body) document.body.classList.toggle(m+'-mode', modeKind()===m);
    $(ui+'Timeline').hidden = $(ui+'Panel').hidden = modeKind()!==m;
  }
  renderWsc(); renderGp(); renderBdp(); renderJf(); renderTj(); renderJu();
  renderTrialRank();
}
// 캐릭터 선택 (결정 34(char-select)): the selector, the mode tabs and the board tabs follow the character's capabilities
function renderCharUI(){
  $('charOpenName').textContent = T('char.'+charId()+'.name'); $('charOpenFace').src = CHARS[charId()].portrait || '';
  if($('charDlg').open) renderCharTiles();
  document.querySelectorAll('#modes button[data-mode]').forEach(b => { b.hidden = !modeAvail(b.dataset.mode); });
  document.querySelectorAll('#boardTabs button').forEach(b => { b.hidden = !boardOn(b.dataset.board) || !modeAvail(b.dataset.board); });
  $('challengeOpen').hidden = !CHALLENGE_MODES.some(modeAvail);
  if($('challengeDlg').open) renderChallengeList();
  if(document.body){ document.body.classList.toggle('no-ewgf', !charHas('ewgf')); document.body.classList.toggle('no-wave', !charCap('wave')); } // no-wave: the wave tiles, charts and the 무족초 guide hide too
  for(const id of ['stRate','stTry','stMean']){ const tile = $(id).parentElement; if(tile) tile.hidden = !charHas('ewgf'); } // EWGF tiles mean nothing without an EWGF
  $('analysisLink').setAttribute('href', charCap('wave') ? '#histCard' : '#bestsCard'); // the analysis charts are wave/EWGF charts
  const taunt = $('tbtns').querySelector('[data-btn="t"]'); if(taunt) taunt.hidden = !charOf().tj; // the 1+3+4 touch button (결정 37(tju))
  $('tbtns').classList.toggle('has-bt', !!charOf().tj);
  $('movesRow').hidden = $('movesNote').hidden = !charOf().moves.length; // a character with no toggleable move has nothing to switch (2026-10-11 Q15)
  updateHud();                                              // the stage chain counter: WAVE, or BACKDASH for a character without a wave
}
function renderCharTiles(){
  const box = $('charTiles');
  box.innerHTML = CHAR_IDS.map(id => { const on = id===charId();
    return '<button type="button" class="char-tile" data-char="'+id+'" aria-pressed="'+on+'"><img src="'+(CHARS[id].portrait||'')+'" width="240" height="300" alt="" draggable="false"><b>'+escapeHTML(T('char.'+id+'.name'))+'</b><small>'+escapeHTML(T('char.'+id+'.moves'))+'</small>'+(on?'<em>'+escapeHTML(T('char.current'))+'</em>':'')+'</button>'; }).join('')
    + '<div class="char-tile soon" aria-hidden="true"><span class="char-soon">?</span><b>'+escapeHTML(T('char.soon'))+'</b><small>'+escapeHTML(T('char.soonSub'))+'</small></div>';
}
function setChar(c){
  if(!CHAR_IDS.includes(c) || c===charId()) return;
  const wave = charCap('wave');
  store.char = c; save();
  if(typeof location!=='undefined'){ // keep ?c= in step so a reload or a shared address opens the same character
    const params = new URLSearchParams(location.search);
    if(c===CHAR_DEFAULT) params.delete('c'); else params.set('c', c);
    const q = params.toString(); // not params.size: Safari before 17 has none, and the ?c= would silently drop
    try{ window.history.replaceState(null, '', location.pathname + (q?'?'+q:'') + location.hash); }catch(e){}
  }
  renderCharUI(); renderMoveSel();
  if(!wave || !charCap('wave')) coachForChar(); // to or from a character without a wave: its own idle coach box (Kazuya ↔ Hwoarang keep the last advice)
  setMode(modeAvail(mode) ? mode : 'free'); // ends a trial or challenge and clears the input like any mode change
  if(!boardTabs().includes(board.tab)){ board.tab = boardTabs()[0] || board.tab; board.msg=''; }
  renderBoard(); boardLoad();
}
function clearShare(){ trial.result=null; $('dShare').hidden = !!MODES[mode].start; renderTrialRank(); }
function setMode(m){
  const leavingWsc=mode==='wsc'&&m!=='wsc';
  endTrial(true); resetInput(); mode = m; trial.result=null; rushIdle();
  if(leavingWsc) showResult('', 'READY', ['ready.title'], ['ready.reset']);
  document.querySelectorAll('#modes button[data-mode]').forEach(b=>b.setAttribute('aria-selected', b.dataset.mode===m?'true':'false'));
  $('dProg').textContent=''; $('hudTimer').textContent='';
  renderMode();
}
// 도전 모드 (결정 38(challenge-mode)): one tab opens a window of the challenges the current character can play; picking one switches to it
// like a tab did. The tab is selected while one of them is the mode and names it underneath.
function renderChallengeTab(){
  const on = CHALLENGE_MODES.includes(mode);
  $('challengeOpen').setAttribute('aria-selected', on ? 'true' : 'false');
  $('challengeTabMode').textContent = on ? T('mode.'+mode+'.name') : '';
}
function renderChallengeList(){
  $('challengeTitle').textContent = T('challenge.title', T('char.'+charId()+'.name'));
  $('challengeList').innerHTML = CHALLENGE_MODES.filter(modeAvail).map(m => {
    const rs = trialRecs(m), best = rs.length ? rs.reduce((a,b)=>b.score>a.score?b:a) : null, bt = best && recText(m, best);
    return `<button type="button" class="challenge-item" data-mode="${m}" aria-pressed="${m===mode}"><b>${escapeHTML(T('mode.'+m+'.name'))}</b><small>${escapeHTML(T('challenge.'+m+'.sub'))}</small><em>${escapeHTML(best ? T('challenge.best', bt.label) : T('challenge.none'))}</em></button>`;
  }).join('');
}
function openChallenges(){
  const d = $('challengeDlg'); if(d.open) return;
  donateNudgeDefer(); endTrial(true); resetInput(); // like the character window: a modal never lets a trial run blind
  renderChallengeList(); if(typeof d.showModal==='function') d.showModal(); jackpotPause();
}
function startTrial(){
  const M = MODES[mode]; if(!M.start) return;
  donateNudgeDefer();
  endTrial(true); clearShare();
  jackpotPause();
  trial.running=false; trial.count=0; trial.bestChain=0; trial.target=M.target||0; trial.dur=M.dur||0; trial.score=0; trial.kills=0; trial.whiffs=0; trial.dashPts=0; trial.dist=0; trial.bdCount=0; trial.bdTop=0;
  $('dStart').disabled=true; $('dCancel').hidden=false; // 시작 leaves the stage top; 취소 takes the old start spot until the run ends
  recBegin(performance.now()); // 결정 39(replay): the countdown is part of the run
  let c = 3; $('hudCenter').textContent=c;
  trial.cdTimer = setInterval(()=>{ c--; if(c>0){ $('hudCenter').textContent=c; } else if(!REPLAY) trialGo(performance.now()); }, 1000); // a replay's GO is recorded
  renderRewards();
}
function trialGo(t){ // GO: the trial clock starts at t
  const M = MODES[mode];
  clearInterval(trial.cdTimer); trial.cdTimer=null; $('hudCenter').textContent='GO!'; clearTimeout(trial.messageTimer); trial.messageTimer=setTimeout(()=>{ $('hudCenter').textContent=''; },500);
  clearCommand(); resetCombo(); bdClear(); giwonClear(); updateHud(); trial.running=true; trial.tStart=t; recGo(t);
  if(M.rush){ const seed = REPLAY ? (player.run && Number.isSafeInteger(player.run.data.seed) ? player.run.data.seed : 0) : Date.now(); rushSeed(seed); recSeed(seed); rushSpawn(); renderRushHud(); } // dummy order from the start time (결정 39(replay))
  if(M.bd) renderBdHud();
}
function cancelTrial(){ // 취소 (from 시작 through the countdown and the run): the run is dropped, nothing is recorded or submitted
  if(REPLAY || (!trial.running && !trial.cdTimer)) return;
  endTrial(true); $('dProg').textContent = T('trial.cancelled');
}
function endTrial(cancel){
  mist=null;
  const wasRunning = trial.running; trial.running=false; bdClear(); giwonClear(); updateHud(); clearInterval(trial.cdTimer); trial.cdTimer=null; clearTimeout(trial.messageTimer); trial.messageTimer=null; clearTimeout(trial.openTimer); trial.openTimer=null; $('dStart').disabled=false; $('dCancel').hidden=true; $('hudCenter').textContent=''; $('hudTimer').textContent=''; $('hudTimer').classList.toggle('warn', false); // the clock leaves with the run (the start button takes the stage top back)
  if(world.dummy.type && !practiceOf('rush30')){ world.dummy.type=null; world.dummy.respawn=0; } // every exit (finish, cancel from blur/settings/donate/nick/setMode/reset) hands the stage back to the plain dummy — 더미 격파 연습 keeps its targets
  $('hudScore').textContent='';
  if(cancel || !wasRunning) { recDrop(); $('dProg').textContent=''; setTimeout(renderRewards, 0); return; } // refresh after any dialog opened by the caller
  const since = a => a.t>=trial.tStart;
  let rec, text, at = session.attempts.filter(since);
  if(mode==='wave10'){
    const dps = trial.count/10, chain = trial.bestChain||0;
    rec = {date:Date.now(), score:dps, dashes:trial.count, chain, label:T('rec.dps',dps.toFixed(1)), sub:T('rec.waveSub',trial.count,chain)};
    text = T('trial.waveEnd', trial.count, dps.toFixed(1));
    $('hudCenter').textContent = trial.count+' DASH';
  } else if(mode==='rush30'){
    const {score, kills, whiffs, dashPts} = trial;
    rec = {date:Date.now(), score, kills, whiffs, dashPts, label:T('rec.pts',score), sub:T('rec.rushSub',kills,whiffs,dashPts)};
    text = T('trial.rushEnd', score, kills);
    $('hudCenter').textContent = score+' PTS';
  } else if(mode==='bd10'){
    const dist = +trial.dist.toFixed(2), dashes = trial.bdCount, top = trial.bdTop, chain = trial.bestChain||0;
    rec = {date:Date.now(), score:dist, dashes, top, chain, bdv:BD_REC_V, label:T('rec.dist',dist.toFixed(1)), sub:T('rec.bdSub',dashes,top,chain)};
    text = T('trial.bdEnd', dist.toFixed(1), dashes);
    $('hudCenter').textContent = dist.toFixed(1)+' m';
  } else {
    at = at.slice(-trial.target);
    const ok = at.filter(a => a.kind==='ewgf' && (mode!=='combo10' || a.chain>=3)).length;
    const rate = Math.round(ok/trial.target*100);
    const offs = at.filter(a=>a.off!=null).map(a=>a.off); const mean = offs.length? offs.reduce((s,v)=>s+v,0)/offs.length:0;
    rec = {date:Date.now(), score:rate, hits:ok, target:trial.target, mean, label:rate+'%', sub:T('rec.ewgfSub',ok,trial.target,fmtF(mean))};
    if(mode==='combo10'){ const c = session.cycles.filter(since); rec.dps = c.length? +(c.reduce((s,x)=>s+x.dps,0)/c.length).toFixed(2) : 0; } // combo10 tie-breaker (shown by recText)
    text = T('trial.end', ok, trial.target, rate);
    $('hudCenter').textContent = rate+'%';
  }
  trial.messageTimer=setTimeout(()=>{ $('hudCenter').textContent=''; }, 2200);
  $('dProg').textContent = text;
  const oldRecords = trialRecs(mode), personalBest = !oldRecords.length || rec.score > Math.max(...oldRecords.map(r=>r.score));
  store.records[mode].push(rec); store.records[mode] = store.records[mode].slice(-30); save(); renderBests();
  store.life.trials[mode]++; jackpotHold = true; setTimeout(() => { jackpotHold = false; renderRewards(); }, 2300); checkAch(); // claiming waits for the result flash
  trial.result = {rec, attempts:at, cycles:session.cycles.filter(since), window:store.window, personalBest, char:charId(), replay:recFinish()}; $('dShare').hidden=false;
  if(REPLAY){ replayEnded(); return; } // the replay window shows the end on the stage; the parent compares it with the board row
  boardSubmit(); // always to the ranking (the server keeps only the best); no-op without a claimed nickname
  trial.openTimer = setTimeout(() => openShare().then(() => { trial.openTimer = null; }), 900); // result card after the HUD flash; openTimer stays set until it is open
}
function trialTick(now){
  mistTick(now); // resolve a staged pre-deadline slot before freezing its trial result
  if(!trial.running) return;
  if(trial.dur){ // timed modes (wave10, rush30)
    const left = Math.max(0, trial.dur-(now-trial.tStart));
    const el = $('hudTimer'); el.textContent = (left/1000).toFixed(1); el.classList.toggle('warn', left<3000);
    if(mode==='rush30') renderRushHud(); else if(mode==='bd10') renderBdHud(); else $('dProg').textContent = T('trial.dashes', trial.count);
    if(left<=0) endTrial();
  } else {
    $('dProg').textContent = trial.count+' / '+trial.target;
  }
}
function recText(m, r){ // prefer numeric fields so old records re-render in the current language
  if(challengeTarget(m))return {label:T('wsc.rankScore',r.hits??r.score,r.target??challengeTarget(m)),sub:T('wsc.rankBest',r.best||0)};
  if(m==='wave10' && Number.isFinite(r.dashes)) return {label:T('rec.dps',(+r.score).toFixed(1)), sub:T('rec.waveSub',r.dashes,r.chain||0)};
  if(m==='rush30' && Number.isFinite(r.kills)) return {label:T('rec.pts',r.score), sub:T('rec.rushSub',r.kills,r.whiffs||0,r.dashPts||0)};
  if(m==='bd10' && Number.isFinite(r.dashes)) return {label:T('rec.dist',(+r.score).toFixed(1)), sub:T('rec.bdSub',r.dashes,r.top||0,r.chain||0)};
  if(Number.isFinite(r.hits) && Number.isFinite(r.target) && Number.isFinite(r.mean)){
    const dps = m==='combo10' && Number.isFinite(r.dps) ? ' · '+T('rec.dps',r.dps.toFixed(1)) : ''; // combo10 ranks by dash/s, so show it
    return {label:r.score+'%', sub:T('rec.ewgfSub',r.hits,r.target,fmtF(r.mean))+dps};
  }
  return {label:r.label, sub:r.sub};
}
function renderBests(){
  const el = $('bests');
  el.innerHTML = TRIAL_MODES.filter(boardOn).map(m => { // a switched-off board keeps its stored records but no tile (결정 38(challenge-mode))
    const rs = trialRecs(m); const best = rs.length? rs.reduce((a,b)=>b.score>a.score?b:a):null;
    const last = rs.length? rs[rs.length-1]:null;
    const bt = best && recText(m,best), lt = last && recText(m,last);
    return `<div class="best"><div class="k">${escapeHTML(T('mode.'+m+'.name'))}</div><b>${best?escapeHTML(bt.label):'–'}</b><small>${best?escapeHTML(bt.sub)+' · '+new Date(best.date).toLocaleDateString(LOCALE[store.lang]):escapeHTML(T('best.none'))}</small>${last&&last!==best?`<small style="display:block">${escapeHTML(T('best.last'))}${escapeHTML(lt.label)}</small>`:''}</div>`;
  }).join('');
}

