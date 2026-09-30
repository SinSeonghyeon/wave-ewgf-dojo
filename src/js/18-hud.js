/* ---------- result card / stats / hud / log ---------- */
function showResult(cls, kind, title, sub){
  ui.result = {cls, kind, title, sub};
  const c = $('resultCard'); c.className='result '+cls;
  $('rKind').textContent=msg(kind); $('rTitle').textContent=msg(title); $('rOff').textContent=msg(sub);
}
function updateStats(){
  $('stDps').textContent = session.bestDps.toFixed(1);
  $('stChain').textContent = session.bestChain;
  $('stDash').textContent = session.dashes;
  const {tries,hits} = session;
  $('stTry').textContent = tries;
  $('stRate').textContent = tries? Math.round(hits/tries*100)+'%':'–';
  $('stMean').textContent = session.offsetCount? fmtF(session.offsetSum/session.offsetCount):'–';
}
function updateHud(){
  const h = $('hudChain'), useBd = cd.chain===0 && bd.chain>0 && bdLoud(), n = useBd ? bd.chain : cd.chain; // the wave chain always wins the widget; backdash chain shows only while no wave is running
  $('hudChainN').textContent = n; $('hudChainL').textContent = useBd ? 'BACKDASH' : 'WAVE'; h.classList.toggle('hot', n>=3);
}
function addLog(t, type, res, num, memo, cls){
  if(mode==='wsc') return;
  session.log.unshift({time:new Date(), type, res, num, memo, cls:cls||''}); if(session.log.length>12) session.log.pop(); renderLog();
}
function renderLog(){
  const tb = $('logBody');
  if(!session.log.length){ tb.innerHTML='<tr><td colspan="5" style="color:var(--muted)">'+escapeHTML(T('log.empty'))+'</td></tr>'; return; }
  tb.innerHTML = session.log.map(r =>
    `<tr><td class="m">${r.time.toLocaleTimeString(LOCALE[store.lang],{hour12:false})}</td><td>${escapeHTML(T(r.type))}</td><td class="${r.cls}">${escapeHTML(msg(r.res))}</td><td class="m">${escapeHTML(msg(r.num))}</td><td style="color:var(--muted)">${escapeHTML(msg(r.memo))}</td></tr>`
  ).join('');
}

