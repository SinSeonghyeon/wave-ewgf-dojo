/* ---------- 백대시 10초 타임라인: one set (backdash out → 1 cancel → 4 N 4 → next backdash) drawn frame by frame ----------
   bdDir/bdOut/bdBreak hand it what they judged; it never changes judging (결정 17(backdash)). Shown in the bd10 mode, between trials and during them.
   Frame 0 is the backdash coming out (the second 4); the bar in each cell is how far the backdash has travelled by then (BD.CURVE). */
const BDP_AXIS = BD.RECOVER_F;                       // frames 0..RECOVER_F: an uncancelled backdash fits whole, and every set faster than that ends inside it
const bdpStats = () => ({sets:0, sum:0, best:0, sumH:0, sumHand:0, rows:[]});
const bdp = {run:null, last:null, row:null, session:bdpStats()}; // run: the set in progress {t0, events, h}; last: the one that ended (row = its grade, or fail = why it broke); row: the last graded set — a chain always ends with a break, and the tiles keep showing the set before it
const bdpCell = (r, t) => t<=r.t0 ? 0 : bdF(t-r.t0);   // the same frame count as the judged cancel frame h
const bdpView = () => bdp.run && bdp.run.events.length>1 ? bdp.run : (bdp.last || bdp.run);
function bdpStop(t0, t){ // a sidestep/crouch can stop even a released, provisionally full backdash
  if(mode!=='bd10') return;
  const r = [bdp.run, bdp.last].find(r => r && r.t0===t0);
  if(r){ r.stop = bdpCell(r, t); renderBdp(); }
}
function bdpClear(){ bdp.run = null; if(mode==='bd10') renderBdp(); }
function bdpReset(){ Object.assign(bdp, {run:null, last:null, row:null, session:bdpStats()}); renderBdp(); } // session reset: the panel's stats and last set go with the rest of the session
function bdpInput(dir, t){
  const r = bdp.run; if(!r || mode!=='bd10') return;
  r.events.push({dir, t}); if(r.events.length>40) r.events.shift();
  if(dir==='db' && r.h==null) r.h = bdpCell(r, t);
  renderBdp();
}
function bdpOut(t, row){ // a backdash came out: the set before it (if any) is complete, a new one starts at this frame 0
  if(mode!=='bd10') return;
  const r = bdp.run;
  if(r){ r.end = t; r.row = row; if(row){ bdpRecord(bdp.session, row); bdp.row = row; } bdp.last = r; }
  bdp.run = {t0:t, events:[{dir:'b', t}], h:null};
  renderBdp();
}
function bdpBreak(why){ // the chain broke before the next backdash: keep the set on the axis with the reason
  const r = bdp.run; if(!r || mode!=='bd10') return;
  r.fail = why; bdp.last = r; bdp.run = null; renderBdp();
}
function bdpRecord(st, row){
  st.sets++; st.sum += row.mps; st.best = Math.max(st.best, row.mps); st.sumH += row.h; st.sumHand += row.hand;
  st.rows.unshift(row); if(st.rows.length>12) st.rows.pop();
}
function renderBdpLive(now){
  if(mode!=='bd10') return;
  const r = bdp.run, f = r ? bdpCell(r, now) : null;
  const text = !r ? T(bdp.last ? 'bdp.liveDone' : 'bdp.liveReady')
    : r.h==null ? T(f>BD_LAST ? 'bdp.liveStill' : 'bdp.liveDash', f, bdDist(f).toFixed(2))
    : T('bdp.liveHand', f-r.h);
  const el = $('bdpLive'); if(el.textContent!==text) el.textContent = text;
  const liveAxis = r && bdpView()===r;
  for(const c of $('bdpAxis').querySelectorAll('.wsc-cell')) c.classList.toggle('current', !!liveAxis && Math.min(f, BDP_AXIS)===Number(c.dataset.frame));
}
function renderBdp(){
  if(mode!=='bd10') return;
  const g = d => glyphFor(d), st = bdp.session;
  // 진행 중인 세트를 따라가되, 1을 누르기 전에는 직전 세트를 그대로 둔다 (기원초 타임라인과 같은 규칙)
  const view = bdpView();
  $('bdpCommand').textContent = [g('b')+' N '+g('b'), g('db'), g('b')+' N '+g('b'), g('db'), '…'].join('  ·  '); // no arrow separators: they would read as directions
  $('bdpGuide').textContent = T('bdp.guide', BD.CANCEL_A, BD.CANCEL_B, BD.HAND_F, BD_LAST, BD.RECOVER_F, BD.DB_F, BD.TAP_F);
  // h can be past the axis (4 held up to LINK_MAX_F before the 1): the cells and strips clamp it like every other frame, or the grid would grow columns
  const h = view && view.h!=null ? Math.min(view.h, BDP_AXIS) : null, end = view && view.end!=null ? Math.min(bdpCell(view, view.end), BDP_AXIS) : null;
  const best = view && view.row ? view.row.best : bdBestH(BD.HAND_F); // the best cancel frame for this set's hand (the target hand until a set is graded)
  const cells = [];
  for(let f=0; f<=BDP_AXIS; f++){
    const ev = view ? view.events.filter(e => Math.min(bdpCell(view, e.t), BDP_AXIS)===f) : [];
    const marks = ev.map(e => g(e.dir));
    if(!view && f===0) marks.push(g('b'));
    const stop = view ? (view.h ?? view.stop) : null;
    const d = f===0 ? 0 : bdDist(stop!=null ? Math.min(f, stop) : f)/BD_FULL; // every crouch/sidestep freezes the distance, including one after release
    const cls = (f===0?' out':'') + (f>=BD.CANCEL_A && f<=BD.CANCEL_B?' win':'') + (f===best?' best':'') + (f>BD_LAST?' still':'')
      + (h!=null && f===h?' cut':'') + (h!=null && f>h?' hand':'') + (end!=null && f===end?' next':'') + (marks.length?' mark':'');
    cells.push('<div class="wsc-cell'+cls+'" data-frame="'+f+'" style="--d:'+d.toFixed(3)+'"><b>'+escapeHTML(marks.join('\n'))+'</b><i>'+f+'</i></div>');
  }
  const band = (key, cls, a, b) => '<u class="gp-band '+cls+'" style="grid-column:'+(a+1)+'/'+(b+2)+'">'+escapeHTML(T(key))+'</u>';
  $('bdpAxis').style.setProperty('grid-template-columns', 'repeat('+(BDP_AXIS+1)+',minmax(0,1fr))');
  // 손 입력 띠(축 아래): 이 세트의 1(↙) 홀드(1 → 다시 4)와 4 N 4(첫 4 → 다음 백대시)를 실제 칸 위치에 그리고 목표(BD.DB_F·TAP_F)와 비교해 색을 칠한다
  const span = (a, b, text, ok) => '<u class="gp-band span '+(ok?'ok':'no')+'" style="grid-column:'+(a+1)+'/'+(Math.max(a,b)+2)+'">'+escapeHTML(text)+'</u>';
  let spans = '';
  const cut = view && h!=null ? view.events.find(e => e.dir==='db') : null, roll = cut ? view.events.find(e => e.t>cut.t && e.dir==='b') : null;
  if(roll){
    const f4 = Math.min(bdpCell(view, roll.t), BDP_AXIS), db = view.row ? view.row.db : bdF(roll.t-cut.t);
    spans += span(h, f4-1, T('bdp.spanDb', g('db'), db), db<=BD.DB_F);
    if(end!=null){ const tap = view.row ? view.row.tap : bdF(view.end-roll.t); spans += span(f4, end, T('bdp.spanTap', tap), tap<=BD.TAP_F); }
  }
  $('bdpAxis').innerHTML = band('bdp.bandMove','move',1,BD.CANCEL_A-1) + band('bdp.bandCancel','fire',BD.CANCEL_A,BD.CANCEL_B)
    + band('bdp.bandTail','tail',BD.CANCEL_B+1,BD_LAST) + band('bdp.bandStill','buf',BD_LAST+1,BDP_AXIS) + cells.join('') + spans;
  $('bdpLegend').textContent = T('bdp.legend');
  renderBdpLive(performance.now());
  const last = bdp.last, row = bdp.row;
  $('bdpResult').textContent = last && last.fail ? T('bdp.broke', T('bd.f.'+last.fail+'.title')) : row ? T('bd.title', row.chain, T('bd.grade.'+row.g)) : T(bdp.run ? 'bdp.live' : 'bdp.ready');
  const tile = (key, text, ok, target) => '<div class="'+(text==null?'':ok?'ok':'no')+'">'+escapeHTML(T(key))+'<b>'+escapeHTML(text==null?'—':text)+'</b>'+escapeHTML(target)+'</div>';
  $('bdpAB').innerHTML =
    tile('bdp.cutLabel', row?row.h+'f':null, !!row && Math.abs(row.h-row.best)<=1, row ? T('bdp.cutTargetFor', row.best, row.hand) : T('bdp.cutTarget', BD.CANCEL_A, BD.CANCEL_B))
  + tile('bdp.handLabel', row?row.hand+'f':null, !!row && row.hand<=BD.HAND_F, T('bdp.handTarget', BD.HAND_F))
  + tile('bdp.dbLabel', row?row.db+'f':null, !!row && row.db<=BD.DB_F, T('bdp.dbTarget', BD.DB_F))
  + tile('bdp.tapLabel', row?row.tap+'f':null, !!row && row.tap<=BD.TAP_F, T('bdp.tapTarget', BD.TAP_F))
  + tile('bdp.distLabel', row?row.dist.toFixed(2)+' m':null, !!row && row.h>=BD.CANCEL_A, T('bdp.distTarget', BD_FULL.toFixed(2)))
  + tile('bdp.speedLabel', row?row.mps.toFixed(2)+' m/s':null, !!row && row.g==='top', row ? T('bdp.speedTargetFor', row.top.toFixed(2)) : T('bdp.speedTarget', BD_TIER_MPS[0].mps.toFixed(2)));
  $('bdpDetail').textContent = row ? T('bdp.formula', row.dist.toFixed(3), row.h, row.hand, row.mps.toFixed(2)) : '';
  const avg = (sum, digits) => st.sets ? (sum/st.sets).toFixed(digits) : '—';
  const values = [['bdp.sets',st.sets],['bdp.avgSpeed',avg(st.sum,2)],['bdp.bestSpeed',st.sets?st.best.toFixed(2):'—'],['bdp.avgCut',avg(st.sumH,1)],['bdp.avgHand',avg(st.sumHand,1)],['bdp.bestChain',session.bd.bestChain]];
  $('bdpStats').innerHTML = values.map(kv => '<div><b>'+kv[1]+'</b>'+escapeHTML(T(kv[0]))+'</div>').join('');
  $('bdpRows').innerHTML = st.rows.map(x => '<tr><td>'+escapeHTML(T('bd.grade.'+x.g))+'</td><td>'+x.h+'f</td><td>'+x.hand+'f</td><td>'+x.mps.toFixed(2)+'</td></tr>').join('');
  $('bdpNote').textContent = T('bdp.note', BD_FULL.toFixed(2), BD.CANCEL_A, BD.CANCEL_B, BD_TIER_MPS[0].mps.toFixed(2), BD_TIER_MPS[0].c);
}
