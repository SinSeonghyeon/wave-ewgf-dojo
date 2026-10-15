/* ---------- 도발 제트어퍼 판정 (결정 37(tju), 결정 34(char-select)) ----------
   The taunt (1+3+4 on one frame, or the 1+3+4 key) and the Jet Upper 6 N 4+RP, judged on the 결정 2(ewgf-judge) 60Hz grid
   against the measured TJ model (00-core.js, 근거 .agents/docs/TJU.md). Frame 1 = the frame the taunt was pressed.
   Inputs are first gathered per frame — the direction held at the end of the frame and the buttons pressed in it — because the
   game reads one direction a frame: a 6 → N → 4 inside one frame never had its N. A complete frame then drives
   · the taunt: its knee lands on 28f; the first input up to 32f cancels it (up to 28f: before the knee comes out), inputs from
     33f to 77f are ignored. A second 1+3+4 up to 28f is a double taunt and keeps the first press's frames (measured)
   · the follow-up: its startup (TJ.STARTUP) counts from the frame of its button; it combos when it lands by TJ_LAST (44f)
   · the Jet Upper: 6 → N → 4+RP. With no N it is b+2, an RP before the 4 is 2, a 4 up to 3f before the RP delays it.
   Nothing here touches the EWGF statistics: the attempts live in tjp and store.life.tju only.
   This file judges in every mode; the tju practice mode (10-try challenge, frame timeline, panel) is 17-tju-practice.js, the
   최속 제트어퍼 practice mode (the Jet Upper alone on a frame axis) is 17-ju-practice.js and the taunt pose is drawn by 33-fighter.js (TJ_POSE). */
