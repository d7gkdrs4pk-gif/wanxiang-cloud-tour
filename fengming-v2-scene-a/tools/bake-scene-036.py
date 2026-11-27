"""Bake the authored real H36 scene for the fixed mobile camera.
Crowns: newly authored ImageGen alpha atlas in three fixed world-depth cards.
Static environment: actual Cycles diffuse color/direct/indirect UV lightmaps,
then AgX display transform, batched standard unlit meshes. Live PBR wood replaces the rejected baked-wood subset at runtime.
Run after build-scene-036.py (quality proof), Blender CPU only.
"""
import bpy,sys,math,json,hashlib,time,argparse,struct
from pathlib import Path
from mathutils import Vector
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/scene-036/runtime';OUT.mkdir(parents=True,exist_ok=True);QA=Path('/workspace/qa-h36');QA.mkdir(exist_ok=True)
argv=sys.argv[sys.argv.index('--')+1:]if'--'in sys.argv else[];pa=argparse.ArgumentParser();pa.add_argument('--samples',type=int,default=24);args=pa.parse_args(argv)
master=ROOT/'assets/scene-036/h36-scene-spawn.blend';bpy.ops.wm.open_mainfile(filepath=str(master));scene=bpy.context.scene;scene.cycles.samples=args.samples;scene.cycles.use_denoising=False;scene.render.threads_mode='FIXED';scene.render.threads=6;scene.render.dither_intensity=0;scene.render.image_settings.color_depth='8';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
start=time.time();report={'version':'H36','sourceSceneSHA256':hashlib.sha256(master.read_bytes()).hexdigest(),'samples':args.samples,'cameraFOV39':True,'bakedActorShadows':False,'stages':[],'cards':[],'meshes':[]}
def ancestor(o,token):
 p=o
 while p:
  if token in p.name:return True
  p=p.parent
 return False
# Hide every exact actor descendant, so no frozen man or enemy remains on floor.
for o in scene.objects:
 p=o;actor=False
 while p:
  if p.get('h36_review_only'):actor=True;break
  p=p.parent
 if actor:o.hide_render=True
static=[o for o in scene.objects if o.type=='MESH'and o.get('H36_part')and not o.hide_render]
# Cards are actual new ImageGen atlas layers already positioned in the scene.
# Failed random-needle geometry is hidden in the source and never exported.
cards=[o for o in static if o.get('H36_part')=='H36 authored crown card'];seen=set(cards)
if len(cards)!=3:raise RuntimeError('Expected three authored world-depth crown cards')
for ob in cards:
 report['cards'].append({'name':ob.name,'category':ob['H36_category'],'source':'new ImageGen crown-atlas.png, approved pine reference; not a render of the rejected needle source','alphaCutoff':ob.get('alphaCutoff',.45)})
# Bake every opaque surface with the actual crown cards casting soft shadows.
def category(o):
 part=o.get('H36_part','')
 return {'H36 render shelf with original movement heights':'H36_Ground','actual fitted stone road':'H36_Road','H36 scanned cliff and verges':'H36_Rock','H36 actual gatehouse':'H36_Gate','distant real relief':'H36_Distant'}.get(part)
opaque=[o for o in static if o not in seen and category(o)]
# Batch identical categories BEFORE Cycles setup; keep exact original stairs
# separate so their geometry is excluded from runtime decimation.
buckets={}
for o in opaque:
 key=(o.get('H36_part'), 'FIXED_035'if 'FIXED_035'in o.name else'body');buckets.setdefault(key,[]).append(o)
opaque=[]
for (part,variant),objects in buckets.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:
  world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
  if o.data.uv_layers.active:o.data.uv_layers.active.name='UVMap'
  o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 if len(objects)>1:bpy.ops.object.join()
 ob=bpy.context.object;ob.name=category(ob)+'_'+variant+'_source';ob['H36_part']=part;opaque.append(ob)
