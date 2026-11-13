import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: 'pop-star-dorm',
  name: 'Pop Star Dorm',
  order: 6,
  glb: '', // built in code from layout.ts, see docs/room-template.md
  objectsJson,
  mission: { timeLimitSec: 110, targetCoins: 7000 },
  unlock: { requiresStars: 10 },
  music: 'pop-star-dorm',
  lighting: { mood: 'sunset', lamps: { floor_lamp: 'warm', ring_light: 'cool' } },
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('./module').then((module) => module.createModule()),
};

export default room;
