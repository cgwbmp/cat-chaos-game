"""Builds the game's cat: a low poly, four-legged cat with one continuous skin, and nine
animation clips.

Run from the repo root (Blender 4.2 or newer; written against 5.3):

    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \\
        --python tools/blender/build_seamless_cat.py -- --out assets/shared/cat-source.glb [--renders DIR]

Then compress it for the game:

    pnpm optimize-glb assets/shared/cat-source.glb assets/shared/cat.glb

The model is generated, so this script is its source. How the skin is made:
  1. The cat is described as a few round solids (ellipsoids and tapered tubes) that melt into
     each other where they meet: `skin_distance` tells how far any point is from that surface.
  2. OpenVDB (part of Blender) turns the surface into a dense mesh. Its left half is simplified
     to a few hundred flat faces and mirrored, so both sides match.
  3. The skin is one closed sheet with no seams between body parts, and it is bound to the
     skeleton with smooth weights, so it bends without opening up.
The eyes, the nose and the insides of the ears are painted on: the skin's faces are cut along
their outlines and the faces inside get the color.

Blender axes: Z up, the cat faces -Y, +X is the cat's left. Units are meters; the cat stands
on the ground at the origin. Everything below is written for a cat of full size; SIZE shrinks
the finished cat as a whole.
"""

import argparse
import math
import os
import sys

import bmesh
import bpy
import numpy as np
import openvdb
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rig_lib import TAU, animate, both, build_armature, export, make_materials, new_object, render_shots, wave  # noqa: E402

# Display colors. Vertex colors are exported as they are and the game multiplies them in
# directly, so these are the colors seen in the game. The coat is white here: the game tints
# the `fur` material (ginger by default, other colors from the shop).
FUR = (1.0, 1.0, 1.0)
FUR_DEFAULT = (0.96, 0.64, 0.36)
EAR_PINK = (0.99, 0.74, 0.72)
NOSE = (0.93, 0.5, 0.52)
EYE = (0.17, 0.13, 0.14)
GLINT = (1.0, 1.0, 1.0)

SIZE = 0.75  # the cat in the game, as a share of the size it is built at: 39 cm to the ear tips
VOXEL = 0.0025  # size of the cells the surface is first meshed with
TARGET_TRIANGLES = 1000

# --- Body plan -------------------------------------------------------------------------------
# Joint positions shared by the skin and the skeleton.
HIPS = Vector((0, 0.13, 0.245))
MID = Vector((0, 0.02, 0.248))
CHEST = Vector((0, -0.1, 0.262))
NECK = Vector((0, -0.17, 0.305))  # where the neck meets the head
HEAD = Vector((0, -0.225, 0.345))  # center of the head
HEAD_TIP = Vector((0, -0.345, 0.325))
TAIL = [Vector((0, 0.2, 0.27)), Vector((0, 0.27, 0.31)), Vector((0, 0.325, 0.38)), Vector((0, 0.35, 0.46)), Vector((0, 0.335, 0.54))]
# The left ear: the middle of its base (inside the head), its tip, and the way it opens.
EAR_BASE = HEAD + Vector((0.07, 0.01, 0.055))
EAR_TIP = HEAD + Vector((0.118, 0.02, 0.17))
EAR_FRONT = Vector((0.45, -1, 0))


def front_leg(side):
    return [
        Vector((0.068 * side, -0.105, 0.21)),  # shoulder
        Vector((0.072 * side, -0.11, 0.12)),  # elbow
        Vector((0.072 * side, -0.118, 0.05)),  # wrist
        Vector((0.072 * side, -0.158, 0.026)),  # toes
    ]


def hind_leg(side):
    return [
        Vector((0.08 * side, 0.115, 0.2)),  # hip joint
        Vector((0.092 * side, 0.088, 0.125)),  # knee
        Vector((0.092 * side, 0.145, 0.06)),  # hock
        Vector((0.092 * side, 0.105, 0.026)),  # toes
    ]


