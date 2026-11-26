"""H.24 — incremental anatomy refinement from latest PINE-005 H23 Blender mother.
No whole-tree regeneration. No Tripo/API. No canopy or textures.
Fix radial spike roots, evenly spaced axial grooves, and ruler-straight main limbs.
Review-only G1-A technical asset; no automatic art acceptance.
"""
import bpy, math, json, pathlib, time, struct, hashlib
from mathutils import Vector, noise
from mathutils.kdtree import KDTree

started=time.monotonic()
repo=pathlib.Path.cwd()
parent=repo/"fengming-v2-scene-a/assets/pine-005"
source=parent/"h23/pine005-h23-refined.blend"
out=parent/"h24"
out.mkdir(parents=True,exist_ok=True)
assert source.is_file() and source.stat().st_size>100000
bpy.ops.wm.open_mainfile(filepath=str(source))
scene=bpy.context.scene
old_body=next((o for o in scene.objects if o.type=="MESH" and o.name.startswith("H23_CONTINUOUS_TRUNK_MAJOR_BRANCHES_BUTTRESS_ROOTS")),None)
old_twigs=[o for o in scene.objects if o.type=="MESH" and o.name.startswith("H23__TWIG ")]
assert old_body is not None
assert len(old_twigs)==13,(len(old_twigs),[o.name for o in old_twigs[:4]])
old_original=next((o for o in scene.objects if o.type=="MESH" and o.name.startswith("MAIN S-TRUNK")),None)
assert old_original is not None and len(old_original.data.vertices)>5000

# Preserve H23 original meshes inside this updated .blend but do not export
# or render them. For rollback the old H23 .blend is also untouched on GitHub.
collection=bpy.data.collections.new("H24_ACTIVE_incremental_only")
scene.collection.children.link(collection)
def duplicate(obj,prefix):
    clone=obj.copy()
    clone.data=obj.data.copy()
    collection.objects.link(clone)
    clone.name=prefix+obj.name
    clone.hide_render=False
    clone.hide_set(False)
    for coll in list(obj.users_collection):
        if coll is not collection:
            # Old H23 geometry should stay in its original collection.
            pass
    obj.hide_render=True
    obj.hide_set(True)
    return clone
body=duplicate(old_body,"H24__")
twigs=[duplicate(o,"H24__") for o in old_twigs]
assert len([o for o in collection.objects if o.type=="MESH"])==14
assert len(body.data.vertices)>10000

kd=KDTree(len(old_original.data.vertices))
for i,v in enumerate(old_original.data.vertices):
    kd.insert(old_original.matrix_world@v.co,i)
kd.balance()
trunk_centers=[
    (-.25,.13),(-.42,.65),(-.65,1.25),(-.82,1.95),(-.72,2.67),
    (-.38,3.32),(.22,3.87),(.95,4.36),(1.69,4.78),(2.36,5.25),
    (2.86,5.82),(2.62,6.40),(2.96,6.98),(3.35,7.36),(3.66,7.64)]
def center_x(z):
    for i in range(len(trunk_centers)-1):
        x0,z0=trunk_centers[i]; x1,z1=trunk_centers[i+1]
        if z<=z1:
            return x0+(x1-x0)*max(0,min(1,(z-z0)/(z1-z0)))
    return trunk_centers[-1][0]
joints=(
    Vector((.86,.10,4.36)),Vector((2.69,.16,6.36)),
    Vector((2.82,.14,6.22)),Vector((1.66,.17,4.73)),
    Vector((2.35,.24,5.20)),Vector((3.22,-.07,7.27)),
    Vector((1.45,.22,4.74))
)
def smooth01(x):
    x=max(0.0,min(1.0,x))
    return x*x*(3-2*x)

