// Dependency-free Pages build. src/ is the only app source (tools/assemble.js joins it into one page); never edit generated pages.
// Local preview: node tools/build-site.js, then node tools/serve.js (folder links require HTTP).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {tracksAt} = require('./update-bgm');
const {assemble} = require('./assemble');
const ROOT = path.resolve(__dirname, '..');
const LANGS = ['ko', 'en', 'ja'];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function dictionaries(source){
  // src/i18n/{ko,en,ja}.js define I18N_KO/EN/JA; src/js/04-i18n.js joins them into I18N right before T.
  const start=source.indexOf('const I18N_KO = {'), end=source.indexOf('\nconst T =',start);
  if(start<0||end<0)throw new Error('I18N source markers missing');
  return vm.runInNewContext(source.slice(start,end)+'\nI18N;',{}, {timeout:1000});
}

function localizedPage(source, lang){
  if(!LANGS.includes(lang))throw new Error('Unsupported page language: '+lang);
  const dict=dictionaries(source)[lang];
  const t=key=>{if(typeof dict[key]!=='string')throw new Error('Missing static translation: '+lang+' '+key);return dict[key];};
  const split=source.indexOf('<script>');
  if(split<0)throw new Error('App script missing');
  // Translate only authored markup. The inline app and its dictionaries stay byte-identical.
  let markup=source.slice(0,split);
  markup=markup.replace(/(<([a-z][\w-]*)\b[^>]*\bdata-i18n(-html)?="([^"]+)"[^>]*>)[\s\S]*?<\/\2>/gi,
    (_,open,tag,isHtml,key)=>open+(isHtml?t(key):escape(t(key)))+'</'+tag+'>');
  markup=markup.replace(/<[a-z][^>]*\bdata-i18n-(?:title|aria)="[^"]+"[^>]*>/gi, tag=>{
    for(const [kind,attr] of [['title','title'],['aria','aria-label']]){
      const key=tag.match(new RegExp('data-i18n-'+kind+'="([^"]+)"'))?.[1];
      if(!key)continue;
      const pattern=new RegExp(' '+attr+'="[^"]*"');
      const value=' '+attr+'="'+escape(t(key))+'"';
      tag=pattern.test(tag)?tag.replace(pattern,()=>value):tag.replace(/>$/,value+'>');
    }
    return tag;
  });
  const site=source.match(/<link rel="canonical" href="([^"]+)">/)[1], url=site+lang+'/';
  markup=markup.replace('<html lang="ko">',`<html lang="${lang}" data-page-lang="${lang}">`)
    .replace(/<title>[^<]*<\/title>/,()=>'<title>'+escape(t('app.docTitle'))+'</title>')
    .replace(/<link rel="canonical" href="[^"]+">/,()=>`<link rel="canonical" href="${url}">`)
    .replace(/<meta (name="description"|property="og:description") content="[^"]*">/g,(_,attr)=>`<meta ${attr} content="${escape(t('app.description'))}">`)
    .replace(/<meta property="og:title" content="[^"]*">/,()=>`<meta property="og:title" content="${escape(t('app.docTitle'))}">`)
    .replace(/<meta property="og:site_name" content="[^"]*">/,()=>`<meta property="og:site_name" content="${escape(t('app.title'))}">`)
    .replace(/<meta property="og:image:alt" content="[^"]*">/,()=>`<meta property="og:image:alt" content="${escape(t('app.docTitle'))}">`)
    .replace(/<meta property="og:url" content="[^"]*">/,()=>`<meta property="og:url" content="${url}">`)
    .replace(/<meta property="og:locale(?:\:alternate)?" content="[^"]*">\s*/g,'');
  const locales={ko:'ko_KR',en:'en_US',ja:'ja_JP'};
  markup=markup.replace('</head>',LANGS.map(l=>`<meta property="og:locale${l===lang?'':':alternate'}" content="${locales[l]}">`).join('\n')+'\n</head>');
  markup=markup.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/,(_,json)=>{
    const data=JSON.parse(json);
    Object.assign(data,{name:t('app.title'),url,inLanguage:lang,description:t('app.description')});
    return '<script type="application/ld+json">'+JSON.stringify(data).replace(/</g,'\\u003c')+'</script>';
  });
  // Guide/privacy links name the root page's language (ko/); point them at this page's language before the prefix below.
  markup=markup.replace(/<a\b[^>]*\bdata-page="([^"]*)"[^>]*>/g,(tag,slug)=>
    tag.replace(/\bhref="[^"]*"/,()=>`href="${lang}/${escape(slug)}"`));
  // Leave #anchors local to the page; only relative assets/language links need the parent prefix.
  markup=markup.replace(/\b(href|src)="(?![a-z]+:|\/|#)([^"\s]+)"/gi,(_,attr,value)=>`${attr}="../${value}"`);
  return markup+source.slice(split);
}