def bone_plan():
    """(name, head, tail, parent) for every bone. `.L` is the cat's left (+X). `body` stands
    upright under the cat: moving or scaling it moves or squashes the whole cat."""
    plan = [
        ("root", Vector((0, 0, 0)), Vector((0, 0, 0.08)), None),
        ("body", Vector((0, 0, 0)), Vector((0, 0, 0.2)), "root"),
        ("pelvis", HIPS, MID, "body"),
        ("spine", MID, CHEST, "pelvis"),
        ("neck", CHEST, NECK, "spine"),
        ("head", NECK, HEAD_TIP, "neck"),
    ]
    parent = "pelvis"
    for index, (start, end) in enumerate(zip(TAIL, TAIL[1:]), start=1):
        plan.append((f"tail{index}", start, end, parent))
        parent = f"tail{index}"
    for side, suffix in ((1, "L"), (-1, "R")):
        for prefix, points, parent in (("front", front_leg(side), "spine"), ("hind", hind_leg(side), "pelvis")):
            for part, (head, tail) in zip(("upper", "lower", "paw"), zip(points, points[1:])):
                name = f"{prefix}_{part}.{suffix}"
                plan.append((name, head, tail, parent))
                parent = name
    return plan


# --- Skin shape ------------------------------------------------------------------------------
# Each solid is a function of an (N, 3) array of points that returns their distance from the
# solid's surface, negative inside. `union` joins solids with a rounded fillet between them.
def ellipsoid(p, center, radii):
    radii = np.asarray(radii, dtype=float)
    q = (p - np.asarray(center)) / radii
    k0 = np.linalg.norm(q, axis=1)
    k1 = np.linalg.norm(q / radii, axis=1)
    return np.where(k1 > 1e-9, k0 * (k0 - 1) / np.maximum(k1, 1e-9), -radii.min())


def tube(p, start, end, start_radius, end_radius):
    """A tube with round ends that tapers from one radius to the other."""
    start, axis = np.asarray(start, dtype=float), np.asarray(end, dtype=float) - np.asarray(start, dtype=float)
    t = np.clip((p - start) @ axis / (axis @ axis), 0, 1)
    return np.linalg.norm(p - start - t[:, None] * axis, axis=1) - (start_radius + (end_radius - start_radius) * t)


def union(fillet, first, *others):
    result = first
    for other in others:
        blend = np.maximum(fillet - np.abs(result - other), 0) / fillet
        result = np.minimum(result, other) - blend * blend * fillet / 4
    return result


def curve(points, steps):
    """A smooth line through the points (Catmull-Rom), `steps` pieces between each two."""
    padded = [points[0], *points, points[-1]]
    line = []
    for a, b, c, d in zip(padded, padded[1:], padded[2:], padded[3:]):
        for step in range(steps):
            t = step / steps
            line.append(0.5 * ((2 * b) + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - 3 * c + d - a) * t**3))
    return [*line, points[-1]]


def ear(p):
    """The left ear: a cone, flattened front to back."""
    flat = 0.55  # thickness as a share of the width
    up = (EAR_TIP - EAR_BASE).normalized()
    front = (EAR_FRONT - up * EAR_FRONT.dot(up)).normalized()
    across = up.cross(front)
    offset = p - np.asarray(EAR_BASE)
    # The ear's own axes, with its thickness stretched so that a round cone comes out flat.
    local = np.stack([offset @ np.asarray(across), offset @ np.asarray(front) / flat, offset @ np.asarray(up)], axis=1)
    return tube(local, (0, 0, 0), (0, 0, (EAR_TIP - EAR_BASE).length), 0.062, 0.01) * flat


def head_distance(p):
    mirrored = p * (-1, 1, 1)
    cheek = HEAD + Vector((0.07, -0.028, -0.03)), (0.062, 0.062, 0.052)
    skull = union(
        0.03,
        ellipsoid(p, HEAD, (0.128, 0.112, 0.105)),
        ellipsoid(p, *cheek),
        ellipsoid(mirrored, *cheek),
        ellipsoid(p, HEAD + Vector((0, -0.085, -0.032)), (0.042, 0.034, 0.028)),  # muzzle
    )
    return union(0.012, skull, ear(p), ear(mirrored))


