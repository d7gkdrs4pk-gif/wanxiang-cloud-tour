"""Technical atlas packing of original ImageGen artwork; no visual generation.
Run: python forest-sample/assets/enemies/build-atlas.py
"""
from PIL import Image, ImageDraw
from pathlib import Path
import json, hashlib, math
A=Path(__file__).resolve().parent
source=Image.open(A/'source.png').convert('RGBA'); W,H=source.size
names=['seed-idle','moth-idle','shroom-idle','boss-idle','seed-attack','moth-attack','shroom-attack','boss-attack']
cell=256; anchor=(128,232); crops=[]; source_rects=[]
for i,name in enumerate(names):
 row,col=divmod(i,4); r=(round(col*W/4),round(row*H/2),round((col+1)*W/4),round((row+1)*H/2))
 original=source.crop(r); alpha=original.getchannel('A')
 b=alpha.point(lambda x:255 if x>32 else 0).getbbox(); assert b is not None
 assert b[0]>8 and b[1]>8 and b[2]<original.width-8 and b[3]<original.height-8, (name,b)
 # Remove only the generator's nearly invisible outside-alpha noise. The
 # source itself already has a proper cutout; no chroma-key colour removal.
 original.putalpha(alpha.point(lambda x:0 if x<=12 else min(255,round((x-12)*255/236))))
 b=(max(0,b[0]-2),max(0,b[1]-2),min(original.width,b[2]+2),min(original.height,b[3]+2))
 crops.append(original.crop(b)); source_rects.append({'cellRect':[r[0],r[1],r[2]-r[0],r[3]-r[1]],'trimRect':list(b)})
scales=[]
for col in range(4):
 pair=[crops[col],crops[col+4]]
 scales.append(min(224/max(im.width for im in pair),212/max(im.height for im in pair)))
atlas=Image.new('RGBA',(cell*4,cell*2)); frames=[]
for i,(name,crop) in enumerate(zip(names,crops)):
 row,col=divmod(i,4); scale=scales[col]
 resized=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
 px=round(anchor[0]-resized.width/2); py=anchor[1]-resized.height
 atlas.alpha_composite(resized,(col*cell+px,row*cell+py))
 local=Image.new('RGBA',(cell,cell)); local.alpha_composite(resized,(px,py))
 b=local.getchannel('A').point(lambda x:255 if x>8 else 0).getbbox(); bounds={'x':b[0],'y':b[1],'w':b[2]-b[0],'h':b[3]-b[1]}
 frames.append({'name':name,'x':col*cell,'y':row*cell,'w':cell,'h':cell,
                'rect':{'x':col*cell,'y':row*cell,'w':cell,'h':cell},
                'anchor':{'x':anchor[0],'y':anchor[1]},'bounds':bounds,
                'facing':'down-left','pose':'idle' if row==0 else 'attack',
                'source':source_rects[i],'sourceScale':scale})
atlas.save(A/'atlas.png',optimize=True)
atlas.save(A/'atlas.webp','WEBP',lossless=True,method=6,exact=True)
# Verify the runtime texture is truly transparent and pixel-exact to PNG.
webp=Image.open(A/'atlas.webp').convert('RGBA'); assert webp.tobytes()==atlas.tobytes()
for i,f in enumerate(frames):
 crop=webp.crop((f['x'],f['y'],f['x']+cell,f['y']+cell));a=crop.getchannel('A');assert a.getbbox()
 # Every cell has an empty transparent guard border; no sprite crosses UVs.
 assert a.crop((0,0,cell,8)).getbbox() is None
 assert a.crop((0,cell-8,cell,cell)).getbbox() is None
 assert a.crop((0,0,8,cell)).getbbox() is None
 assert a.crop((cell-8,0,cell,cell)).getbbox() is None
species={}
for i,(key,height) in enumerate([('seed',50),('moth',50),('shroom',52),('boss',120)]):
 nominal=frames[i]['bounds']['h']
 species[key]={'idle':key+'-idle','attack':key+'-attack','nominalBodyHeightPixels':nominal,
               'recommendedVisibleHeightCSS':height,'recommendedCellDrawHeightCSS':round(cell*height/nominal,3),
               'groundAnchor':{'x':128,'y':232},'mirrorForRight':True,'flying':key=='moth',
               'animationScaleRule':'Use one constant cell draw scale for both poses; do not normalize each frame independently.'}
data={'version':1,'image':'atlas.webp','png':'atlas.png','width':1024,'height':512,'columns':4,'rows':2,
      'cellWidth':256,'cellHeight':256,'coordinates':'top-left source texture pixels; anchor and bounds are relative to its 256x256 cell',
      'alpha':True,'frames':frames,'species':species,
      'aliases':{key+'-walk':key+'-attack'for key in species},
      'source':'Original OpenAI ImageGen text-generated creature artwork, revised for safe margins and transparent cutouts. No third-party Ragnarok Online assets.',
      'technicalProcessing':'Per-species constant-scale cell packing, near-zero alpha noise cleanup, lossless WebP conversion. No floor/shadow painted into sprites.'}
(A/'atlas.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
# Diagnostic 1x CSS contact sheet. This is not a screenshot of the game.
preview=Image.new('RGB',(640,360),(58,79,69));draw=ImageDraw.Draw(preview)
for i,f in enumerate(frames):
 row,col=divmod(i,4);key=f['name'].split('-')[0];s=species[key]
 side=round(s['recommendedCellDrawHeightCSS']);sprite=atlas.crop((f['x'],f['y'],f['x']+cell,f['y']+cell)).resize((side,side),Image.Resampling.LANCZOS)
 x=80+col*160-round(anchor[0]/cell*side); y=152+row*170-round(anchor[1]/cell*side)
 preview.paste(sprite,(x,y),sprite)
 draw.text((col*160+15,row*170+154),f['name'],fill=(235,235,210))
preview.save(A/'preview-css.png')
report={'sourceDimensions':list(source.size),'runtimeDimensions':[1024,512],'frames':8,
        'transparentGuardPixels':8,'allCellsUnclipped':True,'losslessWebPMatchesPNG':True,
        'files':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
                 for p in[A/'source.png',A/'atlas.png',A/'atlas.webp',A/'atlas.json']}}
(A/'technical-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':report['files'],'species':species},ensure_ascii=False))
