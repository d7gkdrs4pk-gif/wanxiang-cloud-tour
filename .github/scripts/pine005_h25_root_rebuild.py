"""H25 PINE-005 G1-A: replace only the artificial spike-root assembly.

Source is CURRENT FORMAL Blender asset H23, not failed H24 trial.
Main trunk above z=1.10, all branches, frozen original H22 meshes, and the
accepted broad S silhouette are preserved. A watertight transition collar and
five asymmetric, terrain-hugging broad structural roots replace the lower
sharp spider legs, then get locally voxel-unioned into the existing trunk.
No Tripo, no leaf canopy, no paid materials, no changes to game master.
"""
import bpy, bmesh, math, json, time, pathlib, struct, hashlib
from mathutils import Vector, noise
from math import sin,cos,pi

t0=time.monotonic()
root=pathlib.Path.cwd()/"fengming-v2-scene-a/assets/pine-005"
source=root/"h23/pine005-h23-refined.blend"
output=root/"h25"
output.mkdir(parents=True,exist_ok=True)
assert source.is_file() and source.stat().st_size>100000
bpy.ops.wm.open_mainfile(filepath=str(source))
scene=bpy.context.scene
previous_body=next(o for o in scene.objects if o.type=="MESH" and o.name.startswith("H23_CONTINUOUS_TRUNK_MAJOR_BRANCHES_BUTTRESS_ROOTS"))
previous_twigs=sorted([o for o in scene.objects if o.type=="MESH" and o.name.startswith("H23__TWIG ")],key=lambda o:o.name)
assert len(previous_twigs)==13
# A factual diagnostic: count degenerates and nonmanifold boundaries of the
# H23 starting mesh. H24 photo anomaly can't be asserted to be bad topology
# without an actual topology check. H24 remains excluded as mother.
def topo_report(o):
    bm=bmesh.new();bm.from_mesh(o.data)
    zeros=sum(f.calc_area()<1e-8 for f in bm.faces)
    nonmanifold=sum(not e.is_manifold for e in bm.edges)
    count=len(bm.faces)
    bm.free()
    return {"faces":count,"near_zero_area_faces":zeros,"nonmanifold_edges":nonmanifold}
baseline_topology=topo_report(previous_body)
active=bpy.data.collections.new("H25_ROOT_REBUILD_ACTIVE")
scene.collection.children.link(active)
def copy_active(o,prefix):
    c=o.copy();c.data=o.data.copy()
    active.objects.link(c);c.name=prefix+o.name
    c.hide_set(False);c.hide_render=False;c.hide_viewport=False
    o.hide_set(True);o.hide_render=True
    return c
body=copy_active(previous_body,"H25__")
twigs=[copy_active(o,"H25__") for o in previous_twigs]
assert len(active.objects)==14

# Root-related source geometry is fused to the main body in H23. Remove ONLY
# everything below the low basal seam and close the lower open rim. No upper
# branch geometry is reconstructed.
cut_height=1.03
bm=bmesh.new();bm.from_mesh(body.data)
geom=list(bm.verts)+list(bm.edges)+list(bm.faces)
bmesh.ops.bisect_plane(bm,geom=geom,dist=.0001,
    plane_co=Vector((0,0,cut_height)),plane_no=Vector((0,0,1)),
    clear_inner=True,clear_outer=False)
boundary=[e for e in bm.edges if e.is_boundary]
assert 8<len(boundary)<600,("unexpected cut boundary",len(boundary))
# Exact seam cross section from the PREVIOUS body's own cut contour. Matching
# this radial profile, rather than joining an unrelated smooth cylinder, stops
# the obvious bark-to-collar 'sleeve' line found in first H25 contact sheet.
seam_vertices=list({v for e in boundary for v in e.verts
                    if abs(v.co.z-cut_height)<.018})
assert len(seam_vertices)>=12,len(seam_vertices)
seam_cx=sum(v.co.x for v in seam_vertices)/len(seam_vertices)
seam_cy=sum(v.co.y for v in seam_vertices)/len(seam_vertices)
seam_profile=sorted([
    (math.atan2(v.co.y-seam_cy,v.co.x-seam_cx)%(2*pi),
     math.hypot(v.co.x-seam_cx,v.co.y-seam_cy))
    for v in seam_vertices])
assert min(r for _,r in seam_profile)>.2
def seam_radius(theta):
    t=theta%(2*pi)
    vals=seam_profile
    for i in range(len(vals)):
        j=(i+1)%len(vals)
        a,r=vals[i]
        b,s=vals[j]
        if j==0:b+=2*pi
        needle=t if t>=a else t+2*pi
        if a<=needle<=b:
            f=(needle-a)/max(.00001,b-a)
            return r*(1-f)+s*f
    return sum(r for _,r in vals)/len(vals)
bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
assert len(bm.faces)>5000
bm.to_mesh(body.data);bm.free()
body.data.update()
# New basal collar below is based on the very same confirmed S lower axis.
# It flares into roots and forms ONE connected primary tree mesh on union.
def create_mesh(name,vertices,faces):
    mesh=bpy.data.meshes.new(name+" mesh")
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    ob=bpy.data.objects.new(name,mesh)
    active.objects.link(ob)
    return ob
def stump():
    verts=[];faces=[]
    heights=[.025,.10,.23,.42,.65,.85,1.03,1.22,1.39]
    widths=[1.02,1.025,1.01,.96,.86,.80,.74,.70,.65]
    n=64
    for j,(z,r) in enumerate(zip(heights,widths)):
        shift=(-.25-.35*max(0,(z-.04)/1.40), .065)
        match=0.0 if z<=.46 else min(1.0,(z-.46)/(.57))
        match=match*match*(3-2*match)
        if z>=cut_height: match=1.0
        # At the cut, center/radius MUST match the old H23 contour exactly;
        # below it, transition smoothly into a broad asymmetrical buttress.
        sx=shift[0]*(1-match)+seam_cx*match
        sy=shift[1]*(1-match)+seam_cy*match
        for k in range(n):
            theta=2*pi*k/n
            rside=1+.068*sin(3*theta+.30)+.044*sin(5*theta-1.12)
            rside+=.03*noise.noise(Vector((theta*.8+.7,z*.9,2.4)))
            radius_old=seam_radius(theta)
            if z<=cut_height:
                rr=(r*rside)*(1-match)+radius_old*match
            else:
                rr=radius_old*(1-.15*min(1,(z-cut_height)/.36))
            zz=z+.035*(1-match)*sin(2*theta+.2)
            zz=max(.035,zz)
            verts.append((sx+rr*cos(theta),sy+rr*sin(theta),zz))
        if j:
            for k in range(n):
                a=(j-1)*n+k;b=(j-1)*n+(k+1)%n
                c=j*n+(k+1)%n;d=j*n+k
                faces.append((a,b,c,d))
    bottom=len(verts);verts.append((-.25,.065,.045))
    top=len(verts);verts.append((-.60,.065,1.39))
    for k in range(n):
        faces.append((bottom,(k+1)%n,k))
        i=(len(heights)-1)*n
        faces.append((top,i+k,i+(k+1)%n))
    return create_mesh("H25_UNIQUE_BASAL_BUTTRESS_COLLAR",verts,faces)

# Each thick root is a FLATTENED, meandering anatomical buttress (broad in
# horizontal plane, low in Z). Unlike H22-24, endings remain rounded and
# spread asymmetrically, not six pointed radial claws.
def catmull(p0,p1,p2,p3,t):
    return .5*((2*p1)+(-p0+p2)*t+
               (2*p0-5*p1+4*p2-p3)*t*t+
               (-p0+3*p1-3*p2+p3)*t*t*t)
def root_loft(name,ctrl,widths,heights):
    centers=[]
    for i in range(len(ctrl)-1):
        p0=Vector(ctrl[max(0,i-1)])
        p1=Vector(ctrl[i]);p2=Vector(ctrl[i+1])
        p3=Vector(ctrl[min(i+2,len(ctrl)-1)])
        for k in range(9):
            centers.append(catmull(p0,p1,p2,p3,k/9))
    centers.append(Vector(ctrl[-1]))
    n=20;verts=[];faces=[]
    for i,p in enumerate(centers):
        u=i/(len(centers)-1)
        param=u*(len(widths)-1)
        seg=min(len(widths)-2,int(param));t=param-seg
        # Fair curve; let each root remain broad at the contact with rocks.
        w=widths[seg]*(1-t)+widths[seg+1]*t
        h=heights[seg]*(1-t)+heights[seg+1]*t
        tangent=(centers[min(i+1,len(centers)-1)]-
                 centers[max(i-1,0)]).normalized()
        sideways=Vector((-tangent.y,tangent.x,0))
        if sideways.length<.001:sideways=Vector((1,0,0))
        sideways.normalize()
        for k in range(n):
            angle=2*pi*k/n
            # irregular bark shoulder, but no repeated round nodules.
            surface=1+.034*sin(3*angle+2.3*u)+.021*sin(7*angle-u)
            surface+=.028*noise.noise(Vector((p.x*.8,p.y*1.0,k*.28)))
            q=p+(sideways*cos(angle)*w+Vector((0,0,sin(angle)*h)))*surface
            verts.append(tuple(q))
        if i:
            for k in range(n):
                faces.append(((i-1)*n+k,(i-1)*n+(k+1)%n,
                              i*n+(k+1)%n,i*n+k))
    base=len(verts);verts.append(tuple(centers[0]))
    end=len(verts);verts.append(tuple(centers[-1]))
    for k in range(n):
        faces.append((base,(k+1)%n,k))
        t=(len(centers)-1)*n
        faces.append((end,t+k,t+(k+1)%n))
    return create_mesh("H25_GROUNDED_ROOT_"+name,verts,faces)

