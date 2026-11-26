"""H.23 PINE-005 incremental sculpt / branch-to-trunk joint refinement.

READ: the already-confirmed H.22 .blend file; do not regenerate approved parts.
WRITE: NEW H23 source+GLB+QA images in assets/pine-005/h23, never the H22
source, PINE-004 GLB, Tripo account or game mother.
"""
import bpy, bmesh, math, json, pathlib, struct, hashlib, time
from mathutils import Vector, noise
from mathutils.kdtree import KDTree

start=time.monotonic()
repo=pathlib.Path.cwd()
source=repo/"fengming-v2-scene-a/assets/pine-005/pine005-trunk.blend"
out=repo/"fengming-v2-scene-a/assets/pine-005/h23"
out.mkdir(parents=True, exist_ok=True)
assert source.is_file() and source.stat().st_size>100000
bpy.ops.wm.open_mainfile(filepath=str(source))
scene=bpy.context.scene

def category(o):
    if o.type!="MESH": return None
    n=o.name
    if n.startswith("MAIN S-TRUNK"):return "trunk"
    if n.startswith("BRANCH "):return "branch"
    if n.startswith("ROOT "):return "root"
    if n.startswith("TWIG "):return "twig"
    return None

original=[o for o in list(scene.objects) if category(o)]
counts={k:sum(category(o)==k for o in original) for k in ("trunk","branch","root","twig")}
assert counts=={"trunk":1,"branch":7,"root":6,"twig":13},counts
old_main=next(o for o in original if category(o)=="trunk")
assert len(old_main.data.vertices)>=5000
# Keep all original source meshes as a frozen editable collection in the
# NEW H23 file. Source H22 blend never changed.
frozen=bpy.data.collections.new("SOURCE_H22_FROZEN__editable_originals")
scene.collection.children.link(frozen)
for o in original:
    for old_coll in list(o.users_collection):
        old_coll.objects.unlink(o)
    frozen.objects.link(o)
    o.hide_render=True
    o.hide_set(True)

refined=bpy.data.collections.new("H23_REFINED__visible_meshes")
scene.collection.children.link(refined)
def duplicate_to_refined(obj, prefix):
    new=obj.copy()
    new.data=obj.data.copy()
    refined.objects.link(new)
    new.name=prefix+obj.name
    new.hide_render=False
    new.hide_set(False)
    new.hide_viewport=False
    return new

# Only join the parts that produce visible pipe-to-pipe seams: MAIN,
# 7 major branches, and 6 primary roots. Fine twigs remain separate so
# they can be surgically adjusted later.
sculpt_parts=[duplicate_to_refined(o,"FUSED_SOURCE__") for o in original
              if category(o) in ("trunk","branch","root")]
twigs=[duplicate_to_refined(o,"H23__") for o in original if category(o)=="twig"]
bpy.ops.object.select_all(action="DESELECT")
for o in sculpt_parts:o.select_set(True)
combined=next(o for o in sculpt_parts if "MAIN S-TRUNK" in o.name)
bpy.context.view_layer.objects.active=combined
bpy.ops.object.join()
combined=bpy.context.view_layer.objects.active
combined.name="H23_CONTINUOUS_TRUNK_MAJOR_BRANCHES_BUTTRESS_ROOTS"
assert len([o for o in refined.objects if o.type=="MESH"])==14
# Voxel union at 5.5cm in artistic Blender units. This merges intersecting
# branch collars into a single surface; it is NOT a metaball/clay lump trick.
combined.data.remesh_voxel_size=.050
bpy.ops.object.voxel_remesh()
polys_before=len(combined.data.polygons)
assert polys_before>7000,("voxel union unexpectedly empty",polys_before)
# Smooth just enough to remove remesh seams. Bark ridges are sculpted after
# smoothing; never repeat the disastrous bulky rope/rounded-dough geometry.
bm=bmesh.new()
bm.from_mesh(combined.data)
for i in range(3):
    bmesh.ops.smooth_vert(bm, verts=bm.verts, factor=.23,
                          use_axis_x=True,use_axis_y=True,use_axis_z=True)
bm.to_mesh(combined.data)
bm.free()
combined.data.update()

