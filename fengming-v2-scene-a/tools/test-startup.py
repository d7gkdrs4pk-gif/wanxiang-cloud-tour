from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time,re,os
out=Path(os.environ.get('FM_QA_OUT','/tmp/fengming-startup-qa'));out.mkdir(parents=True,exist_ok=True);results=[]
base=os.environ.get('FM_TEST_URL','http://127.0.0.1:3000/').rstrip('/')+'/'
def context(b,js=True):return b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,java_script_enabled=js)
def ready(p):p.wait_for_function('window.__SAMPLE?.snapshot().ready',timeout=45000);p.wait_for_selector('#loading',state='hidden')
def state(p):return p.evaluate('window.__FM_STARTUP?.state')
with sync_playwright()as pw:
 b=pw.webkit.launch(headless=True)
 # Reproduce the unsupported/ignored-importmap failure path in the old entry.
 c=context(b);p=c.new_page();err=[];p.on('pageerror',lambda e:err.append(str(e)))
 def ignore_importmap(route):
  response=route.fetch();s=response.text();s=re.sub(r'<script type="importmap">[\s\S]*?</script>','',s);route.fulfill(response=response,body=s)
 p.route('**/h31-compare.html*',ignore_importmap);p.goto(base+'h31-compare.html',wait_until='networkidle');p.wait_for_timeout(700)
 q={'case':'H31 ignored importmap (controlled compatibility fault)','faultInjection':True,'loading':p.locator('#loading-note').inner_text(),'ready':p.evaluate('!!window.__SAMPLE?.snapshot().ready'),'errors':err};assert not q['ready'] and q['loading']=='正入山境';results.append(q);c.close()
 # Native WebKit startup, actual touch walking and native keyboard click fallback.
 c=context(b);p=c.new_page();err=[];p.on('pageerror',lambda e:err.append(str(e)));start=time.monotonic();p.goto(base+'sample-gate.html?v=h32',wait_until='networkidle');ready(p)
 q={'case':'H32 WebKit cold startup + touch','readySeconds':time.monotonic()-start,'startup':state(p),'moduleScripts':p.locator('script[type=module],script[type=importmap]').count()};assert q['moduleScripts']==0
 point=p.evaluate('__SAMPLE.project(-5.1,__SAMPLE.getGround(-5.1,-4.4),-4.4)');p.touchscreen.tap(*point);p.wait_for_function('__SAMPLE.snapshot().position[0]<-4.8',timeout=15000)
 p.locator('#strike').focus();p.keyboard.press('Enter');p.wait_for_function('__SAMPLE.events().some(e=>e.type==="swing-recovered")',timeout=10000)
 assert len(p.evaluate('__SAMPLE.events().filter(e=>e.type==="swing-start")'))==1
 p.touchscreen.tap(200,160);p.wait_for_function('__SAMPLE.events().some(e=>e.type==="move-command"&&!e.ok)',timeout=4000)
 q.update(after=p.evaluate('__SAMPLE.snapshot()'),errors=err);assert not err;results.append(q);p.screenshot(path=str(out/'webkit-playable.png'))
 lost=p.evaluate('''()=>{let gl=document.querySelector('canvas').getContext('webgl2'),e=gl.getExtension('WEBGL_lose_context');if(e){e.loseContext();return true;}document.querySelector('canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true}));return false}''');p.wait_for_function('__FM_STARTUP.state.status==="failed"');assert p.locator('#load-retry').is_visible();results.append({'case':'context lost recovery UI','actualDriverLoss':lost,'startup':state(p)});c.close()
 # Script download failure must be visible and a real Retry must load the game.
 c=context(b);p=c.new_page();p.route('**/dist/game-h32.js*',lambda r:r.abort());p.goto(base+'sample-gate.html?v=h32',wait_until='domcontentloaded');p.wait_for_function('__FM_STARTUP.state.status==="failed"');failed=state(p);assert p.locator('#load-retry').is_visible() and p.locator('#load-copy').is_visible();p.screenshot(path=str(out/'script-failed-recovery.png'));p.unroute('**/dist/game-h32.js*');p.locator('#load-retry').click();ready(p);results.append({'case':'bundle blocked then actual Retry','failed':failed,'recovered':state(p)});c.close()
 # Renderer construction failure occurs before the old boot try/catch.
 c=context(b);p=c.new_page();p.add_init_script('''(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){if(t==='webgl2')return null;return get.call(this,t,...a)}})()''');p.goto(base+'sample-gate.html?v=h32',wait_until='domcontentloaded');p.wait_for_function('__FM_STARTUP.state.status==="failed"');assert p.locator('#load-retry').is_visible();results.append({'case':'WebGL constructor blocked','faultInjection':True,'startup':state(p),'message':p.locator('#loading-note').inner_text()});c.close()
 # Missing scene art must reject to actionable recovery, never an endless logo.
 c=context(b);p=c.new_page();p.route('**/sample-runtime/pine-atlas.webp',lambda r:r.abort());p.goto(base+'sample-gate.html?v=h32',wait_until='domcontentloaded');p.wait_for_function('__FM_STARTUP.state.status==="failed"',timeout=45000);assert p.locator('#load-retry').is_visible();results.append({'case':'pine resource blocked','faultInjection':True,'startup':state(p),'message':p.locator('#loading-note').inner_text()});c.close()
 # No-JavaScript hosts get a static explanation rather than just the load label.
 c=context(b,False);p=c.new_page();p.goto(base+'sample-gate.html?v=h32');q={'case':'JavaScript disabled host','faultInjection':True,'noscript':p.locator('noscript').inner_text()};assert '未启用互动内容'in q['noscript'];results.append(q);c.close()
 # Clock-controlled stall checks the 20s assistance UI without a real blocking wait.
 c=context(b);p=c.new_page();p.clock.install();pending=[];p.route('**/dist/game-h32.js*',lambda r:pending.append(r));p.goto(base+'sample-gate.html?v=h32',wait_until='domcontentloaded');p.clock.fast_forward(22000);assert p.locator('#load-retry').is_visible();results.append({'case':'slow bundle assistance','faultInjection':True,'message':p.locator('#loading-note').inner_text(),'retryVisible':True});[r.abort()for r in pending];c.close()
 # Inline launcher survives a blocked optional external launcher file.
 c=context(b);p=c.new_page();p.route('**/sample/launch.js*',lambda r:r.abort());p.goto(base+'gate-h32.html',wait_until='domcontentloaded');ready(p);results.append({'case':'external launcher blocked; inline launcher succeeds','faultInjection':True,'startup':state(p)});c.close()
 # Hosts disallowing inline scripts still use the same-origin classic fallback.
 c=context(b);p=c.new_page()
 def forbid_inline(route):
  response=route.fetch();headers=dict(response.headers);headers['content-security-policy']="script-src 'self'";route.fulfill(response=response,headers=headers)
 p.route('**/gate-h32.html*',forbid_inline);p.goto(base+'gate-h32.html',wait_until='domcontentloaded');p.locator('html[data-sample-ready=true]').wait_for(state='attached',timeout=45000);p.locator('#loading').wait_for(state='hidden');point=next(e['screen']for e in results[1]['after']['events']if e['type']=='move-command'and e['ok']);p.touchscreen.tap(*point);p.locator('#objective').filter(has_text='从横枝').wait_for(state='visible',timeout=15000);p.locator('#strike').tap();p.locator('#strike.active').wait_for(state='attached');p.locator('#strike.active').wait_for(state='detached',timeout=5000);results.append({'case':'inline scripts blocked by CSP; external launcher succeeds','faultInjection':True,'readyViaDOM':True,'touchWalkHintReached':True,'normalSwingCompleted':True,'note':'DOM signals used; the test harness itself also obeys unsafe-eval restriction'});c.close()
 c=context(b);p=c.new_page();p.route('**/sample-ground/height.f32',lambda r:r.abort());p.goto(base+'gate-h32.html',wait_until='domcontentloaded');p.wait_for_function('__FM_STARTUP.state.status==="failed"',timeout=45000);assert p.locator('#load-retry').is_visible();results.append({'case':'ground cache unavailable recovery UI','faultInjection':True,'startup':state(p)});c.close()
 b.close()
(out/'compatibility.json').write_text(json.dumps({'environment':'Linux WebKit26.5 WPE, software rendering; not a physical iPhone or ChatGPT native app','passed':True,'cases':results},ensure_ascii=False,indent=2));print('COMPATIBILITY PASS',len(results),'cases',flush=True)
