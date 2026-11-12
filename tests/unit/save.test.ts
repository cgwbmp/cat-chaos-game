import { describe, expect, it, vi } from 'vitest';
import { createDefaultSave, migrateSave } from '../../src/save/migrate';
import { createSaveStore, SAVE_KEY } from '../../src/save/service';

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const blockedStorage = {
  getItem(): string | null {
    throw new DOMException('blocked', 'SecurityError');
  },
  setItem(): void {
    throw new DOMException('blocked', 'SecurityError');
  },
  removeItem(): void {
    throw new DOMException('blocked', 'SecurityError');
  },
};

describe('migrateSave', () => {
  it('returns defaults for anything that is not an object', () => {
    for (const raw of [undefined, null, 42, 'save', [], true]) {
      expect(migrateSave(raw)).toEqual(createDefaultSave());
    }
  });

  it('keeps a valid save as it is', () => {
    const save = {
      version: 1 as const,
      rooms: { 'tiny-studio': { bestCoins: 2400, stars: 3 as const, freeSoulCleared: true } },
      totalCoins: 5200,
      cosmetics: { owned: ['hat_party'], equipped: { hat: 'hat_party' } },
      settings: { music: 0.3, sfx: 0.8, quality: 'high' as const, haptics: false },
      tutorialDone: true,
    };
    expect(migrateSave(save)).toEqual(save);
  });

  it('starts fresh for a save from a newer version', () => {
    expect(migrateSave({ version: 2, totalCoins: 900 })).toEqual(createDefaultSave());
  });

  it('fills in missing fields and keeps the rest', () => {
    const save = migrateSave({ version: 1, totalCoins: 750 });
    expect(save.totalCoins).toBe(750);
    expect(save.rooms).toEqual({});
    expect(save.settings).toEqual(createDefaultSave().settings);
    expect(save.cosmetics).toEqual({ owned: [], equipped: {} });
    expect(save.tutorialDone).toBeUndefined();
  });

  it('repairs malformed values field by field', () => {
    const save = migrateSave({
      version: 1,
      rooms: {
        good: { bestCoins: 100, stars: 2, freeSoulCleared: false },
        badStars: { bestCoins: 50.9, stars: 7, freeSoulCleared: 'yes' },
        negative: { bestCoins: -5, stars: -1 },
        junk: 'nope',
      },
      totalCoins: -300,
      cosmetics: { owned: ['a', 3, 'a', null, 'b'], equipped: { hat: 5, collar: 'c', tail: 'x' } },
      settings: { music: 7, sfx: -1, quality: 'ultra', haptics: 'on' },
    });
    expect(save.rooms).toEqual({
      good: { bestCoins: 100, stars: 2, freeSoulCleared: false },
      badStars: { bestCoins: 50, stars: 0, freeSoulCleared: false },
      negative: { bestCoins: 0, stars: 0, freeSoulCleared: false },
    });
    expect(save.totalCoins).toBe(0);
    expect(save.cosmetics).toEqual({ owned: ['a', 'b'], equipped: { collar: 'c' } });
    expect(save.settings).toEqual({ music: 1, sfx: 0, quality: 'medium', haptics: true });
  });
});

describe('save store', () => {
  it('starts from defaults when nothing is stored', () => {
    const store = createSaveStore(memoryStorage(), vi.fn());
    expect(store.get()).toEqual(createDefaultSave());
  });

  it('persists an update and reads it back after a reload', () => {
    const storage = memoryStorage();
    const store = createSaveStore(storage, vi.fn());
    const returned = store.update((data) => {
      data.totalCoins = 320;
      data.rooms['tiny-studio'] = { bestCoins: 1300, stars: 1, freeSoulCleared: false };
    });
    expect(returned.totalCoins).toBe(320);
    expect(storage.items.has(SAVE_KEY)).toBe(true);

    const reloaded = createSaveStore(storage, vi.fn());
    expect(reloaded.get().totalCoins).toBe(320);
    expect(reloaded.get().rooms['tiny-studio']).toEqual({
      bestCoins: 1300,
      stars: 1,
      freeSoulCleared: false,
    });
  });

  it('repairs an invalid change instead of storing it', () => {
    const store = createSaveStore(memoryStorage(), vi.fn());
    store.update((data) => {
      data.totalCoins = -50;
      data.settings.music = 9;
    });
    expect(store.get().totalCoins).toBe(0);
    expect(store.get().settings.music).toBe(1);
  });

  it('reports settings changes, and only those', () => {
    const onSettings = vi.fn();
    const store = createSaveStore(memoryStorage(), onSettings);
    store.update((data) => {
      data.totalCoins += 10;
    });
    expect(onSettings).not.toHaveBeenCalled();
    store.update((data) => {
      data.settings.sfx = 0.4;
    });
    expect(onSettings).toHaveBeenCalledExactlyOnceWith({
      music: 0.7,
      sfx: 0.4,
      quality: 'medium',
      haptics: true,
    });
  });

  it('falls back to defaults when the stored text is not JSON', () => {
    const store = createSaveStore(memoryStorage({ [SAVE_KEY]: '{not json' }), vi.fn());
    expect(store.get()).toEqual(createDefaultSave());
  });

  it('migrates what it finds in storage', () => {
    const stored = JSON.stringify({ version: 1, totalCoins: 40, settings: { quality: 'low' } });
    const store = createSaveStore(memoryStorage({ [SAVE_KEY]: stored }), vi.fn());
    expect(store.get().totalCoins).toBe(40);
    expect(store.get().settings).toEqual({ music: 0.7, sfx: 1, quality: 'low', haptics: true });
  });

  it('keeps working in memory when storage is blocked', () => {
    const store = createSaveStore(blockedStorage, vi.fn());
    expect(store.get()).toEqual(createDefaultSave());
    store.update((data) => {
      data.totalCoins = 99;
    });
    expect(store.get().totalCoins).toBe(99);
    expect(() => store.reset()).not.toThrow();
    expect(store.get().totalCoins).toBe(0);
  });

  it('keeps working in memory with no storage at all', () => {
    const store = createSaveStore(undefined, vi.fn());
    store.update((data) => {
      data.totalCoins = 5;
    });
    expect(store.get().totalCoins).toBe(5);
  });

  it('reset clears progress and the stored copy', () => {
    const storage = memoryStorage();
    const onSettings = vi.fn();
    const store = createSaveStore(storage, onSettings);
    store.update((data) => {
      data.totalCoins = 800;
      data.settings.quality = 'high';
    });
    onSettings.mockClear();
    store.reset();
    expect(store.get()).toEqual(createDefaultSave());
    expect(storage.items.has(SAVE_KEY)).toBe(false);
    expect(onSettings).toHaveBeenCalledTimes(1);
  });
});
