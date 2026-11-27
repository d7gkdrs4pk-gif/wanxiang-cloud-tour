// CPU-only inspection. Does not load a renderer or modify production resources.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const root=path.join(repo,'fengming-v2-scene-a');
const output=process.argv[2]??'/tmp/linyan-h34-verification.json';
const runtimeFile=path.join(root,'sample/hero.js');
const generatorFile=path.join(repo,'.github/scripts/lib/linyan-h34-generator.mjs');
const T=await import(pathToFileURL(path.join(root,'vendor/three/three.module.js')).href);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const trackedInputs=[runtimeFile,generatorFile,path.join(root,'assets/hero-034/source/body-mesh.json.gz'),path.join(root,'assets/hero-034/linyan-h34-baked.js'),path.join(root,'assets/hero-034/linyan-h34.glb'),path.join(root,'assets/hero-033/linyan-h33-baked.js'),path.join(root,'sample/enemy.js'),path.join(repo,'.github/scripts/lib/linyan-h33-runtime.mjs')];
const initialInputHashes=Object.fromEntries(trackedInputs.map(file=>[file,sha(fs.readFileSync(file))]));
const runtimeSource=fs.readFileSync(runtimeFile,'utf8');
let runtimeModule=runtimeSource.replace(/from 'three'/,`from ${JSON.stringify(pathToFileURL(path.join(root,'vendor/three/three.module.js')).href)}`);
runtimeModule=runtimeModule.replace(/from '(\.\.\/assets\/[^']+)'/,(_,relative)=>{
 const baked=fs.readFileSync(path.resolve(path.dirname(runtimeFile),relative),'utf8');
 return `from ${JSON.stringify('data:text/javascript;base64,'+Buffer.from(baked).toString('base64'))}`;
});
const {createHero}=await import('data:text/javascript;base64,'+Buffer.from(runtimeModule).toString('base64'));
const {createHero:createGeneratedHero}=await import(pathToFileURL(generatorFile).href);
const enemySource=fs.readFileSync(path.join(root,'sample/enemy.js'),'utf8').replace(/from 'three'/,`from ${JSON.stringify(pathToFileURL(path.join(root,'vendor/three/three.module.js')).href)}`);
const {createEnemy}=await import('data:text/javascript;base64,'+Buffer.from(enemySource).toString('base64'));
const q=new T.Quaternion(),v=new T.Vector3();
const angle=(a,b)=>new T.Quaternion().fromArray(a).angleTo(new T.Quaternion().fromArray(b))*180/Math.PI;
const distance=(a,b)=>new T.Vector3().fromArray(a).distanceTo(new T.Vector3().fromArray(b));
const maxArrayDifference=(a,b)=>Math.max(...a.map((x,i)=>Math.abs(x-b[i])));

