"""H29: revise the SAME H28 gate-pine .blend for its real phone game camera.
Narrow lower bole, flatten/taper existing roots; replace sparse brush islands
with notched three-dimensional needle crowns: largest on the long +X arm,
small upper crown and offset rear crown. No ellipsoids and no paid generation.
"""
import bpy, math, random, pathlib, json, struct, hashlib
from mathutils import Vector, noise
from math import sin,cos,pi
repo=pathlib.Path.cwd();out=repo/'fengming-v2-scene-a/assets/pine-006';out.mkdir(parents=True,exist_ok=True)
source=out/'h28-gate-pine.blend';bpy.ops.wm.open_mainfile(filepath=str(source))
wood=next(o for o in bpy.data.objects if o.name.startswith('H28 WOOD'))
stone=next(o for o in bpy.data.objects if o.name.startswith('H28 ROCKS'))
for o in list(bpy.data.objects):
    if o not in [wood,stone]:bpy.data.objects.remove(o,do_unlink=True)
wood.name='H29 aged pine narrower bole ground hugging roots'
stone.name='H29 retained root contact slope stones'
# Reuse H28 merged sculpture; no new trunk/roots. H28 mesh is already in
# world-sized Blender Z-up coordinates, with root collar at zero.
centers=[(0,0,0),(.42,-.147,.025),(.85,-.35,-.07),(1.42,-.44,-.16),(1.96,-.315,-.238),(2.48,.105,-.295),(2.89,.728,-.14),(3.28,1.456,.164),(3.70,2.03,.36),(4.11,2.40,.19),(4.55,2.28,-.008),(5.01,2.43,-.106),(5.39,2.877,-.18)]
def axis_at(z):
    for i in range(len(centers)-1):
        a,b=centers[i],centers[i+1]
        if a[0]<=z<=b[0]:
            t=(z-a[0])/(b[0]-a[0]);return (a[1]*(1-t)+b[1]*t,a[2]*(1-t)+b[2]*t)
    return centers[-1][1:]
roots_changed=0;bole_changed=0
for v in wood.data.vertices:
    p=v.co.copy();x,y,z=p
    if z<3.75:
        cx,cy=axis_at(max(0,z));f=.67 if z<2.85 else .67+.33*min(1,(z-2.85)/.90)
        x=cx+(x-cx)*f;y=cy+(y-cy)*f;bole_changed+=1
    # Ground roots flatten broadly and settle gradually into the slope.
    # Distal part has no high fingers or hard standing tips.
    r=math.hypot(x,y)
    if z<1.02 and r>.40:
        w=min(1,(r-.40)/.80)*min(1,(1.02-z)/.55)
        z=z*(1-.72*w)-.10*w
        if r>1.05:z-=min(.20,(r-1.05)*.22)*w
        roots_changed+=1
    # Raise and modestly shorten the actual long forward arm, matching the
    # game-camera silhouette trial; no lighting/camera changes in the asset.
    if x>1.7 and abs(z-3.10)<.76:
        u=min(1,(x-1.7)/1.25);u=u*u*(3-2*u)
        bell=max(0,1-((z-3.10)/.76)**2)**2
        w=u*bell
        z+=1.03*w;y+=1.82*w
        x=1.7+(x-1.7)*(1-.34*w)
    if x>2.7 and z>3.8:
        u=min(1,(z-3.8)/.7);u=u*u*(3-2*u)
        x=2.7+(x-2.7)*(1-.45*u)
    if x<-.5 and z>3.0:
        u=min(1,(z-3.0)/.8);u=u*u*(3-2*u)
        x=-.5+(x+.5)*(1-.45*u)
    if x>3.40 and z>2.3:
        x=3.40+.32*(1-math.exp(-(x-3.40)/.32))
    v.co=(x,y,z)
