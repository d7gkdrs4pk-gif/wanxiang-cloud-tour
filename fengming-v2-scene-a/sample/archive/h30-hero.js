/** 林砚 · original low-poly articulated male swordsman, authored for this project.
 * No external character/animation asset. Native Three.js SkinnedMesh, 7 materials.
 * Facing +Z. Bind-pose height 1.485 (H29 original head top 1.47).
 * Attack: .78s suggested; hit at normalized progress .44. All poses remain readable without FX.
 */
import * as T from 'three';

const C={red:0x9e3029,redLight:0xb34b38,redDark:0x64262a,ink:0x202d38,blue:0x354650,black:0x15202b,skin:0xc99d7d,skinLight:0xe0bb96,gold:0xc69b54,ivory:0xd8d1b7,silver:0xcbdadd,hair:0x111a26};
const ease=t=>t*t*(3-2*t);
const lerp=T.MathUtils.lerp;

export function createHero(){
 const group=new T.Group();group.name='林砚-男主-持剑';
 const mat=(roughness,metalness=0)=>new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness,metalness});
 const materials=[mat(.91),mat(.86),mat(.81),mat(.87),mat(.57,.68),mat(.32,.78),mat(.56)];
 materials.forEach((m,i)=>m.name=['朱红织衣','玄色内衫与靴','肤色','米色交领','旧凤金','剑锋钢','束发墨色'][i]);
 const arrays=materials.map(()=>({p:[],n:[],c:[],uv:[],si:[],sw:[],idx:[]}));
 const bones=[],bi={};
 function bone(name,parent,position){const b=new T.Bone();b.name=name;b.position.set(...position);bi[name]=bones.length;bones.push(b);if(parent)parent.add(b);return b;}
 const root=bone('root',null,[0,0,0]);
 const hips=bone('hips',root,[0,.70,0]);
 const spine=bone('spine',hips,[0,.17,0]);
 const chest=bone('chest',spine,[0,.22,0]);
 const head=bone('head',chest,[0,.19,0]);
 const hair=bone('hairTail',head,[0,.105,-.075]);
 const rs=bone('rightShoulder',chest,[-.245,.005,0]);
 const re=bone('rightElbow',rs,[-.06,-.225,.015]);
 const rw=bone('rightWrist',re,[-.015,-.205,.045]);
 const ls=bone('leftShoulder',chest,[.245,.005,0]);
 const le=bone('leftElbow',ls,[.06,-.225,.015]);
 const lw=bone('leftWrist',le,[.015,-.205,.035]);
 const rt=bone('rightThigh',hips,[-.105,-.02,0]);
 const rk=bone('rightKnee',rt,[0,-.285,0]);
 const ra=bone('rightAnkle',rk,[0,-.295,0]);
 const lt=bone('leftThigh',hips,[.105,-.02,0]);
 const lk=bone('leftKnee',lt,[0,-.285,0]);
 const la=bone('leftAnkle',lk,[0,-.295,0]);
 const frontR=bone('rightRobe',hips,[-.11,0,.055]);
 const frontL=bone('leftRobe',hips,[.11,0,.055]);
 const backR=bone('rightBackHem',hips,[-.11,0,-.07]);
 const backL=bone('leftBackHem',hips,[.11,0,-.07]);
 group.add(root);group.updateMatrixWorld(true);
 function add(geo,material,boneName,color){
  const a=arrays[material],p=geo.attributes.position,n=geo.attributes.normal,u=geo.attributes.uv,offset=a.p.length/3,col=new T.Color(color),boneIndex=bi[boneName];
  for(let i=0;i<p.count;i++){
   a.p.push(p.getX(i),p.getY(i),p.getZ(i));a.n.push(n?.getX(i)||0,n?.getY(i)||1,n?.getZ(i)||0);
   const shade=.98+.025*Math.sin(p.getY(i)*43+p.getX(i)*27+p.getZ(i)*31);
   a.c.push(col.r*shade,col.g*shade,col.b*shade);a.uv.push(u?.getX(i)||0,u?.getY(i)||0);a.si.push(boneIndex,0,0,0);a.sw.push(1,0,0,0);
  }
  const I=geo.index;if(I)for(let i=0;i<I.count;i++)a.idx.push(offset+I.getX(i));else for(let i=0;i<p.count;i++)a.idx.push(offset+i);
  geo.dispose();
 }
 function box(w,h,d,x,y,z,m,b,c,rotation){let g=new T.BoxGeometry(w,h,d,1,1,1);if(rotation)g.rotateZ(rotation);g.translate(x,y,z);add(g,m,b,c);}
 function ellipsoid(rx,ry,rz,x,y,z,m,b,c,detail=1){const g=new T.IcosahedronGeometry(1,detail);g.scale(rx,ry,rz);g.translate(x,y,z);add(g,m,b,c);}
 function tube(points,radii,m,b,c,sides=8){
  const path=points.map(p=>new T.Vector3(...p)),curve=new T.CatmullRomCurve3(path),steps=Math.max(3,(points.length-1)*3),frames=curve.computeFrenetFrames(steps,false),p=[],idx=[];
  for(let i=0;i<=steps;i++){
   const t=i/steps,P=curve.getPoint(t),q=t*(radii.length-1),j=Math.min(radii.length-2,Math.floor(q)),r=lerp(radii[j],radii[j+1],q-j);
   for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2,v=P.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);p.push(v.x,v.y,v.z);}
  }
  for(let i=0;i<steps;i++)for(let k=0;k<sides;k++){let a=i*(sides+1)+k,v=a+sides+1;idx.push(a,v,a+1,v,v+1,a+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();add(g,m,b,c);
 }
 function ringBody(rings,m,b,c,sides=8){
  const p=[],idx=[];
  for(const [y,rx,rz,z0=0] of rings)for(let k=0;k<sides;k++){const a=k/sides*Math.PI*2+Math.PI/8;p.push(Math.cos(a)*rx,y,Math.sin(a)*rz+z0);}
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<sides;k++){const a=j*sides+k,v=j*sides+(k+1)%sides;idx.push(a,a+sides,v,v,a+sides,v+sides);}
  for(let k=1;k<sides-1;k++){idx.push(0,k+1,k);let a=(rings.length-1)*sides;idx.push(a,a+k,a+k+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();add(g,m,b,c);
 }
 function panel(points,depth,m,b,c){
  const shape=new T.Shape();shape.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)shape.lineTo(points[i][0],points[i][1]);shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1});add(g,m,b,c);
 }
 // Grounded legs/boots: shaped independent thighs, knee and ankle rather than a conical body.
 for(const [x,thigh,knee,ankle] of [[-.105,'rightThigh','rightKnee','rightAnkle'],[.105,'leftThigh','leftKnee','leftAnkle']]){
  ringBody([[.395,.058,.058],[.49,.072,.064],[.67,.079,.073]],1,thigh,C.ink);
  // translate ring legs in x (single-bone geometry coordinates must be authored in bind space)
  const a=arrays[1]; // move only the newly appended ring vertices into each leg's bind-space X
  const count=3*8;for(let i=a.p.length/3-count;i<a.p.length/3;i++)a.p[i*3]+=x;
  tube([[x,.41,.01],[x,.27,.018],[x,.105,.018]],[.059,.052,.047],1,knee,C.blue,8);
  box(.125,.105,.225,x,.061,.065,1,ankle,C.black);
  box(.129,.022,.23,x,.018,.068,1,ankle,0x151c23);
  box(.108,.027,.09,x,.132,.015,4,knee,C.gold);
 }
 // Tailored black inner tunic, broad shoulder/back plane and red outer vest.
 ringBody([[.70,.17,.105],[.84,.18,.12],[1.03,.235,.125],[1.13,.205,.11]],1,'spine',C.ink,8);
 ringBody([[.75,.178,.113],[.91,.204,.134],[1.10,.235,.122],[1.145,.195,.105]],0,'chest',C.red,8);
 // Red back shoulder mantle, angular taper and center fold; visible at overhead game camera.
 panel([[-.255,1.12],[-.18,1.18],[.18,1.18],[.255,1.12],[.20,.96],[.06,.92],[-.06,.92],[-.20,.96]],.045,0,'chest',C.redDark);
 // The panel is XY, move its front/back placement behind the torso.
 box(.43,.105,.10,0,1.115,-.115,0,'chest',C.redLight);
 box(.29,.13,.022,0,1.05,-.15,0,'chest',C.redDark);
 // Ivory cross-collar lapels frame an adult neck, not a gold sphere.
 box(.063,.30,.025,-.055,1.045,.136,3,'chest',C.ivory,-.38);
 box(.056,.25,.027,.045,1.07,.15,3,'chest',C.ivory,.34);
 box(.036,.31,.032,-.087,1.025,.153,0,'chest',C.redLight,-.38);
 // Phoenix embroidery abstracted into three long gold strokes on back shoulder.
 for(let i=0;i<3;i++)box(.018,.15-i*.025,.016,-.11+i*.055,1.075-i*.014,-.17,4,'chest',C.gold,-.35+i*.13);
 // Four separate weighted coat leaves, with front split exposing boots and trouser stride.
 const frontPanels=[
  {b:'rightRobe',p:[[-.18,.73],[-.03,.73],[-.055,.29],[-.29,.25],[-.265,.48]],c:C.red},
  {b:'leftRobe',p:[[.03,.73],[.18,.73],[.265,.48],[.29,.25],[.055,.29]],c:C.redLight}
 ];
 for(const q of frontPanels){
  const start=arrays[0].p.length/3;panel(q.p,.028,0,q.b,q.c);
  for(let i=start;i<arrays[0].p.length/3;i++)arrays[0].p[i*3+2]+=.115;
  const x=q.b==='rightRobe'?-.265:.265;
  tube([[x*.65,.70,.151],[x*.87,.47,.155],[x,.28,.151]],[.011,.009,.008],4,q.b,C.gold,5);
 }
 for(const [side,b] of [[-1,'rightBackHem'],[1,'leftBackHem']]){
  const pts=[[side*.02,.73],[side*.18,.73],[side*.31,.28],[side*.075,.22]];
  const start=arrays[0].p.length/3;panel(pts,.025,0,b,C.redDark);for(let i=start;i<arrays[0].p.length/3;i++)arrays[0].p[i*3+2]-=.16;
  tube([[side*.13,.68,-.182],[side*.19,.44,-.184],[side*.27,.28,-.184]],[.009,.009,.007],4,b,C.gold,5);
 }
 // Central inner robe is a slim pale triangle seen only through the coat opening.
 {const start=arrays[3].p.length/3;panel([[-.045,.71],[.045,.71],[.07,.33],[-.07,.33]],.017,3,'hips',0xbdbda9);for(let i=start;i<arrays[3].p.length/3;i++)arrays[3].p[i*3+2]+=.105;}
 // Waist sash and hanging bell identity of 铃师林砚.
 ringBody([[.70,.19,.135],[.77,.19,.135]],1,'hips',C.black,8);
 box(.11,.08,.027,0,.742,.155,4,'hips',C.gold);
 box(.06,.043,.032,0,.742,.174,0,'hips',C.redDark);
 for(const [x,y,z] of [[.195,.665,.12],[.215,.61,.115]]){
  tube([[x,.73,z],[x,y+.025,z]],[.008,.008],4,'hips',C.gold,5);
  ellipsoid(.033,.036,.033,x,y,z,4,'hips',C.gold,1);
  box(.031,.007,.006,x,y-.016,z+.032,1,'hips',C.black);
 }
 // Long red tassel on left waist, separate from coat to read when turning.
 box(.032,.20,.017,.19,.55,.135,0,'hips',C.redLight,-.08);
 // Articulated sleeves, visible forearms/cuffs and natural skin hands.
 for(const [sign,shoulder,elbow,wrist] of [[-1,'rightShoulder','rightElbow','rightWrist'],[1,'leftShoulder','leftElbow','leftWrist']]){
  tube([[sign*.245,1.105,0],[sign*.285,.99,.005],[sign*.305,.875,.015]],[.105,.089,.065],0,shoulder,sign<0?C.redLight:C.red,9);
  ellipsoid(.105,.063,.117,sign*.25,1.104,-.008,0,shoulder,C.redDark,1);
  tube([[sign*.305,.88,.015],[sign*.315,.78,.045],[sign*.32,.69,.06]],[.062,.047,.042],1,elbow,C.ink,8);
  box(.088,.058,.086,sign*.32,.716,.058,4,elbow,C.gold);
  ellipsoid(.044,.056,.040,sign*.32,.649,.063,2,wrist,C.skinLight,1);
  // Separate curled thumb makes the sword hand read as a grip.
  ellipsoid(.023,.028,.028,sign*.283,.646,.085,2,wrist,C.skin,0);
 }
 // Neck and angular adult male face: jaw, cheek planes, brow and nose.
 tube([[0,1.12,.006],[0,1.235,.008]],[.064,.065],2,'head',C.skin,8);
 ringBody([[1.195,.060,.061,.024],[1.227,.082,.077,.015],[1.285,.102,.087,.006],[1.345,.100,.087,0],[1.386,.078,.072,-.005]],2,'head',C.skinLight,10);
 // Nose wedge faces +Z.
 {const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.014,1.288,.087,.014,1.288,.087,0,1.255,.126,-.014,1.256,.089,0,1.255,.126,.014,1.288,.087,.014,1.256,.089,0,1.255,.126,-.014,1.256,.089],3));g.computeVertexNormals();add(g,2,'head',C.skin);}
 for(const x of [-.041,.041]){
  box(.035,.009,.007,x,1.295,.088,6,'head',C.hair);
  box(.040,.009,.007,x,1.315,.086,6,'head',C.hair,x<0?-.10:.10);
 }
 box(.039,.007,.005,0,1.228,.086,2,'head',0x8d6554);
 // Sculpted hair cap with center hairline, back fall and compact tied crown.
 ringBody([[1.327,.106,.093,-.015],[1.38,.104,.095,-.012],[1.424,.078,.077,-.015]],6,'head',C.hair,10);
 // Sideburn strips and swept front lock keep the face male and readable in a turn.
 box(.025,.115,.034,-.094,1.292,.012,6,'head',C.hair,-.05);
 box(.025,.115,.034,.094,1.292,.012,6,'head',C.hair,.05);
 tube([[-.08,1.398,.055],[-.01,1.409,.075],[.085,1.35,.059]],[.035,.035,.018],6,'head',C.hair,7);
 ringBody([[1.414,.051,.050,-.038],[1.46,.057,.052,-.038],[1.485,.041,.037,-.038]],6,'head',C.hair,8);
 ringBody([[1.432,.060,.055,-.038],[1.446,.060,.055,-.038]],4,'head',C.gold,8);
 // Hairpin, slim red ribbons and tapered ponytail: no spherical hairstyle pods.
 box(.20,.013,.014,0,1.447,-.035,4,'head',C.gold,.08);
 tube([[0,1.39,-.095],[.018,1.28,-.134],[.045,1.14,-.14],[.028,1.08,-.12]],[.047,.044,.035,.014],6,'hairTail',C.hair,7);
 tube([[-.035,1.425,-.07],[-.07,1.31,-.16],[-.09,1.23,-.18]],[.013,.011,.006],0,'hairTail',C.redLight,5);
 tube([[.035,1.425,-.07],[.075,1.32,-.17],[.11,1.27,-.20]],[.013,.010,.006],0,'hairTail',C.red,5);
 // Merge material buckets into one skinned body, retaining only 7 draw groups.
 const combined={p:[],n:[],c:[],uv:[],si:[],sw:[],idx:[]},geometry=new T.BufferGeometry();
 for(let mi=0;mi<arrays.length;mi++){
  const a=arrays[mi],base=combined.p.length/3,start=combined.idx.length;
  for(const k of ['p','n','c','uv','si','sw'])combined[k].push(...a[k]);for(const i of a.idx)combined.idx.push(base+i);
  if(a.idx.length)geometry.addGroup(start,a.idx.length,mi);
 }
 geometry.setAttribute('position',new T.Float32BufferAttribute(combined.p,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(combined.n,3));geometry.setAttribute('color',new T.Float32BufferAttribute(combined.c,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(combined.uv,2));geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(combined.si,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(combined.sw,4));geometry.setIndex(combined.idx);geometry.computeBoundingSphere();
 const body=new T.SkinnedMesh(geometry,materials);body.name='林砚-分片袍服与束发';body.frustumCulled=false;body.castShadow=true;body.receiveShadow=true;group.add(body);group.updateMatrixWorld(true);body.bind(new T.Skeleton(bones));
 // Independently modeled long sword: faceted double edged blade, phoenix-wing guard.
 const sword=new T.Group();sword.name='独立悬铃凤刃';rw.add(sword);sword.position.set(0,-.035,.015);
 const swordArrays=materials.map(()=>({p:[],n:[],c:[],uv:[],si:[],sw:[],idx:[]}));
 // Independent geometry helper: body bucket temporarily redirected, with all skin weights ignored.
 const saved=arrays.map((a,i)=>a);for(let i=0;i<arrays.length;i++)arrays[i]=swordArrays[i];
 // flat diamond cross-section, discernible ridge and needle point
 {const p=[],idx=[],rings=[[.085,.042,.010],[.21,.045,.010],[1.12,.027,.008],[1.33,0,.001]];
  for(const [z,w,h] of rings)p.push(-w,0,z,0,h,z,w,0,z,0,-h,z);
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<4;k++){let a=j*4+k,b=j*4+(k+1)%4;idx.push(a,a+4,b,b,a+4,b+4);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();add(g,5,'rightWrist',C.silver);
 }
 box(.045,.037,.24,0,0,-.065,1,'rightWrist',C.black);
 for(let i=0;i<5;i++)box(.051,.043,.009,0,0,-.165+i*.043,4,'rightWrist',C.gold);
 // Sweeping winged guard seen from above as a characteristic asymmetric crossbar.
 tube([[-.155,0,.12],[-.085,0,.07],[0,0,.075],[.085,0,.07],[.155,0,.12]],[.013,.025,.026,.025,.013],4,'rightWrist',C.gold,6);
 ellipsoid(.041,.025,.043,0,0,-.215,4,'rightWrist',C.gold,1);
 box(.027,.019,.007,0,0,-.247,1,'rightWrist',C.black);
 for(let mi=0;mi<swordArrays.length;mi++){
  const a=swordArrays[mi];if(!a.p.length)continue;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(a.n,3));g.setAttribute('color',new T.Float32BufferAttribute(a.c,3));g.setIndex(a.idx);const m=new T.Mesh(g,materials[mi]);m.name=mi===5?'凤刃-实体剑锋':'凤刃-护手与缠柄';m.castShadow=true;sword.add(m);
 }
 for(let i=0;i<arrays.length;i++)arrays[i]=saved[i];
 let time=0,walk=0,moveBlend=0,turnLean=0,attackPhase=null,lastWorldYaw=null;const turnQuaternion=new T.Quaternion();
 function pose(p,keys){
  if(p<=keys[0][0])return keys[0].slice(1);
  for(let i=1;i<keys.length;i++)if(p<=keys[i][0]){const a=keys[i-1],b=keys[i],t=ease((p-a[0])/(b[0]-a[0]));return a.slice(1).map((v,k)=>lerp(v,b[k+1],t));}
  return keys[keys.length-1].slice(1);
 }
 const bladeKeys=[[0,-.397,.218],[.16,-1.35,.35],[.28,-1.95,.50],[.42,-.18,.08],[.50,.65,-.10],[.61,1.55,-.15],[.86,.30,-.10],[1,-.397,.218]];
 const attackKeys=[
  [0,-.20,-.12,-.10,-.22,.10,-.12,0],
  [.28,-1.18,-.83,-.43,-.84,.52,-.66,.28],
  [.46,-.86,.38,.34,-.24,-.20,.42,-.34],
  [.61,-.36,.83,.64,-.12,-.28,.72,-.52],
  [1,-.20,-.12,-.10,-.22,.10,-.12,0]
 ];
 function update(dt,state={}){
  time+=Math.max(0,dt);const moving=!!state.moving;const speed=state.speed??(moving?1:0);moveBlend=lerp(moveBlend,moving?1:0,1-Math.exp(-dt*12));walk+=dt*(7.4+Math.min(1.5,speed)*1.8)*moveBlend;
  group.getWorldQuaternion(turnQuaternion);const worldYaw=Math.atan2(2*(turnQuaternion.w*turnQuaternion.y+turnQuaternion.x*turnQuaternion.z),1-2*(turnQuaternion.y*turnQuaternion.y+turnQuaternion.x*turnQuaternion.x));
  const automaticTurn=lastWorldYaw===null||dt<=0?0:Math.atan2(Math.sin(worldYaw-lastWorldYaw),Math.cos(worldYaw-lastWorldYaw))/dt*.12;lastWorldYaw=worldYaw;
  turnLean=lerp(turnLean,T.MathUtils.clamp(state.turn??automaticTurn,-1,1),1-Math.exp(-dt*9));
  const gait=Math.sin(walk),gait2=Math.sin(walk+Math.PI),breathe=Math.sin(time*2.6);
  hips.position.y=.70+.011*breathe*(1-moveBlend)+Math.abs(Math.sin(walk))*moveBlend*.018;
  hips.rotation.set(0,Math.sin(walk)*.025*moveBlend,-turnLean*.055);
  spine.rotation.set(.025*moveBlend,Math.sin(walk)*.035*moveBlend,turnLean*.05);
  chest.rotation.set(0,Math.sin(walk)*-.045*moveBlend,0);head.rotation.set(-.035*moveBlend,-turnLean*.10,0);
  rt.rotation.set(gait*.49*moveBlend,0,0);lt.rotation.set(gait2*.49*moveBlend,0,0);
  rk.rotation.x=Math.max(0,-gait)*.68*moveBlend;lk.rotation.x=Math.max(0,-gait2)*.68*moveBlend;
  ra.rotation.x=-Math.max(0,gait)*.12*moveBlend;la.rotation.x=-Math.max(0,gait2)*.12*moveBlend;
  frontR.rotation.set(-.09-Math.max(0,gait)*.20*moveBlend,turnLean*.08,-.025);frontL.rotation.set(-.09-Math.max(0,gait2)*.20*moveBlend,turnLean*.08,.025);
  backR.rotation.set(.06+Math.max(0,-gait)*.24*moveBlend,-turnLean*.08,-.04);backL.rotation.set(.06+Math.max(0,-gait2)*.24*moveBlend,-turnLean*.08,.04);
  rs.rotation.set(-.20+gait2*.20*moveBlend,-.12,-.10);re.rotation.set(-.22,0,0);rw.rotation.set(.10,-.12,0);
  ls.rotation.set(.04+gait*.32*moveBlend,.08,.08);le.rotation.set(-.17-Math.max(0,-gait)*.15*moveBlend,0,0);lw.rotation.set(0,0,0);
  hair.rotation.set(Math.sin(walk+.6)*.08*moveBlend+.015*breathe,-turnLean*.18,Math.sin(walk)*.035*moveBlend);
  sword.rotation.set(.11,-.15,-.10);
  attackPhase=state.attackProgress;
  if(Number.isFinite(attackPhase)&&attackPhase>=0&&attackPhase<1){
   const q=pose(attackPhase,attackKeys);rs.rotation.set(q[0],q[1],q[2]);re.rotation.x=q[3];rw.rotation.set(q[4],q[5],0);chest.rotation.y=q[6];spine.rotation.x=attackPhase<.28?-.05:.07;
   ls.rotation.set(-.45,0,.15);le.rotation.x=-.55;
   rt.rotation.x=-.12;lt.rotation.x=.13;rk.rotation.x=.10;lk.rotation.x=.10;
   frontR.rotation.x=-.14;frontL.rotation.x=-.10;backR.rotation.x=.15;backL.rotation.x=.09;
   // Aim the physical wrist/blade through a readable right-to-front-to-left cut.
   // Arm joints still raise/retract the hand; this removes a near-vertical guard
   // pose at the damage frame and keeps the actual blade axis on the hit arc.
   const blade=pose(attackPhase,bladeKeys),direction=new T.Vector3(Math.sin(blade[0])*Math.cos(blade[1]),Math.sin(blade[1]),Math.cos(blade[0])*Math.cos(blade[1]));
   group.updateWorldMatrix(true,true);
   const desiredWorld=group.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),direction));
   rw.quaternion.copy(re.getWorldQuaternion(new T.Quaternion()).invert().multiply(desiredWorld));sword.rotation.set(0,0,0);
  }
 }
 update(0,{});group.updateMatrixWorld(true);
 const stats={triangles:geometry.index.count/3+swordArrays.reduce((n,a)=>n+a.idx.length/3,0),materials:7,bones:bones.length,height:1.485,attackDuration:.78,hitProgress:.44,authorship:'Original geometry and animation authored in code for 凤鸣山门; no third-party character asset.'};
 return {group,body,sword,update,stats,attackDuration:.78,hitProgress:.44,swordTipWorld:(out=new T.Vector3())=>sword.localToWorld(out.set(0,0,1.33)),bladeBaseWorld:(out=new T.Vector3())=>sword.localToWorld(out.set(0,0,.09)),getAttackProgress:()=>attackPhase};
}
