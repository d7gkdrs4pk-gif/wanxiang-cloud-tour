/** Offline Blender authored mesh + existing 22-bone movement. No runtime sculpting. */
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as T from '../../../fengming-v2-scene-a/vendor/three/three.module.js';
import {createHero as createRig} from './linyan-h33-runtime.mjs';
const root=new URL('../../../',import.meta.url).pathname;
const raw=JSON.parse(gunzipSync(fs.readFileSync(root+'fengming-v2-scene-a/assets/hero-034/source/body-mesh.json.gz')).toString('utf8'));
const zones=JSON.parse(fs.readFileSync(root+'fengming-v2-scene-a/assets/hero-034/atlas-zones.json','utf8'));
const uv=(u,v,zone)=>{const[x0,y0,x1,y1]=zones[zone];return[(x0+u*(x1-x0))/1024,1-(y0+v*(y1-y0))/1024];};
export function createHero(){
 const h=createRig(),g=new T.BufferGeometry();
 for(const[name,size,ctor]of[['position',3,Float32Array],['normal',3,Float32Array],['uv',2,Float32Array],['skinIndex',4,Uint16Array],['skinWeight',4,Float32Array]])g.setAttribute(name,new T.BufferAttribute(new ctor(raw[name]),size));
 // Weld only byte-identical Float32/Uint16 attribute tuples. No tolerance,
 // quantization, UV movement, skin reweighting or normal averaging.
 const names=Object.keys(g.attributes),dedup=new Map(),outputs=Object.fromEntries(names.map(n=>[n,[]])),indices=[];
 for(const vi of raw.index){const key=names.map(n=>{const a=g.attributes[n];return Array.from(a.array.subarray(vi*a.itemSize,(vi+1)*a.itemSize),v=>Object.is(v,-0)?'-0':String(v)).join(',');}).join('|');let index=dedup.get(key);if(index===undefined){index=dedup.size;dedup.set(key,index);for(const n of names){const a=g.attributes[n];for(let k=0;k<a.itemSize;k++)outputs[n].push(a.array[vi*a.itemSize+k]);}}indices.push(index);}
 for(const n of names){const a=g.attributes[n];g.setAttribute(n,new T.BufferAttribute(new a.array.constructor(outputs[n]),a.itemSize));}g.setIndex(indices);g.addGroup(0,raw.index.length,0);g.computeBoundingSphere();g.computeBoundingBox();g.name='林砚H34-Blender真实拓扑身体';h.body.geometry.dispose();h.body.geometry=g;
 const cloth=new T.MeshStandardMaterial({color:0xffffff,roughness:.95,metalness:0,vertexColors:false,alphaTest:.45}),metal=new T.MeshStandardMaterial({color:0xffffff,roughness:.78,metalness:.12,vertexColors:false});cloth.name='林砚1K统一手绘AO图集';metal.name='凤刃哑光钢与旧金';h.body.material=[cloth,metal];
 h.sword.children.forEach((m,i)=>{const geo=m.geometry,position=geo.attributes.position,values=[];const zone=i===2?'steel':i===1?'gold':'ink';for(let j=0;j<position.count;j++)values.push(...uv(T.MathUtils.clamp(.5+position.getX(j)*2,0,1),T.MathUtils.clamp((position.getZ(j)+.25)/1.58,0,1),zone));geo.setAttribute('uv',new T.Float32BufferAttribute(values,2));geo.deleteAttribute('color');m.material=i===0?cloth:metal;});
 h.stats={...h.stats,triangles:raw.index.length/3+h.sword.children.reduce((n,m)=>n+m.geometry.index.count/3,0),materials:2,height:1.485,revision:'H34 Blender quad-tailored body / CC0 authored male head and hands / 1K painted AO atlas',authorship:'New project-authored Blender continuous quad clothing, hair and boots; modified CC0 VRoid HairSample_Male face/ears/backhead/hands; existing project-owned skeleton and local animation.'};
 return h;
}
