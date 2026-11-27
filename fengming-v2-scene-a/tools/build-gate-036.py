"""Blender source: H36 structural gatehouse, world-positioned, PBR, no renders.
blender --background --factory-startup --python tools/build-gate-036.py
"""
import bpy,bmesh,math,json,hashlib,re
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];A=R/'assets/gate-036';S=A/'source';S.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials):bpy.data.materials.remove(m)
root=bpy.data.collections.new('H36_GATE');bpy.context.scene.collection.children.link(root)
body=bpy.data.collections.new('H36_GATE_STRUCTURE');root.children.link(body)
fixed=bpy.data.collections.new('H36_FIXED_035_STEPS_PLINTH');root.children.link(fixed)
def material(name,color,rough,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;m.diffuse_color=(*color,1);return m
M={'roof':material('H36_Roof',(.028,.068,.079),.76),'wood':material('H36_Wood',(.060,.031,.018),.68),'stone':material('H36_Stone',(.255,.285,.278),.91),'plaque':material('H36_Plaque',(.46,.32,.11),.52,.45)}
def B(v):return (v[0],-v[2],v[1])
def put(o,col=body):
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o);return o
def mesh(name,pts,faces,mat):
 g=bpy.data.meshes.new(name+'_mesh');g.from_pydata([B(p)for p in pts],[],faces);g.update();o=bpy.data.objects.new(name,g);body.objects.link(o);g.materials.append(M[mat]);return o
def bevel(o,amount=.025,segments=2):
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 mod=o.modifiers.new('Real edge bevel','BEVEL');mod.width=amount;mod.segments=segments;mod.affect='EDGES'
 bpy.ops.object.modifier_apply(modifier=mod.name)
 try:
  n=o.modifiers.new('Area-weighted hard surfaces','WEIGHTED_NORMAL');n.keep_sharp=True;n.weight=40;bpy.ops.object.modifier_apply(modifier=n.name)
 except RuntimeError:pass
 o.select_set(False);return o
def box(name,w,h,d,x,y,z,mat='wood',b=.022,yaw=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=B((x,y,z)));o=put(bpy.context.object);o.name=name;o.dimensions=(w,d,h);o.rotation_euler.z=yaw;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(M[mat]);return bevel(o,b) if b else o
def post(name,x,z,bottom,top,r=.14,mat='wood'):
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=top-bottom,location=B((x,(top+bottom)/2,z)));o=put(bpy.context.object);o.name=name;o.data.materials.append(M[mat]);return bevel(o,.012,2)
def tube(name,points,radius,mat='wood',r_end=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=radius;c.bevel_resolution=2;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for q,p in zip(s.bezier_points,points):q.co=B(p);q.handle_left_type=q.handle_right_type='AUTO'
 if r_end is not None:s.bezier_points[-1].radius=r_end/radius
 o=bpy.data.objects.new(name,c);body.objects.link(o);o.data.materials.append(M[mat]);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);return o
# Fixed lower is imported as geometry, stripped of H35 baked colors/materials.
# Original side-step vertices and platform positions are not moved.
with bpy.data.libraries.load(str(R/'assets/gate-035/source/gate-h35.blend'),link=False)as(src,dst):
 dst.objects=[n for n in src.objects if 'clean painted platform' in n]
assert len(dst.objects)==1, 'Missing exact H35 lower reference'
for o in dst.objects:
 fixed.objects.link(o);o.name='H36_FIXED_035_exact_steps_platform';o.data.materials.clear();o.data.materials.append(M['stone'])
 for p in o.data.polygons:p.material_index=0
 for c in list(o.data.color_attributes):o.data.color_attributes.remove(c)
 o['physical_reference']='Unchanged H35 cached exact side steps and plinth geometry; PBR reassigned only'
