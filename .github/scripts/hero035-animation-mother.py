"""Build an editable H35 animation mother, linking all H34 mesh datablocks.

Run without rendering:
  blender -b --factory-startup --python .github/scripts/hero035-animation-mother.py

The source H34 .blend is read-only. The output contains local Objects and a
local 22-bone armature/actions, while mesh/material/image data remain linked to
../hero-034/linyan-h34.blend. No duplicate mesh GLB is exported.
"""
import argparse
import hashlib
import json
import math
import pathlib
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = pathlib.Path(__file__).resolve().parents[2]
GAME = ROOT / 'fengming-v2-scene-a'
DEFAULT_OUT = GAME / 'assets/hero-035'
parser = argparse.ArgumentParser()
parser.add_argument('--samples', default=str(DEFAULT_OUT / 'source/pose-samples.json'))
parser.add_argument('--source', default=str(GAME / 'assets/hero-034/linyan-h34.blend'))
parser.add_argument('--output', default=str(DEFAULT_OUT / 'linyan-h35-animation.blend'))
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
SOURCE = pathlib.Path(args.source).resolve()
SAMPLES = pathlib.Path(args.samples).resolve()
OUTPUT = pathlib.Path(args.output).resolve()
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
REPORT = OUTPUT.parent / 'animation-mother-report.json'
sha = lambda data: hashlib.sha256(data).hexdigest()
source_sha = sha(SOURCE.read_bytes())
sample_bytes = SAMPLES.read_bytes()
sample_sha = sha(sample_bytes)
payload = json.loads(sample_bytes)
bones = payload['bones']
takes = payload.get('actions', payload.get('clips', []))
assert len(bones) == 22, ('Expected original 22 bones', len(bones))
assert {take['name'] for take in takes} == {'Idle', 'Walk', 'Slash'}
FPS = int(payload.get('fps', payload.get('sampleFPS', 60)))
assert FPS > 0
names = [bone['name'] for bone in bones]
parents = [bone['parent'] for bone in bones]
assert len(set(names)) == 22
assert all(parent < index for index, parent in enumerate(parents))


def mat4(values):
    """Three column-major Matrix4 -> mathutils row-major Matrix."""
    return Matrix([values[row::4] for row in range(4)])


def inverse_for(index):
    bone = bones[index]
    values = bone.get('inverse', bone.get('bindInverse'))
    if values is None:
        values = payload['boneInverses'][index]
    return mat4(values)


C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
CI = C.inverted()
bind_inverses = [inverse_for(index) for index in range(22)]

bpy.ops.wm.read_factory_settings(use_empty=True)
with bpy.data.libraries.load(str(SOURCE), link=True, relative=True) as (available, linked):
    rig_names = [name for name in available.objects if name == '林砚H34_RIG']
    mesh_names = [name for name in available.objects if name == '林砚H34_成品拓扑_蒙皮身体' or name.startswith('凤刃_独立_')]
    assert len(rig_names) == 1 and len(mesh_names) == 4, (rig_names, mesh_names)
    linked.objects = rig_names + mesh_names
source_objects = {obj.name: obj for obj in linked.objects if obj}
source_rig = source_objects['林砚H34_RIG']
collection = bpy.data.collections.new('H35_ACTIONS_LINKED_H34_MESH')
bpy.context.scene.collection.children.link(collection)

# Local editable rig, preserving the exact existing edit-bone rest matrices.
arm = source_rig.copy()
arm.data = source_rig.data.copy()
arm.name = '林砚H35_可编辑22骨动作'
arm.data.name = '林砚H35_22骨_034原bind'
arm.animation_data_clear()
arm.parent = None
arm.matrix_world = Matrix.Identity(4)
collection.objects.link(arm)
assert set(arm.data.bones.keys()) == set(names)
for bone in arm.pose.bones:
    bone.rotation_mode = 'QUATERNION'
    bone.matrix_basis = Matrix.Identity(4)

objects = []
for name in mesh_names:
    old = source_objects[name]
    new = old.copy()
    assert new.data is old.data and new.data.library is not None
    new.name = name.replace('H34', 'H35')
    new.animation_data_clear()
    world = old.matrix_world.copy()
    new.parent = arm
    new.parent_type = 'OBJECT'
    new.matrix_world = world
    for modifier in list(new.modifiers):
        new.modifiers.remove(modifier)
    modifier = new.modifiers.new('H35动作_034链接网格', 'ARMATURE')
    modifier.object = arm
    modifier.use_vertex_groups = True
    modifier.use_deform_preserve_volume = False
    collection.objects.link(new)
    new.hide_viewport = False
    new.hide_render = False
    objects.append(new)

