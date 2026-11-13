// Tiny Studio Apartment: a 5 x 4.5 m studio. Bed on the left, desk with two wall shelves at the
// back, a kitchen corner on the right and a low table with floor cushions in the middle.
// The treasure stands on the top shelf: desk -> lower shelf -> top shelf.
import {
  bed,
  cabinet,
  door,
  fridge,
  roomZone,
  rug,
  shell,
  table,
  wallShelf,
  windowFrame,
} from '../_kit/furniture';
import { C } from '../_kit/palette';
import { place, row, type RoomLayout } from '../_kit/parts';

const DESK = 0.74;
const SHELF = 1.45;
const TOP_SHELF = 2;
const COUNTER = 0.85;
const FRIDGE = 0.9;
const LOW_TABLE = 0.34;

export const layout: RoomLayout = {
  statics: [
    ...shell(5, 4.5, 2.8, { floor: C.woodLight, wall: C.cream, trim: C.white }),
    ...place(bed(1.3, 2, C.sky), [-1.75, 0, 1.2]),
    ...place(windowFrame(1.2, 1), [-1.75, 1.3, 2.25]),
    ...place(cabinet(0.45, 0.5, 0.4, C.woodLight, C.woodLight, 2, 'drawers'), [-0.8, 0, 2.02]),
    // The desk is deep, so the cat has room to jump from its front edge up to the shelf.
    ...place(table(1.6, 0.9, DESK, C.wood, C.woodDark), [0.6, 0, 1.78]),
    ...place(wallShelf(1.6, 0.32, C.wood), [0.6, SHELF, 2.09]),
    ...place(wallShelf(0.9, 0.32, C.wood), [-0.75, TOP_SHELF, 2.09]),
    // Kitchen corner along the right wall, turned to face the room.
    ...place(cabinet(1.3, COUNTER, 0.6, C.white, C.peach, 3), [2.2, 0, 0.9], Math.PI / 2),
    ...place(fridge(0.6, FRIDGE, 0.6, C.mint, C.white), [2.2, 0, -0.25], Math.PI / 2),
    // Middle of the room.
    ...place(rug(2, 1.4, C.peach), [-0.3, 0, -0.4]),
    ...place(table(0.9, 0.55, LOW_TABLE, C.woodLight), [-0.3, 0, -0.35]),
    // Front door on the right wall.
    ...place(door(0.9, 2, C.wood), [2.5, 0, -1.5], Math.PI / 2),
  ],

  objects: [
    // Desk. The mat is the trick: swat at the front of the desk to pull it.
    { def: 'desk_mat', at: [0.6, DESK, 1.6] },
    { def: 'keyboard', at: [0.6, DESK + 0.02, 1.58] },
    { def: 'mug', at: [0.87, DESK + 0.02, 1.64] },
    { def: 'monitor', at: [0.6, DESK, 2.02] },
    { def: 'mug', at: [-0.05, DESK, 1.95] },
    { def: 'headphones', at: [0.2, DESK, 1.95] },
    { def: 'desk_lamp', at: [1.25, DESK, 1.95] },
    { def: 'phone', at: [1.15, DESK, 1.55] },
    // Lower shelf: four books standing close enough to fall like dominoes into the plant.
    ...row('book', 4, [0.1, SHELF, 2.09], [0.1, 0, 0]),
    { def: 'plant_small', at: [0.62, SHELF, 2.09] },
    { def: 'speaker', at: [0.95, SHELF, 2.09] },
    { def: 'clock', at: [1.25, SHELF, 2.09] },
    // Top shelf.
    { def: 'figurine', at: [-0.75, TOP_SHELF, 2.09] },
    { def: 'frame', at: [-1.05, TOP_SHELF, 2.11] },
    // By the bed.
    { def: 'speaker', at: [-0.8, 0.5, 2.02] },
    { def: 'floor_lamp', at: [-0.75, 0, 1.45] },
    { def: 'plant_big', at: [-2.15, 0, -0.6] },
    // Kitchen.
    { def: 'hot_plate', at: [2.2, COUNTER, 1.2] },
    { def: 'ramen_pot', at: [2.2, COUNTER + 0.062, 1.2] },
    { def: 'kettle', at: [2.2, COUNTER, 0.78] },
    { def: 'noodle_cup', at: [2.05, COUNTER, 0.98] },
    { def: 'cup', at: [2.1, COUNTER, 0.45] },
    { def: 'cup', at: [2.27, COUNTER, 0.4] },
    { def: 'plant_small', at: [2.25, FRIDGE, -0.12] },
    { def: 'vase', at: [2.12, FRIDGE, -0.4] },
    { def: 'can', at: [2.34, FRIDGE, -0.38] },
    // Low table and cushions.
    { def: 'console', at: [-0.5, LOW_TABLE, -0.35] },
    { def: 'book_stack', at: [-0.02, LOW_TABLE, -0.3] },
    { def: 'snack_bag', at: [-0.25, LOW_TABLE, -0.52] },
    { def: 'cushion', at: [-1.05, 0.016, -0.5] },
    { def: 'cushion', at: [0.5, 0.016, -0.55], rotY: 0.3 },
  ],

  markers: [
    { marker: 'cat_spawn', at: [0, 0, -1.5] },
    { marker: 'owner_door', at: [2.3, 0, -1.5] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [5.4, 5.8, 10.5] },
    roomZone(5, 4.5, 2.8),
    { marker: 'trigger:pull_mat', at: [0.6, DESK, 1.3] },
  ],
};
