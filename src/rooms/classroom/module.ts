// School Classroom logic: a cleaning robot drives up one aisle and down the other. Bumping into
// it costs time in a Mission, so stay on the desks or jump over it.
import type { RoomModule } from '../../core/types';
import { createRoomModule } from '../_kit/module';
import { PATROL } from './layout';

export function createModule(): RoomModule {
  return createRoomModule((ctx) => {
    ctx.services.bus.emit('walker/patrol', {
      id: 'cleaner',
      waypoints: PATROL.map(([x, y, z]) => ({ x, y, z })),
      speed: 1,
      pauseSec: 1,
    });
    return undefined;
  });
}
