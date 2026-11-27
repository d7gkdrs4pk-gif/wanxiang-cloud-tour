from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import json,math
import numpy as np
from scipy.ndimage import distance_transform_edt
r=Path(__file__).resolve().parents[1]/'assets/environment-035';q=json.loads((r/'road-layout.json').read_text());S=2;W=384;H=512;im=Image.new('L',(W*S,H*S));d=ImageDraw.Draw(im)
for p in q['pieces']:
 x,z=p['center'];w,h=p['size'];a=p.get('yaw',0);c=math.cos(a);s=math.sin(a);points=[]
 for xx,zz in [(-w/2-.045,-h/2-.045),(w/2+.045,-h/2-.045),(w/2+.045,h/2+.045),(-w/2-.045,h/2+.045)]:
  X=x+c*xx-s*zz;Z=z+s*xx+c*zz;points.append(((X+8)/13*W*S,(1-(Z+9)/18)*H*S))
 d.polygon(points,fill=255)
im=im.resize((W,H),Image.Resampling.LANCZOS)
# This is scalar geometry-coverage data, not a repainted scene. Only the inner
# road gets the full .045m grout-bed recess. At the perimeter it retreats over
# .20m into the original soil/moss so the outside stones remain partly buried.
coverage=np.asarray(im,dtype=np.float32)/255
border=distance_transform_edt(coverage>.5,sampling=(18/H,13/W))
t=np.clip((border-.025)/.20,0,1);t=t*t*(3-2*t)
im=Image.fromarray(np.uint8(np.round(coverage*t*255))).filter(ImageFilter.GaussianBlur(.2));im.save(r/'road-bed-mask.png')
print({'mask':[W,H],'bounds':[-8,5,-9,9],'bytes':(r/'road-bed-mask.png').stat().st_size})
