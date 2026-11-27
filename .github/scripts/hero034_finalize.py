import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'fengming-v2-scene-a/assets/hero-034'
# Reload the exact finished one-atlas RGBA paint/AO; source and GLB match game.
image=bpy.data.images.get('林砚H34_手绘AO图集');image.unpack(method='REMOVE')if image.packed_file else None;image.filepath=str(OUT/'linyan-atlas.png');image.reload();image.pack()
for m in bpy.data.materials:
 if not m.use_nodes:continue
 p=m.node_tree.nodes.get('Principled BSDF');n=m.node_tree.nodes.get('H34_ATLAS')
 if p and n:
  n.image=image
  if '统一' in m.name:
   m.node_tree.links.new(n.outputs['Alpha'],p.inputs['Alpha']);m.surface_render_method='DITHERED';m.use_transparent_shadow=True
# Keep only actual model/authoring materials and their packed source image.
bpy.data.orphans_purge(do_recursive=True)
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'linyan-h34.blend'),compress=True)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o.name=='林砚H34_RIG'or o.name=='林砚H34_成品拓扑_蒙皮身体'or o.name.startswith('凤刃_独立_'):o.select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects['林砚H34_RIG']
bpy.ops.export_scene.gltf(filepath=str(OUT/'linyan-h34.glb'),export_format='GLB',use_selection=True,export_animations=True,export_nla_strips=True,export_skins=True,export_yup=True,export_apply=False,export_materials='EXPORT')
print('H34 final AO atlas synchronized, editable .blend and animated GLB updated')
