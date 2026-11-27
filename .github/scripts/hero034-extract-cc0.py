"""Offline CC0 VRoid head/hands extraction. Run with Blender 4.3, no rendering.
Preserves original UV/material/image data. Does not write production files.
"""
import bpy, json, struct, pathlib, hashlib, copy, math, re
from mathutils import Matrix, Vector, Quaternion

OUT=pathlib.Path('/workspace/qa-h34/hero');OUT.mkdir(parents=True,exist_ok=True)
SOURCE=pathlib.Path('/workspace/qa-h31-character/HairSample_Male.vrm')
raw=SOURCE.read_bytes();jn=struct.unpack_from('<I',raw,12)[0]
g=json.loads(raw[20:20+jn]);binary=bytearray(raw[28+jn:])
meta=copy.deepcopy(g['extensions']['VRM']['meta'])
assert meta['title']=='HairSample_Male' and meta['licenseName']=='CC0'
original=copy.deepcopy(g)

def read_accessor(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']]
 width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 code={5121:'B',5123:'H',5125:'I',5126:'f'}[a['componentType']]
 size=struct.calcsize('<'+code)*width;stride=v.get('byteStride',size)
 start=v.get('byteOffset',0)+a.get('byteOffset',0)
 return [struct.unpack_from('<'+code*width,binary,start+i*stride) for i in range(a['count'])]

def new_index(values):
 while len(binary)%4:binary.append(0)
 start=len(binary);binary.extend(struct.pack('<'+'I'*len(values),*values))
 vi=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(values)*4,'target':34963})
 ai=len(g['accessors']);g['accessors'].append({'bufferView':vi,'componentType':5125,'count':len(values),'type':'SCALAR','min':[min(values)],'max':[max(values)]})
 return ai

# glTF data authoritatively separates skin patches: Body primitive 2 is hands;
# primitive 3 is the missing back-skull patch. Keep Face's whole 10 materials.
hands=original['meshes'][1]['primitives'][2]
P=read_accessor(hands['attributes']['POSITION']);I=[x[0] for x in read_accessor(hands['indices'])]
g['meshes']=[copy.deepcopy(original['meshes'][0])]
g['meshes'][0]['name']='head_face_original'
back=copy.deepcopy(original['meshes'][1]['primitives'][3])
g['meshes'].append({'name':'head_back_original','primitives':[back]})
for side,sign in [('left',-1),('right',1)]:
 selected=[]
 for i in range(0,len(I),3):
  tri=I[i:i+3]
  if sign*sum(P[k][0] for k in tri)>0:selected.extend(tri)
 primitive=copy.deepcopy(hands);primitive['indices']=new_index(selected)
 g['meshes'].append({'name':side+'_hand_original','primitives':[primitive]})

# Preserve skeleton nodes so importer reads original bind skin transforms.
# Make renderable part nodes explicit and remove modern clothes/hair meshes.
for n in g['nodes']:n.pop('mesh',None);n.pop('skin',None)
new_nodes=[]
for name,mi,skin in [('head_face_original',0,0),('head_back_original',1,1),('left_hand_original',2,1),('right_hand_original',3,1)]:
 ni=len(g['nodes']);g['nodes'].append({'name':name,'mesh':mi,'skin':skin});new_nodes.append(ni)
for scene in g['scenes']:scene['nodes']=[x for x in scene.get('nodes',[]) if x not in [0,1,94]]+new_nodes

# Extract original encoded pixels, without resampling or color conversion.
texture_dir=OUT/'textures';texture_dir.mkdir(exist_ok=True)
image_records=[]
for i,image in enumerate(g.get('images',[])):
 if 'bufferView' not in image:continue
 view=g['bufferViews'][image['bufferView']];start=view.get('byteOffset',0);pixels=bytes(binary[start:start+view['byteLength']])
 ext='.jpg' if image.get('mimeType')=='image/jpeg' else '.png'
 name=re.sub(r'[^a-zA-Z0-9_-]+','_',image.get('name','texture'))[:55]
 dest=texture_dir/(f'{i:02d}_{name}'+ext);dest.write_bytes(pixels)
 image_records.append({'index':i,'path':str(dest),'sha256':hashlib.sha256(pixels).hexdigest(),'bytes':len(pixels)})
 image.pop('bufferView',None);image.pop('mimeType',None);image['uri']='textures/'+dest.name
