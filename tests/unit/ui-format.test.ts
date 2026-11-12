import { describe, expect, it } from 'vitest';
import { COSMETICS, findCosmetic, isCosmeticOwned } from '../../src/core/cosmetics';
import type { LevelResult, RoomDef, SaveData } from '../../src/core/types';
import { createDefaultSave } from '../../src/save/migrate';
import {
  formatCoins,
  formatTime,
  groupBroken,
  isFreeSoulUnlocked,
  isRoomUnlocked,
  missionProgress,
  nextRoom,
  resultTitle,
  totalStars,
} from '../../src/ui/format';

function room(id: string, order: number, requiresStars: number): RoomDef {
  return {
    id,
    name: id,
    order,
    glb: '',
    objectsJson: '',
    mission: { timeLimitSec: 90, targetCoins: 1200 },
    unlock: { requiresStars },
    music: id,
  };
}

function saveWith(stars: Record<string, 0 | 1 | 2 | 3>): SaveData {
  const save = createDefaultSave();
  for (const [id, value] of Object.entries(stars)) {
    save.rooms[id] = { bestCoins: 0, stars: value, freeSoulCleared: false };
  }
  return save;
}

const result: LevelResult = {
  roomId: 'tiny-studio',
  mode: 'mission',
  coins: 1300,
  stars: 1,
  broken: [],
  bestCombo: 1,
  timeSec: 90,
  treasureBroken: false,
};

describe('formatTime', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9)).toBe('0:09');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(150)).toBe('2:30');
  });

  it('rounds partial seconds up, so 0:00 only shows when time is out', () => {
    expect(formatTime(0.2)).toBe('0:01');
    expect(formatTime(59.01)).toBe('1:00');
  });

  it('shows 0:00 for negative values', () => {
    expect(formatTime(-3)).toBe('0:00');
  });
});

describe('formatCoins', () => {
  it('adds thousands separators and rounds', () => {
    expect(formatCoins(0)).toBe('0');
    expect(formatCoins(999)).toBe('999');
    expect(formatCoins(12500)).toBe('12,500');
    expect(formatCoins(1234567.6)).toBe('1,234,568');
  });
});

describe('unlocks', () => {
  it('sums stars over all rooms', () => {
    expect(totalStars(createDefaultSave())).toBe(0);
    expect(totalStars(saveWith({ a: 3, b: 1, c: 0 }))).toBe(4);
  });

  it('unlocks a room once the total reaches its requirement', () => {
    const cafe = room('cozy-cafe', 3, 4);
    expect(isRoomUnlocked(cafe, saveWith({ a: 3 }))).toBe(false);
    expect(isRoomUnlocked(cafe, saveWith({ a: 3, b: 1 }))).toBe(true);
    expect(isRoomUnlocked(room('tiny-studio', 1, 0), createDefaultSave())).toBe(true);
  });

  it('unlocks Free Soul after the room has at least one Mission star', () => {
    const studio = room('tiny-studio', 1, 0);
    expect(isFreeSoulUnlocked(studio, createDefaultSave())).toBe(false);
    expect(isFreeSoulUnlocked(studio, saveWith({ 'tiny-studio': 0 }))).toBe(false);
    expect(isFreeSoulUnlocked(studio, saveWith({ 'tiny-studio': 1 }))).toBe(true);
    expect(isFreeSoulUnlocked(studio, saveWith({ 'cozy-cafe': 3 }))).toBe(false);
  });
});

describe('groupBroken', () => {
  it('groups by name, counts, sums coins and sorts by coins', () => {
    const groups = groupBroken([
      { defId: 'cup', name: 'Cup', coins: 10 },
      { defId: 'vase', name: 'Vase', coins: 60 },
      { defId: 'cup', name: 'Cup', coins: 13 },
      { defId: 'cup', name: 'Cup', coins: 15 },
    ]);
    expect(groups).toEqual([
      { name: 'Vase', count: 1, coins: 60 },
      { name: 'Cup', count: 3, coins: 38 },
    ]);
  });

  it('breaks ties by name and handles an empty list', () => {
    expect(groupBroken([])).toEqual([]);
    const groups = groupBroken([
      { defId: 'b', name: 'Bowl', coins: 20 },
      { defId: 'a', name: 'Apple', coins: 20 },
    ]);
    expect(groups.map((group) => group.name)).toEqual(['Apple', 'Bowl']);
  });
});

describe('missionProgress', () => {
  it('fills to two thirds at the target and is full at 150%', () => {
    expect(missionProgress(0, 1200)).toBe(0);
    expect(missionProgress(1200, 1200)).toBeCloseTo(2 / 3);
    expect(missionProgress(1800, 1200)).toBe(1);
    expect(missionProgress(9000, 1200)).toBe(1);
  });

  it('copes with odd inputs', () => {
    expect(missionProgress(-5, 1200)).toBe(0);
    expect(missionProgress(10, 0)).toBe(1);
  });
});

describe('resultTitle', () => {
  it('depends on the mode and whether the target was reached', () => {
    expect(resultTitle(result)).toBe('Mission Complete!');
    expect(resultTitle({ ...result, stars: 0 })).toBe('The Owner Is Home!');
    expect(resultTitle({ ...result, mode: 'free-soul', stars: 0 })).toBe('Room Cleared!');
  });
});

describe('nextRoom', () => {
  const rooms = [room('a', 1, 0), room('b', 2, 2), room('c', 3, 4)];

  it('returns the room after the given one', () => {
    expect(nextRoom(rooms, 'a')?.id).toBe('b');
    expect(nextRoom(rooms, 'b')?.id).toBe('c');
  });

  it('returns undefined after the last room or for an unknown room', () => {
    expect(nextRoom(rooms, 'c')).toBeUndefined();
    expect(nextRoom(rooms, 'zzz')).toBeUndefined();
  });
});

describe('cosmetics', () => {
  it('has unique ids and either a price or an unlock room', () => {
    expect(new Set(COSMETICS.map((item) => item.id)).size).toBe(COSMETICS.length);
    for (const item of COSMETICS) {
      expect((item.price !== undefined) !== (item.unlockRoom !== undefined), item.id).toBe(true);
    }
  });

  it('finds items by id', () => {
    expect(findCosmetic('hat_party')?.name).toBe('Party Hat');
    expect(findCosmetic('nope')).toBeUndefined();
    expect(findCosmetic(undefined)).toBeUndefined();
  });

  it('counts an item as owned when bought or when its room has 3 stars', () => {
    const party = findCosmetic('hat_party');
    const bell = findCosmetic('collar_bell');
    if (!party || !bell) throw new Error('catalog changed');

    const save = createDefaultSave();
    expect(isCosmeticOwned(party, save)).toBe(false);
    save.cosmetics.owned.push('hat_party');
    expect(isCosmeticOwned(party, save)).toBe(true);

    expect(isCosmeticOwned(bell, saveWith({ 'tiny-studio': 2 }))).toBe(false);
    expect(isCosmeticOwned(bell, saveWith({ 'tiny-studio': 3 }))).toBe(true);
  });
});
