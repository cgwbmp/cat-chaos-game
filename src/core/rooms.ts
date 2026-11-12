import type { RoomRegistry } from './services';
import type { RoomDef } from './types';

export function isDevRoom(def: RoomDef): boolean {
  return def.id.startsWith('_');
}

/** Builds the room registry from every room's default export. Throws on a duplicate id. */
export function createRoomRegistry(defs: readonly RoomDef[]): RoomRegistry {
  const byId = new Map<string, RoomDef>();
  for (const def of defs) {
    if (byId.has(def.id)) throw new Error(`Duplicate room id '${def.id}'`);
    byId.set(def.id, def);
  }
  const sorted = [...byId.values()].sort((a, b) => a.order - b.order);

  return {
    list(options) {
      return options?.includeDev ? [...sorted] : sorted.filter((def) => !isDevRoom(def));
    },
    get(id) {
      return byId.get(id);
    },
  };
}