def legs_distance(p):
    """The two left legs."""
    shoulder, elbow, wrist, _toes = front_leg(1)
    front = union(
        0.02,
        tube(p, shoulder, elbow, 0.05, 0.043),
        tube(p, elbow, wrist, 0.043, 0.038),
        ellipsoid(p, (0.072, -0.136, 0.028), (0.044, 0.058, 0.034)),  # paw
    )
    _hip, knee, hock, _toes = hind_leg(1)
    hind = union(
        0.02,
        ellipsoid(p, (0.084, 0.105, 0.178), (0.06, 0.086, 0.08)),  # thigh
        tube(p, knee, hock, 0.046, 0.037),
        tube(p, hock, (0.092, 0.13, 0.032), 0.037, 0.036),
        ellipsoid(p, (0.092, 0.118, 0.028), (0.044, 0.06, 0.034)),  # paw
    )
    return np.minimum(front, hind)


TAIL_LINE = curve(TAIL, 4)


def skin_distance(p):
    """Distance of each point from the cat's skin, negative inside."""
    mirrored = p * (-1, 1, 1)
    torso = union(0.04, tube(p, (0, 0.13, 0.245), (0, -0.09, 0.252), 0.108, 0.1), tube(p, (0, -0.1, 0.262), (0, -0.175, 0.31), 0.095, 0.085))
    pieces = list(zip(TAIL_LINE, TAIL_LINE[1:]))
    radii = np.linspace(0.035, 0.027, len(TAIL_LINE))
    tail = union(0.008, *(tube(p, start, end, radii[index], radii[index + 1]) for index, (start, end) in enumerate(pieces)))
    core = union(0.03, torso, head_distance(p), tail)
    legs = union(0.02, legs_distance(p), legs_distance(mirrored))
    skin = union(0.04, core, legs)
    return -union(0.008, -skin, p[:, 2])  # flat soles: nothing reaches below the floor


def skin_normals(p):
    step = 1e-4
    slope = np.stack([skin_distance(p + offset) - skin_distance(p - offset) for offset in np.eye(3) * step], axis=1)
    return slope / np.linalg.norm(slope, axis=1)[:, None]


# --- Mesh ------------------------------------------------------------------------------------
def dense_skin():
    """The left half of the skin as a fine mesh, open along the cat's middle. It is made from
    the distance sampled on a grid of VOXEL cells."""
    xs = np.arange(-3 * VOXEL, 0.2, VOXEL)
    ys = np.arange(-0.42, 0.42, VOXEL)
    zs = np.arange(-0.02, 0.62, VOXEL)
    distances = np.empty((len(xs), len(ys), len(zs)), dtype=np.float32)
    plane = np.stack(np.meshgrid(ys, zs, indexing="ij"), axis=-1).reshape(-1, 2)
    for index, x in enumerate(xs):
        points = np.column_stack([np.full(len(plane), x), plane])
        distances[index] = skin_distance(points).reshape(len(ys), len(zs))

    grid = openvdb.FloatGrid(1.0)
    grid.copyFromArray(distances)
    points, triangles, quads = grid.convertToPolygons(isovalue=0.0)
    # Grid cell numbers to meters.
    vertices = points * VOXEL + (xs[0], ys[0], zs[0])

    surface = bmesh.new()
    corners = [surface.verts.new(vertex) for vertex in vertices]
    for face in [*triangles, *quads]:
        surface.faces.new([corners[index] for index in face])
    bmesh.ops.recalc_face_normals(surface, faces=surface.faces)
    everything = [*surface.verts, *surface.edges, *surface.faces]
    bmesh.ops.bisect_plane(surface, geom=everything, plane_co=(0, 0, 0), plane_no=(1, 0, 0), clear_inner=True)
    mesh = bpy.data.meshes.new("cat-dense")
    surface.to_mesh(mesh)
    surface.free()
    return new_object("cat-dense", mesh)


