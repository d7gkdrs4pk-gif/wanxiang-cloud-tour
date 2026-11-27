#!/usr/bin/env python3
import glob
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def three_classic():
    src = open(os.path.join(ROOT, 'vendor', 'three.module.min.js'), encoding='utf-8').read()
    i = src.rfind('export{')
    j = src.rfind('}')
    body, names = src[:i], src[i + 7:j]
    pairs = []
    for item in names.split(','):
        item = item.strip()
        if not item:
            continue
        if ' as ' in item:
            local, public = item.split(' as ')
            pairs.append('%s:%s' % (public.strip(), local.strip()))
        else:
            pairs.append('%s:%s' % (item, item))
    out = 'var THREE=(function(){' + body + '\nreturn {' + ','.join(pairs) + '};})();'
    assert '</script' not in out
    return out


def game():
    parts = []
    for path in sorted(glob.glob(os.path.join(ROOT, 'src', '*.js'))):
        parts.append(open(path, encoding='utf-8').read())
    code = "(function(){\n'use strict';\n" + '\n'.join(parts) + '\n})();'
    assert '</script' not in code
    return code


def main():
    shell = open(os.path.join(ROOT, 'src', 'shell.html'), encoding='utf-8').read()
    html = shell.replace('/*__THREE__*/', three_classic()).replace('/*__GAME__*/', game())
    outs = [os.path.join(ROOT, 'index.html')] + sys.argv[1:]
    for out in outs:
        with open(out, 'w', encoding='utf-8') as f:
            f.write(html)
    print('built %d bytes -> %s' % (len(html), ', '.join(outs)))


if __name__ == '__main__':
    main()
