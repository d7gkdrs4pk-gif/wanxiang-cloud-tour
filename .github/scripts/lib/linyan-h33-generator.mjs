/** 林砚 H33 · silhouette-sculpted articulated male swordsman, authored for this project.
 * No external character/animation asset. Native Three.js SkinnedMesh, 7 materials.
 * Facing +Z. Bind-pose height 1.485 (H29 original head top 1.47).
 * Attack: .78s suggested; hit at normalized progress .44. All poses remain readable without FX.
 */
import * as T from '../../../fengming-v2-scene-a/vendor/three/three.module.js';

const C={red:0xa83b30,redLight:0xb64a35,redDark:0x742c2c,ink:0x27363a,blue:0x34494a,black:0x1d292d,skin:0xc39572,skinLight:0xd5ad85,gold:0xa58450,ivory:0xd4cab1,silver:0xbdcec8,hair:0x101d23};
const ease=t=>t*t*(3-2*t);
const lerp=T.MathUtils.lerp;

export function createHero(){
 const group=new T.Group();group.name='林砚-男主-持剑';
 const mat=(roughness,metalness=0)=>new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness,metalness});
 const materials=[mat(.96),mat(.96),mat(.94),mat(.97),mat(.84,.08),mat(.78,.16),mat(.96)];
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
  const a=arrays[material],p=geo.attributes.position,n=geo.attributes.normal,u=geo.attributes.uv,V=geo.attributes.color,SI=geo.attributes.skinIndex,SW=geo.attributes.skinWeight,offset=a.p.length/3,col=new T.Color(color),boneIndex=bi[boneName];
  for(let i=0;i<p.count;i++){
   a.p.push(p.getX(i),p.getY(i),p.getZ(i));a.n.push(n?.getX(i)||0,n?.getY(i)||1,n?.getZ(i)||0);
   const shade=.97+.025*Math.sin(p.getY(i)*3.2+p.getZ(i)*2.1);
   a.c.push(col.r*shade*(V?.getX(i)??1),col.g*shade*(V?.getY(i)??1),col.b*shade*(V?.getZ(i)??1));a.uv.push(u?.getX(i)||0,u?.getY(i)||0);if(SI&&SW){a.si.push(SI.getX(i),SI.getY(i),SI.getZ(i),SI.getW(i));a.sw.push(SW.getX(i),SW.getY(i),SW.getZ(i),SW.getW(i));}else{a.si.push(boneIndex,0,0,0);a.sw.push(1,0,0,0);}
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
 // H31 continuous upper cloth, sculpted soft shoulder/sleeve connection.
 add(createSmoothShirt(T,bi,{resolution:[22,19,13]}),0,'chest',C.red);
 // Proper paired trousers and rounded leather boots, no box feet.
 for(const [x,thigh,knee,ankle] of [[-.105,'rightThigh','rightKnee','rightAnkle'],[.105,'leftThigh','leftKnee','leftAnkle']]){
  tube([[x,.67,0],[x,.52,.006],[x,.395,.012]],[.071,.065,.057],1,thigh,C.ink,12);
  tube([[x,.405,.012],[x,.27,.018],[x,.105,.02]],[.058,.051,.046],1,knee,C.blue,12);
  add(roundedBoot(T,x),1,ankle,C.black);
 }
 // Sewn cross collar follows the chest rather than two rectangular neckties.
 add(curvedBand(T,[[-.087,1.15,.152],[-.054,1.086,.177],[.018,.94,.171]],.064),3,'chest',C.ivory);
 add(curvedBand(T,[[.088,1.15,.152],[.058,1.075,.177],[-.046,.94,.174]],.060),3,'chest',0xcac6b1);
 add(curvedBand(T,[[-.115,1.14,.143],[-.081,1.06,.164],[-.006,.91,.157]],.021),0,'chest',C.redLight);
 // A single soft back yoke gives a broad quiet shoulder plane in the game view.
 // Main robe panels are curved, thick and vertically pleated, with continuous
 // hip/thigh/hem weights; they bend with a stride instead of rotating as cards.
 for(const [a0,a1,hem,thigh] of [[.33,Math.PI-.16,'leftRobe','leftThigh'],[Math.PI+.16,Math.PI*2-.33,'rightRobe','rightThigh']]){
  add(drapedRobe(T,bi,{a0,a1,hem,thigh}),0,hem,a0<1?C.redLight:C.red);
 }
 // Narrow inner robe supplies an under-layer visible through the front split.
 add(drapedRobe(T,bi,{a0:-.17,a1:.17,hem:'leftRobe',thigh:'leftThigh',inner:true}),1,'hips',C.ink);
 // Waist sash and hanging bell identity of 铃师林砚.
 ringBody([[.70,.19,.135],[.77,.19,.135]],1,'hips',C.black,8);
 ellipsoid(.053,.032,.015,0,.742,.158,4,'hips',C.gold,2);
 ellipsoid(.030,.017,.016,0,.742,.169,0,'hips',C.redDark,1);
 for(const [x,y,z] of [[.195,.665,.12],[.215,.61,.115]]){
  tube([[x,.73,z],[x,y+.025,z]],[.008,.008],4,'hips',C.gold,5);
  ellipsoid(.033,.036,.033,x,y,z,4,'hips',C.gold,1);
  box(.031,.007,.006,x,y-.016,z+.032,1,'hips',C.black);
 }
 // Long red tassel on left waist, separate from coat to read when turning.
 add(curvedBand(T,[[.19,.67,.135],[.205,.57,.146],[.18,.46,.14]],.029),0,'hips',C.redDark);
 // Cuffs flow into the hand, without boxed gauntlet blocks. Upper sleeves
 // are already part of the seamless implicit cloth surface above.
 for(const [sign,shoulder,elbow,wrist] of [[-1,'rightShoulder','rightElbow','rightWrist'],[1,'leftShoulder','leftElbow','leftWrist']]){
  tube([[sign*.305,.89,.015],[sign*.315,.78,.045],[sign*.32,.69,.06]],[.061,.049,.043],1,elbow,C.ink,12);
  tube([[sign*.318,.729,.055],[sign*.320,.712,.059]],[.047,.047],4,elbow,C.gold,12);
  add(softHand(T,sign),2,wrist,C.skinLight);
 }
 // H31 adult male face: rounded continuous jaw/cheek volume, large clean
 // warm facial plane and restrained brow/nose, rather than tiny block noise.
 tube([[0,1.125,.006],[0,1.252,.008]],[.049,.051],2,'head',C.skin,14);
 add(maleHead(T),2,'head',C.skinLight);
 add(curvedBand(T,[[-.065,1.307,.111],[-.040,1.315,.116],[-.018,1.31,.119]],.009),6,'head',C.hair);
 add(curvedBand(T,[[.018,1.31,.119],[.040,1.315,.116],[.065,1.307,.111]],.009),6,'head',C.hair);
 tube([[0,1.302,.106],[0,1.275,.130],[0,1.253,.127]],[.012,.013,.010],2,'head',C.skin,8);
 add(curvedBand(T,[[-.025,1.229,.105],[0,1.225,.110],[.025,1.229,.105]],.006),2,'head',0x946c5a);
 // Hair is one swept continuous cap, a compact soft topknot and one clean tail.
 add(sweptHair(T),6,'head',C.hair);
 add(softBun(T),6,'head',C.hair);
 ringBody([[1.436,.057,.051,-.037],[1.448,.057,.051,-.037]],4,'head',C.gold,20);
 add(sweptLock(T),6,'hairTail',C.hair);
 add(curvedBand(T,[[-.032,1.425,-.074],[-.057,1.33,-.182],[-.083,1.23,-.294]],.013),0,'hairTail',C.redDark);
 
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
 {const p=[],idx=[],rings=[[.085,.058,.015],[.23,.062,.016],[1.10,.030,.011]];
  for(const [z,w,h] of rings)p.push(-w,0,z,0,h,z,w,0,z,0,-h,z);
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<4;k++){let a=j*4+k,b=j*4+(k+1)%4;idx.push(a,a+4,b,b,a+4,b+4);}
  const tipIndex=p.length/3;p.push(0,0,1.33);for(let k=0;k<4;k++)idx.push(8+k,tipIndex,8+(k+1)%4);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();add(flat,5,'rightWrist',C.silver);
 }
 box(.045,.037,.24,0,0,-.065,1,'rightWrist',C.black);
 for(let i=0;i<5;i++)box(.051,.043,.009,0,0,-.165+i*.043,4,'rightWrist',C.gold);
 // Sweeping winged guard seen from above as a characteristic asymmetric crossbar.
 tube([[-.18,0,.15],[-.105,0,.085],[0,0,.075],[.095,0,.08],[.18,0,.13]],[.010,.023,.026,.023,.010],4,'rightWrist',C.gold,8);
 ellipsoid(.041,.025,.043,0,0,-.215,4,'rightWrist',C.gold,1);
 box(.027,.019,.007,0,0,-.247,1,'rightWrist',C.black);
 for(let mi=0;mi<swordArrays.length;mi++){
  const a=swordArrays[mi];if(!a.p.length)continue;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(a.n,3));g.setAttribute('color',new T.Float32BufferAttribute(a.c,3));g.setIndex(a.idx);const m=new T.Mesh(g,materials[mi]);m.name=mi===5?'凤刃-实体剑锋':'凤刃-护手与缠柄';m.castShadow=true;sword.add(m);
 }
 for(let i=0;i<arrays.length;i++)arrays[i]=saved[i];
 let time=0,walk=0,moveBlend=0,turnLean=0,attackPhase=null,lastWorldYaw=null;
 const turnQuaternion=new T.Quaternion(),wristNext=new T.Quaternion();
 function pose(p,keys){
  if(p<=keys[0][0])return keys[0].slice(1);
  for(let i=1;i<keys.length;i++)if(p<=keys[i][0]){const a=keys[i-1],b=keys[i],t=ease((p-a[0])/(b[0]-a[0]));return a.slice(1).map((v,k)=>lerp(v,b[k+1],t));}
  return keys[keys.length-1].slice(1);
 }
 // Offline-authored local hand quaternion clip. The blade is an ordinary
 // child of the hand bone throughout the motion; no frame-time world aiming.
 const wristKeys=[[0,0.18839637959053723,-0.06868417230161787,-0.013209328859676513,0.9795993069941897],[0.02,0.1879861757721526,-0.07232901548384243,0.0011996644060715007,0.9795040949597977],[0.04,0.1883105995580904,-0.09482902098947696,0.030891763073071267,0.9770323811657866],[0.06,0.19807938674248238,-0.1482935316972449,0.05294794501462564,0.9674554770754097],[0.08,0.22959922983961895,-0.21837553824044645,0.046106604095041644,0.9473491959220064],[0.1,0.2795598660239857,-0.27028296026939386,0.0005653662883591654,0.9212996706054035],[0.12,0.3185258181346341,-0.2848037293824378,-0.06477353946759148,0.9017940604685516],[0.14,0.3397674865894512,-0.27250238514492187,-0.1190945889221503,0.8922538786895129],[0.16,0.36849809976183096,-0.2338466956169687,-0.15643993939991369,0.8860312741554305],[0.18,0.3857491856681581,-0.1946774404948914,-0.19168998376319393,0.8812225655551371],[0.2,0.3698639259950499,-0.174171318112234,-0.2356475786629663,0.8816661765457813],[0.22,0.3285870566560179,-0.16295829994440403,-0.2741095384950056,0.8890101796849234],[0.24,0.2750310693195464,-0.15486804274391414,-0.2967494876745225,0.9012843845371584],[0.26,0.22771825818528188,-0.14817333232850685,-0.3030013211406019,0.9134436259905572],[0.28,0.20751652353860078,-0.14526589098700135,-0.302521218271236,0.9188664896871],[0.3,0.2527237942173028,-0.14341101585126026,-0.31411074352615864,0.9038243220728042],[0.32,0.3552332372011175,-0.1351305670436014,-0.3156810176774157,0.869421975864563],[0.34,0.474194849018331,-0.10802430637837634,-0.2582211841480897,0.8347405671543172],[0.36,0.5673738912463293,-0.056832496508186295,-0.13724180251767043,0.8099516173910302],[0.38,0.6017333241657751,0.009823903481975739,0.0027126699416571125,0.7986320422638766],[0.4,0.5826609423361221,0.07482592016930938,0.10619230162508746,0.8022658555755471],[0.42,0.5362579396903225,0.1027628277712665,0.13846470336306335,0.826253441306069],[0.44,0.49765645428312577,0.1421845279258658,0.1627615612177668,0.8400180282105858],[0.46,0.48482621587425206,0.23067540009466392,0.22066009451640575,0.8142736167162918],[0.48,0.46904662761998744,0.3033980320183255,0.2594417620232497,0.7878038254565635],[0.5,0.42982788534303307,0.30568614839432684,0.23006420067056058,0.8178474376258654],[0.52,0.37196023338756995,0.28718103681617324,0.17206670056403073,0.8657746169924709],[0.54,0.3211756904869153,0.3254047363832484,0.13015393987566776,0.8797828625941987],[0.56,0.29818639237797384,0.4028313886303701,0.10295365028760886,0.8591928151626934],[0.58,0.3009182814661979,0.48211870777133875,0.08718164954697519,0.8181742476261357],[0.6,0.3103331478349339,0.5284618771525766,0.07773825278516291,0.7863702345620327],[0.62,0.3116303900798399,0.5333135078625356,0.07654391308649992,0.7826903804694745],[0.64,0.30744702474276997,0.5212380944436497,0.0770600991043389,0.792369179741111],[0.66,0.30053173439860487,0.49858331445462556,0.07842695321942128,0.8092864561918266],[0.68,0.29258839265692543,0.4667650956824377,0.08090759411911366,0.8306481440109637],[0.7,0.2851468792876808,0.42747594101897807,0.08464339620416741,0.8536926101129497],[0.72,0.27934418694456115,0.38290459848907427,0.08969830266398748,0.8759595356952299],[0.74,0.2758502785504662,0.3357537476008561,0.0961603773727334,0.8955050120569646],[0.76,0.27488519972070524,0.28912747082694956,0.1042545721858903,0.9110293171825246],[0.78,0.2762799730199757,0.24636223619474132,0.11442529968145315,0.9218903817038218],[0.8,0.27954367021372506,0.21086229640848214,0.12736376640100827,0.9279929414628812],[0.82,0.28390837293492355,0.18597951677543623,0.1439714148351437,0.9295589743678379],[0.84,0.28189357623305517,0.17473972033947027,0.16509393763576807,0.92884123162688],[0.86,0.2699055854262619,0.17084842508761894,0.1829938905742499,0.9297714916113994],[0.88,0.24892372316697148,0.14209727883371753,0.17908094494141286,0.9411563943105503],[0.9,0.22547101269929193,0.08018642634218194,0.14756691209417105,0.9596650279747703],[0.92,0.20704142632003586,0.012946844953846036,0.10075796198438512,0.9730437092391376],[0.94,0.195415265345863,-0.03737295204991268,0.05323781261961063,0.9785611231968906],[0.96,0.18984063814942276,-0.06265407129020809,0.016158145828825216,0.9796805161792064],[0.98,0.18837960420343966,-0.06891042109884053,-0.005934590184387511,0.9796577255467744],[1,0.18839637959053723,-0.06868417230161787,-0.013209328859676513,0.9795993069941897]];
 function sampleWrist(p,out){
  if(p<=0)return out.fromArray(wristKeys[0],1);
  for(let i=1;i<wristKeys.length;i++)if(p<=wristKeys[i][0]){
   const a=wristKeys[i-1],b=wristKeys[i];return out.fromArray(a,1).slerp(wristNext.fromArray(b,1),(p-a[0])/(b[0]-a[0]));
  }
  return out.fromArray(wristKeys[wristKeys.length-1],1);
 }

 // Shoulder xyz, elbow x, wrist xy, chest yaw, spine pitch. Every channel
 // returns to the same held-sword idle pose instead of changing at a threshold.
 const attackKeys=[
  [0,-.25,-.16,-.37,-.46,.38,-.14,0,0],
  [.28,-1.20,-.80,-.48,-.88,.52,-.66,.25,-.055],
  [.46,-.80,.38,.34,-.24,-.20,.42,-.30,.07],
  [.61,-.36,.83,.58,-.15,-.28,.72,-.46,.035],
  [1,-.25,-.16,-.37,-.46,.38,-.14,0,0]
 ];
 function update(dt,state={}){
  time+=Math.max(0,dt);const moving=!!state.moving;const speed=state.speed??(moving?1:0);moveBlend=lerp(moveBlend,moving?1:0,1-Math.exp(-dt*12));walk+=dt*(7.4+Math.min(1.5,speed)*1.8)*moveBlend;
  group.getWorldQuaternion(turnQuaternion);const worldYaw=Math.atan2(2*(turnQuaternion.w*turnQuaternion.y+turnQuaternion.x*turnQuaternion.z),1-2*(turnQuaternion.y*turnQuaternion.y+turnQuaternion.x*turnQuaternion.x));
  const automaticTurn=lastWorldYaw===null||dt<=0?0:Math.atan2(Math.sin(worldYaw-lastWorldYaw),Math.cos(worldYaw-lastWorldYaw))/dt*.12;lastWorldYaw=worldYaw;
  turnLean=lerp(turnLean,T.MathUtils.clamp(state.turn??automaticTurn,-1,1),1-Math.exp(-dt*9));
  const gait=Math.sin(walk),gait2=Math.sin(walk+Math.PI),breathe=Math.sin(time*2.6);
  hips.position.y=.70+.008*breathe*(1-moveBlend)+Math.abs(Math.sin(walk))*moveBlend*.018;
  hips.rotation.set(0,Math.sin(walk)*.025*moveBlend,-turnLean*.055);
  spine.rotation.set(.025*moveBlend,Math.sin(walk)*.035*moveBlend,turnLean*.05);
  chest.rotation.set(0,Math.sin(walk)*-.045*moveBlend,0);head.rotation.set(-.055-.030*moveBlend,-turnLean*.10,0);
  rt.rotation.set(gait*.49*moveBlend,0,0);lt.rotation.set(gait2*.49*moveBlend,0,0);
  rk.rotation.x=Math.max(0,-gait)*.68*moveBlend;lk.rotation.x=Math.max(0,-gait2)*.68*moveBlend;
  ra.rotation.x=-Math.max(0,gait)*.12*moveBlend;la.rotation.x=-Math.max(0,gait2)*.12*moveBlend;
  frontR.rotation.set(-.10-Math.max(0,gait)*.20*moveBlend,turnLean*.08,-.04);frontL.rotation.set(-.08-Math.max(0,gait2)*.20*moveBlend,turnLean*.08,.035);
  backR.rotation.set(.08+Math.max(0,-gait)*.24*moveBlend,-turnLean*.08,-.045);backL.rotation.set(.065+Math.max(0,-gait2)*.24*moveBlend,-turnLean*.08,.04);
  // A bent sword arm holds the hand away from the narrow waist. The left
  // sleeve is relaxed, preserving the male shoulder-to-waist silhouette.
  rs.rotation.set(-.25+gait2*.12*moveBlend,-.16,-.37);re.rotation.set(-.46,0,0);rw.rotation.set(.38,-.14,0);
  ls.rotation.set(.06+gait*.28*moveBlend,.06,.19);le.rotation.set(-.22-Math.max(0,-gait)*.13*moveBlend,0,0);lw.rotation.set(0,0,0);
  hair.rotation.set(Math.sin(walk+.6)*.07*moveBlend+.012*breathe,-turnLean*.15,Math.sin(walk)*.03*moveBlend);
  sword.rotation.set(.11,-.15,-.10);
  attackPhase=state.attackProgress;
  if(Number.isFinite(attackPhase)&&attackPhase>=0&&attackPhase<1){
   // Full-body attack envelope removes entry/recovery snaps from the off arm,
   // legs and hanging cloth; the middle .44 damage pose remains exact.
   const weight=ease(T.MathUtils.clamp(attackPhase/.12,0,1))*ease(T.MathUtils.clamp((1-attackPhase)/.18,0,1)),q=pose(attackPhase,attackKeys);
   rs.rotation.set(lerp(rs.rotation.x,q[0],weight),lerp(rs.rotation.y,q[1],weight),lerp(rs.rotation.z,q[2],weight));
   re.rotation.x=lerp(re.rotation.x,q[3],weight);sampleWrist(attackPhase,rw.quaternion);
   chest.rotation.y=lerp(chest.rotation.y,q[6],weight);spine.rotation.x=lerp(spine.rotation.x,q[7],weight);
   ls.rotation.set(lerp(ls.rotation.x,-.45,weight),lerp(ls.rotation.y,0,weight),lerp(ls.rotation.z,.15,weight));le.rotation.x=lerp(le.rotation.x,-.55,weight);
   rt.rotation.x=lerp(rt.rotation.x,-.12,weight);lt.rotation.x=lerp(lt.rotation.x,.13,weight);rk.rotation.x=lerp(rk.rotation.x,.10,weight);lk.rotation.x=lerp(lk.rotation.x,.10,weight);
   frontR.rotation.x=lerp(frontR.rotation.x,-.14,weight);frontL.rotation.x=lerp(frontL.rotation.x,-.10,weight);backR.rotation.x=lerp(backR.rotation.x,.15,weight);backL.rotation.x=lerp(backL.rotation.x,.09,weight);
   // Sword local position and rotation stay fixed at the wrist socket.

  }
 }

 update(0,{});group.updateMatrixWorld(true);
 const stats={triangles:geometry.index.count/3+swordArrays.reduce((n,a)=>n+a.idx.length/3,0),materials:7,bones:bones.length,height:1.485,revision:'H33 swept hair / separated sword arm / split riding robe',attackDuration:.78,hitProgress:.44,authorship:'Original geometry and animation authored in code for 凤鸣山门; no third-party character asset.'};
 return {group,body,sword,update,stats,attackDuration:.78,hitProgress:.44,swordTipWorld:(out=new T.Vector3())=>sword.localToWorld(out.set(0,0,1.33)),bladeBaseWorld:(out=new T.Vector3())=>sword.localToWorld(out.set(0,0,.09)),getAttackProgress:()=>attackPhase};
}

