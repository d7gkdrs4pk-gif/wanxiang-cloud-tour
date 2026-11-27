#!/usr/bin/env node
/** Exact-byte offline bake of the H33 silhouette-refined authored geometry.
 * Run from any cwd: node .github/scripts/bake-linyan-h33.mjs
 * No GLB conversion, quantization, optimization, UUIDs, timestamps or GPU.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {createHero} from './lib/linyan-h33-generator.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'fengming-v2-scene-a/assets/hero-033');
fs.mkdirSync(out,{recursive:true});
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const rawArray=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
const encoded=a=>({type:a.constructor.name,base64:rawArray(a).toString('base64')});
const hero=createHero();
const body=hero.body,skeleton=body.skeleton,materials=Array.isArray(body.material)?body.material:[body.material];
const boneLookup=new Map(skeleton.bones.map((b,i)=>[b,i]));
const attributesManifest={};
const geometries={};
function geometry(g,key){
 const attributes={},manifest={attributes:{}};
 for(const [name,a]of Object.entries(g.attributes)){
  if(a.isInterleavedBufferAttribute)throw new Error('Interleaved input must be exported exactly before baking: '+key+'.'+name);
  const bytes=rawArray(a.array);
  attributes[name]={itemSize:a.itemSize,normalized:a.normalized,array:encoded(a.array)};
  if(a.gpuType!==undefined)attributes[name].gpuType=a.gpuType;
  manifest.attributes[name]={itemSize:a.itemSize,normalized:a.normalized,type:a.array.constructor.name,length:a.array.length,count:a.count,bytes:bytes.length,sha256:sha(bytes)};
 }
 let index=null;
 if(g.index){
  const a=g.index,bytes=rawArray(a.array);index={itemSize:a.itemSize,normalized:a.normalized,array:encoded(a.array)};
  if(a.gpuType!==undefined)index.gpuType=a.gpuType;
  manifest.index={itemSize:a.itemSize,normalized:a.normalized,type:a.array.constructor.name,length:a.array.length,count:a.count,bytes:bytes.length,sha256:sha(bytes)};
 }
 const groups=g.groups.map(({start,count,materialIndex})=>({start,count,materialIndex}));
 const boundingSphere=g.boundingSphere?{center:g.boundingSphere.center.toArray(),radius:g.boundingSphere.radius}:null;
 const boundingBox=g.boundingBox?{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()}:null;
 geometries[key]={name:g.name,attributes,index,groups,boundingSphere,boundingBox,drawRange:{start:g.drawRange.start,count:Number.isFinite(g.drawRange.count)?g.drawRange.count:null}};
 manifest.groups=groups;manifest.vertices=g.attributes.position?.count??0;manifest.triangles=(g.index?.count??g.attributes.position.count)/3;
 manifest.boundingSphere=boundingSphere;manifest.boundingBox=boundingBox;attributesManifest[key]=manifest;
}
function transform(o){return {position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray()};}
function meshProperties(o){return {castShadow:o.castShadow,receiveShadow:o.receiveShadow,frustumCulled:o.frustumCulled,renderOrder:o.renderOrder,visible:o.visible};}
geometry(body.geometry,'body');
const swordMeshes=[];
for(const [i,m]of hero.sword.children.filter(o=>o.isMesh).entries()){
 if(Array.isArray(m.material))throw new Error('Unexpected multi-material sword child');
 const material=materials.indexOf(m.material);if(material<0)throw new Error('Sword material not shared with body');
 const key='sword'+i;geometry(m.geometry,key);
 swordMeshes.push({name:m.name,geometry:key,material,...transform(m),...meshProperties(m)});
}
const inverseArray=new Float64Array(skeleton.boneInverses.length*16);
skeleton.boneInverses.forEach((m,i)=>inverseArray.set(m.elements,i*16));
const bindMatrixArray=Float64Array.from(body.bindMatrix.elements);
const bindMatrixInverseArray=Float64Array.from(body.bindMatrixInverse.elements);
const boneData=skeleton.bones.map(b=>({name:b.name,parent:boneLookup.get(b.parent)??-1,...transform(b)}));
const materialData=materials.map(m=>({
 type:m.type,name:m.name,color:m.color.toArray(),roughness:m.roughness,metalness:m.metalness,vertexColors:m.vertexColors,
 emissive:m.emissive.toArray(),emissiveIntensity:m.emissiveIntensity,
 opacity:m.opacity,transparent:m.transparent,side:m.side,shadowSide:m.shadowSide,
 depthTest:m.depthTest,depthWrite:m.depthWrite,colorWrite:m.colorWrite,alphaTest:m.alphaTest,
 flatShading:m.flatShading,toneMapped:m.toneMapped,forceSinglePass:m.forceSinglePass,
 blending:m.blending,premultipliedAlpha:m.premultipliedAlpha,dithering:m.dithering,
 polygonOffset:m.polygonOffset,polygonOffsetFactor:m.polygonOffsetFactor,polygonOffsetUnits:m.polygonOffsetUnits
}));
const payload={
 version:'H33 sculpted silhouette hero v1',
 materials:materialData,bones:boneData,
 boneInverses:encoded(inverseArray),
 body:{name:body.name,geometry:'body',bindMatrix:encoded(bindMatrixArray),bindMatrixInverse:encoded(bindMatrixInverseArray),bindMode:body.bindMode,...transform(body),...meshProperties(body)},
 sword:{name:hero.sword.name,parentBone:boneLookup.get(hero.sword.parent),...transform(hero.sword),meshes:swordMeshes},
 geometries,stats:hero.stats
};
// All geometry values remain their original ArrayBuffer bytes. Small scene
// metadata is ordinary lossless JSON; matrices are Float64 blocks, including -0.
const prelude=`/** Generated by .github/scripts/bake-linyan-h33.mjs. DO NOT hand-edit.\n * Raw typed-array bytes from the project-owned H33 generator; no quantization.\n * Arrays are decoded only on the first getBakedHeroData() call and then cached. */\n`;
const runtime=`\nconst CTORS={Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array};
let cached=null;
function decode(spec){
 const Ctor=CTORS[spec.type];if(!Ctor)throw new Error('Unsupported baked array '+spec.type);
 const binary=atob(spec.base64),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new Ctor(bytes.buffer);
}
export function getBakedHeroData(){
 if(cached)return cached;
 const data={...PAYLOAD,geometries:{}};
 const inverse=decode(PAYLOAD.boneInverses);data.boneInverses=[];
 for(let i=0;i<inverse.length;i+=16)data.boneInverses.push(inverse.subarray(i,i+16));
 data.body={...PAYLOAD.body,bindMatrix:decode(PAYLOAD.body.bindMatrix),bindMatrixInverse:decode(PAYLOAD.body.bindMatrixInverse)};
 for(const [key,g]of Object.entries(PAYLOAD.geometries)){
  const attributes={};for(const [name,a]of Object.entries(g.attributes))attributes[name]={...a,array:decode(a.array)};
  data.geometries[key]={...g,attributes,index:g.index?{...g.index,array:decode(g.index.array)}:null};
 }
 cached=data;return cached;
}
`;
const text=prelude+'const PAYLOAD='+JSON.stringify(payload)+';\n'+runtime;
const moduleBytes=Buffer.from(text,'utf8');
const moduleName='linyan-h33-baked.js';fs.writeFileSync(path.join(out,moduleName),moduleBytes);
const generatorRel='.github/scripts/lib/linyan-h33-generator.mjs',generator=fs.readFileSync(path.join(root,generatorRel));
const manifest={
 version:payload.version,sourceGenerator:{path:generatorRel,sha256:sha(generator)},
 encoding:'Raw original TypedArray bytes in base64; lazy cached decode; no quantization or optimization',endian:'little',
 module:{file:moduleName,bytes:moduleBytes.length,gzipBytes:zlib.gzipSync(moduleBytes,{level:9}).length,sha256:sha(moduleBytes)},
 geometries:attributesManifest,
 boneBind:{type:'Float64Array',matrixCount:skeleton.boneInverses.length,bytes:inverseArray.byteLength,sha256:sha(rawArray(inverseArray)),bodyBindMatrixBytes:bindMatrixArray.byteLength,bodyBindMatrixSha256:sha(rawArray(bindMatrixArray)),bodyBindMatrixInverseSha256:sha(rawArray(bindMatrixInverseArray)),boneMetadataSha256:sha(Buffer.from(JSON.stringify(boneData)))},
 stats:hero.stats,bones:skeleton.bones.length,materials:materialData.length,
 swordParentBone:payload.sword.parentBone
};
manifest.totalGeometryBytes=Object.values(attributesManifest).reduce((sum,g)=>sum+Object.values(g.attributes).reduce((n,a)=>n+a.bytes,0)+(g.index?.bytes??0),0);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({module:manifest.module,totalGeometryBytes:manifest.totalGeometryBytes,bones:manifest.bones,materials:manifest.materials,stats:manifest.stats,boneBind:manifest.boneBind},null,2));
