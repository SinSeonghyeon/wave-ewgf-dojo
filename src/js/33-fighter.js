/* ---------- SD fighter drawing: pose, wardrobe hooks, dummies ---------- */
function fighterPoint(parent,m,x,y){
  const dx=m.a*x+m.c*y+m.e-parent.e,dy=m.b*x+m.d*y+m.f-parent.f;
  const det=parent.a*parent.d-parent.b*parent.c;
  return [(parent.d*dx-parent.c*dy)/det,(-parent.b*dx+parent.a*dy)/det];
}
function drawFighter(g, px, py, p, dir, alpha, tint, look){ // look: slot → item (wardrobe); default = the current outfit. tint = flat ghost colour (all costume detail skipped)
  const parentTransform=g.getTransform();
  look = look || currentLook();
  const C = look.skin, HD = look.head, TP = look.top, AR = look.arms, LG = look.legs, SH = look.shoes;
  g.save(); g.globalAlpha=alpha; g.translate(px,py); g.scale(dir,1);
  const crouch=p.crouch||0, lean=(p.lean||0)*Math.PI/180, jump=p.jump||0, spread = 7 + 12*(p.spread||0);
  g.translate(0,-jump+(p.sink||0)); // sink: push the whole stance lower (hell sweep)
  const legL = 24 - 11*crouch;
  g.lineCap='round'; g.lineJoin='round';
  const tuck = p.tuck||0, step = p.step||0; // step −1..1: stride phase for walk/dash (front foot forward and lifted). 0 keeps the legacy stance pixel-identical.
  let kickFoot = null; // the kicking foot in the caller's canvas coordinates (초스카이 sparks)
  const foot = (x,y) => { if(tint){ g.fillStyle=tint; g.beginPath(); g.ellipse(x,y,7,3.5,0,0,Math.PI*2); g.fill(); } else SH.foot(g,x,y); };
  if(p.sweep!=null){
    // hell sweep: the right leg extends straight and orbits a low, flattened circle around the crotch (the lower body spins one turn); the left leg stays tucked as the pivot
    const a = p.sweep, Cx = 0, Cy = -6, Rx = 36, Ry = 11;           // flattened orbit keeps the foot skimming the floor
    const fx0 = Cx + Rx*Math.cos(a), fy0 = Cy + Ry*Math.sin(a), hx = spread*0.3, hy = -legL;
    if(!tint){ g.strokeStyle='rgba(143,220,255,.30)'; g.lineWidth=3.5; g.beginPath(); // motion arc trailing the sweeping foot
      for(let i=0;i<=12;i++){ const aa=a - i*0.13, tx=Cx+Rx*Math.cos(aa), ty=Cy+Ry*Math.sin(aa); i?g.lineTo(tx,ty):g.moveTo(tx,ty); } g.stroke(); }
    g.lineWidth=LG.width||8; g.strokeStyle = tint||LG.pants;
    g.beginPath(); g.moveTo(-6, 0); g.lineTo(-spread*0.3, hy); g.stroke();          // tucked support leg
    g.beginPath(); g.moveTo(hx, hy); g.lineTo(fx0, fy0); g.stroke();                 // extended right leg
    foot(-7, 0);                                                                     // support foot
    g.fillStyle = tint||SH.color;
    g.save(); g.translate(fx0, fy0); g.rotate(a); g.beginPath(); g.ellipse(4, 0, 9, 4, 0, 0, Math.PI*2); g.fill(); g.restore(); // sweeping foot, along the leg
  } else {
  // legs
  g.lineWidth=LG.width||8; g.strokeStyle = tint||LG.pants;
  let lx = -spread - step*8, rx = spread + step*8, ly = -tuck*10 - Math.max(0,-step)*4, ry = -tuck*8 - Math.max(0,step)*4;
  if(p.kick){ const a = p.kick*2.5, L = legL+8; rx = spread*0.3 + Math.sin(a)*L; ry = -legL + Math.cos(a)*L; } // 초스카이: the front leg swings up from the hip (0 = planted, 1 = above the head)
  // 무릎 (결정 35(tju) 도발·도발 뒷무릎): the front thigh swings up toward the horizontal and the shin hangs under the knee (0 = planted, 1 = thigh level)
  let kx = null, ky = null;
  if(p.knee){ const a = p.knee*1.42, half = (legL+3)/2, hx = spread*0.3; kx = hx + Math.sin(a)*half; ky = -legL + Math.cos(a)*half; rx = kx - Math.sin(p.knee*0.35)*half; ry = Math.min(0, ky + Math.cos(p.knee*0.35)*half); }
  g.beginPath(); g.moveTo(lx, ly); g.lineTo(-spread*0.35, -legL); g.stroke();
  g.beginPath(); g.moveTo(rx, ry); if(kx!=null) g.lineTo(kx, ky); g.lineTo(spread*0.3, -legL); g.stroke();
  if(!tint && LG.deco) LG.deco(g, [[lx,ly,-spread*0.35,-legL],kx!=null ? [kx,ky,spread*0.3,-legL] : [rx,ry,spread*0.3,-legL]]);
  // shoes
  foot(lx-1, ly); foot(rx+2, ry);
  if(p.kick) kickFoot = fighterPoint(parentTransform, g.getTransform(), rx+2, ry);
  }
  // hips / torso
  g.translate(0,-legL); g.rotate(lean);
  const T = 22 - 4*crouch;
  if(!tint && TP.back) TP.back(g,T,C); // wings, hood drape … behind everything
  // back arm
  const armL = 17;
  const arm = (sx, a, front, ext) => {
    const L = armL + (ext||0); // ext: extra reach on a thrown punch (통발)
    const ex = sx + Math.sin(a)*L, ey = -T+5 + Math.cos(a)*L;
    g.lineWidth=6.5; g.strokeStyle=tint||TP.sleeve||C.skin2; g.beginPath(); g.moveTo(sx,-T+5); g.lineTo(ex,ey); g.stroke();
    if(tint){ g.fillStyle=tint; g.beginPath(); g.arc(ex,ey,6.5,0,Math.PI*2); g.fill(); } else AR.hand(g,ex,ey,a,C);
    const m = g.getTransform();
    return fighterPoint(parentTransform,m,ex,ey);
  };
  arm(-6, (p.armL==null?-25:p.armL)*Math.PI/180);
  // belt + pants top
  g.fillStyle = tint||LG.pants; g.fillRect(-10, -4, 20, 6);
  g.fillStyle = tint||TP.belt; g.fillRect(-10, -3, 20, 3);
  // torso (bare skin, or the top's colour)
  g.fillStyle = tint||TP.color||C.skin;
  g.beginPath(); g.moveTo(-11,-T+2); g.quadraticCurveTo(-13,-T/2,-10,0); g.lineTo(10,0); g.quadraticCurveTo(13,-T/2,11,-T+2); g.quadraticCurveTo(0,-T-3,-11,-T+2); g.fill();
  if(!tint){ g.strokeStyle=TP.line||C.skin2; g.lineWidth=1.5; g.beginPath(); g.moveTo(0,-T+8); g.lineTo(0,-6); g.stroke(); g.beginPath(); g.moveTo(-8,-T+7); g.quadraticCurveTo(0,-T+11,8,-T+7); g.stroke(); if(TP.front) TP.front(g,T,C); }
  // head
  const hy = -T-15;
  const head = fighterPoint(parentTransform, g.getTransform(), 0, hy); // the head in the caller's canvas coordinates (도발 연출의 불꽃)
  g.fillStyle = tint||C.skin; g.beginPath(); g.arc(0,hy,19,0,Math.PI*2); g.fill();
  // hair (item-specific; ghosts keep the legacy silhouette)
  if(tint) hairBase(g,hy,tint); else HD.draw(g,hy,HD,C);
  if(!tint){
    // eyebrows (angry) + eyes
    g.strokeStyle=HD.brow||HD.hair; g.lineWidth=2.6; g.lineCap='round';
    g.beginPath(); g.moveTo(3,hy-3); g.lineTo(14,hy-7); g.stroke();
    g.beginPath(); g.moveTo(-3,hy-4); g.lineTo(-13,hy-8); g.stroke();
    g.fillStyle='#fff'; g.beginPath(); g.ellipse(9,hy+2,4,4.5,0,0,Math.PI*2); g.fill(); g.beginPath(); g.ellipse(-7,hy+2,3.6,4.2,0,0,Math.PI*2); g.fill();
    g.fillStyle='#1a1f2b'; g.beginPath(); g.arc(10,hy+2.5,2.2,0,Math.PI*2); g.fill(); g.beginPath(); g.arc(-6,hy+2.5,2,0,Math.PI*2); g.fill();
    const glow = HD.glow || (p.eyeGlow ? '#4CC9FF' : null);
    if(glow){ g.fillStyle=glow; g.beginPath(); g.arc(10,hy+2.5,2.4,0,Math.PI*2); g.fill(); g.beginPath(); g.arc(-6,hy+2.5,2.2,0,Math.PI*2); g.fill(); }
    // scar + mouth
    g.strokeStyle='#C4785A'; g.lineWidth=1.3; g.beginPath(); g.moveTo(5,hy+8); g.lineTo(11,hy+11); g.stroke();
    g.strokeStyle='#8B4A3C'; g.lineWidth=1.8; g.beginPath(); g.moveTo(-2,hy+11); g.lineTo(6,hy+10.5); g.stroke();
    if(C.marks) C.marks(g,T,hy,!TP.color); // tattoos/scars: on the torso only when the chest is bare
    if(p.sweat){ g.fillStyle='#8FDCFF'; g.beginPath(); g.moveTo(-20,hy-6); g.lineTo(-24,hy+4); g.lineTo(-16,hy+4); g.closePath(); g.fill(); }
  }
  // front arm
  const fist = arm(6, (p.armR==null?30:p.armR)*Math.PI/180, true, p.reach||0);
  g.restore();
  fist.foot = kickFoot; fist.head = head;
  return fist;
}
// 도발 자세 (결정 35(tju)). 실측 영상(taunt_full_L, 게임 입력 기록의 프레임 수로 맞춤)의 자세를 SD 인형 관절로 옮긴 것: [frame, pose].
// 연출 전용 — 판정은 이 표를 읽지 않는다. frame 1 = 도발을 누른 프레임(16-tju.js와 같은 칸).
// 1~9f 뒷팔을 가슴 앞으로 올렸다가 팔꿈치를 바깥으로, 앞발은 반 걸음 → 10~21f 두 팔을 앞뒤로 활짝 벌리고 앞 주먹을 머리 위로(실측 F11 손 들기)
// → 22~28f 팔을 벌린 채 무릎이 천천히 올라와 28f에 맞는다 → 29~43f 무릎을 든 채 주먹은 가슴 앞 → 44~55f 무릎이 천천히 내려온다
// → 뒷손은 허리에 얹고 앞팔을 상대 쪽으로 뻗었다가 → 75~77f 앞 주먹을 얼굴 앞에 세운다(77f 주황빛, 끝나면 김).
const TJ_POSE = [
  [1,  {crouch:0.05, lean:4,  armR:35,  armL:-30,  spread:0.3}],
  [4,  {crouch:0,    lean:1,  armR:46,  armL:62,   spread:0.3}],               // 두 주먹을 가슴 앞으로 모았다가
  [7,  {crouch:0,    lean:0,  armR:64,  armL:-30,  spread:0.3,  knee:0.12}],   // 뒷팔꿈치를 바깥으로, 앞발 반 걸음
  [10, {crouch:0,    lean:-1, armR:86,  armL:-84,  spread:0.3,  knee:0.16, reach:2}],
  [14, {crouch:0,    lean:-2, armR:104, armL:-98,  spread:0.3,  reach:4}],
  [18, {crouch:0,    lean:-3, armR:120, armL:-104, spread:0.3,  reach:6}],     // 앞 주먹은 머리 옆으로
  [22, {crouch:0,    lean:-4, armR:114, armL:-110, spread:0.3,  reach:5}],     // 팔을 벌린 채 무릎이 올라오기 시작
  [25, {crouch:0,    lean:-6, armR:110, armL:-116, spread:0.3,  knee:0.5, reach:4}],
  [28, {crouch:0,    lean:-8, armR:106, armL:-124, spread:0.3,  knee:0.98, reach:3}], // 무릎 명중: 팔이 가장 넓다
  [30, {crouch:0,    lean:-8, armR:46,  armL:14,   spread:0.3,  knee:1}],      // 주먹을 가슴 앞으로
  [43, {crouch:0,    lean:-6, armR:42,  armL:10,   spread:0.3,  knee:0.95}],
  [47, {crouch:0,    lean:-4, armR:34,  armL:-4,   spread:0.3,  knee:0.8}],
  [50, {crouch:0,    lean:-3, armR:28,  armL:-14,  spread:0.32, knee:0.55}],
  [53, {crouch:0,    lean:-1, armR:22,  armL:-22,  spread:0.34, knee:0.22}],
  [56, {crouch:0,    lean:0,  armR:18,  armL:-26,  spread:0.35}],              // 뒷손은 허리에
  [62, {crouch:0,    lean:2,  armR:26,  armL:-26,  spread:0.35}],
  [71, {crouch:0,    lean:6,  armR:56,  armL:-26,  spread:0.35, reach:3}],     // 앞팔을 상대 쪽으로
  [74, {crouch:0,    lean:7,  armR:64,  armL:-26,  spread:0.35, reach:2}],
  [TJ.END_F, {crouch:0, lean:10, armR:122, armL:-26, spread:0.35, reach:5}],   // 앞 주먹을 얼굴 앞에 세운다
];
const TJ_FLEX_F = 16, TJ_FLEX_BACK = 10; // after the taunt: the flex holds (glow · steam), then eases back to guard — walking or any move cuts it
const TJ_CUT_F = 6;                       // a cancel eases from the taunt pose of that moment back to guard over this many frames (tjCut)
const TJ_POSE_KEYS = [...new Set(TJ_POSE.flatMap(k => Object.keys(k[1])))];
const TJ_POSE_M = TJ_POSE_KEYS.map(key => { // Fritsch–Carlson tangents: the curve passes every keyframe smoothly and never overshoots one
  const x = TJ_POSE.map(k => k[0]), y = TJ_POSE.map(k => k[1][key]||0), n = x.length;
  const d = x.slice(1).map((xi, i) => (y[i+1]-y[i])/(xi-x[i]));
  const m = y.map((_, i) => i===0 ? d[0] : i===n-1 ? d[n-2] : d[i-1]*d[i]<=0 ? 0 : (d[i-1]+d[i])/2);
  d.forEach((di, i) => {
    if(!di){ m[i] = m[i+1] = 0; return; }
    const a = m[i]/di, b = m[i+1]/di, s = a*a+b*b;
    if(s>9){ const k = 3/Math.sqrt(s); m[i] = k*a*di; m[i+1] = k*b*di; }
  });
  return m;
});
function tjTauntPose(f, idle){ // f = taunt frame (1 = the press); idle() = the guard pose the tail eases back to
  const P = TJ_POSE, last = P[P.length-1];
  if(f>last[0]){
    const k = clamp((f-last[0]-TJ_FLEX_F)/TJ_FLEX_BACK, 0, 1), to = idle(), out = {};
    for(const key of new Set([...Object.keys(last[1]), ...Object.keys(to)])) out[key] = (last[1][key]||0) + ((to[key]||0)-(last[1][key]||0))*k*k*(3-2*k);
    return out;
  }
  let i = 0; while(i<P.length-2 && f>=P[i+1][0]) i++;
  const [x0, A] = P[i], [x1, B] = P[i+1], h = x1-x0, t = clamp((f-x0)/h, 0, 1), t2 = t*t, t3 = t2*t, out = {};
  TJ_POSE_KEYS.forEach((key, j) => { const m = TJ_POSE_M[j]; out[key] = (2*t3-3*t2+1)*(A[key]||0) + (t3-2*t2+t)*h*m[i] + (3*t2-2*t3)*(B[key]||0) + (t3-t2)*h*m[i+1]; });
  return out;
}
function poseAt(now){
  const t = now - anim.t0;
  const e = x => 1-Math.pow(1-x,3);
  const idle = () => ({crouch:0, lean:4+Math.sin(now/420)*2, jump:Math.abs(Math.sin(now/420))*2.5, armR:35+Math.sin(now/420)*4, armL:-30, spread:0.25});
  switch(anim.kind){
    case 'cd': { if(t<300){ const c = t<160? 0.85 : Math.max(0, 0.85-(t-160)/140);
      return {crouch:c, lean:28*c, armR:-25+60*(1-c), armL:-45+15*(1-c), spread:0.8*c}; } break; }
    case 'wsc': {
      if(t<65) return {crouch:0.9,lean:24,armR:-35,armL:-45,spread:0.65};
      if(t<225){ const k=e((t-65)/160); return {crouch:0.9*(1-k),lean:24-32*k,armR:-35+220*k,armL:-35,spread:0.5,reach:8*k,jump:6*k}; }
      if(t<480){ const k=(t-225)/255; return {crouch:0,lean:-8*(1-k),armR:185-150*k,armL:-35+5*k,spread:0.5-0.25*k,reach:8*(1-k),jump:6*(1-k)}; }
      break; }
    case 'ewgf': {
      if(t<70) return {crouch:0.95, lean:32, armR:-40, armL:-30, spread:0.9, eyeGlow:anim.electric};
      if(t<260){ const k = e((t-70)/190); return {crouch:0.9*(1-k), lean:32-42*k, armR:-40+240*k, armL:-20, jump:38*Math.sin(k*Math.PI*0.5), tuck:k, spread:0.4, eyeGlow:anim.electric}; }
      if(t<520){ const k=(t-260)/260; return {crouch:0, lean:-10+10*k, armR:200-40*k, armL:-20, jump:38*Math.cos(k*Math.PI/2), tuck:1-k, spread:0.2, eyeGlow:anim.electric&&k<.6}; }
      break; }
    case 'sky': { // 초스카이 / Sky Rocket (결정 33(jfsr)): a short sink, then the front leg swings straight up as the body rises
      if(t<70){ const k=t/70; return {crouch:0.7*k, lean:18*k, armR:-30, armL:-50, spread:0.7, eyeGlow:anim.electric}; }
      if(t<270){ const k=e((t-70)/200); return {crouch:0.7*(1-k), lean:18-34*k, armR:-30+50*k, armL:-50-30*k, spread:0.5, jump:34*Math.sin(k*Math.PI*0.5), kick:k, eyeGlow:anim.electric}; }
      if(t<540){ const k=(t-270)/270; return {crouch:0, lean:-16+16*k, armR:20, armL:-80+50*k, spread:0.4, jump:34*Math.cos(k*Math.PI/2), kick:1-k, eyeGlow:anim.electric&&k<.6}; }
      break; }
    case 'jab': { if(t<200){ const k = Math.sin(Math.min(1,t/200)*Math.PI); return {crouch:0.5, lean:12, armR:90*k+10, armL:-20, spread:0.4, sweat:true}; } break; }
    case 'stumble': { if(t<420){ const k=Math.sin(t/420*Math.PI); return {crouch:0.15*k, lean:-18*k, armR:120*k, armL:100*k, spread:0.8, sweat:true}; } break; }
    case 'dash': { if(t<220){ const k=t/220; return {crouch:0.2*(1-k), lean:4+18*(1-k), spread:0.6, step:0.9-1.4*k, armR:10, armL:-45}; } break; }
    case 'backdash': { const T_BD = BD_MOVE_MS; if(t<T_BD){ const k=t/T_BD; return {crouch:0.15, lean:-14*(1-k), spread:0.7, step:-0.9+1.2*k, armR:20, armL:-55}; }
      if(now<bdRec.until) return {crouch:0.12, lean:-5, spread:0.7, step:0.3, armR:22, armL:-56, sweat:true}; // recovery: not back to idle yet (a b,N,b now does nothing; a crouch ends it)
      break; }
    case 'bdCrouch': { if(t<110){ const k=t/110; return {crouch:0.6-0.2*k, lean:-6, spread:0.75, step:-0.2, armR:15, armL:-50}; } break; } // 1(↙) cancel: a short sit where the backdash stopped
    case 'tongbal': { // f,f+2: quick forward lunge with a long right straight punch that snaps out fast
      if(t<70){ const k=t/70; return {crouch:0.28-0.13*k, lean:8+8*k, armR:-10+102*k, armL:-42, spread:0.5+0.1*k, step:0.3+0.5*k, reach:13*k}; } // snap the arm out fast to full reach
      if(t<230) return {crouch:0.15, lean:17, armR:94, armL:-42, spread:0.62, step:0.82, reach:13};                                     // held at full extension
      if(t<520){ const k=(t-230)/290; return {crouch:0.15*(1-k), lean:17-13*k, armR:94-60*k, armL:-42+10*k, spread:0.6-0.25*k, step:0.82*(1-k), reach:13*(1-k)}; } // recover
      break; }
    case 'hellsweep': { // f,N,d,df+4: fast low spinning sweep (~2x speed) — drop very low, right leg extended, lower body spins one full turn along the ground
      const drop = 8; // extra sink so the whole stance is lower
      if(t<40){ const k=t/40; return {crouch:1, lean:40, armR:-34, armL:-62, spread:0.95, sweep:2.6, sink:drop*k}; } // wind up: right leg back-low
      if(t<280){ const k=(t-40)/240; return {crouch:1, lean:42, armR:-34, armL:-62, spread:0.95, sweep:2.6 - k*Math.PI*2, sink:drop}; } // one full low circle, ground-first
      if(t<380){ const k=(t-280)/100; return {crouch:1-0.6*k, lean:42*(1-k), armR:-34+50*k, armL:-62+22*k, spread:0.95-0.5*k, sink:drop*(1-k)}; } // rise back up
      break; }
    case 'giwon': { // d/f+2: a light right hook — the stance stays tall (no sink, no deep crouch: that read as an uppercut),
      // the elbow stays bent (almost no reach) and the fist whips around to just above shoulder line, then drops back to guard
      if(t<55){ const k=t/55; return {crouch:0.1+0.05*k, lean:5-3*k, armR:22-14*k, armL:-52, spread:0.4, step:0.14, reach:0}; }          // cock the shoulder back
      if(t<150){ const k=e((t-55)/95); return {crouch:0.15+0.11*k, lean:2+18*k, armR:8+110*k, armL:-54, spread:0.4+0.16*k, step:0.14+0.3*k, reach:9*k}; } // whip it around, overshooting past the hold
      if(t<290){ const k=(t-150)/140; return {crouch:0.26, lean:20, armR:118-14*k, armL:-54, spread:0.56, step:0.44, reach:9}; }
      if(t<540){ const k=(t-290)/250; return {crouch:0.26*(1-k), lean:20-16*k, armR:104-80*k, armL:-54+24*k, spread:0.56-0.31*k, step:0.44*(1-k), reach:9*(1-k)}; }
      if(giwonStiff(now)) return {crouch:0.06, lean:3, spread:0.3, step:0.1, armR:28, armL:-46, sweat:true}; // 경직이 남아 있다: 가드로 돌아왔지만 아직 행동 불가 (bdRec과 같은 처리)
      break; }
    // 도발 제트어퍼 (결정 35(tju)): poses keyed to game frames (t/FRAME), so they line up with the judged frames
    case 'taunt': { const f = t/FRAME+1; if(f<=TJ.END_F+TJ_FLEX_F+TJ_FLEX_BACK) return tjTauntPose(f, idle); break; } // TJ_POSE: 실측 영상의 도발 자세, 끝난 뒤 잠시 힘준 자세
    case 'tjCut': { const f = t/FRAME; if(f<TJ_CUT_F){ const k = e(f/TJ_CUT_F), a = anim.cutFrom||{}, to = {crouch:0.1, lean:4, armR:35, armL:-30, spread:0.3, knee:0, reach:0}, out = {}; // cancelled: from the taunt pose back to guard
      for(const key in to) out[key] = (a[key]??to[key]) + (to[key]-(a[key]??to[key]))*k; return out; } break; }
    case 'ju': { // 제트어퍼: 넓게 주저앉아 버티다가(실측 영상 37~41f) 마지막 3f에 아래에서 크게 올려 친다 — 주먹이 TJ.JU_F(14f)에 닿는다
      const f = t/FRAME+1, kf = anim.kneeFrom||0, up = TJ.JU_F-3;
      if(f<=7){ const k = e(f/7); return {crouch:0.25+0.65*k, lean:6+14*k, armR:-15-25*k, armL:-35-15*k, spread:0.5+0.45*k, step:0.2*k, knee:kf*(1-k)}; }
      if(f<=up){ const k = (f-7)/(up-7); return {crouch:0.9+0.05*k, lean:20+4*k, armR:-40-8*k, armL:-50, spread:0.95, step:0.2}; }
      if(f<=TJ.JU_F){ const k = e((f-up)/(TJ.JU_F-up)); return {crouch:0.95*(1-k), lean:24-36*k, armR:-48+223*k, armL:-50+15*k, spread:0.95-0.55*k, jump:12*Math.sin(k*Math.PI/2), step:0.2+0.5*k, reach:5*k}; }
      if(f<=TJ.JU_F+16){ const k = (f-TJ.JU_F)/16; return {crouch:0, lean:-12+14*k, armR:175-125*k, armL:-35, spread:0.4-0.1*k, jump:12*Math.cos(k*Math.PI/2), step:0.7*(1-k), reach:5*(1-k)}; }
      break; }
    case 'bknee': { // 도발 뒷무릎 (←+RK, 16f): 무릎을 곧게 올려 친다
      const f = t/FRAME+1, su = TJ.STARTUP['b+4'];
      if(f<=su){ const k = e(f/su); return {crouch:0.12*(1-k), lean:-4-9*k, armR:22-8*k, armL:-44-8*k, spread:0.3, knee:k, jump:7*k}; }
      if(f<=su+14){ const k = (f-su)/14; return {crouch:0.06*k, lean:-13+15*k, armR:14+20*k, armL:-52+20*k, spread:0.3, knee:1-k, jump:7*(1-k)}; }
      break; }
    case 'walk': { const s = Math.sin(now/150*Math.PI), fwd = anim.walkDir==='f'; // frame() keeps kind==='walk' while f/b is held and clears it otherwise
      return {crouch:0.05, lean:fwd?7:-5, spread:0.35, step:s, jump:Math.abs(s)*2, armR:30+s*8*(fwd?1:-1), armL:-30-s*8}; }
  }
  if(anim.kind!=='idle') anim.kind='idle';
  return idle();
}
function drawBolt(g, x, y, len, ang, w, color){
  g.strokeStyle=color; g.lineWidth=w; g.lineCap='round'; g.beginPath(); g.moveTo(x,y);
  let cx=x, cy=y; const segs=5+Math.floor(Math.random()*3);
  for(let i=0;i<segs;i++){ const a = ang + (Math.random()-0.5)*1.4; cx += Math.cos(a)*len/segs; cy += Math.sin(a)*len/segs; g.lineTo(cx,cy); }
  g.stroke();
}
const DUMMY_LOOK = { // rush30 targets: bag position tells the height, colour and label repeat it. [top, height, colour token, fallback, stripe]
  high:{top:-132, h:44, color:'--accent', fb:'#4CC9FF', stripe:'#2C8FBF'},
  mid: {top:-96,  h:64, color:'--gold',   fb:'#F5C542', stripe:'#B8902A'},
  low: {top:-40,  h:36, color:'--red',    fb:'#E5484D', stripe:'#8E2724'},
};
function drawDummy(g, sx, gy, d){
  g.save(); g.translate(sx, gy + d.y); g.rotate(d.rot);
  const L = d.type ? DUMMY_LOOK[d.type] : null;
  const top = L ? L.top : -96, h = L ? L.h : 64, poleTop = Math.min(-70, top+h-2);
  // stand
  g.fillStyle='#2A3140'; g.fillRect(-16,-4,32,5); g.fillStyle='#3A4353'; g.fillRect(-4,poleTop,8,-2-poleTop);
  // bag
  g.fillStyle = L ? cssVar(L.color, L.fb) : '#B0332F'; g.beginPath(); g.roundRect(-14,top,28,h,7); g.fill();
  g.fillStyle = L ? L.stripe : '#8E2724'; g.fillRect(-14,top+h*0.45,28,4); if(h>50) g.fillRect(-14,top+h*0.75,28,4);
  g.fillStyle = L ? '#0B1118' : '#E8D9C5'; g.font=`bold ${L?10:9}px JetBrains Mono, monospace`; g.textAlign='center'; g.fillText(L ? T('dummy.'+d.type) : 'DUMMY', 0, top+h*0.45-3);
  if(d.hit&&!d.launchAt){ g.fillStyle='#fff'; g.font='bold 14px Black Han Sans, sans-serif'; g.fillText('><',0,top+18); }
  g.restore();
}

