"""H36 asset-first scene assembly and CPU Cycles proof, original game camera.
blender -b --factory-startup --python tools/build-scene-036.py -- --render --view spawn
World input is Three XYZ metres; Blender conversion is X,-Z,Y. No game code edits.
"""
import bpy,bmesh, math, json, sys, argparse, hashlib,struct
from pathlib import Path
from mathutils import Vector,Matrix
root=Path(__file__).resolve().parents[1];out=root/'assets/scene-036';qa=Path('/workspace/qa-h36');out.mkdir(exist_ok=True);qa.mkdir(exist_ok=True)
argsv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser=argparse.ArgumentParser();parser.add_argument('--render',action='store_true');parser.add_argument('--view',default='spawn',choices=['spawn','stairs','under']);parser.add_argument('--samples',type=int,default=48);parser.add_argument('--output',default='');args=parser.parse_args(argsv)
cal=json.loads((out/'calibration.json').read_text());nav=json.loads((root/'assets/sample-lod/navigation.json').read_text())
def B(v):return Vector((v[0],-v[2],v[1]))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=args.samples;scene.cycles.use_denoising=False;scene.cycles.max_bounces=5;scene.cycles.diffuse_bounces=3;scene.cycles.glossy_bounces=2;scene.cycles.transparent_max_bounces=8
scene.render.resolution_x=390;scene.render.resolution_y=844;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.15;scene.view_settings.gamma=1
scene.render.threads_mode='FIXED';scene.render.threads=6
sources=[]
def glb(rel,label,transform=None):
 p=root/rel;before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(p));objs=[o for o in bpy.data.objects if o not in before]
 if transform:
  m=Matrix.Translation(B(transform['translation']))@Matrix.Scale(transform['scale'],4)
  for o in objs:
   if o.parent not in objs:o.matrix_world=m@o.matrix_world
 for o in objs:
  if o.type=='MESH':o['H36_part']=label
 sources.append({'path':rel,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'mode':'GLB geometry'})
 return [o for o in objs if o.type=='MESH']
def append_asset(rel,label):
 p=root/rel
 if not p.exists():return []
 previousImages=set(bpy.data.images)
 col=bpy.data.collections.new(label);scene.collection.children.link(col)
 with bpy.data.libraries.load(str(p),link=False)as(src,dst):dst.objects=list(src.objects)
 for im in bpy.data.images:
  if im not in previousImages and im.source=='FILE'and not im.packed_file:
   candidate=Path(bpy.path.abspath(im.filepath,start=str(p.parent)))
   if not candidate.exists()and im.filepath.startswith('//'):candidate=p.parent/im.filepath[2:]
   if not candidate.exists():raise FileNotFoundError('H36 source texture missing '+str(candidate))
   im.filepath=str(candidate.resolve())
 objs=[]
 for o in dst.objects:
  if o and o.type in {'MESH','EMPTY','ARMATURE'} and not o.hide_render:
   col.objects.link(o);objs.append(o)
   if o.type=='MESH':o['H36_part']=label
 sources.append({'path':rel,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'mode':'editable Blender library'})
 return [o for o in objs if o.type=='MESH']
def material(name,low,high,scale=3,rough=.82,bump=.014):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;n.clear();output=n.new('ShaderNodeOutputMaterial');bs=n.new('ShaderNodeBsdfPrincipled');bs.inputs['Roughness'].default_value=rough;bs.inputs['Specular IOR Level'].default_value=.25;l.new(bs.outputs['BSDF'],output.inputs['Surface'])
 geo=n.new('ShaderNodeNewGeometry');noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=scale;noise.inputs['Detail'].default_value=3;noise.inputs['Roughness'].default_value=.7;l.new(geo.outputs['Position'],noise.inputs['Vector'])
 ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.18;ramp.color_ramp.elements[0].color=(*low,1);ramp.color_ramp.elements[1].position=.82;ramp.color_ramp.elements[1].color=(*high,1);l.new(noise.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs['Color'],bs.inputs['Base Color'])
 fine=n.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=38;fine.inputs['Detail'].default_value=2;l.new(geo.outputs['Position'],fine.inputs['Vector']);b=n.new('ShaderNodeBump');b.inputs['Strength'].default_value=.24;b.inputs['Distance'].default_value=bump;l.new(fine.outputs['Fac'],b.inputs['Height']);l.new(b.outputs['Normal'],bs.inputs['Normal'])
 return m
