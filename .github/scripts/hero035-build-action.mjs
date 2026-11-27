/** H35 offline hand-track retarget. Runtime never aims a weapon at world points.
 * Authored body channels stay in assets/hero-035/action.js. Only the local wrist
 * quaternion samples are regenerated here; H34 mesh/rig/atlas remain untouched.
 */
import fs from 'node:fs';import path from 'node:path';import{fileURLToPath,pathToFileURL}from'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),game=path.join(repo,'fengming-v2-scene-a'),out=path.join(game,'assets/hero-035');
const T=await import(pathToFileURL(path.join(game,'vendor/three/three.module.js')));
const {createHero:createH34}=await import('./lib/linyan-h34-runtime.mjs');
let source=fs.readFileSync(path.join(game,'sample/hero.js'),'utf8').replace("from 'three'",`from '${pathToFileURL(path.join(game,'vendor/three/three.module.js'))}'`).replace(/from '(\.\.\/assets\/[^']+)'/g,(_,rel)=>`from '${pathToFileURL(path.resolve(game,'sample',rel))}'`);
const {createHero}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const actionFile=path.join(out,'action.js'),actionSource=fs.readFileSync(actionFile,'utf8');
// Always seed from the original H34 local track, never accumulate a re-target.
const seedSource=fs.readFileSync(path.join(repo,'.github/scripts/lib/linyan-h34-runtime.mjs'),'utf8'),seed=JSON.parse(seedSource.match(/ const wristKeys=(\[.*\]);\n/)[1]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>t*t*(3-2*t),target=new T.Vector3(0,.70,.7942090417223091);
function scene(p){const h=createHero();h.update(0,{attackProgress:p});const rw=h.body.skeleton.bones.find(b=>b.name==='rightWrist');rw.quaternion.fromArray(seed[Math.round(p*50)],1);h.group.updateMatrixWorld(true);return{h,rw};}
function align(h,rw,axis){const current=h.swordTipWorld().sub(h.bladeBaseWorld()).normalize(),delta=new T.Quaternion().setFromUnitVectors(current,axis),world=rw.getWorldQuaternion(new T.Quaternion()),inv=rw.parent.getWorldQuaternion(new T.Quaternion()).invert();rw.quaternion.copy(inv).multiply(delta.multiply(world));h.group.updateMatrixWorld(true);}
function oldAxis(p){const h=createH34();h.update(0,{attackProgress:p});return h.swordTipWorld().sub(h.bladeBaseWorld()).normalize();}
// First solve the same exact low-stair mask target at the new .44 body pose.
const contact=scene(.44);align(contact.h,contact.rw,oldAxis(.44));const beforeContact=contact.rw.getWorldQuaternion(new T.Quaternion());
for(let i=0;i<8;i++)align(contact.h,contact.rw,target.clone().sub(contact.h.bladeBaseWorld()).normalize());
const correction=contact.rw.getWorldQuaternion(new T.Quaternion()).multiply(beforeContact.clone().invert());
const held=oldAxis(1),heldYaw=Math.atan2(held.x,held.z),heldPitch=Math.asin(held.y);
const recovery=[[.60,1.55,-.15],[.66,1.22,-.43],[.72,.38,-.52],[.80,-.58,-.51],[.88,-.95,-.36],[.94,-.83,-.04],[1,heldYaw,heldPitch]];
function pathPose(p,keys){for(let i=1;i<keys.length;i++)if(p<=keys[i][0]){const a=keys[i-1],b=keys[i],t=ease(clamp((p-a[0])/(b[0]-a[0]),0,1));return a.slice(1).map((v,k)=>v+(b[k+1]-v)*t);}return keys.at(-1).slice(1);}
const keys=[],samples=[];
for(let i=0;i<=50;i++){
 const p=i/50,{h,rw}=scene(p);let axis;
 if(p===0||p===1){keys.push([p,...rw.quaternion.toArray()]);continue;}
 if(p<=.60)axis=oldAxis(p);else{const[yaw,pitch]=pathPose(p,recovery);axis=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));}
 align(h,rw,axis);
 if(p>.32&&p<.56){const w=p<=.44?ease((p-.32)/.12):ease((.56-p)/.12),world=rw.getWorldQuaternion(new T.Quaternion()),inv=rw.parent.getWorldQuaternion(new T.Quaternion()).invert();rw.quaternion.copy(inv).multiply(new T.Quaternion().slerp(correction,w).multiply(world));h.group.updateMatrixWorld(true);}
 // A low return may not stab the top step. Clamp only its authored direction
 // during this offline pass, keeping the real blade at least 65mm above it.
 if(p>.60){for(let n=0;n<6;n++){const base=h.bladeBaseWorld(),tip=h.swordTipWorld();if(tip.y>=.065)break;const dir=tip.sub(base).normalize();dir.y=Math.max(dir.y,(.070-base.y)/1.24);dir.normalize();align(h,rw,dir);}}
 keys.push([p,...rw.quaternion.toArray()]);samples.push({p,bladeBase:h.bladeBaseWorld().toArray(),bladeTip:h.swordTipWorld().toArray()});
}
// The final gate-aware return is a small, explicit authored guide, not a
// frame-time world solver. The frozen first-pass local track preserves roll.
const guardFile=path.join(out,'source/recovery-guard.json');
let finalRecoveryGuard=null;
if(fs.existsSync(guardFile)){
 finalRecoveryGuard=JSON.parse(fs.readFileSync(guardFile,'utf8'));
 const base=JSON.parse(fs.readFileSync(path.join(out,'source/base-wrist-track.json'),'utf8'));
 for(let i=0;i<base.length;i++){
  const p=base[i][0];if(p<=.68||p>=1){keys[i]=base[i];continue;}
  const{h,rw}=scene(p);rw.quaternion.fromArray(base[i],1);h.group.updateMatrixWorld(true);
  const axis=h.swordTipWorld().sub(h.bladeBaseWorld()).normalize(),world=rw.getWorldQuaternion(new T.Quaternion()),inv=rw.parent.getWorldQuaternion(new T.Quaternion()).invert(),[yaw,pitch]=pathPose(p,finalRecoveryGuard.directions);
  const direction=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)),delta=new T.Quaternion().setFromUnitVectors(axis,direction);
  keys[i]=[p,...inv.multiply(delta.multiply(world)).toArray()];
 }
 samples.length=0;
 for(const key of keys){const p=key[0],{h,rw}=scene(p);rw.quaternion.fromArray(key,1);h.group.updateMatrixWorld(true);samples.push({p,bladeBase:h.bladeBaseWorld().toArray(),bladeTip:h.swordTipWorld().toArray()});}
}
const outputArg=process.argv.indexOf('--action-out'),actionOutput=outputArg>=0?process.argv[outputArg+1]:actionFile;
fs.writeFileSync(actionOutput,actionSource.replace(/export const WRIST=\[.*\];/,'export const WRIST='+JSON.stringify(keys)+';'));
fs.mkdirSync(path.join(out,'source'),{recursive:true});fs.writeFileSync(path.join(out,'source/wrist-authoring.json'),JSON.stringify({method:'Offline local-wrist recording against new body pose; .44 exact mask target, .60+ outside/low guard; fixed runtime sword socket',contactTargetActorLocal:target.toArray(),contactCorrectionQuaternion:correction.toArray(),recoveryDirectionKeys:recovery,finalRecoveryGuard,keys,samples},null,2)+'\n');
console.log('H35 local wrist generated',keys.length,'samples; .44 target',target.toArray(),'; H34 mesh unchanged');
