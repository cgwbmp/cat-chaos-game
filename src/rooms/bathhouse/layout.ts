// Spa & Bathhouse (finale): 12 x 8 m in three areas. The lobby (front left) has the counter and
// the trophy shelf, the locker side (front right) has towels, and the bath hall behind the wall
// has two baths and the sauna bench. The bath hall floor is wet: the cat slides on it.
import {
  WALL,
  bath,
  block,
  cabinet,
  partition,
  roomZone,
  rug,
  shell,
  shelves,
} from '../_kit/furniture';
import { C } from '../_kit/palette';
import { place, row, type RoomLayout } from '../_kit/parts';

const SPLIT_Z = 0.5; // the wall between the front and the bath hall
const RIM = 0.34;
const COUNTER = 0.95;
const BENCH = 0.45;
const DISPLAY = 0.6;
const SHELF_X = -3.8;
const LOCKER_X = 5.7;

export const layout: RoomLayout = {
  statics: [
    ...shell(12, 8, 2.8, { floor: C.sand, wall: C.white, trim: C.teal }),
    ...partition(6, 2.6, C.white, [-3, 0, SPLIT_Z], { offset: 1.2, width: 1.2 }),
    ...partition(6, 2.6, C.white, [3, 0, SPLIT_Z], { offset: 1.5, width: 1.2 }),
    // Bath hall: tiled floor, two baths, the sauna bench.
    ...place(rug(11.8, 3.2, C.sky, C.teal), [0, 0, 2.3]),
    ...place(bath(3.2, 1.8, C.white), [-3.4, 0, 2.9]),
    ...place(bath(2.4, 1.8, C.white), [0.6, 0, 2.9]),
    ...place(block(1.8, BENCH, 0.6, C.woodLight), [4.9, 0, 3.6]),
    // Lobby.
    ...place(cabinet(2.4, COUNTER, 0.6, C.woodLight, C.teal, 4, 'panels'), [-3.8, 0, -1.3]),
    ...place(shelves(1.6, 0.4, [0.9, 1.6], C.woodLight), [SHELF_X, 0, 0.15]),
    ...place(cabinet(2, DISPLAY, 0.5, C.woodLight, C.woodLight, 4), [2, 0, 0.1]),
    ...place(block(2.6, BENCH, 0.5, C.woodLight), [2.6, 0, -3.5]),
    ...place(shelves(0.5, 3, [0.6, 1.2, 1.8], C.woodLight, true), [LOCKER_X, 0, -1.9]),
    ...place(rug(2.4, 1.4, C.coral), [-0.6, 0, -2]),
  ],

  objects: [
    // Bath hall.
    ...row('stool', 8, [-5.2, 0, 1.25], [0.72, 0, 0]),
    ...row('basin', 8, [-5.2, 0, 0.95], [0.72, 0, 0]),
    ...row('soap_bottle', 5, [-4.6, RIM, 2.07], [0.6, 0, 0]),
    ...row('soap_bottle', 5, [-0.3, RIM, 2.07], [0.45, 0, 0]),
    ...row('bucket', 4, [2.4, 0, 3.5], [0.42, 0, 0]),
    ...row('bucket', 4, [2.4, 0, 1.5], [0.42, 0, 0]),
    ...row('egg_basket', 4, [4.3, BENCH, 3.6], [0.4, 0, 0]),
    // Lobby: the trophy stands on the top shelf behind the counter.
    { def: 'towel_trophy', at: [SHELF_X, 1.6, 0.15] },
    { def: 'cup_tower', at: [SHELF_X - 0.5, 0.9, 0.15] },
    { def: 'cup_tower', at: [SHELF_X + 0.5, 0.9, 0.15] },
    ...row('bottle', 6, [-4.8, COUNTER, -1.2], [0.24, 0, 0]),
    ...row('glass', 4, [-3.25, COUNTER, -1.15], [0.14, 0, 0]),
    { def: 'cup_tower', at: [-3.3, COUNTER, -1.45] },
    { def: 'cup_tower', at: [-2.85, COUNTER, -1.4] },
    ...row('vase_tall', 4, [1.25, DISPLAY, 0.1], [0.5, 0, 0]),
    ...row('lantern', 4, [1.7, BENCH, -3.5], [0.6, 0, 0]),
    ...row('crate', 4, [-1.5, 0, -3.5], [0.5, 0, 0]),
    // Lockers on the right wall: towels on two levels.
    ...row('towel_stack', 4, [LOCKER_X, 0.6, -3], [0, 0, 0.72]),
    ...row('towel_stack', 4, [LOCKER_X, 1.2, -3], [0, 0, 0.72]),
    { def: 'plant_big', at: [-5.6, 0, -3.6] },
    { def: 'plant_big', at: [-5.6, 0, -0.1] },
    { def: 'plant_big', at: [0.4, 0, 0.05] },
    { def: 'plant_big', at: [4.9, 0, -3.6] },
  ],

  markers: [
    { marker: 'cat_spawn', at: [-0.6, 0, -2.2] },
    { marker: 'owner_door', at: [-5.6, 0, -2] },
    { marker: 'camera_bounds', at: [0, 3.1, -3.5], scale: [12.4, 5.8, 15] },
    roomZone(12, 8, 2.8),
    // Wet floor: everything behind the dividing wall.
    {
      marker: 'trigger:zone_wet_hall',
      at: [0, 0.5, (SPLIT_Z + WALL / 2 + 4) / 2],
      scale: [12, 1.2, 4 - SPLIT_Z - WALL / 2],
    },
  ],
};
