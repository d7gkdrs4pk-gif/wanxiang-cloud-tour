# Original forest swordsman atlas

Runtime files: `atlas.webp` and `atlas.json`. Source: `atlas.png`; provenance: `source.json`. New original ImageGen artwork; no RO or other game's sprite assets were used.

The atlas is **1448×1086**, four columns by three rows; every cell is **362×362**. Columns are front / back / left / right. Row indices are idle **0–3**, walking stride **4–7**, attack contact **8–11**. These are twelve consistent direction/state keyposes; runtime supplies timing and transitions.

Use **one scale `62/314` for every frame**, preserving the crouch/stride changes. `sourceHeight` is a diagnostic visible-alpha measurement, not a request to resize each pose. Each `anchor` is the ground-contact point in **local cell pixels**, with its X between the boots. Draw unchanged cells around that anchor:

```js
const s = 62 / atlas.referenceHeight;
const [sx,sy,sw,sh] = frame.rect;
const [ax,ay] = frame.anchor;
ctx.drawImage(image,sx,sy,sw,sh,x-ax*s,y-ay*s,sw*s,sh*s);
```

`preview-62px.png` is an asset QA contact sheet on a flat forest-colored background; it is **not gameplay evidence**. PNG → WebP is lossless and verified RGBA-identical. No atlas pixels were repainted, thresholded, or individually rescaled. The `alphaBoundsThreshold:32` only excludes almost transparent generation-edge noise from metadata measurements.

Reproduce the technical packaging with `python3 build-atlas.py` (Pillow). Retain `atlas.png` as its input.