// ---------- guide and privacy pages (src/pages/{ko,en,ja}.js, 2026-10-01 decision 4(single-page)) ----------
// Static articles next to the app, written for readers and search engines. The app stays one page; these carry no app script.
const CONTENT_UPDATED='2026-10-04'; // bump when the copy in src/pages/ changes materially
const LANG_NAMES={ko:'한국어',en:'English',ja:'日本語'};
function contentSources(){
  const out={};
  for(const lang of LANGS){
    const file=path.join(ROOT,'src','pages',lang+'.js');
    delete require.cache[require.resolve(file)];
    out[lang]=require(file);
  }
  return validateContent(out);
}

function validateContent(out){
  const slugs=out.ko.pages.map(p=>p.slug);
  const uiKeys=Object.keys(out.ko.ui).sort();
  for(const lang of LANGS){
    const where='src/pages/'+lang+'.js';
    const own=out[lang].pages.map(p=>p.slug);
    if(new Set(own).size!==own.length)throw new Error(where+' has duplicate slugs');
    for(const page of out[lang].pages){
      if(!/^(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)+$/.test(page.slug))throw new Error(where+' invalid slug: '+page.slug);
      for(const key of ['title','description','lead','body'])
        if(typeof page[key]!=='string'||!page[key].trim())throw new Error(where+' '+page.slug+' missing '+key);
      for(const [,target] of page.body.matchAll(/href="@([^"]*)"/g))
        if(target&&!own.includes(target))throw new Error(where+' '+page.slug+' unknown link: '+target);
    }
    if(own.join(' ')!==slugs.join(' '))throw new Error('src/pages/'+lang+'.js slugs differ from ko: '+own.join(' '));
    if(Object.keys(out[lang].ui).sort().join(' ')!==uiKeys.join(' '))throw new Error(where+' ui keys differ from ko');
    for(const k of uiKeys)if(typeof out[lang].ui[k]!=='string')throw new Error(where+' ui.'+k+' missing');
  }
  return {pages:out,slugs};
}

