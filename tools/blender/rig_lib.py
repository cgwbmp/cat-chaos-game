"""Shared by the cat scripts in this folder: skeleton, poses, animation clips, glTF export
and preview renders.

Conventions: Blender axes with Z up; the cat faces -Y and +X is its left; units are meters.

A pose is {bone: [(axis, degrees), ...]} in the cat's own axes, whatever way the bone points
(or a ready 3x3 rotation matrix in the same axes):
  X (pitch): positive tips an upright or forward-pointing part forward/down and swings a
             hanging leg backward
  Z (yaw):   positive turns toward the cat's left
  Y (roll):  positive rolls the cat's left side down
plus two optional entries:
  "move":  how far the whole body is shifted, (x, y, z)
  "scale": squash and stretch of the whole body, (sideways, up)
"""

import math

import bpy
from mathutils import Matrix, Vector

FPS = 24
AXES = {"X": Vector((1, 0, 0)), "Y": Vector((0, 1, 0)), "Z": Vector((0, 0, 1))}
TAU = math.tau


def wave(phase, offset=0.0):
    return math.sin(TAU * (phase + offset))


def both(pose, name, turns):
    """Same pose for the left and right bone; yaw and roll are mirrored on the right."""
    pose[f"{name}.L"] = turns
    pose[f"{name}.R"] = [(axis, degrees if axis == "X" else -degrees) for axis, degrees in turns]


def new_object(name, data):
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def build_armature(plan, anchors=()):
    """Skeleton from a plan of (name, head, tail, parent) rows.

    `anchors` are extra bones that carry no mesh: (name, parent, position, direction, size).
    The game attaches the hat and the collar to them; `size` (the accessory's diameter) is
    exported with the bone.
    """
    armature = new_object("cat-rig", bpy.data.armatures.new("cat-rig"))
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="EDIT")
    bones = armature.data.edit_bones
    for name, head, tail, parent in plan:
        bone = bones.new(name)
        bone.head, bone.tail = head, tail
        if parent:
            bone.parent = bones[parent]
    for name, parent, position, direction, _size in anchors:
        bone = bones.new(name)
        bone.head = position
        bone.tail = Vector(position) + Vector(direction).normalized() * 0.04
        bone.parent = bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    for name in ["root", *(anchor[0] for anchor in anchors)]:
        armature.data.bones[name].use_deform = False
    for pose_bone in armature.pose.bones:
        pose_bone.rotation_mode = "QUATERNION"
    for name, _parent, _position, _direction, size in anchors:
        armature.pose.bones[name]["size"] = size
    return armature


def apply_pose(armature, pose, move_bone, scale_bone=None):
    for pose_bone in armature.pose.bones:
        rest = pose_bone.bone.matrix_local.to_3x3()
        turns = pose.get(pose_bone.name, [])
        turn = turns if isinstance(turns, Matrix) else Matrix.Identity(3)
        for axis, degrees in [] if isinstance(turns, Matrix) else turns:
            turn = Matrix.Rotation(math.radians(degrees), 3, AXES[axis]) @ turn
        # A turn about the cat's axes, expressed in the bone's own frame.
        pose_bone.rotation_quaternion = (rest.inverted() @ turn @ rest).to_quaternion()
        pose_bone.location = (0, 0, 0)
        pose_bone.scale = (1, 1, 1)
    mover = armature.pose.bones[move_bone]
    mover.location = mover.bone.matrix_local.to_3x3().inverted() @ Vector(pose.get("move", (0, 0, 0)))
    if scale_bone:
        # The scale bone stands upright, so its own Y axis is the cat's up.
        sideways, up = pose.get("scale", (1, 1))
        armature.pose.bones[scale_bone].scale = (sideways, up, sideways)


def animate(armature, clips, move_bone, scale_bone=None):
    """One action per clip, each on its own NLA track (the exporter writes one clip per track).

    `clips` is {name: (pose function of 0..1, frames, loops)}.
    """
    data = armature.animation_data_create()
    actions = {}
    for name, (pose_at, frames, loops) in clips.items():
        action = bpy.data.actions.new(name)
        data.action = action
        for frame in range(frames + 1):
            # A looping clip ends on its first pose; a one-shot ends on its last.
            apply_pose(armature, pose_at(frame / frames if loops or frames > 2 else 0), move_bone, scale_bone)
            for pose_bone in armature.pose.bones:
                pose_bone.keyframe_insert("rotation_quaternion", frame=frame)
            armature.pose.bones[move_bone].keyframe_insert("location", frame=frame)
            if scale_bone:
                armature.pose.bones[scale_bone].keyframe_insert("scale", frame=frame)
        actions[name] = action
    data.action = None
    for name, action in actions.items():
        track = data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 0, action)
    apply_pose(armature, {}, move_bone, scale_bone)
    return actions


def make_materials(fur_color):
    """`fur` is plain and tinted by the game (its color here is the default tint); `detail`
    shows the vertex colors as they are."""

    def principled(name):
        material = bpy.data.materials.new(name)
        material.use_nodes = True
        bsdf = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Roughness"].default_value = 1
        return material, bsdf

    fur, fur_bsdf = principled("fur")
    fur_bsdf.inputs["Base Color"].default_value = (*fur_color, 1)
    detail, detail_bsdf = principled("detail")
    attribute = detail.node_tree.nodes.new("ShaderNodeVertexColor")
    attribute.layer_name = "Color"
    detail.node_tree.links.new(attribute.outputs["Color"], detail_bsdf.inputs["Base Color"])
    return fur, detail


def export(path, cat, armature):
    for obj in bpy.context.scene.objects:
        obj.select_set(obj in (cat, armature))
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_force_sampling=True,
        export_vertex_color="ACTIVE",
        export_all_vertex_colors=False,
        export_materials="EXPORT",
        export_texcoords=False,
        export_skins=True,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
    )


def setup_render():
    scene = bpy.context.scene
    scene.render.resolution_x = 720
    scene.render.resolution_y = 560
    scene.render.fps = FPS
    scene.render.image_settings.file_format = "PNG"
    # The game's cat materials show colors as stored, without color conversion; so do these.
    scene.view_settings.view_transform = "Raw"
    # Ambient light, like the rooms have.
    for node in scene.world.node_tree.nodes if scene.world and scene.world.node_tree else ():
        if node.type == "BACKGROUND":
            node.inputs["Color"].default_value = (0.45, 0.45, 0.45, 1)
    for name, energy, angles in (("sun", 3.5, (50, 0, -35)), ("fill", 1.2, (60, 0, 140))):
        light = new_object(name, bpy.data.lights.new(name, "SUN"))
        light.data.energy = energy
        light.rotation_euler = [math.radians(angle) for angle in angles]
    camera = new_object("camera", bpy.data.cameras.new("camera"))
    camera.data.lens = 60
    scene.camera = camera
    return camera


def render(camera, path, eye, target):
    camera.location = eye
    direction = Vector(target) - Vector(eye)
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def render_shots(armature, actions, shots, folder, move_bone, scale_bone=None):
    """Preview stills: `shots` are (label, clip or None for the rest pose, frame, eye, target)."""
    camera = setup_render()
    data = armature.animation_data
    for track in data.nla_tracks:
        track.mute = True
    for label, clip, frame, eye, target in shots:
        data.action = actions[clip] if clip else None
        if not clip:
            apply_pose(armature, {}, move_bone, scale_bone)
        bpy.context.scene.frame_set(frame)
        render(camera, f"{folder}/cat-{label}.png", eye, target)
