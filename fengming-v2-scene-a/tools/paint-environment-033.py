"""Original H33 matte stone painting. No image/reference assets are read.
The vector masks, broad colour fields and bevels are editable here. Runtime uses
lossless WebP; 2048x1024, two1024-square cells (paving / broad rock planes).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, json, hashlib

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/environment-033';OUT.mkdir(parents=True,exist_ok=True)
S=2;N=1024;W=2048;H=1024
xx=np.arange(W*S,dtype=np.float32)[None,:]/S
yy=np.arange(H*S,dtype=np.float32)[:,None]/S
canvas=np.zeros((H*S,W*S,3),np.float32)
# Open joints stay cool slate, never black. No per-pixel bright scan noise.
canvas[:]=[78,98,99]

def mask_polygon(points):
    m=Image.new('L',(W*S,H*S));ImageDraw.Draw(m).polygon([(round(x*S),round(y*S)) for x,y in points],fill=255)
    return np.asarray(m,dtype=np.float32)/255

def paint(points,color,field=0):
    global canvas
    m=mask_polygon(points)
    if np.isscalar(field):
        for c in range(3):canvas[:,:,c]=canvas[:,:,c]*(1-m)+(float(color[c])+field)*m
    else:
        for c in range(3):canvas[:,:,c]=canvas[:,:,c]*(1-m)+(float(color[c])+field)*m

# Eight substantial slabs per repeat; long axes cross the walking direction.
# Tiny corner cuts and offsets are designed, rather than arbitrary cracks.
COLORS=[[100,115,112],[103,117,113],[99,114,113],[102,116,113],
        [101,115,111],[98,113,112],[103,117,115],[100,114,111]]
row_edges=[0,248,515,764,1024]
row_offsets=[-13,241,19,270]
for row in range(4):
    offset=row_offsets[row]
    for col in range(-1,3):
        left=col*512+offset;top=row_edges[row];right=left+512;bottom=row_edges[row+1]
        idx=(row*2+col)%8;color=COLORS[idx]
        # Unequal hand-cut corners. Only a minority have a larger missing angle.
        cut=[4,5,4,7]
        if idx in [1,4,7]:cut[idx%4]=18
        tl,tr,br,bl=cut
        p=[(left+tl,top+4),(right-tr,top+5),(right-4,top+tr),
           (right-5,bottom-br),(right-br,bottom-5),(left+bl,bottom-4),
           (left+4,bottom-bl),(left+3,top+tl)]
        paint(p,[c-8 for c in color])
        face=[(left+tl+6,top+15),(right-tr-2,top+15),(right-7,top+tr+6),
              (right-8,bottom-br-9),(right-br-2,bottom-13),(left+bl+2,bottom-12),
              (left+14,bottom-bl-9),(left+14,top+tl+6)]
        broad=5.0*(1-(yy-top)/(bottom-top))+1.5*(1-(xx-left)/512)
        broad+=.85*np.sin((xx-left)/156+(yy-top)/114+idx*.4)
        paint(face,color,broad)
        # A single broad mineral wash on half the slabs. No small white flecks,
        # crack networks or identical contour ring around every stone.
        if idx in [0,3,5,6]:
            stripe=Image.new('L',(W*S,H*S));d=ImageDraw.Draw(stripe)
            points=[(left-12,top+(bottom-top)*(.48+idx*.012)),
                    (left+210,top+(bottom-top)*(.64-idx*.01)),
                    (right+15,top+(bottom-top)*.42)]
            d.line([(round(x*S),round(y*S)) for x,y in points],fill=210,width=48*S,joint='curve')
            stripe=stripe.filter(ImageFilter.GaussianBlur(11*S))
            m=np.asarray(stripe,dtype=np.float32)/255*mask_polygon(face)
            tint=[-7.,-4.,1.3] if idx%2 else [6.,3.8,-2.8]
            for c in range(3):canvas[:,:,c]+=m*tint[c]
        # A short, barely lighter upper edge; the broad lower lip supplies depth.
        hi=Image.new('L',(W*S,H*S));d=ImageDraw.Draw(hi)
        d.line([(round((left+tl+16)*S),round((top+10)*S)),(round((right-tr-12)*S),round((top+11)*S))],fill=255,width=10*S)
        d.line([(round((left+8)*S),round((top+tl+18)*S)),(round((left+9)*S),round((bottom-bl-22)*S))],fill=230,width=9*S)
        m=np.asarray(hi,dtype=np.float32)/255
        for c in range(3):canvas[:,:,c]+=m*7.0
# Rock cell: broad flowing strata, not hundreds of triangular scan marks.
# Only three low-contrast seams per repeat, with wide quiet blue-grey planes.
paving_cell=canvas[:,:N*S].copy()
canvas[:,N*S:]=[90,111,114]

def wave(base,amp,phase):
    xs=np.linspace(N-32,W+32,65)
    return [(float(x),float(base+amp*np.sin((x-N)*np.pi*2/N+phase)+amp*.22*np.sin((x-N)*np.pi*4/N+phase*.6))) for x in xs]
curves=[wave(-75,24,.2),wave(265,34,.5),wave(596,39,2.1),wave(1045,30,.2)]
rock_colors=[[114,130,123],[75,100,115],[103,121,118]]
for k in range(3):
    poly=curves[k]+list(reversed(curves[k+1]))
    plane=3.8*np.sin((xx-N)/310+k*.7)+2.5*np.cos(yy/355+k)
    paint(poly,rock_colors[k],plane)
    if k:
        line=Image.new('L',(W*S,H*S));d=ImageDraw.Draw(line)
        coords=[(round(x*S),round(y*S)) for x,y in curves[k]]
        d.line(coords,fill=190,width=15*S,joint='curve')
        line=line.filter(ImageFilter.GaussianBlur(5*S))
        m=np.asarray(line,dtype=np.float32)/255
        canvas=canvas-m[:,:,None]*7.0
# A few much larger soft facet fields establish mass without angular outlines.
# They are confined to the rock cell and use tiny value/saturation shifts.
for points,col in [
 ([(1024,25),(1410,5),(1570,200),(1330,323),(1024,245)],[117,129,119]),
 ([(1510,295),(1940,280),(2048,500),(1805,635),(1570,525)],[74,100,114]),
 ([(1040,630),(1410,595),(1560,845),(1360,1024),(1024,920)],[108,122,115])]:
    mimg=Image.fromarray(np.uint8(mask_polygon(points)*255),'L').filter(ImageFilter.GaussianBlur(20*S))
    m=np.asarray(mimg,dtype=np.float32)/255*.76
    for c in range(3):canvas[:,:,c]=canvas[:,:,c]*(1-m)+col[c]*m
canvas[:,:N*S]=paving_cell
image=Image.fromarray(np.uint8(np.clip(canvas,0,255)),'RGB').resize((W,H),Image.Resampling.LANCZOS)
# Guard the atlas split after antialiasing; no cross-cell contamination.
path=OUT/'matte-stone-atlas.webp';image.save(path,'WEBP',lossless=True,exact=True,method=6)
rgba=image.convert('RGBA').tobytes()
record={
 'version':'H.33 original matte miniature environment painting revision3',
 'asset':path.name,'pixels':[W,H],'cells':{'left':'staggered broad paving slabs, designed bevel and thin cool-slate joints','right':'quiet blue-grey rock with three broad flowing strata'},
 'source':'Original vector masks and colour-field painting authored in tools/paint-environment-033.py; no external image input',
 'palette':{'paving':'warm grey-green midtones, 8 slabs/repeat','rock':'3–5 warm/cool grey broad planes with gentle strata','shadow':'cool slate'},
 'features':['low local contrast and no white flecks','large matte slab faces, unequal joints and sparse hand-cut corners','one broad low-contrast mineral wash on only half the slabs','subtle upper-left bevel under the existing SUN(-8,16,12)','no baked scene image or original-UV bake'],
 'runtime':'lossless WebP, decoded RGBA equals generated RGB painting',
 'rgba_sha256':hashlib.sha256(rgba).hexdigest(),'bytes':path.stat().st_size,
 'geometry_navigation_camera_changed':False
}
field_meta=OUT/'terrain-rock-normals.json'
if field_meta.exists():record['renderNormalField']=json.loads(field_meta.read_text())
record['shading']='Original SUN(-8,16,12); prefiltered slope normals only for rock mass, flat paving normals; cool-slate contact shadows; no added fog'
(OUT/'vector-source-provenance.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(record,ensure_ascii=False,indent=2))
