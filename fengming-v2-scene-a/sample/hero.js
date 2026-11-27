/** 林砚 H35 · same H34 mesh, authored full-body weight transfer and planted sword action.
 * The original construction source lives in .github/scripts/lib/linyan-h34-generator.mjs.
 * Geometry, vertex colors, weights, bind inverses and sword are baked offline.
 * Facing +Z. Height 1.485. Attack .78s; hit normalized .44.
 */
import * as T from 'three';
import {getBakedHeroData} from '../assets/hero-034/linyan-h34-baked.js';
import {ATTACK,WRIST} from '../assets/hero-035/action.js';

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
 const wristKeys=WRIST;
 function sampleWrist(p,out){
  if(p<=0)return out.fromArray(wristKeys[0],1);
  for(let i=1;i<wristKeys.length;i++)if(p<=wristKeys[i][0]){
   const a=wristKeys[i-1],b=wristKeys[i];return out.fromArray(a,1).slerp(wristNext.fromArray(b,1),(p-a[0])/(b[0]-a[0]));
  }
  return out.fromArray(wristKeys[wristKeys.length-1],1);
 }

 // Body channels use nonuniform cubic Hermite interpolation so shoulder /
 // pelvis velocities flow across keys. Ankle contact targets use the eased
 // path above, with a strict floor and an explicit plant interval.
 function bodyPose(p,keys){
  if(p<=keys[0][0])return keys[0].slice(1);
  for(let i=1;i<keys.length;i++)if(p<=keys[i][0]){
   const a=keys[i-1],b=keys[i],prev=keys[Math.max(0,i-2)],next=keys[Math.min(keys.length-1,i+1)],span=b[0]-a[0],t=(p-a[0])/span,t2=t*t,t3=t2*t;
   return a.slice(1).map((v,k)=>{const m0=i===1?0:(b[k+1]-prev[k+1])/(b[0]-prev[0]),m1=i===keys.length-1?0:(next[k+1]-a[k+1])/(next[0]-a[0]);return (2*t3-3*t2+1)*v+(t3-2*t2+t)*span*m0+(-2*t3+3*t2)*b[k+1]+(t3-t2)*span*m1;});
  }
  return keys[keys.length-1].slice(1);
 }
 const ankleRestR=ra.position.clone(),ankleRestL=la.position.clone();
 const invHip=new T.Matrix4(),targetLeg=new T.Vector3(),directionLeg=new T.Vector3(),poleLeg=new T.Vector3(),kneePoint=new T.Vector3(),shinDirection=new T.Vector3(),downLeg=new T.Vector3(0,-1,0),frontLeg=new T.Vector3(0,0,1);
 const thighIK=new T.Quaternion(),shinIK=new T.Quaternion(),kneeIK=new T.Quaternion(),ankleIK=new T.Quaternion(),legParentQ=new T.Quaternion(),footMatrix=new T.Matrix4(),parentMatrix=new T.Matrix4(),liftLocal=new T.Vector3();
 const solePoints=(index)=>{const positions=geometry.attributes.position,indices=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight,result=[];for(let i=0;i<positions.count;i++)if(indices.getX(i)===index&&weights.getX(i)>.999&&positions.getY(i)<.044){result.push(new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(body.skeleton.boneInverses[index]));}return result;};
 const solesR=solePoints(bones.indexOf(ra)),solesL=solePoints(bones.indexOf(la));
 function plantLeg(thigh,knee,ankle,goal,weight,sole){
  hips.updateMatrix();invHip.copy(hips.matrix).invert();targetLeg.set(goal[0],Math.max(.10,goal[1]),goal[2]).applyMatrix4(invHip).sub(thigh.position);
  const length=Math.min(.285+.295,Math.max(.02,targetLeg.length()));directionLeg.copy(targetLeg).normalize();
  const along=(.285*.285-.295*.295+length*length)/(2*length),height=Math.sqrt(Math.max(0,.285*.285-along*along));
  poleLeg.copy(frontLeg).addScaledVector(directionLeg,-frontLeg.dot(directionLeg)).normalize();
  kneePoint.copy(directionLeg).multiplyScalar(along).addScaledVector(poleLeg,height);thighIK.setFromUnitVectors(downLeg,kneePoint.clone().normalize());
  shinDirection.copy(directionLeg).multiplyScalar(length).sub(kneePoint).normalize();shinIK.setFromUnitVectors(downLeg,shinDirection);kneeIK.copy(thighIK).invert().multiply(shinIK);
  ankleIK.copy(hips.quaternion).multiply(shinIK).invert();
  thigh.quaternion.slerp(thighIK,weight);knee.quaternion.slerp(kneeIK,weight);ankle.quaternion.slerp(ankleIK,weight);
 }
 function supportSole(thigh,knee,ankle,sole,clearance){
  hips.updateMatrix();
  // Check the actual authored sole vertices in actor-local coordinates. This
  // only lifts a penetrating ankle; neither actor position nor collision moves.
  thigh.updateMatrix();knee.updateMatrix();ankle.updateMatrix();parentMatrix.copy(hips.matrix).multiply(thigh.matrix).multiply(knee.matrix);footMatrix.copy(parentMatrix).multiply(ankle.matrix);
  let minimum=Infinity;const e=footMatrix.elements;for(const v of sole)minimum=Math.min(minimum,e[1]*v.x+e[5]*v.y+e[9]*v.z+e[13]);
  if(minimum<clearance){legParentQ.copy(hips.quaternion).multiply(thigh.quaternion).multiply(knee.quaternion).invert();liftLocal.set(0,clearance-minimum,0).applyQuaternion(legParentQ);ankle.position.add(liftLocal);}
 }
 function update(dt,state={}){
  time+=Math.max(0,dt);const moving=!!state.moving;const speed=state.speed??(moving?1:0);moveBlend=lerp(moveBlend,moving?1:0,1-Math.exp(-dt*12));walk+=dt*(7.4+Math.min(1.5,speed)*1.8)*moveBlend;
  group.getWorldQuaternion(turnQuaternion);const worldYaw=Math.atan2(2*(turnQuaternion.w*turnQuaternion.y+turnQuaternion.x*turnQuaternion.z),1-2*(turnQuaternion.y*turnQuaternion.y+turnQuaternion.x*turnQuaternion.x));
  const automaticTurn=lastWorldYaw===null||dt<=0?0:Math.atan2(Math.sin(worldYaw-lastWorldYaw),Math.cos(worldYaw-lastWorldYaw))/dt*.12;lastWorldYaw=worldYaw;
  turnLean=lerp(turnLean,T.MathUtils.clamp(state.turn??automaticTurn,-1,1),1-Math.exp(-dt*9));
  const gait=Math.sin(walk),gait2=Math.sin(walk+Math.PI),breathe=Math.sin(time*2.6);
  hips.position.set(0,.70+.008*breathe*(1-moveBlend)+Math.abs(Math.sin(walk))*moveBlend*.018,0);ra.position.copy(ankleRestR);la.position.copy(ankleRestL);
  hips.rotation.set(0,Math.sin(walk)*.025*moveBlend,-turnLean*.055);
  spine.rotation.set(.025*moveBlend,Math.sin(walk)*.035*moveBlend,turnLean*.05);
  chest.rotation.set(0,Math.sin(walk)*-.045*moveBlend,0);head.rotation.set(-.055-.030*moveBlend,-turnLean*.10,0);
  rt.rotation.set(gait*.49*moveBlend,0,0);lt.rotation.set(gait2*.49*moveBlend,0,0);
  rk.rotation.set(Math.max(0,-gait)*.68*moveBlend,0,0);lk.rotation.set(Math.max(0,-gait2)*.68*moveBlend,0,0);
  ra.rotation.set(-Math.max(0,gait)*.12*moveBlend,0,0);la.rotation.set(-Math.max(0,gait2)*.12*moveBlend,0,0);
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
   const weight=ease(T.MathUtils.clamp(attackPhase/.10,0,1))*ease(T.MathUtils.clamp((1-attackPhase)/.12,0,1));
   const hp=bodyPose(attackPhase,ATTACK.hips),sp=bodyPose(attackPhase,ATTACK.spine),cp=bodyPose(attackPhase,ATTACK.chest),right=bodyPose(attackPhase,ATTACK.rightArm),left=bodyPose(attackPhase,ATTACK.leftArm),hem=bodyPose(attackPhase,ATTACK.cloth),look=bodyPose(attackPhase,ATTACK.head);
   hips.position.x=hp[0]*weight;hips.position.y=lerp(hips.position.y,.70+hp[1],weight);hips.position.z=hp[2]*weight;
   hips.rotation.set(lerp(hips.rotation.x,hp[3],weight),lerp(hips.rotation.y,hp[4],weight),lerp(hips.rotation.z,hp[5],weight));
   spine.rotation.set(lerp(spine.rotation.x,sp[0],weight),lerp(spine.rotation.y,sp[1],weight),lerp(spine.rotation.z,sp[2],weight));
   chest.rotation.set(cp[0]*weight,lerp(chest.rotation.y,cp[1],weight),cp[2]*weight);
   rs.rotation.set(lerp(rs.rotation.x,right[0],weight),lerp(rs.rotation.y,right[1],weight),lerp(rs.rotation.z,right[2],weight));re.rotation.x=lerp(re.rotation.x,right[3],weight);
   ls.rotation.set(lerp(ls.rotation.x,left[0],weight),lerp(ls.rotation.y,left[1],weight),lerp(ls.rotation.z,left[2],weight));le.rotation.x=lerp(le.rotation.x,left[3],weight);
   head.rotation.x+=look[0]*weight;head.rotation.y+=look[1]*weight;head.rotation.z+=look[2]*weight;
   frontR.rotation.x=lerp(frontR.rotation.x,hem[0],weight);frontL.rotation.x=lerp(frontL.rotation.x,hem[1],weight);backR.rotation.x=lerp(backR.rotation.x,hem[2],weight);backL.rotation.x=lerp(backL.rotation.x,hem[3],weight);
   hair.rotation.x+=Math.sin(attackPhase*Math.PI*2.2)*.06*weight;hair.rotation.z+=Math.sin(attackPhase*Math.PI*1.5)*.045*weight;
   plantLeg(rt,rk,ra,pose(attackPhase,ATTACK.rightFoot),weight,solesR);plantLeg(lt,lk,la,pose(attackPhase,ATTACK.leftFoot),weight,solesL);
   sampleWrist(attackPhase,rw.quaternion);
   // Sword local transform remains the same fixed H34 hand socket.

  }
  // The gate-side rear support crosses a slightly higher beveled tread. Only
  // the right ankle gets 14mm extra authored clearance; actor/hip never lift.
  supportSole(rt,rk,ra,solesR,.028);supportSole(lt,lk,la,solesL,.005);
 }

 update(0,{});group.updateMatrixWorld(true);
 const stats={...data.stats,animationRevision:'H35 weighted stance / low outside recovery',attackDuration:.78,hitProgress:.44};
 group.userData.asset='assets/hero-034/linyan-h34.glb (offline baked exact Blender mesh)';
 return {group,body,sword,update,stats,ready,attackDuration:.78,hitProgress:.44,swordTipWorld:(out=new T.Vector3())=>sword.localToWorld(out.set(0,0,1.33)),bladeBaseWorld:(out=new T.Vector3())=>sword.localToWorld(out.set(0,0,.09)),getAttackProgress:()=>attackPhase};
}
