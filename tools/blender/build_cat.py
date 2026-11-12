"""Builds the game's cat: a low poly, paper-fold style, skinned cat with nine animation clips.

Run from the repo root (Blender 4.2 or newer; written against 5.3):

    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \\
        --python tools/blender/build_cat.py -- --out assets/shared/cat-source.glb [--renders DIR]

Then compress it for the game:

    pnpm optimize-glb assets/shared/cat-source.glb assets/shared/cat.glb

This is the paper-fold cat. The game currently ships the one-skin cat made by
build_seamless_cat.py; run this script to switch back.

The model is generated, so this script is its source. Blender axes: Z up, the cat faces -Y,
+X is the cat's left. Units are meters; the cat stands on the ground at the origin.
"""

import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rig_lib import TAU, animate, both, build_armature, export, make_materials, new_object, render_shots, wave  # noqa: E402

# Display colors. Vertex colors are exported as they are and the game multiplies them in
# directly, so these are the colors seen in the game. The coat is white here: the game tints
# the `fur` material (cream by default, other colors from the shop).
FUR = (1.0, 1.0, 1.0)
FUR_PREVIEW = (0.97, 0.93, 0.85)
CORAL = (0.96, 0.62, 0.52)
NOSE = (0.9, 0.56, 0.52)
EYE = (0.3, 0.24, 0.24)
WHISKER = (0.99, 0.98, 0.95)

# --- Body plan -------------------------------------------------------------------------------
# Joint positions shared by the mesh and the skeleton.
HIPS = Vector((0, 0.13, 0.235))
MID = Vector((0, 0.0, 0.235))
CHEST = Vector((0, -0.12, 0.245))
NECK = Vector((0, -0.185, 0.3))  # where the neck meets the head
HEAD = Vector((0, -0.25, 0.355))  # center of the head
HEAD_TIP = Vector((0, -0.385, 0.335))
HEAD_SIZE = 0.128  # half the head's width
TAIL = [Vector((0, 0.235, 0.275)), Vector((0, 0.315, 0.335)), Vector((0, 0.365, 0.415)), Vector((0, 0.38, 0.5))]
TAIL_BASE = Vector((0, 0.19, 0.255))


def front_leg(side):
    return [
        Vector((0.075 * side, -0.115, 0.2)),  # shoulder
        Vector((0.082 * side, -0.125, 0.118)),  # elbow
        Vector((0.082 * side, -0.13, 0.05)),  # wrist
        Vector((0.082 * side, -0.165, 0.028)),  # toes
    ]


def hind_leg(side):
    return [
        Vector((0.085 * side, 0.115, 0.2)),  # hip joint
        Vector((0.098 * side, 0.09, 0.122)),  # knee
        Vector((0.098 * side, 0.15, 0.058)),  # hock
        Vector((0.098 * side, 0.112, 0.028)),  # toes
    ]


def bone_plan():
    """(name, head, tail, parent) for every bone. `.L` is the cat's left (+X)."""
    plan = [
        ("root", Vector((0, 0, 0)), Vector((0, 0, 0.08)), None),
        ("pelvis", HIPS, MID, "root"),
        ("spine", MID, CHEST, "pelvis"),
        ("neck", CHEST, NECK, "spine"),
        ("head", NECK, HEAD_TIP, "neck"),
    ]
    previous, start = "pelvis", HIPS
    for index, point in enumerate(TAIL, start=1):
        plan.append((f"tail{index}", start, point, previous))
        previous, start = f"tail{index}", point
    for side, suffix in ((1, "L"), (-1, "R")):
        for prefix, points, parent in (("front", front_leg(side), "spine"), ("hind", hind_leg(side), "pelvis")):
            for part, (head, tail) in zip(("upper", "lower", "paw"), zip(points, points[1:])):
                name = f"{prefix}_{part}.{suffix}"
                plan.append((name, head, tail, parent))
                parent = name
    return plan


