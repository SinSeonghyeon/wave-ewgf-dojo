/* ---------- 최속 제트어퍼 연습 (결정 35(tju), 2026-10-16 사용자 요청): Bryan's Jet Upper 6 N 4+RP alone, on a frame axis ----------
   16-tju.js reads the frames and judges every Jet Upper on its own (tjJu, 실측 F5); in this mode each try is drawn frame by frame —
   frame 1 = the 6 — and kept in its own session. The fastest input (6 1f · N 1f · 4 and RP on one frame: three frames) is the one the
   도발 제트어퍼 needs on 29~31f. Here every RP outside a taunt is a try: one that brought out no Jet Upper is a miss with its reason
   (juMiss). Practice only — no challenge, no board (사용자 결정 2026-10-16). */
const JU_AXIS = TJ.JU_F_MAX + TJ.JU_N_MAX + TJ.JU_B_EARLY + 1; // 15f: the slowest measured Jet Upper (6 5f · N 6f · the 4 3f before the RP) fits whole
const JU_FAST = 3;                                          // 6 · N · 4+RP: the fastest input takes three frames; the Jet Upper lands JU_F−1 later
const JU_BACK = 60;                                         // how far back a miss looks for its 6 (1s)
const JU_MASH_F = TJ.JU_F;                                  // an RP this soon after the last try's RP is pressed during its move: no new try (juMashed)
// fast = tries that were the fastest input (the streak counts them) · ju = Jet Uppers that came out, with their 6 · N · input frames summed
const juStats = () => ({tries:0, fast:0, ju:0, streak:0, best:0, sumF:0, sumN:0, sumIn:0, rows:[]});
// last: the last try (the axis keeps drawing it until the next one gets going) · shown: what the axis drew last (renderJuLive redraws on a change)
const jup = {last:null, session:juStats(), shown:null};
const juFrames = (a, b) => tjIn.hist.filter(x => x.slot>=a && x.slot<=b);
// A try: kind (tjJu's ju · slow · b2 · rp, or none) · s0 = the slot of its 6 (frame 1; a miss with no 6: its first input on the axis) · rp = the
// slot of the RP · input = frames from the 6 to the RP (null with no 6) · fF·nF·early = the 6, the N and the 4-before-the-RP in frames (null
// when there was none) · frames = the input frames read
function juRow(kind, fast, P, fr){
  const nS = P.nS, bS = P.bS, fF = (nS ?? bS ?? fr.slot) - P.fS;
  return {kind, fast, s0:P.fS, nS, bS, rp:fr.slot, input:fr.slot-P.fS+1, fF, nF:nS!=null ? (bS ?? fr.slot)-nS : null, early:bS!=null ? fr.slot-bS : null,
          frames:juFrames(P.fS, fr.slot)};
}
// tjFree asks before judging an RP: in this mode an RP during the last try's move is no try at all — a Jet Upper or a miss alike, the game
// would not bring it out either (other modes judge every RP as before)
const juMashed = fr => mode==='ju' && !!jup.last && fr.slot-jup.last.rp<JU_MASH_F;
function juAttempt(j, P, fr){ // tjJu: a Jet Upper on its own (or the b+2 / 2 that came out instead)
  if(mode!=='ju') return;
  juRecord(Object.assign(juRow(j.kind, j.fast, P, fr), {total:j.total ?? null}));
}
// An RP that brought out no Jet Upper. why: noSix (no 6 read since the last button) · btns (other buttons with the RP) · stale (6 N 4+RP in
// order, but a step held past TJ_STALE_F dropped the reading) · mixed (another direction after the 6: odd = those directions, drawn as arrows
// when shown so a side switch redraws them) · order (6, N and 4 out of order)
function juMiss(fr){
  if(mode!=='ju') return;
  let from = fr.slot - JU_BACK;
  for(const x of tjIn.hist) if(x.slot<fr.slot && x.btns.length) from = Math.max(from, x.slot+1); // a try starts after the last button
  const six = tjIn.hist.filter(x => x.slot>=from && x.slot<fr.slot && x.changed && x.dir==='f').pop();
  let why, odd = [];
  if(!six) why = 'noSix';
  else if(fr.btns.some(n => n!==2)) why = 'btns';
  else {
    const P = {fS:null, nS:null, bS:null, at:0}, after = juFrames(six.slot, fr.slot);
    for(const x of after) tjTrack(P, x);                    // the same reading with no time limit: a Jet Upper then means one step was held too long
    odd = [...new Set(after.filter(x => x.changed && !['f','n','b'].includes(x.dir)).map(x => x.dir))];
    // only a full 6 N 4+RP is "in order but too slow"; a slow b+2 (no N) or 2 (RP first) is out of order like a quick one
    why = tjMoveOf(P, fr, null).key==='ju' ? 'stale' : odd.length ? 'mixed' : 'order';
  }
  const s0 = six ? six.slot : (juFrames(Math.max(from, fr.slot-JU_AXIS+1), fr.slot)[0] || fr).slot;
  const row = Object.assign(juRow('none', false, {fS:s0, nS:null, bS:null}, fr), {fF:null, why, odd, extra:fr.btns.filter(n => n!==2).map(n => TJ_BTN[n]).join('+')});
  if(!six) row.input = null;
  juRecord(row);
  showResult('miss', 'MISS', ['ju.r.none'], juWhy(row));
  setCoach(juFix(row));
  addLog(fr.t, 'log.tJu', ['ju.res.none'], juWhy(row), '', 'no');
  renderSeg(TJ_SEG_IDLE);
  fx.jab();
}
function juRecord(row){
  const st = jup.session; st.tries++;
  if(row.fast){ st.fast++; st.streak++; st.best = Math.max(st.best, st.streak); } else st.streak = 0;
  if(row.kind==='ju'){ st.ju++; st.sumF += row.fF; st.sumN += row.nF; st.sumIn += row.input; }
  st.rows.unshift(row); if(st.rows.length>TJ_ROWS) st.rows.pop();
  jup.last = row;
}
function juReset(){ Object.assign(jup, {last:null, session:juStats(), shown:null}); renderJu(); } // session reset (설정의 세션 초기화)
// A miss in a few words (the result card, the log, the axis) and what to fix first, as [key, ...args]: a miss names why nothing came out,
// a Jet Upper the frame to cut (tjJuFix, the coach sentence)
const juWhyArg = r => r.why==='mixed' ? r.odd.map(glyphFor).join(' ') : r.why==='btns' ? r.extra : r.input;
const juWhy = r => ['ju.sub.'+r.why, juWhyArg(r)];
const juFix = r => r.kind!=='none' ? tjJuFix(r) : ['ju.c.'+r.why, juWhyArg(r)];
// The reading in progress once it has a second input frame (a 6 alone — walking forward — leaves the last try up), else the last try
function juView(){
  const P = tjIn.p;
  if(!tjp.run && P.fS!=null){ const frames = juFrames(P.fS, Infinity); if(frames.length>1) return {live:true, s0:P.fS, frames}; }
  return jup.last;
}
const juShownKey = v => v && v.live ? v.s0+':'+v.frames.length : v;
function renderJuLive(now){
  if(mode!=='ju') return;
  if(juShownKey(juView())!==jup.shown){ renderJu(); return; } // the reading started or dropped (a 6 held too long) since the last draw
  const P = tjIn.p, f = !tjp.run && P.fS!=null ? frameSlot(now)-P.fS+1 : null, r = jup.last;
  const text = f!=null ? T('ju.liveRun', f, JU_FAST) : r && r.input!=null ? T('ju.liveDone', r.input) : T('ju.liveReady', glyphFor('f'), glyphFor('b'), JU_FAST);
  const el = $('juLive'); if(el.textContent!==text) el.textContent = text;
  el.dataset.frame = f==null ? '' : String(f);
  for(const c of $('juAxis').querySelectorAll('.wsc-cell')) c.classList.toggle('current', f!=null && Math.min(f, JU_AXIS)===Number(c.dataset.frame));
}
/* ---------- timeline: one try, frame 1 = the 6 ----------
   Row 1: how long the 6, the N and a 4 before the RP were held, as the arrow and its frames (green = one frame, the fastest) · row 2: the
   frames with the inputs read in them, the fastest recipe faint in 1~3f (→ · ★ · ←+RP) · row 3: the input from the 6 to the RP (green =
   three frames) and what came out. An input past 15f is drawn in the last cell with its frame number. */
