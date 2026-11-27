/** H33 coherent miniature architecture, original project-authored geometry.
 * Call ONLY after the source gate has its final world transform AND styleGate,
 * before prepareRoof / createRoofOcclusion. Existing source GLB is never edited.
 *
 * const finish = finishGateRoof(gate); // default PBR candidate
 * const light = finishGateRoof(gate,{shading:'light'}); // Lambert roof/timber, PBR bronze
 * Switching mode restores the old candidate first; geometry/nav inputs are shared.
 * gate remains the same object. All original triangles touching world Y<=1.2
 * remain byte-for-byte in original local geometry attributes and index order;
 * new upper pieces are parented under gate in inverse-transformed world units.
 * finish.restore() returns the untouched source geometry and removes candidate.
 *
 * Three connected, thick swept roofs occupy the old three-tier envelopes.
 * Convex barrel tile strips, scalloped tile caps, curved fascia, shaped corbels,
 * octagonal columns and restrained old-gold ridge ends are REAL geometry.
 * This is a candidate for NORMAL CAMERA review, not an art approval claim.
 */
import * as T from 'three';

const clamp=T.MathUtils.clamp;
const blend=T.MathUtils.lerp;
const V=(x,y,z)=>new T.Vector3(x,y,z);
const installed=new WeakMap();
// Close-value, cool grey clay. The roof reads as one hand-finished mass at the
// original phone camera; patina never selects conspicuous pale random tiles.
const colors={tile:0x2a3c44,tileLight:0x2f424a,tileDark:0x1e3038,ink:0x182c33,wood:0x382f29,woodLit:0x493d31,woodDark:0x232726,soffit:0x192728,stoneFoot:0x2d3b3d,gold:0x86764b,goldEdge:0xa18d60};

