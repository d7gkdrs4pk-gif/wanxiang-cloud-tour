"""Render an unchanged GLB with Blender's CPU Cycles renderer.

Usage:
  blender -b -t 2 --python shell001_render.py
  blender -b -t 2 --python shell001_render.py -- --input /path/shell.glb

Writes front/back/right/left/top/hero.png and render-qa.json next to the GLB,
unless --output-dir is given. It never exports or overwrites the source GLB.
Material appearance is supplied by the GLB; no materials/textures are invented.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys
import time

import bpy
from mathutils import Vector


VIEWS = {
    "front": (0.0, -1.0, 0.0),
    "back": (0.0, 1.0, 0.0),
    "right": (1.0, 0.0, 0.0),
    "left": (-1.0, 0.0, 0.0),
    "top": (0.0, 0.0, 1.0),
    "hero": (0.95, -1.8, 1.05),
}


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path,
                        default=Path("zhuyu-assets/shell-001/shell.glb"))
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--resolution", type=int, default=512)
    parser.add_argument("--samples", type=int, default=32)
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(argv)
    if not 64 <= args.resolution <= 4096 or not 1 <= args.samples <= 4096:
        parser.error("resolution must be 64..4096; samples must be 1..4096")
    args.input = args.input.expanduser().resolve()
    args.output_dir = (args.output_dir or args.input.parent).expanduser().resolve()
    return args


def inspect_glb(path):
    raw = path.read_bytes()
    if len(raw) < 20:
        raise ValueError("Input is too short to be a GLB")
    magic, version, declared_length = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or declared_length != len(raw):
        raise ValueError("Expected a complete glTF 2.0 binary file")
    cursor, document = 12, None
    while cursor + 8 <= len(raw):
        chunk_length, chunk_type = struct.unpack_from("<II", raw, cursor)
        cursor += 8
        if cursor + chunk_length > len(raw):
            raise ValueError("Truncated GLB chunk")
        if chunk_type == 0x4E4F534A:
            document = json.loads(raw[cursor:cursor + chunk_length].decode("utf-8").rstrip("\x00 \t\r\n"))
        cursor += chunk_length
    if document is None:
        raise ValueError("GLB JSON chunk is missing")
    accessors = document.get("accessors", [])
    triangle_count, primitive_count, other_modes = 0, 0, []
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            primitive_count += 1
            accessor_index = primitive.get("indices", primitive.get("attributes", {}).get("POSITION"))
            count = accessors[accessor_index].get("count", 0) if accessor_index is not None else 0
            mode = primitive.get("mode", 4)
            if mode == 4:
                triangle_count += count // 3
            elif mode in (5, 6):
                triangle_count += max(0, count - 2)
            else:
                other_modes.append(mode)
    materials = document.get("materials", [])
    images = document.get("images", [])
    return {
        "byte_length": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "asset": document.get("asset", {}),
        "mesh_definitions": len(document.get("meshes", [])),
        "primitive_count": primitive_count,
        "triangles_in_mesh_definitions": triangle_count,
        "triangle_count_excludes_node_instancing": True,
        "non_triangle_primitive_modes": other_modes,
        "material_count": len(materials),
        "texture_count": len(document.get("textures", [])),
        "image_count": len(images),
        "embedded_image_count": sum("bufferView" in item or str(item.get("uri", "")).startswith("data:") for item in images),
        "external_image_count": sum("uri" in item and not str(item["uri"]).startswith("data:") for item in images),
        "extensions_used": document.get("extensionsUsed", []),
        "material_summary": [{
            "name": material.get("name", ""),
            "base_color_factor": material.get("pbrMetallicRoughness", {}).get("baseColorFactor", [1, 1, 1, 1]),
            "metallic_factor": material.get("pbrMetallicRoughness", {}).get("metallicFactor", 1),
            "roughness_factor": material.get("pbrMetallicRoughness", {}).get("roughnessFactor", 1),
            "has_base_color_texture": "baseColorTexture" in material.get("pbrMetallicRoughness", {}),
            "has_normal_texture": "normalTexture" in material,
            "alpha_mode": material.get("alphaMode", "OPAQUE"),
            "double_sided": material.get("doubleSided", False),
        } for material in materials],
    }


def bounds(objects):
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    if not corners:
        raise ValueError("GLB has no mesh bounds")
    low = Vector(tuple(min(corner[i] for corner in corners) for i in range(3)))
    high = Vector(tuple(max(corner[i] for corner in corners) for i in range(3)))
    return low, high


def point_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def create_area(name, energy, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = (1.0, 1.0, 1.0)
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def configure_scene(resolution, samples):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.03
    scene.cycles.max_bounces = 8
    scene.cycles.transparent_max_bounces = 8
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 20
    scene.render.use_file_extension = True
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 2
    scene.render.fps = 24
    try:
        scene.view_settings.view_transform = "AgX"
    except TypeError:
        scene.view_settings.view_transform = "Filmic"
    for look in ("AgX - Medium High Contrast", "Medium High Contrast", "None"):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0
    world = bpy.data.worlds.new("Neutral studio world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (1, 1, 1, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.22
    scene.world = world
    camera_data = bpy.data.cameras.new("Review camera")
    camera_data.type = "ORTHO"
    camera_data.clip_start = 0.01
    camera_data.clip_end = 100
    camera = bpy.data.objects.new("Review camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    lights = [create_area("Large key", 650, 4.0),
              create_area("Soft fill", 350, 3.5),
              create_area("Edge light", 800, 3.0)]
    return scene, camera, lights


def configure_view(camera, lights, direction, mesh_objects):
    outward = Vector(direction).normalized()
    camera.location = outward * 6.0
    point_at(camera, (0, 0, 0))
    bpy.context.view_layer.update()
    # Frame each view from transformed bounds, leaving a 17% margin.
    camera_inverse = camera.matrix_world.inverted()
    points = [camera_inverse @ (obj.matrix_world @ Vector(corner))
              for obj in mesh_objects for corner in obj.bound_box]
    horizontal = 2 * max(abs(p.x) for p in points)
    vertical = 2 * max(abs(p.y) for p in points)
    camera.data.ortho_scale = max(horizontal, vertical, 0.1) * 1.22
    # A camera-relative studio rig illuminates the back as fairly as the front.
    orientation = camera.rotation_euler.to_quaternion()
    right, up = orientation @ Vector((1, 0, 0)), orientation @ Vector((0, 1, 0))
    positions = [outward * 4.0 - right * 3.0 + up * 4.0,
                 outward * 3.0 + right * 3.5 + up * 1.0,
                 outward * -3.0 + right * 2.0 + up * 3.5]
    for light, position in zip(lights, positions):
        light.location = position
        point_at(light, (0, 0, 0))
    bpy.context.view_layer.update()


def main():
    args = arguments()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    qa_path = args.output_dir / "render-qa.json"
    qa = {
        "status": "started",
        "source_file": str(args.input),
        "blender_version": bpy.app.version_string,
        "render_settings": {"engine": "Cycles", "device": "CPU", "threads": 2,
                            "samples": args.samples, "resolution": [args.resolution] * 2,
                            "transparent": True, "denoising": False, "projection": "orthographic"},
        "preservation": {"mesh_data_edited": False, "materials_edited": False,
                         "textures_created_or_replaced": False,
                         "source_glb_overwritten": False,
                         "normalization": "One parent Empty transforms imported root objects; imported hierarchy is retained."},
        "quality_review": {"visual_pass": None, "human_review_required": True,
                           "hero_status": "Candidate only; not an approved or automatically selected best view.",
                           "limits": [
                               "32 samples at 512 square are review previews by default, not production-quality acceptance.",
                               "Denoising is disabled because this Blender build has no OpenImageDenoise support.",
                               "View labels use Blender import axes, not a verified semantic front of the subject.",
                               "The material factors and textures are unchanged; lighting and view transform affect their rendered appearance.",
                               "No reference-image similarity, topology quality, watertightness, or physical manufacture suitability is certified.",
                               "Transparent background has no added floor or contact shadow; native self-shadowing is retained.",
                           ]},
        "views": {},
    }
    started = time.monotonic()
    try:
        qa["gltf"] = inspect_glb(args.input)
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(args.input))
        imported = [obj for obj in bpy.data.objects if obj not in before]
        meshes = [obj for obj in imported if obj.type == "MESH"]
        if not meshes:
            raise ValueError("Imported GLB contains no mesh objects")
        # Imported lights/cameras do not control this neutral review render.
        for obj in imported:
            if obj.type == "LIGHT":
                obj.hide_render = True
        bpy.context.view_layer.update()
        minimum, maximum = bounds(meshes)
        center, extent = (minimum + maximum) / 2, maximum - minimum
        longest = max(extent)
        if not math.isfinite(longest) or longest <= 0:
            raise ValueError("Imported model has invalid or zero-sized bounds")
        scale = 2.0 / longest
        wrapper = bpy.data.objects.new("Review normalization", None)
        bpy.context.scene.collection.objects.link(wrapper)
        imported_set = set(imported)
        for obj in imported:
            if obj.parent not in imported_set:
                original_world = obj.matrix_world.copy()
                obj.parent = wrapper
                obj.matrix_world = original_world
        wrapper.scale = (scale,) * 3
        wrapper.location = -center * scale
        bpy.context.view_layer.update()
        normalized_minimum, normalized_maximum = bounds(meshes)
        triangle_count = 0
        for obj in meshes:
            obj.data.calc_loop_triangles()
            triangle_count += len(obj.data.loop_triangles)
        material_set = {slot.material for obj in meshes for slot in obj.material_slots if slot.material}
        image_set = set()
        for material in material_set:
            if material.use_nodes:
                for node in material.node_tree.nodes:
                    if node.type == "TEX_IMAGE" and node.image:
                        image_set.add(node.image)
        qa["imported"] = {
            "object_count": len(imported), "mesh_object_count": len(meshes),
            "mesh_triangles_including_instances": triangle_count,
            "used_material_count": len(material_set),
            "used_material_names": sorted(material.name for material in material_set),
            "used_texture_image_count": len(image_set),
            "texture_images": [{"name": img.name, "size": list(img.size), "channels": img.channels}
                               for img in sorted(image_set, key=lambda image: image.name)],
            "original_bounds": {"min": list(minimum), "max": list(maximum)},
            "normalization_scale": scale,
            "normalized_bounds": {"min": list(normalized_minimum), "max": list(normalized_maximum)},
        }
        scene, camera, lights = configure_scene(args.resolution, args.samples)
        qa["render_settings"]["view_transform"] = scene.view_settings.view_transform
        qa["render_settings"]["look"] = scene.view_settings.look
        for name, direction in VIEWS.items():
            configure_view(camera, lights, direction, meshes)
            output = args.output_dir / (name + ".png")
            scene.render.filepath = str(output)
            view_started = time.monotonic()
            bpy.ops.render.render(write_still=True)
            qa["views"][name] = {
                "file": output.name, "bytes": output.stat().st_size,
                "camera_position": list(camera.location),
                "ortho_scale": camera.data.ortho_scale,
                "seconds": round(time.monotonic() - view_started, 2),
                "semantic_orientation_verified": False,
            }
            qa_path.write_text(json.dumps(qa, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        qa["checks"] = {
            "all_six_requested_views_written": len(qa["views"]) == len(VIEWS),
            "normalized_longest_extent_is_two": abs(max(normalized_maximum - normalized_minimum) - 2.0) < 1e-5,
            "has_mesh_geometry": triangle_count > 0,
            "source_sha256_unchanged": hashlib.sha256(args.input.read_bytes()).hexdigest() == qa["gltf"]["sha256"],
        }
        qa["status"] = "rendered_pending_visual_review"
    except Exception as error:
        qa["status"] = "failed"
        qa["error"] = f"{type(error).__name__}: {error}"
        raise
    finally:
        qa["elapsed_seconds"] = round(time.monotonic() - started, 2)
        qa_path.write_text(json.dumps(qa, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Render QA: {qa_path}")


if __name__ == "__main__":
    main()
