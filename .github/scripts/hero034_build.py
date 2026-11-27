# Blender 4.3 offline character asset. New welded quad shoulder/sleeve topology,
# tailored split robe, CC0 professionally authored face/hands, one painted atlas.
# /usr/bin/blender -b --python .github/scripts/hero034_build.py
import bpy,bmesh,math,json,gzip,os,sys
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'fengming-v2-scene-a/assets/hero-034';QA=Path('/workspace/qa-h34/hero');OUT.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
SEED=json.loads((OUT/'rig-seed.json').read_text());ZONES=json.loads((OUT/'atlas-zones.json').read_text());BI={b['name']:i for i,b in enumerate(SEED['bones'])}
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)));CI=C.inverted()
def B(p):return (p[0],-p[2],p[1])
def Y(p):return (p[0],p[2],-p[1])
def mix(a,b,t):return a+(b-a)*t
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for data in list(bpy.data.materials):bpy.data.materials.remove(data)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=12
base=bpy.data.images.load(str(OUT/'linyan-atlas-base.png'));_force_pixels=base.pixels[0];base.pack();base.name='林砚H34_手绘AO图集';base.filepath_raw=str(OUT/'linyan-atlas.png');base.file_format='PNG'
def material(name,metal=0,rough=.94):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=base;n.name='H34_ATLAS';m.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color']);return m
alpha_image=bpy.data.images.new('林砚H34_面部透明蒙版',width=1024,height=1024,alpha=False);alpha_image.generated_color=(1,1,1,1);alpha_image.filepath_raw=str(OUT/'linyan-alpha.png');alpha_image.file_format='PNG'
MAT=material('林砚_统一手绘哑光布肤发');METAL=material('凤刃_哑光钢与旧金',.12,.78)
body_parts=[];notes=[];SLEEVE_UV={}
def uvzone(u,v,zone):
 x0,y0,x1,y1=ZONES[zone];return ((x0+u*(x1-x0))/1024,1-(y0+v*(y1-y0))/1024)
def mesh_obj(name,verts,faces,weights,uvs,zone,subdiv=0):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([B(v)for v in verts],[],faces);mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);mesh.materials.append(MAT)
 layer=mesh.uv_layers.new(name='H34_Atlas')
 for poly in mesh.polygons:
  values=[uvs[mesh.loops[l].vertex_index]for l in poly.loop_indices];us=[q[0]for q in values];wrap=max(us)-min(us)>.5 and zone in ['coat','hair','ink']
  for li,(u,v)in zip(poly.loop_indices,values):
   u=u+1 if wrap and u<.5 else u
   # Distinct islands keep contact AO from painting unrelated parts.
   if zone=='ink':
    if name.startswith('墨裤'):u=u*.5+(.0 if 'right' in name else .5);v=v*.54
    elif name.startswith('软底云靴'):u=u*.5+(.0 if 'right' in name else .5);v=.55+v*.29
    else:v=.86+v*.14
   elif zone=='hair':
    if '发盖'in name:v=v*.59
    elif '束髻'in name:u=u*.49;v=.61+v*.39
    else:u=.51+u*.49;v=.61+v*.39
   elif zone=='ivory':u=u*.49+(.0 if name.endswith('左')else .51)
   layer.data[li].uv=uvzone(u,v,zone)
  poly.use_smooth=True
 for name in BI:o.vertex_groups.new(name=name)
 for i,w in enumerate(weights):
  total=sum(w.values())or 1
  for bn,value in w.items():
   if value>1e-8:o.vertex_groups[bn].add([i],value/total,'REPLACE')
 if subdiv:
  mod=o.modifiers.new('可编辑四边面细分','SUBSURF');mod.subdivision_type='CATMULL_CLARK';mod.levels=subdiv;mod.render_levels=subdiv
 body_parts.append(o);return o
