#!/usr/bin/env python3
"""Rebuild the H30 navigation cache from the original, hash-locked H29 GLBs.

Requires Python 3 and numpy. No Blender, network, browser, NPZ, or scene edits.
Run from any directory. Existing output is compared before it can be replaced:

  python3 .github/scripts/build_sample_navigation.py
  python3 .github/scripts/build_sample_navigation.py --output /tmp/navigation.json \
      --compare fengming-v2-scene-a/assets/sample-lod/navigation.json

The stair cache covers only the genuine +X gate steps. It does not make the
roof, whole gate footprint, or disconnected terrain ledges walkable. H29 and
the original runtime remain unchanged; this cache is for the sample scene.
"""

from __future__ import annotations

import argparse
from collections import deque
import hashlib
import json
from pathlib import Path
import struct

import numpy as np


REPO = Path(__file__).resolve().parents[2]
ASSETS = REPO / "fengming-v2-scene-a/assets"
DEFAULT_OUTPUT = ASSETS / "sample-lod/navigation.json"
SOURCE_SHA256 = {
    "terrain-001/terrain.glb": "3a09ab2e1160ec58c157ae8dd5584a93c0bdadea594c9b0f2f7fc426b5f91542",
    "gate-001/gate.glb": "70be8131371277997d6fb0c123f4b9bd4beb0810042b69aba8385030238901be",
}
EXPECTED_BOUNDS = {
    "terrain": [[-20.0, -22.643500876054166, -15.598622283522333],
                [20.0, 2.107214533465822, 15.598622283522333]],
    "gate": [[-2.433826685384108, .15, -12.0],
             [2.4338266853841075, 7.4224191213434825, -3.6]],
}
N, S = 81, .5
STEP_X, STEP_Z, STEP_S = 1.35, -7.4, .025
STEP_ROWS, STEP_COLS = 21, 45
NEIGHBORS = ((-1, 0), (1, 0), (0, -1), (0, 1))


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def load_glb(relative_path: str) -> np.ndarray:
    """Read only POSITION/indices and glTF node transforms; reject ambiguity."""
    path = ASSETS / relative_path
    data = path.read_bytes()
    require(sha256(data) == SOURCE_SHA256[relative_path],
            f"Source hash changed: {relative_path}; audit before updating the lock")
    require(len(data) >= 28, f"Truncated GLB: {path}")
    magic, version, length = struct.unpack_from("<4sII", data)
    require(magic == b"glTF" and version == 2 and length == len(data),
            f"Invalid GLB header: {path}")
    chunks = {}
    offset = 12
    while offset < length:
        chunk_length, kind = struct.unpack_from("<II", data, offset)
        offset += 8
        require(offset + chunk_length <= length and kind not in chunks,
                f"Invalid/duplicate GLB chunk: {path}")
        chunks[kind] = data[offset:offset + chunk_length]
        offset += chunk_length
    require(0x4E4F534A in chunks and 0x004E4942 in chunks,
            f"Missing JSON/BIN chunk: {path}")
    gltf = json.loads(chunks[0x4E4F534A])
    blob = chunks[0x004E4942]
    require(not gltf.get("extensionsRequired"), "Required GLB extensions unsupported")
    require(len(gltf["buffers"]) == 1 and "uri" not in gltf["buffers"][0],
            "External/multiple buffers unsupported")
    component_types = {5120: "i1", 5121: "u1", 5122: "<i2", 5123: "<u2",
                       5125: "<u4", 5126: "<f4"}
    widths = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}

    def accessor(index):
        a = gltf["accessors"][index]
        require("sparse" not in a and not a.get("normalized", False),
                "Sparse/normalized geometry accessors unsupported")
        view = gltf["bufferViews"][a["bufferView"]]
        require(view.get("buffer", 0) == 0, "Unexpected buffer index")
        dtype = np.dtype(component_types[a["componentType"]])
        width = widths[a["type"]]
        start = view.get("byteOffset", 0) + a.get("byteOffset", 0)
        stride = view.get("byteStride", dtype.itemsize * width)
        end = start + (a["count"] - 1) * stride + dtype.itemsize * width
        require(a["count"] > 0 and stride >= dtype.itemsize * width and
                end <= len(blob) and
                end <= view.get("byteOffset", 0) + view["byteLength"],
                "Accessor exceeds its buffer view")
        return np.ndarray((a["count"], width), dtype=dtype, buffer=blob,
                          offset=start, strides=(stride, dtype.itemsize)).copy()

    triangles = []

    def visit(index, parent, ancestors):
        require(index not in ancestors, "Cycle in glTF node hierarchy")
        node = gltf["nodes"][index]
        if "matrix" in node:
            matrix = np.asarray(node["matrix"]).reshape(4, 4).T
        else:
            x, y, z, w = node.get("rotation", [0, 0, 0, 1])
            rotation = np.array([
                [1-2*y*y-2*z*z, 2*x*y-2*z*w, 2*x*z+2*y*w],
                [2*x*y+2*z*w, 1-2*x*x-2*z*z, 2*y*z-2*x*w],
                [2*x*z-2*y*w, 2*y*z+2*x*w, 1-2*x*x-2*y*y],
            ])
            matrix = np.eye(4)
            matrix[:3, :3] = rotation @ np.diag(node.get("scale", [1, 1, 1]))
            matrix[:3, 3] = node.get("translation", [0, 0, 0])
        matrix = parent @ matrix
        if "mesh" in node:
            require("skin" not in node, "Skinned navigation geometry unsupported")
            for primitive in gltf["meshes"][node["mesh"]]["primitives"]:
                require(primitive.get("mode", 4) == 4 and not primitive.get("targets"),
                        "Only static TRIANGLES primitives are supported")
                positions = accessor(primitive["attributes"]["POSITION"])
                require(positions.shape[1] == 3, "POSITION must be VEC3")
                positions = (np.c_[positions, np.ones(len(positions))] @ matrix.T)[:, :3]
                indices = (accessor(primitive["indices"]).ravel()
                           if "indices" in primitive else np.arange(len(positions)))
                require(len(indices) % 3 == 0 and indices.min() >= 0 and
                        indices.max() < len(positions), "Invalid triangle indices")
                triangles.append(positions[indices].reshape(-1, 3, 3))
        for child in node.get("children", []):
            visit(child, matrix, ancestors | {index})

    for index in gltf["scenes"][gltf.get("scene", 0)]["nodes"]:
        visit(index, np.eye(4), set())
    require(bool(triangles), f"No triangles in {path}")
    result = np.vstack(triangles)
    require(np.isfinite(result).all(), f"Non-finite source geometry: {path}")
    return result


