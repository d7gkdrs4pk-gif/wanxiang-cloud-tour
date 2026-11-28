#!/usr/bin/env python3
"""Subset the OFL Noto CJK SC font to the complete Chinese HUD character set."""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parent.parent
path = Path(sys.argv[1] if len(sys.argv) > 1 else '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')
font = TTFont(path, fontNumber=2)
font.recalcTimestamp = False
text = (ROOT / 'locale/zh-CN.js').read_text() + (ROOT / 'locale/zh-CN.json').read_text()
options = subset.Options()
options.flavor = 'woff'
options.hinting = False
options.name_IDs = ['*']
worker = subset.Subsetter(options=options)
worker.populate(text=text)
worker.subset(font)
font.flavor = 'woff'
directory = ROOT / 'fonts'
directory.mkdir(exist_ok=True)
out = directory / 'noto-sans-cjk-sc-zh.woff'
font.save(out)
record = {
    'family': 'Noto Sans CJK SC Bold', 'version': '2.004',
    'copyright': font['name'].getDebugName(0), 'license': 'SIL Open Font License 1.1',
    'upstream': 'https://github.com/notofonts/noto-cjk',
    'source_sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
    'font_number': 2, 'subset_cmap_characters': len(font.getBestCmap()),
    'output_bytes': out.stat().st_size, 'sha256': hashlib.sha256(out.read_bytes()).hexdigest(),
}
(directory / 'SOURCE.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(record, ensure_ascii=False))
