// School Classroom: 9 x 7 m. Nine student desks in three columns, the teacher's desk at the back
// under a rail of planet mobiles that fall when something moves them, the science bench on the
// right wall, lockers on the left with the treasure, the golden apple award, on top. A cleaning
// robot drives up and down the two aisles (see module.ts).
import {
  beam,
  cabinet,
  chair,
  door,
  hangZone,
  roomZone,
  shell,
  shelves,
  table,
  wallArt,
} from '../_kit/furniture';
import { C } from '../_kit/palette';
import { place, row, type Placement, type RoomLayout, type Triple } from '../_kit/parts';
import { HANG_DROP } from '../_kit/props';

const DESK = 0.72;
const MAT = DESK + 0.024; // on top of the teacher's desk mat
const BENCH = 0.9;
const RAIL = 2.35; // underside of the rail the mobiles hang from
const RAIL_Z = 2;
const HUNG = RAIL - HANG_DROP;
const LOCKER_X = -4.25;
const BENCH_X = 4.15;
const BOOKS_Z = 3.25;
const quarter = Math.PI / 2;

const COLUMNS = [-1.8, 0, 1.8] as const;
const ROWS = [0.9, -0.4, -1.7] as const;
/** What stands on each student desk besides a pencil cup, row by row from the back. */
const ON_DESKS = [
  ['laptop', 'textbook_stack', 'laptop'],
  ['textbook_stack', 'laptop', 'textbook_stack'],
  ['laptop', 'textbook_stack', 'laptop'],
] as const;

/** Corners of the cleaning robot's patrol: up one aisle, down the other. */
export const PATROL: Triple[] = [
  [-0.9, 0, 1.6],
  [-0.9, 0, -2.9],
  [0.9, 0, -2.9],
  [0.9, 0, 1.6],
];

const desks: Placement[] = ROWS.flatMap((z, line) =>
  COLUMNS.flatMap((x, column): Placement[] => [
    { def: ON_DESKS[line]?.[column] ?? 'laptop', at: [x + 0.1, DESK, z] },
    { def: 'pencil_cup', at: [x - 0.25, DESK, z + 0.12] },
  ]),
);

export const layout: RoomLayout = {
  statics: [
    ...shell(9, 7, 2.8, { floor: C.woodLight, wall: C.cream, trim: C.leaf }),
    ...place(wallArt(2.6, 1.1, C.leaf), [0, 1.1, 3.5]),
    ...place(table(1.8, 0.7, DESK, C.wood), [0, 0, 2.6]),
    ...ROWS.flatMap((z) =>
      COLUMNS.flatMap((x) => [
        ...place(table(0.7, 0.5, DESK, C.woodLight, C.gray), [x, 0, z]),
        ...place(chair(C.sky), [x, 0, z - 0.55], Math.PI),
      ]),
    ),
    ...place(shelves(0.4, 3.6, [0.6, 1.25, 1.9], C.sky, true), [LOCKER_X, 0, 0.4]),
    ...place(cabinet(3.2, BENCH, 0.6, C.white, C.leaf, 6), [BENCH_X, 0, 0.2], quarter),
    ...place(shelves(1.4, 0.4, [0.6, 1.25, 1.9], C.woodLight), [3.4, 0, BOOKS_Z]),
    ...place(beam(9, C.gray), [0, RAIL, RAIL_Z]),
    ...place(door(0.9, 2.1, C.leaf), [4.5, 0, -2.6], quarter),
  ],

  objects: [
    ...desks,
    // Teacher's desk: the mat in the middle carries the clock and the mug.
    { def: 'desk_mat', at: [0, DESK, 2.55] },
    { def: 'clock', at: [-0.18, MAT, 2.55] },
    { def: 'mug', at: [0.18, MAT, 2.55] },
    { def: 'globe', at: [-0.65, DESK, 2.6] },
    { def: 'monitor', at: [0.6, DESK, 2.72] },
    { def: 'textbook_stack', at: [0, DESK, 2.84] },
    { def: 'desk_lamp', at: [0.78, DESK, 2.42] },
    ...row('planet_mobile', 4, [-2.1, HUNG, RAIL_Z], [1.4, 0, 0]),
    // Science bench on the right wall.
    ...row('beaker_rack', 5, [BENCH_X, BENCH, -1.2], [0, 0, 0.7], quarter),
    ...row('microscope', 4, [BENCH_X, BENCH, -0.85], [0, 0, 0.7], quarter),
    // Lockers on the left wall: the golden apple stands on top.
    ...row('paint_jar', 4, [LOCKER_X, 0.6, -1.1], [0, 0, 0.6]),
    ...row('backpack', 2, [LOCKER_X, 0.6, 1.4], [0, 0, 0.5], quarter),
    ...row('trophy', 4, [LOCKER_X, 1.25, -1.1], [0, 0, 0.8]),
    { def: 'laptop', at: [LOCKER_X, 1.25, 1.9], rotY: -quarter },
    { def: 'gold_apple', at: [LOCKER_X, 1.9, 0.4], rotY: -quarter },
    { def: 'plant_small', at: [LOCKER_X, 1.9, -1] },
    { def: 'plant_small', at: [LOCKER_X, 1.9, 1.8] },
    // Bookshelf in the back right corner.
    ...row('globe', 3, [2.95, 0.6, BOOKS_Z], [0.45, 0, 0]),
    ...row('folder_stack', 2, [3, 1.25, BOOKS_Z], [0.8, 0, 0]),
    ...row('speaker', 2, [3.3, 1.25, BOOKS_Z], [0.2, 0, 0]),
    ...row('book', 6, [2.9, 1.9, BOOKS_Z], [0.14, 0, 0]),
    { def: 'plant_small', at: [3.9, 1.9, BOOKS_Z] },
    // Floor: backpacks beside desks, clear of the robot's aisles.
    { def: 'backpack', at: [-1.27, 0, 0.9], rotY: quarter },
    { def: 'backpack', at: [0.53, 0, -0.4], rotY: quarter },
    { def: 'backpack', at: [2.35, 0, -1.7], rotY: quarter },
    ...row('crate', 3, [-3.3, 0, 3.1], [0.5, 0, 0]),
    { def: 'textbook_stack', at: [-1.7, 0, 3.1] },
    { def: 'textbook_stack', at: [1.7, 0, 3.1] },
    { def: 'plant_big', at: [-4, 0, -2.6] },
    { def: 'plant_big', at: [-4, 0, 3] },
    { def: 'plant_big', at: [4.1, 0, 2.4] },
  ],

  markers: [
    { marker: 'cat_spawn', at: [3, 0, -2.5] },
    { marker: 'owner_door', at: [4.1, 0, -2.6] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [9.4, 5.8, 13] },
    roomZone(9, 7, 2.8),
    { marker: 'trigger:desk_mat', at: [0, DESK, 2] },
    hangZone('rail', [0, RAIL - 0.5, RAIL_Z], [5.4, 1.1, 0.9]),
  ],
};
