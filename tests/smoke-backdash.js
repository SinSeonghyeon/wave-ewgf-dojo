// 백대시 10초: real keyboard listeners with deterministic 60Hz timestamps → the judged set, the frame timeline and the S-curve visual.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {launch,fileUrl,sleep,stageAssets}=require('../tools/cdp');
const {assemble}=require('../tools/assemble');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.sandbox/backdash/browser');
fs.mkdirSync(out,{recursive:true});
const html=assemble()
  .replace(/const BOARD_URL = '[^']*';/,"const BOARD_URL = '';")
  .replace(/\}\)\(\);\s*<\/script>/,'globalThis.bdTest={bdp,bd,BD,BD_FULL,BD_LAST,BDP_AXIS,bdDist,bdBestH,bdMps,world,anim,store,session};})();</script>');
const notice=html.match(/const NOTICES = \[\s*\{id:'([^']+)'/)[1];
const page=path.join(out,'index.html');fs.writeFileSync(page,html);
stageAssets(html,out);

(async()=>{
  const b=await launch({port:9341,profile:'dojo-backdash-smoke',windowSize:'1366,1000'});
  try{
    await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('wave-ewgf-dojo-v1',JSON.stringify({v:4,lang:'ko',sound:0,fx:1,noticeSeen:${JSON.stringify(notice)},visitDay:new Date(Date.now()+9*3600e3).toISOString().slice(0,10)}));`});
    await b.navigate(fileUrl(page));
    const click=sel=>b.evalJs(`document.querySelector(${JSON.stringify(sel)}).click()`);
    await click('[data-mode="bd10"]');
    assert.equal(await b.evalJs(`!document.querySelector('#bdpTimeline').hidden&&!document.querySelector('#bdpPanel').hidden&&document.body.classList.contains('bd10-mode')`),true,'bd10 shows the timeline and its panel');

    // One set: 4 held through the 1 (↙ = 4+2), release 2 (→ 4), release 4 (N), press 4 → the next backdash, which is then released uncancelled.
    const set=async(h)=>{
      await sleep(700);
      await b.evalJs(`(()=>{
        const F=1000/60,base=Math.floor((performance.now()-600)/F)*F+1;
        const key=(code,time,up=false)=>{const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:time});window.dispatchEvent(e);};
        let t=base; key('KeyA',t); key('KeyA',t+=2*F,true); key('KeyA',t+=2*F);  // 4 N 4 → backdash out
        key('KeyS',t+=${h-1}*F);                   // ↙ = the 1 cancel on frame h (the output frame is 1f)
        key('KeyS',t+=2*F,true);                   // back to 4
        key('KeyA',t+=2*F,true);                   // N
        key('KeyA',t+=2*F);                        // 4 → the next backdash (hand = 6f)
        key('KeyA',t+=12*F,true);                  // released: it runs out uncancelled
      })()`);
      await sleep(60);
      return b.evalJs(`(()=>{const r=bdTest.bdp.last;return {row:r&&r.row?{...r.row}:null,fail:r&&r.fail,result:document.querySelector('#bdpResult').textContent,detail:document.querySelector('#bdpDetail').textContent,
        cells:[...document.querySelectorAll('#bdpAxis .wsc-cell')].map(c=>({f:+c.dataset.frame,cls:c.className,d:+getComputedStyle(c).getPropertyValue('--d')})),
        bands:[...document.querySelectorAll('#bdpAxis .gp-band:not(.span)')].map(u=>u.textContent),axisW:document.querySelector('#bdpAxis').scrollWidth,boxW:document.querySelector('#bdpTimeline .wsc-scroll').clientWidth}})()`);
    };
    const K=await b.evalJs(`({best:bdTest.bdBestH(6),full:bdTest.BD_FULL,last:bdTest.BD_LAST,axis:bdTest.BDP_AXIS,px:bdTest.BD.PX,a:bdTest.BD.CANCEL_A,b:bdTest.BD.CANCEL_B})`);
    let r=await set(K.best);
    assert.equal(r.fail,'noCancel','the second backdash ran out, so the panel shows the set before it… '+JSON.stringify(r.result));
    // the set itself was recorded and is in the recent rows
    const rows=await b.evalJs(`bdTest.bdp.session.rows.map(x=>({h:x.h,hand:x.hand,g:x.g,mps:x.mps}))`);
    assert.equal(rows.length,1,JSON.stringify(rows));assert.equal(rows[0].h,K.best);assert.equal(rows[0].hand,6);assert.equal(rows[0].g,'top');
    assert.equal(r.cells.length,K.axis);assert.equal(r.cells[0].f,1,'the output frame is 1f');assert.equal(r.bands.length,4);
    assert.equal(r.axisW<=r.boxW+1,true,'the axis fits the desktop panel without scrolling: '+r.axisW+' > '+r.boxW);
    const full=r.cells.filter(c=>c.f>=K.last).every(c=>Math.abs(c.d-1)<1e-3);assert.equal(full,true,'an uncancelled backdash fills to the end');

    // keep a finished set on the axis: cancel the second one too, then start a third and stop at the 1
    await sleep(700);
    const shotData=await b.evalJs(`(()=>{
      const F=1000/60,base=Math.floor((performance.now()-600)/F)*F+1;
      const key=(code,time,up=false)=>{const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:time});window.dispatchEvent(e);};
      let t=base; key('KeyA',t); key('KeyA',t+=2*F,true); key('KeyA',t+=2*F);
      for(let i=0;i<2;i++){ key('KeyS',t+=${K.best-1}*F); key('KeyS',t+=2*F,true); key('KeyA',t+=2*F,true); key('KeyA',t+=2*F); }
      return {view:bdTest.bdp.last&&bdTest.bdp.last.row&&bdTest.bdp.last.row.h, sets:bdTest.bdp.session.sets};
    })()`);
    assert.equal(shotData.view,K.best);assert.equal(shotData.sets,3);
    await sleep(150);
    const desk=await b.evalJs(`(()=>{const cs=[...document.querySelectorAll('#bdpAxis .wsc-cell')];const at=k=>{const c=cs.find(c=>c.classList.contains(k));return c?+c.dataset.frame:-1;};return {cut:at('cut'),next:at('next'),ok:document.querySelectorAll('#bdpAB .ok').length,detail:document.querySelector('#bdpDetail').textContent}})()`);
    assert.equal(desk.cut,K.best);assert.equal(desk.next,K.best+6);assert.equal(desk.ok,6,JSON.stringify(desk));assert.match(desk.detail,/× 60 ÷/);
    await b.evalJs(`document.querySelector('#bdpTimeline').scrollIntoView({block:'center'})`);await sleep(200);
    const shot=path.join(out,'bd10-1366.png');fs.writeFileSync(shot,Buffer.from((await b.send('Page.captureScreenshot',{format:'png'})).result.data,'base64'));
    await b.evalJs(`window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyA',bubbles:true}))`); // let the last one run out

    // the S-curve visual: sample the fighter while a backdash runs (real clock)
    await sleep(700);
    const path1=await b.evalJs(`new Promise(res=>{
      const F=1000/60,key=(code,up=false)=>window.dispatchEvent(new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true}));
      key('KeyA');key('KeyA',true);key('KeyA');
      const x0=bdTest.anim.moveFrom,t0=bdTest.anim.moveT0,samples=[];
      const tick=()=>{const t=performance.now()-t0;samples.push({f:t/F,dx:x0-bdTest.world.charX});if(t<${K.last}*F+80)requestAnimationFrame(tick);else{key('KeyA',true);res(samples);}};
      requestAnimationFrame(tick);
    })`);
    const end=path1[path1.length-1],early=path1.filter(s=>s.f>0.5&&s.f<3);
    assert.ok(Math.abs(end.dx-K.px)<0.5,'the visual ends one full backdash back: '+end.dx);
    for(const s of early) assert.ok(s.dx<0.15*K.px,'slow off the mark at '+s.f.toFixed(1)+'f: '+s.dx);
    for(let i=1;i<path1.length;i++) assert.ok(path1[i].dx>=path1[i-1].dx-1e-6,'never moves forward');

    // phone width: the axis scrolls inside its box, the page does not
    await click('[data-mode="free"]');await click('[data-mode="bd10"]');
    await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(300);
    assert.equal(await b.evalJs(`document.documentElement.scrollWidth<=innerWidth`),true,'no horizontal overflow at 390px');
    await b.evalJs(`document.querySelector('#bdpTimeline').scrollIntoView({block:'start'})`);await sleep(200);
    const mobile=path.join(out,'bd10-390.png');fs.writeFileSync(mobile,Buffer.from((await b.send('Page.captureScreenshot',{format:'png'})).result.data,'base64'));

    assert.equal(b.errors.length,0,JSON.stringify(b.errors));
    console.log(JSON.stringify({ok:true,rows,desk,screenshots:[shot,mobile],errors:b.errors},null,2));
  }finally{ await b.close(); }
})().catch(e=>{ console.error(e); process.exit(1); });