g['buffers'][0]['byteLength']=len(binary)
# Blender imports standard glTF material data. VRM metadata remains separately
# recorded, not required by the mesh importer or this editable derivative.
g.pop('extensions',None);g['extensionsUsed']=[x for x in g.get('extensionsUsed',[]) if x!='VRM'];g['extensionsRequired']=[x for x in g.get('extensionsRequired',[]) if x!='VRM']
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
while len(binary)%4:binary.append(0)
filtered=OUT/'cc0-parts-source.glb'
filtered.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(filtered),import_pack_images=True)
meshes={o.name:o for o in bpy.context.scene.objects if o.type=='MESH'}
meshes={name:meshes[name]for name in ['head_face_original','head_back_original','left_hand_original','right_hand_original']}
for obj in meshes.values():
 bpy.context.view_layer.objects.active=obj;bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
 if obj.data.shape_keys:obj.shape_key_clear()
 world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
 for mod in list(obj.modifiers):obj.modifiers.remove(mod)
 # Import already converts G(x,y,z) to B(x,-z,y). VRM0 faces G-Z;
 # rotate B-Z by pi so the extracted parts face Three +Z (= Blender -Y).
 transform=Matrix.Rotation(math.pi,4,'Z') @ obj.matrix_world
 obj.data.transform(transform);obj.matrix_world=Matrix.Identity(4)

face=meshes['head_face_original'];back=meshes['head_back_original']
bpy.ops.object.select_all(action='DESELECT');face.select_set(True);back.select_set(True);bpy.context.view_layer.objects.active=face;bpy.ops.object.join()
face.name='head_high';meshes['left_hand_original'].name='left_hand_high';meshes['right_hand_original'].name='right_hand_high'
parts=[face,meshes['left_hand_original'],meshes['right_hand_original']]
for obj in list(bpy.context.scene.objects):
 if obj not in parts:bpy.data.objects.remove(obj,do_unlink=True)

high=bpy.data.collections.new('CC0_HIGH_ORIGINAL_UV');bpy.context.scene.collection.children.link(high)
low=bpy.data.collections.new('LOW');bpy.context.scene.collection.children.link(low)

# Bake finger poses directly through source glTF weights. This is CPU linear
# skinning from the original bind hierarchy, not a new rig or final character.
parents={child:i for i,node in enumerate(original['nodes'])for child in node.get('children',[])}
convert=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
convert=Matrix.Rotation(math.pi,4,'Z')@convert
def joint_world(posed=False):
 cache={}
 def node_matrix(i):
  if i in cache:return cache[i]
  node=original['nodes'][i];translation=Vector(node.get('translation',[0,0,0]));rotation=node.get('rotation',[0,0,0,1]);quat=Quaternion((rotation[3],rotation[0],rotation[1],rotation[2]));scale=Vector(node.get('scale',[1,1,1]))
  local=Matrix.LocRotScale(translation,quat,scale)
  name=node.get('name','')
  if posed and re.match(r'J_Bip_[LR]_(Index|Middle|Ring|Little|Thumb)[123]$',name):
   side=name.split('_')[2];segment=int(name[-1]);right=side=='R';thumb='Thumb'in name
   degrees=([25,45,25]if thumb else[65,85,35])if right else([15,25,15]if thumb else[25,35,20])
   local=local@Matrix.Rotation(math.radians(degrees[segment-1])*(-1 if right else 1),4,'Z')
  cache[i]=(node_matrix(parents[i])if i in parents else Matrix.Identity(4))@local
  return cache[i]
 for i in range(len(original['nodes'])):node_matrix(i)
 return cache
rest_world=joint_world(False);posed_world=joint_world(True)
deformation={original['nodes'][i].get('name',''):convert@posed_world[i]@rest_world[i].inverted()@convert.inverted()for i in rest_world}
wrist_positions={side:(convert@rest_world[i]).translation for side,i in [('left',38),('right',62)]}
def pose_fingers(obj):
 names={vg.index:vg.name for vg in obj.vertex_groups}
 for vertex in obj.data.vertices:
  point=vertex.co.copy();result=Vector((0,0,0));total=0
  for item in vertex.groups:
   transform=deformation.get(names[item.group])
   if transform is not None:result+=(transform@point)*item.weight;total+=item.weight
  if total>1e-8:vertex.co=result/total
 obj.data.update()

for obj in parts:
 for collection in list(obj.users_collection):collection.objects.unlink(obj)
 high.objects.link(obj)
 for p in obj.data.polygons:p.use_smooth=True
 obj['source']='HairSample_Male beta; CC0; original UV and original encoded image pixels retained'
 obj['facing']='Three +Z = Blender -Y';obj['coordinate_conversion']='B(x,-z,y), then Blender Z rotation pi'
 obj.hide_render=True;obj.hide_set(True)
 duplicate=obj.copy();duplicate.data=obj.data.copy();duplicate.name=obj.name.replace('_high','');low.objects.link(duplicate);duplicate.hide_set(False);duplicate.hide_render=False
 if 'hand'in duplicate.name:pose_fingers(duplicate)
 bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=duplicate;duplicate.select_set(True)
 modifier=duplicate.modifiers.new('Editable light topology','DECIMATE');modifier.ratio=.65 if duplicate.name=='head' else .5
 modifier.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=modifier.name)

