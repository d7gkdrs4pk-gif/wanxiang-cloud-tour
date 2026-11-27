/** Actual vendor Three PerspectiveCamera reference; CPU only, no renderer. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),game=path.join(repo,'fengming-v2-scene-a');
const flag=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const calibrationPath=path.resolve(flag('--calibration','/workspace/qa-h36/calibration.json'));
const c=JSON.parse(fs.readFileSync(calibrationPath));
const T=await import(pathToFileURL(path.join(game,'vendor/three/three.module.js')).href);
async function moduleFrom(relative){const file=path.join(game,relative),url=pathToFileURL(file);const source=fs.readFileSync(file,'utf8').replace(/from ['"]three['"]/g,`from '${pathToFileURL(path.join(game,'vendor/three/three.module.js')).href}'`).replace(/from ['"](\.[^'"]+)['"]/g,(_,p)=>`from '${new URL(p,url).href}'`);return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));}
const [{createNavigation},{createEnemy},{createGroundSurface}]=await Promise.all([moduleFrom('sample/navigation.js'),moduleFrom('sample/enemy.js'),import(pathToFileURL(path.join(game,'sample/ground-surface.js')).href)]);
const nav=createNavigation({scene:new T.Scene(),stone:new T.MeshBasicMaterial()});nav.installCached(JSON.parse(fs.readFileSync(path.join(game,'assets/sample-lod/navigation.json'))));
const read=name=>{const b=fs.readFileSync(path.join(game,'assets/sample-ground',name));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const surface=createGroundSurface(read('height.f32'),JSON.parse(fs.readFileSync(path.join(game,'assets/sample-ground/metadata.json'))),read('slope.bits'));nav.setSurfaceProvider(surface.refine);
const actor=c.position,target=c.target||actor;
const foe=createEnemy();foe.group.position.set(2.8,nav.groundAt(2.8,-6.6),-6.6);foe.group.rotation.y=Math.atan2(actor[0]-2.8,actor[2]+6.6);foe.update(0);foe.group.updateMatrixWorld(true);
const enemyHead=foe.bones.find(b=>b.name==='head').localToWorld(new T.Vector3(0,.08,.06));
const points=[
 {name:'spawnfoot',world:[...actor],definition:'actual calibration.position, actor outer origin'},
 {name:'spawn_plus_Y_1_485',world:[actor[0],actor[1]+1.485,actor[2]],definition:'same actor origin plus nominal reference height; no rescale'},
 {name:'pine_root',world:[-7,nav.groundAt(-7,-7),-7],definition:'original pine group registration anchor at original groundAt'},
 {name:'stairs',world:[1.58,nav.groundAt(1.58,-7),-7],definition:'original cached real upper-stair groundAt'},
 {name:'enemyhead',world:enemyHead.toArray(),definition:'actual current createEnemy unhurt t=0 head.localToWorld(0,.08,.06), home(2.8,ground,-6.6), facing spawn'}
];
const camera=new T.PerspectiveCamera(c.verticalFOV,c.width/c.height,.1,160);camera.position.fromArray(c.camera);camera.up.set(0,1,0);camera.lookAt(new T.Vector3(...target));camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
for(const p of points){const ndc=new T.Vector3(...p.world).project(camera);p.threeNDC=ndc.toArray();p.threePixels=[(ndc.x+1)*c.width/2,(1-ndc.y)*c.height/2];}
const result={calibrationPath,calibrationSHA256:crypto.createHash('sha256').update(fs.readFileSync(calibrationPath)).digest('hex'),width:c.width,height:c.height,FOV:c.verticalFOV,camera:c.camera,target,threeToBlender:'(x,-z,y)',threeUp:[0,1,0],near:.1,far:160,points,threeCameraMatrix:camera.matrixWorld.toArray(),threeProjectionMatrix:camera.projectionMatrix.toArray(),rendererUsed:false};
const text=JSON.stringify(result,null,2)+'\n',out=flag('--output',null);if(out)fs.writeFileSync(path.resolve(out),text);else process.stdout.write(text);