// All surfaces below are original authored geometry for Lin Yan H33.
function surfaceGeometry(T,positions,indices,colors=null,skinIndex=null,skinWeight=null){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
 if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 if(skinIndex){g.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndex,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeight,4));}
 return g;
}
function curvedBand(T,points,width){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),steps=16,p=[],idx=[];
 for(let i=0;i<=steps;i++){
  const t=i/steps,P=curve.getPoint(t),D=curve.getTangent(t),S=new T.Vector3(-D.y,D.x,0).normalize().multiplyScalar(width*.5),N=new T.Vector3().crossVectors(D,S).normalize().multiplyScalar(.0035);
  if(S.lengthSq()<1e-8)S.set(width*.5,0,0);
  for(const [side,depth] of [[-1,1],[1,1],[-1,-1],[1,-1]]){const v=P.clone().addScaledVector(S,side).addScaledVector(N,depth);p.push(v.x,v.y,v.z);}
 }
 for(let i=0;i<steps;i++){let a=i*4,b=a+4;idx.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);}
 idx.push(0,1,2,1,3,2);let a=steps*4;idx.push(a,a+2,a+1,a+1,a+2,a+3);
 return surfaceGeometry(T,p,idx);
}
function roundedBoot(T,x){
 const sections=[[-.075,.043,.074,.016],[-.035,.065,.144,.014],[.07,.071,.105,.014],[.17,.064,.070,.015],[.213,.033,.043,.02]],N=16,p=[],idx=[],c=[];
 for(const [z,w,top,bottom] of sections)for(let j=0;j<N;j++){
  const a=j/N*Math.PI*2,y=(top+bottom)*.5+Math.sin(a)*(top-bottom)*.5;p.push(x+Math.cos(a)*w,y,z);const shade=y<.036?.65:1;c.push(shade,shade,shade);
 }
 for(let i=0;i<sections.length-1;i++)for(let j=0;j<N;j++){const a=i*N+j,b=i*N+(j+1)%N;idx.push(a,b,a+N,b,b+N,a+N);}
 for(let j=1;j<N-1;j++){idx.push(0,j+1,j);let a=(sections.length-1)*N;idx.push(a,a+j,a+j+1);}
 return surfaceGeometry(T,p,idx,c);
}
function drapedRobe(T,bi,{a0,a1,hem,thigh,inner=false}){
 const U=inner?6:24,V=10,p=[],idx=[],c=[],si=[],sw=[];
 const side=hem.startsWith('left')?1:-1,backHem=side>0?'leftBackHem':'rightBackHem';
 const ringCount=(U+1)*(V+1);
 for(let shell=0;shell<2;shell++)for(let v=0;v<=V;v++)for(let u=0;u<=U;u++){
  const t=v/V,theta=a0+(a1-a0)*u/U,front=Math.max(0,Math.cos(theta));
  const fold=Math.sin(theta*5-.35)*(.002+.010*t*t)+Math.sin(theta*3+.45)*.004*t;
  const rx=(inner?.122:.169)+(inner?.018:.119)*t+fold,rz=(inner?.097:.108)+(inner?.018:.083)*t+fold*.65;
  const thickness=shell?.014:0;
  const back=Math.max(0,-Math.cos(theta));
  const hemLength=inner?.365:(.462+.058*back-.073*front+(side<0?.019:-.009));
  const y=.738-hemLength*t+.018*t*t*Math.sin(theta*2+.25); 
  const x=Math.sin(theta)*(rx-thickness)+side*.013*t*t*back,z=Math.cos(theta)*(rz-thickness)+.006-.020*t*t*back;
  p.push(x,y,z);
  const painted=.88+.065*Math.cos(theta*2-.8)+.075*(1-t)+.032*Math.sin(theta*5-.35);const shade=shell?painted*.76:painted;c.push(shade,shade,shade);
  const clothBone=Math.cos(theta)<-.12?backHem:hem;
  const hemWeight=.58*t*t,thighWeight=.25*t*(front*.7+.3),hipWeight=1-hemWeight-thighWeight;
  si.push(bi.hips,bi[clothBone],bi[thigh],0);sw.push(hipWeight,hemWeight,thighWeight,0);
 }
 for(let shell=0;shell<2;shell++)for(let v=0;v<V;v++)for(let u=0;u<U;u++){
  const a=shell*ringCount+v*(U+1)+u,b=a+U+1;
  if(!shell)idx.push(a,b,a+1,a+1,b,b+1);else idx.push(a,a+1,b,a+1,b+1,b);
 }
 for(let v=0;v<V;v++)for(const u of [0,U]){
  const a=v*(U+1)+u,b=a+U+1,A=a+ringCount,B=b+ringCount;
  if(u===0)idx.push(a,A,b,A,B,b);else idx.push(a,b,A,A,b,B);
 }
 for(let u=0;u<U;u++)for(const v of [0,V]){
  const a=v*(U+1)+u,b=a+1,A=a+ringCount,B=b+ringCount;
  if(v===0)idx.push(a,b,A,b,B,A);else idx.push(a,A,b,b,A,B);
 }
 return surfaceGeometry(T,p,idx,c,si,sw);
}
// One continuous shaped hand volume, including a broad thumb side.
function softHand(T,sign){
 const rings=[[.595,.020,.021],[.620,.036,.029],[.650,.044,.034],[.680,.039,.029],[.699,.025,.024]],N=16,p=[],idx=[];
 for(const [y,rx,rz]of rings)for(let k=0;k<N;k++){
  const a=k/N*Math.PI*2,thumb=Math.max(0,-sign*Math.cos(a))*Math.exp(-Math.pow((y-.657)/.025,2));
  p.push(sign*.320+Math.cos(a)*(rx+thumb*.009),y,.062+Math.sin(a)*rz+thumb*.009);
 }
 for(let v=0;v<rings.length-1;v++)for(let k=0;k<N;k++){const a=v*N+k,b=v*N+(k+1)%N;idx.push(a,a+N,b,b,a+N,b+N);}
 for(let k=1;k<N-1;k++){idx.push(0,k+1,k);const a=(rings.length-1)*N;idx.push(a,a+k,a+k+1);}
 return surfaceGeometry(T,p,idx);
}

