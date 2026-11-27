"""H30 render-only LODs. Original glTFs remain the navigation/height source.
Run from repository root: blender -b --factory-startup --python .github/scripts/build_sample_lod.py
Original UVs/color are retained; textures receive explicit mobile caps. Gate faces below final worldY1.2
are copied without simplification; only the upper roof/columns are decimated.
"""
import bpy,bmesh,json,pathlib,hashlib,math,subprocess
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=pathlib.Path.cwd();OUT=ROOT/'fengming-v2-scene-a/assets/sample-lod';OUT.mkdir(parents=True,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0

def triangles(obj):return sum(len(p.vertices)-2 for p in obj.data.polygons)
def world_bounds(objects):
    points=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
    return [[min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)]]
def empty():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def import_one(path):
    empty();bpy.ops.import_scene.gltf(filepath=str(path));obs=[o for o in bpy.context.scene.objects if o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0]
    if len(obs)>1:bpy.ops.object.join()
    o=bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    # glTF splits vertices at UV/normal seams. Blender stores UVs per face-loop,
    # so welding only coincident positions preserves their UV values while
    # allowing the decimator to follow the actual surface topology.
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-9);bm.to_mesh(o.data);bm.free();o.data.update()
    return o

def filtered_copy(obj,name,keep):
    q=bpy.data.objects.new(name,obj.data.copy());bpy.context.collection.objects.link(q)
    bm=bmesh.new();bm.from_mesh(q.data);bm.faces.ensure_lookup_table()
    remove=[f for f in bm.faces if not keep(f)]
    bmesh.ops.delete(bm,geom=remove,context='FACES')
    # Remove loose vertices from the detached complement so bounds stay exact.
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
    bm.to_mesh(q.data);bm.free();q.data.update();return q

def decimate(obj,target):
    # Weld near-coincident split vertices only in the simplifiable region.
    # The source lower stair faces live in a separate protected object.
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bm.to_mesh(obj.data);bm.free();obj.data.update()
    before=triangles(obj)
    if before<=target:return {'before':before,'after':before,'ratio':1}
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    mod=obj.modifiers.new('H30 render LOD preserve scanned UVs','DECIMATE');mod.decimate_type='COLLAPSE';mod.ratio=target/before;mod.use_collapse_triangulate=True
    # Boundary vertices are kept fixed so the protected lower geometry remains
    # joined to its original upper silhouette without a visible separation.
    bm=bmesh.new();bm.from_mesh(obj.data);bm.verts.ensure_lookup_table();border={v.index for v in bm.verts if v.is_boundary};bm.free()
    if border:
        vg=obj.vertex_groups.new(name='LOD interior only');inside=[v.index for v in obj.data.vertices if v.index not in border]
        if inside:vg.add(inside,1,'REPLACE');mod.vertex_group=vg.name;mod.vertex_group_factor=1
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return {'before':before,'after':triangles(obj),'ratio':target/before,'protected_boundary_vertices':len(border)}

