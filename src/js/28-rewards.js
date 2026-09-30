/* ---------- 옷장·업적 runtime: lifetime counters → unlock checks → jackpot reveal → #fitDlg ---------- */
// Presentation only: nothing here feeds the judging state machine, session stats or trial scores (design decision 15(wardrobe)). Progress lives in store.life/ach/fit (this browser only).
const SLOT_ICON = {head:'🎩', top:'👕', arms:'🥊', legs:'👖', shoes:'👟', skin:'✋'};
const REEL_POOL = ['🍚','⚡','🔥','👊','💀','🌊','🥋','⭐'];
let jackpotBusy = false, jackpotHold = false, jackpotFinish = null; // hold keeps claiming off the trial result flash
let jackpotActive = null;
function jackpotPause(){
  const a = jackpotActive; if(!a){ renderRewards(); return; }
  a.timers.forEach(clearTimeout); clearInterval(a.rumble);
  if(a.stopChime) a.stopChime();
  jackpotActive = null; jackpotFinish = null; jackpotBusy = false;
  petalsStop(); petals.length = 0;
  $('jackpot').hidden = true; $('jackpot').dataset.phase = '';
  shake = 0; if(flashGold){ flash = 0; flashGold = false; }
  renderRewards();
}
function renderJackpot(){
  if(!jackpotActive) return;
  const {j, extra} = jackpotActive;
  $('jpTitle').textContent = j.kind==='daily' ? T('fit.dailyTitle', j.day) : T('fit.unlockedBig');
  $('jpAch').textContent = (j.kind==='daily' ? T('fit.dailyGift') : T('ach.'+j.id)) + (extra ? ' '+T('fit.more', extra) : '');
  $('jpItem').textContent = T('item.'+j.id); $('jpHint').textContent = T('fit.wearHint');
}
const fit = { view:'fit' };
const canDraw = c => { const g = c && typeof c.getContext==='function' ? c.getContext('2d') : null; return g && typeof g.arc==='function' ? g : null; }; // the node harness has no 2D context
function drawPreview(c, look, scale){ const g = canDraw(c); if(!g) return; g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,c.width,c.height); g.save(); g.translate(c.width/2, c.height-8); g.scale(scale,scale); drawFighter(g, 0, 0, {lean:4, armR:35, armL:-30, spread:0.25}, 1, 1, null, look); g.restore(); }
function unlockItem(id, kind){ store.pendingRewards.push({kind, id, at:Date.now(), day:store.life.days}); rewardNoticeAdd(kind); }
function checkAch(){ // called after every counter change; cheap (25 predicates)
  const l = store.life; let n = 0;
  for(const id of Object.keys(ACH)) if(!earned(id) && ACH[id].stat(l)>=ACH[id].target){ unlockItem(id, 'ach'); n++; }
  if(n){ save(); if($('fitDlg').open) renderFit(); renderRewards(); }
  return n;
}
function dailyGift(){ // one random daily item on the first gesture of a KST day; giftDay is written even when nothing is left so the pool check runs once a day
  bumpVisitDay(); // a gesture just after midnight can precede the minute timer
  const day = KST_DAY(); if(store.life.giftDay===day) return null;
  store.life.giftDay = day;
  const pool = DAILY_IDS.filter(id => !earned(id));
  const id = pool.length ? pool[Math.floor(Math.random()*pool.length)] : null;
  if(id) unlockItem(id, 'daily');
  save(); if(id){ if($('fitDlg').open) renderFit(); renderRewards(); }
  return id;
}
function bumpVisitDay(){ // first visit of a KST day: counts a day for the achievements and flags the visit-counter POST (visitsLoad consumes live.visitPending)
  const day = KST_DAY(); if(store.visitDay===day) return false;
  store.visitDay = day; store.life.days++; live.visitPending = true; save(); checkAch(); return true;
}
function goldSparks(n){ if(reduced) return; for(let i=0;i<n;i++) sparks.push({x:world.charX, y:-90, vx:(Math.random()-0.5)*14, vy:-Math.random()*9-3, t:1, c:Math.random()<.5?'#FFFFFF':'#F5C542'}); }
const petals = []; let petalRaf = 0, petalSpawn = false; // flower petals drifting down over the reveal overlay (its own canvas, above the dim)
function petalsStart(){ const c = $('jpFall'), g = canDraw(c); if(!g || petalRaf) return; petalSpawn = true; let last = performance.now();
  const cols = ['#FFC1D6','#FFE3EC','#F5C542','#FFFFFF','#FF9EBB'];
  const tick = now => { const dt = Math.min(2, (now-last)/16.7); last = now; const w = c.clientWidth, h = c.clientHeight; if(c.width!==w||c.height!==h){ c.width = w; c.height = h; }
    if(petalSpawn && petals.length<90) for(let i=0;i<2;i++) petals.push({x:Math.random()*w, y:-12, vy:0.9+Math.random()*1.3, sw:0.6+Math.random()*1.2, ph:Math.random()*Math.PI*2, r:Math.random()*Math.PI, vr:(Math.random()-0.5)*0.05, a:5+Math.random()*4, c:cols[Math.floor(Math.random()*cols.length)], t:1});
    g.clearRect(0,0,w,h);
    for(let i=petals.length-1;i>=0;i--){ const p = petals[i]; p.ph += 0.03*dt; p.x += Math.sin(p.ph)*p.sw*dt; p.y += p.vy*dt; p.r += p.vr*dt; if(!petalSpawn) p.t -= 0.02*dt; if(p.t<=0||p.y>h+12){ petals.splice(i,1); continue; }
      g.save(); g.translate(p.x,p.y); g.rotate(p.r); g.globalAlpha = Math.min(1,p.t); g.fillStyle = p.c; g.beginPath(); g.ellipse(0,0,p.a,p.a*0.55,0,0,Math.PI*2); g.fill(); g.restore(); }
    if(petals.length || petalSpawn) petalRaf = requestAnimationFrame(tick); else { petalRaf = 0; g.clearRect(0,0,w,h); } };
  petalRaf = requestAnimationFrame(tick); }
