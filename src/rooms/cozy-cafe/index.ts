import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: 'cozy-cafe',
  name: 'Cozy Café',
  order: 3,
  glb: '', // built in code from layout.ts, see docs/room-template.md
  objectsJson,
  mission: { timeLimitSec: 100, targetCoins: 3000 },
  unlock: { requiresStars: 4 },
  music: 'cozy-cafe',
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('../_kit/module').then((module) => module.createRoomModule()),
};

export default room;
