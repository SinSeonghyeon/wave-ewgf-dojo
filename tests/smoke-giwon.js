// 기원권 (↘+RP) and the 기원초 link: real keyboard/pointer listeners with deterministic 60Hz timestamps.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {launch,fileUrl,sleep,stageAssets}=require('../tools/cdp');
const {assemble}=require('../tools/assemble');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.sandbox/giwon/browser');
fs.mkdirSync(out,{recursive:true});
const html=assemble()
  .replace(/const BOARD_URL = '[^']*';/,"const BOARD_URL = '';")
  .replace(/\}\)\(\);\s*<\/script>/,'globalThis.giwonTest={GP_BUF_A,GP_BUF_B,GP_CHALLENGE,gpStartChallenge,pops,sparks,T,world,GIWON,GIWON_ZOOM,zoomAt,roomCamera,roomProject,anim,store,HIT_CONTACT_MS,gp,GP_FREE,GP_TARGET,GP_FIRE_MAX,GP_LAST,GP_HIT,GP_NEAR,GP_DUMMY_PX,gpSegments,linkWhy,stiffState:()=>stiffBar,stiffAnchor,STIFF_BAR,impacts};})();</script>');
const notice=html.match(/const NOTICES = \[\s*\{id:'([^']+)'/)[1];
const page=path.join(out,'index.html');fs.writeFileSync(page,html);
stageAssets(html,out);

(async()=>{
  const b=await launch({port:9339,profile:'dojo-giwon-smoke',windowSize:'1366,1000'});
  try{
    await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('wave-ewgf-dojo-v1',JSON.stringify({v:4,lang:'ko',sound:0,fx:1,noticeSeen:${JSON.stringify(notice)},visitDay:new Date(Date.now()+9*3600e3).toISOString().slice(0,10)}));`});
    await b.navigate(fileUrl(page));
    const click=sel=>b.evalJs(`document.querySelector(${JSON.stringify(sel)}).click()`);
    const read=()=>b.evalJs(`({kind:document.querySelector('#rKind').textContent,title:document.querySelector('#rTitle').textContent,coach:document.querySelector('#coachMsg').textContent,segTitle:document.querySelector('#segTitle').textContent,seg:document.querySelector('#segBar').textContent,tries:+document.querySelector('#stTry').textContent,dashes:+document.querySelector('#stDash').textContent,anim:giwonTest.anim.kind})`);

    // One ↘+RP. `lead` is how many frames the first half of the diagonal comes early; `order`
    // decides whether the RP keydown is delivered before or after the diagonal completes.
    const giwon=async({side=1,lead=0,first='d',rpFirst=false,hold=0,touch=false}={})=>{
      await sleep(860);   // the 기원권 recovery locks input for GIWON.RECOVERY_F after the previous rep
      await b.evalJs(`(()=>{
        const F=1000/60,base=Math.floor((performance.now()-180)/F)*F+1;
        const forward=${side}===1?'KeyD':'KeyA';
        const key=(code,time,up=false)=>{const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:time});window.dispatchEvent(e);};
        const pointer=(part,time,up=false)=>{const sel=part==='rp'?'#tbtns [data-btn="2"]':'#tdirs [data-dir="'+(part==='d'?'down':${side}===1?'right':'left')+'"]';const e=new PointerEvent(up?'pointerup':'pointerdown',{pointerId:{f:11,d:12,rp:13}[part],pointerType:'touch',bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:time});document.querySelector(sel).dispatchEvent(e);};
        const press=(part,time,up=false)=>${touch}?pointer(part,time,up):key(part==='f'?forward:part==='d'?'KeyS':'KeyI',time,up);
        const first=${JSON.stringify(first)},second=first==='d'?'f':'d';
        press(first,base);                       // one half of the diagonal
        const full=base+${lead}*F;               // the other half completes ↘
        const rp=full+${hold}*F;
        if(${rpFirst}){press('rp',full-0.4);press(second,full);}
        else{press(second,full);press('rp',rp);}
        const end=Math.max(rp,full)+2;
        for(const part of ['rp','f','d'])press(part,end,true);
      })()`);
      await sleep(60);
      return read();
    };

    // 1. every arrival order, both sides, keyboard
    let giwons=0;
    for(const side of [1,-1]){
      await click(`[data-side="${side}"]`);
      for(const first of ['d','f']) for(const rpFirst of [false,true]) for(const hold of [0,6]){
        if(rpFirst&&hold) continue;                       // the RP cannot both precede the diagonal and trail it
        const r=await giwon({side,first,rpFirst,hold});
        giwons++;
        assert.equal(r.kind,'DEMON SLAYER',JSON.stringify({side,first,rpFirst,hold,r}));
        assert.equal(r.title,'기원권',JSON.stringify({side,first,rpFirst,hold,r}));
        assert.equal(r.anim,'giwon');
        assert.equal(r.tries,0,'기원권 never becomes an EWGF attempt');
        assert.equal(r.dashes,0);
        assert.match(r.coach,/초풍을 노렸다면/,'the EWGF hint rides along');
      }
    }
    await click('[data-side="1"]');

    // 2. the real roll: → is brushed for one frame on the way to ↘, and no MISS is printed in front of it
    const topRow=()=>b.evalJs(`(()=>{const r=document.querySelector('#logBody tr');return r?{res:r.children[2].textContent,cls:r.children[2].className}:null})()`);
    const rolled=await giwon({lead:1,first:'f',hold:1});giwons++;
    assert.equal(rolled.kind,'DEMON SLAYER',JSON.stringify(rolled));
    assert.deepEqual(await topRow(),{res:'기원권',cls:'ok'},'the staged 6 → 3 fault never reaches the log in front of the 기원권');
    // the same roll without an RP still prints the fault once the ↘ leaves
    await sleep(860);
    await b.evalJs(`(()=>{
      const F=1000/60,base=Math.floor((performance.now()-180)/F)*F+1;
      const key=(code,time,up=false)=>{const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:time});window.dispatchEvent(e);};
      key('KeyD',base);key('KeyS',base+F);key('KeyS',base+5*F,true);key('KeyD',base+6*F,true);
    })()`);
    await sleep(80);
    assert.equal((await read()).title,'입력 순서 오류','the fault still fires when the ↘ leaves without an RP');

    // 3. an RP with no held diagonal is still "no command"
    await sleep(860);
    await b.evalJs(`(()=>{const e=new KeyboardEvent('keydown',{code:'KeyI',bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:performance.now()});window.dispatchEvent(e);
      const u=new KeyboardEvent('keyup',{code:'KeyI',bubbles:true,cancelable:true});Object.defineProperty(u,'timeStamp',{value:performance.now()+1});window.dispatchEvent(u);})()`);
    await sleep(120);
    assert.equal((await read()).title,'커맨드 없음',JSON.stringify(await read()));

    // 4. the 기원초 link: 기원권 then an EWGF, graded on the frame it comes out
    const C=await b.evalJs(`({free:giwonTest.GP_FREE,target:giwonTest.GP_TARGET,buf:giwonTest.GIWON.BUFFER_F})`);
    const link=async(fire=1,pre=2)=>{        // fire: the frame the 대각+RP lands on relative to the recovery end (negative = pre-input)
      await sleep(860);
      await b.evalJs(`(()=>{
        const F=1000/60,base=Math.floor((performance.now()-200)/F)*F+1;
        const key=(code,time,up=false)=>{const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:time});window.dispatchEvent(e);};
        key('KeyS',base);key('KeyD',base);key('KeyI',base+0.2);                 // ↘+RP
        key('KeyI',base+1,true);key('KeyD',base+2,true);key('KeyS',base+3,true);
        const rec=base+0.2+(giwonTest.GP_FREE-1)*F;
        const tRP=rec+${fire}*F, tN=tRP-F, tF=tN-${pre}*F;
        key('KeyD',tF);key('KeyD',tN,true);                                     // 6 pre-input during the recovery → neutral
        key('KeyS',tRP);key('KeyD',tRP);key('KeyI',tRP);                        // 대각+RP in one slot
        key('KeyI',tRP+2,true);key('KeyD',tRP+3,true);key('KeyS',tRP+4,true);
      })()`);
      await sleep(fire < 0 ? 900 : 80);        // a pre-input RP waits in the buffer until real time reaches the recovery end
      return read();
    };
    const ok=await link(1);
    assert.equal(ok.title,'기원초 입력 조건 충족',JSON.stringify(ok));
    assert.match(ok.coach,/실제 명중·딜캐 타이밍은 측정하지 않습니다/,'no punish claim (결정 27(mist))');
    assert.equal(ok.segTitle,'기원권 뒤 연결 입력 (프레임)');
    assert.match(ok.seg,new RegExp('발동 '+C.target+'f'));
    assert.match(ok.seg,/중립 0f/);assert.match(ok.seg,/6 선입력 -2f/);
    const segFit=await b.evalJs(`Array.from(document.querySelector('#segBar').children).slice(0,4).every(e=>e.scrollWidth<=e.clientWidth+1)&&getComputedStyle(document.querySelector('#segBar').nextElementSibling).display==='none'`);
    assert.equal(segFit,true,'four link columns fit and the dash legend is hidden');
    // 선입력으로 경직을 넘는 것은 시작 6 하나뿐: 중립까지 경직 중에 풀면 그냥 또 하나의 기원권이 된다
    const pre=await link(-3);giwons++;
    assert.notEqual(pre.title,'기원초 입력 조건 충족','a neutral let go inside the recovery cannot finish the command: '+JSON.stringify(pre));
    assert.match(pre.coach,/초풍이 아닙니다/,JSON.stringify(pre));
    assert.match(pre.seg,/발동 —/,'and the fire column stays empty when it was never an EWGF: '+pre.seg);
    await sleep(1300);
    const late=await link(4);
    assert.match(late.coach,new RegExp((C.free+4)+'f에 발동해 3f 늦었습니다'),JSON.stringify(late));

    // 5. all three languages redraw the same verdict
    await link(1);
    for(const [lang,title] of [['en','Link input conditions met'],['ja','連係の入力条件を満たしました'],['ko','기원초 입력 조건 충족']]){
      await click(`[data-lang="${lang}"]`);
      const r=await read();
      assert.equal(r.title,title,JSON.stringify({lang,r}));
      assert.ok(r.segTitle.length>0&&r.seg.length>0,JSON.stringify({lang,r}));
    }

    // 6. counter hit: the dummy folds in place instead of flying, and the camera pushes in
    await b.evalJs(`(()=>{const w=giwonTest.world;w.dummyX=w.charX+70*giwonTest.store.side;Object.assign(w.dummy,{alive:true,hit:0,type:null,y:0,rot:0});})()`);
    await giwon({});giwons++;
    await sleep(220);                       // the counter lands GIWON.ACTIVE_F frames after the input
    const peak=await b.evalJs(`giwonTest.GIWON_ZOOM.PEAK`);
    const zoomed=await b.evalJs(`({zoom:giwonTest.zoomAt(performance.now()),y:giwonTest.world.dummy.y,move:giwonTest.world.dummy.move,renderer:document.querySelector('#stageBox').dataset.renderer})`);
    assert.equal(zoomed.move,'giwon');
    assert.ok(zoomed.zoom>1&&zoomed.zoom<=peak,JSON.stringify(zoomed));
    assert.equal(zoomed.y,0,'배잡기 경직: the dummy stays on its feet');
    const shot=path.join(out,'counter-zoom.png'),capture=await b.send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(shot,Buffer.from(capture.result.data,'base64'));
    await sleep(1300);
    assert.ok(await b.evalJs(`giwonTest.zoomAt(performance.now())===1`),'the zoom settles back exactly');

    // 7. 기원초 연습 모드: the recovery drawn frame by frame, on one screen with play
    await click('[data-mode="giwon"]');
    const K=await b.evalJs(`({free:giwonTest.GP_FREE,target:giwonTest.GP_TARGET,last:giwonTest.GP_LAST,hit:giwonTest.GP_HIT,near:giwonTest.GP_NEAR,bufA:giwonTest.GP_BUF_A,bufB:giwonTest.GP_BUF_B,total:giwonTest.GP_CHALLENGE,segs:giwonTest.gpSegments().length})`);
    assert.equal(await b.evalJs(`document.querySelector('#modes [data-mode="giwon"]').textContent`),'기원초 연습','the tab is named after the link');
    assert.equal(await b.evalJs(`document.body.classList.contains('giwon-mode')`),true);
    const gpRead=()=>b.evalJs(`(()=>{const q=s=>document.querySelector(s),axis=q('#gpAxis');return {
      panel:!q('#gpPanel').hidden&&!q('#gpTimeline').hidden,
      result:q('#gpResult').textContent,live:q('#gpLive').textContent,detail:q('#gpDetail').textContent,
      guide:q('#gpGuide').textContent,legend:q('#gpLegend').textContent,ab:q('#gpAB').textContent,stats:q('#gpStats').textContent,
      cells:axis.querySelectorAll('.wsc-cell').length,hit:+axis.querySelector('.wsc-cell.hit').dataset.frame,
      target:+axis.querySelector('.wsc-cell.a').dataset.frame,rec:axis.querySelectorAll('.wsc-cell.rec').length,
      marks:Array.from(axis.querySelectorAll('.wsc-cell.mark')).map(e=>+e.dataset.frame),
      buf:Array.from(axis.querySelectorAll('.wsc-cell.buf')).map(e=>+e.dataset.frame),
      current:(axis.querySelector('.wsc-cell.current')||{dataset:{}}).dataset.frame,
      rows:q('#gpRows').querySelectorAll('tr').length,
      scroll:{left:axis.parentElement.scrollLeft,over:axis.parentElement.scrollWidth>axis.parentElement.clientWidth},
      session:{...giwonTest.gp.session,rows:undefined}};})()`);
    let g=await gpRead();
    assert.equal(g.panel,true,'the panel and the timeline come with the mode');
    assert.equal(g.cells,K.segs,JSON.stringify(g));
    assert.equal(g.hit,K.hit);assert.equal(g.target,K.target);assert.equal(g.rec,1,'the middle of the recovery is one collapsed cell');
    assert.deepEqual(g.buf,Array.from({length:K.bufB-K.bufA+1},(_,i)=>K.bufA+i),'the pre-input window is its own band');
    assert.equal(K.bufB,K.free-2,'해제 바로 앞 칸(47f)은 선입력 창이 아니다 (사용자 확인 2026-09-28)');
    assert.equal(g.scroll.over,false,'the whole axis fits: no sideways scrolling');
    // and the timeline sits right under play instead of below the session stats
    const place=()=>b.evalJs(`(()=>{const r=s=>{const e=document.querySelector(s);return e?e.getBoundingClientRect():null};
      const t=r('#gpTimeline'),st=r('.coach>.stats'),tr=r('.trial');
      const ax=r('#gpAxis');
      return {top:Math.round(t.top),bottom:Math.round(t.bottom),axis:Math.round(ax.bottom),afterTrial:Math.round(t.top-tr.bottom),beforeStats:t.top<st.top,fold:innerHeight,
              fits:document.querySelector('#gpAxis').parentElement.scrollWidth<=document.querySelector('#gpAxis').parentElement.clientWidth+1};})()`);
    const pos=await place();
    assert.equal(pos.beforeStats,true,'the timeline is above the session stats: '+JSON.stringify(pos));
    assert.ok(pos.afterTrial<40,'and directly under the stage: '+JSON.stringify(pos));
    assert.equal(pos.fits,true,JSON.stringify(pos));
    assert.ok(pos.top<pos.fold,'the timeline starts above the fold: '+JSON.stringify(pos));
    // 축 위 구간 이름이 자기 칸에 정확히 얹힌다: 선입력 창 · 중립 · 공격 (사용자 요청 2026-09-28)
    const bands=await b.evalJs(`(()=>{const K=giwonTest,cell=f=>document.querySelector('#gpAxis .wsc-cell[data-frame="'+f+'"]');
      const pick=(cls,a,z)=>{const u=document.querySelector('#gpAxis .gp-band.'+cls),r=u.getBoundingClientRect(),
        x=cell(a).getBoundingClientRect(),y=cell(z).getBoundingClientRect();
        return {text:u.textContent,dl:Math.round(r.left-x.left),dr:Math.round(r.right-y.right),above:r.bottom<=x.top+1,color:getComputedStyle(u).color};};
      return {buf:pick('buf',K.GP_BUF_A,K.GP_BUF_B),free:pick('free',K.GP_FREE,K.GP_FREE),fire:pick('fire',K.GP_TARGET,K.GP_TARGET),
              border:{buf:getComputedStyle(cell(K.GP_BUF_B)).borderTopColor,free:getComputedStyle(cell(K.GP_FREE)).borderTopColor,fire:getComputedStyle(cell(K.GP_TARGET)).borderTopColor}};})()`);
    for(const [key,name] of [['buf','선입력'],['free','중립'],['fire','공격']]){
      const v=bands[key];
      assert.equal(v.text,name,key+' band name');
      assert.ok(Math.abs(v.dl)<=1&&Math.abs(v.dr)<=1,key+' band lines up with its cells: '+JSON.stringify(v));
      assert.equal(v.above,true,key+' band sits above the axis: '+JSON.stringify(v));
    }
    assert.equal(new Set([bands.buf.color,bands.free.color,bands.fire.color]).size,3,'the three bands read apart by color: '+JSON.stringify(bands));
    assert.equal(new Set(Object.values(bands.border)).size,3,'선입력 창·중립·공격 칸의 테두리 색이 서로 다르다: '+JSON.stringify(bands.border));
    assert.ok(g.guide.includes(String(K.target))&&g.legend.includes(String(K.hit)),'the guide and legend read the constants');
    assert.equal(g.live,'기원권을 내면 프레임이 흘러갑니다',JSON.stringify(g));
    // a 기원권 opens an attempt and the counter runs down to the recovery
    await giwon({});giwons++;
    g=await gpRead();
    assert.match(g.live,/^경직 해제까지 \d+프레임$/,JSON.stringify(g));
    assert.ok(+g.current>0&&+g.current<K.free,'the live cell sits inside the recovery: '+g.current);
    assert.ok(g.marks.length>0,'the inputs are drawn as they are pressed');
    // the collapsed spans run a clock: the fill sweeps and the label counts the frame inside them
    const spanClock=()=>b.evalJs(`(()=>{const c=document.querySelector('#gpAxis .wsc-cell.span.rec');
      return {p:Number(getComputedStyle(c).getPropertyValue('--p')),label:c.querySelector('i').textContent,current:c.classList.contains('current'),
              ticks:getComputedStyle(c).backgroundImage.includes('repeating-linear-gradient')};})()`);
    const c1=await spanClock();
    await sleep(200);
    const c2=await spanClock();
    assert.equal(c1.ticks,true,'the collapsed cell still draws one tick per frame');
    assert.ok(c2.p>c1.p&&c2.p<=1,'the fill sweeps across the span as the frames pass: '+JSON.stringify([c1,c2]));
    assert.match(c2.label,/^\d+f$/,'and the label counts the current frame while the clock is inside: '+c2.label);
    // the bag stands alone, always within 기원권 reach in front of the character
    const bag=()=>b.evalJs(`(()=>{const w=giwonTest.world;return {ahead:Math.round((w.dummyX-w.charX)*giwonTest.store.side),alive:w.dummy.alive,hit:w.dummy.hit,px:giwonTest.GP_DUMMY_PX};})()`);
    let parked=await bag();
    for(let i=0;i<20&&!(parked.alive&&!parked.hit);i++){await sleep(200);parked=await bag();} // wait out the knock from the rep above
    assert.equal(parked.alive,true,JSON.stringify(parked));
    assert.equal(parked.ahead,parked.px,'one bag, parked in 기원권 reach in front of the character: '+JSON.stringify(parked));
    await sleep(1200);                      // past GIWON.LINK_MS with no follow-up
    g=await gpRead();
    assert.equal(g.result,'연결 없음 · 중단',JSON.stringify(g));
    assert.equal(g.session.aborted,1);assert.equal(g.session.tries,0,'an abandoned attempt is never graded');
    assert.equal(g.rows,0);
    // an on-time link fills the panel, lists the row and scrolls the target into view
    const linked=await link(1);
    assert.equal(linked.title,'기원초 입력 조건 충족',JSON.stringify(linked));
    // 성공하면 캐릭터 위 팝이 "초풍!"이 아니라 "기원초!"이고 폭죽이 터진다 (사용자 요청 2026-09-28)
    const party=await b.evalJs(`({pop:(giwonTest.pops.at(-1)||{}).text,sparks:giwonTest.sparks.length,rings:giwonTest.impacts.length})`);
    assert.equal(party.pop,'기원초!','성공 팝은 기원초: '+JSON.stringify(party));
    assert.ok(party.sparks>20&&party.rings>=1,'축하 폭죽이 터진다: '+JSON.stringify(party));
    g=await gpRead();
    assert.equal(g.result,'기원초 입력 조건 충족',JSON.stringify(g));
    assert.equal(g.live,'입력 완료 · 타임라인 확인');
    assert.deepEqual({tries:g.session.tries,hits:g.session.hits,onTime:g.session.onTime,streak:g.session.streak},{tries:1,hits:1,onTime:1,streak:1});
    assert.equal(g.rows,1);
    assert.ok(g.marks.includes(K.target),'the 대각+RP is drawn on the gold column');
    assert.ok(g.marks.includes(K.free),'and the neutral that released it on the free frame');
    assert.ok(g.ab.includes('초풍 발동')&&g.ab.includes('중립')&&g.ab.includes('시작 6'),JSON.stringify(g.ab));
    assert.ok(g.ab.includes(K.target+'f'),'the graded box shows the frame it came out on: '+g.ab);
    assert.ok(g.ab.includes('-'+K.near),'the 시작 6 box names the buffer window: '+g.ab);
    // the stiffness gauge runs from the 기원권 to the frame the recovery ends, then clears itself
    await sleep(900);
    const gauge=await b.evalJs(`(async()=>{
      const wait=ms=>new Promise(r=>setTimeout(r,ms));
      const key=(code,up)=>{const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:performance.now()});window.dispatchEvent(e);};
      key('KeyS');key('KeyD');key('KeyI');key('KeyI',true);key('KeyD',true);key('KeyS',true);
      const B=giwonTest.stiffState(), span=B?B.tRec-B.t0:0;
      await wait(400); const mid=giwonTest.stiffState()?(performance.now()-B.t0)/span:null;
      await wait(500); const near=giwonTest.stiffState()?(performance.now()-B.t0)/span:null;
      await wait(500); return {span, mid, near, gone:giwonTest.stiffState()===null, width:giwonTest.STIFF_BAR.w};
    })()`);giwons++;
    assert.ok(Math.abs(gauge.span-(K.free-1)*1000/60)<2,'the gauge spans exactly the frames up to the free one: '+JSON.stringify(gauge));
    assert.ok(gauge.mid>0.4&&gauge.mid<0.7,'half filled halfway through the recovery: '+gauge.mid);
    assert.ok(gauge.near>0.95,'full as the recovery ends: '+gauge.near);
    assert.equal(gauge.gone,true,'and it clears itself once the release flash is over');
    await sleep(1300);
    // 기원초 성공의 2차 고리는 70ms 뒤에 시작한다. 반지름이 음수인 채로 arc에 들어가면 프레임 루프가
    // 통째로 멈춰 페이지가 뻗는다(2026-09-28 사용자 신고). 그 시각을 프레임이 건너가도 살아 있어야 한다.
    const delayed=await b.evalJs(`(async()=>{
      const wait=ms=>new Promise(r=>setTimeout(r,ms));
      const n0=giwonTest.impacts.length;
      giwonTest.impacts.push({x:giwonTest.world.dummyX,y:-64,t0:performance.now()+120,color:'#F5C542'});
      await wait(120); const mid=giwonTest.impacts.length;      // 아직 시작 전: 그리지 않고 버티기만
      await wait(320); return {n0, mid, end:giwonTest.impacts.length, alive:giwonTest.anim.kind!=null};
    })()`);
    assert.ok(delayed.mid>delayed.n0,'the delayed ring waits its turn instead of being dropped');
    assert.equal(delayed.end,delayed.n0,'and expires normally afterwards');
    assert.equal(delayed.alive,true,'the frame loop survived the negative-radius window');
    // 같은 더미를 두 번 치면: 타임라인이 다시 돌지 않고, 게이지도 캐릭터 위로 튀지 않는다
    const twice=await b.evalJs(`(async()=>{
      const wait=ms=>new Promise(r=>setTimeout(r,ms));
      const key=(code,up)=>{const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:performance.now()});window.dispatchEvent(e);};
      const hit=()=>{key('KeyS');key('KeyD');key('KeyI');key('KeyI',true);key('KeyD',true);key('KeyS',true);};
      hit(); await wait(900);                       // 경직이 풀릴 때까지 기다렸다가
      const run=giwonTest.gp.run, t0=run&&run.t0, anchor=giwonTest.stiffAnchor().ax;
      hit();                                        // 배잡기 중인 같은 더미를 또 친다
      const xs=[];
      for(let i=0;i<14;i++){ await wait(30); const B=giwonTest.stiffAnchor(); if(B) xs.push(B.ax); }
      return {same: giwonTest.gp.run===run, t0, again: giwonTest.gp.run&&giwonTest.gp.run.t0,
              drift: xs.length?Math.max(...xs)-Math.min(...xs):0, charX:giwonTest.world.charX, anchor};
    })()`);giwons++;
    assert.equal(twice.same,true,'the second 기원권 on the same bag does not restart the timeline: '+JSON.stringify(twice));
    assert.equal(twice.again,twice.t0,'the open attempt keeps its own start');
    assert.ok(twice.drift<8,'and the gauge stays put instead of jumping to the fighter: '+JSON.stringify(twice));
    assert.ok(Math.abs(twice.anchor-twice.charX)>30,'the gauge is over the bag, not the fighter: '+JSON.stringify(twice));
    await sleep(1400);
    // a late EWGF is graded and fails
    const lateLink=await link(4);
    assert.match(lateLink.coach,new RegExp((K.free+4)+'f에 발동해 3f 늦었습니다'),JSON.stringify(lateLink));
    g=await gpRead();
    assert.equal(g.result,'연결 실패');assert.match(g.detail,new RegExp((K.free+4)+'f에 발동해'));
    assert.deepEqual({tries:g.session.tries,hits:g.session.hits,onTime:g.session.onTime,streak:g.session.streak,best:g.session.best},{tries:2,hits:1,onTime:1,streak:0,best:1});
    assert.equal(g.rows,2);
    for(const [lang,result] of [['en','Link missed'],['ja','連係失敗'],['ko','연결 실패']]){
      await click(`[data-lang="${lang}"]`);
      const t=await gpRead();
      assert.equal(t.result,result,JSON.stringify({lang,t}));
      assert.equal(t.rows,2,lang+': the rows survive the language switch');
      assert.ok(t.guide.includes(String(K.target))&&t.ab.length>0,JSON.stringify({lang,t}));
    }
    // 경직 중 버튼: only the last GIWON.BUFFER_F frames are buffered, and they fire on the recovery-end frame
    const inRecovery=async(lead)=>{         // lead: frames before the recovery ends
      await sleep(860);
      await b.evalJs(`(()=>{
        const F=1000/60,base=Math.floor(performance.now()/F)*F+1;
        const key=(code,time,up=false)=>{const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:time});window.dispatchEvent(e);};
        key('KeyS',base);key('KeyD',base);key('KeyI',base+0.2);                 // ↘+RP
        key('KeyI',base+1,true);key('KeyD',base+2,true);key('KeyS',base+3,true);
        const rec=base+0.2+(giwonTest.GP_FREE-1)*F, t=rec-${lead}*F;
        key('KeyD',t-2*F);key('KeyD',t-F,true);                                 // 6 (1f), all inside the recovery
        key('KeyS',t);key('KeyD',t);key('KeyI',t);
        key('KeyI',t+2,true);key('KeyD',t+3,true);key('KeyS',t+4,true);
      })()`);
      await sleep(900);                     // real time has to reach the recovery-end frame for the release
      return {...await read(), gp:await gpRead()};
    };
    const buffered=await inRecovery(3);giwons++;
    assert.notEqual(buffered.title,'기원초 입력 조건 충족','the neutral was let go inside the recovery: '+JSON.stringify(buffered));
    assert.match(buffered.coach,/초풍이 아닙니다/,JSON.stringify(buffered));
    await sleep(1300);
    const dropped=await inRecovery(20);giwons++;
    assert.equal(dropped.tries,buffered.tries,'no EWGF attempt came out of the dropped button');
    assert.equal(dropped.gp.result,'경직 중 입력 · 버퍼되지 않음',JSON.stringify(dropped.gp));
    assert.equal(dropped.gp.session.tries,3,'a dropped button is never graded');
    // 경직 중에는 걷지도 않는다: the 기원권 pose ends before the 32f do, and the fighter still cannot move
    await sleep(1300);
    const stiff=await b.evalJs(`(async()=>{
      const wait=ms=>new Promise(r=>setTimeout(r,ms));
      const key=(code,up)=>{const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:performance.now()});window.dispatchEvent(e);};
      key('KeyS');key('KeyD');key('KeyI');key('KeyI',true);key('KeyD',true);key('KeyS',true);   // 기원권
      await wait(200);                                 // the 기원권's own 8px step is part of the move
      const x0=giwonTest.world.charX;
      key('KeyD');                                     // hold forward for the rest of the recovery and past it
      await wait(420); const mid=giwonTest.world.charX, anim=giwonTest.anim.kind;
      await wait(400); const out=giwonTest.world.charX;
      key('KeyD',true);
      return {held:Math.abs(mid-x0), walked:Math.abs(out-mid), anim};
    })()`);giwons++;
    assert.ok(stiff.held<1,'holding forward inside the recovery moves the fighter nowhere: '+JSON.stringify(stiff));
    assert.notEqual(stiff.anim,'walk','and the pose is the recovery stance, not a walk: '+stiff.anim);
    assert.ok(stiff.walked>4,'once the recovery is over the same held forward walks again: '+JSON.stringify(stiff));
    await sleep(1300);
    const practice=path.join(out,'practice-mode.png'),prshot=await b.send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(practice,Buffer.from(prshot.result.data,'base64'));
    // the hook pose: frozen mid-swing so the shot is not a race against the animation clock
    await b.evalJs(`(()=>{giwonTest.anim.kind='giwon';giwonTest.anim.t0=performance.now()-150;})()`);
    const hook=path.join(out,'hook-pose.png'),hshot=await b.send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(hook,Buffer.from(hshot.result.data,'base64'));
    // and the ordinary moves are still judged here
    const rowsBefore=(await gpRead()).rows;
    await sleep(860);
    await b.evalJs(`(()=>{const F=1000/60,base=Math.floor((performance.now()-160)/F)*F+1;
      const key=(code,time,up=false)=>{const e=new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true,cancelable:true});Object.defineProperty(e,'timeStamp',{value:time});window.dispatchEvent(e);};
      key('KeyD',base);key('KeyD',base+F,true);key('KeyD',base+2*F);key('KeyI',base+3*F);
      key('KeyI',base+3*F+2,true);key('KeyD',base+3*F+3,true);})()`);
    await sleep(80);
    const other=await read();
    assert.equal(other.kind,'DEMON PAW',JSON.stringify(other));
    assert.equal((await gpRead()).rows,rowsBefore,'통발 opens no practice attempt');
    // 10회 도전: 버튼은 이 모드에서만 보이고, 카운트다운 → 진행 → 취소가 HUD와 패널에 그대로 나온다
    const chal=()=>b.evalJs(`({hidden:document.querySelector('#gpChallengeBtn').hidden,btn:document.querySelector('#gpChallengeBtn').textContent,
      status:document.querySelector('#gpChallengeStatus').textContent,center:document.querySelector('#hudCenter').textContent,
      score:document.querySelector('#hudScore').textContent,state:giwonTest.gp.challenge.status})`);
    let ch=await chal();
    assert.equal(ch.hidden,false,'도전 버튼은 기원초 연습에 있다');
    assert.equal(ch.status,await b.evalJs(`giwonTest.T('gp.challengeHint',giwonTest.GP_CHALLENGE)`),'시작 전에는 안내 문구');
    await click('#gpChallengeBtn');
    ch=await chal();
    assert.equal(ch.state,'countdown',JSON.stringify(ch));
    assert.match(ch.center,/^[1-3]$/,'카운트다운이 씬 가운데에 뜬다: '+JSON.stringify(ch));
    await sleep(3300);
    ch=await chal();
    assert.equal(ch.state,'running',JSON.stringify(ch));
    assert.equal(ch.center,'','시작하면 카운트다운이 사라진다');
    assert.equal(ch.score,'0 / '+K.total,JSON.stringify(ch));
    await link(1);giwons++;
    ch=await chal();
    assert.equal(ch.score,'1 / '+K.total,'평가된 시도만 진행도를 올린다: '+JSON.stringify(ch));
    await click('#gpChallengeBtn');
    ch=await chal();
    assert.equal(ch.state,'cancelled',JSON.stringify(ch));
    assert.equal(ch.score,'','취소하면 HUD가 비워진다');

    await click('[data-mode="free"]');
    assert.equal(await b.evalJs(`document.querySelector('#gpPanel').hidden&&document.querySelector('#gpTimeline').hidden`),true,'and both panels leave with the mode');
    assert.equal(await b.evalJs(`giwonTest.gp.challenge.status`),'cancelled','모드를 벗어나면 도전도 끝난다');

    // 8. touch controls, mobile layout
    await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await b.send('Emulation.setTouchEmulationEnabled',{enabled:true});
    await b.send('Emulation.setEmulatedMedia',{features:[{name:'pointer',value:'coarse'}]});
    for(const side of [1,-1]){
      await click(`[data-side="${side}"]`);
      const was=(await read()).tries;
      const r=await giwon({side,touch:true,hold:2});giwons++;
      assert.equal(r.kind,'DEMON SLAYER',JSON.stringify({side,r}));
      assert.equal(r.tries,was,'a touch 기원권 still adds no EWGF attempt');
    }
    await click('[data-mode="giwon"]');
    const narrow=await place();
    assert.equal(narrow.fits,true,'the axis fits at 390px too: '+JSON.stringify(narrow));
    const mobileGp=path.join(out,'practice-390.png'),gshot=await b.send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(mobileGp,Buffer.from(gshot.result.data,'base64'));
    await click('[data-mode="free"]');
    const mobile=path.join(out,'touch-390.png'),mshot=await b.send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(mobile,Buffer.from(mshot.result.data,'base64'));
    assert.equal(await b.evalJs(`document.documentElement.scrollWidth<=innerWidth`),true,'no horizontal overflow at 390px');

    assert.equal(b.errors.length,0,JSON.stringify(b.errors));
    console.log(JSON.stringify({ok:true,giwons,screenshots:[shot,practice,hook,mobileGp,mobile],errors:b.errors},null,2));
  }finally{b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
