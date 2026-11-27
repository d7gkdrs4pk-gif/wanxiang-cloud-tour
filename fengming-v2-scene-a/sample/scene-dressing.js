import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {LEDGE_SHAPES} from '../assets/environment-034/rock-shapes.js';
import {getEnvironmentStoneTexture} from './environment.js';

const ROCK_PLACEMENTS=[
 {key:'west',x:-5.2,z:3.4,yaw:-.18,tint:.84,role:'near left frame, outside original z limit'},
 {key:'east',x:3.55,z:3.8,yaw:.35,tint:.82,role:'near right frame, outside original z limit'}
];

function makeBedrockEdging(groundAt,stoneTexture){
 const positions=[],normals=[],uv=[],colors=[],contactP=[],contactC=[],contactI=[];
 const sun=new T.Vector3(-8,16,12).normalize(),cast=new T.Vector2(8,-12).normalize();
 const p=new T.Vector3(),n=new T.Vector3(),v=new T.Vector3(),up=new T.Vector3(0,1,0),bounds=[];
 const shadowColor=new T.Color(0x14202c);
 const h=(x,z,fallback=0)=>{const a=groundAt(x,z);return Number.isFinite(a)?a:fallback;};
 for(const place of ROCK_PLACEMENTS){
  const shape=LEDGE_SHAPES[place.key],y=h(place.x,place.z),step=.6;
  const gx=(h(place.x+step,place.z,y)-h(place.x-step,place.z,y))/(step*2);
  const gz=(h(place.x,place.z+step,y)-h(place.x,place.z-step,y))/(step*2);
  const slope=new T.Vector3(-gx,1,-gz).normalize();
  const rotation=new T.Quaternion().setFromUnitVectors(up,slope)
    .multiply(new T.Quaternion().setFromAxisAngle(up,place.yaw));
  const origin=new T.Vector3(place.x,y-.25,place.z),box=new T.Box3();
  for(let tri=0;tri<shape.index.length;tri+=3){
   // Each sculpted face uses one coherent projection of the existing rock cell.
   // The narrow real bevels keep their own normals and shade continuously.
   const average=new T.Vector3();
   for(let k=0;k<3;k++){const i=shape.index[tri+k]*3;average.add(v.fromArray(shape.normal,i));}
   average.applyQuaternion(rotation).normalize();
   const a=[Math.abs(average.x),Math.abs(average.y),Math.abs(average.z)];
   const axis=a[1]>=a[0]&&a[1]>=a[2]?'y':a[0]>=a[2]?'x':'z';
   for(let k=0;k<3;k++){
    const i=shape.index[tri+k]*3,localY=shape.position[i+1];
    p.fromArray(shape.position,i).applyQuaternion(rotation).add(origin);box.expandByPoint(p);
    n.fromArray(shape.normal,i).applyQuaternion(rotation).normalize();
    positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);
    const tx=axis==='x'?(p.z+12)/20:(p.x+12)/20;
    const ty=axis==='y'?(p.z+12)/20:(p.y+18)/24;
    uv.push(.502+.496*T.MathUtils.euclideanModulo(tx,1),.004+.992*T.MathUtils.euclideanModulo(ty,1));
    const facing=Math.max(0,n.dot(sun)),height=T.MathUtils.clamp((localY+.14)/(shape.height+.14),0,1);
    const ao=.73+.27*T.MathUtils.smoothstep(height,.06,.46),moss=Math.max(0,n.y-.6)*.18;
    const shade=[.46+(.74*facing),.58+(.60*facing),.70+(.42*facing)];
    colors.push(shade[0]*1.08*place.tint*ao*(1-moss*.30),shade[1]*1.025*place.tint*ao*(1-moss*.12),shade[2]*.945*place.tint*ao*(1-moss*.30));
   }
  }
  bounds.push({key:place.key,role:place.role,min:box.min.toArray(),max:box.max.toArray(),height:box.max.y-box.min.y});
  // Only a narrow, ground-conformed feather beside the buried footprint is
  // visible. There is no oval black plane or broad dark decal under the scene.
  const outline=shape.outline,base=contactP.length/3;
  for(let i=0;i<outline.length;i++){
   const [x,z]=outline[i];p.set(x,0,z).applyQuaternion(rotation).add(origin);
   const dx=p.x-place.x,dz=p.z-place.z,len=Math.max(.001,Math.hypot(dx,dz));
   const away=Math.max(0,(dx/len)*cast.x+(dz/len)*cast.y),width=.12+.20*away;
   for(let ring=0;ring<2;ring++){
    const xx=p.x+(dx/len)*width*ring,zz=p.z+(dz/len)*width*ring;
    contactP.push(xx,h(xx,zz,y)+.022,zz);
    contactC.push(shadowColor.r,shadowColor.g,shadowColor.b,ring?0:.09+.09*away);
   }
   const j=base+i*2,next=base+((i+1)%outline.length)*2;
   contactI.push(j,next,j+1,j+1,next,next+1);
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeBoundingSphere();
 const rockMaterial=new T.MeshBasicMaterial({map:stoneTexture,color:0xffffff,vertexColors:true,fog:true,toneMapped:true});
 rockMaterial.onBeforeCompile=s=>{
  s.uniforms.uH34RockAtlas={value:stoneTexture};
  s.vertexShader='varying vec3 vH34RockPoint;varying vec3 vH34RockNormal;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvH34RockPoint=(modelMatrix*vec4(transformed,1.)).xyz;vH34RockNormal=normalize(mat3(modelMatrix)*normal);');
  s.fragmentShader=`uniform sampler2D uH34RockAtlas;varying vec3 vH34RockPoint;varying vec3 vH34RockNormal;
   vec3 h34RockCell(vec2 p){vec2 t=fract(p);return texture2D(uH34RockAtlas,vec2(.502+.496*t.x,.004+.992*t.y)).rgb;}
  `+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`
   vec3 a=abs(normalize(vH34RockNormal)),a2=a*a,w=a2*a2*a;w/=max(.001,w.x+w.y+w.z);
   vec3 paint=vec3(0.);
   if(w.x>.012)paint+=h34RockCell((vH34RockPoint.zy+vec2(12.,18.))/vec2(20.,24.))*w.x;
   if(w.y>.012)paint+=h34RockCell((vH34RockPoint.xz+vec2(12.))/20.)*w.y;
   if(w.z>.012)paint+=h34RockCell((vH34RockPoint.xy+vec2(12.,18.))/vec2(20.,24.))*w.z;
   diffuseColor.rgb*=paint;
  `);
 };
 rockMaterial.customProgramCacheKey=()=> 'h34-hand-cut-bedrock-triplanar-v1';
 const rocks=new T.Mesh(g,rockMaterial);
 rocks.name='H34 two fitted hand-cut bedrock ledges';rocks.raycast=()=>{};
 const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(contactP,3));sg.setAttribute('color',new T.Float32BufferAttribute(contactC,4));sg.setIndex(contactI);sg.computeBoundingSphere();
 const contact=new T.Mesh(sg,new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,toneMapped:false,fog:true}));
 contact.name='H34 narrow ground-conformed rock contact feathers';contact.renderOrder=1;contact.raycast=()=>{};
 return {rocks,contact,bounds,triangles:positions.length/9,contactTriangles:contactI.length/3};
}

