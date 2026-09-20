// Mist EWGF: actual keyboard/pointer listeners with deterministic 60Hz timestamps.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {launch,fileUrl,sleep}=require('../tools/cdp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.sandbox/mist/browser');
fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/const BOARD_URL = '[^']*';/,"const BOARD_URL = '';");
const notice=html.match(/const NOTICES = \[\s*\{id:'([^']+)'/)[1];
const page=path.join(out,'index.html');fs.writeFileSync(page,html);
for(const name of ['donate-kakao.png','favicon.png','sfx-wave.mp3','sfx-ewgf.mp3','sfx-wsc.mp3','sfx-hellsweep.mp3','sfx-tongbal.mp3','sfx-hit.mp3','sfx-backdash.mp3'])fs.copyFileSync(path.join(root,name),path.join(out,name));
fs.cpSync(path.join(root,'bgm'),path.join(out,'bgm'),{recursive:true});
(async()=>{
  const b=await launch({port:9337,profile:'dojo-mist-smoke',windowSize:'1366,1000'});
  try{
    await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('wave-ewgf-dojo-v1',JSON.stringify({v:4,lang:'ko',sound:0,fx:0,noticeSeen:${JSON.stringify(notice)},visitDay:new Date(Date.now()+9*3600e3).toISOString().slice(0,10)}));`});
    await b.navigate(fileUrl(page));
    const click=sel=>b.evalJs(`document.querySelector(${JSON.stringify(sel)}).click()`);
    const read=()=>b.evalJs(`({title:document.querySelector('#rTitle').textContent,detail:document.querySelector('#rOff').textContent,coach:document.querySelector('#coachMsg').textContent,seg:document.querySelector('#segBar').textContent,tries:+document.querySelector('#stTry').textContent,dashes:+document.querySelector('#stDash').textContent})`);
    const command=async({side=1,f=1,n=1,rp=0,order=['d','f','rp'],touch=false,release=['rp','f','d']}={})=>{
      await sleep(240);
      await b.evalJs(`(()=>{
        const F=1000/60,t=Math.floor((performance.now()-180)/F)*F+1,nt=t+${f}*F,df=nt+${n}*F,rt=df+${rp}*F;
        const forward=${side}===1?'KeyD':'KeyA',held=new Set();
        const key=(code,time,up=false)=>{const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:time});window.dispatchEvent(e);};
        const pointer=(part,time,up=false)=>{const sel=part==='rp'?'#tbtns [data-btn="2"]':'#tdirs [data-dir="'+(part==='d'?'down':${side}===1?'right':'left')+'"]';const e=new PointerEvent(up?'pointerup':'pointerdown',{pointerId:{f:11,d:12,rp:13}[part],pointerType:'touch',bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:time});document.querySelector(sel).dispatchEvent(e);};
        const press=(part,time,up=false)=>${touch} ? pointer(part,time,up) : key(part==='f'?forward:part==='d'?'KeyS':'KeyI',time,up);
        press('f',t);press('f',nt,true);
        const events=${JSON.stringify(order)}.map(part=>({part,time:part==='rp'?rt:df})).sort((a,b)=>a.time-b.time);
        for(const e of events)press(e.part,e.time);
        const end=Math.max(df,rt)+2;for(const part of ${JSON.stringify(release)})press(part,end,true);
      })()`);
      return read();
    };
    let count=0;
    for(const side of [1,-1]){
      await click(`[data-side="${side}"]`);
      for(const order of [['d','f','rp'],['f','d','rp'],['rp','d','f'],['rp','f','d'],['d','rp','f'],['f','rp','d']]){
        const r=await command({side,order,release:count%2?['rp','f','d']:['rp','d','f']});count++;assert.equal(r.title,'최속 무족초!',JSON.stringify({side,order,count,r}));assert.equal(r.tries,count);assert.equal(r.dashes,0);
      }
    }
    await click('[data-side="1"]');
    let r=await command({f:3,n:2});count++;assert.equal(r.title,'무족초!');assert.match(r.coach,/앞 2f, 중립 1f/);
    for(const [lang,title] of [['en','Mist Step EWGF!'],['ja','無足最風！'],['ko','무족초!']]){
      await click(`[data-lang="${lang}"]`);r=await read();assert.equal(r.title,title);assert.match(r.seg,/3f.*2f/);
    }
    r=await command({rp:-1});count++;assert.match(r.coach,/1f 빠릅니다/);assert.equal(r.tries,count);
    r=await command({n:0});count++;assert.equal(r.title,'앞·중립 프레임 부족');
    await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await b.send('Emulation.setTouchEmulationEnabled',{enabled:true});
    await b.send('Emulation.setEmulatedMedia',{features:[{name:'pointer',value:'coarse'},{name:'prefers-reduced-motion',value:'reduce'}]});
    for(const side of [1,-1]){
      await click(`[data-side="${side}"]`);
      r=await command({side,touch:true,order:['rp','f','d']});count++;assert.equal(r.title,'최속 무족초!');assert.equal(r.dashes,0);assert.equal(r.tries,count);
    }
    const shots=[];
    await sleep(900); // let the shared transient hit pop finish before checking persistent labels
    for(const width of [390,1366])for(const lang of ['ko','en','ja']){
      await b.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390});
      await b.send('Emulation.setTouchEmulationEnabled',{enabled:width===390});
      await b.send('Emulation.setEmulatedMedia',{features:[{name:'pointer',value:width===390?'coarse':'fine'},{name:'prefers-reduced-motion',value:'reduce'}]});
      await click(`[data-lang="${lang}"]`);
      await b.evalJs(`document.querySelector('[data-i18n="mist.help"]').parentElement.open=true;scrollTo(0,0)`);
      const layout=await b.evalJs(`({page:document.documentElement.scrollWidth<=innerWidth, title:document.querySelector('#rTitle').scrollWidth<=document.querySelector('#rTitle').clientWidth, seg:Array.from(document.querySelector('#segBar').children).slice(0,3).every(e=>e.scrollWidth<=e.clientWidth+1),legend:getComputedStyle(document.querySelector('#segBar').nextElementSibling).display==='none'})`);
      assert.ok(layout.page&&layout.title&&layout.seg&&layout.legend,JSON.stringify({width,lang,layout}));
      const shot=path.join(out,`${lang}-${width}.png`),capture=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(shot,Buffer.from(capture.result.data,'base64'));shots.push(shot);
      await b.evalJs(`document.querySelector('#segBar').scrollIntoView({block:'center'})`);
      const detail=path.join(out,`${lang}-${width}-analysis.png`),analysis=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(detail,Buffer.from(analysis.result.data,'base64'));shots.push(detail);
    }
    await click('[data-lang="ko"]');
    await b.send('Emulation.setFocusEmulationEnabled',{enabled:true}); // gamepad polling requires focus
    for(const side of [1,-1])for(const neutral of [false,true]){
      await click(`[data-side="${side}"]`);
      const before=await read();
      await b.evalJs(`(async()=>{
        const previous=Object.getOwnPropertyDescriptor(navigator,'getGamepads');let pad;
        Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>pad?[pad]:[]});
        const sample=async(indices)=>{pad={index:0,id:'neutral-rule-smoke',mapping:'standard',axes:[0,0],timestamp:performance.now(),buttons:Array.from({length:16},(_,i)=>({pressed:indices.includes(i),value:indices.includes(i)?1:0}))};await new Promise(r=>setTimeout(r,50));};
        try{
          const f=${side}===1?15:14;
          await sample([]);await sample([f]);
          if(${neutral})await sample([]);
          await sample([13]);await sample([13,f,3]);await sample([]);
        }finally{if(previous)Object.defineProperty(navigator,'getGamepads',previous);else delete navigator.getGamepads;}
      })()`);
      const r=await read();assert.equal(r.title,neutral?'초풍!':'중립 누락',JSON.stringify({side,neutral,r}));
      assert.equal(r.dashes-before.dashes,neutral?1:0,'623 must not earn a wave before RP');
    }
    assert.equal(b.errors.length,0,JSON.stringify(b.errors));
    console.log(JSON.stringify({ok:true,commands:count,neutralChecks:4,errors:b.errors,screenshots:shots},null,2));
  }finally{b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
