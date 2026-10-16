// 브라이언·도발 제트어퍼 (결정 37(tju)·34(char-select)): real keyboard listeners with 60Hz-aligned timestamps — the 1+3+4 key,
// 29f 6 · 30f N · 31f 4+RP, a late 6, a Jet Upper on its own —, the Bryan tabs and no-wave screen, the timeline and panel,
// the touch taunt button, the 10-try countdown, the 최속 제트어퍼 tab (15-frame axis, a miss), and layout at desktop and phone widths in three languages.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {launch,fileUrl,sleep,stageAssets}=require('../tools/cdp');
const {assemble}=require('../tools/assemble');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.sandbox/tju/browser');
fs.mkdirSync(out,{recursive:true});
const html=assemble().replace(/const BOARD_URL = '[^']*';/,"const BOARD_URL = '';");
const notice=html.match(/const NOTICES = \[\s*\{id:'([^']+)'/)[1];
const page=path.join(out,'index.html');fs.writeFileSync(page,html);
stageAssets(html,out);
(async()=>{
  const b=await launch({port:9343,profile:'dojo-tju-smoke',windowSize:'1366,1000'});
  try{
    await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('wave-ewgf-dojo-v1',JSON.stringify({v:4,lang:'ko',sound:0,fx:0,noticeSeen:${JSON.stringify(notice)},visitDay:new Date(Date.now()+9*3600e3).toISOString().slice(0,10)}));}`});
    await b.navigate(fileUrl(page)+'?c=bryan');
    const click=sel=>b.evalJs(`document.querySelector(${JSON.stringify(sel)}).click()`);
    const shown=sel=>b.evalJs(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});return !!e&&getComputedStyle(e).display!=='none'&&!e.hidden;})()`);
    const tabs=sel=>b.evalJs(`Array.from(document.querySelectorAll(${JSON.stringify(sel)})).filter(x=>!x.hidden).map(x=>x.dataset.mode||x.dataset.board||x.id).join(',')`);
    const read=()=>b.evalJs(`({title:document.querySelector('#rTitle').textContent,sub:document.querySelector('#rOff').textContent,char:JSON.parse(localStorage.getItem('wave-ewgf-dojo-v1')).char,name:document.querySelector('#charOpenName').textContent,tries:+document.querySelector('#stTry').textContent,result:document.querySelector('#tjResult').textContent})`);
    // seq: [part, frame] with part 't' (the 1+3+4 key) | 'f' | 'b' | 'p' (RP) | 'u' 'j' 'k' (LP LK RK) and '-x' for a release.
    // Frame 0 is the taunt press (TJ frame 1); every timestamp sits in the past, so the reader closes each frame on the next one.
    const play=async seq=>{
      await sleep(700); // the previous sequence (up to ~35f, 1.8s back) must be over before the next one starts 1.8s back
      await b.evalJs(`(()=>{
        const F=1000/60,t0=Math.floor((performance.now()-1800)/F)*F+1;
        const code={t:'KeyL',f:'KeyD',b:'KeyA',p:'KeyI',u:'KeyU',j:'KeyJ',k:'KeyK'};
        for(const [p,fr] of ${JSON.stringify(seq)}){const up=p[0]==='-',e=new KeyboardEvent(up?'keyup':'keydown',{code:code[up?p.slice(1):p],bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:t0+fr*F});window.dispatchEvent(e);}
      })()`);
      await sleep(120); // a rAF or two: the last frame is read by the tick
      return read();
    };
    let r=await read();
    assert.equal(r.char,'bryan','?c=bryan opens Bryan');assert.equal(r.name,'브라이언');
    assert.equal(await tabs('#modes button'),'free,tju,ju,backdash,challengeOpen','Bryan: practice tabs (백대시 연습 too) + the 도전 모드 tab');
    await click('#challengeOpen');assert.equal(await tabs('#challengeList [data-mode]'),'bd10','Bryan: backdash yes, wave and Mishima moves no');await click('#challengeClose');
    assert.equal(await tabs('#boardTabs button'),'bd10','the tju board is switched off (결정 38(challenge-mode))');
    assert.equal(await shown('.coach>.stats'),false,'no wave/EWGF tiles for a character without either');
    assert.equal(await shown('#histCard'),false);assert.equal(await shown('#waveCard'),false);
    assert.equal(await b.evalJs(`document.querySelector('#analysisLink').getAttribute('href')`),'#bestsCard');
    // free practice already judges the taunt: 1+3+4 key, 6 on 29f, N on 30f, 4+RP on 31f
    r=await play([['t',0],['-t',3],['f',28],['-f',29],['b',30],['p',30],['-p',33],['-b',33]]);
    assert.equal(r.title,'도발 제트어퍼!',JSON.stringify(r));assert.equal(r.tries,0,'the EWGF stats stay untouched');
    // the practice tab: panel and timeline; its 10-try challenge is switched off (결정 38(challenge-mode))
    await click('[data-mode="tju"]');
    const panel=await b.evalJs(`({panel:!document.querySelector('#tjPanel').hidden,timeline:!document.querySelector('#tjTimeline').hidden,btn:!document.querySelector('#tjChallengeBtn').hidden,cmd:document.querySelector('#tjCommand').textContent,cells:document.querySelectorAll('#tjAxis .wsc-cell').length})`);
    assert.ok(panel.panel&&panel.timeline&&!panel.btn,JSON.stringify(panel));assert.match(panel.cmd,/29f → · 30f ★ · 31f ←\+RP/);assert.equal(panel.cells,25,'1f, 2~12f, 13~34f one by one, 35~77f');
    r=await play([['t',0],['-t',3],['f',28],['-f',29],['b',30],['p',30],['-p',33],['-b',33]]);
    assert.match(r.result,/도발 제트어퍼/,JSON.stringify(r));
    const axis=await b.evalJs(`({ok:!!document.querySelector('#tjAxis .tj-band.su.ok'),knee:document.querySelector('#tjAxis .wsc-cell.knee').className,six:document.querySelector('#tjAxis [data-frame="29"] b').textContent,rp:document.querySelector('#tjAxis [data-frame="31"] b').textContent})`);
    assert.ok(axis.ok,'the Jet Upper bar ends inside the +16');assert.match(axis.knee,/\bon\b/,'the knee landed');assert.equal(axis.six,'→');assert.equal(axis.rp,'←+RP');
    // the 6 one frame late: guarded
    r=await play([['t',0],['-t',3],['f',29],['-f',30],['b',31],['p',31],['-p',34],['-b',34]]);
    assert.match(r.title,/가드됨/,JSON.stringify(r));
    assert.ok(await b.evalJs(`!!document.querySelector('#tjAxis .tj-band.su.no')`),'the bar runs past 44f');
    // 1, 3 and 4 by hand on one frame are the same taunt; nothing after it: the taunt plays out
    r=await play([['u',0],['j',0],['k',0],['-u',3],['-j',3],['-k',3]]);await sleep(1400);r=await read();
    assert.match(r.title,/캔슬하지 않은 도발/,JSON.stringify(r));
    // a Jet Upper on its own: f 1f, n 1f, b+RP on one frame
    r=await play([['f',0],['-f',1],['b',2],['p',2],['-p',4],['-b',4]]);
    assert.equal(r.title,'최속 제트어퍼!',JSON.stringify(r));
    // the 최속 제트어퍼 tab: the Jet Upper alone on a 15-frame axis, frame 1 = the 6; every RP is a try
    await click('[data-mode="ju"]');
    const jp=await b.evalJs(`({panel:!document.querySelector('#juPanel').hidden,timeline:!document.querySelector('#juTimeline').hidden,tj:!document.querySelector('#tjTimeline').hidden,btn:!document.querySelector('#tjChallengeBtn').hidden,cells:document.querySelectorAll('#juAxis .wsc-cell').length,cmd:document.querySelector('#juCommand').textContent})`);
    assert.ok(jp.panel&&jp.timeline&&!jp.tj&&!jp.btn,'its own timeline and panel, no challenge '+JSON.stringify(jp));assert.equal(jp.cells,15);assert.equal(jp.cmd,'1f → · 2f ★ · 3f ←+RP');
    const juAxis=()=>b.evalJs(`({result:document.querySelector('#juResult').textContent,rp:(document.querySelector('#juAxis .wsc-cell.rp')||{dataset:{}}).dataset.frame,marks:[1,2,3,4].map(f=>document.querySelector('#juAxis [data-frame="'+f+'"] b').textContent),top:Array.from(document.querySelectorAll('#juAxis .ju-band:not(.in)')).map(e=>e.className+' '+e.textContent),bar:(document.querySelector('#juAxis .ju-band.in:not(.lbl)')||{}).className})`);
    r=await play([['f',0],['-f',1],['b',2],['p',2],['-p',4],['-b',4]]);
    assert.equal(r.title,'최속 제트어퍼!',JSON.stringify(r));
    let ax=await juAxis();
    assert.equal(ax.result,'최속 제트어퍼');assert.equal(ax.rp,'3');assert.deepEqual(ax.marks,['→','★','←+RP','']);
    assert.deepEqual(ax.top,['ju-band ok → 1f','ju-band ok ★ 1f']);assert.equal(ax.bar,'ju-band in ok','the input bar: 3f, green');
    r=await play([['f',0],['-f',1],['b',3],['p',3],['-p',5],['-b',5]]);  // the neutral held two frames: a Jet Upper, not the fastest
    assert.equal(r.title,'제트어퍼',JSON.stringify(r));ax=await juAxis();assert.equal(ax.rp,'4');assert.deepEqual(ax.top,['ju-band ok → 1f','ju-band no ★ 2f']);
    r=await play([['b',0],['p',1],['-p',3],['-b',3]]);                    // no 6 before the RP: a miss with its reason
    assert.equal(r.title,'제트어퍼가 나오지 않음',JSON.stringify(r));assert.equal(await b.evalJs(`document.querySelector('#juStats div').textContent`),'3평가 시도');
    await click('[data-mode="tju"]');
    // touch: the 1+3+4 button appears for Bryan and starts a taunt
    await click('#setOpen');await sleep(80);await click('[data-touch="on"]');await click('#setClose');await sleep(80);
    assert.equal(await shown('#tbtns [data-btn="t"]'),true,'the taunt button is on the touch pad');
    await b.evalJs(`(()=>{const x=document.querySelector('#tbtns [data-btn="t"]');x.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7}));x.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7}));})()`);
    await sleep(150);
    assert.match(await b.evalJs(`document.querySelector('#tjLive').textContent`),/도발 \d+f|무릎|캔슬 가능|입력 무시/,'a touch taunt starts the count');
    await sleep(1400);
    await click('#setOpen');await sleep(80);await click('[data-touch="off"]');await click('#setClose');await sleep(80);
    // the settings list the 1+3+4 key
    await click('#setOpen');await sleep(80);
    assert.ok(await b.evalJs(`!!document.querySelector('#keys [data-action="bt"]')`),'the 1+3+4 key is in the keyboard list');
    await click('#setClose');
    // layout: no sideways overflow; the timeline scrolls inside its own box
    const shots=[];
    r=await play([['t',0],['-t',3],['f',28],['-f',29],['b',30],['p',30],['-p',33],['-b',33]]);
    for(const width of [390,1366])for(const lang of ['ko','en','ja']){
      await b.send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width===390});
      await click(`[data-lang="${lang}"]`);await sleep(150);
      const layout=await b.evalJs(`(()=>{const w=s=>document.querySelector('#tjAxis '+s).getBoundingClientRect().width,axis=document.querySelector('#tjAxis').getBoundingClientRect().width;
        return {page:document.documentElement.scrollWidth<=innerWidth,ab:Array.from(document.querySelectorAll('#tjAB>div')).every(e=>e.scrollWidth<=e.clientWidth+1),cmd:document.querySelector('#tjCommand').scrollWidth<=document.querySelector('#tjCommand').clientWidth+1,
          bands:Array.from(document.querySelectorAll('#tjAxis .tj-band')).filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),cancel:w('.tj-band.cancel')/axis,ignore:w('.tj-band.ignore')/axis};})()`);
      assert.ok(layout.page&&layout.ab&&layout.cmd&&!layout.bands.length,JSON.stringify({width,lang,layout}));
      assert.ok(layout.cancel>0.75&&layout.ignore<0.2,'the cancel window takes the width, the ignored frames stay narrow '+JSON.stringify(layout));
      await b.evalJs(`document.querySelector('#tjTimeline').scrollIntoView({block:'start'})`);await sleep(60);
      const shot=path.join(out,`${lang}-${width}.png`),cap=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(shot,Buffer.from(cap.result.data,'base64'));shots.push(shot);
      await b.evalJs(`window.scrollTo(0,0)`);
    }
    // the 최속 제트어퍼 tab: the same widths and languages, a try on the axis
    await b.send('Emulation.clearDeviceMetricsOverride',{});await click('[data-lang="ko"]');await click('[data-mode="ju"]');
    r=await play([['f',0],['-f',1],['b',3],['p',4],['-p',6],['-b',6]]);  // N 2f and the 4 a frame early: every top band shows
    for(const width of [390,1366])for(const lang of ['ko','en','ja']){
      await b.send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width===390});
      await click(`[data-lang="${lang}"]`);await sleep(150);
      const layout=await b.evalJs(`(()=>{const over=e=>e.scrollWidth>e.clientWidth+1;
        return {page:document.documentElement.scrollWidth<=innerWidth,ab:Array.from(document.querySelectorAll('#juAB>div')).every(e=>!over(e)),cmd:!over(document.querySelector('#juCommand')),
          stats:Array.from(document.querySelectorAll('#juStats>div')).every(e=>!over(e)),bands:Array.from(document.querySelectorAll('#juAxis .ju-band')).filter(over).map(e=>e.textContent),
          top:document.querySelectorAll('#juAxis .ju-band:not(.in)').length,timeline:document.querySelector('#juTimeline').getBoundingClientRect().width};})()`);
      assert.ok(layout.page&&layout.ab&&layout.cmd&&layout.stats&&!layout.bands.length&&layout.top===3,JSON.stringify({width,lang,layout}));
      await b.evalJs(`document.querySelector('#juTimeline').scrollIntoView({block:'start'})`);await sleep(60);
      const shot=path.join(out,`ju-${lang}-${width}.png`),cap=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(shot,Buffer.from(cap.result.data,'base64'));shots.push(shot);
      await b.evalJs(`window.scrollTo(0,0)`);
    }
    await b.send('Emulation.clearDeviceMetricsOverride',{});
    console.log('tju smoke ok:',shots.length,'screenshots in',out);
  }finally{ await b.close(); }
})().catch(e=>{ console.error(e); process.exit(1); });
