"""H36 physical welcoming pine, authored for the UNCHANGED gameplay camera.
CPU Blender source generation only; shared Cycles stage and lighting are owned
by scene assembly. No images/billboard crown, no ellipsoid crown, no baked light.
"""
import bpy,bmesh,math,random,json,pathlib,hashlib,struct
from mathutils import Vector,noise
from math import sin,cos,pi
repo=pathlib.Path.cwd();out=repo/'fengming-v2-scene-a/assets/pine-036';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);rng=random.Random(360036)
samples=json.loads((out/'ground-samples.json').read_text());rootY=samples['root'][1]
R=Vector((.9284766909,.3713906764,0));A=Vector((-.3713906764,.9284766909,0))
def P(r,a,h):return R*r+A*a+Vector((0,0,h))
def ground_local(r,a):
 p=P(r,a,0);x,z=-7+p.x,-7-p.y;q=samples;u=(x-q['origin'][0])/q['step'];v=(z-q['origin'][1])/q['step'];ix=max(0,min(q['size']-2,int(math.floor(u))));iz=max(0,min(q['size']-2,int(math.floor(v))));tx=max(0,min(1,u-ix));tz=max(0,min(1,v-iz));at=lambda X,Z:q['H'][Z*q['size']+X];hs=[at(ix,iz),at(ix+1,iz),at(ix,iz+1),at(ix+1,iz+1)]
 if any(h is None for h in hs):return 0
 return ((hs[0]*(1-tx)+hs[1]*tx)*(1-tz)+(hs[2]*(1-tx)+hs[3]*tx)*tz)-rootY
coll=bpy.data.collections.new('H36_Pine_Editable');bpy.context.scene.collection.children.link(coll)
root=bpy.data.objects.new('H36_PINE_ROOT',None);coll.objects.link(root);root.location=(-7,7,rootY)
woodpaths=[]
groups={}
for name in ['RearCrown','TopCrown','Trunk','FrontBranch']:
 ob=bpy.data.objects.new(name,None);coll.objects.link(ob);ob.parent=root;groups[name]=ob
mainGroup=bpy.data.objects.new('MainCrown',None);coll.objects.link(mainGroup);mainGroup.parent=groups['FrontBranch'];groups['MainCrown']=mainGroup

def mat(name,col,rough):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*col,1);bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*col,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=0
 return m
bark=mat('H36_Bark',(.150,.098,.054),.92)
needles=mat('H36_Needles',(.080,.175,.065),.78)
young=mat('H36_Needles_YoungTips',(.135,.260,.085),.75)
for material in [needles,young]:
 material.use_backface_culling=False
 bs=material.node_tree.nodes.get('Principled BSDF')
 if 'Transmission Weight' in bs.inputs:bs.inputs['Transmission Weight'].default_value=.055
 if 'Subsurface Weight' in bs.inputs:bs.inputs['Subsurface Weight'].default_value=.035
 if 'Specular IOR Level' in bs.inputs:bs.inputs['Specular IOR Level'].default_value=.30
rockmat=mat('H36_Rock',(.20,.235,.23),.96)

def make(name,verts,faces,material,parent):
 me=bpy.data.meshes.new(name+' mesh');me.from_pydata([tuple(v)for v in verts],[],faces);me.update();ob=bpy.data.objects.new(name,me);coll.objects.link(ob);ob.parent=parent;me.materials.append(material);return ob

