#!/usr/bin/env python3
"""Reproduce the viewport/error bridge; leave the licensed source untouched."""
from pathlib import Path
from hashlib import sha256

ROOT = Path(__file__).resolve().parent
source = (ROOT / 'upstream/index.html').read_bytes()
EXPECTED = 'ee14f3c172685a4bcf4e90ca83b99080b06c99548c0e198b009cfa0827e4e532'
assert sha256(source).hexdigest() == EXPECTED, 'Unexpected upstream revision'
prelude = b'''<script id="reference-host-viewport">Object.defineProperty(window,'devicePixelRatio',{get:function(){return 1},configurable:true});window.addEventListener('error',function(e){if(parent.__referenceSourceError)parent.__referenceSourceError(e.message)});</script>\n'''
engine = source.replace(b'<head>', b'<head>' + prelude, 1)
assert engine.replace(prelude, b'', 1) == source
(ROOT / 'engine.html').write_bytes(engine)
print('engine.html:', sha256(engine).hexdigest())