# A continuous rock support skin sits ONLY over the old forbidden apron.
# The exact stair cells, low route markers and all legal outside ground are
# still the untouched reference. Densified irregular folds join the plinth to
# the mountain without adding isolated boulders or a pale retaining wall.
raw=(R/'assets/gate-035/foundation-data.js').read_text()
foundation=json.loads(raw[raw.index('{'):raw.rindex('}')+1]);old=foundation['positions'];old=[old[i:i+3]for i in range(0,72,3)]
rv=[];rf=[];rc=11;rr=5
for row in range(rr):
 v=row/(rr-1);oldrow=v*3;ri=min(2,int(oldrow));rt=oldrow-ri
 for col in range(rc):
  u=col/(rc-1);ci=min(4,int(u*5));ct=u*5-ci
  def interp(r):return [old[r*6+ci][k]*(1-ct)+old[r*6+ci+1][k]*ct for k in range(3)]
  a,b=interp(ri),interp(ri+1);x,y,z=[a[k]*(1-rt)+b[k]*rt for k in range(3)]
  edge=(math.sin(math.pi*u)*math.sin(math.pi*v))**.7
  # Folds are deliberately not parallel to either screen edge or tile rows.
  z+=edge*.074*math.sin(col*1.73+row*.92)
  y+=.018+edge*(.072+.031*math.sin(col*2.31+row*1.87))
  rv.append((x,y,z))
for row in range(rr-1):
 for col in range(rc-1):
  a=row*rc+col;b=a+rc
  rf.extend([(a,b,b+1),(a,b+1,a+1)]if(row+col)%2 else[(a,b,a+1),(a+1,b,b+1)])
edge=list(range(rc))+[r*rc+rc-1 for r in range(1,rr)]+list(range(rr*rc-2,(rr-1)*rc-1,-1))+[r*rc for r in range(rr-2,0,-1)]
offset=len(rv)
for i in edge:x,y,z=rv[i];rv.append((x,-.09,z))
for j,a in enumerate(edge):b=edge[(j+1)%len(edge)];rf.append((a,b,offset+(j+1)%len(edge),offset+j))
rf.append(tuple(range(len(rv)-1,offset-1,-1)))
rock=mesh('H36_Continuous_bedrock_plinth_to_slope',rv,rf,'stone');rock['inside_original_forbidden_apron']=True
# Dressed foundation courses are a few broad blocks rather than a uniform
# slab. Their chipped/beveled shoulders reveal the scale of the gate footing.
for z in[-9.65,-5.32]:
 for i in range(6):
  x=-2.28+(i+.5)*3.50/6
  box('H36_Platform_basal_dressed_stone',3.50/6-.022,.26,.23,x,.445,z,'stone',.032)
for i in range(7):
 z=-9.53+(i+.5)*4.10/7
 box('H36_West_footing_rock_course',.25,.31,4.10/7-.022,-2.29,.432,z,'stone',.036)
# Structural pillars occupy old four stone seats, with a new east wall bay.
for x in [-1.75,-.05,.85]:
 for z in [-8.85,-6.15]:
  # Two actual dressed stone courses. Their softened shoulders meet the
  # timber rather than leaving posts to appear pushed through a flat floor.
  box('H36_Column_foot_square_plinth',.48,.105,.48,x,.767,z,'stone',.026)
  box('H36_Column_foot_battered_cap',.39,.075,.39,x,.843,z,'stone',.022)
  post('H36_Load_bearing_column',x,z,.8445,3.09,.14)
  box('H36_Column_cap',.32,.11,.32,x,3.04,z,'wood',.022)
# South and rear frontal beams, with clear entrance void.
for z in [-6.15,-8.85]:
 box('H36_Main_lintel',3.03,.25,.30,-.45,2.97,z,'wood',.035)
 box('H36_Upper_lintel_lip',3.13,.075,.34,-.45,3.15,z,'wood',.018)
 for x,sign in [(-1.75,1),(-.05,-1)]:
  # Curved knee bracket, real extruded outline rather than a diagonal stick.
  prof=[(0,0),(.49,0),(.49,-.075),(.37,-.095),(.28,-.16),(.20,-.28),(.06,-.28),(.11,-.15),(0,-.09)]
  pts=[(x+sign*u,2.95+v,z+dz)for dz in[-.11,.11]for u,v in prof];N=len(prof);faces=[]
  faces.append(tuple(range(N-1,-1,-1)));faces.append(tuple(range(N,N*2)))
  for i in range(N):j=(i+1)%N;faces.append((i,j,N+j,N+i))
  bevel(mesh('H36_Curved_gate_jamb_bracket',pts,faces,'wood'),.012,2)