# Derive approximate historical trunk axis from the preserved H22 trunk
# mesh (no new S-line, no shape replacement); nearest surface gating
# restricts sculpt to the wood trunk and immediate branch collars.
trunk_centers=[
    (-.25,.13),(-.42,.65),(-.65,1.25),(-.82,1.95),(-.72,2.67),
    (-.38,3.32),(.22,3.87),(.95,4.36),(1.69,4.78),(2.36,5.25),
    (2.86,5.82),(2.62,6.40),(2.96,6.98),(3.35,7.36),(3.66,7.64)]
def center_x(z):
    for i in range(len(trunk_centers)-1):
        x0,z0=trunk_centers[i]
        x1,z1=trunk_centers[i+1]
        if z<=z1:
            return x0+(x1-x0)*max(0,min(1,(z-z0)/(z1-z0)))
    return trunk_centers[-1][0]
tree_center_y=.05

kd=KDTree(len(old_main.data.vertices))
for i,v in enumerate(old_main.data.vertices):
    kd.insert(old_main.matrix_world@v.co,i)
kd.balance()
# The actual surface is not textured yet; these are sculpted bark ribs
# visible in neutral clay. Avoid periodic rings or circular "doughnuts".
normal_sculpt_vertices=0
for v in combined.data.vertices:
    loc=v.co
    if loc.z<=.15 or loc.z>=7.80:
        continue
    _,_,dist=kd.find(loc)
    if dist>.22:
        continue
    theta=math.atan2(loc.y-tree_center_y,loc.x-center_x(loc.z))
    local_noise=noise.noise(Vector((loc.x*.9,loc.y*.8,loc.z*.45)))
    grooves=(
        .71*math.sin(13.0*theta+.46*loc.z+.23*local_noise) +
        .25*math.sin(21.5*theta-.18*loc.z+.4*local_noise) +
        .18*local_noise
    )
    amount=(.032+.013*max(0,1-loc.z/7.7))*grooves
    # Preserve the actual organic collar geometry at branch attachment.
    # Sharp sculpt noise around an attachment creates "cauliflower" lumps
    # even when the underlying union is correct. Fade bark relief in/out
    # smoothly near each attachment instead of building decorative collars.
    attachment_centers=(
        Vector((.86,.10,4.36)),Vector((2.69,.16,6.36)),
        Vector((2.82,.14,6.22)),Vector((1.66,.17,4.73)),
        Vector((2.35,.24,5.20)),Vector((3.22,-.07,7.27)),
        Vector((1.45,.22,4.74))
    )
    nearest_joint=min((loc-p).length for p in attachment_centers)
    x=max(0.0,min(1.0,(nearest_joint-.15)/.67))
    smooth_x=x*x*(3-2*x)
    amount*=.08+.92*smooth_x
    v.co+=v.normal*amount
    normal_sculpt_vertices+=1
combined.data.update()
assert normal_sculpt_vertices>2000,normal_sculpt_vertices
for p in combined.data.polygons:
    p.use_smooth=True

# Detail refinement must not turn into a new random mesh or geometry chaos.
# Limit faces for browser preview without collapsing branch unions.
triangle_est=len(combined.data.polygons)*2
decimated=False
if triangle_est>175000:
    modifier=combined.modifiers.new("H23 mobile review face cap","DECIMATE")
    modifier.ratio=max(.10,175000/triangle_est)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    decimated=True
assert 5000<len(combined.data.polygons)<220000

# Neutral bark CLAY (NOT texture): Workbench material colors only.
# The app's actual independent web viewer overrides this to neutral clay.
bark=bpy.data.materials.get("Mature Pine Bark - brown-grey geometry only")
if bark is None:
    bark=bpy.data.materials.new("H23 Grey-Brown Clay")
    bark.diffuse_color=(.32,.25,.20,1)
combined.data.materials.clear()
combined.data.materials.append(bark)
for t in twigs:
    assert len(t.data.vertices)>10

# Render only refined visible geometry; base source hidden.
scene.render.engine="BLENDER_WORKBENCH"
scene.render.resolution_x=860
scene.render.resolution_y=860
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGB"
scene.display.shading.light="STUDIO"
scene.display.shading.color_type="MATERIAL"
scene.display.shading.background_type="VIEWPORT"
scene.display.shading.background_color=(.75,.76,.73)
scene.display.shading.show_shadows=True
if hasattr(scene.display.shading,"show_cavity"):
    scene.display.shading.show_cavity=True

