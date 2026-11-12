// Pop Star Dorm: 8 x 6.5 m. Two beds on the left, a vanity desk at the back, the album shelf
// with the award trophy on the right wall, and a low table in the middle that the manager
// walks around (see module.ts).
import { bed, block, rug, shell, shelves, table, wallArt } from '../_kit/furniture';
import { C } from '../_kit/palette';
import { place, row, type RoomLayout, type Triple } from '../_kit/parts';

const BED = 0.5;
const VANITY = 0.74;
const LOW_TABLE = 0.36;
const TV_STAND = 0.5;
const SHELF_X = 3.75;

/** Corners of the manager's patrol, around the low table. */
export const PATROL: Triple[] = [
  [-1.5, 0, -1.7],
  [2.3, 0, -1.7],
  [2.3, 0, 0.9],
  [-1.5, 0, 0.9],
];

export const layout: RoomLayout = {
  statics: [
    ...shell(8, 6.5, 2.8, { floor: C.cream, wall: C.lavender, trim: C.white }),
    ...place(bed(1.2, 2, C.rose), [-3.2, 0, 2.1]),
    ...place(bed(1.2, 2, C.sky), [-1.7, 0, 2.1]),
    ...place(table(2.6, 0.6, VANITY, C.white, C.rose), [1, 0, 2.85]),
    ...place(wallArt(1.6, 0.9, C.sky), [1, 1.4, 3.25]),
    ...place(shelves(0.4, 2.4, [0.6, 1.2, 1.8], C.white, true), [SHELF_X, 0, 0.6]),
    ...place(rug(2.4, 1.6, C.rose), [0.4, 0, -0.5]),
    ...place(table(1.2, 0.7, LOW_TABLE, C.white, C.rose), [0.4, 0, -0.5]),
    ...place(block(1.6, TV_STAND, 0.45, C.white, C.lavender), [-2.6, 0, -2.9]),
  ],

  objects: [
    // Beds.
    { def: 'plush', at: [-3.2, BED, 1.5] },
    { def: 'plush', at: [-3.2, BED, 2.2] },
    { def: 'plush', at: [-1.7, BED, 1.5] },
    { def: 'plush', at: [-1.7, BED, 2.2] },
    { def: 'headphones', at: [-2.9, BED, 1.85] },
    { def: 'phone', at: [-1.45, BED, 1.9] },
    // Vanity desk.
    { def: 'makeup_kit', at: [-0.12, VANITY, 2.8] },
    { def: 'makeup_kit', at: [0.18, VANITY, 2.95] },
    { def: 'ring_light', at: [0.5, VANITY, 3] },
    { def: 'laptop', at: [0.85, VANITY, 2.8] },
    { def: 'mic', at: [1.15, VANITY, 3] },
    { def: 'laptop', at: [1.5, VANITY, 2.8] },
    { def: 'ring_light', at: [1.85, VANITY, 3] },
    { def: 'mic', at: [2.02, VANITY, 2.72] },
    { def: 'makeup_kit', at: [2.18, VANITY, 2.98] },
    { def: 'vase', at: [1.2, VANITY, 2.68] },
    // Album shelf on the right wall: stacks low, the award and a row of albums on top.
    ...row('album_stack', 3, [SHELF_X, 0.6, -0.2], [0, 0, 0.8]),
    ...row('album_stack', 3, [SHELF_X, 1.2, -0.2], [0, 0, 0.8]),
    { def: 'award', at: [SHELF_X, 1.8, 0.45] },
    ...row('album', 6, [SHELF_X, 1.8, 0.8], [0, 0, 0.14], Math.PI / 2),
    ...row('frame', 3, [SHELF_X, 1.8, -0.4], [0, 0, 0.26], -Math.PI / 2),
    // Low table and the floor around it.
    { def: 'console', at: [0.15, LOW_TABLE, -0.5] },
    ...row('lightstick', 4, [0.5, LOW_TABLE, -0.7], [0.14, 0, 0.1]),
    ...row('can', 4, [-0.1, LOW_TABLE, -0.25], [0.12, 0, 0]),
    ...row('snack_bag', 4, [0.55, LOW_TABLE, -0.28], [0.1, 0, 0.02], 0.4),
    { def: 'phone', at: [0.85, LOW_TABLE, -0.45] },
    { def: 'phone', at: [-0.05, LOW_TABLE, -0.72] },
    ...row('lightstick', 4, [-0.9, 0, 0.3], [0.5, 0, 0.12]),
    { def: 'cushion', at: [-0.65, 0.016, -0.5] },
    { def: 'cushion', at: [1.45, 0.016, -0.5] },
    { def: 'cushion', at: [0.4, 0.016, -1.25] },
    { def: 'headphones', at: [0.35, LOW_TABLE, -0.3] },
    { def: 'headphones', at: [1.8, 0, 1.6] },
    // Practice corner at the front left: a screen on a stand between two speakers.
    { def: 'monitor', at: [-2.6, TV_STAND, -2.9], rotY: Math.PI },
    { def: 'speaker', at: [-3.2, TV_STAND, -2.9] },
    { def: 'speaker', at: [-2, TV_STAND, -2.9] },
    { def: 'frame', at: [-2.6, 0, -2.5], rotY: Math.PI },
    { def: 'floor_lamp', at: [-0.7, 0, 2.95] },
    { def: 'floor_lamp', at: [3.4, 0, 2.9] },
    { def: 'vase', at: [SHELF_X, 1.8, 1.68] },
  ],

  markers: [
    { marker: 'cat_spawn', at: [0.4, 0, -2.4] },
    { marker: 'owner_door', at: [3.7, 0, -2.8] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [8.4, 5.8, 12.5] },
  ],
};
