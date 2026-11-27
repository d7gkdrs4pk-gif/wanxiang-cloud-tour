"""blender --background --factory-startup --python tools/build-gate-035-blend.py"""
import bpy,json,math,os
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
asset=root/'assets/gate-035'
master=Path(os.environ.get('FENGMING_GATE_MASTER_DIR',asset/'source'));master.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(master/'gate-h35.glb'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert len(meshes)==4
tris=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
expected=json.loads((asset/'geometry-qa.json').read_text())['newVisibleTriangles']
assert tris==expected, (tris,expected)
for image in bpy.data.images:
 if image.type=='IMAGE':
  # Resolve from the source atlas as well as the embedded buffer; this keeps
  # the editable master independent of importer lazy image decode behaviour.
  source=asset/'plaque-atlas.png' if 'Noto' in image.name else root/'assets/environment-035/stone-kit-atlas.webp'
  image.source='FILE';image.filepath=str(source);image.reload();image.pack()
  assert image.packed_file and image.size[0]>0 and image.size[1]>0,(image.name,list(image.size))
scene=bpy.context.scene
scene['Revision']='H35 single Chinese gatehouse; original project-authored static meshes'
scene['Runtime source']='sample/gate-roof-finish.js; GLB master has calibrated vertex colors and matte PBR equivalents to engine Lambert'
scene['Collision']='Original assets/sample-lod/navigation.json unchanged; original source GLB retained in repository, hidden in game rendering only'
scene['Stairs']='4048 dense exact nearest-neighbour height samples; see step-height-qa.json'
scene['Source licence']='Original geometry and painted stone; Noto CJK OFL-1.1 used for plaque glyph raster; see README.md'
# Scene camera is a reference setup; game FOV, positions and camera are not changed.
# Three world(X,Y,Z) -> Blender(X,-Z,Y).
def to_blender(v):return Vector((v[0],-v[2],v[1]))
cam_data=bpy.data.cameras.new('Original phone view FOV39')
cam_data.sensor_fit='VERTICAL';cam_data.sensor_height=32;cam_data.lens=32/(2*math.tan(math.radians(39)/2))
cam=bpy.data.objects.new('Reference camera only — unchanged game framing',cam_data);scene.collection.objects.link(cam)
cam.location=to_blender((7.58,27.71465,8));target=to_blender((1.58,.71465,-7));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
sun_data=bpy.data.lights.new('Same sun direction (-8,16,12)','SUN');sun_data.energy=2.2;sun_data.color=(1,.98,.93);sun=bpy.data.objects.new('Reference warm sun',sun_data);scene.collection.objects.link(sun);sun.location=to_blender((-8,16,12));sun.rotation_euler=(-sun.location).to_track_quat('-Z','Y').to_euler()
world=bpy.data.worlds.new('Cool diffuse reference') if not scene.world else scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.19,.23,.25,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7;scene.world=world
scene.render.resolution_x=390;scene.render.resolution_y=844;scene.render.resolution_percentage=100
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16
scene.view_settings.view_transform='AgX'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(master/'gate-h35.blend'),compress=True)
report={'revision':'H35','meshes':len(meshes),'triangles':tris,'materialSlots':sum(len(o.material_slots) for o in meshes),'packedImages':[{'name':im.name,'packed':bool(im.packed_file),'size':list(im.size)} for im in bpy.data.images if im.type=='IMAGE'],'referenceCamera':{'gameFOV':39,'gameOffset':[6,27,15],'blenderLocation':list(cam.location)},'rendered':False,'scope':'Editable source master import/texture packing check only; no rendered image, GPU, game-camera or FPS acceptance'}
(asset/'blend-master-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
