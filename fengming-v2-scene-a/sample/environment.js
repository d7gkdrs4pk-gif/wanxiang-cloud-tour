/**
 * H30 environment finish — original code/procedural assets, no external art.
 *
 * const env = createEnvironment({scene:s, renderer:r, camera:c, groundAt});
 * // Call after each REAL glTF's final scale/placement and before/after adding it.
 * env.styleTerrain(terrainModel); env.styleGate(gateModel);
 * env.attachCharacterShadow(player, {size:1.7}); // replaces old contactFor(player)
 * env.update(dt); // actor shadows follow position and existing groundAt heights
 *
 * No model positions, collision/nav data, camera/FOV or route are changed.
 * Static materials are separately derived from the source albedo; source materials
 * stay untouched. The map contrast is
 * compressed in the real 3D shader, not flattened into a background screenshot.
 */
import * as T from 'three';

const SUN = new T.Vector3(-8, 16, 12).normalize();
const SHADOW_DIRECTION = new T.Vector2(8, -12).normalize();
const _p = new T.Vector3();

function markMaterial(source, kind) {
  // Fixed-view 2.5D scenery keeps the source albedo and real geometry, but
  // avoids per-pixel PBR/normal/ORM/IBL work. Actors keep their lit 3D materials.
  const m = new T.MeshBasicMaterial({
    color: source.color?.clone() ?? new T.Color(0xffffff),
    map: source.map || null,
    side: source.side,
    transparent: source.transparent,
    opacity: source.opacity,
    alphaTest: source.alphaTest,
    vertexColors: source.vertexColors,
    fog: true,
    toneMapped: true
  });
  m.name = `H30 ${kind} · ${source.name || 'surface'}`;
  m.onBeforeCompile = shader => {
    shader.vertexShader = `varying vec3 vH30WorldNormal;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvH30WorldNormal=normalize(mat3(modelMatrix)*normal);');
    shader.fragmentShader = `varying vec3 vH30WorldNormal;\n` + shader.fragmentShader;
    const treatment = kind === 'terrain' ? `
      // Compress the scanned paving's bright white and black creases together.
      // Keep image detail legible without competing with the small red hero.
      float h30L = max(.001, dot(diffuseColor.rgb, vec3(.2126,.7152,.0722)));
      vec3 h30Grey = vec3(h30L);
      vec3 h30Muted = mix(h30Grey, diffuseColor.rgb, .61);
      float h30Compressed = .042 + pow(h30L, .70) * .43;
      diffuseColor.rgb = h30Muted * (h30Compressed / h30L) * vec3(.79,.91,.94);
    ` : `
      // The roof stays blue slate and the timbers stay warm, at lower saturation.
      float h30L = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722));
      diffuseColor.rgb = mix(vec3(h30L), diffuseColor.rgb, .81) * vec3(.82,.89,.91);
    `;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
      `#include <map_fragment>\n${treatment}\n
      // Shared direction for roof soffits, stair risers and foot shadows.
      float h30Facing = dot(normalize(vH30WorldNormal), normalize(vec3(-8.,16.,12.)));
      diffuseColor.rgb *= mix(.59,1.,smoothstep(-.35,.60,h30Facing));`);
  };
  m.customProgramCacheKey = () => `h30-environment-basic-${kind}-v2`;
  m.needsUpdate = true;
  return m;
}

function ridgeGeometry({centerX, centerZ, width, baseY, peaks, scale=1}) {
  // Horizontal axis follows the screen's right direction for the fixed oblique
  // game camera. This is actual distant world geometry behind the rock walls.
  const right = new T.Vector3(15, 0, -6).normalize();
  const points = [];
  peaks.forEach((height, i) => {
    const u = i / (peaks.length - 1) - .5;
    points.push([centerX + right.x*width*u, baseY+height*scale, centerZ+right.z*width*u]);
  });
  // A denser smooth ridge avoids a single giant V-shaped colour slab in a
  // narrow phone window. It remains only one inexpensive world-space mesh.
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'catmullrom',.24);
  const ridge=curve.getPoints((points.length-1)*8);
  const vertices=[], indices=[];
  for (const p of ridge) vertices.push(p.x,baseY-19,p.z,p.x,p.y,p.z);
  for (let i=0;i<ridge.length-1;i++) {
    const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
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
      const inset=7+i*2;g.fillStyle=`rgba(10,22,26,${.012+i*.0016})`;
      g.beginPath();if(g.roundRect)g.roundRect(inset,34+inset*.35,256-inset*2,188-inset*.7,26);else g.rect(inset,34+inset*.35,256-inset*2,188-inset*.7);g.fill();
    }
  } else {
    // Contact stays at center. The cast tail extends in the SUN's opposite XZ.
    g.save();g.translate(153,128);g.scale(1.25,.38);
    let grad=g.createRadialGradient(0,0,0,0,0,68);grad.addColorStop(0,'rgba(12,23,28,.38)');grad.addColorStop(.35,'rgba(12,23,28,.24)');grad.addColorStop(1,'rgba(12,23,28,0)');g.fillStyle=grad;g.fillRect(-70,-70,140,140);g.restore();
    const contact=g.createRadialGradient(128,128,0,128,128,40);contact.addColorStop(0,'rgba(8,18,22,.56)');contact.addColorStop(.3,'rgba(8,18,22,.34)');contact.addColorStop(1,'rgba(8,18,22,0)');g.fillStyle=contact;g.fillRect(84,84,88,88);
  }
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=1;return texture;
}

export function createEnvironment({scene, renderer, camera, groundAt=()=>0}={}) {
  if(!scene||!renderer) throw new Error('createEnvironment requires scene and renderer');
  const group=new T.Group();group.name='H30 far mountains and ground shading';scene.add(group);
  const treated=new WeakSet(),shadows=[];const footTexture=softTexture();let ground=groundAt;
  const materials=[];const ownedTextures=[footTexture];
  const original={background:scene.background, fog:scene.fog, exposure:renderer.toneMappingExposure, envIntensity:scene.environmentIntensity};

  scene.background=new T.Color(0x728995);
  scene.fog=new T.FogExp2(0x728995,.0105);
  scene.environmentIntensity=.37;
  renderer.toneMappingExposure=.94;
  // Same light direction as H29. Lower ambient energy lets the broad shapes read.
  scene.traverse(o=>{
    if(o.isAmbientLight) o.intensity=.30;
    if(o.isHemisphereLight) {o.color.setHex(0xc6dde4);o.groundColor.setHex(0x35444a);o.intensity=1.05;}
    if(o.isDirectionalLight) {
      const alignment=o.position.clone().normalize().dot(SUN);
      if(alignment>.90) {o.intensity=1.85;o.color.setHex(0xd5e6e6);}
      else {o.intensity=.32;o.color.setHex(0x829fa9);}
    }
    if(o.isSpotLight) o.intensity=Math.min(o.intensity,95);
  });

  const far=new T.Mesh(ridgeGeometry({centerX:-6,centerZ:-36,width:56,baseY:-35,scale:1.2,peaks:[1,3,6,5,8,7,11,9,12,10,13,9,11,8,7,10,7,9,6,7,4,5,2,1]}),new T.MeshBasicMaterial({color:0x8399a4,side:T.DoubleSide}));far.name='far pale mountain ridge';group.add(far);
  const near=new T.Mesh(ridgeGeometry({centerX:-8,centerZ:-27,width:48,baseY:-29,scale:1.3,peaks:[0,3,2,6,4,7,5,9,8,11,8,7,10,7,9,6,7,4,7,3,5,2,4,1,0]}),new T.MeshBasicMaterial({color:0x526f7f,side:T.DoubleSide}));near.name='near blue grey mountain ridge';group.add(near);
  const mistTexture=softTexture('mist');ownedTextures.push(mistTexture);
  const mist=new T.Mesh(new T.PlaneGeometry(74,18),new T.MeshBasicMaterial({map:mistTexture,transparent:true,depthWrite:false,opacity:.55,side:T.DoubleSide}));
  mist.position.set(-7,-21,-24);mist.rotation.y=Math.atan2(6,15);mist.name='distant thin mist';group.add(mist);

  function styleModel(model,kind) {
    if(!model||treated.has(model)) return;treated.add(model);
    const cache=new Map();
    model.traverse(o=>{if(o.isMesh){
      const one=m=>{if(!m?.isMeshStandardMaterial&&!m?.isMeshBasicMaterial)return m;if(!cache.has(m)){const clone=markMaterial(m,kind);cache.set(m,clone);materials.push(clone);}return cache.get(m);};
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
    a.needsUpdate=true;mesh.geometry.computeBoundingSphere();
  }

  function surfaceShadow({x=0,z=0,width=2,depth=2,map=footTexture,opacity=1,actor=null,angle=0,name='contact shadow'}={}) {
    const geometry=new T.PlaneGeometry(width,depth,4,4);geometry.rotateX(-Math.PI/2);
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
    group,
    styleTerrain:model=>styleModel(model,'terrain'),styleGate,attachCharacterShadow,update,
    setGroundAt(fn){ground=fn;for(const e of shadows)conform(e);},
    refreshShadows(){for(const e of shadows)conform(e);},
    metadata:{source:'Original procedural world geometry, material shaders and canvas shadows; no external images',staticDraws:4,shadowDirection:[SHADOW_DIRECTION.x,SHADOW_DIRECTION.y],sunDirection:SUN.toArray(),cameraUnchanged:true,staticShading:'albedo + fixed SUN vertex-normal shade; no PBR/IBL/normal/ORM sampling'},
    dispose(){group.removeFromParent();group.traverse(o=>o.geometry?.dispose());for(const m of materials)m.dispose();for(const t of ownedTextures)t.dispose();scene.background=original.background;scene.fog=original.fog;scene.environmentIntensity=original.envIntensity;renderer.toneMappingExposure=original.exposure;}
  };
}

export function applyEnvironment(options={}) {
  const env=createEnvironment(options);
  if(options.terrain)env.styleTerrain(options.terrain);
  if(options.gate)env.styleGate(options.gate);
  return env;
}
