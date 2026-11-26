/* H.19.1: Zero-cost procedural Chinese ancient pine; independent of production game. */
import * as T from 'three';
const V=(x,y,z)=>new T.Vector3(x,y,z);
const P=(a)=>V(...a);
function rng(seed){let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function bark(){
 const c=document.createElement('canvas');c.width=256;c.height=512;
 const g=c.getContext('2d'),r=rng(44112);
 g.fillStyle='#8f8574';g.fillRect(0,0,256,512);
 for(let i=0;i<1350;i++){
   const x=r()*256,y=r()*512,h=8+r()*85;
   g.globalAlpha=.17+r()*.36;g.strokeStyle=r()>.45?'#302a23':'#ded0ae';
   g.lineWidth=.5+r()*2;g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+8*(r()-.5),y+h*.4,x+6*(r()-.5),y+h*.75,x+10*(r()-.5),y+h);g.stroke();
 }
 g.globalAlpha=1;
 const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;return tex;
}
function wood(points,radii,material,n=32,sides=8){
 const curve=new T.CatmullRomCurve3(points.map(P),false,'centripetal',.5),frames=curve.computeFrenetFrames(n,false);
 const pos=[],uv=[],idx=[];
 for(let i=0;i<=n;i++){
   const t=i/n,step=t*(radii.length-1),j=Math.min(radii.length-2,Math.floor(step)),ra=T.MathUtils.lerp(radii[j],radii[j+1],step-j),p=curve.getPoint(t);
   for(let k=0;k<=sides;k++){
     const angle=k/sides*Math.PI*2;
     const normal=frames.normals[i].clone().multiplyScalar(Math.cos(angle)).addScaledVector(frames.binormals[i],Math.sin(angle));
     const ridge=1+.044*Math.sin(9*angle+t*38)+.021*Math.sin(17*angle-t*75);
     const q=p.addScaledVector(normal,ra*ridge);
     pos.push(q.x,q.y,q.z);uv.push(k/sides,t*5);p.sub(normal.multiplyScalar(ra*ridge));
   }
 }
 for(let i=0;i<n;i++)for(let k=0;k<sides;k++){let a=i*(sides+1)+k,b=a+sides+1;idx.push(a,b,a+1,b,b+1,a+1);}
 const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(pos,3));geom.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geom.setIndex(idx);geom.computeVertexNormals();
 return new T.Mesh(geom,material);
}
function needleGeo(){
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute([-.052,0,0,.052,0,0,.012,.56,0,0,1,-.012],3));
 g.setIndex([0,1,2,1,3,2]);g.computeVertexNormals();return g;
}
const trunkPts=[
 [-.77,.18,.05],[-1.09,.72,.04],[-1.16,1.38,-.06],[-1.0,2.02,-.12],
 [-.66,2.66,-.1],[.02,3.21,0],[.68,3.54,-.02],[.77,4.03,-.18],
 [.48,4.47,-.12],[.64,4.98,-.08],[1.05,5.47,-.05],[1.18,5.91,-.04],[1.06,6.22,0]
];
const branchPts=[
 [[-.75,2.72,0],[-1.72,2.99,0],[-2.68,3.19,-.10],[-3.72,3.34,-.10],[-4.38,3.37,0]],
 [[-.13,3.15,.0],[.98,3.17,.12],[2.10,3.35,.12],[3.12,3.55,.07],[4.06,3.61,.07]],
 [[.33,3.57,-.06],[-.78,4.01,-.16],[-1.92,4.43,-.17],[-3.2,4.63,-.13],[-4.34,4.66,-.08]],
 [[.64,4.13,-.10],[1.82,4.39,-.11],[2.76,4.65,-.04],[3.82,4.73,0],[4.52,4.69,.03]],
 [[.58,4.76,-.08],[-.50,5.13,.0],[-1.54,5.39,.05],[-2.8,5.48,.10]],
 [[.96,5.28,-.09],[2.17,5.54,-.09],[2.96,5.72,-.03],[3.78,5.69,.03]],
 [[1.1,5.77,-.03],[.09,6.11,-.05],[-.76,6.35,-.07],[-1.44,6.44,-.10]],
 [[1.08,6.05,-.01],[1.75,6.34,0],[2.35,6.49,.04]]
];
const pads=[
 [-4.22,3.44,-.12,.97,.59],[-3.16,3.56,.08,1.02,.67],[-2.20,3.52,-.18,.81,.57],
 [2.76,3.59,-.08,.90,.62],[3.75,3.64,.08,.98,.66],
 [-4.40,4.69,-.06,1.10,.64],[-3.33,4.81,-.18,1.05,.70],[-2.21,4.90,.09,.88,.59],
 [2.72,4.75,.11,1.04,.65],[3.73,4.77,-.08,.97,.67],
 [-2.78,5.53,.04,.89,.62],[-1.58,5.59,-.16,.99,.66],[-.38,5.62,.10,.84,.60],
 [2.40,5.71,-.12,.97,.60],[3.46,5.78,.13,1.02,.64],
 [-.73,6.43,-.10,.78,.55],[.39,6.58,.06,.93,.62],[1.52,6.55,-.06,.94,.65],[2.43,6.46,.12,.73,.53]
];
export function createPine003(seed=20261126){
 const r=rng(seed),model=new T.Group();model.name='PINE-003-H19.1';
 const layers={trunk:new T.Group(),branches:new T.Group(),needleClusters:new T.Group(),rockAndRoots:new T.Group()};
 for(const [name,g] of Object.entries(layers)){g.name=name;model.add(g);}
 const woodMat=new T.MeshStandardMaterial({map:bark(),color:0xb7a48f,roughness:1,metalness:0});
 layers.trunk.add(wood(trunkPts,[.68,.65,.59,.54,.47,.41,.36,.30,.26,.21,.15,.10,.05],woodMat,95,13));
 for(const pts of branchPts){
   const radii=pts.map((_,i)=>.25*Math.pow(1-i/pts.length,1.15)+.028);
   layers.branches.add(wood(pts,radii,woodMat,38,8));
   const end=pts[pts.length-1];
   for(let j=-1;j<=1;j++){
     const twig=[end,[end[0]+j*.33,end[1]+.13+(j===0?.09:0),end[2]+j*.42]];
     layers.branches.add(wood(twig,[.038,.008],woodMat,11,6));
   }
 }
 const roots=[
  [[-.83,.24,.04],[-1.60,.15,.25],[-2.35,.03,.50]],
  [[-.78,.22,-.08],[-1.53,.13,-.66],[-2.20,.02,-1.0]],
  [[-.53,.24,.06],[.28,.16,.31],[1.04,.04,.92]],
  [[-.62,.26,-.12],[.03,.11,-.48],[1.09,.03,-1.02]],
  [[-.72,.22,.10],[-.82,.11,1.07],[-.27,.01,1.70]],
  [[-.97,.24,.02],[-1.48,.11,.96],[-1.96,.03,1.25]],
  [[-.44,.23,.06],[.73,.07,1.04],[1.63,.02,1.36]]
 ];
 for(const pts of roots)layers.rockAndRoots.add(wood(pts,[.23,.12,.02],woodMat,24,8));
 const gRock=new T.IcosahedronGeometry(1,1),rockMats=[0x6d7670,0x82847a,0x5a645f,0x949487].map(color=>new T.MeshStandardMaterial({color,roughness:1,flatShading:true}));
 const rockList=[[-1.67,-.18,.47,.69,.33,.54],[.76,-.19,1.03,.72,.30,.54],[1.10,-.18,-.66,.72,.34,.63],[-1.72,-.15,-.63,.72,.28,.62],[-.68,-.17,1.31,.61,.30,.52],[-2.21,-.17,.79,.62,.30,.57],[.30,-.17,-1.33,.79,.26,.54],[1.62,-.18,.33,.63,.28,.59]];
 rockList.forEach(([x,y,z,sx,sy,sz],i)=>{const m=new T.Mesh(gRock,rockMats[i%4]);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.y=i*.87;layers.rockAndRoots.add(m);});
 const needleColors=[0x204a36,0x2b5a40,0x3c6a47,0x547652,0x69855b,0x7b9162,0x30523b].map(c=>new T.Color(c));
 const blades=[];
 // Spread needles over filled elliptical pads; no ring geometry or foam spheres.
 for(const [cx,cy,cz,rx,rz] of pads){
   for(let i=0;i<690;i++){
     const angle=r()*Math.PI*2,d=Math.sqrt(r())*.98;
     const lobe=i%5;
     const x=cx+Math.cos(angle)*d*rx*.87+(lobe-2)*rx*.08;
     const z=cz+Math.sin(angle)*d*rz*1.48+(lobe%3-1)*.18;
     const y=cy+.11+.23*(1-d*d)+.095*Math.cos(angle*6+cx*2.9)+(r()-.5)*.34;
     const normal=V(Math.cos(angle)*(.25+.68*d)+(r()-.5)*.78,.4+r()*.68,Math.sin(angle)*(.23+.66*d)+(r()-.5)*.74).normalize();
     blades.push({p:V(x,y,z),q:new T.Quaternion().setFromUnitVectors(V(0,1,0),normal),scale:.22+r()*.22,width:.67+r()*.66,color:needleColors[Math.floor(r()*needleColors.length)]});
   }
 }
 for(let i=blades.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[blades[i],blades[j]]=[blades[j],blades[i]];}
 const foliage=new T.InstancedMesh(needleGeo(),new T.MeshStandardMaterial({color:0xffffff,roughness:.94,metalness:0,emissive:0x102114,emissiveIntensity:.20,side:T.DoubleSide,flatShading:true}),blades.length);
 const matrix=new T.Matrix4();
 blades.forEach((b,i)=>{matrix.compose(b.p,b.q,V(b.width,b.scale,b.width));foliage.setMatrixAt(i,matrix);foliage.setColorAt(i,b.color);});
 foliage.instanceMatrix.needsUpdate=true;foliage.instanceColor.needsUpdate=true;foliage.frustumCulled=false;
 foliage.name='solid-pine-needle-bundles';layers.needleClusters.add(foliage);
 model.userData={asset:'PINE-003',version:'H.19.1-v0.2',credits:0,needles:blades.length,pads:pads.length,branches:branchPts.length,kind:'prototype-only'};
 return {model,layers,foliage,stats:model.userData,
  setDensity(v){foliage.count=Math.floor(blades.length*Math.max(.3,Math.min(1,Number(v))));return foliage.count;},
  setSilhouette(on){model.traverse(o=>{if(!o.isMesh)return;if(!o.userData.savedMaterial)o.userData.savedMaterial=o.material;if(on){if(!o.userData.shadowMat)o.userData.shadowMat=new T.MeshBasicMaterial({color:0x091214,side:T.DoubleSide});o.material=o.userData.shadowMat;}else o.material=o.userData.savedMaterial;});}
 };
}
