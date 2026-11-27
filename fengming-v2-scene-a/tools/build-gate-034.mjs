/** Rebuild the original H34 gatehouse master and exact-step QA, CPU only.
 * node tools/build-gate-034.mjs
 * Does not modify main, navigation, terrain, source GLBs or lighting.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const asset=path.join(root,'assets/gate-034');fs.mkdirSync(asset,{recursive:true});
const masterDir=process.env.FENGMING_GATE_MASTER_DIR||path.join(asset,'source');fs.mkdirSync(masterDir,{recursive:true});
const T=await import(pathToFileURL(path.join(root,'vendor/three/three.module.js')).href);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const navBytes=fs.readFileSync(path.join(root,'assets/sample-lod/navigation.json')),cache=JSON.parse(navBytes);
const originalStepData='// Generated from untouched assets/sample-lod/navigation.json; exact JSON double heights.\nexport const STEP_SOURCE_SHA256='+JSON.stringify(hash(navBytes))+';\nexport const GATE_STEP_HEIGHTS='+JSON.stringify(cache.steps)+';\n';
fs.writeFileSync(path.join(asset,'steps-data.js'),originalStepData);
// Low boundary markers explain the original building's forbidden footprint.
// They do not alter one legal XY point; their footings use the same terrain.
const {createGroundSurface}=await import(pathToFileURL(path.join(root,'sample/ground-surface.js')).href);
const readArray=name=>{const b=fs.readFileSync(path.join(root,'assets/sample-ground',name));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const ground=createGroundSurface(readArray('height.f32'),JSON.parse(fs.readFileSync(path.join(root,'assets/sample-ground/metadata.json'))),readArray('slope.bits'));
const footingAt=(x,z)=>{const ix=Math.round((x+20)/cache.S),iz=Math.round((z+20)/cache.S),legacy=cache.H[iz*cache.N+ix]??.10;return ground.refine(x,z,legacy);};
const boundarySpecs=[{name:'south boundary',a:[-2.24,-3.86],b:[2.24,-3.86],segments:8},{name:'east south boundary',a:[2.24,-6.75],b:[2.24,-3.86],segments:6},{name:'short west return',a:[-2.24,-5.20],b:[-2.24,-3.86],segments:3}];
const boundaryMarkers=boundarySpecs.map(q=>({...q,points:Array.from({length:q.segments+1},(_,i)=>{const x=q.a[0]+(q.b[0]-q.a[0])*i/q.segments,z=q.a[1]+(q.b[1]-q.a[1])*i/q.segments;return [x,footingAt(x,z),z];})}));
fs.writeFileSync(path.join(asset,'boundary-data.js'),'// Generated from unchanged original terrain cache; non-colliding visual markers only.\nexport const BOUNDARY_MARKERS='+JSON.stringify(boundaryMarkers)+';\n');
let source=fs.readFileSync(path.join(root,'sample/gate-roof-finish.js'),'utf8').replace("from 'three'",`from '${pathToFileURL(path.join(root,'vendor/three/three.module.js')).href}'`).replace("from '../assets/gate-034/steps-data.js'",`from '${pathToFileURL(path.join(asset,'steps-data.js')).href}'`).replace("from '../assets/gate-034/boundary-data.js'",`from '${pathToFileURL(path.join(asset,'boundary-data.js')).href}'`);
const {finishGateRoof}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const originalBytes=fs.readFileSync(path.join(root,'assets/sample-lod/gate.glb'));
function parseOriginal(){
 const len=originalBytes.readUInt32LE(12),j=JSON.parse(originalBytes.subarray(20,20+len)),bin=originalBytes.subarray(28+len);
 function attr(i){const a=j.accessors[i],v=j.bufferViews[a.bufferView],off=(v.byteOffset||0)+(a.byteOffset||0),N={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],C={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType];return new T.BufferAttribute(new C(bin.buffer,bin.byteOffset+off,a.count*N).slice(),N);}
 const geometry=new T.BufferGeometry();for(const [key,i]of Object.entries(j.meshes[0].primitives[0].attributes))geometry.setAttribute({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'}[key],attr(i));geometry.setIndex(attr(j.meshes[0].primitives[0].indices));
 const gate=new T.Group();const tr=cache.transforms.gate_transform;gate.scale.setScalar(tr.scale);gate.position.fromArray(tr.translation);const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial());gate.add(mesh);gate.updateMatrixWorld(true);return {gate,mesh,geometry};
}
const {gate,mesh:sourceMesh,geometry:original}=parseOriginal();const stoneTexture=new T.Texture();
const result=finishGateRoof(gate,{shading:'light',stoneTexture});
const actualLower=sourceMesh.geometry,p=original.attributes.position,I=original.index,v=new T.Vector3(),expected=[];
for(let i=0;i<I.count;i+=3){const ids=[I.getX(i),I.getX(i+1),I.getX(i+2)];if(Math.min(...ids.map(k=>v.fromBufferAttribute(p,k).applyMatrix4(sourceMesh.matrixWorld).y))<=1.2000001)expected.push(...ids);}
assert.equal(expected.length/3,21403);assert.deepEqual(Array.from(actualLower.index.array),expected);for(const name of Object.keys(original.attributes))assert.deepEqual(actualLower.attributes[name].array,original.attributes[name].array);assert.equal(sourceMesh.visible,false);
for(const m of result.meshes)for(const a of Object.values(m.geometry.attributes))for(const x of a.array)assert(Number.isFinite(x));assert(result.stats.newTriangles<=24030);
// CPU dense height audit: exactly the NN cells used by original stairsAt().
const stone=result.meshes[3],ray=new T.Raycaster(),errors=[],samples=[],missing=[];
const renderAt=(x,z)=>{ray.set(new T.Vector3(x,2,z),new T.Vector3(0,-1,0));return ray.intersectObject(stone,false)[0]?.point.y??null;};
let maxError=0,sumError=0,count=0;
for(let iz=0;iz<21;iz++)for(let ix=0;ix<45;ix++){
 const h=cache.steps[iz][ix];if(h===null||!Number.isFinite(h))continue;
 for(const [a,b]of [[0,0],[-.31,-.29],[.33,.27],[-.27,.37],[.29,-.33]]){
  const x=1.35+.025*(ix+a),z=-7.4+.025*(iz+b);if(x<1.35||x>2.45||z< -7.4||z> -6.9)continue;
  const found=renderAt(x,z);if(found===null){missing.push([x,z,h]);continue;}const error=Math.abs(found-h);count++;sumError+=error;maxError=Math.max(maxError,error);if(error>1e-5)errors.push({x,z,original:h,rendered:found,error});if(a===0&&b===0)samples.push({x,z,original:h,rendered:found,error});
 }
}
if(missing.length||errors.length)console.log(JSON.stringify({maxError,missing,errors},null,2));
assert.equal(missing.length,0);assert.equal(errors.length,0);assert(maxError<1e-5);
const stepQA={revision:'H34',source:'unchanged original navigation.json steps nearest-neighbour cache',sourceSHA256:hash(navBytes),cells:result.stats.stepCells,denseSamples:count,cacheCentreSamples:samples.length,maxAbsHeightErrorMetres:maxError,meanAbsHeightErrorMetres:sumError/count,missingSurfaceSamples:missing.length,failuresAbove10Micrometres:errors,renderMode:'level cell tops plus actual vertical risers, not a smoothed ramp',boundaryNote:'NN discontinuity edges have two physical heights; dense offsets avoid exact half-cell boundary ties. All valid original cache centres are included.',samples};
fs.writeFileSync(path.join(asset,'step-height-qa.json'),JSON.stringify(stepQA,null,2)+'\n');
// Original navigation function / cache equivalence before and after the visual
// builder. SafeGround is called with the same original legal XY/map limits.
let navSource=fs.readFileSync(path.join(root,'sample/navigation.js'),'utf8').replace("from 'three'",`from '${pathToFileURL(path.join(root,'vendor/three/three.module.js')).href}'`);
const {createNavigation}=await import('data:text/javascript;base64,'+Buffer.from(navSource).toString('base64'));const nav=createNavigation({scene:new T.Scene(),stone:new T.MeshBasicMaterial()});nav.installCached(cache);
const legal=()=>{const a=[];for(let iz=0;iz<=106;iz++)for(let ix=0;ix<=160;ix++){const x=-10.5+ix*.1,z=-9.1+iz*.1;a.push(nav.safeGround(x,z));}return a;};
const before=legal();const second=parseOriginal();const visual=finishGateRoof(second.gate,{shading:'light',stoneTexture});const after=legal();assert.deepEqual(after,before);visual.restore();assert.equal(second.mesh.visible,true);assert.equal(second.mesh.geometry,second.geometry);
// CPU-only verification of the ready promise and owned plaque texture.
const savedDocument=globalThis.document,savedLoadAsync=T.TextureLoader.prototype.loadAsync;
let readyContract;
try{
 globalThis.document={};
 const texture=new T.Texture();let disposed=0;texture.addEventListener('dispose',()=>disposed++);
 T.TextureLoader.prototype.loadAsync=async()=>texture;const okGate=parseOriginal();const ok=finishGateRoof(okGate.gate,{shading:'light',stoneTexture});await ok.ready;assert.equal(ok.materials[2].map,texture);assert.equal(texture.colorSpace,T.SRGBColorSpace);ok.restore();assert.equal(disposed,1);
 T.TextureLoader.prototype.loadAsync=async()=>{throw Error('injected atlas network failure');};const badGate=parseOriginal();const bad=finishGateRoof(badGate.gate,{shading:'light',stoneTexture});await assert.rejects(bad.ready,/plaque atlas failed to load/);bad.restore();
 let resolveLate;T.TextureLoader.prototype.loadAsync=()=>new Promise(resolve=>resolveLate=resolve);const lateGate=parseOriginal();const late=finishGateRoof(lateGate.gate,{shading:'light',stoneTexture});late.restore();const lateTexture=new T.Texture();let lateDisposed=0;lateTexture.addEventListener('dispose',()=>lateDisposed++);resolveLate(lateTexture);await late.ready;assert.equal(lateDisposed,1);
 readyContract={successAttachesSRGBAtlas:true,textureOwnedAndDisposedOnce:true,failureRejectsWithAssetURL:true,restoreBeforeCompletionDisposesLateTexture:true,scope:'CPU promise / loader-stub contract, not a live HTTP-failure browser test'};
 fs.writeFileSync(path.join(asset,'ready-interface-qa.json'),JSON.stringify(readyContract,null,2)+'\n');
}finally{T.TextureLoader.prototype.loadAsync=savedLoadAsync;if(savedDocument===undefined)delete globalThis.document;else globalThis.document=savedDocument;}
// Portable GLB master: only the new visible geometry, world coordinates.
// Painted stone uses KHR_materials_unlit, exactly as the static vertex-light bake.
// The engine's Lambert roof is represented by matte PBR + calibrated vertex color.
const chunks=[],views=[],accessors=[],materials=[],meshes=[],nodes=[];let byteLength=0;
function append(b,target){const off=byteLength;chunks.push(b);byteLength+=b.length;const padding=(4-byteLength%4)%4;if(padding){chunks.push(Buffer.alloc(padding));byteLength+=padding;}const id=views.length;views.push({buffer:0,byteOffset:off,byteLength:b.length,...(target?{target}:{})});return id;}
function accessor(a,size,target,minmax=false){const id=accessors.length,view=append(Buffer.from(a.buffer,a.byteOffset,a.byteLength),target),componentType=a instanceof Float32Array?5126:a instanceof Uint16Array?5123:5125;const spec={bufferView:view,componentType,count:a.length/size,type:{1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'}[size]};if(minmax){spec.min=Array.from({length:size},(_,k)=>{let n=Infinity;for(let i=k;i<a.length;i+=size)n=Math.min(n,a[i]);return n;});spec.max=Array.from({length:size},(_,k)=>{let n=-Infinity;for(let i=k;i<a.length;i+=size)n=Math.max(n,a[i]);return n;});}accessors.push(spec);return id;}
const png=fs.readFileSync(path.join(asset,'plaque-atlas.png')),webp=fs.readFileSync(path.join(root,'assets/environment-033/handpainted-stone-atlas.webp'));const pngView=append(png),webpView=append(webp);
materials.push({name:'H34 matte blue-grey clay',doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:1}},{name:'H34 ink timber and carved lintel',doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:1}},{name:'H34 old bronze and 凤鸣 lettering',doubleSided:true,alphaMode:'MASK',alphaCutoff:.28,pbrMetallicRoughness:{baseColorTexture:{index:0},baseColorFactor:[1,1,1,1],metallicFactor:.10,roughnessFactor:.88}},{name:'H34 painted stone with static directional light',doubleSided:true,extensions:{KHR_materials_unlit:{}},pbrMetallicRoughness:{baseColorTexture:{index:1},baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:1}});
for(let mi=0;mi<result.meshes.length;mi++){
 const m=result.meshes[mi],g=m.geometry,P=g.attributes.position,N=g.attributes.normal,C=g.attributes.color,U=g.attributes.uv,used=Array.from(new Set(g.index.array)),remap=new Int32Array(P.count).fill(-1),position=new Float32Array(used.length*3),normal=new Float32Array(used.length*3),color=new Float32Array(used.length*3),uv=new Float32Array(used.length*2),normalMatrix=new T.Matrix3().getNormalMatrix(m.matrixWorld),gain=m.material.color.toArray();
 for(let i=0;i<used.length;i++){const old=used[i];remap[old]=i;v.fromBufferAttribute(P,old).applyMatrix4(m.matrixWorld).toArray(position,3*i);v.fromBufferAttribute(N,old).applyMatrix3(normalMatrix).normalize().toArray(normal,3*i);for(let k=0;k<3;k++)color[3*i+k]=Math.max(0,Math.min(1,C.array[3*old+k]*gain[k]));uv[2*i]=U.getX(old);uv[2*i+1]=mi>=2?1-U.getY(old):U.getY(old);}
 const indices=new Uint32Array(Array.from(g.index.array,k=>remap[k]));const attributes={POSITION:accessor(position,3,34962,true),NORMAL:accessor(normal,3,34962),COLOR_0:accessor(color,3,34962),TEXCOORD_0:accessor(uv,2,34962)};const index=accessor(indices,1,34963);nodes.push({mesh:meshes.length,name:m.name});meshes.push({name:m.name,primitives:[{attributes,indices:index,material:mi,mode:4}]});
}
const gltf={asset:{version:'2.0',generator:'Fengming H34 original gate build tool'},extensionsUsed:['KHR_materials_unlit','EXT_texture_webp'],extensionsRequired:['EXT_texture_webp'],scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials,textures:[{sampler:0,source:0},{sampler:0,extensions:{EXT_texture_webp:{source:1}}}],images:[{name:'Noto OFL local 凤鸣 plaque atlas',mimeType:'image/png',bufferView:pngView},{name:'Project original painted stone atlas',mimeType:'image/webp',bufferView:webpView}],samplers:[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}],buffers:[{byteLength}],bufferViews:views,accessors,extras:{revision:'H34',coordinates:'engine world Y-up',sourceNavigationSHA256:hash(navBytes),originalSourceGeometryChanged:false,originalCollisionChanged:false,originalNormalCamera:{fov:39,followOffset:[6,27,15]},newTriangles:result.stats.newTriangles,sourceAndLicense:'README.md, font-source.json and OFL-Noto-CJK.txt'}};
const jsonRaw=Buffer.from(JSON.stringify(gltf)),jsonPad=(4-jsonRaw.length%4)%4,json=Buffer.concat([jsonRaw,Buffer.alloc(jsonPad,0x20)]),binary=Buffer.concat(chunks),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+8+binary.length,8);jh.writeUInt32LE(json.length,0);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(binary.length,0);bh.writeUInt32LE(0x004e4942,4);const glb=Buffer.concat([header,jh,json,bh,binary]);fs.writeFileSync(path.join(masterDir,'gate-h34.glb'),glb);
const checks={revision:'H34',scope:'CPU original-source preservation, exact visible step height, legal path invariance, static GLB generation; visual/FPS checked separately',sourceLowerTrianglesPreserved:21403,sourceAttributesAndOrderedIndicesExact:true,sourceLowerHiddenOnlyForRendering:true,restoreVisibilityAndGeometryExact:true,originalNavigationSHA256:hash(navBytes),navigationCodeSHA256:hash(fs.readFileSync(path.join(root,'sample/navigation.js'))),originalGateGLBSHA256:hash(originalBytes),legalGridSamples:before.length,legalXYAndHeightsUnchanged:true,stepDenseSamples:count,stepMaxAbsHeightErrorMetres:maxError,allGeneratedNumbersFinite:true,atlasReadyContract:readyContract,newVisibleTriangles:result.stats.newTriangles,drawCalls:result.stats.newDrawCalls,stats:result.stats,master:{file:'gate-h34.glb',artifactDirectory:masterDir,shippedAsRuntimeAsset:false,bytes:glb.length,sha256:hash(glb),textureEncoding:'embedded PNG plaque, EXT_texture_webp project stone',runtimeNote:'Runtime uses the same actual static 3D generator / lit materials; this GLB is a portable source master, not a background image.'}};
fs.writeFileSync(path.join(asset,'geometry-qa.json'),JSON.stringify(checks,null,2)+'\n');console.log(JSON.stringify({...checks,stats:undefined},null,2));
result.restore();assert.equal(sourceMesh.geometry,original);assert.equal(sourceMesh.visible,true);result.restore();
