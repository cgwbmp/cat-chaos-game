// Karaoke Room: 8 x 6.5 m, 3 m high. Sofas along the back and the left wall, a low table with a
// runner to pull, a stage at the front right. The sofas are springy: a jump from a seat goes
// about twice as high. The treasure, the crystal disco ball, hangs from the ceiling beam over
// the front of the back sofa with party lanterns beside it; hanging things fall when the cat
// jumps into them.
import {
  beam,
  block,
  bounceZone,
  cabinet,
  door,
  hangZone,
  roomZone,
  rug,
  shell,
  shelves,
  sofa,
  table,
} from '../_kit/furniture';
import { C } from '../_kit/palette';
import { place, row, type RoomLayout } from '../_kit/parts';
import { HANG_DROP } from '../_kit/props';

const SEAT = 0.4;
const LOW_TABLE = 0.4;
const CLOTH = LOW_TABLE + 0.024; // on top of the runner
const STAND = 0.5;
const BAR = 0.95;
const STAGE = 0.4;
const TABLE = 0.72;
const BEAM = 2.85; // underside of the ceiling beam
const BEAM_Z = 2.45;
const HUNG = BEAM - HANG_DROP;
const SHELF_Z = 3;
const TV_X = 3.7;
const quarter = Math.PI / 2;

