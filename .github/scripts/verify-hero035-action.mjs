// Independent CPU inspection of H35 full-body motion. No renderer or source edits.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),root=path.join(repo,'fengming-v2-scene-a');
const argv=process.argv.slice(2),argValue=name=>{const i=argv.indexOf(name);if(i>=0){if(!argv[i+1])throw new Error('Missing value for '+name);return argv[i+1];}return null;};
const outputDir=path.resolve(argValue('--output-dir')??path.join(process.cwd(),'hero035-qa'));
if(argv.includes('--help')){console.log('node .github/scripts/verify-hero035-action.mjs [--output-dir PATH]');process.exit(0);}
fs.mkdirSync(outputDir,{recursive:true});
const runtime=path.join(root,'sample/hero.js'),action=path.join(root,'assets/hero-035/action.js'),baked=path.join(root,'assets/hero-034/linyan-h34-baked.js'),enemyFile=path.join(root,'sample/enemy.js');
const navFile=path.join(root,'assets/sample-lod/navigation.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),inputs=[runtime,action,baked,enemyFile,navFile],before=Object.fromEntries(inputs.map(p=>[p,sha(fs.readFileSync(p))]));
const threeURL=pathToFileURL(path.join(root,'vendor/three/three.module.js')).href,T=await import(threeURL);
const source=fs.readFileSync(runtime,'utf8').replace(/from 'three'/,`from ${JSON.stringify(threeURL)}`).replace(/from '(\.\.\/assets\/[^']+)'/g,(_,p)=>`from ${JSON.stringify('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.resolve(path.dirname(runtime),p),'utf8')).toString('base64'))}`);
const {createHero}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const enemySource=fs.readFileSync(enemyFile,'utf8').replace(/from 'three'/,`from ${JSON.stringify(threeURL)}`),{createEnemy}=await import('data:text/javascript;base64,'+Buffer.from(enemySource).toString('base64'));
const hero=createHero(),bones=Object.fromEntries(hero.body.skeleton.bones.map(b=>[b.name,b])),attrs=hero.body.geometry.attributes;
const ankleIndices={right:hero.body.skeleton.bones.indexOf(bones.rightAnkle),left:hero.body.skeleton.bones.indexOf(bones.leftAnkle)};
const soleVertices=Object.fromEntries(Object.entries(ankleIndices).map(([side,index])=>[side,Array.from({length:attrs.position.count},(_,i)=>i).filter(i=>attrs.position.getY(i)<.044&&[0,1,2,3].some(k=>attrs.skinIndex.getComponent(i,k)===index&&attrs.skinWeight.getComponent(i,k)>0))]));
const p=new T.Vector3(),q=new T.Quaternion();
function update(phase){hero.update(0,{attackProgress:phase});hero.group.updateMatrixWorld(true);hero.body.skeleton.update();}
function state(h=hero){return{bones:h.body.skeleton.bones.map(b=>({name:b.name,matrix:b.matrixWorld.toArray()})),swordMatrix:h.sword.matrixWorld.toArray(),swordLocal:[...h.sword.position.toArray(),...h.sword.quaternion.toArray(),...h.sword.scale.toArray()],groupMatrix:h.group.matrixWorld.toArray(),base:h.bladeBaseWorld().toArray(),tip:h.swordTipWorld().toArray()};}
function delta(a,b){const max=(x,y)=>Math.max(...x.map((v,i)=>Math.abs(v-y[i])));return{maxBoneMatrixDifference:Math.max(...a.bones.map((v,i)=>max(v.matrix,b.bones[i].matrix))),swordMatrixDifference:max(a.swordMatrix,b.swordMatrix),socketComponentDifference:max(a.swordLocal,b.swordLocal),groupMatrixDifference:max(a.groupMatrix,b.groupMatrix),tipDistance:new T.Vector3(...a.tip).distanceTo(new T.Vector3(...b.tip))};}
update(null);const idle=state();update(0);const entry=delta(idle,state());
const convergence=[1e-3,1e-4,1e-5,1e-6,1e-7,1e-8].map(e=>{update(e);const start=delta(idle,state());update(1-e);const end=delta(idle,state());return{epsilon:e,start,end};});
const actorPosition=new T.Vector3(-3.2,.0656919404864311,-4.2),actorYaw=-.6,actorMatrix=new T.Matrix4().compose(actorPosition,new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),actorYaw),new T.Vector3(1,1,1));
const camera=new T.PerspectiveCamera(39,390/844,.1,160);camera.position.copy(actorPosition).add(new T.Vector3(6,27,15));camera.lookAt(actorPosition);camera.updateMatrixWorld(true);
const project=vector=>{const v=vector.clone().applyMatrix4(actorMatrix).project(camera);return[(v.x+1)*195,(1-v.y)*422];};
const baselineAnkle=name=>new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(idle.bones.find(b=>b.name===name).matrix));
const baseFootProjection={right:project(baselineAnkle('rightAnkle')),left:project(baselineAnkle('leftAnkle'))};

// Actual target: character atop the real stair, enemy on lower ground facing him.
const playerPosition=new T.Vector3(1.6206605404,.7069842713,-6.9944347705),enemyPosition=new T.Vector3(2.5079934731,.0243720022,-6.5172228998),aim=Math.atan2(enemyPosition.x-playerPosition.x,enemyPosition.z-playerPosition.z),hitMatrix=new T.Matrix4().compose(playerPosition,new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),aim),new T.Vector3(1,1,1));
const foe=createEnemy();foe.group.position.copy(enemyPosition);foe.group.rotation.y=Math.atan2(playerPosition.x-enemyPosition.x,playerPosition.z-enemyPosition.z);foe.update(0,{});foe.group.updateMatrixWorld(true);foe.mesh.skeleton.update();
const fg=foe.mesh.geometry,fi=fg.index,targets=new Set(['head','chest','spine']),worldVertices=Array.from({length:fg.attributes.position.count},(_,i)=>foe.mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(foe.mesh.matrixWorld)),triangles=[];
for(let i=0;i<fi.count;i+=3){const a=fi.getX(i),b=fi.getX(i+1),c=fi.getX(i+2);let major=0;for(let k=1;k<4;k++)if(fg.attributes.skinWeight.getComponent(a,k)>fg.attributes.skinWeight.getComponent(a,major))major=k;const bone=foe.bones[fg.attributes.skinIndex.getComponent(a,major)].name;if(targets.has(bone))triangles.push({triangle:i/3,bone,a:worldVertices[a],b:worldVertices[b],c:worldVertices[c]});}
function contact(){const base=hero.bladeBaseWorld().applyMatrix4(hitMatrix),tip=hero.swordTipWorld().applyMatrix4(hitMatrix),length=base.distanceTo(tip),ray=new T.Ray(base.clone(),tip.clone().sub(base).normalize()),hits=[];for(const t of triangles){const at=ray.intersectTriangle(t.a,t.b,t.c,false,p);if(at&&base.distanceTo(at)<=length+1e-9)hits.push({triangle:t.triangle,bone:t.bone,point:at.toArray()});}return{base:base.toArray(),tip:tip.toArray(),hits};}
const frames=[],recoveryContacts=[];let rightMin={y:Infinity},leftMin={y:Infinity},maxSocketDifference=0,maxGroupDifference=0,recoverySampleCount=0;
for(let i=0;i<=1000;i++){
 const phase=i/1000;update(phase);const current=state(),diff=delta(idle,current);maxSocketDifference=Math.max(maxSocketDifference,diff.socketComponentDifference);maxGroupDifference=Math.max(maxGroupDifference,diff.groupMatrixDifference);
 const soles={};for(const side of ['right','left']){let min=Infinity,minVertex=-1;for(const index of soleVertices[side]){hero.body.getVertexPosition(index,p).applyMatrix4(hero.body.matrixWorld);if(p.y<min){min=p.y;minVertex=index;}}soles[side]={minY:min,vertex:minVertex};}
 if(soles.right.minY<rightMin.y)rightMin={y:soles.right.minY,phase,vertex:soles.right.vertex};if(soles.left.minY<leftMin.y)leftMin={y:soles.left.minY,phase,vertex:soles.left.vertex};
 const feet={};for(const side of ['right','left']){const prefix=side,ankle=bones[prefix+'Ankle'],ankleWorld=ankle.getWorldPosition(new T.Vector3()),screen=project(ankleWorld),base=baseFootProjection[side],hip=bones[prefix+'Thigh'].getWorldPosition(new T.Vector3()),knee=bones[prefix+'Knee'].getWorldPosition(new T.Vector3()),thighAxis=knee.clone().sub(hip).normalize(),shinAxis=ankleWorld.clone().sub(knee).normalize();feet[side]={ankleWorld:ankleWorld.toArray(),ankleProjectedPixels:screen,projectionDisplacement:[screen[0]-base[0],screen[1]-base[1]],kneeFlexionDegrees:thighAxis.angleTo(shinAxis)*180/Math.PI,footUp:new T.Vector3(0,1,0).applyQuaternion(ankle.getWorldQuaternion(new T.Quaternion())).toArray()};}
 const frame={phase,sole:soles,hipsPosition:bones.hips.position.toArray(),hipsEuler:bones.hips.rotation.toArray().slice(0,3),feet};frames.push(frame);
 if(phase>=.62&&phase<1){recoverySampleCount++;const hit=contact();if(hit.hits.length)recoveryContacts.push({phase,...hit});}
}
update(.44);const damageContact=contact();
const steppedRecovery=[60,30,12,7.8].map(fps=>{
 const h=createHero();h.update(0,{});h.group.updateMatrixWorld(true);const initial=state(h),phases=[];
 for(let i=0;i<Math.ceil(.78*fps);i++){const phase=i/(.78*fps);if(phase<1){h.update(0,{attackProgress:phase});phases.push(phase);}}
 h.update(0,{attackProgress:1});h.group.updateMatrixWorld(true);const final=state(h),difference=delta(initial,final);
 return{fps,previousPhase:phases.at(-1),difference,nonzeroRestEuler:h.body.skeleton.bones.filter(b=>['rightKnee','leftKnee','rightAnkle','leftAnkle'].includes(b.name)).map(b=>({name:b.name,euler:b.rotation.toArray().slice(0,3)}))};
});
// Compare each real sole point to the same nearest-.025 real step cache used
// by navigation.js. Only idle and planted impact are tested, never foot lifts.
const nav=JSON.parse(fs.readFileSync(navFile,'utf8'));
function stairHeight(x,z){if(x<1.35||x>2.45||z< -7.40||z> -6.90)return null;const ix=Math.max(0,Math.min(nav.steps[0].length-1,Math.round((x-1.35)/.025))),iz=Math.max(0,Math.min(nav.steps.length-1,Math.round((z+7.4)/.025))),y=nav.steps[iz][ix];return Number.isFinite(y)?y:null;}
const floorCases=[];
for(const phase of [null,.44]){
 update(phase);const localSoles=Object.fromEntries(['right','left'].map(side=>[side,soleVertices[side].map(index=>({index,point:hero.body.getVertexPosition(index,new T.Vector3()).applyMatrix4(hero.body.matrixWorld)}))]));
 for(let xi=0;xi<=11;xi++)for(const z of [-7.025,-7,-6.975])for(const yaw of [1.05,1.075,1.1,1.125,1.15]){
  const x=1.55+xi*.01,y=stairHeight(x,z);if(y===null)continue;
  const matrix=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw),new T.Vector3(1,1,1)),feet={};
  for(const side of ['right','left']){
   const points=localSoles[side].map(({index,point})=>{const world=point.clone().applyMatrix4(matrix),height=stairHeight(world.x,world.z);return{vertex:index,world:world.toArray(),floor:height,gap:height===null?null:world.y-height};}),valid=points.filter(p=>p.gap!==null),gaps=valid.map(p=>p.gap);
   feet[side]={minGap:Math.min(...gaps),maxGap:Math.max(...gaps),sampledPoints:valid.length,outsideStepCache:points.length-valid.length,pointsWithin3cm:valid.filter(p=>p.gap>=-1e-6&&p.gap<=.03).length,penetratingPoints:valid.filter(p=>p.gap< -1e-6).length,entireFootMoreThan4cmAboveSampledFloor:valid.length>0&&Math.min(...gaps)>.04,points};
  }
  floorCases.push({phase,actor:{x,y,z,yaw},feet});
 }
}
const penetrationCases=floorCases.filter(c=>c.feet.right.penetratingPoints||c.feet.left.penetratingPoints),hoverCases=floorCases.filter(c=>c.feet.right.entireFootMoreThan4cmAboveSampledFloor||c.feet.left.entireFootMoreThan4cmAboveSampledFloor);
const floorSummary={caseCount:floorCases.length,positionRange:{x:[1.55,1.66],z:[-7.025,-6.975],yaw:[1.05,1.15]},phases:[null,.44],stepSample:'.025 nearest / Math.round; exact navigation.json steps lookup',minimumGap:Math.min(...floorCases.flatMap(c=>[c.feet.right.minGap,c.feet.left.minGap])),maximumGap:Math.max(...floorCases.flatMap(c=>[c.feet.right.maxGap,c.feet.left.maxGap])),penetrationCaseCount:penetrationCases.length,entireFootHoverCaseCount:hoverCases.length,firstPenetration:penetrationCases[0]?{phase:penetrationCases[0].phase,actor:penetrationCases[0].actor,rightMinGap:penetrationCases[0].feet.right.minGap,leftMinGap:penetrationCases[0].feet.left.minGap}:null,firstHover:hoverCases[0]?{phase:hoverCases[0].phase,actor:hoverCases[0].actor,rightMinGap:hoverCases[0].feet.right.minGap,leftMinGap:hoverCases[0].feet.left.minGap}:null};
fs.writeFileSync(path.join(outputDir,'stairs-floor.json'),JSON.stringify({scope:'Actual static/planted shoe soles against the production nearest-.025 navigation steps. A toe may overhang a lower step; maximum gap alone does not imply the entire shoe is floating. Entire-foot-hover diagnostic means every valid sampled point is >.04m above its local floor.',summary:floorSummary,cases:floorCases},null,2)+'\n');
const inputIntegrity=inputs.map(file=>({file,sha256:before[file],sha256After:sha(fs.readFileSync(file)),unchanged:before[file]===sha(fs.readFileSync(file))}));
const keyPhases=[0,.12,.24,.28,.35,.44,.60,.68,.74,.82,.88,.94,1],keyFrames=frames.filter(f=>keyPhases.includes(f.phase));
const checks={inputsStable:inputIntegrity.every(x=>x.unchanged),actualSolesNeverBelowLocalGround:rightMin.y>=0&&leftMin.y>=0,swordSocketFixed:maxSocketDifference===0,noActorGroupMovement:maxGroupDifference===0,entryExactlyMatchesIdle:entry.maxBoneMatrixDifference===0&&entry.swordMatrixDifference===0,entryAndRecoveryContinuous:convergence[5].start.tipDistance<convergence[4].start.tipDistance*.11&&convergence[5].end.tipDistance<convergence[4].end.tipDistance*.11,steppedFullBodyRecoveryExactlyMatchesIdle:steppedRecovery.every(s=>s.difference.maxBoneMatrixDifference<1e-10),damageAt44ContactsActualEnemy:damageContact.hits.length>0,noRecoverySecondContact:recoveryContacts.length===0,actualPlantedStepSolesNonpenetrating:floorSummary.minimumGap>=-1e-6,noEntirePlantedShoeFloating:hoverCases.length===0};
const result={kind:'Independent CPU-only H35 action verification; no renderer or production edits',scope:'Actual H34 skinned sole vertices (raw y<.044 and any positive rightAnkle/leftAnkle influence), actor-local ground plane y=0. Enemy is unhurt/static at supplied production stair position as conservative recovery intersection target.',verifier:{file:fileURLToPath(import.meta.url),sha256:sha(fs.readFileSync(fileURLToPath(import.meta.url)))},inputIntegrity,soleVertexCounts:Object.fromEntries(Object.entries(soleVertices).map(([side,indices])=>[side,indices.length])),minimumSoles:{right:rightMin,left:leftMin},sampleCount:frames.length,maxSocketDifference,maxGroupDifference,entry,convergence,steppedRecovery,floorSummary,floorRecord:path.join(outputDir,'stairs-floor.json'),normalCamera:{viewport:[390,844],FOV:39,offset:[6,27,15],actorPosition:actorPosition.toArray(),actorYaw},actualTarget:{player:playerPosition.toArray(),enemy:enemyPosition.toArray(),actorYaw:aim,enemyYaw:foe.group.rotation.y},damageContact,recoveryContacts,recoveryContactCount:recoveryContacts.length,recoveryRange:{startInclusive:.62,endExclusive:1,step:.001,sampleCount:recoverySampleCount},keyFrames,frames,checks,passed:Object.values(checks).every(Boolean)};
fs.writeFileSync(path.join(outputDir,'action-verification.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(outputDir,'action-verification-'+before[runtime].slice(0,8)+'-'+before[action].slice(0,8)+'.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({outputDir,checks,passed:result.passed,minimumSoles:result.minimumSoles,soleVertexCounts:result.soleVertexCounts,damageContactTriangles:result.damageContact.hits.length,recoveryRange:result.recoveryRange,recoveryContactCount:result.recoveryContactCount,recoveryContactPhases:recoveryContacts.map(f=>f.phase),floorSummary},null,2));process.exitCode=result.passed?0:1;