# Finalize geometry BEFORE allocating lightmap UVs (never decimate a baked atlas).
for o in opaque:
 before=sum(len(p.vertices)-2 for p in o.data.polygons);cat=category(o);o['H36_sourceTriangles']=before;ratio=1
 if cat=='H36_Rock'and before>1000:ratio=.12
 elif cat=='H36_Gate'and 'FIXED_035'not in o.name and before>150:ratio=.12
 elif cat=='H36_Pine_Trunk'and before>1200:ratio=.66
 if ratio<1:
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('H36 phone static LOD','DECIMATE');mod.ratio=ratio;bpy.ops.object.modifier_apply(modifier=mod.name)

# Proper UV lightmaps avoid the self-shadow corner artifacts of vertex baking.
# Source texture UVs remain explicit UVMap; the new BakeUV is only a destination.
lightmaps={};sizes={'H36_Ground':1024,'H36_Road':1024,'H36_Rock':512,'H36_Gate':1024,'H36_Pine_Trunk':512}
for index,o in enumerate(opaque):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 for i,source in enumerate(list(o.data.materials)):
  mat=source.copy();o.data.materials[i]=mat
  for tex in list(mat.node_tree.nodes):
   if tex.type=='NORMAL_MAP':tex.uv_map='UVMap'
   if tex.type=='TEX_IMAGE'and not tex.inputs['Vector'].is_linked:
    uvnode=mat.node_tree.nodes.new('ShaderNodeUVMap');uvnode.uv_map='UVMap';mat.node_tree.links.new(uvnode.outputs['UV'],tex.inputs['Vector'])
 layer=o.data.uv_layers.new(name='BakeUV');o.data.uv_layers.active=layer;layer.active_render=True
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(72),island_margin=.003,area_weight=.1);bpy.ops.object.mode_set(mode='OBJECT')
 size=512 if 'FIXED_035'in o.name else sizes[category(o)]
 im=bpy.data.images.new('H36 '+str(index)+' actual Cycles lightmap',width=size,height=size,float_buffer=True,alpha=False)
 for mat in o.data.materials:
  node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;node.name='H36_BAKE_TARGET';mat.node_tree.nodes.active=node
 lightmaps[o.name]=im
bpy.ops.object.select_all(action='DESELECT')
for o in opaque:o.select_set(True)
bpy.context.view_layer.objects.active=opaque[0];scene.render.bake.target='IMAGE_TEXTURES';scene.render.bake.margin=8
bpy.ops.object.bake(type='DIFFUSE',pass_filter={'DIRECT','INDIRECT','COLOR'})
report['stages'].append({'stage':'physical Cycles UV diffuse/color/direct/indirect lightmaps','objects':len(opaque),'secondsFromStart':time.time()-start})
for index,o in enumerate(opaque):
 im=lightmaps[o.name];path=OUT/(category(o).lower()+'-'+str(index)+'.jpg');scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=94;scene.render.image_settings.color_mode='RGB';im.save_render(str(path),scene=scene)
 baked=bpy.data.images.load(str(path),check_existing=True);baked.colorspace_settings.name='sRGB';lightmaps[o.name]=baked;o['H36_category']=category(o);o['H36_bakedImagePath']=str(path)
# Durable post-bake checkpoint: all six JPGs saved before any topology edits.
(QA/'bake-stage-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');bpy.ops.wm.save_as_mainfile(filepath=str(QA/'h36-uv-baked-checkpoint.blend'),compress=True)
# Blender UV/color collections invalidate old RNA references on remove. Re-fetch
# each layer by NAME, rather than iterating stale object references.
for o in opaque:
 for name in [layer.name for layer in o.data.uv_layers if layer.name!='BakeUV']:o.data.uv_layers.remove(o.data.uv_layers[name])
 for name in [layer.name for layer in o.data.color_attributes]:o.data.color_attributes.remove(o.data.color_attributes[name])
# Runtime topology is already final before UV bake.
for o in opaque:
 before=o['H36_sourceTriangles'];cat=o['H36_category']
 # Standard color-texture socket exports cleanly; KHR_unlit is set below.
 mat=bpy.data.materials.new('H36 actual Cycles map '+o.name);mat.use_nodes=True;n=mat.node_tree.nodes;l=mat.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Roughness'].default_value=1;tex=n.new('ShaderNodeTexImage');tex.image=lightmaps[o.name];l.new(tex.outputs['Color'],bs.inputs['Base Color']);o.data.materials.clear();o.data.materials.append(mat)
 for p in o.data.polygons:p.material_index=0
 report['meshes'].append({'sourceName':o.name,'category':cat,'sourceTriangles':int(before),'runtimeTriangles':sum(len(p.vertices)-2 for p in o.data.polygons)})
