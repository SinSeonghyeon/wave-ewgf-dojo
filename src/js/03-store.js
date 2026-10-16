/* ---------- persistent settings ---------- */
const STORE = 'wave-ewgf-dojo-v1';
const LANGS = ['ko','en','ja'];
// Localized HTML is generated from this file; an explicit page language wins over browser/saved preferences.
const PAGE_LANG = document.documentElement?.dataset?.pageLang || '';
const ASSET_ROOT = PAGE_LANG ? '../' : '';
// 결정 39(replay): the replay window is this page in an <iframe> with ?replay=1. It plays a recorded run through the engine and writes
// nothing — no localStorage, no backend, no BGM, notices, rewards or dialogs — and takes no live input (35-replay.js).
const REPLAY = typeof location!=='undefined' && typeof window!=='undefined' && window.parent!==window && /(?:^|[?&])replay=1(?:&|$)/.test(location.search||'');
const detectLang = () => { const l = (typeof navigator!=='undefined' && navigator.language || '').toLowerCase(); return l.startsWith('ko')?'ko':l.startsWith('ja')?'ja':'en'; };
const WINDOWS = [8,12,15], WINDOW_DEFAULT = 12; // Legacy saved values / unchanged Worker contract; not used by the current EWGF judge
const NICK_BAD = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}\u034f\u115f\u1160\u3164\uffa0\ufe00-\ufe0f\u{e0100}-\u{e01ef}]/u; // control, format (zero-width/bidi), private-use, unassigned, separators, Hangul fillers, variation selectors; must match BAD_CHARS in worker/index.js
const nickOk = n => { const len = [...n].length; return len>=2 && len<=12 && !NICK_BAD.test(n); };
// bt: one key/button that presses 1+3+4 together — the game's own LP+LK+RK hotkey for the taunt (결정 37(tju)). Added 2026-10-15,
// so a save from before has no bt: it takes the default only when that key/button is still free (see the load below).
const DEFAULT_KEYS = {up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',b1:'KeyU',b2:'KeyI',b3:'KeyJ',b4:'KeyK',bt:'KeyL'};
const PAD_AUTO_INPUTS={up:['b12','a1-','hu'],down:['b13','a1+','hd'],left:['b14','a0-','hl'],right:['b15','a0+','hr']};
const DEFAULT_PAD = {up:'auto',down:'auto',left:'auto',right:'auto',b1:'b2',b2:'b3',b3:'b0',b4:'b1',bt:'b5'};
function padAutoConflict(keys,slot,code){
  return Object.entries(keys).some(([k,v])=>k!==slot && v==='auto' && PAD_AUTO_INPUTS[k]?.includes(code));
}
// 핫키 (결정 36(hotkeys)): 공격 버튼 1~4 조합을 키 하나·패드 버튼 하나에 묶는다. 철권 버튼 설정의 메뉴 순서
const HOTKEYS = ['h13','h24','h12','h34','h14','h23','h123','h124','h134','h234','h1234'];
const isHotkey = slot => HOTKEYS.includes(slot); // the one hotkey-slot test: pad input codes also start with 'h' (hat 'hu'…), so never test slot[0]==='h'
const hotkeyButtons = slot => [...slot.slice(1)].map(Number); // 'h13' → [1,3]
const padAttackSlot = k => k[0]==='b' || isHotkey(k); // attack buttons and hotkeys take pad buttons only; directions may also take axes, the hat or 'auto'
function validPadBinding(k,v){ return typeof v==='string' && (v==='none' || (v==='auto' && !padAttackSlot(k)) || /^b(?:[0-9]|[1-9][0-9]|1[01][0-9]|12[0-7])$/.test(v) || (!padAttackSlot(k) && /^(?:a(?:[0-9]|[12][0-9]|3[01])[+-]|h[udlr])$/.test(v))); }
const emptyHotKeys = () => Object.fromEntries(HOTKEYS.map(h=>[h,'']));
const emptyPadHotKeys = () => Object.fromEntries(HOTKEYS.map(h=>[h,'none']));
const emptyPadAlt = () => Object.fromEntries(Object.keys(DEFAULT_PAD).map(k=>[k,'none']));
let store = {padAltKeys:emptyPadAlt(),padKeys:{...DEFAULT_PAD},hotKeys:emptyHotKeys(),padHotKeys:emptyPadHotKeys(),v:4, lang:detectLang(), window:WINDOW_DEFAULT, side:1, fx:1, touch:'auto', touchSize:100, touchX:0, touchY:0, sound:1, bgm:1, bgmLast:-1, bgmVol:100, sfxVol:100, keys:{...DEFAULT_KEYS}, altKeys:{up:'',down:'',left:'',right:'',b1:'',b2:'',b3:'',b4:'',bt:''}, records:perTrial(() => []), nick:'', nickToken:'', visitDay:'', noticeSeen:'', votes:{}, life:lifeDefault(), ach:{}, pendingRewards:[], fit:fitDefault(), moves:movesDefault(), donateResultDay:'', donateNudgeDay:'', donatePlayDay:'', donatePlayMs:0, char:CHAR_DEFAULT};
const owned = id => id==='base' || !!store.ach[id]; // store.ach = unlock record (achievement items and daily gifts alike): id → time
const pendingReward = id => store.pendingRewards.some(j => j.id===id);
const earned = id => owned(id) || pendingReward(id);
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validKey(slot, code){
  const arrows = {ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
  return typeof code==='string' && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(code) && (!arrows[code] || arrows[code]===slot);
}
let hadStore = false; // true only when storage existed before this page boot; bumpVisitDay() creates it later on a first visit
try{
  const s = JSON.parse(localStorage.getItem(STORE)||'null');
  if(s && typeof s==='object'){
    hadStore = true;
    if(LANGS.includes(s.lang)) store.lang=s.lang;
    if(s.v>=4 && WINDOWS.includes(s.window)) store.window=s.window;
    if([1,-1].includes(s.side)) store.side=s.side;
    if([0,1].includes(s.fx)) store.fx=s.fx;
    if(['auto','on','off'].includes(s.touch)) store.touch=s.touch;
    if(Number.isInteger(s.touchSize) && s.touchSize>=70 && s.touchSize<=300 && s.touchSize%5===0) store.touchSize=s.touchSize;
    if(Number.isInteger(s.touchX) && s.touchX>=0 && s.touchX<=100 && s.touchX%5===0) store.touchX=s.touchX;
    if(Number.isInteger(s.touchY) && s.touchY>=0 && s.touchY<=100 && s.touchY%5===0) store.touchY=s.touchY;
    { // per character (결정 32(move-toggle)); a flat object is the format from before character select, when every toggle was Kazuya's
      const m = s.moves && typeof s.moves==='object' ? (CHAR_IDS.some(c => s.moves[c] && typeof s.moves[c]==='object') ? s.moves : {[CHAR_DEFAULT]:s.moves}) : {};
      for(const c of CHAR_IDS) for(const k of CHARS[c].moves) if([0,1].includes(m[c]?.[k])) store.moves[c][k]=m[c][k];
    }
    if(CHAR_IDS.includes(s.char)) store.char=s.char; // 결정 34(char-select): an unknown id keeps the default character
    if([0,1].includes(s.sound)) store.sound=s.sound;
    if([0,1].includes(s.bgm)) store.bgm=s.bgm;
    if(typeof s.bgmLast==='string'&&/^bgm\/[^/\\]+\.mp3$/i.test(s.bgmLast))store.bgmLast=s.bgmLast;
    if(Number.isInteger(s.bgmVol) && s.bgmVol>=0 && s.bgmVol<=100) store.bgmVol=s.bgmVol;
    if(Number.isInteger(s.sfxVol) && s.sfxVol>=0 && s.sfxVol<=100) store.sfxVol=s.sfxVol;
    if(typeof s.nick==='string' && nickOk(s.nick)) store.nick=s.nick;
    if(store.nick && typeof s.nickToken==='string' && /^[0-9a-f]{48}$/.test(s.nickToken)) store.nickToken=s.nickToken; // proves the nickname is ours (POST /nick); a token without a nickname is dropped
    if(typeof s.visitDay==='string' && /^\d{4}-\d\d-\d\d$/.test(s.visitDay)) store.visitDay=s.visitDay; // last KST day this browser was counted
    if(typeof s.noticeSeen==='string' && NOTICES.some(n => n.id===s.noticeSeen)) store.noticeSeen=s.noticeSeen; // newest announcement this browser has opened; unknown/removed ids show NEW again
    for(const k of ['donateResultDay','donateNudgeDay','donatePlayDay']) if(typeof s[k]==='string' && /^\d{4}-\d\d-\d\d$/.test(s[k])) store[k]=s[k];
    if(Number.isFinite(s.donatePlayMs) && s.donatePlayMs>=0) store.donatePlayMs=Math.min(s.donatePlayMs, 10*60*1000);
    if(store.nick && s.votes && typeof s.votes==='object') for(const id of Object.keys(s.votes)) if(/^\d{1,12}$/.test(id) && [1,-1].includes(s.votes[id])) store.votes[id]=s.votes[id]; // my like(1)/dislike(-1) per post id: render-only cache (the server enforces one vote per nick); votes belong to the nickname, so none without one
    const padKeys = {...DEFAULT_PAD,...s.padKeys};
    // A save from before the 1+3+4 button (bt) keeps every binding it had: bt takes its default only if no saved binding uses that button
    // (checked again after the saved set: when it is refused the defaults stand, and a saved alternate on that button must still win).
    // A bt saved as 'none' stays unbound like any other saved binding
    const padBtTaken = !Object.hasOwn(Object(s.padKeys),'bt') && [...Object.values(Object(s.padKeys)),...Object.values(Object(s.padAltKeys))].includes(DEFAULT_PAD.bt);
    if(padBtTaken) padKeys.bt='none';
    const customPads = Object.values(padKeys).filter(v=>v!=='auto' && v!=='none');
    if(Object.keys(padKeys).length===Object.keys(DEFAULT_PAD).length && Object.keys(DEFAULT_PAD).every(k=>validPadBinding(k,padKeys[k]) && !padAutoConflict(padKeys,k,padKeys[k])) && new Set(customPads).size===customPads.length) store.padKeys=padKeys;
    if(padBtTaken) store.padKeys.bt='none';
    const usedPadInputs=new Set(Object.values(store.padKeys).filter(v=>v!=='none' && v!=='auto'));
    for(const k of Object.keys(DEFAULT_PAD)){
      const code=s.padAltKeys?.[k];
      const autoConflict=padAutoConflict(store.padKeys,k,code);
      if(code!=='auto' && validPadBinding(k,code) && !autoConflict && (code==='none' || !usedPadInputs.has(code))){ store.padAltKeys[k]=code; if(code!=='none') usedPadInputs.add(code); }
    }
    for(const k of HOTKEYS){ // a hotkey that reuses a pad input already bound (or a d-pad direction under 'auto') is dropped
      const code=s.padHotKeys?.[k];
      if(code!=='none' && validPadBinding(k,code) && !padAutoConflict(store.padKeys,k,code) && !usedPadInputs.has(code)){ store.padHotKeys[k]=code; usedPadInputs.add(code); }
    }
    const keys = {...store.keys};
    for(const k of Object.keys(keys)) if(validKey(k,s.keys?.[k])) keys[k]=s.keys[k];
    // Same for the keyboard: an older save that already uses the default 1+3+4 key leaves bt unbound ('' — the only primary that may be empty)
    // instead of failing the duplicate check below, which would throw every saved key back to the defaults. A bt saved unbound stays so
    // until the user binds it — also once that key is free again — like the pad's saved 'none' (review 2026-10-15)
    const keyBtTaken = s.keys?.bt==='' || (!validKey('bt',s.keys?.bt) && [...Object.entries(keys).filter(([k])=>k!=='bt').map(([,v])=>v),...Object.values(Object(s.altKeys))].includes(DEFAULT_KEYS.bt));
    if(keyBtTaken) keys.bt='';
    const bound = Object.values(keys).filter(Boolean);
    if(new Set(bound).size===bound.length && Object.keys(keys).every(k => keys[k] || k==='bt')) store.keys=keys;
    if(keyBtTaken) store.keys.bt=''; // also when the saved keys are refused and the defaults stand: a saved alternate on that key still wins
    const usedKeys = new Set(Object.values(store.keys));
    for(const k of Object.keys(store.altKeys)){
      const code = s.altKeys?.[k];
      if(validKey(k,code) && !usedKeys.has(code)){ store.altKeys[k]=code; usedKeys.add(code); }
    }
    for(const k of HOTKEYS){
      const code = s.hotKeys?.[k];
      if(validKey(k,code) && !usedKeys.has(code)){ store.hotKeys[k]=code; usedKeys.add(code); }
    }
    for(const m of Object.keys(store.records)){
      if(Array.isArray(s.records?.[m])) store.records[m]=s.records[m].filter(r =>
        r && Number.isFinite(r.score) && Number.isFinite(r.date) &&
        Math.abs(r.date)<=8640000000000000 && typeof r.label==='string' && typeof r.sub==='string'
      ).slice(-30);
    }
    if(s.life && typeof s.life==='object'){ // lifetime counters (wardrobe achievements): non-negative integers, else 0
      for(const k of LIFE_KEYS) if(Number.isInteger(s.life[k]) && s.life[k]>=0) store.life[k]=s.life[k];
      if(typeof s.life.giftDay==='string' && /^\d{4}-\d\d-\d\d$/.test(s.life.giftDay)) store.life.giftDay=s.life.giftDay;
      for(const m of Object.keys(store.life.trials)) if(Number.isInteger(s.life.trials?.[m]) && s.life.trials[m]>=0) store.life.trials[m]=s.life.trials[m];
    }
    if(s.ach && typeof s.ach==='object') for(const id of Object.keys(s.ach)) if(ITEM_SLOT[id] && Number.isFinite(s.ach[id])) store.ach[id]=s.ach[id]; // unknown ids dropped
    if(Array.isArray(s.pendingRewards)) for(const j of s.pendingRewards){
      if(!j || typeof j.id!=='string' || !Object.hasOwn(ITEM_SLOT,j.id) || earned(j.id)) continue;
      if((j.kind==='ach' ? !Object.hasOwn(ACH,j.id) : j.kind!=='daily' || !DAILY_IDS.includes(j.id)) || !Number.isFinite(j.at) || j.at<=0 || !Number.isInteger(j.day) || j.day<0) continue;
      store.pendingRewards.push({id:j.id,kind:j.kind,at:j.at,day:j.day});
    }
    if(s.fit && typeof s.fit==='object') for(const sl of SLOTS){ const id = s.fit[sl]; if(typeof id==='string' && ITEMS[sl][id] && owned(id)) store.fit[sl]=id; } // an unowned item falls back to base
  }
}catch(e){}
const save = () => { if(REPLAY) return; try{ localStorage.setItem(STORE, JSON.stringify(store)); }catch(e){} }; // the replay window borrows the viewer's settings and never writes them back
let saveTimer = null; // saveSoon: lifetime counters change on every dash/attempt; the synchronous localStorage write waits 1.5s so it never sits in the input path
const saveSoon = () => { if(saveTimer) return; saveTimer = setTimeout(() => { saveTimer = null; save(); }, 1500); };
if(LANGS.includes(PAGE_LANG)){ store.lang=PAGE_LANG; save(); }
if(typeof location!=='undefined'){ // ?c=<character> wins over the saved character and stays in the address (결정 34(char-select))
  const c = new URLSearchParams(location.search).get('c');
  if(CHAR_IDS.includes(c) && c!==store.char){ store.char=c; save(); }
}
if(typeof location!=='undefined'){ // Legacy ?lang= remains a one-shot override on the automatic root page.
  const params = new URLSearchParams(location.search), q = params.get('lang');
  if(LANGS.includes(q)){
    if(!PAGE_LANG){ store.lang=q; save(); }
    params.delete('lang');
    try{ window.history.replaceState(null, '', location.pathname + (params.size?'?'+params.toString():'') + location.hash); }catch(e){}
  }
}