# True branched garment topology: one torso, shoulders and both sleeves share
# vertices. A rectangular armhole boundary is bridged to a bent 16-edge sleeve.
N=24;profile=[(.72,.158,.107),(.79,.166,.113),(.89,.189,.124),(.99,.224,.131),(1.07,.244,.132),(1.126,.205,.116),(1.154,.077,.067)]
verts=[];faces=[];weights=[];uvs=[];rings=[]
for ri,(y,rx,rz)in enumerate(profile):
 ring=[]
 for j in range(N):
  a=j/N*math.tau;x=math.sin(a)*rx;z=math.cos(a)*rz+.004
  # Broad chest plane and a shaped back, not an elliptical capsule.
  if z>0:z-=.009*max(0,math.cos(a))**3
  ring.append(len(verts));verts.append((x,y,z));uvs.append((j/N,(1.16-y)/.95))
  t=max(0,min(1,(y-.78)/.26));weights.append({'spine':1-t,'chest':t})
 rings.append(ring)
for ri in range(len(rings)-1):
 for j in range(N):
  # Armholes span two height rows and six angular columns on each side.
  if ri in [3,4] and (3<=j<9 or 15<=j<21):continue
  faces.append((rings[ri][j],rings[ri][(j+1)%N],rings[ri+1][(j+1)%N],rings[ri+1][j]))
for sign,start,end,sh,el,wr,zone in [(1,3,9,'leftShoulder','leftElbow','leftWrist','sleeveL'),(-1,15,21,'rightShoulder','rightElbow','rightWrist','sleeveR')]:
 boundary=[rings[3][j]for j in range(start,end+1)]+[rings[4][end],rings[5][end]]+[rings[5][j]for j in range(end-1,start-1,-1)]+[rings[4][start]]
 # Order by angular location in the armhole's Y/Z plane; sixteen welded verts.
 boundary.sort(key=lambda i:math.atan2(verts[i][2]-.004,verts[i][1]-1.058))
 angles=[math.atan2((verts[i][2]-.004)/.113,(verts[i][1]-1.058)/.068)for i in boundary]
 previous=boundary
 stations=[(.250,1.058,.003,.060,.097),(.277,1.033,.007,.061,.089),(.300,.978,.015,.061,.077),(.310,.896,.023,.065,.074),(.314,.844,.036,.065,.070),(.318,.772,.048,.058,.060),(.320,.710,.060,.053,.050),(.320,.698,.061,.051,.049)]
 for k,(x,y,z,w,d)in enumerate(stations):
  # Section normal turns gently from side-facing shoulder to downward cuff.
  bend=min(1,k/2)*math.pi/2;axis=Vector((sign*math.cos(bend),-math.sin(bend),0));up=Vector((sign*math.sin(bend),math.cos(bend),0));front=Vector((0,0,1));current=[]
  for j,a in enumerate(angles):
   vv=Vector((sign*x,y,z))+up*(math.cos(a)*w)+front*(math.sin(a)*d)
   current.append(len(verts));verts.append(tuple(vv));uvs.append((j/len(angles),k/(len(stations)-1)))
   if k<2:ww={sh:.7+.15*k,'chest':.3-.15*k}
   elif y>.88:ww={sh:1}
   else:
    t=max(0,min(1,(.90-y)/.10));ww={sh:1-t,el:t}
   weights.append(ww)
  for j in range(len(current)):
   jj=(j+1)%len(current);face=(previous[j],previous[jj],current[jj],current[j]);faces.append(face)
   SLEEVE_UV[frozenset(face)]=(zone,{previous[j]:(j/len(current),k/9),previous[jj]:((j+1)/len(current),k/9),current[jj]:((j+1)/len(current),(k+1)/9),current[j]:(j/len(current),(k+1)/9)})
  previous=current
 # Cuff inner lip gives cloth thickness without duplicating the whole jacket.
 inner=[]
 for i in previous:
  x,y,z=verts[i];inner.append(len(verts));verts.append((sign*.320+(x-sign*.320)*.87,y+.005,.061+(z-.061)*.87));weights.append(weights[i].copy());uvs.append(uvs[i])
 for j in range(len(inner)):faces.append((previous[j],previous[(j+1)%len(inner)],inner[(j+1)%len(inner)],inner[j]))
