#!/usr/bin/env python3
"""Build the Chinese HUD derivative without editing the upstream snapshot."""
from pathlib import Path
from hashlib import sha256
import json

ROOT = Path(__file__).resolve().parent
source = (ROOT / 'upstream/index.html').read_bytes()
EXPECTED = 'ee14f3c172685a4bcf4e90ca83b99080b06c99548c0e198b009cfa0827e4e532'
assert sha256(source).hexdigest() == EXPECTED, 'Unexpected upstream revision'
prelude = b'''<script id="reference-host-viewport">Object.defineProperty(window,'devicePixelRatio',{get:function(){return 1},configurable:true});window.addEventListener('error',function(e){if(parent.__referenceSourceError)parent.__referenceSourceError(e.message)});</script>\n'''
messages = json.loads((ROOT / 'locale/zh-CN.json').read_text())
locale = (ROOT / 'locale/zh-CN.js').read_text().replace(
    '/*__MESSAGES__*/', json.dumps(messages, ensure_ascii=False))
font = b'''<style>@font-face{font-family:CinderwatchZh;src:url('fonts/noto-sans-cjk-sc-zh.woff?v=zh1') format('woff');font-weight:700;font-style:normal;font-display:swap}</style>\n'''
engine = source.replace(b'<head>', b'<head>' + prelude + font, 1)
anchor = b'const UI = (() => {'
assert engine.count(anchor) == 1
engine = engine.replace(anchor, locale.encode() + b'\n' + anchor, 1)
engine = engine.replace(b'<html lang="en">', b'<html lang="zh-CN">', 1)
engine = engine.replace(b'<title>Cinderwatch</title>', '<title>守烽堡 · 中文试玩</title>'.encode(), 1)
for english, chinese in messages.items():
    if english.startswith('Cinderwatch:'):
        engine = engine.replace(('content=\"' + english + '\"').encode(), ('content=\"' + chinese + '\"').encode(), 1)
(ROOT / 'engine.html').write_bytes(engine)
print('engine.html:', sha256(engine).hexdigest())
