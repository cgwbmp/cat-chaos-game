// Cozy Café: 7 x 6 m. Four tables, each with a tablecloth to pull (swat next to the table);
// the counter at the back holds the cake display case, cup towers and the treasure, the fancy
// espresso machine.
import {
  block,
  chair,
  roomZone,
  rug,
  shell,
  shelves,
  table,
  wallArt,
  wallLamp,
} from '../_kit/furniture';
import { C } from '../_kit/palette';
import { place, row, type Placement, type RoomLayout, type Triple } from '../_kit/parts';
import { WALL_LAMPS } from './lamps';

const TABLE = 0.72;
const CLOTH = TABLE + 0.024; // on top of the tablecloth
const COUNTER = 0.95;
const SIDEBOARD = 0.8;

// Table centers, with what stands on each besides two cups, a plate and a glass.
const TABLES: { id: string; at: readonly [x: number, z: number]; extra: string[] }[] = [
  { id: 'a', at: [-2.2, 0.9], extra: ['cake', 'tray'] },
  { id: 'b', at: [-0.4, -0.6], extra: ['vase', 'teapot'] },
  { id: 'c', at: [1.5, 0.5], extra: ['cake', 'teapot'] },
  { id: 'd', at: [-2.3, -1.6], extra: ['vase', 'tray'] },
];

function setTable({ id, at: [x, z], extra }: (typeof TABLES)[number]): Placement[] {
  const spots: Triple[] = [
    [x - 0.25, CLOTH, z - 0.22],
    [x + 0.25, CLOTH, z + 0.22],
    [x + 0.22, CLOTH, z - 0.25],
    [x - 0.22, CLOTH, z + 0.25],
    [x, CLOTH, z],
    [x - 0.02, CLOTH, z - 0.3],
  ];
  const items = ['cup', 'cup', 'plate', 'glass', ...extra];
  return [
    { def: `tablecloth_${id}`, at: [x, TABLE, z] },
    ...items.map((def, index) => ({ def, at: spots[index] ?? ([x, CLOTH, z] as const) })),
  ];
}

export const layout: RoomLayout = {
  statics: [
    ...shell(7, 6, 2.8, { floor: C.wood, wall: C.cream, trim: C.woodDark }),
    ...TABLES.flatMap(({ at: [x, z] }) => [
      ...place(table(0.9, 0.9, TABLE, C.woodLight, C.woodDark), [x, 0, z]),
      ...place(chair(C.mint), [x, 0, z - 0.75], Math.PI),
    ]),
    ...place(block(3.4, COUNTER, 0.7, C.cream, C.woodDark), [1.2, 0, 2.55]),
    ...place(shelves(0.4, 2.4, [0.6, 1.1, 1.6], C.woodDark, true), [-3.3, 0, 1.6]),
    ...place(block(0.5, SIDEBOARD, 1.8, C.woodDark, C.wood), [3.2, 0, -0.4]),
    ...place(rug(1.6, 1, C.rose), [1.2, 0, -2.2]),
    ...place(wallArt(1, 0.7, C.peach), [-1.6, 1.4, 3]),
    ...WALL_LAMPS.flatMap(({ at, rotY }) => place(wallLamp(C.peach), at, rotY)),
  ],

  objects: [
    ...TABLES.flatMap(setTable),
    // Counter.
    { def: 'espresso_machine', at: [2.45, COUNTER, 2.6] },
    { def: 'cake_case', at: [1.25, COUNTER, 2.55] },
    { def: 'cup_tower', at: [-0.3, COUNTER, 2.65] },
    { def: 'cup_tower', at: [0, COUNTER, 2.45] },
    { def: 'cup_tower', at: [0.3, COUNTER, 2.65] },
    { def: 'plate_stack', at: [0.68, COUNTER, 2.4] },
    { def: 'plate_stack', at: [0.68, COUNTER, 2.72] },
    { def: 'plate_stack', at: [1.85, COUNTER, 2.45] },
    // Wall shelf on the left: jars on top, mugs in the middle, syrup below.
    ...row('jar', 4, [-3.3, 1.6, 0.75], [0, 0, 0.55]),
    ...row('mug', 4, [-3.3, 1.1, 0.75], [0, 0, 0.55]),
    ...row('bottle', 3, [-3.3, 0.6, 0.9], [0, 0, 0.7]),
    // Sideboard on the right.
    ...row('plant_small', 3, [3.2, SIDEBOARD, -1.05], [0, 0, 0.65]),
    ...row('speaker', 2, [3.2, SIDEBOARD, -0.72], [0, 0, 0.65]),
    { def: 'floor_lamp', at: [-3, 0, -2.4] },
    { def: 'floor_lamp', at: [3, 0, 1.4] },
  ],

  markers: [
    { marker: 'cat_spawn', at: [0.8, 0, -2.2] },
    { marker: 'owner_door', at: [3.3, 0, -2.4] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [7.4, 5.8, 12] },
    roomZone(7, 6, 2.8),
    // Tablecloths fly toward the front of their table.
    ...TABLES.map(({ id, at: [x, z] }) => ({
      marker: `trigger:cloth_${id}` as const,
      at: [x, TABLE, z - 0.6] as const,
    })),
  ],
};
