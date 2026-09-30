/* ---------- button / EWGF ---------- */
function onButton(n, t){
  practiceInput();
  trialTick(t); tick(t);
  pushHistory({t, btn:n}); gpInput({t, btn:n});
  if(giwonRecovery(n,t)) return; // 기원권 경직 중에는 기술이 나가지 않는다 (결정 30(giwon))
  buttonJudge(n,t);
}
function buttonJudge(n,t){ // the judging half of onButton, also used when the 기원권 recovery releases a buffered button
  if(challengeStatus(mode)==='countdown') return;
  if(mistButton(n,t)) return;
  commandButton(n,t);
}
function commandButton(n,t){
  giwonResolve(); // one staged RP at a time; a second button is a separate input
  if(wsc.active&&wsc.active.back!=null){ wscButton(n,t); endCommand(); return; }
  wscOtherMove();
  const off = t - cd.lastDF;
  if(n===4){ // 나락 f,N,d,df+4: no just frame — any 4 while the crouch dash is active (or up to 250ms into the cancel 6)
    if(cd.state===4 || cd.state===7 || (cd.state===5 && off<=250)){ strike('hellsweep', t); return; }
    if(cd.state===3 && !cd.pending) cd.pending = {t, btn:4}; // resolved when df arrives; a pending 2 keeps priority; silent if df never comes (d+4 is another move)
    return;                                                   // states 0/1/2: ignored, as every non-2 button was
  }
  if(n!==2){
    if(cd.state>=3 && (mode==='ewgf20'||mode==='combo10')) setCoach(['coach.wrongBtn', n]);
    return;
  }
  if(cd.state===4 || cd.state===7 || (cd.state===5 && off<=250) || (off>=0 && frameSlot(t)===frameSlot(cd.lastDF))){ classify(off, t); return; }
  if(giwonReady()){ strike('giwon', t); return; } // ↘+RP 기원권 (결정: 모든 모드에서 기술로 인정하고 초풍 힌트를 코치에 병기)
  if(cd.state===3){
    if(cd.pending && cd.pending.btn===2){ resolvePending(null,t); attempt('no_cd',null,t); }
    else cd.pending = {t, btn:2}; // a pending 4 is replaced silently
    return;
  }
  if(cd.state===1||cd.state===2){
    if(cd.dashT>0 && cd.dashT===cd.tF && t-cd.tF<=FF_MS){ strike('tongbal', t); return; } // 통발 f,f+2 (plain f,N,f dash or the wave restart dash)
    if(giwonStage(t, 'early_stage')) return;
    attempt('early_stage', null, t);
    return;
  }
  if(giwonStage(t, 'no_cd')) return;
  attempt('no_cd', null, t);
}
function resolvePending(tDF, now){
  const p = cd.pending; cd.pending=null; if(!p) return;
  if(p.btn===4){ if(tDF!==null) strike(p.t - tDF >= -store.window ? 'hellsweep' : 'hellsweepEarly', p.t); return; }
  if(tDF===null){ attempt('no_df', null, now); return; }
  classify(p.t - tDF, p.t);
}