function maleHead(T){
 const rings=[[1.210,.051,.055,.025],[1.226,.079,.073,.021],[1.250,.098,.087,.014],[1.278,.110,.101,.004],[1.326,.106,.104,0],[1.367,.094,.088,-.003],[1.390,.072,.066,-.008]],N=32,p=[],idx=[],c=[];
 for(const [y,rx,rz,z0]of rings)for(let j=0;j<N;j++){
  const a=j/N*Math.PI*2,front=Math.max(0,Math.sin(a));let x=Math.cos(a)*rx,z=Math.sin(a)*rz+z0;
  // A subtly flatter front cheek plane and broad jaw keep the stylization adult.
  if(front>.65)z-=.005*(front-.65);
  p.push(x,y,z);const shade=(y<1.215?.88:y>1.345?.93:1.025)-Math.max(0,-Math.sin(a))*.03;c.push(shade,shade*.995,shade*.985);
 }
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<N;j++){const a=i*N+j,b=i*N+(j+1)%N;idx.push(a,a+N,b,b,a+N,b+N);}
 for(let j=1;j<N-1;j++){idx.push(0,j+1,j);let a=(rings.length-1)*N;idx.push(a,a+j,a+j+1);}
 return surfaceGeometry(T,p,idx,c);
}
function sweptHair(T){
 const N=40,V=10,p=[],idx=[],c=[];
 for(let v=0;v<=V;v++)for(let j=0;j<=N;j++){
  const t=v/V,a=j/N*Math.PI*2,front=Math.max(0,Math.sin(a)),back=Math.max(0,-Math.sin(a));
  const low=1.315+.039*front-.060*back+.004*Math.sin(a*2-.3)*front;
  const r=Math.sqrt(Math.max(.0002,1-t*t)),ridge=1+.018*Math.cos(a*9+t*2);
  p.push(Math.cos(a)*.112*r*ridge,low*(1-t)+1.432*t,Math.sin(a)*.104*r*ridge-.014);
  const light=.88+.09*Math.max(0,Math.cos(a-.5))+.018*Math.cos(a*5+t*1.5);c.push(light,light*1.05,light*1.08);
 }
 for(let v=0;v<V;v++)for(let j=0;j<N;j++){const a=v*(N+1)+j,b=a+N+1;idx.push(a,b,a+1,a+1,b,b+1);}
 return surfaceGeometry(T,p,idx,c);
}
function softBun(T){
 // A swept tied knot, not a ball stacked on the skull.
 const rings=[[1.414,.027,.029,-.047],[1.434,.045,.057,-.061],[1.459,.046,.052,-.072],[1.478,.026,.027,-.079],[1.485,.006,.008,-.082]],N=20,p=[],idx=[];
 for(const[y,rx,rz,z]of rings)for(let j=0;j<N;j++){const a=j/N*Math.PI*2;p.push(Math.cos(a)*rx-.010*(y-1.414)/.071,y,Math.sin(a)*rz+z);}
 for(let v=0;v<rings.length-1;v++)for(let j=0;j<N;j++){const a=v*N+j,b=v*N+(j+1)%N;idx.push(a,a+N,b,b,a+N,b+N);}
 for(let j=1;j<N-1;j++){const a=(rings.length-1)*N;idx.push(a,a+j,a+j+1);}
 return surfaceGeometry(T,p,idx);
}
function sweptLock(T){
 // Bound hair leaves a clear wedge of air between the lock and shoulder.
 const sections=[[0,1.400,-.093,.033,.024],[-.014,1.350,-.157,.043,.026],[-.043,1.278,-.246,.041,.023],[-.079,1.205,-.320,.027,.015],[-.112,1.163,-.344,.004,.004]],N=16,p=[],idx=[],c=[];
 for(let v=0;v<sections.length;v++){
  const[x,y,z,w,d]=sections[v];
  for(let k=0;k<N;k++){const a=k/N*Math.PI*2;p.push(x+Math.cos(a)*w,y+Math.sin(a)*d,z+Math.sin(a)*d*.4);const shade=.89+.07*Math.cos(a-.7);c.push(shade,shade*1.015,shade*1.025);}
 }
 for(let v=0;v<sections.length-1;v++)for(let k=0;k<N;k++){const a=v*N+k,b=v*N+(k+1)%N;idx.push(a,a+N,b,b,a+N,b+N);}
 for(let k=1;k<N-1;k++){idx.push(0,k+1,k);const a=(sections.length-1)*N;idx.push(a,a+k,a+k+1);}
 return surfaceGeometry(T,p,idx,c);
}

