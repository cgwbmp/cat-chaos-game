import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: '_perf',
  name: 'Performance Test',
  order: -1,
  glb: '', // built in code, see layout.ts
  objectsJson,
  mission: { timeLimitSec: 30, targetCoins: 600 },
  unlock: { requiresStars: 0 },
  music: '',
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('../_kit/module').then((module) => module.createRoomModule()),
};

export default room;
