/* ---------- 3D dojo: native WebGL, procedural materials, the 2D fighter's camera ---------- */
const dojoPalette={wall:cssVar('--room-wall'),beam:cssVar('--room-beam'),floor:cssVar('--room-floor'),seam:cssVar('--room-seam'),ghost:cssVar('--cream2')};
const ROOM={unit:80,bay:4.5,back:-3,height:3.45,eye:2.4,distance:8,pitch:.12};
function roomCamera(width,height,ground,cam,zoom){
  const c=Math.cos(ROOM.pitch),s=Math.sin(ROOM.pitch),depth=s*ROOM.eye+c*ROOM.distance;
  const f=2*ROOM.unit*depth/height, ndcGround=1-2*ground/height, offset=ndcGround-(-c*ROOM.eye+s*ROOM.distance)*f/depth;
  // zoom: uniform screen scale about (horizontal centre, ground line). Scaling f handles x and y together,
  // and pinning the ground NDC row keeps the floor exactly under the 2D fighter's feet at any factor.
  const z=zoom||1;
  return {x:(cam+width/2)/ROOM.unit,y:ROOM.eye,z:ROOM.distance,c,s,f:f*z,offset:ndcGround-(ndcGround-offset)*z,aspect:width/height};
}
function roomProject(p,c,width,height){
  const x=p[0]-c.x,y=p[1]-c.y,z=p[2]-c.z,d=-c.s*y-c.c*z;
  return [width*(.5+x*c.f/(c.aspect*d)*.5),height*(.5-( (c.c*y-c.s*z)*c.f/d+c.offset)*.5),d];
}
// Embedded original wood/plaster atlas; same-origin data URL also works from file://.
// Deterministic materials fill in while the atlas decodes or if it is unavailable.
const ROOM_ATLAS='@@DATA_URI:assets/room-atlas.webp@@'; // tools/assemble.js inlines src/assets/room-atlas.webp
const roomAtlas=typeof Image==='function'?new Image():null;
if(roomAtlas)roomAtlas.src=ROOM_ATLAS;
function roomTexture(kind){
  const c=document.createElement('canvas');c.width=256;c.height=512;const g=c.getContext('2d');
  if(roomAtlas&&roomAtlas.complete&&roomAtlas.naturalWidth){
    const half=roomAtlas.naturalWidth/2;g.drawImage(roomAtlas,kind==='wood'?0:half,0,half,roomAtlas.naturalHeight,0,0,c.width,c.height);return c;
  }
  c.height=256;const im=g.createImageData(256,256);
  const hex=cssVar(kind==='wood'?'--room-wood-fill':'--room-plaster-fill').slice(1),fill=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
  let seed=kind==='wood'?481:937;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const i=(y*256+x)*4;
    const grain=Math.sin(x*.52+Math.sin(y*.028)*2+Math.sin(x*.075)*3);
    const pores=Math.pow(Math.max(0,Math.sin(x*2.1+Math.sin(y*.02)*2)),12);
    const variation=kind==='wood'?grain*7-pores*13+(noise()-.5)*11 : Math.sin(x*.054)*Math.sin(y*.047)*6+(noise()-.5)*14;
    const base=fill;
    for(let k=0;k<3;k++)im.data[i+k]=base[k]+variation;im.data[i+3]=255;
  }
  g.putImageData(im,0,0);return c;
}
// Recycle only complete three-bay decoration cycles, preserving world-space landmarks.
function roomShift(x){const period=ROOM.bay*3;return Math.floor(x/period)*period;}
function roomMesh(){
  const v=[];
  const quad=(p,n,uv,m)=>{for(const i of [0,1,2,0,2,3])v.push(...p[i],...n,...uv[i],m);};
  const uv=[[0,0],[1,0],[1,1],[0,1]];
  const box=(x,y,z,w,h,d,m)=>{
    quad([[x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]],[0,0,1],[[0,0],[w,0],[w,h],[0,h]],m);
    quad([[x+w,y,z],[x,y,z],[x,y+h,z],[x+w,y+h,z]],[0,0,-1],uv,m);
    quad([[x,y,z],[x,y,z+d],[x,y+h,z+d],[x,y+h,z]],[-1,0,0],[[0,0],[d,0],[d,h],[0,h]],m);
    quad([[x+w,y,z+d],[x+w,y,z],[x+w,y+h,z],[x+w,y+h,z+d]],[1,0,0],[[0,0],[d,0],[d,h],[0,h]],m);
    quad([[x,y+h,z+d],[x+w,y+h,z+d],[x+w,y+h,z],[x,y+h,z]],[0,1,0],[[0,0],[w,0],[w,d],[0,d]],m);
    quad([[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d]],[0,-1,0],uv,m);
  };
  quad([[-36,0,-3],[36,0,-3],[36,0,12],[-36,0,12]],[0,1,0],[[0,0],[36,0],[36,15],[0,15]],0);
  quad([[-36,0,-3],[36,0,-3],[36,3.65,-3],[-36,3.65,-3]],[0,0,1],[[0,0],[36,0],[36,2],[0,2]],1);
  // Ceiling and continuous rails meet the wall and the floor in the same world space.
  box(-36,3.45,-3,72,.15,7,2);
  box(-36,0,-2.98,72,.16,.16,2);
  box(-36,.16,-2.99,72,.55,.06,2);
  box(-36,.70,-2.98,72,.10,.14,2);
  box(-36,2.9,-2.97,72,.13,.18,2);
  box(-36,3.25,-2.97,72,.2,.26,2);
  for(let i=-8;i<=8;i++){
    const x=i*ROOM.bay;
    box(x-.10,.02,-2.98,.20,3.42,.29,2);
    box(x-.14,0,-3,.28,.12,.36,4);
    box(x-.13,3.28,-2.98,.26,.20,5.9,2);
    // A small warm paper lamp: opaque frame, inset emissive panel, gentle shader light pool.
    box(x+2.16,2.34,-2.91,.24,.42,.18,2);
    box(x+2.19,2.39,-2.715,.18,.30,.015,3);
    box(x+2.175,2.54,-2.692,.21,.018,.015,2);
    if(i%3===0){
      quad([[x+1.925,1.15,-2.965],[x+2.575,1.15,-2.965],[x+2.575,2.33,-2.965],[x+1.925,2.33,-2.965]],[0,0,1],uv,5);
      box(x+1.89,1.12,-2.955,.72,.045,.06,2);box(x+1.89,2.33,-2.955,.72,.045,.06,2);
    }
    if(((i%3)+3)%3===1){
      box(x+1.45,.30,-2.65,1.6,.08,.48,2);
      for(const leg of [1.56,2.82])box(x+leg,0,-2.6,.10,.30,.32,2);
    }
  }
  return new Float32Array(v);
}
function createDojo3D(canvas){
  if(!canvas||typeof document.createElement!=='function')return null;
  let gl;try{gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,powerPreference:'low-power'});}catch(e){return null;}
  if(!gl||typeof gl.createShader!=='function')return null;
  const vs=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;attribute float aMaterial;
    uniform vec3 uCamera;uniform vec4 uProjection;uniform vec2 uRotation;uniform float uShift;
    varying vec3 vWorld;varying vec3 vNormal;varying vec2 vUV;varying float vMaterial;
    void main(){vec3 p=aPosition+vec3(uShift,0.,0.);vec3 q=p-uCamera;
      float vy=uRotation.x*q.y-uRotation.y*q.z;float d=-uRotation.y*q.y-uRotation.x*q.z;
      gl_Position=vec4(q.x*uProjection.x/uProjection.y,vy*uProjection.x+uProjection.z*d,1.0025*d-.20025,d);
      vWorld=p;vNormal=aNormal;vUV=aUV;vMaterial=aMaterial;}`;
  const derivatives=gl.getExtension('OES_standard_derivatives');
  const fs=`${derivatives?'#extension GL_OES_standard_derivatives : enable\n':''}precision highp float;uniform sampler2D uWood;uniform sampler2D uPlaster;uniform vec3 uCamera;uniform vec3 uLamp;uniform vec3 uStone;uniform vec3 uFog;uniform vec3 uPaper;
    varying vec3 vWorld;varying vec3 vNormal;varying vec2 vUV;varying float vMaterial;
    float hash(float n){return fract(sin(n*127.1)*43758.5453);}
    void main(){vec3 n=normalize(vNormal);vec3 col;
      if(vMaterial<.5){
        vec2 uv=vec2(vWorld.z*1.35,vWorld.x*.18);col=texture2D(uWood,uv).rgb;
        float row=floor(vWorld.z*2.2),seam=fract(vWorld.z*2.2),end=fract(vWorld.x/3.+hash(row));
        float az=${derivatives?'max(.012,fwidth(vWorld.z*2.2))':'.025'},ax=${derivatives?'max(.003,fwidth(vWorld.x/3.))':'.012'};
        float edge=smoothstep(0.,az,seam)*smoothstep(0.,az,1.-seam)*smoothstep(0.,ax,end);
        col*=mix(.53,1.,edge)*(.86+hash(row)*.22);
      }else if(vMaterial<1.5){col=texture2D(uPlaster,vUV*2.).rgb*.88;}
      else if(vMaterial<2.5){col=texture2D(uWood,vec2(vUV.x*2.,vUV.y*.30)).rgb*.56;}
      else if(vMaterial<3.5){gl_FragColor=vec4(uLamp,1.);return;}
      else if(vMaterial<4.5){col=uStone;}
      else{vec2 p=(vUV-.5)*vec2(.65,1.18);float ring=1.-smoothstep(.009,.027,abs(length(p)-.20+sin(atan(p.y,p.x)*5.)*.006));col=mix(uPaper,texture2D(uWood,vUV).rgb*.35,ring*.85);col*=.94+texture2D(uPlaster,vUV).r*.13;}
      float diffuse=max(dot(n,normalize(vec3(-.25,.8,.5))),0.);
      float lampX=mod(vWorld.x-2.25+2.25,4.5)-2.25;
      float light=exp(-length(vec3(lampX,(vWorld.y-2.5)*.65,(vWorld.z+2.65)*.8))*.85);
      col*=.62+diffuse*.40;col+=uLamp*.24*light;
      float joint=exp(-abs(vWorld.y)*6.)*exp(-abs(vWorld.z+3.)*3.);
      col*=1.-.4*joint;
      float post=mod(vWorld.x+2.25,4.5)-2.25;
      if(vMaterial<.5)col*=1.-.28*exp(-length(vec2(post,(vWorld.z+2.8)*1.1))*3.);
      float fade=clamp(length(vWorld-uCamera)/35.,0.,.25);col=mix(col,uFog,fade);
      gl_FragColor=vec4(col,1.);}`;
  let state=null,lost=false,failed=false,error='';
  function build(){
    if(derivatives)gl.getExtension('OES_standard_derivatives');
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(log||'dojo shader');}return s;};
    const vertex=shader(gl.VERTEX_SHADER,vs),fragment=shader(gl.FRAGMENT_SHADER,fs),program=gl.createProgram();
    gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'dojo program');
    gl.useProgram(program);
    const rgb=name=>{const h=cssVar(name).replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255);};
    for(const [name,token] of [['uLamp','--room-lamp'],['uStone','--room-stone'],['uFog','--bg'],['uPaper','--room-paper']])gl.uniform3fv(gl.getUniformLocation(program,name),rgb(token));
    const mesh=roomMesh(),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
    let offset=0;for(const [name,size] of [['aPosition',3],['aNormal',3],['aUV',2],['aMaterial',1]]){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,36,offset*4);offset+=size;}
    const textures=[];
    for(const [i,kind,name] of [[0,'wood','uWood'],[1,'plaster','uPlaster']]){
      const texture=gl.createTexture();textures.push({texture,kind,i});gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,roomTexture(kind));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.generateMipmap(gl.TEXTURE_2D);gl.uniform1i(gl.getUniformLocation(program,name),i);
    }
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(...rgb('--bg'),1);
    state={program,textures,count:mesh.length/9,cam:gl.getUniformLocation(program,'uCamera'),proj:gl.getUniformLocation(program,'uProjection'),rot:gl.getUniformLocation(program,'uRotation'),shift:gl.getUniformLocation(program,'uShift')};
    failed=false;
  }
  try{build();}catch(e){failed=true;error=String(e);}
  if(roomAtlas)roomAtlas.addEventListener('load',()=>{if(lost||failed||!state)return;for(const {texture,kind,i} of state.textures){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,roomTexture(kind));gl.generateMipmap(gl.TEXTURE_2D);}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;canvas.hidden=true;});
  canvas.addEventListener('webglcontextrestored',()=>{try{build();lost=false;}catch(e){failed=true;error=String(e);}});
  return {get ready(){return !lost&&!failed&&!!state;},get error(){return error;},gl,
    render(c,width,height){
      if(!this.ready)return false;
      // Cap the decorative layer independently from the sharp input/character canvas.
      const w=Math.max(1,Math.round(width)),h=Math.max(1,Math.round(height));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      canvas.hidden=false;gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(state.program);
      gl.uniform3f(state.cam,c.x,c.y,c.z);gl.uniform4f(state.proj,c.f,c.aspect,c.offset,0);gl.uniform2f(state.rot,c.c,c.s);gl.uniform1f(state.shift,roomShift(c.x));
      gl.drawArrays(gl.TRIANGLES,0,state.count);return true;
    }};
}
const dojo3d=createDojo3D($('stageBack'));
// Fallback uses the very same perspective and world seam, never independently scrolled image slices.
function drawRoomFallback(g,c){
  const center=Math.floor(c.x/ROOM.bay)*ROOM.bay, left=center-36,right=center+36;
  const face=(points,color)=>{const p=points.map(v=>roomProject(v,c,W,H));g.fillStyle=color;g.beginPath();p.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();g.fill();};
  g.fillStyle=dojoPalette.wall;g.fillRect(0,0,W,H);
  face([[left,0,-3],[right,0,-3],[right,0,7],[left,0,7]],dojoPalette.floor);
  face([[left,0,-3],[right,0,-3],[right,.15,-3],[left,.15,-3]],dojoPalette.beam);
  for(let x=left;x<right;x+=ROOM.bay)face([[x,0,-2.9],[x+.16,0,-2.9],[x+.16,3.45,-2.9],[x,3.45,-2.9]],dojoPalette.beam);
  g.strokeStyle=dojoPalette.seam;g.lineWidth=1;
  for(let z=-3;z<6;z+=.45){const a=roomProject([left,0,z],c,W,H),b=roomProject([right,0,z],c,W,H);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();}
}
function drawDojo(g,gy,zoom){
  if(dojo3d&&dojo3d.render(roomCamera(W,H,gy,world.camX,zoom),canvas.width/dpr*Math.min(dpr,1.5),canvas.height/dpr*Math.min(dpr,1.5))){$('stageBox').dataset.renderer='webgl';return;}
  // The fallback shares g with the 2D layer, which already carries the same zoom transform, so it projects unzoomed.
  $('stageBack').hidden=true;$('stageBox').dataset.renderer='canvas';drawRoomFallback(g,roomCamera(W,H,gy,world.camX));
}

// 도발 레퍼런스 (결정 37(tju), 2026-10-16 사용자 요청): the taunt as recorded in the game, one sheet cell per taunt frame (1 = the press),
// drawn beside the fighter on the side away from the dummy while the taunt plays. Visual only (결정 9(visual-only-motion)). The sheet is a separate
// same-origin file like sfx/, fetched once the character has one (CHARS[id].tj.sprite).
const TAUNT_SPRITE_H = 135, TAUNT_SPRITE_GAP = 120;          // drawn height and the distance behind the fighter (CSS px)
const TAUNT_SPRITE_IN = 5, TAUNT_SPRITE_OUT = 5;            // frames of the fade-in from the dark and of the burn-away after the taunt ends or is cancelled
const TAUNT_SPRITE_LINE = 3, TAUNT_SPRITE_LINE_C = 'rgba(255,240,222,.92)'; // outline width (sheet px) and color
const tauntBuf = {};                                       // small scratch canvases, one cell big: the cell, its silhouette, cell + outline
function tauntCanvas(k, w, h){ let c = tauntBuf[k]; if(!c){ c = tauntBuf[k] = document.createElement('canvas'); } if(c.width!==w || c.height!==h){ c.width = w; c.height = h; } return c; }
function tauntSil(cell, color){ // the cell's shape in one color
  const c = tauntCanvas('sil', cell.width, cell.height), x = c.getContext('2d');
  x.globalCompositeOperation = 'copy'; x.drawImage(cell, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-over'; return c;
}
function tauntNoise(w, h){ // burn order per pixel, 0..1: soft blotches plus grain, the feet a little ahead of the head
  if(tauntBuf.noise && tauntBuf.noise.w===w && tauntBuf.noise.h===h) return tauntBuf.noise.v;
  const gw = 12, gh = 14, grid = Array.from({length:gw*gh}, () => Math.random()), v = new Float32Array(w*h);
  for(let y=0; y<h; y++) for(let x=0; x<w; x++){
    const ux = x/(w-1)*(gw-1), uy = y/(h-1)*(gh-1), x0 = Math.min(gw-2, Math.floor(ux)), y0 = Math.min(gh-2, Math.floor(uy)), tx = ux-x0, ty = uy-y0;
    const at = (i, j) => grid[(y0+j)*gw + x0+i], n = (at(0,0)*(1-tx) + at(1,0)*tx)*(1-ty) + (at(0,1)*(1-tx) + at(1,1)*tx)*ty;
    v[y*w+x] = 0.62*n + 0.12*Math.random() + 0.26*(1 - y/h);
  }
  let lo = Infinity, hi = -Infinity; for(const n of v){ lo = Math.min(lo, n); hi = Math.max(hi, n); }
  for(let i=0; i<v.length; i++) v[i] = (v[i]-lo)/(hi-lo);
  tauntBuf.noise = {w, h, v}; return v;
}
function tauntBurn(src, p){ // paper burn: pixels whose burn order is past p are gone, a thin dim ember edge runs along the front
  const w = src.width, h = src.height, c = tauntCanvas('burn', w, h), x = c.getContext('2d', {willReadFrequently:true}), v = tauntNoise(w, h), E = 0.07, q = p*(1+E);
  x.globalCompositeOperation = 'copy'; x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-over';
  let im; try{ im = x.getImageData(0, 0, w, h); }catch(err){ return src; } // a file:// copy taints the canvas: plain fade there
  const d = im.data;
  for(let i=0; i<v.length; i++){
    const a = d[i*4+3]; if(!a) continue;
    const m = q - v[i];
    if(m<=0){ d[i*4+3] = 0; continue; }
    if(m<E){ const e = 1 - m/E; d[i*4] += (190-d[i*4])*e; d[i*4+1] += (70-d[i*4+1])*e; d[i*4+2] += (25-d[i*4+2])*e; d[i*4+3] = a*(0.35+0.65*(1-e*0.6)); }
  }
  x.putImageData(im, 0, 0); return c;
}
// The sheet loaded for CHARS[id].tj.sprite.src (CHARS stays plain data) and the last frame drawn {f, x, side, t}: once the taunt is over
// or cancelled that frame burns away where it stood
const tauntSprite = {src:null, img:null, last:null};
function drawTauntSprite(g, sx, gy, now){
  const sp = charOf().tj && charOf().tj.sprite, S = tauntSprite;
  if(!sp || typeof Image==='undefined' || typeof document==='undefined') return;
  if(S.src!==sp.src){ S.src = sp.src; S.img = new Image(); S.img.src = ASSET_ROOT + sp.src; S.last = null; }
  if(!S.img.complete || !S.img.naturalWidth) return;               // still loading, or missing (then it never draws)
  const tf = anim.kind==='taunt' ? (now-anim.t0)/FRAME : -1;
  let f = Math.floor(tf)+1, p;                                     // p = how far it has come out of the dark: 0 gone, 1 fully there
  if(tf>=0 && f<=sp.n){ S.last = {f, x:sx - store.side*TAUNT_SPRITE_GAP, side:store.side, t:now}; p = Math.min(1, (tf+1)/TAUNT_SPRITE_IN); }
  else {
    if(!S.last) return;
    const out = (now-S.last.t)/FRAME/TAUNT_SPRITE_OUT; if(out>=1){ S.last = null; return; }
    f = S.last.f; p = 1-out;
  }
  const L = S.last, P = TAUNT_SPRITE_LINE+1, cw = sp.w+2*P, ch = sp.h+2*P, i = f-1;
  const cell = tauntCanvas('cell', cw, ch), cx = cell.getContext('2d');
  cx.clearRect(0, 0, cw, ch); cx.drawImage(S.img, (i%sp.cols)*sp.w, Math.floor(i/sp.cols)*sp.h, sp.w, sp.h, P, P, sp.w, sp.h);
  const sil = tauntSil(cell, TAUNT_SPRITE_LINE_C), lined = tauntCanvas('lined', cw, ch), lx = lined.getContext('2d');
  lx.clearRect(0, 0, cw, ch);
  for(let a=0; a<8; a++) lx.drawImage(sil, Math.round(Math.cos(a*Math.PI/4)*TAUNT_SPRITE_LINE), Math.round(Math.sin(a*Math.PI/4)*TAUNT_SPRITE_LINE));
  lx.drawImage(cell, 0, 0);
  const fxOn = store.fx && !reduced, e = p*p*(3-2*p);               // smoothstep
  let img = lined;
  if(p<1){
    // out of the dark: the colours lift from a near-black shape while it burns in (or the reverse when it leaves)
    lx.globalCompositeOperation = 'source-atop'; lx.globalAlpha = 0.85*(1-e); lx.fillStyle = '#0b0705'; lx.fillRect(0, 0, cw, ch);
    lx.globalAlpha = 1; lx.globalCompositeOperation = 'source-over';
    if(fxOn) img = tauntBurn(lined, p);
  }
  const s = TAUNT_SPRITE_H/sp.h;
  g.save(); g.translate(L.x, gy); g.scale(L.side, 1); // the recording faces right (side 1)
  g.globalAlpha = fxOn ? Math.min(1, 0.25+0.75*e) : e;
  g.drawImage(img, -sp.w*sp.footX*s - P*s, -TAUNT_SPRITE_H*sp.ground - P*s, cw*s, ch*s);
  g.restore();
}
const JU_TRAIL_MS = 220; // how long a point of the 최속 제트어퍼 arc stays
function frame(now){
  replayFrame(now); // 결정 39(replay): note the tick time (live) or play the due entries (replay window)
  tick(now); trialTick(now);
  if(now-historyPaintT>80){renderHistory(now);historyPaintT=now;}
  // walking (visual only): hold f/b while nothing else is animating. Blocked just in front of a live dummy; backing away lets the dummy respawn off-screen.
  const dt = Math.min(50, now-(anim.lastT||now)); anim.lastT = now;
  { const dm = world.dummy, dAhead = (world.dummyX - world.charX)*store.side;
    const canWalk = !anim.moveDur && (anim.kind==='idle'||anim.kind==='walk'||anim.kind==='taunt') && !giwonStiff(now) && !tjBusy() && (curDir==='f'||(curDir==='b' && now>=bdRec.until)); // backdash recovery: everything but going backwards. 기원권 경직·도발 중: 아무것도 못 한다 (도발 자세인데 tjBusy가 아니면 끝난 도발의 힘준 자세 — 걷기가 끊는다)
    const blocked = curDir==='f' && dm.alive && !dm.hit && dAhead<DUMMY_STOP;
    if(canWalk && !blocked){ world.charX += (curDir==='f'?WALK_F:-WALK_B)*store.side*dt/1000; anim.kind='walk'; anim.walkDir=curDir; }
    else if(anim.kind==='walk') anim.kind='idle'; }
  // movement
  if(anim.moveDur){ const k = Math.min(1,(now-anim.moveT0)/anim.moveDur); world.charX = anim.moveFrom + (anim.moveTo-anim.moveFrom)*(anim.moveEase ? anim.moveEase(k) : 1-Math.pow(1-k,3)); if(k>=1) anim.moveDur=0; if(k<1 && (anim.kind==='cd'||anim.kind==='dash'||anim.kind==='backdash') && Math.random()<0.6) ghosts.push({x:world.charX, t:1, pose:poseAt(now)}); }
  // dummy management
  const d = world.dummy;
  if(d.type && d.alive && !d.hit && (world.dummyX - world.charX)*store.side < DUMMY_STOP) world.charX = world.dummyX - DUMMY_STOP*store.side; // rush30: moves never pass the target
  // camera
  const camTarget = world.charX - (store.side>0 ? 0.43 : 0.62)*W;
  world.camX += (camTarget-world.camX)*0.12;
  updateDummy(now);

  const gy = touchOn ? H*0.46 : H*0.80;   // touch overlay covers the lower 46%; the mode hint sits on the floor strip between the feet and the overlay
  ctx.clearRect(0,0,W,H);
  ctx.save();
  if(shake>0.3){ ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake); shake*=0.82; } else shake=0;
  const zoom = zoomAt(now);
  if(zoom!==1){ ctx.translate(W/2, gy); ctx.scale(zoom, zoom); ctx.translate(-W/2, -gy); }
  drawDojo(ctx, gy, zoom);

  const sx = world.charX - world.camX;
  // dust
  for(let i=dust.length-1;i>=0;i--){ const p=dust[i]; p.x+=p.vx; p.y+=p.vy; p.vy*=0.92; p.t-=0.04; if(p.t<=0){dust.splice(i,1);continue;} ctx.fillStyle=`rgba(180,190,205,${p.t*0.35})`; ctx.beginPath(); ctx.arc(p.x-world.camX, gy+p.y-2, p.r*(1+(1-p.t)), 0, Math.PI*2); ctx.fill(); }
  // ghosts
  for(let i=ghosts.length-1;i>=0;i--){ const g=ghosts[i]; g.t-=0.07; if(g.t<=0){ghosts.splice(i,1);continue;} drawFighter(ctx, g.x-world.camX, gy, g.pose, store.side, g.t*0.22, dojoPalette.ghost); }
  // dummy
  if(d.alive) drawDummy(ctx, world.dummyX-world.camX, gy, d);
  { const B = stiffAnchor(); if(B) drawStiffGauge(ctx, B.ax-world.camX, gy + STIFF_BAR.below, now); }
  // shadow
  const pose = poseAt(now);
  ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(sx, gy+2, 26-(pose.jump||0)*0.2, 5, 0, 0, Math.PI*2); ctx.fill();
  // fighter
  const fist = drawFighter(ctx, sx, gy, pose, store.side, 1, null);
  drawTauntSprite(ctx, sx, gy, now);
  // 최속 제트어퍼 (fx.tjMove fast): the uppercut leaves a hot arc behind the fist for ~0.2 s. Visual only
  if(anim.kind==='ju' && anim.fast && store.fx && !reduced){
    const f = (now-anim.t0)/FRAME+1;
    if(f>=TJ.JU_F-4 && f<=TJ.JU_F+5) juTrail.push({x:fist[0]+world.camX, y:fist[1]-gy, t:now});
  }
  while(juTrail.length && now-juTrail[0].t>JU_TRAIL_MS) juTrail.shift();
  if(juTrail.length>1){
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
    for(const [w, c] of [[16, '255,150,50'], [6, '255,244,220']]) for(let i=1;i<juTrail.length;i++){
      const a = juTrail[i-1], b = juTrail[i], k = 1-(now-b.t)/JU_TRAIL_MS, taper = i/(juTrail.length-1);
      ctx.strokeStyle = 'rgba('+c+','+(0.8*k).toFixed(3)+')'; ctx.lineWidth = w*(0.35+0.65*taper)*k;
      ctx.beginPath(); ctx.moveTo(a.x-world.camX, gy+a.y); ctx.lineTo(b.x-world.camX, gy+b.y); ctx.stroke();
    }
    ctx.restore();
  }
  // 도발 연출 (결정 37(tju), 실측 영상): 77f(도발의 마지막 프레임)에 몸이 주황빛으로 달아올라 몇 프레임 뒤 김으로 바뀐다 · 무릎 뒤 캔슬하면 머리에 불꽃. 판정과 무관
  if(store.fx && !reduced && fist.head){
    const [hx, hy] = fist.head, tf = anim.kind==='taunt' ? (now-anim.t0)/FRAME+1 : 0;
    if(tf>=TJ.END_F){ const k = clamp(1-(tf-TJ.END_F-3)/6, 0, 1)*(0.8+Math.random()*0.2), gl = ctx.createRadialGradient(hx, hy+34, 4, hx, hy+34, 60);
      gl.addColorStop(0, 'rgba(255,140,60,'+(0.55*k).toFixed(3)+')'); gl.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(hx, hy+34, 60, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
    if(now<tjFlameUntil){ const k = clamp((tjFlameUntil-now)/TJ_FLAME_MS, 0, 1);
      ctx.save(); ctx.globalCompositeOperation='lighter';
      for(let i=0;i<5;i++){ const fx_ = hx+(Math.random()-0.5)*16, fy_ = hy-6-Math.random()*20, r = 6+Math.random()*9*k, gl = ctx.createRadialGradient(fx_, fy_, 1, fx_, fy_, r);
        gl.addColorStop(0, 'rgba(255,226,140,'+(0.75*k).toFixed(3)+')'); gl.addColorStop(0.5, 'rgba(255,120,40,'+(0.45*k).toFixed(3)+')'); gl.addColorStop(1, 'rgba(220,40,20,0)');
        ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(fx_, fy_, r, 0, Math.PI*2); ctx.fill(); }
      ctx.restore(); }
    if(now<tjSteamUntil && Math.random()<0.6) dust.push({x:world.charX+(Math.random()-0.5)*34, y:hy-gy+30+Math.random()*24, vx:(Math.random()-0.5)*0.5, vy:-1-Math.random()*0.9, r:4+Math.random()*4, t:1});
  }
  // electricity: the EWGF fist, or the kicking foot of a 초스카이 (결정 33(jfsr))
  if(anim.kind==='sky' && anim.electric && fist.foot && now-anim.t0>70 && now-anim.t0<420){
    const [x,y] = fist.foot;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for(let i=0;i<6;i++) drawBolt(ctx, x, y, 30+Math.random()*36, Math.random()*Math.PI*2, 2.2, 'rgba(143,220,255,.9)');
    for(let i=0;i<3;i++) drawBolt(ctx, x, y, 18+Math.random()*22, Math.random()*Math.PI*2, 1, '#ffffff');
    const gl = ctx.createRadialGradient(x,y,2,x,y,40); gl.addColorStop(0,'rgba(76,201,255,.6)'); gl.addColorStop(1,'rgba(76,201,255,0)'); ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(x,y,40,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  if(anim.kind==='ewgf' && anim.electric){
    const t = now-anim.t0;
    if(t>60 && t<420){
      // Returned in the caller canvas coordinates, including facing/pose but excluding its scale and shake.
      const fx_ = fist[0], fy_ = fist[1];
      ctx.save(); ctx.globalCompositeOperation='lighter';
      for(let i=0;i<7;i++){ drawBolt(ctx, fx_, fy_, 34+Math.random()*40, Math.random()*Math.PI*2, 2.2, 'rgba(143,220,255,.9)'); }
      for(let i=0;i<4;i++){ drawBolt(ctx, fx_, fy_, 20+Math.random()*24, Math.random()*Math.PI*2, 1, '#ffffff'); }
      const gl = ctx.createRadialGradient(fx_,fy_,2,fx_,fy_,46); gl.addColorStop(0,'rgba(76,201,255,.65)'); gl.addColorStop(1,'rgba(76,201,255,0)'); ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(fx_,fy_,46,0,Math.PI*2); ctx.fill();
      ctx.restore();
      // body aura
      ctx.save(); ctx.globalCompositeOperation='lighter'; for(let i=0;i<3;i++) drawBolt(ctx, sx+(Math.random()-0.5)*30, gy-40-Math.random()*40, 30, Math.random()*Math.PI*2, 1.2, 'rgba(76,201,255,.5)'); ctx.restore();
    }
  }
  // Small contact burst, anchored where the hit landed; time based, independent of render rate.
  for(let i=impacts.length-1;i>=0;i--){
    const p=impacts[i], u=(now-p.t0)/180;
    if(u>=1||!store.fx||reduced){impacts.splice(i,1);continue;}
    if(u<0) continue;   // 아직 시작 전인 고리(기원초 성공의 2차 고리). 반지름이 음수가 되면 arc가 던져 프레임 루프가 멈춘다
    const radius=9+u*25;
    ctx.save();ctx.translate(p.x-world.camX,gy+p.y);ctx.globalAlpha=1-u;
    ctx.strokeStyle=p.color;ctx.lineWidth=3*(1-u)+1;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=cssVar('--ink');ctx.beginPath();
    for(let ray=0;ray<8;ray++){const a=ray*Math.PI/4;ctx.moveTo(Math.cos(a)*radius*.6,Math.sin(a)*radius*.6);ctx.lineTo(Math.cos(a)*(radius+9),Math.sin(a)*(radius+9));}
    ctx.stroke();ctx.restore();
  }
  // sparks
  for(let i=sparks.length-1;i>=0;i--){ const p=sparks[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.35; p.t-=0.035; if(p.t<=0){sparks.splice(i,1);continue;} ctx.fillStyle=p.c; ctx.globalAlpha=p.t; ctx.fillRect(p.x-world.camX-2, gy+p.y-2, 4, 4); ctx.globalAlpha=1; }
  // text pops
  for(let i=pops.length-1;i>=0;i--){ const p=pops[i]; const t=(now-p.t0)/(p.life||900); if(t>=1){pops.splice(i,1);continue;}
    const punch = p.lvl && !reduced, eob = k => { k-=1; return 1 + 2.70158*k*k*k + 1.70158*k*k; }; // easeOutBack: overshoot to ~1.3 then settle at 1.2
    const sc = punch ? (t<0.18 ? 0.3+0.9*eob(t/0.18) : 1.2-(t-0.18)*0.2) : (t<0.15? 0.6+t/0.15*0.6 : 1.2-(t-0.15)*0.25);
    const color = p.color.startsWith('var')? '#4CC9FF' : p.color;
    ctx.save(); ctx.translate(p.x-world.camX, gy+(p.y==null?-118:p.y)-t*30); ctx.scale(sc,sc); ctx.globalAlpha = t>0.7? (1-t)/0.3:1;
    for(let r=0;r<(p.rings||0);r++){ const rt = clamp((t-r*0.07)/0.55,0,1); if(rt>0&&rt<1){ ctx.save(); ctx.globalAlpha*=(1-rt)*0.7; ctx.lineWidth=1+4*(1-rt); ctx.strokeStyle=color; ctx.beginPath(); ctx.arc(0,-p.size*0.35, 12+rt*(90+25*r), 0, Math.PI*2); ctx.stroke(); ctx.restore(); } }
    ctx.font=`${p.size}px ${displayFont()}`; ctx.textAlign='center'; ctx.lineWidth=6; ctx.strokeStyle='#04101a';
    if(p.glow){ ctx.shadowColor=color; ctx.shadowBlur=p.glow*(1-t*0.5); }
    ctx.strokeText(p.text,0,0); ctx.shadowBlur=0; ctx.fillStyle=color; ctx.fillText(p.text,0,0);
    if(p.core){ ctx.globalAlpha*=0.55; ctx.fillStyle=p.core; ctx.font=`${p.size*0.92}px ${displayFont()}`; ctx.fillText(p.text,0,0); }
    ctx.restore(); }
  ctx.restore();
  if(flash>0.02){ ctx.fillStyle = flashGold ? `rgba(255,222,120,${flash*0.55})` : `rgba(180,235,255,${flash*0.55})`; ctx.fillRect(0,0,W,H); flash*=0.85; } else { flash=0; flashGold=false; }
  requestAnimationFrame(frame);
}