class HeightSampler:
    """Highest triangle intersected by a world-space vertical downward ray."""

    def __init__(self, triangles):
        self.a, self.b, self.c = triangles[:, 0], triangles[:, 1], triangles[:, 2]
        a, b, c = self.a, self.b, self.c
        self.den = ((b[:, 2]-c[:, 2])*(a[:, 0]-c[:, 0]) +
                    (c[:, 0]-b[:, 0])*(a[:, 2]-c[:, 2]))
        normal = np.cross(b-a, c-a)
        self.normal_y = normal[:, 1] / np.maximum(1e-10, np.linalg.norm(normal, axis=1))
        self.xmin, self.xmax = triangles[:, :, 0].min(1), triangles[:, :, 0].max(1)
        self.zmin, self.zmax = triangles[:, :, 2].min(1), triangles[:, :, 2].max(1)

    def top(self, x, z, normal_y=None, min_y=None, max_y=None):
        # Same barycentric epsilon as H29 buildNav; XZ AABBs avoid testing
        # every triangle's barycentrics on each ray.
        valid = ((np.abs(self.den) > 1e-8) &
                 (x >= self.xmin-1e-5) & (x <= self.xmax+1e-5) &
                 (z >= self.zmin-1e-5) & (z <= self.zmax+1e-5))
        if normal_y is not None:
            valid &= self.normal_y > normal_y
        if not valid.any():
            return None
        a, b, c, den = self.a[valid], self.b[valid], self.c[valid], self.den[valid]
        u = ((b[:, 2]-c[:, 2])*(x-c[:, 0]) + (c[:, 0]-b[:, 0])*(z-c[:, 2])) / den
        v = ((c[:, 2]-a[:, 2])*(x-c[:, 0]) + (a[:, 0]-c[:, 0])*(z-c[:, 2])) / den
        y = u*a[:, 1] + v*b[:, 1] + (1-u-v)*c[:, 1]
        valid = (u >= -.0001) & (v >= -.0001) & (u+v <= 1.0001)
        if min_y is not None:
            valid &= y >= min_y
        if max_y is not None:
            valid &= y <= max_y
        return float(max(y[valid])) if valid.any() else None

    def highest_surface(self, x, z):
        """Return actual highest hit and its normal, without filtering lower hits.

        Used only for the pine patch. In particular, a high wall/rock must not
        be excluded first to reveal an otherwise hidden lower floor.
        """
        valid = ((np.abs(self.den) > 1e-8) &
                 (x >= self.xmin-1e-5) & (x <= self.xmax+1e-5) &
                 (z >= self.zmin-1e-5) & (z <= self.zmax+1e-5))
        if not valid.any():
            return None
        a, b, c, den = self.a[valid], self.b[valid], self.c[valid], self.den[valid]
        normals = self.normal_y[valid]
        u = ((b[:, 2]-c[:, 2])*(x-c[:, 0]) + (c[:, 0]-b[:, 0])*(z-c[:, 2])) / den
        v = ((c[:, 2]-a[:, 2])*(x-c[:, 0]) + (a[:, 0]-c[:, 0])*(z-c[:, 2])) / den
        hits = (u >= -.0001) & (v >= -.0001) & (u+v <= 1.0001)
        if not hits.any():
            return None
        heights = (u*a[:, 1] + v*b[:, 1] + (1-u-v)*c[:, 1])[hits]
        normals = normals[hits]
        highest = int(np.argmax(heights))
        return float(heights[highest]), float(normals[highest])