function snapshot(hero){
 hero.group.updateMatrixWorld(true);
 return {
  bones:hero.body.skeleton.bones.map(b=>({name:b.name,position:b.position.toArray(),quaternion:b.quaternion.toArray(),scale:b.scale.toArray(),worldPosition:b.getWorldPosition(v).toArray(),worldQuaternion:b.getWorldQuaternion(q).toArray(),worldMatrix:b.matrixWorld.toArray()})),
  sword:{parent:hero.sword.parent.name,position:hero.sword.position.toArray(),quaternion:hero.sword.quaternion.toArray(),scale:hero.sword.scale.toArray(),worldPosition:hero.sword.getWorldPosition(v).toArray(),worldQuaternion:hero.sword.getWorldQuaternion(q).toArray(),worldMatrix:hero.sword.matrixWorld.toArray()},
  tip:hero.swordTipWorld().toArray(),base:hero.bladeBaseWorld().toArray()
 };
}
function compare(a,b){
 const perBone=a.bones.map((x,i)=>{const y=b.bones[i];return {name:x.name,localPositionDistance:distance(x.position,y.position),localQuaternionAngleDeg:angle(x.quaternion,y.quaternion),localScaleMaxDifference:maxArrayDifference(x.scale,y.scale),worldPositionDistance:distance(x.worldPosition,y.worldPosition),worldQuaternionAngleDeg:angle(x.worldQuaternion,y.worldQuaternion),worldMatrixMaxDifference:maxArrayDifference(x.worldMatrix,y.worldMatrix)};});
 const max=key=>Math.max(...perBone.map(b=>b[key]));
 return {
  maxLocalPositionDistance:max('localPositionDistance'),maxLocalQuaternionAngleDeg:max('localQuaternionAngleDeg'),maxWorldPositionDistance:max('worldPositionDistance'),maxWorldQuaternionAngleDeg:max('worldQuaternionAngleDeg'),maxWorldMatrixDifference:max('worldMatrixMaxDifference'),
  swordLocalPositionDistance:distance(a.sword.position,b.sword.position),swordLocalQuaternionAngleDeg:angle(a.sword.quaternion,b.sword.quaternion),swordWorldPositionDistance:distance(a.sword.worldPosition,b.sword.worldPosition),swordWorldQuaternionAngleDeg:angle(a.sword.worldQuaternion,b.sword.worldQuaternion),swordWorldMatrixMaxDifference:maxArrayDifference(a.sword.worldMatrix,b.sword.worldMatrix),tipDistance:distance(a.tip,b.tip),baseDistance:distance(a.base,b.base),perBone
 };
}
function pose(hero,phase,state={}){hero.update(0,{...state,attackProgress:phase});return snapshot(hero);}
const eps=1e-6;
const hero=createHero();
const idle=pose(hero,null),start=pose(hero,0),before28=pose(hero,.28-eps),after28=pose(hero,.28+eps),beforeEnd=pose(hero,1-eps),released=pose(hero,1);
const standing={idleToAttack0:compare(idle,start),point28LeftRight:compare(before28,after28),attackEndToIdle:compare(beforeEnd,released)};
// A linearly interpolated quaternion track is C0 rather than zero-velocity at
// each key. Verify that left/right differences converge to zero with epsilon;
// a true finite jump would remain constant as epsilon shrinks.
const epsilonConvergence=[1e-3,1e-4,1e-5,1e-6,1e-7,1e-8].map(e=>{
 const around=compare(pose(hero,.28-e),pose(hero,.28+e));
 const recover=compare(pose(hero,1-e),pose(hero,1));
 return {epsilon:e,point28:{swordWorldMatrixMaxDifference:around.swordWorldMatrixMaxDifference,swordWorldPositionDistance:around.swordWorldPositionDistance,tipDistance:around.tipDistance},recovery:{swordWorldMatrixMaxDifference:recover.swordWorldMatrixMaxDifference,swordWorldPositionDistance:recover.swordWorldPositionDistance,tipDistance:recover.tipDistance}};
});

// Check boundary continuity against the same moving/turning state and gait.
const moving=createHero();
for(let i=0;i<25;i++)moving.update(.016,{moving:true,speed:1.2,turn:.8});
const movingIdle=pose(moving,null,{moving:true,speed:1.2,turn:.8});
const movingStart=pose(moving,0,{moving:true,speed:1.2,turn:.8});
const movingEnd=pose(moving,1-eps,{moving:true,speed:1.2,turn:.8});
const movingReleased=pose(moving,1,{moving:true,speed:1.2,turn:.8});
const walking={idleToAttack0:compare(movingIdle,movingStart),attackEndToIdle:compare(movingEnd,movingReleased)};

// Fixed socket matrix, including 1001 samples and endpoint releases.
const sockets=[];
for(let i=0;i<=1000;i++)sockets.push(pose(hero,i/1000).sword);
const reference=sockets[0];
const fixedSocket={parent:reference.parent,position:reference.position,quaternion:reference.quaternion,scale:reference.scale,sampleCount:sockets.length,maxPositionDistance:Math.max(...sockets.map(s=>distance(s.position,reference.position))),maxQuaternionComponentDifference:Math.max(...sockets.map(s=>maxArrayDifference(s.quaternion,reference.quaternion))),maxScaleDifference:Math.max(...sockets.map(s=>maxArrayDifference(s.scale,reference.scale))),parentUnchanged:sockets.every(s=>s.parent===reference.parent)};

