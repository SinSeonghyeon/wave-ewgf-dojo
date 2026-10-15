/* ---------- 도발 제트어퍼 연습 모드 (결정 37(tju)): 10회 도전, 프레임 타임라인, 평가 패널 ----------
   16-tju.js judges every taunt in every mode; this file shows the judged taunts in the tju mode and runs its local 10-try challenge. */
const TJ_CHALLENGE = 10;                                   // 로컬 10회 도전, 완주만 tju 보드에 등록 (결정 26(wsc-board)과 같은 규칙)
const TJ_DUMMY_PX = 52;                                    // 도발 연습의 더미는 무릎이 닿는 거리에 선다 (연출)
// The axis keeps TJ_CELLS cells: 1f, 2f up to TJ_FROM−1 in one cell, one cell per frame from TJ_FROM to TJ_TO (two frames past the
// cancel window), then the ignored rest up to 77f in one — so the cancel side gets the width (사용자 요청 2026-10-15)
const TJ_CELLS = 25, TJ_TO = TJ.CANCEL_F + 2, TJ_FROM = TJ_TO - (TJ_CELLS - 3) + 1; // 13f ~ 34f

// 10회 도전 (결정 37(tju)): every taunt with a verdict is a try (tjCount). Leaving the mode, a modal, blur or a new start cancels it (resetInput).
function tjStartChallenge(){
  if(mode!=='tju' || modalOpen() || jackpotBusy) return;
  donateNudgeDefer();
  const cancel = ['countdown','running'].includes(tjp.challenge.status);
  resetInput();
  tjp.challenge = cancel ? {status:'cancelled', stats:null} : {status:'countdown', startAt:performance.now()+3000, remaining:3, stats:tjStats()};
  renderTj(); renderRewards(); renderTrialRank();
}
function tjChallengeCancel(){
  if(!['countdown','running'].includes(tjp.challenge.status)) return;
  tjp.challenge = {status:'cancelled', stats:null};
  $('hudCenter').textContent=''; $('hudScore').textContent='';
  if(mode==='tju') renderTj();
}
function tjChallengeTick(now){
  const c = tjp.challenge;
  if(c.status!=='countdown') return;
  if(now<c.startAt){ const left = Math.min(3, Math.ceil((c.startAt-now)/1000)); if(left!==c.remaining){ c.remaining = left; renderTjChallenge(); } return; }
  c.status = 'running'; renderTj();
}
function renderTjChallenge(){
  if(mode!=='tju') return;
  const c = tjp.challenge, busy = c.status==='countdown' || c.status==='running', st = c.stats, b = $('tjChallengeBtn');
  b.textContent = T(busy ? 'wsc.cancelShort' : 'wsc.startShort', TJ_CHALLENGE);
  b.title = T(busy ? 'wsc.challengeCancel' : 'wsc.challengeStart', TJ_CHALLENGE); b.setAttribute('aria-label', b.title);
  $('tjChallengeStatus').textContent = c.status==='countdown' ? T('wsc.countdown', c.remaining)
    : c.status==='running' ? T('wsc.challengeProgress', st.tries, TJ_CHALLENGE, st.hits)
    : c.status==='done' ? T('wsc.challengeDone', st.hits, TJ_CHALLENGE, Math.round(st.hits/TJ_CHALLENGE*100), st.best)
    : T(c.status==='cancelled' ? 'wsc.challengeCancelled' : 'tj.challengeHint', TJ_CHALLENGE);
  $('hudCenter').textContent = c.status==='countdown' ? String(c.remaining) : '';
  $('hudScore').textContent  = c.status==='running' ? st.tries+' / '+TJ_CHALLENGE : '';
}
/* ---------- timeline: one taunt, frame 1 = the press ----------
   Row 1: where an input cancels (1~32f) and where it is ignored (33~77f) · row 2: the frames with the inputs read in them, the knee
   (28f), the TJU recipe (29f 6 · 30f N · 31f 4+RP) and the last combo frame (44f) · row 3: the +16 the knee gives (29~44f) ·
   row 4: the follow-up actually pressed — its command and its startup up to the frame it lands, green when it lands by 44f.
   The cancel window gets the width: the ignored frames keep two cells, the rest is one narrow cell where 44f is a tick at its place. */