for x in [-1.75,-.05,.85]:box('H36_Through_beam',.18,.23,3.10,x,2.98,-7.5,'wood',.025)
# East guard-room side wall and stone wing make the mass a gate building.
# All are west of the clear east stair/combat lane.
def masonry(name,x,z,w,h,d,axis='x',courses=3,blocks=4,bottom=.7145):
 # Real restrained joints and broad soft bevels; never a single pale slab.
 for row in range(courses):
  cuts=([0,.5]+[i+.5 for i in range(1,blocks)]+[blocks])if row%2 else list(range(blocks+1))
  for i in range(len(cuts)-1):
   a,b=cuts[i]/blocks,cuts[i+1]/blocks;length=w*(b-a)-.014;mid=w*((a+b)*.5-.5)
   box(name,length if axis=='x'else d,h/courses-.012,d if axis=='x'else length,x+(mid if axis=='x'else 0),bottom+(row+.5)*h/courses,z+(mid if axis=='z'else 0),'stone',.018)
masonry('H36_East_dressed_stone_courses',.86,-7.50,2.66,.77,.22,'z',3,4)
for z in [-8.49,-7.50,-6.51]:
 box('H36_East_window_post',.20,1.21,.105,.86,2.185,z,'wood',.018)
box('H36_East_window_sill',.25,.13,2.7,.86,1.54,-7.50,'wood',.02)
box('H36_East_window_header',.25,.14,2.7,.86,2.77,-7.50,'wood',.02)
for z in [-8.25,-8.02,-7.79,-7.26,-7.03,-6.80]:box('H36_Side_lattice_vertical',.11,1.04,.045,.88,2.185,z,'wood',.008)
for y in [1.84,2.27,2.60]:box('H36_Side_lattice_horizontal',.11,.045,2.44,.88,y,-7.5,'wood',.008)
# Front stone wings and a western side wall: solid/void rhythm at phone scale.
masonry('H36_Front_east_dressed_wing',.43,-6.17,.67,.81,.24,'x',3,1)
masonry('H36_Front_west_dressed_wing',-1.91,-6.17,.28,.81,.24,'x',3,1)
masonry('H36_West_dressed_stone_courses',-1.91,-7.50,2.62,.68,.18,'z',2,4)
box('H36_West_wall_cap',.25,.12,2.72,-1.91,1.4545,-7.50,'wood',.02)
for x,width in[(.43,.67),(-1.91,.28)]:
 box('H36_Front_wing_timber_sill',width+.06,.11,.27,x,1.58,-6.17,'wood',.015)
 # Timber infill over a low stone dado keeps the entry dark and avoids
 # broad vertical white plaster competing with the sword-bearing figure.
 box('H36_Front_wing_timber_infill',width-.045,.70,.08,x,1.995,-6.17,'wood',.013)
# Two real panelled half-open doors. Hinges anchored on the original door bay.
for x,sign,yaw in [(-1.58,1,-.85),(-.22,-1,.85)]:
 hinge=bpy.data.objects.new('H36_Door_hinge',None);body.objects.link(hinge);hinge.location=B((x,.7145,-6.15));hinge.rotation_euler.z=yaw
 for part,w,h,d,px,py,pz,b in [('leaf',.66,1.65,.095,sign*.33,.86,0,.02),('upper_panel',.49,.60,.045,sign*.33,1.18,.067,.012),('lower_panel',.49,.51,.045,sign*.33,.48,.067,.012)]:
  o=box('H36_Door_'+part,w,h,d,px,py,pz,'wood',b);o.parent=hinge
