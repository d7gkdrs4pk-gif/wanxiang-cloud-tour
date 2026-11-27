# Rendered ground surface cache

Built from this project's actual [render LOD](../sample-lod/terrain.glb), using
the original navigation normalization. No third-party assets or dependencies.

Rebuild with `python3 -B .github/scripts/build_ground_surface.py` (Python + numpy).
The generator locks the source GLB SHA-256 and records its transform, the
unchanged navigation cache hash, and a cross-check against the original model.

- `height.f32`: 321 columns × 213 rows, Float32 little-endian, row-major.
  Origin X/Z `[-10.5,-9.1]`, spacing `.05`, NaN means rejected surface.
  First take the **actual highest** triangle; then require Y≤1.05 and normalY>.05.
  Never filter out a wall first to expose a hidden lower floor.
- `slope.bits`: 320×212 cell flags packed least-significant bit first.
  A high-gradient cell is marked continuous only when the real center triangle
  has an upward steep normal and its height matches corner interpolation within
  .012. Other ≥.18 height discontinuities retain nearest-surface sampling.
- Both binaries together are 281,972 bytes. `metadata.json` contains their hashes.
- `validation.json` records byte-identical regeneration, .02-step route samples,
  and checks of all 68,373 XY points against existing legality.

The [provider](../../sample/ground-surface.js) refines an already legal ordinary
terrain height. The caller retains original `safeGround` XY legality, root and
building collisions, and prioritizes `stairsAt` and the existing pine patch.
It does not modify H/R or apply temporal low-pass motion to the player's Y.
