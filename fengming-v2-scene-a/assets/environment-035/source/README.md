# H35 frozen road source

`road-kit-h35.glb` serializes the final 150-block `ROAD_KIT` in world coordinates. Position, normal, UV, vertex color and ordered index data are exact runtime typed-array bytes; see `export-validation.json`. The original owned WebP is embedded.

The model is unlit because the runtime vertex colors already contain fixed-SUN shading. The engine additionally compresses the atlas contrast with a custom shader; this nonstandard color operation is documented in the GLB material extras rather than changing the source texture or vertex values.

The authoritative editable modelling source is `tools/build-environment-035-road.mjs`; rerun `tools/export-environment-035-source.mjs` only to reserialize already-generated runtime arrays. No navigation or collider mesh is included or changed.