const TJ_STALE_F = 12;                                     // a 6 N 4 that stops moving this long is dropped (the measured windows are 5·6·3f)
const TJ_SPLIT_F = 3;                                      // 1·3·4 spread over up to this many frames is reported as a taunt that did not come out
const TJ_MARKS = 48;                                       // input frames one taunt keeps for its timeline (each a direction change or a button)
const TJ_ROWS = 12;                                        // the recent-taunts table
const TJ_HIST = 48;                                        // input frames kept outside a taunt (tjIn.hist): the 최속 제트어퍼 timeline draws its try from them
const TJ_STREAK_MS = 5000;                                 // successes further apart than this start the on-stage streak over
const TJ_BTN = ['','LP','RP','LK','RK'];
// six = taunts cancelled on TJ_SIX (29f), the Jet Upper's 6
const tjStats = () => ({tries:0, hits:0, knee:0, six:0, streak:0, best:0, juTries:0, juFast:0, rows:[]});
// run: the taunt in progress · view: the last taunt (the timeline keeps drawing it) · last: its graded row · ju: the last standalone Jet Upper
const tjp = {run:null, view:null, last:null, ju:null, session:tjStats(), challenge:{status:'idle', stats:null}, streak:0, streakT:-1e9};
// The per-frame reader: open = the frame still collecting, read = the last frame read, dir = the direction at the end of it.
// p = the 6 N 4 reading outside a taunt (a taunt keeps its own, run.p): fS·nS·bS = the slots of the 6, the N after it and the first 4
// after them, at = the slot of its last step. recent = the frames of a 1·3·4 spread over frames (tjSplit). hist = the input frames read
// outside a taunt, newest last (a taunt starts it over).
const tjIn = {open:null, read:-1e9, dir:'n', p:{fS:null, nS:null, bS:null, at:0}, recent:[], hist:[]};
const tjClearReading = P => Object.assign(P, {fS:null, nS:null, bS:null});
const tjOn = () => !!charOf().tj && moveOn(charOf().tj.move);
const tjBusy = () => !!tjp.run && tjp.run.cancel==null;    // still in the taunt (not cancelled): no walking, the pose plays on
function tjLocked(t){ // 33f~77f of a taunt nobody cancelled: every input is ignored (실측 F13)
  const r = tjp.run; if(!r || r.cancel!=null) return false;
  const f = frameSlot(t) - r.s0 + 1;
  return f>TJ.CANCEL_F && f<=TJ.END_F;
}
function tjButton(n, t){ if(tjOn()) for(const b of chordButtons(n)) tjEvent({t, btn:b}); }   // every button of a character with a taunt (commandButton); a chord '1+3+4' (결정 35(button-chord)) adds each of its buttons to the frame
// onDir hands over every direction, a countdown included, like the input history: the reader's last direction (tjIn.dir) has to
// follow the stick. Returns true when the taunt swallows the direction (no walking, no backdash).
function tjDir(dir, t){
  if(!tjOn()) return false;
  tjEvent({t, dir});
  return tjLocked(t);
}
function tjTick(now){
  if(tjOn()) tjAdvance(frameSlot(now)-2);                  // frames before the previous one are over: one frame of grace for an input delivered after the frame it belongs to
  const r = tjp.run, kneeSlot = r ? r.s0+TJ.KNEE_F-1 : 0;   // the knee is drawn on 28f itself, not when 28f is read (the judging still waits for it)
  if(r && r.phase==='pre' && !r.kneeFx && frameSlot(now)>=kneeSlot && !(tjIn.open && tjIn.open.slot<=kneeSlot)) tjKneeFx(r);
}
function tjClear(){ // resetInput: a mode change, a modal, blur or a challenge start ends the taunt and the reading
  tjp.run = null; tjIn.open = null; tjIn.read = -1e9; tjIn.dir = 'n'; tjIn.recent = []; tjIn.hist = [];
  tjClearReading(tjIn.p);
  if(['taunt','ju','bknee'].includes(anim.kind)) anim.kind = 'idle';
  if(mode==='tju') renderTj(); else if(mode==='ju') renderJu();
}
function tjReset(){ Object.assign(tjp, {run:null, view:null, last:null, ju:null, session:tjStats(), streak:0}); renderTj(); } // session reset (설정의 세션 초기화)
// 결정 2(ewgf-judge)의 60Hz 칸 하나 = 게임의 한 프레임. 칸이 끝나야 그 프레임의 방향(마지막 방향)과 버튼이 정해진다.
function tjEvent(ev){
  let s = frameSlot(ev.t);
  tjAdvance(s-1);
  const o = tjIn.open;
  if(o && s<o.slot) s = o.slot;                            // out of order across devices: joins the frame still open
  if(s<=tjIn.read) s = tjIn.read+1;                        // a frame already read is never rewritten
  if(!o || o.slot!==s) tjIn.open = {slot:s, t:ev.t, dir:null, btns:new Set()};
  if(ev.dir) tjIn.open.dir = ev.dir; else tjIn.open.btns.add(ev.btn);
}
function tjAdvance(upTo){ // every frame up to upTo is over: read the open one, then let time run
  const o = tjIn.open;
  if(o && o.slot<=upTo){ tjIn.open = null; tjTime(o.slot-1); tjRead(o); }
  tjTime(upTo);
}
// Frames up to slot passed with no further input. Every step only moves forward, so a slot already passed changes nothing: the reader
// keeps no clock of its own, and an input replayed with a past timestamp (the smoke tests) still lands on its own frame.
function tjTime(slot){
  const r = tjp.run;
  if(r){
    const f = slot - r.s0 + 1;
    if(r.phase==='pre' && f>=TJ.KNEE_F && !r.knee) tjKnee(r);   // 28f went by with no input: the knee landed
    if(r.phase==='pre' && f>TJ.CANCEL_F) r.phase = 'lock';
    if(r.phase==='lock' && f>TJ.END_F) tjEnd(r);
    else if(r.phase==='follow' && slot-tjWaitFrom(r)>=TJ.WAIT_F) tjVerdict(r, r.knee ? 'cancel' : 'early'); // cancelled, but no follow-up came
  }
  const P = tjIn.p;
  if(P.fS!=null && slot-P.at>TJ_STALE_F) tjClearReading(P);
}
// The follow-up deadline counts from the cancel, or from the last step of a 6 N 4 still being entered: a slow Jet Upper is judged
// (it lands late: guard), never dropped in silence — also when its 6 came after another first input (review 2026-10-15)
const tjWaitFrom = r => r.p.fS!=null ? Math.max(r.cancelSlot, r.p.at) : r.cancelSlot;
function tjRead(o){
  tjIn.read = o.slot;
  const dir = o.dir || tjIn.dir, btns = [...o.btns].sort((a,b)=>a-b);
  const fr = {slot:o.slot, t:o.t, dir, changed:dir!==tjIn.dir, btns, taunt:TJ_TAUNT.every(n => o.btns.has(n))};
  tjIn.dir = dir;
  if(!fr.changed && !btns.length) return;                  // 6 → N → 6 inside one frame left nothing behind
  const r = tjp.run;
  if(r){ fr.f = fr.slot - r.s0 + 1; r.frames.push(fr); if(r.frames.length>TJ_MARKS) r.frames.shift(); tjRun(r, fr); }
  else tjFree(fr);
  if(mode==='tju') renderTj(); else if(mode==='ju') renderJu();
}
// 6 N 4+RP reader, the same inside a taunt (run.p) and alone (tjIn.p): a 6 starts it, then the first N, then the first 4
function tjTrack(P, fr){
  if(!fr.changed) return;
  if(fr.dir==='f'){ tjClearReading(P); P.fS = fr.slot; }
  else if(fr.dir==='n'){ if(P.fS!=null && P.nS==null && P.bS==null) P.nS = fr.slot; else tjClearReading(P); }
  else if(fr.dir==='b'){ if(P.fS!=null && P.bS==null) P.bS = fr.slot; else tjClearReading(P); }
  else tjClearReading(P);
  P.at = fr.slot;
}
// The move a button frame brings out — a description only (fx.tjMove plays it). key = 1P direction + the buttons of that frame
// (the TJ.STARTUP keys), 'ju' for the Jet Upper · su = its startup · hit = the frame it lands (f + su − 1, null outside a taunt).
// A 6 N 4+RP attempt has ju = true and fF·nF = the frames the 6 and the N were held, early = the frames the 4 came before the RP,
// total = from the 6 to the hit · why = what came out instead (noN: b+2, F4·F16 · rpFirst: 2, F6) · out = past the measured windows (F5)
function tjMoveOf(P, fr, f){
  const mv = {f, key:(fr.dir==='n' ? '' : fr.dir+'+')+fr.btns.join('+')};
  const rpAlone = fr.btns.length===1 && fr.btns[0]===2;
  if(rpAlone && P.fS!=null && fr.dir==='b'){
    mv.ju = true;
    if(P.nS==null){ mv.key = 'b+2'; mv.why = 'noN'; mv.fF = (P.bS ?? fr.slot) - P.fS; }
    else {
      const bS = P.bS ?? fr.slot;
      Object.assign(mv, {key:'ju', fF:P.nS-P.fS, nF:bS-P.nS, early:fr.slot-bS});
      mv.out = mv.fF>TJ.JU_F_MAX || mv.nF>TJ.JU_N_MAX || mv.early>TJ.JU_B_EARLY;
      mv.total = mv.fF + mv.nF + mv.early + TJ.JU_F;      // from the 6 to the hit: 16f at best (발동 14 + 앞 1 + 중립 1)
    }
  } else if(rpAlone && P.fS!=null && P.nS!=null && P.bS==null && fr.dir==='n'){ mv.ju = true; mv.key = '2'; mv.why = 'rpFirst'; mv.fF = P.nS-P.fS; }
  mv.su = mv.key==='ju' ? TJ.JU_F : TJ.STARTUP[mv.key] ?? null;
  mv.hit = mv.su==null || f==null ? null : f + mv.su - 1;
  return mv;
}
function tjStart(fr){
  const r = {s0:fr.slot, t0:fr.t, phase:'pre', p:{fS:null, nS:null, bS:null, at:0}, frames:[{slot:fr.slot, f:1, dir:fr.dir, changed:false, btns:fr.btns, taunt:true}],
             double:null, cancel:null, cancelSlot:null, knee:false, ignored:null, move:null, verdict:null};
  tjp.run = tjp.view = r;
  tjClearReading(tjIn.p); tjIn.recent = []; tjIn.hist = [];
  fx.taunt(r.t0);
  if(mode==='tju') renderTj();
}
function tjRun(r, fr){
  const f = fr.f;
  if(r.phase==='follow'){ tjFollow(r, fr, f); return; }
  if(f>TJ.END_F){ r.frames.pop(); tjEnd(r); tjFree(fr); return; } // 78f: the taunt is over, this frame is free play
  // Not cancelled yet: the frame's own number decides, not how far tjTime already ran — an input delivered a few frames late
  // still cancels on its own frame (frames are read in order, so a frame up to 32f here means nothing was ignored yet).
  if(f>TJ.CANCEL_F){                                        // 33f~77f: ignored, the taunt plays on
    r.phase = 'lock'; if(!r.knee) tjKnee(r); fr.ign = true;
    if(r.ignored==null){ r.ignored = f; tjVerdict(r, 'late'); }
    return;
  }
  const dbl = fr.taunt && f<=TJ.KNEE_F;                    // 더블 도발: 첫 도발의 프레임을 그대로 쓴다 (실측 F9)
  if(dbl && r.double==null){ r.double = f; fx.taunt2(); }
  if(!fr.changed && !(fr.btns.length && !dbl)) return;
  r.knee = f>TJ.KNEE_F; if(r.knee) tjKneeFx(r);             // the first input cancels the taunt — up to 28f before the knee came out
  r.phase = 'follow'; r.cancel = f; r.cancelSlot = fr.slot;
  fx.tauntCut(r.knee);
  tjFollow(r, fr, f);
}
function tjFollow(r, fr, f){
  tjTrack(r.p, fr);
  if(!fr.btns.length) return;
  if(fr.taunt){ tjVerdict(r, r.knee ? 'cancel' : 'early', {again:true}); tjStart(fr); return; } // 맞히고 캔슬하고 다시 도발 (캔슬 연습)
  r.move = tjMoveOf(r.p, fr, f);
  tjVerdict(r, tjFollowKind(r.knee, r.move));
}
// What a follow-up makes of a taunt: nothing combos before the knee; after it a move landing by 44f combos — the Jet Upper's is the 도발 제트어퍼
const tjFollowKind = (knee, mv) => !knee ? 'early' : mv.su==null ? 'unknown' : mv.hit<=TJ_LAST ? (mv.key==='ju' ? 'tju' : 'combo') : 'guard';
function tjKnee(r){ r.knee = true; tjKneeFx(r); }
function tjKneeFx(r){ if(!r.kneeFx){ r.kneeFx = true; fx.knee(r.t0 + TJ_LAST*FRAME); } } // the bag reels until 44f: a follow-up landing by then launches it
function tjEnd(r){ if(tjp.run===r) tjp.run = null; if(!r.verdict) tjVerdict(r, 'none'); fx.tauntEnd(r.t0); if(mode==='tju') renderTj(); }
function tjFree(fr){ // outside a taunt: a new taunt, a 1·3·4 spread over frames, or a 6 N 4+RP on its own
  if(fr.taunt){ tjStart(fr); return; }
  const P = tjIn.p;
  tjIn.hist.push(fr); if(tjIn.hist.length>TJ_HIST) tjIn.hist.shift();
  tjTrack(P, fr);
  if(!fr.btns.length) return;
  const part = fr.btns.every(n => TJ_TAUNT.includes(n));
  tjIn.recent = part ? tjIn.recent.filter(x => fr.slot-x.slot<TJ_SPLIT_F).concat({slot:fr.slot, btns:fr.btns}) : [];
  if(part && new Set(tjIn.recent.flatMap(x => x.btns)).size===TJ_TAUNT.length){ const span = fr.slot - tjIn.recent[0].slot + 1; tjIn.recent = []; tjSplit(fr, span); }
  if(fr.btns.includes(2) && !juMashed(fr)){                 // juMashed: the 최속 제트어퍼 mode drops an RP pressed during its last try's move
    const mv = P.fS!=null ? tjMoveOf(P, fr, null) : null;
    if(mv && mv.ju) tjJu(mv, fr, P);
    else juMiss(fr);                                         // the 최속 제트어퍼 mode takes every other RP as a try (17-ju-practice.js)
  }
  tjClearReading(P);                                         // any button ends a 6 N 4 reading
}
function tjSplit(fr, span){ // not a try: the buttons never shared a frame, so the game shows no taunt either
  showResult('miss', 'MISS', ['tj.r.split'], ['tj.sub.split', span]);
  setCoach(['tj.c.split', span]);
  addLog(fr.t, 'log.tTj', ['tj.res.split'], ['tj.n.split', span], '', 'no');
}
// 단독 제트어퍼 (연습 1 · 최속 제트어퍼): judged on its own, never a challenge try. P = the 6 N 4 reading it came from (its slots)
function tjJu(mv, fr, P){
  const kind = mv.key==='ju' ? (mv.out ? 'slow' : 'ju') : mv.why==='noN' ? 'b2' : 'rp';
  const fast = kind==='ju' && mv.fF===1 && mv.nF===1 && mv.early===0;
  const st = tjp.session; st.juTries++; if(fast) st.juFast++;
  const ju = tjp.ju = Object.assign({kind, fast}, mv);
  const frames = mv.key==='ju' ? ['tj.n.ju', mv.fF, mv.nF, mv.early, mv.total] : ['tj.n.f', mv.fF];
  showResult(kind==='ju' ? (fast ? 'ewgf' : 'wave') : kind==='slow' ? 'wgf' : 'miss', kind==='ju' || kind==='slow' ? 'JET UPPER' : 'MISS', ['tj.j.'+kind+(fast ? 'Fast' : '')], frames);
  setCoach(tjJuFix(ju));
  addLog(fr.t, 'log.tJu', ['tj.res.'+kind+(fast ? 'Fast' : '')], frames, '', kind==='ju' ? 'ok' : kind==='slow' ? 'wg' : 'no');
  renderSeg({tj:true, c:null, f:ju.fF, n:ju.nF??null, rp:ju.early??null, hit:ju.total??null});
  fx.tjMove(mv.key, 'hit');                                // alone it is just the move: it hits whatever stands in range
  juAttempt(ju, P, fr);                                    // the 최속 제트어퍼 mode's try (its axis and session)
  if(mode==='tju') renderTj();
}
// What to fix in a Jet Upper on its own, as [key, ...args] (the coach sentence; the 최속 제트어퍼 panel reads it too)
const tjJuFix = j => j.kind==='ju' ? (j.fast ? ['tj.c.juFast', j.total] : ['tj.c.ju', j.fF-1, j.nF-1, j.early]) : ['tj.c.'+j.kind];
// One verdict per taunt. A cancelled taunt is over at its verdict; an ignored input leaves the taunt running to 77f (tjEnd).
function tjVerdict(r, kind, x){
  if(r.verdict) return;
  r.verdict = kind; if(x) Object.assign(r, x);
  if(r.phase!=='lock' && tjp.run===r) tjp.run = null;
  const row = tjRow(r);
  tjCount(row, r.t0);
  tjp.last = row;
  tjShow(row, r.t0);
  if(tjp.challenge.status==='done') renderRewards(); // rewardBlocked() held the chest during the challenge
  if(mode==='tju') renderTj();
}
// The graded row of a taunt — what the counters, the challenge, the panel and the result card read
const tjRow = r => ({kind:r.verdict, ok:r.verdict==='tju', cancel:r.cancel, knee:r.knee, double:r.double, ignored:r.ignored, again:!!r.again, move:r.move ? Object.assign({}, r.move) : null});
function tjCount(row, t0){ // the session, the challenge (its finished run is the only result that reaches the tju board), the lifetime count, the stage streak
  tjRecord(tjp.session, row);
  const c = tjp.challenge;
  if(c.status==='running'){ tjRecord(c.stats, row); if(c.stats.tries>=TJ_CHALLENGE) completeChallenge(c, TJ_CHALLENGE); }
  if(row.ok){ store.life.tju++; saveSoon(); }
  tjp.streak = row.ok ? (t0-tjp.streakT>TJ_STREAK_MS ? 1 : tjp.streak+1) : 0; if(row.ok) tjp.streakT = t0;
}
function tjRecord(st, row){
  st.tries++;
  if(row.ok){ st.hits++; st.streak++; st.best = Math.max(st.best, st.streak); } else st.streak = 0;
  if(row.knee) st.knee++;
  if(row.cancel===TJ_SIX) st.six++;
  st.rows.unshift(row); if(st.rows.length>TJ_ROWS) st.rows.pop();
}
const tjSixAt = m => m.f - m.fF - m.nF - m.early;          // the frame of the Jet Upper's 6
// What to fix first, as [key, ...args]: the frame of the 6, then the 6·N frames, then the 4 against the RP (영상 T12의 점검 순서).
// short = the few words of the recent-rows table, else the coach sentence.
function tjFix(row, short){
  const m = row.move, k = short ? 'tj.s.' : 'tj.c.';
  if(row.kind==='tju') return row.double!=null ? ['tj.m.double', row.double] : [k+'tju', tjp.streak];
  if(row.kind==='none') return [k+'none', TJ.CANCEL_F, TJ.LOSS];
  if(row.kind==='late') return [k+'ignored', row.ignored, TJ.CANCEL_F, TJ.END_F];
  if(!row.knee) return [k+'early', row.cancel, TJ.KNEE_F, TJ_SIX];
  if(row.kind==='cancel') return row.cancel===TJ_SIX ? [k+'cancelSix', TJ_SIX] : [k+'cancelLate', row.cancel, TJ_SIX];
  if(row.kind==='combo') return [k+'combo', tjLabel(m.key), TJ_LAST-m.hit];
  if(m && m.key==='ju'){
    if(tjSixAt(m)>TJ_SIX) return [k+'sixLate', tjSixAt(m), TJ_SIX];
    if(m.fF>1) return [k+'fLong', m.fF];
    if(m.nF>1) return [k+'nLong', m.nF];
    if(m.early>0) return [k+'bEarly', m.early];
    return [k+'late', m.hit-TJ_LAST];
  }
  if(m && m.why==='noN') return [k+'noN'];
  if(m && m.why==='rpFirst') return [k+'rpFirst'];
  if(m && m.su!=null) return [k+'window', tjLabel(m.key), m.su, TJ.KNEE_F+1, Math.min(TJ.CANCEL_F, TJ_LAST-m.su+1)]; // from the frame after the knee
  return [k+'unknown'];
}
const tjLabel = key => key==='ju' ? T('tj.ju') : key.split('+').map(p => /^\d$/.test(p) ? TJ_BTN[+p] : glyphFor(p)).join('+');
function tjFrames(row){ // the numbers line of the result card and the log
  const m = row.move;
  if(!m) return row.cancel!=null ? ['tj.n.cancel', row.cancel] : row.ignored!=null ? ['tj.n.ignored', row.ignored] : ['tj.n.none', TJ.END_F];
  return m.hit==null ? ['tj.n.moveNoSu', row.cancel, tjLabel(m.key), m.f] : ['tj.n.move', row.cancel, tjLabel(m.key), m.f, m.hit, TJ_LAST];
}
function tjShow(row, t0){
  const m = row.move, label = m ? tjLabel(m.key) : '', frames = tjFrames(row), k = row.kind;
  const card = {tju:['ewgf','TAUNT JET UPPER'], combo:['wave','COMBO'], guard:['wgf','GUARD'], cancel:[row.cancel===TJ_SIX ? 'wave' : 'wgf','CANCEL'],
                unknown:['wgf','FOLLOW-UP'], early:['miss','NO KNEE'], late:['miss','IGNORED'], none:['miss','NO CANCEL']}[k];
  const title = k==='tju' ? [row.double!=null ? 'tj.r.tjuDouble' : 'tj.r.tju'] : k==='combo' || k==='guard' || k==='unknown' ? ['tj.r.'+k, label]
    : k==='cancel' ? ['tj.r.cancel', row.cancel] : k==='early' ? ['tj.r.early', row.cancel] : k==='late' ? ['tj.r.late', row.ignored] : ['tj.r.none'];
  showResult(card[0], card[1], title, frames);
  setCoach(k==='tju' ? ['tj.c.tju', tjp.streak] : tjFix(row));
  addLog(t0, 'log.tTj', ['tj.res.'+k], frames, row.double!=null ? ['tj.m.double', row.double] : '', k==='tju' ? 'ok' : k==='combo' || k==='cancel' ? 'wg' : 'no');
  if(m && m.key==='ju') renderSeg({tj:true, c:row.cancel, f:m.fF, n:m.nF, rp:m.early, hit:m.hit});
  else renderSeg({tj:true, c:row.cancel, f:null, n:null, rp:null, hit:m ? m.hit : null});
  // only a combo reaches the bag; everything else is guarded on the frame it lands (after 44f, so never on the bag still reeling from the knee)
  if(m) fx.tjMove(m.key, k==='tju' ? 'win' : k==='combo' ? 'hit' : k==='unknown' ? 'whiff' : 'guard', tjp.streak, m.hit==null ? null : t0 + (m.hit-1)*FRAME);
}