// Authored planting and stonework frame the playable courtyard. All roots are
// queried against the original heightfield; none changes navigation or camera.
export function createSceneDressing({scene,groundAt,grid,stoneTexture=getEnvironmentStoneTexture()}) {
 const group=new T.Group();group.name='H34 fitted bedrock and courtyard planting';scene.add(group);
 const walkHeight=groundAt;
 groundAt=(x,z)=>{const h=walkHeight(x,z);if(h!==null||!grid)return h;const ix=Math.round((x+20)/grid.S),iz=Math.round((z+20)/grid.S);if(ix<0||iz<0||ix>=grid.N||iz>=grid.N)return null;const raw=grid.H[iz*grid.N+ix];return Number.isFinite(raw)?raw:null;};
 let seed=317;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const P=[],C=[],B=[],I=[],light=new T.Vector3(-8,16,12).normalize();
 function blade(x,y,z,a,len,width,bend,color){
  const base=P.length/3,dir=new T.Vector3(Math.sin(a),0,Math.cos(a)),side=new T.Vector3(Math.cos(a),0,-Math.sin(a));
  for(let j=0;j<=7;j++){
   const t=j/7,reach=bend*t*t,rise=len*Math.sin(t*1.48),w=width*Math.sin(Math.PI*Math.pow(t,.7));
   const mid=new T.Vector3(x,y+rise,z).addScaledVector(dir,reach);
   for(let k=-1;k<=1;k++){
    const p=mid.clone().addScaledVector(side,k*w);p.y+=k===0?width*.20*Math.sin(t*Math.PI):0;
    P.push(p.x,p.y,p.z);B.push(rise);
    const c=new T.Color(color).multiplyScalar((k===0?1.12:.84)+t*.12);C.push(c.r,c.g,c.b);
   }
   if(j<7){const q=base+j*3;I.push(q,q+3,q+1,q+1,q+3,q+4,q+1,q+4,q+2,q+2,q+4,q+5);}
  }
 }
 function fern(x,y,z,angle,len){
  const dir=new T.Vector3(Math.sin(angle),0,Math.cos(angle)),side=new T.Vector3(Math.cos(angle),0,-Math.sin(angle));
  const at=t=>new T.Vector3(x,y+len*Math.sin(t*1.43),z).addScaledVector(dir,len*.49*t*t);
  const stemColor=new T.Color(0x5b7051),leafColor=new T.Color(0x425e45);
  for(let j=0;j<8;j++){
   const a=at(j/8),b=at((j+1)/8),base=P.length/3;
   for(const [p,k]of[[a,-1],[a,1],[b,-1],[b,1]]){const v=p.clone().addScaledVector(side,k*.005);P.push(v.x,v.y,v.z);B.push(v.y-y);C.push(stemColor.r,stemColor.g,stemColor.b);}
   I.push(base,base+2,base+1,base+1,base+2,base+3);
  }
  for(let j=1;j<=7;j++)for(const sign of[-1,1]){
   const t=j/8,basePoint=at(t),reach=len*.23*Math.sin(Math.PI*Math.pow(t,.78));
   const tip=basePoint.clone().addScaledVector(side,sign*reach).addScaledVector(dir,reach*.31);tip.y+=reach*.14;
   const base=P.length/3;
   for(let k=0;k<3;k++){
    const s=k/2,mid=basePoint.clone().lerp(tip,s),w=len*.027*Math.sin(s*Math.PI);
    for(const edge of[-1,1]){const v=mid.clone().addScaledVector(dir,edge*w);P.push(v.x,v.y,v.z);B.push(v.y-y);const c=leafColor.clone().multiplyScalar(.93+s*.16);C.push(c.r,c.g,c.b);}
   }
   I.push(base,base+2,base+1,base+1,base+2,base+3,base+2,base+4,base+3,base+3,base+4,base+5);
  }
 }
 // Remove the three strongest foreground fans. Remaining grass is narrow and
 // bowed; only two shaded clumps use actual paired fern leaflets.
 const clumps=[[-6.8,2.3,.58],[-5.6,1.75,.57],[-6.8,-1.2,.52],[-7.5,-2.4,.64],[3.8,2.05,.66],[4.4,-1.0,.61],[4.6,-2.7,.56],[-8.2,-6.7,.52],[-7.6,-5.9,.38],[-8.1,-8.5,.55],[3.9,-8.3,.45]];
 for(const [x,z,size] of clumps){
  const y=groundAt(x,z);if(y===null)continue;
  if((x===4.4&&z===-1)||x===-8.2){for(let i=0;i<2;i++)fern(x+(rand()-.5)*.16,y+.016,z+(rand()-.5)*.16,rand()*Math.PI*2,size*(.8+rand()*.2));}
  else for(let i=0;i<6;i++)blade(x+(rand()-.5)*.30,y+.014,z+(rand()-.5)*.27,rand()*Math.PI*2,size*(.68+rand()*.38),size*(.020+rand()*.014),size*(.26+rand()*.38),[0x344f39,0x465f3d,0x566f43][i%3]);
 }
 const leafGeo=new T.BufferGeometry();leafGeo.setAttribute('position',new T.Float32BufferAttribute(P,3));leafGeo.setAttribute('color',new T.Float32BufferAttribute(C,3));leafGeo.setAttribute('aBend',new T.Float32BufferAttribute(B,1));leafGeo.setIndex(I);leafGeo.computeVertexNormals();
 const clock={value:0},leafMat=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,fog:true});
 leafMat.onBeforeCompile=s=>{s.uniforms.uPlantTime=clock;s.vertexShader='attribute float aBend;uniform float uPlantTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat sway=sin(uPlantTime*1.25+position.x*.62+position.z*.8)*aBend*.026;transformed.x+=sway;transformed.z+=sway*.48;');};
 const leaves=new T.Mesh(leafGeo,leafMat);leaves.name='Authored curved fern leaves';leaves.raycast=()=>{};group.add(leaves);
 const bedrock=makeBedrockEdging(groundAt,stoneTexture);group.add(bedrock.rocks,bedrock.contact);
 // A small, non-luminous footfall response gives motion a local ground cue.
 const count=10,dustPos=new Float32Array(count*3),life=new Float32Array(count);dustPos.fill(-1000);
 const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.BufferAttribute(dustPos,3));
 const dust=new T.Points(dustGeo,new T.PointsMaterial({color:0xc6bda0,size:.07,transparent:true,opacity:.19,depthWrite:false,fog:true}));dust.frustumCulled=false;dust.raycast=()=>{};group.add(dust);
 let time=0,footTimer=0,slot=0;
 function update(dt,{player,moving=false}={}){time+=dt;clock.value=time;footTimer-=dt;
  if(player&&moving&&footTimer<=0){footTimer=.24;const p=player.position,dx=Math.cos(player.rotation.y)*.12*(slot%2?1:-1),dz=-Math.sin(player.rotation.y)*.12*(slot%2?1:-1);slot=(slot+1)%count;dustPos[slot*3]=p.x+dx;dustPos[slot*3+1]=p.y+.035;dustPos[slot*3+2]=p.z+dz;life[slot]=.27;}
  for(let i=0;i<count;i++)if(life[i]>0){life[i]-=dt;dustPos[i*3+1]+=dt*.08;if(life[i]<=0)dustPos[i*3+1]=-1000;}dustGeo.attributes.position.needsUpdate=true;
 }
 return {group,update,stats:{leafTriangles:I.length/3,plantClumps:clumps.length,rockGroups:ROCK_PLACEMENTS.length,rockTriangles:bedrock.triangles,contactTriangles:bedrock.contactTriangles,rockFootprints:bedrock.bounds,draws:4}};
}

