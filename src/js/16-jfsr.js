/* ---------- just-frame character move: 초스카이 (결정 33(jfsr), 결정 34(char-select)) ----------
   6N3 + RK with the d/f and the button on one 60Hz frame (결정 2(ewgf-judge) grid). The 6N3 is staged by the shared
   무족 path (mistDir / mistButton → mistFinish → jfStaged); every other button read of a non-legacy character comes
   here through commandButton (jfButton) and resolvePending (jfPending). Its numbers never touch the EWGF
   statistics (session.tries/hits, combo, ewgf20): the attempts live in jfp and store.life.jfsr only.
   What the game shows instead of a 초스카이 is the diagnosis (wavu / namu): via2 = the normal Sky Rocket (the 2 was
   pressed), late / df4 = 3RK, d4 = 2RK, early = RK before the 3. The practice tool accepts the 6N3 inside a wave even
   though the game does not (사용자 결정 2026-10-11). */
const JF_CHALLENGE = 10;                                   // 로컬 10회 도전, 완주만 jfsr 보드에 등록 (결정 26(wsc-board)과 같은 규칙)
const jfStats = () => ({tries:0, hits:0, fastest:0, streak:0, best:0, rows:[]});
const jfp = {last:null, session:jfStats(), challenge:{status:'idle', stats:null}, streak:0, streakT:-1e9};
const JF_KIND = {ok:'LETHAL SKY ROCKET', via2:'SKY ROCKET'}; // the card's small heading; every miss reads MISS
function jfStaged(off, t, input){ // a staged 6N3 got its button (mistFinish)
  const frameOff = frameSlot(t) - frameSlot(t-off);
  const kind = input.fFrames<1 || input.nFrames<1 ? 'stage' : frameOff===0 ? 'ok' : frameOff>0 ? 'late' : 'early';
  jfAttempt(kind, t, Object.assign({frameOff}, input));
}
function jfButton(n, t){ // every other button of a non-legacy character
  const r = charOf().jf; if(!r || n!==r.btn || !moveOn(r.move)) return;
  if(cd.state===4 || cd.state===7 || (cd.state===5 && t-cd.lastDF<=250)){ jfAttempt('via2', t); return; } // crouch dash + 4 = the normal Sky Rocket
  if(cd.state===3){ if(!cd.pending) cd.pending = {t, btn:n}; return; }                                      // 2 still held: the d/f decides (jfPending)
  if(heldDir==='df') jfAttempt('df4', t);                                                                    // 3+4 with no 6N in front: 3RK
}
function jfPending(p, tDF){ jfAttempt(tDF!=null && frameSlot(p.t)>=frameSlot(tDF) ? 'via2' : 'd4', p.t); } // 4 with the 3 = Sky Rocket, 4 with the 2 = 2RK
function jfRecord(st, row){
  st.tries++;
  if(row.ok){ st.hits++; st.streak++; st.best = Math.max(st.best, st.streak); if(row.fastest) st.fastest++; } else st.streak = 0;
  st.rows.unshift(row); if(st.rows.length>12) st.rows.pop();
}
function jfAttempt(kind, t, input){
  wscOtherMove();
  const ok = kind==='ok', fastest = ok && input.fFrames===1 && input.nFrames===1;
  jfp.streak = ok ? (t-jfp.streakT>3000 ? 1 : jfp.streak+1) : 0; jfp.streakT = t;
  const row = {kind, ok, fastest, f:input?input.fFrames:null, n:input?input.nFrames:null, rp:input?input.frameOff:null};
  jfRecord(jfp.session, row);
  const c = jfp.challenge;
  if(c.status==='running'){ jfRecord(c.stats, row); if(c.stats.tries>=JF_CHALLENGE) completeChallenge(c, JF_CHALLENGE); } // the only result that reaches the jfsr board
  if(ok){ store.life.jfsr++; saveSoon(); }
  const frames = input ? ['jf.frames', row.f, row.n, row.rp] : '';
  showResult(ok ? 'ewgf' : kind==='via2' ? 'wgf' : 'miss', JF_KIND[kind] || 'MISS', [ok ? (fastest ? 'jf.fastest' : 'jf.title') : 'jf.'+kind+'.title'], input ? frames : ['jf.'+kind+'.sub']);
  setCoach(ok ? (fastest ? ['jf.coachFastest'] : ['jf.improve', row.f-1, row.n-1]) : kind==='late' || kind==='early' ? ['jf.'+kind+'.coach', Math.abs(row.rp)] : ['jf.'+kind+'.coach']);
  addLog(t, 'log.tJf', [ok ? (fastest ? 'jf.fastest' : 'jf.title') : 'res.jf.'+kind], frames, '', ok ? 'ok' : kind==='via2' ? 'wg' : 'no');
  if(input) renderSeg({mist:true, jf:true, f:row.f, n:row.n, rp:row.rp});
  if(ok) fx.sky(true, jfp.streak); else if(kind==='via2') fx.sky(false); else fx.jab();
  jfp.last = row; renderJf();
  if(c.status==='done') renderRewards(); // rewardBlocked() held the chest during the challenge
  endCommand(); updateHud();
}
// 10회 도전 (결정 33(jfsr)): every judged 4 is a try. Leaving the mode, a modal, blur or a new start cancels it (resetInput).
function jfStartChallenge(){
  if(mode!=='jfsr' || modalOpen() || jackpotBusy) return;
  donateNudgeDefer();
  const cancel = ['countdown','running'].includes(jfp.challenge.status);
  resetInput();
  jfp.challenge = cancel ? {status:'cancelled', stats:null} : {status:'countdown', startAt:performance.now()+3000, remaining:3, stats:jfStats()};
  renderJf(); renderRewards(); renderTrialRank();
}
function jfChallengeCancel(){
  if(!['countdown','running'].includes(jfp.challenge.status)) return;
  jfp.challenge = {status:'cancelled', stats:null};
  $('hudCenter').textContent=''; $('hudScore').textContent='';
  if(mode==='jfsr') renderJf();
}
function jfTick(t){
  const c = jfp.challenge;
  if(c.status!=='countdown') return;
  if(t<c.startAt){ const left = Math.min(3, Math.ceil((c.startAt-t)/1000)); if(left!==c.remaining){ c.remaining = left; renderJfChallenge(); } return; }
  c.status = 'running'; renderJf();
}
function renderJfChallenge(){
  if(mode!=='jfsr') return;
  const c = jfp.challenge, busy = c.status==='countdown' || c.status==='running', st = c.stats, b = $('jfChallengeBtn');
  b.textContent = T(busy ? 'wsc.cancelShort' : 'wsc.startShort', JF_CHALLENGE);
  b.title = T(busy ? 'wsc.challengeCancel' : 'wsc.challengeStart', JF_CHALLENGE); b.setAttribute('aria-label', b.title);
  $('jfChallengeStatus').textContent = c.status==='countdown' ? T('wsc.countdown', c.remaining)
    : c.status==='running' ? T('wsc.challengeProgress', st.tries, JF_CHALLENGE, st.hits)
    : c.status==='done' ? T('wsc.challengeDone', st.hits, JF_CHALLENGE, Math.round(st.hits/JF_CHALLENGE*100), st.best)
    : T(c.status==='cancelled' ? 'wsc.challengeCancelled' : 'jf.challengeHint', JF_CHALLENGE);
  $('hudCenter').textContent = c.status==='countdown' ? String(c.remaining) : '';
  $('hudScore').textContent  = c.status==='running' ? st.tries+' / '+JF_CHALLENGE : '';
}
const jfOff = v => v==null ? '—' : v===0 ? T('jf.same') : (v>0?'+':'')+v+'f';
const jfWhy = row => T(row.ok ? (row.fastest ? 'jf.fastest' : 'jf.title') : 'res.jf.'+row.kind);
function renderJf(){
  if(mode!=='jfsr') return;
  const glyph = d => glyphFor(d), st = jfp.session, r = jfp.last;
  $('jfCommand').textContent = '6 N '+glyph('df')+'+RK';
  $('jfGuide').textContent = T('jf.guide');
  $('jfResult').textContent = r ? jfWhy(r) : T('jf.ready');
  const cell = (key, text, ok, target) => '<div class="'+(text==null?'':ok?'ok':'no')+'">'+escapeHTML(T(key))+'<b>'+escapeHTML(text==null?'—':text)+'</b>'+escapeHTML(target)+'</div>';
  $('jfAB').innerHTML =
    cell('jf.fLabel', r&&r.f!=null ? r.f+'f' : null, !!r && r.f===1, T('jf.oneTarget'))
  + cell('jf.nLabel', r&&r.n!=null ? r.n+'f' : null, !!r && r.n===1, T('jf.oneTarget'))
  + cell('jf.rkLabel', r&&r.rp!=null ? jfOff(r.rp) : null, !!r && r.rp===0, T('jf.rkTarget'))
  + cell('jf.resultLabel', r ? T(r.ok ? 'wsc.ok' : 'wsc.fail') : null, !!r && r.ok, T(r && r.fastest ? 'jf.fastestShort' : 'jf.resultTarget'));
  $('jfDetail').textContent = r && !r.ok ? T('jf.'+r.kind+'.sub') : '';
  renderJfChallenge();
  const values = [['wsc.tries',st.tries],['wsc.hits',st.hits],['wsc.rate',st.tries?Math.round(st.hits/st.tries*100)+'%':'—'],['jf.fastestCount',st.fastest],['wsc.streak',st.streak],['wsc.best',st.best]];
  $('jfStats').innerHTML = values.map(kv => '<div><b>'+kv[1]+'</b>'+escapeHTML(T(kv[0]))+'</div>').join('');
  $('jfRows').innerHTML = st.rows.map(x => '<tr><td>'+escapeHTML(T(x.ok?'wsc.ok':'wsc.fail'))+'</td><td>'+escapeHTML(x.f==null?'—':x.f+'f / '+x.n+'f')+'</td><td>'+escapeHTML(jfOff(x.rp))+'</td><td>'+escapeHTML(jfWhy(x))+'</td></tr>').join('');
}
$('jfChallengeBtn').addEventListener('click', jfStartChallenge);
