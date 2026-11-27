"""Read-only CPU source audit. No render, scene changes, or runtime writes.
blender --background --factory-startup --python tools/check-gate-036-source.py
"""
import bpy, json, hashlib, struct, math
from pathlib import Path

R=Path(__file__).resolve().parents[1]
A=R/'assets/gate-036'
bpy.ops.wm.open_mainfile(filepath=str(A/'source/gate-h36.blend'))
fixed=bpy.data.objects['H36_FIXED_035_exact_steps_platform']
def digest_mesh(o):
 h=hashlib.sha256()
 for v in o.data.vertices:h.update(struct.pack('<fff',*v.co))
 for p in o.data.polygons:
  h.update(struct.pack('<I',len(p.vertices)))
  for i in p.vertices:h.update(struct.pack('<I',i))
 for row in o.matrix_world:
  for x in row:h.update(struct.pack('<f',x))
 return h.hexdigest()
fixed_sha=digest_mesh(fixed)
with bpy.data.libraries.load(str(R/'assets/gate-035/source/gate-h35.blend'),link=False) as(src,dst):
 dst.objects=[n for n in src.objects if 'clean painted platform' in n]
assert len(dst.objects)==1
ref=dst.objects[0]
assert digest_mesh(ref)==fixed_sha,'Fixed old side stairs/platform changed'
meshes=[o for o in bpy.data.collections['H36_GATE_STRUCTURE'].objects if o.type=='MESH']
assert all(o.data.uv_layers for o in meshes)
assert not any(len(o.data.color_attributes) for o in meshes+[fixed])
assert not any(o.type in('LIGHT','CAMERA')for o in bpy.context.scene.objects)
triangles=0;degenerate=[];non_finite=[]
for o in meshes+[fixed]:
 o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
 for v in o.data.vertices:
  if not all(math.isfinite(x) for x in v.co):non_finite.append([o.name,v.index])
 for t in o.data.loop_triangles:
  a,b,c=[o.data.vertices[i].co for i in t.vertices]
  if (b-a).cross(c-a).length_squared<1e-18:degenerate.append([o.name,t.index])
assert not non_finite
report={'revision':'H36-structure-refinement-2','cpuOnly':True,'rendered':False,'runtimeModified':False,
 'fixed035Source': 'assets/gate-035/source/gate-h35.blend',
 'fixed035VertexTopologyAndWorldTransformSHA256':fixed_sha,
 'fixed035GeometryIdentical':True,'newMeshObjects':len(meshes),'totalTrianglesIncludingExact035Lower':triangles,
 'allNewMeshesHaveUV':True,'noVertexColors':True,'noSourceCameraOrLight':True,
 'degenerateTriangleCount':len(degenerate),'degenerateExamples':degenerate[:10],
 'nonFiniteVertexCount':len(non_finite),
 'files':{str(p.relative_to(R)):{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}for p in[A/'source/gate-h36.blend',A/'source/gate-h36.glb',R/'tools/build-gate-036.py']}}
(A/'source-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('H36_SOURCE_AUDIT',json.dumps(report,ensure_ascii=False))
