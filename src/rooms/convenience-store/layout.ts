// Corner Convenience Store: 7 x 6 m. A row of free-standing display shelves in the middle falls
// like dominoes when the back one is swatted; stocked wall shelves on the left, a drinks cooler
// at the back with milk cartons on top, and the register on the right with the golden lucky cat.
import { cabinet, door, roomZone, rug, shell, shelves, wallLamp } from '../_kit/furniture';
import { C } from '../_kit/palette';
import { place, row, type RoomLayout } from '../_kit/parts';
import { COOLER as COOLER_AT, WALL_LAMPS } from './lamps';

const COUNTER = 0.9;
const COOLER = 1;
const UNIT_TOP = 1.34;
// The display shelves stand 0.95 m apart along z: far enough for a falling one to pick up speed,
// close enough (they are 1.34 m tall) to hit the next one near its top.
const UNIT_X = -0.6;
const UNIT_Z = [1.6, 0.65, -0.3, -1.25] as const;

export const layout: RoomLayout = {
  statics: [
    ...shell(7, 6, 2.8, { floor: C.gray, wall: C.white, trim: C.sky }),
    // Wall shelves along the left wall.
    ...place(shelves(0.4, 3.6, [0.5, 1, 1.5], C.sky, true), [-3.3, 0, 0.6]),
    // Drinks cooler along the back wall.
    ...place(cabinet(2.4, COOLER, 0.6, C.white, C.sky, 4, 'glass'), COOLER_AT),
    // Register counter and the shelf behind it.
    ...place(cabinet(1.8, COUNTER, 0.6, C.cream, C.coral, 3, 'panels'), [2.3, 0, 1.2]),
    ...place(shelves(1.6, 0.35, [0.7, 1.3], C.sky), [2.4, 0, 2.8]),
    ...place(rug(1.2, 0.8, C.coral), [2.3, 0, -2.2]),
    // Sliding entrance on the right wall.
    ...place(door(1.4, 2.1, C.sky, 2), [3.5, 0, -2], Math.PI / 2),
    ...WALL_LAMPS.flatMap(({ at, rotY }) => place(wallLamp(), at, rotY)),
  ],

  objects: [
    // Domino row: four display shelves, each with drinks on top.
    ...UNIT_Z.map((z) => ({ def: 'shelf_unit', at: [UNIT_X, 0, z] as const })),
    ...UNIT_Z.flatMap((z) => [
      { def: 'carton', at: [UNIT_X - 0.25, UNIT_TOP, z] as const },
      { def: 'bottle', at: [UNIT_X + 0.25, UNIT_TOP, z] as const },
    ]),
    // Left wall shelves, three levels.
    ...row('snack_bag', 6, [-3.3, 1.5, -0.7], [0, 0, 0.5], Math.PI / 2),
    ...row('can', 6, [-3.3, 1, -0.6], [0, 0, 0.45]),
    ...row('noodle_cup', 5, [-3.3, 0.5, -0.5], [0, 0, 0.5]),
    // Milk on the cooler.
    ...row('carton', 6, [-2.3, COOLER, 2.7], [0.36, 0, 0]),
    // Register.
    { def: 'lucky_cat', at: [2.9, COUNTER, 1.2] },
    ...row('snack_box', 3, [1.7, COUNTER, 1.2], [0.3, 0, 0]),
    ...row('promo_tower', 2, [2, 1.3, 2.8], [0.8, 0, 0]),
    // Floor.
    ...row('magazine_stack', 2, [1.2, 0, -2.3], [0.45, 0, 0]),
    ...row('crate', 2, [-2.6, 0, -2.3], [0.5, 0, 0]),
    ...row('crate', 2, [0.9, 0, 2.6], [0.5, 0, 0]),
    ...row('basket', 2, [3.0, 0, -0.6], [0, 0, 0.45]),
  ],

  markers: [
    { marker: 'cat_spawn', at: [0.8, 0, -2] },
    { marker: 'owner_door', at: [3.2, 0, -2] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [7.4, 5.8, 12] },
    roomZone(7, 6, 2.8),
  ],
};
