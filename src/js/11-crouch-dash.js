/* ---------- crouch dash state machine ---------- */
// Standalone f,N,df+RP. Only the final slot is staged: real d/f holds are
// replayed into the original machine, with original timestamps and no duplicate history.
let mist = null, mistRelease=false;
const mistNew = t => ({f:t,n:null,df:null,rp:null,slot:null,released:false,queue:[]});
// The button this staged 6N3 waits for (0 = none): RP for the legacy 무족초, the recipe button for a just-frame
// character (결정 33(jfsr), 결정 34(char-select)). The rest of the staging is the same for both.
const mistBtn = () => { const c = charOf(); return c.legacy ? (moveOn('mist') ? 2 : 0) : (c.jf && moveOn(c.jf.move) ? c.jf.btn : 0); };
// Where the legacy 무족초 may start (checked in mistDir, before commandDir): only a fresh start 6 — a wave link is not 무족초.
const mistStart = () => cd.state===0 && cd.chain===0 && !wsc.active;
// A just-frame character arms on every 6 (결정 33(jfsr)): a fresh start, a retry after an abandoned 6N2 / 62, the wave's cancel 6
// (6N23 6 N 3) and restart 6 (6N23 6 N 6 N 3) — the game refuses the wave ones, the practice tool accepts them. It runs after
// commandDir (onDir) because commandDir's own resetCD on a re-pressed 6 (states 1·3) would drop a slot armed before it.
function mistArmJf(dir,t){ if(dir==='f' && !mist && !charOf().legacy && mistBtn()) mist=mistNew(t); }
function mistReplay(){
  const m=mist; mist=null;
  if(!m) return;
  for(const e of m.queue){ if(e.dir) commandDir(e.dir,e.t,true); else commandButton(e.btn,e.t); }
  // 결정 33(jfsr): for a just-frame character a staged 6 that never became a 3 starts the next 6N3 (6 N 6 N 3+4).
  // The legacy 무족초 keeps its rule: a 6 after a neutral is a dash start (통발), never a new 무족 start.
  const last=m.queue[m.queue.length-1];
  if(!charOf().legacy && !mist && m.df==null && m.rp==null && last && last.dir==='f' && mistBtn()) mist=mistNew(last.t);
}
function mistTick(t){
  const m=mist; if(!m) return;
  if(m.slot!=null && frameSlot(t)>m.slot){
    if(m.df==null || charOf().legacy){ mistReplay(); return; }
    // 결정 33(jfsr): for the 초스카이 judge a d that shared the d/f frame never existed, so the slot stays a plain 6N3 still
    // waiting for its 4 — a late 4 is 3RK, not a crouch-dash Sky Rocket. The wave machine still gets the 6N23 exactly as the
    // legacy replay gives it (결정 1(wave-input): with a neutral it is a crouch dash), so a mixed board (결정 34(char-select))
    // counts the same dashes for every character. N → 6 → ↘ in one frame is no crouch dash and only closes the prefix.
    const q=m.queue; m.slot=null; m.queue=[];
    if(q[0] && q[0].dir==='d'){ mist=null; for(const e of q) commandDir(e.dir,e.t,true); mist=m; }
    else { cd.state=0; wsc.prefix=0; resetTaps(); }
  }
  const expired=t-(m.df??m.n??m.f)>(m.df!=null?450:250);
  if(expired || (m.rp!=null && t-m.rp>120)){
    // Resolve owned events before the original machine's timeout clears its prefix.
    // Replay directions with their buttons in order; an RP alone fails exactly once.
    // Keep the original button time instead of the render time in that failure.
    if(m.slot!=null || m.rp==null) mistReplay();
    else if(!charOf().legacy) mist=null; // 6N+4 with no 3 is another move, not a Sky Rocket attempt
    else {mist=null;attempt('no_df',null,m.rp);}
  }
}
function mistFinish(t){
  const m=mist; mist=null;
  cd.state=0; wsc.prefix=0; resetTaps(); // commit only after RP; never count a wave
  const input={inputRoute:'mist',fFrames:frameSlot(m.n)-frameSlot(m.f),nFrames:frameSlot(m.df)-frameSlot(m.n),startT:m.f,neutralT:m.n}; // startT/neutralT: 기원초 링크가 읽는 시작 6·중립 시각
  const off=t-m.df;
  if(!charOf().legacy) jfStaged(off,t,input);
  else if(input.fFrames<1||input.nFrames<1) attempt('early_stage',off,t,input);
  else classify(off,t,input);
  mistRelease=!m.released; // neutral may already have arrived before this RP
}
function mistDir(dir,t){
  if(mistRelease){
    if(dir==='n'){mistRelease=false;backdashMotion(dir,t);return true;}
    if(dir==='f'||dir==='d'||dir==='df'){backdashMotion(dir,t);return true;}
    mistRelease=false;
  }
  const m=mist;
  if(!m){
    if(dir==='f' && charOf().legacy && mistStart() && mistBtn()) mist=mistNew(t); // a just-frame character arms in mistArmJf
    return false;
  }
  if(m.n==null){
    // Legacy keeps a real f,N,f dash for 통발; a just-frame character has no 통발, so any 6 → N goes on
    if(dir==='n' && (charOf().legacy ? cd.state===1 && cd.dashT!==cd.tF : true)) m.n=t;
    else mist=null;
    return false;
  }
  if(m.df!=null){
    if(dir==='n'){m.released=true;backdashMotion(dir,t);if(m.slot!=null)m.queue.push({dir,t});return true;}
    mistReplay(); return false;
  }
  if(dir==='df'){
    backdashMotion(dir,t);
    m.df=t;
    // A transient d could also be the end of a normal wave/WSC prefix.
    // With no same-slot RP, replay that wave when the slot closes.
    if(m.slot!=null) m.queue.push({dir,t});
    else {cd.state=0;wsc.prefix=0;resetTaps();}
    if(m.rp!=null) mistFinish(m.rp);
    return true;
  }
  if(dir==='d'||dir==='f'){
    // Only one intermediate direction can build N -> (d or f) -> df. A second
    // cardinal direction is a reversal, not simultaneous diagonal key presses.
    // Replay it through the normal prefix rules (including the optional neutral in 623).
    if(m.slot!=null){ mistReplay(); return false; }
    backdashMotion(dir,t);
    m.slot=frameSlot(t); m.queue.push({dir,t}); return true;
  }
  mistReplay(); if(mist && dir==='n') mist.n=t; // a just-frame character restarts on the staged 6 (mistReplay)
  return false;
}
function mistButton(n,t){
  const m=mist; if(!m) return false;
  if(n!==mistBtn() || m.n==null){ mistReplay(); return false; }
  if(m.df!=null){ mistFinish(t); return true; }
  // A real dash + RP remains a tongbal; only an RP in the same slot as
  // the provisional forward waits until that slot can no longer become df.
  if(m.rp!=null){ mistReplay(); return false; }
  m.rp=t; m.queue.push({btn:n,t}); return true;
}
function resetCD(){ cd.state=0; mist=null; cd.gFault=null; }
function clearCommand(){
  mist=null; mistRelease=false;
  Object.assign(cd,{state:0,tF:0,tN:0,tD:0,tDF:0,tC:0,tRel:0,lastDF:-1e9,cancelled:true,chain:0,chainCycles:[],pending:null,dashT:-1e9,dashWave:false,omittedNeutral:false,gFault:null});
}
// rush30 and 더미 격파 연습: reset the command after a finisher (초풍·통발·나락) but keep the wave chain, so a kill does not drop the dash-point streak (a 700ms pause still ends it via endChain). cancelled=true so the next crouch dash links.
function endCommand(){ mist=null; if((trial.running && mode==='rush30') || practiceOf('rush30')){ Object.assign(cd,{state:0,tF:0,tN:0,tD:0,tDF:0,tC:0,tRel:0,cancelled:true,pending:null,dashT:-1e9,dashWave:false,omittedNeutral:false,gFault:null}); } else clearCommand(); }
function onDir(dir, t){
  recDir(dir, t); // 결정 39(replay)
  practiceInput();
  trialTick(t); tick(t); // 판정 기한은 화면 주사율과 무관하게 입력 시각에 검사한다.
  if(dir!==heldDir){ prevDir = heldDir; heldDir = dir; heldDirT = t; }
  pushHistory({t, dir}); gpInput({t, dir});
  // 결정 37(tju): the taunt's frame reader gets every direction, a countdown included, like the history — otherwise its last direction
  // drifts from the stick and a 6 held from the countdown and released on 29f is no cancel in the challenge only (review 2026-10-15)
  const tjSwallowed = tjDir(dir,t);
  if(challengeStatus(mode)==='countdown') return;
  if(tjSwallowed) return; // 아무도 캔슬하지 않은 도발의 33~77f에는 입력이 무시된다 — 걷기·백대시도 나가지 않는다
  if(giwonRP){ // the other half of a ↘ in the same slot completes 기원권; anything else replays the RP's own failure
    const staged = giwonRP, same = frameSlot(t)===staged.slot;
    if(dir==='df' && same){ giwonRP = null; backdashMotion(dir,t); cd.gFault=null; strike('giwon', staged.t); return; }
    if(same && staged.fromN && (dir==='d' || dir==='f')){ staged.fromN = false; staged.half = dir; staged.halfT = t; } // RP가 먼저 왔다: 대각의 첫 절반이다, 계속 기다린다
    else giwonResolve(); // 같은 칸의 다른 방향도 슬롯이 지난 것과 똑같이 푼다(접두 6 재건 포함)
  }
  // 경직 중에 선입력으로 남는 방향은 **시작 6 하나**다(사용자 확인 2026-09-27). 중립은 경직이 끝난 뒤에
  // 들어가야 하므로 6 외의 방향은 커맨드를 잇지 못한다 — 경직 중에 풀어 버린 N은 버려진다.
  // 경직 중에 6을 다시 누르면 그 사이의 N은 버려졌으므로 커맨드 머신에는 f→f로 보인다. 상태 1은 f→f를
  // 실패로 끊어 버려서, 6을 한 번 더 눌렀을 뿐인데 초풍 대신 기원권이 또 나갔다. 경직 중의 6은 매번 새 시작 6이다.
  // 그 6도 선입력 창(GP_BUF_A~GP_BUF_B, 40~46f) 안에서 눌렀을 때만 남는다. 창 앞이나 47f에 누른 6은 버려진다(사용자 보고 2026-10-08).
  if(giwonStiff(t)){ if(dir!=='f' || !giwonPre(t)) return; resetCD(); }
  if(mistDir(dir,t)) return;
  commandDir(dir,t); mistArmJf(dir,t);
}
function backdashMotion(dir,t,bdOutNow=false){
  if(t<bdRec.until && (dir==='d'||dir==='db'||dir==='df'||dir==='u'||dir==='ub'||dir==='uf')){ bdRec.until = t; bdCut(t); if(anim.kind==='backdash'){ anim.moveDur=0; startAnim('bdCrouch'); } }
  if(bdActive()) bdDir(dir,t);
  if(bdOutNow) bdRec.until=t+BD.RECOVER_F*FRAME;
}
// Every entry into state 1 is a fresh start 6, so it drops the previous prefix's 623 provenance.
// The cancel 6 (states 4/5/7) must NOT clear it: its EWGF is still judged from that prefix.
function startCD(t){ cd.state=1; cd.tF=t; cd.omittedNeutral=false; }
function commandDir(dir,t,backdashDone=false){
  // A staged "6 → 3" fault only becomes a fault once the ↘ leaves without an RP (see case 1 below).
  if(cd.gFault!=null && dir!=='df'){ const staged=cd.gFault; cd.gFault=null; fault('f_before_d', staged); }
  // 623에서 2가 대각과 같은 60Hz 칸이면 그 프레임에는 ↘만 있다: 2가 한 프레임도 없었으므로 크라우치 대시가 아니라 6→3이다
  // (결정 1(wave-input) 보완. 사용자 보고 2026-10-08: 경직 중 버려진 N 뒤 48f에 ↓→+RP를 함께 누르면 기원초 성공으로 판정됐다)
  // 6까지 같은 칸이면 그 6도 한 프레임을 차지하지 못했으니 앞 프레임들(예: 6 N ↘ = 무족초)이 실제 입력이다 — 그때는 건드리지 않는다.
  // wscDir보다 먼저 정해야 웨캔기어도 같은 입력을 웨이브로 세지 않는다(모든 모드 공통).
  const rolled = dir==='df' && cd.state===3 && cd.omittedNeutral && frameSlot(t)===frameSlot(cd.tD) && frameSlot(cd.tF)<frameSlot(t);
  wscDir(dir,t,rolled);
  // dash / backdash from a double tap. Runs before the switch so the second f still becomes the start 6 (cd.tF===t → f,f+2 eligible, 대초 label).
  // The wave's cancel 6 → N → start 6 is a dash too (2026-09-12 user decision; the cancel 6 alone is not): shorter visual, no 대초 label (dashWave).
  let bdOutNow = false; // this input completed a b,N,b outside the recovery
  { const wave = dir==='f' && cd.state===6; const dbl = giwonStiff(t) ? null : tapDetect(dir, t); if(dbl==='f'){ cd.dashT=t; cd.dashWave=wave; fx.dash(wave); } else if(dbl==='b' && t>=bdRec.until){ bdOutNow = true; fx.backdash(); } } // a b,N,b inside the recovery does nothing (stiff); nothing at all comes out inside a 기원권 recovery
  if(!backdashDone) backdashMotion(dir,t,bdOutNow); // staged directions already reached the independent backdash machine
  if(!charCap('wave')) return; // 결정 34(char-select): no crouch dash, no wave, no 6→3 faults for a character without one (dashes and backdashes above still come out)
  switch(cd.state){
    case 0: if(dir==='f') startCD(t); break;
    case 1:
      if(dir==='n'){ cd.state=2; cd.tN=t; }
      // Rolling from neutral to ↘ brushes 6 for a frame (confirmed on the reference clip), so a
      // start 6 → ↘ may be the front of a 기원권, not a skipped N/2 yet. Hold the fault: the RP
      // cancels it, any other direction or GIWON.FAULT_MS fires it with its original timestamp.
      else if(dir==='df'){ const staged=t; resetCD(); if(moveOn('giwon')) cd.gFault=staged; else fault('f_before_d', staged); } // 기원권을 꺼 두면 기다릴 이유가 없다
      else if(dir==='d'){
        cd.state=3; cd.tN=t; cd.tD=t; cd.omittedNeutral=true; // 623: zero neutral gap, same crouch dash
      }
      else resetCD();
      break;
    case 2:
      if(dir==='d'){ cd.state=3; cd.tD=t; }
      else if(dir==='f'){ startCD(t); }
      else if(dir==='df'){ fault('n_to_df', t); if(moveOn('mist')) setCoach(['mist.unsupported']); resetCD(); }
      else resetCD();
      break;
    case 3:
      if(rolled){ // 6→3 (commandDir 머리의 rolled 참고)
        const p = cd.pending; cd.pending = null; resetCD();
        if(p && p.btn===2) strike('giwon', p.t);   // 같은 칸에 먼저 온 RP: ↘+RP = 기원권 (4는 d+4라 조용히 버린다)
        else cd.gFault = t;                         // 6→3 실패는 기원권 굴림처럼 보류한다
      }
      else if(dir==='df'){ if(charCap('wave')) completeCD(t); else { if(cd.pending) resolvePending(null, t); resetCD(); } } // 결정 34(char-select): no crouch dash, no wave for a character without one
      else { if(cd.pending){ resolvePending(null, t); } resetCD(); if(dir==='f') startCD(t); }
      break;
    case 4: // d/f held (crouch dash active)
      if(dir==='f'){ cancelCD(t); }
      else if(dir==='n' || dir==='d'){ cd.state=7; cd.tRel=t; }
      else resetCD();
      break;
    case 5: // cancel 6 held
      if(dir==='n'){ cd.state=6; cd.tN=t; }
      else if(dir==='df'){ fault('f_before_d', t); resetCD(); }
      else if(dir==='d'){ fault('cancel_as_start', t); resetCD(); }
      else resetCD();
      break;
    case 6: // neutral after cancel, waiting for the second 6
      if(dir==='f'){ startCD(t); }
      else if(dir==='d'){ fault('cancel_as_start', t); resetCD(); }
      else if(dir==='df'){ fault('n_to_df', t); resetCD(); }
      else resetCD();
      break;
    case 7: // d/f released without 6 — a 6 arriving right away still counts as the cancel
      if(dir==='f'){ cancelCD(t); }
      else if(dir==='d' || dir==='df'){ cd.state=0; }
      else resetCD();
      break;
  }
}
function cancelCD(t){ cd.state=5; cd.cancelled=true; cd.tC=t; }
function completeCD(t){
  const linked = (t - cd.lastDF <= 700) && cd.lastDF > 0;
  const cyc = { t, fHold: cd.tN-cd.tF, nGap: cd.tD-cd.tN, dHold: t-cd.tD,
                dfHold: (linked && cd.cancelled) ? cd.tC-cd.lastDF : null,
                cancelGap: (linked && cd.cancelled) ? cd.tF-cd.tC : null, cycle: null };
  let noCancel = false;
  if(linked && cd.cancelled){ cd.chain++; cyc.cycle = t - cd.lastDF; }
  else { if(linked && !cd.cancelled) noCancel = true; cd.chain=1; cd.chainCycles=[]; }
  cd.chainCycles.push(cyc);
  cd.lastDF = t; cd.tDF = t; cd.state = 4; cd.cancelled = false;
  if(mode!=='wsc'){
    session.dashes++;
    session.bestChain = Math.max(session.bestChain, cd.chain);
    store.life.dashes++; store.life.maxChain = Math.max(store.life.maxChain, cd.chain); saveSoon(); checkAch();
    if(cyc.cycle){ const dps = 1000/cyc.cycle; session.cycles.push({t, cycle:cyc.cycle, dps}); if(session.cycles.length>200) session.cycles.shift(); }
    if(cd.chain>=3){ const last3 = cd.chainCycles.slice(-3); const span = last3[2].t - last3[0].t; const dps = 2000/span; if(dps>session.bestDps) session.bestDps = dps; }
  }
  if(trial.running && mode==='wave10'){ trial.count++; trial.bestChain = Math.max(trial.bestChain||0, cd.chain); }
  else if(trial.running && mode==='rush30'){ const p = Math.min(cd.chain, RUSH_PTS.dashMax); trial.score += p; trial.dashPts += p; pop('+'+p, cssVar('--accent','#4CC9FF'), 24, {y:-150}); renderRushHud(); } // wave movement scores by chain length, anywhere (user decision)
  if(cyc.cycle) renderWave();
  fx.crouchDash();
  renderSeg(cyc);
  if(noCancel && !cd.pending){
    showResult('wgf','NO CANCEL',['r.noCancel.title'],['r.noCancel.sub']);
    setCoach(['coach.noCancel']);
    addLog(t,'log.tDash',['log.rCancel'],'',['log.mNoCancel'],'no');
  }
  else if(cd.chain>=2 && !cd.pending){
    const n = cd.chain, c = cyc.cycle;
    showResult('wave','WAVE',['r.wave.title',n], c? ['r.wave.sub',(1000/c).toFixed(1),Math.round(c),(c/FRAME).toFixed(1)] : '');
    coachWaveLive(cyc);
  }
  else if(cd.chain===1 && !cd.pending){
    showResult('wave','CROUCH DASH',['r.cd.title'],['r.cd.sub',Math.round(cyc.fHold),Math.round(cyc.nGap),Math.round(cyc.dHold)]);
    if(!cd.chainCycles.length || session.dashes<=1) setCoach(['coach.firstCD']);
  }
  if(cd.pending) resolvePending(t, t);
  updateStats(); updateHud();
}
function fault(kind, t){
  if(!['f_before_d','n_to_df','cancel_as_start'].includes(kind)) return;
  clearCommand(); resetCombo(); updateHud();
  showResult('miss', 'MISS', ['fault.'+kind+'.title'], '');
  setCoach(['fault.'+kind+'.coach']);
  fx.stumble();
  addLog(t, 'log.tDash', ['log.rFail'], '', ['fault.'+kind+'.title'], 'no');
}

