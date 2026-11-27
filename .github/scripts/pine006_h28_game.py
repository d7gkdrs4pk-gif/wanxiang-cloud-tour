"""H28 game hero pine: increment H27 editable sculpture with an asymmetrical
3D needle canopy, exported as a three-material mobile GLB. No image generation.
Blender Z-up -> glTF Y-up; horizontal welcoming branch points +X.
"""
import bpy, math, random, pathlib, json, struct, hashlib
from mathutils import Vector, noise
from math import sin, cos, pi
repo=pathlib.Path.cwd(); out=repo/'fengming-v2-scene-a/assets/pine-006';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(repo/'fengming-v2-scene-a/assets/pine-005/h27/pine005-h27-refined.blend'))
active=bpy.data.collections.get('H27_ACTIVE_EDITABLE_MESH')
objects=[o for o in active.objects if o.type=='MESH' and not o.hide_render]
body=next(o for o in objects if 'ONE_CONTINUOUS' in o.name)
wood=[o for o in objects if 'granite' not in o.name]; stones=[o for o in objects if 'granite' in o.name]
for o in list(bpy.data.objects):
    if o not in objects:bpy.data.objects.remove(o,do_unlink=True)
for o in objects:o.hide_set(False);o.hide_viewport=False;o.hide_render=False
rng=random.Random(280028)
# Broad oblique trunk retained. Pull left counterbalance inward rather than a
# mirrored bilateral bonsai. Main welcoming arm remains heavy and long on +X.
def shape(p):
    x,y,z=p
    if z>3.0 and x<-.5:
        w=min(1,(z-3)/1.1)
        x=-.5+(x+.5)*(1-.29*w)
    if z>3.8 and x>2.5:
        w=min(1,(x-2.5)/2)
        # Give low forward arm a physically different depth to the upper crown.
        y-=.85*w*max(0,1-abs(z-4.35)/1.3)
    return Vector((x,y,z))
for o in wood:
    for v in o.data.vertices:v.co=shape(v.co)
    o.data.update()
bpy.context.view_layer.objects.active=body
body.select_set(True)
mod=body.modifiers.new('Mobile preserve trunk silhouette','DECIMATE');mod.ratio=.54
bpy.ops.object.modifier_apply(modifier=mod.name)

def color_mat(name,rough=1):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(.32,.4,.24,1)
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough
    vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color'
    m.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
    return m
barkmat=color_mat('H28 weathered umber bark vertex color');stonemat=color_mat('H28 slope slate vertex color');needlemat=color_mat('H28 layered jade needles vertex color',.91)
needlemat.use_backface_culling=False
# Calibrated to the production mountain's unchanged strong multi-light rig.
# Broad color variation stays in COLOR_0; the PBR factor sets reflectance.
reflectance={'needles':(.13,.23,.11),'bark':(.14,.13,.115),'slate':(.27,.29,.28)}
for material,factor in [(needlemat,reflectance['needles']),(barkmat,reflectance['bark']),(stonemat,reflectance['slate'])]:
    nt=material.node_tree;bs=nt.nodes.get('Principled BSDF');vc=next(n for n in nt.nodes if n.type=='VERTEX_COLOR')
    multiply=nt.nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
    multiply.inputs[2].default_value=(*factor,1)
    nt.links.new(vc.outputs['Color'],multiply.inputs[1]);nt.links.new(multiply.outputs['Color'],bs.inputs['Base Color'])
    material.diffuse_color=(*factor,1)
# All colors are linear. Deliberately lighter upper scales keep the trunk
# readable under the existing cold mountain lighting, without self-emission.
def paint(o,kind):
    if o.data.color_attributes.get('Color'):o.data.color_attributes.remove(o.data.color_attributes['Color'])
    col=o.data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='POINT')
    for v in o.data.vertices:
        p=o.matrix_world@v.co
        n=noise.noise(Vector((p.x*2.7,p.y*2.7,p.z*4.1)))
        if kind=='stone':
            a=.28+.06*n;rgb=(a*.92,a*1.04,a*1.02)
        else:
            a=.22+.065*n+.018*sin(p.z*7+p.x*4)
            # Local moss marks follow damp root/left-side crevices.
            moss=max(0,.35-p.z)*max(0,n)*.32
            rgb=(a*1.12-moss*.25,a*.86+moss,a*.62)
        col.data[v.index].color=(*rgb,1)
    o.data.materials.clear();o.data.materials.append(stonemat if kind=='stone' else barkmat)
    for f in o.data.polygons:f.material_index=0
