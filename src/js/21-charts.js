/* ---------- charts ---------- */
function histBins(attempts, window){ // −6f..+9f bins; each attempt with an offset lands in one bin
  const bins = []; for(let f=-6; f<=9; f++) bins.push({f, n:0, kind: Math.abs(f*FRAME)<=window?'ewgf':f<0?'early':'wgf'});
  attempts.forEach(a => { if(a.off==null) return; const f = clamp(a.frameOff ?? Math.round(a.off/FRAME), -6, 9); bins[f+6].n++; });
  return bins;
}
function renderHist(){
  const W=520, H=190, padL=10, padR=10, padT=14, padB=28;
  const at = session.attempts.filter(a=>a.off!=null).slice(-60);
  const bins = histBins(at, store.window);
  const max = Math.max(3, ...bins.map(b=>b.n));
  const bw = (W-padL-padR)/bins.length, innerH = H-padT-padB;
  const winF = 0.5;
  const x0 = padL + (0+6)*bw + bw/2;
  const wl = padL + (-winF+6+0.5)*bw, wr = padL + (winF+6+0.5)*bw;
  const col = k => k==='ewgf'?'var(--accent)':k==='early'?'var(--warn)':'var(--red)';
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHTML(T('hist.aria'))}">`;
  s += `<rect x="${wl}" y="${padT}" width="${wr-wl}" height="${innerH}" fill="var(--accent-soft)"/>`;
  [1,2,3].forEach(i => { const y = padT + innerH - innerH*(i/3); s += `<line x1="${padL}" x2="${W-padR}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/><text x="${W-padR}" y="${y-3}" font-size="10" fill="var(--faint)" text-anchor="end" font-family="JetBrains Mono,monospace">${Math.round(max*i/3)}</text>`; });
  bins.forEach((b,i) => {
    const x = padL + i*bw + 2, w = bw-4, h = b.n? Math.max(4, innerH*b.n/max):0, y = padT+innerH-h;
    if(b.n) s += `<path d="M${x} ${y+4} a4 4 0 0 1 4 -4 h${w-8} a4 4 0 0 1 4 4 v${h-4} h${-w} z" fill="${col(b.kind)}" data-i="${i}"/>`;
    s += `<rect x="${padL+i*bw}" y="${padT}" width="${bw}" height="${innerH}" fill="transparent" data-i="${i}"/>`;
    if((b.f%3)===0) s += `<text x="${padL+i*bw+bw/2}" y="${H-10}" font-size="10.5" fill="var(--muted)" text-anchor="middle" font-family="JetBrains Mono,monospace">${b.f>0?'+':''}${b.f}f</text>`;
  });
  s += `<line x1="${x0}" x2="${x0}" y1="${padT-4}" y2="${padT+innerH}" stroke="var(--ink2)" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  s += `<text x="${x0+5}" y="${padT+6}" font-size="10" fill="var(--ink2)" font-family="JetBrains Mono,monospace">d/f</text>`;
  if(!at.length) s += `<text x="${W/2}" y="${padT+innerH/2}" font-size="12" fill="var(--muted)" text-anchor="middle" font-family="var(--body)">${escapeHTML(T('hist.empty'))}</text>`;
  s += '</svg>';
  const box = $('hist'); box.innerHTML = s;
  const tip = $('histTip');
  box.querySelector('svg').addEventListener('mousemove', e => {
    const i = e.target.dataset.i; if(i==null){ tip.style.display='none'; return; }
    const b = bins[+i]; const r = $('histCard').getBoundingClientRect();
    tip.style.display='block'; tip.style.left=(e.clientX-r.left+12)+'px'; tip.style.top=(e.clientY-r.top-30)+'px';
    tip.textContent = T('hist.tip', (b.f>0?'+':'')+b.f+'f', Math.round(b.f*FRAME), b.n, T(b.kind==='ewgf'?'hist.kOk':b.kind==='early'?'hist.kEarly':'hist.kLate'));
  });
  box.querySelector('svg').addEventListener('mouseleave', ()=> tip.style.display='none');
}
function renderWave(){
  const W=520, H=190, padL=28, padR=12, padT=12, padB=24;
  const pts = session.cycles.slice(-40);
  const cut = waveTop(), top = cut ?? WAVE_TOP_DEFAULT, yMax = waveYMax(top);
  const innerW = W-padL-padR, innerH=H-padT-padB;
  const X = i => padL + (pts.length>1 ? i/(pts.length-1)*innerW : innerW/2);
  const Y = v => padT + innerH - clamp(v,0,yMax)/yMax*innerH;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHTML(T('wave.aria'))}">`;
  s += `<rect x="${padL}" y="${Y(yMax)}" width="${innerW}" height="${Y(top)-Y(yMax)}" fill="var(--accent-soft)"/>`;
  waveGrid(yMax).forEach(v => { s += `<line x1="${padL}" x2="${W-padR}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${padL-6}" y="${Y(v)+3.5}" font-size="10" fill="var(--faint)" text-anchor="end" font-family="JetBrains Mono,monospace">${v}</text>`; });
  s += `<text x="${padL+4}" y="${Y(yMax)+11}" font-size="10" fill="var(--accent)" font-family="var(--body)">${escapeHTML(waveTopText(cut))}</text>`;
  if(pts.length>=2){
    const d = pts.map((p,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(p.dps).toFixed(1)).join(' ');
    s += `<path d="${d} L${X(pts.length-1)} ${Y(0)} L${X(0)} ${Y(0)} Z" fill="var(--accent)" opacity=".10"/>`;
    s += `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`;
    const li = pts.length-1; s += `<circle cx="${X(li)}" cy="${Y(pts[li].dps)}" r="4.5" fill="var(--accent)" stroke="var(--panel)" stroke-width="2"/>`;
    s += `<text x="${X(li)-8}" y="${Y(pts[li].dps)-8}" font-size="11" fill="var(--ink)" text-anchor="end" font-family="JetBrains Mono,monospace">${pts[li].dps.toFixed(1)}</text>`;
    s += `<line id="wcross" x1="0" x2="0" y1="${padT}" y2="${padT+innerH}" stroke="var(--ink2)" stroke-dasharray="3 3" style="display:none"/>`;
  } else {
    s += `<text x="${W/2}" y="${padT+innerH/2}" font-size="12" fill="var(--muted)" text-anchor="middle" font-family="var(--body)">${escapeHTML(T('wave.empty'))}</text>`;
  }
  s += `<text x="${padL}" y="${H-6}" font-size="10" fill="var(--muted)" font-family="var(--body)">${escapeHTML(T('wave.old'))}</text><text x="${W-padR}" y="${H-6}" font-size="10" fill="var(--muted)" text-anchor="end" font-family="var(--body)">${escapeHTML(T('wave.recent'))}</text>`;
  s += '</svg>';
  const box = $('waveChart'); box.innerHTML = s;
  const svg = box.querySelector('svg'), tip=$('waveTip'), cross = svg.querySelector('#wcross');
  svg.addEventListener('mousemove', e => {
    if(pts.length<2) return;
    const rect = svg.getBoundingClientRect(); const mx = (e.clientX-rect.left)/rect.width*W;
    const i = clamp(Math.round((mx-padL)/innerW*(pts.length-1)),0,pts.length-1);
    cross.style.display='block'; cross.setAttribute('x1',X(i)); cross.setAttribute('x2',X(i));
    const r = $('waveCard').getBoundingClientRect();
    tip.style.display='block'; tip.style.left=(e.clientX-r.left+12)+'px'; tip.style.top=(e.clientY-r.top-30)+'px';
    tip.textContent = T('wave.tip', pts[i].dps.toFixed(2), Math.round(pts[i].cycle), (pts[i].cycle/FRAME).toFixed(1));
  });
  svg.addEventListener('mouseleave', ()=>{ tip.style.display='none'; if(cross) cross.style.display='none'; });
}