# Tailored connected split skirt. Its waist vertices are the torso waist loop.
for sign,js,hem,thigh,back in [(1,list(range(2,11)),'leftRobe','leftThigh','leftBackHem'),(-1,list(range(14,23)),'rightRobe','rightThigh','rightBackHem')]:
 previous=[rings[0][j]for j in js]
 for k in range(1,7):
  t=k/6;current=[]
  for j in js:
   a=j/N*math.tau;front=max(0,math.cos(a));rear=max(0,-math.cos(a));fold=(.007*math.cos(a*4-.4)+.004*math.sin(a*7+.6))*t*t
   rx=.158+.113*t+fold;rz=.107+.075*t+fold*.6
   # Right leading panel is shorter; rear and side drape naturally below it.
   length=.455+.064*rear-.130*front+(-.060 if sign<0 else .015)
   y=.72-length*t+.014*math.sin(a*2+.2)*t*t;x=math.sin(a)*rx+sign*.012*rear*t*t;z=math.cos(a)*rz-.010*rear*t*t
   current.append(len(verts));verts.append((x,y,z));uvs.append((j/N,(1.16-y)/.95));cloth=back if rear>.2 else hem;hw=.60*t*t;tw=.20*t*(.3+.7*front);weights.append({'hips':1-hw-tw,cloth:hw,thigh:tw})
  for j in range(len(js)-1):faces.append((previous[j],current[j],current[j+1],previous[j+1]))
  previous=current
 # A rolled hem, with an inner supporting row, keeps a real cloth edge.
 inner=[]
 for i in previous:
  x,y,z=verts[i];inner.append(len(verts));verts.append((x*.972,y+.008,z*.972));weights.append(weights[i].copy());uvs.append(uvs[i])
 for j in range(len(inner)-1):faces.append((previous[j],inner[j],inner[j+1],previous[j+1]))
coat=mesh_obj('林砚_真正连肩四边面汉服',verts,faces,weights,uvs,'coat',1)
# A seam-aware loop UV layout follows the bent sleeve, including the welded
# shoulder bridge. No cylindrical re-projection/AO overlap across the elbow.
for poly in coat.data.polygons:
 record=SLEEVE_UV.get(frozenset(poly.vertices))
 if record:
  zone,lookup=record
  for li in poly.loop_indices:
   u,v=lookup[coat.data.loops[li].vertex_index];coat.data.uv_layers.active.data[li].uv=uvzone(u,v,zone)
# Pants and boots are authored ring sections, with an actual instep and sole.
def loft(name,sections,n,bn,zone,sub=1,blend=None):
 vs=[];fs=[];ws=[];uv=[]
 for k,(cx,y,cz,rx,rz)in enumerate(sections):
  for j in range(n):
   a=j/n*math.tau;vs.append((cx+math.sin(a)*rx,y,cz+math.cos(a)*rz));uv.append((j/n,k/(len(sections)-1)));ws.append({bn:1}if blend is None else blend(k))
 for k in range(len(sections)-1):
  for j in range(n):fs.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
 fs.append(tuple(reversed(range(n))));fs.append(tuple((len(sections)-1)*n+j for j in range(n)))
 return mesh_obj(name,vs,fs,ws,uv,zone,sub)
for sign,th,knee,ank in [(-1,'rightThigh','rightKnee','rightAnkle'),(1,'leftThigh','leftKnee','leftAnkle')]:
 x=sign*.105
 loft('墨裤_'+th,[(x,.68,0,.078,.077),(x,.57,.004,.073,.071),(x,.42,.012,.063,.060),(x,.34,.016,.059,.056),(x,.20,.024,.048,.049),(x,.13,.028,.048,.047)],12,th,'ink',0,lambda k:{th:max(0,1-k/4),knee:min(1,k/4)})
 # Built from shaped cross sections along the toe, not a box foot or capsule.
 sections=[(-.078,.043,.082,.016),(-.040,.064,.145,.014),(.050,.068,.119,.014),(.135,.063,.078,.014),(.205,.036,.046,.018)]
 vs=[];fs=[];ws=[];uv=[];n=12
 for k,(z,w,top,bottom)in enumerate(sections):
  for j in range(n):a=j/n*math.tau;vs.append((x+math.cos(a)*w,(top+bottom)/2+math.sin(a)*(top-bottom)/2,z));uv.append((j/n,k/(len(sections)-1)));ws.append({ank:1})
 for k in range(len(sections)-1):
  for j in range(n):fs.append((k*n+j,(k+1)*n+j,(k+1)*n+(j+1)%n,k*n+(j+1)%n))
 fs.append(tuple(reversed(range(n))));fs.append(tuple((len(sections)-1)*n+j for j in range(n)));mesh_obj('软底云靴_'+ank,vs,fs,ws,uv,'ink',0)