# Roof: broad east-west ridge, curved four-slope silhouette and thick soffit.
cx=-.425;cz=-7.60;hx=1.625;hz=1.75;eave=3.15;rise=1.10
smooth=lambda a:a*a*(3-2*a)
def surf(x,z):
 u=min(1,abs(x-cx)/hx);v=min(1,abs(z-cz)/hz);hip=smooth(max(0,min(1,(1-u)/.25)))
 return eave+rise*(1-v)**1.75*hip+.22*v**6+.18*u**6*v**4
nx=24;nz=20;verts=[];faces=[]
for side in[0,1]:
 for j in range(nz+1):
  for i in range(nx+1):
   x=cx-hx+2*hx*i/nx;z=cz-hz+2*hz*j/nz;verts.append((x,surf(x,z)-side*.22,z))
layer=(nx+1)*(nz+1)
for j in range(nz):
 for i in range(nx):
  a=j*(nx+1)+i;b=a+nx+1;faces.append((a,b,b+1,a+1));faces.append((a+layer,a+1+layer,b+1+layer,b+layer))
for j in range(nz):
 for i in[0,nx]:a=j*(nx+1)+i;b=a+nx+1;faces.append((a,a+layer,b+layer,b))
for i in range(nx):
 for j in[0,nz]:a=j*(nx+1)+i;b=a+1;faces.append((a,b,b+layer,a+layer))
mesh('H36_Solid_curved_roof_mass',verts,faces,'roof')
# Eave fascia has real depth, wood undercroft and exposed parallel rafters.
for sign in[-1,1]:
 z=cz+sign*hz;points=[(cx-hx+2*hx*i/20,surf(cx-hx+2*hx*i/20,z)-.09,z)for i in range(21)];tube('H36_Thick_curved_eave_fascia',points,.065,'wood')
for sign in[-1,1]:
 x=cx+sign*hx;points=[(x,surf(x,cz-hz+2*hz*i/16)-.10,cz-hz+2*hz*i/16)for i in range(17)];tube('H36_Gable_curved_fascia',points,.058,'wood')
for i in range(16):
 x=cx-hx+.15+(2*hx-.30)*i/15
 for sign in[-1,1]:
  z=cz+sign*(hz-.19);box('H36_Exposed_rafter_tail',.075,.09,.40,x,surf(x,z)-.25,z,'wood',.012)
# Chinese clay tiling is assembled as SHORT, thick concave pans with
# independent half-round cover tiles over their seams. Each row has a real
# overlapping downstream lip, avoiding one continuous corrugated sheet.
PV=[];PF=[]
def pmesh(p,f):
 k=len(PV);PV.extend(p);PF.extend(tuple(k+x for x in q)for q in f)
def tile_shell(points,cross,rings,thickness=.018):
 # The top is oriented from geometry afterward; each tile is a closed clay
 # solid, including short end faces that catch the real daylight.
 count=len(points);p=points+[(x,y-thickness,z)for x,y,z in points];f=[]
 for k in range(rings-1):
  for q in range(cross):
   a=k*(cross+1)+q;b=a+cross+1;f.extend([(a,b,b+1,a+1),(a+count,a+1+count,b+1+count,b+count)])
 edge=list(range(cross+1))+[k*(cross+1)+cross for k in range(1,rings)]+list(range(count-2,count-cross-2,-1))+[k*(cross+1)for k in range(rings-2,0,-1)]
 for k,a in enumerate(edge):b=edge[(k+1)%len(edge)];f.append((a,b,b+count,a+count))
 pmesh(p,f)
