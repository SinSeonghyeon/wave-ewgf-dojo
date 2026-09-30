/* ================= STAGE (canvas) ================= */
const canvas = $('stage'), ctx = canvas.getContext('2d');
let W=800, H=360, dpr=1, stageScale=1;
function resize(){ const r = $('stageBox').getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio||1); stageScale=touchOn?.9:clamp(r.width/1200,1,1.15); W=Math.max(1,r.width)/stageScale; H=Math.max(1,r.height)/stageScale; canvas.width=r.width*dpr; canvas.height=r.height*dpr; ctx.setTransform(dpr*stageScale,0,0,dpr*stageScale,0,0); renderHistory(); }
addEventListener('resize', () => { resize(); applyTouchLayout(); }); resize(); applyTouchUI(); renderTouchSettings();
if(typeof ResizeObserver==='function') new ResizeObserver(()=>{resize();applyTouchLayout();}).observe($('stageBox'));

const world = { charX:120, camX:0, dummyX:460, dummy:{y:0,vx:0,vy:0,rot:0,hit:0,alive:true,respawn:0,type:null,move:null,crumpleUntil:0} }; // dummy.type: null = plain bag (any hit knocks it) · 'high'|'mid'|'low' = rush30 target that only the matching move destroys
const HIT_TYPE = {ewgf:'high', wgf:'high', tongbal:'mid', hellsweep:'low'}; // which dummy each move destroys in rush30
const DUMMY_TYPES = ['high','mid','low'];
const DUMMY_STOP = 36; // px the fighter keeps in front of a live dummy (walking, and every move in rush30)
const anim = { kind:'idle', t0:0, from:0, to:0, moveT0:0, moveFrom:0, moveTo:0 };
const ghosts = [], pops = [], sparks = [], dust = [], bolts = [], impacts = [];
let flash = 0, shake = 0, flashGold = false; // flashGold: jackpot flashes gold instead of the EWGF blue
// 기원권 카운터 줌 (11-4절). Presentation only: one factor drives the 3D room camera and the 2D layer,
// anchored on (화면 가운데, 바닥선), so the fighter's feet stay on the projected floor (결정 5(theme-layout)) and the
// WebGL / Canvas fallback paths cannot drift apart. GIWON_ZOOM.PEAK is an assumption, not a measurement.
let zoomT0 = 0;
function giwonZoomStart(now){ if(store.fx && !reduced) zoomT0 = now; }
function zoomAt(now){
  if(!zoomT0) return 1;
  if(!store.fx || reduced){ zoomT0 = 0; return 1; }
  const u = now - zoomT0;
  if(u < 0) return 1;
  if(u < GIWON_ZOOM.IN_MS) return 1 + (GIWON_ZOOM.PEAK-1)*(u/GIWON_ZOOM.IN_MS);
  const k = (u-GIWON_ZOOM.IN_MS)/GIWON_ZOOM.OUT_MS;
  if(k >= 1){ zoomT0 = 0; return 1; }
  return 1 + (GIWON_ZOOM.PEAK-1)*Math.pow(1-k, 3); // measured: fast at first, then easing out over ~28 frames
}
// character colours live in ITEMS[slot].base (wardrobe); drawFighter reads them through the look

function startAnim(kind){ anim.kind=kind; anim.t0=performance.now(); }
function moveChar(dx, ms){ anim.moveT0=performance.now(); anim.moveFrom=world.charX; anim.moveTo=world.charX+dx*store.side; anim.moveDur=ms; }
// EWGF streak pop styles by consecutive count; level 6 is the cap (numbers keep counting, look stays). color = [css token, fallback]
const STREAK = [null,
  {size:58,  color:['--accent','#4CC9FF'], glow:0,  rings:0, sparks:0,  shake:8},
  {size:64,  color:['--accent','#4CC9FF'], glow:12, rings:0, sparks:0,  shake:8},
  {size:72,  color:['--seg1','#A8E4FF'],   glow:16, rings:1, sparks:0,  shake:10},
  {size:82,  color:['--gold','#F5C542'],   glow:20, rings:1, sparks:8,  shake:12},
  {size:92,  color:['--warn','#F5A524'],   glow:24, rings:2, sparks:14, shake:14},
  {size:100, color:['--red','#E5484D'],    glow:30, rings:3, sparks:22, shake:16, core:'#FFFFFF'}];
