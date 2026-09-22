// Dependency-free Pages build. index.html is the only app source; never edit generated pages.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {tracksAt} = require('./update-bgm');
const ROOT = path.resolve(__dirname, '..');
const LANGS = ['ko', 'en', 'ja'];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function dictionaries(source){
  const start=source.indexOf('const I18N = {'), end=source.indexOf('\nconst T =',start);
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
  // Leave #anchors local to the page; only relative assets/language links need the parent prefix.
  markup=markup.replace(/\b(href|src)="(?![a-z]+:|\/|#)([^"\s]+)"/gi,(_,attr,value)=>`${attr}="../${value}"`);
  return markup+source.slice(split);
}

function buildSite(outDir=path.join(ROOT,'_site')){
  const output=path.resolve(outDir);
  // Build only in the dedicated output tree, never overwrite app sources or publish scratch files.
  const allowed=path.join(ROOT,'_site');
  if(output!==allowed)throw new Error('Build output must be '+allowed);
  fs.rmSync(output,{recursive:true,force:true});
  fs.mkdirSync(output,{recursive:true});
  const write=(name,data)=>{const target=path.join(output,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);};
  const source=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  write('index.html',source);
  for(const lang of LANGS)write(lang+'/index.html',localizedPage(source,lang));
  for(const name of fs.readdirSync(ROOT)){
    if(/^(?:CNAME|LICENSE|ads\.txt|robots\.txt|sitemap\.xml|favicon\.png|og\.png|donate-kakao\.png|sfx-[\w-]+\.mp3|google[\w]+\.html|naver[\w]+\.html)$/.test(name))
      fs.copyFileSync(path.join(ROOT,name),path.join(output,name));
  }
  const tracks=tracksAt(path.join(ROOT,'bgm'));
  write('bgm/playlist.json',JSON.stringify(tracks,null,2)+'\n');
  for(const track of tracks)fs.copyFileSync(path.join(ROOT,track),path.join(output,track));
  write('.nojekyll','');
  return {output,tracks:tracks.length};
}
if(require.main===module)console.log(buildSite());
module.exports={localizedPage,dictionaries,buildSite};