def cat(a,b,c,d,t):return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
def sweep(name,controls,parent,ring=12,steps=9,flatten=1):
 centers=[];radii=[]
 for i in range(len(controls)-1):
  a,b,c,d=[P(*controls[k][:3])for k in [max(0,i-1),i,i+1,min(len(controls)-1,i+2)]]
  for j in range(steps):
   t=j/steps;centers.append(cat(a,b,c,d,t));radii.append(controls[i][3]*(1-t)+controls[i+1][3]*t)
 centers.append(P(*controls[-1][:3]));radii.append(controls[-1][3]);woodpaths.append((name,centers[:],radii[:]));v=[];f=[]
 for i,p in enumerate(centers):
  tangent=(centers[min(i+1,len(centers)-1)]-centers[max(i-1,0)]).normalized();ref=Vector((0,1,0)) if abs(tangent.y)<.9 else Vector((1,0,0));u=tangent.cross(ref).normalized();w=tangent.cross(u).normalized()
  for j in range(ring):
   a=j*2*pi/ring;delta=u*cos(a)*radii[i]+w*sin(a)*radii[i];delta.z*=flatten;delta*=1+.045*sin(a*3+i*.19)+.025*cos(a*7-i*.12);v.append(p+delta)
  if i:
   for j in range(ring):a0=(i-1)*ring+j;b0=(i-1)*ring+(j+1)%ring;f.append((a0,b0,b0+ring,a0+ring))
 f.append(tuple(reversed(range(ring))));f.append(tuple(range((len(centers)-1)*ring,len(centers)*ring)))
 return make(name,v,f,bark,parent)
# Muscular oblique bole, turning at its first real fork, then counter-curving.
wood=[sweep('H36 continuous aged S bole',[(0,0,.06,.394),(-.15,.02,.65,.377),(-.32,.05,1.5,.328),(-.24,-.03,2.35,.287),(.12,-.18,3.20,.246),(.66,-.36,3.90,.215),(.86,-.58,4.55,.198),(.51,-.82,5.30,.18),(.36,-1.00,6.10,.14),(.65,-1.14,6.85,.095),(.70,-1.16,7.52,.005)],groups['Trunk'],ring=24,steps=11)]
wood.append(sweep('H36 curved welcoming main arm',[(.25,-.20,3.35,.212),(.78,-.66,3.74,.184),(1.32,-1.16,3.98,.153),(1.94,-1.55,4.11,.112),(2.40,-1.72,4.20,.071),(2.65,-1.75,4.32,.004)],groups['Trunk'],ring=16,steps=12))
wood.append(sweep('H36 rear counterbalancing arm',[(.64,-.62,4.69,.20),(.15,-.20,4.78,.16),(-.51,-.02,4.74,.115),(-1.22,-.02,4.86,.008)],groups['Trunk'],ring=12,steps=10))
wood.append(sweep('H36 upper asymmetrical fork',[(.38,-.94,5.94,.135),(.99,-1.15,6.50,.095),(1.45,-1.21,7.13,.018)],groups['Trunk'],ring=10,steps=9))
# Five broad low buttresses: taper to the actual sampled slope, not claw tips.
for i,(r,a)in enumerate([(-.95,.18),(.92,-.33),(-.25,-1.0),(.34,.86),(-.82,-.57)]):
 e=ground_local(r,a)-.075;mid=ground_local(r*.58,a*.58)+.035
 wood.append(sweep('H36 ground root %02d'%i,[(r*.12,a*.12,.18,.18),(r*.48,a*.48,mid+.015,.12),(r*.78,a*.78,e+.030,.052),(r,a,e,.004)],groups['Trunk'],ring=10,steps=8,flatten=.30))
# One genuine closed wood body; bark microrelief is physical shape, no fake AO.
bpy.ops.object.select_all(action='DESELECT')
for o in wood:o.select_set(True)
bpy.context.view_layer.objects.active=wood[0];bpy.ops.object.join();body=bpy.context.object;body.name='H36 fused trunk roots and principal branches';body.data.remesh_voxel_size=.046;bpy.ops.object.voxel_remesh()
bm=bmesh.new();bm.from_mesh(body.data)
for _ in range(2):bmesh.ops.smooth_vert(bm,verts=bm.verts,factor=.12,use_axis_x=True,use_axis_y=True,use_axis_z=True)
bm.to_mesh(body.data);bm.free();body.data.update()
for v in body.data.vertices:
 p=v.co;amplitude=.010 if p.z<4.6 else .005
 v.co+=v.normal*amplitude*(noise.noise(p*6.3+Vector((2,7,3)))+.35*noise.noise(p*14.1))
