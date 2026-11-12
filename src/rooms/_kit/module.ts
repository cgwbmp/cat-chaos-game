// Room module shared by code-built rooms: a swat or a pounce next to a `trigger:<id>` marker
// fires that trigger (tablecloths, cable bundles and other trick objects). Rooms can add their
// own logic on top with `extra`.
import type { RoomContext, RoomModule } from '../../core/types';

const TRIGGER_RADIUS = 1.1; // m
const TRIGGER_HEIGHT = 1; // m above or below the marker

/** Marker ids with this prefix are zones read by other systems (wet floors), not triggers. */
const ZONE_PREFIX = 'zone_';

export function createRoomModule(
  extra?: (ctx: RoomContext) => (() => void) | undefined,
): RoomModule {
  let cleanups: (() => void)[] = [];

  return {
    setup(ctx) {
      const triggers = ctx.room.markers
        .filter(({ marker }) => marker.startsWith('trigger:'))
        .map(({ marker, node }) => ({
          id: marker.slice('trigger:'.length),
          at: node.getAbsolutePosition().clone(),
        }))
        .filter(({ id }) => !id.startsWith(ZONE_PREFIX));

      const off = ctx.services.bus.on('cat/action', ({ action, position }) => {
        if (action !== 'swat' && action !== 'pounce') return;
        for (const { id, at } of triggers) {
          const near = Math.hypot(position.x - at.x, position.z - at.z) <= TRIGGER_RADIUS;
          if (near && Math.abs(position.y - at.y) <= TRIGGER_HEIGHT) {
            ctx.services.physics.fireTrigger(id);
          }
        }
      });
      cleanups = [off];
      const extraCleanup = extra?.(ctx);
      if (extraCleanup) cleanups.push(extraCleanup);
    },
    dispose() {
      for (const cleanup of cleanups) cleanup();
      cleanups = [];
    },
  };
}
