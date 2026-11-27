/**
 * H33 fixed-view environment: matte painted stone on the original 3D mesh.
 *
 * const env=createEnvironment({scene,renderer,camera,groundAt});
 * env.styleTerrain(terrain); env.styleGate(gate); await env.ready;
 * env.attachCharacterShadow(actor,{size:1.05}); env.update(dt);
 *
 * The real terrain, stairs, roof, navigation, camera and actor scale are preserved.
 * Hand-painted paving is projected in world XZ; steep rock uses three-axis mapping.
 * Only scenery uses this inexpensive fixed-sun Basic shader. Actors remain lit 3D.
 * Mountain strips are separate world-space valley planes, never camera billboards.
 * The H33 stone painting is a project-owned ImageGen edit of our authored atlas; H31 mountains are retained.
 */
import * as T from 'three';

const SUN=new T.Vector3(-8,16,12).normalize();
const SHADOW_DIRECTION=new T.Vector2(8,-12).normalize();
const _p=new T.Vector3();
const STONE_URL=new URL('../assets/environment-033/handpainted-stone-atlas.webp',import.meta.url).href;
const MOUNTAIN_URL=new URL('../assets/sample-runtime/mountain-atlas.webp',import.meta.url).href;
const ROCK_NORMAL_URL=new URL('../assets/environment-033/terrain-rock-normals.f32',import.meta.url).href;

// Texture-cell padding prevents the two original paintings bleeding into each
// other under filtering. Large joints remain readable at the normal phone view.
const STONE_GLSL=`
 uniform sampler2D uH31Stone;
 varying vec3 vH31Position;
 varying vec3 vH31Normal;
 vec3 h31Stone(vec2 worldUV,float rock){
  vec2 tile=fract(worldUV);
  vec2 uv=vec2(mix(.002,.498,tile.x)+rock*.5,mix(.004,.996,tile.y));
  return texture2D(uH31Stone,uv).rgb;
 }
 vec3 h31Rock(vec3 p,vec3 n){
  vec3 a=abs(n),a2=a*a;
  vec3 w=a2*a2*a;w/=max(.001,w.x+w.y+w.z);
  vec3 c=vec3(0.);
  if(w.x>.012)c+=h31Stone((p.zy+vec2(12.,18.))/vec2(20.,24.),1.)*w.x;
  if(w.y>.012)c+=h31Stone((p.xz+vec2(12.))/20.,1.)*w.y;
  if(w.z>.012)c+=h31Stone((p.xy+vec2(12.,18.))/vec2(20.,24.),1.)*w.z;
  return c;
 }
 float h31Rect(vec2 p,vec2 c,vec2 halfSize,vec2 feather){
  vec2 v=1.-smoothstep(halfSize-feather,halfSize+feather,abs(p-c));
  return v.x*v.y;
 }
 float h31Route(vec2 p){
  // Designed route, not an all-over paving wallpaper. The wide front approach
  // opens into the real courtyard; pine pass and real side steps remain legible.
  float approach=(1.-smoothstep(1.65,1.96,abs(p.x+2.5)))*smoothstep(-4.5,-3.7,p.y);
  float courtyard=h31Rect(p,vec2(-1.,-3.),vec2(5.,1.15),vec2(.36,.32));
  float pinePass=h31Rect(p,vec2(-6.,-6.15),vec2(1.05,2.65),vec2(.28,.32));
  float stairPass=h31Rect(p,vec2(2.3,-5.6),vec2(1.0,2.5),vec2(.25,.32));
  return max(max(approach,courtyard),max(pinePass,stairPass));
 }
 float h31GroundAO(vec3 p){
  // A continuous soft shelter joins the real gate base to the ground. The
  // darkest contact remains under the timbers, leaving the traversed front lit.
  float gateX=1.-smoothstep(3.7,4.9,abs(p.x));
  float gateZ=1.-smoothstep(1.5,2.8,abs(p.z+7.8));
  float groundBand=1.-smoothstep(.7,2.,p.y);
  return 1.-gateX*gateZ*groundBand*.17;
 }
`;

