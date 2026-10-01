/* ---------- language ---------- */
function applyStatic(){
  renderBgmPlayer();
  if(document.documentElement) document.documentElement.lang = store.lang;
  document.title = T('app.docTitle');
  document.querySelectorAll('meta[property="og:title"]').forEach(el => { el.content=T('app.docTitle'); });
  if(PAGE_LANG){
    const url=SITE_URL+store.lang+'/';
    document.querySelectorAll('link[rel="canonical"]').forEach(el => { el.href=url; });
    document.querySelectorAll('meta[property="og:url"]').forEach(el => { el.content=url; });
    document.querySelectorAll('meta[property="og:locale"]').forEach(el => { el.content=LOCALE[store.lang].replace('-','_'); });
  }
  document.querySelectorAll('meta[name="description"], meta[property="og:description"]').forEach(el => { el.content = T('app.description'); });
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = T(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = T(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = T(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', T(el.dataset.i18nAria)); });
  // Guide/privacy pages exist per language (tools/build-site.js); follow the language the visitor picked.
  document.querySelectorAll('[data-page]').forEach(el => { el.setAttribute('href', ASSET_ROOT+store.lang+'/'+el.dataset.page); });
  document.querySelectorAll('#langSel button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang===store.lang?'true':'false'));
  if(!lastSrc) srcBadge.textContent = T(touchOn ? 'src.waitTouch' : 'src.wait'); else setSrc(lastSrc);
}
function renderAll(){
  renderHistory();
  renderJackpot(); renderRewards();
  applyStatic(); renderMode(); renderPadStatus(); renderKeys(); renderTouchSettings();
  showResult(ui.result.cls, ui.result.kind, ui.result.title, ui.result.sub);
  setCoach(ui.coach); setTrend(ui.trend); renderSeg(ui.seg);
  renderBests(); renderLog(); renderHist(); renderWave();
  $('shareMsg').textContent = msg(ui.shareMsg); if($('shareDlg').open) renderShare();
  renderBoard(); renderTrialRank(); renderVisits(); renderPosts(); if(BOARD_URL) renderNick(); renderDonate(); renderNotices(); if($('fitDlg').open) renderFit();
  if(trial.running) trialTick(performance.now());
  renderWsc(); renderGp();
}
function setLang(l){
  if(!LANGS.includes(l)) return;
  if(PAGE_LANG && typeof location!=='undefined'){
    // Keep the current session, query and fragment; reload/bookmark now opens the selected language.
    try{ window.history.replaceState(null, '', '../'+l+'/'+location.search+location.hash); }catch(e){}
  }
  store.lang=l; save(); renderAll();
}
