"""H27: ACTUAL Blender 3D improvement on the existing H26 Hero model.
Reads the H26 editable .blend; writes separate H27 .blend + GLB + seven
Blender-rendered views. Never substitutes a generated 2D image for a mesh.
No Tripo credits, no needle canopy, no game integration, no source overwrite.
"""
import bpy,bmesh,json,hashlib,struct,pathlib,math,random,time
from mathutils import Vector,noise
from math import sin,cos,pi
started=time.monotonic()
repo=pathlib.Path.cwd()
base=repo/"fengming-v2-scene-a/assets/pine-005"
source=base/"h26/pine005-h26-hero.blend"
out=base/"h27"
out.mkdir(parents=True,exist_ok=True)
assert source.is_file() and source.stat().st_size>250000
bpy.ops.wm.open_mainfile(filepath=str(source))
scene=bpy.context.scene
ref="9e204263823ca9f40d46737dca5c1ee0a28a73a8"
hero=bpy.data.collections.get("H26_HERO_NEW_ORGANIC_MESH")
assert hero is not None,"H26 source collection unavailable"
old=[o for o in hero.objects if o.type=="MESH"]
body=next((o for o in old if o.name.startswith("H26 ONE_CONTINUOUS")),None)
bark=next((o for o in old if o.name.startswith("H26 IRREGULAR BARK")),None)
rocks=sorted([o for o in old if o.name.startswith("H26 irregular root-contact granite")],key=lambda o:o.name)
twigs=sorted([o for o in old if o.name.startswith("H26 NATURAL OFFSHOOT")],key=lambda o:o.name)
assert body and bark and len(rocks)==6 and len(twigs)==10
assert len(old)==18,(len(old),[x.name for x in old])
active=bpy.data.collections.new("H27_ACTIVE_EDITABLE_MESH")
scene.collection.children.link(active)
clones={}
for o in old:
    n=o.copy();n.data=o.data.copy()
    active.objects.link(n)
    n.name=o.name.replace("H26","H27",1)
    n.hide_set(False);n.hide_render=False;n.hide_viewport=False
    clones[o.name]=n
    o.hide_render=True;o.hide_set(True)
body=clones[body.name]
plates=clones[bark.name]
rocks=[clones[x.name] for x in rocks]
twigs=[clones[x.name] for x in twigs]

# The original H26 tree is a CLOSED, unified and already more muscular 3D
# sculpture. Do not remake its trunk, roots or branch junctions.
def topology(o):
    bm=bmesh.new();bm.from_mesh(o.data)
    result=dict(faces=len(bm.faces),
                nonmanifold_edges=sum(not e.is_manifold for e in bm.edges),
                near_zero_faces=sum(f.calc_area()<1e-8 for f in bm.faces))
    bm.free()
    return result
before=topology(body)
assert before["nonmanifold_edges"]==0 and before["near_zero_faces"]==0

# Remove fake fish/rock-scale look: keep a selective, varied 3D plate layer
# and LOWER the peaks to be broad torn bark rather than sharp triangles.
# H26 bark authoring used exactly 9 vertices + 8 triangles per unique plate.
vertices=plates.data.vertices
face_count=len(plates.data.polygons)
assert face_count%8==0 and len(vertices)%9==0
groups=face_count//8
assert groups==len(vertices)//9 and groups>120
rng=random.Random(270027)
verts_new=[];faces_new=[];mat_ids=[]
used=0
for k in range(groups):
    center=vertices[9*k].co.copy()
    rim=[vertices[9*k+j].co.copy() for j in range(1,9)]
    # irregular patch gaps: bark plates must not blanket the whole trunk.
    # Reduce occupancy from H26 while keeping real raised geometry.
    if rng.random() < (.34 if center.z<4.0 else .46):
        continue
    avg=sum(rim,Vector())/8.0
    vnormal=(center-avg)
    seed=len(verts_new)
    # Height reduction and aspect jitter preserve a low physical profile.
    new_center=avg+vnormal*rng.uniform(.33,.52)
    verts_new.append(tuple(new_center))
    sx=rng.uniform(.82,1.04)
    sy=rng.uniform(.88,1.06)
    for j,p in enumerate(rim):
        direction=p-avg
        n=direction.copy()
        n.z*=sy
        n.x*=sx;n.y*=sx
        jitter=(rng.random()-.5)*.027
        point=avg+n*(.91+jitter)
        verts_new.append(tuple(point))
    for j in range(8):
        faces_new.append((seed,seed+j+1,seed+(j+1)%8+1))
        original_poly=plates.data.polygons[k*8+j]
        mat_ids.append(original_poly.material_index)
    used+=1
