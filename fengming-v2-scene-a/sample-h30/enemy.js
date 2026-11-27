/** 山门影煞 · original articulated enemy by this project. No downloaded art/animation.
 * Local +Z faces the target. Outer group position/rotation remains caller-owned.
 * createEnemy() -> {group, update(dt,{moving,speed,hitProgress,dead}), hit(direction), stats}.
 * Call hit() on the EXACT damage frame, or provide hitProgress in [0,1] for a .30s recoil.
 * All silhouette and reaction movement is readable without emissive/trail effects.
 */
import * as T from 'three';
const lerp=T.MathUtils.lerp;
const clamp=T.MathUtils.clamp;
const smooth=t=>t*t*(3-2*t);
const palette={cloth:0x202f40,clothLight:0x334854,clothDark:0x152431,slate:0x52626a,slateLight:0x6f7d7d,slateDark:0x35464e,edge:0x899492,steel:0x6e8b93,steelDark:0x354d59,eye:0x7eb6b2,shadow:0x172a31};

export function createEnemy(){
 const group=new T.Group();group.name='山门影煞-石甲-持短刃';
 const materials=[
  new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.97,metalness:0}),
  new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.94,metalness:0}),
  new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.47,metalness:.62}),
  new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.62,metalness:.08,emissive:0x255452,emissiveIntensity:.28})
 ];
 materials.forEach((m,i)=>m.name=['影煞靛布','风化青石甲','旧铁短刃与扣件','冷青面缝'][i]);
 const data=materials.map(()=>({p:[],n:[],c:[],si:[],sw:[],idx:[]}));
 const bones=[],indices={};
 function bone(name,parent,x,y,z){const b=new T.Bone();b.name=name;b.position.set(x,y,z);indices[name]=bones.length;bones.push(b);if(parent)parent.add(b);return b;}
 const root=bone('root',null,0,0,0);
 const hips=bone('hips',root,0,.65,0);
 const spine=bone('spine',hips,0,.19,0);
 const chest=bone('chest',spine,0,.19,.015);
 const head=bone('head',chest,0,.18,.025);
 const shoulderR=bone('rightShoulder',chest,-.25,-.015,0);
 const elbowR=bone('rightElbow',shoulderR,-.07,-.225,.04);
 const wristR=bone('rightWrist',elbowR,-.025,-.21,.03);
 const shoulderL=bone('leftShoulder',chest,.25,-.015,0);
 const elbowL=bone('leftElbow',shoulderL,.075,-.22,.045);
 const wristL=bone('leftWrist',elbowL,.025,-.22,.03);
 const thighR=bone('rightThigh',hips,-.12,-.01,0);
 const kneeR=bone('rightKnee',thighR,0,-.285,.015);
 const ankleR=bone('rightAnkle',kneeR,0,-.285,.015);
 const thighL=bone('leftThigh',hips,.12,-.01,0);
 const kneeL=bone('leftKnee',thighL,0,-.285,.015);
 const ankleL=bone('leftAnkle',kneeL,0,-.285,.015);
 const skirtR=bone('rightHem',hips,-.13,-.015,-.03);
 const skirtL=bone('leftHem',hips,.13,-.015,-.03);
 group.add(root);group.updateMatrixWorld(true);
 function add(geo,mi,bn,color){
  const a=data[mi],p=geo.attributes.position,n=geo.attributes.normal,offset=a.p.length/3,c=new T.Color(color),bi=indices[bn];
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),shade=.94+.06*Math.sin(x*29+y*33+z*41);
   a.p.push(x,y,z);a.n.push(n?n.getX(i):0,n?n.getY(i):1,n?n.getZ(i):0);a.c.push(c.r*shade,c.g*shade,c.b*shade);a.si.push(bi,0,0,0);a.sw.push(1,0,0,0);
  }
  const I=geo.index;if(I)for(let i=0;i<I.count;i++)a.idx.push(offset+I.getX(i));else for(let i=0;i<p.count;i++)a.idx.push(offset+i);
  geo.dispose();
 }
 function box(w,h,d,x,y,z,mi,bn,color,rz=0){const g=new T.BoxGeometry(w,h,d);if(rz)g.rotateZ(rz);g.translate(x,y,z);add(g,mi,bn,color);}
 function ellipsoid(rx,ry,rz,x,y,z,mi,bn,color,detail=1){const g=new T.IcosahedronGeometry(1,detail);g.scale(rx,ry,rz);g.translate(x,y,z);add(g,mi,bn,color);}
 function ring(rings,mi,bn,color,sides=8){
  const p=[],idx=[];
  for(const [y,rx,rz,cx=0,cz=0] of rings)for(let k=0;k<sides;k++){const a=(k/sides)*Math.PI*2+Math.PI/8;p.push(cx+Math.cos(a)*rx,y,cz+Math.sin(a)*rz);}
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<sides;k++){let a=j*sides+k,b=j*sides+(k+1)%sides;idx.push(a,a+sides,b,b,a+sides,b+sides);}
  for(let k=1;k<sides-1;k++){idx.push(0,k+1,k);const a=(rings.length-1)*sides;idx.push(a,a+k,a+k+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();add(g,mi,bn,color);
 }
 function plate(points,depth,z,mi,bn,color){
  const s=new T.Shape();s.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)s.lineTo(points[i][0],points[i][1]);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1});g.translate(0,0,z);add(g,mi,bn,color);
 }
 function limb(points,radii,mi,bn,color,sides=6){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments=Math.max(4,(points.length-1)*4),frames=curve.computeFrenetFrames(segments,false),p=[],idx=[];
  for(let i=0;i<=segments;i++){const t=i/segments,q=t*(radii.length-1),j=Math.min(radii.length-2,Math.floor(q)),r=lerp(radii[j],radii[j+1],q-j),v=curve.getPoint(t);for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2,P=v.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);p.push(P.x,P.y,P.z);}}
  for(let i=0;i<segments;i++)for(let k=0;k<sides;k++){const a=i*(sides+1)+k,b=a+sides+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();add(g,mi,bn,color);
 }
 // Cloth silhouette: proper paired legs, short parted skirt, broad tucked torso.
 for(const [sign,thigh,knee,ankle] of [[-1,'rightThigh','rightKnee','rightAnkle'],[1,'leftThigh','leftKnee','leftAnkle']]){
  const x=sign*.12;
  ring([[.64,.075,.075,x],[.45,.075,.071,x],[.37,.060,.058,x]],0,thigh,palette.cloth);
  ring([[.39,.061,.057,x,.015],[.16,.052,.055,x,.032],[.09,.057,.062,x,.03]],0,knee,palette.clothDark);
  box(.13,.10,.20,x,.055,.072,0,ankle,palette.clothDark);
  // Greave rim and an angular shin ridge prevent featureless dark tubes.
  plate([[x-.052,.36],[x+.048,.36],[x+.043,.18],[x,.135],[x-.043,.18]],.025,.071,1,knee,palette.slate);
  box(.022,.18,.018,x,.255,.105,1,knee,palette.slateLight);
  box(.125,.025,.13,x,.115,.035,2,knee,palette.steelDark);
 }
 ring([[.65,.19,.118],[.82,.205,.13],[1.01,.25,.14],[1.10,.215,.12]],0,'spine',palette.cloth,8);
 // Long dark skirt panels separate down the center; uneven lower edge is intentional.
 plate([[-.245,.72],[-.01,.71],[-.03,.41],[-.11,.32],[-.21,.39],[-.255,.48]],.027,-.045,0,'rightHem',palette.clothLight);
 plate([[.012,.71],[.24,.72],[.262,.47],[.19,.35],[.09,.41],[.035,.36]],.027,-.045,0,'leftHem',palette.cloth);
 // Folded inner lapels and crossed chest straps in cool metal, no hero gold/red.
 box(.045,.32,.026,-.075,.91,.145,0,'spine',palette.clothLight,-.34);
 box(.045,.30,.027,.075,.91,.15,0,'spine',palette.clothDark,.34);
 box(.405,.078,.27,0,.703,0,0,'hips',palette.clothDark);
 box(.081,.072,.029,0,.715,.154,2,'hips',palette.steelDark);
 box(.045,.045,.016,0,.715,.175,1,'hips',palette.slateLight);
 // Split stone breastplate with small chipped bevel facets and black center gap.
 plate([[-.21,1.073],[-.055,1.11],[-.018,.99],[-.035,.825],[-.175,.855],[-.23,.965]],.04,.123,1,'chest',palette.slate);
 plate([[.025,1.10],[.19,1.07],[.229,.955],[.167,.843],[.038,.822],[.015,.97]],.044,.125,1,'chest',palette.slateDark);
 plate([[-.18,1.07],[-.078,1.09],[-.046,1.025],[-.06,.905],[-.095,.91],[-.11,1.02]],.013,.17,1,'chest',palette.slateLight);
 plate([[.058,1.072],[.178,1.045],[.192,1.007],[.139,.978],[.07,.997]],.016,.172,1,'chest',palette.slate);
 // Back plates read from the actual game camera, with exposed cloth at each side.
 box(.32,.21,.065,0,1.005,-.143,1,'chest',palette.slateDark);
 box(.31,.055,.074,0,1.083,-.151,1,'chest',palette.slateLight);
 box(.235,.055,.075,0,.98,-.15,1,'chest',palette.slate);
 // One broad broken shoulder and a lower offside pauldron give enemy a unique outline.
 for(const [sign,bn] of [[-1,'rightShoulder'],[1,'leftShoulder']]){
  const x=sign*.275;
  ellipsoid(.135,.082,.16,x,1.065,.005,1,bn,sign<0?palette.slateLight:palette.slate,0);
  box(.185,.036,.235,x,1.095,-.005,1,bn,palette.slateDark,sign*.10);
  box(.16,.039,.20,x+sign*.034,1.038,.016,1,bn,palette.slate,sign*.16);
  limb([[x,1.005,.02],[sign*.325,.87,.044],[sign*.34,.78,.06]],[.069,.063,.057],0,bn,palette.clothLight);
 }
 // Forearms angle inward, wrists and three articulated-looking talons remain visible.
 for(const [sign,bn] of [[-1,'rightElbow'],[1,'leftElbow']]){
  limb([[sign*.32,.815,.05],[sign*.35,.70,.06],[sign*.345,.60,.075]],[.060,.055,.047],0,bn,palette.cloth);
  plate([[sign*.30,.80],[sign*.39,.77],[sign*.395,.65],[sign*.345,.615],[sign*.305,.65]],.03,.085,1,bn,palette.slateDark);
 }
 for(const [sign,bn] of [[-1,'rightWrist'],[1,'leftWrist']]){
  ellipsoid(.056,.065,.044,sign*.345,.59,.08,0,bn,palette.clothDark,0);
  for(let j=0;j<3;j++)limb([[sign*(.32+j*.023),.56,.10],[sign*(.318+j*.026),.535,.15],[sign*(.315+j*.025),.54,.18]],[.013,.010,.004],2,bn,palette.steelDark,4);
 }
 // Head is an angular weathered stone mask under a folded cloth hood, no sphere head.
 ring([[1.13,.115,.095,0,.035],[1.30,.15,.115,0,.04],[1.405,.11,.085,0,.02]],0,'head',palette.clothDark,7);
 plate([[-.117,1.32],[-.071,1.365],[.067,1.365],[.122,1.31],[.103,1.18],[.035,1.122],[-.039,1.128],[-.105,1.185]],.05,.13,1,'head',palette.slateLight);
 // High brow, split nose and jaw cut make the enemy readable as masked, not human skin.
 plate([[-.116,1.315],[-.021,1.294],[0,1.315],[.021,1.294],[.116,1.315],[.103,1.341],[.043,1.351],[-.043,1.351],[-.103,1.341]],.018,.18,1,'head',palette.slateDark);
 plate([[-.014,1.306],[.016,1.306],[.032,1.22],[0,1.194],[-.027,1.22]],.025,.183,1,'head',palette.slate);
 box(.072,.016,.014,-.061,1.285,.198,3,'head',palette.eye,-.10);
 box(.072,.016,.014,.061,1.285,.198,3,'head',palette.eye,.10);
 box(.054,.018,.014,0,1.172,.188,1,'head',palette.slateDark);
 // Folded hood ridge and trailing knot are actual 3D behind the head.
 limb([[-.12,1.30,-.02],[-.07,1.397,-.025],[0,1.422,-.035],[.08,1.385,-.025],[.13,1.30,-.01]],[.036,.039,.038,.035,.025],0,'head',palette.clothLight,5);
 plate([[-.055,1.34],[.052,1.34],[.087,1.22],[.052,1.125],[.014,1.16],[-.033,1.11],[-.073,1.21]],.025,-.105,0,'head',palette.cloth);
 // Short recurved iron blade, deliberately lower and duller than hero's long sword.
 // It is bound to the right hand, so recoil carries it with the hand.
 plate([[-.365,.582],[-.31,.60],[-.328,.81],[-.356,1.005],[-.404,1.08],[-.402,.91]],.018,.115,2,'rightWrist',palette.steel);
 plate([[-.402,.91],[-.404,1.08],[-.422,1.045],[-.425,.89],[-.386,.66],[-.365,.582]],.009,.127,2,'rightWrist',palette.steelDark);
 box(.13,.027,.045,-.36,.615,.12,2,'rightWrist',palette.steelDark,-.17);

 const p=[],n=[],c=[],si=[],sw=[],idx=[],ranges=[];let start=0;
 for(let mi=0;mi<data.length;mi++){
  const a=data[mi],off=p.length/3;p.push(...a.p);n.push(...a.n);c.push(...a.c);si.push(...a.si);sw.push(...a.sw);idx.push(...a.idx.map(i=>i+off));ranges.push({start,count:a.idx.length,material:mi});start+=a.idx.length;
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(n,3));geometry.setAttribute('color',new T.Float32BufferAttribute(c,3));geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geometry.setIndex(idx);
 for(const a of ranges)geometry.addGroup(a.start,a.count,a.material);
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const mesh=new T.SkinnedMesh(geometry,materials);mesh.name='影煞石甲布衣骨骼网格';mesh.frustumCulled=false;mesh.castShadow=true;group.add(mesh);group.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones));
 const stats={source:'original project-authored procedural mesh and animation; no third-party assets',height:1.46,triangles:idx.length/3,vertices:p.length/3,bones:bones.length,materials:materials.length,drawCalls:4,hitDuration:.30,facing:'+Z'};
 group.userData.source=stats.source;group.userData.role='enemy';group.userData.stats=stats;
 let time=0,walk=0,recoil=1,hitSide=1,deathAmount=0;
 const baseY=root.position.y;
 function resetPose(){for(const b of bones)b.rotation.set(0,0,0);hips.position.set(0,.65,0);root.position.y=baseY;}
 function hit(direction){recoil=0;hitSide=direction?.x<0?-1:1;}
 function update(dt,{moving=false,speed=1,hitProgress=null,dead=false}={}){
  time+=Math.max(0,dt);if(moving)walk+=dt*(7.3+Math.min(2,speed));recoil=Math.min(1,recoil+Math.max(0,dt)/.30);
  const hp=hitProgress===null?recoil:clamp(hitProgress,0,1),active=hp<1;
  resetPose();
  const step=moving?Math.sin(walk):0,bob=moving?Math.abs(Math.sin(walk))*.025:Math.sin(time*1.8)*.006;
  hips.position.y=.65+bob;chest.rotation.x=.10+Math.sin(time*1.8)*.016;head.rotation.x=-.07;
  thighR.rotation.x=step*.31;thighL.rotation.x=-step*.31;kneeR.rotation.x=Math.max(0,-step)*.35;kneeL.rotation.x=Math.max(0,step)*.35;
  shoulderR.rotation.x=-.25-step*.10;shoulderL.rotation.x=-.10+step*.17;elbowR.rotation.x=-.15;elbowL.rotation.x=-.16;
  skirtR.rotation.x=-step*.12;skirtL.rotation.x=step*.12;skirtR.rotation.z=-.08-Math.abs(step)*.04;skirtL.rotation.z=.08+Math.abs(step)*.04;
  head.rotation.y=Math.sin(time*.75)*.05;
  if(active){
   // Fast backward impulse, then controlled .30s recovery. The mask and shoulders
   // react first, blade drops, knees absorb impact; no glowing hit-only stand-in.
   const kick=hp<.24?smooth(hp/.24):1-smooth((hp-.24)/.76);
   const shake=Math.sin(hp*Math.PI*7)*(1-hp)*.055;
   hips.position.y-=kick*.075;spine.rotation.x=-kick*.24;chest.rotation.x-=kick*.29;chest.rotation.z=hitSide*kick*.13+shake;
   head.rotation.x-=kick*.21;head.rotation.z=-hitSide*kick*.12-shake;
   shoulderR.rotation.x+=kick*.40;shoulderL.rotation.x+=kick*.34;elbowR.rotation.x-=kick*.22;
   kneeR.rotation.x+=kick*.18;kneeL.rotation.x+=kick*.20;
  }
  deathAmount=lerp(deathAmount,dead?1:0,1-Math.exp(-Math.max(0,dt)*9));
  if(deathAmount>.001){hips.position.y-=deathAmount*.39;spine.rotation.x-=deathAmount*.27;chest.rotation.z+=deathAmount*.27;kneeR.rotation.x+=deathAmount*.9;kneeL.rotation.x+=deathAmount*.75;head.rotation.x+=deathAmount*.24;}
  group.updateMatrixWorld(true);mesh.skeleton.update();
 }
 update(0);
 return {group,update,hit,stats,mesh,bones,materials};
}