cols=15;rows=7;tileW=(2*hx-.16)/cols
for sign in[-1,1]:
 for row in range(rows):
  v0=.045+(.955/rows)*row;v1=min(1,v0+.955/rows+.023)
  for col in range(cols):
   x0=cx-hx+.08+tileW*(col+.5);p=[];cross=4
   for t in[0,.45,1]:
    z=cz+sign*hz*(v0+(v1-v0)*t)
    for q in range(cross+1):
     u=q/cross;x=x0+(u-.5)*tileW*.97
     # A gentle concave pan, with its downstream edge lifted over the next
     # piece. The 34mm overlap is modeled, not a dark line in a texture.
     y=surf(x,z)+.026+.034*t+.023*(2*u-1)**2
     p.append((x,y,z))
   tile_shell(p,cross,3,.019)
 # Seam caps have staggered transverse joins relative to the concave pans.
 for col in range(cols+1):
  x0=cx-hx+.08+tileW*col
  for row in range(rows):
   v0=.022+(.978/rows)*row;v1=min(1,v0+.978/rows+.018);p=[];cross=6
   for t in[0,.5,1]:
    z=cz+sign*hz*(v0+(v1-v0)*t)
    for q in range(cross+1):
     a=q/cross*math.pi;x=x0-math.cos(a)*.047
     y=surf(x,z)+.056+.030*t+math.sin(a)*.064
     p.append((x,y,z))
   tile_shell(p,cross,3,.018)
tile_object=mesh('H36_Short_overlapping_pan_and_cover_clay_tiles',PV,PF,'roof')
# A readable row of ceramic tile-end discs closes the open eave mouths.
# Discs are true shallow cylinders, not balls or gold decorations.
for sign in[-1,1]:
 for col in range(cols+1):
  x=cx-hx+.08+tileW*col;z=cz+sign*(hz+.010);y=surf(x,cz+sign*hz)+.074
  bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.060,depth=.024,location=B((x,y,z)),rotation=(math.pi/2,0,0));o=put(bpy.context.object);o.name='H36_Ceramic_round_tile_end';o.data.materials.append(M['roof']);bevel(o,.006,2)
# Curved ridge is a continuous ceramic volume, with four lifted corner ribs.
ry=4.33
ridge=[(cx-hx*.78,ry+.06,cz),(cx,ry,cz),(cx+hx*.78,ry+.06,cz)]
tube('H36_Curved_ceramic_main_ridge',ridge,.075,'roof')
for sign in[-1,1]:
 x=cx+sign*hx*.78;tube('H36_Quiet_upturned_ridge_end',[(x-sign*.12,ry+.02,cz),(x+sign*.04,ry+.11,cz),(x+sign*.13,ry+.23,cz)],[.05][0],'roof',.018)
 for sz in[-1,1]:
  pts=[]
  for i in range(9):
   t=i/8;xx=cx+sign*hx*(.70+.30*t);zz=cz+sz*hz*t;pts.append((xx,surf(xx,zz)+.07,zz))
  tube('H36_Hip_corner_ceramic_rib',pts,.044,'roof')
# A wide four-character entrance name board sits on the near lintel face,
# physically in front of the fascia rather than hiding in its underside.
bx=-.57;by=2.98;bz=-5.69
box('H36_Thick_recessed_name_board',2.37,.68,.14,bx,by,bz,'wood',.034)
for y in[by-.304,by+.304]:box('H36_Name_board_raised_frame',2.32,.045,.035,bx,y,bz+.086,'wood',.009)
for x in[bx-1.14,bx+1.14]:box('H36_Name_board_side_frame',.045,.60,.035,x,by,bz+.086,'wood',.009)
for x in[-1.50,.30]:box('H36_Name_board_hanger',.075,.12,.58,x,3.16,-5.98,'wood',.014)
font_path='/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc'
try:
 font=bpy.data.fonts.load(font_path);cu=bpy.data.curves.new('H36_Phoenix_gate_glyphs','FONT');cu.body='凤鸣山门';cu.font=font;cu.align_x='CENTER';cu.align_y='CENTER';cu.size=.55;cu.extrude=.007;cu.bevel_depth=.002;cu.bevel_resolution=1
 o=bpy.data.objects.new('H36_Phoenix_gate_raised_glyphs',cu);body.objects.link(o);o.location=B((bx,by,bz+.083));o.rotation_euler.x=math.pi/2;cu.materials.append(M['plaque']);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
except Exception as e:print('TEXT_FONT_WARNING',str(e))
# First editable source contains no camera/sun and no color attributes.
for o in list(body.objects)+list(fixed.objects):
 if o.type=='MESH':
  for c in list(o.data.color_attributes):o.data.color_attributes.remove(c)