/** Original continuous shirt surface. No primitives are left at shoulder joins.
 * Build once, CPU only. The caller supplies THREE and chest/spine/shoulder indices.
 * IMPORTANT: retain the returned skinIndex/skinWeight attributes when merging.
 */
function createSmoothShirt(T,boneIndices,options={}){
 const required=['chest','spine','rightShoulder','leftShoulder'];
 for(const key of required)if(!Number.isInteger(boneIndices[key]))throw new Error('Missing shirt bone '+key);
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
 const mix=(a,b,t)=>a+(b-a)*t;
 const smin=(a,b,k)=>{const h=Math.max(0,Math.min(1,.5+.5*(b-a)/k));return mix(b,a,h)-k*h*(1-h);};
 const smax=(a,b,k)=>-smin(-a,-b,k);
 // Real profile: waist -> lower ribcage -> upper chest -> a gently sloping neck base.
 const profiles=[
  [.73,.157,.109],[.84,.173,.119],[.99,.223,.133],
  [1.075,.250,.136],[1.115,.227,.125],[1.150,.084,.073],[1.166,.061,.061]
 ];
 function profile(y){
  if(y<=profiles[0][0])return profiles[0].slice(1);
  for(let i=1;i<profiles.length;i++)if(y<=profiles[i][0]){
   const a=profiles[i-1],b=profiles[i],t=smooth(a[0],b[0],y);return [mix(a[1],b[1],t),mix(a[2],b[2],t)];
  }
  return profiles[profiles.length-1].slice(1);
 }
 function body(x,y,z){
  const [rx,rz]=profile(y),Z=z-.005;
  const k0=Math.hypot(x/rx,Z/rz),k1=Math.hypot(x/(rx*rx),Z/(rz*rz));
  const radial=k1<1e-9?-Math.min(rx,rz):k0*(k0-1)/k1;
  return smax(smax(radial,.73-y,.012),y-1.166,.010);
 }
 // Tapered sleeves share a smooth implicit union with the chest. Neither a
 // detached pauldron sphere nor a seam cylinder is present in the final mesh.
 function sleeve(x,y,z,sign){
  const ax=sign*.242,ay=1.087,az=0,bx=sign*.307,by=.864,bz=.018;
  const dx=bx-ax,dy=by-ay,dz=bz-az;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy+(z-az)*dz)/(dx*dx+dy*dy+dz*dz)));
  const cx=ax+t*dx,cy=ay+t*dy,cz=az+t*dz;
  const radius=mix(.083,.072,t);
  // Elliptical sleeve section slightly broader forward/back; no puffed ball.
  return Math.hypot(x-cx,y-cy,(z-cz)*.95)-radius;
 }
 function field(x,y,z){
  let d=smin(body(x,y,z),sleeve(x,y,z,-1),.040);
  d=smin(d,sleeve(x,y,z,1),.040);
  // An actual neck socket, not a bright vertical neck peg. The shallow socket
  // bottom sits inside the upper torso and is hidden by the neck/collar.
  const socket=Math.max(Math.hypot(x,z-.004)-.060,1.107-y);
  d=smax(d,-socket,.005);
  return Math.max(d,y-1.168);
 }
 const [nx,ny,nz]=options.resolution||[26,21,15];
 const min=[-.395,.712,-.205],max=[.395,1.184,.205];
 const sx=(max[0]-min[0])/nx,sy=(max[1]-min[1])/ny,sz=(max[2]-min[2])/nz;
 const width=nx+1,height=ny+1,total=width*height*(nz+1);
 const values=new Float64Array(total),grid=new Float64Array(total*3);
 const gid=(x,y,z)=>(z*height+y)*width+x;
 for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
  const i=gid(x,y,z),X=min[0]+x*sx,Y=min[1]+y*sy,Z=min[2]+z*sz;
  grid[i*3]=X;grid[i*3+1]=Y;grid[i*3+2]=Z;values[i]=field(X,Y,Z);
 }
 const positions=[],normals=[],colors=[],skinIndices=[],skinWeights=[],indices=[];
 const edges=new Map(),epsilon=.00065;
 function gradient(x,y,z){
  const gx=field(x+epsilon,y,z)-field(x-epsilon,y,z),gy=field(x,y+epsilon,z)-field(x,y-epsilon,z),gz=field(x,y,z+epsilon)-field(x,y,z-epsilon);
  const L=Math.hypot(gx,gy,gz)||1;return [gx/L,gy/L,gz/L];
 }
 function vertex(a,b){
  const key=a<b?a+':'+b:b+':'+a;
  if(edges.has(key))return edges.get(key);
  const va=values[a],vb=values[b],t=va/(va-vb),x=mix(grid[a*3],grid[b*3],t),y=mix(grid[a*3+1],grid[b*3+1],t),z=mix(grid[a*3+2],grid[b*3+2],t);
  const index=positions.length/3;positions.push(x,y,z);normals.push(...gradient(x,y,z));
  const underSleeve=Math.max(0,Math.min(1,(1.025-y)/.17))*smooth(.19,.32,Math.abs(x));
  const waistShade=1-.085*(1-smooth(.73,.93,y)),clothShade=waistShade-.13*underSleeve;
  colors.push(clothShade,clothShade,clothShade);
  // Soft continuous skinning across the shoulder union. The outer sleeve
  // belongs to the shoulder bone, torso stays chest/spine, seam blends both.
  const arm=smooth(.155,.295,Math.abs(x)),chest=smooth(.835,1.075,y);
  const weights=[(1-arm)*chest,(1-arm)*(1-chest),arm,0];
  skinIndices.push(boneIndices.chest,boneIndices.spine,boneIndices[x<0?'rightShoulder':'leftShoulder'],0);
  skinWeights.push(...weights);edges.set(key,index);return index;
 }
 const tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 const tetraEdges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
 function polygon(points){
  if(points.length<3)return;
  let cx=0,cy=0,cz=0;for(const p of points){cx+=positions[p*3];cy+=positions[p*3+1];cz+=positions[p*3+2];}
  cx/=points.length;cy/=points.length;cz/=points.length;
  const outward=gradient(cx,cy,cz),first=points[0];
  // Sort in the tetrahedron's actual linear iso-plane. The nonlinear field
  // gradient can tilt too far near the neck socket and must not order a quad.
  const px=positions[first*3],py=positions[first*3+1],pz=positions[first*3+2];
  let n=null;
  for(let i=1;i<points.length-1&&!n;i++){
   const ax=positions[points[i]*3]-px,ay=positions[points[i]*3+1]-py,az=positions[points[i]*3+2]-pz;
   const bx=positions[points[i+1]*3]-px,by=positions[points[i+1]*3+1]-py,bz=positions[points[i+1]*3+2]-pz;
   let X=ay*bz-az*by,Y=az*bx-ax*bz,Z=ax*by-ay*bx,L=Math.hypot(X,Y,Z);
   if(L>1e-12){X/=L;Y/=L;Z/=L;if(X*outward[0]+Y*outward[1]+Z*outward[2]<0){X=-X;Y=-Y;Z=-Z;}n=[X,Y,Z];}
  }
  if(!n)return;
  let ux=positions[first*3]-cx,uy=positions[first*3+1]-cy,uz=positions[first*3+2]-cz;
  const L=Math.hypot(ux,uy,uz)||1;ux/=L;uy/=L;uz/=L;
  const vx=n[1]*uz-n[2]*uy,vy=n[2]*ux-n[0]*uz,vz=n[0]*uy-n[1]*ux;
  points.sort((a,b)=>{
   const ax=positions[a*3]-cx,ay=positions[a*3+1]-cy,az=positions[a*3+2]-cz,bx=positions[b*3]-cx,by=positions[b*3+1]-cy,bz=positions[b*3+2]-cz;
   return Math.atan2(ax*vx+ay*vy+az*vz,ax*ux+ay*uy+az*uz)-Math.atan2(bx*vx+by*vy+bz*vz,bx*ux+by*uy+bz*uz);
  });
  for(let i=1;i<points.length-1;i++)indices.push(points[0],points[i],points[i+1]);
 }
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const cube=[gid(x,y,z),gid(x+1,y,z),gid(x+1,y+1,z),gid(x,y+1,z),gid(x,y,z+1),gid(x+1,y,z+1),gid(x+1,y+1,z+1),gid(x,y+1,z+1)];
  for(const tet of tets){
   const ids=tet.map(i=>cube[i]),inside=ids.map(i=>values[i]<0),sum=inside.reduce((a,b)=>a+Number(b),0);
   if(sum===0||sum===4)continue;
   const points=[];for(const [a,b]of tetraEdges)if(inside[a]!==inside[b])points.push(vertex(ids[a],ids[b]));polygon(points);
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndices,4));
 geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeights,4));
 geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.name='林砚-连续曲面交领上衣与连肩袖';
 geometry.userData={source:'Original smooth-union SDF / marching tetrahedra; project-owned',resolution:[nx,ny,nz],vertices:positions.length/3,triangles:indices.length/3,neckOpening:true,boneKeys:required,bounds:[geometry.boundingBox.min.toArray(),geometry.boundingBox.max.toArray()]};
 return geometry;
}