# Sewn crossed collar is a rounded ribbon of real thickness, not flat ties.
def ribbon(name,points,width,zone,bone,sub=1):
 vs=[];fs=[];ws=[];uv=[]
 for k,P in enumerate(points):
  P=Vector(P);D=Vector(points[min(k+1,len(points)-1)])-Vector(points[max(0,k-1)]);S=Vector((-D.y,D.x,0)).normalized()*width/2
  for side,depth in [(-1,1),(1,1),(-1,-1),(1,-1)]:vs.append(tuple(P+S*side+Vector((0,0,depth*.0035))));ws.append({bone:1});uv.append((0 if side<0 else 1,k/(len(points)-1)))
 for k in range(len(points)-1):
  a=k*4;b=a+4;fs.extend([(a,b,b+1,a+1),(a+2,a+3,b+3,b+2),(a,a+2,b+2,b),(a+1,b+1,b+3,a+3)])
 fs.extend([(0,1,3,2),tuple((len(points)-1)*4+j for j in [0,2,3,1])]);return mesh_obj(name,vs,fs,ws,uv,zone,sub)
ribbon('米色交领_左',[(-.081,1.155,.121),(-.067,1.114,.145),(-.035,1.058,.154),(.023,.953,.141)],.052,'ivory','chest',1)
ribbon('米色交领_右',[(.081,1.155,.121),(.064,1.108,.147),(.025,1.043,.159),(-.046,.951,.146)],.050,'ivory','chest',1)
# Belt pinches the waist, with one subdued old-gold clasp and bell cord.
loft('玄色束腰',[(0,.710,.002,.170,.116),(0,.719,.002,.173,.118),(0,.768,.002,.174,.119),(0,.778,.002,.168,.114)],24,'hips','ink',0)
ribbon('旧金腰扣',[(-.035,.758,.126),(-.035,.727,.132),(.036,.727,.132),(.036,.758,.126)],.014,'gold','hips',0)
ribbon('朱红垂带',[(.159,.718,.093),(.181,.620,.121),(.173,.507,.131)],.032,'trim','hips',1)
# One subdued hanging bell preserves the bell-master identity as a large form.
loft('腰间凤铃',[(.178,.674,.111,.011,.011),(.178,.662,.111,.027,.025),(.178,.633,.111,.031,.028),(.178,.618,.111,.024,.023)],10,'hips','gold',0)
ribbon('凤铃细绳',[(.168,.725,.108),(.179,.676,.112)],.008,'gold','hips',0)
# Natural neck bridges face and a real collar socket.
loft('颈部',[(0,1.125,.002,.048,.044),(0,1.171,.004,.047,.043),(0,1.218,.006,.053,.048),(0,1.244,.007,.055,.050)],12,'head','neck',0)
# Editable hair cap: quad loft following a clean hairline plus a swept topknot.
vs=[];fs=[];ws=[];uv=[];n=24;vcount=7
for k in range(vcount):
 t=k/(vcount-1)
 for j in range(n):
  a=j/n*math.tau;front=max(0,math.cos(a));back=max(0,-math.cos(a));low=1.317+.033*front-.047*back
  r=math.sqrt(max(.002,1-t*t));x=math.sin(a)*.109*r;z=math.cos(a)*.099*r-.013;y=low*(1-t)+1.432*t
  vs.append((x,y,z));ws.append({'head':1});uv.append((j/n,t))
for k in range(vcount-1):
 for j in range(n):fs.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
