from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time
out=Path('/workspace/qa-cinderwatch');errors=[];failed=[]
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']);c=b.new_context(viewport={'width':1920,'height':1080},device_scale_factor=1);q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.on('requestfailed',lambda r:failed.append([r.url,r.failure]));t=time.monotonic();q.goto('http://127.0.0.1:3000/cinderwatch-reference/#still=1',wait_until='domcontentloaded',timeout=60000)
 try:q.wait_for_function('window.__REFERENCE?.state.status==="ready"||window.__REFERENCE?.state.status==="failed"',timeout=120000)
 except Exception:
  q.screenshot(path=str(out/'startup-timeout.png'));print('TIMEOUT',q.evaluate('window.__REFERENCE?.state'),errors,flush=True);raise
 s=q.evaluate('__REFERENCE.snapshot()');q.screenshot(path=str(out/'replica-f5131-1920.png'));(out/'first-render.json').write_text(json.dumps({'seconds':time.monotonic()-t,'snapshot':s,'errors':errors,'failed':failed},ensure_ascii=False,indent=2)+'\n');print('FIRST',json.dumps({'seconds':time.monotonic()-t,'snapshot':s,'errors':errors,'failed':failed},ensure_ascii=False),flush=True);b.close()