function renderJu(){
  if(mode!=='ju') return;
  const g = d => glyphFor(d), st = jup.session, v = juView(), r = jup.last, done = !!v && !v.live;
  jup.shown = juShownKey(v);
  $('juCommand').textContent = T('ju.command', g('f'), g('n'), g('b'));
  $('juGuide').textContent = T('ju.guide', TJ.JU_F, JU_FAST, JU_FAST+TJ.JU_F-1, TJ_SIX, TJ_GO, JU_AXIS);
  const rel = x => x.slot - v.s0 + 1, at = f => Math.min(f, JU_AXIS), rpAt = done ? v.rp - v.s0 + 1 : null; // rpAt: the RP's frame
  const cells = [];
  for(let f=1; f<=JU_AXIS; f++){
    const here = v ? v.frames.filter(x => at(rel(x))===f) : [];
    const marks = here.map(x => tjMark(x, g) + (rel(x)>JU_AXIS ? ' '+rel(x)+'f' : ''));
    const tgt = f===1 ? g('f') : f===2 ? g('n') : f===JU_FAST ? g('b')+'+RP' : '';
    const cls = (f<=JU_FAST ? ' go' : '') + (marks.length ? ' mark' : '') + (done && f===at(rpAt) ? ' rp '+(v.fast ? 'ok' : 'no') : '') + (done && f>rpAt ? ' after' : '');
    cells.push('<div class="wsc-cell'+cls+'" data-frame="'+f+'"><b>'+escapeHTML(marks.join('\n'))+'</b><em>'+escapeHTML(tgt)+'</em><i>'+f+'f</i></div>');
  }
  const band = (cls, a, b, row, text) => a>JU_AXIS || b<a ? '' : '<u class="ju-band '+cls+'" style="grid-row:'+row+';grid-column:'+a+'/'+(at(b)+1)+'">'+escapeHTML(text)+'</u>';
  let bars = '';
  if(done){
    if(v.fF!=null){ // the steps of a Jet Upper (or the b+2 / 2 that came out): the 6, the N, and a 4 pressed before the RP
      const n = v.nS!=null ? v.nS-v.s0+1 : null, b = v.bS!=null ? v.bS-v.s0+1 : null;
      bars += band(v.fF===1 ? 'ok' : 'no', 1, (n ?? b ?? rpAt)-1, 1, g('f')+' '+v.fF+'f');  // a glyph and a number: it fits a one-frame cell in every language
      if(n!=null) bars += band(v.nF===1 ? 'ok' : 'no', n, (b ?? rpAt)-1, 1, g('n')+' '+v.nF+'f');
      if(b!=null && v.early>0) bars += band('no', b, rpAt-1, 1, g('b')+' '+v.early+'f');
    }
    bars += v.kind==='none' ? band('in lbl', 1, JU_AXIS, 3, T(...juWhy(v)))  // a miss: why nothing came out
      : band('in '+(v.fast ? 'ok' : 'no'), 1, rpAt, 3, '') + band('in lbl', 1, JU_AXIS, 3, T('ju.barIn', v.input)+' · '+T('ju.bar.'+v.kind, TJ.JU_F, v.total));
  }
  $('juAxis').style.setProperty('grid-template-columns', 'repeat('+JU_AXIS+',minmax(0,1fr))'); // frame f is grid column f
  $('juAxis').innerHTML = bars + cells.join('');
  $('juLegend').textContent = T('ju.legend', JU_FAST);
  renderJuLive(performance.now());
  $('juResult').textContent = r ? (r.kind==='none' ? T('ju.res.none') : T('tj.res.'+r.kind+(r.fast ? 'Fast' : ''))) : T('ju.ready');
  const tile = (key, text, ok, target) => '<div class="'+(text==null ? '' : ok ? 'ok' : 'no')+'">'+escapeHTML(T(key))+'<b>'+escapeHTML(text==null ? '—' : text)+'</b>'+escapeHTML(target)+'</div>';
  const has = !!r && r.kind!=='none';
  $('juAB').innerHTML =
    tile('jf.fLabel', has ? r.fF+'f' : null, has && r.fF===1, T('jf.oneTarget'))
  + tile('jf.nLabel', has ? (r.nF!=null ? r.nF+'f' : T('ju.nNone')) : null, has && r.nF===1, T('jf.oneTarget'))
  + tile('tj.rpLabel', has ? juRp(r) : null, has && r.early===0, T('tj.rpTarget'))
  + tile('ju.inLabel', r && r.input!=null ? r.input+'f' : null, !!r && r.fast, T('ju.inTarget', JU_FAST, JU_FAST+TJ.JU_F-1));
  $('juDetail').textContent = r ? T(...juFix(r)) : '';
  const values = [['wsc.tries',st.tries],['ju.fastCount',st.fast],['ju.rate',st.tries ? Math.round(st.fast/st.tries*100)+'%' : '—'],['ju.juCount',st.ju],['wsc.streak',st.streak],['wsc.best',st.best]];
  $('juStats').innerHTML = values.map(kv => '<div><b>'+kv[1]+'</b>'+escapeHTML(T(kv[0]))+'</div>').join('');
  const avg = sum => st.ju ? (sum/st.ju).toFixed(1)+'f' : '—';
  $('juCounts').textContent = T('ju.avg', avg(st.sumF), avg(st.sumN), avg(st.sumIn));
  $('juRows').innerHTML = st.rows.map(x => '<tr><td>'+escapeHTML(x.kind==='none' ? T('ju.res.none') : T('tj.res.'+x.kind+(x.fast ? 'Fast' : '')))+'</td><td>'
    +escapeHTML(x.fF==null ? '—' : x.fF+'f / '+(x.nF==null ? '—' : x.nF+'f'))+'</td><td>'+escapeHTML(x.kind==='none' ? '—' : juRp(x))+'</td><td>'+(x.input==null ? '—' : x.input+'f')+'</td></tr>').join('');
  $('juNote').textContent = T('ju.note', TJ.JU_F, TJ.JU_F_MAX, TJ.JU_N_MAX, TJ.JU_B_EARLY, JU_AXIS, TJ_STALE_F, TJ_SIX, TJ_GO);
}
const juRp = r => r.early==null ? T('ju.rpFirst') : r.early ? T('tj.bEarlyShort', r.early) : T('jf.same'); // the 4 against the RP
