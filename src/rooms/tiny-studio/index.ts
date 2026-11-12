import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: 'tiny-studio',
  name: 'Tiny Studio Apartment',
  order: 1,
  glb: '', // built in code from layout.ts, see docs/room-template.md
  objectsJson,
  mission: { timeLimitSec: 90, targetCoins: 1200 },
  unlock: { requiresStars: 0 },
  music: 'tiny-studio',
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('../_kit/module').then((module) => module.createRoomModule()),
};

export default room;
