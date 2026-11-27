import fs from 'node:fs';
import {pathToFileURL}from'node:url';
const root=new URL('../../',import.meta.url).pathname,game=root+'fengming-v2-scene-a/';
const T=await import(pathToFileURL(game+'vendor/three/three.module.js'));
const {getBakedHeroData}=await import(pathToFileURL(game+'assets/hero-033/linyan-h33-baked.js'));
let source=fs.readFileSync(game+'sample/hero.js','utf8').replace("from 'three'",`from '${pathToFileURL(game+'vendor/three/three.module.js')}'`).replace(/from '(\.\.\/assets\/[^']+)'/,()=>`from '${pathToFileURL(game+'assets/hero-033/linyan-h33-baked.js')}'`);
const {createHero}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const data=getBakedHeroData();const bones=data.bones.map((b,i)=>{const world=new T.Matrix4().fromArray(data.boneInverses[i]).invert();return{name:b.name,parent:b.parent,head:world.elements.slice(12,15),inverse:Array.from(data.boneInverses[i])};});
const sword=data.sword.meshes.map(m=>({name:m.name,material:m.material,position:m.position,quaternion:m.quaternion,scale:m.scale,attributes:Object.fromEntries(Object.entries(data.geometries[m.geometry].attributes).map(([k,a])=>[k,{itemSize:a.itemSize,array:Array.from(a.array)}])),indices:Array.from(data.geometries[m.geometry].index.array)}));
const actions=[];for(const[name,duration,moving]of[['Idle',2,false],['Walk',.8,true],['Slash',.78,false]]){const h=createHero(),samples=[];for(let i=0;i<=Math.ceil(duration*30);i++){const t=i*duration/Math.ceil(duration*30);h.update(i?duration/Math.ceil(duration*30):0,{moving,speed:moving?1:0,attackProgress:name==='Slash'?Math.min(1,t/duration):null});h.group.updateMatrixWorld(true);samples.push({time:t,bones:h.body.skeleton.bones.map(b=>b.matrixWorld.toArray())});}actions.push({name,duration,samples});}
fs.writeFileSync(game+'assets/hero-034/rig-seed.json',JSON.stringify({bones,sword,materials:data.materials,actions}));console.log('22 bones, independent sword, three current local-animation takes exported');
