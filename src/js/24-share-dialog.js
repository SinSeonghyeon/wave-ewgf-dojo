/* ---------- share card: dialog + actions ---------- */
let shareSrc = null, shareModel = null, shareSeq = 0;
function shareSource(){
  if(mode==='wsc') return null;
  if(MODES[mode].start){
    if(!trial.result) return null;
    const r = trial.result, s = r.submit && r.submit.state==='done' ? r.submit : null;
    return {kind:'trial', mode, rec:r.rec, attempts:r.attempts, cycles:r.cycles, window:r.window, date:r.rec.date, rank: s ? {rank:s.rank, total:s.total, improved:s.improved} : null};
  }
  return {kind:'session', mode, session, attempts:session.attempts, cycles:session.cycles, window:store.window, date:Date.now()};
}
async function renderShare(){
  if(!shareSrc) return;
  const seq = ++shareSeq; shareModel = buildCard(shareSrc);
  try{
    if(document.fonts && document.fonts.load){
      await Promise.all([`46px ${displayFont()}`, `700 20px ${cssVar('--body','sans-serif')}`, `700 28px ${cssVar('--mono','monospace')}`].map(f => document.fonts.load(f).catch(()=>{})));
    }
  }catch(e){}
  if(seq!==shareSeq) return; // a newer render (rank arrived, language switched) supersedes this one
  drawCard($('shareCanvas').getContext('2d'), shareModel);
}
function setShareMsg(m){ ui.shareMsg = m; $('shareMsg').textContent = msg(m); }
function openShare(){
  if(mode==='wsc') return Promise.resolve();
  const next = shareSource(); if(!next) return Promise.resolve();
  donateNudgeDefer();
  const sameResultOpening = next.kind==='trial' && donateResultVisible && donateResultRec===next.rec;
  shareSrc = next;
  if(!sameResultOpening){ donateResultVisible = takeResultDonate(next.kind==='trial' && !!trial.result.personalBest); donateResultRec = donateResultVisible ? next.rec : null; }
  renderDonate();
  setShareMsg(''); renderShareRank();
  return renderShare().then(() => { const d = $('shareDlg'); if(!d.open){ resetInput(); d.showModal(); jackpotPause(); } }); // like setOpen/openDonate: a finger still on the pad must not keep driving onDir behind the card
}
$('dShare').addEventListener('click', openShare);
$('shareClose').addEventListener('click', () => $('shareDlg').close());
$('shareDlg').addEventListener('close', () => { donateResultVisible=false; donateResultRec=null; renderDonate(); if(live.nickLost){ live.nickLost = false; openNick('nick.expired'); } setTimeout(renderRewards, 0); }); // a token rejected mid-trial: ask once the card is out of the way
$('shareCopy').addEventListener('click', () => {
  const c = $('shareCanvas'), fail = () => setShareMsg(['share.copyFail']);
  try{
    if(!navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem==='undefined') return fail();
    const png = new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('toBlob')), 'image/png'));
    navigator.clipboard.write([new ClipboardItem({'image/png': png})]).then(() => setShareMsg(['share.copied']), fail);
  }catch(e){ fail(); }
});
$('shareDl').addEventListener('click', () => {
  try{ const a = document.createElement('a'); a.download = shareModel ? shareModel.file : 'mishima-dojo.png'; a.href = $('shareCanvas').toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove(); }catch(e){ setShareMsg(['share.copyFail']); }
});
$('shareTweet').addEventListener('click', () => {
  if(!shareModel) return;
  try{ window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(shareModel.tweet), '_blank', 'noopener'); }catch(e){}
});

