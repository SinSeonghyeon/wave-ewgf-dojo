/* ---------- 옷장 (wardrobe): costume items per slot + achievements that unlock them ---------- */
// Design decision 15(wardrobe): homage sets with original names only (no official character names/art), six slots, one item per achievement,
// twelve daily-gift items, all local. Items are pure draw hooks in the fighter's torso-local space (see drawFighter); `base` = the legacy look, pixel-identical.
const SLOTS = ['head','top','arms','legs','shoes','skin'];
const SETS = ['red','thunder','master','devil']; // achievement sets in display/difficulty order; 'daily' = attendance pool; no set = special (bowl_head)
const P2 = Math.PI*2;
const ell = (g,x,y,rx,ry,c) => { g.fillStyle=c; g.beginPath(); g.ellipse(x,y,rx,ry,0,0,P2); g.fill(); };
const poly = (g,pts,c) => { g.fillStyle=c; g.beginPath(); pts.forEach((p,i) => i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.closePath(); g.fill(); };
const line = (g,pts,c,w) => { g.strokeStyle=c; g.lineWidth=w; g.beginPath(); pts.forEach((p,i) => i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.stroke(); };
const glove = c => (g,x,y) => { g.fillStyle=c; g.beginPath(); g.arc(x,y,6.5,0,P2); g.fill(); g.fillStyle='rgba(255,255,255,.25)'; g.beginPath(); g.arc(x-2,y-2,2.2,0,P2); g.fill(); };
const shoe = (c,sole) => (g,x,y) => { ell(g,x,y,7,3.5,c); if(sole) line(g,[[x-6,y+2.5],[x+6,y+2.5]],sole,1.5); };
const bootFoot = (c,sole) => (g,x,y) => { g.fillStyle=c; g.fillRect(x-3,y-8,7,7); ell(g,x,y,7.5,3.5,c); line(g,[[x-6,y+2.5],[x+7,y+2.5]],sole,1.6); };
const wrist = (g,x,y,a,r,c,w) => { g.strokeStyle=c; g.lineWidth=w; g.beginPath(); g.arc(x-Math.sin(a)*7, y-Math.cos(a)*7, r, 0, P2); g.stroke(); }; // a band 7px back along the forearm (arm direction = (sin a, cos a))
function hairBase(g, hy, col){ // the legacy spiky swept-back hair + sideburn (also the ghost silhouette)
  g.fillStyle = col;
  g.beginPath(); g.arc(0,hy-1,19.5,Math.PI*1.02,Math.PI*1.98); g.lineTo(-19.5,hy-1); g.fill();
  g.beginPath();
  g.moveTo(-19,hy-2); g.lineTo(-30,hy-12); g.lineTo(-17,hy-14); g.lineTo(-27,hy-26); g.lineTo(-11,hy-20);
  g.lineTo(-12,hy-36); g.lineTo(-1,hy-22); g.lineTo(4,hy-38); g.lineTo(9,hy-21); g.lineTo(18,hy-31); g.lineTo(15,hy-14); g.lineTo(21,hy-8); g.closePath(); g.fill();
  g.fillRect(-19,hy-2,5,12);
}
// hooks (all skipped for tinted ghosts): head.draw(g,hy,item,C) replaces the hair · top.back(g,T,C) behind the body · top.front(g,T,C) over the torso ·
// arms.hand(g,x,y,angle,C) replaces the glove · legs.deco(g,[[footX,footY,hipX,hipY]×2]) over the legs · shoes.foot(g,x,y) replaces the shoe · skin.marks(g,T,hy,bare) tattoos/scars
const ITEMS = {
head:{
  base:{hair:'#141821', draw:(g,hy,I)=>hairBase(g,hy,I.hair)},
  red_head:{set:'red', hair:'#D8521E', draw:(g,hy,I)=>{ hairBase(g,hy,I.hair); poly(g,[[-19,hy-7],[-41,hy-2],[-37,hy+2],[-19,hy-3]],'#C8232C'); poly(g,[[-19,hy-5],[-38,hy+9],[-33,hy+10],[-19,hy-2]],'#C8232C'); g.fillStyle='#C8232C'; g.fillRect(-19,hy-8,38,5); }}, // headband with two tails
  thunder_head:{set:'thunder', hair:'#141821', draw:(g,hy,I,C)=>{ poly(g,[[-17,hy+6],[-29,hy+25],[-4,hy+21]],'#15171F'); g.fillStyle='#1C1F2A'; g.beginPath(); g.arc(0,hy-1,23,Math.PI*0.82,Math.PI*2.08); g.lineTo(-20,hy+14); g.closePath(); g.fill();
    g.strokeStyle='#2E3342'; g.lineWidth=2; g.beginPath(); g.arc(0,hy-1,21,Math.PI*0.95,Math.PI*2.02); g.stroke(); g.fillStyle=C.skin; g.beginPath(); g.ellipse(2,hy+2,15,15.5,0,0,P2); g.fill(); poly(g,[[-8,hy-15],[-2,hy-7],[4,hy-14],[9,hy-8],[12,hy-15]],I.hair); }}, // hood up: cowl around an open face, bangs peeking out
  master_head:{set:'master', hair:'#DDE0E6', brow:'#DDE0E6', draw:(g,hy,I)=>{ poly(g,[[-16,hy-8],[-37,hy-27],[-31,hy-4],[-17,hy+4]],I.hair); poly(g,[[16,hy-8],[37,hy-27],[31,hy-4],[17,hy+4]],I.hair); g.fillStyle=I.hair; g.fillRect(-19,hy-2,5,12); g.fillRect(14,hy-2,5,12); }}, // bald crown, white wings swept up on both sides
  devil_head:{set:'devil', hair:'#141821', glow:'#FF3B3B', draw:(g,hy,I)=>{ hairBase(g,hy,I.hair); const horn = (x0,x1,tip,s) => { g.fillStyle='#2B2533'; g.beginPath(); g.moveTo(x0,hy-16); g.quadraticCurveTo((x0+x1)/2,hy-30,x1,tip); g.quadraticCurveTo((x0+x1)/2+3*s,hy-22,x0+7*s,hy-14); g.closePath(); g.fill(); }; horn(-10,-22,hy-44,-1); horn(8,20,hy-46,1); }},
  bowl_head:{hair:'#141821', draw:(g,hy,I)=>{ hairBase(g,hy,I.hair); g.fillStyle='#F4F1EA'; g.beginPath(); g.arc(0,hy-14,22,Math.PI,P2); g.closePath(); g.fill(); line(g,[[-22,hy-14],[22,hy-14]],'#B9B3A6',2.5); line(g,[[-19,hy-24],[19,hy-24]],'#2F6FD9',2.5); [[-9,hy-30],[0,hy-33],[9,hy-30]].forEach(([x,y]) => ell(g,x,y,2.6,1.7,'#FFFFFF')); }}, // upturned rice bowl (donate 🍚)
  daily_head_blue:{set:'daily', hair:'#2E6FD9', draw:(g,hy,I)=>hairBase(g,hy,I.hair)},
  daily_head_gold:{set:'daily', hair:'#E8C14A', draw:(g,hy,I)=>hairBase(g,hy,I.hair)},
},
top:{ // color null = bare chest (torso in skin colour); sleeve colours the upper arms
  base:{belt:'#2B2F3A'},
  red_top:{set:'red', color:'#F2F0EA', line:'#D5D2CA', belt:'#C8232C', front:(g,T)=>line(g,[[-9,-T+2],[0,-T+11],[9,-T+2]],'#C8232C',3)},
  thunder_top:{set:'thunder', color:'#1E2028', line:'#2E313D', belt:'#2B2F3A', sleeve:'#1E2028', front:(g,T)=>{ line(g,[[0,-T+4],[0,-2]],'#E5484D',1.6); line(g,[[-11,-T+3],[-4,-T+8]],'#3A3E4C',2); line(g,[[11,-T+3],[4,-T+8]],'#3A3E4C',2); }},
  master_top:{set:'master', belt:'#2B2F3A', front:(g,T,C)=>{ line(g,[[-9,-T+9],[-4,-T+13],[0,-T+10]],C.skin2,1.6); line(g,[[0,-T+10],[4,-T+13],[9,-T+9]],C.skin2,1.6); line(g,[[-5,-T+16],[5,-T+16]],C.skin2,1.2); line(g,[[-5,-T+20],[5,-T+20]],C.skin2,1.2); }}, // bare, with pecs and abs
  devil_top:{set:'devil', belt:'#3A2A4A', back:(g,T)=>{ const wing = (s,k) => { g.save(); g.translate(-6,-T+6); g.scale(s*k,k); poly(g,[[0,0],[34,-32],[48,-14],[40,-2],[56,10],[36,10],[28,24],[10,8]],'#1A1220'); line(g,[[0,0],[34,-32]],'#5B2A8C',2); line(g,[[6,4],[40,-2]],'#5B2A8C',1.5); line(g,[[8,8],[36,10]],'#5B2A8C',1.5); g.restore(); }; wing(-1,1); wing(1,0.55); }}, // bat wings: big one back, small one front
  daily_top_tank:{set:'daily', color:'#22252E', line:'#343845', belt:'#2B2F3A', front:(g,T,C)=>{ line(g,[[-9,-T+2],[-6,-T+9]],C.skin,3); line(g,[[9,-T+2],[6,-T+9]],C.skin,3); }},
  daily_top_gi:{set:'daily', color:'#F2F0EA', line:'#D5D2CA', belt:'#2B2F3A', front:(g,T)=>line(g,[[-9,-T+2],[0,-T+11],[9,-T+2]],'#3A3F4B',3)},
},
arms:{
  base:{hand:glove('#D1352F')},
  red_arms:{set:'red', hand:(g,x,y,a,C)=>{ g.fillStyle=C.skin; g.beginPath(); g.arc(x,y,5.5,0,P2); g.fill(); wrist(g,x,y,a,4.2,'#F2F0EA',3); }}, // bare fist, white wrist wrap
  thunder_arms:{set:'thunder', hand:(g,x,y,a)=>{ g.fillStyle='#2A1B1B'; g.beginPath(); g.arc(x,y,6.5,0,P2); g.fill(); wrist(g,x,y,a,5,'#E5484D',2.5); }},
  master_arms:{set:'master', hand:(g,x,y,a)=>{ g.fillStyle='#E9E2D2'; g.beginPath(); g.arc(x,y,6,0,P2); g.fill(); const nx=Math.cos(a), ny=-Math.sin(a), dx=Math.sin(a), dy=Math.cos(a); line(g,[[x-nx*5,y-ny*5],[x+nx*5,y+ny*5]],'#C9BFA8',1.2); line(g,[[x-nx*5-dx*3,y-ny*5-dy*3],[x+nx*5-dx*3,y+ny*5-dy*3]],'#C9BFA8',1.2); }}, // bandaged fist
  devil_arms:{set:'devil', hand:(g,x,y,a)=>{ g.fillStyle='#2A1E33'; g.beginPath(); g.arc(x,y,6.5,0,P2); g.fill(); const dx=Math.sin(a), dy=Math.cos(a), nx=Math.cos(a), ny=-Math.sin(a); for(const k of [-4,0,4]) poly(g,[[x+nx*k+dx*4,y+ny*k+dy*4],[x+nx*(k-1.5)+dx*6,y+ny*(k-1.5)+dy*6],[x+nx*k+dx*13,y+ny*k+dy*13]],'#D9D2E6'); }}, // three claws past the fist
  daily_arms_blue:{set:'daily', hand:glove('#2F6FD9')},
  daily_arms_black:{set:'daily', hand:glove('#23262E')},
},
legs:{
  base:{pants:'#EDE7DD'},
  red_legs:{set:'red', pants:'#F2F0EA', deco:(g,L)=>L.forEach(([x0,y0,x1,y1]) => line(g,[[x0,y0],[x1,y1]],'#2F5FD9',1.8))}, // blue stripe down each leg
  thunder_legs:{set:'thunder', pants:'#1B1D24', deco:(g,L)=>L.forEach(([x0,y0,x1,y1]) => { const dx=x1-x0, dy=y1-y0; poly(g,[[x0-3,y0-1],[x0+dx*0.25-1,y0+dy*0.25],[x0+dx*0.5,y0+dy*0.5],[x0+dx*0.25+3,y0+dy*0.25],[x0+3,y0-1]],'#F08A24'); poly(g,[[x0-1.5,y0-1],[x0+dx*0.3,y0+dy*0.3],[x0+1.5,y0-1]],'#FFD166'); })}, // flames licking up from the ankles
  master_legs:{set:'master', pants:'#F4F1E8', width:10}, // wide gi pants
  devil_legs:{set:'devil', pants:'#15161C', deco:(g,L)=>{ const [x0,y0,x1,y1]=L[1]; g.save(); g.setLineDash([2,3]); line(g,[[x0+2,y0-2],[x1+2,y1-2]],'#9AA0AE',1.5); g.restore(); }}, // chain on the front leg
  daily_legs_black:{set:'daily', pants:'#23262E'},
  daily_legs_navy:{set:'daily', pants:'#243A6B'},
},
shoes:{ // color = the sweeping foot in the hell-sweep pose; foot(g,x,y) draws a planted foot
  base:{color:'#23272F', foot:shoe('#23272F')},
  red_shoes:{set:'red', color:'#F2F0EA', foot:(g,x,y)=>{ ell(g,x,y,7,3.5,'#F2F0EA'); line(g,[[x-3,y-2],[x+1,y-2]],'#C8232C',2); }},
  thunder_shoes:{set:'thunder', color:'#2C2126', foot:bootFoot('#2C2126','#4A3A40')},
  master_shoes:{set:'master', color:'#C9A96E', foot:(g,x,y)=>{ ell(g,x,y,7,2.6,'#C9A96E'); line(g,[[x-2,y-2],[x+2,y+1]],'#5A3E2B',1.4); line(g,[[x+3,y-2],[x+2,y+1]],'#5A3E2B',1.4); }}, // straw sandal with thong
  devil_shoes:{set:'devil', color:'#1A0F14', foot:bootFoot('#1A0F14','#E5484D')},
  daily_shoes_white:{set:'daily', color:'#F2F0EA', foot:shoe('#F2F0EA','#9AA0AE')},
  daily_shoes_red:{set:'daily', color:'#B8322E', foot:shoe('#B8322E','#5A1A18')},
},
skin:{
  base:{skin:'#F2C9A0', skin2:'#D9A87C'},
  red_skin:{set:'red', skin:'#D9A574', skin2:'#B9835A'},
  thunder_skin:{set:'thunder', skin:'#F2C9A0', skin2:'#D9A87C', marks:(g,T,hy,bare)=>{ if(bare) line(g,[[-9,-T+4],[-4,-T+9],[-8,-T+13],[-3,-T+19]],'#1B1D24',2); line(g,[[-15,hy+3],[-11,hy+7],[-15,hy+12]],'#1B1D24',1.6); }}, // lightning on the chest and cheek
  master_skin:{set:'master', skin:'#E8BC8F', skin2:'#C99A6E', marks:(g,T,hy,bare)=>{ if(bare){ line(g,[[-7,-T+6],[3,-T+16]],'#C4785A',1.6); line(g,[[-2,-T+5],[-4,-T+9]],'#C4785A',1.2); } line(g,[[-12,hy-9],[-9,hy+1]],'#C4785A',1.3); }},
  devil_skin:{set:'devil', skin:'#A9A3B8', skin2:'#7E7794', marks:(g,T,hy,bare)=>{ if(bare){ line(g,[[0,-T+3],[0,-3]],'#7A3FE0',2); line(g,[[-7,-T+7],[0,-T+12],[7,-T+7]],'#7A3FE0',1.8); line(g,[[-6,-T+16],[0,-T+12],[6,-T+16]],'#7A3FE0',1.8); } line(g,[[-15,hy+3],[-12,hy+8],[-15,hy+12]],'#7A3FE0',1.6); }},
  daily_skin_pale:{set:'daily', skin:'#F7DFC8', skin2:'#E0BFA3'},
  daily_skin_dark:{set:'daily', skin:'#8D5A3C', skin2:'#6E4128'},
}};
const ITEM_SLOT = {}; for(const s of SLOTS) for(const id of Object.keys(ITEMS[s])) if(id!=='base') ITEM_SLOT[id] = s;
const DAILY_IDS = Object.keys(ITEM_SLOT).filter(id => ITEMS[ITEM_SLOT[id]][id].set==='daily');
const TRIAL_MODES = ['wave10','ewgf20','combo10','rush30','bd10']; // every start-mode trial (MODES/#modes/#boardTabs/worker BOARDS follow this order); records, life.trials and the reset button all derive from it
const perTrial = v => Object.fromEntries(TRIAL_MODES.map(m => [m, v()]));
const LIFE_KEYS = ['dashes','ewgf','tries','tongbal','hellsweep','giwon','maxChain','maxStreak','tightEwgf','days','donate'];
const lifeDefault = () => ({dashes:0, ewgf:0, tries:0, tongbal:0, hellsweep:0, giwon:0, maxChain:0, maxStreak:0, tightEwgf:0, days:0, donate:0, giftDay:'', trials:perTrial(() => 0)});
const fitDefault = () => Object.fromEntries(SLOTS.map(s => [s,'base']));
// achievements: id = the item it unlocks. stat(life) is the current value, done when stat >= target. Records-based ones read store.records (best of the last 30).
const bestRec = (m, f) => (store.records[m]||[]).reduce((b,r) => Math.max(b, f(r)||0), 0);
const ewgf20Hits = r => Number.isFinite(r.hits) ? r.hits : Math.round(r.score/5); // score is the % rate of 20 attempts
const ACH = {
  red_head:{target:10, stat:l=>l.dashes}, red_top:{target:1, stat:l=>l.ewgf}, red_arms:{target:1, stat:l=>Math.min(l.tongbal,l.hellsweep)},
  red_legs:{target:5, stat:l=>l.maxChain}, red_shoes:{target:1, stat:l=>l.trials.rush30}, red_skin:{target:3, stat:l=>l.days},
  thunder_head:{target:500, stat:l=>l.dashes}, thunder_top:{target:50, stat:l=>l.ewgf}, thunder_arms:{target:3, stat:l=>l.maxStreak},
  thunder_legs:{target:15, stat:()=>bestRec('wave10', r=>r.dashes)}, thunder_shoes:{target:100, stat:()=>bestRec('rush30', r=>r.score)}, thunder_skin:{target:30, stat:l=>Math.min(l.tongbal,l.hellsweep)},
  master_head:{target:3000, stat:l=>l.dashes}, master_top:{target:300, stat:l=>l.ewgf}, master_arms:{target:5, stat:l=>l.maxStreak},
  master_legs:{target:20, stat:l=>l.maxChain}, master_shoes:{target:16, stat:()=>bestRec('ewgf20', ewgf20Hits)}, master_skin:{target:10, stat:l=>l.tightEwgf},
  devil_head:{target:10000, stat:l=>l.dashes}, devil_top:{target:1000, stat:l=>l.ewgf}, devil_arms:{target:10, stat:l=>l.maxStreak},
  devil_legs:{target:20, stat:()=>bestRec('ewgf20', ewgf20Hits)}, devil_shoes:{target:200, stat:()=>bestRec('rush30', r=>r.score)}, devil_skin:{target:30, stat:l=>l.days},
  bowl_head:{target:1, stat:l=>l.donate}, // opened the donate window (pressing the button is enough; a real donation cannot be seen)
};
let lookCache = null; // slot → item objects for store.fit; rebuilt when the outfit changes
const lookOf = f => Object.fromEntries(SLOTS.map(s => [s, ITEMS[s][f[s]] || ITEMS[s].base]));
function currentLook(){ return lookCache || (lookCache = lookOf(store.fit)); }
function setFit(slot, id){ if(!ITEMS[slot] || !ITEMS[slot][id] || !owned(id)) return false; store.fit[slot] = id; lookCache = null; save(); renderFit(); return true; }

