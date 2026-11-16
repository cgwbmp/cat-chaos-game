import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: 'pottery-gallery',
  name: 'Pottery Gallery',
  order: 15,
  glb: '', // built in code from layout.ts, see docs/room-template.md
  objectsJson,
  mission: { timeLimitSec: 170, targetCoins: 15500 },
  unlock: { requiresStars: 28 },
  music: 'pottery-gallery',
  lighting: { mood: 'day' },
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('./module').then((module) => module.createModule()),
};

export default room;
