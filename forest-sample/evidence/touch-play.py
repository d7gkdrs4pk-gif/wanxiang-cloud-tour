from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time,math,os
OUT=Path(os.environ.get('FOREST_OUT','/workspace/qa-forest/touch'));OUT.mkdir(exist_ok=True);BASE=os.environ.get('FOREST_URL','http://127.0.0.1:3000/forest-sample/?v=f1')
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']+(['--disable-gpu','--disable-accelerated-2d-canvas']if os.environ.get('FOREST_CPU_CANVAS')else['--use-angle=swiftshader','--enable-unsafe-swiftshader']));c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,record_video_dir=str(OUT/'raw'),record_video_size={'width':390,'height':844});v0=time.monotonic();q=c.new_page();errors=[];failed=[];q.on('pageerror',lambda e:errors.append(str(e)));q.on('requestfailed',lambda r:failed.append([r.url,r.failure]));q.goto(BASE,wait_until='domcontentloaded',timeout=60000);q.wait_for_function('window.__FOREST?.snapshot().ready||window.__FOREST?.snapshot().telemetry.errors.length',timeout=60000);assert q.evaluate('__FOREST.snapshot().ready');q.screenshot(path=str(OUT/'first.png'));cdp=c.new_cdp_session(q);joy=q.locator('#joystick').bounding_box();origin=(joy['x']+joy['width']/2,joy['y']+joy['height']/2);active=False;actions=[];snapshots=[];menus=[];started=time.monotonic();clipStart=started-v0;lastTap=0
 def compact():return q.evaluate('()=>{const a=__FOREST,g=a.simulation;return{phase:g.phase,time:g.time,kills:g.kills,p:{...g.player},stats:{...g.stats},enemies:g.enemies.map(e=>({id:e.id,type:e.type,x:e.x,y:e.y,hp:e.hp,mode:e.mode,r:e.r})),drops:g.drops.map(e=>({type:e.type,x:e.x,y:e.y})),choices:g.levelChoices,chestOpened:g.chestOpened,bossSpawned:g.bossSpawned,occlusionFrames:a.snapshot().telemetry.occlusionFrames}}')
 def move(dx,dy):
  global active
  n=math.hypot(dx,dy)
  if n<.05:
   if active:cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});active=False
   return
  dx/=max(1,n);dy/=max(1,n);point={'x':origin[0]+dx*34,'y':origin[1]+dy*34,'id':1,'radiusX':5,'radiusY':5,'force':1};cdp.send('Input.dispatchTouchEvent',{'type':'touchMove'if active else'touchStart','touchPoints':[point]});active=True
 def tap(selector):
  move(0,0);q.locator(selector).tap();actions.append({'wall':time.monotonic()-started,'action':selector})
 def target_vector(s,wall):
  x,y=s['p']['x'],s['p']['y']
  # Deliberate opening path under the nearest pine's crown, around its root.
  if wall<4.0:tx,ty=(950,970)if wall<1.4 else(950,1080)if wall<2.5 else(850,1040);return(tx-x,ty-y)
  boss=next((e for e in s['enemies']if e['type']=='stag'),None)
  if boss:
   dx,dy=x-boss['x'],y-boss['y'];d=math.hypot(dx,dy)or 1
   if boss['mode']=='windup'and d<208:return(dx/d,dy/d)
   speed=max(-1,min(1,(d-120)/25));return(-dx/d*speed,-dy/d*speed)
  danger=[e for e in s['enemies']if math.hypot(x-e['x'],y-e['y'])<65]
  if danger:
   dx=sum((x-e['x'])/max(10,math.hypot(x-e['x'],y-e['y']))for e in danger);dy=sum((y-e['y'])/max(10,math.hypot(x-e['x'],y-e['y']))for e in danger);return(dx,dy)
  targets=sorted(s['drops'],key=lambda e:math.hypot(e['x']-x,e['y']-y)-(100 if e['type']=='chest'else 0))
  if targets:
   d=targets[0];dist=math.hypot(d['x']-x,d['y']-y)
   if dist>(23 if d['type']=='chest'else 55):return(d['x']-x,d['y']-y)
  # Avoid needlessly outrunning the arriving waves.
  return(0,0)
 while time.monotonic()-started<float(os.environ.get('FOREST_MAX_SECONDS','135')):
  s=compact();wall=time.monotonic()-started
  if not snapshots or wall-snapshots[-1]['wall']>1:snapshots.append({'wall':wall,**s});print(round(wall,1),round(s['time'],1),s['phase'],'hp',round(s['p']['hp']),s['kills'],'L',s['p']['level'],flush=True)
  if s['phase']in ['won','lost']:move(0,0);q.screenshot(path=str(OUT/(s['phase']+'.png')));break
  if s['phase']=='upgrade':
   move(0,0);q.wait_for_selector('#choice-panel:not([hidden])');q.screenshot(path=str(OUT/f'menu-{len(menus)}.png'));menus.append({'wall':wall,'time':s['time'],'choices':s['choices']});q.wait_for_timeout(700);choices=s['choices'];priority=['renew','vitality','guard','power','quick','flow']if s['p']['hp']<50 else['power','quick','renew','flow','vitality','guard'];choice=min(choices,key=lambda a:priority.index(a['id']));idx=choices.index(choice);q.locator('#choices .choice').nth(idx).tap();actions.append({'wall':wall,'action':'choose','id':choice['id']});continue
  dx,dy=target_vector(s,wall);n=math.hypot(dx,dy);move(dx/n if n>1 else dx,dy/n if n>1 else dy)
  nearby=sum(math.hypot(e['x']-s['p']['x'],e['y']-s['p']['y'])<180 for e in s['enemies']);boss=next((e for e in s['enemies']if e['type']=='stag'),None)
  if s['p']['pulseCooldown']<.1 and(nearby>=3 or(boss and nearby)or s['p']['hp']<65 and nearby):tap('#pulse');lastTap=wall
  if wall-lastTap>2 and nearby:tap('#attack');lastTap=wall
  q.wait_for_timeout(110)
 move(0,0);q.evaluate('__FOREST.pause()');q.screenshot(path=str(OUT/'end.png'));state=q.evaluate('__FOREST.snapshot()');frames=q.evaluate('__FOREST.frames()');video=q.video.path();c.close();b.close();valid=[(frames[i]['time']-frames[i-1]['time'])for i in range(1,len(frames))if frames[i]['phase']=='play'and frames[i-1]['phase']=='play'];fps=1000/(sum(valid)/len(valid))if valid else 0;report={'url':BASE,'environment':'Cloud Linux Chromium156 / '+('CPU Canvas2D'if os.environ.get('FOREST_CPU_CANVAS')else'SwiftShader')+', 390x844 DPR1 native CDP touchscreen emulation','physicalIPhone':False,'wechatDevice':False,'nativeTouch':True,'frameSize':[390,844],'measuredActiveFPS':fps,'medianFrameMs':sorted(valid)[len(valid)//2]if valid else None,'p95FrameMs':sorted(valid)[int(len(valid)*.95)]if valid else None,'state':state,'menus':menus,'actions':actions,'snapshots':snapshots,'frameTimes':frames,'video':{'rawPath':str(video),'gameplayStartOffset':clipStart,'noTimeScaleChanges':True},'errors':errors,'failedRequests':failed};(OUT/'test.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('END',state['phase'],state['time'],'FPS',fps,'errors',errors,'failed',failed,flush=True)
