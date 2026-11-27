import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Authored planting and stonework frame the playable courtyard. All roots are
// queried against the original heightfield; none changes navigation or camera.
export function createSceneDressing({scene,groundAt,grid}) {
 const group=new T.Group();group.name='H31 courtyard planting';scene.add(group);
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
 const clumps=[[-4.3,4.2,1.18],[-3.5,4.6,.85],[-5.6,2.1,.85],[-5.9,1.6,.65],[-6.8,-1.2,.57],[-7.5,-2.4,.75],[3.8,2.2,1.0],[4.3,1.1,.8],[4.4,-1.0,.85],[4.6,-2.7,.65],[-8.2,-6.7,.52],[-7.6,-5.9,.40],[-8.1,-8.5,.63],[3.9,-8.3,.5]];
 for(const [x,z,size] of clumps){const y=groundAt(x,z);if(y===null)continue;for(let i=0;i<9;i++)blade(x+(rand()-.5)*.45,y+.014,z+(rand()-.5)*.4,rand()*Math.PI*2,size*(.65+rand()*.5),size*(.085+rand()*.065),size*(.2+rand()*.5),[0x344f39,0x465f3d,0x566f43][i%3]);}
 const leafGeo=new T.BufferGeometry();leafGeo.setAttribute('position',new T.Float32BufferAttribute(P,3));leafGeo.setAttribute('color',new T.Float32BufferAttribute(C,3));leafGeo.setAttribute('aBend',new T.Float32BufferAttribute(B,1));leafGeo.setIndex(I);leafGeo.computeVertexNormals();
 const clock={value:0},leafMat=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,fog:true});
 leafMat.onBeforeCompile=s=>{s.uniforms.uPlantTime=clock;s.vertexShader='attribute float aBend;uniform float uPlantTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat sway=sin(uPlantTime*1.25+position.x*.62+position.z*.8)*aBend*.026;transformed.x+=sway;transformed.z+=sway*.48;');};
 const leaves=new T.Mesh(leafGeo,leafMat);leaves.name='Authored curved fern leaves';leaves.raycast=()=>{};group.add(leaves);
 const rocks=[];
 const rockPositions=[[-4.5,4.0,.72],[-3.8,4.7,.42],[-6.2,1.5,.52],[3.8,1.7,.65],[4.4,-1.5,.55],[-7.5,-6.95,.41],[-6.95,-6.55,.32],[-7.1,-7.35,.30],[-8.0,-6.4,.34],[-7.9,-8.5,.34]];
 for(const [x,z,size]of rockPositions){const y=groundAt(x,z);if(y===null)continue;const g=new T.SphereGeometry(1,12,7),a=g.attributes.position,colors=[];
  for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i),n=v.clone().normalize();const q=1+Math.sin(v.x*8+v.y*5+v.z*4)*.065;v.multiplyScalar(q);v.x*=size;v.y*=size*.72;v.z*=size*.73;a.setXYZ(i,v.x+x,v.y+y+size*.14,v.z+z);const c=new T.Color(0x7b8975).multiplyScalar(.96+v.y*.04);if(n.y>.4)c.lerp(new T.Color(0x647c52),.16);colors.push(c.r,c.g,c.b);}
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.deleteAttribute('uv');rocks.push(g);
 }
 if(rocks.length){const g=mergeGeometries(rocks);rocks.forEach(q=>q.dispose());const mesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}));mesh.name='Grounded rounded courtyard stones';mesh.raycast=()=>{};group.add(mesh);}
 // A small, non-luminous footfall response gives motion a local ground cue.
 const count=10,dustPos=new Float32Array(count*3),life=new Float32Array(count);dustPos.fill(-1000);
 const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.BufferAttribute(dustPos,3));
 const dust=new T.Points(dustGeo,new T.PointsMaterial({color:0xc6bda0,size:.07,transparent:true,opacity:.19,depthWrite:false,fog:true}));dust.frustumCulled=false;dust.raycast=()=>{};group.add(dust);
 let time=0,footTimer=0,slot=0;
 function update(dt,{player,moving=false}={}){time+=dt;clock.value=time;footTimer-=dt;
  if(player&&moving&&footTimer<=0){footTimer=.24;const p=player.position,dx=Math.cos(player.rotation.y)*.12*(slot%2?1:-1),dz=-Math.sin(player.rotation.y)*.12*(slot%2?1:-1);slot=(slot+1)%count;dustPos[slot*3]=p.x+dx;dustPos[slot*3+1]=p.y+.035;dustPos[slot*3+2]=p.z+dz;life[slot]=.27;}
  for(let i=0;i<count;i++)if(life[i]>0){life[i]-=dt;dustPos[i*3+1]+=dt*.08;if(life[i]<=0)dustPos[i*3+1]=-1000;}dustGeo.attributes.position.needsUpdate=true;
 }
 return {group,update,stats:{leafTriangles:I.length/3,plantClumps:clumps.length,rockGroups:rocks.length,draws:3}};
}

export function createStoneLantern(){
 const group=new T.Group(),parts=[];
 const lathe=pts=>{const g=new T.LatheGeometry(pts.map(p=>new T.Vector2(...p)),8);g.rotateY(Math.PI/8);g.deleteAttribute('uv');parts.push(g);};
 lathe([[.30,0],[.30,.08],[.22,.13],[.16,.15],[.12,.55],[.23,.61],[.23,.66]]);
 for(const x of [-.16,.16])for(const z of [-.16,.16]){const g=new T.CylinderGeometry(.035,.044,.38,6);g.translate(x,.84,z);g.deleteAttribute('uv');parts.push(g);}
 const stone=new T.Mesh(mergeGeometries(parts),new T.MeshStandardMaterial({color:0x6d7d72,roughness:1}));parts.forEach(g=>g.dispose());group.add(stone);
 const capGeo=new T.LatheGeometry([[.33,1.02],[.37,1.06],[.34,1.10],[.20,1.17],[.08,1.25],[0,1.29]].map(p=>new T.Vector2(...p)),8);capGeo.rotateY(Math.PI/8);
 group.add(new T.Mesh(capGeo,new T.MeshStandardMaterial({color:0x405950,roughness:1})));
 const core=new T.Mesh(new T.SphereGeometry(.105,10,7),new T.MeshBasicMaterial({color:0xf5d495,toneMapped:false}));core.position.y=.82;group.add(core);
 const light=new T.PointLight(0xffd49c,1.3,3.6,2);light.position.y=.83;group.add(light);group.name='Eight-sided stone lantern';return {group,light};
}