// Physical blade at damage phase must point close to actor +Z, for several yaws.
const hits=[];
for(const yaw of [0,.7,-2.4]){
 hero.group.rotation.y=yaw;
 const s=pose(hero,.44),direction=new T.Vector3().fromArray(s.tip).sub(new T.Vector3().fromArray(s.base)).normalize();
 const actorQ=hero.group.getWorldQuaternion(new T.Quaternion()),local=direction.clone().applyQuaternion(actorQ.invert());
 hits.push({yaw,physicalWorldDirection:direction.toArray(),physicalActorLocalDirection:local.toArray(),angleToActorForwardDeg:local.angleTo(new T.Vector3(0,0,1))*180/Math.PI,horizontalYawDeg:Math.atan2(local.x,local.z)*180/Math.PI,pitchDeg:Math.asin(local.y)*180/Math.PI});
}
hero.group.rotation.y=0;

// Validate the physical blade against the actual animated enemy geometry,
// rather than assuming actor +Z passes through an offset wrist and target.
const actualPlayer=[1.6206605404,.7069842713,-6.9944347705];
const actualEnemy=[2.5079934731,.0243720022,-6.5172228998];
const aim=Math.atan2(actualEnemy[0]-actualPlayer[0],actualEnemy[2]-actualPlayer[2]);
function physicalContact(playerPosition,enemyPosition){
 const h=createHero(),foe=createEnemy();
 h.group.position.fromArray(playerPosition);h.group.rotation.y=aim;pose(h,.44);
 foe.group.position.fromArray(enemyPosition);foe.group.rotation.y=Math.atan2(playerPosition[0]-enemyPosition[0],playerPosition[2]-enemyPosition[2]);foe.update(0,{});
 h.group.updateMatrixWorld(true);foe.group.updateMatrixWorld(true);foe.mesh.skeleton.update();
 const base=h.bladeBaseWorld(),tip=h.swordTipWorld(),line=new T.Line3(base,tip),length=base.distanceTo(tip),ray=new T.Ray(base.clone(),tip.clone().sub(base).normalize());
 const mesh=foe.mesh,g=mesh.geometry,idx=g.index,skin=g.getAttribute('skinIndex'),weights=g.getAttribute('skinWeight');
 const world=[],local=[],binding=[];
 for(let i=0;i<g.getAttribute('position').count;i++){
  const p=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld);world.push(p);local.push(foe.group.worldToLocal(p.clone()));
  let major=0;for(let j=1;j<4;j++)if(weights.getComponent(i,j)>weights.getComponent(i,major))major=j;
  binding.push(foe.bones[skin.getComponent(i,major)].name);
 }
 const upperNames=new Set(['head','chest','rightShoulder','leftShoulder']);
 const torsoNames=new Set(['hips','spine','chest']);
 const regionBox=names=>{const box=new T.Box3();for(let i=0;i<world.length;i++)if(names.has(binding[i]))box.expandByPoint(world[i]);return box;};
 const headShoulderBox=regionBox(upperNames),torsoBox=regionBox(torsoNames);
 const triangleHits=[];let minimumVertexDistance=Infinity;
 const nearest=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),point=new T.Vector3();
 for(let i=0;i<world.length;i++)if(upperNames.has(binding[i]))minimumVertexDistance=Math.min(minimumVertexDistance,line.closestPointToPoint(world[i],true,nearest).distanceTo(world[i]));
 for(let i=0;i<idx.count;i+=3){
  const ia=idx.getX(i),ib=idx.getX(i+1),ic=idx.getX(i+2),name=binding[ia];
  if(!upperNames.has(name)&&!torsoNames.has(name))continue;
  a.copy(world[ia]);b.copy(world[ib]);c.copy(world[ic]);
  const hit=ray.intersectTriangle(a,b,c,false,point);
  if(hit&&base.distanceTo(hit)<=length+1e-9)triangleHits.push({triangle:i/3,bone:name,point:hit.toArray(),distanceAlongBlade:base.distanceTo(hit)});
 }
 function boxHit(box){const p=ray.intersectBox(box,new T.Vector3());return p&&base.distanceTo(p)<=length+1e-9?{point:p.toArray(),distanceAlongBlade:base.distanceTo(p)}:null;}
 const headShoulderBoundsHit=boxHit(headShoulderBox),torsoBoundsHit=boxHit(torsoBox);
 const localTip=foe.group.worldToLocal(tip.clone());
 const bladeMinGroundClearance=Math.min(base.y,tip.y)-enemyPosition[1];
 return {player:playerPosition,enemy:enemyPosition,playerYaw:aim,enemyYaw:foe.group.rotation.y,phase:.44,blade:{base:base.toArray(),tip:tip.toArray(),enemyLocalTip:localTip.toArray(),minimumGroundClearance:bladeMinGroundClearance},headShoulderBox:{min:headShoulderBox.min.toArray(),max:headShoulderBox.max.toArray()},torsoBox:{min:torsoBox.min.toArray(),max:torsoBox.max.toArray()},headShoulderBoundsHit,torsoBoundsHit,triangleHits,minimumHeadShoulderVertexDistance:minimumVertexDistance,headShoulderContact:triangleHits.some(t=>upperNames.has(t.bone))||Boolean(headShoulderBoundsHit),torsoContact:triangleHits.some(t=>torsoNames.has(t.bone))||Boolean(torsoBoundsHit)};
}
const physicalHits={actualStairHeight:physicalContact(actualPlayer,actualEnemy),sameGround:physicalContact([actualPlayer[0],actualEnemy[1],actualPlayer[2]],actualEnemy)};

