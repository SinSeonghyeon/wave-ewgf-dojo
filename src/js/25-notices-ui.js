/* ---------- announcements: static patch notes in this file, with a browser-local read marker ---------- */
function renderNotices(){
  $('noticeBadge').hidden = !NOTICE_LATEST || store.noticeSeen===NOTICE_LATEST;
  $('noticeList').innerHTML = NOTICES.map(n => {
    const date = new Intl.DateTimeFormat(LOCALE[store.lang], {year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(n.date+'T12:00:00Z'));
    const h=n.highlight,highlight=h?`<section class="notice-highlight"><span class="notice-kind">${escapeHTML(T(h.kind))}</span><h4>${escapeHTML(T(h.title))}</h4><p>${escapeHTML(T(h.summary))}</p><ul>${h.items.map(k=>`<li>${escapeHTML(T(k))}</li>`).join('')}</ul></section>`:'';
    return `<article class="notice-item"><div class="notice-meta"><time datetime="${n.date}">${escapeHTML(date)}</time><span class="notice-kind">${escapeHTML(T(n.kind))}</span></div><h3>${escapeHTML(T(n.title))}</h3>${highlight}<p>${escapeHTML(T(n.summary))}</p><ul>${n.items.map(k => `<li>${escapeHTML(T(k))}</li>`).join('')}</ul></article>`;
  }).join('');
}
function openNotices(){
  const d = $('noticeDlg'); if(typeof d.showModal!=='function' || d.open || modalOpen()) return false;
  donateNudgeDefer(); endTrial(true); resetInput(); renderNotices(); d.showModal(); jackpotPause();
  if(NOTICE_LATEST && store.noticeSeen!==NOTICE_LATEST){ store.noticeSeen = NOTICE_LATEST; save(); renderNotices(); }
  noticeAutoPending = false; if(noticeAutoTimer) clearTimeout(noticeAutoTimer); noticeAutoTimer = null;
  return true;
}
$('noticeOpen').addEventListener('click', openNotices);
$('noticeClose').addEventListener('click', () => $('noticeDlg').close());
$('noticeDlg').addEventListener('close', () => setTimeout(renderRewards, 0));

// Returning visitors see each new latest announcement once. A first visit only gets the NEW badge,
// avoiding a second modal immediately after the nickname gate. Busy UI is retried without interrupting play or results.
let noticeAutoPending = hadStore && !!NOTICE_LATEST && store.noticeSeen!==NOTICE_LATEST;
let noticeAutoTimer = null, noticeAutoQueued = false;
function noticeAutoSchedule(delay=500){
  if(!noticeAutoPending || store.noticeSeen===NOTICE_LATEST || noticeAutoTimer || noticeAutoQueued) return;
  noticeAutoQueued = true;
  requestAnimationFrame(() => { noticeAutoQueued = false; if(noticeAutoPending && !noticeAutoTimer) noticeAutoTimer = setTimeout(noticeAutoTry, delay); });
}
function noticeAutoTry(){
  noticeAutoTimer = null;
  if(!noticeAutoPending || store.noticeSeen===NOTICE_LATEST){ noticeAutoPending = false; return false; }
  if(document.hidden) return false;
  if(challengeBusy() || modalOpen() || trial.running || !!trial.cdTimer || !!trial.openTimer || jackpotBusy || jackpotHold){ noticeAutoSchedule(750); return false; }
  return openNotices();
}
addEventListener('visibilitychange', () => { if(document.hidden) suspendBindings(); else noticeAutoSchedule(); });

