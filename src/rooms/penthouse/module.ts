// Luxury Penthouse logic: a robot vacuum circles the dining table. Bumping into it costs time
// in a Mission, so stay out of its path, jump over it or cross on the table.
import type { RoomModule } from '../../core/types';
import { createRoomModule } from '../_kit/module';
import { PATROL } from './layout';

export function createModule(): RoomModule {
  return createRoomModule((ctx) => {
    ctx.services.bus.emit('walker/patrol', {
      id: 'vacuum',
      waypoints: PATROL.map(([x, y, z]) => ({ x, y, z })),
      speed: 1.2,
      pauseSec: 1,
    });
    return undefined;
  });
}
