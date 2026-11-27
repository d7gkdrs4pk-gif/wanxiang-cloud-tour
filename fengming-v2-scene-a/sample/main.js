import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createNavigation} from './navigation.js';
import {createHero} from './hero.js';
import {createEnemy} from './enemy.js';
import {createLayeredPine} from './pine-layers.js';
import {createEnvironment} from './environment.js';
import {createSceneDressing,createStoneLantern} from './scene-dressing.js';
import {createRoofOcclusion} from './roof-occlusion.js';
import {createPathPlanner} from './path-planner.js';
import {finishGateRoof} from './gate-roof-finish.js';
import {loadGroundSurface} from './ground-surface.js';

const startup=window.__FM_STARTUP;
const yieldPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
async function initialize(){
 startup?.stage('正在准备3D画面',.12,'renderer');
 await yieldPaint();
const $=q=>document.querySelector(q), params=new URLSearchParams(location.search), debug=params.get('debug')==='1', fxEnabled=params.get('fx')!=='0';
const scene=new T.Scene();
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.shadowMap.enabled=false;
renderer.debug.onShaderError=(gl,program,vs,fs)=>{throw Error('Shader initialization failed: '+gl.getProgramInfoLog(program)+gl.getShaderInfoLog(vs)+gl.getShaderInfoLog(fs));};
document.body.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(39,innerWidth/innerHeight,.1,160),offset=new T.Vector3(6,27,15);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
scene.add(new T.AmbientLight(0xffffff,.42),new T.HemisphereLight(0xc2d5cc,0x6c6650,1.20));
const sun=new T.DirectionalLight(0xffedcf,2.35);sun.position.set(-8,16,12);scene.add(sun);
const rim=new T.DirectionalLight(0xb8d6d6,.55);rim.position.set(5,9,-12);scene.add(rim);
const stone=new T.MeshStandardMaterial({color:0x61767b,roughness:1});
const nav=createNavigation({scene,stone});
const env=createEnvironment({scene,renderer,camera,groundAt:nav.groundAt});env.ready.catch(()=>{});
const player=new T.Group();player.name='林砚';scene.add(player);
startup?.stage('正在准备人物',.20,'hero');await yieldPaint();
const hero=createHero();player.add(hero.group);
const foe=createEnemy();scene.add(foe.group);
const enemy={g:foe.group,hp:3,home:new T.Vector3(2.8,0,-6.6),hurt:0,dead:0};
env.attachCharacterShadow(player,{size:1.05,opacity:.9});env.attachCharacterShadow(foe.group,{size:1.05,opacity:.7});
let ready=false,terrain=null,gate=null,pine=null,dressing=null,roofOcclusion=null,pathPlanner=null,attackState=null,attackCooldown=0,phoenixCooldown=0,hp=100,kills=0,impactTimer=0,elapsed=0,hitPause=0;
const target=new T.Vector3(),safePos=new T.Vector3(),events=[],frameData=[];
let flags={nearPine:false,underBranch:false,stairs:false,hit:false};
let movePath=[],inputNotice='',inputNoticeUntil=0,markerUntil=0;
const inputMarker=new T.Mesh(new T.RingGeometry(.19,.24,28),new T.MeshBasicMaterial({color:0xdfcf9a,transparent:true,opacity:.85,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4}));inputMarker.rotation.x=-Math.PI/2;inputMarker.visible=false;inputMarker.raycast=()=>{};scene.add(inputMarker);
function log(type,data={}){events.push({type,t:performance.now(),...data});if(events.length>400)events.shift();}
const guidePoints=[[-5.1,-4.4],[-6.0,-6.5],[-6.0,-7.4],[-6.4,-8.1],[-6.0,-7.4],[-6.0,-6.5],[-3.1,-3.05],[0,-3.05],[3.1,-3.05],[3.1,-6.6],[2.5,-7],[1.58,-7]];
let guideIndex=0;
const guideMark=new T.Mesh(new T.RingGeometry(.14,.18,28),new T.MeshBasicMaterial({color:0x9fb9af,transparent:true,opacity:.36,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3}));guideMark.rotation.x=-Math.PI/2;guideMark.raycast=()=>{};scene.add(guideMark);
const loader=new GLTFLoader();
function load(url){return new Promise((ok,no)=>loader.load(url,g=>ok(g.scene),undefined,no));}
function applyTransform(model,tr){model.scale.setScalar(tr.scale);model.position.fromArray(tr.translation);model.updateMatrixWorld(true);}
// A local architectural cutaway preserves the roof while keeping the hero readable
// on the actual steps under it. No background flattening or whole-gate fade.
const roofUniforms={uHeroPixel:{value:new T.Vector2()},uHeroY:{value:0},uCut:{value:0},uRatio:{value:1},uBladeA:{value:new T.Vector2()},uBladeB:{value:new T.Vector2()},uBladeOn:{value:0}};
let roofTick=0,roofTarget=0;
function prepareRoof(model){model.traverse(o=>{if(!o.isMesh)return;for(const m of (Array.isArray(o.material)?o.material:[o.material])){
 const old=m.onBeforeCompile;m.onBeforeCompile=shader=>{old?.(shader);Object.assign(shader.uniforms,roofUniforms);shader.vertexShader='varying float vGateY;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvGateY=(modelMatrix*vec4(transformed,1.)).y;');shader.fragmentShader='varying float vGateY;uniform vec2 uHeroPixel;uniform float uHeroY,uCut,uRatio,uBladeOn;uniform vec2 uBladeA,uBladeB;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','if(vGateY>uHeroY+.9){float cut=1.-smoothstep(19.*uRatio,36.*uRatio,distance(gl_FragCoord.xy,uHeroPixel));vec2 ab=uBladeB-uBladeA;float along=clamp(dot(gl_FragCoord.xy-uBladeA,ab)/max(1.,dot(ab,ab)),0.,1.);float bladeCut=(1.-smoothstep(3.*uRatio,10.*uRatio,distance(gl_FragCoord.xy,uBladeA+ab*along)))*uBladeOn;diffuseColor.a*=mix(1.,.14,max(cut,bladeCut)*uCut); }\n#include <opaque_fragment>');};m.transparent=true;m.depthWrite=true;m.forceSinglePass=true;m.customProgramCacheKey=()=> 'h33-gate-body-and-blade-cutaway-2';m.needsUpdate=true;
 }})}