wood.data.update()
# Drop detached H28 needle-support spray components which no longer belong
# to the new crown layout; preserve H27 trunk, twigs and bark plates.
# Original H28 appended canopy sprays have small disconnected 18-vertex tubes.
me=wood.data;adj=[[] for _ in me.vertices]
for e in me.edges:a,b=e.vertices;adj[a].append(b);adj[b].append(a)
seen=set();remove=set()
for start in range(len(me.vertices)):
    if start in seen:continue
    q=[start];seen.add(start)
    for a in q:
        for b in adj[a]:
            if b not in seen:seen.add(b);q.append(b)
    if len(q)<=24:
        zz=[me.vertices[k].co.z for k in q]
        if min(zz)>2.55:remove.update(q)
if remove:
    import bmesh
    bm=bmesh.new();bm.from_mesh(me);bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm,geom=[bm.verts[i] for i in remove],context='VERTS');bm.to_mesh(me);bm.free();me.update()
# Preserve H28 scene-calibrated wood/stone material factors.
def getmat(ob):return ob.data.materials[0]
barkmat=getmat(wood);stonemat=getmat(stone)
for m in [barkmat,stonemat]:m.name=m.name.replace('H28','H29')
# Final localized slate finish: retained rocks/locations and original UVs.
# More vertex samples carry dark mineral/moss mottling and fine crack bands,
# avoiding an extra texture or a fourth material/draw. Displacement is bounded
# below 0.025 world units, so stone contact and navigation remain unchanged.
import bmesh
bm=bmesh.new();bm.from_mesh(stone.data)
bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=2,use_grid_fill=True)
bm.to_mesh(stone.data);bm.free();stone.data.update()
for v in stone.data.vertices:
    p=v.co.copy()
    d=Vector((noise.noise(p*8+Vector((3,0,0))),noise.noise(p*8+Vector((0,4,0))),noise.noise(p*8+Vector((0,0,5)))))*.012
    v.co+=d
stone.data.update()
if stone.data.color_attributes.get('Color'):stone.data.color_attributes.remove(stone.data.color_attributes['Color'])
sc=stone.data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='POINT')
for v in stone.data.vertices:
    p=v.co;coarse=noise.noise(p*3.5+Vector((7,11,2)));grain=noise.noise(p*27+Vector((2,5,9)))
    # Fracture bands are narrow, irregular and interrupted; no repeated stripes.
    fracture=abs(noise.noise(p*8.7+Vector((4,9,3))))<.075 and noise.noise(p*3.1)>-.1
    a=.205+.048*coarse+.024*grain
    if fracture:a*=.56
    moss=max(0,noise.noise(p*6.1+Vector((13,6,2)))-.13)*min(1,max(0,(.45-p.z)*2.2))
    sc.data[v.index].color=(max(.07,a*.88-moss*.08),max(.08,a*1.02+moss*.08),max(.08,a*1.03-moss*.04),1)
stone_detail_vertices=len(stone.data.vertices)


def vmat(name,rough=1):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.use_backface_culling=False
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough
    vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';m.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
    return m
leafmat=vmat('H29 dense ink jade pine crown',.97)
reflectance={'needles':(.13,.23,.11),'bark':(.14,.13,.115),'slate':(.27,.29,.28)}
# Authored notched perimeter, asymmetric bays and unequal lobes. This is a
# flattened branching mass with an irregular top and thick dark underside,
# not an ellipse or a set of green pods.
outline=[(-1,-.22),(-.97,-.54),(-.78,-.66),(-.63,-.62),(-.56,-.19),(-.24,-.21),(-.17,-.66),(.08,-.72),(.18,-.66),(.23,-.19),(.55,-.24),(.60,-.68),(.80,-.53),(1,-.30),(.91,-.05),(.98,.14),(.75,.30),(.65,.55),(.45,.50),(.25,.72),(.05,.55),(-.08,.70),(-.30,.65),(-.45,.45),(-.70,.55),(-.78,.26),(-1,.20),(-.87,.02)]
# center x/y/z is the branch-supported lower plane. Main is wider and lower;
# back crown is physically 2.4 units behind it and top crown is much smaller.
crowns=[
 dict(name='long arm main crown',c=(2.50,.40,4.30),scale=(1.90,.82),thick=.50,turn=.32),
 dict(name='small high crown',c=(2.35,1.65,5.04),scale=(1.00,.55),thick=.43,turn=.32),
 dict(name='offset rear crown',c=(.00,1.50,3.90),scale=(1.18,.65),thick=.46,turn=.27),
 dict(name='short balancing tip',c=(-.55,-.35,3.25),scale=(.50,.40),thick=.35,turn=.32)]