# --- Mesh ------------------------------------------------------------------------------------
# The cat is a handful of simple solids with big flat faces, like folded paper: a faceted body,
# a gem-shaped head, tube legs and tail. They overlap instead of being welded, and each one
# follows only the bones named for it, so the facets stay crisp when the cat moves.
def finish(name, bm, color, bones):
    """Turns a bmesh into a painted, weighted object. `bones` are the bones it may follow."""
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = new_object(name, mesh)

    colors = mesh.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
    for corner in colors.data:
        corner.color = (*color, 1)
    mesh.shade_flat()

    plan = [entry for entry in bone_plan() if entry[0] in bones]
    groups = {entry[0]: obj.vertex_groups.new(name=entry[0]) for entry in plan}
    for vertex in mesh.vertices:
        # Nearest bones win, blended where two are about as close (at the joints).
        scored = sorted(
            ((1 / (segment_distance(vertex.co, start, end) ** 2 + 1e-4) ** 2, name) for name, start, end, _ in plan),
            reverse=True,
        )[:3]
        total = sum(score for score, _ in scored)
        for score, name in scored:
            if score / total > 0.02:
                groups[name].add([vertex.index], score / total, "REPLACE")
    return obj


def segment_distance(point, head, tail):
    axis = tail - head
    t = max(0.0, min(1.0, (point - head).dot(axis) / axis.length_squared))
    return (point - (head + axis * t)).length


def hull(points):
    """The convex solid around some points: few, large, flat faces."""
    bm = bmesh.new()
    for point in points:
        bm.verts.new(point)
    result = bmesh.ops.convex_hull(bm, input=bm.verts)
    unused = [item for item in result["geom_interior"] + result["geom_unused"] if isinstance(item, bmesh.types.BMVert)]
    bmesh.ops.delete(bm, geom=unused, context="VERTS")
    return bm


def tube(points, radii, sides, squash=1.0):
    """A straight-sided tube through the points, closed at both ends. `squash` flattens it sideways."""
    bm = bmesh.new()
    rings = []
    for index, (point, radius) in enumerate(zip(points, radii)):
        axis = (points[min(index + 1, len(points) - 1)] - points[max(index - 1, 0)]).normalized()
        across = axis.cross(Vector((1, 0, 0))).normalized()  # the tubes all run in the Y-Z plane
        side = Vector((1, 0, 0))
        ring = []
        for step in range(sides):
            angle = math.tau * (step + 0.5) / sides
            ring.append(bm.verts.new(point + (side * math.cos(angle) * squash + across * math.sin(angle)) * radius))
        rings.append(ring)
    for lower, upper in zip(rings, rings[1:]):
        for step in range(sides):
            following = (step + 1) % sides
            bm.faces.new((lower[step], lower[following], upper[following], upper[step]))
    bm.faces.new(rings[0])
    bm.faces.new(rings[-1])
    return bm


def paw(toes):
    """A low wedge standing on the floor: wide at the toes (toward -Y), narrower on top."""
    x, y = toes.x, toes.y
    sole = [(x + dx, y + dy, 0) for dx in (-0.042, 0.042) for dy in (-0.04, 0.055)]
    top = [(x + dx, y + dy, 0.052) for dx in (-0.032, 0.032) for dy in (-0.012, 0.05)]
    return hull([Vector(point) for point in sole + top])


def ribbon(points, normals, width):
    """A thin strip lying on a surface, along `points`, facing along `normals` (the closed eyes)."""
    bm = bmesh.new()
    edges = []
    for index, (point, normal) in enumerate(zip(points, normals)):
        along = (points[min(index + 1, len(points) - 1)] - points[max(index - 1, 0)]).normalized()
        across = normal.cross(along).normalized() * (width / 2)
        lifted = point + normal * 0.004
        edges.append((bm.verts.new(lifted - across), bm.verts.new(lifted + across)))
    for (a, b), (c, d) in zip(edges, edges[1:]):
        bm.faces.new((a, c, d, b))
    return bm


