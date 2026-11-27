"""Compare actual Three camera projection with Blender VERTICAL 32mm.

CPU only: creates and then removes an isolated scene/camera, never renders or
saves a Blender scene. Usage:
  blender -b --factory-startup --python .github/scripts/h36-camera-calibration.py \
    -- --calibration /workspace/qa-h36/calibration.json \
       --output /workspace/qa-h36/camera-calibration.json
"""
import argparse
import json
import math
from pathlib import Path
import subprocess
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

REPO = Path(__file__).resolve().parents[2]


def compare_camera(calibration_path):
    three = json.loads(subprocess.check_output([
        'node', str(REPO / '.github/scripts/h36-camera-three.mjs'),
        '--calibration', str(Path(calibration_path).resolve())
    ], text=True))
    scene = bpy.data.scenes.new('H36_CPU_CAMERA_CALIBRATION_TEMP')
    data = bpy.data.cameras.new('H36_CPU_CAMERA_CALIBRATION_TEMP')
    camera = bpy.data.objects.new('H36_CPU_CAMERA_CALIBRATION_TEMP', data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    convert = lambda p: Vector((p[0], -p[2], p[1]))
    try:
        scene.render.resolution_x = three['width']
        scene.render.resolution_y = three['height']
        scene.render.resolution_percentage = 100
        scene.render.pixel_aspect_x = 1.
        scene.render.pixel_aspect_y = 1.
        data.type = 'PERSP'
        data.sensor_fit = 'VERTICAL'
        data.sensor_height = 32.
        data.lens = 32. / (2. * math.tan(math.radians(three['FOV']) / 2.))
        data.clip_start = three['near']
        data.clip_end = three['far']
        data.shift_x = data.shift_y = 0.
        camera.location = convert(three['camera'])
        direction = convert(three['target']) - camera.location
        camera.rotation_mode = 'QUATERNION'
        camera.rotation_quaternion = direction.to_track_quat('-Z', 'Y')
        # This scene is deliberately not made active and is never saved.
        camera.update_tag()
        bpy.context.view_layer.update()
        matrix = camera.matrix_world.copy()
        # Update isolated camera's matrix explicitly; no dependency on active scene.
        matrix = camera.matrix_basis.copy()
        camera.matrix_world = matrix
        rows = []
        for item in three['points']:
            world = convert(item['world'])
            ndc = world_to_camera_view(scene, camera, world)
            pixels = [ndc.x * three['width'], (1. - ndc.y) * three['height']]
            dx = pixels[0] - item['threePixels'][0]
            dy = pixels[1] - item['threePixels'][1]
            rows.append({**item, 'blenderWorld': list(world), 'blenderPixels': pixels,
                         'pixelDelta': [dx, dy], 'pixelDistance': math.hypot(dx, dy)})
        maximum = max(row['pixelDistance'] for row in rows)
        return {**{k: v for k, v in three.items() if k != 'points'},
                'blender': {'version': bpy.app.version_string, 'sensorFit': data.sensor_fit,
                            'sensorHeightMM': data.sensor_height, 'lensMM': data.lens,
                            'pixelAspect': [1, 1], 'resolutionPercentage': 100,
                            'position': list(camera.location),
                            'quaternionWXYZ': list(camera.rotation_quaternion)},
                'points': rows, 'maximumPixelDistance': maximum,
                'withinOnePixel': maximum < 1., 'rendered': False,
                'existingSceneOrActorDataChanged': False}
    finally:
        bpy.data.objects.remove(camera, do_unlink=True)
        bpy.data.cameras.remove(data)
        bpy.data.scenes.remove(scene)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--calibration', default='/workspace/qa-h36/calibration.json')
    parser.add_argument('--output', default='/workspace/qa-h36/camera-calibration.json')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    report = compare_camera(args.calibration)
    destination = Path(args.output).resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('H36_CAMERA_CALIBRATION', json.dumps({'output': str(destination),
          'maximumPixelDistance': report['maximumPixelDistance'],
          'withinOnePixel': report['withinOnePixel'], 'rendered': False}))
    if not report['withinOnePixel']:
        raise RuntimeError('Blender/Three camera projection differed by >=1 pixel')