assert used>=125 and used<groups
new_mesh=bpy.data.meshes.new("H27 sparse feathered weathered pine bark")
new_mesh.from_pydata(verts_new,[],faces_new)
new_mesh.update()
for m in plates.data.materials:
    new_mesh.materials.append(m)
plates.data=new_mesh
for p,mi in zip(plates.data.polygons,mat_ids):
    p.material_index=mi
    p.use_smooth=False

# Retune existing neutral bark colors to natural close values, not tiny
# bright triangular stone chips. This is still NOT a purchased/PBR texture.
for ob in [body,plates]+twigs:
    for material in ob.data.materials:
        if material is None:continue
        m=material.copy()
        ob.data.materials[ob.data.materials.find(material.name)]=m
        name=m.name.lower()
        if "raised natural" in name:
            col=(.365,.290,.233)
        elif "irregular bark" in name:
            col=(.335,.264,.212)
        elif "warm bark" in name:
            col=(.317,.243,.195)
        else:
            col=(.319,.256,.210)
        m.diffuse_color=(*col,1)
        if m.use_nodes:
            bsdf=m.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value=(*col,1)
                bsdf.inputs["Roughness"].default_value=.98

# Light broad irregular bark micro-sculpt directly on the EXISTING body,
# NOT repeated ring flutes, not a new fake shell. Preserve rock contact.
reworked=0
max_delta=0.0
for v in body.data.vertices:
    p=v.co.copy()
    if p.z<.40 or p.z>7.25:continue
    low=max(.24,min(1.0,(7.5-p.z)/4.0))
    a=noise.noise(Vector((p.x*.91+7.2,p.y*1.04-1.1,p.z*.53)))
    b=noise.noise(Vector((p.x*2.65-2.7,p.y*2.13+3.3,p.z*1.83)))
    c=noise.noise(Vector((p.x*4.11+1.6,p.y*4.32-2.8,p.z*3.14)))
    disp=(.028*a+.012*b+.004*c)*low
    v.co+=v.normal*disp
    max_delta=max(max_delta,abs(disp))
    reworked+=1
assert reworked>4000 and max_delta<.05
body.data.update()

# Reduce six isolated "round pebbles" to 4 supporting stones that better
# correspond with the existing broad root system. They are still real meshes.
kept_rocks=[]
for index,rock in enumerate(rocks):
    if index in (4,5):
        rock.hide_render=True
        rock.hide_set(True)
        continue
    rock.scale.x*=1.15
    rock.scale.y*=1.19
    rock.scale.z*=1.12
    rock.location.z-=.05
    if index==0:rock.location.y-=.12
    if index==1:rock.location.x+=.15
    if index==2:rock.location.x-=.16
    kept_rocks.append(rock)
assert len(kept_rocks)==4

# Offshoots: gentle non-planar bending, preserve attachment and tips.
curved=0
for i,t in enumerate(twigs):
    coords=[v.co.copy() for v in t.data.vertices]
    center=sum(coords,Vector())/len(coords)
    axis=max(range(3),key=lambda k:max(v[k] for v in coords)-min(v[k] for v in coords))
    low=min(v[axis] for v in coords)
    high=max(v[axis] for v in coords)
    span=max(.05,high-low)
    for v in t.data.vertices:
        u=(v.co[axis]-low)/span
        weight=math.sin(pi*u)**2
        amount=.10*weight*sin(pi*(.7*u+.19*i))
        v.co.z+=amount
        v.co.y+=.45*amount*cos(i*.7)
        curved+=1
    t.data.update()

# No new trunk or root geometry. 1 fused body + 1 geometric bark + 10 twigs
# + 4 real rocks = 16 exported meshes. H26 originals remain frozen in .blend.
exported=[body,plates]+twigs+kept_rocks
assert len(exported)==16
after=topology(body)
assert after["nonmanifold_edges"]==0 and after["near_zero_faces"]==0