stone=material('H36 unified cut limestone',(.19,.225,.212),(.29,.32,.29),2.7,.84,.012)
roofmat=material('H36 charcoal celadon ceramic',(.022,.065,.074),(.055,.12,.13),5,.66,.007)
wood=material('H36 weathered dark cedar',(.045,.024,.014),(.12,.070,.033),5.5,.77,.018)
# Terrain uses actual mesh normals for rock/soil selection, never painted paving.
terrainmat=material('H36 real rock and moss ground',(.14,.18,.17),(.25,.28,.24),2.2,.96,.025)
n=terrainmat.node_tree.nodes;l=terrainmat.node_tree.links;bs=next(x for x in n if x.type=='BSDF_PRINCIPLED');geom=next(x for x in n if x.type=='NEW_GEOMETRY')
scale=n.new('ShaderNodeVectorMath');scale.operation='SCALE';scale.inputs[3].default_value=.29;l.new(geom.outputs['Position'],scale.inputs[0])
tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(root/'assets/environment-036/textures/rock_face_01_diff_2k.jpg'),check_existing=True);tex.projection='BOX';tex.projection_blend=.24;l.new(scale.outputs['Vector'],tex.inputs['Vector'])
grey=n.new('ShaderNodeRGBToBW');l.new(tex.outputs['Color'],grey.inputs[0]);tint=n.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(.62,.77,.80,1);l.new(grey.outputs[0],tint.inputs[1])
sep=n.new('ShaderNodeSeparateXYZ');l.new(geom.outputs['Normal'],sep.inputs[0]);ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.64;ramp.color_ramp.elements[0].color=(0,0,0,1);ramp.color_ramp.elements[1].position=.98;ramp.color_ramp.elements[1].color=(.48,.48,.48,1);l.new(sep.outputs['Z'],ramp.inputs[0]);mix=n.new('ShaderNodeMixRGB');mix.blend_type='MIX';l.new(ramp.outputs['Color'],mix.inputs[0]);l.new(tint.outputs[0],mix.inputs[1]);mix.inputs[2].default_value=(.055,.095,.062,1);l.new(mix.outputs[0],bs.inputs['Base Color'])
terrain=glb('assets/sample-runtime/terrain.glb','original real terrain',cal['terrainTransform'])
for o in terrain:
 o.data.materials.clear();o.data.materials.append(terrainmat)
 for p in o.data.polygons:p.use_smooth=True
 # Match the prior render-only grout recess; original geometry source/nav are immutable.
 mask=bpy.data.images.load(str(root/'assets/environment-035/road-bed-mask.png'),check_existing=True);pixels=list(mask.pixels);w,h=mask.size;inv=o.matrix_world.inverted()
 for v in o.data.vertices:
  p=o.matrix_world@v.co;x,z=p.x,-p.y;u=(x+8)/13;vv=(z+9)/18
  if 0<=u<=1 and 0<=vv<=1:
   ix=min(w-1,max(0,round(u*(w-1))));iy=min(h-1,max(0,round(vv*(h-1))));depth=pixels[(iy*w+ix)*4];p.z-=.045*depth;v.co=inv@p