// H34 replaces only geometry/materials. Compare every authored key and a
// continuous moving/turning history against the retained H33 runtime.
const h33RuntimeFile=path.join(repo,'.github/scripts/lib/linyan-h33-runtime.mjs');
const {createHero:createH33Hero}=await import(pathToFileURL(h33RuntimeFile).href);
const h33=createH33Hero(),h34=createHero(),h33PoseComparison=[];
for(const yaw of [0,.7,-2.4]){
 h33.group.rotation.y=yaw;h34.group.rotation.y=yaw;
 for(const p of [null,...Array.from({length:51},(_,i)=>i/50),.28-1e-6,.28+1e-6,1-1e-6]){
  const d=compare(pose(h33,p),pose(h34,p));
  h33PoseComparison.push({yaw,phase:p,maxBoneWorldMatrixDifference:d.maxWorldMatrixDifference,swordWorldMatrixDifference:d.swordWorldMatrixMaxDifference,tipDistance:d.tipDistance,baseDistance:d.baseDistance});
 }
}
const h33Moving=createH33Hero(),h34Moving=createHero(),h33MovingComparison=[];
for(let i=0;i<150;i++){
 const state={moving:i<60||i>=120,speed:1.2,turn:Math.sin(i*.08),attackProgress:i>=60&&i<112?(i-60)/51:null};
 h33Moving.group.rotation.y=Math.sin(i*.035)*1.1;h34Moving.group.rotation.y=h33Moving.group.rotation.y;
 h33Moving.update(1/60,state);h34Moving.update(1/60,state);
 const d=compare(snapshot(h33Moving),snapshot(h34Moving));
 h33MovingComparison.push({frame:i,maxBoneWorldMatrixDifference:d.maxWorldMatrixDifference,swordWorldMatrixDifference:d.swordWorldMatrixMaxDifference,tipDistance:d.tipDistance,baseDistance:d.baseDistance});
}

// Generator/runtime pose equivalence protects against stale baked-runtime curves.
const generated=createGeneratedHero(),generatorRuntime=[];
for(const p of [null,0,.06,.12,.16,.28,.44,.61,.82,.94,1-eps,1])generatorRuntime.push({phase:p,difference:compare(pose(generated,p),pose(hero,p))});

