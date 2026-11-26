"""PINE-005 H.22 / G1-A: controlled ancient pine trunk-only first visual sample.
Licensed reference: same repo assets/pine-002/reference.png (approved Git blob).
Geometric purpose: ONE smooth continuously-tapered S trunk, separate supporting
branches, discreet radiating roots. NO needles, canopy pads, AI model calls,
procedural randomness, automatic visual PASS, or production-game integration.
"""
import bpy, math, json, struct, hashlib, pathlib, time
from mathutils import Vector
from math import sin, cos, pi

t0=time.monotonic()
bpy.ops.wm.read_factory_settings(use_empty=True)
out=pathlib.Path.cwd()/"fengming-v2-scene-a"/"assets"/"pine-005"
out.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene
scene.render.engine="BLENDER_WORKBENCH"
scene.render.resolution_x=850
scene.render.resolution_y=850
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGBA"
scene.render.film_transparent=False
scene.render.film_transparent=False
scene.display.shading.color_type="MATERIAL"
scene.display.shading.light="STUDIO"
scene.display.shading.show_shadows=True
if hasattr(scene.display.shading,"show_cavity"):
    scene.display.shading.show_cavity=True

def mat(name,color):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    return m
bark=mat("Mature Pine Bark - brown-grey geometry only",(0.36,0.27,0.205))
primary=mat("Branch Bark - lighter brown geometry only",(0.38,0.288,0.21))
root_mat=mat("Root Bark - cool shaded brown",(0.28,0.236,0.192))
earth=mat("Unexported QA stage",(0.52,0.54,0.49))

def vec(x):return Vector(x)
def cinterp(p0,p1,p2,p3,t):
    return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)
def sample_controls(knots,steps=12):
    centers=[];radii=[]
    for i in range(len(knots)-1):
        p0=vec(knots[max(0,i-1)][:3]); p1=vec(knots[i][:3])
        p2=vec(knots[i+1][:3]); p3=vec(knots[min(i+2,len(knots)-1)][:3])
        for j in range(steps):
            t=j/steps
            centers.append(cinterp(p0,p1,p2,p3,t))
            # all radius controls taper monotonically; avoid collar/lump artefacts
            eased=t*t*(3-2*t)
            radii.append(knots[i][3]*(1-eased)+knots[i+1][3]*eased)
    centers.append(vec(knots[-1][:3]));radii.append(knots[-1][3])
    return centers,radii
asset_meshes=[]
def loft(name,knots,material,steps=12,ring=20,rough=.011,cap=True):
    centers,radii=sample_controls(knots,steps)
    ring_points=[];norm=None
    for i,p in enumerate(centers):
        tangent=(centers[min(i+1,len(centers)-1)]-centers[max(i-1,0)]).normalized()
        if norm is None or norm.length<.00001:
            ref=Vector((0,1,0)) if abs(tangent.dot(Vector((0,1,0))))<.82 else Vector((0,0,1))
            norm=tangent.cross(ref).normalized()
        else:
            norm=(norm-tangent*norm.dot(tangent)).normalized()
        binorm=tangent.cross(norm).normalized()
        ring_points.append((p,norm,binorm))
    verts=[]
    for i,(p,norm,binorm) in enumerate(ring_points):
        for a in range(ring):
            theta=2*pi*a/ring
            # very subtle longitudinal bark fluting; NEVER repeated rounded lumps
            groove=1+rough*(.48*sin(9*theta+.085*i)+.40*sin(13*theta-.055*i)+.15*sin(3*theta+.021*i))
            point=p+radii[i]*groove*(cos(theta)*norm+sin(theta)*binorm)
            verts.append(tuple(point))
    faces=[]
    for i in range(len(ring_points)-1):
        for j in range(ring):
            nxt=(j+1)%ring
            faces.append((i*ring+j,i*ring+nxt,(i+1)*ring+nxt,(i+1)*ring+j))
    if cap:
        j0=len(verts);verts.append(tuple(centers[0]))
        j1=len(verts);verts.append(tuple(centers[-1]))
        for k in range(ring):
            nxt=(k+1)%ring
            faces.append((j0,nxt,k))
            last=(len(ring_points)-1)*ring
            faces.append((j1,last+k,last+nxt))
    mesh=bpy.data.meshes.new(name+" Surface")
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(obj)
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth=True
    asset_meshes.append(obj)
    return obj,len(ring_points),[float(r) for r in radii]

