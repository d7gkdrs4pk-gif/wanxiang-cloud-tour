/** Offline H35 thin stone road kit. Original navigation/ground samples are read,
 * never rewritten. Top follows the old walking surface +.010m; visible bevel and
 * .055m side sit over a render-only lowered grout bed. No browser/GPU required. */
import fs from 'node:fs/promises';import path from 'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';
import * as T from '../vendor/three/three.module.js';
import {createGroundSurface} from '../sample/ground-surface.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'assets/environment-035');await fs.mkdir(out,{recursive:true});
let navSource=await fs.readFile(path.join(root,'sample/navigation.js'),'utf8');navSource=navSource.replace("from 'three'","from "+JSON.stringify(new URL('../vendor/three/three.module.js',import.meta.url).href));const{createNavigation}=await import('data:text/javascript;base64,'+Buffer.from(navSource).toString('base64'));
const cache=JSON.parse(await fs.readFile(path.join(root,'assets/sample-lod/navigation.json'),'utf8')),meta=JSON.parse(await fs.readFile(path.join(root,'assets/sample-ground/metadata.json'),'utf8'));
const hb=await fs.readFile(path.join(root,'assets/sample-ground/height.f32')),sb=await fs.readFile(path.join(root,'assets/sample-ground/slope.bits'));const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),surface=createGroundSurface(ab(hb),meta,ab(sb));
const nav=createNavigation({scene:new T.Scene(),stone:new T.MeshBasicMaterial()});nav.installCached(cache);nav.setSurfaceProvider(surface.refine);
function height(x,z){const official=nav.safeGround(x,z);if(Number.isFinite(official))return official;const X=(x+20)/.5,Z=(z+20)/.5,ix=Math.floor(X),iz=Math.floor(Z);if(ix<0||ix>=80||iz<0||iz>=80)return null;const tx=X-ix,tz=Z-iz,v=[cache.H[iz*81+ix],cache.H[iz*81+ix+1],cache.H[(iz+1)*81+ix],cache.H[(iz+1)*81+ix+1]];if(!v.every(Number.isFinite))return null;const raw=(v[0]*(1-tx)+v[1]*tx)*(1-tz)+(v[2]*(1-tx)+v[3]*tx)*tz;const withinFine=x>=meta.origin[0]&&x<=meta.origin[0]+(meta.cols-1)*meta.step&&z>=meta.origin[1]&&z<=meta.origin[1]+(meta.rows-1)*meta.step;if(withinFine){const pine=nav.pineFloorAt(x,z);if(Number.isFinite(pine))return pine;return surface.refine(x,z,raw);}return raw;}
const rects=[[-4.25,-.75,-2.25,8.2],[-6.25,4.2,-4.60,-2.02],[-7.05,-4.95,-6.00,-3.60],[-6.90,-5.72,-8.32,-6.00],[2.50,3.60,-7.62,-3.35]];
const inside=(x,z,pad=0)=>rects.some(r=>x>=r[0]-pad&&x<=r[1]+pad&&z>=r[2]-pad&&z<=r[3]+pad);
const excluded=(x,z)=>Math.hypot(x+7,z+7)<.40||(x> -2.46&&x<2.46&&z< -3.63&&z> -7.72)||(x>1.28&&x<2.52&&z> -7.50&&z< -6.80);
const faceRects=[[.037,.203,.808,.938],[.276,.459,.808,.932],[.141,.330,.538,.696],[.028,.208,.301,.442]];
const sun=new T.Vector3(-8,16,12).normalize();let seed=35019;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function generate(width){seed=35019;const p=[],n=[],u=[],c=[],kind=[],idx=[],dedup=new Map(),pieces=[];let activeCut=null;let maxLift=-Infinity,minLift=Infinity,topChecks=0,aboveTolerance=0,navCheckCount=0,navMinLift=Infinity,navMaxLift=-Infinity,navOver2cm=0;
function vertex(v,normal,uv,color){const a=[...v,...normal,...uv,...color,0].map((x,i)=>Number(x.toFixed(i<3?6:5)));const key=a.join(',');let id=dedup.get(key);if(id===undefined){id=p.length/3;dedup.set(key,id);p.push(...a.slice(0,3));n.push(...a.slice(3,6));u.push(...a.slice(6,8));c.push(...a.slice(8,11));kind.push(0);}return id;}
function emit(a,b,d,uvA,uvB,uvD,tint,top=false,sharedTopNormal=null,bypassCut=false){
 if(activeCut&&!bypassCut){
  const q=activeCut,limit=q.limit-(top?.013*Math.SQRT2:0),side=p=>q.sx*(p[0]-q.x)+q.sz*(p[2]-q.z)-limit;
  let poly=[{p:a,uv:uvA},{p:b,uv:uvB},{p:d,uv:uvD}],out=[];
  for(let k=0;k<poly.length;k++){const v=poly[k],w=poly[(k+1)%poly.length],sv=side(v.p),sw=side(w.p);if(sv<=.00000001)out.push(v);if((sv<0)!==(sw<0)){const t=sv/(sv-sw);out.push({p:v.p.map((x,i)=>x+(w.p[i]-x)*t),uv:v.uv.map((x,i)=>x+(w.uv[i]-x)*t)});}}
  for(let k=1;k+1<out.length;k++)emit(out[0].p,out[k].p,out[k+1].p,out[0].uv,out[k].uv,out[k+1].uv,tint,top,sharedTopNormal,true);return;
 }
 const av=new T.Vector3(...a),bv=new T.Vector3(...b),dv=new T.Vector3(...d);let normal=bv.clone().sub(av).cross(dv.clone().sub(av)).normalize();if(normal.y<-.5&&top){[b,d]=[d,b];[uvB,uvD]=[uvD,uvB];normal.negate();}if(top&&sharedTopNormal)normal.copy(sharedTopNormal);const light=Math.max(0,normal.dot(sun)),shade=[(.36+.79*light)*tint,(.46+.68*light)*tint,(.57+.51*light)*tint];idx.push(vertex(a,normal.toArray(),uvA,shade),vertex(b,normal.toArray(),uvB,shade),vertex(d,normal.toArray(),uvD,shade));if(top){for(const weights of[[1/3,1/3,1/3],[.8,.1,.1],[.1,.8,.1],[.1,.1,.8]]){const x=a[0]*weights[0]+b[0]*weights[1]+d[0]*weights[2],z=a[2]*weights[0]+b[2]*weights[1]+d[2]*weights[2];if(nav.safeGround(x,z)===null)continue;const original=nav.groundAt(x,z),lift=a[1]*weights[0]+b[1]*weights[1]+d[1]*weights[2]-original;navCheckCount++;navMinLift=Math.min(navMinLift,lift);navMaxLift=Math.max(navMaxLift,lift);if(Math.abs(lift)>.0201)navOver2cm++;}}}
function stone(cx,cz,w,d,rotation,id,edge=false){
 const co=Math.cos(rotation),si=Math.sin(rotation),tint=.975+rand()*.025,face=faceRects[id%4];
 activeCut=null;
 // Only the two exposed plaza corners lose .055m of their sharp point. The
 // continuous mother grid, route width and all original walking heights stay.
 for(const [x,z,sx,sz]of[[-6.25,-2.02,-1,1],[4.2,-2.02,1,1]])if(Math.abs(cx+sx*w/2-x)<.021&&Math.abs(cz+sz*d/2-z)<.021)activeCut={x:cx,z:cz,sx,sz,limit:w/2+d/2-.055};
 const world=(x,z)=>[cx+co*x-si*z,cz+si*x+co*z];
 const uv=(x,z)=>[face[0]+(face[1]-face[0])*(x/w+.5),face[2]+(face[3]-face[2])*(z/d+.5)];
 const point=(x,z,lift)=>{const q=world(x,z),h=height(...q);return Number.isFinite(h)?[q[0],h+lift,q[1]]:null;};
 const inset=.013,ix=w/2-inset,iz=d/2-inset;if(ix<.025||iz<.025)return;
 const sx=Math.max(.025,w*.30),sz=Math.max(.025,d*.30);
 const topNormal=new T.Vector3(-(height(cx+sx,cz)-height(cx-sx,cz))/(sx*2),1,-(height(cx,cz+sz)-height(cx,cz-sz))/(sz*2)).normalize().lerp(new T.Vector3(0,1,0),.90).normalize();
 if(!Number.isFinite(topNormal.x+topNormal.y+topNormal.z))topNormal.set(0,1,0);
 const EPS=.000001,STEP=.025;
 const line=(a,b,origin)=>{const m=origin+Math.round(((a+b)/2-origin)/STEP)*STEP;return m>a+.001&&m<b-.001?m:null;};
 const samples=(a,b,origin)=>{const q=[(a+b)/2];for(let x=origin+(Math.floor((a-origin)/STEP)+.5)*STEP;x<b;x+=STEP)if(x>a+EPS)q.push(x);return q;};
 // Fit the SAME block, refining its interior at exact source-height cell and
 // nearest-neighbour boundaries. There is no extra masonry joint inside it.
 function patch(x0,x1,z0,z1){
  const corners=[[x0,z0],[x1,z0],[x0,z1],[x1,z1]],points=corners.map(([x,z])=>{
   const X=x===x0?x+EPS:x-EPS,Z=z===z0?z+EPS:z-EPS,q=world(x,z),s=world(X,Z),h=height(...s);return Number.isFinite(h)?[q[0],h+.010,q[1]]:null;
  });if(points.some(x=>!x))return;
  const interpolate=(x,z)=>{const a=(x-x0)/(x1-x0),b=(z-z0)/(z1-z0);return a+b<=1?points[0][1]*(1-a-b)+points[1][1]*a+points[2][1]*b:points[3][1]*(a+b-1)+points[1][1]*(1-b)+points[2][1]*(1-a);};
  let error=0;const probes=[];
  for(const x of samples(x0,x1,-10.5-cx))for(const z of samples(z0,z1,-9.1-cz)){
   const q=world(x,z),h=height(...q);if(!Number.isFinite(h))continue;const lift=interpolate(x,z)-h;error=Math.max(error,Math.abs(lift-.010));probes.push(lift);
  }
  const xm=line(x0,x1,-10.5-cx),zm=line(z0,z1,-9.1-cz);
  if(error>.0095&&(xm!==null||zm!==null)){
   if(xm!==null&&zm!==null){patch(x0,xm,z0,zm);patch(xm,x1,z0,zm);patch(x0,xm,zm,z1);patch(xm,x1,zm,z1);}
   else if(xm!==null){patch(x0,xm,z0,z1);patch(xm,x1,z0,z1);}else{patch(x0,x1,z0,zm);patch(x0,x1,zm,z1);}return;
  }
  for(const lift of probes){maxLift=Math.max(maxLift,lift);minLift=Math.min(minLift,lift);topChecks++;if(Math.abs(lift-.010)>.020)aboveTolerance++;}
  emit(points[0],points[2],points[1],uv(...corners[0]),uv(...corners[2]),uv(...corners[1]),tint,true,topNormal);
  emit(points[1],points[2],points[3],uv(...corners[1]),uv(...corners[2]),uv(...corners[3]),tint,true,topNormal);
 }
 patch(-ix,ix,-iz,iz);
 // Source ledges occasionally cross a slab. Close that genuine height change
 // with an un-bevelled internal riser, not four invented miniature bricks.
 function riser(axis,a,b,c){
  const at=(s,t,side)=>axis==='x'?point(s+side*EPS,t,.010):point(t,s+side*EPS,.010);
  const l0=at(a,b+EPS,-1),l1=at(a,c-EPS,-1),r0=at(a,b+EPS,1),r1=at(a,c-EPS,1);
  if(![l0,l1,r0,r1].every(Boolean)||Math.max(Math.abs(l0[1]-r0[1]),Math.abs(l1[1]-r1[1]))<.025)return;
  // Same plane XZ; only the Y is sampled on its own side of the source step.
  for(const q of[l0,l1,r0,r1])if(axis==='x')q[0]=cx+a;else q[2]=cz+a;
  const ua=axis==='x'?uv(a,b):uv(b,a),ub=axis==='x'?uv(a,c):uv(c,a);
  emit(l0,l1,r0,ua,ub,ua,tint*.95);emit(r0,l1,r1,ua,ub,ub,tint*.95);
 }
 for(let x=-10.5-cx+(Math.floor((-ix+10.5+cx)/STEP)+1)*STEP;x<ix-EPS;x+=STEP){
  for(let z=-iz;z<iz-EPS;){let e=Math.min(iz,-9.1-cz+(Math.floor((z+9.1+cz)/STEP)+1)*STEP);if(e<z+EPS)e=Math.min(iz,z+STEP);riser('x',x,z,e);z=e;}
 }
 for(let z=-9.1-cz+(Math.floor((-iz+9.1+cz)/STEP)+1)*STEP;z<iz-EPS;z+=STEP){
  for(let x=-ix;x<ix-EPS;){let e=Math.min(ix,-10.5-cx+(Math.floor((x+10.5+cx)/STEP)+1)*STEP);if(e<x+EPS)e=Math.min(ix,x+STEP);riser('z',z,x,e);x=e;}
 }
 const inner=[[-ix,-iz],[0,-iz],[ix,-iz],[ix,iz],[0,iz],[-ix,iz]],outer=inner.map(([x,z])=>[x===0?0:Math.sign(x)*w/2,Math.sign(z)*d/2]);
 for(let k=0;k<6;k++){const j=(k+1)%6,ai=point(...inner[k],.010),bi=point(...inner[j],.010),ao=point(...outer[k],-.003),bo=point(...outer[j],-.003),al=point(...outer[k],-.055),bl=point(...outer[j],-.055);if(![ai,bi,ao,bo,al,bl].every(Boolean))continue;const ua=uv(...inner[k]),ub=uv(...inner[j]);emit(ai,ao,bi,ua,ua,ub,tint);emit(bi,ao,bo,ub,ua,ub,tint);emit(ao,al,bo,ua,ua,ub,tint*.94);emit(bo,al,bl,ub,ua,ub,tint*.94);}
 if(activeCut){
  const{sx,sz}=activeCut,cut=.055,off=.013/Math.SQRT2;
  const A=[sx*(w/2-cut),sz*d/2],B=[sx*w/2,sz*(d/2-cut)],Ai=[A[0]-sx*off,A[1]-sz*off],Bi=[B[0]-sx*off,B[1]-sz*off];
  const ai=point(...Ai,.010),bi=point(...Bi,.010),ao=point(...A,-.003),bo=point(...B,-.003),al=point(...A,-.055),bl=point(...B,-.055),ua=uv(...Ai),ub=uv(...Bi);
  if([ai,bi,ao,bo,al,bl].every(Boolean)){emit(ai,ao,bi,ua,ua,ub,tint,false,null,true);emit(bi,ao,bo,ub,ua,ub,tint,false,null,true);emit(ao,al,bo,ua,ua,ub,tint*.94,false,null,true);emit(bo,al,bl,ub,ua,ub,tint*.94,false,null,true);}
 }
 pieces.push({center:[cx,cz],size:[w,d],yaw:rotation,edge,cornerCut:activeCut?.055:0});activeCut=null;
}
function clippedCell(x0,x1,z0,z1){
 const hits=rects.map(r=>[Math.max(x0,r[0]),Math.min(x1,r[1]),Math.max(z0,r[2]),Math.min(z1,r[3])]).filter(r=>r[1]-r[0]>.045&&r[3]-r[2]>.045);
 if(!hits.length)return null;let q=[Math.min(...hits.map(r=>r[0])),Math.max(...hits.map(r=>r[1])),Math.min(...hits.map(r=>r[2])),Math.max(...hits.map(r=>r[3]))];
 // Truncate only boundary bricks; never place two instances at a junction.
 for(const r of[[-2.46,2.46,-7.72,-3.63],[1.28,2.52,-7.50,-6.80]]){
  if(q[0]>=r[1]||q[1]<=r[0]||q[2]>=r[3]||q[3]<=r[2])continue;
  const candidates=[[q[0],Math.min(q[1],r[0]),q[2],q[3]],[Math.max(q[0],r[1]),q[1],q[2],q[3]],[q[0],q[1],q[2],Math.min(q[3],r[2])],[q[0],q[1],Math.max(q[2],r[3]),q[3]]].filter(a=>a[1]-a[0]>.045&&a[3]-a[2]>.045);
  if(!candidates.length)return null;q=candidates.sort((a,b)=>(b[1]-b[0])*(b[3]-b[2])-(a[1]-a[0])*(a[3]-a[2]))[0];
 }
 return q;
}
// One running-bond mother grid spans the union, including the junctions.
// Fixed pitches and no per-cell yaw keep .020m seams continuous on the phone.
let row=0;const pitch=width*.64;for(let z=-9.10;z<8.3;z+=pitch,row++){
 let col=0;for(let x=-8.0+(row%2?width*.5:0);x<4.8;x+=width,col++){
  const q=clippedCell(x+.010,x+width-.010,z+.010,z+pitch-.010);if(!q)continue;
  const cx=(q[0]+q[1])/2,cz=(q[2]+q[3])/2;
  if(!excluded(cx,cz))stone(cx,cz,q[1]-q[0],q[3]-q[2],0,row*17+col);
 }
}
return{p,n,u,c,kind,i:idx,stats:{stones:pieces.length,triangles:idx.length/3,vertices:p.length/3,topLiftAtVertices:.010,minSampledTopLift:minLift,maxSampledTopLift:maxLift,topChecks,aboveTolerance,independentNavCheck:{samples:navCheckCount,minLift:navMinLift,maxLift:navMaxLift,over2cm:navOver2cm,method:'final top triangle interior barycentrics queried against unchanged nav.groundAt; safeGround only filters nonwalkable decoration'},layout:'single running-bond mother grid, no split bricks/no random omissions',jointWidth:.020,topShading:'one restrained average normal per whole slab; actual bevel and side normals retained',stoneWidth:width,visibleSideBottom:-.055,bevelWidth:.013,originalHeightDataUnchanged:true},pieces};}
let result;for(const w of[.90,.96,1.02,1.08]){result=generate(w);if(result.stats.triangles<=10800)break;}if(result.stats.triangles>11000)throw Error('Road kit exceeded triangle budget '+result.stats.triangles);
const used=new Map(),clean={p:[],n:[],u:[],c:[],k:[],i:[],stats:result.stats};for(const old of result.i){let id=used.get(old);if(id===undefined){id=clean.p.length/3;used.set(old,id);clean.p.push(...result.p.slice(old*3,old*3+3));clean.n.push(...result.n.slice(old*3,old*3+3));clean.u.push(...result.u.slice(old*2,old*2+2));clean.c.push(...result.c.slice(old*3,old*3+3));clean.k.push(0);}clean.i.push(id);}clean.stats.vertices=clean.p.length/3;const data=clean;const source='// H35 offline terrain-fitted stone road. Generated by tools/build-environment-035-road.mjs\nexport const ROAD_KIT='+JSON.stringify(data)+';\n';await fs.writeFile(path.join(out,'road-geometry.js'),source);
await fs.writeFile(path.join(out,'road-layout.json'),JSON.stringify({rectangles:rects,exclusions:'Existing gate footprint, actual stair patch and visual trunk core; original .72m physics collider remains unchanged',faceUVRects:faceRects,stats:result.stats,pieces:result.pieces},null,2)+'\n');console.log(JSON.stringify(result.stats,null,2));