def info(obj):
 obj.data.calc_loop_triangles();pts=[obj.matrix_world@Vector(v) for v in obj.bound_box]
 three=[Vector((p.x,p.z,-p.y))for p in pts]
 result={'name':obj.name,'vertices':len(obj.data.vertices),'triangles':len(obj.data.loop_triangles),'bbox_blender':{'min':[min(p[i] for p in pts)for i in range(3)],'max':[max(p[i] for p in pts)for i in range(3)]},'bbox_three_world':{'min':[min(p[i]for p in three)for i in range(3)],'max':[max(p[i]for p in three)for i in range(3)]},'material_slots':[m.name for m in obj.data.materials],'uv_layers':[x.name for x in obj.data.uv_layers],'source_vertex_groups':[x.name for x in obj.vertex_groups],'shape_keys':bool(obj.data.shape_keys),'armature_modifiers':sum(m.type=='ARMATURE' for m in obj.modifiers)}
 name=obj.name.lower()
 if 'hand'in name:
  side='left'if name.startswith(('left','hand_l'))else'right';wrist=wrist_positions[side];result['source_wrist_blender']=list(wrist);result['source_wrist_three_world']=[wrist.x,wrist.z,-wrist.y];result['bbox_relative_to_source_wrist_blender']={'min':[min(p[i]-wrist[i]for p in pts)for i in range(3)],'max':[max(p[i]-wrist[i]for p in pts)for i in range(3)]};result['grip_pose']='original T hand'if '_high'in name else'right curled 65/85/35deg; thumb25/45/25deg'if side=='right'else'left relaxed 25/35/20deg; thumb15/25/15deg'
 if 'source_wrist_three_world'in result:
  wrist=result['source_wrist_three_world'];box=result['bbox_three_world'];result['bbox_relative_to_source_wrist_three']={key:[p-w for p,w in zip(box[key],wrist)]for key in ['min','max']}
 return result

# Store relative textures and a packed copy, so .blend can be appended alone.
for image in bpy.data.images:
 if image.source=='FILE' and image.size[0]>0:
  try:image.pack()
  except RuntimeError:pass
for obj in low.objects:obj.name={'head':'Head_Low','left_hand':'Hand_L_Low','right_hand':'Hand_R_Low'}[obj.name]
high.hide_render=True
for collection in list(bpy.data.collections):
 if collection not in [high,low] and not collection.objects and not collection.children:bpy.data.collections.remove(collection)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cc0-parts.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in low.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=low.objects.get('Head_Low')
bpy.ops.export_scene.gltf(filepath=str(OUT/'cc0-parts.glb'),export_format='GLB',use_selection=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_animations=False,export_skins=False,export_yup=True)

report={'source':str(SOURCE),'source_sha256':hashlib.sha256(raw).hexdigest(),'license':'CC0 1.0','official_license':'https://vroid.pixiv.help/hc/en-us/articles/4402614652569-Do-VRoid-Studio-s-sample-models-come-with-conditions-of-use','original_download':'https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/beta/HairSample_Male.vrm','VRM_meta':meta,'blender':bpy.app.version_string,'facing':'Three +Z / Blender -Y','coordinate_conversion':'Blender importer B(x,-z,y); then Rz(pi) to turn original VRM0 -Z toward Three +Z','source_parts':{'head':'node0 mesh0 Face.baked all10 primitives + node1 mesh1 Body.baked primitive3 (backskull)','left_hand':'node1 mesh1 Body.baked primitive2; original glTF x<0 triangles','right_hand':'node1 mesh1 Body.baked primitive2; original glTF x>0 triangles'},'bone_mapping':{'head':'node16 J_Bip_C_Head','neck':'node15 J_Bip_C_Neck','left_hand':'node38 J_Bip_L_Hand plus 15 finger bones','right_hand':'node62 J_Bip_R_Hand plus 15 finger bones'},'high':[info(o)for o in high.objects],'game':[info(o)for o in low.objects],'textures':image_records,'outputs':['cc0-parts.blend','cc0-parts.glb'],'notes':['Not final Lin Yan: blue anime eyes and youthful makeup intentionally retained as editable source; parent is responsible for adult masculine resculpt and painted atlas.','No modern hair or clothing, no animation, no armature; original vertex groups retained as source bone labels.','Mesh origins at source global zero; coordinates are in source meters, without height rescaling.','High original collection hidden in viewport/render; game editable collection visible.']}
(OUT/'cc0-parts-provenance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(OUT/'metadata.json').write_text(json.dumps({'blend':'cc0-parts.blend','glb':'cc0-parts.glb','low_collection':'LOW','high_collection':high.name,'source':report['source'],'source_sha256':report['source_sha256'],'license':'CC0','official_license':report['official_license'],'facing':report['facing'],'coordinate_conversion':report['coordinate_conversion'],'unit_scale':1.0,'bone_mapping':report['bone_mapping'],'low_objects':report['game'],'high_objects':report['high'],'notes':report['notes']},ensure_ascii=False,indent=2)+'\n')
print('CC0_EXTRACTION_RESULT '+json.dumps({k:report[k]for k in ['blender','facing','high','game']},ensure_ascii=False))
