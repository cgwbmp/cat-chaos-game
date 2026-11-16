// Luxury Penthouse (finale): 12 x 8 m, 3 m high, in three areas. The lounge on the left has a
// springy sofa (a jump from it goes about twice as high) under a wall shelf of awards 2 m up.
// The dining table in the middle has a tablecloth to pull, and over it hangs the treasure, the
// crystal chandelier; it falls when something moves it. The bar and the pool are on the right:
// the floor around the pool is wet. A robot vacuum circles the dining table (see module.ts).
import {
  bath,
  beam,
  block,
  bounceZone,
  cabinet,
  chair,
  door,
  hangZone,
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
import { HANG_DROP } from '../_kit/props';

const SEAT = 0.4;
const COFFEE = 0.4;
const STAND = 0.5;
const DINING = 0.76;
const CLOTH = DINING + 0.024; // on top of the tablecloth
const PIANO = 0.9;
const BAR = 0.95;
const RIM = 0.34;
const PLINTH = 0.8;
const LOFT = 2; // the wall shelf over the sofa
const BEAM = 2.85; // underside of the ceiling beam
const BEAM_Z = 0.2;
const HUNG = BEAM - HANG_DROP;
const TABLE_X = 0.6;
const TV_X = -5.7;
const SHELF_X = 5.75;
const BAR_Z = 3.6;
const SOFA_Z = 3.45;
const LOFT_Z = 3.75;
const WET = 0.016; // on the wet floor mat
const quarter = Math.PI / 2;

/** Corners of the robot vacuum's patrol, around the dining table and its chairs. */
export const PATROL: Triple[] = [
  [-1.3, 0, -1.5],
  [2.5, 0, -1.5],
  [2.5, 0, 1.9],
  [-1.3, 0, 1.9],
];

export const layout: RoomLayout = {
  statics: [
    ...shell(12, 8, 3, { floor: C.cream, wall: C.slate, trim: C.gold }),
    // Lounge.
    ...place(sofa(3, C.blue), [-3.8, 0, 3.55]),
    ...place(wallShelf(2.6, 0.45, C.woodDark), [-3.8, LOFT, LOFT_Z]),
    ...place(rug(2.6, 1.8, C.sky), [-3.8, 0, 2]),
    ...place(table(1.6, 0.8, COFFEE, C.white, C.gold), [-3.8, 0, 2]),
    ...place(cabinet(2.4, STAND, 0.45, C.white, C.gold, 3), [TV_X, 0, 1.2], -quarter),
    ...[-4.4, -3.2, -2].flatMap((x) =>
      place(block(0.5, PLINTH, 0.5, C.white, C.gold), [x, 0, -3.3]),
    ),
    // Dining.
    ...place(table(2.4, 1.1, DINING, C.woodDark), [TABLE_X, 0, 0.2]),
    ...place(chair(C.plum), [-0.2, 0, -0.75], Math.PI),
    ...place(chair(C.plum), [1.4, 0, -0.75], Math.PI),
    ...place(chair(C.plum), [-0.2, 0, 1.15]),
    ...place(chair(C.plum), [1.4, 0, 1.15]),
    ...place(beam(12, C.charcoal), [0, BEAM, BEAM_Z]),
    // The piano: the keyboard is a step up to its top.
    ...place(block(1.6, PIANO, 1.3, C.charcoal), [0.3, 0, 3.25]),
    ...place(block(1.4, 0.74, 0.2, C.charcoal, C.white), [0.3, 0, 2.455]),
    // Bar, pool and the shelf on the right wall.
    ...place(cabinet(3, BAR, 0.6, C.charcoal, C.gold, 5, 'panels'), [3.9, 0, BAR_Z]),
    ...place(rug(3.4, 3, C.sky, C.white), [4.3, 0, -0.9]),
    ...place(bath(2.4, 1.8, C.white), [4.3, 0, -0.9]),
    ...place(shelves(0.4, 2.4, [0.6, 1.25, 1.9], C.white, true), [SHELF_X, 0, 1.8]),
    ...place(door(1, 2.1, C.woodDark), [-6, 0, -0.7], -quarter),
  ],

  objects: [
    // Over the dining table.
    { def: 'chandelier', at: [TABLE_X, HUNG, BEAM_Z] },
    // Dining table: the tablecloth in the middle carries the dinner.
    { def: 'tablecloth', at: [TABLE_X, DINING, 0.2] },
    { def: 'plate', at: [0.35, CLOTH, 0] },
    { def: 'plate', at: [0.85, CLOTH, 0.4] },
    { def: 'glass', at: [0.3, CLOTH, 0.4] },
    { def: 'glass', at: [0.9, CLOTH, 0] },
    { def: 'glass', at: [0.6, CLOTH, -0.1] },
    { def: 'glass', at: [0.6, CLOTH, 0.5] },
    { def: 'bottle', at: [0.6, CLOTH, 0.2] },
    { def: 'candelabra', at: [-0.3, DINING, 0.2] },
    { def: 'candelabra', at: [1.5, DINING, 0.2] },
    // Lounge: sofa, the wall shelf over it, coffee table, screen wall.
    ...row('plush', 2, [-4.6, SEAT, SOFA_Z], [1.6, 0, 0]),
    ...row('cushion', 2, [-4.1, SEAT, SOFA_Z], [0.6, 0, 0]),
    ...row('sculpture', 3, [-4.8, LOFT, LOFT_Z], [1, 0, 0]),
    ...row('award', 2, [-4.3, LOFT, LOFT_Z], [1, 0, 0]),
    ...row('art_book_stack', 2, [-4.3, COFFEE, 2], [1, 0, 0]),
    { def: 'art_book_stack', at: [-2.2, 0, 2] },
    ...row('vase_tall', 2, [-3.8, COFFEE, 1.8], [0, 0, 0.4]),
    { def: 'speaker', at: [TV_X, STAND, 0.3] },
    { def: 'console', at: [TV_X, STAND, 0.68], rotY: -quarter },
    { def: 'monitor', at: [TV_X, STAND, 1.2], rotY: -quarter },
    { def: 'console', at: [TV_X, STAND, 1.75], rotY: -quarter },
    { def: 'speaker', at: [TV_X, STAND, 2.1] },
    // Art corner at the front left.
    { def: 'celadon_vase', at: [-4.4, PLINTH, -3.3] },
    { def: 'sculpture', at: [-3.2, PLINTH, -3.3] },
    { def: 'celadon_vase', at: [-2, PLINTH, -3.3] },
    ...row('display_case', 2, [-3.8, 0, -2.6], [1.2, 0, 0]),
    ...row('telescope', 2, [-5.4, 0, -2.6], [0, 0, 0.9]),
    // Piano top.
    ...row('vase_tall', 2, [-0.3, PIANO, 3.6], [1.2, 0, 0]),
    ...row('frame', 2, [0.1, PIANO, 3.5], [0.4, 0, 0]),
    ...row('champagne_tower', 2, [0.1, PIANO, 3.05], [0.4, 0, 0]),
    ...row('candelabra', 2, [-0.2, PIANO, 2.85], [1, 0, 0]),
    // Bar: two aquariums with the champagne between them.
    ...row('aquarium', 2, [2.95, BAR, BAR_Z], [1.9, 0, 0]),
    { def: 'champagne_tower', at: [3.6, BAR, 3.7] },
    { def: 'champagne_tower', at: [3.9, BAR, 3.5] },
    { def: 'champagne_tower', at: [4.2, BAR, 3.7] },
    { def: 'bottle', at: [3.55, BAR, 3.42] },
    { def: 'bottle', at: [3.75, BAR, 3.78] },
    { def: 'bottle', at: [4.05, BAR, 3.78] },
    { def: 'bottle', at: [4.25, BAR, 3.42] },
    // Right wall shelf.
    { def: 'speaker', at: [SHELF_X, 0.6, 0.9] },
    { def: 'vase_tall', at: [SHELF_X, 0.6, 1.5] },
    { def: 'vase_tall', at: [SHELF_X, 0.6, 2.1] },
    { def: 'speaker', at: [SHELF_X, 0.6, 2.7] },
    { def: 'laptop', at: [SHELF_X, 1.25, 1.1], rotY: quarter },
    { def: 'candelabra', at: [SHELF_X, 1.25, 1.8], rotY: quarter },
    { def: 'laptop', at: [SHELF_X, 1.25, 2.5], rotY: quarter },
    ...row('celadon_vase', 2, [SHELF_X, 1.9, 1.2], [0, 0, 1.2]),
    // Pool.
    ...row('glass', 2, [3.9, RIM, -1.73], [0.8, 0, 0]),
    ...row('robe_stack', 3, [3.4, WET, -2.15], [0.9, 0, 0]),
    // Floor.
    { def: 'floor_lamp', at: [-5.6, 0, 3.6] },
    { def: 'floor_lamp', at: [-2, 0, 3.7] },
    { def: 'floor_lamp', at: [1.6, 0, 3.7] },
    { def: 'floor_lamp', at: [5.6, 0, -3.4] },
    { def: 'plant_big', at: [-5.5, 0, -3.6] },
    { def: 'plant_big', at: [2.05, 0, 3.15] },
    { def: 'plant_big', at: [5.72, WET, 0.3] },
    { def: 'plant_big', at: [-1.2, 0, -3.3] },
  ],

  markers: [
    { marker: 'cat_spawn', at: [0.6, 0, -3] },
    { marker: 'owner_door', at: [-5.6, 0, -0.7] },
    { marker: 'camera_bounds', at: [0, 3.1, -3.5], scale: [12.4, 5.8, 15] },
    roomZone(12, 8, 3),
    { marker: 'trigger:dinner', at: [TABLE_X, DINING, -0.75] },
    bounceZone('sofa', [-3.8, SEAT, SOFA_Z], 2.64, 0.6),
    hangZone('beam', [TABLE_X, BEAM - 0.5, BEAM_Z], [1.2, 1.1, 1.2]),
    { marker: 'trigger:zone_wet_pool', at: [4.3, 0.5, -0.9], scale: [3.4, 1.2, 3] },
  ],
};
