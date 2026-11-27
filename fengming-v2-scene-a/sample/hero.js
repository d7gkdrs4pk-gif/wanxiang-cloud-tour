/** 林砚 H31 · identical authored continuous-surface rig, pre-baked for H32 startup.
 * The original construction source lives in .github/scripts/lib/linyan-h31-generator.mjs.
 * Geometry, vertex colors, weights, bind inverses and sword are byte-exact baked output.
 * Facing +Z. Height 1.485. Attack .78s; hit normalized .44.
 */
import * as T from 'three';
import {getBakedHeroData} from '../assets/hero-001/linyan-h31-baked.js';

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
 const data=getBakedHeroData();
 const group=new T.Group();group.name='林砚-男主-持剑';
 const materials=data.materials.map(spec=>{
  const {type,color,emissive,...properties}=spec;
  return new T.MeshStandardMaterial({...properties,color:new T.Color().fromArray(color),emissive:new T.Color().fromArray(emissive)});
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
 const turnQuaternion=new T.Quaternion(),bladeDirection=new T.Vector3(),bladeForward=new T.Vector3(0,0,1),bladeRotation=new T.Quaternion(),desiredBladeWorld=new T.Quaternion(),elbowWorld=new T.Quaternion();
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
  chest.rotation.set(0,Math.sin(walk)*-.045*moveBlend,0);head.rotation.set(-.07-.035*moveBlend,-turnLean*.10,0);
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
   const blade=pose(attackPhase,bladeKeys);
   bladeDirection.set(Math.sin(blade[0])*Math.cos(blade[1]),Math.sin(blade[1]),Math.cos(blade[0])*Math.cos(blade[1]));
   // Only the shoulder/elbow ancestor chain is needed to orient the wrist.
   // Renderer rendering, or an immediate blade getter, updates the resulting
   // full pose afterward. Reuse the actor world orientation already read above.
   desiredBladeWorld.copy(turnQuaternion).multiply(bladeRotation.setFromUnitVectors(bladeForward,bladeDirection));
   rw.quaternion.copy(re.getWorldQuaternion(elbowWorld).invert().multiply(desiredBladeWorld));sword.rotation.set(0,0,0);
  }
 }
 update(0,{});group.updateMatrixWorld(true);
 const stats={...data.stats};
 return {group,body,sword,update,stats,attackDuration:.78,hitProgress:.44,swordTipWorld:(out=new T.Vector3())=>sword.localToWorld(out.set(0,0,1.33)),bladeBaseWorld:(out=new T.Vector3())=>sword.localToWorld(out.set(0,0,.09)),getAttackProgress:()=>attackPhase};
}
