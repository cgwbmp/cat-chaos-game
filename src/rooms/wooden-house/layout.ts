// Traditional Wooden House: 9 x 6.5 m, split by a wall into a front room and a back room. The
// two doorways are closed by paper sliding doors: swat or pounce at a door to tear through it.
// Fragile pottery stands on low tables; the celadon vase is displayed in the back room.
import { WALL, block, partition, rug, shell, table } from '../_kit/furniture';
import { C } from '../_kit/palette';
import { place, row, type Placement, type RoomLayout } from '../_kit/parts';

const SPLIT_Z = 0.7; // the wall between the rooms
const DOORS = [-2.25, 2.25] as const;
const LOW_TABLE = 0.34;
const DISPLAY = 1;
const STAND = 0.6;
const CHEST = 0.5;

/** A low table set with pottery and a tea set. `mat` adds a tea mat to pull. */
function teaTable(x: number, z: number, mat?: 'a' | 'b'): Placement[] {
  const top = mat ? LOW_TABLE + 0.02 : LOW_TABLE;
  return [
    ...(mat ? [{ def: `tea_mat_${mat}`, at: [x, LOW_TABLE, z] as const }] : []),
    { def: 'pottery_bowl', at: [x - 0.2, top, z - 0.08] },
    { def: 'pottery_bowl', at: [x + 0.2, top, z - 0.08] },
    { def: 'pottery_bowl', at: [x, top, z + 0.1] },
    { def: 'teapot', at: [x - 0.45, LOW_TABLE, z + 0.15] },
    { def: 'cup', at: [x + 0.45, LOW_TABLE, z + 0.18] },
    { def: 'cup', at: [x + 0.48, LOW_TABLE, z - 0.2] },
  ];
}

export const layout: RoomLayout = {
  statics: [
    ...shell(9, 6.5, 2.8, { floor: C.wood, wall: C.paper, trim: C.woodDark }),
    ...partition(4.5, 2.6, C.paper, [-2.25, 0, SPLIT_Z - WALL / 2], { offset: 0, width: 0.96 }),
    ...partition(4.5, 2.6, C.paper, [2.25, 0, SPLIT_Z - WALL / 2], { offset: 0, width: 0.96 }),
    // Back room.
    ...place(block(1.4, DISPLAY, 0.5, C.woodDark), [0, 0, 2.95]),
    ...place(block(0.4, STAND, 0.4, C.woodDark), [-1.3, 0, 2.95]),
    ...place(block(0.4, STAND, 0.4, C.woodDark), [1.3, 0, 2.95]),
    ...place(block(0.4, STAND, 0.4, C.woodDark), [-4.1, 0, 2.9]),
    ...place(block(0.5, LOW_TABLE, 0.5, C.woodDark), [-3.6, 0, 2.3]),
    ...place(block(0.5, LOW_TABLE, 0.5, C.woodDark), [3.6, 0, 2.3]),
    ...place(table(1.2, 0.7, LOW_TABLE, C.woodDark), [-2.7, 0, 2.1]),
    ...place(table(1.2, 0.7, LOW_TABLE, C.woodDark), [2.7, 0, 2.1]),
    ...place(rug(2.2, 1.4, C.celadon, C.paper), [0, 0, 1.8]),
    // Front room.
    ...place(table(1.4, 0.8, LOW_TABLE, C.woodDark), [-1.7, 0, -1.3]),
    ...place(table(1.4, 0.8, LOW_TABLE, C.woodDark), [1.9, 0, -1.5]),
    ...place(block(0.4, STAND, 0.4, C.woodDark), [-4.2, 0, -0.3]),
    ...place(block(0.4, STAND, 0.4, C.woodDark), [4.2, 0, -0.3]),
    ...place(block(0.9, CHEST, 0.5, C.woodDark, C.wood), [-3.9, 0, -2.5]),
    ...place(block(0.9, CHEST, 0.5, C.woodDark, C.wood), [3.9, 0, -2.5]),
  ],

  objects: [
    // Paper doors: two in the doorways, one standing as a screen in the front room.
    { def: 'paper_door_a', at: [DOORS[0], 0, SPLIT_Z - WALL / 2] },
    { def: 'paper_door_b', at: [DOORS[1], 0, SPLIT_Z - WALL / 2] },
    { def: 'paper_door_c', at: [0.1, 0, -1.9] },
    // Back room: the display with the treasure between two porcelain vases.
    { def: 'celadon_vase', at: [0, DISPLAY, 2.95] },
    { def: 'tall_vase', at: [-4.1, STAND, 2.9] },
    { def: 'pottery_bowl', at: [-3.6, LOW_TABLE, 2.3] },
    { def: 'pottery_bowl', at: [3.6, LOW_TABLE, 2.3] },
    { def: 'tall_vase', at: [-0.5, DISPLAY, 2.95] },
    { def: 'tall_vase', at: [0.5, DISPLAY, 2.95] },
    { def: 'lantern', at: [-1.3, STAND, 2.95] },
    { def: 'lantern', at: [1.3, STAND, 2.95] },
    ...teaTable(-2.7, 2.1, 'a'),
    ...teaTable(2.7, 2.1, 'b'),
    ...row('scroll', 2, [-0.5, 0.016, 1.8], [1, 0, 0], Math.PI / 2),
    // Front room.
    ...teaTable(-1.7, -1.3),
    ...teaTable(1.9, -1.5),
    { def: 'tray', at: [-1.2, LOW_TABLE, -1.5] },
    { def: 'tray', at: [2.4, LOW_TABLE, -1.7] },
    { def: 'lantern', at: [-4.2, STAND, -0.3] },
    { def: 'lantern', at: [4.2, STAND, -0.3] },
    { def: 'tall_vase', at: [-4.1, CHEST, -2.5] },
    { def: 'jar', at: [-3.65, CHEST, -2.5] },
    { def: 'tall_vase', at: [4.1, CHEST, -2.5] },
    { def: 'jar', at: [3.65, CHEST, -2.5] },
    ...row('scroll', 2, [-3.2, 0, -0.6], [0, 0, 0.5]),
    { def: 'cushion', at: [-2.7, 0, -1.3] },
    { def: 'cushion', at: [-0.7, 0, -1.3] },
    { def: 'cushion', at: [0.95, 0, -1.5] },
    { def: 'cushion', at: [2.9, 0, -1.5] },
  ],

  markers: [
    { marker: 'cat_spawn', at: [0, 0, -2.8] },
    { marker: 'owner_door', at: [4.2, 0, -3] },
    { marker: 'camera_bounds', at: [0, 3.1, -3.2], scale: [9.4, 5.8, 13] },
    { marker: 'trigger:door_a', at: [DOORS[0], 0.4, SPLIT_Z - WALL / 2] },
    { marker: 'trigger:door_b', at: [DOORS[1], 0.4, SPLIT_Z - WALL / 2] },
    { marker: 'trigger:door_c', at: [0.1, 0.4, -1.9] },
    { marker: 'trigger:mat_a', at: [-2.7, LOW_TABLE, 1.55] },
    { marker: 'trigger:mat_b', at: [2.7, LOW_TABLE, 1.55] },
  ],
};
