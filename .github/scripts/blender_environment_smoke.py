"""H.21 environment-only check: Blender CLI -> .blend + GLB + four PNG renders.

This geometry is a diagnostic object, NOT the approved PINE-005 art asset.
No Tripo/paid model endpoint, private Drive access, or production game edits.
"""
import bpy
import json
import hashlib
import pathlib
import struct
import time
from mathutils import Vector

started=time.monotonic()
output=pathlib.Path.cwd()/"fengming-v2-scene-a"/"diagnostics"/"blender-smoke"
output.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.resolution_x=420
scene.render.resolution_y=420
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGBA"
scene.render.film_transparent=False
scene.render.engine="BLENDER_WORKBENCH"
scene.display.shading.light="STUDIO"
scene.display.shading.color_type="MATERIAL"
scene.display.shading.show_shadows=True

wood=bpy.data.materials.new("Smoke_Bark_Material")
wood.diffuse_color=(0.37,0.27,0.17,1.0)
curve=bpy.data.curves.new("S_Bend_Diagnostic_Path","CURVE")
curve.dimensions="3D"
curve.resolution_u=18
curve.bevel_depth=.25
curve.bevel_resolution=3
curve.use_fill_caps=True
spline=curve.splines.new("POLY")
vertices=[(-.8,0,.25),(-1.02,0,.93),(-.86,0,1.69),(-.25,0,2.45),
          (.44,0,3.17),(.64,0,3.95),(.38,0,4.6),(.65,0,5.15)]
spline.points.add(len(vertices)-1)
for i,(x,y,z) in enumerate(vertices):
    spline.points[i].co=(x,y,z,1)
    spline.points[i].radius=max(.17,1.85*(1-i/(len(vertices)-1))+.17)
obj=bpy.data.objects.new("S_Bend_Continuous_Trunk_Smoke_ONLY",curve)
scene.collection.objects.link(obj)
bpy.ops.object.select_all(action="DESELECT")
obj.select_set(True)
bpy.context.view_layer.objects.active=obj
bpy.ops.object.convert(target="MESH")
obj=bpy.context.view_layer.objects.active
obj.data.materials.append(wood)
assert obj.type=="MESH" and len(obj.data.vertices)>32 and len(obj.data.polygons)>24

# This confirms geometry-node APIs are available; it is not a quality guarantee.
geometry_nodes_api=hasattr(bpy.data,"node_groups") and hasattr(bpy.types,"GeometryNodeTree")
if geometry_nodes_api:
    node_group=bpy.data.node_groups.new("Smoke_GeometryNodes_API_Check","GeometryNodeTree")
    assert node_group.bl_idname=="GeometryNodeTree"

# Add a simple diagnostic branch and rock to make different views visibly distinct.
branch=bpy.data.curves.new("One_Test_Branch","CURVE")
branch.dimensions="3D"
branch.bevel_depth=.105
branch.bevel_resolution=3
bsp=branch.splines.new("POLY")
bpts=[(.28,0,3.00),(.84,.16,3.20),(1.48,.34,3.39),(2.12,.48,3.50)]
bsp.points.add(len(bpts)-1)
for i,(x,y,z) in enumerate(bpts):
    bsp.points[i].co=(x,y,z,1);bsp.points[i].radius=max(.13,1.0-i*.24)
branch_object=bpy.data.objects.new("One_Branch_Smoke_ONLY",branch)
scene.collection.objects.link(branch_object)
bpy.ops.object.select_all(action="DESELECT")
branch_object.select_set(True)
bpy.context.view_layer.objects.active=branch_object
bpy.ops.object.convert(target="MESH")
branch_object=bpy.context.view_layer.objects.active
branch_object.data.materials.append(wood)

rock_material=bpy.data.materials.new("Smoke_Rock")
rock_material.diffuse_color=(.32,.38,.34,1)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(-.65,0,.18))
rock=bpy.context.object
rock.name="Diagnostic_Rock"
rock.scale=(.82,.65,.26)
rock.data.materials.append(rock_material)

camera_data=bpy.data.cameras.new("OrthoQA_Camera")
camera=bpy.data.objects.new("OrthoQA_Camera",camera_data)
scene.collection.objects.link(camera)
scene.camera=camera
camera.data.type="ORTHO"
camera.data.ortho_scale=7.7
target=Vector((.0,.0,2.5))
views={
    "front":(0,-11,4.4),
    "right":(11,0,4.4),
    "back":(0,11,4.4),
    "top":(0,-.04,12.5)
}
pictures={}
for label,xyz in views.items():
    camera.location=xyz
    direction=target-camera.location
    camera.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
    png=output/(label+".png")
    scene.render.filepath=str(png)
    bpy.ops.render.render(write_still=True)
    assert png.is_file() and png.stat().st_size>500
    raw=png.read_bytes()
    assert raw.startswith(b"\x89PNG\r\n\x1a\n")
    w,h=struct.unpack(">II",raw[16:24])
    assert (w,h)==(420,420)
    pictures[label]={"pixels":[w,h],"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()}

blend=output/"blender-environment-smoke.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
assert blend.is_file() and blend.stat().st_size>1024

# Export mesh-only diagnostic asset; no camera/rock/scene dependencies.
bpy.ops.object.select_all(action="DESELECT")
obj.select_set(True)
branch_object.select_set(True)
bpy.context.view_layer.objects.active=obj
glb=output/"blender-environment-smoke.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True)
raw=glb.read_bytes()
assert raw[:4]==b"glTF" and struct.unpack_from("<I",raw,8)[0]==len(raw)
chunk,kind=struct.unpack_from("<I4s",raw,12)
assert kind==b"JSON" and 0<chunk<len(raw)-20
gltf=json.loads(raw[20:20+chunk].decode("utf-8").rstrip(" \x00"))
assert len(gltf.get("meshes",[]))>=2
report={
 "stage":"H.21 Blender toolchain / no art acceptance",
 "status":"PASS",
 "blender_version":bpy.app.version_string,
 "blender_version_tuple":list(bpy.app.version),
 "headless":bool(bpy.app.background),
 "geometry_nodes_api":geometry_nodes_api,
 "render_engine":scene.render.engine,
 "gltf_mesh_count":len(gltf["meshes"]),
 "model_glb_bytes":len(raw),
 "model_glb_sha256":hashlib.sha256(raw).hexdigest(),
 "blend_bytes":blend.stat().st_size,
 "views":pictures,
 "elapsed_seconds":round(time.monotonic()-started,1),
 "tripo_credits_spent":0,
 "game_mother_modified":False,
 "scope":"DIAGNOSTIC ONLY; PINE-005 G1 geometry art not yet built/accepted",
 "passed_checks":["blender_cli","headless_bpy","curves_to_mesh",
                 "geometry_nodes_api","save_blend","export_glb",
                 "render_four_views","PNG_GLTF_integrity"]
}
(output/"toolchain-qa.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
print("H21_TOOLCHAIN_PASS "+json.dumps(report,ensure_ascii=False),flush=True)