def build_skin():
    """The whole skin: the left half simplified and mirrored, so both sides match exactly."""
    dense = dense_skin()
    modifier = dense.modifiers.new("decimate", "DECIMATE")
    modifier.ratio = TARGET_TRIANGLES / 2 / (len(dense.data.polygons) * 2)  # the dense mesh is quads
    dense.modifiers.new("triangles", "TRIANGULATE")
    evaluated = dense.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = bpy.data.meshes.new_from_object(evaluated)
    mesh.name = "cat"
    bpy.data.objects.remove(dense)

    half = bmesh.new()
    half.from_mesh(mesh)
    # Simplifying moved the vertices a little off the surface: put them back on it, and keep
    # the open edge on the cat's middle.
    positions = np.array([vertex.co for vertex in half.verts])
    middle = np.array([vertex.is_boundary for vertex in half.verts])
    for _ in range(4):
        positions[middle, 0] = 0
        positions -= skin_normals(positions) * skin_distance(positions)[:, None]
    positions[middle, 0] = 0
    for vertex, position in zip(half.verts, positions):
        vertex.co = position
    bmesh.ops.mirror(half, geom=[*half.verts, *half.edges, *half.faces], axis="X", merge_dist=1e-6)
    bmesh.ops.recalc_face_normals(half, faces=half.faces)
    colors = half.loops.layers.float_color.new("Color")
    for face in half.faces:
        for loop in face.loops:
            loop[colors] = (*FUR, 1)
    paint_face(half, colors)
    bmesh.ops.triangulate(half, faces=half.faces)
    half.to_mesh(mesh)
    half.free()
    if mesh.validate():
        raise RuntimeError("The skin mesh came out broken")
    mesh.shade_flat()
    fur, detail = make_materials(FUR_DEFAULT)
    mesh.materials.append(fur)
    mesh.materials.append(detail)
    # The exporter writes the color layer that is marked both active and shown in renders.
    mesh.color_attributes.active_color = mesh.color_attributes["Color"]
    mesh.color_attributes.render_color_index = mesh.color_attributes.find("Color")
    return new_object("cat", mesh)


# --- Face ------------------------------------------------------------------------------------
def paint_shape(surface, colors, color, center, facing, size, sides, turn=0.0):
    """Paints a polygon of `sides` corners on the skin, as a part that keeps its color.

    It is `size` (width, height) as seen from the direction `facing`, on the skin in front of
    `center`. `turn` is the angle of its first corner (0 is to the right, a quarter turn is
    up). The skin's faces are cut along the polygon's edges, so its outline is exact.
    """
    facing = Vector(facing).normalized()
    right = Vector((0, 0, 1)).cross(facing).normalized()
    up = facing.cross(right)
    hit = BVHTree.FromBMesh(surface).ray_cast(Vector(center) + facing * 0.2, -facing)[0]
    if hit is None:
        raise RuntimeError("A painted shape missed the skin")
    corners = []
    for step in range(sides):
        angle = turn + TAU * step / sides
        corners.append(hit + right * (size[0] / 2 * math.cos(angle)) + up * (size[1] / 2 * math.sin(angle)))
    # One cutting plane per edge of the polygon: (a point on it, its outward direction).
    planes = [(start, (end - start).cross(facing).normalized()) for start, end in zip(corners, corners[1:] + corners[:1])]

    def nearby():
        """Faces turned toward the viewer that the shape may lie on: on the skin around it
        (not behind it) and, as seen from `facing`, reaching into the box around the shape."""
        faces = []
        for face in surface.faces:
            offsets = [vertex.co - hit for vertex in face.verts]
            across = [offset.dot(right) for offset in offsets]
            along = [offset.dot(up) for offset in offsets]
            if (
                face.normal.dot(facing) > 0.1
                and all(abs(offset.dot(facing)) < 0.04 for offset in offsets)
                and min(across) < size[0] / 2 and max(across) > -size[0] / 2
                and min(along) < size[1] / 2 and max(along) > -size[1] / 2
            ):
                faces.append(face)
        return faces

    for point, outward in planes:
        faces = nearby()
        geometry = list({item for face in faces for item in (face, *face.edges, *face.verts)})
        bmesh.ops.bisect_plane(surface, geom=geometry, dist=1e-6, plane_co=point, plane_no=outward)
    for face in nearby():
        middle = face.calc_center_median()
        if all((middle - point).dot(outward) < 0 for point, outward in planes):
            face.material_index = 1
            for loop in face.loops:
                loop[colors] = (*color, 1)


