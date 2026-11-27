# H34 fitted bedrock edging

Three original 3D rock control cages are authored as asymmetric polygon control cages with undercut shoulders, broad sloping caps and physical edge bevels. They are not sphere primitives or a background image.

- Editable source: `hand-cut-bedrock.blend`.
- Standard uncompressed glTF geometry inspection asset: `hand-cut-bedrock.glb`.
- Runtime geometry: `rock-shapes.js`, statically included by the existing classic build. No additional runtime GLB request, geometry generation modifier or texture image is needed.
- Generator: `tools/build-environment-034.py`, executed with Blender in background mode.
- Painting: the existing project-owned H33 hand-painted atlas, right rock cell. Runtime reuses the same `Texture` object as the terrain.

Only the west/east bodies are selected: 1,744 triangles merged to one static draw. The side ledge is retained only in the editable source library and GLB; it was rejected in the normal-camera review and is absent from runtime. One further draw contains only a narrow, ground-conformed contact feather around the buried edges, directed opposite SUN(-8,16,12); it is not a large black surface. Existing terrain positions, normals, indices, heights, navigation and collision are not edited.

Placement and slope fitting are in `sample/scene-dressing.js`. Foreground bodies lie beyond the original playable Z limit, Both remain beyond the playable Z limit. CPU bounds after the original height-grid fit leave 0.73 m and 1.08 m to that playable rectangle, respectively. These are visual boundary objects and do not register new movement colliders or intercept pointer picking.
