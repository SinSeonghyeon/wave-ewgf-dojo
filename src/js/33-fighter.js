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
  const lx = -spread - step*8, rx = spread + step*8, ly = -tuck*10 - Math.max(0,-step)*4, ry = -tuck*8 - Math.max(0,step)*4;
  g.beginPath(); g.moveTo(lx, ly); g.lineTo(-spread*0.35, -legL); g.stroke();
  g.beginPath(); g.moveTo(rx, ry); g.lineTo(spread*0.3, -legL); g.stroke();
  if(!tint && LG.deco) LG.deco(g, [[lx,ly,-spread*0.35,-legL],[rx,ry,spread*0.3,-legL]]);
  // shoes
  foot(lx-1, ly); foot(rx+2, ry);
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
  return fist;
}
function poseAt(now){
  const t = now - anim.t0;
  const e = x => 1-Math.pow(1-x,3);
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
    case 'jab': { if(t<200){ const k = Math.sin(Math.min(1,t/200)*Math.PI); return {crouch:0.5, lean:12, armR:90*k+10, armL:-20, spread:0.4, sweat:true}; } break; }
    case 'stumble': { if(t<420){ const k=Math.sin(t/420*Math.PI); return {crouch:0.15*k, lean:-18*k, armR:120*k, armL:100*k, spread:0.8, sweat:true}; } break; }
    case 'dash': { if(t<220){ const k=t/220; return {crouch:0.2*(1-k), lean:4+18*(1-k), spread:0.6, step:0.9-1.4*k, armR:10, armL:-45}; } break; }
    case 'backdash': { const T_BD = BD_LAST*FRAME; if(t<T_BD){ const k=t/T_BD; return {crouch:0.15, lean:-14*(1-k), spread:0.7, step:-0.9+1.2*k, armR:20, armL:-55}; }
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
    case 'walk': { const s = Math.sin(now/150*Math.PI), fwd = anim.walkDir==='f'; // frame() keeps kind==='walk' while f/b is held and clears it otherwise
      return {crouch:0.05, lean:fwd?7:-5, spread:0.35, step:s, jump:Math.abs(s)*2, armR:30+s*8*(fwd?1:-1), armL:-30-s*8}; }
  }
  if(anim.kind!=='idle') anim.kind='idle';
  return {crouch:0, lean:4+Math.sin(now/420)*2, jump:Math.abs(Math.sin(now/420))*2.5, armR:35+Math.sin(now/420)*4, armL:-30, spread:0.25};
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