rng=random.Random(290029);verts=[];faces=[];colors=[];needletri=0
def inside_polygon(x,y):
    yes=False;j=len(outline)-1
    for i in range(len(outline)):
        a,b=outline[i],outline[j]
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:yes=not yes
        j=i
    return yes
# Angular variation is coherent across all four depth rings: visible notches
# remain notches through the crown volume instead of disappearing in a dome.
def transform(crown,u,v,z):
    a=crown['turn'];x=u*crown['scale'][0];y=v*crown['scale'][1];c=crown['c']
    return Vector((c[0]+x*cos(a)-y*sin(a),c[1]+x*sin(a)+y*cos(a),c[2]+z))

def addv(p,color):verts.append(tuple(p));colors.append((*color,1));return len(verts)-1
for k,crown in enumerate(crowns):
    rings=[];th=crown['thick'];N=len(outline)
    for ring,(sc,h) in enumerate([(.88,0),(1,.26),(.93,1)]):
        inds=[]
        for j,(u,v) in enumerate(outline):
            zz=h*th+.055*sin(j*2.7+k)+.025*cos(j*4.1)
            p=transform(crown,u*sc,v*sc,zz)
            if ring==0:rgb=(.045,.103,.049)
            elif ring==1:rgb=(.07,.17,.066)
            else:
                bright=.92+.12*sin(j*1.71+k)
                rgb=tuple(v*bright for v in (.145,.29,.12))
            inds.append(addv(p,rgb))
        rings.append(inds)
    for ring in range(len(rings)-1):
        for j in range(N):faces.append((rings[ring][j],rings[ring][(j+1)%N],rings[ring+1][(j+1)%N],rings[ring+1][j]))
    faces.append(tuple(reversed(rings[0])));faces.append(tuple(rings[-1]))
    # Needles across the top reinforce pine texture; near-edge fans protrude
    # in all directions so mobile silhouette stays feathery but cohesive.
    amount=850 if k==0 else 460 if k in (1,2) else 290
    for i in range(amount):
        # Sample a wedge fan from the center to this genuinely concave outline.
        seg=rng.randrange(N);a=outline[seg];b=outline[(seg+1)%N];t=rng.random();rad=math.sqrt(rng.random())
        u=(a[0]*(1-t)+b[0]*t)*rad;v=(a[1]*(1-t)+b[1]*t)*rad
        # Concave bays stay empty: do not fan-sample across their cavities.
        while not inside_polygon(u,v):u=rng.uniform(-1,1);v=rng.uniform(-.72,.72)
        surface=(.84+.16*(1-rad))*th+.03*sin(u*7+v*8+k)
        edge_fan=(i%4==0)
        if edge_fan:
            rad=.88+.12*rng.random();u=(a[0]*(1-t)+b[0]*t)*rad;v=(a[1]*(1-t)+b[1]*t)*rad
            surface=(.25+.20*rng.random())*th
            if not inside_polygon(u,v):continue
        p=transform(crown,u,v,surface)
        theta=math.atan2(v,u)+rng.uniform(-1,1)
        for j in range(7):
            ang=theta+(j-3)*.66
            direction=Vector((cos(ang)*.83,sin(ang)*.83,(-.16+rng.random()*.42) if edge_fan else (.44+rng.random()*.48))).normalized()
            length=.15+rng.random()*.16;side=direction.cross(Vector((0,0,1))).normalized()*(.010+rng.random()*.009)
            base=p+Vector((cos(ang)*.02,sin(ang)*.02,0));tip=base+direction*length
            shade=.78+rng.random()*.48;rgb=(.11*shade,.26*shade,.095*shade)
            a0=addv(base-side,tuple(q*.68 for q in rgb));a1=addv(base+side,tuple(q*.76 for q in rgb));a2=addv(tip,rgb)
            faces.append((a0,a1,a2));needletri+=1
