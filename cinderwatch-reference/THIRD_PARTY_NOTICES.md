# Third-party notices

## Cinderwatch

Original author: **kevintngo**. Source: [https://github.com/kevintngo/cinderwatch](https://github.com/kevintngo/cinderwatch), pinned to [8313bb2f3eace68f8eb3c1e3c53ffa7e4663dcd5](https://github.com/kevintngo/cinderwatch/commit/8313bb2f3eace68f8eb3c1e3c53ffa7e4663dcd5). The scene, procedural models/textures/audio and tower-defense implementation are upstream work. This distribution retains their MIT license, including in the derived `engine.html`; local wrapper work does not change that attribution.

Original license retained at [upstream/LICENSE](upstream/LICENSE). Verbatim text:

```text
MIT License

Copyright (c) 2026 kevintngo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Three.js r170

Three.js is vendored by the original author and inlined into the upstream game. Its separate MIT notice is retained at [upstream/vendor/LICENSE-three.txt](upstream/vendor/LICENSE-three.txt):

```text
three.js r170 (vendor/three.module.min.js, also inlined into index.html)

The MIT License

Copyright © 2010-2024 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Distribution scope

The pinned `upstream/` files are byte-identical to the original commit, excluding its `media/` demonstration files. No private reference recording is included or loaded by this entry. The local host adds deterministic starting-state replay, a fixed 16:9 viewport, loading/recovery and input adaptation; it does not claim original authorship of Cinderwatch or its generated assets. File-level checksums are listed in [UPSTREAM.json](UPSTREAM.json).