camera=next((o for o in scene.objects if o.type=="CAMERA"),None)
assert camera is not None
scene.camera=camera
camera.data.type="ORTHO"
camera.data.ortho_scale=13.5
target=Vector((.7,0,4.0))
views={
    "front":(1,-19,8.6),"right":(19,-.4,8.3),
    "back":(.5,19,8.6),"top":(.5,-.02,21.0)
}
stats={}
def render(label,pos,focus=target,scale=13.5):
    camera.data.ortho_scale=scale
    camera.location=pos
    camera.rotation_euler=(focus-camera.location).to_track_quat("-Z","Y").to_euler()
    p=out/(label+".png")
    scene.render.filepath=str(p)
    bpy.ops.render.render(write_still=True)
    raw=p.read_bytes()
    assert raw[:8]==b"\x89PNG\r\n\x1a\n" and struct.unpack(">II",raw[16:24])==(860,860)
    stats[label]={"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()}
for label,loc in views.items():render(label,loc)
render("joint-closeup",Vector((2,-9,5.8)),Vector((1.55,0,4.8)),5.7)

# Front silhouette with real geometry, not an artist's static illustration.
oldmode=scene.display.shading.color_type
oldlighting=scene.display.shading.light
scene.display.shading.color_type="SINGLE"
scene.display.shading.single_color=(.008,.013,.013)
scene.display.shading.light="FLAT"
render("silhouette",views["front"])
scene.display.shading.color_type=oldmode
scene.display.shading.light=oldlighting
# Preserve all 27 frozen originals and edit-friendly refined mesh.
blend=out/"pine005-h23-refined.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
assert blend.is_file() and blend.stat().st_size>100000
# Export only refined union plus its original separate fine branches.
bpy.ops.object.select_all(action="DESELECT")
for o in [combined]+twigs:o.select_set(True)
bpy.context.view_layer.objects.active=combined
glb=out/"pine005-h23-refined.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",
                          use_selection=True,export_apply=True)
raw=glb.read_bytes()
assert raw[:4]==b"glTF" and struct.unpack_from("<I",raw,8)[0]==len(raw)
chunk,kind=struct.unpack_from("<I4s",raw,12)
assert kind==b"JSON" and chunk<len(raw)-20
data=json.loads(raw[20:20+chunk].decode("utf-8").rstrip(" \x00"))
names=[x.get("name","") for x in data.get("nodes",[])]
assert not any("SOURCE__" in x or "QA FLOOR" in x for x in names)
# A continuous integrated trunk + branch root mesh replaces 14 independent
# pipe root source objects in exported GLB.
assert len(data.get("meshes",[]))>=14
report={
    "asset":"PINE-005","stage":"H23 local organic sculpt and branch/root fuse",
    "technical_status":"PASS","visual_status":"PENDING_HUMAN_QA",
    "source_blend":"assets/pine-005/pine005-trunk.blend",
    "source_reference_blob":"9e204263823ca9f40d46737dca5c1ee0a28a73a8",
    "original_frozen_parts":counts,
    "production_meshes":{"fused_trunk_branch_roots":1,"separate_twigs":len(twigs)},
    "voxel_size":.050,"remeshed_faces_initial":polys_before,
    "remeshed_faces_final":len(combined.data.polygons),
    "geometry_bark_ridge_vertices":normal_sculpt_vertices,
    "browser_face_cap_applied":decimated,
    "remesh_joint_scope":"trunk+7 main branches+6 primary roots, no twigs",
    "detail":"sculpted low-relief geometry; no PBR textures or needle canopy",
    "outputs":{"blend_bytes":blend.stat().st_size,"glb_bytes":glb.stat().st_size,
               "glb_sha256":hashlib.sha256(raw).hexdigest(),"meshes":len(data["meshes"]),
               "views":stats},
    "g1a_art_pass":False,"tripo_credits":0,
    "formal_game_modified":False,
    "next_gate":"compare reference / H22 / H23 visual evidence before G1-A decision",
    "elapsed_seconds":round(time.monotonic()-start,2)
}
(out/"h23-qa.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
print("PINE005_H23_TECHNICAL_PASS "+json.dumps(report,ensure_ascii=False),flush=True)