// A render-only low-frequency normal field retains the original slope masses.
// The previous material flattened every low upward-facing surface, including
// rock banks. Heights, positions, indices and the cached navigation never change.
export function prepareTerrainRockNormals(model) {
 model.updateWorldMatrix(true,true);
 model.traverse(mesh=>{
  if(!mesh.isMesh||mesh.geometry.hasAttribute('aH33RockNormal'))return;
  const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal;
  if(!p||!n)return;
  const scale=mesh.getWorldScale(new T.Vector3());
  const radius=.85/Math.max(.0001,(Math.abs(scale.x)+Math.abs(scale.y)+Math.abs(scale.z))/3);
  const radius2=radius*radius,cells=new Map(),keys=new Int32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const j=i*3,x=Math.floor(p.getX(i)/radius),y=Math.floor(p.getY(i)/radius),z=Math.floor(p.getZ(i)/radius);
   keys[j]=x;keys[j+1]=y;keys[j+2]=z;const key=x+','+y+','+z;
   let list=cells.get(key);if(!list){list=[];cells.set(key,list);}list.push(i);
  }
  const out=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const j=i*3,px=p.getX(i),py=p.getY(i),pz=p.getZ(i),nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);
   let sx=nx*1.5,sy=ny*1.5,sz=nz*1.5;
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
    const list=cells.get((keys[j]+dx)+','+(keys[j+1]+dy)+','+(keys[j+2]+dz));if(!list)continue;
    for(const k of list){
     const x=p.getX(k)-px,y=p.getY(k)-py,z=p.getZ(k)-pz,d=x*x+y*y+z*z;if(d>=radius2)continue;
     const kx=n.getX(k),ky=n.getY(k),kz=n.getZ(k);if(kx*nx+ky*ny+kz*nz<-.15)continue;
     const w=(1-d/radius2)*(1-d/radius2);sx+=kx*w;sy+=ky*w;sz+=kz*w;
    }
   }
   const inv=1/Math.max(.000001,Math.hypot(sx,sy,sz));out[j]=sx*inv;out[j+1]=sy*inv;out[j+2]=sz*inv;
  }
  g.setAttribute('aH33RockNormal',new T.BufferAttribute(out,3));
 });
}

