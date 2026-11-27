// Original H29 height-grid, flood fill, corridor interpolation and bridges.
// Sample adds only a local height patch for the four real gate-side steps.
import * as T from 'three';
export function createNavigation({scene,stone}){
const s=scene;
function box(x,y,z,w,h,d,m,p=s){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);p.add(o);return o;}
const tiles=[];const corridors=[];let groundModel=null;const groundRay=new T.Raycaster();const N=81,S=.5,H=new Float32Array(N*N),R=new Uint8Array(N*N);let ready=false;
function buildNav(model){H.fill(NaN);R.fill(0);const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();model.updateMatrixWorld(true);model.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,I=o.geometry.index,n=I?I.count:p.count;for(let i=0;i+2<n;i+=3){a.fromBufferAttribute(p,I?I.getX(i):i).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(p,I?I.getX(i+1):i+1).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(p,I?I.getX(i+2):i+2).applyMatrix4(o.matrixWorld);const d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(d)<1e-8)continue;for(let z=Math.max(0,Math.ceil((Math.min(a.z,b.z,c.z)+20)/S));z<=Math.min(N-1,Math.floor((Math.max(a.z,b.z,c.z)+20)/S));z++)for(let x=Math.max(0,Math.ceil((Math.min(a.x,b.x,c.x)+20)/S));x<=Math.min(N-1,Math.floor((Math.max(a.x,b.x,c.x)+20)/S));x++){const X=x*S-20,Z=z*S-20,u=((b.z-c.z)*(X-c.x)+(c.x-b.x)*(Z-c.z))/d,v=((c.z-a.z)*(X-c.x)+(a.x-c.x)*(Z-c.z))/d;if(u<-.0001||v<-.0001||u+v>1.0001)continue;const y=u*a.y+v*b.y+(1-u-v)*c.y,k=z*N+x;if(!Number.isFinite(H[k])||y>H[k])H[k]=y}}});const center=40*N+40,base=H[center];if(!Number.isFinite(base))return false;const q=[center];R[center]=1;for(let i=0;i<q.length;i++){const k=q[i],x=k%N,z=Math.floor(k/N);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Z=z+dz,j=Z*N+X;if(X<1||X>=N-1||Z<1||Z>=N-1||R[j]||!Number.isFinite(H[j])||Math.abs(H[j]-base)>.8||Math.abs(H[j]-H[k])>.45)continue;R[j]=1;q.push(j)}}return ready=q.length>20}
function baseGroundAt(x,z){const terrain=terrainHeight(x,z);for(const q of corridors){const dx=x-q.ax,dz=z-q.az,t=(dx*q.ux+dz*q.uz)/q.len,side=dx*q.uz-dz*q.ux;if(t>=0&&t<=1&&Math.abs(side)<=1.65){const deck=q.ay+(q.by-q.ay)*t;const blend=Math.min(1,t*q.len/3,(1-t)*q.len/3);return terrain!==null?terrain+(deck-terrain)*blend:deck}}return terrain}function terrainHeight(x,z){if(!ready)return Math.hypot(x,z)<8?0:null;const tile=tiles.find(q=>Math.abs(x-q.x)<=20&&Math.abs(z-q.z)<=20);if(!tile)return null;const X=Math.round((x-tile.x+20)/S),Z=Math.round((z-tile.z+20)/S),k=Z*N+X;if(X<1||X>=N-1||Z<1||Z>=N-1||!R[k])return null;for(const j of [k-1,k+1,k-N,k+N])if(!R[j])return null;return H[k]}function safeGround(x,z){if(Math.hypot(x+7,z+7)<.72)return null;if(x< -10.5||x>5.5||z< -9.1||z>1.5)return null;if(x> -2.45&&x<2.45&&z< -3.65&&z> -12&&stairsAt(x,z)===null&&!(x>=2.30&&z>=-7.40&&z<=-6.90))return null;return groundAt(x,z)} function anchor(dx,dz){let best=null;for(let z=2;z<N-2;z++)for(let x=2;x<N-2;x++){const k=z*N+x;if(!R[k]||!R[k-1]||!R[k+1]||!R[k-N]||!R[k+N])continue;const X=x*S-20,Z=z*S-20,side=Math.abs(X*dz-Z*dx);if(side>2)continue;const score=X*dx+Z*dz-side*2;if(!best||score>best.score)best={x:X,z:Z,y:H[k],score}}return best}
function connect(a,b,dx,dz){const A=anchor(dx,dz),B=anchor(-dx,-dz);if(!A||!B)return false;const ax=a.x+A.x-dx*4,az=a.z+A.z-dz*4,bx=b.x+B.x+dx*4,bz=b.z+B.z+dz*4,len=Math.hypot(bx-ax,bz-az);if(len<1)return false;const ux=(bx-ax)/len,uz=(bz-az)/len;const ay=terrainHeight(ax,az)??A.y,by=terrainHeight(bx,bz)??B.y;corridors.push({ax,az,ay,by,ux,uz,len});const mid=new T.Vector3((ax+bx)/2,(ay+by)/2-.16,(az+bz)/2);const bridge=new T.Group();bridge.name='offscreen original corridor';bridge.visible=false;s.add(bridge);bridge.position.copy(mid);bridge.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(bx-ax,by-ay,bz-az).normalize());const L=Math.hypot(len,by-ay);box(0,0,0,4,.32,L,stone,bridge);for(let i=2;i<=Math.ceil(L)-2;i++){const z=-L/2+L*i/Math.ceil(L);for(const x of [-1.9,1.9])box(x,.43,z,.18,.85,.18,stone,bridge)}for(const x of [-1.9,1.9])box(x,.86,0,.19,.18,Math.max(1,L-4),stone,bridge);return true}

