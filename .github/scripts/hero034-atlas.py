from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import math,random
root=Path(__file__).resolve().parents[2]/'fengming-v2-scene-a/assets/hero-034'
N=1024
im=Image.new('RGB',(N,N),(151,61,45));p=im.load();random.seed(34)
# Fixed UV zones. Source-face tiles are composited/baked by Blender afterward.
zones={'coat':(0,0,640,640),'sleeveR':(640,0,832,512),'sleeveL':(832,0,1024,512),'ink':(0,640,256,1024),'ivory':(256,640,384,832),'gold':(384,640,512,832),'hair':(256,832,512,1024),'skin':(512,640,1024,1024),'steel':(640,512,1024,640),'trim':(0,512,640,640),'neck':(512,512,640,640)}
for name,(x0,y0,x1,y1)in zones.items():
 for y in range(y0,y1):
  for x in range(x0,x1):
   u=(x-x0)/(x1-x0);v=(y-y0)/(y1-y0)
   if name=='coat':
    broad=.95+.07*math.cos(u*math.tau*2-.7)+.035*math.sin(u*math.tau*5+.2*v)
    brush=.012*math.sin(x*.073+y*.013)+.008*math.cos(y*.083+x*.019)
    seam=math.exp(-((u-.06)/.024)**2)*.12+math.exp(-((u-.94)/.025)**2)*.12
    shade=broad+brush-seam-.08*v*v;base=(166,62,44)
   elif name.startswith('sleeve'):
    shade=.88+.12*(1-v)+.06*math.cos(u*math.tau)-.07*math.exp(-((v-.51)/.08)**2);base=(167,62,44)
    if v>.86:base=(42,51,47);shade=.95+.07*math.cos(u*math.tau)
   elif name=='ink':shade=.86+.14*(1-v)+.055*math.cos(u*math.tau*3);base=(40,53,50)
   elif name=='ivory':shade=.94+.07*math.cos(u*math.pi)-.05*v;base=(215,204,176)
   elif name=='gold':shade=.88+.12*math.sin(u*math.pi)+.035*math.cos(v*math.pi*4);base=(166,134,78)
   elif name=='hair':shade=.83+.11*math.cos(u*math.tau*3)+.035*math.cos(u*math.tau*7+v);base=(30,43,42)
   elif name=='neck':shade=.94+.04*math.cos(u*math.pi);base=(185,139,106)
   elif name=='skin':shade=.98+.035*math.cos(u*math.pi);base=(191,148,116)
   elif name=='steel':shade=.9+.15*(1-abs(u-.5)*2);base=(185,204,197)
   elif name=='trim':shade=.86+.08*math.cos(v*math.pi);base=(122,42,33)
   else:shade=1;base=(150,60,45)
   p[x,y]=tuple(max(0,min(255,round(c*shade)))for c in base)
# Broad painted seam edges and sparse stitching; no miniature ornamental noise.
d=ImageDraw.Draw(im)
for name in ['sleeveR','sleeveL']:
 x0,y0,x1,y1=zones[name];yy=round(y0+(y1-y0)*.855)
 d.line([(x0,yy),(x1,yy)],fill=(165,130,76),width=3)
im.save(root/'linyan-atlas-base.png')
(root/'atlas-zones.json').write_text(__import__('json').dumps(zones,indent=2))
print(root/'linyan-atlas-base.png')