mod=body.modifiers.new('H36 physical source silhouette','DECIMATE');mod.ratio=.65;bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name)
for f in body.data.polygons:f.use_smooth=True
# Real low broad bark flakes, conformed to the real trunk surface. They
# have rounded shoulders and millimetric lift, never triangular spikes/scutes.
from mathutils.bvhtree import BVHTree
bm=bmesh.new();bm.from_mesh(body.data);bvh=BVHTree.FromBMesh(bm)
candidates=[v for v in body.data.vertices if .42<v.co.z<5.35 and abs(v.co.dot(R))<.98 and abs(v.normal.z)<.80]
bv=[];bf=[];flakes=0
for k in range(260):
 seed=rng.choice(candidates);center=seed.co.copy();normal=seed.normal.normalized();up=(Vector((0,0,1))-normal*normal.z).normalized();across=normal.cross(up).normalized()
 angle=rng.uniform(-.32,.32);u=across*cos(angle)+up*sin(angle);v=up*cos(angle)-across*sin(angle)
 width=rng.uniform(.046,.088);length=rng.uniform(.10,.21);N=9
 rim=[]
 for j in range(N):
  a=j*2*pi/N;q=center+u*cos(a)*width*(.82+rng.random()*.28)+v*sin(a)*length*(.78+rng.random()*.30)
  loc,_,_,dist=bvh.find_nearest(q)
  if loc is None or dist>.15:rim=[];break
  rim.append(loc-normal*.0015)
 if not rim:continue
 st=len(bv);bv.extend(rim)
 for q in rim:bv.append(center+(q-center)*.53+normal*rng.uniform(.009,.015))
 bv.append(center+normal*.015)
 for j in range(N):bf.append((st+j,st+(j+1)%N,st+N+(j+1)%N,st+N+j));bf.append((st+N+j,st+N+(j+1)%N,st+N*2))
 flakes+=1
bm.free();barkflakes=make('H36 broad torn bark physical flakes',bv,bf,bark,groups['Trunk'])
for f in barkflakes.data.polygons:f.use_smooth=True
# UV only for physically meaningful tangent detail; no colour/AO/light bake.
bpy.context.view_layer.objects.active=body;body.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(68),island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT')
# Licensed real pine bark PBR: Poly Haven Pine Bark / Dimitrios Savva, CC0.
# All image colour is scanned albedo; no baked scene light or generated AO.
bs=bark.node_tree.nodes.get('Principled BSDF')
for channel,filename in [('base','pine_bark_diff_1k.jpg'),('rough','pine_bark_rough_1k.jpg'),('normal','pine_bark_nor_gl_1k.jpg')]:
 image=bpy.data.images.load(str(out/'textures'/filename),check_existing=True);image.colorspace_settings.name='sRGB' if channel=='base' else 'Non-Color';image.pack()
 tex=bark.node_tree.nodes.new('ShaderNodeTexImage');tex.name='H36 CC0 Pine Bark '+channel;tex.label='Poly Haven CC0 / Dimitrios Savva';tex.image=image;tex.extension='REPEAT'
 if channel=='base':bark.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 elif channel=='rough':bark.node_tree.links.new(tex.outputs['Color'],bs.inputs['Roughness'])
 else:
  nm=bark.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.70;bark.node_tree.links.new(tex.outputs['Color'],nm.inputs['Color']);bark.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