# Coordinates based on the APPROVED original: base at left, a muscular low
# S-turn opening into a long right-leaning main bole, then tighter upper turn.
# Front view is along -Y; X is reference image horizontal and Z is height.
trunk=[
 (-.25,.05,.13,.72),(-.42,.10,.65,.70),(-.65,.06,1.25,.64),
 (-.79,.02,1.95,.56),(-.72,.01,2.67,.51),(-.38,.03,3.32,.44),
 (.22,.08,3.87,.375),(.95,.13,4.36,.318),
 (1.69,.24,4.78,.275),(2.36,.28,5.25,.235),
 (2.78,.22,5.82,.19),(2.69,.14,6.40,.153),
 (2.96,.03,6.98,.124),(3.35,-.08,7.36,.105),
 (3.66,-.12,7.64,.071)
]
assert all(trunk[i][3]>=trunk[i+1][3] for i in range(len(trunk)-1))
main,rings,radius_samples=loft("MAIN S-TRUNK — one continuously lofted mesh",trunk,bark,steps=14,ring=32,rough=.032)
assert rings>150 and max(radius_samples)==.72
assert all(radius_samples[i]>=radius_samples[i+1]-1e-6 for i in range(len(radius_samples)-1))

# All branch collars originate slightly inside the existing trunk and fan OUT.
# Each is its own editable curve-derived mesh (not clay merged / metaballs).
branches=[
 ("A lower left outstretched",[
  (.86,.10,4.36,.245),(.18,-.03,4.30,.225),(-.70,-.17,4.32,.17),
  (-1.72,-.34,4.22,.125),(-2.94,-.24,4.16,.084),(-4.25,-.12,4.30,.045),
  (-5.18,-.18,4.54,.020)]),
 ("B high left horizontal",[
  (2.69,.16,6.36,.182),(1.9,.33,6.45,.158),(.95,.56,6.56,.124),
  (-.36,.54,6.64,.092),(-1.65,.35,6.72,.058),(-2.85,.12,6.93,.022)]),
 ("C upper right wide",[
  (2.82,.14,6.22,.176),(3.63,-.08,6.37,.152),(4.38,-.32,6.23,.118),
  (5.25,-.46,6.12,.087),(6.31,-.41,6.20,.058),(7.22,-.38,6.29,.020)]),
 ("D lower right counterbalance",[
  (1.66,.17,4.73,.212),(2.57,-.13,4.74,.172),(3.37,-.60,4.56,.142),
  (4.19,-1.05,4.16,.106),(5.12,-1.25,3.90,.064),(6.16,-1.33,4.10,.026)]),
 ("E middle right tier",[
  (2.35,.24,5.20,.177),(3.06,.56,5.16,.144),(3.76,.92,5.23,.115),
  (4.51,1.18,5.41,.075),(5.25,1.23,5.61,.028)]),
 ("F upper canopy apex support",[
  (3.22,-.07,7.27,.124),(3.94,-.22,7.41,.092),(4.71,-.33,7.55,.057),
  (5.43,-.23,7.70,.020)]),
 ("G rear left counterbalance",[
  (1.45,.22,4.74,.155),(.64,.83,4.83,.124),
  (-.25,1.42,4.98,.082),(-1.19,1.68,5.03,.030)]),
]
branchnames=[]
for name,pts in branches:
    loft("BRANCH "+name,pts,primary,steps=12,ring=14,rough=.013)
    branchnames.append(name)