function updateRoof(dt,t){if(!gate||!roofOcclusion)return;const head=player.position.clone().add(new T.Vector3(0,.8,0));if(t-roofTick>100){roofTick=t;roofTarget=[.18,.72,1.2].some(height=>roofOcclusion.occludes(camera.position,player.position.clone().add(new T.Vector3(0,height,0)),player.position.y+.9))?1:0;}
 roofUniforms.uCut.value=T.MathUtils.lerp(roofUniforms.uCut.value,roofTarget,1-Math.exp(-dt*12));const p=head.project(camera);roofUniforms.uHeroPixel.value.set((p.x+1)*renderer.domElement.width/2,(p.y+1)*renderer.domElement.height/2);roofUniforms.uHeroY.value=player.position.y;roofUniforms.uRatio.value=renderer.getPixelRatio();const bladeA=hero.bladeBaseWorld().project(camera),bladeB=hero.swordTipWorld().project(camera);roofUniforms.uBladeA.value.set((bladeA.x+1)*renderer.domElement.width/2,(bladeA.y+1)*renderer.domElement.height/2);roofUniforms.uBladeB.value.set((bladeB.x+1)*renderer.domElement.width/2,(bladeB.y+1)*renderer.domElement.height/2);roofUniforms.uBladeOn.value=T.MathUtils.lerp(roofUniforms.uBladeOn.value,attackState?1:0,1-Math.exp(-dt*30));}

const lamps=[];
function lantern(x,z){
 const {group,light}=createStoneLantern();group.position.set(x,0,z);scene.add(group);lamps.push({group,light,x,z});
}
lantern(-6,-5);lantern(3.3,-3.3);