let gateProxy=null,stepRows=[],pinePatch=null;
const fineRay=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
function stairsAt(x,z){
 if(!stepRows.length||x<1.35||x>2.45||z< -7.40||z> -6.90)return null;
 const ix=Math.max(0,Math.min(stepRows[0].length-1,Math.round((x-1.35)/.025)));
 const iz=Math.max(0,Math.min(stepRows.length-1,Math.round((z+7.4)/.025)));
 const h=stepRows[iz][ix];return Number.isFinite(h)?h:null;
}
function pineFloorAt(x,z){
 if(!pinePatch)return null;const q=pinePatch,X=(x-q.origin[0])/q.step,Z=(z-q.origin[1])/q.step;if(X<0||Z<0||X>q.cols-1||Z>q.rows-1)return null;
 const ix=Math.min(q.cols-2,Math.floor(X)),iz=Math.min(q.rows-2,Math.floor(Z)),tx=X-ix,tz=Z-iz,at=(a,b)=>Array.isArray(q.H[0])?q.H[b][a]:q.H[b*q.cols+a];
 const hs=[at(ix,iz),at(ix+1,iz),at(ix,iz+1),at(ix+1,iz+1)];if(hs.every(h=>h!==null&&Number.isFinite(h)))return T.MathUtils.lerp(T.MathUtils.lerp(hs[0],hs[1],tx),T.MathUtils.lerp(hs[2],hs[3],tx),tz);
 const h=at(Math.round(X),Math.round(Z));return h!==null&&Number.isFinite(h)?h:null;
}
function groundAt(x,z){const step=stairsAt(x,z);if(step!==null)return step;const fine=pineFloorAt(x,z);return fine===null?baseGroundAt(x,z):fine;}
function normalizeTerrain(model){
 model.updateMatrixWorld(true);const b=new T.Box3().setFromObject(model),size=b.getSize(new T.Vector3()),ctr=b.getCenter(new T.Vector3());
 const k=40/Math.max(size.x,size.z);model.scale.setScalar(k);model.position.set(-ctr.x*k,-b.max.y*k,-ctr.z*k);model.updateMatrixWorld(true);
 const ray=new T.Raycaster(new T.Vector3(0,30,0),new T.Vector3(0,-1,0));const hit=ray.intersectObject(model,true)[0];if(hit)model.position.y-=hit.point.y-.12;model.updateMatrixWorld(true);return model;
}
function installTerrain(model,{render=true}={}){
 groundModel=model;if(!buildNav(model))throw Error('H29 ground navigation failed');
 for(let ix=-1;ix<=1;ix++)for(let iz=-1;iz<=1;iz++)tiles.push({model:ix===0&&iz===0?model:null,x:ix*40,z:iz*40});
 if(render)s.add(model);
 for(const a of tiles)for(const [dx,dz] of [[1,0],[0,1]]){const b=tiles.find(t=>t.x===a.x+dx*40&&t.z===a.z+dz*40);if(b)connect(a,b,dx,dz)}
 return {regions:tiles.length,bridges:corridors.length};
}
function installGateSteps(model){
 // Collision proxy contains only upward LOW real stone geometry, never roofs.
 model.updateMatrixWorld(true);const v=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=new T.Vector3();
 model.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,I=o.geometry.index,count=I?I.count:p.count;
 for(let i=0;i<count;i+=3){a.fromBufferAttribute(p,I?I.getX(i):i).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(p,I?I.getX(i+1):i+1).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(p,I?I.getX(i+2):i+2).applyMatrix4(o.matrixWorld);
 if(Math.max(a.y,b.y,c.y)>1.05||Math.min(a.y,b.y,c.y)<.13)continue;n.subVectors(b,a).cross(c.clone().sub(a)).normalize();if(n.y<.05)continue;
 if(Math.max(a.x,b.x,c.x)<-3.5||Math.min(a.x,b.x,c.x)>2.5||Math.max(a.z,b.z,c.z)<-7.6||Math.min(a.z,b.z,c.z)>-3.8)continue;v.push(...a.toArray(),...b.toArray(),...c.toArray());}});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();gateProxy=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));gateProxy.updateMatrixWorld(true);
 const rows=21,cols=45;for(let iz=0;iz<rows;iz++){const row=[];for(let ix=0;ix<cols;ix++){const x=1.35+ix*.025,z=-7.4+iz*.025;fineRay.ray.origin.set(x,2,z);const hit=fineRay.intersectObject(gateProxy)[0];row.push(hit?.point.y??NaN)}stepRows.push(row)}
 // Fill only tiny triangle/bevel holes from neighboring genuine treads.
 for(let pass=0;pass<3;pass++){const copy=stepRows.map(r=>r.slice());for(let z=0;z<rows;z++)for(let x=0;x<cols;x++)if(!Number.isFinite(stepRows[z][x])){const q=[];for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){const h=stepRows[z+dz]?.[x+dx];if(Number.isFinite(h))q.push(h)}if(q.length)copy[z][x]=Math.max(...q)}stepRows=copy}
 return {proxyTriangles:v.length/9,steps:[2.25,2.05,1.85,1.70,1.45].map(x=>({x,z:-7,y:stairsAt(x,-7)}))};
}
function pick(ray){
 if(gateProxy){const hit=ray.intersectObject(gateProxy).find(h=>h.point.x>=1.35&&h.point.x<=2.45&&h.point.z>=-7.4&&h.point.z<=-6.9);if(hit)return hit.point.clone();}
 const p=new T.Vector3();let y=.12;for(let i=0;i<3;i++){if(!ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-y),p))return null;const h=groundAt(p.x,p.z);if(h===null)break;y=h;}return p;
}

