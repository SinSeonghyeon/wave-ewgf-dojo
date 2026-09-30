/* ---------- backdash (414 N 414 N …) machine. Reads/writes only bd, session.bd, trial.dist/bdCount/bdTop/bestChain; shows through the same result card / coach / log as everything else ---------- */
const bdActive = () => mode==='bd10' || (mode==='free' && !trial.running);
const bdLoud = () => bd.engaged || mode==='bd10'; // free practice is silent until the first 1(↙) cancel
function bdClear(){ Object.assign(bd,{state:0,t4a:0,tN:0,t4b:0,prev:null,chain:0,engaged:false,lastT:-1e9,seg:null,open:null,card:null}); }
function bdBreak(t){ // chain over (fail, no cancel, timeout). Logs a 3+ chain like endChain does for the wave.
  bd.state=0; bd.prev=null;
  if(bd.chain>=3 && bdLoud()) addLog(t,'log.tBack',['bd.chain.end',bd.chain],'','','');
  if(bd.chain){ bd.chain=0; updateHud(); }
}
function bdFail(kind, t){
  const loud = bdLoud(); bdBreak(t);
  if(!loud) return;
  showResult('miss','MISS',['bd.f.'+kind+'.title'],'');
  setCoach(['bd.f.'+kind+'.coach']);
  addLog(t,'log.tBack',['bd.f.'+kind+'.title'],'','','no');
}
function bdEarn(dist, t){ // distance credited for a backdash (cancelled or completed)
  session.bd.count++; session.bd.dist += dist; bd.lastT = t;
  if(trial.running && mode==='bd10'){ trial.dist += dist; trial.bdCount++; renderBdHud(); }
}
function bdNoCancel(t){ // 4 released (or held past LINK_MAX_F) without a 1: full distance, then RECOVER_F of stiffness
  const loud = bdLoud(); bdEarn(1, t); bd.open = {t4b:bd.t4b}; // the metre is provisional until the recovery ends: a crouch/sidestep before MOVE_F stops the dash and bdCut takes the rest back (the recovery itself is bdRec, set when the backdash came out)
  if(loud){ bd.seg=null; bdSeg({tap:bd.tN-bd.t4a, n:bd.t4b-bd.tN, hold:t-bd.t4b, db:0}); }
  bdBreak(t);
  if(loud){ showResult('wgf','NO CANCEL',['bd.f.noCancel.title'],['bd.f.noCancel.sub']); setCoach(['bd.f.noCancel.coach']); addLog(t,'log.tBack',['bd.f.noCancel.title'],'','','no'); }
}
function bdOut(t){ // b,N,b completed: the backdash comes out. Grades the set that started at the previous backdash (p); the first one of a chain is just counted.
  const p = bd.prev, tapF = bdF(t-bd.t4a), loud = bdLoud(); bd.state=3; bd.t4b=t; bd.lastT=t; bd.prev=null; bd.card=null;
  const period = p ? bdF(t-p.t4b) : 0, dbF_ = p ? bdF(bd.t4a-p.t1) : 0, mps = p ? Math.round(p.dist*6000/period)/100 : 0; // m/s to 2 decimals (exact at the tier bounds: 0.6 m over 12f is 3.00, not 2.999…)
  const g = p ? (BD.TIERS.find(x => mps>=x.mps)||{k:'slow'}).k : null;
  bd.chain = !p || g==='slow' ? 1 : bd.chain+1;
  session.bd.bestChain = Math.max(session.bd.bestChain, bd.chain); if(g==='top') session.bd.top++;
  if(trial.running && mode==='bd10'){ trial.bestChain = Math.max(trial.bestChain||0, bd.chain); if(g==='top') trial.bdTop++; renderBdHud(); }
  updateHud();
  if(!loud) return;
  if(!p){ bd.card = {cls:'wave', title:['bd.first.title']}; showResult(bd.card.cls,'BACKDASH',bd.card.title,['bd.first.sub',tapF]); setCoach(['bd.coach.first']); return; }
  const n = bd.chain, worst = [['early', BD.MOVE_F-p.h], ['late', p.h-BD.MOVE_F-1], ['db', dbF_-2], ['tap', tapF-4]].sort((a,b)=>b[1]-a[1])[0]; // biggest loss in frames decides the coach line (a 2f 1 and a 2f+2f 4N4 are already tight)
  bd.card = {cls:g==='slow'?'wgf':'wave', title:() => T('bd.title', n, T('bd.grade.'+g))}; // bdCancel redraws this card with the cancel line, whatever else was shown in between
  showResult(bd.card.cls,'BACKDASH', bd.card.title, () => T('bd.sub', mps.toFixed(1), p.h, dbF_, tapF));
  setCoach(worst[1]>0 ? ['bd.coach.'+worst[0], worst[1]] : ['bd.coach.good']);
  addLog(t,'log.tBack',['res.bd_'+g], mps.toFixed(1)+' m/s', ['bd.log.cancel',p.h], g==='slow'?'wg':'ok');
}
function bdCancel(h, dist){ // 1(↙) after the backdash: immediate feedback on the cancel timing (the set grade follows at the next backdash)
  const off = h-BD.MOVE_F, sub = () => T('bd.cancel', h, off, dist.toFixed(1)), card = bd.card || {cls:'wave', title:['bd.first.title']}; // no card yet when this 1 is the one that engaged free practice
  showResult(card.cls, 'BACKDASH', card.title, sub);
  setCoach(off<0 ? ['bd.coach.early', -off] : off>1 ? ['bd.coach.late', off] : ['bd.coach.cancelOk']);
}
function bdCut(t){ // crouch/sidestep inside the recovery of an uncancelled backdash: the dash stopped here, so the provisional metre becomes the distance actually travelled
  if(!bd.open) return;
  const d = bdDist(bdF(t-bd.open.t4b)) - 1; bd.open=null; if(!d) return;
  session.bd.dist += d; if(trial.running && mode==='bd10'){ trial.dist += d; renderBdHud(); }
}
function bdDir(dir, t){
  switch(bd.state){
    case 0: if(dir==='b'){ bd.state=1; bd.t4a=t; } break;
    case 1:
      if(dir==='n'){ bd.state=2; bd.tN=t; }
      else if(bd.prev) bdFail('dir', t); else bd.state=0;
      break;
    case 2:
      if(dir==='b'){
        if(t-bd.t4a>TAP_MS){ if(bd.prev) bdFail('nLong', t); bd.state=1; bd.t4a=t; }               // too slow to pair (same rule as tapDetect: second 4 within TAP_MS of the first 4, so judging and the visual agree): this b is a new first tap
        else if(t<bdRec.until) bdFail('stiff', t);                                                  // still recovering from an uncancelled backdash (no pop: the stance says it)
        else bdOut(t);
      }
      else if(bd.prev) bdFail('dir', t); else bd.state=0;
      break;
    case 3: {
      const h = bdF(t-bd.t4b);
      if(dir==='db'){
        if(h<BD.MIN_F){ bdFail('early1', t); break; }                                               // sat down before the backdash came out (the tracker already stopped the dash)
        const dist = bdDist(h); bd.seg=null; bdSeg({tap:bd.tN-bd.t4a, n:bd.t4b-bd.tN, hold:t-bd.t4b}); // the bar shows this backdash; its 1 hold fills in at the next 4
        bd.engaged=true; bd.prev={t4b:bd.t4b, h, dist, t1:t}; bd.state=4; bdEarn(dist, t); bdCancel(h, dist); updateHud(); // engaged from here: the HUD chain widget may switch to BACKDASH
      }
      else if(dir==='n') bdNoCancel(t);
      else if(dir==='f') bdFail('dir', t);                                                          // forward does not cancel anything (the recovery runs on; nothing is credited)
      else { // d/u/ub/uf = sidestep, df = crouch: both stop the dash (onDir cleared bdRec), so the distance counts but the set is over
        bdEarn(bdDist(h), t); if(bdLoud()){ bd.seg=null; bdSeg({tap:bd.tN-bd.t4a, n:bd.t4b-bd.tN, hold:t-bd.t4b, db:0}); }
        bdFail(dir==='df' ? 'dir' : 'side', t);
      }
      break; }
    case 4:
      if(dir==='b'){ bd.state=1; bd.t4a=t; bdSeg({db:t-bd.prev.t1}); } // the 1 hold closes the bar
      else bdFail(dir==='n' ? 'neutral1' : 'dir', t);
      break;
  }
}
function bdSeg(part){ bd.seg = Object.assign(bd.seg||{bd:true, tap:null, n:null, hold:null, db:null}, part); renderSeg(bd.seg); } // the "last backdash segments" bar fills in as the set unfolds
function bdTick(now){
  if(bd.state===1 && now-bd.t4a>TAP_MS){ if(bd.prev) bdFail('tapLong', now); else bd.state=0; }
  else if(bd.state===2 && now-bd.t4a>TAP_MS){ if(bd.prev) bdFail('nLong', now); else bd.state=0; }
  else if(bd.state===3 && now-bd.t4b>BD.LINK_MAX_F*FRAME) bdNoCancel(now);
  else if(bd.state===4 && now-bd.prev.t1>BD.LINK_MAX_F*FRAME) bdBreak(now);
  if(bd.open && now>=bdRec.until) bd.open=null; // the uncancelled backdash ran its full course: the metre stays
  if(bd.engaged && bd.state===0 && now-bd.lastT>3000){ bd.engaged=false; updateHud(); } // back to silent repositioning
}

