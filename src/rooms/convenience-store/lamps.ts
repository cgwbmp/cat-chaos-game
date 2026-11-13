// Fixed lights, shared by the layout (the fittings) and the RoomDef (their light).
import type { Triple } from '../_kit/parts';

/** The drinks cooler at the back wall; it glows at night. */
export const COOLER: Triple = [-1.4, 0, 2.7];

/** Wall lamps: left wall, back wall, right wall. */
export const WALL_LAMPS: { at: Triple; rotY: number }[] = [
  { at: [-3.5, 2.1, 0.6], rotY: -Math.PI / 2 },
  { at: [0.6, 1.9, 3], rotY: 0 },
  { at: [3.5, 1.9, 0.1], rotY: Math.PI / 2 },
];
