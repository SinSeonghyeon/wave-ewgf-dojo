/* ---------- tick: timeouts ---------- */
function tick(now){
  // 버퍼된 버튼이 경직 해제 프레임에 나간다. 판정은 실제 누른 시각으로 해야 대각+RP 같은 칸 관계가 남는다.
  // 해제는 giwonStiff와 같은 칸 경계로 본다: 원시 tRec으로 비교하면 해제 칸 앞쪽에 새로 누른 버튼이 버퍼보다 먼저 판정된다.
  if(giwonBuf && giwonLink && giwonOff(now)>=0){ const b=giwonBuf; giwonBuf=null; buttonJudge(b.n, b.t); }
  mistTick(now);
  if(giwonRP && frameSlot(now)>giwonRP.slot) giwonResolve();
  if(cd.gFault!=null && now-cd.gFault>GIWON.FAULT_MS){ const staged=cd.gFault; cd.gFault=null; fault('f_before_d', staged); }
  if(giwonLink && now>giwonLink.until){ giwonLink=null; giwonBuf=null; gpAbort(); }
  wscTick(now); gpTick(now); renderWscLive(now); renderGpLive(now);
  if(cd.state===1 && now-cd.tF>250) cd.state=0;
  else if(cd.state===2 && now-cd.tN>250) cd.state=0;
  else if(cd.state===3 && now-cd.tD>250){ if(cd.pending) resolvePending(null, now); cd.state=0; }
  else if(cd.state===4 && now-cd.tDF>450) cd.state=0;
  else if(cd.state===5 && now-cd.tC>250) cd.state=0;
  else if(cd.state===6 && now-cd.tN>250) cd.state=0;
  else if(cd.state===7 && now-cd.tRel>120) cd.state=0;
  if(cd.pending && now-cd.pending.t>120){ resolvePending(null, now); }
  if(cd.chain>0 && now-cd.lastDF>700){ endChain(now); }
  if(bdActive()) bdTick(now);
}
function endChain(now){
  const n = cd.chain, cyc = cd.chainCycles;
  if(n>=3){
    const span = cyc[cyc.length-1].t - cyc[0].t; const dps = (n-1)*1000/span;
    addLog(now,'log.tWave',['log.rChain',n], ['rec.dps',dps.toFixed(1)], ['log.mCycle',Math.round(span/(n-1))], '');
    if(mode!=='ewgf20'){
      const avg = k => cyc.map(c=>c[k]).filter(v=>v!=null).reduce((s,v,_,a)=>s+v/a.length,0);
      const segs=[['f',avg('fHold')],['n',avg('nGap')],['d',avg('dHold')],['df',avg('dfHold')],['c',avg('cancelGap')]].sort((a,b)=>b[1]-a[1]);
      const worst = segs[0];
      setTrend(() => T('chain.end', n, dps.toFixed(1), T('seg.n.'+worst[0]), Math.round(worst[1])) + T(worst[1]>90?'chain.fix':'chain.ok'));
    }
  }
  cd.chain=0; cd.chainCycles=[]; updateHud(); renderWave(); saveSoon(); // dash counters (store.life) reach disk shortly after
}

