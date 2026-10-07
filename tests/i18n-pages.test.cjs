// Languages and pages: dictionaries, notices, share cards, SEO/static head, localized pages and the Pages build.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {html, BANNED, boot, dash, F, kstToday} = require('./helpers/app.cjs');
test('language falls back to English without navigator.language and honours saved lang',()=>{
  const a=boot();assert.equal(a.store.lang,'en');assert.equal(a.get('dName').textContent,'Free practice');
  const b=boot({v:4,lang:'ja'});assert.equal(b.store.lang,'ja');assert.equal(b.get('dName').textContent,'自由練習');
  const c=boot({v:4,lang:'xx'});assert.equal(c.store.lang,'en');
});
test('switching language re-renders result, coach, log and records in place',()=>{
  const a=boot({v:4,lang:'ko',records:{wave10:[{date:0,score:4.2,dashes:42,chain:9,label:'x',sub:'y'}],ewgf20:[{date:0,score:80,hits:16,target:20,mean:5,label:'80%',sub:'old'}],combo10:[]}});
  dash(a);a.onButton(2,1090);
  assert.equal(a.get('rTitle').textContent,'풍신권');assert.ok(a.get('logBody').innerHTML.includes('풍신권(늦음)'));
  assert.ok(a.get('bests').innerHTML.includes('4.2 대시/초'));assert.ok(a.get('bests').innerHTML.includes('16/20 · 평균'));
  a.setLang('en');
  assert.equal(a.store.lang,'en');assert.equal(a.get('rTitle').textContent,'Wind God Fist');
  assert.ok(a.get('coachMsg').innerHTML.startsWith('So close.'));assert.ok(a.get('logBody').innerHTML.includes('WGF (late)'));
  assert.ok(a.get('bests').innerHTML.includes('4.2 dashes/s'));assert.ok(a.get('bests').innerHTML.includes('16/20 · avg'));
  a.setLang('ja');assert.equal(a.get('rTitle').textContent,'風神拳');assert.equal(a.get('dName').textContent,'自由練習');
  a.setLang('nope');assert.equal(a.store.lang,'ja');
});
test('every dictionary key exists in all three languages',()=>{
  const a=boot();const langs=['ko','en','ja'];
  for(const l of langs){a.setLang(l);assert.equal(a.T('app.title')!=='app.title',true);}
  for(const key of ['a.ewgf.title','trend.stable','set.padNote','footer','mode.combo10.desc']){for(const l of langs){a.setLang(l);assert.notEqual(a.T(key),key);}}
});
test('each locale declares each translation key only once',()=>{
  for(const lang of ['ko','en','ja']){
    const dictionary=fs.readFileSync(require('node:path').join(__dirname,'../src/i18n',lang+'.js'),'utf8');
    const keys=[...dictionary.matchAll(/(?:^|[,\n])\s*(['"])([a-z][\w.]+)\1\s*:/g)].map(m=>m[2]);
    assert.ok(keys.length>500,lang+' source key scan covers the dictionary');
    assert.deepEqual(keys.filter((key,index)=>keys.indexOf(key)!==index),[],lang+' has duplicate keys that silently overwrite translations');
  }
});
test('the three dictionaries share exactly the same key set',()=>{
  const {I18N}=boot();const ko=Object.keys(I18N.ko).sort();
  for(const l of ['en','ja']) assert.deepEqual(Object.keys(I18N[l]).sort(),ko,'keys differ in '+l);
});
test('announcements render in every language and persist the latest read marker',()=>{
  let saved;
  const a=boot({v:4,lang:'ko'},undefined,{localStorage:{getItem:()=>JSON.stringify({v:4,lang:'ko'}),setItem:(k,v)=>saved=JSON.parse(v)}});
  assert.deepEqual(Array.from(a.NOTICES,n=>n.id),['2026-10-04-backdash','2026-09-30-roundup','2026-09-21-roundup','2026-09-21-mist','2026-09-19-dojo','2026-09-15-notices']);assert.equal(a.NOTICES[0].items.length,4);assert.equal(a.NOTICES.find(n=>n.id==='2026-09-30-roundup').highlight.items.length,2);assert.equal(a.get('noticeBadge').hidden,false);assert.match(a.get('noticeList').innerHTML,/9월 15일 기능 업데이트/);
  assert.ok(a.get('noticeList').innerHTML.includes(a.T(a.NOTICES[0].title)));
  a.setMode('wave10');a.startTrial();a.openNotices();
  assert.equal(a.get('noticeDlg').open,true);assert.equal(a.trial.cdTimer,null,'opening an announcement cancels a countdown');
  assert.equal(a.store.noticeSeen,a.NOTICE_LATEST);assert.equal(saved.noticeSeen,a.NOTICE_LATEST);assert.equal(a.get('noticeBadge').hidden,true);
  a.setLang('en');assert.match(a.get('noticeList').innerHTML,/September 15 feature update/);
  a.setLang('ja');assert.match(a.get('noticeList').innerHTML,/9月15日 機能アップデート/);
  for(const lang of ['ko','en','ja']){
    a.setLang(lang);
    for(const notice of a.NOTICES){
      const keys=[notice.title,notice.summary,...notice.items];
      if(notice.highlight)keys.push(notice.highlight.title,notice.highlight.summary,...notice.highlight.items);
      for(const key of keys)assert.ok(a.get('noticeList').innerHTML.includes(a.T(key)),lang+' '+key);
    }
    if(lang!=='ja')assert.doesNotMatch(a.get('noticeList').innerHTML,/[\u3040-\u30ff]/,lang+' notices must not be overwritten by Japanese');
  }
  const previous=boot({v:4,noticeSeen:'2026-09-30-wedding'});assert.equal(previous.get('noticeBadge').hidden,false);assert.equal(previous.noticeAutoTry(),true);assert.equal(previous.store.noticeSeen,a.NOTICE_LATEST);
  const read=boot({v:4,noticeSeen:a.NOTICE_LATEST});assert.equal(read.get('noticeBadge').hidden,true);
  const invalid=boot({v:4,noticeSeen:'removed-notice'});assert.equal(invalid.store.noticeSeen,'');assert.equal(invalid.get('noticeBadge').hidden,false);
});
test('announcement dates are formatted as date-only values in UTC',()=>{
  let options;
  function DateTimeFormat(locale,opts){options=opts;return {format:()=> 'fixed date'};}
  const a=boot(undefined,undefined,{Intl:{DateTimeFormat}});
  assert.equal(options.timeZone,'UTC');assert.match(a.get('noticeList').innerHTML,/fixed date/);
});
test('a new announcement auto-opens once for returning browsers, but not on their first visit or during play',()=>{
  const first=boot();assert.equal(first.hadStore,false);assert.equal(first.noticeAutoTry(),false);assert.equal(!!first.get('noticeDlg').open,false);
  const returning=boot({v:4});assert.equal(returning.hadStore,true);assert.equal(returning.noticeAutoTry(),true);assert.equal(returning.get('noticeDlg').open,true);assert.equal(returning.store.noticeSeen,returning.NOTICE_LATEST);
  const busy=boot({v:4});busy.setMode('wave10');busy.startTrial();assert.equal(busy.noticeAutoTry(),false);assert.equal(!!busy.get('noticeDlg').open,false);assert.notEqual(busy.trial.cdTimer,null,'automatic notice never cancels an active countdown');
  const read=boot({v:4,noticeSeen:returning.NOTICE_LATEST});assert.equal(read.noticeAutoTry(),false);assert.equal(!!read.get('noticeDlg').open,false);
});
test('histBins puts offsets on the window boundary inside and just outside in the late bin',()=>{
  const a=boot();const bins=a.histBins([{off:0},{off:-12},{off:12},{off:13},{off:null}],12);
  assert.equal(bins.length,16);assert.equal(bins[0].f,-6);assert.equal(bins[15].f,9);
  assert.equal(bins[6].n,1);assert.equal(bins[6].kind,'ewgf');assert.equal(bins[5].n,1);assert.equal(bins[5].kind,'early');
  assert.equal(bins[7].n,2);assert.equal(bins[7].kind,'wgf');assert.equal(bins.reduce((s,b)=>s+b.n,0),4);
  assert.equal(a.histBins([{off:30}],8)[8].kind,'wgf');assert.equal(a.histBins([],8)[4].kind,'early');
});
test('wave10 trial result becomes a share card model in the current language',()=>{
  const a=boot({v:4,lang:'ko'});assert.equal(a.get('dShare').hidden,false);
  a.setMode('wave10');assert.equal(a.get('dShare').hidden,true);assert.equal(a.get('dShare').textContent,'공유 카드');
  a.startTrial();const countdown=a.timers.get(a.trial.cdTimer);a.time(4000);countdown();countdown();countdown();
  dash(a,4100);a.onDir('f',4200);a.onDir('n',4220);dash(a,4240);
  assert.equal(a.shareSource(),null);
  a.endTrial();assert.equal(a.trial.result.rec.dashes,2);assert.equal(a.get('dShare').hidden,false);
  const src=a.shareSource();assert.equal(src.kind,'trial');assert.equal(src.cycles.length,1);
  const m=a.buildCard(src);
  assert.equal(m.app,'미시마 도장');assert.equal(m.modeName,'웨이브 10초');assert.equal(m.hero.value,'0.2');assert.equal(m.hero.label,'대시/초');
  assert.equal(m.chart.type,'wave');assert.equal(m.chart.pts.length,1);assert.equal(m.url,a.SITE_URL);
  assert.deepEqual(Array.from(m.metrics,x=>x.value),['2','2','0']);assert.equal(m.windowText,'초풍 판정 60Hz 동일 프레임');
  assert.ok(m.tweet.includes('0.2 대시/초'));assert.ok(m.tweet.includes('최고 연속 2'));assert.ok(m.tweet.endsWith('\n'+a.SITE_URL));
  assert.match(m.file,/^mishima-dojo-wave10-\d{8}\.png$/);
  a.setLang('en');const e=a.buildCard(src);assert.equal(e.modeName,'Wave 10s');assert.equal(e.sub,'10s over · 2 dashes (0.2 dashes/s)');assert.equal(e.hero.label,'dashes/s');
  a.startTrial();assert.equal(a.trial.result,null);assert.equal(a.get('dShare').hidden,true);
});
test('completed EWGF card uses fixed frame rule despite legacy saved window',()=>{
  const a=boot({v:4,lang:'ko',window:12});a.setMode('ewgf20');a.startTrial();
  const countdown=a.timers.get(a.trial.cdTimer);a.time(4000);countdown();countdown();countdown();
  for(let i=0;i<20;i++){a.clearCommand();dash(a,4100+i*200);a.onButton(2,4170+i*200);}
  assert.equal(a.trial.running,false);assert.equal(a.trial.result.rec.hits,20);
  a.store.window=8;
  const src=a.shareSource(), m=a.buildCard(src);
  assert.equal(src.window,12);assert.equal(m.hero.value,'100%');
  assert.equal(m.windowText,'초풍 판정 60Hz 동일 프레임');assert.match(m.tweet,/60Hz 동일 프레임/);
  assert.equal(m.chart.window,F/2);
});
test('wave trial card counts only attempts made during the completed trial',()=>{
  const a=boot({v:4,lang:'ko'});dash(a);a.onButton(2,1060);
  a.setMode('wave10');a.startTrial();
  const countdown=a.timers.get(a.trial.cdTimer);a.time(4000);countdown();countdown();countdown();
  dash(a,4100);a.onButton(2,4160);a.endTrial();
  a.clearCommand();dash(a,4500);a.onButton(2,4560);
  assert.equal(a.session.attempts.length,3);
  const src=a.shareSource(), m=a.buildCard(src);
  assert.equal(src.attempts.length,1);assert.equal(src.attempts[0].t,4160);
  assert.equal(m.metrics[2].value,'1');
});
test('free-practice session card uses live stats and never leaks raw i18n keys',()=>{
  const a=boot({v:4,lang:'ko'});
  let m=a.buildCard(a.shareSource());assert.equal(m.hero.label,'최고 대시/초');assert.equal(m.chart,null);assert.equal(m.sub,'이번 세션 통계');
  dash(a);a.onButton(2,1060);
  const expect={ko:['초풍 성공률','자유 연습'],en:['EWGF success rate','Free practice'],ja:['最風成功率','自由練習']};
  for(const l of ['ko','en','ja']){
    a.setLang(l);m=a.buildCard(a.shareSource());
    assert.equal(m.hero.value,'100%');assert.equal(m.hero.label,expect[l][0]);assert.equal(m.modeName,expect[l][1]);
    assert.equal(m.chart.type,'hist');assert.equal(m.chart.bins.reduce((s,b)=>s+b.n,0),1);assert.equal(m.metrics.length,4);
    for(const s of [m.sub,m.hero.label,m.windowText,m.tweet,...m.metrics.flatMap(x=>[x.label,x.value])]) assert.doesNotMatch(s,/(^|\s)(card|share|set|mode|rec)\.[a-zA-Z0-9]+/);
  }
  assert.equal(m.metrics[0].value,'1 / 1');
});
test('OG card model has tagline and chart but no personal numbers, in all three languages',()=>{
  const a=boot({v:4,lang:'ko'});
  const names={ko:['미시마 도장','철권 초풍·웨이브 대시 연습'],en:['Mishima Dojo','Tekken EWGF & wave dash practice'],ja:['三島道場','鉄拳 最風・ウェーブ練習']};
  for(const l of ['ko','en','ja']){
    a.setLang(l);const m=a.buildOgCard();
    assert.equal(m.app,names[l][0]);assert.equal(m.tagline[0],names[l][1]);assert.equal(m.tagline.length,2);
    assert.equal(m.hero,null);assert.equal(m.metrics.length,0);assert.equal(m.url,a.SITE_URL);
    assert.equal(m.chart.type,'hist');assert.equal(m.chart.window,a.store.window);assert.equal(m.chart.bins.reduce((s,b)=>s+b.n,0),40);
    assert.equal(m.chips.map(c=>c.cmd).join(' '),'6N23 6N23+2');assert.equal(m.modeName,m.chips.map(c=>c.cmd+' '+c.tag).join(' · '));
    for(const s of [m.modeName,m.keywords,m.note,m.windowText,m.dateText,...m.tagline,...m.chips.map(c=>c.tag)]) assert.doesNotMatch(s,/(^|\s)(og|app|card)\.[a-zA-Z0-9]+/);
    assert.notEqual(a.T('app.docTitle'),a.T('app.title'));assert.ok(a.T('app.docTitle').startsWith(a.T('app.title')));
  }
});
test('static head carries the SEO and Open Graph tags that crawlers read without JS',()=>{
  const head=html.slice(0,html.indexOf('<style>'));
  const a=boot({v:4,lang:'ko'}), url=a.SITE_URL;
  // static <title> = Korean doc title + English suffix, so the crawler title and the in-app title cannot drift apart
  assert.ok(head.includes(`<title>${a.T('app.docTitle')} (Mishima Dojo EWGF Trainer)</title>`));
  assert.equal(head.match(/<meta name="twitter:/g).length,1,'X falls back to og:* tags; keep only twitter:card');
  assert.match(head,/<meta name="description" content="[^"]{80,300}">/);
  assert.match(head,/<meta name="robots" content="index,follow">/);
  assert.ok(head.includes(`<link rel="canonical" href="${url}">`));
  assert.ok(head.includes(`<meta property="og:url" content="${url}">`));
  assert.ok(head.includes(`<meta property="og:image" content="${url}og.png">`));
  assert.ok(head.includes('<meta property="og:image:width" content="1200">'));assert.ok(head.includes('<meta property="og:image:height" content="630">'));
  assert.ok(head.includes('<meta name="twitter:card" content="summary_large_image">'));
  const bg=html.match(/:root\{[^}]*--bg:(#[0-9A-Fa-f]{6})/)[1];assert.ok(head.includes(`<meta name="theme-color" content="${bg}">`));
  assert.equal(head.includes('http://'),false,'head must not contain http://');
  // Only the approved AdSense loader, JSON-LD data and the single inline app script are allowed.
  assert.deepEqual(html.match(/<script\b[^>]*>/g),['<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8394509799881324" crossorigin="anonymous">', '<script type="application/ld+json">', '<script>'],'only the approved AdSense loader, JSON-LD and inline app script');
  const ldm=head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);assert.ok(ldm,'the JSON-LD block sits in the head');
  const ld=JSON.parse(ldm[1]);
  assert.equal(ld['@type'],'WebApplication');assert.equal(ld.url,url);assert.equal(ld.image,url+'og.png');assert.equal(ld.isAccessibleForFree,true);
  assert.deepEqual(ld.inLanguage,['ko','en','ja']);assert.ok(ld.name.includes(a.T('app.title')));
  assert.equal(ld.description,head.match(/<meta name="description" content="([^"]*)">/)[1],'JSON-LD description is the meta description, not a third copy');
  // robots.txt is a static crawler file at the site root; sitemap.xml is generated by the build from the same page list (2026-10-01)
  const root=f=>fs.readFileSync(require('node:path').join(__dirname,'..',f),'utf8');
  assert.ok(root('robots.txt').includes(`Sitemap: ${url}sitemap.xml`),'robots.txt points at the sitemap on the canonical host');
  const {sitemap,contentSources}=require('../tools/build-site');
  const sm=sitemap(html), slugs=contentSources().slugs;
  assert.deepEqual(sm.match(/<loc>[^<]*<\/loc>/g),[url,url+'ko/',url+'en/',url+'ja/',...slugs.flatMap(s=>['ko','en','ja'].map(l=>url+l+'/'+s))].map(u=>`<loc>${u}</loc>`),'sitemap lists the root app, three language apps and every guide/privacy page');
  // lastmod (2026-10-01): only articles carry one, equal to that page's own `updated`, which the page also shows. The app URLs have no
  // honest edit date, so none. changefreq stays out (Google ignores it).
  assert.doesNotMatch(sm,/<changefreq>/,'no changefreq');
  for(const b of sm.match(/<url>[\s\S]*?<\/url>/g)){
    const loc=b.match(/<loc>([^<]*)<\/loc>/)[1], lastmod=b.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1], m=loc.slice(url.length).match(/^(ko|en|ja)\/(.+)$/);
    if(!m){assert.equal(lastmod,undefined,loc+' (app) has no lastmod');continue;}
    const page=contentSources().pages[m[1]].pages.find(p=>p.slug===m[2]);
    assert.equal(lastmod,page.updated,loc+' lastmod is the page date');
    const built=require('../tools/build-site').contentPage(html,m[1],m[2]);
    assert.ok(built.includes(': '+page.updated+'</p>')&&built.includes('"dateModified":"'+page.updated+'"'),loc+' shows the same date');
  }
  assert.match(html,/document\.title = T\('app\.docTitle'\)/);
});
test('localized static descriptions match the app dictionary and all pages reference the shared PNG icon',()=>{
  const path=require('node:path'), root=path.resolve(__dirname,'..'), a=boot();
  const png=fs.readFileSync(path.join(root,'favicon.png'));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const width=png.readUInt32BE(16), height=png.readUInt32BE(20);
  assert.ok(width>0);assert.equal(width,height,'the icon is square');
  for(const [lang,file] of [['ko','index.html'],['en','en/index.html'],['ja','ja/index.html']]){
    const filename=path.join(root,file), src=file==='index.html'?html:require('../tools/build-site').localizedPage(html,lang);
    a.setLang(lang);
    for(const attr of ['name="description"','property="og:description"']){
      assert.equal(src.match(new RegExp('<meta '+attr+' content="([^"]*)"'))?.[1],a.T('app.description'),file+' '+attr);
    }
    const icon=src.match(/<link\b[^>]*rel="icon"[^>]*>/)?.[0];assert.ok(icon,file+' has an icon');
    const href=icon.match(/href="([^"]+)"/)?.[1];assert.ok(href);
    assert.equal(path.resolve(path.dirname(filename),href),path.join(root,'favicon.png'),file+' icon path');
    assert.equal(icon.match(/sizes="([^"]+)"/)?.[1],width+'x'+height,file+' declared icon size');
  }
});
test('language URLs override saved/browser language and settings preserve the active session',()=>{
  for(const lang of ['ko','en','ja']){
    const changed=[];
    const env={pageLang:lang,URLSearchParams,navigator:{language:'en-US',getGamepads:()=>[]},
      location:{pathname:'/'+lang+'/',search:'?ref=test&lang=en',hash:'#about'},
      window:{history:{replaceState:(_,__,url)=>changed.push(url)}}};
    const a=boot({v:4,lang:lang==='ja'?'ko':'ja',nick:'tester',nickToken:'ab'.repeat(24),bgmVol:37},undefined,env);
    assert.equal(a.store.lang,lang,'explicit route wins, including legacy query');
    assert.equal(a.store.nick,'tester');assert.equal(a.store.bgmVol,37);
    assert.equal(a.DONATE.kakao.qr,'../donate-kakao.png');
    assert.equal(changed[0],'/'+lang+'/?ref=test#about','query removal keeps unrelated parameters');
    env.location.search='?ref=test';dash(a);const before=a.session.dashes;
    a.setLang('en');assert.equal(changed.at(-1),'../en/?ref=test#about');
    assert.equal(a.session.dashes,before,'switching language keeps current practice');
    assert.equal(a.document.title,a.I18N.en['app.docTitle']);
  }
  const automatic=boot(undefined,undefined,{navigator:{language:'ja-JP',getGamepads:()=>[]}});
  assert.equal(automatic.store.lang,'ja','root still detects the browser language');
  assert.equal(boot({v:4,lang:'ko'},undefined,{navigator:{language:'en-US',getGamepads:()=>[]}}).store.lang,'ko','root keeps saved preferences');
});
test('Pages build publishes only app assets, locale pages and the generated music catalog',()=>{
  const path=require('node:path'), {buildSite}=require('../tools/build-site');
  const {output}=buildSite();
  for(const lang of ['ko','en','ja'])assert.ok(fs.existsSync(path.join(output,lang,'index.html')));
  assert.equal(fs.readFileSync(path.join(output,'sitemap.xml'),'utf8'),require('../tools/build-site').sitemap(html),'generated sitemap');
  for(const lang of ['ko','en','ja'])for(const slug of require('../tools/build-site').contentSources().slugs)
    assert.ok(fs.existsSync(path.join(output,lang,slug,'index.html')),lang+'/'+slug);
  for(const name of ['CNAME','ads.txt','robots.txt','googlec1d8aba57474fdc5.html','naverc136a4867080d3062b3628800923af51.html','sfx/wave.mp3','donate-kakao.png'])
    assert.deepEqual(fs.readFileSync(path.join(output,name)),fs.readFileSync(path.join(__dirname,'..',name)),name);
  assert.deepEqual(fs.readFileSync(path.join(output,'sfx-wave.mp3')),fs.readFileSync(path.join(__dirname,'../sfx/wave.mp3')),'transition copy at the pre-2026-09-30 URL');
  for(const name of ['worker','tests','.agents','.sandbox','AGENTS.md','tools'])assert.equal(fs.existsSync(path.join(output,name)),false,name+' stays private to the repo');
  const tracks=JSON.parse(fs.readFileSync(path.join(output,'bgm/playlist.json'),'utf8'));
  assert.deepEqual(tracks,require('../tools/update-bgm').tracksAt(path.join(__dirname,'../bgm')));
  for(const track of tracks)assert.ok(fs.existsSync(path.join(output,track)));
});
test('search text: static localized apps, hreflang and legacy query override',()=>{
  const path=require('node:path');
  const a=boot({v:4,lang:'ko'});
  const u=a.SITE_URL, alt={ko:u+'ko/',en:u+'en/',ja:u+'ja/','x-default':u};
  const MODES=['mode.wave10.name','mode.ewgf20.name','mode.combo10.name','mode.rush30.name','mode.bd10.name'];
  const pages={'index.html':html};
  for(const l of ['ko','en','ja']) pages[l+'/index.html']=require('../tools/build-site').localizedPage(html,l);
  for(const [name,page] of Object.entries(pages)){
    const head=page.slice(0,page.indexOf('<style>'));
    for(const [l,h] of Object.entries(alt)) assert.ok(head.includes(`<link rel="alternate" hreflang="${l}" href="${h}">`),name+' hreflang '+l);
    assert.equal((head.match(/rel="canonical"/g)||[]).length,1,name+' has exactly one canonical');
    assert.equal(head.includes('http://'),false,name+' head must not contain http://');
  }
  for(const l of ['ko','en','ja']){
    const page=pages[l+'/index.html'], markup=page.slice(0,page.indexOf('<script>'));
    assert.ok(page.includes(`<html lang="${l}" data-page-lang="${l}">`));
    assert.ok(page.includes(`<link rel="canonical" href="${alt[l]}">`));
    assert.deepEqual(page.match(/<script\b[^>]*>/g),html.match(/<script\b[^>]*>/g),'all pages contain the app and approved scripts');
    assert.equal(page.slice(page.indexOf('<script>')),html.slice(html.indexOf('<script>')),'one identical app script');
    assert.ok(markup.includes('id="stage"'),'practice canvas, not a landing page');
    assert.ok(markup.includes('href="../favicon.png"'));
    for(const lang of ['ko','en','ja'])assert.ok(markup.includes(`href="../${lang}/"`));
    assert.ok(markup.includes('href="#histCard"'),'fragment links stay on this page');
    const ld=JSON.parse(markup.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(ld.url,alt[l]);assert.equal(ld.inLanguage,l);assert.equal(ld.description,a.I18N[l]['app.description']);
    assert.doesNotMatch(markup,BANNED);
    for(const k of MODES)assert.ok(markup.includes(a.I18N[l][k]),'localized mode names before JS');
    assert.ok(markup.includes(a.I18N[l]['about.what.p']),'localized introduction before JS');
  }
  // sitemap: the app URLs carry the same four hreflang alternates as the app heads (decision 4(single-page)); each guide/privacy
  // URL carries its own ko/en/ja pages with x-default = English, exactly as that page's head does
  const {sitemap,contentSources,contentPage}=require('../tools/build-site'), content=contentSources();
  const sm=sitemap(html,content);
  assert.ok(sm.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'),'sitemap declares the xhtml namespace for hreflang links');
  const blocks=sm.match(/<url>[\s\S]*?<\/url>/g)||[];
  const locOf=b=>b.match(/<loc>([^<]*)<\/loc>/)[1];
  const linksOf=text=>{const links={};for(const m of text.matchAll(/<(?:xhtml:)?link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/?>/g))links[m[1]]=m[2];return links;};
  assert.deepEqual(blocks.slice(0,4).map(locOf),[u,alt.ko,alt.en,alt.ja],'sitemap starts with the app and the three language apps');
  for(const b of blocks.slice(0,4))assert.deepEqual(linksOf(b),alt,'sitemap hreflang set for '+locOf(b));
  for(const b of blocks.slice(4)){
    const loc=locOf(b), [, lang, slug]=loc.slice(u.length).match(/^(ko|en|ja)\/(.*)$/);
    const page=contentPage(html,lang,slug,content);
    assert.ok(page.includes(`<link rel="canonical" href="${loc}">`),loc+' canonical');
    assert.deepEqual(linksOf(b),linksOf(page.slice(0,page.indexOf('<style>'))),loc+' sitemap alternates equal the page head');
  }
  // about block: crawlable Korean text in the markup equals the ko dictionary, sits before the footer; every about.* key exists in all three languages and quotes real labels
  const keys=Object.keys(a.I18N.ko).filter(k=>k.startsWith('about.'));
  assert.ok(keys.length>=19,'about.* keys present');
  for(const k of keys) assert.ok(html.includes(`data-i18n="${k}">${a.T(k)}<`),k+' static text matches the ko dictionary');
  const about=html.indexOf('<details class="about" id="about">');assert.ok(about>0&&about<html.indexOf('<footer>'),'about block sits right above the footer');
  for(const l of ['ko','en','ja']){ const D=a.I18N[l];
    for(const k of keys){ assert.equal(typeof D[k],'string',l+' '+k); assert.doesNotMatch(D[k],BANNED,l+' '+k+' uses no official character names'); }
    assert.match(D['about.what.p'],/8/,l+' about text names Tekken 8');
    for(const k of MODES) assert.ok(D['about.modes.p'].includes(D[k]),l+' about.modes.p names the mode as the app does: '+D[k]);
    for(const k of ['r.noCancel.title','fault.cancel_as_start.title']) assert.ok(D['about.a2'].includes(D[k]),l+' about.a2 quotes the real fault label: '+D[k]);
  }
  // ?lang= is a one-shot command: it beats the saved language, is saved at once and removed from the URL; junk is ignored. visitDay=today keeps bumpVisitDay from saving on its own.
  const env=(search,saves,replaced)=>({location:{search,pathname:'/',hash:''},URLSearchParams,window:{history:{replaceState:(s,t,url)=>replaced.push(url)}},
    localStorage:{getItem:()=>JSON.stringify({v:4,lang:'ko',visitDay:kstToday()}),setItem:(k,v)=>saves.push(JSON.parse(v).lang)}});
  let saves=[],replaced=[];
  const b=boot(undefined,undefined,env('?lang=ja',saves,replaced));assert.equal(b.store.lang,'ja');assert.deepEqual(saves,['ja'],'saved at once');assert.deepEqual(replaced,['/'],'parameter dropped from the URL');
  saves=[];replaced=[];
  const c=boot(undefined,undefined,env('?lang=xx',saves,replaced));assert.equal(c.store.lang,'ko');assert.deepEqual(saves,[]);assert.deepEqual(replaced,[],'junk leaves the URL alone');
  const d=boot({v:4,lang:'en'},undefined,{location:{search:'',pathname:'/',hash:''},URLSearchParams});assert.equal(d.store.lang,'en');
});
test('guide and privacy pages: same slugs in every language, crawlable text, approved scripts only, working links',()=>{
  const path=require('node:path'), {contentSources,contentPage,buildSite}=require('../tools/build-site');
  const content=contentSources(), a=boot();
  assert.ok(content.slugs.includes('privacy/')&&content.slugs.includes('guide/'),'privacy policy and guide index exist');
  const {output}=buildSite();
  const text=page=>page.slice(page.indexOf('<article>'),page.indexOf('</article>')).replace(/<[^>]+>/g,'').replace(/\s+/g,'');
  for(const lang of ['ko','en','ja'])for(const slug of content.slugs){
    const page=contentPage(html,lang,slug,content), head=page.slice(0,page.indexOf('<style>')), where=lang+'/'+slug;
    assert.ok(page.startsWith('<!doctype html>')&&page.includes(`<html lang="${lang}">`),where+' document');
    assert.equal((head.match(/rel="canonical"/g)||[]).length,1,where+' one canonical');
    assert.equal(head.includes('http://'),false,where+' head has no http://');
    assert.deepEqual(page.match(/<script\b[^>]*>/g),['<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8394509799881324" crossorigin="anonymous">','<script type="application/ld+json">'],where+' only the AdSense loader and JSON-LD (decision 4(single-page))');
    const ld=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(ld.url,a.SITE_URL+lang+'/'+slug);assert.equal(ld.inLanguage,lang);
    assert.doesNotMatch(page,BANNED,where+' uses no official character names (decision 3(no-official-ip))');
    assert.doesNotMatch(page,/href="@/,where+' every @ link was resolved');
    // The only embed allowed is the operator's YouTube video in privacy-enhanced mode, lazy-loaded (decision 4(single-page)).
    for(const [frame] of page.matchAll(/<iframe\b[^>]*>/g))assert.match(frame,/^<iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}" title="[^"]+" loading="lazy"/,where+' iframe');
    assert.ok(page.includes('mailto:tlstjdgus3@gmail.com'),where+' shows the contact address');
    // Substance, not a stub: AdSense rejects thin pages. Japanese/Korean count characters, English counts more of them.
    assert.ok(text(page).length>(lang==='en'?1800:900),where+' has real article text: '+text(page).length);
    const file=path.join(output,lang,slug,'index.html');
    assert.equal(fs.readFileSync(file,'utf8'),page,where+' is what the build wrote');
    for(const [, href] of page.matchAll(/\bhref="(?![a-z]+:|#)([^"]+)"/g)){
      const target=path.resolve(path.dirname(file),href);
      assert.ok(fs.existsSync(href.endsWith('/')?path.join(target,'index.html'):target),where+' link '+href);
    }
  }
  const privacy=contentPage(html,'ko','privacy/',content);
  assert.ok(contentPage(html,'en','guide/wsc/',content).includes('youtube-nocookie.com/embed/bu4R8n7Y4J4'),'WSC guide embeds the operator video');
  for(const needle of ['youtube-nocookie.com','adssettings.google.com','localStorage','Cloudflare','Google Fonts'])assert.ok(privacy.includes(needle),'privacy policy covers '+needle);
  // The app links to the pages in the visitor's language: root page = ko, localized pages rewrite to their own language.
  assert.ok(html.includes('href="ko/privacy/" data-page="privacy/"'));
  const en=require('../tools/build-site').localizedPage(html,'en');
  assert.ok(en.includes('href="../en/privacy/" data-page="privacy/"')&&en.includes('href="../en/guide/ewgf/" data-page="guide/ewgf/"'));
});
test('each mode has a ? guide link to a real article, and the preview server opens folder URLs like GitHub Pages',async t=>{
  const path=require('node:path'), {contentSources,buildSite}=require('../tools/build-site'), slugs=contentSources().slugs;
  for(const lang of ['ko','en','ja']){
    const a=boot({v:4,lang});
    for(const m of Object.keys(a.MODES)){
      assert.ok(slugs.includes(a.MODES[m].guide),m+' guide '+a.MODES[m].guide+' is a built page');
      a.setMode(m);
      assert.equal(a.get('dGuide').dataset.page,a.MODES[m].guide,m+' ? button follows the mode');
    }
  }
  assert.ok(html.includes('id="dGuide" href="ko/guide/" data-page="guide/" target="_blank"'),'opens in a new tab so the practice session survives');
  buildSite();
  const {resolve,createServer,ROOT}=require('../tools/serve');
  assert.equal(resolve('/ko/guide/').file,path.join(ROOT,'ko','guide','index.html'));
  assert.equal(resolve('/').file,path.join(ROOT,'index.html'));
  assert.deepEqual(resolve('/ko/guide'),{redirect:'/ko/guide/'},'folder without slash redirects like Pages');
  assert.equal(resolve('/../AGENTS.md'),null,'no escape from _site/');
  assert.equal(resolve('/nope/'),null);
  assert.deepEqual(resolve('/ko?lang=en&x=1'),{redirect:'/ko/?lang=en&x=1'},'redirect preserves query');
  assert.deepEqual(resolve('//ko'),{redirect:'/ko/'},'redirect remains on this origin');
  for(const bad of ['/ko/%0a/..','/ko%00','/%ZZ','/..%5cAGENTS.md'])assert.equal(resolve(bad),null,bad);
  const server=createServer();
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>new Promise(r=>server.close(r)));
  const request=pathname=>new Promise((resolve,reject)=>{
    require('node:http').get({host:'127.0.0.1',port:server.address().port,path:pathname},res=>{
      let body='';res.setEncoding('utf8');res.on('data',s=>body+=s);
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));
      res.on('error',reject);
    }).on('error',reject);
  });
  assert.equal((await request('/ko/%0a/..')).status,404,'bad redirect input does not crash the server');
  const redirect=await request('//ko?x=1');
  assert.equal(redirect.status,301);assert.equal(redirect.headers.location,'/ko/?x=1');
  const read=fs.createReadStream;
  const mocked=t.mock.method(fs,'createReadStream',()=>read(path.join(ROOT,'missing-during-rebuild.html')));
  assert.equal((await request('/ko/')).status,404,'file removed between stat and open does not crash the server');
  mocked.mock.restore();
  const ok=await request('/ko/');assert.equal(ok.status,200);assert.ok(ok.body.startsWith('<!doctype html>'));
});

test('content validation rejects duplicate or unsafe slugs, missing copy and broken internal links',()=>{
  const {contentSources,validateContent}=require('../tools/build-site');
  for(const [mutate,error] of [
    [c=>c.ko.pages.push(c.ko.pages[0]),/duplicate slugs/],
    [c=>c.ko.pages[0].slug='../outside/',/invalid slug/],
    [c=>delete c.en.pages[0].title,/missing title/],
    [c=>c.ja.pages[0].body+='<a href="@guide/typo/">broken</a>',/unknown link/],
    [c=>c.en.ui.extra='extra',/ui keys differ/],
  ]){
    const copy=structuredClone(contentSources().pages);mutate(copy);
    assert.throws(()=>validateContent(copy),error);
  }
});

test('localized article links use data-page regardless of attribute order or old href',()=>{
  const {localizedPage}=require('../tools/build-site');
  const source=html.replace('href="ko/privacy/" data-page="privacy/"','data-page="privacy/" class="policy" href="ko/old/"');
  for(const lang of ['ko','en','ja'])assert.ok(localizedPage(source,lang).includes(`data-page="privacy/" class="policy" href="../${lang}/privacy/"`));
});