function contentPage(source, lang, slug, all=contentSources()){
  const {pages,slugs}=all, copy=pages[lang], ui=copy.ui, page=copy.pages.find(p=>p.slug===slug);
  if(!page)throw new Error('Unknown content page: '+lang+' '+slug);
  const site=source.match(/<link rel="canonical" href="([^"]+)">/)[1];
  const rel=target=>'../'.repeat(1+slug.split('/').filter(Boolean).length)+target;
  const at=target=>rel(lang+'/'+target); // same-language page, or the app for ''
  const url=l=>site+l+'/'+slug;
  const isGuide=slug.startsWith('guide/')&&slug!=='guide/';
  // Colour tokens stay defined once, in src/style.css (decision 5(theme-layout)).
  const tokens=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8').match(/:root\{[\s\S]*?\n\s*\}/)[0];
  const css=fs.readFileSync(path.join(ROOT,'src','pages','page.css'),'utf8');
  const pick=re=>{const m=source.match(re);if(!m)throw new Error('App head is missing '+re);return m[0];};
  const adsense=pick(/<script async src="https:\/\/pagead2\.googlesyndication\.com[^>]*><\/script>/);
  const fonts=pick(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*">/);
  const theme=pick(/<meta name="theme-color" content="[^"]*">/);
  const locales={ko:'ko_KR',en:'en_US',ja:'ja_JP'};
  const title=page.title+' | '+ui.siteName;
  const ld={'@context':'https://schema.org','@type':isGuide?'Article':'WebPage',headline:page.title,name:page.title,description:page.description,
    inLanguage:lang,url:url(lang),dateModified:CONTENT_UPDATED,image:site+'og.png',
    author:{'@type':'Person',name:'Seonghyeon Shin'},publisher:{'@type':'Organization',name:ui.siteName,url:site+lang+'/'}};
  // Operator's own YouTube video, in privacy-enhanced mode, loaded only near the viewport (2026-10-01 decision 4(single-page)).
  if(page.video&&!/^[\w-]{11}$/.test(page.video.id))throw new Error('Bad YouTube id in '+lang+' '+slug);
  const video=page.video?`<figure class="video"><div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${page.video.id}" title="${escape(page.video.title)}" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>
<figcaption>▶ ${escape(page.video.title)}${page.videoNote?' · '+escape(page.videoNote):''} · <a href="https://www.youtube.com/watch?v=${page.video.id}" target="_blank" rel="noopener">${escape(ui.watch)}</a></figcaption></figure>\n`:'';
  const body=page.body.trim().replace(/href="@([^"]*)"/g,(_,target)=>`href="${at(target)}"`);
  const nav=[['',ui.practice],['guide/',ui.guides],['privacy/',ui.privacy]]
    .map(([t,label])=>`<a href="${at(t)}"${t===slug?' aria-current="page"':''}>${escape(label)}</a>`).join('\n');
  const langs=LANGS.map(l=>`<a href="${rel(l+'/'+slug)}" hreflang="${l}" lang="${l}"${l===lang?' aria-current="true"':''}>${LANG_NAMES[l]}</a>`).join('');
  const others=slugs.filter(s=>s.startsWith('guide/')&&s!=='guide/'&&s!==slug).map(s=>copy.pages.find(p=>p.slug===s));
  const cta=`<p><a class="cta" href="${at('')}">${escape(ui.open)}</a></p>`;
  const next=isGuide?`<div class="next">${cta}\n<p>${escape(ui.next)}</p>\n<ul>${others.map(p=>`<li><a href="${at(p.slug)}">${escape(p.title)}</a></li>`).join('')}</ul></div>`
    :slug==='guide/'?cta:'';
  return `<!doctype html>
<!-- 미시마 도장 (Mishima Dojo) © 2026 신성현 (Seonghyeon Shin). All rights reserved. Not open source: see LICENSE in the repository. -->
<html lang="${lang}">
<head>
<meta charset="utf-8">
${adsense}
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(page.description)}">
<meta name="robots" content="index,follow">
<link rel="icon" type="image/png" sizes="256x256" href="${rel('favicon.png')}">
${theme}
<link rel="canonical" href="${url(lang)}">
${LANGS.map(l=>`<link rel="alternate" hreflang="${l}" href="${url(l)}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${url('en')}">
<meta property="og:type" content="${isGuide?'article':'website'}">
<meta property="og:site_name" content="${escape(ui.siteName)}">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(page.description)}">
<meta property="og:url" content="${url(lang)}">
<meta property="og:image" content="${site}og.png">
${LANGS.map(l=>`<meta property="og:locale${l===lang?'':':alternate'}" content="${locales[l]}">`).join('\n')}
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g,'\\u003c')}</script>
${fonts}
<style>
${tokens}
${css}</style>
</head>
<body>
<div class="page">
<header class="top"><a class="brand" href="${at('')}">${escape(ui.siteName)}</a><nav>${nav}</nav><div class="langs">${langs}</div></header>
${isGuide?`<p class="crumbs"><a href="${at('guide/')}">${escape(ui.home)}</a> ›</p>\n`:''}<article>
<h1>${escape(page.title)}</h1>
<p class="lead">${escape(page.lead)}</p>
<p class="meta">${escape(ui.updated)}: ${CONTENT_UPDATED}</p>
${video}${body}
${next}
</article>
<footer>
<p>${nav.replace(/\n/g,' · ')}</p>
<p>${escape(ui.contact)}: <a href="mailto:tlstjdgus3@gmail.com">tlstjdgus3@gmail.com</a></p>
<p>${escape(ui.copy)}</p>
</footer>
</div>
</body>
</html>
`;
}

// Every public URL with its language alternates, generated from the same page list the build writes (2026-10-01; was a hand-kept file).
function sitemap(source, all=contentSources()){
  const site=source.match(/<link rel="canonical" href="([^"]+)">/)[1];
  const entry=(loc,alt)=>`  <url>\n    <loc>${loc}</loc>\n${Object.entries(alt).map(([l,h])=>`    <xhtml:link rel="alternate" hreflang="${l}" href="${h}"/>`).join('\n')}\n  </url>`;
  const app={ko:site+'ko/',en:site+'en/',ja:site+'ja/','x-default':site};
  const rows=[site,...LANGS.map(l=>site+l+'/')].map(loc=>entry(loc,app));
  for(const slug of all.slugs){
    const alt=Object.fromEntries(LANGS.map(l=>[l,site+l+'/'+slug]));alt['x-default']=alt.en;
    for(const l of LANGS)rows.push(entry(alt[l],alt));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join('\n')}\n</urlset>\n`;
}

