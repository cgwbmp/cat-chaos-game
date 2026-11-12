"""Turns the sitting kitten model (a dense, textured, unrigged .glb) into the game's cat.

Run from the repo root (Blender 4.2 or newer; written against 5.3):

    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \\
        --python tools/blender/rig_sitting_cat.py -- --source cat.glb \\
        --out assets/shared/cat-source.glb [--renders DIR]

Then compress it for the game:

    pnpm optimize-glb assets/shared/cat-source.glb assets/shared/cat.glb

What it does:
  1. Shrinks the model from about 500,000 triangles to a few thousand.
  2. Replaces the texture by one flat color per face (the game uses vertex colors), and
     splits the faces into `fur` (orange, recolored by shop items) and `detail`.
  3. Scales the cat to the game's size and centers it on its own middle line.
  4. Adds a skeleton and the nine animation clips.

This is the sitting kitten. The game currently ships the one-skin cat made by
build_seamless_cat.py; run this script to switch back.

The model sits, and its hind legs are part of the body, so it cannot walk on four legs. It
moves the way a sitting toy would: it waddles, hops, and swats with a front paw.

Axes and pose notation: see rig_lib.py. Positions below are in "model units": the cat is
1 unit tall, on the ground, facing -Y, with its middle line on x = 0.
"""

import argparse
import colorsys
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rig_lib import animate, both, build_armature, export, make_materials, new_object, render_shots, wave  # noqa: E402

HEIGHT = 0.53  # meters, floor to ear tips: as tall as the paper cat of build_cat.py
MIDLINE_X = 0.08  # the source model's middle line (its tail pushes the bounding box off-center)
TARGET_TRIANGLES = 3000


def at(x, y, z):
    """A point given in model units, in meters."""
    return Vector((x, y, z)) * HEIGHT


# --- Mesh ------------------------------------------------------------------------------------
def load(source):
    """Imports the model as one mesh object in model units, plus its base color image."""
    bpy.ops.import_scene.gltf(filepath=source)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) > 1:
        with bpy.context.temp_override(active_object=meshes[0], selected_editable_objects=meshes, selected_objects=meshes):
            bpy.ops.object.join()
    cat = meshes[0]
    # Bake the import transform into the mesh, then center and scale it.
    cat.data.transform(Matrix.Scale(HEIGHT, 4) @ Matrix.Translation((-MIDLINE_X, 0, 0)) @ cat.matrix_world)
    cat.matrix_world = Matrix.Identity(4)

    image = None
    for material in cat.data.materials:
        for node in material.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image and any(link.to_socket.name == "Base Color" for link in node.outputs["Color"].links):
                image = node.image
    if image is None:
        raise RuntimeError("The model has no base color texture to take its colors from")
    return cat, image


def decimate(cat, triangles):
    # The file splits vertices along texture seams; weld them so the surface is closed again.
    # Decimation and automatic skin weights both need that.
    surface = bmesh.new()
    surface.from_mesh(cat.data)
    bmesh.ops.remove_doubles(surface, verts=surface.verts, dist=1e-5)
    surface.to_mesh(cat.data)
    surface.free()
    modifier = cat.modifiers.new("decimate", "DECIMATE")
    modifier.ratio = triangles / len(cat.data.polygons)
    cat.modifiers.new("triangles", "TRIANGULATE")
    evaluated = cat.evaluated_get(bpy.context.evaluated_depsgraph_get())
    return new_object("cat", bpy.data.meshes.new_from_object(evaluated))


def is_fur(color):
    hue, saturation, value = colorsys.rgb_to_hsv(*color)
    return 0.03 < hue < 0.13 and saturation > 0.45 and value > 0.3


def texture_sampler(source, image):
    """Returns color_at(point): the texture color of the detailed model's surface nearest to
    that point. Colors are the values stored in the image file, which is what the game shows."""
    mesh = source.data
    width, height = image.size
    pixels = list(image.pixels)
    uvs = [0.0] * (len(mesh.loops) * 2)
    mesh.uv_layers.active.data.foreach_get("uv", uvs)
    tree = BVHTree.FromPolygons([vertex.co for vertex in mesh.vertices], [tuple(polygon.vertices) for polygon in mesh.polygons])

    def color_at(point):
        polygon = mesh.polygons[tree.find_nearest(point)[2]]
        loops = range(polygon.loop_start, polygon.loop_start + polygon.loop_total)
        u = sum(uvs[loop * 2] for loop in loops) / polygon.loop_total
        v = sum(uvs[loop * 2 + 1] for loop in loops) / polygon.loop_total
        index = (int(v * height) % height * width + int(u * width) % width) * 4
        return pixels[index : index + 3]

    return color_at


