/** Actual rendered-terrain heights, used only after original XY legality passes.
 *
 * const surface=await loadGroundSurface();
 * nav.setSurfaceProvider(surface.refine);
 *
 * Caller keeps stairsAt/pinePatch priority and never calls this to validate XY.
 * No temporal low-pass: genuine >=.18 high ledges stay discrete.
 */
const BASE=new URL('../assets/sample-ground/',import.meta.url);

export function createGroundSurface(buffer,metadata,slopeBuffer){
 const q=metadata;
 if(q.cols!==321||q.rows!==213||q.step!==.05||q.bytes!==q.cols*q.rows*4||buffer.byteLength!==q.bytes)throw Error('Invalid ground surface cache');
 if(!slopeBuffer||slopeBuffer.byteLength!==Math.ceil((q.cols-1)*(q.rows-1)/8))throw Error('Invalid ground slope evidence');
 const view=new DataView(buffer),slope=new Uint8Array(slopeBuffer),at=(x,z)=>view.getFloat32((z*q.cols+x)*4,true);
 const stats={replaced:0,fallback:0,edges:0,continuousSlopes:0};
 function refine(x,z,legacyHeight){
  if(legacyHeight===null||!Number.isFinite(legacyHeight)||!Number.isFinite(x)||!Number.isFinite(z))return legacyHeight;
  const X=(x-q.origin[0])/q.step,Z=(z-q.origin[1])/q.step;
  if(X<0||Z<0||X>q.cols-1||Z>q.rows-1){stats.fallback++;return legacyHeight;}
  const ix=Math.min(q.cols-2,Math.floor(X)),iz=Math.min(q.rows-2,Math.floor(Z)),tx=X-ix,tz=Z-iz;
  const h=[at(ix,iz),at(ix+1,iz),at(ix,iz+1),at(ix+1,iz+1)];
  let candidate;
  if(h.every(Number.isFinite)){
   const id=iz*(q.cols-1)+ix,continuous=(slope[id>>3]&(1<<(id&7)))!==0;
   if(Math.max(...h)-Math.min(...h)>=.18&&!continuous){candidate=at(Math.round(X),Math.round(Z));stats.edges++;}
   else {candidate=(h[0]*(1-tx)+h[1]*tx)*(1-tz)+(h[2]*(1-tx)+h[3]*tx)*tz;if(continuous)stats.continuousSlopes++;}
  }else{
   // No interpolation through a missing/vertical face or between ledge levels.
   candidate=at(Math.round(X),Math.round(Z));stats.edges++;
  }
  if(!Number.isFinite(candidate)||candidate>1.05){stats.fallback++;return legacyHeight;}
  stats.replaced++;return candidate;
 }
 return {refine,metadata:q,stats};
}

export async function loadGroundSurface({base=BASE}={}){
 const [metaResponse,dataResponse,slopeResponse]=await Promise.all([fetch(new URL('metadata.json',base)),fetch(new URL('height.f32',base)),fetch(new URL('slope.bits',base))]);
 if(!metaResponse.ok||!dataResponse.ok||!slopeResponse.ok)throw Error('Ground surface HTTP load failed');
 const [meta,data,slope]=await Promise.all([metaResponse.json(),dataResponse.arrayBuffer(),slopeResponse.arrayBuffer()]);
 return createGroundSurface(data,meta,slope);
}