# Render-only continuous mountain shelf, sampled from the same fine ground.
# The old scan's sliced wall fragments are not meaningful landscape forms.
# Cached navigation, exact side steps and the original asset stay untouched.
for o in terrain:o.hide_render=True
meta=json.loads((root/'assets/sample-ground/metadata.json').read_text());raw=(root/'assets/sample-ground/height.f32').read_bytes();hs=struct.unpack('<'+'f'*(len(raw)//4),raw)
def floor_at(x,z):
 u=max(0,min(meta['cols']-1.00001,(x-meta['origin'][0])/meta['step']));v=max(0,min(meta['rows']-1.00001,(z-meta['origin'][1])/meta['step']));i,j=int(u),int(v);tx,tz=u-i,v-j
 vals=[hs[j*meta['cols']+i],hs[j*meta['cols']+i+1],hs[(j+1)*meta['cols']+i],hs[(j+1)*meta['cols']+i+1]]
 good=[p for p in vals if math.isfinite(p)];fallback=sum(good)/len(good)if good else .12;vals=[p if math.isfinite(p) else fallback for p in vals]
 y=(vals[0]*(1-tx)+vals[1]*tx)*(1-tz)+(vals[2]*(1-tx)+vals[3]*tx)*tz
 patch=nav.get('pinePatch');pu=(x-patch['origin'][0])/patch['step'];pv=(z-patch['origin'][1])/patch['step']
 if 0<=pu<patch['cols']-1 and 0<=pv<patch['rows']-1:
  ix,iz=int(pu),int(pv);a,b=pu-ix,pv-iz;values=patch['H'];at=lambda xx,zz:values[zz][xx]if isinstance(values[0],list)else values[zz*patch['cols']+xx]
  q=[at(ix,iz),at(ix+1,iz),at(ix,iz+1),at(ix+1,iz+1)]
  if all(p is not None and math.isfinite(p)for p in q):y=(q[0]*(1-a)+q[1]*a)*(1-b)+(q[2]*(1-a)+q[3]*a)*b
 return y
verts=[];faces=[];nx=64;nz=52
for j in range(nz+1):
 z=-12+j/nz*18
 for i in range(nx+1):
  x=-13.5+i/nx*22;edge=max(-10.5-x,x-5.5,-9.1-z,z-1.5,0)
  # An irregular, rounded eroded rim outside the original legal area, rather
  # than a rectangular cut line exactly on the navigation bounds.
  shelfWidth=max(.30,1.05+.75*math.sin(x*.73+z*.51)+.48*math.sin(x*1.4-z*.83))
  d=max(0,edge-shelfWidth);drop=1.15*d*d/(d+1.10)
  y=floor_at(x,z)-.022-drop
  if edge>.1:y+=.10*math.sin(x*1.7+z*.83)*math.sin(x*.62-z*1.93)*min(1,edge)
  verts.append(B((x,y,z)))
for j in range(nz):
 for i in range(nx):
  a=j*(nx+1)+i;faces.append((a,a+nx+1,a+nx+2,a+1))
me=bpy.data.meshes.new('H36 continuous original-height shelf');me.from_pydata(verts,[],faces);me.update();shelf=bpy.data.objects.new('H36 continuous original-height shelf',me);scene.collection.objects.link(shelf);shelf['H36_part']='H36 render shelf with original movement heights'
# Rock strata and soil blend continuously over actual slope normals and broad
# erosion pockets, not separate hard material bands at a straight edge.
soil=terrainmat.copy();soil.name='H36 continuous weathered slate soil and cliff';n=soil.node_tree.nodes;l=soil.node_tree.links;bs=next(x for x in n if x.type=='BSDF_PRINCIPLED');old=bs.inputs['Base Color'].links[0].from_socket;geo=next(x for x in n if x.type=='NEW_GEOMETRY')
no=n.new('ShaderNodeTexNoise');no.inputs['Scale'].default_value=.95;no.inputs['Detail'].default_value=2;l.new(geo.outputs['Position'],no.inputs['Vector']);ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.068,.087,.079,1);ramp.color_ramp.elements[1].color=(.14,.16,.125,1);l.new(no.outputs['Fac'],ramp.inputs[0]);sp=n.new('ShaderNodeSeparateXYZ');l.new(geo.outputs['Normal'],sp.inputs[0]);threshold=n.new('ShaderNodeMapRange');threshold.inputs['From Min'].default_value=.62;threshold.inputs['From Max'].default_value=.96;threshold.clamp=True;l.new(sp.outputs['Z'],threshold.inputs[0]);product=n.new('ShaderNodeMath');product.operation='MULTIPLY';l.new(threshold.outputs[0],product.inputs[0]);l.new(no.outputs['Fac'],product.inputs[1]);blend=n.new('ShaderNodeMixRGB');l.new(product.outputs[0],blend.inputs[0]);l.new(old,blend.inputs[1]);l.new(ramp.outputs[0],blend.inputs[2]);l.new(blend.outputs[0],bs.inputs['Base Color']);me.materials.append(soil)
for p in me.polygons:p.use_smooth=True
road=glb('assets/environment-035/source/road-kit-h35.glb','actual fitted stone road')
for o in road:o.data.materials.clear();o.data.materials.append(stone)
rocks=append_asset('assets/environment-036/h36-rock-environment.blend','H36 scanned cliff and verges')
for o in rocks:
 if 'BackRidge'in o.name or'RearLowRidge'in o.name:o.hide_render=True
# Two authored closed strata masses support the tree without the rejected
# upright backdrop slab. Both stay outside the retained character route.
for index,(cx,cz,rx,rz,height)in enumerate([(-7.13,-7.10,.49,.43,.32),(-7.45,-10.05,1.85,.76,.86)]):
 verts=[];faces=[];N=7;cy=floor_at(cx,cz)
 for layer,(rad,y,shift)in enumerate([(1.0,cy-.40,0),(1.0,cy+height*.52,.04),(.70,cy+height,.16)]):
  for i in range(N):
   angle=2*math.pi*i/N+.10;rr=rad*(1+.10*math.sin(i*2.3+index));verts.append(B((cx+math.cos(angle)*rx*rr+shift,y+.07*math.sin(i*2.1+layer),cz+math.sin(angle)*rz*rr)))
 for layer in range(2):
  for i in range(N):a=layer*N+i;b=layer*N+(i+1)%N;faces.append((a,b,b+N,a+N))
 faces.extend([tuple(reversed(range(N))),tuple(range(2*N,3*N))]);me=bpy.data.meshes.new('H36 pine bedrock strata');me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new('H36 embedded pine bedrock '+str(index),me);scene.collection.objects.link(ob);me.materials.append(terrainmat);ob['H36_part']='H36 scanned cliff and verges'
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();me.update()
 bevel=ob.modifiers.new('soft real rock corners','BEVEL');bevel.width=.055;bevel.segments=2;bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.modifier_apply(modifier=bevel.name);ob.select_set(False)
gate=append_asset('assets/gate-036/source/gate-h36.blend','H36 actual gatehouse')
if not gate:raise RuntimeError('H36 authored gate source missing')
# New semantic materials get one shared art direction; licensed rock PBR keeps its own UV.
for o in gate:
 for i,m in enumerate(o.data.materials):
  name=m.name.lower() if m else ''
  if any(k in name for k in ['roof','tile','瓦']):o.data.materials[i]=roofmat
  elif any(k in name for k in ['wood','timber','木']):o.data.materials[i]=wood
  elif any(k in name for k in ['stone','rock','石']):o.data.materials[i]=stone
pine=append_asset('assets/pine-036/pine-036-wood.blend','H36 actual pine')
if not pine:raise RuntimeError('H36 authored pine wood source missing')
# Failed random-needle source remains editable separately, not in the accepted
# scene. Actual game cards use the newly authored alpha atlas; never an H29 image.
for o in pine:
 p=o;isCrown=False
 while p:
  if any(k in p.name for k in ['MainCrown','TopCrown','RearCrown']):isCrown=True;break
  p=p.parent
 if isCrown:o.hide_render=True
R=Vector((.9284766909,.3713906764,0));A=Vector((-.3713906764,.9284766909,0));F=Vector((6,-15,27)).normalized();U=F.cross(R).normalized()
def card(name,center,right,up,width,height,image,uvbounds,role,cutoff=None):
 pts=[center-right*width/2-up*height/2,center+right*width/2-up*height/2,center+right*width/2+up*height/2,center-right*width/2+up*height/2]
 me=bpy.data.meshes.new(name+' world-depth plane');me.from_pydata(pts,[],[(0,1,2,3)]);me.update();uv=me.uv_layers.new(name='UVMap');u0,v0,u1,v1=uvbounds
 for li,q in zip(me.polygons[0].loop_indices,[(u0,v0),(u1,v0),(u1,v1),(u0,v1)]):uv.data[li].uv=q
 ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob);ob['H36_part']=role
 m=bpy.data.materials.new(name+' authored layered texture');m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;n.clear();output=n.new('ShaderNodeOutputMaterial');em=n.new('ShaderNodeEmission');tex=n.new('ShaderNodeTexImage');tex.image=image;l.new(tex.outputs['Color'],em.inputs['Color']);em.inputs['Strength'].default_value=.9;trans=n.new('ShaderNodeBsdfTransparent');mix=n.new('ShaderNodeMixShader');alpha=tex.outputs['Alpha']
 if cutoff is not None:
  test=n.new('ShaderNodeMath');test.operation='GREATER_THAN';test.inputs[1].default_value=cutoff;l.new(alpha,test.inputs[0]);alpha=test.outputs[0];ob['alphaCutoff']=cutoff
 if role=='H36 authored crown card':
  path=n.new('ShaderNodeLightPath');physical=n.new('ShaderNodeBsdfPrincipled');physical.inputs['Roughness'].default_value=.95;l.new(tex.outputs['Color'],physical.inputs['Base Color']);choice=n.new('ShaderNodeMixShader');l.new(path.outputs['Is Camera Ray'],choice.inputs[0]);l.new(physical.outputs['BSDF'],choice.inputs[1]);l.new(em.outputs[0],choice.inputs[2]);surface=choice.outputs[0]
 else:
  ob.visible_diffuse=False;ob.visible_glossy=False;ob.visible_transmission=False;ob.visible_shadow=False;surface=em.outputs[0]
 l.new(alpha,mix.inputs[0]);l.new(trans.outputs[0],mix.inputs[1]);l.new(surface,mix.inputs[2]);l.new(mix.outputs[0],output.inputs['Surface']);me.materials.append(m);return ob
