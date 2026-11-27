from pathlib import Path
from playwright.sync_api import sync_playwright
import json,math,os
out=Path(os.environ.get('FM_QA_OUT','/tmp/fengming-boundary-h34'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright()as pw:
 b=pw.webkit.launch(headless=True);c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True);p=c.new_page();errors=[];failed=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('requestfailed',lambda r:failed.append([r.url,r.failure]));p.goto(os.environ.get('FM_TEST_URL','http://127.0.0.1:3000/').rstrip('/')+'/gate-h34.html',wait_until='networkidle');p.wait_for_function('window.__SAMPLE?.snapshot().ready');p.wait_for_selector('#loading',state='hidden')
 def tapworld(x,z):
  p.wait_for_function('()=>{const q=__SAMPLE.snapshot();return Math.hypot(q.camera[0]-q.position[0]-6,q.camera[2]-q.position[2]-15)<.16}',timeout=10000)
  pt=p.evaluate('([x,z])=>__SAMPLE.project(x,__SAMPLE.getGround(x,z)??0,z)',[x,z]);p.touchscreen.tap(*pt);p.wait_for_timeout(150);p.wait_for_function('()=>{const q=__SAMPLE.snapshot();return q.pathNodes.length<2&&Math.hypot(q.position[0]-q.target[0],q.position[2]-q.target[2])<.1}',timeout=15000);return p.evaluate('__SAMPLE.snapshot()')
 approach=tapworld(0,-3.05);assert math.hypot(approach['position'][0],approach['position'][2]+3.05)<.35,approach['position']
 probe=tapworld(0,-4.2);assert probe['position'][2]>=-3.65,probe['position'];assert not errors and not failed,(errors,failed)
 p.screenshot(path=str(out/'boundary-probe.png'));report={'scope':'native touchscreen input on final build; original blocked rectangle unchanged; no teleport/camera override','desiredBlockedWorld':[0,-4.2],'approach':approach,'probe':probe,'errors':errors,'failedRequests':failed};(out/'boundary-probe.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('BOUNDARY PASS',probe['position'],probe['target'],flush=True);c.close();b.close()
