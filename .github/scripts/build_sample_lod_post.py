"""Keep data textures lossless PNG, encode only material base-color as JPEG90.
Called by build_sample_lod.py using ordinary Python with Pillow.
"""
import io,json,struct,sys,pathlib
from PIL import Image
p=pathlib.Path(sys.argv[1]);raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[28+n:]
base=set()
for m in g.get('materials',[]):
    tex=m.get('pbrMetallicRoughness',{}).get('baseColorTexture')
    if tex is not None:base.add(g['textures'][tex['index']]['source'])
replace={};report=[]
for i,img in enumerate(g.get('images',[])):
    v=g['bufferViews'][img['bufferView']];data=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];im=Image.open(io.BytesIO(data))
    if i in base and img['mimeType']!='image/jpeg':
        out=io.BytesIO();im.convert('RGB').save(out,format='JPEG',quality=90,optimize=True);replace[img['bufferView']]=out.getvalue();img['mimeType']='image/jpeg'
    elif i not in base and img['mimeType']!='image/png':
        out=io.BytesIO();im.save(out,format='PNG',optimize=True);replace[img['bufferView']]=out.getvalue();img['mimeType']='image/png'
    report.append({'name':img.get('name'),'role':'baseColor' if i in base else 'data','mime':img['mimeType'],'dimensions':list(im.size)})
packed=bytearray()
for i,v in enumerate(g['bufferViews']):
    while len(packed)%4:packed.append(0)
    old=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];data=replace.get(i,old);v['byteOffset']=len(packed);v['byteLength']=len(data);packed.extend(data)
while len(packed)%4:packed.append(0)
g['buffers'][0]['byteLength']=len(packed);j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
p.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(j)+len(packed))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(packed),b'BIN\x00')+packed)
print(json.dumps({'asset':p.name,'images':report}))
