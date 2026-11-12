// Performance test scene (dev room): 60 cups that all break at the same moment when the cat
// swats where it spawns. tests/e2e/perf.spec.ts loads it and measures the frame rate.
import { shell } from '../_kit/furniture';
import { C } from '../_kit/palette';
import { row, type RoomLayout } from '../_kit/parts';

export const PERF_OBJECTS = 60;
const PER_ROW = 10;

export const layout: RoomLayout = {
  statics: shell(8, 8, 2.8, { floor: C.gray, wall: C.white, trim: C.sky }),
  objects: Array.from({ length: PERF_OBJECTS / PER_ROW }, (_, line) =>
    row('perf_cup', PER_ROW, [-2.25, 0, -1 + line * 0.5], [0.5, 0, 0]),
  ).flat(),
  markers: [
    { marker: 'cat_spawn', at: [0, 0, -3] },
    { marker: 'trigger:perf', at: [0, 0, -3] },
    { marker: 'camera_bounds', at: [0, 3.1, -3], scale: [8.4, 5.8, 14] },
  ],
};