me=bpy.data.meshes.new('H29 notched volumetric crowns with real needle fans');me.from_pydata(verts,[],faces);me.update()
fol=bpy.data.objects.new('H29 MAIN TOP REAR dense 3D crowns',me);bpy.context.scene.collection.objects.link(fol);me.materials.append(leafmat)
col=me.color_attributes.new(name='Color',type='BYTE_COLOR',domain='POINT')
for e,c in zip(col.data,colors):e.color=c
# The volume is a fine branching foliage body, not a polished solid. Add
# subpixel surface roughness as geometry; retain flat underside and notch edge.
for p in me.polygons:p.use_smooth=False
# Finish existing long arm with an irregular fork running under the main pad;
# real visible wood supports the largest crown instead of a floating leaf mat.
wv=[];wf=[]
def tube(points,radii,sides=9):
    # Single continuous Bezier stays in the control-point convex hull; unlike
    # Catmull-Rom it cannot overshoot toward the roof. 33 cross-sections replace
    # H29's former 3 straight cylindrical intervals.
    controls=[Vector(p) for p in points]
    def evaluate(items,t):
        items=list(items)
        while len(items)>1:items=[items[j]*(1-t)+items[j+1]*t for j in range(len(items)-1)]
        return items[0]
    samples=33;path=[evaluate(controls,i/(samples-1)) for i in range(samples)]
    rs=[evaluate(radii,i/(samples-1)) for i in range(samples)]
    start=len(wv)
    for i,p in enumerate(path):
        d=(path[min(i+1,samples-1)]-path[max(i-1,0)]).normalized();a=d.cross(Vector((0,0,1))).normalized();b=d.cross(a).normalized()
        for j in range(sides):wv.append(tuple(p+(a*cos(2*pi*j/sides)+b*sin(2*pi*j/sides))*rs[i]))
        if i:
            for j in range(sides):a0=start+(i-1)*sides+j;b0=start+(i-1)*sides+(j+1)%sides;wf.append((a0,b0,b0+sides,a0+sides))
# +X arm is the game's long welcoming arm. It deliberately supports main pad.
tube([(1.35,-.20,3.35),(2.05,.22,3.96),(2.95,.42,4.13),(4.05,.28,4.25)],[.24,.16,.08,.018])
tube([(2.05,.22,3.96),(2.84,.73,4.14),(3.45,1.04,4.22)],[.11,.065,.012])
tube([(2.48,.25,4.96),(2.58,.89,5.00),(2.72,1.68,5.08)],[.08,.043,.01])
tube([(-.3,-.1,2.8),(-.50,-.29,3.02),(-.65,-.36,3.24)],[.12,.065,.012])
me=bpy.data.meshes.new('H29 long welcoming arm crown support fork');me.from_pydata(wv,[],wf);me.update();br=bpy.data.objects.new('H29 supporting fork',me);bpy.context.scene.collection.objects.link(br);me.materials.append(barkmat)
for p in me.polygons:p.use_smooth=True
col=me.color_attributes.new(name='Color',type='BYTE_COLOR',domain='POINT')
for v in me.vertices:col.data[v.index].color=(.23,.18,.125,1)
bpy.ops.object.select_all(action='DESELECT');wood.select_set(True);br.select_set(True);bpy.context.view_layer.objects.active=wood;bpy.ops.object.join()
mat=wood.data.materials[0];wood.data.materials.clear();wood.data.materials.append(mat)
for p in wood.data.polygons:p.material_index=0
# Make Blender source use the same reflection coefficients as the game GLB.
for material,factor in [(leafmat,reflectance['needles']),(barkmat,reflectance['bark']),(stonemat,reflectance['slate'])]:
    nt=material.node_tree;bs=nt.nodes.get('Principled BSDF');vc=next(n for n in nt.nodes if n.type=='VERTEX_COLOR')
    mul=nt.nodes.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1;mul.inputs[2].default_value=(*factor,1)
    nt.links.new(vc.outputs['Color'],mul.inputs[1]);nt.links.new(mul.outputs['Color'],bs.inputs['Base Color'])
