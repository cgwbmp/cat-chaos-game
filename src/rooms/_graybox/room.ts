// Graybox test room built in code: floor, two walls, a table, a shelf and 10 breakables that
// spawn slightly above their surface so they visibly drop under physics. Units are meters.
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { setExtras } from '../../core/extras';
import type { MarkerKind, ObjectTier, RoomBuilder } from '../../core/types';
import objects from './objects.json';

type Triple = [x: number, y: number, z: number];

const TABLE_TOP = 0.75;
const SHELF_LOW = 0.9;
const SHELF_HIGH = 1.7;
const DROP = 0.2;

const STATIC_COLOR = new Color3(0.85, 0.82, 0.8);
const TIER_COLORS: Record<ObjectTier, Color3> = {
  light: new Color3(0.66, 0.9, 0.81),
  medium: new Color3(0.65, 0.82, 0.96),
  heavy: new Color3(0.78, 0.72, 0.94),
  trick: new Color3(1, 0.78, 0.66),
  treasure: new Color3(1, 0.85, 0.4),
};

export const buildGraybox: RoomBuilder = (scene) => {
  const root = new TransformNode('_graybox', scene);

  function material(name: string, color: Color3): StandardMaterial {
    const result = new StandardMaterial(name, scene);
    result.diffuseColor = color;
    result.specularColor = Color3.Black();
    return result;
  }
  const staticMaterial = material('graybox-static', STATIC_COLOR);
  const tierMaterials = new Map<ObjectTier, StandardMaterial>();

  function place(mesh: Mesh, position: Triple): Mesh {
    mesh.position.set(...position);
    mesh.parent = root;
    return mesh;
  }

  function staticBox(name: string, [width, height, depth]: Triple, position: Triple): void {
    place(CreateBox(name, { width, height, depth }, scene), position).material = staticMaterial;
  }

  /** Marks a mesh as the breakable `id` from objects.json (mesh name = objectId). */
  function breakable(id: string, mesh: Mesh, position: Triple): Mesh {
    const def = objects.find((object) => object.id === id);
    if (!def) throw new Error(`Graybox object '${id}' is missing from objects.json`);
    const tier = def.tier as ObjectTier; // objects.json is schema-checked by validate-objects
    let tierMaterial = tierMaterials.get(tier);
    if (!tierMaterial) {
      tierMaterial = material(`graybox-${tier}`, TIER_COLORS[tier]);
      tierMaterials.set(tier, tierMaterial);
    }
    place(mesh, position).material = tierMaterial;
    setExtras(mesh, { obj: id });
    return mesh;
  }

  function box(id: string, [width, height, depth]: Triple, position: Triple): Mesh {
    return breakable(id, CreateBox(id, { width, height, depth }, scene), position);
  }

  function cylinder(id: string, diameter: number, height: number, position: Triple): Mesh {
    const mesh = CreateCylinder(id, { diameter, height, tessellation: 12 }, scene);
    return breakable(id, mesh, position);
  }

  function marker(kind: MarkerKind, position: Triple, scaling: Triple = [1, 1, 1]): void {
    const node = new TransformNode(kind, scene);
    node.position.set(...position);
    node.scaling.set(...scaling);
    node.parent = root;
    setExtras(node, { marker: kind });
  }

  // Room shell: a 6 x 6 m floor with its top at y = 0, a back wall (+z) and a left wall (-x).
  staticBox('floor', [6, 0.2, 6], [0, -0.1, 0]);
  staticBox('wall_back', [6, 3, 0.2], [0, 1.5, 3.1]);
  staticBox('wall_left', [0.2, 3, 6], [-3.1, 1.5, 0]);

  // Table: 1.4 x 0.8 m top at 0.75 m.
  staticBox('table_top', [1.4, 0.08, 0.8], [0.8, TABLE_TOP - 0.04, 0.3]);
  const legs: [x: number, z: number][] = [
    [0.16, -0.04],
    [1.44, -0.04],
    [0.16, 0.64],
    [1.44, 0.64],
  ];
  legs.forEach(([x, z], index) => {
    staticBox(`table_leg_${index + 1}`, [0.08, 0.67, 0.08], [x, 0.335, z]);
  });

  // Shelf against the back wall: boards at 0.9 m and 1.7 m between two side panels.
  staticBox('shelf_board_low', [1.6, 0.06, 0.35], [-1.4, SHELF_LOW - 0.03, 2.82]);
  staticBox('shelf_board_high', [1.6, 0.06, 0.35], [-1.4, SHELF_HIGH - 0.03, 2.82]);
  staticBox('shelf_side_left', [0.06, 1.76, 0.35], [-2.23, 0.88, 2.82]);
  staticBox('shelf_side_right', [0.06, 1.76, 0.35], [-0.57, 0.88, 2.82]);

  // On the table. The runner lies flat and the cup lands on it.
  box('table_runner', [0.5, 0.02, 0.3], [0.65, TABLE_TOP + 0.06, 0.3]);
  cylinder('cup', 0.09, 0.1, [0.6, TABLE_TOP + 0.07 + DROP, 0.3]);
  cylinder('bottle', 0.08, 0.28, [1.05, TABLE_TOP + 0.14 + DROP, 0.3]);
  box('book', [0.22, 0.04, 0.16], [0.3, TABLE_TOP + 0.02 + DROP, 0.05]);
  cylinder('plate_stack', 0.24, 0.1, [1.3, TABLE_TOP + 0.05 + DROP, 0.05]);
  box('monitor', [0.5, 0.35, 0.06], [1.1, TABLE_TOP + 0.175 + DROP, 0.62]);

  // On the floor, lying on its side so it can roll.
  cylinder('can', 0.07, 0.12, [-0.5, 0.035 + DROP, -0.8]).rotation.z = Math.PI / 2;

  // On the shelf; the treasure sits on the top board.
  box('lamp', [0.14, 0.3, 0.14], [-1.9, SHELF_LOW + 0.15 + DROP, 2.82]);
  box('crate', [0.3, 0.25, 0.25], [-1, SHELF_LOW + 0.125 + DROP, 2.82]);
  cylinder('golden_cat', 0.16, 0.24, [-1.4, SHELF_HIGH + 0.12 + DROP, 2.82]);

  // Fracture set for the plate stack: four plates, placed relative to the stack's origin.
  const platePieces = new TransformNode('plate_stack_pieces', scene);
  platePieces.parent = root;
  const plateMaterial = material('graybox-plate', TIER_COLORS.medium);
  [-0.0375, -0.0125, 0.0125, 0.0375].forEach((y, index) => {
    const plate = CreateCylinder(
      `plate_${index + 1}`,
      { diameter: 0.24, height: 0.025, tessellation: 12 },
      scene,
    );
    plate.position.y = y;
    plate.parent = platePieces;
    plate.material = plateMaterial;
  });

  // Markers. camera_bounds is a unit cube scaled to the volume the camera may occupy; the room
  // is open toward -z, so the volume extends out that way.
  marker('cat_spawn', [-1, 0, -1.5]);
  marker('owner_door', [2.9, 0, -2]);
  marker('camera_bounds', [0, 3, -2], [7, 6, 10]);
  marker('trigger:pull_runner', [0.8, TABLE_TOP, -0.2]);

  return root;
};
