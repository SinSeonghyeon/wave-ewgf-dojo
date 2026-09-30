// Shared unit-test harness: runs the assembled app (tools/assemble.js) in a vm with deterministic browser/time stubs.
// boot() returns every top-level binding of the app script (a snapshot of let values, live objects) plus the stub handles.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = require('../../tools/assemble').assemble();
const APP_SCRIPT = html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Names declared at the top level of the app IIFE (zero indentation): functions, and each binding of a const/let/var list.
function topLevelNames(src){
  const names = new Set();
  for(const line of src.split('\n')){
    let m;
    if((m = line.match(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/))){ names.add(m[1]); continue; }
    if(!(m = line.match(/^(?:const|let|var)\s+(.*)$/))) continue;
    if(/^[\[{]/.test(m[1])) throw new Error('tests/helpers/app.cjs cannot export a top-level destructuring declaration; declare the names one by one: '+line.slice(0, 80));
    const s = m[1], parts = []; let depth = 0, quote = null, start = 0;
    for(let i = 0; i < s.length; i++){
      const c = s[i];
      if(quote){ if(c === '\\') i++; else if(c === quote) quote = null; continue; }
      if(c === '"' || c === "'" || c === '`') quote = c;
      else if('([{'.includes(c)) depth++;
      else if(')]}'.includes(c)) depth--;
      else if(depth === 0 && c === ';'){ parts.push(s.slice(start, i)); start = -1; break; }
      else if(depth === 0 && c === ','){ parts.push(s.slice(start, i)); start = i + 1; }
    }
    if(start >= 0) parts.push(s.slice(start));
    for(const p of parts){ const n = p.trim().match(/^([A-Za-z_$][\w$]*)\s*(?:=|$)/); if(n) names.add(n[1]); }
  }
  return names;
}
const APP_NAMES = topLevelNames(APP_SCRIPT);
const BANNED = /데빌진|화랑|카즈야|헤이하치|진 카자마|Jin\b|Hwoarang|Kazuya|Heihachi|Devil Jin|仁|風間|カズヤ|平八|ファラン|デビル/; // official character names (design decision 3(no-official-ip)); 三島 alone is the app's own name (三島道場), so the item/bd tests add it themselves
function boot(saved,fetch,env={}){ // fetch: optional stub for the backend calls (default: none, every call fails inside its try/catch)
  let now=1000, pads=[];
  const elements=new Map(), events={}, timers=new Map(); let next=1;
  function element(){
    return {textContent:'',innerHTML:'',style:{setProperty(k,v){this[k]=v;}},dataset:{},children:[],clientWidth:800,clientHeight:360,offsetWidth:180,offsetHeight:55,
      classList:{add(){},toggle(){}},setAttribute(){},addEventListener(type,fn){this[type]=fn;},
      querySelectorAll(){return [];},querySelector(){return element();},
      getBoundingClientRect(){return {width:800,height:360};},getContext(){return {setTransform(){}};}};
  }
  const get=id=>{if(!elements.has(id)) elements.set(id,element()); return elements.get(id);};
  get('jackpot').hidden=true;
  for(const id of ['setDlg','donateDlg','fitDlg','noticeDlg']) get(id).showModal=function(){this.open=true;};
  const context=vm.createContext({performance:{now:()=>now},document:{documentElement:{dataset:{pageLang:env.pageLang||''}},getElementById:get,querySelectorAll:()=>[],hasFocus:()=>true,hidden:false},
    navigator:{getGamepads:()=>pads},localStorage:{getItem:()=>saved===undefined?null:JSON.stringify(saved),setItem(){}},
    matchMedia:()=>({matches:false}),devicePixelRatio:1,requestAnimationFrame(){},
    addEventListener:(name,fn)=>{const previous=events[name];events[name]=(...args)=>{if(previous)previous(...args);fn(...args);};},
    setInterval:fn=>{const id=next++;timers.set(id,fn);return id;},clearInterval:id=>timers.delete(id),
    setTimeout:fn=>{const id=next++;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),...(fetch?{fetch}:{}),...env});
  // One try per name: a column-0 line inside a template string can look like a declaration, and that stray name must not break boot.
  const script=APP_SCRIPT.replace(/\}\)\(\);\s*$/, () => 'globalThis.app={};'+[...APP_NAMES].map(n=>'try{globalThis.app.'+n+'='+n+';}catch(e){}').join('')+'})();');
  vm.runInContext(script,context);
  return {...context.app,events,get,timers,document:context.document,time:t=>now=t,pads:p=>pads=p};
}
function dash(a,t=1000){a.onDir('f',t);a.onDir('n',t+20);a.onDir('d',t+40);a.onDir('df',t+60);}
const F=1000/60, fr=n=>Math.round(n*F); // backdash tests speak in frames
function mistInput(a,{start=1000,f=1,n=1,rp=0,intermediate=null,rpFirst=false}={}){
  const nt=start+f*F,df=nt+n*F,rt=df+rp;
  a.onDir('f',start);a.onDir('n',nt);
  if(rpFirst||rt<df)a.onButton(2,rt);
  if(intermediate)a.onDir(intermediate,df-.1);
  a.onDir('df',df);
  if(!rpFirst&&rt>=df)a.onButton(2,rt);
  return a.session.attempts.at(-1);
}

