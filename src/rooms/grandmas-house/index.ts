import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: 'grandmas-house',
  name: "Grandma's House",
  order: 5,
  glb: '', // built in code from layout.ts, see docs/room-template.md
  objectsJson,
  mission: { timeLimitSec: 110, targetCoins: 5500 },
  unlock: { requiresStars: 8 },
  music: 'grandmas-house',
  lighting: { mood: 'sunset', lamps: { lantern: 'warm', floor_lamp: 'warm' } },
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('../_kit/module').then((module) => module.createRoomModule()),
};

export default room;
