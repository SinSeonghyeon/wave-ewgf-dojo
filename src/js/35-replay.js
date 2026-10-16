/* ---------- 다시보기 (결정 39(replay)): record a challenge run's inputs, play them back in an isolated copy of the app ----------
   Recording (the live page): from the 시작 press to the end of a 도전 모드 run, every direction and button that reaches the judging engine
   (onDir / buttonIn — a button is the chord already built, 결정 35(button-chord)) is kept with its time, plus GO and any frame tick that had
   already run past an input's own time before the input was read. The verdicts depend on nothing else (onDir and buttonIn tick at the input
   time), so the same entries in the same order give the same run. rush30 adds the seed of its dummy order and one hit bit per strike, because
   whether a strike reaches the dummy hangs on screen positions, the screen width and the refresh rate, not on the inputs.
   Playback (REPLAY: this page in an <iframe> with ?replay=1): the page boots with saving, the backend, BGM, notices, rewards and live input
   off, takes the replay from its parent and feeds the entries to the engine at their recorded times, moved by whole 60Hz frames so every
   slot relation (결정 2(ewgf-judge)) stays. The parent page owns the dialog: ▶ on a board row fetches /replay and mounts the frame. */
const REC_DIRS = ['n','f','b','d','u','df','db','uf','ub'];        // direction codes 0..8; a button is 16 + its attack bits (LP 1 · RP 2 · LK 4 · RK 8)
const REC_TICK = 32, REC_START = 33, REC_GO = 34;
const REC_MAX = 8000, REPLAY_MAX = 60000;                           // entries per run · JSON characters (the worker's REPLAY_EVENTS / REPLAY_MAX)
const REPLAY_LEAD = 45;                                             // frames between loading a replay and its first entry
const recorder = {run:null, frameT:-Infinity}; // run: the run being recorded {board, k0, last, ev, tickT, init, seed, hits, full} · frameT: the latest
                                              // frame-loop tick (frame() → replayFrame), so an input read after it can carry it along
const recCode = b => 16 + chordButtons(b).reduce((m, n) => m | 1 << (n-1), 0);
const recButton = c => { const ns = [1,2,3,4].filter(n => (c-16) & 1 << (n-1)); return ns.length===1 ? ns[0] : ns.join('+'); }; // the value buttonChord builds
function recBegin(t){ // 시작 pressed in a 도전 모드 run: the held direction is the only state a 3-second countdown does not wash out
  recorder.run = null;
  if(REPLAY || !CHALLENGE_MODES.includes(mode)) return;
  recorder.run = {board:mode, k0:Math.floor(t/FRAME), last:0, ev:[], tickT:-Infinity, init:Math.max(0,REC_DIRS.indexOf(heldDir))*9 + Math.max(0,REC_DIRS.indexOf(prevDir)), seed:null, hits:'', full:false};
  recPush(REC_START, t);
}
function recPush(code, t){
  const rec = recorder.run;
  if(!rec || rec.full) return;
  if(rec.ev.length >= REC_MAX*2){ rec.full = true; return; } // an endless run keeps its score, not a replay
  // µs after a frame boundary (integer steps, no drift), kept ≥1µs inside the 60Hz slot the live run judged (결정 2(ewgf-judge)): a time on or
  // within rounding of a slot edge (a 0.1ms browser clock lands on one every 50ms) would otherwise fall into the next slot on another grid
  const s = frameSlot(t) - rec.k0, lo = Math.ceil((s-0.5)*FRAME*1000)+1, hi = Math.floor((s+0.5)*FRAME*1000)-1;
  const rel = Math.min(hi, Math.max(lo, Math.round((t - rec.k0*FRAME)*1000)));
  rec.ev.push(rel - rec.last, code); rec.last = rel;
}
function recInput(code, t){
  const rec = recorder.run, f = recorder.frameT;
  if(!rec) return;
  if(f > t && f > rec.tickT){ rec.tickT = f; recPush(REC_TICK, f); } // that tick saw a later clock than this input
  recPush(code, t);
}
const recDir = (dir, t) => recInput(REC_DIRS.indexOf(dir), t);
const recBtn = (b, t) => recInput(recCode(b), t);
function recGo(t){ recPush(REC_GO, t); }
function recSeed(seed){ if(recorder.run) recorder.run.seed = seed; }
function recHit(hit){ if(recorder.run) recorder.run.hits += hit ? '1' : '0'; }
function recDrop(){ recorder.run = null; }
function recFinish(){ // the finished run as a replay, or null (nothing recorded, too long, or another mode)
  const r = recorder.run; recorder.run = null;
  if(!r || r.full || r.board!==mode) return null;
  const out = {v:1, board:r.board, char:charId(), moves:{...store.moves[charId()]}, win:store.window, init:r.init, ev:r.ev};
  if(r.seed!=null) out.seed = r.seed;
  if(r.board==='rush30') out.hits = r.hits;
  return JSON.stringify(out).length <= REPLAY_MAX ? out : null;
}

