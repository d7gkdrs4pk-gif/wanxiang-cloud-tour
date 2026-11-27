# H36 integrated closed rock masses — source revision 2

Append `H36_ENVIRONMENT` from `h36-rock-environment.blend`. Coordinates are Blender `(engine X,-engine Z,engine Y)`. The standard separate `h36-rock-environment.gltf` + `.bin` is the same candidate with evaluated bevels, in glTF Y-up coordinates. Images stay external under `textures/source-gltf/`. The Blend uses `//textures/` relative images. All source-directory files are below 25MiB; no texture pixels, geometry attributes or material values were changed by externalization. See `externalization-validation.json` for byte comparisons against the prior embedded source GLB.

There are **three main assemblies**, not scattered props: west verge, east verge, low rear ridge. Each has a fully closed, terrain-fitted rock body with buried foot, undercut, ledge, shoulder and actual 4.5cm bevels. A registered Poly Haven scan is turned upward as the stone top; its irregular open perimeter is buried 4.5cm into the closed supporting body. The former upright background slab and exposed near-right thin cut edge are removed.

The original rendered terrain is read into a temporary world-space BVH using its exact official normalization transform. It is never rewritten or saved in this asset. Near bodies start at `Z=1.53`; rear ridge remains `Z<=-9.15`. Road edges retain 5cm clearance. These are outside the original legal walking bounds. Original nav, collision, height caches, road and actor data are untouched.

PBR albedo now uses the parent scene’s exact linear `RGBToBW(diff)*(.62,.77,.80)` slate operation, deterministically encoded as new `*_slate_albedo_2k.png`; the minor moss variant uses `(.43,.60,.46)`. Original downloaded images remain unchanged. Roughness and OpenGL normals are genuine CC0 maps; no baked directional sun or vertex-light colors are added. Materials have semantic `H36_Rock`/`H36_Moss` properties and names.

Source: official Poly Haven [Rock Face 01](https://polyhaven.com/a/rock_face_01), Dario Barresi, and [Rock Face 02](https://polyhaven.com/a/rock_face_02), Dario Barresi / Rico Cilliers. [Official license](https://polyhaven.com/license): CC0 1.0, including commercial redistribution. API metadata, license-page capture, readable terms and original verified MD5/SHA downloads are in `source/polyhaven/`. No private reference frames/audio are embedded.

CPU rebuild, no render:

```sh
blender -b -t 2 --python tools/build-environment-036.py
```

`placement-source.json` and `source-hashes.json` record this source candidate. It has not been rendered here or declared visually accepted; unified real daylight and fixed-camera review belong to the complete scene.
