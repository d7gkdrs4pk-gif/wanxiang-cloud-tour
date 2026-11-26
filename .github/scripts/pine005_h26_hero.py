"""H26: new high-silhouette ancient pine hero trunk + geological gripping roots.

Independent visual candidate based on approved reference and archived H23
source. NOT a continuation of H22-H25 pipe tweaks. Construct a muscular,
asymmetric, twisting bole; low broad roots following real rock contact;
organic tapered non-planar branches; visible chipped bark plate geometry.
NOT a complete tree: needles/canopy deliberately absent for G1-A approval.
No paid API, no generative image, no production game integration.
"""
import bpy, bmesh, json, math, hashlib, pathlib, random, struct, time
from mathutils import Vector, noise
from math import sin,cos,pi
T=time.monotonic()
rng=random.Random(260026)
project=pathlib.Path.cwd()/"fengming-v2-scene-a"
source=project/"assets/pine-005/h23/pine005-h23-refined.blend"
out=project/"assets/pine-005/h26"
out.mkdir(parents=True,exist_ok=True)
assert source.stat().st_size>100000
bpy.ops.wm.open_mainfile(filepath=str(source))
scene=bpy.context.scene
old_meshes=[o for o in scene.objects if o.type=="MESH"]
assert len(old_meshes)>=14
for o in old_meshes:
    o.hide_render=True
    o.hide_set(True)
    o.hide_viewport=False
frozen=bpy.data.collections.new("H23_FROZEN_ONLY_FOR_COMPARISON")
scene.collection.children.link(frozen)
for o in old_meshes:
    for coll in list(o.users_collection):coll.objects.unlink(o)
    frozen.objects.link(o)

hero=bpy.data.collections.new("H26_HERO_NEW_ORGANIC_MESH")
scene.collection.children.link(hero)
def mat(name,rgb,roughness=.94):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*rgb,1)
    m.use_nodes=True
    bsdf=m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value=(*rgb,1)
        bsdf.inputs["Roughness"].default_value=roughness
    return m
bark=mat("Hero aged pine neutral umber",(.30,.228,.166))
bark_base=mat("Hero weathered bark cracks",(.17,.14,.118))
bark_bright=mat("Hero raised natural bark facets",(.39,.30,.222))
bark_medium=mat("Hero irregular bark plates",(.33,.252,.190))
heartwood=mat("Hero branch warm bark",(.31,.235,.168))
stone_mat=mat("Hero natural granite",(.36,.385,.372))
stone_light=mat("Hero pale rock fracture",(.49,.50,.46))