# 1. Undo most of the H23 *regular sin(theta)* grooves.
#    Then generate locally irregular, low amplitude bark profile: not evenly
#    spaced ropes/grooves or swollen dough. This is geometry, NOT PBR texture.
bark_count=0
largest_bark_delta=0.0
for v in body.data.vertices:
    loc=v.co.copy()
    if loc.z<.22 or loc.z>7.65:continue
    _,_,dist=kd.find(loc)
    if dist>.19:continue
    theta=math.atan2(loc.y-.05,loc.x-center_x(loc.z))
    local_noise=noise.noise(Vector((loc.x*.9,loc.y*.8,loc.z*.45)))
    old_pattern=(
        .71*math.sin(13*theta+.46*loc.z+.23*local_noise)+
        .25*math.sin(21.5*theta-.18*loc.z+.4*local_noise)+
        .18*local_noise
    )
    nearest_joint=min((loc-j).length for j in joints)
    fade=smooth01((nearest_joint-.15)/.67)
    old_amount=(.032+.013*max(0,1-loc.z/7.7))*old_pattern*(.08+.92*fade)
    remove=-.90*old_amount
    # Multi-frequency physically small asymmetry, no torus rings, no uniform
    # flute count, no additional superimposed rope-shaped ridges.
    macro=noise.noise(Vector((loc.x*.72+9.1,loc.y*.58-3.2,loc.z*.38+1.7)))
    medium=noise.noise(Vector((loc.x*2.1+7.0,loc.y*2.5-2.7,loc.z*1.38+.3)))
    fine=noise.noise(Vector((loc.x*5.3-3.7,loc.y*4.9+8.4,loc.z*3.2)))
    organic=(.021*macro+.009*medium+.003*fine)*(.30+.70*fade)
    # Give some asymmetry to the low bole without distorting its confirmed S.
    low_bole=.036*math.exp(-((loc.z-1.90)/1.1)**2)*max(0,math.cos(theta-2.55))
    delta=remove+organic+low_bole
    v.co+=v.normal*delta
    bark_count+=1
    largest_bark_delta=max(largest_bark_delta,abs(delta))
assert bark_count>8500,(bark_count,largest_bark_delta)
assert largest_bark_delta<.13,largest_bark_delta

# 2. Turn six pointed radial root spikes into shorter grounded buttresses.
#    All work is on the already FUSED mesh. No new root tubes, balls or rocks.
root_verts=0
max_root_move=0.0
for v in body.data.vertices:
    p=v.co.copy()
    if p.z>.72:continue
    x=p.x+.30;y=p.y-.05
    r=math.hypot(x,y)
    if r<.65:continue
    a=math.atan2(y,x)
    vertical=1-smooth01((p.z-.08)/.65)
    along=smooth01((r-.69)/1.75)
    # pull pointed ends under the buttress by up to 26%, not amputating roots
    contraction=.27*vertical*along
    new_r=r*(1-contraction)
    # controlled root wandering / asymmetry, not straight compass points
    new_a=a+.12*vertical*along*math.sin(2.7*a+1.4*r+.3)
    x1=new_r*math.cos(new_a)-.30
    y1=new_r*math.sin(new_a)+.05
    # root tips flatten toward the floor so thin spikes aren't held in air
    floor_fade=vertical*along
    z1=p.z-.12*floor_fade*max(0,1-min(1,p.z/.48))
    # very low natural root-shoulder variation, no added radial tubes
    z1+=.018*vertical*math.sin(1.7*a+2.2*r)*smooth01((r-.8)/1.2)
    v.co=Vector((x1,y1,z1))
    root_verts+=1
    max_root_move=max(max_root_move,(p-v.co).length)
assert root_verts>2000,root_verts
assert max_root_move<.90,max_root_move

# 3. Break ruler-straight limb silhouettes slightly, preserving original
#    branches and the main S-trunk. Identical warps apply to separate twigs
#    so their root positions stay aligned with the integrated main branches.
def limb_warp(p):
    x,y,z=p.x,p.y,p.z
    shifts=[
       (-1.35,4.28,.48,.17,1.15, .20), # lower left
       (-.25,6.66,.61,.12,1.00, 1.10), # higher left
       (3.95,6.22,.68,.15,1.18, .40), # upper right
       (3.50,4.18,.72,.16,1.10, 1.95)  # lower right
    ]
    dz=dy=0.0
    for begin,level,spread,amplitude,freq,phase in shifts:
        side=smooth01((x-begin)/1.50) if begin>0 else smooth01((begin-x)/1.55)
        elevation=math.exp(-((z-level)/spread)**2)
        w=side*elevation
        path=abs(x-begin)
        dz+=amplitude*w*math.sin(path*freq+phase)
        dy+=.48*amplitude*w*math.sin(path*.92+phase+1.2)
    return dz,dy
warp_count=0;max_warp=.0
for obj in [body]+twigs:
    for v in obj.data.vertices:
        p=v.co.copy()
        if p.z<3.50:continue
        dz,dy=limb_warp(p)
        if abs(dz)+abs(dy)<1e-5:continue
        v.co.z+=dz;v.co.y+=dy
        warp_count+=1
        max_warp=max(max_warp,abs(dz),abs(dy))
    obj.data.update()
assert warp_count>300,warp_count
assert max_warp<.36,max_warp
for face in body.data.polygons:face.use_smooth=True

# 4. No extra stem pieces or geometry added. Final geometry integrity gate.
assert len(collection.objects)==14
assert all(o.type=="MESH" for o in collection.objects)
for o in collection.objects:assert len(o.data.vertices)>30
# Keep original frozen root/branch meshes in the .blend for future fine edits.
assert old_body.hide_render and all(o.hide_render for o in old_twigs)

