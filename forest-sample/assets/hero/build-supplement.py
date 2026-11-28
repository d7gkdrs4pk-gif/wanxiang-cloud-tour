#!/usr/bin/env python3
"""Package supplemental keyposes; only crop/pad/encode, never redraw or rescale art."""
from pathlib import Path
from PIL import Image
import json
R=Path(__file__).resolve().parent
src=Image.open(R/'supplement-source.png').convert('RGBA')
assert src.size==(1774,887)
CELL=444
atlas=Image.new('RGBA',(1776,888))
regions=[]
for row in range(2):
 for col in range(4):
  box=(round(col*src.width/4),round(row*src.height/2),round((col+1)*src.width/4),round((row+1)*src.height/2))
  tile=src.crop(box);atlas.paste(tile,(col*CELL,row*CELL));regions.append(box)
# Each source crop is copied byte-for-byte; only 0/1 transparent padding columns
# or rows regularize the image generator's half-pixel mathematical grid.
for i,box in enumerate(regions):
 x,y=(i%4)*CELL,(i//4)*CELL;w,h=box[2]-box[0],box[3]-box[1]
 assert atlas.crop((x,y,x+w,y+h)).tobytes()==src.crop(box).tobytes()
atlas.save(R/'supplement.png')
atlas.save(R/'supplement.webp','WEBP',lossless=True,exact=True,method=6)
assert Image.open(R/'supplement.webp').convert('RGBA').tobytes()==atlas.tobytes()
anchors=[(238.5,431),(218,429),(210,427),(235,427),
         (235.5,419),(218,418),(215.5,416),(223.5,418)]
directions=['front','back','left','right'];frames=[]
for i in range(8):
 row,col=divmod(i,4);x,y=col*CELL,row*CELL;tile=atlas.crop((x,y,x+CELL,y+CELL));bounds=tile.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox();l,t,r,b=bounds
 action='walk-opposite' if row==0 else 'windup'
 frames.append({'index':i,'name':action+'-'+directions[col],'action':action,'direction':directions[col],
  'rect':[x,y,CELL,CELL],'anchor':list(anchors[i]),'sourceHeight':b-t,'alphaBounds':[l,t,r-l,b-t]})
reference=396
meta={'image':'supplement.webp','sourcePNG':'supplement.png','originalGenerationPNG':'supplement-source.png',
 'size':[1776,888],'columns':4,'rows':2,'cell':[CELL,CELL],
 'referenceHeight':reference,'recommendedBodyHeightCSS':62,'recommendedScale':62/reference,
 'scaling':'One scale=62/396 for all supplement frames; main atlas remains at62/314. Do not stretch individual poses.',
 'anchorUnits':'pixel coordinates inside source cell; boot-ground center','alphaBoundsThreshold':32,
 'frames':frames,'animations':{'walk-opposite':{d:[i]for i,d in enumerate(directions)},'windup':{d:[i+4]for i,d in enumerate(directions)}},
 'mainAtlasCompatibility':{'image':'atlas.webp','metadata':'atlas.json','referenceHeight':314,
  'walkPairs':{d:[{'sheet':'atlas','index':i+4},{'sheet':'supplement','index':i}]for i,d in enumerate(directions)}},
 'keyposesOnly':True,'sourceRecord':'supplement-source.json',
 'qualityNotes':['Same original male/outfit; no mirrored whole-character replacement.','Front/back show switched lead boot; profiles use a distinctly lifted trailing boot and changed leg spacing.','Windup keeps physical right hand/sword away from torso and prepares the existing attack keyposes.','Normal62px game animation timing remains a runtime review, not asserted from this asset contact sheet.']}
(R/'supplement.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
# Top: existing walking keyposes. Middle: alternate step. Bottom: windup.
old=Image.open(R/'atlas.png').convert('RGBA');oldmeta=json.loads((R/'atlas.json').read_text());preview=Image.new('RGBA',(480,330),(38,65,58,255))
for row in range(3):
 for col in range(4):
  sheet,frame,scale=(old,oldmeta['frames'][col+4],62/314) if row==0 else(atlas,frames[col+(4 if row==2 else 0)],62/reference)
  x,y,w,h=frame['rect'];tile=sheet.crop((x,y,x+w,y+h));small=tile.resize((round(w*scale),round(h*scale)),Image.Resampling.LANCZOS)
  preview.alpha_composite(small,(round(col*120+60-frame['anchor'][0]*scale),round(row*110+91-frame['anchor'][1]*scale)))
preview.convert('RGB').save(R/'supplement-preview-62px.png')
print(json.dumps({'runtimeAtlas':[1776,888],'cell':[444,444],'referenceHeight':reference,'frames':8,'webpBytes':(R/'supplement.webp').stat().st_size,'copiedPixelsExact':True,'losslessRGBAExact':True}))