atlas=bpy.data.images.load(str(root/'assets/pine-036/art/crown-atlas.png'),check_existing=True)
for name,r,a,h,w,H,uv in [('MainCrown',1.40,-1.10,4.95,5.0,1.48,(0,.59,1,1)),('TopCrown',1.05,-1.19,7.45,4.2,1.45,(.13,.30,.86,.59)),('RearCrown',-.35,.22,5.20,3.1,1.12,(.10,0,.90,.30))]:
 center=Vector((-7,7,.15297319))+R*r+A*a+Vector((0,0,h));ob=card(name,center,R,U,w,H,atlas,uv,'H36 authored crown card',.45);ob['H36_category']='H36_Pine_FrontBranch'if name=='MainCrown'else'H36_Pine_RearCrown'
sources.append({'path':'assets/pine-036/art/crown-atlas.png','sha256':hashlib.sha256((root/'assets/pine-036/art/crown-atlas.png').read_bytes()).hexdigest(),'mode':'new ImageGen authored three-crown alpha atlas; real world-depth layers, not a whole-scene background or H29 screenshot'})
# Reuse the owned Chinese distant-mountain art, on two separate world layers.
# This replaces the failed generated clay-dune relief without changing the view.
mountain=bpy.data.images.load(str(root/'assets/sample-runtime/mountain-atlas.webp'),check_existing=True)
for i,(w,h,pos)in enumerate([(67,16.7,(-5,-24.5,-37)),(54,13.5,(-7,-24.5,-27))]):
 card('H36 distant authored mountain '+str(i),B(pos),R,Vector((0,0,1)),w,h,mountain,(0,.5 if i==0 else 0,1,1 if i==0 else .5),'H36 distant authored layer')