def color_kind(color):
    """Which part of the cat a texture color belongs to. The texture is plain gray where the
    model was never painted (the back of the neck, the top of the tail, the underside)."""
    _hue, saturation, value = colorsys.rgb_to_hsv(*color)
    if saturation < 0.25 and 0.4 < value < 0.65:
        return "unpainted"
    if value < 0.3:
        return "dark"  # eyes, mouth
    return "fur" if is_fur(color) else "light"


def bake_colors(cat, source, image):
    """One color per face, taken from the detailed model's texture.

    Each face is sampled in its middle and at three points around it, and takes the color of
    the part (fur, light fur, eyes) that covers most of those; that keeps the eyes sharp.
    Orange faces become `fur`: they store how much darker they are than the base orange, so
    the game can tint the coat any color and keep the shading. Unpainted faces become plain
    fur. Returns the base orange.
    """
    color_at = texture_sampler(source, image)
    mesh = cat.data

    def sample(polygon):
        corners = [mesh.vertices[index].co for index in polygon.vertices]
        points = [polygon.center, *((polygon.center + corner) / 2 for corner in corners)]
        colors = [color for color in map(color_at, points) if color_kind(color) != "unpainted"]
        if not colors:
            return None
        kinds = [color_kind(color) for color in colors]
        main = max(kinds, key=kinds.count)  # on a tie, the kind nearest the middle
        if main == "light" and polygon.center.y > 0:
            return None  # the cat is light only in front; behind that, it is a faded edge of unpainted gray
        chosen = [color for color, kind in zip(colors, kinds) if kind == main]
        return tuple(sum(color[channel] for color in chosen) / len(chosen) for channel in range(3))

    face_colors = [sample(polygon) for polygon in mesh.polygons]
    fur_colors = sorted((color for color in face_colors if color and is_fur(color)), key=max, reverse=True)
    if not fur_colors:
        raise RuntimeError("Found no orange fur on the model")
    brightest = fur_colors[: max(1, len(fur_colors) // 5)]
    base = tuple(sum(color[channel] for color in brightest) / len(brightest) for channel in range(3))
    face_colors = [color or base for color in face_colors]

    fur, detail = make_materials(base)
    mesh.materials.clear()
    mesh.materials.append(fur)
    mesh.materials.append(detail)
    colors = mesh.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
    for polygon, color in zip(mesh.polygons, face_colors):
        furry = is_fur(color)
        polygon.material_index = 0 if furry else 1
        shown = tuple(min(1.0, color[channel] / base[channel]) for channel in range(3)) if furry else color
        for loop in polygon.loop_indices:
            colors.data[loop].color = (*shown, 1)
    mesh.color_attributes.active_color = colors
    for layer in list(mesh.uv_layers):
        mesh.uv_layers.remove(layer)
    mesh.shade_flat()
    return base, sum(1 for color in face_colors if is_fur(color))


# --- Skeleton --------------------------------------------------------------------------------
TAIL = [at(-0.05, 0.34, 0.06), at(-0.21, 0.33, 0.05), at(-0.36, 0.25, 0.05), at(-0.42, 0.1, 0.05), at(-0.4, -0.08, 0.05)]


def front_leg(side):
    return [at(0.083 * side, -0.13, 0.5), at(0.083 * side, -0.15, 0.27), at(0.083 * side, -0.165, 0.07), at(0.083 * side, -0.26, 0.02)]


def bone_plan():
    """(name, head, tail, parent). `body` stands upright under the cat: moving, tilting or
    scaling it moves, tilts or squashes the whole cat."""
    plan = [
        ("root", at(0, 0.08, 0), at(0, 0.08, 0.06), None),
        ("body", at(0, 0.08, 0), at(0, 0.08, 0.2), "root"),
        ("pelvis", at(0, 0.16, 0.14), at(0, 0.04, 0.38), "body"),
        ("spine", at(0, 0.04, 0.38), at(0, -0.08, 0.58), "pelvis"),
        ("neck", at(0, -0.08, 0.58), at(0, -0.12, 0.67), "spine"),
        ("head", at(0, -0.12, 0.67), at(0, -0.32, 0.8), "neck"),
    ]
    parent = "pelvis"
    for index, (start, end) in enumerate(zip(TAIL, TAIL[1:]), start=1):
        plan.append((f"tail{index}", start, end, parent))
        parent = f"tail{index}"
    for side, suffix in ((1, "L"), (-1, "R")):
        parent = "spine"
        points = front_leg(side)
        for part, (start, end) in zip(("upper", "lower", "paw"), zip(points, points[1:])):
            plan.append((f"front_{part}.{suffix}", start, end, parent))
            parent = f"front_{part}.{suffix}"
    return plan


# Where the game puts the hat and the collar: (name, parent bone, position, direction, diameter).
ANCHORS = [
    ("hat_anchor", "head", at(0, -0.17, 0.925), (0, 0, 1), 0.2 * HEIGHT),
    ("collar_anchor", "neck", at(0, -0.1, 0.605), (0, -0.45, 0.9), 0.39 * HEIGHT),
]


def skin(cat, armature):
    """Binds the mesh with Blender's automatic weights."""
    with bpy.context.temp_override(
        active_object=armature, object=armature, selected_objects=[cat, armature], selected_editable_objects=[cat, armature]
    ):
        bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    weighted = sum(1 for vertex in cat.data.vertices if vertex.groups)
    if weighted < len(cat.data.vertices):
        raise RuntimeError(f"Automatic weights failed: only {weighted} of {len(cat.data.vertices)} vertices are bound")


# --- Animation -------------------------------------------------------------------------------
def tail_flick(pose, phase, amount):
    pose["tail3"] = [("Z", amount * wave(phase))]
    pose["tail4"] = [("Z", amount * 1.5 * wave(phase, -0.15))]


def idle(p):
    breath = wave(p)
    pose = {
        "scale": (1 - 0.006 * breath, 1 + 0.012 * breath),
        "spine": [("X", 1.5 * breath)],
        "head": [("Z", 9 * wave(p)), ("Y", 3 * wave(p, 0.2))],
    }
    tail_flick(pose, p * 2, 9)
    return pose


def walk(p):
    """A waddle: the weight rocks from side to side and the front paw on the light side steps."""
    sway = wave(p)
    pose = {
        "body": [("Y", 6 * sway), ("X", 4)],
        "move": (0, 0, 0.012 * HEIGHT * abs(sway)),
        "head": [("Y", -5 * sway), ("Z", 4 * sway), ("X", 2 * wave(p * 2))],
    }
    for suffix, lifted in (("R", max(0.0, sway)), ("L", max(0.0, -sway))):
        pose[f"front_upper.{suffix}"] = [("X", -26 * lifted)]
        pose[f"front_lower.{suffix}"] = [("X", 34 * lifted)]
    tail_flick(pose, p, 12)
    return pose


def run(p):
    """Hops: up and forward in the first half of the cycle, a squashed landing in the second."""
    air = max(0.0, wave(p))
    ground = max(0.0, -wave(p))
    pose = {
        "move": (0, 0, 0.16 * HEIGHT * air),
        "scale": (1 + 0.1 * ground - 0.05 * air, 1 - 0.16 * ground + 0.1 * air),
        "body": [("X", 14 * air - 5 * ground)],
        "head": [("X", -10 * air + 8 * ground)],
        "tail1": [("Y", 26 * air)],
    }
    both(pose, "front_upper", [("X", -46 * air + 8 * ground)])
    both(pose, "front_lower", [("X", 36 * air)])
    return pose


def jump(_p):
    pose = {"scale": (0.94, 1.12), "body": [("X", 16)], "head": [("X", -12)], "tail1": [("Y", 22)]}
    both(pose, "front_upper", [("X", -56)])
    both(pose, "front_lower", [("X", 22)])
    return pose


def land(p):
    amount = (1 - p) ** 2
    pose = {"scale": (1 + 0.14 * amount, 1 - 0.24 * amount), "head": [("X", 10 * amount)]}
    both(pose, "front_upper", [("X", -12 * amount)])
    return pose


def swat(p):
    reach = math.sin(math.pi * min(1.0, p / 0.85)) ** 0.8 if p < 0.85 else 0.0
    sweep = max(0.0, min(1.0, (p - 0.25) / 0.4))  # the right paw crosses from right to left
    return {
        "front_upper.R": [("X", -100 * reach), ("Z", (-20 + 56 * sweep) * reach)],
        "front_lower.R": [("X", 30 * reach * (1 - sweep))],
        "body": [("Y", 4 * reach)],  # lean on the left side while the right paw is up
        "spine": [("X", 6 * reach), ("Z", 8 * sweep * reach)],
        "head": [("Z", 10 * sweep * reach), ("X", 4 * reach)],
    }


def pounce(_p):
    pose = {
        "move": (0, 0, 0.03 * HEIGHT),
        "scale": (0.92, 1.14),
        "body": [("X", 28)],
        "head": [("X", -24)],
        "tail1": [("Y", 30)],
    }
    both(pose, "front_upper", [("X", -76)])
    both(pose, "front_lower", [("X", 10)])
    return pose


def loaf(p):
    """Dozing off where it sits: head sunk to the chest, slow breathing."""
    breath = wave(p)
    return {
        "scale": (1.02 - 0.008 * breath, 0.97 + 0.012 * breath),
        "spine": [("X", 5 + 1.2 * breath)],
        "neck": [("X", 28)],
        "head": [("X", 20 + 2 * breath), ("Y", 6)],
    }


def celebrate(p):
    beat = wave(p * 2)
    hop = abs(beat)
    pose = {
        "move": (0, 0, 0.1 * HEIGHT * hop),
        "scale": (1 - 0.04 * hop, 1 + 0.08 * hop),
        "head": [("Y", 12 * beat), ("X", -8)],
        "front_upper.L": [("X", -88 * max(0.0, beat))],
        "front_upper.R": [("X", -88 * max(0.0, -beat))],
    }
    tail_flick(pose, p * 4, 20)
    return pose


# name: (pose function of 0..1, frames, loops)
CLIPS = {
    "idle": (idle, 48, True),
    "walk": (walk, 20, True),
    "run": (run, 10, True),
    "jump": (jump, 2, False),
    "land": (land, 5, False),
    "swat": (swat, 7, False),
    "pounce": (pounce, 2, False),
    "loaf": (loaf, 48, True),
    "celebrate": (celebrate, 48, True),
}


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--renders")
    args = parser.parse_args(argv)

    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj)
    source, image = load(os.path.abspath(args.source))
    cat = decimate(source, TARGET_TRIANGLES)
    base, fur_faces = bake_colors(cat, source, image)
    bpy.data.objects.remove(source)
    armature = build_armature(bone_plan(), ANCHORS)
    skin(cat, armature)
    actions = animate(armature, CLIPS, "body", "body")
    print(
        f"CAT triangles={len(cat.data.polygons)} fur_faces={fur_faces} "
        f"fur_color={[round(channel, 2) for channel in base]} bones={len(armature.data.bones)} clips={len(actions)}"
    )
    export(args.out, cat, armature)

    if args.renders:
        front, side, mid = (0.8, -1.35, 0.6), (1.6, 0, 0.35), (0, 0, 0.27)
        shots = [("rest", None, 0, front, mid), ("rest-side", None, 0, side, mid), ("rest-back", None, 0, (-0.8, 1.35, 0.6), mid),
                 ("walk", "walk", 5, front, mid), ("run", "run", 2, side, mid), ("run-land", "run", 7, side, mid),
                 ("swat", "swat", 3, front, mid), ("jump", "jump", 1, side, mid), ("pounce", "pounce", 1, side, mid),
                 ("land", "land", 0, front, mid), ("loaf", "loaf", 0, front, mid), ("celebrate", "celebrate", 6, front, mid)]
        render_shots(armature, actions, shots, args.renders, "body", "body")


main()
