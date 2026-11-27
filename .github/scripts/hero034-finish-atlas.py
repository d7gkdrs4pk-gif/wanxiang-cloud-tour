from pathlib import Path
from PIL import Image,ImageChops
import json
root=Path(__file__).resolve().parents[2]/'fengming-v2-scene-a/assets/hero-034'
base=Image.open(root/'linyan-atlas.png').convert('RGB');ao=Image.open(root/'linyan-ao.png').convert('RGB')
p=base.load()
# CC0 original blue anime irises become subdued natural dark-brown eyes;
# skin blush and lip saturation are reduced to the shared warm skin palette.
for y in range(640,1024):
 for x in range(512,1024):
  r,g,b=p[x,y]
  if b>r*1.15 and b>g*1.05 and b>35:p[x,y]=(max(20,int(r*.7)),max(17,int(g*.45)),max(13,int(b*.22)))
  elif r>g*1.04 and r>b*1.08 and r>105:
   m=(r+g+b)/3;p[x,y]=(int((r*.87+m*.13)*.83),int((g*.80+m*.20)*.81),int((b*.83+m*.17)*.78))
# AO is intentionally restrained: retain every painted color's broad values.
shade=ao.convert('L').point(lambda x:round(166+x*.349)).convert('RGB')
final=ImageChops.multiply(base,shade).convert('RGBA');final.putalpha(Image.open(root/'linyan-alpha.png').convert('L'));final.save(root/'linyan-atlas.png');final.save(root/'linyan-atlas.webp',quality=94,method=6)
print('atlas PNG/WebP', (root/'linyan-atlas.webp').stat().st_size)
