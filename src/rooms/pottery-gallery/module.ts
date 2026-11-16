// Pottery Gallery logic: two cleaning robots circle the stairs in the middle, always on opposite
// sides. Bumping into one costs time in a Mission, so cross behind them or jump over.
import type { RoomModule } from '../../core/types';
import { createRoomModule } from '../_kit/module';
import { PATROL } from './layout';

export function createModule(): RoomModule {
  return createRoomModule((ctx) => {
    const corners = PATROL.map(([x, y, z]) => ({ x, y, z }));
    for (const [id, start] of [
      ['cleaner_a', 0],
      ['cleaner_b', 2],
    ] as const) {
      ctx.services.bus.emit('walker/patrol', {
        id,
        waypoints: [...corners.slice(start), ...corners.slice(0, start)],
        speed: 1,
        pauseSec: 0.8,
      });
    }
    return undefined;
  });
}
