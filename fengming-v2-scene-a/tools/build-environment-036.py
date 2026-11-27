"""H36 rock integration source: real terrain-fitted closed layered masses.
CPU build only. blender -b -t 2 --python tools/build-environment-036.py
Original terrain, nav and CC0 downloads are read only. No rendering.
"""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/environment-036';SRC=OUT/'source/polyhaven';TEX=OUT/'textures'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
kit=bpy.data.collections.new('H36_ENVIRONMENT');bpy.context.scene.collection.children.link(kit)
# Exact original renderer transform; temporary sampling mesh never gets saved.
cache=json.loads((ROOT/'assets/sample-lod/navigation.json').read_text());tr=cache['transforms']['terrain_transform'];B=lambda p:Vector((p[0],-p[2],p[1]))
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/sample-runtime/terrain.glb'));terrain=[o for o in bpy.data.objects if o not in before]
T=Matrix.Translation(B(tr['translation']))@Matrix.Scale(tr['scale'],4)
for o in terrain:
 if o.parent not in terrain:o.matrix_world=T@o.matrix_world
V=[];F=[]
for o in terrain:
 if o.type!='MESH':continue
 start=len(V);V.extend(o.matrix_world@v.co for v in o.data.vertices);F.extend(tuple(start+i for i in p.vertices)for p in o.data.polygons)
terrainBVH=BVHTree.FromPolygons(V,F,all_triangles=False)
def ground(x,z):
 p,n,i,d=terrainBVH.ray_cast(Vector((x,-z,30)),Vector((0,0,-1)),70)
 if p:return p.z
 X=min(80,max(0,round((x+20)/.5)));Z=min(80,max(0,round((z+20)/.5)));return cache['H'][Z*81+X]or 0
for o in terrain:bpy.data.objects.remove(o,do_unlink=True)
# Deterministically bake the SAME linear RGBToBW * slate material operation
# requested by parent. The original CC0 images remain unchanged, UV registered.
import numpy as np
from PIL import Image
for key in ['rock_face_01','rock_face_02']:
 source=TEX/(key+'_diff_2k.jpg');srgb=np.asarray(Image.open(source).convert('RGB'),dtype=np.float32)/255
 lin=np.where(srgb<=.04045,srgb/12.92,((srgb+.055)/1.055)**2.4);bw=lin@np.array([.2126,.7152,.0722],dtype=np.float32)
 for suffix,tint in [('slate',(.62,.77,.80)),('moss',(.43,.60,.46))]:
  c=bw[:,:,None]*np.array(tint,dtype=np.float32);c=np.where(c<=.0031308,c*12.92,1.055*np.maximum(c,0)**(1/2.4)-.055);Image.fromarray(np.uint8(np.clip(c,0,1)*255+.5)).save(TEX/(key+'_'+suffix+'_albedo_2k.png'))
images={}
def image(key,kind):
 filename={'rock':key+'_slate_albedo_2k.png','moss':key+'_moss_albedo_2k.png','rough':key+'_rough_1k.jpg','normal':key+'_nor_gl_1k.png'}[kind];p=TEX/filename
 if str(p)not in images:
  im=bpy.data.images.load(str(p),check_existing=True);im.colorspace_settings.name='sRGB'if kind in['rock','moss']else'Non-Color';images[str(p)]=im
 return images[str(p)]
materials={}
def material(key='rock_face_01',moss=False,body=False):
 token=(key,moss,body)
 if token in materials:return materials[token]
 name=('H36_Moss'if moss else'H36_Rock')+('_Body'if body else'_Scan')+('_Face02'if key.endswith('02')else'')
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;n.clear();L=m.node_tree.links
 out=n.new('ShaderNodeOutputMaterial');p=n.new('ShaderNodeBsdfPrincipled');L.new(p.outputs['BSDF'],out.inputs['Surface']);p.inputs['Metallic'].default_value=0;p.inputs['IOR'].default_value=1.45;p.inputs['Specular IOR Level'].default_value=.20;p.inputs['Roughness'].default_value=.91 if moss else .85
 al=n.new('ShaderNodeTexImage');al.image=image(key,'moss'if moss else'rock');al.interpolation='Linear';L.new(al.outputs['Color'],p.inputs['Base Color'])
 rough=n.new('ShaderNodeTexImage');rough.image=image(key,'rough');L.new(rough.outputs['Color'],p.inputs['Roughness'])
 normal=n.new('ShaderNodeTexImage');normal.image=image(key,'normal');nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.25 if body else .45;L.new(normal.outputs['Color'],nm.inputs['Color']);L.new(nm.outputs['Normal'],p.inputs['Normal'])
 m['semantic']='H36_Moss'if moss else'H36_Rock';m['source']='https://polyhaven.com/a/'+key;m['license']='CC0 1.0';m['albedoTreatment']='Exact parent linear RGBToBW * (.62,.77,.80), moss * (.43,.60,.46), encoded sRGB. No new painted light or fake sun.';materials[token]=m;return m
