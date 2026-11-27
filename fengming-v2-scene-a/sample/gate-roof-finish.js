/** H35 open-approach single Chinese gatehouse, original project-authored geometry.
 * Call ONLY after the source gate has its final world transform AND styleGate,
 * before prepareRoof / createRoofOcclusion. Existing source GLB is never edited.
 *
 * const finish = finishGateRoof(gate); // default PBR candidate
 * const light = finishGateRoof(gate,{shading:'light'}); // Lambert roof/timber/old bronze, shared painted stone
 * Switching mode restores the old candidate first; geometry/nav inputs are shared.
 * gate remains the same object. All original triangles touching world Y<=1.2
 * remain byte-for-byte in original local geometry attributes and index order;
 * new upper pieces are parented under gate in inverse-transformed world units.
 * finish.restore() returns the untouched source geometry and removes candidate.
 *
 * One modest east-facing tiled gatehouse replaces the three obstructing roofs.
 * Convex barrel tile strips, scalloped tile caps, curved fascia, shaped corbels,
 * octagonal columns and restrained old-gold ridge ends are REAL geometry.
 * This is a candidate for NORMAL CAMERA review, not an art approval claim.
 */
import * as T from 'three';
import {GATE_STEP_HEIGHTS,STEP_SOURCE_SHA256} from '../assets/gate-035/steps-data.js';
import {BOUNDARY_MARKERS} from '../assets/gate-035/boundary-data.js';
import {FOUNDATION_ROCK} from '../assets/gate-035/foundation-data.js';
const PLAQUE_URL=new URL('../assets/gate-035/plaque-atlas.png',import.meta.url).href;

const clamp=T.MathUtils.clamp;
const blend=T.MathUtils.lerp;
const V=(x,y,z)=>new T.Vector3(x,y,z);
const installed=new WeakMap();
// Close-value, cool grey clay. The roof reads as one hand-finished mass at the
// original phone camera; patina never selects conspicuous pale random tiles.
const colors={tile:0x2a3c44,tileLight:0x2f424a,tileDark:0x1e3038,ink:0x182c33,wood:0x382f29,woodLit:0x493d31,woodDark:0x232726,soffit:0x192728,stoneFoot:0x2d3b3d,gold:0x86764b,goldEdge:0xa18d60};

