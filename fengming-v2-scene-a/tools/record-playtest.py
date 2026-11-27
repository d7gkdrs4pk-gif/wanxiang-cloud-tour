from playwright.sync_api import sync_playwright
from pathlib import Path
import time,json,math,subprocess,hashlib,os
out=Path(os.environ.get('FM_QA_OUT','/tmp/fengming-playtest-h34'));out.mkdir(parents=True,exist_ok=True);rows=[];errors=[]
config=json.loads((out/'record-path.json').read_text()) if (out/'record-path.json').exists() else {'under':[-6.4,-8.1],'exit':[-6.0,-6.5]}
with sync_playwright()as p:
 b=p.webkit.launch(headless=True)
 ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,record_video_dir=str(out/'video'),record_video_size={'width':390,'height':844})
 videoEpoch=time.time()*1000;page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 failed=[];page.on('requestfailed',lambda q:failed.append([q.url,q.failure]))
 page.goto(os.environ.get('FM_TEST_URL','http://127.0.0.1:3000/').rstrip('/')+'/gate-h34.html',wait_until='networkidle',timeout=60000);page.wait_for_function('window.__SAMPLE?.snapshot().ready',timeout=45000);page.wait_for_selector('#loading',state='hidden')
 device=page.evaluate('''()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return {UA:navigator.userAgent,renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),viewport:[innerWidth,innerHeight],canvas:[c.width,c.height]}}''')
 page.screenshot(path=str(out/'sample-before.png'));device.update({'host':'cloud Linux x86_64','engine':'Playwright WebKit26.5 WPE','softwareRenderingForced':True,'reportedRendererIsNotPhysicalDevice':True});start=time.time()*1000;print('START',device,flush=True);page.wait_for_timeout(1800)
 pts=[(-5.1,-4.4,'near-pine'),(-6.0,-6.5,'pine-front'),(-6.0,-7.4,'branch-entry'),(*config['under'],'under-branch'),(-6.0,-7.4,'branch-return'),(-6.0,-6.5,'exit-branch'),(-3.1,-3.05,'front-west'),(0,-3.05,'front-center'),(3.1,-3.05,'front-east'),(3.1,-6.6,'side'),(2.5,-7,'step-base'),(1.58,-7,'step-top')]
 for x,z,name in pts:
  if name in ['branch-entry','under-branch','step-top']:
   page.wait_for_function('''()=>{const q=__SAMPLE.snapshot();return Math.hypot(q.camera[0]-q.position[0]-6,q.camera[2]-q.position[2]-15)<.16}''',timeout=12000)
  y=page.evaluate('([x,z])=>__SAMPLE.getGround(x,z)??.12',[x,z]);pt=page.evaluate('q=>__SAMPLE.project(...q)',[x,y,z])
  if not(0<pt[0]<390 and 0<pt[1]<844):raise Exception('outside phone '+name+str(pt))
  page.touchscreen.tap(*pt)
  page.wait_for_function('''([x,z])=>{const q=__SAMPLE.snapshot();return Math.hypot(q.position[0]-x,q.position[2]-z)<.32||Math.hypot(q.position[0]-q.target[0],q.position[2]-q.target[2])<.1}''',arg=[x,z],timeout=20000)
  if name=='under-branch':
   try:page.wait_for_function('''()=>{const q=__SAMPLE.snapshot();return Math.hypot(q.position[0]-q.target[0],q.position[2]-q.target[2])<.11}''',timeout=7000)
   except Exception:
    bad=page.evaluate('__SAMPLE.snapshot()');print('BLOCKED',json.dumps(bad,ensure_ascii=False),flush=True);out.joinpath('blocked.json').write_text(json.dumps(bad,ensure_ascii=False,indent=2));page.screenshot(path=str(out/'blocked.png'));raise
  if name=='step-top':
   try:page.wait_for_function('__SAMPLE.snapshot().position[1]>.65',timeout=3000)
   except Exception:
    out.joinpath('blocked.json').write_text(json.dumps(page.evaluate('__SAMPLE.snapshot()'),indent=2));page.screenshot(path=str(out/'blocked.png'));raise
  if name=='under-branch':page.wait_for_timeout(1500)
  s=page.evaluate('__SAMPLE.snapshot()');d=math.hypot(s['position'][0]-x,s['position'][2]-z)
  tries=0
  while d>.35 and tries<5:
   tries+=1
   page.wait_for_function("()=>{const q=__SAMPLE.snapshot();return Math.hypot(q.camera[0]-q.position[0]-6,q.camera[2]-q.position[2]-15)<.16}",timeout=7000)
   pt=page.evaluate('q=>__SAMPLE.project(...q)',[x,y,z]);page.touchscreen.tap(*pt)
   page.wait_for_function("()=>{const q=__SAMPLE.snapshot();return Math.hypot(q.position[0]-q.target[0],q.position[2]-q.target[2])<.11}",timeout=12000)
   s=page.evaluate('__SAMPLE.snapshot()');d=math.hypot(s['position'][0]-x,s['position'][2]-z)
  assert d<=.35,(name,d,s)
  if name in ['near-pine','under-branch','step-top']:page.screenshot(path=str(out/(name+'.png')))
  rows.append({'name':name,'desired':[x,z],'distance':d,'state':s,'epoch':time.time()*1000});print('STEP',name,[round(v,3)for v in s['position']],round(d,3),flush=True)
 assert rows[-1]['state']['position'][1]>.65,'real stairs not climbed'
 page.wait_for_timeout(400)
 rect=page.locator('#strike').bounding_box();page.touchscreen.tap(rect['x']+rect['width']/2,rect['y']+rect['height']/2)
 page.wait_for_function('__SAMPLE.events().some(e=>e.type===\'swing-recovered\')',timeout=12000);page.wait_for_timeout(2200)
 end=time.time()*1000;state=page.evaluate('__SAMPLE.snapshot()');frames=page.evaluate('__SAMPLE.frames()');events=page.evaluate('__SAMPLE.events()');assert state['enemy']['hp']==2,(state['enemy'],events);assert not errors,errors
 page.screenshot(path=str(out/'sample-after-hit.png'));page.video.save_as if False else None
 video=page.video;ctx.close();video.save_as(str(out/'sample-full.webm'));b.close()