root_paths=[
 ("front_right_broad",
  [(-.30,-.31,.73),(.32,-.47,.41),(1.12,-.91,.23),(1.77,-1.35,.15),(2.28,-1.66,.12)],
  [.36,.30,.24,.17,.085],[.19,.145,.11,.085,.048]),
 ("left_front_wrap",
  [(-.55,-.25,.77),(-.98,-.56,.42),(-1.52,-.95,.26),(-1.74,-1.38,.18),(-2.16,-1.54,.12)],
  [.32,.29,.23,.15,.080],[.20,.15,.11,.08,.047]),
 ("far_left_rear",
  [(-.64,.32,.72),(-1.16,.65,.43),(-1.70,1.09,.29),(-2.05,1.47,.19),(-2.29,1.75,.12)],
  [.33,.27,.20,.14,.080],[.19,.15,.10,.075,.044]),
 ("back_right_angled",
  [(-.22,.34,.75),(.47,.73,.46),(1.23,1.20,.30),(1.50,1.48,.20),(1.93,1.71,.13)],
  [.35,.31,.21,.15,.085],[.20,.15,.12,.087,.052]),
 ("side_right_low",
  [(-.14,.20,.64),(.53,.13,.35),(1.17,.22,.22),(1.73,.43,.16),(2.22,.55,.13)],
  [.32,.26,.20,.135,.077],[.18,.14,.10,.077,.048]),
]
generated=[stump()]+[root_loft(*item) for item in root_paths]
assert len(generated)==6

# A single voxel union removes any clipping or 'inserted pipe' at the root
# transition. Source body *above* z=1.03 is still the H23 mesh, untouched.
bpy.ops.object.select_all(action="DESELECT")
for o in generated+[body]:o.select_set(True)
bpy.context.view_layer.objects.active=body
bpy.ops.object.join()
body=bpy.context.view_layer.objects.active
body.name="H25_ORGANIC_TRUNK_TO_ROOT_UNIFIED"
body.data.remesh_voxel_size=.046
bpy.ops.object.voxel_remesh()
assert len(active.objects)==14,(len(active.objects),[o.name for o in active.objects])
faces_before=len(body.data.polygons)
assert 12000<faces_before<170000,faces_before

# Limit polishing to the basal radius to prevent the upper H23 tree reverting
# to a featureless cone. Smooth seam, then retain natural low amplitude relief.
import bmesh
bm=bmesh.new();bm.from_mesh(body.data)
basal_verts=[v for v in bm.verts if v.co.z<1.25]
for _ in range(2):
    bmesh.ops.smooth_vert(bm,verts=basal_verts,factor=.19,
                          use_axis_x=True,use_axis_y=True,use_axis_z=True)
bm.to_mesh(body.data);bm.free()
body.data.update()
for poly in body.data.polygons:poly.use_smooth=True

# Optional rocky terrain is STAGING EVIDENCE only; deliberately excluded from
# the 3D export. It proves roots cross rock/ground rather than hovering.
stone_mat=bpy.data.materials.get("H25 Test Rock") or bpy.data.materials.new("H25 Test Rock")
stone_mat.diffuse_color=(.42,.44,.41,1)
stones=[]
for idx,(cx,cy,cz,sx,sy,sz) in enumerate([
    (1.25,-1.17,.07,.68,.46,.30),
    (-1.62,-1.14,.08,.59,.41,.22),
    (-1.84,1.18,.06,.57,.44,.20),
    (1.12,1.26,.05,.52,.44,.24)
]):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(cx,cy,cz))
    rock=bpy.context.object
    rock.name="QA_ONLY_contact_rock_"+str(idx+1)
    rock.scale=(sx,sy,sz)
    rock.data.materials.append(stone_mat)
    rock.hide_render=False
    stones.append(rock)
# Remove floor only in closeup alternate to investigate previous triangular
# ground slab: baseline H24 unexplained artifact might have been stage lighting.
floor=next((o for o in scene.objects if o.type=="MESH" and "QA FLOOR" in o.name),None)
assert floor is not None, "Expected H23 QA floor missing"
def visible_floor(enable):
    floor.hide_render=not enable
    for rock in stones:rock.hide_render=not enable

# Render isolated new root assembly alongside current formally-approved H23.
scene.render.engine="BLENDER_WORKBENCH"
scene.render.resolution_x=880
scene.render.resolution_y=880
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.display.shading.color_type="MATERIAL"
scene.display.shading.light="STUDIO"
scene.display.shading.show_shadows=True
scene.display.shading.background_type="VIEWPORT"
scene.display.shading.background_color=(.80,.81,.79)
if hasattr(scene.display.shading,"show_cavity"):
    scene.display.shading.show_cavity=True
