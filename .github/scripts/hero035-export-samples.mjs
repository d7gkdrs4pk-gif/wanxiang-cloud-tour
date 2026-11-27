/** Reproducible H35 animation-only mother input; H34 mesh is linked, not copied. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import{fileURLToPath,pathToFileURL}from'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),game=path.join(repo,'fengming-v2-scene-a'),out=path.join(game,'assets/hero-035/source');fs.mkdirSync(out,{recursive:true});
const heroFile=path.join(game,'sample/hero.js'),actionFile=path.join(game,'assets/hero-035/action.js');
const T=await import(pathToFileURL(path.join(game,'vendor/three/three.module.js'))),{getBakedHeroData}=await import(pathToFileURL(path.join(game,'assets/hero-034/linyan-h34-baked.js')));
let source=fs.readFileSync(heroFile,'utf8').replace("from 'three'",`from '${pathToFileURL(path.join(game,'vendor/three/three.module.js'))}'`).replace(/from '(\.\.\/assets\/[^']+)'/g,(_,rel)=>`from '${pathToFileURL(path.resolve(game,'sample',rel))}'`);
const{createHero}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')),data=getBakedHeroData();
const bones=data.bones.map((b,i)=>({name:b.name,parent:b.parent,inverse:Array.from(data.boneInverses[i]),head:new T.Matrix4().fromArray(data.boneInverses[i]).invert().elements.slice(12,15)})),actions=[];
for(const[name,duration,moving]of[['Idle',2,false],['Walk',.8,true],['Slash',.78,false]]){
 const hero=createHero(),samples=[],count=Math.ceil(duration*30),times=[...new Set([...Array.from({length:count+1},(_,i)=>i*duration/count),...(name==='Slash'?[.24,.34,.44,.60,.62,.72,.80,.88].map(p=>p*duration):[])])].sort((a,b)=>a-b);let previous=0;
 for(const time of times){hero.update(time-previous,{moving,speed:moving?1:0,attackProgress:name==='Slash'?Math.min(1,time/duration):null});hero.group.updateMatrixWorld(true);samples.push({time,bones:hero.body.skeleton.bones.map(b=>b.matrixWorld.toArray())});previous=time;}
 actions.push({name,duration,samples});
}
const h=createHero();h.update(0,{});const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const result={version:'H35 animation-only, H34 original linked mesh',runtimeSHA256:hash(heroFile),actionSHA256:hash(actionFile),meshBakedSHA256:hash(path.join(game,'assets/hero-034/linyan-h34-baked.js')),bones,swordSocket:{parentBone:data.sword.parentBone,position:h.sword.position.toArray(),quaternion:h.sword.quaternion.toArray(),scale:h.sword.scale.toArray()},actions};
fs.writeFileSync(path.join(out,'pose-samples.json'),JSON.stringify(result));console.log('H35 pose mother input exported:',actions.map(a=>a.name+':'+a.samples.length).join(', '));
