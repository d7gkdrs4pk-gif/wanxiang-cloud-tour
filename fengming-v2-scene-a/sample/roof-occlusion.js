/**
 * Exact static-mesh occlusion query for the real gate, accelerated by local BVHs.
 * Call after the gate's final world transform. Recreate after changing geometry,
 * morph poses, material groups/draw ranges, or object transforms. No GPU work.
 *
 * const roof = createRoofOcclusion(gate);
 * roof.occludes(camera.position, headWorld, player.position.y + .9);
 *
 * Equivalent to a default-layer Three Raycaster over visible gate descendants, near=0,
 * far=distance-.1, followed by hits.some(h => h.point.y > minY). Boxes only
 * reject candidates; every positive result requires an exact triangle hit.
 */
import * as T from 'three';

const LEAF_SIZE=12;

export function createRoofOcclusion(gate){
 gate.updateMatrixWorld(true);
 const meshes=[];
 let triangleCount=0,nodeCount=0;
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),w=new T.Vector3();

 gate.traverseVisible(mesh=>{
  if(!mesh.isMesh||mesh.material===undefined)return;
  if(mesh.isSkinnedMesh||mesh.isInstancedMesh||mesh.isBatchedMesh)throw Error('Roof occlusion requires static ordinary meshes');
  const geometry=mesh.geometry,position=geometry.attributes.position;
  if(!position)return;
  const index=geometry.index,count=index?index.count:position.count;
  const world=mesh.matrixWorld.clone(),inverse=world.clone().invert(),triangles=[];
  function addRange(start,end,material){
   if(!material)throw Error('Missing roof group material');
   if(material.visible===false)return;
   for(let i=start;i<end;i+=3){
    const ia=index?index.getX(i):i,ib=index?index.getX(i+1):i+1,ic=index?index.getX(i+2):i+2;
    // getVertexPosition matches Mesh.raycast (including a static morph pose).
    mesh.getVertexPosition(ia,a);mesh.getVertexPosition(ib,b);mesh.getVertexPosition(ic,c);
    const lo=[Math.min(a.x,b.x,c.x),Math.min(a.y,b.y,c.y),Math.min(a.z,b.z,c.z)];
    const hi=[Math.max(a.x,b.x,c.x),Math.max(a.y,b.y,c.y),Math.max(a.z,b.z,c.z)];
    let maxY=-Infinity;for(const v of [a,b,c])maxY=Math.max(maxY,w.copy(v).applyMatrix4(world).y);
    triangles.push({ia,ib,ic,material,lo,hi,maxY});
   }
  }
  const draw=geometry.drawRange;
  if(Array.isArray(mesh.material)){
   for(const group of geometry.groups)addRange(Math.max(group.start,draw.start),Math.min(count,group.start+group.count,draw.start+draw.count),mesh.material[group.materialIndex]);
  }else addRange(Math.max(0,draw.start),Math.min(count,draw.start+draw.count),mesh.material);
  if(!triangles.length)return;
  triangleCount+=triangles.length;
  function build(ids){
   nodeCount++;
   const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];let maxY=-Infinity;
   for(const id of ids){const t=triangles[id];maxY=Math.max(maxY,t.maxY);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],t.lo[k]);hi[k]=Math.max(hi[k],t.hi[k]);}}
   const node={lo,hi,maxY};
   if(ids.length<=LEAF_SIZE){node.ids=ids;return node;}
   let axis=0;if(hi[1]-lo[1]>hi[axis]-lo[axis])axis=1;if(hi[2]-lo[2]>hi[axis]-lo[axis])axis=2;
   ids.sort((i,j)=>(triangles[i].lo[axis]+triangles[i].hi[axis])-(triangles[j].lo[axis]+triangles[j].hi[axis]));
   const mid=ids.length>>1;node.left=build(ids.slice(0,mid));node.right=build(ids.slice(mid));return node;
  }
  meshes.push({mesh,world,inverse,triangles,root:build(triangles.map((_,i)=>i))});
 });

 const direction=new T.Vector3(),ray=new T.Ray(),localRay=new T.Ray();
 const localEnd=new T.Vector3(),localHit=new T.Vector3(),worldHit=new T.Vector3();
 const va=new T.Vector3(),vb=new T.Vector3(),vc=new T.Vector3(),stack=[];
 const stats={meshes:meshes.length,triangles:triangleCount,nodes:nodeCount,lastCandidates:0,lastNodes:0};
 function intersectsBox(node,far){
  let near=0,exit=far;
  const o=localRay.origin,d=localRay.direction;
  for(let k=0;k<3;k++){
   const origin=k===0?o.x:k===1?o.y:o.z,delta=k===0?d.x:k===1?d.y:d.z;
   // Conservative padding keeps edge/corner rays from being lost to BVH math.
   const low=node.lo[k]-1e-8,high=node.hi[k]+1e-8;
   if(delta===0){if(origin<low||origin>high)return false;continue;}
   let first=(low-origin)/delta,last=(high-origin)/delta;
   if(first>last){const tmp=first;first=last;last=tmp;}
   near=Math.max(near,first);exit=Math.min(exit,last);if(exit<near)return false;
  }
  return true;
 }
 function occludes(cameraPos,headPos,minY){
  stats.lastCandidates=0;stats.lastNodes=0;
  const distance=direction.subVectors(headPos,cameraPos).length(),far=distance-.1;
  if(far<0||!Number.isFinite(far))return false;
  ray.set(cameraPos,direction.normalize());
  for(const data of meshes){
   if((data.mesh.layers.mask&1)===0)continue; // default Raycaster layer mask
   localRay.copy(ray).applyMatrix4(data.inverse);
   localEnd.copy(ray.direction).multiplyScalar(far).add(cameraPos).applyMatrix4(data.inverse);
   const localFar=localEnd.distanceTo(localRay.origin)+1e-8;
   stack.length=0;stack.push(data.root);
   while(stack.length){
    const node=stack.pop();stats.lastNodes++;
    if(node.maxY<minY-1e-8||!intersectsBox(node,localFar))continue;
    if(!node.ids){stack.push(node.left,node.right);continue;}
    for(const id of node.ids){
     const t=data.triangles[id];if(t.maxY<minY-1e-8)continue;
     stats.lastCandidates++;
     data.mesh.getVertexPosition(t.ia,va);data.mesh.getVertexPosition(t.ib,vb);data.mesh.getVertexPosition(t.ic,vc);
     const hit=t.material.side===T.BackSide?localRay.intersectTriangle(vc,vb,va,true,localHit):localRay.intersectTriangle(va,vb,vc,t.material.side===T.FrontSide,localHit);
     if(hit===null)continue;
     worldHit.copy(localHit).applyMatrix4(data.world);
     // Same strict Y and world-space far tests as Three's original query.
     if(cameraPos.distanceTo(worldHit)<=far&&worldHit.y>minY)return true;
    }
   }
  }
  return false;
 }
 return {occludes,stats};
}