export function finishGateRoof(gate,{protectY=1.2,shading='pbr',stoneTexture=null}={}){
 const materialMode=shading==='light'?'light':'pbr';
 const previous=installed.get(gate);
 if(previous){if(previous.stats.shading===materialMode&&previous.stats.protectY===protectY)return previous;previous.restore();}
 gate.updateMatrixWorld(true);
 const original=[],cutStats={sourceTriangles:0,retainedTriangles:0,removedTriangles:0};
 const scratch=new T.Vector3();
 gate.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry?.attributes.position)return;
  const source=mesh.geometry,p=source.attributes.position,I=source.index,n=I?I.count:p.count,kept=[];
  for(let i=0;i<n;i+=3){
   const ids=[I?I.getX(i):i,I?I.getX(i+1):i+1,I?I.getX(i+2):i+2];
   let lo=Infinity;
   for(const j of ids)lo=Math.min(lo,scratch.fromBufferAttribute(p,j).applyMatrix4(mesh.matrixWorld).y);
   cutStats.sourceTriangles++;
   if(lo<=protectY+1e-7){kept.push(...ids);cutStats.retainedTriangles++;}else cutStats.removedTriangles++;
  }
  const lower=source.clone();lower.setIndex(kept);lower.clearGroups();lower.addGroup(0,kept.length,0);lower.computeBoundingBox();lower.computeBoundingSphere();
  original.push({mesh,geometry:source,replacement:lower,visible:mesh.visible});mesh.geometry=lower;mesh.visible=false;
 });
 const group=new T.Group();group.name='H35 single east-facing open gatehouse';
 const inv=gate.matrixWorld.clone().invert();
 const litOptions={color:0xffffff,vertexColors:true,fog:false};
 let plaqueTexture=null;
 // The light path is still directional + hemisphere-lit: Lambert computes
 // diffuse lighting per vertex, rather than dropping the roof to a color plate.
 // Geometry, normals, broad patina and ink/under-eave vertex colors are shared.
 const mats=[
  materialMode==='light'?new T.MeshLambertMaterial(litOptions):new T.MeshStandardMaterial({...litOptions,roughness:.99,metalness:0}),
  materialMode==='light'?new T.MeshLambertMaterial(litOptions):new T.MeshStandardMaterial({...litOptions,roughness:.98,metalness:0}),
  materialMode==='light'?new T.MeshLambertMaterial({...litOptions,map:plaqueTexture,alphaTest:.28}):new T.MeshStandardMaterial({...litOptions,map:plaqueTexture,alphaTest:.28,roughness:.88,metalness:.10}),
  new T.MeshBasicMaterial({...litOptions,map:stoneTexture}),
 ];
 if(shading==='light'){mats[0].color.setRGB(3.2,3.2,3.2);mats[1].color.setRGB(2.,2.,2.);mats[2].color.setRGB(1.7,1.7,1.7);}
 mats.forEach((m,i)=>{m.name=['H35 matte cool-grey barrel tiles','H35 deep eaves and grounded timber','H35 old bronze and inset name glyphs','H35 painted stone matched to terrain'][i];m.side=T.DoubleSide;});
 const arrays=mats.map(()=>({p:[],n:[],c:[],uv:[],idx:[]}));
 let dressedFloorSlabs=0,dressedRimBlocks=0,dressedStepCheeks=0;
 function add(geometry,material,color,shade=1){
  const a=arrays[material],p=geometry.attributes.position,n=geometry.attributes.normal,off=a.p.length/3,col=new T.Color(color),N=new T.Vector3(),P=new T.Vector3();
  const normalMat=new T.Matrix3().getNormalMatrix(inv);
  const uv=geometry.attributes.uv,sun=V(-8,16,12).normalize();
  let stoneBounds=null,stoneRect=null,stoneSize=null;
  if(material===3){
   geometry.computeBoundingBox();stoneBounds=geometry.boundingBox;stoneSize=stoneBounds.getSize(new T.Vector3());
   const centre=stoneBounds.getCenter(new T.Vector3()),seed=geometry.userData.stoneSeed??Math.floor(Math.abs(centre.x*17+centre.z*11+centre.y*7));
   const rects=[[.037,.203,.808,.938],[.276,.459,.808,.932],[.141,.330,.538,.696],[.028,.208,.301,.442]];stoneRect=geometry.userData.rockSurface?[.515,.985,.02,.98]:rects[Math.abs(seed)%rects.length];
  }
  for(let i=0;i<p.count;i++){
   P.fromBufferAttribute(p,i);const world=P.clone(),worldNormal=N.fromBufferAttribute(n,i).clone();P.applyMatrix4(inv);N.applyMatrix3(normalMat).normalize();
   const weather=material===0?(.99+.028*Math.sin(world.x*.83+world.z*.53)+.012*Math.cos(world.z*1.21+world.x*.3)):1;
   let grain=shade*weather*(material===1?(.99+.012*Math.sin(world.x*.9+world.z*.7+world.y*2.6)):1);
   if(material===1&&world.y>2.60&&world.y<3.15){if(worldNormal.y<-.45)grain*=.72;for(const x of [-1.75,-.05])for(const z of [-8.85,-6.15])if(Math.hypot(world.x-x,world.z-z)<.24)grain*=.87;}
   let cr=col.r*grain,cg=col.g*grain,cb=col.b*grain,U=.03,Vv=.03;
   if(material===3){
    // Same fixed sun/temperature as the terrain. On static architecture this
    // is baked into vertex color; the actual surfaces retain their 3D normals.
    const lit=Math.max(0,worldNormal.dot(sun));
    let ao=1;
    if(worldNormal.y>.65&&world.y>.65&&world.y<.78){
     // Roof shadow is cast away from the real (-8,16,12) sun, never a halo.
     const cfg=roofs[0];let t=(3.35-world.y)/sun.y,qx=world.x+sun.x*t,qz=world.z+sun.z*t;
     for(let k=0;k<2;k++){t=(surface(cfg,qx,qz)-world.y)/sun.y;qx=world.x+sun.x*t;qz=world.z+sun.z*t;}
     const edge=Math.min(cfg.hx-Math.abs(qx-cfg.x),cfg.hz-Math.abs(qz-cfg.z));ao=1-.25*clamp(edge/.20,0,1);
    }
    for(const x of [-1.75,-.05])for(const z of [-8.85,-6.15])if(world.y>.69&&world.y<.88&&worldNormal.y>.45){const r=Math.hypot(world.x-x,world.z-z);ao*=.73+.27*clamp((r-.10)/.22,0,1);}
    cr*=blend(.36,1.15,lit)*ao;cg*=blend(.46,1.14,lit)*ao;cb*=blend(.57,1.08,lit)*ao;
    if(geometry.userData.rockSurface){const moss=.12*(1-clamp((world.y-.16)/.48,0,1));cr*=1-moss*.28;cb*=1-moss*.30;}
    const size=stoneSize,nx=clamp((world.x-stoneBounds.min.x)/Math.max(.000001,size.x),0,1),ny=clamp((world.y-stoneBounds.min.y)/Math.max(.000001,size.y),0,1),nz=clamp((world.z-stoneBounds.min.z)/Math.max(.000001,size.z),0,1);
    const pu=Math.abs(worldNormal.x)>.65?nz:nx,pv=Math.abs(worldNormal.y)>.65?nz:ny;
    if(geometry.userData.rockSurface){U=.5+.5*(.02+(world.x+2.39)/4.8);Vv=.46+(world.z+5.27)/4.8;}
    else{U=blend(stoneRect[0],stoneRect[1],.03+.94*pu);Vv=blend(stoneRect[2],stoneRect[3],.03+.94*pv);}
   }else if(material===2&&geometry.userData.plaque){U=uv.getX(i);Vv=uv.getY(i);}
   a.p.push(P.x,P.y,P.z);a.n.push(N.x,N.y,N.z);a.c.push(cr,cg,cb);a.uv.push(U,Vv);
  }
  const I=geometry.index;if(I)for(let i=0;i<I.count;i++)a.idx.push(off+I.getX(i));else for(let i=0;i<p.count;i++)a.idx.push(off+i);
  geometry.dispose();
 }
 function meshData(pos,idx,material,color,shade=1){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();add(g,material,color,shade);}
 function cube(w,h,d,x,y,z,mat,color){const g=new T.BoxGeometry(w,h,d,1,1,1);g.translate(x,y,z);add(g,mat,color);}
 function cylinder(r0,r1,height,x,y,z,mat,color,sides=10){const g=new T.CylinderGeometry(r1,r0,height,sides,1);g.translate(x,y,z);add(g,mat,color);}
 // Hand-dressed block: a genuinely inset bevel shoulder, full-depth sides
 // and a broad quiet top. It is not a coplanar textured rectangle. The bottom
 // is hidden inside the mortar/plinth, so it does not spend triangles there.
 function dressedStone(w,h,d,x,top,z,{bevel=.023,corner=.045,seed=0,simple=false,color=0xffffff}={}){
  const b=Math.min(bevel,h*.30,w*.12,d*.12),cut=Math.min(corner,w*.16,d*.16),outline=simple?[[-1,-1],[1,-1],[1,1],[-1,1]]:[[-1,-1+cut/d*2],[-1+cut/w*2,-1],[1-cut/w*2,-1],[1,-1+cut/d*2],[1,1-cut/d*2],[1-cut/w*2,1],[-1+cut/w*2,1],[-1,1-cut/d*2]];
  const pos=[],idx=[],N=outline.length,ring=(inset,y)=>{for(const [u,v]of outline)pos.push(x+u*(w*.5-inset),y,z+v*(d*.5-inset));};
  ring(b,top);ring(0,top-b);ring(.004,top-h);pos.push(x,top,z);const centre=pos.length/3-1;
  for(let i=0;i<N;i++){const j=(i+1)%N;idx.push(centre,j,i);for(let k=0;k<2;k++){const a=k*N+i,c=k*N+j;idx.push(a,c,a+N,c,c+N,a+N);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();g.userData.dressedStone=true;g.userData.stoneSeed=seed;add(g,3,color,.97+.025*Math.sin(seed*1.77));
 }
 function tube(points,radii,mat,color,segments=16,sides=7){
  const path=new T.CatmullRomCurve3(points.map(p=>V(...p))),frames=path.computeFrenetFrames(segments,false),p=[],idx=[];
  for(let i=0;i<=segments;i++){
   const t=i/segments,P=path.getPoint(t),q=t*(radii.length-1),j=Math.min(radii.length-2,Math.floor(q)),r=blend(radii[j],radii[j+1],q-j);
   for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2,Q=P.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);p.push(Q.x,Q.y,Q.z);}
  }
  for(let i=0;i<segments;i++)for(let k=0;k<sides;k++){const a=i*(sides+1)+k,b=a+sides+1;idx.push(a,b,a+1,b,b+1,a+1);}
  meshData(p,idx,mat,color);
 }
 function fascia(path,width,height,mat,color,segments=24){
  // Closed rectangular band, curved along the original eave direction.
  const curve=new T.CatmullRomCurve3(path.map(p=>V(...p))),p=[],idx=[];
  for(let i=0;i<=segments;i++){
   const t=i/segments,P=curve.getPoint(t),tangent=curve.getTangent(t),side=V(-tangent.z,0,tangent.x).normalize();
   for(const [sw,sh] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const Q=P.clone().addScaledVector(side,sw*width*.5);Q.y+=sh*height*.5;p.push(Q.x,Q.y,Q.z);}
  }
  for(let i=0;i<segments;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4;idx.push(a,a+4,b,b,a+4,b+4);}
  idx.push(0,1,2,0,2,3);const a=segments*4;idx.push(a,a+2,a+1,a,a+3,a+2);meshData(p,idx,mat,color);
 }
 const roofs=[
  {name:'single east-facing Chinese gatehouse',x:-.81,z:-7.60,hx:1.24,hz:2.00,eave:3.05,rise:1.10,hip:.42,rows:24},
 ];
 function surface(cfg,x,z){
  const u=Math.min(1,Math.abs(x-cfg.x)/cfg.hx),v=Math.min(1,Math.abs(z-cfg.z)/cfg.hz);
  const t=clamp((1-v)/cfg.hip,0,1),hip=t*t*(3-2*t);
  return cfg.eave+cfg.rise*Math.pow(1-u,2.05)*hip+.24*Math.pow(u,6)+.14*Math.pow(v,8);
 }
 let tileStrips=0;
 for(const [ri,cfg] of roofs.entries()){
  // Continuous substrate and dark underside carry honest thickness.
  const nx=12,nz=cfg.rows,p=[],topIdx=[],underIdx=[];
  for(let side=0;side<2;side++)for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
   const x=cfg.x-cfg.hx+2*cfg.hx*i/nx,z=cfg.z-cfg.hz+2*cfg.hz*j/nz,y=surface(cfg,x,z)-(side?.20:0);p.push(x,y,z);
  }
  const layer=(nx+1)*(nz+1);
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
   let a=j*(nx+1)+i,b=a+nx+1;topIdx.push(a,b,a+1,a+1,b,b+1);a+=layer;b+=layer;underIdx.push(a,a+1,b,a+1,b+1,b);
  }
  for(let j=0;j<nz;j++)for(const i of [0,nx]){const a=j*(nx+1)+i,b=a+nx+1;underIdx.push(a,a+layer,b,b,a+layer,b+layer);}
  for(let i=0;i<nx;i++)for(const j of [0,nz]){const a=j*(nx+1)+i,b=a+1;underIdx.push(a,b,a+layer,b,b+layer,a+layer);}
  meshData(p,topIdx,0,colors.tileDark);
  // A closed, genuinely deep soffit has its own ink-stained timber colors.
  // It shares the existing timber batch: no shadow map or extra draw call.
  meshData(p,underIdx,1,colors.soffit,.88);
  // Individual convex barrel strips follow the whole curved surface. They are
  // not texture stripes or simple triangular plates; the scalloped end is solid.
  for(let row=0;row<cfg.rows;row++){
   const zc=cfg.z-cfg.hz+.08+(2*cfg.hz-.16)*(row+.5)/cfg.rows,spacing=(2*cfg.hz-.16)/cfg.rows,half=Math.min(.073,spacing*.46);
   for(const sign of [-1,1]){
    // Short overlapping convex clay tiles with raised lips replace the old
    // uninterrupted long ribs. Each row now has real shingle breaks, rather
    // than reading as a clean parallel venetian blind in the phone view.
    const tileCount=6,cross=4;
    for(let tile=0;tile<tileCount;tile++){
     const pos=[],ind=[],u0=.018+(.982/tileCount)*tile,u1=Math.min(1,u0+(.982/tileCount)*1.08);
     for(let i=0;i<2;i++){
      const t=i,u=blend(u0,u1,t),x=cfg.x+sign*cfg.hx*u;
      for(let k=0;k<=cross;k++){
       const a=k/cross*Math.PI,z=zc-Math.cos(a)*half;
       const lip=.017+.019*Math.pow(t,3),y=surface(cfg,x,z)+lip+Math.sin(a)*half*.69;
       pos.push(x,y,z);
      }
     }
     for(let i=0;i<1;i++)for(let k=0;k<cross;k++){const a=i*(cross+1)+k,b=a+cross+1;if(sign>0)ind.push(a,a+1,b,a+1,b+1,b);else ind.push(a,b,a+1,a+1,b,b+1);}
     // A narrow dark clay return at the exposed tile lip has actual thickness.
     const base=pos.length/3;for(let k=0;k<=cross;k++){const a=k/cross*Math.PI,z=zc-Math.cos(a)*half,x=cfg.x+sign*cfg.hx*u1,y=surface(cfg,x,z)+.011+Math.sin(a)*half*.69;pos.push(x,y,z);}
     for(let k=0;k<cross;k++){const a=(cross+1)+k,b=base+k;if(sign>0)ind.push(a,b,a+1,a+1,b,b+1);else ind.push(a,a+1,b,a+1,b+1,b);}
     const tone=.99+.018*Math.sin(row*.24+tile*.31+ri*.7);meshData(pos,ind,0,colors.tile,tone);
    }
    tileStrips++;
    const cx=cfg.x+sign*(cfg.hx+.012),cy=surface(cfg,cfg.x+sign*cfg.hx,zc)+.027,r=half*.82,cap=[cx+sign*.018,cy,zc],ci=[];
    for(let j=0;j<=8;j++){const a=j/8*Math.PI*2;cap.push(cx,cy+Math.cos(a)*r,zc+Math.sin(a)*r);if(j<8)ci.push(0,j+1,j+2);}
    meshData(cap,ci,0,colors.tile,.94);
   }
  }
  // Swept fascia around the perimeter; four corners curl up as the source does.
  for(const sign of [-1,1]){
   const path=[];
   for(let j=0;j<=12;j++){const z=cfg.z-cfg.hz+2*cfg.hz*j/12;path.push([cfg.x+sign*(cfg.hx+.01),surface(cfg,cfg.x+sign*cfg.hx,z)-.10,z]);}
   fascia(path,.12,.21,1,colors.ink,16);
   // A narrow curved clay drip edge makes top/lip/soffit distinguishable even
   // when individual tile lips collapse to a single pixel on a phone.
   fascia(path.map(([x,y,z])=>[x,y+.083,z]),.13,.035,0,colors.tileDark,16);
  }
  for(const sign of [-1,1]){
   const path=[];for(let j=0;j<=16;j++){const x=cfg.x-cfg.hx+2*cfg.hx*j/16,z=cfg.z+sign*cfg.hz;path.push([x,surface(cfg,x,z)-.10,z]);}
   fascia(path,.085,.21,1,colors.ink,20);
   fascia(path.map(([x,y,z])=>[x,y+.083,z]),.095,.035,0,colors.tileDark,20);
  }
  // Raised continuous ridge with small aged-bronze hooked ends; no gold balls.
  const ridgeHalf=cfg.hz*(1-cfg.hip*.68),ridgeY=cfg.eave+cfg.rise+.075;
  tube([[cfg.x,ridgeY+.08,cfg.z-ridgeHalf],[cfg.x,ridgeY,cfg.z],[cfg.x,ridgeY+.08,cfg.z+ridgeHalf]],[.078,.085,.078],1,colors.ink,16,7);
  for(const sign of [-1,1]){
   const z=cfg.z+sign*ridgeHalf;
   tube([[cfg.x,ridgeY+.05,z-sign*.10],[cfg.x,ridgeY+.12,z+sign*.04],[cfg.x,ridgeY+.25,z+sign*.12],[cfg.x,ridgeY+.32,z+sign*.10]],[.055,.050,.029,.008],2,colors.gold,10,6);
  }
  // Fine ink ridge framing gives the stepped gable an unbroken readable edge.
  for(const sign of [-1,1]){
   const z=cfg.z+sign*(cfg.hz-.025),path=[];
   for(let i=0;i<=16;i++){const x=cfg.x-cfg.hx+2*cfg.hx*i/16;path.push([x,surface(cfg,x,z)+.04,z]);}
   tube(path,Array(path.length).fill(.034),1,colors.ink,16,5);
  }
 }
 // Four full-height timber columns stand on the original left stone platform.
 // This upper redesign leaves the original right stair / fight frontage open.
 // No new upper vertex reaches X>.63; the hero and enemy act at X>=1.35.
 const columnFeet=[];
 for(const x of [-1.75,-.05])for(const z of [-8.85,-6.15]){
  const footY=.7145,postY=footY+.13,postTop=2.82;
  dressedStone(.42,.15,.42,x,footY+.14,z,{bevel:.023,corner:.075,seed:100+columnFeet.length});
  cylinder(.173,.151,.08,x,footY+.17,z,1,colors.woodDark,12);
  cylinder(.148,.13,postTop-postY,x,(postTop+postY)*.5,z,1,colors.wood,12);
  cylinder(.153,.15,.19,x,footY+.28,z,1,colors.woodDark,12);
  cylinder(.17,.17,.095,x,2.79,z,1,colors.woodDark,12);
  columnFeet.push({x,z,stoneContactY:footY,postBottomY:postY});
 }
 // Two clean front/back beams span the open doorway; shaped timber corbels
 // cradle them from below. No blank wall, foreground hall or giant second tier.
 for(const x of [-1.75,-.05]){
  cube(.245,.225,3.25,x,2.88,-7.5,1,colors.woodDark);
  cube(.265,.065,3.38,x,3.025,-7.5,1,colors.woodLit);
  for(const z of [-8.85,-6.15]){
   const sign=z< -7.5?1:-1;
   const sh=new T.Shape();sh.moveTo(0,0);sh.lineTo(.56,0);sh.lineTo(.56,-.10);sh.bezierCurveTo(.38,-.11,.29,-.23,.22,-.34);sh.lineTo(.07,-.34);sh.bezierCurveTo(.12,-.18,.11,-.10,0,-.09);sh.closePath();
   const g=new T.ExtrudeGeometry(sh,{depth:.17,bevelEnabled:true,bevelSegments:1,bevelSize:.012,bevelThickness:.012,curveSegments:8});g.scale(sign,1,1);g.rotateY(-Math.PI/2);g.translate(x+.085,2.84,z);add(g,1,colors.wood);
   cube(.37,.08,.37,x,3.02,z,1,colors.woodDark);
  }
 }
 for(const z of [-8.85,-6.15])cube(1.97,z===-6.15?.25:.15,.20,-.90,z===-6.15?2.84:2.81,z,1,colors.woodDark);
 // The normal camera sees the SOUTH face, so that face has a real entrance
 // lintel and inward-curving jamb brackets, rather than reading as a pavilion.
 cube(2.10,.065,.23,-.90,3.00,-6.15,1,colors.woodLit);
 for(const [x,sign]of [[-1.75,1],[-.05,-1]]){
  const sh=new T.Shape();sh.moveTo(0,0);sh.lineTo(.48,0);sh.lineTo(.48,-.075);sh.bezierCurveTo(.30,-.09,.25,-.23,.20,-.32);sh.lineTo(.06,-.32);sh.bezierCurveTo(.11,-.18,.10,-.09,0,-.075);sh.closePath();
  const g=new T.ExtrudeGeometry(sh,{depth:.15,bevelEnabled:true,bevelSegments:1,bevelSize:.012,bevelThickness:.012,curveSegments:7});g.scale(sign,1,1);g.translate(x,2.80,-6.21);add(g,1,colors.wood);
 }
 // Short revealed rafters beneath eaves are coherent parallel timber, not
 // warped texture islands. Their depth shadows are carried by real geometry.
 for(const cfg of roofs)for(const sign of [-1,1])for(let i=0;i<cfg.rows;i+=2){
  const z=cfg.z-cfg.hz+.13+(2*cfg.hz-.26)*(i+.5)/cfg.rows;
  const x=cfg.x+sign*(cfg.hx-.16),y=surface(cfg,x,z)-.245;
  cube(.47,.105,.083,x,y,z,1,colors.woodDark);
 }
 // Name board hangs at the SOUTH drip edge, readable from the fixed overhead
 // camera. It shares the bronze atlas/material rather than adding a text draw.
 {
  const sh=new T.Shape(),w=.80,h=.34,r=.045;
  sh.moveTo(-w+r,-h);sh.lineTo(w-r,-h);sh.quadraticCurveTo(w,-h,w,-h+r);sh.lineTo(w,h-r);sh.quadraticCurveTo(w,h,w-r,h);sh.lineTo(-w+r,h);sh.quadraticCurveTo(-w,h,-w,h-r);sh.lineTo(-w,-h+r);sh.quadraticCurveTo(-w,-h,-w+r,-h);
  const board=new T.ExtrudeGeometry(sh,{depth:.08,bevelEnabled:true,bevelSegments:1,bevelSize:.012,bevelThickness:.012,curveSegments:4});board.translate(-.90,2.68,-5.50);add(board,1,colors.woodDark);
  for(const x of [-1.38,-.42])cube(.075,.06,.64,x,3.015,-5.82,1,colors.woodDark);
  const pg=new T.PlaneGeometry(1.50,.62),uv=pg.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,.15+.85*uv.getX(i),.16+.84*uv.getY(i));
  pg.translate(0,0,.094);pg.translate(-.90,2.68,-5.50);pg.userData.plaque=true;add(pg,2,0xb5aa85);
 }
 // A coherent stone platform replaces only the visible scan. The source lower
 // geometry is kept hidden for restore; original navigation remains untouched.
 const platform={minX:-2.40,maxX:1.3495,minZ:-9.75,maxZ:-5.25,topY:.7145,bottomY:.09};
 // Recessed dark mortar bed + individual thick paving and masonry courses.
 // All dressed tops are outside the legal original stair cells. Their .02m
 // shoulders and quiet joints are visible at the unchanged phone view.
 cube(3.6695,.49,4.42,-.52525,.4395,-7.50,3,0x9ba7a1);
 cube(3.80,.115,4.60,-.525,.1475,-7.50,3,0xc0cbc6);
 const floorRows=5,floorCols=4,gap=.027;
 for(let row=0;row<floorRows;row++){
  const cuts=row%2?[0,.5,1.5,2.5,3.5,4]:[0,1,2,3,4],z0=blend(platform.minZ,platform.maxZ,row/floorRows),z1=blend(platform.minZ,platform.maxZ,(row+1)/floorRows);
  for(let col=0;col<cuts.length-1;col++){
   const x0=blend(platform.minX,platform.maxX,cuts[col]/floorCols),x1=blend(platform.minX,platform.maxX,cuts[col+1]/floorCols),seed=row*9+col;
   dressedStone(x1-x0-gap,.085,z1-z0-gap,(x0+x1)*.5,platform.topY+.003*Math.sin(seed*1.3),(z0+z1)*.5,{bevel:.023,corner:.035+.012*Math.sin(seed*2.1),seed});dressedFloorSlabs++;
  }
 }
 // Real segment joints around the low platform, with a quiet dark bed behind.
 for(const z of [platform.minZ+.10,platform.maxZ-.10])for(let i=0;i<6;i++){
  const x=blend(platform.minX,platform.maxX,(i+.5)/6);dressedStone(3.7495/6-.019,.425,.20,x,.6775,z,{bevel:.018,corner:0,seed:50+i,simple:true,color:0xf0f1e9});dressedRimBlocks++;
 }
 for(const x of [platform.minX+.10,platform.maxX-.10])for(let i=0;i<6;i++){
  const z=blend(platform.minZ,platform.maxZ,(i+.5)/6);dressedStone(.20,.425,4.5/6-.019,x,.6775,z,{bevel:.018,corner:0,seed:70+i,simple:true,color:0xf0f1e9});dressedRimBlocks++;
 }
 // Side cheeks expose four broad tread/riser masses without changing a single
 // nearest-neighbour legal top. They sit strictly outside Z[-7.4,-6.9].
 for(const z of [-7.433,-6.867])for(const [x0,x1,top]of [[1.35,1.70,.7145],[1.725,1.875,.525],[1.90,2.065,.401],[2.10,2.30,.277]]){
  dressedStone(x1-x0,.13,.054,(x0+x1)*.5,top,z,{bevel:.012,corner:0,seed:90+dressedStepCheeks,simple:true,color:0xebeee6});dressedStepCheeks++;
 }
 // Restrained stone wings and two traditional drum-shaped gate piers make this
 // a mountain entrance, while leaving the entire east stair frontage open.
 for(const z of [-9.18,-5.82]){
  cube(.42,.18,.60,.02,.8045,z,3,0xf1f1ea);
  const drum=new T.CylinderGeometry(.255,.255,.21,18,1);drum.rotateZ(Math.PI/2);drum.translate(.06,1.105,z);add(drum,3,0xffffff);
  const cap=new T.CylinderGeometry(.185,.185,.225,18,1);cap.rotateZ(Math.PI/2);cap.translate(.075,1.105,z);add(cap,3,0xcad5d4);
 }
 for(const [z0,z1]of [[-9.60,-7.68],[-6.62,-5.40]]){
  const mid=(z0+z1)*.5,length=z1-z0;
  cube(.16,.12,length,1.20,.835,mid,3,0xe5ebe5);
  cube(.22,.10,length+.09,1.20,1.045,mid,3,0xffffff);
  for(const z of [z0,z1]){cube(.22,.31,.22,1.20,.870,z,3,0xe5ebe5);cylinder(.15,.12,.07,1.20,1.06,z,3,0xffffff,8);}
 }
 // One connected low rock apron closes the old green gap below the plinth.
 // It stays inside the original forbidden footprint, below actors/sword rays,
 // and uses the rock cell of the shared stone atlas in this existing batch.
 {
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(FOUNDATION_ROCK.positions,3));g.setIndex(FOUNDATION_ROCK.indices);g.computeVertexNormals();g.userData.rockSurface=true;g.userData.stoneSeed=400;add(g,3,0xe5ebe1);
 }
 // Low, clean stone edges make the OLD non-walkable building footprint
 // visible. They sit ~.21m INSIDE it, leaving the original south bypass and
 // east walk/combat lane clear; the stair opening is wider than legal cache Z.
 for(const marker of BOUNDARY_MARKERS){
  const path=marker.points.map(([x,y,z])=>[x,y+.17,z]);
  fascia(path,.14,.34,3,0xf1f1ea,marker.segments);
  fascia(marker.points.map(([x,y,z])=>[x,y+.015,z]),.18,.06,3,0xd3dcdb,marker.segments);
  fascia(marker.points.map(([x,y,z])=>[x,y+.355,z]),.20,.065,3,0xecf0ec,marker.segments);
 }
 // A small closed stone headrail is inset behind the legal stair-top centre.
 // The visible low barrier explains that the inner court is not yet enterable.
 cube(.13,.25,.90,1.10,.8395,-7.15,3,0xf1f1ea);
 cube(.19,.065,1.00,1.10,.9895,-7.15,3,0xffffff);
 // Exact nearest-neighbour step cells reproduce stairsAt(), not a smooth ramp.
 // Every valid 2.5cm cache cell has a level top, and neighbouring height changes
 // have real vertical risers. Millimetre scan height noise has no noisy normals.
 const sp=[],si=[];let stepCells=0;
 function quad(a,b,c,d){const k=sp.length/3;sp.push(...a,...b,...c,...d);si.push(k,k+1,k+2,k,k+2,k+3);}
 const step=.025,rows=GATE_STEP_HEIGHTS.length,cols=GATE_STEP_HEIGHTS[0].length;
 const valid=h=>h!==null&&Number.isFinite(h);
 for(let iz=0;iz<rows;iz++)for(let ix=0;ix<cols;ix++){
  const h=GATE_STEP_HEIGHTS[iz][ix];if(!valid(h))continue;stepCells++;
  const x=1.35+ix*step,z=-7.4+iz*step,x0=Math.max(1.35-.000002,x-step*.5),x1=Math.min(2.45+.000002,x+step*.5),z0=Math.max(-7.4-.000002,z-step*.5),z1=Math.min(-6.9+.000002,z+step*.5);
  quad([x0,h,z0],[x0,h,z1],[x1,h,z1],[x1,h,z0]);
  for(const [dx,dz]of [[1,0],[0,1],[-1,0],[0,-1]]){
   const nx=ix+dx,nz=iz+dz,n=GATE_STEP_HEIGHTS[nz]?.[nx];
   if(valid(n)&&((dx<0||dz<0)||Math.abs(h-n)<.000001))continue;
   const low=valid(n)?Math.min(h,n):.09,high=valid(n)?Math.max(h,n):h;if(high-low<.000001)continue;
   if(dx===1){if(!valid(n)||h>n)quad([x1,high,z0],[x1,high,z1],[x1,low,z1],[x1,low,z0]);else quad([x1,high,z1],[x1,high,z0],[x1,low,z0],[x1,low,z1]);}
   if(dz===1){if(!valid(n)||h>n)quad([x1,high,z1],[x0,high,z1],[x0,low,z1],[x1,low,z1]);else quad([x0,high,z1],[x1,high,z1],[x1,low,z1],[x0,low,z1]);}
   if(dx===-1)quad([x0,high,z1],[x0,high,z0],[x0,low,z0],[x0,low,z1]);
   if(dz===-1)quad([x0,high,z0],[x1,high,z0],[x1,low,z0],[x0,low,z0]);
  }
 }
 meshData(sp,si,3,0xffffff);
 const meshes=[];
 for(let mi=0;mi<arrays.length;mi++){
  const a=arrays[mi],g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(a.n,3));g.setAttribute('color',new T.Float32BufferAttribute(a.c,3));g.setAttribute('uv',new T.Float32BufferAttribute(a.uv,2));g.setIndex(a.idx);g.computeBoundingBox();g.computeBoundingSphere();
  const mesh=new T.Mesh(g,mats[mi]);mesh.name=['H35 quiet cool-grey barrel-tiled roofs','H35 thick ink eaves and grounded framework','H35 old bronze and readable name board','H35 clean painted platform, stone wings and exact stairs'][mi];mesh.castShadow=mesh.receiveShadow=false;mesh.userData.role=mi===0?'roof':'gate-structure';group.add(mesh);meshes.push(mesh);
 }
 gate.add(group);gate.updateMatrixWorld(true);
 const bounds=new T.Box3();
 // Used-index bounds, rather than unused upper vertices retained in lower buffers.
 gate.traverse(o=>{if(!o.visible||!o.isMesh||!o.geometry?.attributes.position)return;const p=o.geometry.attributes.position,I=o.geometry.index,n=I?I.count:p.count;for(let i=0;i<n;i++)bounds.expandByPoint(scratch.fromBufferAttribute(p,I?I.getX(i):i).applyMatrix4(o.matrixWorld));});
 const stats={candidate:true,artApproved:false,revision:'H35',shading:materialMode,nearArchitectureFog:false,materialTypes:mats.map(m=>m.type),source:'original project-authored rebuilt gatehouse and cache-exact stone stairs',sourceModel:'assets/sample-lod/gate.glb',...cutStats,newTriangles:arrays.reduce((n,a)=>n+a.idx.length/3,0),newDrawCalls:meshes.length,materials:mats.length,tileStrips,tileSegmentsPerStrip:6,eaveDepth:.20,perTileBrightFlecks:false,columnFeet,plaqueText:'凤鸣',sourceLowerHidden:true,platform,dressedFloorSlabs,dressedRimBlocks,dressedStepCheeks,stoneBevel:.023,foundationRock:FOUNDATION_ROCK.profile,stepCells,stepSourceSHA256:STEP_SOURCE_SHA256,stoneTextureShared:!!stoneTexture,boundaryMarkers:BOUNDARY_MARKERS.map(q=>({name:q.name,a:q.a,b:q.b,visibleHeight:.3875,insideOriginalForbiddenFrame:true})),stairOpeningZ:[-7.55,-6.75],innerHeadrailX:1.10,protectY,worldBounds:[bounds.min.toArray(),bounds.max.toArray()],roofs:roofs.map(({name,x,z,hx,hz,eave,rise})=>({name,x,z,hx,hz,eave,rise}))};
 let active=true;
 // Expose a rejectable startup barrier. The main entry awaits this before its
 // first playable frame, so a missing atlas cannot silently become a blank sign.
 const ready=typeof document==='undefined'?Promise.resolve():new T.TextureLoader().loadAsync(PLAQUE_URL).then(texture=>{
  if(!active){texture.dispose();return;}
  plaqueTexture=texture;texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.anisotropy=1;mats[2].map=texture;mats[2].needsUpdate=true;
 }).catch(error=>{throw new Error('H35 凤鸣 plaque atlas failed to load: assets/gate-035/plaque-atlas.png',{cause:error});});
 // Keep a rejection handled until the caller reaches its explicit await. The
 // returned original promise still rejects and routes to the normal retry UI.
 ready.catch(()=>{});
 function restore(){if(!active)return;active=false;for(const o of original){o.mesh.geometry=o.geometry;o.mesh.visible=o.visible;o.replacement.dispose();}group.removeFromParent();for(const m of meshes)m.geometry.dispose();for(const m of mats)m.dispose();plaqueTexture?.dispose();delete gate.userData.finish032Installed;delete gate.userData.roofFinishStats;installed.delete(gate);}
 const result={group,meshes,materials:mats,stats,ready,restore};gate.userData.finish032Installed=true;gate.userData.roofFinishStats=stats;installed.set(gate,result);return result;
}