# Metric cylindrical UVs follow each curved wood centreline; the official tile
# is 2m wide. These are geometry coordinates, no light/colour vertex attribute.
from mathutils.kdtree import KDTree
records=[]
for name,centers,radii in woodpaths:
 arc=0.
 for i,c in enumerate(centers):
  if i:arc+=(c-centers[i-1]).length
  tangent=(centers[min(i+1,len(centers)-1)]-centers[max(i-1,0)]).normalized();ref=Vector((0,1,0)) if abs(tangent.y)<.9 else Vector((1,0,0));u=tangent.cross(ref).normalized();v=tangent.cross(u).normalized();records.append((c,tangent,u,v,arc,radii[i]))
kd=KDTree(len(records))
for i,rec in enumerate(records):kd.insert(rec[0],i)
kd.balance()
def bark_metric_uv(ob):
 uv=ob.data.uv_layers.active or ob.data.uv_layers.new(name='UVMap')
 for face in ob.data.polygons:
  center=sum((ob.data.vertices[i].co for i in face.vertices),Vector())/len(face.vertices);_,ix,_=kd.find(center);c,tangent,u,v,arc,radius=records[ix];angles=[];coords=[]
  for i in face.vertices:
   d=ob.data.vertices[i].co-c;angles.append(math.atan2(d.dot(v),d.dot(u)));coords.append((arc+d.dot(tangent))/2.)
  if max(angles)-min(angles)>pi:angles=[a+2*pi if a<0 else a for a in angles]
  for j,li in enumerate(face.loop_indices):uv.data[li].uv=(angles[j]*max(radius,.06)/2.,coords[j])
