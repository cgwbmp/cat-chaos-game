// Rooftop Garden: 9 x 7 m, open to the sky behind a low wall. A wooden deck with a tea table on
// the left and kimchi jars beside it, too heavy to break without a pounce from the deck. A line
// of lanterns and planters hangs across the middle; they fall when something moves them. The
// lawn at the front right is wet from the sprinkler. The treasure, the prize bonsai, stands on
// the water tank at the back right: up the cooler unit first.
import { block, hangZone, roomZone, rug, shell, table } from '../_kit/furniture';
import { C } from '../_kit/palette';
import { box, place, row, type RoomLayout } from '../_kit/parts';
import { HANG_DROP } from '../_kit/props';

const DECK = 0.45;
const TEA_TABLE = DECK + 0.32;
const MAT = TEA_TABLE + 0.024; // on top of the tea mat
const LEDGE = 0.5;
const UNIT = 0.65; // the cooler unit, a step up to the tank
const TANK = 1.3;
const POTTING = 0.72;
const LINE = 2.35; // underside of the line the lanterns hang from
const LINE_Z = 0.5;
const HUNG = LINE - HANG_DROP;
const LEDGE_Z = 3.25;
const LAWN = 0.016; // on the lawn
const quarter = Math.PI / 2;

export const layout: RoomLayout = {
  statics: [
    ...shell(9, 7, 1, { floor: C.gray, wall: C.cream, trim: C.slate }),
    ...place(block(2.6, DECK, 2, C.wood, C.woodLight), [-1.6, 0, 0.6]),
    ...place(table(1, 0.6, 0.32, C.woodDark), [-1.6, DECK, 0.9]),
    ...place(block(1.6, TANK, 1.4, C.sky, C.slate), [3.5, 0, 2.6]),
    ...place(block(1, UNIT, 0.7, C.white, C.gray), [2.1, 0, 2.9]),
    ...place(block(4.2, LEDGE, 0.45, C.cream, C.slate), [-1.4, 0, LEDGE_Z]),
    ...place(table(1.4, 0.6, POTTING, C.woodLight), [3.6, 0, -0.6]),
    ...place(rug(2.6, 1.8, C.leaf, C.mint), [1.6, 0, -2]),
    // The line across the roof, between two posts.
    box(8.6, 0.05, 0.05, C.charcoal, [0, LINE, LINE_Z]),
    box(0.1, LINE + 0.05, 0.1, C.woodDark, [-4.3, 0, LINE_Z]),
    box(0.1, LINE + 0.05, 0.1, C.woodDark, [4.3, 0, LINE_Z]),
  ],

  objects: [
    // Deck: the tea mat on the low table carries the teapot and two cups.
    { def: 'tea_mat', at: [-1.6, TEA_TABLE, 0.9] },
    { def: 'teapot', at: [-1.6, MAT, 0.9] },
    { def: 'cup', at: [-1.82, MAT, 0.86] },
    { def: 'cup', at: [-1.38, MAT, 0.94] },
    { def: 'cup', at: [-2.02, TEA_TABLE, 0.75] },
    { def: 'cup', at: [-1.18, TEA_TABLE, 1.05] },
    { def: 'cushion', at: [-2.5, DECK, 0.9] },
    { def: 'cushion', at: [-0.7, DECK, 0.9] },
    { def: 'cushion', at: [-1.6, DECK, 0.2] },
    { def: 'cushion', at: [-1.6, DECK, 1.38] },
    { def: 'lantern', at: [-2.7, DECK, -0.2] },
    { def: 'lantern', at: [-0.5, DECK, -0.2] },
    { def: 'basket', at: [-2.5, DECK, 1.4] },
    { def: 'basket', at: [-0.7, DECK, 1.4] },
    { def: 'basket', at: [-2.45, DECK, 0.3] },
    // Kimchi jars beside the deck.
    ...row('kimchi_jar', 3, [0.15, 0, -0.1], [0, 0, 0.65]),
    ...row('kimchi_jar', 3, [0.8, 0, -0.1], [0, 0, 0.65]),
    // The line: lanterns and planters.
    ...row('hanging_lantern', 2, [-3.4, HUNG, LINE_Z], [1.2, 0, 0]),
    ...row('hanging_planter', 2, [-1, HUNG, LINE_Z], [1.4, 0, 0]),
    ...row('hanging_lantern', 2, [1.6, HUNG, LINE_Z], [1.2, 0, 0]),
    // Ledge along the back wall.
    ...row('sauce_jar', 4, [-3.2, LEDGE, LEDGE_Z], [0.6, 0, 0]),
    ...row('tomato_basket', 5, [-0.95, LEDGE, LEDGE_Z], [0.38, 0, 0]),
    // Planter boxes along the left wall and at the back.
    ...row('planter_box', 4, [-4.2, 0, -2.6], [0, 0, 0.8], quarter),
    { def: 'planter_box', at: [1.15, 0, 3.3] },
    // Water tank and cooler unit.
    { def: 'bonsai', at: [3.5, TANK, 2.6] },
    { def: 'plant_small', at: [3, TANK, 2.2] },
    { def: 'plant_small', at: [4, TANK, 3] },
    { def: 'plant_small', at: [1.9, UNIT, 2.9] },
    { def: 'plant_small', at: [2.35, UNIT, 2.9] },
    // Potting table.
    { def: 'pot_tower', at: [3.1, POTTING, -0.45] },
    { def: 'pot_tower', at: [3.35, POTTING, -0.75] },
    { def: 'pot_tower', at: [3.6, POTTING, -0.45] },
    { def: 'watering_can', at: [3.85, POTTING, -0.72], rotY: Math.PI },
    { def: 'watering_can', at: [4.1, POTTING, -0.45], rotY: Math.PI },
    // Lawn.
    ...row('stool', 4, [0.7, LAWN, -1.4], [0.6, 0, 0]),
    ...row('flower_bucket', 3, [1, LAWN, -1.9], [0.6, 0, 0]),
    ...row('bucket', 4, [0.7, LAWN, -2.45], [0.55, 0, 0]),
    // Floor.
    ...row('crate', 4, [-3.3, 0, -2.9], [0.5, 0, 0]),
    { def: 'plant_big', at: [-3.9, 0, 2.3] },
    { def: 'plant_big', at: [-3.9, 0, 1.3] },
    { def: 'plant_big', at: [1.2, 0, 2.4] },
    { def: 'plant_big', at: [4.1, 0, 1.2] },
    { def: 'plant_big', at: [4, 0, -2.6] },
  ],

  markers: [
    { marker: 'cat_spawn', at: [-0.6, 0, -2.2] },
    { marker: 'owner_door', at: [4.1, 0, -1.7] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [9.4, 5.8, 13] },
    roomZone(9, 7, 2.8),
    { marker: 'trigger:tea_mat', at: [-1.6, TEA_TABLE, 0.3] },
    { marker: 'trigger:zone_wet_lawn', at: [1.6, 0.5, -2], scale: [2.6, 1.2, 1.8] },
    hangZone('line', [-0.3, LINE - 0.5, LINE_Z], [6.8, 1.1, 0.5]),
  ],
};
