"""Native H36 startup/failure recovery checks, no actor/camera overrides."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,time
OUT=Path(os.environ.get('FM_QA_OUT','/workspace/qa-h36/compatibility'));OUT.mkdir(parents=True,exist_ok=True);BASE=os.environ.get('FM_TEST_URL','http://127.0.0.1:3000').rstrip('/');results=[]
with sync_playwright()as pw:
 browser=pw.webkit.launch(headless=True)
 def page():
  c=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True);return c,c.new_page()
 def ready(p):p.wait_for_function('window.__SAMPLE?.snapshot().ready',timeout=45000);p.wait_for_selector('#loading',state='hidden')
 def failed(p):p.wait_for_function('window.__FM_STARTUP?.state.status==="failed"',timeout=20000);assert p.locator('#loading').is_visible();assert p.locator('#load-retry').is_visible()
 for name,pattern in [('world','**/assets/scene-036/runtime/world-h36.glb'),('live-wood','**/assets/pine-036/pine-036-wood-mobile.glb'),('mountain','**/assets/sample-runtime/mountain-atlas.webp')]:
  c,p=page();p.route(pattern,lambda r:r.fulfill(status=503,body='controlled test'));p.goto(BASE+'/gate-h36.html',wait_until='domcontentloaded');failed(p);results.append({'case':name+' failure','passed':True,'status':p.evaluate('__FM_STARTUP.state.status'),'message':p.locator('#loading-note').inner_text()});c.close()
 c,p=page();pat='**/sample/dist/game-h36.js*';p.route(pat,lambda r:r.fulfill(status=503,body='controlled test'));p.goto(BASE+'/gate-h36.html');failed(p);p.unroute(pat);p.locator('#load-retry').tap();ready(p);results.append({'case':'bundle failure then real retry','passed':True});c.close()
 c,p=page();p.add_init_script('window.WebGL2RenderingContext=undefined');p.goto(BASE+'/gate-h36.html');failed(p);results.append({'case':'no WebGL2 actionable failure','passed':True,'message':p.locator('#loading-note').inner_text()});c.close()
 c,p=page();p.goto(BASE+'/gate-h36.html');ready(p);lost=p.evaluate('''()=>{const gl=document.querySelector('canvas').getContext('webgl2'),e=gl.getExtension('WEBGL_lose_context');if(!e)return false;e.loseContext();return true}''');assert lost,'WPE did not expose actual WEBGL_lose_context';failed(p);p.locator('#load-retry').tap();ready(p);results.append({'case':'actual context loss and retry','passed':True});c.close();browser.close()
report={'version':'H36','environment':'cloud Linux WebKit26.5/WPE 390x844 DPR1 software; controlled failures, not claims about the user iPhone root cause','physical_iPhone':False,'wechat_device_test':False,'cases':results};(OUT/'compatibility.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