function bdOut(a,t,tap=2,n=2){a.onDir('b',t);a.onDir('n',t+fr(tap));const o=t+fr(tap)+fr(n);a.onDir('b',o);return o;} // b,N,b → the backdash comes out at the returned time
function bdSet(a,o,h,db=2,tap=2,n=2){const c=o+fr(h);a.onDir('db',c);a.onDir('b',c+fr(db));a.onDir('n',c+fr(db)+fr(tap));const o2=c+fr(db)+fr(tap)+fr(n);a.onDir('b',o2);return o2;} // cancel h frames after the backdash, roll into the next one

function samplePad(a,indices=[],axes=[0,0],mapping='standard'){
  a.pads([{index:0,id:'Test controller',mapping,axes,buttons:Array.from({length:18},(_,i)=>({pressed:indices.includes(i),value:indices.includes(i)?1:0}))}]);a.pollPad();
}
// Backend stub: every fetch is recorded and stays pending until the test answers it (in any order).
function backend(){
  const calls=[];
  const fetch=(url,init)=>new Promise(resolve=>calls.push({url:String(url),method:init&&init.method||'GET',body:init&&init.body?JSON.parse(init.body):null,
    resolve:(data,status=200)=>resolve({ok:status<400,status,json:async()=>data})}));
  const find=(path,method='GET')=>calls.find(c=>c.url.includes(path)&&c.method===method&&!c.done);
  const answer=(path,method,data,status)=>{const c=find(path,method);if(!c)throw new Error('no pending '+method+' '+path);c.done=true;c.resolve(data,status);return c;};
  return {fetch,calls,find,answer,flush:()=>new Promise(r=>setImmediate(r))};
}
const topRes=(nick,rank=1,total=1)=>({season:'all',board:'wave10',total,rows:[{id:7,rank,nick,score:0.1,tie:1,detail:{dashes:1,chain:1},win:12,created_at:1}],me:{id:7,rank,nick,score:0.1,tie:1,detail:{dashes:1,chain:1},win:12,created_at:1}});
class AudioStub {
  constructor(){this.paused=true;this.volume=1;this.currentTime=0;}
  play(){this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
}
/* ---------- 옷장·업적 (wardrobe + achievements, 4-9) ---------- */
const J=x=>JSON.parse(JSON.stringify(x));
const kstToday=()=>new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
function wscPrefix(a,t=1000,neutral=true){a.onDir('f',t);if(neutral)a.onDir('n',t+10);a.onDir('d',t+20);a.onDir('df',t+30);return t+30;}
function wscRun(a,A,B,t=1000){const df=wscPrefix(a,t);a.onDir('b',df+(A-1)*F);if(B!=null)a.onButton(2,df+(A-1+B)*F);return a.wsc.last;}
function wscTaskRun(a,waves,B=1,t=7000){
  let df=wscPrefix(a,t);
  for(let n=1;n<waves;n++){
    a.onDir('f',df+20);a.onDir('n',df+30);
    df=wscPrefix(a,df+50);
  }
  a.onDir('b',df+7*F);a.onButton(2,df+(7+B)*F);return a.wsc.last;
}
/* ---------- 기원권 (↘+RP) and the 기원초 link (2026-09-23) ---------- */
// helpers: t0 fires the 기원권, tRec is the recovery end the link is measured against
const giwonRec = (a,t0) => t0 + (a.GP_FREE-1)*F;   // 해제 = 중립이 들어가는 칸 (GP_FREE)
function giwon(a,t0=1000){ a.onDir('df',t0); a.onButton(2,t0); return a; }
// fire: the frame relative to the recovery end that the 대각+RP lands on (negative = pre-input inside the
// recovery, which the buffer carries out to the recovery-end frame) · pre: frames the start 6 sits in front
// of the neutral · n: neutral hold frames · rp: extra ms on the RP
function linkAfter(a,{fire=1,pre=1,n=1,rp=0,route='mist',t0=1000}={}){
  const rec=giwonRec(a,t0); a.onDir('n',t0+100);
  const tRP = rec+fire*F, tN = tRP-(route==='standard'?n+1:n)*F, tF = tN-pre*F;
  a.onDir('f',tF); a.onDir('n',tN);
  if(route==='standard'){ a.onDir('d',tN+n*F); a.onDir('df',tRP); a.onButton(2,tRP+rp); }
  else { a.onDir('df',tRP); a.onButton(2,tRP+rp); }
  a.tick(rec+4*F); // an RP that landed inside the recovery sits in the buffer until the recovery ends
  return a.session.attempts.at(-1);
}

const gpBoot = () => { const a=boot(); a.setMode('giwon'); return a; };
// one full practice attempt: a 기원권, then the EWGF that links out of its recovery
function gpAttempt(a,opts={},t0=1000){ a.onDir('n',t0-100); giwon(a,t0); return linkAfter(a,{...opts,t0}); }
const gpCounters = s => ({tries:s.tries,hits:s.hits,onTime:s.onTime,streak:s.streak,best:s.best,aborted:s.aborted});
const gpCells = a => new Map([...a.get('gpAxis').innerHTML.matchAll(/class="wsc-cell([^"]*)" data-frame="(\d+)"/g)].map(m=>[Number(m[2]),m[1].trim()]));

module.exports = {html, BANNED, APP_NAMES, topLevelNames, boot, dash, F, fr, mistInput, bdOut, bdSet, samplePad, backend, topRes, AudioStub, J, kstToday, wscPrefix, wscRun, wscTaskRun, giwonRec, giwon, linkAfter, gpBoot, gpAttempt, gpCounters, gpCells};