def build_parts():
    parts = []
    k = HEAD_SIZE

    def at(x, y, z):  # a point on the head, in head sizes from its center
        return HEAD + Vector((x, y, z)) * k

    # Body: a stretched 20-sided solid, big enough that the legs look short under it.
    body = bmesh.new()
    bmesh.ops.create_icosphere(body, subdivisions=1, radius=1)
    placed = Matrix.Translation((0, 0.02, 0.252)) @ Matrix.Rotation(0.18, 4, "X") @ Matrix.Diagonal((0.15, 0.25, 0.142, 1))
    bmesh.ops.transform(body, matrix=placed, verts=body.verts)
    parts.append(finish("body", body, FUR, ["pelvis", "spine"]))

    # Chest and neck: joins the body to the head.
    neck = tube([CHEST + Vector((0, 0.05, -0.01)), CHEST + Vector((0, -0.04, 0.02)), NECK + Vector((0, -0.02, 0.02))], [0.12, 0.112, 0.09], 6)
    parts.append(finish("neck", neck, FUR, ["spine", "neck"]))

    # Head: a wide gem with flat cheeks and a short pointed muzzle.
    head_points = [at(0, -0.3, 0.8), at(0, 0.5, 0.66), at(0, 0.95, 0.05), at(0, 0.2, -0.72)]
    head_points += [at(0, -1.02, -0.3), at(0, -0.72, -0.66)]  # nose tip, chin
    for side in (1, -1):
        head_points += [
            at(0.5 * side, 0.05, 0.74),  # crown
            at(1.0 * side, -0.1, 0.02),  # cheek
            at(0.82 * side, 0.55, 0.12),
            at(0.78 * side, -0.5, -0.36),  # jaw
            at(0.42 * side, -0.82, 0.2),  # brow
            at(0.5 * side, 0.7, -0.4),
            at(0.55 * side, -0.05, -0.62),
        ]
    head = hull(head_points)
    surface = BVHTree.FromBMesh(head)
    parts.append(finish("head", head, FUR, ["head"]))

    for side, suffix in ((1, "L"), (-1, "R")):
        # Ears: three-sided pyramids leaning outward.
        base = [at(0.2 * side, -0.14, 0.68), at(0.92 * side, -0.02, 0.42), at(0.6 * side, 0.4, 0.6)]
        ear = hull([*base, at(0.82 * side, 0.04, 1.32)])
        parts.append(finish(f"ear.{suffix}", ear, CORAL, ["head"]))

        # Closed eyes: an arc lying on the face, found by dropping points onto the head.
        points, normals = [], []
        for step in range(5):
            t = step / 2 - 1  # -1..1 along the eye
            origin = at((0.46 + 0.2 * t) * side, -3, -0.02 - 0.075 * (1 - t * t))
            location, normal, _index, _distance = surface.ray_cast(origin, Vector((0, 1, 0)))
            points.append(location)
            normals.append(normal)
        parts.append(finish(f"eye.{suffix}", ribbon(points, normals, 0.055 * k), EYE, ["head"]))

        # Whiskers: three thin spikes from each side of the muzzle.
        for index, (out, up) in enumerate(((1.25, -0.22), (1.3, -0.38), (1.2, -0.54))):
            whisker = tube([at(0.36 * side, -0.82, -0.36), at(out * side, -0.62, up)], [0.03 * k, 0.008 * k], 3)
            parts.append(finish(f"whisker{index}.{suffix}", whisker, WHISKER, ["head"]))

        # Legs: short and chunky, with a block for the paw.
        front = front_leg(side)
        front = front_leg(side)
        parts.append(finish(f"front.{suffix}", tube(front[:3] + [front[2] + Vector((0, 0, -0.03))], [0.058, 0.05, 0.044, 0.044], 5),
                            FUR, [f"front_upper.{suffix}", f"front_lower.{suffix}", f"front_paw.{suffix}"]))
        parts.append(finish(f"front_paw.{suffix}", paw(front[3]), FUR, [f"front_paw.{suffix}"]))
        hind = hind_leg(side)
        parts.append(finish(f"hind.{suffix}", tube(hind[:3] + [hind[2] + Vector((0, 0, -0.038))], [0.078, 0.064, 0.044, 0.044], 5),
                            FUR, [f"hind_upper.{suffix}", f"hind_lower.{suffix}", f"hind_paw.{suffix}"]))
        parts.append(finish(f"hind_paw.{suffix}", paw(hind[3]), FUR, [f"hind_paw.{suffix}"]))

    nose = hull([at(-0.11, -1.0, -0.2), at(0.11, -1.0, -0.2), at(0, -1.06, -0.36), at(0, -0.9, -0.28)])
    parts.append(finish("nose", nose, NOSE, ["head"]))

    # Tail: a thick six-sided tube with a blunt tip.
    tail = tube([TAIL_BASE, *TAIL], [0.052, 0.048, 0.044, 0.04, 0.034], 6)
    parts.append(finish("tail", tail, CORAL, ["pelvis", "tail1", "tail2", "tail3", "tail4"]))
    return parts