function buildSite(outDir=path.join(ROOT,'_site')){
  const output=path.resolve(outDir);
  // Build only in the dedicated output tree, never overwrite app sources or publish scratch files.
  const allowed=path.join(ROOT,'_site');
  if(output!==allowed)throw new Error('Build output must be '+allowed);
  fs.rmSync(output,{recursive:true,force:true});
  fs.mkdirSync(output,{recursive:true});
  const write=(name,data)=>{const target=path.join(output,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);};
  const source=assemble();
  write('index.html',source);
  for(const lang of LANGS)write(lang+'/index.html',localizedPage(source,lang));
  const content=contentSources();
  for(const lang of LANGS)for(const slug of content.slugs)write(lang+'/'+slug+'index.html',contentPage(source,lang,slug,content));
  write('sitemap.xml',sitemap(source,content));
  for(const name of fs.readdirSync(ROOT)){
    if(/^(?:CNAME|LICENSE|ads\.txt|robots\.txt|favicon\.png|og\.png|donate-kakao\.png|google[\w]+\.html|naver[\w]+\.html)$/.test(name))
      fs.copyFileSync(path.join(ROOT,name),path.join(output,name));
  }
  // Sound effects: every MP3 directly in sfx/ (the SND table in src/js/05-sound.js points at them).
  // Transition (2026-09-30 move from the repo root): a tab opened before this deploy still asks for /sfx-<name>.mp3, so the
  // artifact also serves each file at its old root URL. Remove the second write once no pre-move page can be open (after 2026-10-31).
  for(const f of fs.readdirSync(path.join(ROOT,'sfx')).filter(f=>/\.mp3$/i.test(f))){
    const data=fs.readFileSync(path.join(ROOT,'sfx',f));
    write('sfx/'+f,data); write('sfx-'+f,data);
  }
  const tracks=tracksAt(path.join(ROOT,'bgm'));
  write('bgm/playlist.json',JSON.stringify(tracks,null,2)+'\n');
  for(const track of tracks)fs.copyFileSync(path.join(ROOT,track),path.join(output,track));
  write('.nojekyll','');
  return {output,tracks:tracks.length};
}
if(require.main===module)console.log(buildSite());
module.exports={localizedPage,dictionaries,buildSite,contentSources,validateContent,contentPage,sitemap};
