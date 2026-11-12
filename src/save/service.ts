// Save service: SaveData in local storage. Storage can be blocked (private mode, portal
// iframes); the game then keeps progress in memory for the session.
import type { SaveService, ServiceFactory } from '../core/services';
import type { SaveData } from '../core/types';
import { createDefaultSave, migrateSave } from './migrate';

export const SAVE_KEY = 'cat-chaos/save';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStorage(): StorageLike | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined; // access itself can throw when storage is blocked
  }
}

/** `storage` is injectable for tests; undefined means memory only. */
export function createSaveStore(
  storage: StorageLike | undefined,
  onSettingsChanged: (settings: SaveData['settings']) => void,
): SaveService {
  function read(): SaveData {
    try {
      const text = storage?.getItem(SAVE_KEY);
      return text ? migrateSave(JSON.parse(text)) : createDefaultSave();
    } catch {
      return createDefaultSave(); // unreadable or not JSON
    }
  }

  function write(): void {
    try {
      storage?.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Quota or blocked storage: keep playing from memory.
    }
  }

  let data = read();

  return {
    get() {
      return data;
    },
    update(change) {
      const before = JSON.stringify(data.settings);
      change(data);
      data = migrateSave(data); // keeps the stored data valid whatever the change did
      write();
      if (JSON.stringify(data.settings) !== before) onSettingsChanged(data.settings);
      return data;
    },
    reset() {
      const before = JSON.stringify(data.settings);
      data = createDefaultSave();
      try {
        storage?.removeItem(SAVE_KEY);
      } catch {
        // Blocked storage: nothing to remove.
      }
      if (JSON.stringify(data.settings) !== before) onSettingsChanged(data.settings);
    },
  };
}

export const createSaveService: ServiceFactory<SaveService> = (services) =>
  createSaveStore(browserStorage(), (settings) =>
    services.bus.emit('settings/changed', { settings }),
  );