// Ordinary damage remains H29's horizontal range2.6, one HP per attack and .45 cooldown.
// Only its trigger is aligned to the physical sword's impact pose (.44/.78s).
function requestAttack(){
 if(!ready||attackState||attackCooldown>0||hp<=0)return;
 target.copy(player.position);movePath.length=0;
 const aim=enemy.hp>0&&Math.hypot(enemy.g.position.x-player.position.x,enemy.g.position.z-player.position.z)<3.5?Math.atan2(enemy.g.position.x-player.position.x,enemy.g.position.z-player.position.z):player.rotation.y;
 attackState={time:0,duration:hero.stats.attackDuration??.78,hitDone:false,aim};
 $('#strike').classList.add('active');log('swing-start',{p:player.position.toArray(),facing:player.rotation.y,aim});
}
$('#strike').addEventListener('pointerdown',e=>{e.preventDefault();requestAttack();});
$('#strike').addEventListener('click',e=>{e.preventDefault();requestAttack();});
const trailGeo=new T.BufferGeometry(),trailMat=new T.MeshBasicMaterial({color:0xd9d5ae,transparent:true,opacity:.24,side:T.DoubleSide,depthWrite:false,toneMapped:false});
trailGeo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(18),3));trailGeo.setIndex([0,1,2,2,3,0]);
const trail=new T.Mesh(trailGeo,trailMat);trail.frustumCulled=false;trail.visible=false;scene.add(trail);const swordHistory=[];
function updateTrail(progress){
 if(!fxEnabled){trail.visible=false;return;}if(progress!==null&&progress>.31&&progress<.66){
  const tip=hero.swordTipWorld().clone(),base=hero.bladeBaseWorld().clone().lerp(tip,.5);swordHistory.push([base,tip,elapsed]);while(swordHistory.length>2&&(swordHistory.length>6||elapsed-swordHistory[0][2]>.060))swordHistory.shift();
  const p=[],idx=[];swordHistory.forEach(([a,b],i)=>{p.push(a.x,a.y,a.z,b.x,b.y,b.z);if(i){const k=i*2;idx.push(k-2,k-1,k,k-1,k+1,k)}});trailGeo.setAttribute('position',new T.Float32BufferAttribute(p,3));trailGeo.setIndex(idx);trail.visible=idx.length>0;
 }else{swordHistory.length=0;trail.visible=false;}
}
const motes=[];
const impactTemplate=new T.PointsMaterial({color:0xdfd6b1,size:.045,transparent:true,depthWrite:false,toneMapped:false});
impactTemplate.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('void main() {','void main() { vec2 circle=gl_PointCoord-vec2(.5);if(dot(circle,circle)>.25)discard;');};
impactTemplate.customProgramCacheKey=()=> 'h33-round-impact';
const impactWarmup=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([0,0,0],3)),impactTemplate);impactWarmup.frustumCulled=false;

