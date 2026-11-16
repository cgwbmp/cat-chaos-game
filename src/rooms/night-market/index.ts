import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: 'night-market',
  name: 'Night Market Food Tent',
  order: 12,
  glb: '', // built in code from layout.ts, see docs/room-template.md
  objectsJson,
  mission: { timeLimitSec: 150, targetCoins: 14000 },
  unlock: { requiresStars: 22 },
  music: 'night-market',
  lighting: { mood: 'night', lamps: { hanging_lantern: 'warm', lantern: 'warm' } },
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('../_kit/module').then((module) => module.createRoomModule()),
};

export default room;