# Existing H34 sword vertices are rest-space rigid hand meshes. If supplied,
# apply the runtime fixed local sword orientation on the local Object only;
# never rotate or edit linked mesh datablocks or move the source H34 grip.
socket = payload.get('swordSocket')
socket_report = {'provided': bool(socket), 'fixedLocalObjectCompensation': False}
if socket:
    wrist_index = names.index('rightWrist')
    bind_wrist = bind_inverses[wrist_index].inverted().translation
    offset = Vector(socket.get('position', [0, -.035, .015]))
    q = socket.get('quaternion')
    if q is None:
        from mathutils import Euler
        rotation = Euler(socket.get('rotation', [.11, -.15, -.10]), 'XYZ').to_matrix().to_4x4()
    else:
        rotation = Quaternion((q[3], q[0], q[1], q[2])).to_matrix().to_4x4()
    scale = Matrix.Diagonal(Vector(socket.get('scale', [1, 1, 1]) + [1]))
    pivot = C @ (bind_wrist + offset)
    compensation = Matrix.Translation(pivot) @ C @ rotation @ scale @ CI @ Matrix.Translation(-pivot)
    for obj in objects:
        if obj.name.startswith('凤刃_独立_'):
            obj.matrix_world = compensation @ obj.matrix_world
    socket_report = {'provided': True, 'fixedLocalObjectCompensation': True, 'sourcePivotBlender': list(pivot), 'quaternionXYZW': q, 'scale': socket.get('scale', [1, 1, 1]), 'meshDataEdited': False}

scene = bpy.context.scene
scene.render.fps = FPS
scene.render.fps_base = 1
scene.frame_start = 1
scene.world = bpy.data.worlds.new('H35动作母版_默认世界')
scene.world.color = (.12, .12, .12)
arm.animation_data_create()
actions = {}
action_reports = []
max_pose_error = 0.0


def sample_matrices(sample):
    return sample.get('bones', sample.get('boneWorldMatrices', sample.get('worldMatrices')))


def desired_pose(sample):
    matrices = sample_matrices(sample)
    assert matrices is not None and len(matrices) == 22
    result = {}
    for index, name in enumerate(names):
        # Exact same mapping as the H34 authoring builder:
        # C * boneWorld * bindInverse * C^-1 * editBone.matrix_local.
        deformation = C @ mat4(matrices[index]) @ bind_inverses[index] @ CI
        result[name] = deformation @ arm.data.bones[name].matrix_local
    return result


for take in takes:
    action = bpy.data.actions.new(take['name'])
    action.use_fake_user = True
    action['source_pose_samples_sha256'] = sample_sha
    action['duration_seconds'] = take['duration']
    action['source'] = 'H35 Three local animation sampled without rendering'
    arm.animation_data.action = action
    previous_quaternions = {}
    for sample in take['samples']:
        frame = 1 + sample['time'] * FPS
        target = desired_pose(sample)
        for index, name in enumerate(names):
            data_bone = arm.data.bones[name]
            parent_index = parents[index]
            kwargs = {}
            if parent_index >= 0:
                parent_name = names[parent_index]
                kwargs = {'parent_matrix': target[parent_name], 'parent_matrix_local': arm.data.bones[parent_name].matrix_local}
            # Solve the editable local basis directly to avoid dependency-graph
            # ordering or previous-sample parent matrices affecting keyframes.
            basis = data_bone.convert_local_to_pose(target[name], data_bone.matrix_local, invert=True, **kwargs)
            bone = arm.pose.bones[name]
            bone.matrix_basis = basis
            q = bone.rotation_quaternion.copy()
            if name in previous_quaternions and q.dot(previous_quaternions[name]) < 0:
                q.negate()
                bone.rotation_quaternion = q
            previous_quaternions[name] = q
            bone.keyframe_insert(data_path='location', frame=frame, group=name)
            bone.keyframe_insert(data_path='rotation_quaternion', frame=frame, group=name)
            bone.keyframe_insert(data_path='scale', frame=frame, group=name)
    for curve in action.fcurves:
        for key in curve.keyframe_points:
            key.interpolation = 'LINEAR'
    # Keep all clips discoverable, but muted while a single Action is edited.
    track = arm.animation_data.nla_tracks.new()
    track.name = take['name'] + '_已存档_编辑时静音'
    strip = track.strips.new(take['name'], 1, action)
    strip.blend_type = 'REPLACE'
    strip.extrapolation = 'NOTHING'
    track.mute = True
    actions[take['name']] = action

    # Validate each actual sample through Blender evaluation, not just the
    # algebra used to insert local keys. Float32 evaluation has small rounding.
    validation = []
    for sample in take['samples']:
        frame = 1 + sample['time'] * FPS
        scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
        bpy.context.view_layer.update()
        target = desired_pose(sample)
        error = max(abs(arm.pose.bones[name].matrix[row][col] - target[name][row][col]) for name in names for row in range(4) for col in range(4))
        max_pose_error = max(max_pose_error, error)
        validation.append({'time': sample['time'], 'frame': frame, 'maxBoneMatrixAbsError': error})
    action_reports.append({'name': take['name'], 'duration': take['duration'], 'samples': len(take['samples']), 'curves': len(action.fcurves), 'frameStart': 1, 'frameEnd': 1 + take['duration'] * FPS, 'validation': validation, 'maxBoneMatrixAbsError': max(x['maxBoneMatrixAbsError'] for x in validation)})

