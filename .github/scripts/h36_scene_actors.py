"""Append the unchanged H35 actors into an authored Blender scene (no render).

Run from Blender's Python console or another scene-building script::

    import sys
    sys.path.insert(0, REPO + '/.github/scripts')
    from h36_scene_actors import append_linyan, append_enemy, set_hero_pose
    hero = append_linyan()
    hero.place(game_position=(-3.2, .0656919404864311, -4.2), game_yaw=-.6)
    set_hero_pose(hero, 'Idle', phase=0)
    foe = append_enemy()
    foe.place(game_position=(2.8, .03, -6.6), game_yaw=-2.06)

For contact diagnosis, place the SAME 1:1 hero at (1.58, .714, -7), yaw=1.1,
then set_hero_pose(hero, 'Slash', phase=.44). No camera, lights or gameplay is
created/changed. Poses freeze by default, so multiple instances can display
different phases without fighting over Blender's global timeline.
"""
from dataclasses import dataclass
import math
from pathlib import Path

import bpy

REPO = Path(__file__).resolve().parents[2]
GAME = REPO / 'fengming-v2-scene-a'
ASSETS = GAME / 'assets/actors-036-review'
HERO_MOTHER = GAME / 'assets/hero-035/linyan-h35-animation.blend'
HERO_COLLECTION = 'H35_ACTIONS_LINKED_H34_MESH'
ENEMY_GLB = ASSETS / 'enemy-h35-existing.glb'
FPS = 60
HERO_DURATIONS = {'Idle': 2., 'Walk': .8, 'Slash': .78}
ENEMY_DURATIONS = {'EnemyIdle': 2., 'EnemyHit': .34}
SPAWN = (-3.2, .0656919404864311, -4.2)


def game_to_blender(position):
    """Three world/actor-local (x,y,z) -> Blender (x,-z,y), metres, scale=1."""
    x, y, z = position
    return (x, -z, y)


@dataclass
class ActorHandle:
    root: object
    collection: object
    armature: object
    meshes: list
    actions: dict
    durations: dict
    frame_start: float = 1.

    def place(self, game_position, game_yaw=0):
        """Set only the outer actor transform; never modify rig/rest/mesh scale."""
        self.root.location = game_to_blender(game_position)
        self.root.rotation_mode = 'XYZ'
        self.root.rotation_euler = (0., 0., float(game_yaw))
        self.root.scale = (1., 1., 1.)
        self.root['game_position_xyz'] = list(game_position)
        self.root['game_yaw_y'] = float(game_yaw)
        return self

    def pose(self, action='Idle', phase=0., freeze=True):
        return set_actor_pose(self, action, phase, freeze=freeze)


def _new_root(collection, name, objects):
    root = bpy.data.objects.new(name, None)
    root.empty_display_type = 'PLAIN_AXES'
    root.empty_display_size = .2
    collection.objects.link(root)
    # Parent only original top-level Objects. In particular the sword Objects
    # remain children of the rig with their existing fixed-socket compensation.
    for obj in objects:
        if obj.parent is None:
            world = obj.matrix_world.copy()
            obj.parent = root
            obj.matrix_world = world
    root['h36_review_only'] = True
    root['coordinate_mapping'] = 'Blender=(game.x,-game.z,game.y); yaw about Blender +Z'
    root['scale_metres'] = 1.
    return root


def _actions_from_rig(armature, labels):
    found = {}
    data = armature.animation_data
    if data:
        candidates = [data.action] + [strip.action for track in data.nla_tracks for strip in track.strips]
        for action in candidates:
            if not action:
                continue
            for label in labels:
                if action.name == label or action.name.startswith(label + '.') or action.name.startswith(label + '_'):
                    found[label] = action
                    action.use_fake_user = True
        for track in data.nla_tracks:
            track.mute = True
    return found


def append_linyan(scene=None, name='H36_林砚_原H35标尺'):
    """Append H35's editable rig/actions; link its unchanged H34 mesh and atlas."""
    scene = scene or bpy.context.scene
    if scene is not bpy.context.scene:
        raise ValueError('append_linyan requires its scene to be the active bpy.context.scene')
    with bpy.data.libraries.load(str(HERO_MOTHER), link=False, relative=True) as (available, loaded):
        if HERO_COLLECTION not in available.collections:
            raise RuntimeError('H35 source collection missing: ' + HERO_COLLECTION)
        loaded.collections = [HERO_COLLECTION]
    collection = loaded.collections[0]
    collection.name = name + '_集合'
    scene.collection.children.link(collection)
    objects = list(collection.all_objects)
    armatures = [obj for obj in objects if obj.type == 'ARMATURE']
    if len(armatures) != 1:
        raise RuntimeError('Expected the original single H35 armature')
    armature = armatures[0]
    if len(armature.data.bones) != 22:
        raise RuntimeError('Original 22-bone interface changed')
    actions = _actions_from_rig(armature, HERO_DURATIONS)
    if set(actions) != set(HERO_DURATIONS):
        raise RuntimeError('Missing original H35 Idle/Walk/Slash actions: ' + str(list(actions)))
    root = _new_root(collection, name, objects)
    handle = ActorHandle(root, collection, armature, [obj for obj in objects if obj.type == 'MESH'], actions, dict(HERO_DURATIONS))
    root['source_mother'] = 'assets/hero-035/linyan-h35-animation.blend'
    root['source_mesh'] = 'assets/hero-034/linyan-h34.blend'
    root['reference_height'] = 1.485
    root['reference_mesh_triangles'] = 9351
    root['reference_bones'] = 22
    handle.place(SPAWN, -.6)
    set_hero_pose(handle, 'Idle', phase=0)
    return handle


