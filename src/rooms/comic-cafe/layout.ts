// Comic Book Café: 8 x 7 m. A row of free-standing bookcases on the left falls like dominoes
// when the back one is swatted. The treasure, the golden robot figure, stands on a wall shelf
// 2 m up that no normal jump reaches: the beanbags under it are springy, and a jump from one
// goes about twice as high. Low reading tables, a sofa on the right, the snack counter at the
// back.
import {
  beanbag,
  bounceZone,
  cabinet,
  door,
  roomZone,
  rug,
  shell,
  shelves,
  sofa,
  table,
  wallShelf,
} from '../_kit/furniture';
import { C } from '../_kit/palette';
import { place, row, type RoomLayout, type Triple } from '../_kit/parts';

const SEAT = 0.4;
const LOW_TABLE = 0.36;
const COUNTER = 0.9;
const LOFT = 2; // the wall shelf with the treasure
const LOFT_Z = 3.25;
const UNIT_TOP = 1.34;
// The bookcases stand 0.95 m apart along z, like the display shelves of the convenience store.
const UNIT_X = -1.6;
const UNIT_Z = [2, 1.05, 0.1, -0.85, -1.8] as const;
const SHELF_X = -3.75;
const SOFA_X = 3.45;
const quarter = Math.PI / 2;

/** Beanbags: two under the wall shelf, one in the middle of the room. */
const BEANBAGS: Triple[] = [
  [1.2, 0, 2.3],
  [2.6, 0, 2.3],
  [0.2, 0, -0.3],
];
const TABLES: Triple[] = [
  [1.9, 0, 0.7],
  [0.6, 0, -1.9],
];

export const layout: RoomLayout = {
  statics: [
    ...shell(8, 7, 2.8, { floor: C.wood, wall: C.cream, trim: C.woodDark }),
    ...place(wallShelf(2.6, 0.45, C.woodDark), [1.9, LOFT, LOFT_Z]),
    ...BEANBAGS.flatMap((at, index) => place(beanbag(index === 1 ? C.lemon : C.coral), at)),
    ...TABLES.flatMap((at) => [
      ...place(rug(1.6, 1.2, C.peach), at),
      ...place(table(1, 0.7, LOW_TABLE, C.woodLight), at),
    ]),
    ...place(cabinet(2.4, COUNTER, 0.6, C.cream, C.coral, 4, 'panels'), [-2.4, 0, 3.15]),
    ...place(shelves(0.4, 3.2, [0.6, 1.25, 1.9], C.woodDark, true), [SHELF_X, 0, -0.6]),
    ...place(sofa(2.4, C.teal), [3.55, 0, -0.9], quarter),
    ...place(door(0.9, 2.1, C.coral), [-0.3, 0, 3.5]),
  ],

  objects: [
    // Domino row: five bookcases, each with a reading lamp and a mug on top.
    ...UNIT_Z.map((z) => ({ def: 'bookcase', at: [UNIT_X, 0, z] as const })),
    ...UNIT_Z.flatMap((z) => [
      { def: 'reading_lamp', at: [UNIT_X - 0.25, UNIT_TOP, z] as const },
      { def: 'mug', at: [UNIT_X + 0.25, UNIT_TOP, z] as const },
    ]),
    // Wall shelf: the robot in the middle of the collector figures.
    { def: 'robot_figure', at: [1.9, LOFT, LOFT_Z] },
    ...row('figure', 2, [0.9, LOFT, LOFT_Z], [0.5, 0, 0]),
    ...row('figure', 2, [2.4, LOFT, LOFT_Z], [0.5, 0, 0]),
    // Reading tables.
    ...TABLES.flatMap(([x, , z]): RoomLayout['objects'] => [
      { def: 'comic_stack', at: [x - 0.3, LOW_TABLE, z - 0.15] },
      { def: 'comic_stack', at: [x + 0.3, LOW_TABLE, z + 0.15] },
      { def: 'console', at: [x - 0.28, LOW_TABLE, z + 0.2] },
      { def: 'console', at: [x + 0.25, LOW_TABLE, z - 0.2] },
      { def: 'mug', at: [x, LOW_TABLE, z] },
    ]),
    // Snack counter.
    { def: 'cup_tower', at: [-3.4, COUNTER, 3.2] },
    { def: 'cup_tower', at: [-3.15, COUNTER, 3.05] },
    { def: 'cup_tower', at: [-2.9, COUNTER, 3.2] },
    ...row('kettle', 2, [-2.6, COUNTER, 3.18], [0.28, 0, 0]),
    ...row('ramen_pot', 2, [-1.95, COUNTER, 3.18], [0.42, 0, 0]),
    ...row('noodle_cup', 3, [-2.7, COUNTER, 2.96], [0.2, 0, 0]),
    // Left wall shelf.
    ...row('book', 4, [SHELF_X, 0.6, -2], [0, 0, 0.14], quarter),
    ...row('speaker', 2, [SHELF_X, 0.6, -0.9], [0, 0, 0.6]),
    ...row('game_stack', 3, [SHELF_X, 1.25, -1.9], [0, 0, 0.6]),
    ...row('laptop', 2, [SHELF_X, 1.25, -0.1], [0, 0, 0.6], -quarter),
    ...row('figure', 3, [SHELF_X, 1.9, -1.8], [0, 0, 1.2]),
    // Sofa.
    ...row('plush', 3, [SOFA_X, SEAT, -1.6], [0, 0, 0.7]),
    ...row('cushion', 2, [SOFA_X, SEAT, -1.25], [0, 0, 0.7]),
    // Floor.
    { def: 'comic_stack', at: [-0.4, 0, 1.6] },
    { def: 'comic_stack', at: [2.9, 0, 1] },
    { def: 'magazine_stack', at: [-0.5, 0, 0.9] },
    { def: 'magazine_stack', at: [3.3, 0, 1.3] },
    { def: 'floor_lamp', at: [3.6, 0, 0.75] },
    { def: 'floor_lamp', at: [0.4, 0, 3.2] },
    { def: 'floor_lamp', at: [-3.5, 0, -3] },
    { def: 'plant_big', at: [3.6, 0, 2.9] },
    { def: 'plant_big', at: [-3.6, 0, 1.6] },
    { def: 'plant_big', at: [3.5, 0, -3] },
    ...row('crate', 2, [-3, 0, -2.9], [0.5, 0, 0]),
    ...row('crate', 2, [1.9, 0, -3], [0.5, 0, 0]),
  ],

  markers: [
    { marker: 'cat_spawn', at: [-0.6, 0, -1.2] },
    { marker: 'owner_door', at: [-0.3, 0, 3.1] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [8.4, 5.8, 13] },
    roomZone(8, 7, 2.8),
    ...BEANBAGS.map(([x, , z], index) => bounceZone(`beanbag_${index}`, [x, SEAT, z], 0.7, 0.7)),
    bounceZone('sofa', [SOFA_X, SEAT, -0.9], 0.6, 2.04),
  ],
};