function markMaterial(source,kind,stoneUniform){
 const m=new T.MeshBasicMaterial({color:0xffffff,map:kind==='gate'?source.map:null,
  side:source.side,transparent:source.transparent,opacity:source.opacity,
  alphaTest:source.alphaTest,fog:kind!=='gate',toneMapped:true});
 m.name=`H33 matte ${kind}`;
 m.onBeforeCompile=shader=>{
  shader.uniforms.uH31Stone=stoneUniform;
  shader.vertexShader=(kind==='terrain'?'attribute vec3 aH33RockNormal;varying vec3 vH33RockNormal;\n':'')+'varying vec3 vH31Position;varying vec3 vH31Normal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\nvH31Position=(modelMatrix*vec4(transformed,1.)).xyz;vH31Normal=normalize(mat3(modelMatrix)*normal);'+(kind==='terrain'?'vH33RockNormal=normalize(mat3(modelMatrix)*aH33RockNormal);':''));
  shader.fragmentShader=(kind==='terrain'?'varying vec3 vH33RockNormal;\n':'')+STONE_GLSL+'\n'+shader.fragmentShader;
  const mapCode=kind==='terrain'?`
   vec3 h31N=normalize(vH31Normal);
   vec3 h33SlopeN=normalize(vH33RockNormal);
   float h31Up=smoothstep(.39,.71,h31N.y)*(1.-smoothstep(1.15,2.7,vH31Position.y));
   float h31RouteMask=h31Route(vH31Position.xz);
   float h31Paved=h31Up*h31RouteMask;
   vec3 h31Paint;
   vec3 h31StoneColor=vec3(0.);
   vec3 h31Border=vec3(0.);
   if(h31Paved>.005){
    h31StoneColor=h31Stone((vH31Position.xz+vec2(.8,.6))/4.5,0.);
    // Restrain only fine painted marks; joints and slab form still lead the eye.
    h31StoneColor=mix(vec3(.148,.180,.173),h31StoneColor,.87);
   }
   if(h31Paved<.995){
    h31Border=h31Rock(vH31Position,h33SlopeN);
    // Broad moss banks frame the pale activity area. A slow contour follows the
    // path edge, rather than adding random high-frequency dirt or floor clutter.
    if(h31Up>0.){
      float h31Moss=h31Up*(.42+.14*sin(vH31Position.x*.62+vH31Position.z*.39))*(1.-smoothstep(.35,1.8,vH31Position.y));
      h31Border=mix(h31Border,h31Border*vec3(.40,.66,.43),h31Moss);
    }
   }
   if(h31Paved==1.)h31Paint=h31StoneColor;
   else if(h31Paved==0.)h31Paint=h31Border;
   else h31Paint=mix(h31Border,h31StoneColor,h31Paved);
   diffuseColor.rgb=h31Paint*vec3(1.08,1.025,.945);
   // All low upward ground has a continuous normal; scan micro-facets never
   // interrupt the newly painted large light masses on moss or paving.
   h31N=normalize(mix(h33SlopeN,vec3(0.,1.,0.),h31Paved*.94));
   float h31Sun=clamp(dot(h31N,normalize(vec3(-8.,16.,12.))),0.,1.);
   diffuseColor.rgb*=mix(vec3(.46,.58,.70),vec3(1.20,1.18,1.12),h31Sun)*h31GroundAO(vH31Position);
  `:`
   #include <map_fragment>
   vec3 h31Src=diffuseColor.rgb;
   float h31L=dot(h31Src,vec3(.2126,.7152,.0722));
   float h31Slate=smoothstep(.002,.045,min(h31Src.g-h31Src.r,h31Src.b-h31Src.r));
   float h31Wood=smoothstep(.003,.04,h31Src.r-max(h31Src.g,h31Src.b));
   // Retain semantic UV tiles, carved timbers and original painted occlusion;
   // replace their scattered scan colours with a restrained slate/wood palette.
   vec3 h31Neutral=vec3(.185,.201,.18);
   vec3 h31Palette=mix(h31Neutral,vec3(.072,.158,.177),h31Slate);
   h31Palette=mix(h31Palette,vec3(.135,.077,.047),h31Wood);
   float h31Volume=clamp(.55+h31L*2.2,.48,1.28);
   vec3 h31Clean=h31Palette*h31Volume;
   diffuseColor.rgb=mix(h31Src,h31Clean,.18);
   vec3 h31N=normalize(vH31Normal);
   // Genuine lower stone steps are painted to match the route. Timber bases
   // retain their own UV colour, so no rock texture is projected onto columns.
   float h31Low=(1.-smoothstep(.9,1.28,vH31Position.y))*(1.-h31Wood)*(1.-h31Slate);
   if(h31Low>.01){
    vec3 h31Step=h31N.y>.55?h31Stone((vH31Position.xz+vec2(.8,.6))/4.5,0.):h31Rock(vH31Position,h31N);
    diffuseColor.rgb=mix(diffuseColor.rgb,h31Step*vec3(1.08,1.025,.945),h31Low*.9);
   }
   float h31Sun=smoothstep(-.42,.73,dot(h31N,normalize(vec3(-8.,16.,12.))));
   diffuseColor.rgb*=mix(vec3(.49,.54,.61),vec3(1.05,1.055,1.04),h31Sun);
  `;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',mapCode);
 };
 m.customProgramCacheKey=()=>`h33-matte-basic-${kind}-v3`;
 return m;
}

// Build-time only. Run the identical scenery fragment shader in its original
// world position/normal, but rasterize each real triangle into its existing UV.
// No gameplay camera, screenshots or flattened scene are involved in this bake.
export function createTerrainBakeMaterial(stoneTexture) {
 const m=markMaterial(new T.MeshBasicMaterial(),'terrain',{value:stoneTexture});
 const originalCompile=m.onBeforeCompile;
 m.onBeforeCompile=shader=>{
  originalCompile(shader);
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',
   '#include <project_vertex>\ngl_Position=vec4(uv*2.-1.,0.,1.);');
 };
 m.side=T.DoubleSide;m.depthTest=false;m.depthWrite=false;m.fog=false;m.toneMapped=false;
 m.customProgramCacheKey=()=> 'h31-terrain-original-UV-bake-v1';
 return m;
}