def append_enemy(scene=None, name='H36_影煞_原H35标尺'):
    """Import a CPU-exact serialization of current createEnemy, without redesign."""
    scene = scene or bpy.context.scene
    if scene is not bpy.context.scene:
        raise ValueError('append_enemy requires its scene to be the active bpy.context.scene')
    if not ENEMY_GLB.exists():
        raise FileNotFoundError('Run node .github/scripts/h36-export-enemy.mjs first')
    # glTF import converts seconds to the current scene's frame rate.
    scene.render.fps = FPS
    scene.render.fps_base = 1.
    # glTF's importer may also allocate an unlinked BoneShape display mesh.
    # Take actual imported scene objects, never turn that gizmo into scenery.
    before_objects = set(scene.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=str(ENEMY_GLB), import_pack_images=True)
    objects = list(set(scene.objects) - before_objects)
    # Some Blender versions put their bone display icosphere in the scene.
    # It is an importer gizmo, absent from the GLB mesh; keep it unlinked.
    display_helpers = {bone.custom_shape for obj in objects if obj.type == 'ARMATURE'
                       for bone in obj.pose.bones if bone.custom_shape}
    for helper in display_helpers:
        helper.hide_render = True
        for old_collection in list(helper.users_collection):
            old_collection.objects.unlink(helper)
    objects = [obj for obj in objects if obj not in display_helpers]
    collection = bpy.data.collections.new(name + '_集合')
    scene.collection.children.link(collection)
    for obj in objects:
        for old_collection in list(obj.users_collection):
            old_collection.objects.unlink(obj)
        collection.objects.link(obj)
    armatures = [obj for obj in objects if obj.type == 'ARMATURE']
    if len(armatures) != 1:
        raise RuntimeError('Expected one actual enemy armature, got ' + str(len(armatures)))
    armature = armatures[0]
    actions = _actions_from_rig(armature, ENEMY_DURATIONS)
    # Blender glTF versions may store clips only as datablocks rather than NLA.
    for action in set(bpy.data.actions) - before_actions:
        for label in ENEMY_DURATIONS:
            if action.name == label or action.name.startswith(label + '.') or action.name.startswith(label + '_'):
                actions[label] = action
                action.use_fake_user = True
    if set(actions) != set(ENEMY_DURATIONS):
        raise RuntimeError('Missing original enemy clips: ' + str(list(actions)))
    root = _new_root(collection, name, objects)
    handle = ActorHandle(root, collection, armature, [obj for obj in objects if obj.type == 'MESH'], actions, dict(ENEMY_DURATIONS), 0.)
    root['source'] = 'sample/enemy.js; serialized read-only to assets/actors-036-review/enemy-h35-existing.glb'
    root['reference_bones'] = 19
    handle.place((2.8, .03, -6.6), -2.06)
    set_actor_pose(handle, 'EnemyIdle', phase=0)
    return handle


def set_actor_pose(actor, action, phase=0., *, freeze=True):
    """Select an actual archived action at normalized phase, 60fps.

    freeze=True copies evaluated local bases, then detaches the active action;
    all three original clips remain available on actor.actions/NLA. This permits
    an idle actor and a contact-pose actor in the same scene at the same frame.
    freeze=False leaves the action live for animation editing/playback.
    """
    if action not in actor.actions:
        raise KeyError(action)
    phase = max(0., min(1., float(phase)))
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.render.fps_base = 1.
    arm = actor.armature
    arm.animation_data_create()
    for track in arm.animation_data.nla_tracks:
        track.mute = True
    arm.animation_data.action = actor.actions[action]
    # Hero's authored mother is 1-based; standard glTF enemy clips are 0-based.
    frame = actor.frame_start + actor.durations[action] * phase * FPS
    scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
    bpy.context.view_layer.update()
    if freeze:
        local_bases = {bone.name: bone.matrix_basis.copy() for bone in arm.pose.bones}
        arm.animation_data.action = None
        for bone in arm.pose.bones:
            bone.matrix_basis = local_bases[bone.name]
        bpy.context.view_layer.update()
    actor.root['review_action'] = action
    actor.root['review_progress'] = phase
    actor.root['review_frame_60fps'] = frame
    actor.root['review_pose_frozen'] = bool(freeze)
    return actor


def set_hero_pose(hero, action='Idle', phase=0., *, freeze=True):
    """Idle phase0=frame1; Slash phase.44=frame21.592 (no rescale/re-aim)."""
    return set_actor_pose(hero, action, phase, freeze=freeze)


def relativize_libraries(destination_blend):
    """Call just before saving the NEW scene; never write source .blend files."""
    destination = Path(destination_blend).resolve()
    for library in bpy.data.libraries:
        absolute = Path(bpy.path.abspath(library.filepath)).resolve()
        library.filepath = bpy.path.relpath(str(absolute), start=str(destination.parent))