mesh_obj('束发_真实四边面发盖',vs,fs,ws,uv,'hair',0)
loft('束髻',[(0,1.411,-.048,.026,.027),(-.004,1.433,-.061,.044,.050),(-.008,1.459,-.070,.043,.045),(-.012,1.478,-.076,.024,.023),(-.012,1.485,-.078,.004,.006)],16,'head','hair',0)
loft('窄旧金发箍',[(0,1.432,-.059,.045,.052),(0,1.440,-.059,.045,.052)],16,'head','gold',0)
# Swept polygonal lock, fluted with three large strands; no stacked hair spheres.
vs=[];fs=[];ws=[];uv=[];secs=[(0,1.401,-.096,.027,.020),(-.015,1.349,-.165,.039,.024),(-.042,1.283,-.247,.039,.022),(-.075,1.217,-.313,.027,.015),(-.103,1.177,-.337,.003,.003)];n=12
for k,(x,y,z,w,d)in enumerate(secs):
 for j in range(n):a=j/n*math.tau;ridge=1+.08*math.cos(a*3);vs.append((x+math.cos(a)*w*ridge,y+math.sin(a)*d,z+math.sin(a)*d*.4));ws.append({'hairTail':1});uv.append((j/n,k/(len(secs)-1)))
for k in range(len(secs)-1):
 for j in range(n):fs.append((k*n+j,(k+1)*n+j,(k+1)*n+(j+1)%n,k*n+(j+1)%n))
