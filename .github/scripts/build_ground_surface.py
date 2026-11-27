#!/usr/bin/env python3
"""Bake the actual rendered LOD's upward highest surfaces; never change nav.

Python3 + numpy. Uses the repository's strict GLB reader; no Blender/browser.
The binary is one Float32LE per .05-world-unit sample, with NaN = invalid.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import numpy as np

REPO = Path(__file__).resolve().parents[2]
ASSETS = REPO / "fengming-v2-scene-a/assets"
OUT = ASSETS / "sample-ground"
LOD_SHA = "81610e33c233130f36e0ae29e4e4431e7b61b87d30abadcf95c68e0b59e203bb"


def main():
    spec = importlib.util.spec_from_file_location("source_navigation", Path(__file__).with_name("build_sample_navigation.py"))
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    helper.SOURCE_SHA256["sample-lod/terrain.glb"] = LOD_SHA
    cache_bytes = (ASSETS / "sample-lod/navigation.json").read_bytes()
    cache = json.loads(cache_bytes)
    for key, digest in cache["source_sha256"].items():
        if hashlib.sha256((ASSETS / key).read_bytes()).hexdigest() != digest:
            raise ValueError("Original navigation source changed: " + key)
    transform = cache["transforms"]["terrain_transform"]
    scale, translation = transform["scale"], np.asarray(transform["translation"])
    lod = helper.load_glb("sample-lod/terrain.glb") * scale + translation
    original = helper.load_glb("terrain-001/terrain.glb") * scale + translation
    if not np.allclose(helper.bounds(lod), helper.EXPECTED_BOUNDS["terrain"], atol=.08, rtol=0):
        raise ValueError("Unexpected rendered terrain bounds")
    sampler, original_sampler = helper.HeightSampler(lod), helper.HeightSampler(original)
    cols, rows, step, origin = 321, 213, .05, [-10.5, -9.1]
    heights = np.full((rows, cols), np.nan, dtype="<f4")
    rejected_normal = rejected_high = missed = 0
    comparison = []
    for z in range(rows):
        for x in range(cols):
            X, Z = origin[0]+x*step, origin[1]+z*step
            hit = sampler.highest_surface(X, Z)
            if hit is None:
                missed += 1
            elif hit[0] > 1.05:
                rejected_high += 1
            elif hit[1] <= .05:
                rejected_normal += 1
            else:
                heights[z, x] = hit[0]
            if x % 16 == 0 and z % 16 == 0:
                high = original_sampler.highest_surface(X, Z)
                if hit and high:
                    comparison.append(abs(hit[0]-high[0]))
    binary = heights.tobytes(order="C")
    # A single bit per cell distinguishes an actual continuous steep face
    # from a vertical ledge between two levels. Use real center-ray evidence,
    # not a general interpolation/low-pass rule for all high-gradient cells.
    continuous = np.zeros((rows-1)*(cols-1), dtype=np.uint8)
    high_gradient_cells = continuous_steep_cells = 0
    for z in range(rows-1):
        for x in range(cols-1):
            corners = heights[z:z+2, x:x+2]
            if not np.isfinite(corners).all() or np.ptp(corners) < .18:
                continue
            high_gradient_cells += 1
            center = sampler.highest_surface(origin[0]+(x+.5)*step, origin[1]+(z+.5)*step)
            if center and center[0] <= 1.05 and .05 < center[1] < .8 and abs(center[0]-float(corners.mean())) <= .012:
                continuous[z*(cols-1)+x] = 1
                continuous_steep_cells += 1
    slope_bits = np.packbits(continuous, bitorder="little").tobytes()
    assert len(binary) == cols*rows*4 and len(binary)+len(slope_bits) < 300_000
    meta = {
        "kind": "visual ground-height refinement, never XY legality",
        "source": "sample-lod/terrain.glb", "source_sha256": LOD_SHA,
        "original_source_sha256": cache["source_sha256"]["terrain-001/terrain.glb"],
        "navigation_sha256": hashlib.sha256(cache_bytes).hexdigest(),
        "transform": transform, "origin": origin, "step": step,
        "cols": cols, "rows": rows, "format": "Float32LE; NaN=invalid", "bytes": len(binary),
        "sha256": hashlib.sha256(binary).hexdigest(),
        "sampling": "Unfiltered actual highest LOD triangle, then require world Y<=1.05 and normalY>.05",
        "valid": int(np.isfinite(heights).sum()), "missed": missed,
        "rejected_normal": rejected_normal, "rejected_high": rejected_high,
        "slope_bits": {"file": "slope.bits", "bytes": len(slope_bits),
                       "sha256": hashlib.sha256(slope_bits).hexdigest(), "bit_order": "little",
                       "high_gradient_cells": high_gradient_cells,
                       "continuous_steep_cells": continuous_steep_cells,
                       "evidence": "Actual highest center triangle normal in (.05,.8), Y<=1.05, height within .012 of four-corner interpolation"},
        "total_binary_bytes": len(binary)+len(slope_bits),
        "refinement": {"max_surface_y": 1.05, "edge_spread": .18,
                       "preserve": "stairsAt and pinePatch are caller-prioritized; true ledges use nearest, no temporal Y smoothing"},
        "original_crosscheck": {"samples": len(comparison), "median_absolute_difference": float(np.median(comparison)),
                                "p95_absolute_difference": float(np.quantile(comparison, .95)), "max_absolute_difference": float(max(comparison))},
    }
    OUT.mkdir(exist_ok=True)
    for name, contents in [("height.f32", binary), ("slope.bits", slope_bits),
                           ("metadata.json", (json.dumps(meta, indent=2)+"\n").encode())]:
        temporary = OUT / (name+".tmp")
        temporary.write_bytes(contents)
        temporary.replace(OUT / name)
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
