// Grandma's House: 7 x 6 m. Clay storage jars stand on a low terrace at the back left; they
// are too heavy to swat, so pounce on them from the tall chest next to the terrace. The rice
// cooker on the kitchen counter steams when swatted, and the low table has a runner to pull.
import { block, rug, shell, shelves, table, windowFrame } from '../_kit/furniture';
import { C } from '../_kit/palette';
import { place, row, type RoomLayout } from '../_kit/parts';

const TERRACE = 0.3;
const CHEST = 1.2;
const COUNTER = 0.85;
const LOW_TABLE = 0.36;
const RUNNER = LOW_TABLE + 0.02;
const SIDEBOARD = 0.8;

export const layout: RoomLayout = {
  statics: [
    ...shell(7, 6, 2.8, { floor: C.woodLight, wall: C.paper, trim: C.woodDark }),
    ...place(block(2.6, TERRACE, 1.3, C.sand), [-2.1, 0, 2.3]),
    ...place(block(1, CHEST, 0.5, C.woodDark, C.wood), [-0.1, 0, 2.7]),
    ...place(block(2.6, COUNTER, 0.6, C.cream, C.wood), [2.1, 0, 2.65]),
    ...place(windowFrame(1.2, 0.9), [2.1, 1.4, 3]),
    ...place(rug(2.6, 1.8, C.clay, C.cream), [0.4, 0, -0.2]),
    ...place(table(1.5, 0.9, LOW_TABLE, C.wood, C.woodDark), [0.4, 0, -0.2]),
    ...place(block(0.5, SIDEBOARD, 1.8, C.wood, C.woodDark), [-3.2, 0, -0.6]),
    ...place(shelves(0.4, 1.8, [0.7, 1.3], C.woodDark, true), [3.3, 0, 0.2]),
  ],

  objects: [
    // Jar terrace. The antique set is the treasure.
    ...row('jar_big', 3, [-3, TERRACE, 2.6], [0.7, 0, 0]),
    ...row('jar_big', 2, [-2.65, TERRACE, 2], [0.7, 0, 0]),
    { def: 'jar_antique', at: [-1.2, TERRACE, 2.1] },
    { def: 'lantern', at: [0.2, CHEST, 2.8] },
    { def: 'plant_small', at: [-0.4, CHEST, 2.8] },
    // Kitchen counter: back row, then front row.
    { def: 'rice_cooker', at: [1.2, COUNTER, 2.7] },
    { def: 'kettle', at: [1.68, COUNTER, 2.75] },
    ...row('jar', 3, [2.6, COUNTER, 2.78], [0.26, 0, 0]),
    ...row('plate_stack', 2, [2, COUNTER, 2.5], [0.34, 0, 0]),
    ...row('egg_basket', 2, [2.78, COUNTER, 2.48], [0.36, 0, 0]),
    // Low table with the runner in the middle.
    { def: 'table_runner', at: [0.4, LOW_TABLE, -0.2] },
    { def: 'bowl', at: [0.2, RUNNER, -0.32] },
    { def: 'bowl', at: [0.6, RUNNER, -0.32] },
    { def: 'bowl', at: [0.2, RUNNER, -0.08] },
    { def: 'bowl', at: [0.6, RUNNER, -0.08] },
    { def: 'teapot', at: [0.4, RUNNER, -0.2] },
    { def: 'bowl', at: [-0.15, LOW_TABLE, -0.2] },
    { def: 'bowl', at: [0.97, LOW_TABLE, -0.2] },
    { def: 'teapot', at: [1, LOW_TABLE, 0.1] },
    { def: 'cup', at: [-0.2, LOW_TABLE, 0.1] },
    { def: 'cup', at: [0.95, LOW_TABLE, -0.5] },
    { def: 'tray', at: [-0.08, LOW_TABLE, -0.5] },
    { def: 'cushion', at: [-0.75, 0.016, -0.2] },
    { def: 'cushion', at: [1.55, 0.016, -0.2] },
    // Sideboard on the left wall.
    ...row('frame', 3, [-3.25, SIDEBOARD, -1.25], [0, 0, 0.6], -Math.PI / 2),
    ...row('vase_tall', 2, [-3.2, SIDEBOARD, -0.95], [0, 0, 0.6]),
    { def: 'clock', at: [-3.2, SIDEBOARD, 0.2] },
    // Pottery shelf on the right wall.
    ...row('pottery_bowl', 2, [3.3, 0.7, -0.35], [0, 0, 1]),
    ...row('pottery_bowl', 2, [3.3, 1.3, -0.35], [0, 0, 1]),
    { def: 'lantern', at: [3.3, 0.7, 0.15] },
    { def: 'lantern', at: [3.3, 1.3, 0.15] },
    // Floor.
    { def: 'basket', at: [-2.6, 0, -2.2] },
    { def: 'basket', at: [-2.15, 0, -2.45] },
    { def: 'plant_small', at: [3, 0, -2.3] },
    { def: 'floor_lamp', at: [1.9, 0, 1.6] },
  ],

  markers: [
    { marker: 'cat_spawn', at: [0.4, 0, -2] },
    { marker: 'owner_door', at: [3.3, 0, -2.6] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [7.4, 5.8, 12] },
    { marker: 'trigger:steam', at: [1.2, COUNTER, 2.3] },
    { marker: 'trigger:runner', at: [0.4, LOW_TABLE, -0.8] },
  ],
};