function atlasPlane(texture,{width,height,x,y,z,name,opacity=1}){
 const g=new T.PlaneGeometry(width,height);
 // Canvas extraction gives each layer its own transparent texture, so mipmaps
 // cannot pull opaque colour across the horizontal atlas boundary.
 const mesh=new T.Mesh(g,new T.MeshBasicMaterial({map:texture,transparent:true,
  depthWrite:false,side:T.DoubleSide,forceSinglePass:true,toneMapped:false,fog:false,opacity}));
 mesh.position.set(x,y,z);mesh.rotation.y=Math.atan2(6,15);mesh.name=name;return mesh;
}

function softTexture(kind='foot') {
  const c=document.createElement('canvas');c.width=c.height=256;
  const g=c.getContext('2d');
  if(kind==='mist') {
    const a=g.createLinearGradient(0,0,0,256);
    a.addColorStop(0,'rgba(188,204,207,0)');a.addColorStop(.38,'rgba(188,204,207,.04)');a.addColorStop(.66,'rgba(188,204,207,.34)');a.addColorStop(1,'rgba(188,204,207,0)');
    g.fillStyle=a;g.fillRect(0,0,256,256);
  } else if(kind==='gate') {
    // Two overlapping soft slabs reproduce roof shelter without a shadow map.
    for(let i=0;i<15;i++) {
      const inset=7+i*2;g.fillStyle=`rgba(20,32,44,${.012+i*.0016})`;
      g.beginPath();if(g.roundRect)g.roundRect(inset,34+inset*.35,256-inset*2,188-inset*.7,26);else g.rect(inset,34+inset*.35,256-inset*2,188-inset*.7);g.fill();
    }
  } else {
    // Contact stays at center. The cast tail extends in the SUN's opposite XZ.
    g.save();g.translate(153,128);g.scale(1.25,.38);
    let grad=g.createRadialGradient(0,0,0,0,0,68);grad.addColorStop(0,'rgba(20,32,44,.34)');grad.addColorStop(.35,'rgba(20,32,44,.22)');grad.addColorStop(1,'rgba(20,32,44,0)');g.fillStyle=grad;g.fillRect(-70,-70,140,140);g.restore();
    const contact=g.createRadialGradient(128,128,0,128,128,40);contact.addColorStop(0,'rgba(16,27,38,.58)');contact.addColorStop(.3,'rgba(16,27,38,.35)');contact.addColorStop(1,'rgba(16,27,38,0)');g.fillStyle=contact;g.fillRect(84,84,88,88);
  }
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=1;return texture;
}

