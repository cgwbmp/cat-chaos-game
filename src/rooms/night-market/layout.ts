// Night Market Food Tent: 9 x 6.5 m. The cooking counter runs along the back with grills, pots
// and bowl stacks, under a rail of hanging lanterns that fall when something moves them. The
// floor in front of the counter is wet with spilled broth. Four plastic tables, two of them with
// a tablecloth to pull; the treasure, the golden pig money box, is on top of the right wall
// shelf.
import {
  beam,
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
import { place, row, type Placement, type RoomLayout } from '../_kit/parts';
import { HANG_DROP } from '../_kit/props';

const TABLE = 0.72;
const CLOTH = TABLE + 0.024; // on top of a tablecloth
const COUNTER = 0.9;
const COOLER = 1;
const RAIL = 2.35; // underside of the lantern rail
const RAIL_Z = 2.25;
const HUNG = RAIL - HANG_DROP;
const BACK = 3; // back row on the counter
const FRONT = 2.68;
const SHELF_X = 4.25;
const WET = 0.016; // on the wet floor mat
const quarter = Math.PI / 2;

// Table centers; the ones with an id have a tablecloth.
const TABLES: { id?: string; at: readonly [x: number, z: number] }[] = [
  { id: 'a', at: [-2.6, -0.3] },
  { at: [-0.4, -1.3] },
  { id: 'c', at: [1.8, -0.3] },
  { at: [3.2, -1.9] },
];

function setTable({ id, at: [x, z] }: (typeof TABLES)[number]): Placement[] {
  const stools: Placement[] = [
    { def: 'stool', at: [x - 0.75, 0, z] },
    { def: 'stool', at: [x + 0.75, 0, z] },
  ];
  if (!id) {
    return [
      ...stools,
      { def: 'lantern', at: [x, TABLE, z] },
      { def: 'cup', at: [x - 0.3, TABLE, z - 0.28] },
      { def: 'cup', at: [x + 0.3, TABLE, z + 0.28] },
      { def: 'bowl', at: [x + 0.3, TABLE, z - 0.3] },
    ];
  }
  return [
    ...stools,
    { def: `tablecloth_${id}`, at: [x, TABLE, z] },
    { def: 'bowl', at: [x - 0.25, CLOTH, z - 0.2] },
    { def: 'bowl', at: [x + 0.25, CLOTH, z + 0.2] },
    { def: 'bottle', at: [x + 0.2, CLOTH, z - 0.25] },
    { def: 'bottle', at: [x - 0.2, CLOTH, z + 0.25] },
    { def: 'glass', at: [x, CLOTH, z] },
  ];
}

export const layout: RoomLayout = {
  statics: [
    ...shell(9, 6.5, 2.8, { floor: C.slate, wall: C.coral, trim: C.lemon }),
    ...place(cabinet(5, COUNTER, 0.7, C.woodLight, C.red, 8, 'panels'), [-1, 0, 2.85]),
    ...place(beam(9, C.woodDark), [0, RAIL, RAIL_Z]),
    ...place(rug(3, 1, C.water, C.sky), [-1, 0, 1.7]),
    ...TABLES.flatMap(({ at: [x, z] }) => place(table(0.9, 0.9, TABLE, C.sky, C.gray), [x, 0, z])),
    ...place(shelves(0.4, 2.4, [0.6, 1.25, 1.9], C.woodLight, true), [SHELF_X, 0, 1.6]),
    ...place(cabinet(1.6, COOLER, 0.6, C.white, C.sky, 3, 'glass'), [2.9, 0, 2.9]),
    ...place(door(1.2, 2.1, C.lemon, 2), [-4.5, 0, -1.6], -quarter),
  ],

  objects: [
    // Counter: pots and grills at the back, skewers and bowl stacks at the front.
    ...row('fishcake_pot', 4, [-3.2, COUNTER, BACK], [1.3, 0, 0]),
    ...row('grill', 3, [-2.55, COUNTER, BACK], [1.3, 0, 0]),
    ...row('skewer_stand', 4, [-3.2, COUNTER, FRONT], [1.3, 0, 0]),
    ...row('bowl_stack', 3, [-2.55, COUNTER, FRONT], [1.3, 0, 0]),
    { def: 'bowl_stack', at: [1.2, COUNTER, FRONT] },
    { def: 'kettle', at: [1.2, COUNTER, BACK] },
    ...row('hanging_lantern', 6, [-3.3, HUNG, RAIL_Z], [0.9, 0, 0]),
    // Drinks cooler.
    ...row('bottle', 4, [2.35, COOLER, 3], [0.3, 0, 0]),
    { def: 'cup_tower', at: [2.5, COOLER, 2.75] },
    { def: 'cup_tower', at: [3.3, COOLER, 2.75] },
    // Right wall shelf: the golden pig stands on top.
    ...row('sauce_jar', 4, [SHELF_X, 0.6, 0.7], [0, 0, 0.6]),
    ...row('bowl_stack', 2, [SHELF_X, 1.25, 1], [0, 0, 1.2]),
    { def: 'gold_pig', at: [SHELF_X, 1.9, 1.6], rotY: quarter },
    ...TABLES.flatMap(setTable),
    // Floor.
    ...row('crate', 3, [-4.1, 0, -2.75], [0.45, 0, 0]),
    ...row('crate', 3, [0.6, 0, -2.8], [0.45, 0, 0]),
    ...row('bucket', 3, [1.8, 0, 3], [0, 0, -0.4]),
    ...row('bucket', 2, [-1.6, WET, 1.5], [1.2, 0, 0]),
  ],

  markers: [
    { marker: 'cat_spawn', at: [1, 0, -1.7] },
    { marker: 'owner_door', at: [-4.1, 0, -1.6] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [9.4, 5.8, 12.5] },
    roomZone(9, 6.5, 2.8),
    // Tablecloths fly toward the front of their table.
    ...TABLES.flatMap(({ id, at: [x, z] }) =>
      id ? [{ marker: `trigger:cloth_${id}` as const, at: [x, TABLE, z - 0.6] as const }] : [],
    ),
    { marker: 'trigger:zone_wet_broth', at: [-1, 0.5, 1.7], scale: [3, 1.2, 1] },
    hangZone('rail', [-1.05, RAIL - 0.5, RAIL_Z], [5.4, 1.1, 0.5]),
  ],
};
