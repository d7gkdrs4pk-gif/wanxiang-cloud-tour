/** One continuous rock apron inside the original non-walkable gate footprint. */
export function makeFoundationRock(heightAt){
 const rows=4,cols=6,us=[0,.16,.37,.61,.82,1],ts=[0,.30,.68,1],positions=[],indices=[];
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const warpZ=r===1?[-.04,.06,-.07,.05,-.02,0][c]:r===2?[.02,-.05,.04,-.06,.07,-.01][c]:0;
  const t=ts[r]+warpZ,u=us[c],x0=-2.22+(-2.39+2.22)*t,x1=2.22+(1.34-2.22)*t;
  const x=x0+(x1-x0)*u+.020*Math.sin(c*2.1+r)*Math.sin(Math.PI*u)*Math.sin(Math.PI*t);
  const z=-3.94+(-5.27+3.94)*t+.025*Math.sin(c*1.4)*Math.sin(Math.PI*t)*Math.sin(Math.PI*u);
  const localY=r===1?[0,.012,-.018,.016,-.009,0][c]:r===2?[0,-.016,.014,-.010,.018,0][c]:0;
  const designed=.17+(.645-.17)*t+localY,terrain=heightAt(x,z);
  const y=Math.max(designed,(Number.isFinite(terrain)?terrain:.10)+.012);positions.push(x,y,z);
 }
 for(let r=0;r<rows-1;r++)for(let c=0;c<cols-1;c++){const a=r*cols+c,b=a+cols;indices.push(a,a+1,b,a+1,b+1,b);}
 const edge=[];for(let c=0;c<cols;c++)edge.push(c);for(let r=1;r<rows;r++)edge.push(r*cols+cols-1);for(let c=cols-2;c>=0;c--)edge.push((rows-1)*cols+c);for(let r=rows-2;r>0;r--)edge.push(r*cols);
 // Split the buried side wall from the top's smooth normals. Sharing them
 // made a full-width highlight/dark band at the front and rear edges.
 const sideTop=positions.length/3;for(const i of edge)positions.push(positions[i*3],positions[i*3+1],positions[i*3+2]);
 const lower=positions.length/3;for(const i of edge)positions.push(positions[i*3],-.08,positions[i*3+2]);
 const centre=positions.length/3;positions.push(-.25,-.08,-4.60);
 for(let i=0;i<edge.length;i++){const j=(i+1)%edge.length,a=sideTop+i,b=sideTop+j,lo=lower+i,lj=lower+j;indices.push(a,lo,b,b,lo,lj);indices.push(centre,lj,lo);}
 return {positions,indices,profile:{rows,cols,triangles:indices.length/3,front:{z:-3.94,x:[-2.22,2.22],designedY:.17},rear:{z:-5.27,x:[-2.39,1.34],designedY:.645},retainsExistingHighTerrain:true,nonParallelInterior:true,topNormalsSeparatedFromBuriedSide:true,rockUVWorldScale:4.8,insideOriginalForbiddenFootprint:true}};
}