function hitSpark(point,large=false){
 if(!fxEnabled)return;
 const geo=new T.BufferGeometry(),p=[],vel=[];for(let i=0;i<(large?40:6);i++){p.push(point.x,point.y,point.z);vel.push((Math.random()-.5)*(large?9:2),(Math.random()-.2)*(large?5:1.6),(Math.random()-.5)*(large?9:2));}
 geo.setAttribute('position',new T.Float32BufferAttribute(p,3));const m=impactTemplate.clone();m.onBeforeCompile=impactTemplate.onBeforeCompile;m.customProgramCacheKey=impactTemplate.customProgramCacheKey;m.color.setHex(large?0xffcd6b:0xdfd6b1);m.size=large?.12:.045;const o=new T.Points(geo,m);scene.add(o);motes.push({o,vel,life:large?1:.25,total:large?1:.25});
}
function damageEnemy(awakened=false){
 if(enemy.hp<=0)return;const dx=enemy.g.position.x-player.position.x,dz=enemy.g.position.z-player.position.z,len=Math.hypot(dx,dz);
 if(len> (awakened?5:2.6))return;
 enemy.hp=awakened?0:enemy.hp-1;enemy.hurt=foe.stats.hitDuration??.34;const d=new T.Vector3(dx,0,dz).normalize();foe.hit(d);
 hitPause=Math.max(hitPause,.045);
 const next=enemy.g.position.clone().addScaledVector(d,.13),ground=nav.safeGround(next.x,next.z);if(ground!==null){enemy.g.position.copy(next);enemy.g.position.y=ground;}
 const impact=awakened?enemy.g.position.clone().add(new T.Vector3(0,1,0)):new T.Line3(hero.bladeBaseWorld().clone(),hero.swordTipWorld().clone()).closestPointToPoint(enemy.g.position.clone().add(new T.Vector3(0,1.15,0)),true,new T.Vector3());hitSpark(impact,awakened);
 flags.hit=true;log('hit',{enemyHP:enemy.hp,attackProgress:attackState?.time/attackState?.duration,player:player.position.toArray(),enemy:enemy.g.position.toArray(),blade:hero.swordTipWorld().toArray(),impact:impact.toArray()});
 $('#impact').textContent=enemy.hp<=0?'影煞已破':'命中';$('#impact').classList.add('on');impactTimer=.6;
 if(enemy.hp<=0){kills++;enemy.dead=0;log('enemy-defeated');}
}
function requestPhoenix(e){e.preventDefault();if(!ready||phoenixCooldown>0)return;phoenixCooldown=8;damageEnemy(true);hitSpark(player.position.clone().add(new T.Vector3(0,1.1,0)),true);log('phoenix-awakening');}
$('#phoenix').addEventListener('pointerdown',requestPhoenix);$('#phoenix').addEventListener('click',requestPhoenix);
function reset(){
 if(!ready)return;player.position.set(-3.2,nav.groundAt(-3.2,-4.2)??0,-4.2);player.rotation.y=-.6;target.copy(player.position);safePos.copy(player.position);camera.position.copy(player.position).add(offset);camera.lookAt(player.position);
 enemy.g.position.copy(enemy.home);enemy.g.position.y=nav.groundAt(enemy.home.x,enemy.home.z)??0;enemy.hp=3;enemy.dead=0;enemy.hurt=0;foe.group.visible=true;foe.update(0,{dead:false});
 movePath.length=0;inputMarker.visible=false;inputNoticeUntil=0;$('#strike').classList.remove('active');
 hp=100;kills=0;hitPause=0;motion.maxYawRadPerSec=0;guideIndex=0;attackState=null;attackCooldown=0;phoenixCooldown=0;flags={nearPine:false,underBranch:false,stairs:false,hit:false};elapsed=0;log('reset');
}
$('#reset').onclick=reset;
const ray=new T.Raycaster();let lastAim=0;
function aim(e){
 if(!ready||attackState||!pathPlanner)return;
 const now=performance.now();if(e.type==='pointermove'&&now-lastAim<100)return;lastAim=now;
 const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
 const hit=nav.pick(ray);if(!hit)return;
 const result=pathPlanner.plan(player.position,hit);
 if(result.ok){movePath=result.points.map(p=>p.clone());target.copy(movePath[0]||player.position);inputMarker.position.copy(result.goal);inputMarker.position.y+=.04;inputMarker.material.color.setHex(0xdfcf9a);inputMarker.visible=true;markerUntil=now+900;
  if(result.adjusted||movePath.length>1){inputNotice='沿石路前往';inputNoticeUntil=now+1400;}
 }else{movePath.length=0;target.copy(player.position);inputNotice='这里无法通行，请点石路';inputNoticeUntil=now+1800;inputMarker.position.copy(hit);inputMarker.position.y+=.04;inputMarker.material.color.setHex(0xb88564);inputMarker.visible=true;markerUntil=now+700;}
 log('move-command',{screen:[e.clientX,e.clientY],ok:result.ok,reason:result.reason,adjusted:result.adjusted,nodes:result.points.length,planningMs:performance.now()-now,goal:result.goal?.toArray()??null});
}
let pointerHeld=false,lastCanvasPointer=-Infinity;
renderer.domElement.addEventListener('pointerdown',e=>{pointerHeld=true;lastCanvasPointer=performance.now();try{renderer.domElement.setPointerCapture?.(e.pointerId);}catch{}aim(e)});
renderer.domElement.addEventListener('pointermove',e=>{if(pointerHeld){lastCanvasPointer=performance.now();aim(e)}});
for(const type of ['pointerup','pointercancel'])addEventListener(type,()=>{if(pointerHeld){lastCanvasPointer=performance.now();pointerHeld=false;}});
renderer.domElement.addEventListener('click',e=>{if(performance.now()-lastCanvasPointer>500)aim(e)});

addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();requestAttack();}});
const deltaAngle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const motion={maxYawRadPerSec:0};
function turnHero(aim,dt,response=18){const raw=deltaAngle(player.rotation.y,aim)*(1-Math.exp(-dt*response)),step=T.MathUtils.clamp(raw,-14*dt,14*dt);player.rotation.y+=step;if(dt>0)motion.maxYawRadPerSec=Math.max(motion.maxYawRadPerSec,Math.abs(step/dt));}
const perf={simMs:0,visualMs:0,renderMs:0};
let last=performance.now();
function frame(t){
 const wallDt=Math.max(0,(t-last)/1000);last=t;
 if(!ready){requestAnimationFrame(frame);return;}
 if(ready){
  // Preserve real movement/animation time on slower devices, with original <=.05s collision steps.
  const beforeX=player.position.x,beforeZ=player.position.z,simStart=performance.now();
  const held=Math.min(hitPause,wallDt);hitPause-=held;
  const advance=Math.min(.20,Math.max(0,wallDt-held)),substeps=Math.max(1,Math.ceil(advance/.05)),dt=advance/substeps;
  for(let sim=0;sim<substeps;sim++){
  elapsed+=dt;let moving=false;
  impactTimer-=dt;if(impactTimer<=0)$('#impact').classList.remove('on');attackCooldown=Math.max(0,attackCooldown-dt);phoenixCooldown=Math.max(0,phoenixCooldown-dt);
  const floor=nav.safeGround(player.position.x,player.position.z);if(floor!==null){player.position.y=floor;safePos.copy(player.position);}
  while(movePath.length>1&&Math.hypot(player.position.x-movePath[0].x,player.position.z-movePath[0].z)<.008){movePath.shift();target.copy(movePath[0]);}
  const d=target.clone().sub(player.position);d.y=0;
  if(!attackState&&d.length()>(movePath.length>1?.001:.08)){moving=true;const desired=Math.atan2(d.x,d.z);turnHero(desired,dt);
   const stairs=player.position.x<2.7&&player.position.x>1.25&&player.position.z>-7.5&&player.position.z<-6.8;
   const remaining=d.length(),step=Math.min(remaining,dt*(stairs?1.75:4.5));
   const p=player.position.clone().addScaledVector(d.normalize(),step);let h=nav.safeGround(p.x,p.z);
   if(h!==null&&Math.abs(h-player.position.y)<.9){player.position.copy(p);player.position.y=h;}else{moving=false;for(const p2 of [new T.Vector3(p.x,player.position.y,player.position.z),new T.Vector3(player.position.x,player.position.y,p.z)]){const h2=nav.safeGround(p2.x,p2.z);if(h2!==null&&Math.abs(h2-player.position.y)<.9){player.position.copy(p2);player.position.y=h2;moving=true;break;}}}
  }
  let progress=null,pendingHit=false;
  if(attackState){const a=attackState;a.time+=dt;progress=Math.min(1,a.time/a.duration);turnHero(a.aim,dt,22);
   if(!a.hitDone&&progress>=.44){a.time=a.duration*.44;progress=.44;a.hitDone=true;pendingHit=true;attackCooldown=.45;}
   if(progress>=1){attackState=null;$('#strike').classList.remove('active');progress=null;log('swing-recovered');}
  }
  hero.update(dt,{moving,speed:moving?1:0,attackProgress:progress});if(pendingHit)damageEnemy();updateTrail(progress);
  if(enemy.hp>0){enemy.hurt=Math.max(0,enemy.hurt-dt);const d=player.position.clone().sub(enemy.g.position);d.y=0;let len=d.length();
   enemy.g.rotation.y+=deltaAngle(enemy.g.rotation.y,Math.atan2(d.x,d.z))*(1-Math.exp(-dt*6));
   // Retain the original pursuit step/range, bounded to the sample sentry's home.
   if(len>1&&len<3&&enemy.hurt<=0){const p=enemy.g.position.clone().addScaledVector(d.normalize(),dt*1.2),h=nav.safeGround(p.x,p.z);if(h!==null&&p.distanceTo(enemy.home)<.32&&Math.abs(h-enemy.g.position.y)<.9){enemy.g.position.copy(p);enemy.g.position.y=h;}}
   else if(len<1&&enemy.hurt<=0)hp=Math.max(0,hp-dt*8);
   foe.update(dt,{moving:false});
  }else{enemy.dead+=dt;foe.update(dt,{dead:true});if(enemy.dead>1.5)foe.group.visible=false;}
  camera.position.lerp(player.position.clone().add(offset),1-Math.exp(-dt*4));camera.lookAt(camera.position.clone().sub(offset));

  if(Math.hypot(player.position.x+7,player.position.z+7)<3.4&&player.position.z>-5.8&&!flags.nearPine){flags.nearPine=true;log('near-pine');}
  if(player.position.x< -5.6&&player.position.x> -7&&player.position.z< -7.6&&!flags.underBranch){flags.underBranch=true;log('under-branch');}
  if(nav.stairsAt(player.position.x,player.position.z)>.65&&!flags.stairs){flags.stairs=true;log('stairs-top',{height:player.position.y});}
  for(let i=motes.length-1;i>=0;i--){const m=motes[i];m.life-=dt;const a=m.o.geometry.attributes.position;for(let j=0;j<a.count;j++){a.setXYZ(j,a.getX(j)+m.vel[j*3]*dt,a.getY(j)+m.vel[j*3+1]*dt,a.getZ(j)+m.vel[j*3+2]*dt);}a.needsUpdate=true;m.o.material.opacity=Math.max(0,m.life/m.total);if(m.life<=0){scene.remove(m.o);m.o.geometry.dispose();m.o.material.dispose();motes.splice(i,1);}}
  // Present the physical contact pose before advancing any remaining substeps.
  // A slow render frame must never first show damage after the blade has passed.
  if(pendingHit)break;
  }
  perf.simMs=performance.now()-simStart;
  const visualStart=performance.now();
  pine?.update(advance,{player,camera});updateRoof(advance,t);env.update(advance);dressing?.update(advance,{player,moving:Math.hypot(player.position.x-beforeX,player.position.z-beforeZ)>.001});
  $('#objective').textContent=t<inputNoticeUntil?inputNotice:flags.hit?'剑锋已至 · 可再试一招':flags.stairs?'回身，试剑':flags.underBranch?'循门前石坪，登右侧石阶':flags.nearPine?'从横枝下穿过':'循石阶，过古松';
  const gp=guidePoints[Math.min(guideIndex,guidePoints.length-1)];if(Math.hypot(player.position.x-gp[0],player.position.z-gp[1])<.36&&guideIndex<guidePoints.length-1)guideIndex++;const next=guidePoints[guideIndex];guideMark.position.set(next[0],(nav.groundAt(next[0],next[1])??0)+.028,next[1]);guideMark.material.opacity=.26+.10*Math.sin(t*.003);guideMark.visible=!flags.hit;$('#health').style.width=hp+'%';const ndc=enemy.g.position.clone().add(new T.Vector3(0,1.6,0)).project(camera),eh=$('#enemy-hud');eh.hidden=enemy.hp<=0||Math.abs(ndc.x)>1||Math.abs(ndc.y)>1;eh.style.left=Math.max(34,Math.min(innerWidth-34,(ndc.x+1)*innerWidth/2+40))+'px';eh.style.top=Math.max(128,(1-ndc.y)*innerHeight/2-32)+'px';$('#enemy-health').style.width=(enemy.hp/3*100)+'%';

  $('#phoenix small').textContent=phoenixCooldown>0?Math.ceil(phoenixCooldown)+'秒':'觉醒';
  inputMarker.visible=t<markerUntil;if(inputMarker.visible)inputMarker.material.opacity=Math.min(.85,(markerUntil-t)/450);
  perf.visualMs=performance.now()-visualStart;
 }
 const renderStart=performance.now();renderer.render(scene,camera);perf.renderMs=performance.now()-renderStart;
 if(ready){frameData.push({time:performance.timeOrigin+performance.now(),p:player.position.toArray(),a:player.rotation.y,c:camera.position.toArray(),attack:(attackState?attackState.time/attackState.duration:null),enemyHP:enemy.hp,blade:{base:hero.bladeBaseWorld().toArray(),tip:hero.swordTipWorld().toArray()},cpu:{...perf},calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});if(frameData.length>3000)frameData.shift();}
 if(debug){$('#debug').hidden=false;$('#debug').textContent=JSON.stringify(snapshot(),null,1);}
 requestAnimationFrame(frame);
}
function snapshot(){return {version:'H.33 miniature gate art sample',ready,position:player.position.toArray(),rotation:player.rotation.y,camera:camera.position.toArray(),FOV:camera.fov,heroHeight:1.485,cpu:{...perf},kinematics:{...motion},blade:{base:hero.bladeBaseWorld().toArray(),tip:hero.swordTipWorld().toArray()},hero:hero.stats,hitPause,startup:startup?.state,pathNodes:movePath.map(p=>p.toArray()),guideIndex,roofCut:roofUniforms.uCut.value,target:target.toArray(),flags:{...flags},enemy:{p:enemy.g.position.toArray(),hp:enemy.hp},attack:(attackState?attackState.time/attackState.duration:null),stats:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},pine:pine?.lastUpdate??null,events:events.slice(-40)};}
window.__SAMPLE={snapshot,project:(x,y,z)=>{const p=new T.Vector3(x,y,z).project(camera);return [(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2]},frames:()=>frameData.slice(),events:()=>events.slice(),getStep:(x,z)=>nav.stairsAt(x,z),getGround:(x,z)=>nav.groundAt(x,z)};
async function boot(){
 try{
  startup?.stage('正在载入可行走的山门',.35,'navigation');
  const [cache,surface]=await Promise.all([fetch('./assets/sample-lod/navigation.json').then(r=>{if(!r.ok)throw Error('Navigation HTTP '+r.status);return r.json()}),loadGroundSurface()]);nav.installCached(cache);nav.setSurfaceProvider(surface.refine);pathPlanner=createPathPlanner(nav);
  startup?.stage('正在载入场景与光影',.50,'scene');
  const [ter,ga]=await Promise.all([load('./assets/sample-runtime/terrain.glb'),load('./assets/sample-runtime/gate.glb')]);terrain=ter;gate=ga;
  applyTransform(terrain,cache.transforms.terrain_transform);applyTransform(gate,cache.transforms.gate_transform);scene.add(terrain,gate);env.styleTerrain(terrain);env.styleGate(gate);if(params.get('roofFinish')!=='0')finishGateRoof(gate,{shading:params.get('roofPbr')==='1'?'pbr':'light'});prepareRoof(gate);env.setGroundAt(nav.groundAt);roofOcclusion=createRoofOcclusion(gate);await env.ready;
  dressing=createSceneDressing({scene,groundAt:nav.groundAt,grid:nav.grid});for(const l of lamps)l.group.position.y=nav.groundAt(l.x,l.z)??0;
  startup?.stage('正在载入迎客松',.78,'pine');
  pine=createLayeredPine({position:[-7,nav.groundAt(-7,-7),-7],width:6.4,height:5.6,groundAt:nav.groundAt});scene.add(pine.group);await pine.ready;
  ready=true;reset();ready=false;startup?.stage('正在准备第一帧',.92,'first-frame');await yieldPaint();
  if(fxEnabled){trail.visible=true;scene.add(impactWarmup);}
  await renderer.compileAsync(scene,camera);trail.visible=false;scene.remove(impactWarmup);renderer.render(scene,camera);ready=true;last=performance.now();
  startup?.done();document.documentElement.dataset.sampleReady='true';log('ready',{hero:hero.stats,enemy:foe.stats});
 }catch(e){console.error(e);ready=false;startup?.fail('场景未完整载入，请重试',e);log('load-error',{message:e.message});}
}
requestAnimationFrame(frame);boot();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;startup?.fail('画面连接已中断，请重新载入','webglcontextlost');});
}
initialize().catch(error=>{console.error(error);const phase=startup?.state.phase;startup?.fail(phase==='renderer'?'当前窗口无法创建3D画面，请重试或复制地址打开':'画面初始化中断，请重试',error);});
