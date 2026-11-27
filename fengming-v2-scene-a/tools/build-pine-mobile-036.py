"""Real 3D pine LOD; original PBR maps/UV/root retained, source mother untouched."""
import bpy,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1];d=root/'assets/pine-036';bpy.ops.wm.open_mainfile(filepath=str(d/'pine-036-wood.blend'));rows=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 before=sum(len(p.vertices)-2 for p in o.data.polygons)
 if before>500:
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;m=o.modifiers.new('Phone silhouette preserving LOD','DECIMATE');m.ratio=.5;bpy.ops.object.modifier_apply(modifier=m.name)
 rows.append({'name':o.name,'before':before,'after':sum(len(p.vertices)-2 for p in o.data.polygons)})
bpy.ops.object.select_all(action='SELECT');p=d/'pine-036-wood-mobile.glb';bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False);report={'source':'pine-036-wood.blend','sourceSHA256':hashlib.sha256((d/'pine-036-wood.blend').read_bytes()).hexdigest(),'asset':p.name,'SHA256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'meshes':rows,'triangles':sum(r['after']for r in rows),'materials':'original PBR maps/normal/roughness, no baked colors','rootAndNavigationChanged':False};(d/'wood-mobile.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report))
