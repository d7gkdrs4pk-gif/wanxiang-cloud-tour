from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
import json,time,base64,os
out=Path(os.environ.get('FM_QA_OUT','/tmp/fengming-no-fx-h33'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('FM_TEST_URL','http://127.0.0.1:3000/').rstrip('/')+'/'
with sync_playwright()as pw:
 b=pw.webkit.launch(headless=True);c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,record_video_dir=str(out/'video'),record_video_size={'width':390,'height':844});p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(base+'gate-h33.html?fx=0',wait_until='networkidle');p.wait_for_function('window.__SAMPLE?.snapshot().ready');p.wait_for_selector('#loading',state='hidden')
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
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
contact=Image.new('RGB',(390*3,880*2),(26,36,39));d=ImageDraw.Draw(contact)
for i,q in enumerate(bursts):
 x=(i%3)*390;y=(i//3)*880;im=Image.open(out/f'{i+1:02d}-{q["label"]}.png').convert('RGB');contact.paste(im,(x,y+30));d.text((x+12,y+8),f'{q["label"]} / actual phase {q["snapshot"]["attack"]}',font=font,fill=(233,227,209))
contact.save(out/'no-fx-actual-frames.png');print('NO FX native capture pass',[(q['label'],q['snapshot']['attack'])for q in bursts],flush=True)