def build_mesh():
    parts = build_parts()
    with bpy.context.temp_override(active_object=parts[0], selected_editable_objects=parts, selected_objects=parts):
        bpy.ops.object.join()
    cat = parts[0]
    cat.name = cat.data.name = "cat"

    fur, detail = make_materials(FUR_PREVIEW)
    cat.data.materials.append(fur)
    cat.data.materials.append(detail)
    colors = cat.data.color_attributes["Color"]
    for polygon in cat.data.polygons:
        first = colors.data[polygon.loop_indices[0]].color
        polygon.material_index = 0 if tuple(first)[:3] == FUR else 1
    cat.data.color_attributes.active_color = colors
    cat.data.shade_flat()
    return cat


# Where the game puts the hat and the collar: (name, parent bone, position, direction, diameter).
ANCHORS = [
    ("hat_anchor", "head", HEAD + Vector((0, -0.02, 0.8)) * HEAD_SIZE, (0, 0, 1), 0.11),
    ("collar_anchor", "neck", (CHEST + NECK) / 2 + Vector((0, -0.03, 0.02)), (0, -0.045, 0.055), 0.235),
]


# --- Animation -------------------------------------------------------------------------------
# Poses are written in the cat's own axes; see rig_lib.py.
def tail_sway(pose, phase, amount, lift=0.0):
    for index in range(1, 5):
        pose[f"tail{index}"] = [("Z", amount * wave(phase, -0.12 * index)), ("X", lift)]


def aim_tail(directions):
    """Tail pose from the direction each tail bone should point in (cat axes)."""
    pose, parent_turn, start = {}, Matrix.Identity(3), HIPS
    for index, (point, direction) in enumerate(zip(TAIL, directions), start=1):
        turn = (point - start).rotation_difference(Vector(direction)).to_matrix()
        # A bone inherits its parent's turn, so it only needs the difference.
        pose[f"tail{index}"] = parent_turn.inverted() @ turn
        parent_turn, start = turn, point
    return pose


def idle(p):
    pose = {"head": [("Z", 5 * wave(p)), ("X", 2 * wave(p * 2))], "move": (0, 0, 0.003 * wave(p))}
    tail_sway(pose, p, 13)
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
    pose = gait(p, 26, 34, {"front.L": 0, "hind.R": 0.05, "front.R": 0.5, "hind.L": 0.55})
    pose["move"] = (0, 0, 0.005 * wave(p * 2))
    pose["spine"] = [("Z", 4 * wave(p))]
    pose["head"] = [("Z", -3 * wave(p)), ("X", 2.5 * wave(p * 2))]
    tail_sway(pose, p, 9)
    return pose


def run(p):
    pose = gait(p, 42, 46, {"front.L": 0, "front.R": 0.08, "hind.L": 0.45, "hind.R": 0.53})
    pose["move"] = (0, 0, 0.018 * wave(p, 0.1))
    pose["pelvis"] = [("X", 6 * wave(p, 0.25))]
    pose["spine"] = [("X", -9 * wave(p, 0.25))]
    pose["head"] = [("X", 4 * wave(p, 0.6))]
    tail_sway(pose, p, 5, lift=-18)
    return pose


def jump(_p):
    pose = {"spine": [("X", -8)], "head": [("X", -6)], "move": (0, 0, 0.01)}
    both(pose, "front_upper", [("X", -55)])
    both(pose, "front_lower", [("X", 25)])
    both(pose, "hind_upper", [("X", 48)])
    both(pose, "hind_lower", [("X", -30)])
    both(pose, "hind_paw", [("X", 35)])
    tail_sway(pose, 0, 0, lift=-28)
    return pose


def crouch(amount):
    pose = {"move": (0, 0, -0.045 * amount), "head": [("X", -8 * amount)]}
    both(pose, "front_upper", [("X", 32 * amount)])
    both(pose, "front_lower", [("X", -62 * amount)])
    both(pose, "front_paw", [("X", 30 * amount)])
    both(pose, "hind_upper", [("X", -34 * amount)])
    both(pose, "hind_lower", [("X", 66 * amount)])
    both(pose, "hind_paw", [("X", -32 * amount)])
    return pose


def land(p):
    return crouch((1 - p) ** 2)


