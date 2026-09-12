const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {launch, sleep} = require('../tools/cdp');
(async()=>{
  const root=path.join(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8')
    .replace(/const BOARD_URL = '[^']*';/, "const BOARD_URL = '';")
    .replace(/\}\)\(\);\s*<\/script>/, 'globalThis.soundTest={snd,unlockAudio,playSfx};})();</script>');
  const server=http.createServer((req,res)=>{
    const file=req.url.slice(1);
    if(file===''){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html);}
    if(['bgm.mp3','sfx-wave.mp3','sfx-ewgf.mp3'].includes(file)){res.setHeader('Content-Type','audio/mpeg');return res.end(fs.readFileSync(path.join(root,file)));}
    res.writeHead(204);res.end();
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let b,ws;
  try{
    b=await launch({port:9443,profile:'dojo-sound-smoke'});
    const url=`http://127.0.0.1:${server.address().port}/`;
    await b.navigate(url);
    const {result:{targetId}}=await b.send('Target.createTarget',{url,newWindow:true});
    const targets=await (await fetch('http://127.0.0.1:9443/json')).json();
    ws=new WebSocket(targets.find(t=>t.id===targetId).webSocketDebuggerUrl);
    await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
    let id=0;const pending=new Map();
    ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
    const send2=(method,params)=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}));});
    const evaluate=async(send,expression)=>{
      const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
      assert.ok(!r.error && !r.result.exceptionDetails,JSON.stringify(r));return r.result.result.value;
    };
    await sleep(1000);
    const state='({hidden:document.hidden,playing:!!soundTest.snd.bgm&&!soundTest.snd.bgm.paused})';
    await evaluate(b.send,'soundTest.unlockAudio()');await sleep(300);
    await evaluate(send2,'soundTest.unlockAudio()');await sleep(300);
    assert.deepEqual(await evaluate(b.send,state),{hidden:false,playing:true});
    assert.deepEqual(await evaluate(send2,state),{hidden:false,playing:false});
    await evaluate(b.send,`document.querySelector('#soundSel button[data-sound="0"]').click()`);await sleep(300);
    assert.equal((await evaluate(b.send,state)).playing,false);
    assert.equal((await evaluate(send2,state)).playing,true);
    await evaluate(b.send,`document.querySelector('#soundSel button[data-sound="1"]').click()`);await sleep(100);
    assert.equal((await evaluate(b.send,state)).playing,false);
    await b.send('Target.closeTarget',{targetId});await sleep(300);
    assert.equal((await evaluate(b.send,state)).playing,true);
    await evaluate(b.send,`soundTest.playSfx('ewgf');document.querySelector('#sfxVol').value=25;document.querySelector('#sfxVol').dispatchEvent(new Event('input'))`);
    assert.equal(await evaluate(b.send,`soundTest.snd.pool.ewgf.some(a=>!a.paused && a.volume===.25)`),true);
    await evaluate(b.send,`document.querySelector('#soundSel button[data-sound="0"]').click()`);
    assert.equal(await evaluate(b.send,`Object.values(soundTest.snd.pool).flat().every(a=>a.paused && a.volume===0)`),true);
    assert.equal(b.errors.length,0,JSON.stringify(b.errors));
    console.log('Sound browser regression passed: two visible windows, mute/close handoff, active SFX volume and mute.');
  }finally{if(ws)ws.close();if(b)b.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
