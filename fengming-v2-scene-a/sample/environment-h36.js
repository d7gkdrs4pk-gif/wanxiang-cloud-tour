/** H36 prepared adapter — not connected to main.js or any published build.
 *
 * const env=createEnvironmentH36({scene,camera,groundAt:nav.groundAt});
 * await env.ready;
 * const gate=env.gateGroup, pine=env.pine;
 * env.attachCharacterShadow(player,{size:1.05,opacity:.9});
 * env.update(dt); pine.update(dt,{player,camera});
 * const qa=env.measureActorOcclusion(player,camera); // MANUAL 15-probe alpha QA
 *
 * world-h36.glb is already in GAME world XYZ/Y-up/metres, scale1. Blender's
 * standard Y-up glTF export performs (x,-z,y)'s inverse; apply no old terrain
 * normalization. Only the eight explicitly named categories are admitted.
 * Export static diffuse illumination as COLOR_0 and/or baseColorTexture, OPAQUE.
 * The three NEW DRAWN ImageGen crown depth cards use glTF MASK (.45-.5 cutoff),
 * double-sided with depth writes. MainCrown/TopCrown/RearCrown node-name tokens
 * retain separate BBox/depth diagnostics. There is no runtime billboard/fade.
 * These are not renders of the 036 needle model. The distant layers reuse the
 * project's older owned painting through one atlas, two world planes, no Canvas.
 * Baked colors use white MeshBasicMaterial, no SUN/IBL or second tone mapping.
 * The main pine trunk/branches are an explicit exception: the untouched PBR
 * pine-036-wood-mobile.glb replaces the broken post-LOD trunk bake in the world GLB.
 * This adapter does not change the camera, renderer, lights, fog or navigation.
 */
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const H36_WORLD_URL=new URL('../assets/scene-036/runtime/world-h36.glb',import.meta.url).href;
export const H36_MOUNTAIN_URL=new URL('../assets/sample-runtime/mountain-atlas.webp',import.meta.url).href;
export const H36_WOOD_URL=new URL('../assets/pine-036/pine-036-wood-mobile.glb',import.meta.url).href;
export const H36_NODE_NAMES=Object.freeze([
 'H36_Ground','H36_Road','H36_Rock','H36_Gate','H36_Pine_Trunk',
 'H36_Pine_RearCrown','H36_Pine_FrontBranch','H36_Distant'
]);
const PINE_KEYS={rear:'H36_Pine_RearCrown',trunk:'H36_Pine_Trunk',front:'H36_Pine_FrontBranch'};
const CROWN_NAMES=['MainCrown','TopCrown','RearCrown'];
const NO_RAYCAST=()=>{};

function softCircleTexture(){
 const size=64,rgba=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
  const t=T.MathUtils.clamp((r-.10)/.90,0,1),soft=1-t*t*(3-2*t),i=(y*size+x)*4;
  rgba[i]=rgba[i+1]=rgba[i+2]=255;rgba[i+3]=Math.round(112*soft*soft);
 }
 const texture=new T.DataTexture(rgba,size,size,T.RGBAFormat);
 texture.name='H36 independent soft actor contact circle';texture.colorSpace=T.SRGBColorSpace;
 texture.minFilter=texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 return texture;
}

function triangleCount(mesh){
 const g=mesh.geometry,count=g.index?g.index.count:g.attributes.position.count;
 return Math.floor(Math.max(0,Math.min(count-g.drawRange.start,g.drawRange.count))/3);
}

/** World + owned mountain atlas + original PBR pine wood; no old env/normal field. Canvas is used
 * only when manually requested by alpha QA; ready rejection belongs to startup. */
