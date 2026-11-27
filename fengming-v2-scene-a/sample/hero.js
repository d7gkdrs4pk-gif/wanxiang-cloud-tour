/** 林砚 H34 · Blender-authored tailored topology, CC0 male face/hands, painted atlas.
 * The original construction source lives in .github/scripts/lib/linyan-h34-generator.mjs.
 * Geometry, vertex colors, weights, bind inverses and sword are baked offline.
 * Facing +Z. Height 1.485. Attack .78s; hit normalized .44.
 */
import * as T from 'three';
import {getBakedHeroData} from '../assets/hero-034/linyan-h34-baked.js';

let sharedAtlas=null,sharedAtlasReady=null;
function loadAtlas(){
 if(sharedAtlasReady)return sharedAtlasReady;
 if(typeof document==='undefined'){sharedAtlasReady=Promise.resolve();return sharedAtlasReady;}
 sharedAtlasReady=new Promise((resolve,reject)=>{
  sharedAtlas=new T.TextureLoader().load(new URL('../assets/hero-034/linyan-atlas.webp',import.meta.url).href,()=>resolve(),undefined,reject);
  sharedAtlas.colorSpace=T.SRGBColorSpace;sharedAtlas.anisotropy=2;
 });
 return sharedAtlasReady;
}

const ease=t=>t*t*(3-2*t);
const lerp=T.MathUtils.lerp;

// The base64 resource is decoded once. BufferGeometry owns its attributes but
// references immutable decoded arrays, so a second hero does not re-decode them.
function restoreGeometry(spec){
 const geometry=new T.BufferGeometry();
 for(const [name,attr] of Object.entries(spec.attributes)){
  const attribute=new T.BufferAttribute(attr.array,attr.itemSize,attr.normalized);
  if(attr.gpuType!==undefined)attribute.gpuType=attr.gpuType;
  geometry.setAttribute(name,attribute);
 }
 if(spec.index){const index=new T.BufferAttribute(spec.index.array,spec.index.itemSize,spec.index.normalized);if(spec.index.gpuType!==undefined)index.gpuType=spec.index.gpuType;geometry.setIndex(index);}
 geometry.name=spec.name;
 if(spec.drawRange)geometry.setDrawRange(spec.drawRange.start,spec.drawRange.count??Infinity);
 for(const group of spec.groups)geometry.addGroup(group.start,group.count,group.materialIndex);
 if(spec.boundingSphere)geometry.boundingSphere=new T.Sphere(new T.Vector3().fromArray(spec.boundingSphere.center),spec.boundingSphere.radius);
 if(spec.boundingBox)geometry.boundingBox=new T.Box3(new T.Vector3().fromArray(spec.boundingBox.min),new T.Vector3().fromArray(spec.boundingBox.max));
 return geometry;
}
function restoreTransform(object,spec){
 if(spec.position)object.position.fromArray(spec.position);
 if(spec.quaternion)object.quaternion.fromArray(spec.quaternion);
 if(spec.scale)object.scale.fromArray(spec.scale);
}
function restoreMeshFlags(object,spec){
 object.name=spec.name;
 object.castShadow=spec.castShadow;
 object.receiveShadow=spec.receiveShadow;
 object.frustumCulled=spec.frustumCulled;
 object.renderOrder=spec.renderOrder;object.visible=spec.visible;
 restoreTransform(object,spec);
}
export function createHero(){
 const data=getBakedHeroData(),ready=loadAtlas();
 const group=new T.Group();group.name='林砚-男主-持剑';
 const materials=data.materials.map(spec=>{
  const {type,color,emissive,...properties}=spec;
  return new T.MeshStandardMaterial({...properties,color:new T.Color().fromArray(color),emissive:new T.Color().fromArray(emissive),map:sharedAtlas});
 });
 const bones=data.bones.map(spec=>{const bone=new T.Bone();bone.name=spec.name;restoreTransform(bone,spec);return bone;});
 data.bones.forEach((spec,i)=>{if(spec.parent<0)group.add(bones[i]);else bones[spec.parent].add(bones[i]);});
 const byName=Object.fromEntries(bones.map(b=>[b.name,b]));
 const {hips,spine,chest,head,hairTail:hair,rightShoulder:rs,rightElbow:re,rightWrist:rw,leftShoulder:ls,leftElbow:le,leftWrist:lw,rightThigh:rt,rightKnee:rk,rightAnkle:ra,leftThigh:lt,leftKnee:lk,leftAnkle:la,rightRobe:frontR,leftRobe:frontL,rightBackHem:backR,leftBackHem:backL}=byName;
 const bodySpec=data.body,geometry=restoreGeometry(data.geometries[bodySpec.geometry]);
 const body=new T.SkinnedMesh(geometry,materials);restoreMeshFlags(body,bodySpec);body.bindMode=bodySpec.bindMode;group.add(body);group.updateMatrixWorld(true);
 // Explicit bindMatrix prevents bind() from recalculating the original zero-pose
 // inverse matrices from the exported default idle pose.
 body.bind(new T.Skeleton(bones,data.boneInverses.map(values=>new T.Matrix4().fromArray(values))),new T.Matrix4().fromArray(bodySpec.bindMatrix));
 body.bindMatrixInverse.fromArray(bodySpec.bindMatrixInverse);
 const sword=new T.Group();sword.name=data.sword.name;restoreTransform(sword,data.sword);bones[data.sword.parentBone].add(sword);
 for(const spec of data.sword.meshes){const mesh=new T.Mesh(restoreGeometry(data.geometries[spec.geometry]),materials[spec.material]);restoreMeshFlags(mesh,spec);sword.add(mesh);}
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
 const stats={...data.stats};
 group.userData.asset='assets/hero-034/linyan-h34.glb (offline baked exact Blender mesh)';
 return {group,body,sword,update,stats,ready,attackDuration:.78,hitProgress:.44,swordTipWorld:(out=new T.Vector3())=>sword.localToWorld(out.set(0,0,1.33)),bladeBaseWorld:(out=new T.Vector3())=>sword.localToWorld(out.set(0,0,.09)),getAttackProgress:()=>attackPhase};
}
