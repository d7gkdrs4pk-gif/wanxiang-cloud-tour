from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
import json, math, time
out=Path('/workspace/qa-h32/comparison')
rows=[]
with sync_playwright() as pw:
    browser=pw.webkit.launch(headless=True)
    try:
        for name,entry in [('h31','h31-compare.html'),('h32','gate-h32.html')]:
            context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
            page=context.new_page(); errors=[]; failed=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('requestfailed',lambda request:failed.append({'url':request.url,'failure':request.failure}))
            t=time.monotonic()
            url='http://127.0.0.1:3000/'+entry
            page.goto(url,wait_until='networkidle',timeout=60000)
            page.wait_for_function('window.__SAMPLE?.snapshot().ready',timeout=45000)
            page.wait_for_selector('#loading',state='hidden',timeout=10000)
            page.wait_for_timeout(500)
            before=page.evaluate('__SAMPLE.snapshot()')
            # Only read the existing normal camera/projection API. No movement,
            # camera replacement, screenshots routes or runtime source injection.
            projection=page.evaluate('''()=>{const s=__SAMPLE.snapshot(),p=s.position,h=s.heroHeight;const base=__SAMPLE.project(...p),top=__SAMPLE.project(p[0],p[1]+h,p[2]);return {base,top,referenceHeightPixels:Math.hypot(top[0]-base[0],top[1]-base[1])}}''')
            device=page.evaluate('''()=>{const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio,canvas:[canvas.width,canvas.height],renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),debugPanelHidden:document.getElementById('debug').hidden,loadingHidden:!document.getElementById('loading')||getComputedStyle(document.getElementById('loading')).display==='none'||document.getElementById('loading').hidden}}''')
            page.screenshot(path=str(out/('normal-'+name+'.png')),full_page=False)
            after=page.evaluate('__SAMPLE.snapshot()')
            row={'version':name.upper(),'url':url,'elapsedReadyAndCaptureSeconds':time.monotonic()-t,'snapshotBeforeCapture':before,'snapshotAfterCapture':after,'projection':projection,'device':device,'errors':errors,'failedRequests':failed,'capture':'native viewport screenshot; no teleport; no camera/scale/runtime changes'}
            rows.append(row)
            assert not errors and not failed,(name,errors,failed)
            assert before['ready'] and device['loadingHidden'] and device['debugPanelHidden']
            assert before['position'][0]==-3.2 and before['position'][2]==-4.2 and before['rotation']==-.6
            print('CAPTURE',name,json.dumps({'position':before['position'],'camera':before['camera'],'FOV':before['FOV'],'heroHeight':before['heroHeight'],'projection':projection,'triangles':before['stats']['triangles']}),flush=True)
            context.close()
    finally:
        browser.close()
a,b=[r['snapshotBeforeCapture'] for r in rows]
comparison={'environment':'Cloud Linux WebKit26.5 WPE, 390x844 DPR1, software renderer; not physical iPhone or WeChat device','physicalIPhone':False,'wechatDeviceTest':False,'readOnlyCapture':True,'versions':rows,'comparison':{'sameXZ':a['position'][::2]==b['position'][::2],'sameHeading':a['rotation']==b['rotation'],'sameFOV':a['FOV']==b['FOV'],'sameHeroReferenceHeight':a['heroHeight']==b['heroHeight'],'sameNormalCameraOffset':all(abs((s['camera'][i]-s['position'][i])-v)<1e-9 for s in [a,b] for i,v in enumerate([6,27,15])),'groundYDeltaH32MinusH31':b['position'][1]-a['position'][1],'cameraPositionDeltaH32MinusH31':[b['camera'][i]-a['camera'][i] for i in range(3)],'cameraMatricesIdenticalClaimed':False,'note':'H32 terrain height-cache correction changes birth ground Y and follow-camera Y by approximately 0.01272. XZ, heading, FOV39, camera offset6/27/15 and hero reference height1.485 remain equal; world camera matrices are not numerically identical.'}}
assert all(comparison['comparison'][k]for k in ['sameXZ','sameHeading','sameFOV','sameHeroReferenceHeight','sameNormalCameraOffset'])
(out/'camera-comparison.json').write_text(json.dumps(comparison,ensure_ascii=False,indent=2))
# Native pixels retained; labels sit outside the two intact 390x844 screenshots.
images=[Image.open(out/('normal-'+k+'.png')).convert('RGB')for k in ['h31','h32']]
canvas=Image.new('RGB',(804,890),(22,31,36));draw=ImageDraw.Draw(canvas)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
draw.text((8,7),'H.31 - normal game camera',fill=(238,226,204),font=font)
draw.text((406,7),'H.32 - normal game camera',fill=(238,226,204),font=font)
canvas.paste(images[0],(8,32));canvas.paste(images[1],(406,32))
draw.text((8,878),'390 x 844 each / same XZ, heading, FOV and hero size / ground-follow Y differs 0.01272',fill=(199,208,210),font=small)
canvas.save(out/'normal-h31-h32-contact.png')
print('DONE browser closed; comparison',json.dumps(comparison['comparison']),flush=True)
