// Save data shape, defaults and migration. Free of storage so it can be unit tested.
import type { QualityTier, SaveData } from '../core/types';

export const SAVE_VERSION = 1;

export function createDefaultSave(): SaveData {
  return {
    version: 1,
    rooms: {},
    totalCoins: 0,
    cosmetics: { owned: [], equipped: {} },
    settings: { music: 0.7, sfx: 1, quality: 'medium', haptics: true },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function count(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

function volume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function optionalId(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Turns whatever was stored into valid SaveData. Each field that is missing or malformed falls
 * back to its default, so a partly damaged save keeps the rest of the progress. A save from a
 * newer version of the game, or anything that is not an object, starts fresh.
 */
export function migrateSave(raw: unknown): SaveData {
  const save = createDefaultSave();
  if (!isRecord(raw)) return save;
  if (typeof raw.version === 'number' && raw.version > SAVE_VERSION) return save;
  // Version 1 is the first format; older versions get their steps here.

  if (isRecord(raw.rooms)) {
    for (const [id, entry] of Object.entries(raw.rooms)) {
      if (!isRecord(entry)) continue;
      const stars = count(entry.stars, 0);
      save.rooms[id] = {
        bestCoins: count(entry.bestCoins, 0),
        stars: stars === 1 || stars === 2 || stars === 3 ? stars : 0,
        freeSoulCleared: entry.freeSoulCleared === true,
      };
    }
  }
  save.totalCoins = count(raw.totalCoins, 0);

  if (isRecord(raw.cosmetics)) {
    const { owned, equipped } = raw.cosmetics;
    if (Array.isArray(owned)) {
      save.cosmetics.owned = [...new Set(owned.filter((id) => typeof id === 'string'))];
    }
    if (isRecord(equipped)) {
      for (const slot of ['hat', 'collar', 'fur'] as const) {
        const id = optionalId(equipped[slot]);
        if (id) save.cosmetics.equipped[slot] = id;
      }
    }
  }

  if (isRecord(raw.settings)) {
    const { music, sfx, quality, haptics } = raw.settings;
    const tiers: QualityTier[] = ['low', 'medium', 'high'];
    save.settings = {
      music: volume(music, save.settings.music),
      sfx: volume(sfx, save.settings.sfx),
      quality: tiers.find((tier) => tier === quality) ?? save.settings.quality,
      haptics: typeof haptics === 'boolean' ? haptics : save.settings.haptics,
    };
  }
  if (raw.tutorialDone === true) save.tutorialDone = true;
  return save;
}
