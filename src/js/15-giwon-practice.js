/* ---------- 기원초 연습 모드: the same judging everywhere, with the recovery drawn frame by frame ----------
   The mode adds a timeline and its own session counters. It never changes what is judged, and unlike
   wsc it leaves the ordinary EWGF stats alone: the follow-up really is an EWGF and should count. */
const gpStats = () => ({tries:0,hits:0,onTime:0,streak:0,best:0,aborted:0,rows:[]});
// 기원권 입력을 1f로 세면 ACTIVE_F+1이 명중 칸이고 리커버리 RECOVERY_F가 그 다음 칸부터 이어지므로,
// 처음 행동할 수 있는(= 중립이 들어가야 하는) 칸은 ACTIVE_F+RECOVERY_F+2다. 2026-09-27 사용자 인게임 확인값 48.
const GP_FREE = GIWON.ACTIVE_F + GIWON.RECOVERY_F + 2;
const GP_TARGET = GP_FREE + 1;                           // 초풍이 발동해야 하는 목표 프레임. 판정은 여기까지 인정(사용자 확인 2026-09-27)
const GP_FIRE_MAX = GP_TARGET - GP_FREE;                 // 해제 프레임 기준으로 허용하는 발동 지연
const GP_LAST = GP_TARGET + 3;                           // a few frames past it, so a late EWGF still lands on the axis
const GP_NEAR = GIWON.BUFFER_F;                          // 해제 프레임 앞으로 개별 칸을 남기는 범위
// 시작 6을 미리 넣어 두는 창. 해제 바로 앞 칸(47f)은 **선입력 창이 아니다**(사용자 확인 2026-09-28).
const GP_BUF_A = GP_FREE - GP_NEAR, GP_BUF_B = GP_FREE - 2;
const GP_DUMMY_PX = 70;                                  // 기원권 사거리(10~130px) 한가운데. 연습 모드의 더미는 항상 여기 선다
const GP_DUMMY_MS = 250;                                 // and comes back this soon, so the next rep has a target
const GP_HIT = GIWON.ACTIVE_F + 1;                       // cell the counter lands on
const GP_CHALLENGE = 10;                                 // 로컬 10회 도전(2026-09-28). 완주 결과만 기원초 보드에 등록(결정 31(giwon-board))
const gp = {run:null, last:null, notice:'ready', session:gpStats(), challenge:{status:'idle',stats:null}};
// The axis has to fit the panel without sideways scrolling, so the two spans where nothing is
// judged — the 기원권 startup and the middle of the recovery — collapse into one cell each.
// Every frame around the start 6 target stays its own cell, which is what the mode measures.
function gpSegments(){
  const out = [{a:1, b:1}];                                                  // the 기원권 input
  if(GP_HIT-1 >= 2) out.push({a:2, b:GP_HIT-1, span:'startup'});
  out.push({a:GP_HIT, b:GP_HIT});                                            // counter contact
  const near = GP_FREE - GP_NEAR;
  if(near-1 >= GP_HIT+1) out.push({a:GP_HIT+1, b:near-1, span:'rec'});
  for(let f=near; f<=GP_LAST; f++) out.push({a:f, b:f});
  return out;
}
// Cells are measured from the recovery end, not from the input, so the drawn target column and the
// judged offset can never disagree over a slot boundary: cell − GP_FREE === the offset from the free frame.
const gpCell = (r, t) => frameSlot(t) - frameSlot(r.tRec) + GP_FREE;
function gpAbort(){
  const r = gp.run; if(!r) return;
  gp.run = null; gp.session.aborted++;
  gp.last = {aborted:true, t0:r.t0, tHit:r.tHit, tRec:r.tRec, events:r.events.slice()};
  gp.notice = 'aborted'; renderGp();
}
function gpStart(t, link){ // called from giwonArm, so every 기원권 opens an attempt in this mode
  const rehit = giwonRehit; giwonRehit = false;
  if(mode!=='giwon') return;
  // 배잡기 중인 같은 더미를 또 친 기원권은 연결에 실패했다는 뜻이지 새 시도가 아니다(사용자 확인 2026-09-27).
  // 타임라인을 처음부터 다시 돌리지 않고, 읽고 있던 시도와 판정을 그대로 둔다. 더미는 이미 풀려 날아갔으므로
  // 다음 기원권은 새로 선 더미를 치게 되고 그때 새 시도가 열린다.
  if(rehit) return;
  // 바로 다시 치는 것도 실패 기록이 아니다: 열려 있던 시도는 조용히 놓아주고 직전 판정과 눈금은
  // 새 시도의 첫 입력이 들어올 때까지 그대로 둔다. 진짜 중단(GIWON.LINK_MS 만료)만 tick의 gpAbort가 센다.
  gp.run = {t0:t, tHit:link.tHit, tRec:link.tRec, events:[]};
  gp.notice = 'live'; renderGp();
}
function gpInput(ev){ // the axis redraws per input so the marks appear as they are pressed, not only at the verdict
  const r = gp.run; if(!r) return; r.events.push(ev); if(r.events.length>48) r.events.shift(); renderGp();
}
function gpFinish(link, a){
  const r = gp.run; if(!r) return;
  // 재타격 기원권(gpStart 참고)은 시도를 새로 열지 않는다. 그 링크로 들어온 초풍을 앞 시도의 경직 눈금에 기록하면
  // 발동 칸과 타임라인이 어긋나므로, 앞 시도는 링크 만료 때와 똑같이 중단으로 닫는다.
  if(r.t0 !== link.t0){ gpAbort(); return; }
  gp.run = null;
  const row = {fire:link.fire, cell:link.cell, n:link.n, f:link.f, buffered:link.buffered, ewgf:link.ewgf, route:link.route, kind:a.kind,
               nf:a.nFrames==null?null:a.nFrames, rp:a.frameOff==null?null:a.frameOff,
               onTime:link.fire===GP_FIRE_MAX, ok:linkOk(link),
               t0:r.t0, tHit:r.tHit, tRec:r.tRec, events:r.events.slice()};
  gpRecord(gp.session, row);
  const c = gp.challenge;
  if(c.status==='running'){
    gpRecord(c.stats, row);
    if(c.stats.tries>=GP_CHALLENGE) completeChallenge(c, GP_CHALLENGE); // the only result that reaches the 기원초 board (결정 31(giwon-board))
  }
  gp.last = row; gp.notice = 'done'; renderGp();
  if(c.status==='done') renderRewards(); // rewardBlocked() held the chest during the challenge
}
function gpRecord(st, row){
  st.tries++;
  if(row.ok){ st.hits++; st.streak++; st.best=Math.max(st.best,st.streak); } else st.streak=0;
  if(row.onTime) st.onTime++;
  st.rows.unshift(row); if(st.rows.length>12) st.rows.pop();
}
// 10회 도전: 평가된 시도만 센다(중단은 분모에서 빠지는 기존 규칙 그대로). 끝까지 마친 결과만 순위에 올린다(completeChallenge).
function gpStartChallenge(){
  if(mode!=='giwon'||modalOpen()||jackpotBusy) return;
  donateNudgeDefer();
  const cancel = ['countdown','running'].includes(gp.challenge.status);
  resetInput();
  if(cancel) gp.challenge={status:'cancelled',stats:null};
  else gp.challenge={status:'countdown', startAt:performance.now()+3000, remaining:3, stats:gpStats()};
  renderGp(); renderRewards(); renderTrialRank();
}
function gpChallengeCancel(){
  if(!['countdown','running'].includes(gp.challenge.status)) return;
  gp.challenge={status:'cancelled',stats:null};
  $('hudCenter').textContent=''; $('hudScore').textContent='';
  if(mode==='giwon') renderGp();
}
function gpTick(t){
  const c = gp.challenge;
  if(c.status!=='countdown') return;
  if(t<c.startAt){ const left=Math.min(3,Math.ceil((c.startAt-t)/1000)); if(left!==c.remaining){ c.remaining=left; renderGpChallenge(); } return; }
  c.status='running'; gp.notice='ready'; renderGp();
}
function renderGpChallenge(){
  if(mode!=='giwon') return;
  const c = gp.challenge, busy = c.status==='countdown'||c.status==='running', st = c.stats;
  $('gpChallengeBtn').textContent=T(busy?'wsc.cancelShort':'wsc.startShort',GP_CHALLENGE);
  $('gpChallengeBtn').title=T(busy?'wsc.challengeCancel':'wsc.challengeStart',GP_CHALLENGE);
  $('gpChallengeBtn').setAttribute('aria-label',$('gpChallengeBtn').title);
  $('gpChallengeStatus').textContent = c.status==='countdown' ? T('wsc.countdown',c.remaining)
    : c.status==='running' ? T('wsc.challengeProgress',st.tries,GP_CHALLENGE,st.hits)
    : c.status==='done' ? T('wsc.challengeDone',st.hits,GP_CHALLENGE,Math.round(st.hits/GP_CHALLENGE*100),st.best)
    : T(c.status==='cancelled'?'wsc.challengeCancelled':'gp.challengeHint',GP_CHALLENGE);
  $('hudCenter').textContent = c.status==='countdown'?String(c.remaining):'';
  $('hudScore').textContent  = c.status==='running'?st.tries+' / '+GP_CHALLENGE:'';
}
const gpOff = v => v==null ? '—' : (v>0?'+':'')+v+'f';
const gpReason = row => linkWhy(row);
function renderGpLive(now){
  if(mode!=='giwon') return;
  const r = gp.run, cell = r ? clamp(gpCell(r, now), 1, GP_LAST) : null;
  const left = r ? GP_FREE-gpCell(r, now) : 0;   // 경직이 풀리기까지 남은 프레임
  const text = r ? (left>0?T('gp.liveWait',left):left===0?T('gp.liveNow'):T('gp.livePast',-left))
                 : T(gp.last?'gp.liveDone':'gp.liveReady');
  const el = $('gpLive'); if(el.textContent!==text) el.textContent=text;
  el.dataset.frame = cell==null?'':String(cell);
  for(const c of $('gpAxis').querySelectorAll('.wsc-cell')){ // a collapsed span is current for every frame it covers
    const a = Number(c.dataset.frame), b = Number(c.dataset.to||a), cur = cell!=null && cell>=a && cell<=b;
    c.classList.toggle('current', cur);
    if(b>a){ // and it shows the clock running through it: the fill sweeps, the label counts the frame
      c.style.setProperty('--p', (cell==null||cell<a ? 0 : cell>b ? 1 : (cell-a+1)/(b-a+1)).toFixed(3));
      const i = c.querySelector('i'), text = cur ? cell+'f' : c.dataset.label;
      if(i && i.textContent!==text) i.textContent = text;
    }
  }
}
function renderGp(){
  if(mode!=='giwon') return;
  const glyph=d=>glyphFor(d), st=gp.session, cells=[];
  // 눈금은 진행 중인 시도를 따라가되, 아직 입력이 없으면 직전 시도의 눈금을 그대로 둔다
  const kept = gp.last && !gp.last.aborted ? gp.last : null;
  const view = gp.run ? (gp.run.events.length ? gp.run : (kept || gp.run)) : (gp.last || null);
  $('gpCommand').textContent=glyph('df')+'+RP · '+T('gp.then')+' · 6 N '+glyph('df')+'+RP';
  $('gpGuide').textContent=T('gp.guide',GIWON.ACTIVE_F,GIWON.RECOVERY_F,GP_FREE,GP_TARGET,GIWON.BUFFER_F);
  $('gpNote').textContent=T('gp.note',GP_TARGET,GIWON.RECOVERY_F,GIWON.BUFFER_F,GP_FREE);
  const segs = gpSegments(), cols = [];
  for(const sg of segs){
    const ev = view ? view.events.filter(e=>{const c=gpCell(view,e.t); return c>=sg.a&&c<=sg.b;}) : [];
    const marks = ev.map(e=>e.btn?['','LP','RP','LK','RK'][e.btn]:glyph(e.dir));
    if(!view&&sg.a===1) marks.push(glyph('df'));
    const cls=(sg.a===GP_HIT?' hit':'')+(sg.span?' span'+(sg.span==='rec'?' rec':''):'')
      +(sg.a>=GP_BUF_A&&sg.a<=GP_BUF_B?' buf':'')                    // 시작 6 선입력 창(47f는 빠진다)
      +(sg.a===GP_FREE?' b':'')                                      // 경직이 풀려 처음 행동할 수 있는 프레임
      +(sg.a===GP_TARGET?' a':'')+(marks.length?' mark':'');         // 초풍 발동 목표
    const frames = sg.b-sg.a+1;
    const label = sg.span ? T(sg.span==='rec'?'gp.spanRec':'gp.spanStartup', frames) : sg.a+'f';
    // a collapsed span is drawn as wide as the time it covers, with one tick per frame inside (--n)
    // and a fill that sweeps across it while the clock is inside it (--p, set by renderGpLive)
    cols.push('minmax(0,'+(sg.span?(1+frames/14).toFixed(2):'1')+'fr)');
    const style = sg.span ? ' style="--n:'+frames+'"' : '';
    cells.push('<div class="wsc-cell'+cls+'" data-frame="'+sg.a+'" data-to="'+sg.b+'" data-label="'+escapeHTML(label)+'"'+style
      +'><b>'+escapeHTML(marks.join('\n'))+'</b><i>'+escapeHTML(label)+'</i></div>');
  }
  // 축 위에 구간 이름을 붙인다: 회색 선입력 창 · 금색 중립 · 주홍 공격 (사용자 요청 2026-09-28)
  const col = f => segs.findIndex(sg => f>=sg.a && f<=sg.b) + 1;
  const band = (key,cls,x,y) => '<u class="gp-band '+cls+'" style="grid-column:'+col(x)+'/'+(col(y)+1)+'">'+escapeHTML(T(key))+'</u>';
  $('gpAxis').style.setProperty('grid-template-columns', cols.join(' '));
  $('gpAxis').innerHTML = band('gp.bandBuf','buf',GP_BUF_A,GP_BUF_B)
    + band('gp.bandFree','free',GP_FREE,GP_FREE) + band('gp.bandFire','fire',GP_TARGET,GP_TARGET) + cells.join('');
  $('gpLegend').textContent=T('gp.legend',GP_HIT,GP_FREE,GP_TARGET,GP_BUF_B-GP_BUF_A+1);
  renderGpLive(Math.max(performance.now(), gp.run?gp.run.t0:0));
  const r = gp.last && !gp.last.aborted ? gp.last : null;
  $('gpResult').textContent = r ? T(r.ok?'gp.success':'gp.fail') : T('gp.'+gp.notice);
  const cell=(key,text,ok,target)=>'<div class="'+(text==null?'':ok?'ok':'no')+'">'+escapeHTML(T(key))+'<b>'+escapeHTML(text==null?'—':text)+'</b>'+escapeHTML(target)+'</div>';
  $('gpAB').innerHTML =
    cell('gp.fireLabel', r?(r.ewgf?r.cell+'f':T('gp.noEwgf')):null, !!r&&r.ok, T('gp.fireTarget', GP_TARGET))
  + cell('gp.nLabel', r?gpOff(r.n):null, !!r&&r.n===0, T('gp.nTarget'))
  + cell('gp.startLabel', r?gpOff(r.f):null, !!r&&r.buffered, T('gp.startTarget', GP_FREE-GP_BUF_A, GP_FREE-GP_BUF_B))
  + cell('gp.rpLabel', r&&r.rp!=null?gpOff(r.rp):null, !!r&&r.rp===0, T('gp.rpTarget'));
  $('gpDetail').textContent = gp.last ? gpReason(gp.last) : '';
  renderGpChallenge();
  const values=[['wsc.tries',st.tries],['wsc.hits',st.hits],['wsc.rate',st.tries?Math.round(st.hits/st.tries*100)+'%':'—'],[['gp.onTime',GP_TARGET],st.onTime],['wsc.streak',st.streak],['wsc.best',st.best]];
  $('gpStats').innerHTML=values.map(kv=>'<div><b>'+kv[1]+'</b>'+escapeHTML(Array.isArray(kv[0])?T.apply(null,kv[0]):T(kv[0]))+'</div>').join('');
  $('gpRows').innerHTML=st.rows.map(x=>'<tr><td>'+escapeHTML(T(x.ok?'wsc.ok':'wsc.fail'))+'</td><td>'+escapeHTML(x.ewgf?x.cell+'f':'—')+'</td><td>'+escapeHTML(gpOff(x.n))+'</td><td>'+escapeHTML(gpReason(x))+'</td></tr>').join('');
}