fs.append(tuple((len(secs)-1)*n+j for j in range(n)));mesh_obj('后掠束尾',vs,fs,ws,uv,'hair',0)
# Source CC0 head / real curled hands are appended below. Production builder
# intentionally requires these rather than silently reverting to primitive skin.
parts=OUT/'source/cc0-male-parts.blend'
if not parts.exists():raise RuntimeError('Required CC0 professionally authored head/hands not ready: '+str(parts))
with bpy.data.libraries.load(str(parts),link=False)as(src,dst):dst.objects=[n for n in src.objects if n in ['Head_Low','Hand_R_Low','Hand_L_Low']]
for o in dst.objects:
 if o is None:continue
 if o.name not in bpy.context.collection.objects:bpy.context.collection.objects.link(o)
 o.parent=None;o.matrix_world=Matrix.Identity(4)
 if o.name.startswith('Head'):
  # Original VRoid unlit eye-line cards rely on layered opacity. Replace those
  # shader-only overlays with two narrow true mesh brows for the matte atlas.
  bm=bmesh.new();bm.from_mesh(o.data);remove=[]
  for face in bm.faces:
   mn=o.data.materials[face.material_index].name
   if any(k in mn for k in ['FaceBrow','FaceEyelash','FaceEyeline','EyeExtra','EyeHighlight']):remove.append(face)
  bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(o.data);bm.free()

 # Extraction provides applied Blender coordinates, oriented to Three +Z.
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 for mod in list(o.modifiers):o.modifiers.remove(mod)
 coords=[Vector(Y(v.co))for v in o.data.vertices];mn=Vector(tuple(min(v[i]for v in coords)for i in range(3)));mx=Vector(tuple(max(v[i]for v in coords)for i in range(3)));size=mx-mn
 if o.name.startswith('Head'):
  center=(mn+mx)/2;scale=Vector((.224/size.x,.226/size.y,.202/size.z))
  for vertex,p in zip(o.data.vertices,coords):
   q=Vector(((p.x-center.x)*scale.x,1.295+(p.y-center.y)*scale.y,(p.z-center.z)*scale.z+.009))
   # Adult masculine lower jaw and slightly stronger nose, avoiding baby face.
   jaw=max(0,min(1,(1.27-q.y)/.060));q.x*=1+.075*jaw
   if abs(q.x)<.026 and 1.26<q.y<1.315 and q.z>.065:q.z+=.009*(1-abs(q.x)/.026)
   vertex.co=B(q)
  bone='head';zone='skin'
 else:
  side=-1 if '_R_'in o.name else 1;center=(mn+mx)/2
  # Professionally formed curled hand is fitted to the existing wrist/hilt.
  # Local palm axes are retained; no separate sphere fingers are added.
  scale=Vector((.090/size.x,.096/size.y,.078/size.z))
  for vertex,p in zip(o.data.vertices,coords):
   d=p-center;q=Vector((d.x*scale.x,d.y*scale.y,d.z*scale.z))+Vector((side*.320,.645,.046));vertex.co=B(q)
  bone='rightWrist'if side<0 else'leftWrist';zone='skin'
 o.vertex_groups.clear();vg=o.vertex_groups.new(name=bone);vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
 # Preserve original UV as explicit source sampling, create atlas UV separately.
 if o.data.uv_layers.active:o.data.uv_layers.active.name='SOURCE_UV'
 for slot in o.material_slots:
  if slot.material:slot.material=slot.material.copy()
 for m in o.data.materials:
  if m and m.use_nodes:
   uvnode=m.node_tree.nodes.new('ShaderNodeUVMap');uvnode.uv_map='SOURCE_UV'
   for node in list(m.node_tree.nodes):
    if node.type=='TEX_IMAGE':m.node_tree.links.new(uvnode.outputs['UV'],node.inputs['Vector'])
   emission=next(n for n in m.node_tree.nodes if n.type=='EMISSION');output=next(n for n in m.node_tree.nodes if n.type=='OUTPUT_MATERIAL');m.node_tree.links.new(emission.outputs[0],output.inputs['Surface'])
   node=m.node_tree.nodes.new('ShaderNodeTexImage');node.name='H34_DESTINATION';node.image=base;m.node_tree.nodes.active=node
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 atlasuv=o.data.uv_layers.new(name='H34_Atlas');o.data.uv_layers.active=atlasuv
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.10,island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT')
 # Divide the face tile: head gets most space, hands use a small corner.
 atlasuv=o.data.uv_layers['H34_Atlas']
 region=(.515,.115,.995,.375)if bone=='head'else((.515,.005,.625,.105)if bone=='rightWrist'else(.630,.005,.740,.105))
 for uv in atlasuv.data:uv.uv=(mix(region[0],region[2],uv.uv.x),mix(region[1],region[3],uv.uv.y))
 # The original CC0 facial UV/texture is resampled into our one atlas.
 scene.render.bake.use_clear=False
 try:bpy.ops.object.bake(type='EMIT',use_clear=False)
 except Exception as exc:notes.append('SOURCE_COLOR_BAKE '+o.name+': '+str(exc))
 # Bake source transparency explicitly, so eyelash/brow overlay polygons do
 # not become opaque black rectangles in the single runtime material.
 for m in o.data.materials:
  if not m or not m.use_nodes:continue
  source=next(n for n in m.node_tree.nodes if n.type=='TEX_IMAGE'and n.name!='H34_DESTINATION');emission=next(n for n in m.node_tree.nodes if n.type=='EMISSION')
  m.node_tree.links.new(source.outputs['Alpha'],emission.inputs['Color']);node=m.node_tree.nodes['H34_DESTINATION'];node.image=alpha_image;m.node_tree.nodes.active=node
 try:bpy.ops.object.bake(type='EMIT',use_clear=False)
 except Exception as exc:notes.append('SOURCE_ALPHA_BAKE '+o.name+': '+str(exc))
 o.data.materials.clear();o.data.materials.append(MAT);o.data.uv_layers.active=atlasuv;atlasuv.active_render=True
 for poly in o.data.polygons:poly.material_index=0;poly.use_smooth=True
 body_parts.append(o)
# Thin, opaque anatomical brow meshes avoid unsupported alpha-shader overlays.
ribbon('林砚_左眉',[(-.074,1.326,.090),(-.049,1.335,.108),(-.020,1.330,.119)],.007,'hair','head',0)
ribbon('林砚_右眉',[(.020,1.330,.119),(.049,1.335,.108),(.074,1.326,.090)],.007,'hair','head',0)
# Apply the editable subdivision once to low runtime copy; preserve author mesh.
source_collection=bpy.data.collections.new('SOURCE_可编辑四边面衣形');scene.collection.children.link(source_collection)
for o in body_parts:
 duplicate=o.copy();duplicate.data=o.data.copy();source_collection.objects.link(duplicate);duplicate.name=o.name+'_AUTHOR';duplicate.hide_render=True;duplicate.hide_set(True)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
