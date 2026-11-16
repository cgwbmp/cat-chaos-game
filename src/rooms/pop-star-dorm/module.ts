// Pop Star Dorm logic: a robot vacuum cleans its way around the low table. Bumping into it costs
// time in a Mission, so stay out of its path, jump over it or ride on top.
import type { RoomModule } from '../../core/types';
import { createRoomModule } from '../_kit/module';
import { PATROL } from './layout';

export function createModule(): RoomModule {
  return createRoomModule((ctx) => {
    ctx.services.bus.emit('walker/patrol', {
      id: 'vacuum',
      waypoints: PATROL.map(([x, y, z]) => ({ x, y, z })),
      speed: 1.2,
      pauseSec: 1.2,
    });
    return undefined;
  });
}
