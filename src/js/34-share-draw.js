/* ---------- share card: canvas drawing (1200×630) ---------- */
const cssVar = (name, fb) => { try{ const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v||fb; }catch(e){ return fb; } };
function fitFont(g, text, maxW, size, font, weight, minSize){
  let s = size; g.font = `${weight||''} ${s}px ${font}`.trim();
  while(s>(minSize||12) && g.measureText(text).width>maxW){ s -= 2; g.font = `${weight||''} ${s}px ${font}`.trim(); }
}
function drawWood(g, x, y, w, h, base, seed){
  // Procedural plank wall with grain. Seeded LCG so og.png is reproducible run to run.
  let s = seed>>>0; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223)>>>0; return s/4294967296; };
  const plankH = 54;
  g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
  for(let py=y; py<y+h; py+=plankH){
    g.fillStyle=base; g.fillRect(x,py,w,plankH);
    const shade = g.createLinearGradient(x,py,x+w,py); const t = 0.05+rnd()*0.22;
    shade.addColorStop(0,`rgba(0,0,0,${t})`); shade.addColorStop(0.45,`rgba(255,215,160,${rnd()*0.06})`); shade.addColorStop(1,`rgba(0,0,0,${t+0.1})`);
    g.fillStyle=shade; g.fillRect(x,py,w,plankH);
    for(let k=0;k<7;k++){ // grain lines: long, slightly wavy
      const y0 = py+4+rnd()*(plankH-8), amp = 0.8+rnd()*2.4, f = 70+rnd()*160, ph = rnd()*6.28, dark = rnd()<0.75;
      g.strokeStyle = dark ? `rgba(0,0,0,${0.10+rnd()*0.14})` : `rgba(255,220,170,${0.04+rnd()*0.05})`; g.lineWidth = dark ? 1+rnd() : 1;
      g.beginPath(); for(let gx=x; gx<=x+w; gx+=14){ const gy = y0 + Math.sin(gx/f+ph)*amp + Math.sin(gx/19+ph*2)*0.5; gx===x ? g.moveTo(gx,gy) : g.lineTo(gx,gy); } g.stroke();
    }
    g.fillStyle='rgba(0,0,0,.5)'; g.fillRect(x,py+plankH-3,w,3); g.fillStyle='rgba(255,230,190,.07)'; g.fillRect(x,py,w,1); // seam + top highlight
  }
  const vig = g.createRadialGradient(x+w*0.35,y+h*0.3,h*0.2,x+w*0.5,y+h*0.5,w*0.75); vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,0,.45)'); g.fillStyle=vig; g.fillRect(x,y,w,h);
  g.restore();
}
function drawPlaque(g, x, y, w, h, C, nails){
  // Hanging wooden signboard: dark board, lighter wood frame, thin gold inner line, iron nails in the corners.
  const rr = (px,py,pw,ph,r) => { g.beginPath(); g.roundRect(px,py,pw,ph,r); };
  g.fillStyle='rgba(0,0,0,.45)'; rr(x+4,y+6,w,h,6); g.fill();
  g.fillStyle=C.board; rr(x,y,w,h,6); g.fill();
  g.strokeStyle=C.wood; g.lineWidth=6; rr(x+3,y+3,w-6,h-6,5); g.stroke();
  g.strokeStyle='rgba(0,0,0,.55)'; g.lineWidth=1; rr(x+6.5,y+6.5,w-13,h-13,3); g.stroke();
  g.strokeStyle='rgba(245,197,66,.55)'; g.lineWidth=1; rr(x+10.5,y+10.5,w-21,h-21,3); g.stroke();
  if(nails) [[x+11,y+11],[x+w-11,y+11],[x+11,y+h-11],[x+w-11,y+h-11]].forEach(([nx,ny]) => { g.fillStyle='#0E0805'; g.beginPath(); g.arc(nx+1,ny+1,3.5,0,Math.PI*2); g.fill(); g.fillStyle='#C9A96E'; g.beginPath(); g.arc(nx,ny,3,0,Math.PI*2); g.fill(); });
}
function drawCard(g, model){
  const CW=1200, CH=630, wood = model.style==='wood';
  const C = { bg:cssVar('--bg','#0B0E13'), panel:cssVar('--panel2','#1B2330'), line:cssVar('--line','#273140'), line2:cssVar('--line2','#334052'),
    ink:cssVar('--ink','#EEF2F6'), ink2:cssVar('--ink2','#C3CCD8'), muted:cssVar('--muted','#8C98AA'), faint:cssVar('--faint','#5B687A'),
    accent:cssVar('--accent','#4CC9FF'), accentSoft:cssVar('--accent-soft','rgba(76,201,255,.14)'), gold:cssVar('--gold','#F5C542'),
    red:cssVar('--red','#E5484D'), warn:cssVar('--warn','#F5A524'),
    wood:cssVar('--wood','#6B4423'), woodDark:cssVar('--wood-dark','#2A1709'), board:cssVar('--board','#1E1109'),
    cream:cssVar('--cream','#F3E2B8'), cream2:cssVar('--cream2','#D9C49A'), creamMuted:cssVar('--cream-muted','#A8906A'),
    paper:cssVar('--paper','#EFE3C8'), paperInk:cssVar('--paper-ink','#2A1A10'), paperMuted:cssVar('--paper-muted','#6B5238'),
    paperBlue:cssVar('--paper-blue','#1F6FB2'), paperRed:cssVar('--paper-red','#B8322E'), paperAmber:cssVar('--paper-amber','#C98A1C') };
  // P: per-style palette so the layout code below stays style-agnostic (default = dark app theme, wood = dojo signboard for og.png)
  const P = wood
    ? { text:C.cream, text2:C.cream2, muted:C.creamMuted, faint:C.creamMuted, pillFill:'rgba(243,226,184,.10)', pillText:C.cream, pillStroke:'rgba(243,226,184,.28)',
        tileFill:C.board, tileStroke:C.wood, tileText:C.gold, panelFill:C.paper, panelStroke:C.woodDark, chartInk:C.paperInk, chartMuted:C.paperMuted,
        chartLine:'rgba(42,26,16,.14)', winFill:'rgba(31,111,178,.13)', binEwgf:C.paperBlue, binEarly:C.paperAmber, binWgf:C.paperRed, footerLine:'rgba(243,226,184,.25)', url:C.gold }
    : { text:C.ink, text2:C.ink2, muted:C.muted, faint:C.faint, pillFill:C.accentSoft, pillText:C.accent, pillStroke:null,
        tileFill:'rgba(255,255,255,.04)', tileStroke:C.line, tileText:C.accent, panelFill:'rgba(255,255,255,.035)', panelStroke:C.line, chartInk:C.ink2, chartMuted:C.muted,
        chartLine:C.line, winFill:C.accentSoft, binEwgf:C.accent, binEarly:C.warn, binWgf:C.red, footerLine:C.line, url:C.accent };
  const body = cssVar('--body','system-ui, sans-serif'), disp = displayFont(), mono = cssVar('--mono','"JetBrains Mono", monospace');
  const rr = (x,y,w,h,r) => { g.beginPath(); g.roundRect(x,y,w,h,r); };
  g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,CW,CH);
  // backdrop
  if(wood){
    drawWood(g, 0, 0, CW, CH, C.wood, 20260911);
    g.fillStyle=C.woodDark; g.fillRect(0,0,CW,14); g.fillRect(0,CH-14,CW,14); g.fillStyle='rgba(255,230,190,.08)'; g.fillRect(0,14,CW,1); g.fillRect(0,CH-15,CW,1); // beams
    g.strokeStyle=C.woodDark; g.lineWidth=4; g.strokeRect(2,2,CW-4,CH-4);
  } else {
    const bg = g.createLinearGradient(0,0,CW,CH); bg.addColorStop(0,C.bg); bg.addColorStop(1,C.panel); g.fillStyle=bg; g.fillRect(0,0,CW,CH);
    const glow = g.createRadialGradient(220,140,10,220,140,560); glow.addColorStop(0,'rgba(76,201,255,.16)'); glow.addColorStop(1,'rgba(76,201,255,0)'); g.fillStyle=glow; g.fillRect(0,0,CW,CH);
    g.strokeStyle=C.line2; g.lineWidth=2; g.strokeRect(1,1,CW-2,CH-2);
    g.fillStyle=C.accent; g.fillRect(0,0,CW,6);
  }
  g.textBaseline='alphabetic';
  // header: app name (on a signboard in wood style), mode pill, top-right text
  g.textAlign='left'; fitFont(g, model.app, 520, 46, disp); const aw = g.measureText(model.app).width;
  if(wood){ drawPlaque(g, 44, 34, aw+72, 76, C, true); g.fillStyle='rgba(0,0,0,.6)'; g.fillText(model.app, 82, 90); }
  g.fillStyle=P.text; g.fillText(model.app, wood?80:56, wood?88:86);
  fitFont(g, model.modeName, 400, 20, body, 700); const mw = g.measureText(model.modeName).width, py = wood?126:104;
  g.fillStyle=P.pillFill; rr(56, py, mw+28, 36, 6); g.fill(); if(P.pillStroke){ g.strokeStyle=P.pillStroke; g.lineWidth=1; rr(56.5, py+.5, mw+27, 35, 6); g.stroke(); }
  g.fillStyle=P.pillText; g.fillText(model.modeName, 70, py+25);
  g.fillStyle=P.muted; fitFont(g, model.sub, 480, 16, body, 500); g.fillText(model.sub, mw+100, py+25);
  g.textAlign='right'; g.fillStyle=P.muted; g.font=`500 18px ${mono}`; g.fillText(model.dateText, CW-56, 86);
  g.textAlign='left';
  if(model.tagline){
    // promotional layout (og.png): tagline lines instead of the hero number, chips instead of metric tiles
    g.fillStyle=P.text; model.tagline.forEach((line,i) => { fitFont(g, line, 530, 46, disp, '', 24); g.fillText(line, 56, 246+i*64); });
    g.fillStyle=C.gold; fitFont(g, model.keywords, 530, 21, body, 700, 12); g.fillText(model.keywords, 56, 366);
    g.fillStyle=P.muted; fitFont(g, model.note, 530, 16, body, 500, 11); g.fillText(model.note, 56, 410);
    (model.chips||[]).forEach(({cmd, tag}, i) => {
      const x = 56+i*230, y = 440, w = 210, h = 60;
      if(wood) drawPlaque(g, x, y, w, h, C, false);
      else { g.fillStyle=P.tileFill; rr(x,y,w,h,6); g.fill(); g.strokeStyle=P.tileStroke; g.lineWidth=1; rr(x+.5,y+.5,w-1,h-1,6); g.stroke(); }
      g.fillStyle=P.tileText; g.font=`700 26px ${mono}`; g.fillText(cmd, x+18, y+40);
      g.fillStyle=P.muted; g.font=`500 13px ${body}`; g.textAlign='right'; g.fillText(tag, x+w-18, y+40); g.textAlign='left';
    });
  } else {
    // hero number + label
    g.fillStyle=C.gold; fitFont(g, model.hero.value, 500, 128, disp, '', 60); g.fillText(model.hero.value, 52, 292);
    g.fillStyle=P.text2; fitFont(g, model.hero.label, 500, 22, body, 500); g.fillText(model.hero.label, 56, 328);
    // metric tiles (2 columns)
    model.metrics.slice(0,4).forEach((mt,i) => {
      const x = 56+(i%2)*270, y = 356+Math.floor(i/2)*84, w=254, h=72;
      g.fillStyle=P.tileFill; rr(x,y,w,h,6); g.fill(); g.strokeStyle=P.tileStroke; g.lineWidth=1; rr(x+.5,y+.5,w-1,h-1,6); g.stroke();
      g.fillStyle=P.text; fitFont(g, mt.value, w-28, 28, mono, 700, 16); g.fillText(mt.value, x+14, y+34);
      g.fillStyle=P.muted; fitFont(g, mt.label, w-28, 13, body, 500, 10); g.fillText(mt.label, x+14, y+58);
    });
    if(model.rankText){ g.fillStyle=C.gold; fitFont(g, model.rankText, 540, 20, body, 700, 13); g.fillText(model.rankText, 56, 548); } // rank + tier, under the tiles
  }
  // chart panel (paper sheet in wood style)
  const cx=620, cy=160, cw=390, ch=280;
  if(wood){ g.fillStyle='rgba(0,0,0,.4)'; rr(cx+5,cy+7,cw,ch,4); g.fill(); }
  g.fillStyle=P.panelFill; rr(cx,cy,cw,ch,wood?4:8); g.fill(); g.strokeStyle=P.panelStroke; g.lineWidth=wood?2:1; rr(cx+.5,cy+.5,cw-1,ch-1,wood?4:8); g.stroke();
  if(wood){ g.strokeStyle='rgba(42,26,16,.28)'; g.lineWidth=1; rr(cx+7.5,cy+7.5,cw-15,ch-15,2); g.stroke(); }
  const chart = model.chart, ix=cx+22, iy=cy+52, iw=cw-44, ih=ch-92;
  g.fillStyle=P.chartInk; g.textAlign='left';
  if(chart && chart.type==='hist'){
    fitFont(g, T('card.hist'), cw-40, 15, body, 700); g.fillText(T('card.hist'), cx+20, cy+32);
    const bins = chart.bins, bw = iw/bins.length, max = Math.max(3, ...bins.map(b=>b.n)), winF = chart.window/FRAME;
    g.fillStyle=P.winFill; g.fillRect(ix+(-winF+6+0.5)*bw, iy, 2*winF*bw, ih);
    g.strokeStyle=P.chartLine; g.lineWidth=1; [1,2,3].forEach(i => { const y = iy+ih-ih*(i/3); g.beginPath(); g.moveTo(ix,y); g.lineTo(ix+iw,y); g.stroke(); });
    bins.forEach((b,i) => { if(!b.n) return; const h = Math.max(4, ih*b.n/max); g.fillStyle = b.kind==='ewgf'?P.binEwgf:b.kind==='early'?P.binEarly:P.binWgf; rr(ix+i*bw+2, iy+ih-h, bw-4, h, 3); g.fill(); });
    const x0 = ix+6.5*bw; g.strokeStyle=P.chartInk; g.setLineDash([4,4]); g.beginPath(); g.moveTo(x0,iy-6); g.lineTo(x0,iy+ih); g.stroke(); g.setLineDash([]);
    g.fillStyle=P.chartMuted; g.font=`500 12px ${mono}`; g.textAlign='center';
    bins.forEach((b,i) => { if(b.f%3===0) g.fillText((b.f>0?'+':'')+b.f+'f', ix+i*bw+bw/2, iy+ih+20); });
  } else if(chart && chart.type==='wave'){
    fitFont(g, T('card.wave'), cw-40, 15, body, 700); g.fillText(T('card.wave'), cx+20, cy+32);
    const pts = chart.pts, top = chart.top ?? WAVE_TOP_DEFAULT, yMax = waveYMax(top), X = i => ix + (pts.length>1 ? i/(pts.length-1)*iw : iw/2), Y = v => iy+ih-clamp(v,0,yMax)/yMax*ih;
    g.fillStyle=P.winFill; g.fillRect(ix, Y(yMax), iw, Y(top)-Y(yMax));
    g.strokeStyle=P.chartLine; g.lineWidth=1; g.fillStyle=P.faint; g.font=`500 12px ${mono}`; g.textAlign='right';
    waveGrid(yMax).forEach(v => { g.beginPath(); g.moveTo(ix,Y(v)); g.lineTo(ix+iw,Y(v)); g.stroke(); g.fillText(String(v), ix-4, Y(v)+4); });
    if(pts.length>=2){
      g.beginPath(); pts.forEach((v,i)=>{ i?g.lineTo(X(i),Y(v)):g.moveTo(X(i),Y(v)); }); g.lineTo(X(pts.length-1),Y(0)); g.lineTo(X(0),Y(0)); g.closePath(); g.fillStyle='rgba(76,201,255,.12)'; g.fill();
      g.beginPath(); pts.forEach((v,i)=>{ i?g.lineTo(X(i),Y(v)):g.moveTo(X(i),Y(v)); }); g.strokeStyle=P.binEwgf; g.lineWidth=3; g.lineJoin='round'; g.stroke();
      const li = pts.length-1; g.fillStyle=P.binEwgf; g.beginPath(); g.arc(X(li),Y(pts[li]),5,0,Math.PI*2); g.fill();
    } else if(pts.length===1){ g.fillStyle=P.binEwgf; g.beginPath(); g.arc(X(0),Y(pts[0]),5,0,Math.PI*2); g.fill(); }
    g.fillStyle=P.chartMuted; g.font=`500 12px ${body}`; g.textAlign='left'; g.fillText(T('wave.old'), ix, iy+ih+20); g.textAlign='right'; g.fillText(T('wave.recent'), ix+iw, iy+ih+20);
  } else {
    g.fillStyle=P.chartMuted; g.textAlign='center'; fitFont(g, T('card.noData'), cw-40, 16, body, 500); g.fillText(T('card.noData'), cx+cw/2, cy+ch/2);
  }
  // fighter (own SD art) with bolts
  g.save(); g.translate(1080, 548); g.scale(2.4, 2.4);
  drawFighter(g, 0, 0, {crouch:0.35, lean:22, armR:118, armL:-30, spread:0.55, eyeGlow:true}, 1, 1, null);
  g.restore();
  [[1040,392,-2.2],[1152,372,-0.8],[1128,300,-1.6]].forEach(([x,y,a]) => { drawBolt(g, x, y, 70, a, 4, 'rgba(223,246,255,.9)'); drawBolt(g, x, y, 60, a+0.6, 2, C.accent); });
  // footer band
  g.strokeStyle=P.footerLine; g.lineWidth=1; g.beginPath(); g.moveTo(56,566); g.lineTo(CW-56,566); g.stroke();
  g.textAlign='left'; g.fillStyle=P.text2; fitFont(g, model.windowText, 560, 17, body, 500); g.fillText(model.windowText, 56, 600);
  g.textAlign='right'; g.fillStyle=P.url; g.font=`500 17px ${mono}`; g.fillText(model.url, CW-56, 600);
}
