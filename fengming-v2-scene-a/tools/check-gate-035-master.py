"""CPU GLB buffers, embedded atlases and editable-master manifest; no renderer."""
from pathlib import Path
from io import BytesIO
from PIL import Image
import struct,json,hashlib
root=Path(__file__).resolve().parents[1];asset=root/'assets/gate-035';master=asset/'source'
raw=(master/'gate-h35.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+n]);binary=raw[28+n:]
expected=json.loads((asset/'geometry-qa.json').read_text())['newVisibleTriangles'];images=[]
for q in j['images']:
 v=j['bufferViews'][q['bufferView']];data=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
 with Image.open(BytesIO(data))as image:image.load();size=list(image.size)
 images.append({'name':q['name'],'mimeType':q['mimeType'],'size':size,'decoded':True,'sha256':hashlib.sha256(data).hexdigest()})
triangles=0;normal_error=0
for mesh in j['meshes']:
 for primitive in mesh['primitives']:
  triangles+=j['accessors'][primitive['indices']]['count']//3
  a=j['accessors'][primitive['attributes']['NORMAL']];v=j['bufferViews'][a['bufferView']];offset=v.get('byteOffset',0)+a.get('byteOffset',0);values=struct.unpack_from('<'+'f'*(a['count']*3),binary,offset)
  for i in range(0,len(values),3):normal_error=max(normal_error,abs(sum(x*x for x in values[i:i+3])-1))
assert triangles==expected and normal_error<1e-5
report={'revision':'H35','GLBMeshes':len(j['meshes']),'triangles':triangles,'materials':len(j['materials']),'embeddedImages':images,'maxNormalSquaredLengthError':normal_error,'scope':'CPU GLB parse, image decode and unit-normal validation; not a rendered image or live-runtime loading claim'}
(asset/'glb-master-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
files=[]
for f in [master/'gate-h35.glb',master/'gate-h35.blend']:files.append({'file':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'runtimeDownload':False})
(master/'manifest.json').write_text(json.dumps({'revision':'H35','sourceMeshes':4,'sourceTriangles':triangles,'sourceAssetsOnly':True,'files':files,'provenance':'../README.md'},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'triangles':triangles,'materials':len(j['materials']),'normalError':normal_error,'packedImageSizes':[x['size']for x in images]}))