const streakStyle = n => STREAK[clamp(n,1,6)];
const puff = (n, dirSign) => { for(let i=0;i<n;i++) dust.push({x:world.charX, y:0, vx:(-1-Math.random()*1.5)*store.side*dirSign, vy:-0.6-Math.random()*1.2, r:3+Math.random()*4, t:1}); };
const fx = {
  crouchDash(){ startAnim('cd'); moveChar(46, 130); puff(4, 1); playSfx('wave'); },
  ewgf(n=1, popKey='pop.ewgf'){
    const L = streakStyle(n), color = cssVar(L.color[0], L.color[1]);
    startAnim('ewgf'); anim.electric=true; moveChar(28, 120); if(store.fx && !reduced){ flash=1; flashGold=false; shake=L.shake; }
    pop(n>1 ? T('pop.streak', n) : T(popKey), color, L.size, {lvl:clamp(n,1,6), glow:L.glow, rings:reduced?0:L.rings, core:L.core, life:n>=4?1100:900});
    if(!reduced) for(let i=0;i<L.sparks;i++) sparks.push({x:world.charX+30*store.side, y:-118, vx:(Math.random()-0.5)*10, vy:-Math.random()*7-2, t:1, c:Math.random()<.5?'#FFFFFF':color});
    playSfx('ewgf'); if(!world.dummy.type) tryHit('ewgf'); // typed dummies are judged by rushStrike
  },
  wgf(){ startAnim('ewgf'); anim.electric=false; moveChar(28, 120); pop(T('pop.wgf'), '#F5A524', 34); if(!world.dummy.type) tryHit('wgf'); },
  tongbal(){ playSfx('tongbal'); startAnim('tongbal'); moveChar(48, 110); puff(3, 1); pop(T('pop.tongbal'), cssVar('--gold','#F5C542'), 40); if(!world.dummy.type) tryHit('tongbal'); }, // fast forward snap
  hellsweep(){ playSfx('hellsweep'); startAnim('hellsweep'); moveChar(22, 110); puff(4, 1); setTimeout(()=>puff(5, 1), 80); pop(T('pop.hellsweep'), cssVar('--red','#E5484D'), 40, {y:-70}); if(!world.dummy.type) tryHit('hellsweep'); }, // fast low sweep: quick forward slide and a second dust burst as the leg comes around
  giwon(){ playSfx('giwon'); startAnim('giwon'); moveChar(8, 110); puff(2, 1); pop(T('pop.giwon'), cssVar('--warn','#F5A524'), 38, {y:-100}); if(!world.dummy.type) tryHit('giwon'); }, // d/f+2: a short hook from a standing guard; almost no travel
  jab(){ startAnim('jab'); pop('?', '#E5484D', 30); },
  stumble(){ startAnim('stumble'); pop('MISS', '#E5484D', 30); },
  dash(short){ if(anim.kind==='ewgf' && performance.now()-anim.t0<260) return; startAnim('dash'); if(short) moveChar(24, 120); else moveChar(64, 150); puff(3, 1); }, // short: the wave restart dash (a full 64px per cycle would double wave travel)
  backdash(){ playSfx('backdash'); startAnim('backdash'); moveChar(-56, 150); puff(3, -1); },
  // 기원초 성공 축하(연출 전용, 판정·좌표에 영향 없음). 소리는 연출 설정과 독립이고 효과음 볼륨을 따른다.
  linkWin(){
    playFanfare();
    if(!store.fx || reduced) return;
    const gold = cssVar('--gold','#F5C542'), colors = [gold, cssVar('--accent','#EC7060'), cssVar('--red','#F29591'), '#FFFFFF'];
    const x = world.charX + 30*store.side;
    for(let k=0;k<3;k++){ // 머리 위로 터지는 폭죽 세 발
      const bx = x + (k-1)*90, by = -250 - k*22;
      impacts.push({x:bx, y:by, t0:performance.now()+k*110, color:colors[k%colors.length]});
      for(let i=0;i<22;i++){ const th = Math.PI*2*i/22, sp = 3+Math.random()*3;
        sparks.push({x:bx, y:by, vx:Math.cos(th)*sp, vy:Math.sin(th)*sp-1, t:1, c:colors[(i+k)%colors.length]}); }
    }
    for(let i=0;i<34;i++) // 위에서 흩뿌려 내려오는 색종이
      sparks.push({x:x+(Math.random()-0.5)*620, y:-330-Math.random()*90, vx:(Math.random()-0.5)*2.2, vy:0.6+Math.random()*1.4, t:1, c:colors[i%colors.length]});
  },
};
function pop(text,color,size,opts){ pops.push({text,color,size,t0:performance.now(),x:world.charX+30*store.side, ...(opts||{})}); } // opts: lvl, glow, rings, core, life, x (world px), y (px above the floor, default −118)
// Presentation contact points in milliseconds, tuned to each pose (not game frame data).
const HIT_CONTACT_MS = {ewgf:180,wgf:180,tongbal:180,hellsweep:160,wsc:200,giwon:Math.round(GIWON.ACTIVE_F*FRAME)}; // giwon만 연출 튜닝값이 아니라 GIWON.ACTIVE_F(가정값)에서 파생된다
const crumpling = (d, now) => d.crumpleUntil>0 && !d.launchAt && now<d.crumpleUntil; // 배잡기 경직: still standing, so a follow-up lands on a grounded opponent
function tryHit(move){ // move: 'ewgf'|'wgf'|'tongbal'|'hellsweep'|'wsc'|'giwon'. Returns true when the dummy is knocked. Plain dummy: any move within reach; typed dummy: only HIT_TYPE[move]
  const d = world.dummy, now = performance.now(); const dist = (world.dummyX - world.charX)*store.side;
  if(!d.alive || (d.hit && !crumpling(d, now)) || dist<10 || dist>130) return false;
  if(d.type && HIT_TYPE[move]!==d.type) return false; // giwon is in no HIT_TYPE, so rush30 targets always read it as a whiff
  const electric = move==='ewgf';
  // 같은 더미를 기원권으로 두 번 치면 연결에 실패한 것이다(사용자 확인 2026-09-27): 배잡기를 풀고
  // 늦은 초풍과 같은 약한 반응으로 살살 날려 보낸다. 새 기원권 자체는 그대로 나가고 링크도 다시 걸린다.
  const again = move==='giwon' && d.move==='giwon' && crumpling(d, now);
  if(again) giwonRehit = true;   // gpStart가 읽고 비운다: 타임라인을 처음부터 다시 돌리지 않는다
  d.hit=1; // reserve immediately; sound, burst and knockback share the contact time
  d.launchAt = now + (HIT_CONTACT_MS[move]??180);
  d.move = move; d.power = again ? 'weak' : null; // 기원초 링크가 판정되면 attempt가 'link' | 'weak'을 채운다 (아래 launch)
  // 기원권 카운터(연습 전제, GIWONCHO.md 3-4절): the bag does not fly — it folds in place until a follow-up lands or CRUMPLE_MS runs out.
  d.crumpleUntil = move==='giwon' && !d.type && !again ? d.launchAt + GIWON.CRUMPLE_MS : 0;
  d.respawn = (d.crumpleUntil || now) + 700; // rush30 timing: the next target comes 700ms after the hit, not after the bag lands
  d.vy = electric?-11:-6; d.vx=(electric?3.2:1.8)*store.side; d.rot=0;
  d.electric=electric;
  return true;
}
function updateDummy(now){
  const d=world.dummy;
  if(d.type && d.respawn && now>=d.respawn){ rushSpawn(); return; }
  if(d.hit && now>=d.launchAt){
    if(d.launchAt){
      const electric=d.electric;
      playSfx(d.move==='giwon' ? 'giwonCh' : 'hit'); // the counter sound replaces the generic hit sound (one impact, one sound)
      if(d.move==='giwon') giwonZoomStart(now);
      // 기원초 연결의 결과가 그대로 타격감이 된다(사용자 요청 2026-09-27): 성공은 크게 터뜨려 날리고,
      // 늦은 초풍은 거의 뜨지 않고 픽 쓰러진다. 판정·좌표에는 영향이 없는 연출 전용 배율이다.
      const big = d.power==='link', soft = d.power==='weak';
      if(big){ d.vy*=1.55; d.vx*=1.7; d.spin=0.30; }
      else if(soft){ d.vy*=0.34; d.vx*=0.22; d.spin=0.09; }
      if(store.fx&&!reduced){
        const look=d.type?DUMMY_LOOK[d.type]:null, y=look?look.top+look.h/2:-64;
        const color=cssVar(electric?'--accent':'--gold');
        impacts.push({x:world.dummyX,y,t0:now,color}); if(impacts.length>8) impacts.shift();
        const n = big?42:soft?4:electric?18:9, spread = big?16:soft?4:9, lift = big?13:soft?3:8;
        for(let i=0;i<n;i++) sparks.push({x:world.dummyX,y,vx:(Math.random()-0.5)*spread,vy:-Math.random()*lift-1,t:1,
                                          c: big && i%3 ? (i%3===1?cssVar('--gold','#F5C542'):'#FFFFFF') : color});
        if(big){ // 두 번째 고리와 화면 전체의 금빛 섬광으로 한 번 더 터뜨린다
          impacts.push({x:world.dummyX,y,t0:now+70,color:cssVar('--gold','#F5C542')}); if(impacts.length>8) impacts.shift();
          flash=1; flashGold=true; shake=Math.max(shake,11);
        }
      }
      d.launchAt=0;
    }
    if(now < d.crumpleUntil){ d.rot = -0.22*store.side; return; } // folded forward over the attacker's fist, feet planted
    d.crumpleUntil=0;
    d.y += d.vy; d.vy += 0.45; world.dummyX += d.vx; d.rot += (d.spin||0.12)*store.side;
    if(d.y>0){ d.y=0; d.hit=0; d.alive=false; if(!d.type) d.respawn=now+(mode==='giwon'?GP_DUMMY_MS:700); }
  }
  // 기원초 연습: one bag, always parked inside 기원권 range in front of the character, so every rep connects
  const spawnDist = () => mode==='giwon' ? GP_DUMMY_PX : Math.min(300, W*0.5) + Math.random()*40;
  if(!d.type && !d.alive && now>d.respawn){ d.alive=true; d.rot=0; d.y=0; world.dummyX = world.charX + spawnDist()*store.side; }
  if(mode==='giwon' && !d.type && d.alive && !d.hit){ world.dummyX = world.charX + GP_DUMMY_PX*store.side; return; } // follows the small steps the moves take
  const ahead = (world.dummyX - world.charX)*store.side;
  if(!d.type && d.alive && !d.hit && (ahead<-40 || ahead>W*1.2)) world.dummyX = world.charX + spawnDist()*store.side;
}
