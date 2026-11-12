import type { RoomDef } from '../../core/types';
import objectsJson from './objects.json?url';

const room: RoomDef = {
  id: '_graybox',
  name: 'Graybox Test Room',
  order: 0,
  glb: '', // built in code, see room.ts
  objectsJson,
  mission: { timeLimitSec: 60, targetCoins: 400 },
  unlock: { requiresStars: 0 },
  music: '',
  builder: () => import('./room').then((module) => module.buildGraybox),
};

export default room;
