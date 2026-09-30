/* ---------- share card: pure data model (no DOM, unit-tested) ---------- */
const SITE_URL = 'https://mishimaryu.com/';
function buildCard(src){
  // src: {kind:'trial'|'session', mode, rec?, attempts, cycles, session?, window, date}
  const m = src.mode, win = src.window ?? store.window, s = src.session || session;
  const winText = T('ewgf.grid'), modeName = T('mode.'+m+'.name');
  const metric = (k, v) => ({label:T(k), value:String(v)});
  const attempts = src.attempts || [], cycles = src.cycles || [];
  const bestChainOf = list => list.reduce((b,a)=>Math.max(b, a.chain||0), 0);
  let hero, metrics, chart, summary, sub;
  if(src.kind==='trial' && m==='wave10'){
    const r = src.rec, dps = (+r.score).toFixed(1), chain = r.chain||0;
    hero = {value:dps, label:T('card.dps')};
    metrics = [metric('card.dashes', r.dashes), metric('card.chain', chain), metric('card.tries', attempts.length)];
    chart = {type:'wave', pts:cycles.slice(-40).map(c=>c.dps), top:waveTop()};
    summary = T('rec.dps',dps)+' · '+T('rec.waveSub', r.dashes, chain);
    sub = T('trial.waveEnd', r.dashes, dps);
  } else if(src.kind==='trial' && m==='bd10'){
    const r = src.rec, dist = (+r.score).toFixed(1);
    hero = {value:dist+' m', label:T('card.dist')};
    metrics = [metric('card.backdashes', r.dashes||0), metric('card.top', r.top||0), metric('card.chain', r.chain||0)];
    chart = null;
    summary = T('rec.dist', dist)+' · '+T('rec.bdSub', r.dashes||0, r.top||0, r.chain||0);
    sub = T('trial.bdEnd', dist, r.dashes||0);
  } else if(src.kind==='trial' && m==='rush30'){
    const r = src.rec;
    hero = {value:String(r.score), label:T('card.pts')};
    metrics = [metric('card.kills', r.kills), metric('card.whiffs', r.whiffs), metric('card.dashPts', r.dashPts), metric('card.tries', attempts.length)];
    chart = cycles.length>=2 ? {type:'wave', pts:cycles.slice(-40).map(c=>c.dps), top:waveTop()} : null;
    summary = T('rec.pts', r.score)+' · '+T('rec.rushSub', r.kills, r.whiffs, r.dashPts);
    sub = T('trial.rushEnd', r.score, r.kills);
  } else if(src.kind==='trial'){
    const r = src.rec;
    hero = {value:r.score+'%', label:T('card.rate')};
    metrics = [metric('card.hits', r.hits+' / '+r.target), metric('card.mean', fmtF(r.mean)), metric('card.chain', bestChainOf(attempts))];
    chart = {type:'hist', bins:histBins(attempts, win), window:FRAME/2};
    summary = r.score+'% · '+T('rec.ewgfSub', r.hits, r.target, fmtF(r.mean));
    sub = T('trial.end', r.hits, r.target, r.score);
  } else {
    const rate = s.tries? Math.round(s.hits/s.tries*100)+'%' : null;
    const mean = s.offsetCount? fmtF(s.offsetSum/s.offsetCount) : '–';
    const dps = (+s.bestDps||0).toFixed(1);
    hero = rate!=null ? {value:rate, label:T('card.rate')} : {value:dps, label:T('card.bestDps')};
    metrics = rate!=null
      ? [metric('card.hits', s.hits+' / '+s.tries), metric('card.mean', mean), metric('card.bestDps', dps), metric('card.chain', s.bestChain)]
      : [metric('card.dashes', s.dashes), metric('card.chain', s.bestChain), metric('card.tries', s.tries), metric('card.mean', mean)];
    const withOff = attempts.filter(a=>a.off!=null).slice(-60);
    chart = withOff.length ? {type:'hist', bins:histBins(withOff, win), window:FRAME/2}
          : cycles.length>=2 ? {type:'wave', pts:cycles.slice(-40).map(c=>c.dps), top:waveTop()} : null;
    summary = rate!=null ? rate+' · '+T('rec.ewgfSub', s.hits, s.tries, mean) : T('rec.dps',dps)+' · '+T('rec.waveSub', s.dashes, s.bestChain);
    sub = T('card.session');
  }
  const rankText = src.rank ? T('card.rank', src.rank.rank, src.rank.total, pctTop(src.rank.rank, src.rank.total))+' · '+T('tier.'+tierOf(src.rank.rank, src.rank.total)+'.title') : '';
  const d = new Date(src.date || Date.now());
  const ymd = d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
  return {
    app:T('app.title'), modeName, sub, hero, metrics, chart,
    windowText:T('card.window', winText), dateText:d.toLocaleDateString(LOCALE[store.lang]), url:SITE_URL,
    rankText, tweet:T('card.tweet', modeName, summary, winText)+(rankText ? '\n'+rankText : '')+'\n'+SITE_URL, file:'mishima-dojo-'+m+'-'+ymd+'.png',
  };
}
function buildOgCard(){
  // Promotional card for og.png (tools/make-og.js), drawn by drawCard's `tagline` branch. Not called by the app itself.
  // No personal numbers: tagline instead of hero, chips instead of metric tiles, illustrative histogram only.
  // Slot reuse: dateText (top-right) shows the alternate app names, windowText (footer-left) the feature list.
  const offs = [-40,-28,-22,-18,-14,-12,-10,-9,-7,-6,-5,-4,-3,-2,-2,-1,-1,0,0,0,1,1,2,2,3,3,4,5,6,7,8,10,12,14,18,22,26,34,45,60];
  const chips = [{cmd:'6N23', tag:T('og.chipWave')}, {cmd:'6N23+2', tag:T('og.chipEwgf')}];
  return {
    style:'wood', app:T('app.title'), modeName:chips.map(c => c.cmd+' '+c.tag).join(' · '), sub:'', hero:null, metrics:[],
    tagline:[T('og.line1'), T('og.line2')], keywords:T('og.keywords'), note:T('app.tagline'), chips,
    chart:{type:'hist', bins:histBins(offs.map(off => ({off})), WINDOW_DEFAULT), window:WINDOW_DEFAULT},
    windowText:T('og.footer'), dateText:T('og.altNames'), url:SITE_URL,
  };
}