for ob in [body,barkflakes]:bark_metric_uv(ob)
# Needle cloud footprints are deliberately concave and unequal. Needle shoots
# occupy a 3D depth band throughout each footprint, not an ellipsoid shell.
outline=[(-1,-.18),(-.92,-.50),(-.67,-.49),(-.58,-.07),(-.19,-.11),(-.10,-.57),(.12,-.54),(.20,-.06),(.55,-.11),(.64,-.48),(1,-.21),(.89,.08),(.96,.28),(.62,.42),(.30,.36),(.08,.55),(-.23,.43),(-.49,.51),(-.72,.24),(-1,.20)]
def inside(x,y):
 c=False;j=len(outline)-1
 for i,a in enumerate(outline):
  b=outline[j]
  if(a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:c=not c
  j=i
 return c
crowns=[dict(name='Main welcoming crown',group='MainCrown',r=1.55,a=-1.85,h=4.30,sr=1.25,sa=.92,thick=.72,shoots=800),dict(name='Small high crown',group='TopCrown',r=.72,a=-1.15,h=6.95,sr=1.02,sa=.58,thick=.60,shoots=550),dict(name='Offset rear crown',group='RearCrown',r=-.74,a=-.15,h=4.60,sr=.83,sa=.65,thick=.58,shoots=450)]
leafdata={name:([],[])for name in ['RearCrown','TopCrown','MainCrown']};leafmats={name:[]for name in leafdata};twigdata={name:([],[])for name in ['RearCrown','TopCrown','MainCrown']}
def twig(v,f,a,b,rad=.010):
 axis=(b-a).normalized();u=axis.cross(Vector((0,0,1))).normalized();w=axis.cross(u).normalized();start=len(v)
 for p,r in [(a,rad),(b,.0025)]:
  for k in range(4):v.append(p+(u*cos(k*pi/2)+w*sin(k*pi/2))*r)
 for k in range(4):f.append((start+k,start+(k+1)%4,start+(k+1)%4+4,start+k+4))
for ci,q in enumerate(crowns):
 v,f=leafdata[q['group']];tv,tf=twigdata[q['group']]
 for i in range(q['shoots']):
  while True:
   u=rng.uniform(-1,1);w=rng.uniform(-.60,.56)
   if inside(u,w):break
  r=q['r']+u*q['sr'];a=q['a']+w*q['sa'];height=q['h']+.42*(1-u*u)+.20*sin(u*pi*1.7+ci*.9)+.16*cos(w*pi*2.2+ci)+rng.uniform(-.12,.18)
  center=P(r,a,height)
  # Outward/upward branch shoots. Adjacent fans have coherent local direction
  # with varied azimuth, avoiding the old lawn/vertical-bristle appearance.
  outward=P(u*.70,w*.85,.46+rng.random()*.28).normalized();outward=(outward+Vector((rng.uniform(-.20,.20),rng.uniform(-.20,.20),rng.uniform(-.05,.08)))).normalized()
  base=center-outward*.13;tip=center+outward*.12;twig(tv,tf,base,tip)
  xaxis=outward.cross(Vector((0,0,1))).normalized();yaxis=outward.cross(xaxis).normalized()
  for k in range(12):
   t=(k+.5)/12;angle=k*2.399963+ci*.8+rng.uniform(-.2,.2);radial=xaxis*cos(angle)+yaxis*sin(angle);direction=(outward*(.28+.36*t)+radial*(.92-.18*t)).normalized();start=base.lerp(tip,t);length=rng.uniform(.115,.205)*(1-.24*abs(t-.6));end=start+direction*length
   end=start+direction*rng.uniform(.175,.285)*(1-.20*abs(t-.6))
   eu=(end.dot(R)-q['r'])/q['sr'];ew=(end.dot(A)-q['a'])/q['sa']
   if (-.58<eu<-.19 and -.85<ew<-.07) or (.20<eu<.55 and -.85<ew<-.06):continue
   side=direction.cross(outward).normalized();other=side.cross(direction).normalized();width=rng.uniform(.0075,.011)
   n=len(v)
   # A solid triangular needle prism: bigger readable pine needles, much less
   # crossing-plane overlap / self-blackening than the first velvet canopy.
   for j in range(3):v.append(start+(side*cos(j*2*pi/3)+other*sin(j*2*pi/3))*width)
   v.append(end)
   f.extend([(n,n+1,n+3),(n+1,n+2,n+3),(n+2,n,n+3),(n+2,n+1,n)])
   material=1 if t>.55 and rng.random()<.30 else 0
   leafmats[q['group']].extend([material]*4)
for name,(v,f)in leafdata.items():
 ob=make('H36 '+name+' directional needle shoots',v,f,needles,groups[name]);ob.data.materials.append(young)
 for face,material in zip(ob.data.polygons,leafmats[name]):face.material_index=material
 for p in ob.data.polygons:p.use_smooth=False
 tv,tf=twigdata[name];ob=make('H36 '+name+' fine woody sprays',tv,tf,bark,groups[name]);
 for p in ob.data.polygons:p.use_smooth=True
# A few supporting stones, embedded into the sampled slope, not a raised base.
for i,(r,a,sx,sy,sz)in enumerate([(-.55,.25,.35,.27,.11),(.45,-.18,.30,.22,.085),(-.25,-.55,.25,.22,.075)]):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1);ob=bpy.context.object;ob.name='H36 embedded slope stone %02d'%i
 for c in list(ob.users_collection):c.objects.unlink(ob)
 coll.objects.link(ob);ob.parent=groups['Trunk'];ob.location=P(r,a,ground_local(r,a)-sz*.20);ob.scale=(sx,sy,sz);ob.data.materials.append(rockmat)
# Fine woody shoot sides also receive a valid UV0 for the shared tangent
# normal map. This changes no vertex positions or physical silhouette.
for ob in list(coll.objects):
 if ob.type=='MESH' and ob.data.materials and ob.data.materials[0]==bark and not ob.data.uv_layers:
  uv=ob.data.uv_layers.new(name='UVMap')
  for face in ob.data.polygons:
   coords=[(0.,0.),(1.,0.),(1.,1.),(0.,1.)]
   for j,li in enumerate(face.loop_indices):uv.data[li].uv=coords[j%4]