def paint_face(surface, colors):
    eye_size = (0.042, 0.054)
    for side in (1, -1):
        center, facing = HEAD + Vector((0.058 * side, 0, 0.004)), Vector((0.25 * side, -1, 0)).normalized()
        paint_shape(surface, colors, EYE, center, facing, eye_size, 8, turn=TAU / 16)
        # A glint in the upper corner of each eye, on the same side for both: one light.
        right = Vector((0, 0, 1)).cross(facing).normalized()
        glint = center + right * 0.006 + facing.cross(right) * 0.01
        paint_shape(surface, colors, GLINT, glint, facing, (0.013, 0.016), 4)
        # The inside of the ear: a triangle on its front face.
        ear_center = EAR_BASE + (EAR_TIP - EAR_BASE) * 0.55
        ear_center.x *= side
        ear_facing = (EAR_FRONT.x * side, EAR_FRONT.y, EAR_FRONT.z)
        paint_shape(surface, colors, EAR_PINK, ear_center, ear_facing, (0.05, 0.07), 3, turn=TAU / 4)
    paint_shape(surface, colors, NOSE, HEAD + Vector((0, 0, -0.022)), (0, -1, 0.15), (0.03, 0.022), 3, turn=-TAU / 4)


# Where the game puts the hat and the collar: (name, parent bone, position, direction, diameter).
ANCHORS = [
    ("hat_anchor", "head", HEAD + Vector((0, 0.005, 0.092)), (0, 0, 1), 0.1),
    ("collar_anchor", "neck", (CHEST + NECK) / 2 + Vector((0, -0.012, 0.012)), NECK - CHEST, 0.2),
]


# --- Skinning --------------------------------------------------------------------------------
def bind(cat, armature):
    """Binds the skin with Blender's automatic weights, then tidies them: the head follows
    the head bone alone, so the face keeps its shape, and no vertex follows more than four
    bones."""
    with bpy.context.temp_override(
        active_object=armature, object=armature, selected_objects=[cat, armature], selected_editable_objects=[cat, armature]
    ):
        bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    mesh = cat.data
    weighted = sum(1 for vertex in mesh.vertices if vertex.groups)
    if weighted < len(mesh.vertices):
        raise RuntimeError(f"Automatic weights failed: only {weighted} of {len(mesh.vertices)} vertices are bound")

    head = cat.vertex_groups["head"].index
    # 1 on the head, fading to 0 over the first 3 cm of the neck.
    off_head = np.clip(head_distance(np.array([vertex.co for vertex in mesh.vertices])) / 0.03, 0, 1)
    rigid = 1 - off_head * off_head * (3 - 2 * off_head)
    for vertex, share in zip(mesh.vertices, rigid):
        weights = {entry.group: entry.weight * (1 - share) for entry in vertex.groups}
        weights[head] = weights.get(head, 0) + share
        kept = sorted(weights.items(), key=lambda item: item[1], reverse=True)[:4]
        total = sum(weight for _group, weight in kept)
        for group in cat.vertex_groups:
            group.remove([vertex.index])
        for group, weight in kept:
            if weight > 0:
                cat.vertex_groups[group].add([vertex.index], weight / total, "REPLACE")


# --- Animation -------------------------------------------------------------------------------
# Poses are written in the cat's own axes; see rig_lib.py.
def tail_sway(pose, phase, amount, lift=0.0):
    """The tail stands up, so it sways by rolling; `lift` tips it forward over the back."""
    for index in range(1, 5):
        pose[f"tail{index}"] = [("Y", amount * wave(phase, -0.12 * index)), ("X", lift)]