export const layout: RoomLayout = {
  statics: [
    ...shell(8, 6.5, 3, { floor: C.plum, wall: C.lavender, trim: C.rose }),
    ...place(sofa(3.2, C.coral), [0, 0, 2.8]),
    ...place(sofa(2.2, C.coral), [-3.55, 0, 0.9], -quarter),
    ...place(rug(2.8, 1.6, C.rose), [0, 0, 1.5]),
    ...place(table(2, 0.8, LOW_TABLE, C.white, C.gold), [0, 0, 1.5]),
    ...place(cabinet(2.4, STAND, 0.45, C.white, C.rose, 3), [TV_X, 0, 0.6], quarter),
    ...place(shelves(1.2, 0.4, [0.6, 1.25, 1.9], C.white), [-2.9, 0, SHELF_Z]),
    ...place(cabinet(1.4, BAR, 0.5, C.white, C.gold, 2, 'glass'), [2.8, 0, 2.95]),
    ...place(block(1.8, STAGE, 1.3, C.lavender, C.rose), [2.7, 0, -2.3]),
    ...place(table(1.2, 0.6, TABLE, C.white, C.gold), [-2.2, 0, -2.2]),
    ...place(beam(8, C.charcoal), [0, BEAM, BEAM_Z]),
    ...place(door(0.9, 2.1, C.rose), [-4, 0, -2.2], -quarter),
  ],

  objects: [
    // Hanging from the beam: the disco ball over the sofa's front edge, lanterns beside it.
    { def: 'disco_ball', at: [0, HUNG, BEAM_Z] },
    { def: 'hanging_lantern', at: [-2.9, HUNG, BEAM_Z] },
    { def: 'hanging_lantern', at: [-1.9, HUNG, BEAM_Z] },
    { def: 'hanging_lantern', at: [1.9, HUNG, BEAM_Z] },
    { def: 'hanging_lantern', at: [2.9, HUNG, BEAM_Z] },
    // Low table: the runner in the middle carries what stands on it.
    { def: 'table_runner', at: [0, LOW_TABLE, 1.5] },
    { def: 'tambourine', at: [-0.22, CLOTH, 1.32] },
    { def: 'tambourine', at: [0.22, CLOTH, 1.68] },
    { def: 'hand_mic', at: [-0.2, CLOTH, 1.68], rotY: 0.5 },
    { def: 'hand_mic', at: [0.2, CLOTH, 1.32], rotY: 2 },
    { def: 'hand_mic', at: [0, CLOTH, 1.5] },
    { def: 'glass', at: [-0.02, CLOTH, 1.2] },
    { def: 'glass', at: [0.02, CLOTH, 1.8] },
    { def: 'songbook_stack', at: [-0.7, LOW_TABLE, 1.5] },
    { def: 'songbook_stack', at: [0.7, LOW_TABLE, 1.5] },
    { def: 'can', at: [-0.55, LOW_TABLE, 1.25] },
    { def: 'can', at: [-0.85, LOW_TABLE, 1.25] },
    { def: 'can', at: [0.55, LOW_TABLE, 1.78] },
    { def: 'can', at: [0.85, LOW_TABLE, 1.78] },
    { def: 'bottle', at: [-0.6, LOW_TABLE, 1.78] },
    { def: 'bottle', at: [-0.85, LOW_TABLE, 1.75] },
    { def: 'bottle', at: [0.6, LOW_TABLE, 1.25] },
    { def: 'tambourine', at: [0.85, LOW_TABLE, 1.25] },
    { def: 'remote', at: [-0.48, LOW_TABLE, 1.5] },
    { def: 'remote', at: [0.48, LOW_TABLE, 1.5] },
    // Sofas.
    { def: 'tambourine', at: [-1, SEAT, 2.7] },
    { def: 'hand_mic', at: [0.9, SEAT, 2.7], rotY: 1 },
    { def: 'hand_mic', at: [-3.45, SEAT, 0.5], rotY: quarter },
    { def: 'cushion', at: [0.2, SEAT, 2.72] },
    { def: 'cushion', at: [-3.45, SEAT, 1.4] },
    // Shelf in the back left corner.
    ...row('speaker', 3, [-3.25, 0.6, SHELF_Z], [0.35, 0, 0]),
    { def: 'cup_tower', at: [-3.15, 1.25, SHELF_Z] },
    { def: 'songbook_stack', at: [-2.6, 1.25, SHELF_Z] },
    ...row('neon_sign', 2, [-3.2, 1.9, SHELF_Z], [0.6, 0, 0]),
    // Drinks fridge in the back right corner.
    { def: 'neon_sign', at: [2.4, BAR, 3.05] },
    { def: 'cup_tower', at: [2.8, BAR, 2.95] },
    { def: 'bottle', at: [3, BAR, 3.08] },
    { def: 'bottle', at: [3.15, BAR, 2.88] },
    { def: 'glass', at: [3.32, BAR, 3.08] },
    { def: 'glass', at: [3.38, BAR, 2.85] },
    // Screen wall on the right.
    { def: 'karaoke_machine', at: [TV_X, STAND, -0.3], rotY: quarter },
    { def: 'cup_tower', at: [TV_X, STAND, 0.1] },
    { def: 'monitor', at: [TV_X, STAND, 0.6], rotY: quarter },
    { def: 'karaoke_machine', at: [TV_X, STAND, 1.5], rotY: quarter },
    // Stage.
    { def: 'ring_light', at: [1.95, STAGE, -2.75] },
    { def: 'monitor', at: [2.5, STAGE, -2.75] },
    { def: 'karaoke_machine', at: [3.15, STAGE, -2.75] },
    { def: 'speaker', at: [3.5, STAGE, -2.75] },
    { def: 'speaker', at: [1.95, STAGE, -2] },
    { def: 'mic_stand', at: [2.35, STAGE, -2] },
    { def: 'ring_light', at: [2.75, STAGE, -2] },
    { def: 'mic_stand', at: [3.1, STAGE, -2] },
    { def: 'ring_light', at: [3.45, STAGE, -2] },
    // Snack table at the front left.
    { def: 'cup_tower', at: [-2.6, TABLE, -2.2] },
    { def: 'laptop', at: [-2.2, TABLE, -2.2] },
    { def: 'speaker', at: [-1.8, TABLE, -2.25] },
    // Floor.
    ...row('crate', 3, [-1.3, 0, -2.2], [0.45, 0, 0]),
    ...row('crate', 3, [0.3, 0, -2.6], [0.5, 0, 0]),
    { def: 'floor_lamp', at: [-3.6, 0, -0.6] },
    { def: 'floor_lamp', at: [1.88, 0, 2.95] },
    { def: 'floor_lamp', at: [-3.6, 0, -3] },
    { def: 'plant_big', at: [3.6, 0, 2.25] },
    { def: 'plant_big', at: [-1.95, 0, 2.95] },
    { def: 'plant_big', at: [3.6, 0, -1.1] },
  ],

  markers: [
    { marker: 'cat_spawn', at: [0, 0, -1.2] },
    { marker: 'owner_door', at: [-3.6, 0, -2.2] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [8.4, 5.8, 12.5] },
    roomZone(8, 6.5, 3),
    { marker: 'trigger:runner', at: [0, LOW_TABLE, 0.9] },
    bounceZone('back', [0, SEAT, 2.7], 2.84, 0.6),
    bounceZone('side', [-3.45, SEAT, 0.9], 0.6, 1.84),
    hangZone('beam', [0, BEAM - 0.5, BEAM_Z], [6.4, 1.1, 0.7]),
  ],
};
