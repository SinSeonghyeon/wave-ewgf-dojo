// Browser smoke test: node tests/smoke-chrome.js
// Launches headless Chrome over CDP (tools/cdp.js, no npm deps), loads index.html, feeds a 6N23+2 via keyboard,
// switches ko/en/ja, runs a wave10 drill in ja, opens the share card, and fails if any JS error was logged.
const path = require('path');
const {launch, fileUrl, sleep} = require('../tools/cdp');

(async () => {
  const b = await launch({port:9333, profile:'dojo-smoke-profile'});
  const {send, evalJs, errors} = b;
  await b.navigate(fileUrl(path.join(__dirname,'../index.html')));
  const out = {};
  const snap = async () => evalJs(`(() => {
    const q=s=>document.querySelector(s); const css=getComputedStyle(document.documentElement);
    return {lang:document.documentElement.lang, title:document.title, h1:q('h1').textContent, tag:q('.brand p').textContent,
      modes:[...document.querySelectorAll('#modes button')].map(b=>b.textContent), hint:q('#hudHint').textContent, dName:q('#dName').textContent,
      rTitle:q('#rTitle').textContent, coach:q('#coachMsg').textContent.slice(0,40), more:q('#setSummary').getAttribute('data-more'),
      pad:q('#padStatus').textContent, empty:q('#logBody').textContent, seg:[...q('#segBar').children].map(e=>e.textContent),
      display:css.getPropertyValue('--display').trim(), bests:q('#bests').textContent.slice(0,80), footer:q('footer').textContent.slice(0,40),
      histEmpty:q('#hist svg text:last-of-type')?.textContent, waveTop:q('#waveChart svg text')?.textContent, keyBtn:q('#keys .key b')?.textContent,
      langPressed:[...document.querySelectorAll('#langSel button')].map(b=>b.getAttribute('aria-pressed')).join('')};
  })()`);
  out.initial = await snap();
  // simulate a few inputs via keyboard events to populate result/coach/log, then switch languages
  const key = async (code, type='keydown') => send('Input.dispatchKeyEvent',{type: type==='keydown'?'keyDown':'keyUp', code, key: code.replace('Key','').toLowerCase(), windowsVirtualKeyCode: code.charCodeAt(code.length-1)});
  const tap = async (code, hold=20) => { await key(code); await sleep(hold); await key(code,'keyup'); };
  await tap('KeyD',20); await sleep(20); await key('KeyS'); await sleep(20); await key('KeyD'); await sleep(5); await key('KeyI'); await sleep(20); await key('KeyI','keyup'); await key('KeyD','keyup'); await key('KeyS','keyup'); await sleep(300);
  out.afterInput = await snap();
  for(const l of ['en','ja','ko']){
    await evalJs(`document.querySelector('#langSel button[data-lang="${l}"]').click()`); await sleep(200);
    out[l] = await snap();
    out[l].stored = await evalJs(`JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).lang`);
  }
  // drill flow in ja: wave10 start → wait → end record text
  await evalJs(`document.querySelector('#langSel button[data-lang="ja"]').click()`);
  await evalJs(`document.querySelector('#modes button[data-mode="wave10"]').click(); document.querySelector('#dStart').click()`);
  await sleep(3300); await tap('KeyD'); await sleep(20); await key('KeyS'); await sleep(20); await key('KeyD'); await sleep(30); await key('KeyS','keyup'); await key('KeyD','keyup'); await sleep(200);
  out.drillJa = await evalJs(`({prog:document.querySelector('#dProg').textContent, dName:document.querySelector('#dName').textContent, hint:document.querySelector('#hudHint').textContent})`);
  // share card: wait for the 10s drill to end, open the card, try copy (must not throw even where the clipboard is unavailable), close
  for(let i=0;i<40;i++){ if(!(await evalJs(`document.querySelector('#dShare').hidden`))) break; await sleep(300); }
  out.drillEnd = await evalJs(`({prog:document.querySelector('#dProg').textContent, shareHidden:document.querySelector('#dShare').hidden, shareLabel:document.querySelector('#dShare').textContent})`);
  await evalJs(`document.querySelector('#dShare').click()`); await sleep(800);
  out.card = await evalJs(`(() => { const c=document.querySelector('#shareCanvas'); const d=document.querySelector('#shareDlg');
    return {open:d.open, w:c.width, h:c.height, png:c.toDataURL('image/png').slice(0,22), title:d.querySelector('h2').textContent, buttons:[...d.querySelectorAll('button')].map(b=>b.textContent)}; })()`);
  await evalJs(`document.querySelector('#shareCopy').click()`); await sleep(600);
  out.card.copyMsg = await evalJs(`document.querySelector('#shareMsg').textContent`);
  await evalJs(`document.querySelector('#langSel button[data-lang="en"]').click()`); await sleep(400);
  out.card.copyMsgEn = await evalJs(`document.querySelector('#shareMsg').textContent`);
  await evalJs(`document.querySelector('#shareClose').click()`); await sleep(100);
  out.card.closed = !(await evalJs(`document.querySelector('#shareDlg').open`));
  if(!out.card.open || out.card.w!==1200 || out.card.h!==630 || !out.card.png.startsWith('data:image/png;base64') || out.drillEnd.shareHidden) errors.push('share card check failed: '+JSON.stringify(out.card));
  out.errors = errors;
  console.log(JSON.stringify(out,null,1));
  b.close();
  if(errors.length){ console.error('JS ERRORS:', errors); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
