import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: 'classroom',
  name: 'School Classroom',
  order: 13,
  glb: '', // built in code from layout.ts, see docs/room-template.md
  objectsJson,
  mission: { timeLimitSec: 160, targetCoins: 14500 },
  unlock: { requiresStars: 24 },
  music: 'classroom',
  lighting: { mood: 'day' },
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('./module').then((module) => module.createModule()),
};

export default room;