export function finishGateRoof(gate,{protectY=1.2,shading='pbr'}={}){
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
  original.push({mesh,geometry:source,replacement:lower});mesh.geometry=lower;
 });
 const group=new T.Group();group.name='H33 thick-eaved cool-grey miniature gate';
 const inv=gate.matrixWorld.clone().invert();
 const litOptions={color:0xffffff,vertexColors:true,fog:false};
 // The light path is still directional + hemisphere-lit: Lambert computes
 // diffuse lighting per vertex, rather than dropping the roof to a color plate.
 // Geometry, normals, broad patina and ink/under-eave vertex colors are shared.
 const mats=[
  materialMode==='light'?new T.MeshLambertMaterial(litOptions):new T.MeshStandardMaterial({...litOptions,roughness:.99,metalness:0}),
  materialMode==='light'?new T.MeshLambertMaterial(litOptions):new T.MeshStandardMaterial({...litOptions,roughness:.98,metalness:0}),
  new T.MeshStandardMaterial({...litOptions,roughness:.83,metalness:.22}),
 ];
 if(shading==='light'){mats[0].color.setRGB(3.2,3.2,3.2);mats[1].color.setRGB(2.,2.,2.);}
 mats.forEach((m,i)=>{m.name=['H33 matte cool-grey barrel tiles','H33 deep eaves and grounded timber','H33 restrained old bronze'][i];m.side=T.DoubleSide;});
 const arrays=mats.map(()=>({p:[],n:[],c:[],idx:[]}));
 function add(geometry,material,color,shade=1){
  const a=arrays[material],p=geometry.attributes.position,n=geometry.attributes.normal,off=a.p.length/3,col=new T.Color(color),N=new T.Vector3(),P=new T.Vector3();
  const normalMat=new T.Matrix3().getNormalMatrix(inv);
  for(let i=0;i<p.count;i++){
   P.fromBufferAttribute(p,i);const world=P.clone();P.applyMatrix4(inv);N.fromBufferAttribute(n,i).applyMatrix3(normalMat).normalize();
   // Subtle color variation stays broad and coherent; no busy texture fragments.
   const weather=material===0?(.99+.028*Math.sin(world.x*.83+world.z*.53)+.012*Math.cos(world.z*1.21+world.x*.3)):1;
   const grain=shade*weather*(material===1?(.99+.012*Math.sin(world.x*.9+world.z*.7+world.y*2.6)):1);
   a.p.push(P.x,P.y,P.z);a.n.push(N.x,N.y,N.z);a.c.push(col.r*grain,col.g*grain,col.b*grain);
  }
  const I=geometry.index;if(I)for(let i=0;i<I.count;i++)a.idx.push(off+I.getX(i));else for(let i=0;i<p.count;i++)a.idx.push(off+i);
  geometry.dispose();
 }
 function meshData(pos,idx,material,color,shade=1){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();add(g,material,color,shade);}
 function cube(w,h,d,x,y,z,mat,color){const g=new T.BoxGeometry(w,h,d,1,1,1);g.translate(x,y,z);add(g,mat,color);}
 function cylinder(r0,r1,height,x,y,z,mat,color,sides=10){const g=new T.CylinderGeometry(r1,r0,height,sides,1);g.translate(x,y,z);add(g,mat,color);}
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
  {name:'front lower pavilion',z:-4.82,hx:2.25,hz:1.17,eave:3.86,rise:1.10,hip:.66,rows:14},
  {name:'back lower pavilion',z:-10.78,hx:2.25,hz:1.17,eave:3.86,rise:1.10,hip:.66,rows:14},
  {name:'upper central pavilion',z:-7.85,hx:1.96,hz:2.53,eave:5.72,rise:1.18,hip:.38,rows:30},
 ];
 function surface(cfg,x,z){
  const u=Math.min(1,Math.abs(x)/cfg.hx),v=Math.min(1,Math.abs(z-cfg.z)/cfg.hz);
  const t=clamp((1-v)/cfg.hip,0,1),hip=t*t*(3-2*t);
  return cfg.eave+cfg.rise*Math.pow(1-u,2.05)*hip+.37*Math.pow(u,6)+.20*Math.pow(v,8);
 }
 let tileStrips=0;
 for(const [ri,cfg] of roofs.entries()){
  // Continuous substrate and dark underside carry honest thickness.
  const nx=12,nz=cfg.rows,p=[],topIdx=[],underIdx=[];
  for(let side=0;side<2;side++)for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
   const x=-cfg.hx+2*cfg.hx*i/nx,z=cfg.z-cfg.hz+2*cfg.hz*j/nz,y=surface(cfg,x,z)-(side?.20:0);p.push(x,y,z);
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
      const t=i,u=blend(u0,u1,t),x=sign*cfg.hx*u;
      for(let k=0;k<=cross;k++){
       const a=k/cross*Math.PI,z=zc-Math.cos(a)*half;
       const lip=.017+.019*Math.pow(t,3),y=surface(cfg,x,z)+lip+Math.sin(a)*half*.69;
       pos.push(x,y,z);
      }
     }
     for(let i=0;i<1;i++)for(let k=0;k<cross;k++){const a=i*(cross+1)+k,b=a+cross+1;if(sign>0)ind.push(a,a+1,b,a+1,b+1,b);else ind.push(a,b,a+1,a+1,b,b+1);}
     // A narrow dark clay return at the exposed tile lip has actual thickness.
     const base=pos.length/3;for(let k=0;k<=cross;k++){const a=k/cross*Math.PI,z=zc-Math.cos(a)*half,x=sign*cfg.hx*u1,y=surface(cfg,x,z)+.011+Math.sin(a)*half*.69;pos.push(x,y,z);}
     for(let k=0;k<cross;k++){const a=(cross+1)+k,b=base+k;if(sign>0)ind.push(a,b,a+1,a+1,b,b+1);else ind.push(a,a+1,b,a+1,b+1,b);}
     const tone=.99+.018*Math.sin(row*.24+tile*.31+ri*.7);meshData(pos,ind,0,colors.tile,tone);
    }
    tileStrips++;
    const cx=sign*(cfg.hx+.012),cy=surface(cfg,sign*cfg.hx,zc)+.027,r=half*.82,cap=[cx+sign*.018,cy,zc],ci=[];
    for(let j=0;j<=8;j++){const a=j/8*Math.PI*2;cap.push(cx,cy+Math.cos(a)*r,zc+Math.sin(a)*r);if(j<8)ci.push(0,j+1,j+2);}
    meshData(cap,ci,0,colors.tile,.94);
   }
  }
  // Swept fascia around the perimeter; four corners curl up as the source does.
  for(const sign of [-1,1]){
   const path=[];
   for(let j=0;j<=12;j++){const z=cfg.z-cfg.hz+2*cfg.hz*j/12;path.push([sign*(cfg.hx+.01),surface(cfg,sign*cfg.hx,z)-.10,z]);}
   fascia(path,.12,.21,1,colors.ink,16);
   // A narrow curved clay drip edge makes top/lip/soffit distinguishable even
   // when individual tile lips collapse to a single pixel on a phone.
   fascia(path.map(([x,y,z])=>[x,y+.083,z]),.13,.035,0,colors.tileDark,16);
  }
  for(const sign of [-1,1]){
   const path=[];for(let j=0;j<=16;j++){const x=-cfg.hx+2*cfg.hx*j/16,z=cfg.z+sign*cfg.hz;path.push([x,surface(cfg,x,z)-.10,z]);}
   fascia(path,.085,.21,1,colors.ink,20);
   fascia(path.map(([x,y,z])=>[x,y+.083,z]),.095,.035,0,colors.tileDark,20);
  }
  // Raised continuous ridge with small aged-bronze hooked ends; no gold balls.
  const ridgeHalf=cfg.hz*(1-cfg.hip*.68),ridgeY=cfg.eave+cfg.rise+.075;
  tube([[0,ridgeY+.08,cfg.z-ridgeHalf],[0,ridgeY,cfg.z],[0,ridgeY+.08,cfg.z+ridgeHalf]],[.078,.085,.078],1,colors.ink,16,7);
  for(const sign of [-1,1]){
   const z=cfg.z+sign*ridgeHalf;
   tube([[0,ridgeY+.05,z-sign*.10],[0,ridgeY+.15,z+sign*.04],[0,ridgeY+.32,z+sign*.13],[0,ridgeY+.43,z+sign*.12]],[.055,.050,.029,.008],2,colors.gold,10,6);
  }
  // Fine ink ridge framing gives the stepped gable an unbroken readable edge.
  for(const sign of [-1,1]){
   const z=cfg.z+sign*(cfg.hz-.025),path=[];
   for(let i=0;i<=16;i++){const x=-cfg.hx+2*cfg.hx*i/16;path.push([x,surface(cfg,x,z)+.04,z]);}
   tube(path,Array(path.length).fill(.034),1,colors.ink,16,5);
  }
 }
 // Straight timber now reaches the retained stone support instead of starting
 // at the arbitrary Y=1.2 cut. The source inner-left bases are at Y~.154; the
 // right stone platform is at Y~.71. Feet overlap those supports a few cm, and
 // stay within the original column footprints; original steps/nav are intact.
 const columnFeet=[];
 for(const x of [-1.25,1.25])for(const z of [-10.45,-5.15]){
  const footY=x<0?.15:.70,postY=footY+.13;
  cylinder(.205,.19,.14,x,footY+.07,z,0,colors.stoneFoot,12);
  cylinder(.18,.16,.08,x,footY+.17,z,1,colors.woodDark,12);
  cylinder(.155,.14,3.60-postY,x,(3.60+postY)*.5,z,1,colors.wood,12);
  // Dark timber shoe/collar gives contact depth without a floating blob decal.
  cylinder(.159,.156,.21,x,footY+.285,z,1,colors.woodDark,12);
  cylinder(.185,.185,.10,x,3.52,z,1,colors.woodDark,12);
  cylinder(.158,.158,.028,x,3.29,z,2,colors.gold,12);
  columnFeet.push({x,z,stoneContactY:footY,postBottomY:postY});
 }
 for(const z of [-10.45,-5.15]){
  cube(2.94,.24,.25,0,3.54,z,1,colors.woodDark);
  cube(2.84,.075,.28,0,3.69,z,1,colors.woodLit);
  // A layered curved corbel is an extruded profile, not a right-angle brace.
  for(const sign of [-1,1]){
   const sh=new T.Shape();sh.moveTo(0,0);sh.lineTo(.65,0);sh.lineTo(.65,-.11);sh.bezierCurveTo(.48,-.12,.39,-.28,.32,-.38);sh.lineTo(.10,-.38);sh.bezierCurveTo(.18,-.20,.13,-.11,0,-.10);sh.closePath();
   const g=new T.ExtrudeGeometry(sh,{depth:.16,bevelEnabled:true,bevelSegments:1,bevelSize:.015,bevelThickness:.015,curveSegments:8});g.scale(sign,1,1);g.translate(sign*.91,3.49,z-.08);add(g,1,colors.wood);
  }
 }
 for(const x of [-1.05,1.05]){
  cube(.16,.22,5.3,x,3.51,-7.80,1,colors.woodDark);
  for(const z of [-9.35,-6.35]){
   cylinder(.115,.105,1.80,x,4.55,z,1,colors.wood,10);
   cube(.32,.12,.32,x,5.42,z,1,colors.woodLit);
  }
 }
 for(const z of [-9.35,-6.35])cube(2.30,.21,.24,0,5.40,z,1,colors.woodDark);
 // Short revealed rafters beneath eaves are coherent parallel timber, not
 // warped texture islands. Their depth shadows are carried by real geometry.
 for(const cfg of roofs)for(const sign of [-1,1])for(let i=0;i<cfg.rows;i+=2){
  const z=cfg.z-cfg.hz+.13+(2*cfg.hz-.26)*(i+.5)/cfg.rows;
  const x=sign*(cfg.hx-.16),y=surface(cfg,x,z)-.245;
  cube(.47,.105,.083,x,y,z,1,colors.woodDark);
 }
 // A modest road-facing wooden name plaque, not an emissive HUD or an
 // external image: system CJK glyphs are rendered into a tiny local canvas.
 let plaqueTexture=null,plaqueMesh=null;
 if(typeof document!=='undefined'){
  const sh=new T.Shape(),w=.76,h=.32,r=.045;
  sh.moveTo(-w+r,-h);sh.lineTo(w-r,-h);sh.quadraticCurveTo(w,-h,w,-h+r);sh.lineTo(w,h-r);sh.quadraticCurveTo(w,h,w-r,h);sh.lineTo(-w+r,h);sh.quadraticCurveTo(-w,h,-w,h-r);sh.lineTo(-w,-h+r);sh.quadraticCurveTo(-w,-h,-w+r,-h);
  const board=new T.ExtrudeGeometry(sh,{depth:.08,bevelEnabled:true,bevelSegments:1,bevelSize:.012,bevelThickness:.012,curveSegments:3});board.rotateX(-.18);board.translate(0,3.72,-3.75);add(board,1,colors.woodDark);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,512,256);ctx.fillStyle='#bcb39a';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 178px "Noto Serif CJK SC", "Songti SC", "SimSun", serif';ctx.fillText('凤鸣',256,132);
  plaqueTexture=new T.CanvasTexture(canvas);plaqueTexture.colorSpace=T.SRGBColorSpace;plaqueTexture.generateMipmaps=true;plaqueTexture.minFilter=T.LinearMipmapLinearFilter;
  const pg=new T.PlaneGeometry(1.42,.58);pg.translate(0,0,.094);pg.rotateX(-.18);pg.translate(0,3.72,-3.75);pg.applyMatrix4(inv);
  const pm=new T.MeshBasicMaterial({map:plaqueTexture,transparent:true,alphaTest:.36,depthWrite:false,color:0xffffff,side:T.DoubleSide,fog:false});pm.name='H32 system CJK wood plaque lettering';plaqueMesh=new T.Mesh(pg,pm);plaqueMesh.name='凤鸣 wood plaque original system-font lettering';group.add(plaqueMesh);mats.push(pm);
 }
 const meshes=[];
 for(let mi=0;mi<arrays.length;mi++){
  const a=arrays[mi],g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(a.n,3));g.setAttribute('color',new T.Float32BufferAttribute(a.c,3));g.setIndex(a.idx);g.computeBoundingBox();g.computeBoundingSphere();
  const mesh=new T.Mesh(g,mats[mi]);mesh.name=['H33 quiet cool-grey barrel-tiled roofs','H33 thick ink eaves and grounded framework','H33 restrained old-bronze ridge hooks'][mi];mesh.castShadow=mesh.receiveShadow=false;mesh.userData.role=mi===0?'roof':'gate-structure';group.add(mesh);meshes.push(mesh);
 }
 if(plaqueMesh)meshes.push(plaqueMesh);
 gate.add(group);gate.updateMatrixWorld(true);
 const bounds=new T.Box3();
 // Used-index bounds, rather than unused upper vertices retained in lower buffers.
 gate.traverse(o=>{if(!o.isMesh||!o.geometry?.attributes.position)return;const p=o.geometry.attributes.position,I=o.geometry.index,n=I?I.count:p.count;for(let i=0;i<n;i++)bounds.expandByPoint(scratch.fromBufferAttribute(p,I?I.getX(i):i).applyMatrix4(o.matrixWorld));});
 const stats={candidate:true,artApproved:false,revision:'H33',shading:materialMode,nearArchitectureFog:false,materialTypes:mats.map(m=>m.type),source:'original project-authored fitted upper gate geometry',sourceModel:'assets/sample-lod/gate.glb',...cutStats,newTriangles:arrays.reduce((n,a)=>n+a.idx.length/3,0)+(plaqueMesh?2:0),newDrawCalls:meshes.length,materials:mats.length,tileStrips,tileSegmentsPerStrip:6,eaveDepth:.20,perTileBrightFlecks:false,columnFeet,plaqueText:plaqueMesh?'凤鸣':null,protectY,worldBounds:[bounds.min.toArray(),bounds.max.toArray()],roofs:roofs.map(({name,z,hx,hz,eave,rise})=>({name,z,hx,hz,eave,rise}))};
 let active=true;
 function restore(){if(!active)return;active=false;for(const o of original){o.mesh.geometry=o.geometry;o.replacement.dispose();}group.removeFromParent();for(const m of meshes)m.geometry.dispose();for(const m of mats)m.dispose();plaqueTexture?.dispose();delete gate.userData.finish032Installed;delete gate.userData.roofFinishStats;installed.delete(gate);}
 const result={group,meshes,materials:mats,stats,restore};gate.userData.finish032Installed=true;gate.userData.roofFinishStats=stats;installed.set(gate,result);return result;
}
