// Fixed lights, shared by the layout (the fittings) and the RoomDef (their light).
import type { Triple } from '../_kit/parts';

/** Wall lamps on the back wall, over the counter. */
export const WALL_LAMPS: { at: Triple; rotY: number }[] = [
  { at: [-0.3, 1.9, 3], rotY: 0 },
  { at: [2.6, 1.9, 3], rotY: 0 },
];
