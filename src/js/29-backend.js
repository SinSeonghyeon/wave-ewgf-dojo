/* ---------- backend: local N-try challenges, rankings, nickname, visit counter, shoutbox (BOARD_URL lives in 26-backend-config.js) ---------- */
// CHALLENGES / BOARDS / challengeTarget live next to MODES in 20-trials.js.
function completeChallenge(c, target){ // a finished run is kept (until the next start) as the result the board submits
  c.status='done'; c.result={completed:true, window:store.window, rec:{hits:c.stats.hits, target, best:c.stats.best}};
  boardSubmit();
}
const board = { tab:'wave10', data:{}, msg:'', seq:0, rev:{}, loads:new Map(), deleting:false, submitting:false, loadAfterDelete:false, submitQueue:[] }; // queued writes own their result/payload/identity; changing the visible mode cannot replace them
const live = { visits:null, posts:null, postsMsg:'', postsLoading:false, posting:false, voting:false, replying:false, postsSeq:0, replyTo:0, replyText:'', visitsBusy:false, nickBusy:false, nickMsg:'', nickLater:false, nickLost:false }; // post mutations share one busy gate; postsSeq keeps an older list load from replacing a newer response
// nickLater: the gate offers "practise without ranking" after the server itself failed · nickLost: a 403 arrived while the result card was up
const TIERS = [1, 10, 20, 50, 70]; // upper bounds of "top N%" for grades SS S A B C (tier 0..4); anything above is D (tier 5). Titles: tier.N.title, comments: tier.N.<mode>
// Grade for the result banner. Tiny boards count as ten players so 1st of 1 lands on S (top 10%), not SS — and 1st of 1 is never "D" at top 100%.
function tierOf(rank, total){ const p = pctTop(rank, Math.max(total, 10)); const i = TIERS.findIndex(t => p<=t); return i<0 ? 5 : i; }
const pctTop = (rank, total) => Math.max(1, Math.ceil(rank / Math.max(1,total) * 100)); // "top N%" — 1st of 1 is top 100%
// Wave chart top band: the wave10 top-10% score (cut10 from /top or /submit), null until the board answers → WAVE_TOP_DEFAULT.
// The board never resets (2026-09-14). Keep the last cut until an initial/manual board load or a score mutation returns a newer one; no background D1 polling.
const WAVE_TOP_DEFAULT = 5;
const boardSet = (t, d) => { board.data[t] = d; };
const waveTop = () => { const d = board.data.wave10; return !!d && Number.isFinite(d.cut10) && d.cut10>0 ? d.cut10 : null; };
const waveTopText = cut => cut==null ? T('wave.topFixed') : T('wave.top', cut.toFixed(1));
const waveYMax = top => Math.max(8, Math.ceil(top)+1); // keep the band on the chart when the cut climbs past 8 dashes/s
const waveGrid = yMax => { const g = []; for(let v=2; v<=yMax; v+=2) g.push(v); return g; };
const KST_DAY = () => new Date(Date.now() + 9*3600e3).toISOString().slice(0,10); // same key as the worker's dayKey
function boardEntry(r, m){ // pure: finished trial result → submission payload (null in free practice / no result). Unit-tested.
  const n = challengeTarget(m);
  if(!r || !r.rec || !MODES[m] || (!MODES[m].start && !n)) return null;
  if(n && (!r.completed || r.rec.target!==n))return null;
  const rec = r.rec, e = {board:m, win:r.window, lang:store.lang};
  if(n){e.score=rec.hits;e.tie=rec.best;e.detail={hits:rec.hits,target:rec.target,best:rec.best};}
  else if(m==='wave10'){ e.score = +rec.score; e.tie = rec.chain||0; e.detail = {dashes:rec.dashes, chain:rec.chain||0}; }
  else if(m==='combo10'){ e.score = rec.score; e.tie = rec.dps||0; e.detail = {hits:rec.hits, target:rec.target, mean:rec.mean, dps:rec.dps||0}; }
  else if(m==='rush30'){ e.score = rec.score; e.tie = rec.kills||0; e.detail = {kills:rec.kills||0, whiffs:rec.whiffs||0, dashPts:rec.dashPts||0}; }
  else if(m==='bd10'){ e.score = +rec.score; e.tie = rec.top||0; e.detail = {dashes:rec.dashes||0, top:rec.top||0, chain:rec.chain||0}; }
  else { e.score = rec.score; e.tie = -Math.abs(rec.mean) || 0; e.detail = {hits:rec.hits, target:rec.target, mean:rec.mean}; }
  return e;
}
function boardRowText(m, row){ const x = recText(m, {score:row.score, ...(row.detail||{})}); return {label: x.label ?? String(row.score), sub: x.sub ?? ''}; }
const cleanNick = v => String(v||'').replace(/\s+/g,' ').trim();
const nickKey = n => n.normalize('NFKC').toLowerCase(); // same identity rule as the worker: a case/width change of my own nickname is not a new claim
const hasNick = () => !!(store.nick && store.nickToken);
const closeDlg = id => { const d = $(id); if(d.open && typeof d.close==='function') d.close(); };
// Nickname gate: claimed once via POST /nick, unique server-side; the token comes back and every submit/post carries it.
function renderNick(){
  const has = hasNick();
  $('nickInput').placeholder = T('board.nickPh'); $('nickMsg').textContent = msg(live.nickMsg); $('nickSubmit').disabled = live.nickBusy;
  $('nickClose').hidden = !has; // the first-run gate has no way out but a nickname…
  $('nickLater').hidden = has || !live.nickLater; // …unless the server itself could not answer: then practise without a ranking and claim later
  const b = $('nickBtn'); b.hidden = !BOARD_URL; b.textContent = has ? T('nick.change', store.nick) : T('nick.set'); // always reachable: the gate can be dismissed (Escape, "later")
  $('postNickLabel').textContent = has ? store.nick : '';
}
function openNick(msgKey){
  if(!BOARD_URL) return;
  donateNudgeDefer();
  if(trial.running || trial.cdTimer) endTrial(true); // a modal pauses input but not the clock: cancel rather than let the trial end blind
  if(mode==='wsc'||mode==='giwon') resetInput(); // cancels a running local challenge like any other modal
  live.nickMsg = msgKey ? [msgKey] : ''; live.nickLater = false; $('nickInput').value = store.nick || ''; renderNick();
  const d = $('nickDlg'); if(!d.open && typeof d.showModal==='function') d.showModal(); jackpotPause();
}
async function claimNick(n){
  if(live.nickBusy) return;
  live.nickBusy = true; live.nickMsg = ['nick.checking']; renderNick();
  try{
    const res = await boardFetch('/nick', {method:'POST', body:JSON.stringify({nick:n})});
    if(!store.nick || nickKey(res.nick)!==nickKey(store.nick)) store.votes = {}; // votes belong to the nickname: a new identity starts with none
    store.nick = res.nick; store.nickToken = res.token; save(); live.nickMsg = ''; live.nickLost = false; closeDlg('nickDlg');
    boardLoad(); renderPosts(); boardSubmit(); // a trial result that ended without a (valid) token is submitted now
  }catch(err){
    live.nickMsg = [err.message==='taken' ? 'nick.taken' : err.message==='rate' ? 'nick.tooFast' : err.message==='nick' ? 'board.nickBad' : 'nick.fail'];
    live.nickLater = !['taken','nick'].includes(err.message); // the name is fine but the server is not: do not lock the whole app behind it
  }
  live.nickBusy = false; renderNick();
}
function lostNick(){ // server no longer recognises our token
  store.nick = ''; store.nickToken = ''; store.votes = {}; save(); renderNick(); renderPosts();
  ++board.seq; // pending reads belong to the expired identity; release their UI immediately
  if(board.msg && board.msg[0]==='board.loading') setBoardMsg('');
  renderBoard();
  if($('shareDlg').open || trial.openTimer) live.nickLost = true; else openNick('nick.expired'); // the result card is up or about to open: ask after it closes instead of stacking modals
}
$('nickForm').addEventListener('submit', ev => {
  ev.preventDefault(); const n = cleanNick($('nickInput').value);
  if(!nickOk(n)){ live.nickMsg = ['board.nickBad']; renderNick(); return; }
  if(hasNick() && nickKey(n)===nickKey(store.nick)){ closeDlg('nickDlg'); return; } // same identity (the server would answer 409 for a case change of my own name)
  claimNick(n);
});
$('nickClose').addEventListener('click', () => closeDlg('nickDlg'));
$('nickLater').addEventListener('click', () => closeDlg('nickDlg'));
$('nickDlg').addEventListener('cancel', ev => { if(!hasNick()) ev.preventDefault(); }); // Escape should not skip the gate (browsers still allow it without user activation)…
$('nickDlg').addEventListener('close', () => { renderNick(); renderTrialRank(); setTimeout(renderRewards, 0); }); // …so whatever closed it, the header button and trial bar say how to get back
$('nickBtn').addEventListener('click', () => openNick());
function setBoardMsg(m){ board.msg = m; $('boardMsg').textContent = msg(m); }
async function boardFetch(path, init){
  const headers = {...(init && init.body ? {'content-type':'application/json'} : {}), ...(init && init.headers || {})}; // GETs and bodiless POSTs stay preflight-free
  const signal = typeof AbortSignal!=='undefined' && AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined; // a hung request must not pin busy flags (gate, submit, post) forever
  const res = await fetch(BOARD_URL + path, {signal, ...init, headers});
  const j = await res.json().catch(() => null);
  // The pre-2026-09-15 Worker reports D1 quota exhaustion as {error:'server',message:'Exceeded D1...'}.
  // Recognise it until every deployment is on the explicit 503 {error:'quota'} contract.
  const quota = j && /exceeded D1's free tier daily row (?:read|write) limit/i.test(String(j.message||''));
  if(!res.ok || !j) throw new Error(quota ? 'quota' : (j && j.error) || ('http '+res.status));
  return j;
}
const boardLoadKey = () => JSON.stringify([board.tab,hasNick()?store.nick:'',hasNick()?store.nickToken:'',board.rev[board.tab]||0]);
function renderBoard(){
  if(!BOARD_URL) return;
  const t = board.tab, d = board.data[t], me = hasNick() && d && d.me && nickKey(d.me.nick)===nickKey(store.nick) ? d.me : null;
  document.querySelectorAll('#boardTabs button').forEach(b => { b.setAttribute('aria-pressed', b.dataset.board===t?'true':'false'); b.disabled=board.deleting; });
  $('boardRefresh').disabled = board.deleting || board.loads.has(boardLoadKey());
  $('boardInfo').textContent = d && d.total ? T('board.total', d.total) : '';
  $('boardMe').textContent = !d ? '' : me ? T('board.me', me.rank, d.total, pctTop(me.rank, d.total)) : T('board.meNone');
  $('boardMsg').textContent = msg(board.msg);
  const rows = d ? d.rows : [];
  const tr = r => { const mine = me && r.id===me.id, x = boardRowText(t, r), del = mine ? `<button class="board-delete" data-delete-score aria-label="${escapeHTML(T('board.deleteAria'))}"${board.deleting||board.submitting?' disabled':''}>${escapeHTML(T('board.delete'))}</button>` : ''; return `<tr${mine?' class="me"':''}><td class="n">${r.rank}</td><td>${escapeHTML(r.nick)}</td><td class="s">${escapeHTML(x.label)}<small>${escapeHTML(x.sub)}</small></td><td class="act">${del}</td></tr>`; };
  const below = me && !rows.some(r => r.id===me.id) ? `<tr class="sep"><td colspan="4">⋯</td></tr>` + tr(me) : ''; // my row when it sits under the top list
  $('boardList').innerHTML = !d ? '' : !rows.length ? `<div class="empty">${escapeHTML(T('board.empty'))}</div>` :
    `<table><thead><tr><th>${escapeHTML(T('board.hRank'))}</th><th>${escapeHTML(T('board.hNick'))}</th><th>${escapeHTML(T('board.hScore'))}</th><th></th></tr></thead><tbody>` +
    rows.map(tr).join('') + below + '</tbody></table>';
}
async function boardLoad(){
  if(!BOARD_URL) return;
  if(board.deleting){ board.loadAfterDelete = true; renderBoard(); return; }
  const t = board.tab, seq = ++board.seq, key = boardLoadKey();
  // Share only in-flight reads. Completed reads are never cached; identity/revision changes get a fresh request.
  let pending = board.loads.get(key);
  if(!pending){
    pending = boardFetch('/top?board='+t+(hasNick() ? '&nick='+encodeURIComponent(store.nick) : ''))
      .catch(()=>null).finally(()=>{ board.loads.delete(key); });
    board.loads.set(key,pending);
  }
  setBoardMsg(['board.loading']); renderBoard();
  const d = await pending;
  if(seq!==board.seq || key!==boardLoadKey()) return; // key includes identity/revision; only the latest consumer renders the shared response
  if(d){ boardSet(t, d); setBoardMsg(''); if(t==='wave10') renderWave(); } else setBoardMsg(['board.loadFail']); // wave10 carries cut10: the chart's top band follows it
  renderBoard();
}
async function boardDelete(){
  const t = board.tab, d = board.data[t];
  if(!BOARD_URL || board.deleting || board.submitting || !hasNick() || !d || !d.me || nickKey(d.me.nick)!==nickKey(store.nick)) return;
  if(typeof confirm==='function' && !confirm(T('board.deleteConfirm'))) return;
  const nick = store.nick, token = store.nickToken; board.deleting = true; ++board.seq; board.rev[t]=(board.rev[t]||0)+1; setBoardMsg(['board.deleting']); renderBoard();
  try{
    const res = await boardFetch('/score', {method:'DELETE', body:JSON.stringify({board:t, nick, token})});
    if(nick===store.nick && token===store.nickToken){ boardSet(t, res); if(t==='wave10') renderWave(); if(board.tab===t) setBoardMsg(['board.deleted']); }
  }catch(err){
    if(nick===store.nick && token===store.nickToken){ if(err.message==='auth') lostNick(); if(board.tab===t) setBoardMsg([err.message==='auth'?'nick.expired':'board.deleteFail']); }
  }finally{
    board.deleting = false; renderBoard();
    const load = board.loadAfterDelete; board.loadAfterDelete = false;
    if(load) boardLoad();
    boardDrain();
  }
}
// Post-trial status in the trial bar (and the banner in the result card): auto-submitted, retry on failure.
const submitText = s => s.state==='busy' ? T('board.submitting') : s.state==='fail' ? T(s.error==='auth' ? 'nick.expired' : 'board.submitFail') : T(s.improved ? 'board.done' : 'board.kept', s.rank, s.total, pctTop(s.rank, s.total));
const rankingResult = () => CHALLENGES[mode] ? CHALLENGES[mode].state().result : trial.result;
function renderTrialRank(){
  const r = rankingResult(), e = BOARD_URL ? boardEntry(r, mode) : null, s = e && r.submit;
  $('dRankRetry').hidden = !(s && s.state==='fail');
  $('dRank').textContent = !e ? '' : s ? submitText(s) : hasNick() ? '' : T('nick.needed'); // a result that ended without a nickname says so instead of going blank
  renderShareRank();
}
function renderShareRank(){
  const el = $('shareRank'), r = trial.result, s = shareSrc && shareSrc.kind==='trial' && r && r.submit;
  el.hidden = !s; if(!s) return;
  const done = s.state==='done', t = done ? tierOf(s.rank, s.total) : null;
  el.className = 'share-rank' + (done ? ' t'+t : '');
  $('shareTier').textContent = done ? T('tier.'+t+'.title') : '';
  $('shareRankLine').textContent = submitText(s);
  $('shareTierMsg').textContent = done ? T('tier.'+t+'.'+mode) : ''; // trial.result belongs to the current mode (setMode clears it)
}
async function boardSubmit(){
  const r = rankingResult(), e = boardEntry(r, mode); if(!BOARD_URL || !e || !hasNick() || (r.submit && r.submit.state!=='fail')) return renderTrialRank();
  r.submit = {state:'busy'};
  board.submitQueue.push({r,e,nick:store.nick,token:store.nickToken,tab0:board.tab});
  renderTrialRank();
  return boardDrain();
}
async function boardDrain(){
  if(board.deleting || board.submitting) return;
  while(board.submitQueue.length){
    const {r,e,nick,token,tab0}=board.submitQueue.shift();
    const sameIdentity=()=>nick===store.nick && token===store.nickToken;
    if(!sameIdentity()){ r.submit={state:'fail',error:'auth'}; renderTrialRank(); continue; }
    board.submitting=true; renderBoard();
    try{
      const res=await boardFetch('/submit',{method:'POST',body:JSON.stringify({...e,nick,token})});
      r.submit={state:'done',rank:res.rank,total:res.total,improved:res.improved};
      if(sameIdentity()){
        boardSet(e.board,res); if(e.board==='wave10') renderWave();
        // Invalidate only loads for this board. A request for another visible
        // tab may still complete and should not be discarded.
        board.rev[e.board]=(board.rev[e.board]||0)+1;
        if(board.tab===tab0){ board.tab=e.board; setBoardMsg(''); }
      }
    }catch(err){ r.submit={state:'fail',error:err.message}; if(err.message==='auth'&&sameIdentity()) lostNick(); }
    finally{ board.submitting=false; }
    renderBoard(); renderTrialRank();
    if(r===trial.result && shareSrc && shareSrc.kind==='trial' && shareSrc.rec===r.rec){ shareSrc=shareSource(); renderShare(); }
  }
}
$('dRankRetry').addEventListener('click', boardSubmit);
$('boardRefresh').addEventListener('click', boardLoad);
$('boardList').addEventListener('click', ev => { const b = ev.target && ev.target.closest ? ev.target.closest('button[data-delete-score]') : null; if(b) boardDelete(); });
$('boardTabs').addEventListener('click', ev => {
  const b = ev.target && ev.target.closest ? ev.target.closest('button[data-board]') : null;
  if(!b || board.deleting || b.dataset.board===board.tab) return;
  board.tab = b.dataset.board; setBoardMsg(''); renderBoard(); boardLoad();
});
// visit counter: each browser counts once per KST day (store.visitDay); otherwise just read the numbers
async function visitsLoad(){
  if(!BOARD_URL || live.visitsBusy) return;
  const hit = live.visitPending; live.visitPending = false; // bumpVisitDay() marked store.visitDay before the request: a reload or second tab mid-flight must not count twice (a failed POST is simply lost — approximate counter)
  live.visitsBusy = true;
  try{ live.visits = await boardFetch('/visits', hit ? {method:'POST'} : undefined); }catch(e){}
  live.visitsBusy = false; renderVisits();
}
function renderVisits(){ const v = live.visits; $('visits').textContent = v ? T('visits', v.today, v.total) : ''; }
// shoutbox: nickname + one line, newest first; the nickname field doubles as the ranking nickname editor
function setPostsMsg(m){ live.postsMsg = m; $('postMsg').textContent = msg(m); }
const postTime = t => new Date(t).toLocaleString(LOCALE[store.lang], {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'});
const postsMutating = () => live.posting || live.voting || live.replying;
async function postsLoad(){
  if(!BOARD_URL || postsMutating() || live.postsLoading) return;
  live.postsLoading = true; const seq = ++live.postsSeq; renderPosts();
  try{ const rows = (await boardFetch('/posts')).rows; if(seq===live.postsSeq){ setPosts(rows); if(live.postsMsg && ['posts.loadFail','posts.quota'].includes(live.postsMsg[0])) setPostsMsg(''); } }
  catch(e){ if(seq===live.postsSeq && !live.posts) setPostsMsg([e.message==='quota' ? 'posts.quota' : 'posts.loadFail']); }
  finally{ live.postsLoading = false; renderPosts(); }
}
function setPosts(rows){ // every post/reply/vote answer lands here: posts that fell off the 50-row list are never shown again, so my votes on them are forgotten too
  live.posts = rows;
  const keep = new Set((rows||[]).map(p => String(p.id)));
  if(live.replyTo && !keep.has(String(live.replyTo))){ live.replyTo = 0; live.replyText = ''; }
  let n = 0; for(const id of Object.keys(store.votes)) if(!keep.has(id)){ delete store.votes[id]; n++; }
  if(n) save();
}
function voteBtn(p, v){ // 👍/👎 pill with the count; aria-pressed marks my own vote (store.votes), disabled while any post mutation is in flight
  const label = T(v===1 ? 'posts.like' : 'posts.dislike'), mine = (store.votes[p.id]||0)===v;
  return `<button type="button" class="vote" data-id="${p.id}" data-v="${v}" aria-pressed="${mine}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}"${postsMutating() ? ' disabled' : ''}>${v===1 ? '👍' : '👎'} ${(v===1 ? p.up : p.down)|0}</button>`;
}
function renderPosts(){
  if(!BOARD_URL) return;
  const rows = live.posts, text = $('postText'), busy = postsMutating();
  text.placeholder = T('posts.ph'); $('postSend').disabled = postsMutating(); $('postMsg').textContent = msg(live.postsMsg);
  $('postsRefresh').disabled = busy || live.postsLoading;
  $('postsRefresh').textContent = T(live.postsLoading ? 'posts.refreshing' : 'posts.refresh');
  $('postList').innerHTML = !rows ? '' : !rows.length ? `<div class="empty">${escapeHTML(T('posts.empty'))}</div>` :
    rows.map(p => { const replies = Array.isArray(p.replies) ? p.replies : [];
      const list = replies.length ? `<div class="reply-list">${replies.map(r => `<div class="reply"><b>${escapeHTML(r.nick)}</b><time>${escapeHTML(postTime(r.created_at))}</time><p>${escapeHTML(r.text)}</p></div>`).join('')}</div>` : '';
      const form = live.replyTo===p.id ? `<form class="reply-form" data-id="${p.id}"><input maxlength="200" autocomplete="off" aria-label="${escapeHTML(T('posts.replyPh'))}" placeholder="${escapeHTML(T('posts.replyPh'))}" value="${escapeHTML(live.replyText)}"${busy?' disabled':''}><button class="btn" type="submit"${busy?' disabled':''}>${escapeHTML(T('posts.replySend'))}</button><button class="btn ghost reply-cancel" type="button"${busy?' disabled':''}>${escapeHTML(T('posts.replyCancel'))}</button></form>` : '';
      return `<div class="post"><b>${escapeHTML(p.nick)}</b><time>${escapeHTML(postTime(p.created_at))}</time><p>${escapeHTML(p.text)}</p><div class="post-actions"><div class="post-votes">${voteBtn(p,1)}${voteBtn(p,-1)}</div><button type="button" class="reply-open" data-id="${p.id}"${busy?' disabled':''}>↳ ${escapeHTML(T('posts.reply', replies.length))}</button></div>${list}${form}</div>`;
    }).join('');
}
// like/dislike (2026-09-13): the server keeps one vote per (post, nickname) and takes an idempotent "set to v" (1 / -1 / 0 = none), so pressing my
// current vote sends 0 (cancel) and the other button switches. store.votes mirrors the server's `mine` answer; a stale cache is corrected, never double-counted.
async function postVote(id, v){
  if(!BOARD_URL || postsMutating() || !Number.isInteger(id) || ![1,-1].includes(v)) return;
  if(!hasNick()) return openNick();
  const want = (store.votes[id]||0)===v ? 0 : v, nick = store.nick, token = store.nickToken;
  const sameIdentity = () => nick===store.nick && token===store.nickToken;
  live.voting = true; const seq = ++live.postsSeq; renderPosts();
  try{
    const r = await boardFetch('/vote', {method:'POST', body:JSON.stringify({nick, token, id, v:want})});
    if(seq===live.postsSeq) setPosts(r.rows);
    if(sameIdentity()){ if(r.mine) store.votes[id] = r.mine; else delete store.votes[id]; save(); }
    if(live.postsMsg && /^posts\.vote/.test(live.postsMsg[0])) setPostsMsg('');
  }catch(err){
    setPostsMsg([err.message==='rate' ? 'posts.voteFast' : 'posts.voteFail']);
    if(err.message==='auth' && sameIdentity()) lostNick();
    if(err.message==='post'){ delete store.votes[id]; save(); live.voting = false; return postsLoad(); } // the post was deleted meanwhile: refresh the list (renders)
  }
  live.voting = false; renderPosts();
}
$('postList').addEventListener('click', ev => {
  const vote = ev.target.closest && ev.target.closest('button.vote'); if(vote) return postVote(+vote.dataset.id, +vote.dataset.v);
  const open = ev.target.closest && ev.target.closest('button.reply-open');
  if(open){ if(!hasNick()) return openNick(); live.replyTo = live.replyTo===+open.dataset.id ? 0 : +open.dataset.id; live.replyText = ''; return renderPosts(); }
  if(ev.target.closest && ev.target.closest('button.reply-cancel')){ live.replyTo = 0; live.replyText = ''; renderPosts(); }
});
$('postList').addEventListener('input', ev => { if(ev.target.closest && ev.target.closest('.reply-form')) live.replyText = ev.target.value; });
async function replySend(id, raw){
  if(!BOARD_URL || postsMutating() || !Number.isInteger(id)) return;
  if(!hasNick()) return openNick();
  const nick = store.nick, token = store.nickToken, sameIdentity = () => nick===store.nick && token===store.nickToken;
  const text = String(raw||'').replace(/\s+/g,' ').trim();
  if(!text || [...text].length>200) return setPostsMsg(['posts.textBad']);
  live.replying = true; const seq = ++live.postsSeq; live.replyText = text; setPostsMsg(['posts.replying']); renderPosts();
  try{
    const rows = (await boardFetch('/reply', {method:'POST', body:JSON.stringify({nick, token, id, text})})).rows;
    if(seq===live.postsSeq) setPosts(rows);
    live.replyTo = 0; live.replyText = ''; setPostsMsg('');
  }catch(err){
    setPostsMsg([err.message==='rate' ? 'posts.tooFast' : err.message==='text' ? 'posts.textBad' : 'posts.replyFail']);
    if(err.message==='auth' && sameIdentity()) lostNick();
    if(err.message==='post'){ live.replyTo = 0; live.replyText = ''; live.replying = false; return postsLoad(); }
  }
  live.replying = false; renderPosts();
}
$('postList').addEventListener('submit', ev => { const f = ev.target.closest && ev.target.closest('form.reply-form'); if(!f) return; ev.preventDefault(); replySend(+f.dataset.id, f.querySelector('input').value); });
async function postSend(){
  if(!BOARD_URL || postsMutating()) return;
  if(!hasNick()) return openNick();
  const nick = store.nick, token = store.nickToken, sameIdentity = () => nick===store.nick && token===store.nickToken;
  const text = $('postText').value.replace(/\s+/g,' ').trim();
  if(!text || [...text].length>200) return setPostsMsg(['posts.textBad']);
  live.posting = true; const seq = ++live.postsSeq; setPostsMsg(['posts.sending']); renderPosts();
  try{ const rows = (await boardFetch('/posts', {method:'POST', body:JSON.stringify({nick, token, text})})).rows; if(seq===live.postsSeq) setPosts(rows); $('postText').value = ''; setPostsMsg(''); }
  catch(err){ setPostsMsg([err.message==='rate' ? 'posts.tooFast' : err.message==='text' ? 'posts.textBad' : 'posts.sendFail']); if(err.message==='auth' && sameIdentity()) lostNick(); }
  live.posting = false; renderPosts();
}
$('postForm').addEventListener('submit', ev => { ev.preventDefault(); postSend(); });
$('postsRefresh').addEventListener('click', postsLoad);
function backendInit(){
  document.querySelectorAll('.section-links a[href="#boardCard"],.section-links a[href="#postsCard"]').forEach(a=>a.hidden=!BOARD_URL);
  $('boardCard').hidden = $('postsCard').hidden = !BOARD_URL;
  if(document.body) document.body.classList.toggle('has-community',!!BOARD_URL);
  if(!BOARD_URL) return;
  boardLoad(); postsLoad(); visitsLoad(); renderNick();
  if(!hasNick()){ openNick(); if(store.nick) claimNick(store.nick); } // first visit → gate; a nickname saved before tokens existed is claimed as-is
  setInterval(() => { if(document.hidden) return; bumpVisitDay(); if(live.visitPending) visitsLoad(); }, 60000); // no recurring D1 reads; only count a KST day crossed by an already-open tab
}