export function createEnvironment({scene, renderer, camera, groundAt=()=>0}={}) {
  if(!scene||!renderer) throw new Error('createEnvironment requires scene and renderer');
  const group=new T.Group();group.name='H33 matte stone and cool-slate contact shading';scene.add(group);
  const treated=new WeakSet(),shadows=[];const footTexture=softTexture();let ground=groundAt;
  const materials=[];const ownedTextures=[footTexture];
  const fallback=new T.DataTexture(new Uint8Array([103,118,114,255]),1,1,T.RGBAFormat);fallback.colorSpace=T.SRGBColorSpace;fallback.needsUpdate=true;ownedTextures.push(fallback);
  const stoneUniform={value:fallback};
  const loader=new T.TextureLoader();
  let rockNormalField=null;const terrainNormalTargets=[];
  const installRockNormals=mesh=>{
    const count=mesh.geometry.attributes.position.count;
    if(rockNormalField.length!==count*3)throw Error('H33 terrain normal field does not match the render mesh');
    mesh.geometry.setAttribute('aH33RockNormal',new T.BufferAttribute(rockNormalField,3));
  };
  // The spatial normal filtering is build-time work. Load the immutable field
  // in parallel with the paintings; no neighbourhood search runs on the phone.
  const normalReady=fetch(ROCK_NORMAL_URL).then(r=>{if(!r.ok)throw Error('H33 rock normal HTTP '+r.status);return r.arrayBuffer();}).then(b=>{
    rockNormalField=new Float32Array(b);for(const mesh of terrainNormalTargets)installRockNormals(mesh);
  });
  const stoneReady=loader.loadAsync(STONE_URL).then(t=>{t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.anisotropy=2;t.minFilter=T.LinearMipmapLinearFilter;stoneUniform.value=t;ownedTextures.push(t);});
  const original={background:scene.background, fog:scene.fog, exposure:renderer.toneMappingExposure, envIntensity:scene.environmentIntensity};

  scene.background=new T.Color(0x728995);
  scene.fog=new T.FogExp2(0x728995,.0105);
  scene.environmentIntensity=.37;
  renderer.toneMappingExposure=.94;
  // Same light direction as H29. Lower ambient energy lets the broad shapes read.
  scene.traverse(o=>{
    if(o.isAmbientLight) o.intensity=.35;
    if(o.isHemisphereLight) {o.color.setHex(0xc2d5cc);o.groundColor.setHex(0x6c6650);o.intensity=1.20;}
    if(o.isDirectionalLight) {
      const alignment=o.position.clone().normalize().dot(SUN);
      if(alignment>.90) {o.intensity=2.35;o.color.setHex(0xffedcf);}
      else {o.intensity=.55;o.color.setHex(0xb8d6d6);}
    }
    if(o.isSpotLight) o.intensity=Math.min(o.intensity,95);
  });

  // Distant painted layers occupy the actual valley behind the original wall.
  // At this high oblique camera a mountain at world Y=0 would be above the view;
  // these layers are in the deep gorge, not attached to the camera or HUD.
  const mountainReady=loader.loadAsync(MOUNTAIN_URL).then(atlas=>{
    const img=atlas.image,stripHeight=Math.floor(img.height/2);
    for(let i=0;i<2;i++){
      const c=document.createElement('canvas');c.width=img.width;c.height=stripHeight;
      c.getContext('2d').drawImage(img,0,i*stripHeight,img.width,stripHeight,0,0,img.width,stripHeight);
      const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.minFilter=T.LinearMipmapLinearFilter;ownedTextures.push(t);
      const layer=atlasPlane(t,i===0?{width:67,height:16.7,x:-5,y:-24.5,z:-37,name:'H31 far hand-painted valley',opacity:.87}:{width:54,height:13.5,x:-7,y:-24.5,z:-27,name:'H31 near hand-painted valley',opacity:.93});
      group.add(layer);materials.push(layer.material);
    }
    atlas.dispose();
  });
  const ready=Promise.all([stoneReady,mountainReady,normalReady]);

  function styleModel(model,kind) {
    if(!model||treated.has(model)) return;treated.add(model);
    if(kind==='terrain')model.traverse(mesh=>{if(mesh.isMesh){
      terrainNormalTargets.push(mesh);
      if(rockNormalField)installRockNormals(mesh);
      else mesh.geometry.setAttribute('aH33RockNormal',mesh.geometry.attributes.normal.clone());
    }});
    const cache=new Map();
    model.traverse(o=>{if(o.isMesh){
      const one=m=>{if(!m?.isMeshStandardMaterial&&!m?.isMeshBasicMaterial)return m;if(!cache.has(m)){
        const clone=markMaterial(m,kind,stoneUniform);
        cache.set(m,clone);materials.push(clone);
      }return cache.get(m);};
      o.material=Array.isArray(o.material)?o.material.map(one):one(o.material);
      o.castShadow=o.receiveShadow=false;
    }});
  }

  function conform(entry) {
    const mesh=entry.mesh, a=mesh.geometry.attributes.position;
    const centerHeight=ground(mesh.position.x,mesh.position.z);
    if(centerHeight===null||!Number.isFinite(centerHeight)) return;
    mesh.position.y=centerHeight+.025;
    const cos=Math.cos(mesh.rotation.y),sin=Math.sin(mesh.rotation.y);
    for(let i=0;i<a.count;i++) {
      const x=entry.base[i*2],z=entry.base[i*2+1];
      const worldX=mesh.position.x+cos*x+sin*z,worldZ=mesh.position.z-sin*x+cos*z;
      const h=ground(worldX,worldZ);
      a.setY(i,h!==null&&Number.isFinite(h)?T.MathUtils.clamp(h-centerHeight,-.7,.7):0);
    }
    a.needsUpdate=true;
  }

  function surfaceShadow({x=0,z=0,width=2,depth=2,map=footTexture,opacity=1,actor=null,angle=0,name='contact shadow'}={}) {
    const geometry=new T.PlaneGeometry(width,depth,4,4);geometry.rotateX(-Math.PI/2);
    // Ground deformation is bounded to +/-.7. Keep one conservative bound;
    // do not rescan all vertices whenever an actor's ground shadow moves.
    geometry.boundingSphere=new T.Sphere(new T.Vector3(),Math.hypot(width/2,depth/2,.7));
    const material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,opacity,polygonOffset:true,polygonOffsetFactor:-4,toneMapped:false});materials.push(material);
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,0,z);mesh.rotation.y=angle;mesh.name=name;mesh.renderOrder=1;group.add(mesh);
    const a=geometry.attributes.position;const base=[];for(let i=0;i<a.count;i++)base.push(a.getX(i),a.getZ(i));
    const entry={mesh,base,actor,last:new T.Vector2(Infinity,Infinity)};shadows.push(entry);conform(entry);return mesh;
  }

  let gateShadow=null;
  function styleGate(model) {
    styleModel(model,'gate');
    if(!gateShadow) {
      const t=softTexture('gate');ownedTextures.push(t);
      gateShadow=surfaceShadow({x:0,z:-7.7,width:8.5,depth:5.0,map:t,opacity:.68,name:'shared-direction roof shelter shadow'});
    }
  }
  function attachCharacterShadow(actor,{size=1.7,opacity=1}={}) {
    // The original contactFor group shadow should not be attached as well.
    return surfaceShadow({actor,width:size*1.65,depth:size*1.35,opacity,angle:-Math.atan2(SHADOW_DIRECTION.y,SHADOW_DIRECTION.x),name:'actor contact and directional shadow'});
  }
  function update() {
    for(const e of shadows) {
      if(!e.actor) continue;
      e.actor.getWorldPosition(_p);e.mesh.visible=e.actor.visible;
      if(Math.hypot(_p.x-e.last.x,_p.z-e.last.y)>.045) {
        e.mesh.position.x=_p.x;e.mesh.position.z=_p.z;e.last.set(_p.x,_p.z);conform(e);
      }
    }
  }

  return {
    group,ready,
    styleTerrain:model=>styleModel(model,'terrain'),styleGate,attachCharacterShadow,update,
    setGroundAt(fn){ground=fn;for(const e of shadows)conform(e);},
    refreshShadows(){for(const e of shadows)conform(e);},
    metadata:{source:'Project-owned H33 ImageGen hand-painted edit of original vector atlas, retained H31 mountains; real 3D geometry/nav unchanged; original world shader and cool-slate contact shadows',staticDraws:3,shadowDirection:[SHADOW_DIRECTION.x,SHADOW_DIRECTION.y],sunDirection:SUN.toArray(),cameraUnchanged:true,staticShading:'world-XZ hand-painted paving, triplanar rock, semantic roof UV palette, fixed SUN; no static PBR/IBL/normal/ORM sampling'},
    dispose(){group.removeFromParent();group.traverse(o=>o.geometry?.dispose());for(const m of materials)m.dispose();for(const t of ownedTextures)t.dispose();scene.background=original.background;scene.fog=original.fog;scene.environmentIntensity=original.envIntensity;renderer.toneMappingExposure=original.exposure;}
  };
}

export function applyEnvironment(options={}) {
  const env=createEnvironment(options);
  if(options.terrain)env.styleTerrain(options.terrain);
  if(options.gate)env.styleGate(options.gate);
  return env;
}