/* playback (REPLAY only) */
const player = {run:null}; // REPLAY: the run being played {data, at[] ms after the base, codes[], i, base, hits, hit, ended}
function replayCheck(d){ // the shape the worker stores (cleanReplay); anything else is refused before it touches the engine
  if(!d || d.v!==1 || !CHALLENGE_MODES.includes(d.board) || !Array.isArray(d.ev) || d.ev.length<2 || d.ev.length%2) return null;
  for(let i=0;i<d.ev.length;i+=2) if(!Number.isInteger(d.ev[i]) || !Number.isInteger(d.ev[i+1])) return null;
  return d;
}
function replayLoad(data){
  const d = replayCheck(data); if(!d){ replayPost({type:'mishima-replay-error'}); return; }
  const c = CHAR_IDS.includes(d.char) ? d.char : CHAR_DEFAULT;
  if(c!==charId()){ store.char = c; renderCharUI(); renderMoveSel(); if(!charCap('wave')) coachForChar(); } // save() is off in this window
  store.moves[c] = {...movesDefault()[c], ...(d.moves||{})};                                                // 결정 32(move-toggle) as the player had it
  if(WINDOWS.includes(d.win)) store.window = d.win;
  if(!modeAvail(d.board)){ replayPost({type:'mishima-replay-error'}); return; }
  setMode(d.board);
  let rel = 0; const at = [], codes = [];
  for(let i=0;i<d.ev.length;i+=2){ rel += d.ev[i]; at.push(rel/1000); codes.push(d.ev[i+1]); }
  const run = player.run = {data:d, at, codes, i:0, base:(Math.ceil(performance.now()/FRAME) + REPLAY_LEAD)*FRAME, hits:String(d.hits||''), hit:0, ended:false};
  const init = Number.isInteger(d.init) ? d.init : 0;
  heldDir = curDir = REC_DIRS[Math.floor(init/9)] || 'n'; prevDir = REC_DIRS[init%9] || 'n'; heldDirT = run.base + at[0];
  if(snd.ok && !snd.unlocked){ snd.unlocked = true; Object.keys(SND).filter(name => name!=='bgm').forEach(sfxPool); } // effects only: no BGM, no daily gift here
}
function replayStep(code, t){
  if(code===REC_START){ startTrial(); return; }  // the 3·2·1 countdown; its GO comes from the recording
  if(code===REC_GO){ trialGo(t); return; }
  if(code===REC_TICK){ tick(t); trialTick(t); return; }
  if(code < REC_DIRS.length){ const d = REC_DIRS[code]; curDir = d; onDir(d, t); return; }
  if(code > 16 && code < 32) buttonIn(recButton(code), t);
}
// frame() calls this first: the live page notes the tick time for the recorder, the replay window plays every entry that is due by now
function replayFrame(now){
  if(!REPLAY){ recorder.frameT = now; return; }
  const r = player.run; if(!r) return;
  while(r.i < r.codes.length && r.base + r.at[r.i] <= now){ const i = r.i++; replayStep(r.codes[i], r.base + r.at[i]); }
}
function replayHit(move){ // rush30: the recorded hit bit decides the strike; a hit knocks the dummy wherever it stands on this screen
  const r = player.run, hit = !!r && r.hits[r.hit++]==='1';
  if(hit){
    if(world.dummy.type && world.dummy.respawn) rushSpawn(); // live, the next dummy had come before this hit; a late frame here has not spawned it yet
    tryHit(move, 0, true);
  }
  return hit;
}
function replayEnded(){ // REPLAY: the trial finished; the parent compares the result with the board row
  const r = player.run;
  if(!r || r.ended) return;
  r.ended = true;
  const e = boardEntry(trial.result, mode);
  replayPost({type:'mishima-replay-end', score:e ? e.score : null, tie:e ? e.tie : null, label:trial.result ? recText(mode, trial.result.rec).label : ''});
}
function replayPost(m){ try{ if(window.parent && window.parent!==window) window.parent.postMessage(m, replayOrigin()); }catch(e){} }
const replayOrigin = () => typeof location!=='undefined' && location.origin && location.origin!=='null' ? location.origin : '*';
function replayBoot(){ // REPLAY: strip the page to the stage, then ask the parent for the run
  if(document.body) document.body.classList.add('replay-view');
  $('stageBox').dataset.badge = T('replay.badge');
  addEventListener('message', ev => {
    if(ev.source!==window.parent || ev.origin!==location.origin) return; // only this site's own page may feed the run (another site could frame ?replay=1)
    const m = ev.data || {};
    if(m.type==='mishima-replay' && !player.run) replayLoad(m.data);
  });
  replayPost({type:'mishima-replay-ready'});
}