for o in wood:paint(o,'bark')
for o in stones:paint(o,'stone')
# Crown islands, deliberately unequal sizes/depths. Inner branch collars are
# not covered; the forward arm is lower, back crown rises and has smaller pads.
# x,y,z, width,depth; values in retained H27 sculpture coordinates.
pads=[
 (4.95,-2.05,4.55,1.45,.88), (6.25,-1.45,4.75,1.18,.76),
 (3.62,-1.68,4.65,1.15,.78),
 (-2.75,-.35,4.45,1.18,.78),(-1.55,-.65,4.66,.97,.69),
 (-2.12,1.18,6.50,1.25,.86),(-.73,1.48,6.68,1.08,.86),
 (5.76,.20,6.29,1.25,.84),(6.85,.55,6.48,.86,.69),
 (3.48,.75,7.95,1.37,.88),(4.85,.85,8.02,1.13,.78),
 (1.45,1.45,7.84,1.05,.78),
 (-1.40,2.02,5.52,1.00,.78)]
# Combined woody fine twigs connect the canopy islands to retained branch tips.
def sweep_into(verts,faces,pts,radii,sides=6):
    start=len(verts)
    for i,p in enumerate(pts):
        p=Vector(p);t=(Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(0,i-1)])).normalized()
        a=t.cross(Vector((0,0,1))).normalized()
        if a.length<.1:a=Vector((1,0,0))
        b=t.cross(a).normalized()
        for j in range(sides):verts.append(tuple(p+(a*cos(j*2*pi/sides)+b*sin(j*2*pi/sides))*radii[i]))
        if i:
            for j in range(sides):
                q=start+(i-1)*sides+j;n=start+(i-1)*sides+(j+1)%sides
                faces.append((q,n,n+sides,q+sides))
wv=[];wf=[]
# Only outer sprays; no uniform repeated complete branch wheels.
for k,(cx,cy,cz,rx,ry) in enumerate(pads):
    base=(cx-(.45 if cx>1 else -.35),cy+.1,cz-.43)
    for j in range(3):
        a=(j-1)*.9+(.3 if k%2 else -.2)
        tip=(cx+cos(a)*rx*.54,cy+sin(a)*ry*.63,cz-.02)
        sweep_into(wv,wf,[base,((base[0]+tip[0])*.5,(base[1]+tip[1])*.5,cz-.20),tip],[.055,.032,.009])
me=bpy.data.meshes.new('H28 canopy woody sprays geometry');me.from_pydata(wv,[],wf);me.update()
ob=bpy.data.objects.new('H28 canopy woody sprays',me);bpy.context.scene.collection.objects.link(ob);paint(ob,'bark');wood.append(ob)
# Needle fans form actual thin triangular blades, not solid leaf pods. Their
# centers fill irregular branching swathes with open notches at the perimeter.
nv=[];nf=[];nc=[]
colors=[(.055,.16,.075),(.075,.225,.10),(.12,.29,.13),(.19,.35,.16),(.27,.41,.20)]
for k,(cx,cy,cz,rx,ry) in enumerate(pads):
    for i in range(225):
        a=rng.random()*2*pi;d=math.sqrt(rng.random())
        # Organic scallops, no shared ellipse geometry and no concentric rings.
        edge=1+.14*sin(3*a+k*.9)+.11*cos(5*a-k)
        if d>.75 and sin(4*a+k*1.4)>.65 and rng.random()<.62:continue
        x=cx+cos(a)*d*rx*edge;y=cy+sin(a)*d*ry*edge
        z=cz+.27*(1-d*d)+.08*sin(a*4+k)+(rng.random()-.5)*.17
        center=Vector((x,y,z))
        theta=rng.random()*2*pi
        tilt=Vector((cos(theta)*.22,sin(theta)*.22,1))
        for j in range(7):
            # Pine needle brush: fanned upward/outward stiff fine needles.
            ang=theta+(j-3)*.65
            direction=Vector((cos(ang)*.72,sin(ang)*.72,.48+rng.random()*.58)).normalized()
            length=.20+rng.random()*.22
            side=direction.cross(Vector((0,0,1))).normalized()*(.012+rng.random()*.008)
            base=center+Vector((cos(ang)*.025,sin(ang)*.025,0))
            tip=base+direction*length
            st=len(nv);nv.extend([tuple(base-side),tuple(base+side),tuple(tip)])
            nf.append((st,st+1,st+2))
            col=colors[rng.randrange(len(colors))]
            nc.extend([(*tuple(q*.69 for q in col),1),(*tuple(q*.78 for q in col),1),(*col,1)])
me=bpy.data.meshes.new('H28 non solid geometric pine needle fans');me.from_pydata(nv,[],nf);me.update()
ob=bpy.data.objects.new('H28 NEEDLES open asymmetric crown',me);bpy.context.scene.collection.objects.link(ob)
me.materials.append(needlemat);col=me.color_attributes.new(name='Color',type='BYTE_COLOR',domain='POINT')
for e,c in zip(col.data,nc):e.color=c
foliage=ob

