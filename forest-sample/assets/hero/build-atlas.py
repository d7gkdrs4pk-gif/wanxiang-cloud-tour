#!/usr/bin/env python3
"""Technical packaging only: preserve generated pixels; map 4x3 cells/foot anchors."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'atlas.png'
im=Image.open(SOURCE).convert('RGBA')
COLS,ROWS=4,3
assert im.width%COLS==0 and im.height%ROWS==0
W,H=im.width//COLS,im.height//ROWS
assert (W,H)==(362,362), 'Anchors refer to the reviewed 1448x1086 generation'
DIRECTIONS=['front','back','left','right']
ACTIONS=['idle','walk','attack']
# Feet-center between the visible boot soles, excluding a low held blade.
# These are local cell pixels, NOT absolute atlas coordinates. The Y is the
# ground-contact baseline; no pose is resized or moved in the source atlas.
ANCHORS=[(214.5,342),(182.5,340),(174,342),(175,342),
         (214,340),(180,340),(172,341),(186,342),
         (216,336),(164,335),(188,326),(156.5,336)]
frames=[]
for row,action in enumerate(ACTIONS):
 for col,direction in enumerate(DIRECTIONS):
  index=row*COLS+col;x,y=col*W,row*H
  cell=im.crop((x,y,x+W,y+H));bounds=cell.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
  assert bounds and 0<=ANCHORS[index][0]<=W and 0<=ANCHORS[index][1]<=H
  left,top,right,bottom=bounds
  frames.append({'index':index,'name':action+'-'+direction,'action':action,'direction':direction,
   'rect':[x,y,W,H],'anchor':list(ANCHORS[index]),'sourceHeight':bottom-top,
   'alphaBounds':[left,top,right-left,bottom-top]})
REFERENCE=314
meta={'image':'atlas.webp','sourcePNG':'atlas.png','size':[im.width,im.height],
 'columns':COLS,'rows':ROWS,'cell':[W,H],'referenceHeight':REFERENCE,
 'recommendedBodyHeightCSS':62,'recommendedScale':62/REFERENCE,
 'scaling':'Use ONE scale=62/referenceHeight for all poses. sourceHeight is diagnostic; do not stretch each pose to equal height.',
 'anchorUnits':'pixel coordinates inside each source cell; draw origin is boot-ground center',
 'alphaBoundsThreshold':32,
 'directionConvention':{'front':'toward viewer / screen down','back':'away / screen up','left':'screen left','right':'screen right'},
 'frames':frames,
 'animations':{a:{d:[r*4+c] for c,d in enumerate(DIRECTIONS)} for r,a in enumerate(ACTIONS)},
 'suggestedWalkPairs':{d:[c,4+c] for c,d in enumerate(DIRECTIONS)},
 'keyposesOnly':True,
 'animationNotes':'Twelve authored direction/state keyposes. Walk may alternate idle/stride; attack is the contact silhouette, with timing/recovery handled by the game.',
 'authorship':'Original image_gen character artwork; no RO or downloaded game sprites.',
 'sourceRecord':'source.json'}
im.save(ROOT/'atlas.webp','WEBP',lossless=True,exact=True,method=6)
assert Image.open(ROOT/'atlas.webp').convert('RGBA').tobytes()==im.tobytes()
(ROOT/'atlas.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
# Diagnostic contact sheet, not a gameplay screenshot. All frames use one scale.
scale=62/REFERENCE;preview=Image.new('RGBA',(480,330),(38,65,58,255))
for frame in frames:
 x,y,w,h=frame['rect'];cell=im.crop((x,y,x+w,y+h));small=cell.resize((round(w*scale),round(h*scale)),Image.Resampling.LANCZOS)
 col=frame['index']%4;row=frame['index']//4;footx=col*120+60;footy=row*110+91
 preview.alpha_composite(small,(round(footx-frame['anchor'][0]*scale),round(footy-frame['anchor'][1]*scale)))
preview.convert('RGB').save(ROOT/'preview-62px.png')
print(json.dumps({'atlas':[im.width,im.height],'cell':[W,H],'referenceHeight':REFERENCE,'scale':scale,'webpBytes':(ROOT/'atlas.webp').stat().st_size,'frameCount':len(frames),'RGBAExact':True}))