# Closed hand-built solids are recalculated outward; tile pans retain their
# deliberate open upper face and real turned lip direction.
for o in body.objects:
 if o.type=='MESH' and any(t in o.name for t in ['Solid_curved_roof_mass','jamb_bracket','clay_tiles','bedrock_plinth']):
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
# Provide real bakeable UVs for newly constructed meshes. No light/color bake.
bpy.ops.object.select_all(action='DESELECT')
for o in body.objects:
 if o.type=='MESH' and not o.data.uv_layers:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(62),island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
# Remove orphan dependencies imported with the geometry-only fixed reference.
for mat in list(bpy.data.materials):
 if mat.users==0:bpy.data.materials.remove(mat)
for image in list(bpy.data.images):
 if image.users==0:bpy.data.images.remove(image)
for font in list(bpy.data.fonts):
 if font.users==0 and font.name!='Bfont':bpy.data.fonts.remove(font)
bpy.context.view_layer.update()
# Only our four semantic PBR materials remain referenced by the new source.
scene=bpy.context.scene;scene['H36_semantic_materials']='H36_Roof / H36_Wood / H36_Stone / H36_Plaque';scene['H36_coordinate_system']='Three world (X,Y,Z) -> Blender (X,-Z,Y)';scene['H36_no_baked_vertex_sun']=True
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(S/'gate-h36.blend'),compress=True)
# Export source meshes only. Runtime batching / baked materials are a later root stage.
bpy.ops.object.select_all(action='DESELECT')
for o in list(body.objects)+list(fixed.objects):o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(S/'gate-h36.glb'),export_format='GLB',use_selection=True,export_apply=True,export_materials='EXPORT',export_animations=False,export_cameras=False,export_lights=False)
# Exact measured world bounds for root / pine coordination.
pts=[]
for o in body.objects:
 if o.type=='MESH':
  for v in o.data.vertices:
   p=o.matrix_world@v.co;pts.append((p.x,p.z,-p.y))
lo=[min(p[i]for p in pts)for i in range(3)];hi=[max(p[i]for p in pts)for i in range(3)]
roofpts=[]
for o in body.objects:
 if o.type=='MESH' and ('roof' in o.name.lower()or 'ridge' in o.name.lower()or 'eave' in o.name.lower()or 'ceramic' in o.name.lower()or 'fascia' in o.name.lower()or 'rafter' in o.name.lower()):
  for v in o.data.vertices:
   p=o.matrix_world@v.co;roofpts.append((p.x,p.z,-p.y))
rooflo=[min(p[i]for p in roofpts)for i in range(3)];roofhi=[max(p[i]for p in roofpts)for i in range(3)]
report={'revision':'H36-structure-refinement-2','collection':'H36_GATE','worldBounds':[lo,hi],'roofWorldBounds':[rooflo,roofhi],'surfacePeakY':4.25,'pillarSeatXZ':[[x,z]for x in[-1.75,-.05,.85]for z in[-8.85,-6.15]],'semanticMaterials':list(m.name for m in M.values()),'tileConstruction':{'channels':cols,'rowsPerSlope':rows,'panPieces':cols*rows*2,'coverPieces':(cols+1)*rows*2,'clayThickness':.018,'overlapRise':.034,'roundEaveEndCaps':(cols+1)*2},'plaqueText':'凤鸣山门','newFoundationInsideOriginalForbiddenFootprint':True,'fixed035StairGeometryChanged':False,'meshObjects':len([o for o in body.objects if o.type=='MESH']),'noCameraOrLights':True,'vertexColorLayers':sum(len(o.data.color_attributes)for o in list(body.objects)+list(fixed.objects)if o.type=='MESH'),'allNewMeshesHaveUV':all(bool(o.data.uv_layers)for o in body.objects if o.type=='MESH'),'rendered':False,'scope':'Editable refined structural source for original-camera root Cycles evaluation; no art pass claim'}
(A/'first-source.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('H36_REPORT',json.dumps(report,ensure_ascii=False))
