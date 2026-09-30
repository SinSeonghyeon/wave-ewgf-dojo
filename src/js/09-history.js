/* ---------- history strip ---------- */
const GLYPH = {n:'★',f:'→',b:'←',d:'↓',u:'↑',df:'↘',db:'↙',uf:'↗',ub:'↖'};
const glyphFor = d => { // convert to facing-aware arrow for display
  if(store.side===1) return GLYPH[d];
  return {n:'★',f:'←',b:'→',d:'↓',u:'↑',df:'↙',db:'↘',uf:'↖',ub:'↗'}[d];
};
let historyStopT=-Infinity, historyPaintT=0, historyMarkup=null;
function pushHistory(ev){
  historyStopT=-Infinity;
  // Device timestamps can arrive out of order across keyboard, touch and pad.
  // Keep only the display ledger chronological; judgment still uses arrival order.
  let at=history.length;
  while(at>0 && history[at-1].t>ev.t) at--;
  ev.gap = Math.max(0,ev.t-(at>0 ? history[at-1].t : lastInputT));
  const following=history[at];
  lastInputT=Math.max(lastInputT,ev.t);
  history.splice(at,0,ev);
  let groups=0, slot=null;
  for(let i=history.length-1;i>=0;i--){
    const current=frameSlot(history[i].t);
    if(current!==slot){ slot=current; groups++; }
    if(groups>40){ history.splice(0,i+1); break; }
  }
  // An already expired sample must not rewrite the oldest retained row's gap.
  if(following && history.includes(ev)) following.gap=following.t-ev.t;
  renderHistory();
}
function historyRows(now=performance.now()){
  let nextT=null;
  const groups=[];
  for(const ev of history){
    const slot=frameSlot(ev.t);
    let group=groups[groups.length-1];
    if(!group || group.slot!==slot){ group={slot,first:ev,dir:null,buttons:new Set()}; groups.push(group); }
    if(ev.dir){ group.firstDir ??= ev; group.dir=ev; }
    if(ev.btn) group.buttons.add(ev.btn);
  }
  return groups.reverse().map(group => {
    const ev=group.dir, buttons=[...group.buttons].sort();
    const end=ev ? ev.endT ?? (nextT ?? (historyStopT>=ev.t ? historyStopT : now)) : null;
    const duration=ev ? end-ev.t : group.first.gap;
    if(ev) nextT=group.firstDir.t;
    return {label:[...(ev?[glyphFor(ev.dir)]:[]),...buttons].join('+'), cls:ev ? ev.dir==='n'?'n':'dir' : 'b'+buttons[0],
      frames:!ev&&duration>2000 ? '–' : Math.max(0,Math.round(duration/FRAME))+'f', title:T(ev?'inputs.hold':'inputs.gap')};
  });
}
function renderHistory(now=performance.now()){
  const rows=historyRows(now), box=$('inputs');
  const markup=rows.length ? rows.map((row,i)=>`<div class="chip${i===0?' new':''}" title="${escapeHTML(row.title)}"><div class="g ${row.cls}">${row.label}</div><div class="f">${row.frames}</div></div>`).join('') : `<div class="input-empty">${escapeHTML(T('inputs.empty'))}</div>`;
  if(markup!==historyMarkup){ box.innerHTML=markup; historyMarkup=markup; }
}

