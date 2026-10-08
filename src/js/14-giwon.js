/* ---------- 기원권 (↘+RP) and the 기원초 link ----------
   기원권 is judged as a strike, never an EWGF attempt (결정 12(strikes) 취급). The link measures one thing —
   the frame the following EWGF comes out on, max(pressed slot, release slot) — and never reproduces a
   hit frame (결정 27(mist)). Route validity is read, not decided here: whatever attempt() already calls an EWGF. */
let giwonLink = null;                       // {t0, tHit, tRec, until} armed by a 기원권, consumed by the next EWGF attempt
let stiffBar = null;                        // {t0, tRec, ax, ay} 경직 게이지 표시 전용 상태. 판정은 읽지 않는다
let giwonRehit = false;                     // 배잡기 중인 같은 더미를 또 친 기원권인가 (= 연결 실패). gpStart가 소비한다
let giwonRP = null;                         // {t, slot, kind} an RP with no command, waiting one 60Hz slot for the other half of a ↘
function giwonClear(){ giwonLink = null; giwonRP = null; giwonBuf = null; stiffBar = null; gp.run = null; if(mode==='giwon'){ gp.notice='ready'; renderGp(); } }
// Keyboard ↘+RP is three keydowns, so the button can arrive before the diagonal completes. Hold an
// otherwise-failing RP for its own slot; onDir fires the 기원권 if the ↘ lands there, tick replays it if not.
// Only a fresh half-diagonal pressed in this very slot can still become a ↘ (a keyboard chord, or
// a pad reporting one axis a poll early) — or an RP from neutral with no command at all, which may be
// the first of the three keydowns (RP, ↓, →). Everything else is judged straight away, undelayed.
function giwonStage(t, kind){
  if(giwonRP) return false;
  const half = (heldDir==='f' || heldDir==='d') && prevDir==='n' && frameSlot(heldDirT)===frameSlot(t);
  // 상태 1인데 중립을 쥐고 있다 = 경직이 그 N을 버렸다(평소의 N은 상태 2로 넘긴다). 이 RP도 같은 칸의 ↘를 기다린다
  const fromN = heldDir==='n' && (kind==='no_cd' || (kind==='early_stage' && cd.state===1));
  if(!half && !fromN) return false;
  giwonRP = {t, slot: frameSlot(t), kind, fromN}; return true;
}
function giwonResolve(){
  const g = giwonRP; if(!g) return; giwonRP = null; attempt(g.kind, null, g.t);
  // RP → 6 in one slot and no ↘ followed: the RP's miss is judged as if on arrival, so its endCommand
  // must not swallow the start 6 pressed after it. Rebuild the prefix that 6 began.
  if(g.half==='f'){ startCD(g.halfT); if(cd.chain===0 && !wsc.active) mist = mistNew(g.halfT); }
}
// The diagonal is held right now and no crouch-dash / WSC / mist path owns this RP. The state check is
// what keeps 6N23+RP an EWGF: a completed crouch dash sits in state 4 with the very same ↘ held.
function giwonReady(){ return heldDir==='df' && !mist && !cd.pending && !(wsc.active && wsc.active.back!=null); }
// 기원권 경직(RECOVERY_F): 아무 행동도 나가지 않는다. 걷기·대시는 giwonStiff가 막고, 버튼은 여기서 막는다.
// 인게임 입력 버퍼와 같이 **한 칸**이고 **마지막에 누른 것이 덮어쓴다** — 경직 중에 여러 커맨드를 넣어도
// 한 번에 다 나오지 않는다(사용자 확인 2026-09-27). 버퍼에 남은 하나는 경직이 풀리는 프레임에 나가지만,
// 판정은 **실제 누른 시각**으로 한다: 그래야 대각과 RP가 같은 60Hz 칸이었다는 관계가 유지돼 초풍으로 인정된다.
// 방향은 막지 않으므로 경직 중에 6 N 대각을 미리 굴려 두는 선입력이 그대로 성립한다.
// 경직의 끝은 **60Hz 칸 단위**로 본다(그려진 GP_FREE 칸 전체가 해제 프레임). 원시 시각으로 비교하면
// 그 칸의 앞쪽 절반(최대 8.3ms)에 들어온 중립이 경직으로 버려져, 판정과 눈금이 어긋난 채 한 칸 늦게
// 넣어야 성공하는 것처럼 보였다(사용자 보고 2026-09-28).
const giwonOff = t => frameSlot(t) - frameSlot(giwonLink.tRec);                            // 해제 프레임 기준 칸 차이
const giwonStiff = t => !!giwonLink && giwonOff(t) < 0;
const giwonPre = t => { const c = GP_FREE + giwonOff(t); return c >= GP_BUF_A && c <= GP_BUF_B; }; // 경직 중 시작 6이 남는 선입력 창인가
let giwonBuf = null; // {n, t} 버퍼 한 칸: 경직 마지막 BUFFER_F 안에 마지막으로 누른 버튼
function giwonRecovery(n, t){
  const L = giwonLink;
  if(!L || giwonOff(t) >= 0) return false;
  if(giwonOff(t) >= -GIWON.BUFFER_F) giwonBuf = {n, t};                                   // 덮어쓰기: 마지막 하나만 남는다
  else if(mode==='giwon' && gp.run){ gp.notice='eaten'; gp.last=null; renderGp(); }        // 버퍼 창보다 이른 입력은 버려진다 (남겨 둔 직전 판정보다 이 소식이 우선)
  return true;
}
function giwonArm(t){ // every 기원권 arms the link: the 32f recovery is the move's own, hit or whiff
  // 앞 기원권의 경직 중에 버퍼된 기원권은 누른 칸이 아니라 해제 칸에 나간다. 누른 시각으로 걸면 새 경직이 최대 BUFFER_F만큼 일찍 끝난다.
  if(giwonLink && giwonOff(t) < 0) t = giwonLink.tRec;
  const tHit = t + HIT_CONTACT_MS.giwon;
  // 해제 시각은 GP_FREE 칸 자체다: 입력 칸(1f)에서 GP_FREE-1 프레임 뒤. 그래야 그려진 칸과 판정이 어긋나지 않는다.
  giwonLink = {t0: t, tHit, tRec: t + (GP_FREE-1)*FRAME, until: t + GIWON.LINK_MS};
  stiffBar = {t0: t, tRec: giwonLink.tRec, ax: null};   // 게이지는 링크가 소비된 뒤에도 해제 연출을 끝까지 보여 준다
  gpStart(t, giwonLink);
}
// 경직 게이지(사용자 요청 2026-09-27): 더미 발밑(없으면 캐릭터 발밑)에서 **경직이 끝나는 시점 하나만**
// 보여 준다 — 막대가 다 차는 순간이 중립을 넣는 프레임이다. 선입력 버퍼 구간은 오히려 헷갈려서 그리지 않는다.
// 판정·좌표에는 영향이 없는 표시 전용이며, 막대 자체는 정보라 연출 끄기에서도 그린다(터지는 고리만 생략).
// below: 바닥선 아래로 내리는 거리. 더미 머리 위에 두면 기술 팝 글자에 가려 보이지 않았다(사용자 요청 2026-09-29).
const STIFF_BAR = {w:86, h:11, below:12, flashMs:260};
// 앵커는 바닥에 서 있는 더미를 따라가고, 그 더미가 날아가 버리면 **마지막 자리에 그대로 머문다**.
// 매 프레임 다시 고르면 더미가 뜨는 순간 캐릭터 머리 위로 튀어 보인다(사용자 지적 2026-09-27).
function stiffAnchor(){
  const B = stiffBar; if(!B) return null;
  const d = world.dummy;
  if(d.alive && d.y===0) B.ax = world.dummyX;
  else if(B.ax==null) B.ax = world.charX;   // 칠 더미가 없으면 캐릭터 발밑, 한 번만 정한다
  return B;
}
function drawStiffGauge(g, x, baseY, now){
  const B = stiffBar; if(!B) return;
  const after = now - B.tRec;
  if(after > STIFF_BAR.flashMs){ stiffBar = null; return; }
  const {w, h} = STIFF_BAR, left = x - w/2, top = baseY;
  const u = clamp((now - B.t0)/(B.tRec - B.t0), 0, 1);
  g.save();
  g.fillStyle='rgba(6,12,20,.82)'; g.beginPath(); g.roundRect(left-3, top-3, w+6, h+6, 5); g.fill();
  g.fillStyle='rgba(255,255,255,.12)'; g.fillRect(left, top, w, h);
  if(after < 0){ g.fillStyle = cssVar('--accent','#4CC9FF'); g.fillRect(left, top, w*u, h); }
  else { g.globalAlpha = 1 - after/STIFF_BAR.flashMs; g.fillStyle='#FFFFFF'; g.fillRect(left, top, w, h); g.globalAlpha = 1; }
  g.strokeStyle=cssVar('--gold','#F5C542'); g.lineWidth=2.5;
  g.beginPath(); g.moveTo(left+w, top-6); g.lineTo(left+w, top+h+6); g.stroke();        // 경직이 끝나는 지점 = 중립
  if(after >= 0 && store.fx && !reduced){ const k = after/STIFF_BAR.flashMs;
    g.globalAlpha = 1-k; g.strokeStyle='#FFFFFF'; g.lineWidth=3;
    g.beginPath(); g.arc(x, top+h/2, 16+k*38, 0, Math.PI*2); g.stroke(); g.globalAlpha=1; }
  g.restore();
}
// 판정 기준(2026-09-27 사용자 인게임 확인): **초풍이 GP_TARGET(49f)까지 발동하면 성공**이고 그 하나만 본다.
// 루트는 보지 않는다 — 초풍으로 인정된 발동이면 된다(인정 자체는 기존 초풍 판정 그대로: 6N23·623·6N3 모두 결정 1(wave-input)·27(mist)의 초풍이면 된다).
// 발동 프레임은 입력 시각이 아니라 실제로 기술이 나가는 프레임이다: 경직 중 선입력은 해제 프레임에 나가므로
// max(누른 칸, 해제 칸)이 된다. 중립·시작 6 위치는 무엇이 틀렸는지 보여주는 참고값으로만 남긴다.
// startT/neutralT = 이어 넣은 초풍의 시작 6과 그것을 놓은 중립(루트에 따라 없을 수 있다).
function giwonTake(a, t, startT, neutralT){
  const L = giwonLink; if(!L) return null;
  giwonLink = null;
  if(t > L.until || (startT > 0 && startT <= L.t0)) return null;
  const rec = frameSlot(L.tRec);
  const fire = Math.max(0, frameSlot(t) - rec);                 // 발동: 0이면 해제 프레임(GP_FREE)에 나갔다
  const n = neutralT > 0 ? frameSlot(neutralT) - rec : null;    // 참고: 중립 위치
  const f = startT   > 0 ? frameSlot(startT)   - rec : null;    // 참고: 시작 6 선입력 위치
  return {t0: L.t0, fire, cell: GP_FREE + fire, n, f,
          buffered: f != null && f <= GP_BUF_B-GP_FREE && f >= GP_BUF_A-GP_FREE,
          ewgf: a.kind === 'ewgf', route: a.inputRoute || 'standard'};
}
const linkOk = l => l.ewgf && l.fire <= GP_FIRE_MAX;   // 초풍이고, GP_TARGET 프레임까지 발동했다
function linkWhy(l){
  if(l.aborted) return T('gp.abortedNote');
  if(l.again) return T('link.again');
  if(linkOk(l)) return T('link.ok', GP_TARGET);
  if(!l.ewgf) return T('link.noEwgf');
  return T('link.fireLate', l.cell, l.fire - GP_FIRE_MAX, GP_TARGET)
       + (l.f != null && !l.buffered ? T('link.nobufHint', GP_BUF_A, GP_BUF_B) : '');
}