specs=[
 {'name':'WestVerge','key':'rock_face_01','peak':.46,'outline':[[-4.30,1.53],[-4.30,3.0],[-4.34,4.8],[-4.42,6.5],[-5.5,7.2],[-7.4,7.0],[-9.0,6.0],[-9.7,4.0],[-9.6,2.2],[-8.1,1.60],[-6.3,1.53]]},
 {'name':'EastVerge','key':'rock_face_02','peak':.40,'outline':[[-.70,1.53],[-.70,3.3],[-.60,5.2],[-.45,7.0],[1.4,7.5],[3.9,7.3],[5.1,5.8],[5.2,3.4],[4.2,1.7],[2.0,1.53],[.3,1.53]]},
 {'name':'RearLowRidge','key':'rock_face_02','peak':.34,'outline':[[-11.3,-9.35],[-9.4,-9.20],[-7.7,-9.15],[-5.4,-9.25],[-3.8,-9.6],[-4.4,-10.8],[-7.5,-11.4],[-10.4,-11.3],[-11.7,-10.3]]}
]
summary=[]
def mesh_obj(name,vs,fs):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);kit.objects.link(o);return o

def body(spec):
 outline=spec['outline'];cx=sum(p[0]for p in outline)/len(outline);cz=sum(p[1]for p in outline)/len(outline);N=len(outline);vs=[];fs=[]
 # Closed five-ring cross-section: buried foot, undercut, exposed ledge,
 # sculpted shoulder and upper mass. Wide real faces, never sphere primitives.
 rings=[(1.,-.65),(.995,-.18),(1.0,.09),(.85,.24),(.50,spec['peak'])]
 for ri,(scale,lift)in enumerate(rings):
  for i,(x,z)in enumerate(outline):
   xx=cx+(x-cx)*scale;zz=cz+(z-cz)*scale
   delta=(math.sin(i*1.91+ri*.4)*.028 if ri>1 else 0)
   # Near gameplay boundary, the upper outer lip returns to the exact slope.
   fade=min(1,max(0,(zz-1.51)/.35))if spec['name']!='RearLowRidge'else 1
   yy=ground(xx,zz)+(lift+delta)*(fade if lift>0 else 1)
   vs.append(B((xx,yy,zz)))
 for r in range(len(rings)-1):
  for i in range(N):j=(i+1)%N;fs.append((r*N+i,r*N+j,(r+1)*N+j,(r+1)*N+i))
 center=len(vs);vs.append(B((cx,ground(cx,cz)+spec['peak']+.03,cz)))
 for i in range(N):fs.append((4*N+i,4*N+(i+1)%N,center))
 fs.append(tuple(reversed(range(N))))
 o=mesh_obj('H36_RockBody_'+spec['name'],vs,fs)
 # Recalculate a true solid's outside normals before beveling.
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
 uv=o.data.uv_layers.new(name='H36_world_stone')
 for p in o.data.polygons:
  a=[abs(v)for v in p.normal];axis=max(range(3),key=lambda i:a[i])
  for li in p.loop_indices:
   v=o.data.vertices[o.data.loops[li].vertex_index].co
   uv.data[li].uv=((v.y if axis==0 else v.x)*.29,(v.y if axis==2 else v.z)*.29)
 o.data.materials.append(material(body=True));o['semantic']='H36_Rock';o['H36_role']='Closed terrain-fitted carrier with buried foot and real stratified ledge/shoulder'
 bevel=o.modifiers.new('Actual rounded fracture edges','BEVEL');bevel.width=.045;bevel.segments=2;bevel.limit_method='ANGLE';bevel.angle_limit=.45;bevel.use_clamp_overlap=True
 weighted=o.modifiers.new('Wide plane weighted normals','WEIGHTED_NORMAL');weighted.keep_sharp=True;weighted.weight=35
 # Carrier top receiver, excluding bevel sub-centimetres. Cap edges sit below it.
 recv=BVHTree.FromPolygons([v.co.copy()for v in o.data.vertices],[p.vertices[:]for p in o.data.polygons],all_triangles=False)
 return o,recv,(cx,cz)