export function createStoneLantern(){
 const group=new T.Group(),parts=[],yaw=.38;
 const box=(x,y,z,w,h,d)=>{const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);parts.push(g);};
 box(0,.055,0,.46,.11,.44);box(0,.145,0,.34,.07,.33);
 const column=new T.CylinderGeometry(.095,.135,.59,8);column.translate(0,.475,0);parts.push(column);
 box(0,.795,0,.31,.065,.29);box(0,.85,0,.285,.045,.265);
 for(const x of[-.125,.125])for(const z of[-.115,.115])box(x,1.045,z,.035,.35,.035);
 // Back stone and narrow lintels make a real recessed opening; the warm front
 // is on the near face, so it remains visible below the small hipped stone cap.
 box(0,1.045,-.125,.25,.30,.025);box(0,1.235,0,.30,.035,.275);
 const roofP=[],roofI=[],rings=[[.20,.14,1.25],[.145,.102,1.315],[.055,.040,1.385]];
 for(const [w,d,y]of rings)roofP.push(-w,y,-d,w,y,-d,w,y,d,-w,y,d);
 for(let r=0;r<2;r++)for(let i=0;i<4;i++){const a=r*4+i,b=r*4+(i+1)%4,c=(r+1)*4+i,d=(r+1)*4+(i+1)%4;roofI.push(a,c,b,b,c,d);}
 roofI.push(8,11,9,9,11,10,0,1,3,1,2,3);
 const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute(roofP,3));roof.setIndex(roofI);roof.computeVertexNormals();parts.push(roof);
 box(0,1.405,0,.085,.05,.075);
 const flatParts=parts.map(g=>{const f=g.index?g.toNonIndexed():g.clone();g.dispose();f.deleteAttribute('uv');f.rotateY(yaw);return f;});
 const geometry=mergeGeometries(flatParts);flatParts.forEach(g=>g.dispose());
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=[],colors=[],sun=new T.Vector3(-8,16,12).normalize(),v=new T.Vector3();
 for(let i=0;i<p.count;i++){
  v.fromBufferAttribute(n,i).normalize();const t=Math.max(0,v.dot(sun)),ao=.86+.14*T.MathUtils.smoothstep(p.getY(i),0,.22);
  colors.push((.46+.74*t)*1.08*ao,(.58+.60*t)*1.025*ao,(.70+.42*t)*.945*ao);
  const a=[Math.abs(v.x),Math.abs(v.y),Math.abs(v.z)],x=a[0]>a[2]&&a[0]>a[1]?p.getZ(i):p.getX(i),y=a[1]>=a[0]&&a[1]>=a[2]?p.getZ(i):p.getY(i);
  uv.push(.502+.496*T.MathUtils.euclideanModulo((x+12)/20,1),.004+.992*T.MathUtils.euclideanModulo((y+18)/24,1));
 }
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const stone=new T.Mesh(geometry,new T.MeshBasicMaterial({map:getEnvironmentStoneTexture(),vertexColors:true,fog:true}));group.add(stone);
 const core=new T.Mesh(new T.BoxGeometry(.145,.25,.035),new T.MeshBasicMaterial({color:0xeac78c,toneMapped:false}));core.position.set(Math.sin(yaw)*.105,1.035,Math.cos(yaw)*.105);core.rotation.y=yaw;group.add(core);
 const light=new T.PointLight(0xffd49c,.85,2.8,2);light.position.y=1.04;group.add(light);
 group.name='H34 stone lantern with visible warm recessed window';group.userData.triangles=geometry.attributes.position.count/3+12;
 return {group,light};
}
