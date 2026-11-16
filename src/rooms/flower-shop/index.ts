import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: 'flower-shop',
  name: 'Flower Shop',
  order: 10,
  glb: '', // built in code from layout.ts, see docs/room-template.md
  objectsJson,
  mission: { timeLimitSec: 140, targetCoins: 13000 },
  unlock: { requiresStars: 18 },
  music: 'flower-shop',
  lighting: { mood: 'sunrise' },
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('../_kit/module').then((module) => module.createRoomModule()),
};

export default room;
