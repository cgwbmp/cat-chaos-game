import type { RoomDef } from '../../core/types';
import { wallLampLight } from '../_kit/furniture';
import { COOLER, WALL_LAMPS } from './lamps';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: 'convenience-store',
  name: 'Corner Convenience Store',
  order: 2,
  glb: '', // built in code from layout.ts, see docs/room-template.md
  objectsJson,
  mission: { timeLimitSec: 90, targetCoins: 2000 },
  unlock: { requiresStars: 2 },
  music: 'convenience-store',
  lighting: {
    mood: 'night',
    fixtures: [
      ...WALL_LAMPS.map(({ at, rotY }) => ({ at: wallLampLight(at, rotY), tone: 'warm' as const })),
      { at: { x: COOLER[0], y: 1.4, z: COOLER[2] - 0.4 }, tone: 'cool' },
    ],
  },
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('../_kit/module').then((module) => module.createRoomModule()),
};

export default room;
