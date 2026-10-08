/* ---------- WSC: shared move recognition, separate practice records and local challenge ---------- */
const wscStats = () => ({tries:0,hits:0,streak:0,best:0,aborted:0,errors:0,rows:[]});
const WSC_TARGET = 10;
const wsc = {prefix:0,prefixAt:0,active:null,last:null,notice:'ready',session:wscStats(),challenge:{status:'idle',stats:null}};
const wscFrames = ms => Math.floor(ms/FRAME+0.5);
const wscA = ms => wscFrames(ms)+1; // A counts the diagonal itself as frame 1; B remains elapsed frames
function wscJudge(aRaw,bRaw){
  const a=wscA(aRaw), b=bRaw==null?null:wscFrames(bRaw), aOK=a>=8&&a<=10;
  return {a,b,aRaw,bRaw,aOK,bOK:b!==null&&bRaw>0&&b>=1&&b<=a-7,ok:aOK&&b!==null&&bRaw>0&&b>=1&&b<=a-7};
}
function wscCancel(cancelChallenge=true){
  if(wsc.active||wsc.prefix){ wsc.last=null; wsc.notice='cancelled'; }
  wsc.active=null; wsc.prefix=0;
  if(cancelChallenge && ['countdown','running'].includes(wsc.challenge.status)){
    wsc.challenge.status='cancelled'; $('hudCenter').textContent=''; $('hudScore').textContent='';
  }
}
function wscStartChallenge(){
  if(mode!=='wsc'||modalOpen()||jackpotBusy) return;
  donateNudgeDefer();
  const cancel=['countdown','running'].includes(wsc.challenge.status);
  resetInput();
  if(!cancel){
    wsc.challenge={status:'countdown',startAt:performance.now()+3000,remaining:3,stats:wscStats(),taskN:Math.floor(Math.random()*4)};
    wsc.last=null; wsc.notice='ready';
  }
  renderWsc(); renderRewards(); renderTrialRank();
}
function wscTick(t){
  const c=wsc.challenge;
  if(c.status==='countdown'){
    if(t<c.startAt){ const left=Math.min(3,Math.ceil((c.startAt-t)/1000)); if(left!==c.remaining){c.remaining=left;renderWscChallenge();} return; }
    wscCancel(false); c.status='running'; wsc.notice='ready'; renderWsc();
  }
  if(wsc.active && t-wsc.active.lastAt>1000){
    if(mode==='wsc'||wsc.active.back!=null) wscFinish(null,'aborted'); else wscCancel(false);
  }
  else if(!wsc.active && wsc.prefix && t-wsc.prefixAt>1000){ wsc.prefix=0; wsc.notice='ready'; renderWsc(); }
}
function wscDir(dir,t,rolled=false){ // rolled: commandDir이 623의 2·3 같은 칸을 6→3으로 본 ↘ — 웨이브를 완성하지 않는다
  if(wsc.challenge.status==='countdown') return;
  const a=wsc.active;
  if(a){
    a.lastAt=t; a.events.push({dir,t});
    if(dir==='f') a.forwards++;
    if(a.back!=null){ if(dir!=='n') a.bad='direction'; }
    else if(dir==='b') a.back=t;
    else if(dir==='f'){ if(a.forwards>1) a.bad='forward'; }
    else if(dir!=='n') a.bad='direction';
  }
  // First forward after d/f is a cancel. A separate start forward completes the next wave.
  if(dir==='f' && (!a || a.back!=null || a.forwards>=2)) wsc.prefix=1;
  else if(dir==='n' && wsc.prefix===1) wsc.prefix=2;
  else if(dir==='d' && (wsc.prefix===1 || wsc.prefix===2)) wsc.prefix=3;
  else if(dir==='df' && wsc.prefix===3 && !rolled){
    // A new wave extends the chain only through cancel 6, N, separate start 6, optional N, 2, 3.
    // The single release before the cancel 6 may be N or 2, matching cd states 4→7→cancelCD.
    const linked=a&&/^df,([nd],)?f,n,f,(n,)?d,df$/.test(a.events.map(e=>e.dir).join(','));
    wsc.active={df:t,back:null,forwards:0,bad:null,lastAt:t,waves:linked?a.waves+1:1,events:[{dir,t}]};
    wsc.prefix=0; wsc.last=null; wsc.notice='backWait';
 // no SFX or lifetime counters
  } else if(dir!=='n' || wsc.prefix!==2){
    if(mode==='wsc' && wsc.prefix && !a){ wsc.session.errors++; if(wsc.challenge.status==='running') wsc.challenge.stats.errors++; wsc.notice='order'; }
    wsc.prefix=0;
  }
  wsc.prefixAt=t; renderWsc();
}
function wscButton(n,t){
  if(wsc.challenge.status==='countdown') return;
  if(!wsc.active){ wsc.notice=n===2?'order':'button'; renderWsc(); return; }
  wsc.active.events.push({btn:n,t});
  wscFinish(t,n!==2?'button':wsc.active.bad || (wsc.active.back==null?'missing':null));
}
function wscRecord(stat,r){
  if(r.reason==='aborted') stat.aborted++;
  else { stat.tries++; if(r.ok){stat.hits++;stat.streak++;stat.best=Math.max(stat.best,stat.streak);}else stat.streak=0; }
  stat.rows.unshift(r); if(stat.rows.length>12) stat.rows.pop();
}
function wscFinish(t,reason){
  const a=wsc.active; if(!a) return;
  const r=wscJudge(a.back==null?0:a.back-a.df,t==null||a.back==null?null:t-a.back);
  if(a.back==null){ r.a=null; r.aRaw=null; r.aOK=false; }
  Object.assign(r,{reason,df:a.df,events:a.events.slice()}); r.ok=!reason&&r.ok;
  const c=wsc.challenge;
  r.timingOK=r.ok;
  if(c.status==='running'){
    r.taskN=c.taskN;r.waves=a.waves;r.taskOK=a.waves===c.taskN+1;
    r.ok=r.ok&&r.taskOK;
  }
  wscRecord(wsc.session,r);
  if(c.status==='running'){
    wscRecord(c.stats,r);
    if(c.stats.tries>=WSC_TARGET) completeChallenge(c,WSC_TARGET);
    else if(reason!=='aborted') c.taskN=Math.floor(Math.random()*4);
  }
  wsc.last=r; wsc.active=null; wsc.prefix=0;
  if(r.timingOK) wscAnimate(); // the move still executes when only the challenge wave count is wrong
  showResult(r.ok?'wave':'miss','WAVE-CANCEL WS UPPER',[r.ok?'wsc.success':r.reason==='aborted'?'wsc.aborted':'wsc.fail'],()=>wscReason(r));
  renderWsc(); renderRewards();
}
function wscAnimate(){
  playSfx('wsc');
  if(!world.dummy.type) tryHit('wsc'); // contact sound is independent of visual-effects settings
  if(!store.fx||reduced) return;
  startAnim('wsc'); moveChar(26,140);
  pop(T('wsc.move'),cssVar('--gold','#F5C542'),36,{y:-104,life:650});
}
function wscReason(r){
  if(r.reason==='aborted') return T('wsc.aborted');
  const parts=r.reason?[T('wsc.'+r.reason)]:[];
  if(r.taskN!=null) parts.push(T('wsc.waveResult',r.taskN+1,r.waves));
  if(r.a!=null&&!r.aOK) parts.push(T(r.a<8?'wsc.aEarly':'wsc.aLate'));
  if(r.b!=null){
    if(r.bRaw===0) parts.push(T('wsc.simultaneous'));
    else if(r.b<1) parts.push(T('wsc.bEarly'));
    else if(r.b>(r.aOK?r.a-7:3)) parts.push(T('wsc.bLate'));
  }
  if(r.a!=null&&!r.aOK && parts.length>1) parts.push(T('wsc.fixA'));
  return parts.join(' · ') || T('wsc.ok');
}
function renderWscChallenge(){
  if(mode!=='wsc') return;
  const c=wsc.challenge, busy=c.status==='countdown'||c.status==='running', st=c.stats;
  $('wscChallengeBtn').textContent=T(busy?'wsc.cancelShort':'wsc.startShort',WSC_TARGET);
  $('wscChallengeBtn').title=T(busy?'wsc.challengeCancel':'wsc.challengeStart',WSC_TARGET);
  $('wscChallengeBtn').setAttribute('aria-label',$('wscChallengeBtn').title);
  $('wscChallengeStatus').textContent=c.status==='countdown'?T('wsc.countdown',c.remaining):c.status==='running'?T('wsc.challengeProgress',st.tries,WSC_TARGET,st.hits):c.status==='done'?T('wsc.challengeDone',st.hits,WSC_TARGET,Math.round(st.hits/WSC_TARGET*100),st.best):T(c.status==='cancelled'?'wsc.challengeCancelled':'wsc.challengeHint',WSC_TARGET);
  $('wscTask').hidden=!busy;
  $('wscTask').dataset.n=busy?String(c.taskN):'';
  $('wscTask').textContent=busy?T('wsc.task',st.tries+1,WSC_TARGET,c.taskN,c.taskN+1,wsc.active?wsc.active.waves:0):'';
  $('hudCenter').textContent=c.status==='countdown'?String(c.remaining):'';
  $('hudScore').textContent=c.status==='running'?st.tries+' / '+WSC_TARGET:'';
}
function wscOtherMove(){
  wscCancel(false); wsc.last=null;
  if(mode==='wsc'){ wsc.notice='otherMove'; renderWsc(); }
}
function renderWscLive(now){
  if(mode!=='wsc') return;
  const a=wsc.active, frame=a?Math.max(1,wscA(Math.max(0,now-a.df))):null;
  const text=a?(a.back==null?T('wsc.liveA',frame):T('wsc.liveB',wscA(a.back-a.df),wscFrames(Math.max(0,now-a.back)))):T(wsc.last?'wsc.liveDone':'wsc.liveReady');
  const el=$('wscLive'); if(el.textContent!==text) el.textContent=text;
  const changed=el.dataset.frame!==(frame==null?'':String(frame));
  el.dataset.frame=frame==null?'':String(frame);
  for(const cell of $('wscAxis').querySelectorAll('.wsc-cell')){
    const current=frame!=null&&Number(cell.dataset.frame)===frame;
    cell.classList.toggle('current',current);
    if(current&&changed){
      const box=$('wscAxis').parentElement, b=box.getBoundingClientRect(), c=cell.getBoundingClientRect();
      if(c.left<b.left) box.scrollLeft-=b.left-c.left;
      else if(c.right>b.right) box.scrollLeft+=c.right-b.right;
    }
  }
}
function renderWsc(){
  if(mode!=='wsc') return;
  const glyph=d=>glyphFor(d), stat=wsc.session, a=wsc.active, r=wsc.last;
  $('wscCommand').textContent='6N23 · '+glyph('b')+' · RP';
  $('wscGuide').textContent=T('wsc.guide');
  const A=a&&a.back!=null?wscA(a.back-a.df):r?r.a:null;
  const valid=A>=8&&A<=10;
  $('wscLegend').textContent=T('wsc.legend')+(valid?' · '+T('wsc.allow',A,A-7):'');
  const events=a?a.events:r?r.events:[], df=a?a.df:r?r.df:null, cells=[];
  // Only the final d/f and later inputs are timed. The preceding wave is a single command label.
  for(let f=1;f<=15;f++){
    const ev=events.filter(e=>df!=null&&e.t>=df&&wscA(e.t-df)===f);
    const marks=ev.map(e=>e.btn?['','LP','RP','LK','RK'][e.btn]:glyph(e.dir));
    if(df==null&&f===1) marks.push(glyph('df'));
    const cls=(f>=8&&f<=10?' a':'')+(valid&&f>A&&f<=A+A-7?' b':'')+(marks.length?' mark':'');
    cells.push(`<div class="wsc-cell${cls}" data-frame="${f}"><b>${escapeHTML(marks.join('\n'))}</b>${f}f</div>`);
  }
  $('wscAxis').innerHTML=cells.join('');
  renderWscLive(Math.max(performance.now(),a?a.lastAt:0));
  if(r && wsc.viewed!==r){
    wsc.viewed=r; const box=$('wscAxis').parentElement;
    if(box && box.scrollWidth>box.clientWidth) box.scrollLeft=Math.max(0,(Math.min(8,A??8)-2)*39);
  }
  const num=n=>n==null?'—':n+'f';
  const result=r?T(r.ok?'wsc.success':r.reason==='aborted'?'wsc.aborted':'wsc.fail'):T('wsc.'+(a?(a.back==null?'backWait':'rpWait'):wsc.notice));
  $('wscResult').textContent=result;
  const axis=(key,value,raw,ok,target)=>`<div class="${value==null?'':ok?'ok':'no'}">${escapeHTML(T(key))}<b>${num(value)}</b>${escapeHTML(target)}${raw==null?'':`<br>${escapeHTML(T('wsc.elapsed',(raw/FRAME).toFixed(2),raw.toFixed(2)))}`}</div>`;
  const aRaw=r?r.aRaw:a&&a.back!=null?a.back-a.df:null;
  $('wscAB').innerHTML=axis('wsc.aLabel',A,aRaw,valid,T('wsc.aTarget'))+axis('wsc.bLabel',r?r.b:null,r?r.bRaw:null,!!r&&r.aOK&&r.bOK,valid?T('wsc.bTarget',A-7):T('wsc.bPending'));
  $('wscDetail').textContent=r?wscReason(r):'';
  const values=[['tries',stat.tries],['hits',stat.hits],['rate',stat.tries?Math.round(stat.hits/stat.tries*100)+'%':'—'],['streak',stat.streak],['best',stat.best],['aborted',stat.aborted]];
  $('wscStats').innerHTML=values.map(([k,v])=>`<div><b>${v}</b>${escapeHTML(T('wsc.'+k))}</div>`).join('');
  $('wscCounts').textContent=T('wsc.counts',stat.errors);
  $('wscRows').innerHTML=stat.rows.map(x=>`<tr><td>${escapeHTML(T(x.ok?'wsc.ok':x.reason==='aborted'?'wsc.aborted':'wsc.fail'))}</td><td>${num(x.a)}</td><td>${num(x.b)}</td><td>${escapeHTML(wscReason(x))}</td></tr>`).join('');
  renderWscChallenge();
}
$('wscChallengeBtn').addEventListener('click',wscStartChallenge);
$('gpChallengeBtn').addEventListener('click',gpStartChallenge);