# CPU actual crown triangle-ray proof at the fixed follow camera. These are
# visibility sample rays, not a substitute for the shared-scene Cycles render.
bpy.context.view_layer.update()
cv=[];cf=[]
for ob in coll.objects:
 if ob.type=='MESH' and ob.parent==groups['MainCrown']:
  offset=len(cv);cv.extend([ob.matrix_world@v.co for v in ob.data.vertices]);cf.extend([tuple(offset+i for i in f.vertices)for f in ob.data.polygons])
cbvh=BVHTree.FromPolygons(cv,cf,all_triangles=False)
proof=[]
for x,z in [(-6.4,-8.1),(-6.0,-7.4),(-6.0,-6.5)]:
 delta=Vector((x+7,-z-7,0));h=rootY+ground_local(delta.dot(R),delta.dot(A));camera=Vector((x+6,-z-15,h+27));row={'actor_three':[x,h,z],'camera_three':[x+6,h+27,z+15],'points':[]}
 for label,dy in [('head',1.43),('shoulder',1.13),('chest',.94),('hips',.65),('feet',.08)]:
  for side in [-.16,0,.16]:
   # Side offsets across the actual incoming-route body heading.
   heading=-2.665292949204713;wx=x+side*math.cos(heading);wz=z-side*math.sin(heading);target=Vector((wx,-wz,h+dy));direction=target-camera;dist=direction.length;hit=cbvh.ray_cast(camera,direction.normalized(),dist-.02)
   row['points'].append({'part':label,'side':side,'occluded':hit[0]is not None,'hit_blender':list(hit[0])if hit[0]is not None else None})
 proof.append(row)
(out/'route-occlusion-cpu.json').write_text(json.dumps({'scope':'actual MainCrown closed-needle triangles, original fixed follow camera; diagnostic body rays, not native actor mesh or rendered art acceptance','proof':proof},indent=2)+'\n')
# Source is grouped/standard PBR. No stage light, camera, hidden image card or
# vertex colour light is supplied; root assembles shared daylight/Cycles stage.
bpy.context.scene['H36_source']='actual authored mesh and needles; approved pine-002 reference used for pose; existing wood sweep/remesh technique, not rejected H34 geometry';bpy.context.scene['world_mapping']='Blender(X,-ThreeZ,ThreeY)';bpy.context.scene['root_collision_preserved']='worldXZ[-7,-7], radius .72; no physics export'
source=out/'pine-036.blend';bpy.ops.wm.save_as_mainfile(filepath=str(source),compress=True)
bpy.ops.object.select_all(action='DESELECT')
for o in coll.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
asset=out/'pine-036.glb';bpy.ops.export_scene.gltf(filepath=str(asset),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
raw=asset.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);meshes=[o for o in coll.objects if o.type=='MESH'];bounds=[o.matrix_world@v.co for o in meshes for v in o.data.vertices];lo=[min(v[i]for v in bounds)for i in range(3)];hi=[max(v[i]for v in bounds)for i in range(3)]
report={'asset':'PINE-036 revision3 physical wood; random needle crowns rejected source retained','root_three':[-7,rootY,-7],'root_blender':[-7,7,rootY],'shader_materials':[m['name']for m in g['materials']],'glb_bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'triangles':sum(sum(len(f.vertices)-2 for f in o.data.polygons)for o in meshes),'meshes':len(g['meshes']),'world_blender_bounds':[lo,hi],'groups':list(groups),'crowns':crowns,'physical_bark_flakes':flakes,'revision':3,'revision_changes':'wood only: lower bole radius -18 percent, welcoming arm continuous taper -20 to -25 percent, buttress roots lowered and sunk into sampled slope; unchanged random-needle crowns retained as rejected exploration','png_cards':False,'ellipsoid_canopies':False,'vertex_light_colors':False,'paid_generation':False,'render_stage':'root shared Cycles lighting and calibrated camera; no independent preview claimed'}
(out/'model.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('PINE036_READY',json.dumps(report,ensure_ascii=False),flush=True)