# Render full views and two close-ups; pale neutral background avoids the
# previous almost-black silhouette against almost-black background.
world=scene.world
if world is None:
    world=bpy.data.worlds.new("H24 Neutral World")
    scene.world=world
world.color=(.70,.72,.71)
scene.render.engine="BLENDER_WORKBENCH"
scene.render.resolution_x=860
scene.render.resolution_y=860
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGB"
scene.render.film_transparent=False
shading=scene.display.shading
shading.color_type="MATERIAL"
shading.light="STUDIO"
shading.show_shadows=True
shading.background_type="WORLD"
if hasattr(shading,"show_cavity"):shading.show_cavity=True

camera=next((o for o in scene.objects if o.type=="CAMERA"),None)
assert camera is not None
scene.camera=camera
camera.data.type="ORTHO"
camera.data.ortho_scale=13.5
target=Vector((.70,0,4.0))
views={"front":(1,-19,8.6),"right":(19,-.4,8.3),"back":(.5,19,8.6),"top":(.5,-.02,21.0)}
stats={}
def render(label,pos,look=target,scale=13.5):
    camera.data.ortho_scale=scale
    camera.location=pos
    camera.rotation_euler=(look-camera.location).to_track_quat("-Z","Y").to_euler()
    filepath=out/(label+".png")
    scene.render.filepath=str(filepath)
    bpy.ops.render.render(write_still=True)
    raw=filepath.read_bytes()
    assert raw[:8]==b"\x89PNG\r\n\x1a\n" and struct.unpack(">II",raw[16:24])==(860,860)
    stats[label]={"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()}
for label,where in views.items():render(label,where)
render("root-closeup",Vector((2,-7,2.65)),Vector((-.1,0,.6)),3.35)
render("joint-closeup",Vector((2,-9,5.8)),Vector((1.55,0,4.8)),5.7)

previous=(shading.color_type,shading.light,world.color,shading.show_shadows)
shading.color_type="SINGLE"
shading.single_color=(.015,.020,.018)
shading.light="FLAT"
shading.show_shadows=False
world.color=(.94,.94,.94)
render("silhouette",views["front"])
shading.color_type,shading.light,world.color,shading.show_shadows=previous

# Save NEW working mother only; H23 .blend is unchanged in GitHub.
blend=out/"pine005-h24-refined.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
assert blend.is_file() and blend.stat().st_size>100000
bpy.ops.object.select_all(action="DESELECT")
for o in [body]+twigs:o.select_set(True)
bpy.context.view_layer.objects.active=body
glb=out/"pine005-h24-refined.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,export_apply=True)
binary=glb.read_bytes()
assert binary[:4]==b"glTF" and struct.unpack_from("<I",binary,8)[0]==len(binary)
chunk,kind=struct.unpack_from("<I4s",binary,12)
assert kind==b"JSON" and chunk<len(binary)-20
model=json.loads(binary[20:20+chunk].decode("utf-8").rstrip(" \x00"))
assert len(model.get("meshes",[]))==14,len(model.get("meshes",[]))

report={
 "asset":"PINE-005","stage":"H24 strict incremental shape correction from H23 mother",
 "technical_status":"PASS","visual_status":"PENDING_G1A_VISUAL_REVIEW",
 "source_blend":"assets/pine-005/h23/pine005-h23-refined.blend",
 "reference_blob":"9e204263823ca9f40d46737dca5c1ee0a28a73a8",
 "original_h23_glb_sha256":"b9c32dcfdc293bc224de87f36154a8a7d4b3ed5357f1b3a1acbd0c6746ff04ac",
 "geometry_operations":{
   "reverse_regular_grooves_vertices":bark_count,
   "largest_bark_deformation":round(largest_bark_delta,5),
   "root_shaping_vertices":root_verts,
   "max_root_deformation":round(max_root_move,5),
   "bent_limb_vertices":warp_count,
   "max_limb_deformation":round(max_warp,5)},
 "protected":{"no_new_trunk":True,"no_new_roots":True,"same_14_meshes":True,
              "old_h23_objects_preserved_in_blend":True,
              "new_canopy":"none","pbr_textures":"none","game_integration":False},
 "outputs":{"blend_bytes":blend.stat().st_size,"glb_bytes":glb.stat().st_size,
            "glb_sha256":hashlib.sha256(binary).hexdigest(),
            "meshes":len(model["meshes"]),"views":stats},
 "art_rule":"Continuous authentic old pine trunk, no ridged plastic tube, spike roots, or bulky glued branch collars",
 "g1a_approved":False,"new_tripo_credits":0,
 "elapsed_seconds":round(time.monotonic()-started,2)
}
(out/"h24-qa.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
print("PINE005_H24_TECHNICAL_PASS",json.dumps(report,ensure_ascii=False),flush=True)
