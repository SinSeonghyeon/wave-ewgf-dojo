// Stage rendering math: 3D dojo camera, wall decorations, fighter transforms.
// Harness: tests/helpers/app.cjs (boot() runs the assembled app from src/).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {html, boot} = require('./helpers/app.cjs');
test('3D dojo camera projects the ground lane onto the 2D fighter coordinates at every viewport and camera offset',()=>{
  const a=boot();
  for(const [w,h,ratio] of [[1200,330,.8],[820,350,.8],[406,508,.46],[330,380,.46]]){
    const ground=h*ratio;
    for(const cameraX of [-1500,0,340,9000]){
      const camera=a.roomCamera(w,h,ground,cameraX);
      for(const screenX of [0,w*.43,w*.62,w]){
        const p=a.roomProject([(screenX+cameraX)/a.ROOM.unit,0,0],camera,w,h);
        assert.ok(Math.abs(p[0]-screenX)<1e-8);assert.ok(Math.abs(p[1]-ground)<1e-8);assert.ok(p[2]>0);
      }
      const wallFoot=a.roomProject([cameraX/a.ROOM.unit,0,a.ROOM.back],camera,w,h);
      assert.ok(wallFoot[1]<ground,'rear wall meets the floor behind the fighter lane');
    }
  }
});
test('3D wall decorations stay at the same world coordinates across camera recycling in both directions',()=>{
  const a=boot(),mesh=a.roomMesh();
  const visible=(cam,center)=>{
    const points=new Set();
    for(let i=0;i<mesh.length;i+=9){
      const x=mesh[i]+a.roomShift(cam);
      if(x>center-10 && x<center+10 && mesh[i+1]<2.4 && mesh[i+2]>-2.98)
        points.add([x,mesh[i+1],mesh[i+2],mesh[i+8]].map(n=>n.toFixed(4)).join(','));
    }
    return [...points].sort();
  };
  for(let bay=-12;bay<=12;bay++){
    const x=bay*a.ROOM.bay;
    assert.deepEqual(visible(x-.001,x),visible(x+.001,x),`wall landmarks must not jump at bay ${bay}`);
  }
});
test('electric fist coordinates undo only the caller transform, including DPR, scaling and shake',()=>{
  const a=boot();
  for(const scale of [.9,1,1.15,2.3,2.4])for(const side of [-1,1]){
    const base={a:scale,b:0,c:0,d:scale,e:7,f:-4};
    const local={a:side*.8,b:side*.6,c:-.6,d:.8,e:320,f:180};
    const m={a:scale*local.a,b:scale*local.b,c:scale*local.c,d:scale*local.d,e:scale*local.e+base.e,f:scale*local.f+base.f};
    const point=a.fighterPoint(base,m,6,-25);
    assert.ok(Math.abs(point[0]-(local.a*6+local.c*-25+320))<1e-9);
    assert.ok(Math.abs(point[1]-(local.b*6+local.d*-25+180))<1e-9);
  }
  assert.doesNotMatch(html,/id="dReset"/,'session reset is no longer a public control');
});