export function createEnvironmentH36({scene,camera=null,groundAt=()=>0,url=H36_WORLD_URL,
 loader=null,woodLoader=null,textureLoader=null,mountainUrl=H36_MOUNTAIN_URL,woodUrl=H36_WOOD_URL,requiredNodes=H36_NODE_NAMES}={}){
 if(!scene?.isScene)throw Error('createEnvironmentH36 requires a Three Scene');
 const group=new T.Group();group.name='H36 baked world — identity game coordinates';scene.add(group);
 const staticGroup=new T.Group();staticGroup.name='H36 static baked categories';group.add(staticGroup);
 const shadowGroup=new T.Group();shadowGroup.name='H36 independent actor contact circles';group.add(shadowGroup);
 const pineGroup=new T.Group();pineGroup.name='H36_Pine — true world-depth groups';staticGroup.add(pineGroup);
 const groups=Object.fromEntries(H36_NODE_NAMES.map(name=>{const g=new T.Group();g.name=name;(name.startsWith('H36_Pine_')?pineGroup:staticGroup).add(g);return [name,g];}));
 const gateGroup=groups.H36_Gate,boxes=new Map(),crownBoxes=new Map(),materials=new Set(),geometries=new Set(),textures=new Set(),shadows=[];
 let ground=groundAt,disposed=false,loaded=false,loadFailed=false,footTexture=null;
 const metadata={revision:'H36 prepared baked-world adapter',loaded:false,source:url,
  sources:{world:url,pineWood:woodUrl,pineCrowns:'New ImageGen-authored 2.5D atlas, not a render of 036 needle geometry',
   distant:mountainUrl,distantAuthorship:'Existing project-owned H31 hand-painted mountain atlas; reused, not newly generated'},
  coordinates:'game world XYZ / Y-up / metres / scale1',cameraUnchanged:true,navigationOwnedByCaller:true,
  staticShading:'World Cycles diffuse bake / drawn crown cards / owned mountains use Basic with no second SUN/tone mapping; original pine wood retains PBR lighting/normal/roughness',
  transparency:'OPAQUE static geometry; crown MASK/depth writes/no BLEND; distant painting and contact circles are transparent, depthWrite false',
  requiredNodes:[...requiredNodes],missingNodes:[],nodes:{},triangles:0,staticDraws:0,materials:0,
  worldBounds:null,ignoredOutsideNamedCategories:true,treeFade:false,treeRuntimeBillboard:false,
  treeGeometry:'New ImageGen-drawn 2.5D crown depth cards plus real-time 3D trunk/primary branches; not 036 needle-source renders',
  crownNodes:{},maskedCrownMaterials:0,
  liveWood:{source:woodUrl,worldCoordinates:true,loaded:false,triangles:0,meshes:0,materials:0,materialTypes:[],
   originalMaterialsAndMapsPreserved:true,castShadow:false,receiveShadow:false,staticGroundTreeShadowRemainsBaked:true,
   discardedWorldTrunkMeshes:0,discardedWorldTrunkTriangles:0},
  roadBakeRepair:{rgbFloor:[.035,.043,.043],colorScale:[.78,.82,.80],scope:'H36_Road only, after map_fragment'},
  distant:{source:mountainUrl,reusedOwnedAsset:true,atlasLoads:1,planes:2,canvasUsed:false,cameraFollowing:false,
   layers:[{name:'H36 far owned painted valley',width:67,height:16.7,position:[-5,-24.5,-37],opacity:.87,atlasHalf:'top'},
    {name:'H36 near owned painted valley',width:54,height:13.5,position:[-7,-24.5,-27],opacity:.93,atlasHalf:'bottom'}],yaw:Math.atan2(6,15)},
  mutatesLightsRendererOrFog:false};
 const lastUpdate={loaded:false,root:[-7,0,-7],layers:{},crowns:{},playerDepth:null,treeFade:1,
  technique:'Newly drawn ImageGen 2.5D depth crowns plus real 3D trunk/branches; no whole-tree fade'};
 const worldPoint=new T.Vector3(),cameraSpace=new T.Vector3(),corner=new T.Vector3(),center=new T.Vector3();
 const shadowWorld=new T.Vector3();
 let alphaImageCache=new WeakMap();
 const alphaReadbacks=[];

 function measureBox(box,viewCamera){
  if(!box||box.isEmpty())return null;
  box.getCenter(center);const result={min:box.min.toArray(),max:box.max.toArray(),center:center.toArray()};
  if(viewCamera){
   let near=Infinity,far=-Infinity;
   for(let k=0;k<8;k++){
    corner.set(k&1?box.max.x:box.min.x,k&2?box.max.y:box.min.y,k&4?box.max.z:box.min.z).applyMatrix4(viewCamera.matrixWorldInverse);
    near=Math.min(near,-corner.z);far=Math.max(far,-corner.z);
   }
   cameraSpace.copy(center).applyMatrix4(viewCamera.matrixWorldInverse);
   result.centerDepth=-cameraSpace.z;result.nearDepth=near;result.farDepth=far;
  }
  return result;
 }

 function updatePine(_dt,{player=null,camera:viewCamera=camera}={}){
  lastUpdate.loaded=loaded;
  const h=ground(-7,-7);lastUpdate.root[1]=Number.isFinite(h)?h:0;
  if(viewCamera)viewCamera.updateWorldMatrix(true,false);
  for(const [key,name]of Object.entries(PINE_KEYS)){
   const measured=measureBox(boxes.get(name),viewCamera);
   lastUpdate.layers[key]=measured?{...measured,visible:groups[name].visible,node:name}:{visible:false,node:name};
  }
  for(const name of CROWN_NAMES)lastUpdate.crowns[name]=measureBox(crownBoxes.get(name),viewCamera);
  if(player?.getWorldPosition&&viewCamera){
   player.getWorldPosition(worldPoint);cameraSpace.copy(worldPoint).applyMatrix4(viewCamera.matrixWorldInverse);lastUpdate.playerDepth=-cameraSpace.z;
  }else lastUpdate.playerDepth=null;
  return lastUpdate;
 }

 function refreshBounds(){
  staticGroup.updateWorldMatrix(true,true);boxes.clear();crownBoxes.clear();const worldBounds=new T.Box3();
  for(const name of H36_NODE_NAMES){const box=new T.Box3().setFromObject(groups[name]);boxes.set(name,box);if(!box.isEmpty())worldBounds.union(box);}
  for(const name of CROWN_NAMES){
   const box=new T.Box3(),matched=[];
   pineGroup.traverse(o=>{if(o!==pineGroup&&!H36_NODE_NAMES.includes(o.name)&&o.name.includes(name)){matched.push(o.name);box.union(new T.Box3().setFromObject(o));}});
   crownBoxes.set(name,box);metadata.crownNodes[name]=matched;
  }
  metadata.worldBounds=worldBounds.isEmpty()?null:[worldBounds.min.toArray(),worldBounds.max.toArray()];
 }

 function convertBakeMaterials(){
  const cache=new Map();
  for(const name of H36_NODE_NAMES)groups[name].traverse(o=>{
   if(!o.isMesh)return;
   if(o.isSkinnedMesh||o.isInstancedMesh||o.isBatchedMesh)throw Error('H36 static category requires ordinary static Mesh: '+o.name);
   const hasColor=o.geometry.hasAttribute('color');
   const crownCategory=name==='H36_Pine_RearCrown'||name==='H36_Pine_FrontBranch';
   const one=source=>{
    if(!source)throw Error('H36 static mesh has no material: '+o.name);
    if(!hasColor&&!source.map)throw Error('H36 diffuse bake missing COLOR_0/map: '+o.name);
    if(crownCategory&&source.transparent&&!(source.alphaTest>0))throw Error('H36 crown card must export alphaMode MASK, not BLEND: '+o.name);
    const mask=crownCategory&&source.alphaTest>0;
    // A future caller may add its existing gate-only cutaway shader. Even when
    // Blender shares one bake atlas material, that must not modify the ground.
    const key=source.uuid+':'+hasColor+':'+mask+':'+(name==='H36_Gate'?'gate':name==='H36_Road'?'road':'world');
    if(!cache.has(key)){
     const baked=new T.MeshBasicMaterial({color:0xffffff,map:source.map||null,
      vertexColors:hasColor,toneMapped:false,fog:false,side:mask?T.DoubleSide:source.side,
      transparent:false,opacity:1,alphaTest:mask?source.alphaTest:0,
      alphaMap:mask?source.alphaMap:null,depthWrite:true,depthTest:true});
     baked.name='H36 baked diffuse / '+(source.name||o.name);cache.set(key,baked);materials.add(baked);
     if(name==='H36_Road'){
      baked.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
       '#include <map_fragment>\ndiffuseColor.rgb=max(diffuseColor.rgb*vec3(.78,.82,.80),vec3(.035,.043,.043));');};
      baked.customProgramCacheKey=()=> 'h36-road-soft-joints-035-043-043';
     }
     if(baked.map){baked.map.colorSpace=T.SRGBColorSpace;textures.add(baked.map);}
     if(baked.alphaMap)textures.add(baked.alphaMap);
     if(mask)metadata.maskedCrownMaterials++;
    }
    return cache.get(key);
   };
   o.material=Array.isArray(o.material)?o.material.map(one):one(o.material);
   o.castShadow=o.receiveShadow=false;o.raycast=NO_RAYCAST;geometries.add(o.geometry);
   // Frozen local transforms retain correct inherited world matrices; no vertex
   // baking, camera-facing geometry, draw-order override or animation runs here.
   o.updateMatrix();o.matrixAutoUpdate=false;
  });
  metadata.materials=materials.size;
 }

 function collectSourceResources(model){
  const source={geometries:new Set(),materials:new Set(),textures:new Set()};
  model.traverse(o=>{if(!o.isMesh)return;source.geometries.add(o.geometry);
   for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){source.materials.add(m);for(const value of Object.values(m))if(value?.isTexture)source.textures.add(value);}
  });return source;
 }
 function releaseUnusedSource(source){
  for(const g of source.geometries)if(!geometries.has(g))g.dispose();
  for(const m of source.materials)if(!materials.has(m))m.dispose();
  for(const t of source.textures)if(!textures.has(t))t.dispose();
 }

 function installLiveWood(model){
  const woodMaterials=new Set(),materialTypes=new Set();
  model.updateMatrixWorld(true);
  const rejected=[];
  model.traverse(o=>{
   if(o.isLight||o.isCamera)rejected.push(o);
   if(!o.isMesh)return;
   if(o.isSkinnedMesh||o.isInstancedMesh||o.isBatchedMesh)throw Error('H36 pine wood requires ordinary static Mesh: '+o.name);
   for(const material of Array.isArray(o.material)?o.material:[o.material]){
    if(!material?.isMeshStandardMaterial)throw Error('H36 pine wood must retain original PBR material: '+o.name);
    // Retain the actual GLTFLoader material object and every original map.
    // In particular do not recolor, gamma-change ORM/normal, or disable tone mapping.
    materials.add(material);woodMaterials.add(material);materialTypes.add(material.type);
    for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
   }
   o.castShadow=o.receiveShadow=false;o.raycast=NO_RAYCAST;
   o.updateMatrix();o.matrixAutoUpdate=false;geometries.add(o.geometry);
   metadata.liveWood.meshes++;metadata.liveWood.triangles+=triangleCount(o);
  });
  for(const o of rejected)o.removeFromParent();
  if(!metadata.liveWood.meshes)throw Error('H36 pine wood GLB contains no real mesh');
  // The source is already in the same game world coordinates. attach preserves
  // its full world transform; no pine placement/scale or old terrain normalization.
  groups.H36_Pine_Trunk.attach(model);
  metadata.liveWood.materials=woodMaterials.size;metadata.liveWood.materialTypes=[...materialTypes];
  metadata.liveWood.loaded=true;metadata.materials=materials.size;
 }

 function installDistantPlanes(texture){
  texture.colorSpace=T.SRGBColorSpace;texture.flipY=true;texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;
  texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;textures.add(texture);
  for(let i=0;i<metadata.distant.layers.length;i++){
   const spec=metadata.distant.layers[i],geometry=new T.PlaneGeometry(spec.width,spec.height),uv=geometry.attributes.uv;
   // TextureLoader flipY=true: the image's upper half occupies texture V=.5..1.
   // Both planes share the SAME texture. No canvas copies, per-layer image decode,
   // camera attachment or screen-space positioning are involved.
   for(let k=0;k<uv.count;k++)uv.setY(k,uv.getY(k)*.5+(i===0?.5:0));
   uv.needsUpdate=true;
   const material=new T.MeshBasicMaterial({map:texture,color:0xd0e0e5,
    transparent:true,opacity:spec.opacity,depthWrite:false,depthTest:true,
    side:T.DoubleSide,forceSinglePass:true,toneMapped:false,fog:false});
   const mesh=new T.Mesh(geometry,material);mesh.name=spec.name;mesh.position.fromArray(spec.position);
   mesh.rotation.y=metadata.distant.yaw;mesh.raycast=NO_RAYCAST;mesh.updateMatrix();mesh.matrixAutoUpdate=false;
   groups.H36_Distant.add(mesh);geometries.add(geometry);materials.add(material);
  }
  metadata.materials=materials.size;
 }

 const ready=(async()=>{
  let source=null,woodSource=null;
  try{
   const modelLoader=loader||new GLTFLoader();
   const worldTask=modelLoader.loadAsync(url).then(gltf=>{
    if(!gltf.scene?.isObject3D)throw Error('H36 GLB has no scene');
    source=collectSourceResources(gltf.scene);
    if(disposed||loadFailed){releaseUnusedSource(source);throw Error('H36 adapter stopped before world finished loading');}
    return gltf;
   });
   const mountainTask=(textureLoader||new T.TextureLoader()).loadAsync(mountainUrl).then(texture=>{
    if(disposed||loadFailed){texture.dispose();throw Error('H36 adapter stopped before mountains finished loading');}
    textures.add(texture);return texture;
   });
   const woodTask=(woodLoader||modelLoader).loadAsync(woodUrl).then(gltf=>{
    if(!gltf.scene?.isObject3D)throw Error('H36 pine wood GLB has no scene');
    woodSource=collectSourceResources(gltf.scene);
    if(disposed||loadFailed){releaseUnusedSource(woodSource);throw Error('H36 adapter stopped before pine wood finished loading');}
    return gltf.scene;
   });
   const [gltf,mountain,liveWood]=await Promise.all([worldTask,mountainTask,woodTask]),model=gltf.scene;
   if(disposed||loadFailed)throw Error('H36 adapter stopped before scene installation');
   model.updateMatrixWorld(true);const selected=[];
   model.traverse(o=>{if(Object.prototype.hasOwnProperty.call(groups,o.name))selected.push({object:o,name:o.name});});
   const present=new Set(selected.map(s=>s.name));metadata.missingNodes=H36_NODE_NAMES.filter(n=>!present.has(n));
   const missing=requiredNodes.filter(n=>!present.has(n));
   if(missing.length)throw Error('H36 GLB missing named categories: '+missing.join(', '));
   // Extract deeper named nodes first, so nested categories cannot be drawn twice.
   const depth=o=>{let n=0;for(let p=o.parent;p;p=p.parent)n++;return n;};
   selected.sort((a,b)=>depth(b.object)-depth(a.object));
   for(const entry of selected)groups[entry.name].attach(entry.object);
   // Only mesh/group transforms under named categories survive; imported cameras,
   // lights, audio and any unknown top-level export objects are not admitted.
   for(const target of Object.values(groups)){
    const rejected=[];target.traverse(o=>{if(o!==target&&!o.isMesh&&!o.isGroup&&o.type!=='Object3D')rejected.push(o);});
    for(const o of rejected)o.removeFromParent();
   }
   // Discard only the broken, post-LOD baked trunk, BEFORE any Basic conversion.
   // Its unshared geometry/maps are released with the original world's resources.
   groups.H36_Pine_Trunk.traverse(o=>{if(o.isMesh){metadata.liveWood.discardedWorldTrunkMeshes++;metadata.liveWood.discardedWorldTrunkTriangles+=triangleCount(o);}});
   groups.H36_Pine_Trunk.clear();
   convertBakeMaterials();
   installLiveWood(liveWood);
   // H36_Distant may be an intentionally EMPTY source group: its two owned
   // painting planes are installed here after opaque bake-material conversion.
   installDistantPlanes(mountain);
   for(const name of H36_NODE_NAMES){
    let triangles=0,draws=0,meshes=0;
    groups[name].traverseVisible(o=>{if(o.isMesh){meshes++;triangles+=triangleCount(o);draws+=Array.isArray(o.material)?o.geometry.groups.length:1;}});
    metadata.nodes[name]={sourceNodes:selected.filter(s=>s.name===name).length,meshes,triangles,draws};metadata.triangles+=triangles;metadata.staticDraws+=draws;
   }
   refreshBounds();loaded=metadata.loaded=true;lastUpdate.loaded=true;updatePine(0);
   releaseUnusedSource(source);releaseUnusedSource(woodSource);return api;
  }catch(error){
   // An incomplete white/partial world must never count as ready. Main's startup
   // handles this rejected promise; no silent fallback to the old scenery.
   loadFailed=true;loaded=metadata.loaded=lastUpdate.loaded=metadata.liveWood.loaded=false;
   for(const target of Object.values(groups))target.clear();if(source)releaseUnusedSource(source);if(woodSource)releaseUnusedSource(woodSource);
   for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
   geometries.clear();materials.clear();textures.clear();throw error;
  }
 })();

 function conformShadow(entry,force=false){
  entry.actor.getWorldPosition(shadowWorld);
  const isVisible=entry.actor.visible!==false;entry.mesh.visible=isVisible;if(!isVisible)return;
  if(!force&&shadowWorld.distanceToSquared(entry.last)<.0004)return;
  entry.last.copy(shadowWorld);const centerHeight=ground(shadowWorld.x,shadowWorld.z);
  const floor=Number.isFinite(centerHeight)?centerHeight:shadowWorld.y;
  entry.mesh.position.set(shadowWorld.x,floor+.014,shadowWorld.z);
  const p=entry.mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=entry.base[i*2],z=entry.base[i*2+1],h=ground(shadowWorld.x+x,shadowWorld.z+z);
   p.setY(i,Number.isFinite(h)?h-floor:0);
  }
  p.needsUpdate=true;
 }
 function attachCharacterShadow(actor,{size=1.05,opacity=.75}={}){
  if(disposed)throw Error('H36 environment is disposed');
  if(!actor?.isObject3D)throw Error('H36 character shadow requires an Object3D');
  footTexture||=softCircleTexture();
  const geometry=new T.CircleGeometry(size*.5,32);geometry.rotateX(-Math.PI/2);
  const p=geometry.attributes.position,base=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){base[i*2]=p.getX(i);base[i*2+1]=p.getZ(i);}
  geometry.boundingSphere=new T.Sphere(new T.Vector3(),Math.hypot(size*.5,1.));
  const material=new T.MeshBasicMaterial({color:0x15222b,map:footTexture,transparent:true,opacity,
   depthWrite:false,depthTest:true,toneMapped:false,fog:false,polygonOffset:true,polygonOffsetFactor:-2});
  const mesh=new T.Mesh(geometry,material);mesh.name='H36 actor soft contact circle';mesh.raycast=NO_RAYCAST;shadowGroup.add(mesh);
  const entry={actor,mesh,base,last:new T.Vector3(Infinity,Infinity,Infinity)};shadows.push(entry);conformShadow(entry,true);return mesh;
 }
 function update(){if(!disposed)for(const entry of shadows)conformShadow(entry);}
 function setGroundAt(fn){
  if(typeof fn!=='function')throw Error('H36 groundAt must be a function');ground=fn;
  for(const entry of shadows)conformShadow(entry,true);updatePine(0);
 }
 function measure({camera:viewCamera=camera,player=null}={}){
  if(viewCamera)viewCamera.updateWorldMatrix(true,false);
  const measured={loaded,worldBounds:metadata.worldBounds,groups:{},pine:updatePine(0,{camera:viewCamera,player})};
  for(const name of H36_NODE_NAMES)measured.groups[name]=measureBox(boxes.get(name),viewCamera);
  return measured;
 }

 // Manual QA ONLY. No image decoding/readback or probe rays run in update().
 function readAlphaPixels(texture){
  const image=texture.image;
  if(!image||typeof image!=='object')throw Error('Texture image is not loaded');
  let cached=alphaImageCache.get(image);if(cached){if(cached.error)throw Error(cached.error);return cached;}
  try{
   const width=image.naturalWidth||image.videoWidth||image.width,height=image.naturalHeight||image.videoHeight||image.height;
   if(!(width>0&&height>0))throw Error('Texture image has no dimensions');
   if(image.data&&ArrayBuffer.isView(image.data)){
    // DataTexture support permits small CPU-only synthetic UV/flip tests. The
    // real GLB's decoded image/bitmap takes the detached Canvas path below.
    const components=image.data.length/(width*height);
    if(![1,2,3,4].includes(components))throw Error('Unsupported DataTexture component count');
    cached={width,height,data:image.data,components,type:texture.type,method:'DataTexture direct read'};
   }else{
    let canvas;
    if(typeof OffscreenCanvas!=='undefined')canvas=new OffscreenCanvas(width,height);
    else if(typeof document!=='undefined'){canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;}
    else throw Error('Detached Canvas unavailable for decoded texture alpha');
    const context=canvas.getContext('2d',{willReadFrequently:true});
    if(!context)throw Error('Detached Canvas 2D context unavailable');
    context.drawImage(image,0,0,width,height);
    const pixels=context.getImageData(0,0,width,height);
    cached={width,height,data:pixels.data,components:4,type:T.UnsignedByteType,method:'one cached detached Canvas getImageData'};
   }
   alphaImageCache.set(image,cached);alphaReadbacks.push({width,height,method:cached.method});return cached;
  }catch(error){
   const message='Cannot read texture alpha: '+String(error.message||error);alphaImageCache.set(image,{error:message});throw Error(message);
  }
 }
 function textureComponent(texture,hit,component){
  const image=readAlphaPixels(texture),channel=texture.channel||0,attribute=hit.object.geometry.getAttribute(channel===0?'uv':'uv'+channel);
  let uv=channel===0?hit.uv:channel===1?hit.uv1:null;
  if(!uv&&attribute&&hit.face&&hit.barycoord){const f=hit.face,b=hit.barycoord;uv=new T.Vector2(
   attribute.getX(f.a)*b.x+attribute.getX(f.b)*b.y+attribute.getX(f.c)*b.z,
   attribute.getY(f.a)*b.x+attribute.getY(f.b)*b.y+attribute.getY(f.c)*b.z);}
  if(!uv)throw Error('Texture UV channel '+channel+' missing on '+hit.object.name);
  const original=uv.toArray();uv=uv.clone();
  if(texture.matrixAutoUpdate)texture.updateMatrix();
  // Three's own helper applies texture.matrix, wrapping, then flipY. Canvas row
  // zero is the original image top: glTF flipY=false and TextureLoader flipY=true
  // therefore use the same conventions as their respective WebGL uploads.
  texture.transformUv(uv);
  const wrap=(i,n,mode)=>mode===T.RepeatWrapping?T.MathUtils.euclideanModulo(i,n):mode===T.MirroredRepeatWrapping?((i=T.MathUtils.euclideanModulo(i,n*2))<n?i:n*2-1-i):T.MathUtils.clamp(i,0,n-1);
  const fetch=(x,y)=>{
   if(component===3&&image.components<4)return 1.;
   if(component===1&&image.components===1)return 0.; // RedFormat's sampled G is zero.
   const value=image.data[(wrap(y,image.height,texture.wrapT)*image.width+wrap(x,image.width,texture.wrapS))*image.components+component];
   let normalized=image.type===T.FloatType?value:image.type===T.HalfFloatType?T.DataUtils.fromHalfFloat(value):value/(image.data.BYTES_PER_ELEMENT===2?65535:255);
   // GPU sRGB samplers decode RGB texels before filtering. Alpha is unchanged.
   if(component===1&&texture.colorSpace===T.SRGBColorSpace)normalized=normalized<=.04045?normalized/12.92:((normalized+.055)/1.055)**2.4;
   return normalized;
  };
  let value;
  if(texture.magFilter===T.NearestFilter)value=fetch(Math.floor(uv.x*image.width),Math.floor(uv.y*image.height));
  else{
   const x=uv.x*image.width-.5,y=uv.y*image.height-.5,x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
   value=T.MathUtils.lerp(T.MathUtils.lerp(fetch(x0,y0),fetch(x0+1,y0),fx),T.MathUtils.lerp(fetch(x0,y0+1),fetch(x0+1,y0+1),fx),fy);
  }
  return {value,uv:original,sampledUV:uv.toArray(),channel,flipY:texture.flipY,
   filter:texture.magFilter===T.NearestFilter?'nearest base level':'bilinear base level',matrix:texture.matrix.toArray()};
 }
 function crownLayer(mesh){
  for(let node=mesh;node&&node!==pineGroup;node=node.parent){
   if(H36_NODE_NAMES.includes(node.name))continue;
   const name=CROWN_NAMES.find(n=>node.name.includes(n));if(name)return name;
  }
  return null;
 }
 function measureActorOcclusion(player,viewCamera=camera){
  const result={loaded,manualQA:true,totalProbes:15,blockedProbes:0,unknownProbes:0,
   sampling:'Actual mesh rays and source alphaTest; decoded base-image nearest/bilinear alpha with texture matrix/wrap/flipY. GPU mip LOD, anisotropy and MSAA are not reproduced.',
   parts:{},crownMeshes:[],alphaImageReadbacks:[],errors:[]};
  if(!loaded){result.errors.push('H36 world is not ready');return result;}
  if(!player?.isObject3D||!viewCamera?.isCamera){result.errors.push('measureActorOcclusion requires player Object3D and camera');return result;}
  player.updateWorldMatrix(true,false);viewCamera.updateWorldMatrix(true,false);pineGroup.updateWorldMatrix(true,true);
  const origin=player.getWorldPosition(new T.Vector3()),cameraPosition=viewCamera.getWorldPosition(new T.Vector3()),right=new T.Vector3().setFromMatrixColumn(viewCamera.matrixWorld,0).normalize();
  const probes=[['head',1.3],['shoulder',1.05],['chest',.8],['hips',.4],['feet',.06]],meshes=[];
  for(const category of ['H36_Pine_FrontBranch','H36_Pine_RearCrown']){
   let visible=true;for(let parent=groups[category];parent;parent=parent.parent)if(parent.visible===false)visible=false;
   if(!visible)continue;
   groups[category].traverseVisible(mesh=>{
    const layer=mesh.isMesh?crownLayer(mesh):null;
    if(!layer||!viewCamera.layers.test(mesh.layers))return;
    meshes.push(mesh);result.crownMeshes.push({name:mesh.name,uuid:mesh.uuid,layer,category});
   });
  }
  const missing=CROWN_NAMES.filter(name=>!result.crownMeshes.some(mesh=>mesh.layer===name));
  if(missing.length)result.errors.push('No visible actual crown mesh found for: '+missing.join(', '));
  result.playerPosition=origin.toArray();result.cameraPosition=cameraPosition.toArray();result.cameraRight=right.toArray();
  const categoryFor=mesh=>result.crownMeshes.find(m=>m.uuid===mesh.uuid)?.category||null;
  const raycaster=new T.Raycaster(),direction=new T.Vector3();
  for(const [part,height]of probes){
   const partResult={heightAboveActorOrigin:height,blockedCount:0,unknownCount:0,probes:[]};result.parts[part]=partResult;
   for(const offset of [-.13,0,.13]){
    const targetPoint=origin.clone().add(new T.Vector3(0,height,0)).addScaledVector(right,offset),distance=direction.subVectors(targetPoint,cameraPosition).length(),hits=[];
    raycaster.set(cameraPosition,direction.normalize());raycaster.near=Math.max(.0001,viewCamera.near||.0001);raycaster.far=Math.max(0,distance-.002);
    // All visual meshes intentionally have a NOOP raycast for normal input. QA
    // bypasses it explicitly; no method or material on the mesh is overwritten.
    for(const mesh of meshes)T.Mesh.prototype.raycast.call(mesh,raycaster,hits);
    hits.sort((a,b)=>a.distance-b.distance);const samples=[];let blocker=null,unknown=missing.length>0;
    for(const hit of hits){
     if(samples.some(s=>s.meshUUID===hit.object.uuid&&Math.abs(s.distance-hit.distance)<1e-6))continue;
     const mesh=hit.object,material=Array.isArray(mesh.material)?mesh.material[hit.face?.materialIndex||0]:mesh.material;
     if(!material||material.visible===false)continue;
     const sample={mesh:mesh.name,meshUUID:mesh.uuid,layer:crownLayer(mesh),category:categoryFor(mesh),distance:hit.distance,
      point:hit.point.toArray(),cutoff:material.alphaTest||0,alpha:null,passesAlphaTest:null};
     try{
      sample.map=material.map?textureComponent(material.map,hit,3):null;
      sample.alphaMap=material.alphaMap?textureComponent(material.alphaMap,hit,1):null;
      let vertexAlpha=1;const colors=mesh.geometry.getAttribute('color');
      if(material.vertexColors&&colors?.itemSize===4&&hit.barycoord){const f=hit.face,b=hit.barycoord;vertexAlpha=colors.getW(f.a)*b.x+colors.getW(f.b)*b.y+colors.getW(f.c)*b.z;}
      sample.vertexAlpha=vertexAlpha;sample.opacity=material.opacity;
      sample.alpha=material.opacity*vertexAlpha*(sample.map?.value??1)*(sample.alphaMap?.value??1);
      sample.passesAlphaTest=sample.alpha>=sample.cutoff;
      if(sample.passesAlphaTest&&!blocker)blocker=sample;
     }catch(error){sample.error=String(error.message||error);unknown=true;}
     samples.push(sample);
    }
    const blocked=blocker?true:unknown?null:false,probe={offsetCameraRight:offset,world:targetPoint.toArray(),blocked,
     blockedBy:blocker?{mesh:blocker.mesh,layer:blocker.layer,category:blocker.category,alpha:blocker.alpha,cutoff:blocker.cutoff,distance:blocker.distance}:null,hits:samples};
    partResult.probes.push(probe);
    if(blocked===true){partResult.blockedCount++;result.blockedProbes++;}
    if(blocked===null){partResult.unknownCount++;result.unknownProbes++;}
   }
  }
  result.alphaImageReadbacks=alphaReadbacks.map(r=>({...r}));return result;
 }
 function dispose(){
  if(disposed)return;disposed=true;loaded=metadata.loaded=lastUpdate.loaded=false;group.removeFromParent();
  for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
  for(const entry of shadows){entry.mesh.geometry.dispose();entry.mesh.material.dispose();}footTexture?.dispose();
  alphaImageCache=new WeakMap();alphaReadbacks.length=0;
 }
 const pine={group:pineGroup,layers:{rear:groups.H36_Pine_RearCrown,trunk:groups.H36_Pine_Trunk,front:groups.H36_Pine_FrontBranch},
  ready,update:updatePine,lastUpdate,get loaded(){return loaded;},provenance:{technique:'New ImageGen-drawn 2.5D crown atlas plus real 3D trunk/branches; not a render of 036 needles; no runtime billboard or whole-tree fade',source:url}};
 const api={group,staticGroup,groups,gateGroup,pine,ready,metadata,attachCharacterShadow,update,setGroundAt,
  refreshShadows(){for(const entry of shadows)conformShadow(entry,true);},refreshBounds,measure,measureActorOcclusion,dispose};
 return api;
}

export {createEnvironmentH36 as createEnvironment};
