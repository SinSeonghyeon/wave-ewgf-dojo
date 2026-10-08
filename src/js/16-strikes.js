/* ---------- 통발 / 나락 / 기원권: judged strikes that are not EWGF attempts (no effect on tries/hits/histogram/streak) ---------- */
const STRIKE_KIND = {tongbal:'DEMON PAW', hellsweep:'HELL SWEEP', hellsweepEarly:'MISS', giwon:'DEMON SLAYER'};
function strike(kind, t){
  wscOtherMove();
  const chainBefore = (t - cd.lastDF < 700) ? cd.chain : 0, ok = kind!=='hellsweepEarly';
  showResult(ok?'wave':'miss', STRIKE_KIND[kind], ['a.'+kind+'.title'], ['a.'+kind+'.sub']);
  setCoach(kind==='giwon' && moveOn('ewgf') ? () => T('a.giwon.coach') + T('a.giwon.hint') : ['a.'+kind+'.coach']); // 기원권: 초풍을 노렸을 때의 안내를 함께 (사용자 결정 2026-09-23). 초풍을 꺼 두면 안내도 뺀다 (결정 32(move-toggle))
  addLog(t, 'log.tStrike', ['res.'+kind], '', chainBefore? ['log.mAfterWave', chainBefore]:'', ok?'ok':'no');
  if(kind==='tongbal') fx.tongbal(); else if(kind==='hellsweep') fx.hellsweep(); else if(kind==='giwon') fx.giwon(); else fx.jab();
  if(ok&&mode!=='wsc'){ rushStrike(kind, t); store.life[kind]++; saveSoon(); checkAch(); }
  endCommand();
  // mistRelease must not survive a 기원권: it swallows f/d until a neutral arrives, which would eat a ↘→6 slide
  // (holding the start 6 through the recovery). The recovery itself already drops every direction but f (onDir).
  if(kind==='giwon'){ giwonArm(t); mistRelease=false; }
  updateHud();
}
const frameSlot = t => Math.floor(t / FRAME + 0.5); // performance.timeOrigin is the shared grid origin; independent of render rate
function classify(off, t, input){
  const delta = frameSlot(t) - frameSlot(t-off);
  if(delta===0) attempt('ewgf', off, t, input);
  else if(delta>0) attempt('wgf', off, t, input);
  else attempt('early', off, t, input);
}
function attempt(kind, off, t, input){
  if(!moveOn('ewgf')) return; // 초풍을 꺼 두면 초풍 계열 결과(성공·실패 모두)가 나오지 않는다 (결정 32(move-toggle))
  wscOtherMove();
  const chainBefore = (t - cd.lastDF < 700) ? cd.chain : 0;
  if(kind==='ewgf'){ if(t - combo.t > 3000) combo.n = 0; combo.n++; combo.t = t; } else resetCombo();
  const a = { t, kind, off, chain: chainBefore, mode, streak: combo.n, dash: kind==='ewgf' && cd.dashT>0 && cd.dashT===cd.tF && !cd.dashWave };
  if(input) Object.assign(a,input,{dash:false,fastest:kind==='ewgf'&&input.fFrames===1&&input.nFrames===1});
  else if(off!=null) a.inputRoute=cd.omittedNeutral?'noNeutral':'standard';
  if(off!=null) a.frameOff=frameSlot(t)-frameSlot(t-off);
  if(mode!=='wsc'){
    session.attempts.push(a); if(session.attempts.length>300) session.attempts.shift();
    session.tries++; if(kind==='ewgf') session.hits++;
    { const L = store.life; L.tries++; if(kind==='ewgf'){ L.ewgf++; if(Math.abs(off)<=8) L.tightEwgf++; L.maxStreak = Math.max(L.maxStreak, combo.n); } saveSoon(); checkAch(); }
    if(off!=null){ session.offsetSum+=off; session.offsetCount++; }
  }
  const comboOK = chainBefore>=3;
  const f = off==null?'':fmtF(off), ms = off==null?'':fmtMs(off);
  let title, sub, cls, coach, res, rowCls;
  // 기원초 링크: 기원권 뒤 첫 초풍 시도 하나에만 붙는다. 보는 것은 초풍이 GP_TARGET까지 발동했는가 하나이고
  // 명중 프레임은 재현하지 않는다(결정 27(mist)). 판정·통계는 위에서 이미 끝났고 아래에서는 문구·연출만 고른다.
  // 스위치보다 **먼저** 집는 이유는 성공 팝이 "초풍!"이 아니라 "기원초!"로 떠야 하기 때문이다.
  const armed = !!giwonLink;
  const link = giwonTake(a, t, input?input.startT:cd.tF, input?input.neutralT:cd.tN);
  const linkWin = !!link && linkOk(link);
  if(link) a.giwonLink = link;
  switch(kind){
    case 'ewgf':
      cls='ewgf'; title=[a.dash?'a.dashEwgf.title':'a.ewgf.title']; res=a.dash?'dash_ewgf':'ewgf'; rowCls='ok';
      sub = () => T('a.ewgf.sub', f, ms) + (chainBefore>1 ? T('a.afterWave', chainBefore) : '') + (a.streak>1 ? T('a.streak.sub', a.streak) : '');
      coach = Math.abs(off)<=4 ? ['a.ewgf.perfect'] : (off>0 ? ['a.ewgf.late', f] : ['a.ewgf.early', f]);
      if(mode==='combo10' && !comboOK) { coach = ['a.combo.coach', chainBefore]; title=['a.combo.title']; cls='wgf'; res='combo_short'; rowCls='wg'; }
      fx.ewgf(a.streak, linkWin?'pop.giwoncho':a.inputRoute==='mist'?'pop.mistEwgf':a.dash?'pop.dashEwgf':'pop.ewgf'); rushStrike('ewgf', t); break;
    case 'wgf':
      cls='wgf'; title=['a.wgf.title']; res='wgf'; rowCls='wg';
      sub = ['a.wgf.sub', f, ms];
      coach = off>100 ? ['a.wgf.slow', f] : ['a.wgf.close', f];
      fx.wgf(); rushStrike('wgf', t); break;
    case 'early':
      cls='miss'; title=['a.early.title']; res='early'; rowCls='no';
      sub = ['a.early.sub', f, ms];
      coach = ['a.early.coach'];
      fx.jab(); break;
    case 'no_df':
      cls='miss'; title=['a.no_df.title']; res='no_df'; rowCls='no';
      sub = ['a.no_df.sub'];
      coach = ['a.no_df.coach'];
      fx.jab(); break;
    case 'early_stage':
      cls='miss'; title=['a.early_stage.title']; res='early_stage'; rowCls='no';
      sub = [cd.state===1 ? 'a.early_stage.subF' : 'a.early_stage.subN'];
      coach = ['a.early_stage.coach'];
      fx.jab(); break;
    default:
      cls='miss'; title=['a.no_cd.title']; res='no_cd'; rowCls='no';
      sub = ['a.no_cd.sub'];
      coach = ['a.no_cd.coach'];
      fx.jab();
  }
  if(input){
    sub=['mist.frames',a.fFrames,a.nFrames,a.frameOff];
    if(kind==='ewgf'){
      if(res!=='combo_short'){title=[a.fastest?'mist.fastest':'mist.title'];coach=a.fastest?['mist.input13']:['mist.improve',a.fFrames-1,a.nFrames-1];}
    } else if(kind==='early_stage'){title=['mist.missingFrame'];coach=['mist.hold'];}
    else coach=[kind==='early'?'mist.early':'mist.late',Math.abs(a.frameOff)];
    renderSeg({mist:true,f:a.fFrames,n:a.nFrames,rp:a.frameOff});
  }
  if(link) gpFinish(link, a); else if(armed) gpAbort();
  if(link){
    const ok = linkWin;
    // 아직 날아가기 전(launchAt)인 더미에 이번 연결의 결과를 실어 준다 — 연출 전용 (결정 30(giwon))
    { const d = world.dummy; if(d.hit && d.launchAt && d.move==='ewgf') d.power = ok ? 'link' : 'weak'; }
    coach = ok ? (() => T('link.ok', GP_TARGET) + T('link.assume', GIWON.RECOVERY_F, GIWON.GROUND_F))
               : () => linkWhy(link);
    if(ok){ title = ['link.title']; fx.linkWin(); }
    renderSeg({giwon:true, cell:link.ewgf?link.cell:null, nOff:link.n, fOff:link.f, rp:a.frameOff}); // 링크가 붙은 시도는 루트와 무관하게 발동 칸이 제일 중요하다
  }
  showResult(cls, input?['route.mist']:kind==='ewgf'?(a.dash?'DASH ELECTRIC WIND GOD FIST':'ELECTRIC WIND GOD FIST'):kind==='wgf'?'WIND GOD FIST':'MISS', title, sub);
  setCoach(coach);
  const memo=()=>[a.giwonLink?T(linkOk(a.giwonLink)?'link.memoOk':'link.memo',a.giwonLink.cell):'',a.inputRoute?T('route.'+a.inputRoute):'',chainBefore?T('log.mAfterWave',chainBefore):''].filter(Boolean).join(' · ');
  addLog(t, 'log.tEwgf', input&&kind==='ewgf'&&res!=='combo_short'?[a.fastest?'mist.fastest':'mist.title']:['res.'+res], input?['mist.frames',a.fFrames,a.nFrames,a.frameOff]:off==null?'':f+' / '+ms, memo, rowCls);
  if(trial.running && (mode==='ewgf20'||mode==='combo10')){ trial.count++; if(trial.count>=trial.target) endTrial(); }
  coachTrend(); updateStats(); renderHist(); renderLog();
  endCommand(); updateHud();
}

