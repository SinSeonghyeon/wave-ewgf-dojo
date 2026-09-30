/* ---------- coach text ---------- */
function setCoach(m){ ui.coach = m; $('coachMsg').innerHTML = msg(m); }
function setTrend(m){ ui.trend = m; $('coachTrend').textContent = msg(m); }
const SEGKEYS = ['f','n','d','df','c'];
function coachWaveLive(cyc){
  const vals = [cyc.fHold, cyc.nGap, cyc.dHold, cyc.dfHold, cyc.cancelGap];
  const segs = SEGKEYS.map((k,i)=>[k, vals[i]]).filter(s=>s[1]!=null).sort((a,b)=>b[1]-a[1]);
  const worst = segs[0];
  const dps = cyc.cycle?1000/cyc.cycle:0;
  const tempoKey = dps>=(waveTop()??WAVE_TOP_DEFAULT)?'tempo.5':dps>=4?'tempo.4':dps>=3?'tempo.3':'tempo.0'; // top band = the wave10 top-10% speed (5 until the board answers)
  if(worst && worst[1]>90) setCoach(() => T(tempoKey) + T('wave.worst', T('seg.n.'+worst[0]), Math.round(worst[1])) + T('seg.a.'+worst[0]));
  else setCoach(() => T(tempoKey) + T('wave.even'));
}
function coachTrend(){
  const recent = session.attempts.filter(a=>a.off!=null).slice(-10);
  if(recent.length<3){ setTrend(['trend.few']); return; }
  const offs = recent.map(a=>a.off);
  const mean = offs.reduce((s,v)=>s+v,0)/offs.length;
  const sd = Math.sqrt(offs.reduce((s,v)=>s+(v-mean)**2,0)/offs.length);
  const hit = recent.filter(a=>a.kind==='ewgf').length;
  const tail = sd>FRAME*1.8 ? ['trend.noisy'] : mean>FRAME ? ['trend.late', Math.round(mean)] : mean<-FRAME ? ['trend.early', Math.round(-mean)] : ['trend.stable'];
  setTrend(() => T('trend.head', recent.length, hit, fmtF(mean), (sd/FRAME).toFixed(1)) + T(...tail));
}
function renderSeg(cyc){
  ui.seg = cyc;
  const legend=$('segBar').nextElementSibling; if(legend) legend.hidden=!!(cyc&&(cyc.mist||cyc.giwon));
  if(cyc&&cyc.giwon){ // 기원초: 발동 칸이 판정값이고 나지는 참고다. 루트에 따라 없는 값은 —로 그린다
    $('segTitle').textContent=T('link.segTitle');
    const names=T('link.segNames'), vals=[cyc.cell,cyc.nOff,cyc.fOff,cyc.rp];
    const text=i=>names[i]+' '+(vals[i]==null?'—':(i>0&&vals[i]>0?'+':'')+vals[i]+'f');
    [...$('segBar').children].forEach((el,i)=>{el.style.flex=i<4?1:0;el.textContent=i<4?text(i):'';el.title=el.textContent;});
    return;
  }
  if(cyc&&cyc.mist){
    $('segTitle').textContent=T('mist.segTitle');
    const names=T('mist.segNames'), vals=[cyc.f,cyc.n,cyc.rp];
    [...$('segBar').children].forEach((el,i)=>{el.style.flex=i<3?Math.max(1,Math.abs(vals[i])):0;el.textContent=i<3?names[i]+' '+(i===2&&vals[i]>0?'+':'')+vals[i]+'f':'';el.title=el.textContent;});
    return;
  }
  const isBd = !!(cyc && cyc.bd), names = T(isBd ? 'seg.namesBd' : 'seg.names'); // backdash: 4 tap · N · 4 held until the cancel · 1 held until the next 4 (fifth slot collapsed)
  const bar = $('segBar'); $('segTitle').textContent = T(isBd ? 'seg.titleBd' : 'seg.title');
  if(!cyc){ [...bar.children].forEach((el,i)=>{ el.style.flex=1; el.textContent=names[i]; el.title=''; }); return; }
  const vals = (isBd ? [cyc.tap, cyc.n, cyc.hold, cyc.db, 0] : [cyc.fHold, cyc.nGap, cyc.dHold, cyc.dfHold==null?0:cyc.dfHold, cyc.cancelGap==null?0:cyc.cancelGap]).map(v=>Math.max(0,v||0));
  const total = vals.reduce((s,v)=>s+v,0)||1;
  [...bar.children].forEach((el,i)=>{ if(!names[i]){ el.style.flex=0; el.textContent=''; el.title=''; return; } el.style.flex = Math.max(vals[i]/total, 0.04); el.textContent = vals[i] ? names[i]+' '+Math.round(vals[i]) : names[i]; el.title = names[i]+' '+Math.round(vals[i])+'ms'; });
}

