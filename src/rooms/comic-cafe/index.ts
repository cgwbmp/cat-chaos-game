import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: 'comic-cafe',
  name: 'Comic Book Café',
  order: 11,
  glb: '', // built in code from layout.ts, see docs/room-template.md
  objectsJson,
  mission: { timeLimitSec: 150, targetCoins: 13500 },
  unlock: { requiresStars: 20 },
  music: 'comic-cafe',
  lighting: { mood: 'sunset', lamps: { floor_lamp: 'warm', reading_lamp: 'warm' } },
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('../_kit/module').then((module) => module.createRoomModule()),
};

export default room;