/* the dialog on the live page */
const replayView = {seq:0, row:null, board:'', data:null, frame:null, msg:''};
function renderReplay(){
  const v = replayView;
  $('replayWho').textContent = v.row ? T('replay.who', v.row.rank, v.row.nick, T('mode.'+v.board+'.name'), boardRowText(v.board, v.row).label) : '';
  $('replayMsg').textContent = msg(v.msg);
  $('replayRestart').disabled = !v.data;
}
function replaySetMsg(m){ replayView.msg = m; renderReplay(); }
async function replayOpen(row, boardId){
  if(!BOARD_URL || !row || !row.replay) return;
  const d = $('replayDlg'), v = replayView, seq = ++v.seq;
  donateNudgeDefer(); endTrial(true); resetInput(); // a modal never lets a trial run blind
  v.row = row; v.board = boardId; v.data = null; replayUnmount(); replaySetMsg(['replay.loading']);
  if(!d.open && typeof d.showModal==='function') d.showModal(); jackpotPause();
  try{
    const res = await boardFetch('/replay?id='+row.id);
    if(seq!==v.seq || !d.open) return;
    v.data = res.replay; replayMount();
  }catch(err){ if(seq===v.seq) replaySetMsg([err.message==='replay' ? 'replay.gone' : 'replay.loadFail']); }
}
function replayMount(){ // a fresh copy of the app for every play: no state survives from the last one
  replayUnmount();
  const f = document.createElement('iframe');
  f.title = T('replay.title'); f.setAttribute('allow', 'autoplay');
  f.src = location.pathname + '?replay=1';
  $('replayFrame').appendChild(f); replayView.frame = f; replaySetMsg(['replay.playing']);
}
function replayUnmount(){ const f = replayView.frame; replayView.frame = null; if(f && f.remove) f.remove(); $('replayFrame').innerHTML = ''; }
addEventListener('message', ev => {
  const v = replayView, f = v.frame;
  if(REPLAY || !f || ev.source!==f.contentWindow) return;
  const m = ev.data || {};
  if(m.type==='mishima-replay-ready') f.contentWindow.postMessage({type:'mishima-replay', data:v.data}, replayOrigin());
  else if(m.type==='mishima-replay-error') replaySetMsg(['replay.loadFail']);
  else if(m.type==='mishima-replay-end'){
    const same = Number.isFinite(m.score) && Math.abs(m.score - v.row.score) < 1e-6 && Math.abs((m.tie||0) - (v.row.tie||0)) < 1e-6;
    replaySetMsg(same ? ['replay.done', String(m.label)] : ['replay.mismatch', boardRowText(v.board, v.row).label]);
  }
});
$('replayRestart').addEventListener('click', () => { if(replayView.data) replayMount(); });
$('replayClose').addEventListener('click', () => $('replayDlg').close());
$('replayDlg').addEventListener('close', () => { ++replayView.seq; replayUnmount(); replayView.data = null; setTimeout(renderRewards, 0); });
