# H35 daylight road kit

`road-geometry.js` is real static 3D masonry, generated offline on the existing height sources. It is merged into the existing stone draw in `sample/scene-dressing.js`. The original navigation/cache is read only.

Rebuild from the game directory (Node, Pillow, NumPy, SciPy):

```sh
node tools/build-environment-035-road.mjs
python3 tools/build-environment-035-mask.py
```

`road-bed-mask.png` is scalar coverage/displacement data. It recesses only the rendered grout bed, fading to the original soil at the outside edge. It contains no rendered scene image. All runtime resource URLs are declared in the sample modules so the classic bundle resolves them correctly.

Source files, hashes, dimensions and sampled height checks are recorded in `provenance.json` and `road-layout.json`. Phone FPS and final visual acceptance are recorded separately by the integrated playtest.