def bounds(triangles):
    return [triangles.min((0, 1)).tolist(), triangles.max((0, 1)).tolist()]


def normalize_geometry():
    terrain = load_glb("terrain-001/terrain.glb")
    low, high = terrain.min((0, 1)), terrain.max((0, 1))
    size, center = high-low, (low+high)/2
    scale = 40/max(size[0], size[2])
    translation = np.array([-center[0]*scale, -high[1]*scale, -center[2]*scale])
    terrain = terrain*scale + translation
    probe = HeightSampler(terrain).top(0, 0)
    require(probe is not None and probe < 30, "Terrain center probe missed")
    translation[1] -= probe-.12
    terrain[:, :, 1] -= probe-.12
    terrain_transform = {"scale": scale, "translation": translation.tolist(),
                         "bounds": bounds(terrain)}

    gate = load_glb("gate-001/gate.glb")
    low, high = gate.min((0, 1)), gate.max((0, 1))
    size, center = high-low, (low+high)/2
    scale = 8.4/max(size[0], size[2])
    translation = np.array([-center[0]*scale, .15-low[1]*scale, -7.8-center[2]*scale])
    gate = gate*scale + translation
    gate_transform = {"scale": scale, "translation": translation.tolist(),
                      "bounds": bounds(gate)}
    for name, actual in (("terrain", terrain_transform), ("gate", gate_transform)):
        require(np.allclose(actual["bounds"], EXPECTED_BOUNDS[name], rtol=0, atol=1e-8),
                f"Unexpected normalized {name} bounds")
    return terrain, gate, terrain_transform, gate_transform