# Join runtime parts with shared atlas; welded core remains continuous topology.
bpy.ops.object.select_all(action='DESELECT')
for o in body_parts:o.select_set(True)
bpy.context.view_layer.objects.active=coat;bpy.ops.object.join();body=bpy.context.object;body.name='林砚H34_成品拓扑_蒙皮身体'
# Delete source-UV layers so GLB has a single actual atlas UV set.
for layer in list(body.data.uv_layers):
 if layer.name!='H34_Atlas':body.data.uv_layers.remove(layer)
body.data.materials.clear();body.data.materials.append(MAT)
for poly in body.data.polygons:poly.material_index=0
# A real self-contact AO bake augments painted values; sunlight is never baked.
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
base.save()
ao=bpy.data.images.new('林砚H34_环境遮蔽',width=1024,height=1024,alpha=False);ao.generated_color=(1,1,1,1);ao.filepath_raw=str(OUT/'linyan-ao.png');ao.file_format='PNG'
# Facial overlay cards must not cast opaque rectangular AO onto the eyes.
alpha_image.colorspace_settings.name='Non-Color';mask=MAT.node_tree.nodes.new('ShaderNodeTexImage');mask.image=alpha_image;mask.name='H34_SOURCE_ALPHA';MAT.node_tree.links.new(mask.outputs['Color'],MAT.node_tree.nodes.get('Principled BSDF').inputs['Alpha']);MAT.surface_render_method='DITHERED'
node=MAT.node_tree.nodes.new('ShaderNodeTexImage');node.image=ao;MAT.node_tree.nodes.active=node
try:bpy.ops.object.bake(type='AO',use_clear=False,margin=6)
except Exception as exc:notes.append('AO_BAKE '+str(exc))
ao.save();MAT.node_tree.nodes.active=MAT.node_tree.nodes['H34_ATLAS']
# Armature retains the existing 22 semantic bones, exact original bind heads.
armdata=bpy.data.armatures.new('林砚H34_22骨');arm=bpy.data.objects.new('林砚H34_RIG',armdata);bpy.context.collection.objects.link(arm);bpy.context.view_layer.objects.active=arm;arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT');ed={}
for b in SEED['bones']:
 eb=armdata.edit_bones.new(b['name']);eb.head=B(b['head']);eb.tail=eb.head+Vector((0,0,.055));ed[b['name']]=eb
for b in SEED['bones']:
 if b['parent']>=0:ed[b['name']].parent=ed[SEED['bones'][b['parent']]['name']]
bpy.ops.object.mode_set(mode='OBJECT');mod=body.modifiers.new('现有22骨蒙皮','ARMATURE');mod.object=arm;body.parent=arm
# Export raw fixed-bind geometry for synchronous Three runtime baking.
tri=body.modifiers.new('GLB稳定三角化','TRIANGULATE');bpy.context.view_layer.objects.active=body;body.select_set(True);bpy.ops.object.modifier_apply(modifier=tri.name)
mesh=body.data;mesh.calc_loop_triangles();pos=[];normal=[];uv=[];si=[];sw=[];idx=[]
# Split by mesh loop: preserve UV seams and authored normals exactly.
for triangle in mesh.loop_triangles:
 for li in triangle.loops:
  vi=mesh.loops[li].vertex_index;v=mesh.vertices[vi];pos.extend(Y(v.co));normal.extend(Y(mesh.corner_normals[li].vector));uv.extend(mesh.uv_layers.active.data[li].uv)
  vals=sorted([(BI[body.vertex_groups[g.group].name],g.weight)for g in v.groups if body.vertex_groups[g.group].name in BI and g.weight>1e-7],key=lambda x:-x[1])[:4]
  if not vals:vals=[(BI['hips'],1)]
  total=sum(w for _,w in vals);si.extend([i for i,w in vals]+[0]*(4-len(vals)));sw.extend([w/total for i,w in vals]+[0]*(4-len(vals)));idx.append(len(idx))