# Secondary offshoots are short branch-support structures, NOT foliage or
# forked rounded balls. Use few, asymmetric, visually traceable branches.
twigs=[
 ("left-1",[(-2.6,-.26,4.17,.09),(-3.2,-.64,4.34,.06),(-3.75,-.91,4.54,.024)]),
 ("left-2",[(-3.7,-.12,4.26,.067),(-4.1,.13,4.49,.044),(-4.65,.48,4.58,.019)]),
 ("left-3",[(-1.22,-.32,4.27,.105),(-1.46,-.82,4.60,.071),(-1.85,-1.20,4.70,.026)]),
 ("upper-left-1",[(.30,.56,6.62,.08),(-.12,.23,6.96,.057),(-.54,-.03,7.12,.022)]),
 ("upper-left-2",[(-1.47,.37,6.76,.054),(-2.12,.72,6.90,.039),(-2.65,.96,6.88,.016)]),
 ("upper-left-3",[(1.28,.50,6.53,.10),(.93,.86,6.78,.065),(.38,1.13,6.90,.023)]),
 ("right-1",[(5.11,-.45,6.13,.072),(5.45,-.84,6.42,.042),(6.03,-1.05,6.54,.016)]),
 ("right-2",[(6.17,-.41,6.22,.052),(6.62,-.09,6.44,.038),(7.11,.17,6.52,.016)]),
 ("low-right-1",[(4.00,-.95,4.25,.091),(4.51,-.78,4.49,.054),(5.04,-.51,4.53,.021)]),
 ("low-right-2",[(5.20,-1.22,3.91,.05),(5.76,-1.58,3.94,.032),(6.42,-1.91,4.15,.014)]),
 ("middle-right-1",[(3.64,.86,5.22,.084),(3.95,1.28,5.44,.052),(4.25,1.65,5.55,.019)]),
 ("middle-right-2",[(4.44,1.18,5.43,.067),(4.82,1.55,5.70,.043),(5.17,1.97,5.89,.019)]),
 ("apex-1",[(4.18,-.27,7.45,.074),(4.43,.15,7.77,.048),(4.94,.47,7.94,.017)]),
]
for name,pts in twigs:loft("TWIG "+name,pts,primary,steps=10,ring=10,rough=.007)
# Ground-gripping ROOTS: individual smooth tapered spurs, not many ropes
# wrapped round the trunk. Root mesh starts under/inside main trunk base.
roots=[
 ("front sweep",[(-.22,-.21,.38,.32),(.35,-.52,.24,.26),(1.09,-.88,.14,.19),(1.92,-1.23,.08,.12),(2.57,-1.48,.06,.047)]),
 ("left grip",[(-.48,.02,.45,.28),(-1.05,-.16,.23,.23),(-1.76,-.62,.11,.14),(-2.36,-.93,.06,.055)]),
 ("back grip",[(-.31,.29,.52,.25),(-.77,.85,.24,.21),(-1.26,1.51,.10,.135),(-1.41,2.03,.06,.04)]),
 ("right rear",[(-.14,.26,.43,.25),(.57,.71,.21,.19),(1.24,1.29,.11,.11),(1.81,1.71,.08,.044)]),
 ("right close",[(-.05,-.16,.31,.26),(.61,-.01,.19,.20),(1.16,.30,.09,.12),(1.71,.36,.05,.04)]),
 ("left forward",[(-.55,-.12,.35,.27),(-.86,-.55,.18,.19),(-1.05,-1.15,.08,.11),(-1.42,-1.61,.05,.04)]),
]
for name,pts in roots:loft("ROOT "+name,pts,root_mat,steps=14,ring=17,rough=.014)

# One flat studio reference ground is NOT included in GLB and not used as an
# imaginary root rock pile. Tree geometry alone is exported.
bpy.ops.mesh.primitive_plane_add(size=2,location=(.5,0,-.01))
plane=bpy.context.object;plane.name="QA FLOOR — never export"
plane.scale=(11,7.0,1)
plane.data.materials.append(earth)