# Shared outdoor illumination. World colour for camera is separated from skylight intensity.
world=bpy.data.worlds.new('H36 open daylight');world.use_nodes=True;scene.world=world;n=world.node_tree.nodes;l=world.node_tree.links;n.clear();output=n.new('ShaderNodeOutputWorld');sky=n.new('ShaderNodeBackground');sky.inputs['Color'].default_value=(.56,.69,.80,1);sky.inputs['Strength'].default_value=.38;cameraSky=n.new('ShaderNodeBackground');cameraSky.inputs['Color'].default_value=(.44,.59,.68,1);cameraSky.inputs['Strength'].default_value=.8;path=n.new('ShaderNodeLightPath');mix=n.new('ShaderNodeMixShader');l.new(path.outputs['Is Camera Ray'],mix.inputs[0]);l.new(sky.outputs[0],mix.inputs[1]);l.new(cameraSky.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],output.inputs[0])
sunD=bpy.data.lights.new('H36 actual soft daylight','SUN');sunD.energy=2.8;sunD.angle=math.radians(6);sunD.color=(1,.95,.84);sun=bpy.data.objects.new('H36 actual soft daylight',sunD);scene.collection.objects.link(sun);sun.location=B(cal['sun']);sun.rotation_euler=(-sun.location).to_track_quat('-Z','Y').to_euler()
# Read existing actual gameplay positions for diagnostic viewpoints.
position=cal['position'];yaw=cal['heading'];camera=cal['camera'];heroPhase=0
if args.view!='spawn':
 data=json.loads((root/'evidence/h35/sample-playtest.json').read_text());name='step-top' if args.view=='stairs' else 'under-branch';s=next(x['state']for x in data['steps']if x['name']==name);position=s['position'];yaw=s['rotation'];camera=[position[i]+[6,27,15][i]for i in range(3)]
