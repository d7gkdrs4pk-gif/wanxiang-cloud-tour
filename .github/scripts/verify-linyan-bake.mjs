#!/usr/bin/env node
/** CPU-only equivalence and construction benchmark; no camera, renderer or GPU.
 * Run: node .github/scripts/verify-linyan-bake.mjs /workspace/qa-h32/hero-bake.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHero as generatedHero} from './lib/linyan-h31-generator.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const game=path.join(root,'fengming-v2-scene-a');
const T=await import(pathToFileURL(path.join(game,'vendor/three/three.module.js')));
// Resolve the production bare import to the same vendored Three in CPU Node.
// This does not change production sources or add node_modules as a runtime need.
const source=(await fs.readFile(path.join(game,'sample/hero.js'),'utf8'))
 .replace("from 'three'",`from '${pathToFileURL(path.join(game,'vendor/three/three.module.js'))}'`)
 .replace("from '../assets/hero-001/linyan-h31-baked.js'",`from '${pathToFileURL(path.join(game,'assets/hero-001/linyan-h31-baked.js'))}'`);
const {createHero:bakedHero}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const sha=a=>crypto.createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
const failures=[];
const equal=(a,b,label)=>{if(JSON.stringify(a)!==JSON.stringify(b))failures.push(label);};
const report={environment:{runtime:process.version,platform:process.platform,arch:process.arch,kind:'CPU-only Node; not iPhone or browser FPS'},geometry:[],bindings:{},poses:[],benchmark:{}};
const timed=fn=>{const start=performance.now(),hero=fn();return {hero,ms:performance.now()-start};};
const originalFirst=timed(generatedHero),bakedFirst=timed(bakedHero);
const original=originalFirst.hero,baked=bakedFirst.hero;
const originalMeshes=[original.body,...original.sword.children],bakedMeshes=[baked.body,...baked.sword.children];
for(let mesh=0;mesh<originalMeshes.length;mesh++){
 const a=originalMeshes[mesh],b=bakedMeshes[mesh],label=mesh===0?'body':'sword'+(mesh-1),result={mesh:label,arrays:[]};
 equal(Object.keys(a.geometry.attributes),Object.keys(b.geometry.attributes),label+'.attributes');
 for(const key of [...Object.keys(a.geometry.attributes),'index']){
  const A=key==='index'?a.geometry.index:a.geometry.attributes[key],B=key==='index'?b.geometry.index:b.geometry.attributes[key];
  const checks={attribute:key,type:A.array.constructor.name,itemSize:A.itemSize,normalized:A.normalized,bytes:A.array.byteLength,sha256:sha(A.array),match:sha(A.array)===sha(B.array)&&A.array.constructor===B.array.constructor&&A.itemSize===B.itemSize&&A.normalized===B.normalized&&A.gpuType===B.gpuType};
  if(!checks.match)failures.push(label+'.'+key);result.arrays.push(checks);
 }
 for(const prop of ['name','castShadow','receiveShadow','frustumCulled','visible','renderOrder'])equal(a[prop],b[prop],label+'.'+prop);
 equal(a.geometry.groups,b.geometry.groups,label+'.groups');equal(a.geometry.drawRange,b.geometry.drawRange,label+'.drawRange');
 for(const prop of ['position','quaternion','scale'])equal(a[prop].toArray(),b[prop].toArray(),label+'.'+prop);
 report.geometry.push(result);
}
equal(original.stats,baked.stats,'stats');
const materialKeys=['type','name','roughness','metalness','vertexColors','emissiveIntensity','opacity','transparent','side','shadowSide','depthTest','depthWrite','colorWrite','alphaTest','flatShading','toneMapped','forceSinglePass','blending','premultipliedAlpha','dithering','polygonOffset','polygonOffsetFactor','polygonOffsetUnits'];
for(let i=0;i<original.body.material.length;i++){
 const a=original.body.material[i],b=baked.body.material[i];
 for(const key of materialKeys)equal(a[key],b[key],'material'+i+'.'+key);
 equal(a.color.toArray(),b.color.toArray(),'material'+i+'.color');equal(a.emissive.toArray(),b.emissive.toArray(),'material'+i+'.emissive');
}
const float64=matrices=>Float64Array.from(matrices.flatMap(m=>m.elements));
const inversesA=float64(original.body.skeleton.boneInverses),inversesB=float64(baked.body.skeleton.boneInverses);
report.bindings={boneInverseSha256:sha(inversesA),boneInverseBytesExact:sha(inversesA)===sha(inversesB),bodyBindSha256:sha(float64([original.body.bindMatrix])),bodyBindBytesExact:sha(float64([original.body.bindMatrix]))===sha(float64([baked.body.bindMatrix])),bodyBindInverseBytesExact:sha(float64([original.body.bindMatrixInverse]))===sha(float64([baked.body.bindMatrixInverse]))};
if(Object.entries(report.bindings).some(([key,value])=>key.endsWith('Exact')&&!value))failures.push('bind matrices');
const parentA=new T.Group(),parentB=new T.Group();parentA.add(original.group);parentB.add(baked.group);
let maxError=0;
function error(a,b){let delta=0;for(let i=0;i<a.length;i++)delta=Math.max(delta,Math.abs(a[i]-b[i]));maxError=Math.max(maxError,delta);return delta;}
let frame=0;
function comparePose(label,dt,state,yaw){
 parentA.position.set(1.58,.7140992864,-7);parentB.position.copy(parentA.position);
 parentA.rotation.y=yaw;parentB.rotation.y=yaw;
 original.update(dt,state);baked.update(dt,state);
 parentA.updateMatrixWorld(true);parentB.updateMatrixWorld(true);original.body.skeleton.update();baked.body.skeleton.update();
 let poseError=0;
 original.body.skeleton.bones.forEach((a,i)=>{
  const b=baked.body.skeleton.bones[i];equal(a.name,b.name,label+'.bone-name');
  for(const prop of ['position','quaternion','scale'])poseError=Math.max(poseError,error(a[prop].toArray(),b[prop].toArray()));
  poseError=Math.max(poseError,error(a.matrixWorld.elements,b.matrixWorld.elements));
 });
 const skinMatrixBytesExact=sha(original.body.skeleton.boneMatrices)===sha(baked.body.skeleton.boneMatrices);
 const tipA=original.swordTipWorld().toArray(),tipB=baked.swordTipWorld().toArray(),baseA=original.bladeBaseWorld().toArray(),baseB=baked.bladeBaseWorld().toArray();
 poseError=Math.max(poseError,error(tipA,tipB),error(baseA,baseB));
 // Check actual skinned surface, including collar, sleeve and weighted robe,
 // rather than trusting only bone count or local pose metadata.
 const vertices=original.body.geometry.attributes.position.count;
 const vA=new T.Vector3(),vB=new T.Vector3();
 for(let i=0;i<vertices;i+=37){original.body.getVertexPosition(i,vA);baked.body.getVertexPosition(i,vB);poseError=Math.max(poseError,error(vA.toArray(),vB.toArray()));}
 if(poseError>1e-12||!skinMatrixBytesExact)failures.push(label+'.pose');
 report.poses.push({frame:frame++,label,dt,state,yaw,maxAbsoluteError:poseError,skinMatrixBytesExact,swordTip:tipB,bladeBase:baseB});
}
comparePose('default idle',0,{},-.6);
for(let i=0;i<16;i++)comparePose('idle '+i,1/60,{moving:false},-.6);
for(let i=0;i<40;i++)comparePose('walk and turn '+i,1/60,{moving:true,speed:1},-.6+i*.031);
for(const p of [0,.08,.16,.28,.42,.44,.46,.50,.61,.86,.999])comparePose('physical sword '+p,.78/11,{moving:false,attackProgress:p},.73);
for(let i=0;i<8;i++)comparePose('recover '+i,1/60,{moving:false,attackProgress:null},.73);
// Warm runs avoid counting dynamic import/JIT and include only createHero().
const originalMs=[],bakedMs=[];
function dispose(hero){const geometries=new Set(),materials=new Set();hero.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();hero.body.skeleton.dispose();}
for(let i=0;i<12;i++){let run=timed(generatedHero);originalMs.push(run.ms);dispose(run.hero);run=timed(bakedHero);bakedMs.push(run.ms);dispose(run.hero);}
const summary=values=>{const sorted=[...values].sort((a,b)=>a-b);return {runs:values.length,medianMs:(sorted[5]+sorted[6])/2,minMs:sorted[0],maxMs:sorted.at(-1),allMs:values};};
report.benchmark={firstConstructionMs:{generated:originalFirst.ms,bakedWithFirstDecode:bakedFirst.ms},generatedWarm:summary(originalMs),bakedWarm:summary(bakedMs)};
// Count matrix-tree visits in a damage frame including immediate blade queries.
// The renderer is intentionally excluded: it still performs its ordinary final
// pose update. This measures removal of a redundant full tree, not browser FPS.
function matrixVisits(create){
 const hero=create(),parent=new T.Group();parent.add(hero.group);parent.rotation.y=.73;
 const proto=T.Object3D.prototype,world=proto.updateWorldMatrix,matrix=proto.updateMatrixWorld;
 const calls={updateWorldMatrix:0,updateMatrixWorld:0};
 proto.updateWorldMatrix=function(...args){calls.updateWorldMatrix++;return world.apply(this,args);};
 proto.updateMatrixWorld=function(...args){calls.updateMatrixWorld++;return matrix.apply(this,args);};
 try{hero.update(1/60,{attackProgress:.44});hero.bladeBaseWorld();hero.swordTipWorld();}
 finally{proto.updateWorldMatrix=world;proto.updateMatrixWorld=matrix;dispose(hero);}
 return calls;
}
report.benchmark.attackFrameMatrixVisits={generated:matrixVisits(generatedHero),baked:matrixVisits(bakedHero)};
report.stats=baked.stats;report.maxAbsolutePoseError=maxError;report.poseFrames=report.poses.length;report.passed=failures.length===0;report.failures=failures;
const output=process.argv[2];if(output){await fs.mkdir(path.dirname(path.resolve(output)),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,geometryArrays:report.geometry.reduce((n,g)=>n+g.arrays.length,0),bindings:report.bindings,poseFrames:report.poseFrames,maxAbsolutePoseError:maxError,firstConstructionMs:report.benchmark.firstConstructionMs,warmMedianMs:{generated:report.benchmark.generatedWarm.medianMs,baked:report.benchmark.bakedWarm.medianMs},attackFrameMatrixVisits:report.benchmark.attackFrameMatrixVisits,failures},null,2));
if(!report.passed)process.exitCode=1;
