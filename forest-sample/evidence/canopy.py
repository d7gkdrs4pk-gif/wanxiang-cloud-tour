from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time,math
out=Path('/workspace/wanxiang-cloud-tour/forest-sample/evidence')
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu','--disable-accelerated-2d-canvas']);c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True);q=c.new_page();q.goto('https://wanxiang-cloud-tour.pages.dev/forest-sample/?v=f1',wait_until='domcontentloaded');q.wait_for_function('__FOREST.snapshot().ready',timeout=60000);cdp=c.new_cdp_session(q);r=q.locator('#joystick').bounding_box();ox,oy=r['x']+r['width']/2,r['y']+r['height']/2
 def go(axis,goal,dx,dy):
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':ox+dx*34,'y':oy+dy*34,'id':1}]});limit=time.monotonic()+3
  while q.evaluate('(a)=>__FOREST.simulation.player[a]',axis)<goal and time.monotonic()<limit:q.wait_for_timeout(30)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});q.wait_for_timeout(400)
 go('x',955,1,0);inside=q.evaluate('({p:{...__FOREST.simulation.player},tree:{...__FOREST.props.find(p=>p.type==="pine"&&p.x===1055)}})');assert inside['tree']['fade']<.5;q.screenshot(path=str(out/'under-canopy.png'));go('y',1095,0,1);outside=q.evaluate('({p:{...__FOREST.simulation.player},tree:{...__FOREST.props.find(p=>p.type==="pine"&&p.x===1055)}})');assert outside['tree']['fade']>.95;q.screenshot(path=str(out/'clear-canopy.png'));report={'url':q.url,'environment':'Cloud Chromium CPU Canvas2D native touchscreen,390x844 DPR1','input':'native CDP touch joystick, no position/stat edits','inside':inside,'outside':outside,'partialCanopyFade':True,'fullOpacityRestored':True};(out/'canopy-test.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('CANOPY PASS',inside['tree']['fade'],outside['tree']['fade']);b.close()