// Byte-precise independent verification of the offline mesh weld. Source JSON
// first rounds to its declared runtime Float32/Uint16 types, then both raw and
// baked indexed triangles are expanded in original draw order for comparison.
const rawBodyFile=path.join(root,'assets/hero-034/source/body-mesh.json.gz');
const rawBody=JSON.parse(gunzipSync(fs.readFileSync(rawBodyFile)).toString('utf8'));
const baked34File=path.join(root,'assets/hero-034/linyan-h34-baked.js');
const {getBakedHeroData:getBaked34}=await import(pathToFileURL(baked34File).href);
const {getBakedHeroData:getBaked33}=await import(pathToFileURL(path.join(root,'assets/hero-033/linyan-h33-baked.js')).href);
const data34=getBaked34(),data33=getBaked33(),bakedBody=data34.geometries[data34.body.geometry];
const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
const specs=[['position',3,Float32Array],['normal',3,Float32Array],['uv',2,Float32Array],['skinIndex',4,Uint16Array],['skinWeight',4,Float32Array]];
const typedRaw=Object.fromEntries(specs.map(([name,,Ctor])=>[name,new Ctor(rawBody[name])]));
const attributeChecks=[];
for(const [name,itemSize,Ctor]of specs){
 const raw=typedRaw[name],actual=bakedBody.attributes[name],rawExpanded=new Ctor(rawBody.index.length*itemSize),bakedExpanded=new Ctor(bakedBody.index.array.length*itemSize);
 for(let i=0;i<rawBody.index.length;i++)for(let k=0;k<itemSize;k++)rawExpanded[i*itemSize+k]=raw[rawBody.index[i]*itemSize+k];
 for(let i=0;i<bakedBody.index.array.length;i++)for(let k=0;k<itemSize;k++)bakedExpanded[i*itemSize+k]=actual.array[bakedBody.index.array[i]*itemSize+k];
 const expectedBytes=bytes(rawExpanded),actualBytes=bytes(bakedExpanded);let mismatchScalars=0,firstMismatch=null;
 for(let i=0;i<rawExpanded.length;i++)if(!Object.is(rawExpanded[i],bakedExpanded[i])){mismatchScalars++;if(firstMismatch===null)firstMismatch={component:i,raw:rawExpanded[i],baked:bakedExpanded[i]};}
 attributeChecks.push({name,itemSize,expectedType:Ctor.name,actualType:actual.array.constructor.name,normalized:actual.normalized,sourceVertices:raw.length/itemSize,bakedVertices:actual.array.length/itemSize,expandedScalars:rawExpanded.length,expandedBytes:expectedBytes.length,rawExpandedSha256:sha(expectedBytes),bakedExpandedSha256:sha(actualBytes),bytesExact:expectedBytes.equals(actualBytes),mismatchScalars,firstMismatch});
}
function vertexTupleKey(attributes,index){return specs.map(([name,itemSize])=>{const a=attributes[name],n=a.BYTES_PER_ELEMENT;return bytes(a).subarray(index*itemSize*n,(index+1)*itemSize*n).toString('hex');}).join('|');}
const uniqueRawTuples=new Set(rawBody.index.map(i=>vertexTupleKey(typedRaw,i)));
const bakedArrays=Object.fromEntries(specs.map(([name])=>[name,bakedBody.attributes[name].array]));
const bakedVertexCount=bakedBody.attributes.position.array.length/3;
const uniqueBakedTuples=new Set(Array.from({length:bakedVertexCount},(_,i)=>vertexTupleKey(bakedArrays,i)));
const meshVerification={rawBodyFile,rawCompressedSha256:sha(fs.readFileSync(rawBodyFile)),baked34File,bakedSha256:sha(fs.readFileSync(baked34File)),sourceSplitVertexCount:rawBody.vertices,sourceTriangles:rawBody.triangles,bakedVertexCount,bakedIndexCount:bakedBody.index.array.length,bakedIndexType:bakedBody.index.array.constructor.name,bakedTriangles:bakedBody.index.array.length/3,sourceUniqueAttributeTuples:uniqueRawTuples.size,bakedUniqueAttributeTuples:uniqueBakedTuples.size,bakedUsedVertices:new Set(bakedBody.index.array).size,attributeChecks};

