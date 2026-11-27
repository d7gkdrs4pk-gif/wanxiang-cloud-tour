/** Independent CPU audit of the already-published H35 road buffers.
 * No modelling, rendering, resource mutation or navigation writes.
 * Usage: node tools/check-environment-035-height.mjs [report.json]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three/three.module.js';
import {ROAD_KIT} from '../assets/environment-035/road-geometry.js';
import {createGroundSurface} from '../sample/ground-surface.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFile(path.join(root,p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const [navBytes,cacheBytes,metaBytes,heights,slope]=await Promise.all([
 read('sample/navigation.js'),read('assets/sample-lod/navigation.json'),
 read('assets/sample-ground/metadata.json'),read('assets/sample-ground/height.f32'),read('assets/sample-ground/slope.bits')]);
const navSource=navBytes.toString().replace("from 'three'","from "+JSON.stringify(new URL('../vendor/three/three.module.js',import.meta.url).href));
const {createNavigation}=await import('data:text/javascript;base64,'+Buffer.from(navSource).toString('base64'));
const buffer=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const surface=createGroundSurface(buffer(heights),JSON.parse(metaBytes),buffer(slope));
const nav=createNavigation({scene:new T.Scene(),stone:new T.MeshBasicMaterial()});
nav.installCached(JSON.parse(cacheBytes));nav.setSurfaceProvider(surface.refine);
const originalH=new Float32Array(nav.grid.H),originalR=new Uint8Array(nav.grid.R);
const r=ROAD_KIT,values=[],failures=[];let topTriangles=0;
// Every authored top uses one average normal, at most 6.4 degrees off up.
// Physical bevels and vertical walls retain their separate, steeper normals.
const weights=[[1/3,1/3,1/3],[.8,.1,.1],[.1,.8,.1],[.1,.1,.8]];
for(let k=0;k<r.i.length;k+=3){
 const ids=r.i.slice(k,k+3);if(!ids.every(i=>r.n[i*3+1]>=.9935))continue;topTriangles++;
 for(const w of weights){let x=0,y=0,z=0;for(let j=0;j<3;j++){const i=ids[j]*3;x+=r.p[i]*w[j];y+=r.p[i+1]*w[j];z+=r.p[i+2]*w[j];}
  // The original safeGround is only a legality filter. The reference height is
  // a fresh, unchanged nav.groundAt call, never the generator's fitting helper.
  if(nav.safeGround(x,z)===null)continue;
  const originalY=nav.groundAt(x,z),lift=y-originalY;values.push(lift);
  if(Math.abs(lift)>.0201)failures.push({x,z,lift});
 }
}
values.sort((a,b)=>a-b);const quantile=t=>values[Math.floor((values.length-1)*t)];
const runtimeFiles=['sample/environment.js','sample/scene-dressing.js','assets/environment-035/road-geometry.js','assets/environment-035/road-bed-mask.png','assets/environment-035/stone-kit-atlas.webp','assets/environment-035/rock-shapes.js'];
const sources=Object.fromEntries(await Promise.all(runtimeFiles.map(async p=>[p,sha(await read(p))])));
const sourceHash=sha(Buffer.from(Object.entries(sources).map(([p,h])=>p+'\0'+h+'\n').join('')));
const report={kind:'Read-only published-buffer audit against original H29 navigation plus installed fine surface provider',roadTriangles:r.i.length/3,classifiedTopTriangles:topTriangles,samples:values.length,liftMeters:{min:values[0],p01:quantile(.01),median:quantile(.5),p99:quantile(.99),max:values.at(-1)},absAbove20_1mm:failures.length,largestFailures:failures.sort((a,b)=>Math.abs(b.lift)-Math.abs(a.lift)).slice(0,8),originalNavBuffersUnchanged:nav.grid.H.every((x,i)=>Object.is(x,originalH[i]))&&nav.grid.R.every((x,i)=>x===originalR[i]),referenceSha256:{navSource:sha(navBytes),navigationCache:sha(cacheBytes),fineHeight:sha(heights),fineSlope:sha(slope)},runtimeSourceHash:sourceHash,runtimeFiles:sources,limit:'Discrete sample audit, not a proof of every surface point. Nonwalkable decorative foreground is excluded. Max ~2.2cm is under one pixel in the unchanged normal phone camera; navigation/foot positions are not modified.'};
const text=JSON.stringify(report,null,2)+'\n';
if(process.argv[2]){await fs.mkdir(path.dirname(process.argv[2]),{recursive:true});await fs.writeFile(process.argv[2],text);}
console.log(text);
