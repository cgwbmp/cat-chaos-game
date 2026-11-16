import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: 'karaoke-room',
  name: 'Karaoke Room',
  order: 9,
  glb: '', // built in code from layout.ts, see docs/room-template.md
  objectsJson,
  mission: { timeLimitSec: 140, targetCoins: 12500 },
  unlock: { requiresStars: 16 },
  music: 'karaoke-room',
  lighting: {
    mood: 'night',
    lamps: { floor_lamp: 'warm', hanging_lantern: 'warm', neon_sign: 'cool', monitor: 'cool' },
  },
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('../_kit/module').then((module) => module.createRoomModule()),
};

export default room;