function petalsStop(){ petalSpawn = false; }
function rewardBlocked(){ return challengeBusy() || jackpotBusy || jackpotHold || trial.running || !!trial.cdTimer || !!trial.openTimer || !!modalOpen(); }
function renderRewards(){
  const b = $('rewardOpen'), n = store.pendingRewards.length, blocked = rewardBlocked();
  b.disabled = !n || blocked; b.dataset.count = String(n); b.dataset.ready = String(n>0); b.dataset.motion = String(!reduced && !!store.fx);
  const label = n ? T('reward.claim',n) + (blocked ? ' · '+T('reward.wait') : '') : T('reward.empty');
  b.title = label; b.setAttribute('aria-label', label);
  $('rewardCount').textContent = String(n); $('rewardCount').hidden = !n;
  if(rewardNotice) $('rewardToast').textContent = T(...rewardNotice);
}
function claimRewards(){
  if(rewardBlocked() || !store.pendingRewards.length) return;
  donateNudgeDefer();
  const batch = store.pendingRewards.splice(0), now = Date.now();
  for(const j of batch) store.ach[j.id] = now;
  save(); rewardNoticeClear();
  playJackpot(batch[0], batch.length-1); renderRewards();
}
// Notices are cosmetic and never delay storage or capture input. A short burst is one notice.
let rewardNotice = null, rewardNoticeCount = 0, rewardNoticeKind = '', rewardNoticeTimers = [], rewardFlight = null;
function rewardNoticeClear(){
  rewardNoticeTimers.forEach(clearTimeout); rewardNoticeTimers = [];
  if(rewardFlight) rewardFlight.cancel(); rewardFlight = null;
  rewardNotice = null; rewardNoticeCount = 0; rewardNoticeKind = '';
  $('rewardToast').hidden = true; $('rewardOpen').dataset.arrival = 'false';
}
function rewardNoticeAdd(kind){
  const count = rewardNoticeCount+1, firstKind = rewardNoticeKind || kind;
  rewardNoticeClear(); rewardNoticeCount = count; rewardNoticeKind = firstKind;
  rewardNotice = count>1 ? ['reward.many',count] : ['reward.'+firstKind];
  const el = $('rewardToast'); el.textContent = T(...rewardNotice); el.hidden = false;
  rewardNoticeTimers.push(setTimeout(() => {
    const finish = () => {
      el.hidden = true; rewardNotice = null; rewardNoticeCount = 0; rewardNoticeKind = ''; rewardFlight = null;
      if(!reduced && store.fx && store.pendingRewards.length){
        $('rewardOpen').dataset.arrival = 'true';
        rewardNoticeTimers.push(setTimeout(() => { $('rewardOpen').dataset.arrival = 'false'; },450));
      }
    };
    if(reduced || !store.fx || typeof el.animate!=='function'){ finish(); return; }
    const a = el.getBoundingClientRect(), b = $('rewardOpen').getBoundingClientRect();
    const dx = b.x+b.width/2-a.x-a.width/2, dy = b.y+b.height/2-a.y-a.height/2;
    rewardFlight = el.animate([{transform:'translateX(-50%)',opacity:1},{transform:`translateX(-50%) translate(${dx}px,${dy}px) scale(.12)`,opacity:0}],{duration:550,easing:'cubic-bezier(.4,0,.7,1)',fill:'forwards'});
    rewardFlight.onfinish = () => { if(rewardFlight) rewardFlight.cancel(); finish(); };
  },1400));
}
function playJackpot(j, extra){ // "?" box shakes harder and harder (egg hatching, 1.8s) → white-out + chime → the result card (character wearing the item, names) fades in with rays and falling petals, stays until 확인 → fade out
  jackpotBusy = true;
  const a = jackpotActive = {j, extra, timers:[], rumble:null, done:false};
  const ready = () => { if(jackpotActive!==a) return false; if(trial.running || trial.cdTimer || modalOpen()){ jackpotPause(); return false; } return true; };
  const later = (fn, ms) => a.timers.push(setTimeout(() => { if(ready()) fn(); }, ms));
  const el = $('jackpot'), slot = ITEM_SLOT[j.id], look = lookOf({...store.fit, [slot]:j.id}), fast = reduced || !store.fx;
  renderJackpot(); $('jpBox').textContent = '?';
  el.hidden = false;
  const finish = () => { if(jackpotFinish!==finish || !ready()) return; a.done = true; jackpotFinish = null; petalsStop(); el.dataset.phase = 'out'; later(() => { jackpotPause(); renderRewards(); }, fast ? 300 : 800); };
  const reveal = () => { el.dataset.phase = 'reveal'; drawPreview($('jpCanvas'), look, 1.6); if(!fast){ flash = 1; flashGold = true; shake = 10; goldSparks(30); petalsStart(); } jackpotFinish = finish; const ok = $('jpOk'); if(typeof ok.focus==='function') try{ ok.focus({preventScroll:true}); }catch(e){} }; // stays until 확인
  if(fast){ a.stopChime = playChime(); reveal(); return; }
  el.dataset.phase = 'egg';
  let k = 0; a.rumble = setInterval(() => { if(!ready()) return; k++; shake = 2 + k*1.1; if(k>=11) clearInterval(a.rumble); }, 150);
  later(() => { clearInterval(a.rumble); el.dataset.phase = 'white'; shake = 14; a.stopChime = playChime(); later(reveal, 230); }, 1800);
}
/* wardrobe dialog: outfit tab (preview + one chip row per slot) and achievements tab (sets → rows with progress, then the daily pool) */
function fitView(v){ fit.view = v; $('fitWear').hidden = v!=='fit'; $('fitAch').hidden = v!=='ach'; $('fitTabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.view===v ? 'true' : 'false')); }
const itemName = (slot, id) => T(id==='base' ? 'item.base.'+slot : 'item.'+id);
function renderFit(){
  const have = DAILY_IDS.filter(id => store.ach[id]).length;
  $('fitDaily').textContent = have===DAILY_IDS.length ? T('fit.dailyDone') : T('fit.dailyCount', have, DAILY_IDS.length);
  $('fitSlots').innerHTML = SLOTS.map(s => `<div class="fit-slot"><div class="t">${escapeHTML(T('slot.'+s))}</div><div class="fit-chips">${Object.keys(ITEMS[s]).map(id => {
    const own = owned(id), waiting = pendingReward(id), daily = ITEMS[s][id].set==='daily', tip = own ? '' : ` title="${escapeHTML(waiting ? T('reward.pending') : daily ? T('fit.lockedDaily') : T('fit.locked', T('ach.'+id)))}"`;
    return `<button type="button" class="fit-chip${own?'':' locked'}${daily?' daily':''}" data-slot="${s}" data-id="${id}" aria-pressed="${store.fit[s]===id?'true':'false'}"${own?'':' aria-disabled="true"'}${tip}>${own?'':'🔒 '}${escapeHTML(itemName(s,id))}${waiting?' · '+escapeHTML(T('reward.pending')):''}</button>`; }).join('')}</div></div>`).join('');
  const ids = Object.keys(ACH), setOf = id => ITEMS[ITEM_SLOT[id]][id].set;
  const groups = [...SETS.map(s => ({title:T('set.'+s), ids:ids.filter(id => setOf(id)===s)})), {title:T('fit.special'), ids:ids.filter(id => !setOf(id))}];
  $('fitAch').innerHTML = `<div class="ach-count">${escapeHTML(T('fit.achCount', ids.filter(id => earned(id)).length, ids.length))}</div>`
    + groups.map(gp => `<div class="ach-group"><h3>${escapeHTML(gp.title)}</h3>${gp.ids.map(id => { const a = ACH[id], ok = earned(id), n = ok ? a.target : Math.min(a.target, a.stat(store.life));
        return `<div class="ach-row${ok?' done':''}"><b>${ok?'✓ ':''}${escapeHTML(T('ach.'+id))}</b><span class="d">${escapeHTML(T('ach.'+id+'.d'))}</span><span class="p">${n} / ${a.target}</span><span class="i">${escapeHTML(T('fit.reward', T('item.'+id)))}${pendingReward(id)?' · '+escapeHTML(T('reward.pending')):''}</span></div>`; }).join('')}</div>`).join('')
    + `<div class="ach-group"><h3>${escapeHTML(T('fit.dailyGroup'))}</h3><div class="fit-chips">${DAILY_IDS.map(id => `<span class="fit-chip daily${store.ach[id]?'':' locked'}">${store.ach[id] ? escapeHTML(T('item.'+id)) : pendingReward(id) ? escapeHTML(T('item.'+id)+' · '+T('reward.pending')) : '?'}</span>`).join('')}</div></div>`;
  drawPreview($('fitPreview'), currentLook(), 1.7);
}
function openFit(){ const d = $('fitDlg'); if(typeof d.showModal!=='function' || d.open) return; donateNudgeDefer(); unlockAudio(); endTrial(true); resetInput(); fitView(fit.view); renderFit(); d.showModal(); jackpotPause(); }
$('rewardOpen').addEventListener('click', claimRewards);
$('jpOk').addEventListener('click', () => { if(jackpotFinish) jackpotFinish(); });
$('fitOpen').addEventListener('click', openFit);
$('fitClose').addEventListener('click', () => $('fitDlg').close());
$('fitTabs').addEventListener('click', e => { const b = e.target && e.target.closest ? e.target.closest('button[data-view]') : null; if(b) fitView(b.dataset.view); });
$('fitSlots').addEventListener('click', e => { const b = e.target && e.target.closest ? e.target.closest('button[data-id]') : null; if(b) setFit(b.dataset.slot, b.dataset.id); });
$('fitReset').addEventListener('click', () => { for(const s of SLOTS) store.fit[s] = 'base'; lookCache = null; save(); renderFit(); });
['setDlg','donateDlg','fitDlg'].forEach(id => $(id).addEventListener('close', () => setTimeout(renderRewards, 0))); // refresh claiming availability (#shareDlg/#nickDlg: their own close handlers)