// Compare names, hierarchy, original local transforms and Float64 bind data.
function exactly(a,b){
 if(ArrayBuffer.isView(a)&&ArrayBuffer.isView(b))return a.constructor===b.constructor&&bytes(a).equals(bytes(b));
 if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((x,i)=>exactly(x,b[i]));
 if(a&&b&&typeof a==='object'&&typeof b==='object'){const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&exactly(a[k],b[k]));}
 return Object.is(a,b);
}
const bindInverse34=new Float64Array(data34.boneInverses.flatMap(m=>Array.from(m))),bindInverse33=new Float64Array(data33.boneInverses.flatMap(m=>Array.from(m)));
const bindVerification={h34Bones:data34.bones.length,h33Bones:data33.bones.length,definitionsExactlyEqual:exactly(data34.bones,data33.bones),perBoneDefinitions:data34.bones.map((b,i)=>({index:i,name:b.name,parent:b.parent,exactlyEqual:exactly(b,data33.bones[i])})),bindInverseBytes:bytes(bindInverse34).length,bindInverseSha256H34:sha(bytes(bindInverse34)),bindInverseSha256H33:sha(bytes(bindInverse33)),bindInversesExactlyEqual:bytes(bindInverse34).equals(bytes(bindInverse33)),bodyBindMatrixExactlyEqual:exactly(data34.body.bindMatrix,data33.body.bindMatrix),bodyBindMatrixInverseExactlyEqual:exactly(data34.body.bindMatrixInverse,data33.body.bindMatrixInverse)};

const glbFile=path.join(root,'assets/hero-034/linyan-h34.glb'),glbBytes=fs.readFileSync(glbFile),jsonLength=glbBytes.readUInt32LE(12),glb=JSON.parse(glbBytes.subarray(20,20+jsonLength).toString('utf8'));
const glbVerification={file:glbFile,sha256:sha(glbBytes),bytes:glbBytes.length,skins:glb.skins.length,skinJointCounts:glb.skins.map(s=>s.joints.length),skinJointNames:glb.skins.map(s=>s.joints.map(i=>glb.nodes[i].name)),clips:glb.animations.map(a=>({name:a.name,channels:a.channels.length,samplers:a.samplers.length,duration:Math.max(...a.samplers.map(s=>glb.accessors[s.input].max?.[0]??0))})),materialCount:glb.materials.length,materialNames:glb.materials.map(m=>m.name),imageCount:glb.images.length,images:glb.images.map(i=>({name:i.name,mimeType:i.mimeType,embedded:typeof i.bufferView==='number'})),meshCount:glb.meshes.length};
const inputIntegrity=trackedInputs.map(file=>({file,sha256:initialInputHashes[file],sha256After:sha(fs.readFileSync(file)),unchangedDuringVerification:initialInputHashes[file]===sha(fs.readFileSync(file))}));