# Actors are exact project assets and pose interfaces, never proxy spheres.
sys.path.insert(0,str(root.parent/'.github/scripts'))
try:
 from h36_scene_actors import append_linyan,append_enemy,set_hero_pose
 hero=append_linyan();hero.place(tuple(position),yaw);set_hero_pose(hero,'Idle',0)
 foe=append_enemy();foe.place((2.8,.03,-6.6),-2.06)
except Exception as e:
 print('ACTOR LOAD ERROR',repr(e));raise
camD=bpy.data.cameras.new('Original FOV39 portrait');camD.sensor_fit='VERTICAL';camD.sensor_height=32;camD.lens=32/(2*math.tan(math.radians(39)/2));cam=bpy.data.objects.new('Original FOV39 portrait',camD);scene.collection.objects.link(cam);cam.location=B(camera);target=B(position);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
bpy.context.view_layer.update();bpy.context.preferences.filepaths.save_version=0
scene['H36 scope']='asset-first real Cycles scene; all assets exportable; no game camera/scale/nav edits';scene['H35 camera calibration']=json.dumps(cal);scene['H36 source list']=json.dumps(sources)
filepath=out/('h36-scene-'+args.view+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(filepath),compress=True);bpy.ops.file.make_paths_relative();bpy.ops.wm.save_as_mainfile(filepath=str(filepath),compress=True)
report={'view':args.view,'resolution':[390,844],'FOV':39,'position':position,'camera':camera,'heading':yaw,'sources':sources,'meshObjects':len([o for o in scene.objects if o.type=='MESH']),'triangles':sum(len(p.vertices)-2 for o in scene.objects if o.type=='MESH'for p in o.data.polygons),'engine':'Cycles CPU','samples':args.samples,'realLightAndShadows':True,'temporaryPlaceholders':any('TEMP' in o.get('H36_part','')for o in scene.objects),'rendered':args.render}
(qa/('scene-'+args.view+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
if args.render:
 scene.render.filepath=args.output or str(qa/('h36-'+args.view+'.png'));bpy.ops.render.render(write_still=True)
print('H36 SCENE REPORT',json.dumps(report,ensure_ascii=False))
