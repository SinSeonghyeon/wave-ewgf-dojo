// Generate og.png (1200x630 Open Graph image): node tools/make-og.js [--lang ko|en|ja] [--out og.png]
// Headless Chrome/Edge over CDP via tools/cdp.js, no npm dependencies.
// Loads a copy of index.html whose IIFE exposes buildOgCard/drawCard, draws the promotional card
// (app name, tagline, own SD fighter, illustrative histogram; no personal numbers) on #shareCanvas
// and saves canvas.toDataURL() as PNG. Re-run whenever drawCard, the og.* strings or the colors change.
// Exits 1 if the page logged any error (including a failed Google Fonts request, since that would bake fallback fonts into og.png).
const path = require('path');
const os = require('os');
const fs = require('fs');
const {launch, fileUrl, sleep} = require('./cdp');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--'+name); return i>=0 && args[i+1] ? args[i+1] : def; };
const LANG = opt('lang', 'ko');
const OUT = path.resolve(opt('out', path.join(__dirname, '../og.png')));
if(!['ko','en','ja'].includes(LANG)){ console.error('--lang must be ko, en or ja'); process.exit(2); }

// Expose the card functions from the IIFE in a temporary copy (the shipped page stays untouched).
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const hook = 'globalThis.__og={buildOgCard,drawCard,setLang,displayFont,cssVar,el:$};})();';
const patched = html.replace(/\}\)\(\);\s*<\/script>/, hook+'\n</script>').replace(/const BOARD_URL = '[^']*';/, "const BOARD_URL = '';");
if(patched===html){ console.error('could not find the end of the script IIFE in index.html'); process.exit(2); }
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dojo-og-'));
const tmpHtml = path.join(tmpDir, 'index.html');
fs.writeFileSync(tmpHtml, patched, 'utf8');
fs.copyFileSync(path.join(__dirname, '../donate-kakao.png'), path.join(tmpDir, 'donate-kakao.png'));
fs.copyFileSync(path.join(__dirname, '../favicon.png'), path.join(tmpDir, 'favicon.png'));
const rmTmp = () => { try{ fs.rmSync(tmpDir, {recursive:true, force:true}); }catch(e){} };

(async () => {
  const b = await launch({port:9334, profile:'dojo-og-profile'});
  try{
    await b.navigate(fileUrl(tmpHtml));
    // Wait for the Google fonts the card uses. Google serves CJK fonts as unicode-range subsets, so load them
    // against the card's actual text or glyphs outside the first subset fall back to a system font. Gives up after ~8s.
    const fontsReady = await b.evalJs(`(async () => {
      const o = globalThis.__og; o.setLang(${JSON.stringify(LANG)});
      const strings = []; JSON.stringify(o.buildOgCard(), (k, v) => { if(typeof v==='string') strings.push(v); return v; });
      const text = strings.join('') + '-6f-3f0f+3f+6f+9f';
      const faces = ['46px '+o.displayFont(), '700 21px '+o.cssVar('--body','sans-serif'), '700 26px '+o.cssVar('--mono','monospace')];
      for(let i=0;i<32;i++){ await Promise.all(faces.map(f => document.fonts.load(f, text).catch(()=>{}))); if(faces.every(f => document.fonts.check(f, text))) return true; await new Promise(r=>setTimeout(r,250)); }
      return false;
    })()`);
    // Draw twice: the first pass lets the canvas request any subset still missing, the second uses it.
    const dataUrl = await b.evalJs(`(async () => {
      const o = globalThis.__og, c = o.el('shareCanvas'), g = c.getContext('2d');
      o.drawCard(g, o.buildOgCard()); await new Promise(r=>setTimeout(r,600)); o.drawCard(g, o.buildOgCard());
      return c.toDataURL('image/png');
    })()`);
    if(!dataUrl.startsWith('data:image/png;base64,')) throw new Error('canvas did not produce a PNG');
    const buf = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
    if(!fontsReady) console.warn('WARN: web fonts did not finish loading; og.png may use fallback fonts');
    fs.writeFileSync(OUT, buf);
    console.log(JSON.stringify({out:OUT, bytes:buf.length, lang:LANG, fontsReady, errors:b.errors}));
    if(b.errors.length){ console.error('JS ERRORS:', b.errors); process.exitCode = 1; }
  } finally { b.close(); rmTmp(); }
})().catch(e => { console.error('FAIL', e); rmTmp(); process.exit(1); });