scene=bpy.context.scene;scene['H29_source']='H28 same tree';scene['H29_root_edited_vertices']=roots_changed;scene['H29_bole_narrowed_vertices']=bole_changed
bpy.ops.object.select_all(action='DESELECT')
for o in [wood,stone,fol]:o.select_set(True)
bpy.context.view_layer.objects.active=wood
bpy.ops.wm.save_as_mainfile(filepath=str(out/'h29-gate-pine.blend'),compress=True)
for material in [leafmat,barkmat,stonemat]:
    nt=material.node_tree;bs=nt.nodes.get('Principled BSDF');vc=next(n for n in nt.nodes if n.type=='VERTEX_COLOR');nt.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
glbpath=out/'h29-gate-pine.glb';bpy.ops.export_scene.gltf(filepath=str(glbpath),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_normals=True)
raw=glbpath.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[28+n:]
for material in g['materials']:
    kind='needles' if 'crown' in material['name'] else 'bark' if 'bark' in material['name'] else 'slate';material['pbrMetallicRoughness']['baseColorFactor']=[*reflectance[kind],1]
coloracc={p['attributes']['COLOR_0'] for m in g['meshes'] for p in m['primitives'] if 'COLOR_0' in p['attributes']};replace={}
for index in coloracc:
    acc=g['accessors'][index];view=g['bufferViews'][acc['bufferView']];assert acc['componentType']==5126 and not view.get('byteStride')
    components={'VEC3':3,'VEC4':4}[acc['type']];off=view.get('byteOffset',0)+acc.get('byteOffset',0);vals=struct.unpack_from('<'+'f'*(acc['count']*components),binary,off)
    replace[acc['bufferView']]=bytes(max(0,min(255,round(v*255))) for v in vals);acc['componentType']=5121;acc['normalized']=True;acc.pop('min',None);acc.pop('max',None)
packed=bytearray()
for index,view in enumerate(g['bufferViews']):
    while len(packed)%4:packed.append(0)
    data=replace.get(index,binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]);view['byteOffset']=len(packed);view['byteLength']=len(data);packed.extend(data)
while len(packed)%4:packed.append(0)
g['buffers'][0]['byteLength']=len(packed);j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
raw=struct.pack('<4sII',b'glTF',2,28+len(j)+len(packed))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(packed),b'BIN\x00')+packed;glbpath.write_bytes(raw)
report={'source':'h28-gate-pine.blend','asset':'h29-gate-pine.glb','bytes':len(raw),'meshes':len(g['meshes']),'materials':len(g['materials']),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in [wood,stone,fol]),'needle_triangles':needletri,'canopy_layout':crowns,'roots_lowered_vertices':roots_changed,'bole_narrowed_vertices':bole_changed,'removed_obsolete_spray_vertices':len(remove),'final_branch_curve':'33-section convex-hull Bezier; basal radius .24; end lifted .12','stone_detail_vertices':stone_detail_vertices,'sha256':hashlib.sha256(raw).hexdigest(),'physical_phone_test':'not performed','paid_credits':0}
(out/'h29-model.json').write_text(json.dumps(report,indent=2)+'\n');print('H29_MODEL',json.dumps(report),flush=True)