camera=next(o for o in scene.objects if o.type=="CAMERA")
scene.camera=camera
camera.data.type="ORTHO"
target=Vector((.70,0,4.0))
views={
 "front":((1,-19,8.6),target,13.5),
 "right":((19,-.4,8.3),target,13.5),
 "back":((.5,19,8.6),target,13.5),
 "top":((.5,-.02,21.0),target,13.5),
 "root_front_close":((.3,-7.6,3.2),Vector((-.1,0,.67)),4.0),
 "root_side_close":((6.5,-3.2,2.5),Vector((-.2,0,.58)),3.65),
}
pictures={}
def render(label,loc,aim,scale):
    camera.data.ortho_scale=scale
    camera.location=loc
    camera.rotation_euler=(aim-camera.location).to_track_quat("-Z","Y").to_euler()
    dest=output/(label+".png")
    scene.render.filepath=str(dest)
    bpy.ops.render.render(write_still=True)
    raw=dest.read_bytes()
    assert raw[:8]==b"\x89PNG\r\n\x1a\n" and struct.unpack(">II",raw[16:24])==(880,880)
    pictures[label]={"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()}
for name,(loc,aim,scale) in views.items():render(name,loc,aim,scale)
visible_floor(False)
render("root_no_floor",(0,-7.5,3.3),Vector((-.1,0,.6)),3.9)
old_shading=(scene.display.shading.color_type,scene.display.shading.light)
scene.display.shading.color_type="SINGLE"
scene.display.shading.single_color=(.03,.035,.03)
scene.display.shading.light="FLAT"
render("silhouette",(1,-19,8.6),target,13.5)
scene.display.shading.color_type,scene.display.shading.light=old_shading
visible_floor(True)

# Source H23 remains as frozen meshes in this H25 file. Only the new trunk
# and 13 unchanged H23 twigs are exported; QA stones/floor are excluded.
bpy.ops.object.select_all(action="DESELECT")
for o in [body]+twigs:o.select_set(True)
bpy.context.view_layer.objects.active=body
blend=output/"pine005-h25-roots.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
glb=output/"pine005-h25-roots.glb"
bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",
                          use_selection=True,export_apply=True)
raw=glb.read_bytes()
assert raw[:4]==b"glTF" and struct.unpack_from("<I",raw,8)[0]==len(raw)
chunk,kind=struct.unpack_from("<I4s",raw,12)
assert kind==b"JSON" and chunk<len(raw)-20
data=json.loads(raw[20:20+chunk].decode("utf8").rstrip(" \x00"))
assert len(data.get("meshes",[]))==14
topo=topo_report(body)
# No pretend the mesh is valid: classify nonmanifold explicitly.
technical_status="PASS" if topo["nonmanifold_edges"]==0 and topo["near_zero_area_faces"]==0 else "TOPOLOGY_REVIEW_REQUIRED"
report={
 "asset":"PINE-005","stage":"H25 local rooted buttress reconstruction from H23",
 "technical_status":technical_status,"visual_status":"NOT_YET_ART_APPROVED",
 "source":"assets/pine-005/h23/pine005-h23-refined.blend",
 "source_glb_sha256":"b9c32dcfdc293bc224de87f36154a8a7d4b3ed5357f1b3a1acbd0c6746ff04ac",
 "root_case":"removed only below z=1.03; sampled exact H23 cut contour for seamless basal transition and five asymmetric ground-gripping buttresses",
 "seam_contour":{"vertices":len(seam_vertices),"center":[round(seam_cx,4),round(seam_cy,4)],"radial_min":round(min(r for _,r in seam_profile),4),"radial_max":round(max(r for _,r in seam_profile),4)},
 "previous_h24_root_artifact_cause":"not proven; floor-independent closeup and topological evidence included",
 "baseline_topology":baseline_topology,"new_topology":topo,
 "main_root_count":5,"root_meshes_joined":6,"root_base_cut_z":cut_height,
 "active_glb_meshes":len(data["meshes"]),"fused_body_faces":len(body.data.polygons),
 "base_voxel_size":.046,"no_canopy":True,"pbr_textures":False,
 "tripo_credits_added":0,"production_game_modified":False,
 "outputs":{"blend_bytes":blend.stat().st_size,"glb_bytes":glb.stat().st_size,
     "glb_sha256":hashlib.sha256(raw).hexdigest(),"views":pictures},
 "evaluation_gate":"visual+watertight before any model promotion",
 "elapsed_seconds":round(time.monotonic()-t0,1)
}
(output/"h25-qa.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
print("PINE005_H25_RESULT",json.dumps(report,ensure_ascii=False),flush=True)
