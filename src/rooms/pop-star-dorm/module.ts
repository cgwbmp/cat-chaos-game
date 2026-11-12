// Pop Star Dorm logic: the manager patrols around the low table. Being caught costs time in a
// Mission, so break things behind the manager's back or from the shelves.
import type { RoomModule } from '../../core/types';
import { createRoomModule } from '../_kit/module';
import { PATROL } from './layout';

export function createModule(): RoomModule {
  return createRoomModule((ctx) => {
    ctx.services.bus.emit('walker/patrol', {
      id: 'manager',
      waypoints: PATROL.map(([x, y, z]) => ({ x, y, z })),
      speed: 1.2,
      pauseSec: 1.2,
    });
    return undefined;
  });
}