assert max_pose_error < 2e-5, ('Blender pose sample fidelity failed', max_pose_error)
arm.animation_data.action = actions['Slash']
slash = next(take for take in takes if take['name'] == 'Slash')
hit_progress = payload.get('hitProgress', .44)
preview_frame = 1 + slash['duration'] * hit_progress * FPS
scene.frame_end = math.ceil(1 + max(take['duration'] for take in takes) * FPS)
scene.frame_set(math.floor(preview_frame), subframe=preview_frame - math.floor(preview_frame))
arm.show_in_front = True
arm['asset_role'] = 'H35 animation mother: H34 mesh data linked, 22 bones/actions locally editable'
arm['source_mesh_library'] = '../hero-034/linyan-h34.blend'
arm['pose_samples_sha256'] = sample_sha
arm['preview_action'] = 'Slash'
arm['preview_progress'] = hit_progress
arm['animation_mapping'] = 'C * ThreeBoneWorld * originalBindInverse * C^-1 * BlenderRestBone'

# A useful saved viewport without any render or GPU work in this script.
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.shading.type = 'SOLID'
            area.spaces.active.shading.color_type = 'TEXTURE'
            area.spaces.active.region_3d.view_location = Vector((0, 0, .8))
            area.spaces.active.region_3d.view_distance = 3.8

# Store the direct mesh library reference relative to the H35 output folder.
for library in bpy.data.libraries:
    if pathlib.Path(bpy.path.abspath(library.filepath)).resolve() == SOURCE:
        library.filepath = bpy.path.relpath(str(SOURCE), start=str(OUTPUT.parent))
assert sha(SOURCE.read_bytes()) == source_sha, 'H34 source changed while generating animation mother'
assert sha(SAMPLES.read_bytes()) == sample_sha, 'Pose samples changed while generating animation mother'
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
for obj in objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT), compress=True, relative_remap=False)

report = {'kind': 'CPU Blender editable animation mother; no render, no mesh GLB export', 'blender': bpy.app.version_string, 'output': str(OUTPUT), 'outputBytes': OUTPUT.stat().st_size, 'outputSha256': sha(OUTPUT.read_bytes()), 'sourceH34Blend': str(SOURCE), 'sourceH34Sha256': source_sha, 'poseSamples': str(SAMPLES), 'poseSamplesSha256': sample_sha, 'fps': FPS, 'bones': names, 'boneCount': len(names), 'meshObjects': [{'object': obj.name, 'mesh': obj.data.name, 'meshLibrary': obj.data.library.filepath, 'meshLinked': obj.data.library is not None, 'vertices': len(obj.data.vertices), 'vertexGroups': len(obj.vertex_groups)} for obj in objects], 'localArmature': arm.data.library is None, 'localObjects': all(obj.library is None for obj in objects), 'allMeshDataLinked': all(obj.data.library is not None for obj in objects), 'socket': socket_report, 'actions': action_reports, 'maxBoneMatrixAbsError': max_pose_error, 'preview': {'action': 'Slash', 'progress': hit_progress, 'frame': preview_frame}, 'sourceUnchanged': sha(SOURCE.read_bytes()) == source_sha, 'samplesUnchanged': sha(SAMPLES.read_bytes()) == sample_sha}
REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print('H35_ANIMATION_MOTHER_RESULT ' + json.dumps({key: report[key] for key in ['output', 'outputBytes', 'boneCount', 'localArmature', 'localObjects', 'allMeshDataLinked', 'maxBoneMatrixAbsError', 'preview']}, ensure_ascii=False))
