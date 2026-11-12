// Room checklist numbers, computed from data alone (no Babylon), for unit tests and for tuning.
import type { ObjectDef, ObjectTier } from '../../core/types';
import type { RoomLayout } from './parts';
import { PROPS } from './props';

export interface RoomSummary {
  breakables: number;
  totalCoins: number;
  treasures: number;
  tiers: ObjectTier[];
  /** Placements whose `def` is not in objects.json. */
  unknownDefs: string[];
  /** Definitions whose `meshNode` is not in the prop library. */
  unknownProps: string[];
  /** Definitions in objects.json that the room never places. */
  unusedDefs: string[];
  /** Trigger ids used by break rules with no `trigger:<id>` marker in the room. */
  missingTriggers: string[];
}

export function summarizeRoom(layout: RoomLayout, defs: readonly ObjectDef[]): RoomSummary {
  const byId = new Map(defs.map((def) => [def.id, def]));
  const used = new Set<string>();
  const tiers = new Set<ObjectTier>();
  const unknownDefs = new Set<string>();
  let totalCoins = 0;
  let treasures = 0;

  for (const { def: id } of layout.objects) {
    const def = byId.get(id);
    if (!def) {
      unknownDefs.add(id);
      continue;
    }
    used.add(id);
    tiers.add(def.tier);
    totalCoins += def.coins;
    if (def.tier === 'treasure') treasures++;
  }

  const markers = new Set(layout.markers.map(({ marker }) => marker));
  const missingTriggers = defs
    .filter((def) => used.has(def.id) && def.break.kind === 'trigger')
    .map((def) => (def.break.kind === 'trigger' ? def.break.triggerId : ''))
    .filter((id) => !markers.has(`trigger:${id}`));

  return {
    breakables: layout.objects.length,
    totalCoins,
    treasures,
    tiers: [...tiers],
    unknownDefs: [...unknownDefs],
    unknownProps: defs.filter((def) => !(def.meshNode in PROPS)).map((def) => def.id),
    unusedDefs: defs.filter((def) => !used.has(def.id)).map((def) => def.id),
    missingTriggers,
  };
}
