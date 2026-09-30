/* ---------- session state ---------- */
const sessionDefault = () => ({ dashes:0, bestChain:0, bestDps:0, tries:0, hits:0, offsetSum:0, offsetCount:0, cycles:[], attempts:[], log:[], bd:{count:0, dist:0, bestChain:0, top:0} }); // bd: backdash practice (bdOut/bdEarn), not shown in the stats grid
const session = sessionDefault();
/* states: 0 idle · 1 시작 6 · 2 중립 · 3 d · 4 d/f(대시 중) · 5 캔슬 6 · 6 캔슬 후 중립 · 7 d/f 뗀 뒤 캔슬 대기 */
const cd = { state:0, tF:0, tN:0, tD:0, tDF:0, tC:0, tRel:0, lastDF:-1e9, cancelled:true, chain:0, chainCycles:[], pending:null, dashT:-1e9, dashWave:false,omittedNeutral:false, gFault:null }; // dashT: time of the f,N,f dash that started this command (dashT===tF → 통발 eligible; 대초 label only when !dashWave). pending: {t, btn} button pressed while d is still held
/* 백대시(414 N 414 N …) 머신 — cd와 독립 (결정 17(backdash)). states: 0 idle · 1 첫 4 홀드 · 2 중립 · 3 백대시 중(두 번째 4 홀드) · 4 캔슬 1(↙) 홀드.
   prev: 직전 백대시 {t4b,h,dist,t1} — 다음 백대시가 출력될 때 세트 속도(prev.dist ÷ 출력 간격)를 매긴다. engaged: 자유 연습은 첫 1 캔슬 전까지 문구를 내지 않는다(b,N,b만으로는 위치 조정) */
const bd = { state:0, t4a:0, tN:0, t4b:0, prev:null, chain:0, engaged:false, lastT:-1e9, seg:null }; // seg: last backdash segments for the stack bar {bd:true, tap, n, hold, db} in ms
const combo = { n:0, t:-1e9 }; // consecutive EWGF successes: reset by any other attempt/fault, by 3s without one, and by resetInput/setMode/trial GO
function resetCombo(){ combo.n=0; combo.t=-1e9; }
const taps = { dir:null, t:-1e9, neutral:false }; // f,N,f / b,N,b double-tap detector (dash visuals only; never touches judging)
const bdRec = { until:-1e9 }; // backdash recovery (BD.RECOVER_F after every b,N,b, cleared by a crouch/sidestep direction). Every mode: no backdash and no back walk until then; the fighter holds the backdash stance. cd judging never reads it.
function resetTaps(){ taps.dir=null; taps.neutral=false; }
function tapDetect(dir, t){ // returns 'f' | 'b' on a completed double tap, else null
  if(dir==='f' || dir==='b'){
    if(taps.dir===dir && taps.neutral && t-taps.t<=TAP_MS){ resetTaps(); return dir; }
    taps.dir=dir; taps.t=t; taps.neutral=false; return null;
  }
  if(dir==='n'){ if(taps.dir) taps.neutral=true; return null; }
  resetTaps(); return null; // d / d/f / d/b / u* break the pair
}
let mode = 'free';
const trial = { running:false, tStart:0, dur:0, count:0, target:0, cdTimer:null, messageTimer:null, openTimer:null };
/* last rendered texts, kept as re-evaluable messages so a language switch can redraw them */
const ui = { result:{cls:'',kind:'READY',title:['ready.title'],sub:['ready.sub']}, coach:['coach.intro'], trend:['trend.intro'], seg:null, padId:null, shareMsg:'' };

