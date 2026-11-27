from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
import json,time,base64,os
out=Path(os.environ.get('FM_QA_OUT','/tmp/fengming-no-fx-h36'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('FM_TEST_URL','http://127.0.0.1:3000/').rstrip('/')+'/'
with sync_playwright()as pw:
 b=pw.webkit.launch(headless=True);c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,record_video_dir=str(out/'video'),record_video_size={'width':390,'height':844});p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(base+'gate-h36.html?fx=0',wait_until='networkidle');p.wait_for_function('window.__SAMPLE?.snapshot().ready');p.wait_for_selector('#loading',state='hidden')
 # Navigate only through native touchscreen taps and the original ground picker.
 for x,z in [(-3.1,-3.05),(0,-3.05),(3.1,-3.05),(3.1,-6.6),(2.5,-7),(1.58,-7)]:
  p.wait_for_function('()=>{const s=__SAMPLE.snapshot();return Math.hypot(s.camera[0]-s.position[0]-6,s.camera[2]-s.position[2]-15)<.15}')
  y=p.evaluate('([x,z])=>__SAMPLE.getGround(x,z)',[x,z]);point=p.evaluate('q=>__SAMPLE.project(...q)',[x,y,z]);p.touchscreen.tap(*point)
  p.wait_for_function('([x,z])=>{const s=__SAMPLE.snapshot();return Math.hypot(s.position[0]-x,s.position[2]-z)<.22||Math.hypot(s.position[0]-s.target[0],s.position[2]-s.target[2])<.09}',arg=[x,z],timeout=20000)
 p.wait_for_function('__SAMPLE.snapshot().position[1]>.65');p.wait_for_timeout(500)
 p.evaluate('''()=>{window.__BURST=[];const phases=[['windup',q=>q.attack>=.14],['sweep',q=>q.attack>=.31],['contact',q=>q.enemy.hp<3],['follow',q=>q.attack>=.60],['recover',q=>q.attack>=.78],['rest',q=>q.attack===null]];let started=false;function tick(){const q=__SAMPLE.snapshot();if(q.attack!==null)started=true;if(started&&phases.length){const [label,match]=phases[0];if(match(q)){__BURST.push({label,snapshot:q,epoch:Date.now(),image:document.querySelector('canvas').toDataURL('image/png')});phases.shift();}}if(phases.length)requestAnimationFrame(tick);}requestAnimationFrame(tick);}''')
 p.locator('#strike').tap();p.wait_for_function('__BURST.length===6',timeout=10000);p.wait_for_timeout(400);bursts=p.evaluate('__BURST');final=p.evaluate('__SAMPLE.snapshot()');video=p.video;c.close();video.save_as(str(out/'native-no-fx-full.webm'));b.close()
for i,q in enumerate(bursts):
 (out/f'{i+1:02d}-{q["label"]}.png').write_bytes(base64.b64decode(q.pop('image').split(',')[1]))
assert final['enemy']['hp']==2 and not errors
report={'scope':'native touch walkthrough and one actual swing; fx=0; normal camera; no teleport/time pause/pose override; canvas-only readback removes DOM health bars','environment':'cloud Linux WebKit26.5/WPE software rendering, 390x844 DPR1; not iPhone/WeChat hardware','errors':errors,'captures':bursts,'final':final};(out/'burst.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
(out/'index.html').write_text('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>H36无剑光连续帧</title><style>body{margin:20px;background:#172426;color:#ede6d4;font:16px sans-serif}.frames{display:flex;gap:12px;overflow:auto}.frame{width:390px;flex-shrink:0}img{display:block;width:390px}</style><h1>H36 原游戏镜头 · 无剑光连续帧</h1><p>真实触屏出剑；未暂停或设置姿势。Canvas读回隐藏DOM血条；按原时间顺序。</p><div class="frames">'+''.join('<div class="frame"><p>'+str(i+1)+' '+q['label']+' / phase '+str(q['snapshot']['attack'])+'</p><img src="'+f'{i+1:02d}-{q["label"]}.png'+'"></div>'for i,q in enumerate(bursts))+'</div>')
print('NO FX native capture pass',[(q['label'],q['snapshot']['attack'])for q in bursts],flush=True)