selected=[f for f in frames if start<=f['time']<=end];span=selected[-1]['time']-selected[0]['time'];interval=sorted(selected[i]['time']-selected[i-1]['time']for i in range(1,len(selected)));fps=(len(selected)-1)*1000/span
report={'version':'H34','scope':'real original-pointer touchscreen input; normal FOV39/camera offset6,27,15; no position/camera overrides','physical_iPhone':False,'wechat_device_test':False,'device':device,'videoEpoch':videoEpoch,'start':start,'end':end,'steps':rows,'final':state,'events':events,'errors':errors,'requestfailed':failed,'frameStats':{'frames':len(selected),'seconds':span/1000,'FPS':fps,'medianFrameMs':interval[len(interval)//2],'p95FrameMs':interval[int(len(interval)*.95)]},'frames':frames}
(out/'sample-playtest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('RESULT',json.dumps({k:v for k,v in report.items()if k in ['frameStats','errors','final']},ensure_ascii=False),flush=True)
cut=max(0,(start-videoEpoch)/1000-.2);duration=(end-start)/1000+.4
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-ss',str(cut),'-i',str(out/'sample-full.webm'),'-t',str(duration),'-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart','-y',str(out/'sample-walk-sword.mp4')],check=True)
meta={'source':'sample-full.webm','sourceSHA256':hashlib.sha256((out/'sample-full.webm').read_bytes()).hexdigest(),'clipStart':cut,'requestedDuration':duration,'speed':1,'interpolation':False,'gameFPS':fps,'encodingFPS':25,'device':device,'physical_iPhone':False,'wechat_device_test':False};(out/'sample-video.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2));print('VIDEO',meta,flush=True)