def rebuild():
    terrain, gate, terrain_transform, gate_transform = normalize_geometry()
    sample = HeightSampler(terrain)
    heights = np.full((N, N), np.nan)
    for z in range(N):
        for x in range(N):
            height = sample.top(x*S-20, z*S-20)
            if height is not None:
                heights[z, x] = height
    reachable = np.zeros((N, N), bool)
    require(np.isfinite(heights[40, 40]), "Missing central navigation cell")
    reachable[40, 40] = True
    queue = deque([(40, 40)])
    base = heights[40, 40]
    while queue:
        x, z = queue.popleft()
        for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            X, Z = x+dx, z+dz
            if (X < 1 or X >= N-1 or Z < 1 or Z >= N-1 or reachable[Z, X] or
                    not np.isfinite(heights[Z, X]) or abs(heights[Z, X]-base) > .8 or
                    abs(heights[Z, X]-heights[z, x]) > .45):
                continue
            reachable[Z, X] = True
            queue.append((X, Z))
    require(reachable.sum() == 2281, "Original navigation reachability changed")
    require(abs(base-.12) < 1e-8, "Terrain center no longer at Y=.12")

    step_sample = HeightSampler(gate)
    steps = [[step_sample.top(STEP_X+x*STEP_S, STEP_Z+z*STEP_S,
                              normal_y=.05, min_y=.14, max_y=1.0)
              for x in range(STEP_COLS)] for z in range(STEP_ROWS)]
    raw_nulls = sum(h is None for row in steps for h in row)
    # Three synchronous four-neighbor rounds. Max valid neighbor preserves
    # tread height across tiny bevel gaps; it does not read outside the box.
    for _ in range(3):
        filled = [row[:] for row in steps]
        for z in range(STEP_ROWS):
            for x in range(STEP_COLS):
                if steps[z][x] is not None:
                    continue
                values = [steps[Z][X] for dx, dz in NEIGHBORS
                          if 0 <= (X := x+dx) < STEP_COLS and
                          0 <= (Z := z+dz) < STEP_ROWS and steps[Z][X] is not None]
                if values:
                    filled[z][x] = max(values)
        steps = filled
    require(sum(h is None for row in steps for h in row) == 95,
            "Unexpected step surface coverage")
    require(all(.14 <= h <= 1.0 for row in steps for h in row if h is not None),
            "Step height outside audited range")
    require(steps[16][34] is not None and .26 < steps[16][34] < .30 and
            .38 < steps[16][26] < .42 and .51 < steps[16][18] < .55 and
            .69 < steps[16][4] < .74, "Expected four physical treads missing")

    # Narrow, source-geometry patch repairs the coarse grid's false holes by
    # the hero pine. Never relax the global grid, root blocker, or stair box.
    pine_heights = []
    accepted_normals = []
    rejected_high = rejected_normal = missed = 0
    for z in range(48):
        row = []
        for x in range(25):
            hit = sample.highest_surface(-6.9+x*.05, -8.35+z*.05)
            if hit is None:
                row.append(None)
                missed += 1
            elif hit[0] > .60:
                row.append(None)
                rejected_high += 1
            elif hit[1] <= .4:
                row.append(None)
                rejected_normal += 1
            else:
                row.append(round(hit[0], 7))
                accepted_normals.append(hit[1])
        pine_heights.append(row)
    pine_patch = {"origin": [-6.9, -8.35], "step": .05, "cols": 25,
                  "rows": 48, "H": pine_heights}
    require(accepted_normals and min(accepted_normals) > .4,
            "Pine patch contains no safe upward surfaces")
    require(all(h <= .60 for row in pine_heights for h in row if h is not None),
            "Pine patch exposed a high wall")

    transforms = {"terrain_transform": terrain_transform, "grid_base": float(base),
                  "reachable_grid_cells": int(reachable.sum()),
                  "gate_transform": gate_transform,
                  "main_pine": [-7, float(heights[26, 26]), -7]}
    result = {
        "version": "H29 original navigation + bounded genuine gate steps",
        "source_sha256": SOURCE_SHA256, "N": N, "S": S,
        "H": [round(float(h), 7) if np.isfinite(h) else None for h in heights.ravel()],
        "R": reachable.astype(np.uint8).ravel().tolist(),
        "steps": steps, "transforms": transforms,
        "pinePatch": pine_patch,
    }
    stats = {"H_cells": N*N, "R_reachable": int(reachable.sum()),
             "steps_shape": [STEP_ROWS, STEP_COLS], "step_raw_nulls": raw_nulls,
             "step_filled_nulls": 95,
             "step_bounds": {"x": [STEP_X, STEP_X+(STEP_COLS-1)*STEP_S],
                             "z": [STEP_Z, STEP_Z+(STEP_ROWS-1)*STEP_S],
                             "y": [.14, 1.0], "normal_y_min": .05},
             "bounds_checked": EXPECTED_BOUNDS}
    stats["pinePatch"] = {"origin": [-6.9, -8.35], "step": .05,
                          "shape": [48, 25], "valid": len(accepted_normals),
                          "missed": missed, "rejected_highest_y_above_0_60": rejected_high,
                          "rejected_highest_normal_y_at_most_0_4": rejected_normal,
                          "minimum_accepted_normal_y": min(accepted_normals),
                          "method": "Unfiltered highest source-terrain hit; then Y/normal acceptance; no hole fill"}
    return result, stats


