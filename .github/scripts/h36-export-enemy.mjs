/** Serialize the existing createEnemy into a portable review GLB. CPU only.
 * No generation/animation code or runtime asset is changed by this exporter.
 * node .github/scripts/h36-export-enemy.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const game=path.join(repo,'fengming-v2-scene-a');
const out=path.join(game,'assets/actors-036-review');
const source=path.join(game,'sample/enemy.js');
const bytes=fs.readFileSync(source),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const rewritten=bytes.toString().replace(/from ['"]three['"]/g,`from '${pathToFileURL(path.join(game,'vendor/three/three.module.js')).href}'`);
const {createEnemy}=await import('data:text/javascript;base64,'+Buffer.from(rewritten).toString('base64'));
const enemy=createEnemy();enemy.update(0);enemy.group.updateMatrixWorld(true);
const {mesh,bones,materials}=enemy,geometry=mesh.geometry;

const chunks=[],bufferViews=[],accessors=[];let byteLength=0;
function append(typed,target){
 const data=Buffer.from(typed.buffer,typed.byteOffset,typed.byteLength),view={buffer:0,byteOffset:byteLength,byteLength:data.length};
 if(target)view.target=target;
 const vi=bufferViews.length;bufferViews.push(view);chunks.push(data);
 const pad=(4-data.length%4)%4;if(pad)chunks.push(Buffer.alloc(pad));byteLength+=data.length+pad;return vi;
}
function accessor(typed,size,type,{bounds=false,target=34962}={}){
 const a={bufferView:append(typed,target),componentType:typed instanceof Float32Array?5126:typed instanceof Uint16Array?5123:5125,count:typed.length/size,type};
 if(bounds){a.min=Array(size).fill(Infinity);a.max=Array(size).fill(-Infinity);for(let i=0;i<typed.length;i++){const k=i%size;a.min[k]=Math.min(a.min[k],typed[i]);a.max[k]=Math.max(a.max[k],typed[i]);}}
 const ai=accessors.length;accessors.push(a);return ai;
}
const attributes={};
const mapping={position:['POSITION',3,'VEC3'],normal:['NORMAL',3,'VEC3'],color:['COLOR_0',3,'VEC3'],skinIndex:['JOINTS_0',4,'VEC4'],skinWeight:['WEIGHTS_0',4,'VEC4']};
for(const [key,[name,size,type]] of Object.entries(mapping))attributes[name]=accessor(geometry.attributes[key].array,size,type,{bounds:key==='position'});
const indices=geometry.index.array,indexView=append(indices,34963),indexType=indices instanceof Uint16Array?5123:5125;
const primitives=geometry.groups.map(g=>{const ai=accessors.length;accessors.push({bufferView:indexView,byteOffset:g.start*indices.BYTES_PER_ELEMENT,componentType:indexType,count:g.count,type:'SCALAR'});return {attributes,indices:ai,material:g.materialIndex,mode:4};});
const inverseBind=Float32Array.from(mesh.skeleton.boneInverses.flatMap(m=>m.toArray()));
const inverseAccessor=accessor(inverseBind,16,'MAT4',{target:undefined});
const nodes=[{name:'H35 existing enemy — actor-local 1:1',children:[]}];
for(const b of bones)nodes.push({name:b.name,translation:b.position.toArray(),rotation:b.quaternion.toArray(),children:[]});
bones.forEach((b,i)=>{const pi=bones.indexOf(b.parent);nodes[pi<0?0:pi+1].children.push(i+1);});
nodes.push({name:mesh.name,mesh:0,skin:0});nodes[0].children.push(nodes.length-1);
for(const n of nodes)if(n.children?.length===0)delete n.children;
const animations=[];
for(const [name,duration,hit] of [['EnemyIdle',2,false],['EnemyHit',.34,true]]){
 const actor=createEnemy(),count=Math.ceil(duration*30),times=[...new Set([...Array.from({length:count+1},(_,i)=>i*duration/count),...(hit?[.075,.125]:[])])].sort((a,b)=>a-b);
 const poses=bones.map(()=>({position:[],quaternion:[]}));let previous=0;
 for(const time of times){actor.update(time-previous,{hitProgress:hit?time/duration:null});previous=time;actor.bones.forEach((b,i)=>{poses[i].position.push(...b.position.toArray());poses[i].quaternion.push(...b.quaternion.toArray());});}
 const input=accessor(Float32Array.from(times),1,'SCALAR',{bounds:true,target:undefined}),samplers=[],channels=[];
 for(let i=0;i<bones.length;i++)for(const [key,type,size,glpath] of [['position','VEC3',3,'translation'],['quaternion','VEC4',4,'rotation']]){
  const output=accessor(Float32Array.from(poses[i][key]),size,type,{target:undefined});
  channels.push({sampler:samplers.length,target:{node:i+1,path:glpath}});samplers.push({input,output,interpolation:'LINEAR'});
 }
 animations.push({name,samplers,channels,extras:{source:'actual createEnemy.update; no authored replacement',duration,hitDirection:hit?'default local -Z':null}});
}
const mat=materials.map(m=>({name:m.name,pbrMetallicRoughness:{baseColorFactor:[m.color.r,m.color.g,m.color.b,m.opacity],metallicFactor:m.metalness,roughnessFactor:m.roughness},emissiveFactor:[m.emissive.r*m.emissiveIntensity,m.emissive.g*m.emissiveIntensity,m.emissive.b*m.emissiveIntensity],doubleSided:m.side===2,extras:{vertexColors:'actual runtime linear Float32 COLOR_0, multiplied by PBR base color',originalMaterialType:m.type}}));
const doc={asset:{version:'2.0',generator:'Fengming H36 read-only existing-enemy exporter'},scene:0,scenes:[{name:'H35 existing sentry reference; Y-up actor-local',nodes:[0]}],nodes,meshes:[{name:mesh.name,primitives}],skins:[{name:'H35 actual enemy bind',inverseBindMatrices:inverseAccessor,skeleton:1,joints:bones.map((_,i)=>i+1)}],materials:mat,animations,buffers:[{byteLength}],bufferViews,accessors,extras:{reviewOnly:true,coordinates:'Three actor-local XYZ, Y-up, facing +Z; Blender importer converts (x,y,z) to (x,-z,y)',scale:1,source:'../../sample/enemy.js',sourceSha256:sha(bytes),stats:enemy.stats,defaultPose:'actual createEnemy(); update(0), unhurt idle at time 0'}};
const raw=Buffer.from(JSON.stringify(doc)),json=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,0x20)]),bin=Buffer.concat(chunks),head=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
head.writeUInt32LE(0x46546c67,0);head.writeUInt32LE(2,4);head.writeUInt32LE(12+8+json.length+8+bin.length,8);jh.writeUInt32LE(json.length,0);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);
const glb=Buffer.concat([head,jh,json,bh,bin]);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'enemy-h35-existing.glb'),glb);
const parsed=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12))),binary=glb.subarray(28+glb.readUInt32LE(12));
function get(ai){const a=parsed.accessors[ai],v=parsed.bufferViews[a.bufferView],components={SCALAR:1,VEC3:3,VEC4:4,MAT4:16}[a.type],size={5126:4,5123:2,5125:4}[a.componentType];return binary.subarray((v.byteOffset||0)+(a.byteOffset||0),(v.byteOffset||0)+(a.byteOffset||0)+a.count*components*size);}
const checks={};for(const [key,[name]]of Object.entries(mapping)){const a=geometry.attributes[key].array,b=Buffer.from(a.buffer,a.byteOffset,a.byteLength),actual=get(parsed.meshes[0].primitives[0].attributes[name]);checks[name]={exactBytes:actual.equals(b),sha256:sha(actual)};}
const concatenated=Buffer.concat(parsed.meshes[0].primitives.map(p=>get(p.indices))),originalIndices=Buffer.from(indices.buffer,indices.byteOffset,indices.byteLength);checks.indices={exactBytes:concatenated.equals(originalIndices),sha256:sha(concatenated)};
const inverseBytes=Buffer.from(inverseBind.buffer);checks.inverseBindMatrices={exactBytes:get(parsed.skins[0].inverseBindMatrices).equals(inverseBytes),sha256:sha(inverseBytes)};
if(Object.values(checks).some(x=>!x.exactBytes))throw Error('Frozen enemy geometry serialization mismatch');
if(sha(fs.readFileSync(source))!==sha(bytes))throw Error('Source changed during export');
const report={kind:'Read-only serialization of actual H35 createEnemy; no redesign',source:'../../sample/enemy.js',sourceSha256:sha(bytes),glb:'enemy-h35-existing.glb',bytes:glb.length,sha256:sha(glb),vertices:geometry.attributes.position.count,triangles:indices.length/3,bones:bones.length,materials:materials.length,scale:1,checks,sourceUnchanged:true};
fs.writeFileSync(path.join(out,'enemy-export-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({file:report.glb,bytes:report.bytes,triangles:report.triangles,bones:report.bones,allExact:true}));