def join(obs,name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
    # unify duplicate material slots into exactly one draw per mesh
    material=o.data.materials[0];o.data.materials.clear();o.data.materials.append(material)
    for f in o.data.polygons:f.material_index=0
    return o
woodobj=join(wood,'H28 WOOD continuous trunk roots welcoming arm')
stoneobj=join(stones,'H28 ROCKS rooted slope contact')
# Transform points into final world asset units, rebase root collar to x=0.
# Blender -Y exports as glTF +Z. Bole and crowns span front/back physically.
for o in [woodobj,stoneobj,foliage]:
    # Bake world matrix, then uniform asset scaling preserves all contacts.
    for v in o.data.vertices:
        p=o.matrix_world@v.co
        v.co=Vector(((p.x+.72)*.70,p.y*.82,p.z*.70))
    o.matrix_world.identity();o.data.update()
scene=bpy.context.scene
scene['source_asset']='PINE-005 H27 editable actual sculpture'
scene['change']='H28 game silhouette, asymmetric needle islands, unified materials'
scene['physical_phone_test']='not performed; integrate and test in game'
bpy.ops.object.select_all(action='DESELECT')
for o in [woodobj,stoneobj,foliage]:o.select_set(True)
bpy.context.view_layer.objects.active=woodobj
bpy.ops.wm.save_as_mainfile(filepath=str(out/'h28-gate-pine.blend'),compress=True)
# Export direct COLOR_0, then attach the production-calibrated PBR factor.
# Blender's MixRGB exporter otherwise creates white COLOR_0 plus COLOR_1.
for material in [needlemat,barkmat,stonemat]:
    nt=material.node_tree;bs=nt.nodes.get('Principled BSDF');vc=next(n for n in nt.nodes if n.type=='VERTEX_COLOR')
    nt.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
bpy.ops.export_scene.gltf(filepath=str(out/'h28-gate-pine.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_normals=True)
# glTF permits normalized UBYTE vertex colors without any decoder extension.
# Blender writes float colors; repack those into byte colors to remove ~720 KB.
glbpath=out/'h28-gate-pine.glb'
raw=glbpath.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);bin_start=20+n+8;binary=raw[bin_start:]
for material in g['materials']:
    kind='needles' if 'needles' in material['name'] else 'bark' if 'bark' in material['name'] else 'slate'
    material['pbrMetallicRoughness']['baseColorFactor']=[*reflectance[kind],1]
colors={p['attributes']['COLOR_0'] for m in g['meshes'] for p in m['primitives'] if 'COLOR_0' in p['attributes']}
replace={}
for index in colors:
    acc=g['accessors'][index];view=g['bufferViews'][acc['bufferView']]
    assert acc['componentType']==5126 and not view.get('byteStride')
    components={'VEC3':3,'VEC4':4}[acc['type']]
    offset=view.get('byteOffset',0)+acc.get('byteOffset',0)
    floats=struct.unpack_from('<'+'f'*(acc['count']*components),binary,offset)
    replace[acc['bufferView']]=bytes(max(0,min(255,round(v*255))) for v in floats)
    acc['componentType']=5121;acc['normalized']=True;acc.pop('min',None);acc.pop('max',None)
packed=bytearray()
for index,view in enumerate(g['bufferViews']):
    while len(packed)%4:packed.append(0)
    data=replace.get(index,binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']])
    view['byteOffset']=len(packed);view['byteLength']=len(data);packed.extend(data)
while len(packed)%4:packed.append(0)
g['buffers'][0]['byteLength']=len(packed)
j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
raw=struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(packed))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(packed),b'BIN\x00')+packed
glbpath.write_bytes(raw)
mins=[min((o.matrix_world@v.co)[i] for o in [woodobj,stoneobj,foliage] for v in o.data.vertices) for i in range(3)]
maxs=[max((o.matrix_world@v.co)[i] for o in [woodobj,stoneobj,foliage] for v in o.data.vertices) for i in range(3)]
tri=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in [woodobj,stoneobj,foliage])
report={'source':'pine-005/h27/pine005-h27-refined.blend','asset':'h28-gate-pine.glb','bytes':len(raw),'meshes':len(g['meshes']),'materials':len(g['materials']),'triangles':tri,'blender_z_up_bounds':[mins,maxs],'glTF_y_up':True,'canopy_islands':len(pads),'needle_triangles':len(nf),'paid_credits':0}
report.update({'sha256':hashlib.sha256(raw).hexdigest(),'color_quantization':'standard glTF normalized UBYTE; no decoder extension','physical_phone_test':'not performed','game_camera_visual_check':'pending integration','glTF_y_up_bounds':[[mins[0],mins[2],-maxs[1]],[maxs[0],maxs[2],-mins[1]]]})
report['scene_material_calibration']={m['name']:m['pbrMetallicRoughness']['baseColorFactor'] for m in g['materials']}
(out/'h28-model.json').write_text(json.dumps(report,indent=2)+'\n');print('H28_ASSET',json.dumps(report),flush=True)
