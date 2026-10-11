// 캐릭터 선택·초스카이 (결정 33(jfsr)·34(char-select)): real keyboard listeners with 60Hz-aligned timestamps, the selector,
// the filtered mode/board tabs, the 초스카이 panel and the 10-try countdown, and layout at desktop and phone widths.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {launch,fileUrl,sleep,stageAssets}=require('../tools/cdp');
const {assemble}=require('../tools/assemble');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.sandbox/jfsr/browser');
fs.mkdirSync(out,{recursive:true});
const html=assemble().replace(/const BOARD_URL = '[^']*';/,"const BOARD_URL = '';");
const notice=html.match(/const NOTICES = \[\s*\{id:'([^']+)'/)[1];
const page=path.join(out,'index.html');fs.writeFileSync(page,html);
stageAssets(html,out);
(async()=>{
  const b=await launch({port:9341,profile:'dojo-jfsr-smoke',windowSize:'1366,1000'});
  try{
    await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('wave-ewgf-dojo-v1',JSON.stringify({v:4,lang:'ko',sound:0,fx:0,noticeSeen:${JSON.stringify(notice)},visitDay:new Date(Date.now()+9*3600e3).toISOString().slice(0,10)}));}`});
    await b.navigate(fileUrl(page)+'?c=hwoarang');
    const click=sel=>b.evalJs(`document.querySelector(${JSON.stringify(sel)}).click()`);
    const tabs=()=>b.evalJs(`Array.from(document.querySelectorAll('#modes button')).filter(x=>!x.hidden).map(x=>x.dataset.mode).join(',')`);
    const read=()=>b.evalJs(`({title:document.querySelector('#rTitle').textContent,sub:document.querySelector('#rOff').textContent,char:JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).char,name:document.querySelector('#charOpenName').textContent,url:location.search,tries:+document.querySelector('#stTry').textContent})`);
    // seq: [part, frame] with part 'f' | 'd' | 'k' (RK) and '-x' for a release; frames are from a 60Hz-aligned origin
    const play=async seq=>{
      await sleep(260);
      await b.evalJs(`(()=>{
        const F=1000/60,t0=Math.floor((performance.now()-200)/F)*F+1;
        const code={f:'KeyD',d:'KeyS',k:'KeyK'};
        for(const [p,fr] of ${JSON.stringify(seq)}){const up=p[0]==='-',e=new KeyboardEvent(up?'keyup':'keydown',{code:code[up?p.slice(1):p],bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:t0+fr*F});window.dispatchEvent(e);}
      })()`);
      return read();
    };
    let r=await read();
    assert.equal(r.char,'hwoarang','?c=hwoarang opens Hwoarang');assert.equal(r.name,'화랑','the character button shows who is selected');
    assert.equal(await tabs(),'free,jfsr,wave10,bd10');
    // 6 N 3+4: forward 1f, neutral 1f, then down+forward and RK on one frame
    r=await play([['f',0],['-f',1],['d',2],['f',2],['k',2],['-k',4],['-d',4],['-f',4]]);
    assert.equal(r.title,'최속 초스카이!',JSON.stringify(r));assert.equal(r.tries,0,'the EWGF stats stay untouched');
    // 6 N 2 3 + 4: the 2 had its own frame → normal Sky Rocket
    r=await play([['f',0],['-f',1],['d',2],['f',4],['k',4],['-k',6],['-d',6],['-f',6]]);
    assert.equal(r.title,'일반 스카이 (2를 거침)',JSON.stringify(r));
    // the 4 one frame late → 3RK
    r=await play([['f',0],['-f',1],['d',2],['f',2],['k',3],['-k',5],['-d',5],['-f',5]]);
    assert.equal(r.title,'4가 늦음 (3RK)',JSON.stringify(r));
    // the practice tab: panel, challenge button, countdown
    await click('[data-mode="jfsr"]');
    const panel=await b.evalJs(`({panel:!document.querySelector('#jfPanel').hidden,timeline:!document.querySelector('#jfTimeline').hidden,btn:!document.querySelector('#jfChallengeBtn').hidden,cmd:document.querySelector('#jfCommand').textContent})`);
    assert.ok(panel.panel&&panel.timeline&&panel.btn,JSON.stringify(panel));assert.match(panel.cmd,/RK/);
    r=await play([['f',0],['-f',1],['d',2],['f',2],['k',2],['-k',4],['-d',4],['-f',4]]);
    assert.match(await b.evalJs(`document.querySelector('#jfResult').textContent`),/초스카이/);
    await click('#jfChallengeBtn');await sleep(100);
    assert.match(await b.evalJs(`document.querySelector('#jfChallengeStatus').textContent`),/[0-9]/,'countdown shows');
    await click('#jfChallengeBtn'); // cancel
    // back to Kazuya: every Mishima tab returns, the address drops ?c=
    const pick=async id=>{ await click('#charOpen'); await sleep(150);
      const dlg=await b.evalJs(`({open:document.querySelector('#charDlg').open,tiles:[...document.querySelectorAll('#charTiles button[data-char]')].map(x=>x.dataset.char+':'+x.getAttribute('aria-pressed')).join(','),soon:!!document.querySelector('#charTiles .soon')})`);
      assert.ok(dlg.open&&dlg.soon,JSON.stringify(dlg));assert.match(dlg.tiles,/kazuya:(true|false),hwoarang:(true|false)/);
      await click(`#charTiles [data-char="${id}"]`); await sleep(100);
      assert.equal(await b.evalJs(`document.querySelector('#charDlg').open`),false,'a tile picks and closes');
    };
    await pick('kazuya');
    assert.equal(await tabs(),'free,wsc,giwon,wave10,ewgf20,combo10,rush30,bd10');
    r=await read();assert.equal(r.char,'kazuya');assert.equal(r.url,'');
    await pick('hwoarang');r=await read();assert.equal(r.url,'?c=hwoarang');
    // layout: no sideways overflow, the selector stays on screen
    const shots=[];
    await click('[data-mode="jfsr"]');
    for(const width of [390,1366])for(const lang of ['ko','en','ja']){
      await b.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390});
      await click(`[data-lang="${lang}"]`);await sleep(120);
      const layout=await b.evalJs(`(()=>{const s=document.querySelector('#charOpen').getBoundingClientRect();return {page:document.documentElement.scrollWidth<=innerWidth,sel:s.width>0&&s.right<=innerWidth+1&&s.left>=-1,ab:Array.from(document.querySelectorAll('#jfAB>div')).every(e=>e.scrollWidth<=e.clientWidth+1)};})()`);
      assert.ok(layout.page&&layout.sel&&layout.ab,JSON.stringify({width,lang,layout}));
      const shot=path.join(out,`${lang}-${width}.png`),cap=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(shot,Buffer.from(cap.result.data,'base64'));shots.push(shot);
      await click('#charOpen');await sleep(150);
      const tiles=await b.evalJs(`(()=>{const d=document.querySelector('#charDlg').getBoundingClientRect();return {fits:d.right<=innerWidth+1&&d.left>=-1,names:[...document.querySelectorAll('.char-tile b')].every(e=>e.scrollWidth<=e.clientWidth+1)};})()`);
      assert.ok(tiles.fits&&tiles.names,JSON.stringify({width,lang,tiles}));
      const dshot=path.join(out,`${lang}-${width}-chars.png`),dcap=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(dshot,Buffer.from(dcap.result.data,'base64'));shots.push(dshot);
      await click('#charClose');
    }
    console.log('jfsr smoke ok:',shots.length,'screenshots in',out);
  }finally{ await b.close(); }
})().catch(e=>{ console.error(e); process.exit(1); });