def swat(p):
    reach = math.sin(math.pi * min(1.0, p / 0.85)) ** 0.8 if p < 0.85 else 0.0
    sweep = max(0.0, min(1.0, (p - 0.25) / 0.4))  # the paw crosses from right to left
    pose = {
        "front_upper.R": [("X", -78 * reach), ("Z", (-22 + 50 * sweep) * reach)],
        "front_lower.R": [("X", (34 - 44 * sweep) * reach)],
        "front_paw.R": [("X", 30 * reach)],
        "spine": [("X", 5 * reach), ("Z", 6 * sweep * reach)],
        "head": [("X", 6 * reach), ("Z", 8 * sweep * reach)],
        "move": (0, -0.012 * reach, -0.006 * reach),
    }
    tail_sway(pose, 0, 0, lift=10 * reach)
    return pose


def pounce(_p):
    pose = {"pelvis": [("X", 16)], "head": [("X", -14)], "move": (0, 0, 0.01)}
    both(pose, "front_upper", [("X", -68)])
    both(pose, "front_lower", [("X", 16)])
    both(pose, "front_paw", [("X", 25)])
    both(pose, "hind_upper", [("X", 44)])
    both(pose, "hind_lower", [("X", -22)])
    tail_sway(pose, 0, 0, lift=14)
    return pose


def loaf(p):
    """Curled up asleep, like the reference picture: belly on the floor, front legs stretched
    out with the head resting on them, hind legs tucked, tail wrapped around the side."""
    breath = wave(p)
    pose = {
        "move": (0, 0, -0.118 + 0.003 * breath),
        "spine": [("X", 1.5 * breath)],
        "neck": [("X", 40)],
        "head": [("X", -22), ("Z", 10), ("Y", 8)],
    }
    # The tail lies on the floor and wraps round the cat's right side toward the front.
    pose.update(aim_tail([(-0.6, 0.75, -0.3), (-1, 0.05, -0.12), (-0.75, -0.65, 0), (-0.25 - 0.05 * breath, -1, 0)]))
    both(pose, "front_upper", [("X", -80), ("Z", -8)])
    both(pose, "front_paw", [("X", 80)])
    both(pose, "hind_upper", [("X", -75), ("Z", 10)])
    both(pose, "hind_lower", [("X", -10)])
    return pose


def celebrate(p):
    hop = abs(wave(p * 2))
    pose = {
        "pelvis": [("X", -12 * hop)],
        "move": (0, 0, 0.05 * hop),
        "head": [("Y", 12 * wave(p * 2)), ("X", -8)],
        "front_upper.L": [("X", -64 * max(0.0, wave(p * 2)))],
        "front_lower.L": [("X", 30 * max(0.0, wave(p * 2)))],
        "front_upper.R": [("X", -64 * max(0.0, -wave(p * 2)))],
        "front_lower.R": [("X", 30 * max(0.0, -wave(p * 2)))],
    }
    both(pose, "hind_upper", [("X", 14 * hop)])
    both(pose, "hind_lower", [("X", -10 * hop)])
    tail_sway(pose, p * 4, 22, lift=-10)
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
    cat = build_mesh()
    armature = build_armature(bone_plan(), ANCHORS)
    cat.parent = armature
    cat.modifiers.new("armature", "ARMATURE").object = armature
    actions = animate(armature, CLIPS, "pelvis")
    print(f"CAT triangles={len(cat.data.polygons)} bones={len(armature.data.bones)} clips={len(actions)}")
    export(args.out, cat, armature)

    if args.renders:
        front, side, low, mid = (0.8, -1.2, 0.62), (1.5, 0.05, 0.3), (0, -0.05, 0.1), (0, 0, 0.22)
        shots = [("rest", None, 0, front, mid), ("rest-side", None, 0, side, mid), ("walk", "walk", 5, side, mid),
                 ("run", "run", 3, side, mid), ("swat", "swat", 3, front, mid), ("jump", "jump", 1, side, mid),
                 ("pounce", "pounce", 1, side, mid), ("land", "land", 0, side, mid), ("loaf", "loaf", 0, front, low),
                 ("loaf-top", "loaf", 0, (0.35, -0.5, 1.5), low), ("celebrate", "celebrate", 6, front, mid)]
        render_shots(armature, actions, shots, args.renders, "pelvis")

main()