camera_data=bpy.data.cameras.new("H22 Orthographic QA Camera")
camera=bpy.data.objects.new("H22 Orthographic QA Camera",camera_data)
scene.collection.objects.link(camera);scene.camera=camera
camera.data.type="ORTHO";camera.data.ortho_scale=13.75
look=Vector((.70,0,4.0))
views={"front":(1,-19,8.6),"right":(19,-.4,8.3),"back":(.5,19,8.6),"top":(.5,-.02,21.0)}
qa_views={}
for key,position in views.items():
    camera.location=position
    camera.rotation_euler=(look-camera.location).to_track_quat("-Z","Y").to_euler()
    p=out/("trunk-"+key+".png")
    scene.render.filepath=str(p)
    bpy.ops.render.render(write_still=True)
    png=p.read_bytes()
    assert png[:8]==b"\x89PNG\r\n\x1a\n" and struct.unpack(">II",png[16:24])==(850,850)
    qa_views[key]={"bytes":len(png),"sha256":hashlib.sha256(png).hexdigest()}

# Silhouette from black/flat studio, same geometry, not a stylized render.
old_light=scene.display.shading.light;old_type=scene.display.shading.color_type
scene.display.shading.light="FLAT"
scene.display.shading.color_type="SINGLE"
scene.display.shading.single_color=(.015,.018,.017)
scene.display.shading.show_shadows=False
camera.location=views["front"]
camera.rotation_euler=(look-camera.location).to_track_quat("-Z","Y").to_euler()
sil=out/"trunk-silhouette.png";scene.render.filepath=str(sil)
bpy.ops.render.render(write_still=True)
assert sil.is_file() and sil.stat().st_size>1000
scene.display.shading.light=old_light;scene.display.shading.color_type=old_type
scene.display.shading.show_shadows=True

# Preserve editable source before export. Groups are intentionally separate
# to permit future surgical edits to branches / roots while main trunk is one.
for o in asset_meshes:assert o.type=="MESH" and len(o.data.vertices)>20
blend=out/"pine005-trunk.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
bpy.ops.object.select_all(action="DESELECT")
for o in asset_meshes:o.select_set(True)
bpy.context.view_layer.objects.active=main
glb=out/"pine005-trunk.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,export_apply=True)
raw=glb.read_bytes()
assert raw[:4]==b"glTF" and struct.unpack_from("<I",raw,8)[0]==len(raw)
chunk,kind=struct.unpack_from("<I4s",raw,12)
assert kind==b"JSON"
gltf=json.loads(raw[20:20+chunk].decode("utf-8").rstrip("\x00 "))
mesh_count=len(gltf["meshes"])
assert mesh_count>=len(asset_meshes)

stats={
 "asset":"PINE-005","phase":"H.22 G1-A trunk and major branches only",
 "technical_status":"PASS","visual_status":"PENDING_HUMAN_QA",
 "source":"assets/pine-002/reference.png",
 "approved_reference_blob":"9e204263823ca9f40d46737dca5c1ee0a28a73a8",
 "blender_version":bpy.app.version_string,
 "production_game_changed":False,"tripo_credits":0,
 "trunk":{"construction":"single non-segmented continuous loft surface",
          "ring_count":rings,"cross_section_vertices":32,
          "taper_monotonic":True,"no_radial_swelling":True,
          "closed_mesh":True},
 "branches":{"major":len(branches),"secondary":len(twigs)},
 "roots":{"count":len(roots),"individually_editable":True},
 "canopy":"NOT MADE; G1-B blocked until G1-A visual pass",
 "mesh_object_count":len(asset_meshes),"glb_mesh_count":mesh_count,
 "blend_bytes":blend.stat().st_size,
 "glb_bytes":len(raw),"glb_sha256":hashlib.sha256(raw).hexdigest(),
 "views":qa_views,
 "silhouette":"trunk-silhouette.png",
 "image_resolution":[850,850],
 "g1a_hard_rules":[
    "trunk must not look like separated rope coils / fused blobs",
    "sweeping muscular S form must match approved front reference",
    "branch junctions need realistic attachment and tapered outward structure",
    "roots must be distinct, not fused muddy rock mass",
    "no tree canopy until trunk approved"],
 "elapsed_seconds":round(time.monotonic()-t0,1)
}
(out/"trunk-qa.json").write_text(json.dumps(stats,ensure_ascii=False,indent=2)+"\n")
print("H22_PINE005_TECHNICAL_PASS "+json.dumps(stats,ensure_ascii=False),flush=True)
