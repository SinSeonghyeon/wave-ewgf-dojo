/* ---------- touch controls (phones/tablets). Presentation only: three direction buttons feed recomputeDir like a gamepad and the attack buttons call onButton. ---------- */
const touchMQ = typeof matchMedia==='function' ? matchMedia('(pointer:coarse)') : null;
let touchOn = false;                                      // html.touch-ui is on (also lifts the stage floor so the fighter sits above the overlay)
const touchAuto = () => !!(touchMQ && touchMQ.matches && typeof navigator!=='undefined' && navigator.maxTouchPoints>0);
function applyTouchLayout(){
  const box=$('touch'), dirs=$('tdirs'); if(!box || !dirs) return;
  const attacks=$('tbtns'), inset=14, gap=8, base=clamp((typeof innerWidth==='number' ? innerWidth : 390)*.13,44,54)*1.4; // the former 140% visual size is the new 100% baseline
  const attackLeft=attacks?.offsetLeft||box.clientWidth-inset;
  let size=Math.max(34,Math.round(base*store.touchSize/100));
  if(store.touchSize===100){
    const defaultMax=Math.max(34,Math.floor((attackLeft-inset-gap*3)/3)); // three buttons + two grid gaps + one clear gap before attacks
    size=Math.min(size,defaultMax);                                      // only the default auto-fits; explicit sizes may intentionally overlap
  }
  dirs.style.setProperty('--touch-dir-size',size+'px');
  const note=$('touch').querySelector('.touch-note'), top=(note?.offsetHeight||13)+6;
  const maxX=Math.max(0,box.clientWidth-dirs.offsetWidth-inset*2), maxY=Math.max(0,box.clientHeight-dirs.offsetHeight-top-inset);
  dirs.style.left=(inset+maxX*store.touchX/100).toFixed(1)+'px';
  dirs.style.bottom=(inset+maxY*store.touchY/100).toFixed(1)+'px';
}
function applyTouchUI(){
  touchOn = store.touch==='on' || (store.touch==='auto' && touchAuto());
  const root = document.documentElement; if(root && root.classList) root.classList.toggle('touch-ui', touchOn);
  if(!lastSrc) srcBadge.textContent = T(touchOn ? 'src.waitTouch' : 'src.wait');
  touchRelease(); resize(); applyTouchLayout();
}
if(touchMQ && touchMQ.addEventListener) touchMQ.addEventListener('change', () => { if(store.touch==='auto') applyTouchUI(); });
const touchHeld=new Set(), touchPointers=new Map();
function touchKeys(keys, t){                              // keys: physical left/down/right held at once; down+side produces a diagonal
  touchHeld.clear(); for(const k of keys) if(['left','down','right'].includes(k)) touchHeld.add(k);
  const nx=(touchHeld.has('right')?1:0)-(touchHeld.has('left')?1:0), ny=touchHeld.has('down')?-1:0;
  if(nx!==touchDir.x || ny!==touchDir.y){ touchDir={x:nx,y:ny}; recomputeDir(t,'touch'); }
  $('tdirs').querySelectorAll('[data-dir]').forEach(b => b.classList.toggle('on',touchHeld.has(b.dataset.dir)));
  if(touchHeld.size && lastSrc!=='touch') setSrc('touch');
  return curDir;
}
function touchPress(n, t){ if(modalOpen()) return; unlockAudio(); onButton(n,t); if(lastSrc!=='touch') setSrc('touch'); }
const tdirs = $('tdirs'), tbtns = $('tbtns');
function touchRelease(){ touchPointers.clear(); touchKeys([],performance.now()); tbtns.querySelectorAll('button').forEach(b => b.classList.remove('on')); }
const evT = e => e.timeStamp || performance.now();      // same clock as keydown; a pointermove can be delivered a frame late, its own timestamp is when it happened
tdirs.addEventListener('pointerdown', e => { const b=e.target.closest&&e.target.closest('[data-dir]'); if(!b || modalOpen()) return; e.preventDefault(); touchPointers.set(e.pointerId,b.dataset.dir); try{ b.setPointerCapture(e.pointerId); }catch(x){} unlockAudio(); touchKeys(touchPointers.values(),evT(e)); });
const tdirEnd=e => { if(!touchPointers.has(e.pointerId)) return; touchPointers.delete(e.pointerId); touchKeys(touchPointers.values(),evT(e)); };
tdirs.addEventListener('pointerup',tdirEnd); tdirs.addEventListener('pointercancel',tdirEnd);
const tbtnOf = e => e.target && e.target.closest ? e.target.closest('[data-btn]') : null;
tbtns.addEventListener('pointerdown', e => { const b = tbtnOf(e); if(!b) return; e.preventDefault(); b.classList.add('on'); touchPress(+b.dataset.btn, evT(e)); });
['pointerup','pointercancel'].forEach(ev => tbtns.addEventListener(ev, e => { const b = tbtnOf(e); if(b) b.classList.remove('on'); }));
$('touch').addEventListener('contextmenu', e => e.preventDefault()); // long-press menu would steal the finger