const checks={
 attack0MatchesIdleExactly:standing.idleToAttack0.maxWorldMatrixDifference===0&&standing.idleToAttack0.swordWorldMatrixMaxDifference===0,
 attack0MatchesWalkingExactly:walking.idleToAttack0.maxWorldMatrixDifference===0&&walking.idleToAttack0.swordWorldMatrixMaxDifference===0,
 point28Continuous:standing.point28LeftRight.maxWorldMatrixDifference<1e-5&&standing.point28LeftRight.swordWorldMatrixMaxDifference<1e-5&&epsilonConvergence[5].point28.tipDistance<epsilonConvergence[4].point28.tipDistance*.11,
 recoveryConvergesToIdle:standing.attackEndToIdle.maxWorldMatrixDifference<1e-5&&standing.attackEndToIdle.swordWorldMatrixMaxDifference<1e-5&&epsilonConvergence[5].recovery.tipDistance<epsilonConvergence[4].recovery.tipDistance*.11,
 walkingRecoveryConverges:walking.attackEndToIdle.maxWorldMatrixDifference<1e-5&&walking.attackEndToIdle.swordWorldMatrixMaxDifference<1e-5,
 swordSocketFixed:fixedSocket.maxPositionDistance===0&&fixedSocket.maxQuaternionComponentDifference===0&&fixedSocket.maxScaleDifference===0&&fixedSocket.parentUnchanged,
 actualHighStepSwordContactsHeadShoulder:physicalHits.actualStairHeight.headShoulderContact,
 sameGroundSwordContactsWaistOrTorso:physicalHits.sameGround.torsoContact,
 sameGroundBladeStaysAboveGround:physicalHits.sameGround.blade.minimumGroundClearance>0,
 h33AuthoredKeyPosesUnchanged:h33PoseComparison.every(p=>p.maxBoneWorldMatrixDifference===0&&p.swordWorldMatrixDifference===0&&p.tipDistance===0&&p.baseDistance===0),
 h33MovingTurningHistoryUnchanged:h33MovingComparison.every(p=>p.maxBoneWorldMatrixDifference===0&&p.swordWorldMatrixDifference===0&&p.tipDistance===0&&p.baseDistance===0),
 generatorRuntimeEquivalent:generatorRuntime.every(g=>g.difference.maxWorldMatrixDifference<1e-10&&g.difference.swordWorldMatrixMaxDifference<1e-10),
 rawTriangleAttributesByteExact:attributeChecks.every(a=>a.bytesExact&&a.expectedType===a.actualType&&!a.normalized),
 exactWeldOnly:meshVerification.sourceUniqueAttributeTuples===bakedVertexCount&&meshVerification.bakedUniqueAttributeTuples===bakedVertexCount&&meshVerification.bakedUsedVertices===bakedVertexCount&&rawBody.index.length===bakedBody.index.array.length,
 all22OriginalBonesAndBindMatricesExact:bindVerification.h34Bones===22&&bindVerification.h33Bones===22&&bindVerification.definitionsExactlyEqual&&bindVerification.bindInversesExactlyEqual&&bindVerification.bodyBindMatrixExactlyEqual&&bindVerification.bodyBindMatrixInverseExactlyEqual,
 glb22Joints3Clips2Materials1Image:glbVerification.skinJointCounts.every(n=>n===22)&&glbVerification.clips.length===3&&glbVerification.materialCount===2&&glbVerification.imageCount===1,
 inputsStableDuringVerification:inputIntegrity.every(i=>i.unchangedDuringVerification)
};
const result={kind:'CPU only; no renderer, no GPU',scope:'Data fidelity, rig/animation continuity and physical blade contacts. This is not an art quality approval.',continuityCriterion:'C0 position/orientation continuity; epsilon convergence separates a finite jump from finite track velocity. Linear slerp keys do not imply C1 continuity.',contactCriterion:'Finite physical blade segment intersects actual skinned enemy head/shoulder or torso triangles or corresponding actual vertex AABB. High-step test uses supplied production positions; same-ground test changes only hero Y. Actor-forward direction is diagnostic, not a hit criterion.',runtimeFile,runtimeSha256:sha(runtimeSource),generatorFile,generatorSha256:sha(fs.readFileSync(generatorFile)),enemyFile:path.join(root,'sample/enemy.js'),enemySha256:sha(fs.readFileSync(path.join(root,'sample/enemy.js'))),inputIntegrity,eps,epsilonConvergence,standing,walking,fixedSocket,hits,physicalHits,h33RuntimeFile,h33PoseComparison,h33MovingComparison,generatorRuntime,meshVerification,bindVerification,glbVerification,checks,passed:Object.values(checks).every(Boolean)};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({output,checks,passed:result.passed,standing:Object.fromEntries(Object.entries(standing).map(([k,d])=>[k,{maxWorldMatrixDifference:d.maxWorldMatrixDifference,maxBoneWorldPositionDistance:d.maxWorldPositionDistance,swordWorldPositionDistance:d.swordWorldPositionDistance,tipDistance:d.tipDistance}])),physicalHits,h33KeyPoseSamples:h33PoseComparison.length,h33MovingFrames:h33MovingComparison.length,meshVerification,bindVerification,glbVerification,fixedSocket},null,2));
process.exitCode=result.passed?0:1;