def compare(reference, generated, allow_add_pine_patch=False):
    """Exact numerical/structural equality, not an image or tolerance test."""
    expected_keys = set(generated)
    if allow_add_pine_patch and "pinePatch" not in reference:
        expected_keys.remove("pinePatch")
    require(set(reference) == expected_keys, "Navigation schema differs")
    for name in reference:
        require(reference[name] == generated[name], f"Existing navigation differs at {name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--compare", type=Path,
                        help="Require exact equality with this cache before writing output")
    parser.add_argument("--proof", type=Path,
                        default=ASSETS / "sample-lod/navigation-rebuild-proof.json")
    parser.add_argument("--allow-add-pine-patch", action="store_true",
                        help="Explicit one-time schema extension; all existing fields must stay exact")
    args = parser.parse_args()
    reference_path = args.compare or (args.output if args.output.exists() else None)
    reference_data = reference_path.read_bytes() if reference_path else None
    generated, stats = rebuild()
    if reference_data is not None:
        compare(json.loads(reference_data), generated, args.allow_add_pine_patch)
    encoded = json.dumps(generated, separators=(",", ":"), allow_nan=False).encode()
    proof = {"status": "passed", "builder": ".github/scripts/build_sample_navigation.py",
             "source_sha256": SOURCE_SHA256, "validation": stats,
             "reference_compared": reference_path.name if reference_path else None,
             "reference_sha256": sha256(reference_data) if reference_data else None,
             "exact_structure_and_values": bool(reference_data and
                 json.loads(reference_data) == generated),
             "existing_fields_preserved_exactly": reference_data is not None,
             "schema_extension_pinePatch": bool(reference_data and
                 "pinePatch" not in json.loads(reference_data) and args.allow_add_pine_patch),
             "byte_identical": encoded == reference_data if reference_data else None,
             "output_sha256": sha256(encoded),
             "scope": "Original source GLBs rebuilt offline; not a touch-input or phone test"}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(encoded)
    args.proof.parent.mkdir(parents=True, exist_ok=True)
    args.proof.write_text(json.dumps(proof, indent=2) + "\n")
    print(json.dumps(proof, indent=2))


if __name__ == "__main__":
    main()
