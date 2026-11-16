import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: 'rooftop-garden',
  name: 'Rooftop Garden',
  order: 14,
  glb: '', // built in code from layout.ts, see docs/room-template.md
  objectsJson,
  mission: { timeLimitSec: 160, targetCoins: 15000 },
  unlock: { requiresStars: 26 },
  music: 'rooftop-garden',
  lighting: { mood: 'sunset', lamps: { hanging_lantern: 'warm', lantern: 'warm' } },
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('../_kit/module').then((module) => module.createRoomModule()),
};

export default room;
