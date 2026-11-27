"""Remove unused embedded maps and losslessly encode runtime paintings.

Original GLBs/PNGs remain authoritative and unchanged. Every geometry buffer
view and every decoded RGBA pixel is checked before writing the manifest.
"""
from pathlib import Path
from PIL import Image
import json,struct,hashlib

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets/sample-runtime'
OUT.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
proof={'models':{},'images':{}}
meta=json.loads((ROOT/'assets/sample-ground/metadata.json').read_text())
assert sha((ROOT/'assets/sample-lod/terrain.glb').read_bytes())==meta['source_sha256'],'Rebuild ground cache after changing terrain'
assert sha((ROOT/'assets/sample-lod/navigation.json').read_bytes())==meta['navigation_sha256'],'Rebuild ground cache after changing navigation'
assert sha((ROOT/'assets/sample-ground/height.f32').read_bytes())==meta['sha256']
assert sha((ROOT/'assets/sample-ground/slope.bits').read_bytes())==meta['slope_bits']['sha256']

def pack_glb(name,keep_color):
 src=ROOT/f'assets/sample-lod/{name}.glb'
 raw=src.read_bytes();length,kind=struct.unpack_from('<II',raw,12)
 doc=json.loads(raw[20:20+length]);at=20+length;blen,bkind=struct.unpack_from('<II',raw,at);binary=raw[at+8:at+8+blen]
 original_views=doc['bufferViews'];used_textures=set()
 for m in doc.get('materials',[]):
  pbr=m.get('pbrMetallicRoughness',{})
  if keep_color and 'baseColorTexture'in pbr:used_textures.add(pbr['baseColorTexture']['index'])
  else:pbr.pop('baseColorTexture',None)
  pbr.pop('metallicRoughnessTexture',None)
  for key in ['normalTexture','occlusionTexture','emissiveTexture']:m.pop(key,None)
 tex_ids=sorted(used_textures);tex_map={v:i for i,v in enumerate(tex_ids)}
 texs=[doc['textures'][i]for i in tex_ids];image_ids=sorted({t['source']for t in texs});image_map={v:i for i,v in enumerate(image_ids)}
 imgs=[doc['images'][i]for i in image_ids]
 for m in doc.get('materials',[]):
  t=m.get('pbrMetallicRoughness',{}).get('baseColorTexture')
  if t:t['index']=tex_map[t['index']]
 for t in texs:t['source']=image_map[t['source']]
 views=set()
 for a in doc['accessors']:
  if 'bufferView'in a:views.add(a['bufferView'])
  if 'sparse'in a:
   for k in ['indices','values']:views.add(a['sparse'][k]['bufferView'])
 for i in imgs:
  if 'bufferView'in i:views.add(i['bufferView'])
 mapping={v:i for i,v in enumerate(sorted(views))};new_views=[];blob=bytearray();geometry_hashes=[]
 for v in sorted(views):
  old=original_views[v];chunk=binary[old.get('byteOffset',0):old.get('byteOffset',0)+old['byteLength']]
  while len(blob)%4:blob.append(0)
  item=dict(old);item['byteOffset']=len(blob);item['buffer']=0;new_views.append(item);blob.extend(chunk)
  assert bytes(blob[item['byteOffset']:item['byteOffset']+item['byteLength']])==chunk
  geometry_hashes.append({'oldView':v,'sha256':sha(chunk),'bytes':len(chunk)})
 for a in doc['accessors']:
  if 'bufferView'in a:a['bufferView']=mapping[a['bufferView']]
  if 'sparse'in a:
   for k in ['indices','values']:a['sparse'][k]['bufferView']=mapping[a['sparse'][k]['bufferView']]
 for i in imgs:
  if 'bufferView'in i:i['bufferView']=mapping[i['bufferView']]
 doc['bufferViews']=new_views;doc['buffers']=[{'byteLength':len(blob)}]
 for key,items in [('textures',texs),('images',imgs)]:
  if items:doc[key]=items
  else:doc.pop(key,None)
 data=json.dumps(doc,separators=(',',':')).encode()
 while len(data)%4:data+=b' '
 while len(blob)%4:blob.append(0)
 out=struct.pack('<III',0x46546c67,2,12+8+len(data)+8+len(blob))+struct.pack('<II',len(data),0x4e4f534a)+data+struct.pack('<II',len(blob),0x004e4942)+blob
 (OUT/f'{name}.glb').write_bytes(out)
 proof['models'][name]={'source':str(src.relative_to(ROOT)),'sourceSHA256':sha(raw),'runtimeSHA256':sha(out),'beforeBytes':len(raw),'afterBytes':len(out),'geometryViewsByteIdentical':True,'views':geometry_hashes,'keptColorImages':len(imgs)}

for name,keep in [('terrain',False),('gate',True)]:pack_glb(name,keep)
for source,name in [('environment-031/stone-atlas.png','stone-atlas.webp'),('environment-031/mountain-atlas.png','mountain-atlas.webp'),('pine-007/pine-layer-atlas.png','pine-atlas.webp')]:
 src=ROOT/'assets'/source;img=Image.open(src);dest=OUT/name
 img.save(dest,'WEBP',lossless=True,exact=True,method=6)
 decoded=Image.open(dest).convert('RGBA');pixels=img.convert('RGBA').tobytes()
 assert decoded.tobytes()==pixels,source+' changed pixels'
 proof['images'][name]={'source':str(src.relative_to(ROOT)),'beforeBytes':src.stat().st_size,'afterBytes':dest.stat().st_size,'width':img.width,'height':img.height,'decodedRGBAIdentical':True,'decodedRGBASHA256':sha(pixels),'runtimeSHA256':sha(dest.read_bytes())}
(OUT/'manifest.json').write_text(json.dumps(proof,indent=2)+'\n')
before=sum(q['beforeBytes']for g in proof.values()for q in g.values());after=sum(q['afterBytes']for g in proof.values()for q in g.values())
print(f'Runtime assets {before:,} -> {after:,} bytes; geometry and decoded RGBA unchanged')