function installCached(data){
 pinePatch=data.pinePatch??null;H.set(data.H.map(h=>h===null?NaN:h));R.set(data.R);ready=true;stepRows=data.steps.map(r=>r.map(h=>h===null?NaN:h));
 for(let ix=-1;ix<=1;ix++)for(let iz=-1;iz<=1;iz++)tiles.push({model:null,x:ix*40,z:iz*40});
 for(const a of tiles)for(const [dx,dz] of [[1,0],[0,1]]){const b=tiles.find(t=>t.x===a.x+dx*40&&t.z===a.z+dz*40);if(b)connect(a,b,dx,dz)}
 const v=[],I=[];for(let z=0;z<21;z++)for(let x=0;x<45;x++)v.push(1.35+x*.025,Number.isFinite(stepRows[z][x])?stepRows[z][x]:0,-7.4+z*.025);
 for(let z=0;z<20;z++)for(let x=0;x<44;x++){if([stepRows[z][x],stepRows[z][x+1],stepRows[z+1][x],stepRows[z+1][x+1]].every(Number.isFinite)){const a=z*45+x;I.push(a,a+45,a+1,a+1,a+45,a+46)}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setIndex(I);geo.computeVertexNormals();gateProxy=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));gateProxy.updateMatrixWorld(true);
 return {regions:tiles.length,bridges:corridors.length,steps:[2.25,2.05,1.85,1.70,1.45].map(x=>({x,z:-7,y:stairsAt(x,-7)}))};
}
return {tiles,corridors,groundAt,safeGround,terrainHeight,baseGroundAt,stairsAt,pineFloorAt,normalizeTerrain,installTerrain,installCached,installGateSteps,pick,get ready(){return ready},get gateProxy(){return gateProxy},get grid(){return {H,R,N,S}}};
}
