# H36 scene review — unchanged H35 actors

This folder supplies the existing actors as 1:1 scene rulers and action diagnostics. It does not replace their game assets, modify their animation, add lights, or render images.

Load the utility in Blender 4.3.2:

```python
import sys
from pathlib import Path
repo = Path('/path/to/wanxiang-cloud-tour')
sys.path.insert(0, str(repo / '.github/scripts'))
from h36_scene_actors import append_linyan, append_enemy, set_hero_pose, relativize_libraries

hero = append_linyan()
hero.place((-3.2, 0.0656919404864311, -4.2), -.6)
set_hero_pose(hero, 'Idle', phase=0)
foe = append_enemy()
foe.place((2.8, .03, -6.6), -2.06)
```

`place` accepts the original **game XYZ, Y-up**, converts to Blender `(x,-z,y)`, and applies game yaw as Blender +Z rotation. The actor's local forward is Blender -Y. Every scale remains `(1,1,1)`; do not apply another coordinate conversion or enlarge either actor. The corrected normal spawn height is `.0656919404864311`, not the earlier `.217` estimate. No camera is created.

For the existing upper-stair contact diagnosis:

```python
hero.place((1.58, .714, -7), 1.1)
set_hero_pose(hero, 'Slash', phase=.44)
```

The hero's real actions are `Idle` (2s), `Walk` (.8s), and `Slash` (.78s). At 60 FPS, Idle phase 0 is frame 1; Slash phase `.44` is **frame 21.592**, including its fractional subframe. `freeze=True` is the default: the exact evaluated local bone bases are retained, and the active action is detached while its original clips stay available. This permits multiple independent pose instances in one scene. Pass `freeze=False` for editable timeline playback. The utility sets the scene to 60 FPS for clip evaluation.

The hero is appended from `../hero-035/linyan-h35-animation.blend`; its 4 mesh datablocks, atlas and materials remain linked to `../hero-034/linyan-h34.blend`. Keep both folders. The rig and actions are editable local data. It retains the real 9,351 total triangles, 22 bones, unchanged sword Object compensation/socket, and nominal 1.485 reference scale. The actual H35 idle skinned body is `.0140000` to `1.4807321` metres vertically (height `1.4667321`); the utility preserves this rather than stretching its BBox to the nominal number.

The original hero's packed 1K sRGB RGBA atlas includes painted color and AO. Existing Principled materials use it for Base Color/Alpha with constant roughness/metalness (body `.94/0`, sword `.78/.12`). There are no added normal/ORM maps. H36's scene sun and materials can be reviewed consistently without faking a new actor texture.

`enemy-h35-existing.glb` is a CPU serialization of the actual `sample/enemy.js` geometry, weights, inverse binds, vertex colors and material values. It contains 1,866 triangles, 19 bones and 4 materials. `EnemyIdle` and `EnemyHit` are sampled from that existing `update` function; they are 0-based clips in Blender. `foe.pose('EnemyIdle', 0)` restores the unchanged standing pose. `EnemyHit` uses the existing default local -Z recoil direction, not a redesigned reaction. The importer utility excludes Blender's bone-display helper from renderable scenery.

Before saving the **new scene** elsewhere, rebase library paths:

```python
destination = repo / 'fengming-v2-scene-a/assets/scene-036/gate-review.blend'
relativize_libraries(destination)
bpy.ops.wm.save_as_mainfile(filepath=str(destination), compress=True, relative_remap=False)
```

Only the new file is saved. Source H34/H35 files are read-only dependencies. The enemy export can be reproduced without Blender, GPU or a browser:

```sh
node .github/scripts/h36-export-enemy.mjs
```

See `enemy-export-report.json` for exact typed-array byte comparisons with the actual runtime source, and `review-integrity.json` for source hashes and the small CPU append check. This package is scene-review support; it does not claim that the H35 art passed the new visual direction.
