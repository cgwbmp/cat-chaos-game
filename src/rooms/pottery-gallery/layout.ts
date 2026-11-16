// Pottery Gallery: 9 x 7.5 m. Plinths in the middle rise like stairs to the treasure, the white
// moon jar, 1.5 m up. More pottery on plinths along the side walls and on the corner shelves;
// glass display cases need a pounce from a height. Mobiles hang from a rail over the back bench
// and fall when something moves them. Two cleaning robots circle the middle, always on opposite
// sides (see module.ts).
import { beam, block, cabinet, hangZone, roomZone, shell, shelves } from '../_kit/furniture';
import { C } from '../_kit/palette';
import { place, row, type Placement, type RoomLayout, type Triple } from '../_kit/parts';
import { HANG_DROP } from '../_kit/props';

const SIDE = 0.8; // plinths along the side walls
const BENCH = 0.6;
const LOW = 0.45; // benches at the front
const RAIL = 2.35; // underside of the rail the mobiles hang from
const RAIL_Z = 2.85;
const HUNG = RAIL - HANG_DROP;
const BENCH_Z = 3.45;
const SHELF_Z = 3.5;
const FRONT_Z = -3;
const quarter = Math.PI / 2;

/** The stairs in the middle: plinth centers along x and their heights. */
const STAIRS: readonly (readonly [x: number, height: number])[] = [
  [-1.3, 0.5],
  [-0.65, 1],
  [0, 1.5],
  [0.65, 1],
  [1.3, 0.5],
];
const SIDE_Z = [-2.2, -0.9, 0.4, 1.7] as const;

/** Corners of the robots' patrol around the middle; the second robot starts at the third. */
export const PATROL: Triple[] = [
  [-2.6, 0, -1.6],
  [2.6, 0, -1.6],
  [2.6, 0, 1.6],
  [-2.6, 0, 1.6],
];

/** A corner shelf centered on `x`: bowls low, tea things in the middle, a vase on top. */
function cornerShelf(x: number): Placement[] {
  return [
    ...row('pottery_bowl', 3, [x - 0.4, 0.6, SHELF_Z], [0.4, 0, 0]),
    { def: 'bowl_tower', at: [x - 0.5, 1.25, SHELF_Z] },
    { def: 'teapot', at: [x - 0.2, 1.25, SHELF_Z] },
    { def: 'teapot', at: [x + 0.2, 1.25, SHELF_Z] },
    { def: 'bowl_tower', at: [x + 0.5, 1.25, SHELF_Z] },
    { def: 'celadon_vase', at: [x, 1.9, SHELF_Z] },
    { def: 'tea_bowl', at: [x - 0.5, 1.9, SHELF_Z] },
    { def: 'tea_bowl', at: [x - 0.3, 1.9, SHELF_Z] },
    { def: 'tea_bowl', at: [x + 0.4, 1.9, SHELF_Z] },
  ];
}

/** A low bench at the front centered on `x`: clay jars with sculptures between them. */
function frontBench(x: number): Placement[] {
  return [
    ...row('clay_jar', 3, [x - 0.6, LOW, FRONT_Z], [0.6, 0, 0]),
    ...row('sculpture', 2, [x - 0.3, LOW, FRONT_Z], [0.6, 0, 0]),
  ];
}

export const layout: RoomLayout = {
  statics: [
    ...shell(9, 7.5, 2.8, { floor: C.cream, wall: C.white, trim: C.gray }),
    ...STAIRS.flatMap(([x, height]) => place(block(0.6, height, 0.7, C.white, C.gray), [x, 0, 0])),
    ...[-3.9, 3.9].flatMap((x) =>
      SIDE_Z.flatMap((z) => place(block(0.5, SIDE, 0.5, C.white, C.gray), [x, 0, z])),
    ),
    ...place(cabinet(4, BENCH, 0.5, C.white, C.gray, 6, 'panels'), [0, 0, BENCH_Z]),
    ...place(beam(9, C.gray), [0, RAIL, RAIL_Z]),
    ...place(shelves(1.4, 0.4, [0.6, 1.25, 1.9], C.white), [-3.5, 0, SHELF_Z]),
    ...place(shelves(1.4, 0.4, [0.6, 1.25, 1.9], C.white), [3.5, 0, SHELF_Z]),
    ...place(block(1.8, LOW, 0.5, C.white, C.gray), [-2.6, 0, FRONT_Z]),
    ...place(block(1.8, LOW, 0.5, C.white, C.gray), [2.6, 0, FRONT_Z]),
  ],

  objects: [
    // The stairs: the moon jar on the top plinth.
    { def: 'vase_tall', at: [-1.3, 0.5, 0.15] },
    { def: 'pottery_bowl', at: [-0.65, 1, 0.15] },
    { def: 'moon_jar', at: [0, 1.5, 0] },
    { def: 'pottery_bowl', at: [0.65, 1, 0.15] },
    { def: 'vase_tall', at: [1.3, 0.5, 0.15] },
    { def: 'storage_jar', at: [-1.3, 0, 1] },
    { def: 'storage_jar', at: [1.3, 0, 1] },
    // Plinths along the side walls.
    ...SIDE_Z.flatMap((z, index): Placement[] => [
      { def: index % 2 === 0 ? 'celadon_vase' : 'vase_tall', at: [-3.9, SIDE, z] },
      { def: index % 2 === 0 ? 'vase_tall' : 'celadon_vase', at: [3.9, SIDE, z] },
    ]),
    { def: 'display_case', at: [-3.3, 0, -0.25] },
    { def: 'display_case', at: [3.3, 0, -0.25] },
    // Back bench, and the mobiles hanging in front of it.
    ...row('display_case', 3, [-1.4, BENCH, BENCH_Z], [1.4, 0, 0]),
    ...row('sculpture', 2, [-0.7, BENCH, BENCH_Z], [1.4, 0, 0]),
    ...row('scroll', 2, [-1.85, BENCH, BENCH_Z], [3.7, 0, 0], quarter),
    ...row('scroll', 2, [-0.4, BENCH, BENCH_Z], [0.8, 0, 0], quarter),
    ...row('art_mobile', 3, [-1.4, HUNG, RAIL_Z], [1.4, 0, 0]),
    ...cornerShelf(-3.5),
    ...cornerShelf(3.5),
    ...frontBench(-2.6),
    ...frontBench(2.6),
    // Rope posts around the stairs.
    ...row('stanchion', 2, [-2, 0, -0.9], [0, 0, 1.8]),
    ...row('stanchion', 2, [2, 0, -0.9], [0, 0, 1.8]),
    { def: 'stanchion', at: [0, 0, -1.1], rotY: quarter },
    { def: 'stanchion', at: [0, 0, 1.15], rotY: quarter },
    { def: 'plant_big', at: [-4.1, 0, 2.75] },
    { def: 'plant_big', at: [4.1, 0, 2.75] },
  ],

  markers: [
    { marker: 'cat_spawn', at: [0, 0, -2.6] },
    { marker: 'owner_door', at: [4.1, 0, -3.3] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [9.4, 5.8, 13.5] },
    roomZone(9, 7.5, 2.8),
    hangZone('rail', [0, RAIL - 0.5, RAIL_Z], [4, 1.1, 0.5]),
  ],
};