def export(obj,path):
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_image_format='AUTO',export_jpeg_quality=90,export_image_quality=90)
    post=subprocess.run(['python3',str(ROOT/'.github/scripts/build_sample_lod_post.py'),str(path)],check=True,text=True,capture_output=True);print('MOBILE_IMAGES',post.stdout.strip(),flush=True)
    data=path.read_bytes();return {'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'validated_embedded_images':json.loads(post.stdout.strip())['images']}

report={'kind':'render-only LOD; source models remain unchanged for nav/height/collision','sources':{},'assets':{},'texture_policy':'original UVs; albedo mobile cap1024 JPEG90, normal/roughness cap512 PNG; original assets untouched','generator':'Blender '+bpy.app.version_string}
for kind in ['terrain','gate']:
    src=ROOT/f'fengming-v2-scene-a/assets/{kind}-001/{kind}.glb';obj=import_one(src);original_bounds=world_bounds([obj]);before=triangles(obj)
    source_hash=hashlib.sha256(src.read_bytes()).hexdigest();entry={'source':str(src.relative_to(ROOT)),'source_sha256':source_hash,'triangles_before':before,'bounds_blender_z_up_before':original_bounds}
    # Authoritative source normalization in glTF Y-up, matching H29 index.
    b=original_bounds;glmin=[b[0][0],b[0][2],-b[1][1]];glmax=[b[1][0],b[1][2],-b[0][1]]
    center=[(a+c)/2 for a,c in zip(glmin,glmax)];scale=(40 if kind=='terrain' else 8.4)/max(glmax[0]-glmin[0],glmax[2]-glmin[2])
    if kind=='terrain':
        bm=bmesh.new();bm.from_mesh(obj.data);tree=BVHTree.FromBMesh(bm);hit=tree.ray_cast(Vector(((b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2,b[1][2]+1)),Vector((0,0,-1)))[0];bm.free()
        probe=hit.z if hit else b[1][2];translation=[-center[0]*scale,.12-probe*scale,-center[2]*scale];entry['source_probe_gltf_y']=probe
    else:translation=[-center[0]*scale,.15-glmin[1]*scale,-7.8-center[2]*scale]
    entry['source_normalization']={'gltf_y_up_bounds':[glmin,glmax],'scale':scale,'translation':translation,'matrix_column_major':[scale,0,0,0,0,scale,0,0,0,0,scale,0,*translation,1]}
    image_info=[];used=set()
    for mat in obj.data.materials:
        if not mat or not mat.use_nodes:continue
        for node in mat.node_tree.nodes:
            if node.type!='TEX_IMAGE' or not node.image or node.image in used:continue
            image=node.image;used.add(image);w,h=image.size
            if not w or not h:continue
            is_color=image.colorspace_settings.name=='sRGB';cap=1024 if is_color else 512;k=min(1,cap/max(w,h));nw,nh=max(1,round(w*k)),max(1,round(h*k))
            if nw!=w or nh!=h:image.scale(nw,nh)
            image.file_format='JPEG' if is_color else 'PNG'
            # AUTO chooses MIME from filepath/packed-file signature, not solely
            # file_format. Replace the in-memory name so packed source JPEG ORM
            # is re-encoded losslessly after the mobile-resolution resample.
            image.filepath_raw='//H30_'+image.name+('.jpg' if is_color else '.png')
            image_info.append({'name':image.name,'role':'baseColor' if is_color else 'normal_or_roughness','source_size':[w,h],'output_size':[nw,nh],'format':image.file_format})
    entry['mobile_textures']=image_info
    def extreme_face(f):return any(abs(v.co[i]-original_bounds[side][i])<1e-9 for v in f.verts for i in range(3) for side in (0,1))
    if kind=='terrain':
        protected=filtered_copy(obj,'H30 terrain exact extremal faces',extreme_face)
        body=filtered_copy(obj,'H30 terrain interior render LOD',lambda f:not extreme_face(f))
        entry['protected_extremal_triangles']=triangles(protected);entry['decimation']=decimate(body,max(1000,30000-triangles(protected)))
        bpy.ops.object.select_all(action='DESELECT');protected.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=protected;bpy.ops.object.join();bpy.data.objects.remove(obj,do_unlink=True);obj=protected
    else:
        b=original_bounds;scale=8.4/max(b[1][0]-b[0][0],b[1][1]-b[0][1]);cut=b[0][2]+(1.2-.15)/scale
        protected=filtered_copy(obj,'H30 gate unchanged real stair lower section',lambda f:min(v.co.z for v in f.verts)<=cut or extreme_face(f))
        upper=filtered_copy(obj,'H30 gate roof render LOD',lambda f:min(v.co.z for v in f.verts)>cut and not extreme_face(f))
        low=triangles(protected);hi=triangles(upper);entry.update({'gate_normalization_scale':scale,'protected_world_y_below':1.2,'protected_local_z_cut':cut,'protected_triangles':low,'upper_triangles_before':hi})
        if low<30000 and hi>0:
            target=max(3000,33000-low);entry['upper_decimation']=decimate(upper,target)
            bpy.ops.object.select_all(action='DESELECT');protected.select_set(True);upper.select_set(True);bpy.context.view_layer.objects.active=protected;bpy.ops.object.join()
            bpy.data.objects.remove(obj,do_unlink=True);obj=protected;entry['lower_faces_exact']=True
        else:
            bpy.data.objects.remove(protected,do_unlink=True);bpy.data.objects.remove(upper,do_unlink=True);entry['fallback']='gate retained intact because protected lower region exceeds safe target';entry['lower_faces_exact']=True
    # Decimator quadric solutions can overshoot the old AABB by fractions of a
    # millimetre. Preserve authored extremes and clamp only such overshoots.
    clamped=0
    for v in obj.data.vertices:
        for i in range(3):
            vv=max(original_bounds[0][i],min(original_bounds[1][i],v.co[i]));clamped+=int(vv!=v.co[i]);v.co[i]=vv
    obj.data.update();entry['clamped_extremal_coordinates']=clamped
    obj.name=f'H30 {kind} render-only LOD'
    # Keep the original extents exactly, even where the decimator would remove
    # an extremal vertex, so production placement/normalization remains identical.
    after=world_bounds([obj]);deltas=[max(abs(a-b) for a,b in zip(original_bounds[j],after[j])) for j in (0,1)]
    entry.update({'triangles_after':triangles(obj),'bounds_blender_z_up_after':after,'bounds_max_axis_delta':max(deltas),'material_slots':len(obj.data.materials)})
    path=OUT/f'{kind}.glb';entry.update(export(obj,path));report['sources'][kind]=entry['source'];report['assets'][kind]=entry
(OUT/'metadata.json').write_text(json.dumps(report,indent=2)+'\n');print('SAMPLE_LOD',json.dumps(report),flush=True)