def idle(p):
    breath = wave(p)
    pose = {
        "scale": (1 + 0.004 * breath, 1 + 0.008 * breath),
        "head": [("Z", 5 * wave(p)), ("X", 2 * wave(p * 2))],
    }
    tail_sway(pose, p, 9)
    return pose


def gait(p, swing, lift, legs):
    """Leg swing for walk and run. `legs` gives each leg's place in the cycle."""
    pose = {}
    for leg, offset in legs.items():
        phase = p + offset
        forward = max(0.0, -math.cos(TAU * phase))  # 1 while the leg swings forward
        prefix, suffix = leg.split(".")
        pose[f"{prefix}_upper.{suffix}"] = [("X", swing * wave(phase))]
        pose[f"{prefix}_lower.{suffix}"] = [("X", (lift if prefix == "front" else -lift) * forward)]
        pose[f"{prefix}_paw.{suffix}"] = [("X", (0.5 if prefix == "front" else 1.2) * lift * forward)]
    return pose


def walk(p):
    pose = gait(p, 24, 32, {"front.L": 0, "hind.R": 0.05, "front.R": 0.5, "hind.L": 0.55})
    pose["move"] = (0, 0, 0.005 * wave(p * 2))
    pose["spine"] = [("Z", 4 * wave(p))]
    pose["head"] = [("Z", -3 * wave(p)), ("X", 2.5 * wave(p * 2))]
    tail_sway(pose, p, 7)
    return pose


def run(p):
    pose = gait(p, 40, 44, {"front.L": 0, "front.R": 0.08, "hind.L": 0.45, "hind.R": 0.53})
    stretch = wave(p, 0.25)
    pose["move"] = (0, 0, 0.018 * wave(p, 0.1))
    pose["scale"] = (1 - 0.02 * stretch, 1 + 0.03 * stretch)
    pose["pelvis"] = [("X", 6 * stretch)]
    pose["spine"] = [("X", -9 * stretch)]
    pose["head"] = [("X", 4 * wave(p, 0.6))]
    tail_sway(pose, p, 4, lift=-14)
    return pose


def jump(_p):
    pose = {"scale": (0.96, 1.06), "spine": [("X", -8)], "head": [("X", -6)], "move": (0, 0, 0.01)}
    both(pose, "front_upper", [("X", -50)])
    both(pose, "front_lower", [("X", 22)])
    both(pose, "hind_upper", [("X", 44)])
    both(pose, "hind_lower", [("X", -28)])
    both(pose, "hind_paw", [("X", 32)])
    tail_sway(pose, 0, 0, lift=-20)
    return pose


def crouch(amount):
    pose = {"move": (0, 0, -0.04 * amount), "scale": (1 + 0.08 * amount, 1 - 0.1 * amount), "head": [("X", -8 * amount)]}
    both(pose, "front_upper", [("X", 30 * amount)])
    both(pose, "front_lower", [("X", -58 * amount)])
    both(pose, "front_paw", [("X", 28 * amount)])
    both(pose, "hind_upper", [("X", -32 * amount)])
    both(pose, "hind_lower", [("X", 62 * amount)])
    both(pose, "hind_paw", [("X", -30 * amount)])
    return pose


def land(p):
    return crouch((1 - p) ** 2)


def swat(p):
    reach = math.sin(math.pi * min(1.0, p / 0.85)) ** 0.8 if p < 0.85 else 0.0
    sweep = max(0.0, min(1.0, (p - 0.25) / 0.4))  # the paw crosses from right to left
    pose = {
        "front_upper.R": [("X", -72 * reach), ("Z", (-22 + 50 * sweep) * reach)],
        "front_lower.R": [("X", (30 - 40 * sweep) * reach)],
        "front_paw.R": [("X", 28 * reach)],
        "spine": [("X", 5 * reach), ("Z", 6 * sweep * reach)],
        "head": [("X", 6 * reach), ("Z", 8 * sweep * reach)],
        "move": (0, -0.012 * reach, -0.006 * reach),
    }
    tail_sway(pose, 0, 0, lift=8 * reach)
    return pose


