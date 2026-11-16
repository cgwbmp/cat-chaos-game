import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: 'penthouse',
  name: 'Luxury Penthouse',
  order: 16,
  glb: '', // built in code from layout.ts, see docs/room-template.md
  objectsJson,
  mission: { timeLimitSec: 180, targetCoins: 16500 },
  unlock: { requiresStars: 30 },
  music: 'penthouse',
  lighting: {
    mood: 'night',
    lamps: {
      floor_lamp: 'warm',
      candelabra: 'warm',
      chandelier: 'warm',
      monitor: 'cool',
      aquarium: 'cool',
    },
  },
  builder: () => import('./room').then((module) => module.buildRoom),
  module: () => import('./module').then((module) => module.createModule()),
};

export default room;