scene.render.engine="BLENDER_WORKBENCH"
scene.render.resolution_x=930
scene.render.resolution_y=930
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGB"
scene.display.shading.light="STUDIO"
scene.display.shading.color_type="MATERIAL"
scene.display.shading.show_shadows=True
scene.display.shading.background_type="VIEWPORT"
scene.display.shading.background_color=(.78,.79,.78)
if hasattr(scene.display.shading,"show_cavity"):scene.display.shading.show_cavity=True
camera=scene.camera
assert camera is not None and camera.type=="CAMERA"
camera.data.type="ORTHO"
focus=Vector((.55,.1,4))
views={
"front":(Vector((1,-21,9.2)),focus,16.1),
"right":(Vector((22,-.5,8.8)),focus,16.1),
"back":(Vector((.5,21,9)),focus,16.1),
"three-quarter":(Vector((16,-18,11)),focus,16.1),
"root-close":(Vector((2,-10,3.5)),Vector((-.8,0,.75)),6.7),
"bark-close":(Vector((.5,-8.0,4.5)),Vector((-.6,.0,2.45)),6.4),
"top":(Vector((.5,-.02,23)),focus,16.1),
}
outputs={}
def render(name,view):
    position,target,scale=view
    camera.data.ortho_scale=scale
    camera.location=position
    camera.rotation_euler=(target-camera.location).to_track_quat("-Z","Y").to_euler()
    dest=out/(name+".png")
    scene.render.filepath=str(dest)
    bpy.ops.render.render(write_still=True)
    raw=dest.read_bytes()
    assert raw[:8]==b"\x89PNG\r\n\x1a\n" and struct.unpack(">II",raw[16:24])==(930,930)
    outputs[name]={"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()}
for name,view in views.items():render(name,view)

# Save all the H26 original editable objects as frozen references, but export
# ONLY H27 selected geometry. The 2D art from imagegen isn't used in any part.
source_blend=out/"pine005-h27-refined.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(source_blend),compress=True)
assert source_blend.stat().st_size>100000
bpy.ops.object.select_all(action="DESELECT")
for o in exported:o.select_set(True)
bpy.context.view_layer.objects.active=body
glb=out/"pine005-h27-refined.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",
                          use_selection=True,export_apply=True)
raw=glb.read_bytes()
assert raw[:4]==b"glTF" and struct.unpack_from("<I",raw,8)[0]==len(raw)
chunk,kind=struct.unpack_from("<I4s",raw,12)
assert kind==b"JSON" and chunk<len(raw)-20
gltf=json.loads(raw[20:20+chunk].decode("utf-8").rstrip(" \x00"))
mesh_count=len(gltf.get("meshes",[]))
assert mesh_count>=15,mesh_count
report={
 "asset":"PINE-005","phase":"H27 actual 3D refinement of H26 hero sculpt",
 "technical_status":"PASS","visual_status":"PENDING_G1A_VISUAL_REVIEW",
 "source":"assets/pine-005/h26/pine005-h26-hero.blend",
 "source_reference_blob":ref,
 "previous_source_glb_sha256":"7b62aaa988d540342529ada4ac42b13e8f9db81128d5b34a18a797c31af6605f",
 "operations":{
  "bark_3d_facet_groups_before":groups,
  "bark_3d_facet_groups_after":used,
  "sculpted_core_vertices":reworked,
  "largest_bark_deformation":round(max_delta,4),
  "remaining_contact_rocks":len(kept_rocks),
  "recurved_secondary_twig_vertices":curved,
  "body_topology_before":before,"body_topology_after":after},
 "materials":"real retained Blender materials / NOT a finished PBR texture",
 "leaf_canopy":"NOT BUILT",
 "outputs":{"blend_bytes":source_blend.stat().st_size,
            "glb_bytes":glb.stat().st_size,
            "glb_sha256":hashlib.sha256(raw).hexdigest(),
            "gltf_meshes":mesh_count,"views":outputs},
 "tripo_credits_added":0,
 "game_mother_modified":False,
 "2d_image_substituted_for_mesh":False,
 "asset_promotion":"BLOCKED until G1-A user visual acceptance",
 "elapsed_seconds":round(time.monotonic()-started,1)
}
(out/"h27-qa.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
print("H27_REAL_3D_ASSET_PASS",json.dumps(report,ensure_ascii=False),flush=True)