def pounce(_p):
    pose = {"scale": (0.96, 1.06), "pelvis": [("X", 16)], "head": [("X", -14)], "move": (0, 0, 0.01)}
    both(pose, "front_upper", [("X", -62)])
    both(pose, "front_lower", [("X", 14)])
    both(pose, "front_paw", [("X", 22)])
    both(pose, "hind_upper", [("X", 40)])
    both(pose, "hind_lower", [("X", -20)])
    tail_sway(pose, 0, 0, lift=12)
    return pose


def loaf(p):
    """Lying down asleep: belly on the floor, front legs stretched out in front, hind legs
    tucked along the body, head low."""
    breath = wave(p)
    pose = {
        "move": (0, 0, -0.118),
        "scale": (1 + 0.004 * breath, 1 + 0.012 * breath),
        "neck": [("X", 24)],
        "head": [("X", -12), ("Y", 6)],
    }
    both(pose, "front_upper", [("X", -72), ("Z", -6)])
    both(pose, "front_paw", [("X", 72)])
    both(pose, "hind_upper", [("X", -70), ("Z", 8)])
    both(pose, "hind_lower", [("X", -8)])
    tail_sway(pose, p, 4, lift=-14)
    return pose


def celebrate(p):
    beat = wave(p * 2)
    hop = abs(beat)
    pose = {
        "pelvis": [("X", -12 * hop)],
        "move": (0, 0, 0.05 * hop),
        "scale": (1 - 0.03 * hop, 1 + 0.05 * hop),
        "head": [("Y", 12 * beat), ("X", -8)],
        "front_upper.L": [("X", -60 * max(0.0, beat))],
        "front_lower.L": [("X", 28 * max(0.0, beat))],
        "front_upper.R": [("X", -60 * max(0.0, -beat))],
        "front_lower.R": [("X", 28 * max(0.0, -beat))],
    }
    both(pose, "hind_upper", [("X", 14 * hop)])
    both(pose, "hind_lower", [("X", -10 * hop)])
    tail_sway(pose, p * 4, 16, lift=6)
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
    parser.add_argument("--out", required=True)
    parser.add_argument("--renders")
    args = parser.parse_args(argv)

    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj)
    cat = build_skin()
    armature = build_armature(bone_plan(), ANCHORS)
    armature.data.bones["body"].use_deform = False
    bind(cat, armature)
    # The skin, the hat and the collar all hang from the skeleton, so they shrink with it.
    armature.scale = (SIZE, SIZE, SIZE)
    actions = animate(armature, CLIPS, "body", "body")
    print(f"CAT triangles={len(cat.data.polygons)} bones={len(armature.data.bones)} clips={len(actions)}")
    export(args.out, cat, armature)

    if args.renders:
        front, side, mid = (0.8, -1.2, 0.62), (1.5, 0.05, 0.3), (0, 0, 0.26)
        low = (0, -0.05, 0.14)
        shots = [("rest", None, 0, front, mid), ("rest-side", None, 0, side, mid), ("rest-back", None, 0, (-0.8, 1.2, 0.62), mid),
                 ("rest-face", None, 0, (0, -1.5, 0.4), (0, 0, 0.34)), ("rest-top", None, 0, (0.3, -0.4, 1.6), mid),
                 ("walk", "walk", 5, side, mid), ("run", "run", 3, side, mid), ("run-gather", "run", 8, side, mid),
                 ("swat", "swat", 3, front, mid), ("jump", "jump", 1, side, mid), ("pounce", "pounce", 1, side, mid),
                 ("land", "land", 0, side, mid), ("loaf", "loaf", 0, front, low), ("loaf-side", "loaf", 0, side, low),
                 ("celebrate", "celebrate", 6, front, mid)]
        render_shots(armature, actions, shots, args.renders, "body", "body")


main()