def add_mesh(name,verts,faces,material):
    mesh=bpy.data.meshes.new(name+" geometry")
    mesh.from_pydata([tuple(v) for v in verts],[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    hero.objects.link(obj)
    obj.data.materials.append(material)
    for p in mesh.polygons:p.use_smooth=True
    return obj

def catmull(a,b,c,d,t):
    return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
def sample_path(controls,sub=10):
    points=[];radii=[]
    for i in range(len(controls)-1):
        p0=Vector(controls[max(0,i-1)][:3])
        p1=Vector(controls[i][:3]);p2=Vector(controls[i+1][:3])
        p3=Vector(controls[min(i+2,len(controls)-1)][:3])
        for k in range(sub):
            t=k/sub
            points.append(catmull(p0,p1,p2,p3,t))
            r=controls[i][3]*(1-t)+controls[i+1][3]*t
            radii.append(r)
    points.append(Vector(controls[-1][:3]))
    radii.append(controls[-1][3])
    return points,radii
def sweep(name,ctrl,material,ring=24,sub=9,flat=.0,irregular=.04):
    p,r=sample_path(ctrl,sub)
    verts=[];faces=[];R=len(p)
    for i,center in enumerate(p):
        tangent=(p[min(R-1,i+1)]-p[max(0,i-1)]).normalized()
        ref=Vector((0,1,0)) if abs(tangent.dot(Vector((0,1,0))))<.88 else Vector((0,0,1))
        axis=tangent.cross(ref).normalized();ortho=tangent.cross(axis).normalized()
        u=i/(R-1)
        for j in range(ring):
            theta=2*pi*j/ring
            variation=1+irregular*(.45*sin(3*theta+u*6)+.28*sin(7*theta-u*9))
            variation+=.027*noise.noise(Vector((theta*1.1,u*3.4,1.7)))
            if flat>0:
                # root has wide buttress footprint and low vertical profile
                side=axis*cos(theta)*r[i]*variation*(1+.55*flat)
                up=ortho*sin(theta)*r[i]*variation*(1-.78*flat)
            else:
                side=axis*cos(theta)*r[i]*variation
                up=ortho*sin(theta)*r[i]*variation
            verts.append(tuple(center+side+up))
        if i:
            for j in range(ring):
                a=(i-1)*ring+j;b=(i-1)*ring+(j+1)%ring
                c=i*ring+(j+1)%ring;d=i*ring+j
                faces.append((a,b,c,d))
    beg=len(verts);verts.append(tuple(p[0]))
    end=len(verts);verts.append(tuple(p[-1]))
    for j in range(ring):
        faces.append((beg,(j+1)%ring,j))
        off=(R-1)*ring
        faces.append((end,off+j,off+(j+1)%ring))
    return add_mesh(name,verts,faces,material)

# Trunk is >60% more massive at lower bole than H23, and turns over in
# THREE dimensions. This is deliberately not a smooth uniformly tapering tube.
TRUNK=[
(-.72,.08,.16,1.42),
(-.93,.03,.60,1.36),
(-1.22,-.09,1.21,1.23),
(-1.35,-.20,2.03,1.06),
(-1.17,-.29,2.80,.94),
(-.57,-.36,3.54,.82),
(.32,-.17,4.13,.69),
(1.36,.20,4.69,.58),
(2.18,.44,5.29,.48),
(2.71,.23,5.87,.39),
(2.53,-.01,6.50,.32),
(2.75,-.13,7.16,.25),
(3.39,-.22,7.70,.15)
]
trunk_obj=sweep("H26 ONE MUSCULAR S BOLT",TRUNK,bark,ring=68,sub=17,irregular=.084)

# Roots are broad asymmetric buttresses, with genuinely flat floor contact,
# pronounced over-rock rises, and rounded rather than needle-tipped ends.
ROOTS=[
("LEFT_FOREGROUND",[
(-.93,-.13,.73,.74),(-1.45,-.39,.44,.73),(-2.13,-.90,.34,.66),
(-2.66,-1.30,.49,.47),(-3.12,-1.64,.26,.30),(-3.71,-1.73,.11,.13)]),
("RIGHT_FOREGROUND",[
(-.60,-.28,.72,.76),(.20,-.46,.44,.75),(1.19,-.79,.37,.64),
(1.83,-1.20,.52,.48),(2.34,-1.39,.26,.29),(3.03,-1.70,.09,.13)]),
("LEFT_BACK",[
(-1.03,.22,.66,.69),(-1.58,.77,.49,.60),(-2.03,1.37,.40,.48),
(-2.52,1.85,.32,.39),(-3.18,2.22,.13,.17)]),
("RIGHT_REAR_WRAP",[
(-.54,.36,.72,.67),(.21,.91,.50,.63),(.93,1.52,.34,.52),
(1.12,2.18,.28,.40),(1.78,2.62,.15,.19)]),
("CENTER_FRONT_SWEPT",[
(-.70,-.25,.77,.68),(-.89,-.91,.47,.57),(-.72,-1.56,.31,.44),
(-.38,-2.20,.29,.29),(.13,-2.66,.11,.13)]),
("LEFT_SHORT_ANCHOR",[
(-1.30,-.01,.56,.52),(-1.83,-.08,.38,.51),(-2.35,.26,.25,.37),
(-2.77,.50,.12,.16)])
]
root_objs=[sweep("H26 BUTTRESS ROOT "+name,ctrl,bark,ring=30,sub=11,
                  flat=.72,irregular=.042) for name,ctrl in ROOTS]

# Support branches are crooked and have several inflection points and
# z/depth structure, unlike the previous 2 horizontal rows of sewer pipes.
BRANCHES=[
("LOW LEFT HANGING",[
(.48,-.13,4.19,.39),(-.49,-.13,4.37,.32),(-1.38,-.44,4.31,.26),
(-2.42,-.65,4.00,.21),(-3.52,-.47,3.93,.13),(-4.55,-.18,4.13,.06),
(-5.20,-.15,4.20,.025)]),
("HIGH LEFT SWEEP",[
(2.41,.30,5.69,.36),(1.58,.69,6.01,.30),(.35,.95,6.28,.24),
(-.96,.91,6.20,.18),(-2.18,.57,6.04,.13),(-3.35,.18,6.19,.065),
(-4.32,.09,6.37,.024)]),
("RIGHT MID COUNTER",[
(.55,-.10,4.35,.39),(1.30,-.49,4.31,.35),
(2.40,-1.0,4.07,.28),(3.42,-1.38,4.23,.20),
(4.57,-1.35,4.43,.125),(5.74,-1.22,4.30,.05),
(6.33,-1.11,4.44,.020)]),
("RIGHT HIGH ARCHED",[
(2.66,.21,5.98,.35),(3.48,.31,6.25,.28),
(4.20,.09,6.14,.23),(5.19,-.12,5.86,.15),
(6.07,-.19,5.94,.085),(6.79,-.26,6.17,.026)]),
("TOP CROWN SPINE",[
(2.68,-.07,6.52,.29),(2.96,.03,7.22,.24),
(3.49,.24,7.55,.18),(4.42,.18,7.72,.12),
(5.43,.06,7.72,.045)]),
("BACK LEFT SHORT",[
(1.47,.26,4.84,.27),(.70,1.07,4.92,.24),
(-.23,1.54,5.16,.17),(-1.20,1.63,5.11,.10),
(-2.15,1.41,5.38,.03)])
]
branch_objs=[sweep("H26 MAIN BRANCH "+name,ctrl,heartwood,ring=24,sub=10,
                   irregular=.045) for name,ctrl in BRANCHES]

# Voxel-weld body + buttresses + large branches in ONE operation, no
# seam-sleeves, no cut-and-paste collar, no added mudball.
bpy.ops.object.select_all(action="DESELECT")
for o in [trunk_obj]+root_objs+branch_objs:o.select_set(True)
bpy.context.view_layer.objects.active=trunk_obj
bpy.ops.object.join()
body=bpy.context.view_layer.objects.active
body.name="H26 ONE_CONTINUOUS_AGED_WOOD_MAIN_ROOTS_BRANCHES"
body.data.remesh_voxel_size=.047
bpy.ops.object.voxel_remesh()
assert 15000<len(body.data.polygons)<200000,len(body.data.polygons)

# Natural sculpt: high and mid spatial-frequency perturbations are modulated
# to remain subtle at branch collars and thinner roots; no sine flutes.
bm=bmesh.new();bm.from_mesh(body.data)
for k in range(3):
    bmesh.ops.smooth_vert(bm,verts=bm.verts,factor=.19,
       use_axis_x=True,use_axis_y=True,use_axis_z=True)
bm.to_mesh(body.data);bm.free()
body.data.update()
sculpted=0
for v in body.data.vertices:
    p=v.co
    a=noise.noise(Vector((p.x*.55+1.2,p.y*.68-.7,p.z*.60+2.2)))
    b=noise.noise(Vector((p.x*1.9-3.4,p.y*2.1+3.1,p.z*1.45)))
    c=noise.noise(Vector((p.x*6.2+9.5,p.y*5.6,p.z*4.1)))
    amplitude=.058 if p.z<4.6 else .035
    # More powerful rough bark on the old central bole, without synthetic
    # longitudinal grooves or ball-like lumps.
    old_bole=1.0 if p.z<=4.1 else max(.35,1.0-(p.z-4.1)*.17)
    delta=(.032*a+.017*b+.006*c)*old_bole*(amplitude/.058)
    # nudge by normal, not a radial sine, keeping branch contours intact.
    v.co+=v.normal*delta
    sculpted+=1
body.data.update()
for face in body.data.polygons:face.use_smooth=True
body.data.materials.clear();body.data.materials.append(bark)

# Save pre-bark geometry and use ray-casts from each surface patch to place
# raised irregular chipped bark PLATES, not uniform fluting. The stony cracked
# plates are actual polygons, visible in gray-mesh (not a pasted texture).
plate_objs=[]
pts,rs=sample_path(TRUNK,sub=18)
def surface_at(t,angle,extra=0):
    f=max(0,min(len(pts)-1-1e-5,t*(len(pts)-1)))
    i=int(f);a=f-i
    c=pts[i].lerp(pts[min(i+1,len(pts)-1)],a)
    tangent=(pts[min(i+2,len(pts)-1)]-pts[max(0,i-1)]).normalized()
    ref=Vector((0,1,0))
    axis=tangent.cross(ref).normalized()
    ortho=tangent.cross(axis).normalized()
    direction=(axis*cos(angle)+ortho*sin(angle)).normalized()
    rad=rs[i]*(1-a)+rs[min(i+1,len(rs)-1)]*a
    origin=c+direction*(rad*2.1+.35)
    hit,loc,nrm,idx=body.ray_cast(origin,-direction,distance=rad*3.2+1.1)
    if not hit:
        return c+direction*(rad+extra),direction
    return loc+nrm*extra,nrm
plate_vertices=[];plate_faces=[];plate_mat_ids=[]
# Dense irregular bark plates on the thick lower-and-middle ancient bole.
for tier in range(34):
    tmid=(tier+.48+rng.uniform(-.30,.30))/36
    if tmid<.025 or tmid>.88:continue
    N=rng.randint(11,17)
    shift=rng.random()*2*pi
    for q in range(N):
        t=tmid+rng.uniform(-.007,.007)
        th=shift+2*pi*(q+.5*rng.uniform(-.50,.50))/N
        width_angle=2*pi/N*rng.uniform(.55,.88)
        height_t=rng.uniform(.017,.032) if t<.50 else rng.uniform(.014,.025)
        # use a mixture of offset pentagons and short irregular cracked
        # rectangular facets; unique height and angular offsets.
        jitter=rng.uniform(-.13,.13)
        corners=[
         (-.48,-.40),(-.23,-.54),(.17,-.54),(.49,-.26),
         (.52,.28),(.24,.49),(-.20,.52),(-.50,.21)
        ]
        seed=len(plate_vertices)
        height=rng.uniform(.018,.055)*(1-.50*t)
        pos_center,norm=surface_at(t,th,height+.013)
        plate_vertices.append(tuple(pos_center))
        for dt,da in corners:
            theta=th+da*width_angle+jitter*width_angle*dt
            ti=max(.015,min(.90,t+dt*height_t))
            vv,nn=surface_at(ti,theta,height*.34+.004)
            plate_vertices.append(tuple(vv))
        for j in range(len(corners)):
            plate_faces.append((seed,seed+j+1,seed+(j+1)%len(corners)+1))
            plate_mat_ids.append(0 if rng.random()<.60 else 1)
# Bark plates are part of our authored asset, but remain independently
# editable. Avoid expensive booleans on 400 flaky facets.
if plate_vertices:
    bark_mesh=bpy.data.meshes.new("H26 natural fractured raised bark plates")
    bark_mesh.from_pydata(plate_vertices,[],plate_faces)
    bark_mesh.update()
    plates=bpy.data.objects.new("H26 IRREGULAR BARK SHARDS no flute repetition",bark_mesh)
    hero.objects.link(plates)
    plates.data.materials.append(bark_medium)
    plates.data.materials.append(bark_bright)
    for p,midx in zip(plates.data.polygons,plate_mat_ids):
        p.material_index=midx
        p.use_smooth=False
    plate_objs.append(plates)

# Counter-balanced small subbranches; they are short tapered crooked sprouts
# rooted at major branches, not noodle-sized direct spokes from the trunk.
TWIGS=[
 [(-3.16,-.55,4.02,.085),(-3.58,-.89,4.25,.065),(-3.96,-1.12,4.42,.018)],
 [(-4.40,-.19,4.12,.057),(-4.74,.16,4.28,.039),(-5.02,.48,4.30,.015)],
 [(-1.24,.86,6.24,.10),(-1.67,1.20,6.55,.069),(-2.16,1.42,6.66,.020)],
 [(-2.97,.19,6.18,.074),(-3.27,-.21,6.41,.047),(-3.80,-.46,6.47,.015)],
 [(4.24,-.1,6.14,.12),(4.61,.12,6.42,.078),(5.01,.31,6.62,.022)],
 [(5.70,-.17,5.94,.067),(6.17,.15,6.13,.043),(6.60,.40,6.16,.016)],
 [(3.26,-1.42,4.22,.12),(3.51,-1.75,4.52,.073),(3.81,-1.95,4.67,.023)],
 [(4.88,-1.32,4.39,.09),(5.26,-.93,4.56,.052),(5.69,-.66,4.71,.020)],
 [(1.33,-.42,4.33,.15),(1.83,-.67,4.77,.08),(2.18,-.94,4.97,.025)],
 [(3.90,.19,7.62,.07),(4.21,.52,7.94,.045),(4.53,.72,8.04,.018)],
]
twig_objs=[sweep("H26 NATURAL OFFSHOOT "+str(i+1),c,heartwood,
                 ring=12,sub=8,irregular=.02) for i,c in enumerate(TWIGS)]

# Contact rocks: irregular faceted native game meshes, not props hiding
# disconnected roots. Forest-floor substrate is NOT included in the GLB.
rocks=[]
for idx,(where,scale) in enumerate([
    ((-2.62,-1.28,.18),(.84,.65,.39)),
    ((1.94,-1.29,.16),(.81,.65,.32)),
    ((-2.34,1.32,.18),(.71,.62,.33)),
    ((.87,1.46,.13),(.63,.52,.30)),
    ((-.92,-2.03,.13),(.58,.49,.25)),
    ((-3.37,-1.73,.12),(.59,.44,.27))
]):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=where)
    rock=bpy.context.object
    rock.name="H26 irregular root-contact granite "+str(idx+1)
    for coll in list(rock.users_collection):coll.objects.unlink(rock)
    hero.objects.link(rock)
    for v in rock.data.vertices:
        p=v.co
        f=.92+.18*noise.noise(Vector((p.x*1.8+idx*2,p.y*1.9,p.z*1.5)))
        v.co*=f
    rock.scale=scale
    rock.rotation_euler=(rng.uniform(-.15,.15),rng.uniform(-.20,.20),rng.uniform(-pi,pi))
    rock.data.materials.append(stone_mat if idx%2 else stone_light)
    for p in rock.data.polygons:p.use_smooth=False
    rocks.append(rock)

# A modest ground plane is render-only and not part of the exported asset.
bpy.ops.mesh.primitive_plane_add(size=2,location=(.1,0,-.095))
ground=bpy.context.object
ground.name="H26 QA FLOOR ONLY (not GLB)"
ground.scale=(10,7,1)
qa_mat=mat("H26 studio floor",(.48,.52,.49))
ground.data.materials.append(qa_mat)

# QA renders from 4 sides, elevated 3/4, base close-up and silhouette.
scene.render.engine="BLENDER_WORKBENCH"
scene.render.resolution_x=1050
scene.render.resolution_y=1050
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGB"
scene.display.shading.color_type="MATERIAL"
scene.display.shading.light="STUDIO"
scene.display.shading.show_shadows=True
scene.display.shading.background_type="VIEWPORT"
scene.display.shading.background_color=(.81,.81,.79)
if hasattr(scene.display.shading,"show_cavity"):scene.display.shading.show_cavity=True
cam=next((o for o in scene.objects if o.type=="CAMERA"),None)
if cam is None:
    d=bpy.data.cameras.new("H26 QA ORTHOGRAPHIC");cam=bpy.data.objects.new("H26 QA ORTHOGRAPHIC",d)
    scene.collection.objects.link(cam)
scene.camera=cam
cam.data.type="ORTHO"
target=Vector((.55,.10,4.00))
views={
 "front":(Vector((1,-21,9.2)),target,16.1),
 "right":(Vector((22,-.5,8.8)),target,16.1),
 "back":(Vector((.5,21,9.0)),target,16.1),
 "three-quarter":(Vector((16,-18,11.0)),target,16.1),
 "root-close":(Vector((2,-10,3.5)),Vector((-.8,0,.75)),6.7),
 "top":(Vector((.5,-.02,23)),target,16.1)
}
renders={}
def render(name,setup):
    loc,aim,scale=setup
    cam.data.ortho_scale=scale
    cam.location=loc
    cam.rotation_euler=(aim-cam.location).to_track_quat("-Z","Y").to_euler()
    dest=out/(name+".png")
    scene.render.filepath=str(dest)
    bpy.ops.render.render(write_still=True)
    raw=dest.read_bytes()
    assert raw[:8]==b"\x89PNG\r\n\x1a\n" and struct.unpack(">II",raw[16:24])==(1050,1050)
    renders[name]={"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()}
for name,v in views.items():render(name,v)
prev=(scene.display.shading.color_type,scene.display.shading.light)
scene.display.shading.color_type="SINGLE"
scene.display.shading.single_color=(.025,.029,.023)
scene.display.shading.light="FLAT"
render("silhouette",views["front"])
scene.display.shading.color_type,scene.display.shading.light=prev

# Freeze original H23 old mesh in the new editable file; asset export only
# the NEW hero geometry. Two alternative mesh versions are NOT mixed in GLB.
blend=out/"pine005-h26-hero.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
assert blend.stat().st_size>100000
bpy.ops.object.select_all(action="DESELECT")
active_export=[body]+plate_objs+twig_objs+rocks
for o in active_export:o.select_set(True)
bpy.context.view_layer.objects.active=body
glb=out/"pine005-h26-hero.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",
                          use_selection=True,export_apply=True)
raw=glb.read_bytes()
assert raw[:4]==b"glTF" and struct.unpack_from("<I",raw,8)[0]==len(raw)
chunk,kind=struct.unpack_from("<I4s",raw,12)
assert kind==b"JSON" and chunk<len(raw)-20
gltf=json.loads(raw[20:20+chunk].decode("utf8").rstrip(" \x00"))
assert len(gltf.get("meshes",[]))>=len(active_export)-1
core_meshes=[o for o in hero.objects if o.name.startswith("H26 ONE_CONTINUOUS")]
assert len(core_meshes)==1
body_faces=len(body.data.polygons)
# Technical topology gate on welded central wood core.
qa_mesh=bmesh.new();qa_mesh.from_mesh(body.data)
nonmanifold=sum(not e.is_manifold for e in qa_mesh.edges)
zero=sum(f.calc_area()<1e-8 for f in qa_mesh.faces)
qa_mesh.free()
assert nonmanifold==0 and zero==0,("wood mesh failed",nonmanifold,zero)
report={
 "asset":"PINE-005","stage":"H26 new custom high-fidelity hero bole and grounded roots",
 "technical_status":"PASS","visual_status":"PENDING_G1A_VISUAL_JUDGEMENT",
 "reference_source":"assets/pine-002/reference.png",
 "reference_blob":"9e204263823ca9f40d46737dca5c1ee0a28a73a8",
 "archived_formal_source":"assets/pine-005/h23/pine005-h23-refined.blend",
 "blender_version":bpy.app.version_string,
 "trunk":{"construction":"new individually sculpted muscular asymmetric S-loft",
          "basal_radius":1.42,"prior_h23_basal_radius":.85,
          "extent_height":7.7,"core_faces":body_faces,
          "core_nonmanifold_edges":nonmanifold,"core_zero_area_faces":zero},
 "roots":{"wide_anatomical_buttresses":len(ROOTS),
          "contact_rocks":len(rocks),
          "fused_into_trunk":True,
          "no_separate_sleeve_root_collars":True},
 "branches":{"major":len(BRANCHES),"twig_offshoots":len(TWIGS)},
 "bark":{"geometry_shard_facets":len(plate_faces),
         "colored_materials":"neutral natural bark clay (not photographic PBR texture)",
         "flute_pattern":"none"},
 "textures":"NO NEW PBR/MAPS, G1-A GEOMETRY ONLY",
 "foliage":"NOT STARTED until G1-A passed",
 "glb":{"bytes":glb.stat().st_size,"sha256":hashlib.sha256(raw).hexdigest(),
        "mesh_count":len(gltf["meshes"])},
 "blend_bytes":blend.stat().st_size,
 "qa_views":renders,"tripo_credits":0,
 "production_game_modified":False,
 "promotion_to_formal_asset":"BLOCKED_UNTIL_VISUAL_REVIEW",
 "elapsed_seconds":round(time.monotonic()-T,1)
}
(out/"h26-qa.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
print("H26_NEW_HERO_TECHNICAL_RESULT",json.dumps(report,ensure_ascii=False),flush=True)
