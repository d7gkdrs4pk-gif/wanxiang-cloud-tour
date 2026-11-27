"""Export a production wood-only subset; full failed needle exploration is untouched."""
import bpy,pathlib,json,hashlib,struct
out=pathlib.Path.cwd()/'fengming-v2-scene-a/assets/pine-036'
bpy.ops.wm.open_mainfile(filepath=str(out/'pine-036.blend'))
root=bpy.data.objects['H36_PINE_ROOT'];trunk=bpy.data.objects['Trunk'];keep={root,trunk}|set(trunk.children_recursive)
for ob in list(bpy.data.objects):
 if ob not in keep:bpy.data.objects.remove(ob,do_unlink=True)
# The editable source remains physically PBR and packed. No camera/light is added.
bpy.context.scene['H36_source']='wood-only revision3; Poly Haven Pine Bark CC0 / Dimitrios Savva; new image-generated crown layers supplied separately by scene assembly'
bpy.context.scene['H36_crown_status']='old random needle crowns deliberately excluded; retained in full source and qa-h36 rejected revision archive'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'pine-036-wood.blend'),compress=True)
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=root
asset=out/'pine-036-wood.glb';bpy.ops.export_scene.gltf(filepath=str(asset),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
raw=asset.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);bpy.context.view_layer.update();verts=[ob.matrix_world@v.co for ob in keep if ob.type=='MESH' for v in ob.data.vertices]
report={'asset':'PINE-036 wood-only revision3','source':'pine-036-wood.blend','full_exploration_source':'pine-036.blend','root_three':[-7,root.location.z,-7],'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons)for ob in keep if ob.type=='MESH'),'meshes':len(g['meshes']),'glb_bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'world_blender_bounds':[[min(v[i]for v in verts)for i in range(3)],[max(v[i]for v in verts)for i in range(3)]],'materials':[m['name']for m in g['materials']],'bark_source':'https://polyhaven.com/a/pine_bark','bark_license':'CC0 1.0','bark_tile_m':2,'lower_bole_radius_scale':.82,'root_end_below_sampled_ground_m':.075,'collision_change':False,'renderer_validation':'not rendered by asset agent; shared original-camera review pending'}
(out/'wood-model.json').write_text(json.dumps(report,indent=2)+'\n');print('WOOD_READY',json.dumps(report))
for n in ['pine-036.blend1','pine-036-wood.blend1']:(out/n).unlink(missing_ok=True)