function tjSegments(){ // a..b = the frames of a cell, span = a collapsed cell, w = the column's share of the width (fr)
  const out = [{a:1, b:1, w:1}, {a:2, b:TJ_FROM-1, span:'startup', w:1.4}];
  for(let f=TJ_FROM; f<=TJ_TO; f++) out.push({a:f, b:f, w:1});
  out.push({a:TJ_TO+1, b:TJ.END_F, span:'tail', w:2});
  return out;
}
const tjMark = (fr, glyph) => [fr.changed ? glyph(fr.dir) : '', fr.taunt ? '1+3+4' : fr.btns.map(n => TJ_BTN[n]).join('+')].filter(Boolean).join(fr.taunt ? '\n' : '+');
function tjTarget(f, glyph){ // the TJU recipe drawn faintly in its frames
  if(f===TJ.KNEE_F) return T('tj.tKnee');
  if(f===TJ_SIX) return glyph('f');
  if(f===TJ_SIX+1) return '★';
  if(f===TJ_GO) return glyph('b')+'+RP';
  if(f===TJ_LAST) return T('tj.tHit');
  return '';
}
function tjLiveFrame(now){ const r = tjp.run; return r ? frameSlot(now) - r.s0 + 1 : null; }
function renderTjLive(now){
  if(mode!=='tju') return;
  const r = tjp.run, f = tjLiveFrame(now);
  const text = !r ? T(tjp.view ? 'tj.liveDone' : 'tj.liveReady')
    : r.phase==='follow' ? T('tj.liveFollow', r.cancel)
    : f<TJ.KNEE_F ? T('tj.liveCount', f, TJ.KNEE_F-f)
    : f===TJ.KNEE_F ? T('tj.liveKnee')
    : f<=TJ.CANCEL_F ? T('tj.liveCancel', f, TJ_SIX)
    : T('tj.liveLock', Math.min(f, TJ.END_F), TJ.END_F);
  const el = $('tjLive'); if(el.textContent!==text) el.textContent = text;
  el.dataset.frame = f==null ? '' : String(f);
  const cur = r && r.phase!=='follow' ? Math.min(f, TJ.END_F) : null;
  for(const c of $('tjAxis').querySelectorAll('.wsc-cell')){ // a collapsed span is current for every frame it covers; its fill sweeps through it
    const a = Number(c.dataset.frame), b = Number(c.dataset.to||a), on = cur!=null && cur>=a && cur<=b;
    c.classList.toggle('current', on);
    if(b>a){
      c.style.setProperty('--p', (cur==null || cur<a ? 0 : cur>b ? 1 : (cur-a+1)/(b-a+1)).toFixed(3));
      const i = c.querySelector('i'), label = on ? cur+'f' : c.dataset.label;
      if(i && i.textContent!==label) i.textContent = label;
    }
  }
}
// The bands under and over the cells (<u class="tj-band"> grid items). A band that starts or ends inside a collapsed cell is cut where its
// frame falls there — each frame an equal share of the cell — so the +16 and a Jet Upper landing on 44f stop at the 44f tick, not at 77f.
// A follow-up's bar is short, so its label is a second item that runs on past the bar into the empty part of its row
// (lbl 'r': on to the end of the axis · 'l': back to its start).
function tjBands(segs){
  const segOf = f => { const i = segs.findIndex(sg => f>=sg.a && f<=sg.b); return i<0 ? segs.length-1 : i; };
  const widthOf = (p, q) => segs.slice(p, q+1).reduce((s, sg) => s+sg.w, 0);      // columns p..q, in fr
  // the margin that leaves `frames` frames of the collapsed cell sg uncovered on one side of an item laid over columns p..q
  const trim = (side, sg, frames, p, q) => {
    if(!sg.span || frames<=0) return '';
    const share = frames/(sg.b-sg.a+1) * sg.w / widthOf(p, q);
    return ';margin-'+side+':'+(share*100).toFixed(2)+'%';
  };
  const item = (cls, row, p, q, margins, text) => '<u class="tj-band '+cls+'" style="grid-row:'+row+';grid-column:'+(p+1)+'/'+(q+2)+margins+'">'+text+'</u>';
  return function band(key, cls, a, b, row, args, lbl){ // frames a..b on grid row `row`, text T(key, ...args)
    const i = segOf(a), j = segOf(b), first = segs[i], last = segs[j], end = segs.length-1, text = escapeHTML(T(key, ...(args||[])));
    const before = a-first.a, after = last.b-b;                                   // frames of the end cells outside a..b
    const bar = item(cls, row, i, j, trim('left', first, before, i, j)+trim('right', last, after, i, j), lbl ? '' : text);
    if(!lbl) return bar;
    return bar + (lbl==='r' ? item(cls+' lbl', row, i, end, trim('left', first, before, i, end), text)
                            : item(cls+' lbl l', row, 0, j, trim('right', last, after, 0, j), text));
  };
}
function renderTj(){
  if(mode!=='tju') return;
  const glyph = d => glyphFor(d), st = tjp.session, view = tjp.view;
  $('tjCommand').textContent = T('tj.command', glyph('f'), glyph('b'), TJ_GO);
  $('tjGuide').textContent = T('tj.guide', TJ.KNEE_F, TJ.CANCEL_F, TJ.END_F, TJ.ADV, TJ_LAST, TJ.JU_F, TJ_GO);
  const segs = tjSegments(), frames = view ? view.frames : [];
  const cells = segs.map(sg => {
    const here = frames.filter(x => x.f>=sg.a && x.f<=sg.b);
    const last = TJ_LAST>=sg.a && TJ_LAST<=sg.b, count = sg.b-sg.a+1; // 44f: its own cell, or a tick where it falls in a collapsed one
    const marks = here.map(x => tjMark(x, glyph) + (sg.span ? ' '+x.f+'f' : '')), tgt = sg.span ? (last ? T('tj.tHit')+' '+TJ_LAST+'f' : '') : tjTarget(sg.a, glyph);
    const ign = here.length && here.every(x => x.ign);
    const cls = (sg.a===1 ? ' t1' : '') + (sg.a===TJ.KNEE_F ? ' knee'+(view && view.knee ? ' on' : '') : '') + (sg.a>=TJ_SIX && sg.a<=TJ_GO ? ' go' : '')
      + (last ? ' last' : '') + (sg.a>TJ.CANCEL_F ? ' late' : '') + (sg.span ? ' span' : '') + (marks.length ? ' mark' : '') + (ign ? ' ign' : '');
    const label = sg.span ? T(sg.span==='tail' ? 'tj.spanTail' : 'tj.spanStartup', sg.a, sg.b) : sg.a+'f';
    const style = sg.span ? ' style="--n:'+count+(last ? ';--hit:'+((TJ_LAST-sg.a)/count).toFixed(4) : '')+'"' : '';
    return '<div class="wsc-cell'+cls+'" data-frame="'+sg.a+'" data-to="'+sg.b+'" data-label="'+escapeHTML(label)+'"'+style+'><b>'+escapeHTML(marks.join('\n'))+'</b>'
      +(tgt ? '<em>'+escapeHTML(tgt)+'</em>' : '')+'<i>'+escapeHTML(label)+'</i></div>';
  });
  $('tjAxis').style.setProperty('grid-template-columns', segs.map(sg => 'minmax(0,'+sg.w+'fr)').join(' '));
  const band = tjBands(segs);
  let bars = band('tj.bandCancel','cancel',1,TJ.CANCEL_F,1,[TJ.CANCEL_F]) + band('tj.bandIgnore','ignore',TJ.CANCEL_F+1,TJ.END_F,1,[TJ.CANCEL_F+1, TJ.END_F])
    + band('tj.bandAdv','adv',TJ.KNEE_F+1,TJ_LAST,3,[TJ.ADV, TJ.KNEE_F+1, TJ_LAST]);
  const m = view && view.move;
  if(m){ // the follow-up actually pressed: command (the 6 N in front of a Jet Upper) and startup up to the frame it lands
    const ok = !!view.knee && m.hit!=null && m.hit<=TJ_LAST;
    if(m.key==='ju' && m.fF!=null){ const a = tjSixAt(m); if(a<m.f) bars += band('tj.barCmd','cmd',a,m.f-1,4,[m.f-a],'l'); }
    if(m.hit!=null) bars += band('tj.barSu', 'su '+(ok ? 'ok' : 'no'), m.f, m.hit, 4, [tjLabel(m.key), m.su, m.hit], 'r');
    else bars += band('tj.barUnknown', 'su no', m.f, m.f, 4, [tjLabel(m.key)], 'r');
  }
  $('tjAxis').innerHTML = bars + cells.join('');
  $('tjLegend').textContent = T('tj.legend', TJ.KNEE_F, TJ_SIX, TJ_SIX+1, TJ_GO, TJ_LAST);
  renderTjLive(performance.now());
  const r = tjp.last;
  $('tjResult').textContent = r ? T('tj.res.'+r.kind) + (r.double!=null ? ' · '+T('tj.m.double', r.double) : '') : T('tj.ready');
  const tile = (key, text, ok, target) => '<div class="'+(text==null ? '' : ok ? 'ok' : 'no')+'">'+escapeHTML(T(key))+'<b>'+escapeHTML(text==null ? '—' : text)+'</b>'+escapeHTML(target)+'</div>';
  const rm = r && r.move, ju = rm && rm.key==='ju';
  $('tjAB').innerHTML =
    tile('tj.cancelLabel', r ? (r.cancel!=null ? r.cancel+'f' : r.ignored!=null ? T('tj.ignoredShort', r.ignored) : T('tj.noCancel')) : null, !!r && r.cancel===TJ_SIX, T('tj.cancelTarget', TJ_SIX))
  + tile('tj.kneeLabel', r ? T(r.knee ? 'tj.kneeHit' : 'tj.kneeNo') : null, !!r && r.knee, T('tj.kneeTarget', TJ.KNEE_F))
  + tile('tj.fnLabel', ju ? rm.fF+'f · '+rm.nF+'f' : null, ju && rm.fF===1 && rm.nF===1, T('tj.fnTarget'))
  + tile('tj.rpLabel', ju ? (rm.early ? T('tj.bEarlyShort', rm.early) : T('jf.same')) : null, ju && rm.early===0, T('tj.rpTarget'))
  + tile('tj.moveLabel', rm ? tjLabel(rm.key)+' '+rm.f+'f' : null, !!r && r.ok, T('tj.moveTarget', glyph('b'), TJ_GO))
  + tile('tj.hitLabel', rm && rm.hit!=null ? rm.hit+'f' : null, !!rm && !!r.knee && rm.hit!=null && rm.hit<=TJ_LAST, T('tj.hitTarget', TJ_LAST));
  $('tjDetail').textContent = r ? T(...tjFix(r)) : '';
  const j = tjp.ju;
  $('tjJu').textContent = j ? T('tj.juLine', T('tj.res.'+j.kind+(j.fast ? 'Fast' : '')), j.fF, j.nF ?? '—', j.early ?? '—', j.total ?? '—') : T('tj.juReady', glyph('f'), glyph('b'));
  renderTjChallenge();
  const values = [['wsc.tries',st.tries],['wsc.hits',st.hits],['wsc.rate',st.tries ? Math.round(st.hits/st.tries*100)+'%' : '—'],[['tj.sixCount',TJ_SIX],st.six],['wsc.streak',st.streak],['wsc.best',st.best]];
  $('tjStats').innerHTML = values.map(kv => '<div><b>'+kv[1]+'</b>'+escapeHTML(Array.isArray(kv[0]) ? T.apply(null, kv[0]) : T(kv[0]))+'</div>').join('');
  $('tjCounts').textContent = T('tj.counts', st.knee, st.juTries, st.juFast);
  $('tjRows').innerHTML = st.rows.map(x => '<tr><td>'+escapeHTML(T('tj.res.'+x.kind))+'</td><td>'+escapeHTML(x.cancel!=null ? x.cancel+'f' : '—')+'</td><td>'
    +escapeHTML(x.move ? tjLabel(x.move.key)+(x.move.hit!=null ? ' → '+x.move.hit+'f' : '') : '—')+'</td><td>'+escapeHTML(T(...tjFix(x, true)))+'</td></tr>').join('');
  $('tjNote').textContent = T('tj.note', TJ.KNEE_F, TJ.CANCEL_F, TJ.END_F, TJ.LOSS, TJ.ADV, TJ_LAST, TJ.JU_F, TJ.JU_F_MAX, TJ.JU_N_MAX, TJ.JU_B_EARLY);
}
$('tjChallengeBtn').addEventListener('click', tjStartChallenge);
