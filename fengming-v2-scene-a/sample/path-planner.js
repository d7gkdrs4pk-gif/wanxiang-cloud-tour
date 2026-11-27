/** Static click-to-walk planning over the sample's existing safeGround contract.
 * Construct only after navigation is ready; rebuild if collision geometry changes.
 * No cache/height/collision modifications, renderer, or external dependencies.
 */
import * as T from 'three';

const STEP=.125,X0=-10.5,Z0=-9.125,COLS=129,ROWS=86;
const BOUNDS={minX:-10.5,maxX:5.5,minZ:-9.1,maxZ:1.5};
const MAX_ADJUST=.65,ANCHOR=.30,SAMPLE=.035;
const DIRS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
const OPP=[1,0,3,2,7,6,5,4];

export function createPathPlanner(nav){
 if(!nav.ready)throw Error('Create path planner after navigation is ready');
 const began=performance.now(),count=COLS*ROWS;
 const heights=new Float64Array(count);heights.fill(NaN);
 const edges=new Uint8Array(count*8),component=new Int32Array(count);component.fill(-1);
 const at=id=>new T.Vector3(X0+(id%COLS)*STEP,heights[id],Z0+Math.floor(id/COLS)*STEP);
 const inside=(x,z)=>x>=BOUNDS.minX&&x<=BOUNDS.maxX&&z>=BOUNDS.minZ&&z<=BOUNDS.maxZ;
 const ground=(x,z)=>{if(!inside(x,z))return null;const h=nav.safeGround(x,z);return h!==null&&Number.isFinite(h)?h:null;};
 function clear(a,b){
  const length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(length/SAMPLE));
  const probes=[0,1],dx=b.x-a.x,dz=b.z-a.z;
  for(let i=1;i<n;i++)probes.push(i/n);
  // Probe the exact collision/cell boundaries too: uniform samples alone can
  // miss a tiny forbidden sliver when smoothing past a door or patch corner.
  function cut(v,start,delta){if(delta!==0){const t=(v-start)/delta;if(t>0&&t<1)probes.push(t);}}
  function cuts(start,delta,spacing,low,high){
   if(delta===0)return;
   const min=Math.max(low,Math.min(start,start+delta)),max=Math.min(high,Math.max(start,start+delta));
   for(let i=Math.ceil((min-1e-10)/spacing);i<=Math.floor((max+1e-10)/spacing);i++)cut(i*spacing,start,delta);
  }
  cuts(a.x,dx,.25,BOUNDS.minX,BOUNDS.maxX);cuts(a.z,dz,.25,BOUNDS.minZ,BOUNDS.maxZ);
  cuts(a.x,dx,.025,-6.9,-5.7);cuts(a.z,dz,.025,-8.35,-6);
  cuts(a.x,dx,.0125,1.35,2.45);cuts(a.z,dz,.0125,-7.4,-6.9);
  for(const x of [-10.5,-6.9,-5.7,-2.45,1.35,2.30,2.45,5.5])cut(x,a.x,dx);
  for(const z of [-9.1,-8.35,-7.4,-6.9,-6,-3.65,1.5])cut(z,a.z,dz);
  // The disk closest point cannot be missed even by a nearly tangent ray.
  if(length>0){const t=((-7-a.x)*dx+(-7-a.z)*dz)/(length*length);if(t>0&&t<1)probes.push(t);}
  probes.sort((x,y)=>x-y);
  let previous=ground(a.x,a.z);if(previous===null)return false;
  function check(t){const h=ground(a.x+dx*t,a.z+dz*t);if(h===null||Math.abs(h-previous)>=.9)return false;previous=h;return true;}
  for(let i=1;i<probes.length;i++){
   if(probes[i]-probes[i-1]<1e-12)continue;
   if(!check((probes[i]+probes[i-1])*.5)||!check(probes[i]))return false;
  }
  return true;
 }
 for(let id=0;id<count;id++){
  const x=X0+(id%COLS)*STEP,z=Z0+Math.floor(id/COLS)*STEP,h=ground(x,z);
  if(h!==null)heights[id]=h;
 }
 function edge(id,d){
  const slot=id*8+d;if(edges[slot])return edges[slot]===2;
  const x=id%COLS,z=Math.floor(id/COLS),[dx,dz]=DIRS[d],X=x+dx,Z=z+dz,j=Z*COLS+X;
  if(X<0||X>=COLS||Z<0||Z>=ROWS||!Number.isFinite(heights[id])||!Number.isFinite(heights[j])){edges[slot]=1;return false;}
  // Both orthogonal sides must be passable; no cutting a tree/door corner.
  let allowed=true;
  if(d>=4)allowed=edge(id,dx===1?0:1)&&edge(id,dz===1?2:3);
  if(allowed)allowed=clear(at(id),at(j));
  edges[slot]=allowed?2:1;edges[j*8+OPP[d]]=allowed?2:1;return allowed;
 }
 let components=0,validCells=0;
 const queue=new Int32Array(count);
 for(let id=0;id<count;id++){
  if(!Number.isFinite(heights[id]))continue;validCells++;
  if(component[id]>=0)continue;
  let read=0,write=0;queue[write++]=id;component[id]=components;
  while(read<write){const k=queue[read++];for(let d=0;d<8;d++){if(!edge(k,d))continue;const [dx,dz]=DIRS[d],j=k+dx+dz*COLS;if(component[j]<0){component[j]=components;queue[write++]=j;}}}
  components++;
 }
 function nearby(p,radius){
  const cx=Math.round((p.x-X0)/STEP),cz=Math.round((p.z-Z0)/STEP),r=Math.ceil(radius/STEP),result=[];
  for(let z=Math.max(0,cz-r);z<=Math.min(ROWS-1,cz+r);z++)for(let x=Math.max(0,cx-r);x<=Math.min(COLS-1,cx+r);x++){
   const id=z*COLS+x;if(!Number.isFinite(heights[id]))continue;
   const distance=Math.hypot(X0+x*STEP-p.x,Z0+z*STEP-p.z);
   if(distance<=radius+1e-10)result.push({id,distance});
  }
  result.sort((a,b)=>a.distance-b.distance);return result;
 }
 const stats={step:STEP,grid:[COLS,ROWS],validCells,components,buildMs:performance.now()-began,lastMs:0,lastExpanded:0};
 function plan(startVector3,clickedVector3){
  const startTime=performance.now();stats.lastExpanded=0;
  function result(ok,points=[],goal=null,adjusted=false,reason='unreachable'){
   stats.lastMs=performance.now()-startTime;return {ok,points,goal,adjusted,reason};
  }
  if(!nav.ready)return result(false,[],null,false,'not-ready');
  if(!Number.isFinite(startVector3.x)||!Number.isFinite(startVector3.z)||!Number.isFinite(clickedVector3.x)||!Number.isFinite(clickedVector3.z))return result(false,[],null,false,'invalid-point');
  const startY=ground(startVector3.x,startVector3.z);
  if(startY===null)return result(false,[],null,false,'invalid-start');
  const start=new T.Vector3(startVector3.x,startY,startVector3.z),clicked=clickedVector3;
  const outsideDistance=Math.hypot(Math.max(BOUNDS.minX-clicked.x,0,clicked.x-BOUNDS.maxX),Math.max(BOUNDS.minZ-clicked.z,0,clicked.z-BOUNDS.maxZ));
  if(outsideDistance>MAX_ADJUST)return result(false,[],null,false,'outside-area');
  const clickedY=ground(clicked.x,clicked.z);
  if(clickedY!==null){const goal=new T.Vector3(clicked.x,clickedY,clicked.z);if(clear(start,goal))return result(true,[goal.clone()],goal,false,'direct');}
  const starts=nearby(start,ANCHOR).filter(q=>clear(start,at(q.id)));
  if(!starts.length)return result(false,[],null,false,'unreachable');
  const reachable=new Set(starts.map(q=>component[q.id]));
  let goal,adjusted=false,goals;
  if(clickedY!==null){
   goal=new T.Vector3(clicked.x,clickedY,clicked.z);
   goals=nearby(goal,ANCHOR).filter(q=>reachable.has(component[q.id])&&clear(at(q.id),goal));
   if(!goals.length)return result(false,[],null,false,'unreachable');
  }else{
   // Only a nearby reachable point may replace an illegal click. Never send
   // the player across the map to a door or to an unrelated visible platform.
   const candidates=nearby(clicked,MAX_ADJUST),candidate=candidates.find(q=>reachable.has(component[q.id]));
   if(!candidate)return result(false,[],null,false,candidates.length?'unreachable':'no-nearby-ground');
   goal=at(candidate.id);adjusted=true;goals=[candidate];
   if(clear(start,goal))return result(true,[goal.clone()],goal,true,'nearby-ground');
  }
  const goalIds=new Set(goals.map(q=>q.id)),cost=new Float64Array(count);cost.fill(Infinity);
  const parent=new Int32Array(count);parent.fill(-1);const closed=new Uint8Array(count),heap=[];
  const heuristic=id=>Math.hypot(X0+(id%COLS)*STEP-goal.x,Z0+Math.floor(id/COLS)*STEP-goal.z);
  function push(id,g){const item={id,g,f:g+heuristic(id)};heap.push(item);let i=heap.length-1;while(i){const j=(i-1)>>1;if(heap[j].f<=item.f)break;heap[i]=heap[j];i=j;}heap[i]=item;}
  function pop(){const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(last.f<=heap[j].f)break;heap[i]=heap[j];i=j;}heap[i]=last;}return top;}
  for(const q of starts){cost[q.id]=q.distance;push(q.id,q.distance);}
  let end=-1;
  while(heap.length){
   const q=pop(),id=q.id;if(closed[id]||q.g!==cost[id])continue;closed[id]=1;stats.lastExpanded++;
   if(goalIds.has(id)){end=id;break;}
   for(let d=0;d<8;d++){
    if(!edge(id,d))continue;const [dx,dz]=DIRS[d],j=id+dx+dz*COLS;if(closed[j])continue;
    const g=cost[id]+STEP*(d>=4?Math.SQRT2:1);if(g>=cost[j])continue;cost[j]=g;parent[j]=id;push(j,g);
   }
  }
  if(end<0)return result(false,[],null,false,'unreachable');
  const raw=[];for(let id=end;id>=0;id=parent[id])raw.push(at(id));raw.reverse();raw.push(goal.clone());
  // Greedy string pulling is allowed only after sampling the original exact
  // collision/height function, including the actual side steps and root disk.
  const points=[];let from=start,i=0;
  while(i<raw.length){let j=raw.length-1;while(j>i&&!clear(from,raw[j]))j--;if(!clear(from,raw[j]))return result(false,[],null,false,'unreachable');points.push(raw[j].clone());from=raw[j];i=j+1;}
  return result(true,points,goal,adjusted,adjusted?'nearby-ground':'path');
 }
 return {plan,stats};
}
