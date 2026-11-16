// Flower Shop: 8 x 6.5 m. A stepped display stand with flower buckets on the left, a work table
// with a wrapping cloth to pull in the middle, the counter at the back under a rail of hanging
// planters (they fall when something moves them), a sink in the back right corner with a wet
// floor in front of it, and the treasure, the rare orchid, on top of the right wall shelf.
import {
  beam,
  block,
  cabinet,
  door,
  hangZone,
  roomZone,
  rug,
  shell,
  shelves,
  table,
} from '../_kit/furniture';
import { C } from '../_kit/palette';
import { place, row, type RoomLayout } from '../_kit/parts';
import { HANG_DROP } from '../_kit/props';

const STEPS = [0.3, 0.6, 0.9] as const; // the display stand, lowest step nearest the room
const STEP_X = [-2.875, -3.325, -3.775] as const;
const TABLE = 0.72;
const CLOTH = TABLE + 0.024; // on top of the wrapping cloth
const COUNTER = 0.9;
const BENCH = 0.5;
const RAIL = 2.35; // underside of the rail over the counter
const RAIL_Z = 2.35;
const HUNG = RAIL - HANG_DROP;
const SHELF_X = 3.75;
const WET = 0.016; // on the wet floor mat
const quarter = Math.PI / 2;

export const layout: RoomLayout = {
  statics: [
    ...shell(8, 6.5, 2.8, { floor: C.woodLight, wall: C.mint, trim: C.white }),
    ...STEPS.flatMap((height, step) =>
      place(block(0.4, height, 3, C.white, C.leaf), [STEP_X[step] ?? 0, 0, 0.6]),
    ),
    ...place(table(1.8, 0.9, TABLE, C.white, C.wood), [0.2, 0, 0.2]),
    ...place(cabinet(3.2, COUNTER, 0.6, C.white, C.wood, 6, 'panels'), [-0.3, 0, 2.9]),
    ...place(beam(8, C.woodDark), [0, RAIL, RAIL_Z]),
    ...place(shelves(0.4, 2.6, [0.6, 1.25, 1.9], C.wood, true), [SHELF_X, 0, 0.9]),
    // The sink, and the wet floor in front of it.
    ...place(cabinet(1.4, COUNTER, 0.6, C.sky, C.white, 2), [3, 0, 2.9]),
    ...place(rug(1.9, 1.6, C.water, C.sky), [2.45, 0, 1.8]),
    ...place(block(1.6, BENCH, 0.5, C.wood), [-0.6, 0, -2.7]),
    ...place(door(1.4, 2.1, C.white, 2), [4, 0, -2.2], quarter),
  ],

  objects: [
    // Display stand: buckets on the two low steps, tall vases and pot towers on the top one.
    ...row('flower_bucket', 5, [STEP_X[0], STEPS[0], -0.6], [0, 0, 0.6]),
    ...row('flower_bucket', 5, [STEP_X[1], STEPS[1], -0.6], [0, 0, 0.6]),
    ...row('vase_tall', 3, [STEP_X[2], STEPS[2], -0.6], [0, 0, 1.2]),
    ...row('pot_tower', 2, [STEP_X[2], STEPS[2], 0], [0, 0, 1.2]),
    // Work table: the wrapping cloth in the middle carries the bouquets and ribbons.
    { def: 'wrap_cloth', at: [0.2, TABLE, 0.2] },
    { def: 'bouquet', at: [-0.02, CLOTH, -0.02] },
    { def: 'bouquet', at: [0.42, CLOTH, -0.02] },
    { def: 'bouquet', at: [0.2, CLOTH, 0.42] },
    { def: 'ribbon_roll', at: [0.2, CLOTH, -0.08] },
    { def: 'ribbon_roll', at: [-0.05, CLOTH, 0.4] },
    { def: 'ribbon_roll', at: [0.45, CLOTH, 0.4] },
    { def: 'ribbon_roll', at: [0.2, CLOTH, 0.17] },
    { def: 'vase', at: [-0.5, TABLE, 0] },
    { def: 'vase', at: [-0.45, TABLE, 0.42] },
    { def: 'gift_stack', at: [0.85, TABLE, 0.42] },
    { def: 'watering_can', at: [0.87, TABLE, -0.02], rotY: Math.PI },
    // Counter, and the planters hanging from the rail in front of it.
    ...row('terrarium', 5, [-1.6, COUNTER, 2.95], [0.55, 0, 0]),
    { def: 'gift_stack', at: [0.95, COUNTER, 2.85] },
    { def: 'pot_tower', at: [1.15, COUNTER, 3.08] },
    ...row('hanging_planter', 5, [-1.7, HUNG, RAIL_Z], [0.7, 0, 0]),
    // Right wall shelf: the orchid stands on top.
    ...row('planter_pot', 4, [SHELF_X, 0.6, -0.1], [0, 0, 0.6]),
    ...row('vase_tall', 3, [SHELF_X, 1.25, 0.1], [0, 0, 0.8]),
    { def: 'gift_stack', at: [SHELF_X, 1.25, 0.5] },
    { def: 'orchid_gold', at: [SHELF_X, 1.9, 0.9] },
    { def: 'vase', at: [SHELF_X, 1.9, 0.1] },
    { def: 'vase', at: [SHELF_X, 1.9, 1.7] },
    // Sink and wet floor.
    ...row('watering_can', 3, [2.6, COUNTER, 2.95], [0.4, 0, 0], quarter),
    ...row('bucket', 4, [1.75, WET, 1.3], [0.45, 0, 0]),
    // Front of the shop.
    ...row('basket', 3, [-1.1, BENCH, -2.7], [0.5, 0, 0]),
    ...row('crate', 3, [-2.9, 0, -2.6], [0.45, 0, 0]),
    { def: 'plant_big', at: [-3.6, 0, -1.4] },
    { def: 'plant_big', at: [-3.6, 0, 2.7] },
    { def: 'plant_big', at: [1.8, 0, 2.95] },
    { def: 'plant_big', at: [3.55, 0, -0.9] },
  ],

  markers: [
    { marker: 'cat_spawn', at: [1.2, 0, -1.6] },
    { marker: 'owner_door', at: [3.6, 0, -2.2] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [8.4, 5.8, 12.5] },
    roomZone(8, 6.5, 2.8),
    { marker: 'trigger:wrap', at: [0.2, TABLE, -0.45] },
    { marker: 'trigger:zone_wet_sink', at: [2.45, 0.5, 1.8], scale: [1.9, 1.2, 1.6] },
    hangZone('rail', [-0.3, RAIL - 0.5, RAIL_Z], [3.6, 1.1, 0.5]),
  ],
};