def scan(spec,receiver,center):
 key=spec['key']
 with bpy.data.libraries.load(str(SRC/(key+'_1k.blend')),link=False)as(a,b):b.objects=[key]
 o=b.objects[0];kit.objects.link(o);o.name='H36_RockCap_'+spec['name'];o.matrix_world=Matrix.Identity(4)
 for mod in list(o.modifiers):o.modifiers.remove(mod)
 # The photogrammetry front face becomes an actual upward cap. The original
 # irregular perimeter is buried in a closed carrier, not left as a thin slice.
 rotate=Matrix.Rotation(-math.pi/2,4,'X');original=[rotate@v.co for v in o.data.vertices];lo=Vector([min(p[i]for p in original)for i in range(3)]);hi=Vector([max(p[i]for p in original)for i in range(3)])
 cx,cz=center;xs=[p[0]for p in spec['outline']];zs=[p[1]for p in spec['outline']];w=(max(xs)-min(xs))*.76;d=(max(zs)-min(zs))*.70
 boundary={};
 for p in o.data.polygons:
  ids=list(p.vertices)
  for a,b in zip(ids,ids[1:]+ids[:1]):e=tuple(sorted((a,b)));boundary[e]=boundary.get(e,0)+1
 boundaryIDs=set(i for e,c in boundary.items()if c==1 for i in e)
 xy=[]
 for v,p in zip(o.data.vertices,original):xy.append((cx+((p.x-lo.x)/(hi.x-lo.x)-.5)*w,cz-((p.y-lo.y)/(hi.y-lo.y)-.5)*d))
 tree=KDTree(len(boundaryIDs))
 for i,j in enumerate(boundaryIDs):tree.insert(Vector((xy[j][0],xy[j][1],0)),i)
 tree.balance()
 for i,(v,p)in enumerate(zip(o.data.vertices,original)):
  x,z=xy[i];hit=receiver.ray_cast(Vector((x,-z,30)),Vector((0,0,-1)),70)[0];carrier=hit.z if hit else ground(x,z)-.1
  dist=tree.find(Vector((x,z,0)))[2];t=min(1,dist/.28);t=t*t*(3-2*t);relief=(p.z-lo.z)/(hi.z-lo.z)
  v.co=B((x,carrier-.045+t*(.055+.20*relief),z))
 # New shape needs recomputed geometric normals; source custom normals would
 # refer to the original upright scan, not this registered terrain-fit cap.
 if o.data.has_custom_normals:o.data.normals_split_custom_set([(0,0,0)]*len(o.data.loops))
 o.data.update();o.data.materials.clear();o.data.materials.append(material(key));o.data.materials.append(material(key,True))
 for p in o.data.polygons:p.use_smooth=True;p.material_index=1 if p.center.z>ground(p.center.x,-p.center.y)+.46 and p.normal.z>.70 else 0
 for a in list(o.data.color_attributes):o.data.color_attributes.remove(a)
 o['semantic']='H36_Rock';o['H36_role']='Real CC0 scanned top, irregular cut edge buried below continuous closed mass';o['CC0_source']='https://polyhaven.com/a/'+key
 return o
for spec in specs:
 o,recv,center=body(spec);cap=scan(spec,recv,center)
 for ob in[o,cap]:
  ob.data.calc_loop_triangles();ev=[(v.co.x,v.co.z,-v.co.y)for v in ob.data.vertices];summary.append({'name':ob.name,'triangles':len(ob.data.loop_triangles),'engineBounds':[[min(p[i]for p in ev)for i in range(3)],[max(p[i]for p in ev)for i in range(3)]],'role':ob['H36_role']})
for im in images.values():im.filepath='//textures/'+Path(im.filepath).name
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.unit_settings.system='METRIC';scene['append_collection']='H36_ENVIRONMENT';scene['no_render_performed']=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'h36-rock-environment.blend'),compress=True)
bpy.ops.object.select_all(action='DESELECT')
for o in kit.objects:o.select_set(True)
bpy.context.view_layer.objects.active=next(iter(kit.objects))
bpy.ops.export_scene.gltf(filepath=str(OUT/'h36-rock-environment.gltf'),export_format='GLTF_SEPARATE',export_texture_dir='textures/source-gltf',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_normals=True,export_cameras=False,export_lights=False)
report={'revision':'H36 integrated terrain-fit closed layered rock masses, source revision2, not rendered','appendCollection':'H36_ENVIRONMENT','objects':summary,'approach':'Actual original terrain GLB BVH after official world normalization; closed undercut/ledge/shoulder rock carrier with physical .045m bevel. Rotated real scan cap perimeter buried .045m inside that body. No floating/open photogrammetry slices.','backRidge':'Low ridge behind Z=-9.15, actual cap generally <=local ground+.6m; no elevated backdrop next to pine crown.','color':'Exact parent PBR slate RGBToBW(diff)*(.62,.77,.80); no yellow/gold moss. Original images kept unchanged; deterministic baked material operation in new *_slate/moss_albedo files.','unchanged':'Original terrain source, nav, heights, road, bridges, actor, game code untouched. Foreground bodies start Z=1.53, outside safeGround; low rear ridge stays Z<=-9.15.','license':'Official Poly Haven CC0 original full model/texture sources and API/MD5 audit retained under source/polyhaven','privateReferenceIncluded':False}
(OUT/'placement-source.json').write_text(json.dumps(report,indent=2)+'\n');print('H36_RESULT',json.dumps(report))