raw={'position':pos,'normal':normal,'uv':uv,'skinIndex':si,'skinWeight':sw,'index':idx,'vertices':len(pos)//3,'triangles':len(idx)//3,'notes':notes}
encoded=json.dumps(raw,separators=(',',':')).encode();(QA/'body-mesh.json').write_bytes(encoded);(OUT/'source/body-mesh.json.gz').write_bytes(gzip.compress(encoded,mtime=0))
# Independent actual sword is preserved from the validated physical socket.
sword_objects=[]
for mi,src in enumerate(SEED['sword']):
 vs=src['attributes']['position']['array'];vs=[tuple(vs[i:i+3])for i in range(0,len(vs),3)];fs=[tuple(src['indices'][i:i+3])for i in range(0,len(src['indices']),3)];weights=[{'rightWrist':1}for v in vs];uvs=[]
 zone='steel'if src['material']==5 else'gold'if src['material']==4 else'ink'
 for x,y,z in vs:uvs.append((.5+(x/.4)*.4,max(0,min(1,(z+.25)/1.58))))
 o=mesh_obj('凤刃_独立_'+str(mi),vs,fs,weights,uvs,zone,0);o.data.materials.clear();o.data.materials.append(METAL if src['material']in[4,5]else MAT)
 # Bind-space world placement uses the original wrist socket. In the source
 # blend these are weighted rigidly to the wrist; runtime remains bone-child.
 rw=Vector(SEED['bones'][BI['rightWrist']]['head']);offset=Vector((0,-.035,.015))
 for v in o.data.vertices:v.co+=Vector(B(rw+offset))
 m=o.modifiers.new('固定手骨握点','ARMATURE');m.object=arm;o.parent=arm;sword_objects.append(o)
# Bake a soft contact AO into diffuse, not permanent directional sunlight.
base.save();alpha_image.save();scene.render.bake.margin=8;scene.cycles.samples=16
# Original material/color and AO remain reviewable; final AO multiply is done
# by the companion finishing script so base color never becomes destructive.
scene.world.color=(.10,.10,.10)
# Add exact preserved idle/walk/slash actions to editable Blender rig.
for take in SEED['actions']:
 action=bpy.data.actions.new(take['name']);arm.animation_data_create();arm.animation_data.action=action
 for pb in arm.pose.bones:pb.rotation_mode='QUATERNION'
 for sample in take['samples']:
  frame=1+sample['time']*30
  for i,b in enumerate(SEED['bones']):
   M=Matrix([sample['bones'][i][r::4]for r in range(4)]);INV=Matrix([b['inverse'][r::4]for r in range(4)]);D=C@M@INV@CI
   pb=arm.pose.bones[b['name']];pb.matrix=D@arm.data.bones[b['name']].matrix_local
   pb.keyframe_insert(data_path='location',frame=frame);pb.keyframe_insert(data_path='rotation_quaternion',frame=frame);pb.keyframe_insert(data_path='scale',frame=frame)
 track=arm.animation_data.nla_tracks.new();track.name=take['name'];track.strips.new(take['name'],1,action);arm.animation_data.action=None
scene.frame_start=1;scene.frame_end=61;scene.frame_set(1)
# Save original authoring topology and runtime mesh in one editable mother file.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'linyan-h34.blend'),compress=True)
bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);body.select_set(True)
for o in sword_objects:o.select_set(True)
bpy.context.view_layer.objects.active=arm
bpy.ops.export_scene.gltf(filepath=str(OUT/'linyan-h34.glb'),export_format='GLB',use_selection=True,export_animations=True,export_nla_strips=True,export_skins=True,export_yup=True,export_apply=False,export_materials='EXPORT')
report={'bodyTriangles':raw['triangles'],'rawSplitVertices':raw['vertices'],'bones':22,'materials':2,'atlas':[1024,1024],'sourceHeadHands':'VRoid HairSample_Male CC0; extracted real face/ear/backhead and curled hands, modified by project','topology':'new connected quad torso/armholes/sleeves, connected asymmetric split robe; no SDF or primitive-stack body','notes':notes}
(OUT/'model-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('H34_MODEL_REPORT',json.dumps(report,ensure_ascii=False))
