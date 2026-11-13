// Gaming Café: 8 x 6 m. Two desk rows of four stations each. The monitors stand on a cable
// bundle that runs along the row: swat at the left end of a row and the whole row is dragged.
// The champion trophy sits on the top shelf in the back right corner.
import { block, roomZone, rug, shell, shelves, stoolSeat, table } from '../_kit/furniture';
import { C } from '../_kit/palette';
import { place, row, type Placement, type RoomLayout } from '../_kit/parts';

const DESK = 0.74;
const ROW_X = -1.2; // center of a desk row
const STATIONS = [-2.7, -1.7, -0.7, 0.3] as const;
const ROWS = [
  { id: 'a', z: 1.9 },
  { id: 'b', z: -0.2 },
] as const;
const SNACKS = 0.9;
const BENCH = 0.45;

function station(x: number, z: number): Placement[] {
  return [
    { def: 'monitor', at: [x, DESK + 0.03, z + 0.15] },
    { def: 'keyboard', at: [x, DESK, z - 0.17] },
    { def: 'mouse', at: [x + 0.32, DESK, z - 0.17] },
    { def: 'headphones', at: [x - 0.36, DESK, z - 0.2] },
  ];
}

export const layout: RoomLayout = {
  statics: [
    ...shell(8, 6, 2.8, { floor: C.slate, wall: C.plum, trim: C.mint }),
    ...ROWS.flatMap(({ z }) => [
      ...place(table(3.8, 0.75, DESK, C.gray, C.charcoal), [ROW_X, 0, z]),
      ...STATIONS.flatMap((x) => place(stoolSeat(C.coral), [x, 0, z - 0.75])),
    ]),
    ...place(shelves(1.2, 0.4, [0.8, 1.5], C.charcoal), [3.2, 0, 2.75]),
    ...place(block(0.6, SNACKS, 2, C.cream, C.mint), [3.6, 0, 0.3]),
    ...place(block(1.4, BENCH, 0.45, C.charcoal, C.gray), [2.6, 0, -2.4]),
    ...place(rug(2.4, 1.2, C.lavender, C.charcoal), [1.9, 0, -1.2]),
  ],

  objects: [
    ...ROWS.flatMap(({ id, z }) => [
      { def: `cable_bundle_${id}`, at: [ROW_X, DESK, z + 0.15] as const },
      ...STATIONS.flatMap((x) => station(x, z)),
      { def: 'pc_tower', at: [1, 0, z] as const },
      { def: 'pc_tower', at: [1.35, 0, z] as const },
    ]),
    // Trophy shelf.
    { def: 'trophy', at: [3.2, 1.5, 2.75] },
    { def: 'speaker', at: [2.9, 0.8, 2.75] },
    { def: 'speaker', at: [3.5, 0.8, 2.75] },
    // Snack counter along the right wall.
    ...row('noodle_cup', 4, [3.55, SNACKS, -0.6], [0, 0, 0.25]),
    ...row('can', 4, [3.5, SNACKS, 0.42], [0, 0, 0.16]),
    ...row('snack_bag', 3, [3.74, SNACKS, 0.5], [0, 0, 0.3], Math.PI / 2),
    // Console corner at the front.
    { def: 'console', at: [2.3, BENCH, -2.4] },
    { def: 'console', at: [2.95, BENCH, -2.4] },
  ],

  markers: [
    { marker: 'cat_spawn', at: [1.8, 0, -1.2] },
    { marker: 'owner_door', at: [-3.7, 0, -2.4] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [8.4, 5.8, 12] },
    roomZone(8, 6, 2.8),
    // Swat from the stool side at the middle of a row: the monitors are dragged off the front.
    ...ROWS.map(({ id, z }) => ({
      marker: `trigger:cables_${id}` as const,
      at: [ROW_X, DESK, z - 0.6] as const,
    })),
  ],
};