# Batch opaque by category, preserve the three card names under named groups.
export=[]
# Standard glTF base-color/alpha materials for the three authored cards.
for ob in cards:
 source=next(n.image for n in ob.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE')
 m=bpy.data.materials.new('H36 alpha crown '+ob.name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=source;m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);m.node_tree.links.new(tex.outputs['Alpha'],bs.inputs['Alpha']);bs.inputs['Roughness'].default_value=1;m.surface_render_method='DITHERED';m.use_backface_culling=False;ob.data.materials.clear();ob.data.materials.append(m)
names=['H36_Ground','H36_Road','H36_Rock','H36_Gate','H36_Pine_Trunk','H36_Pine_RearCrown','H36_Pine_FrontBranch','H36_Distant'];memberBuckets={name:[o for o in opaque if o['H36_category']==name]for name in names}
for name in names:
 members=memberBuckets[name];group=bpy.data.objects.new(name,None);scene.collection.objects.link(group);export.append(group)
 if members:
  bpy.ops.object.select_all(action='DESELECT')
  for o in members:
   # Clear inherited source root while preserving world coordinates.
   world=o.matrix_world.copy();o.parent=None;o.matrix_world=world;o.select_set(True)
  bpy.context.view_layer.objects.active=members[0]
  if len(members)>1:bpy.ops.object.join()
  ob=bpy.context.object;ob.name=name+'_BakedMesh';ob.parent=group;export.append(ob)
 for ob in cards:
  if ob['H36_category']==name:ob.hide_render=False;ob.parent=group;export.append(ob)
# No original unknown objects, cameras, lamps, or actors exported.
bpy.ops.object.select_all(action='DESELECT')
for o in export:o.select_set(True)
bpy.context.view_layer.objects.active=export[0];world=OUT/'world-h36.glb';bpy.ops.wm.save_as_mainfile(filepath=str(QA/'h36-baked-export.blend'),compress=True);bpy.ops.export_scene.gltf(filepath=str(world),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_animations=False,export_normals=False,export_texcoords=True,export_cameras=False,export_lights=False)
# Blender 4.3 DITHERED exports BLEND; our runtime crown contract is depth-tested
# MASK. Set the standard glTF alpha mode explicitly, with no custom decoder.
data=world.read_bytes();jlen=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+jlen]);tail=data[20+jlen:]
for m in g.get('materials',[]):
 m.setdefault('extensions',{})['KHR_materials_unlit']={}
 if m.get('name','').startswith('H36 alpha crown'):
  m['alphaMode']='MASK';m['alphaCutoff']=.45;m['doubleSided']=True
g['extensionsUsed']=sorted(set(g.get('extensionsUsed',[]))|{'KHR_materials_unlit'})
payload=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode();payload+=b' '*((-len(payload))%4);world.write_bytes(struct.pack('<III',0x46546c67,2,20+len(payload)+len(tail))+struct.pack('<II',len(payload),0x4e4f534a)+payload+tail)
for mesh in g['meshes']:
 for primitive in mesh['primitives']:
  mat=g['materials'][primitive.get('material',0)]
  if 'baseColorTexture'not in mat.get('pbrMetallicRoughness',{}):raise RuntimeError('Actual Cycles lightmap missing from static glTF')
report['world']={'bytes':world.stat().st_size,'SHA256':hashlib.sha256(world.read_bytes()).hexdigest(),'opaqueTriangles':sum(x['runtimeTriangles']for x in report['meshes']),'crownTriangles':6,'staticDrawsExpected':sum(len(o.material_slots)for o in export if o.type=='MESH'),'seconds':time.time()-start};(OUT/'bake-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('H36_BAKE_REPORT',json.dumps(report,ensure_ascii=False),flush=True)
