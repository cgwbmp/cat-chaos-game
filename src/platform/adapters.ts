// Portal SDK adapters: none, Poki and CrazyGames. Each adapter gets its SDK through a loader,
// so unit tests can pass a fake one.
import type { PlatformService } from '../core/services';
import type { RewardKind } from '../core/types';

/** The parts of the Poki SDK (v2) the game uses. */
export interface PokiSdk {
  init(): Promise<void>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  rewardedBreak(): Promise<boolean>;
}

/** The parts of the CrazyGames SDK (v3) the game uses. */
export interface CrazyGamesSdk {
  init(): Promise<void>;
  game: {
    loadingStart(): void;
    loadingStop(): void;
    gameplayStart(): void;
    gameplayStop(): void;
  };
  ad: {
    requestAd(
      type: 'rewarded' | 'midgame',
      callbacks: { adStarted?: () => void; adFinished?: () => void; adError?: () => void },
    ): void;
  };
}

export const POKI_SDK_URL = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
export const CRAZYGAMES_SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

type OnReward = (reward: RewardKind) => void;

export function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${url}`));
    document.head.append(script);
  });
}

/** No portal: no ads, no SDK. The game is fully playable. */
export function createNonePlatform(): PlatformService {
  return {
    id: 'none',
    async init() {},
    loadingProgress() {},
    gameplayStart() {},
    gameplayStop() {},
    async showRewardedAd() {
      return false;
    },
  };
}

/**
 * Shared behavior: the SDK is optional at runtime. If it fails to load (ad blocker, offline),
 * the game runs as on `none`. Gameplay start and stop are only reported when the state changes.
 */
function createPortalPlatform<Sdk>(
  id: PlatformService['id'],
  load: () => Promise<Sdk>,
  calls: {
    loadingStart?(sdk: Sdk): void;
    loadingFinished(sdk: Sdk): void;
    gameplayStart(sdk: Sdk): void;
    gameplayStop(sdk: Sdk): void;
    rewarded(sdk: Sdk): Promise<boolean>;
  },
  onReward: OnReward,
): PlatformService {
  let sdk: Sdk | undefined;
  let loaded = false;
  let playing = false;

  return {
    id,
    async init() {
      try {
        sdk = await load();
        calls.loadingStart?.(sdk);
      } catch (error) {
        console.warn(`[platform] ${id} SDK unavailable, running without it`, error);
      }
    },
    loadingProgress(fraction) {
      if (!sdk || loaded || fraction < 1) return;
      loaded = true;
      calls.loadingFinished(sdk);
    },
    gameplayStart() {
      if (!sdk || playing) return;
      playing = true;
      calls.gameplayStart(sdk);
    },
    gameplayStop() {
      if (!sdk || !playing) return;
      playing = false;
      calls.gameplayStop(sdk);
    },
    async showRewardedAd(reward) {
      if (!sdk) return false;
      const earned = await calls.rewarded(sdk).catch(() => false);
      if (earned) onReward(reward);
      return earned;
    },
  };
}

export function createPokiPlatform(
  load: () => Promise<PokiSdk>,
  onReward: OnReward,
): PlatformService {
  return createPortalPlatform(
    'poki',
    async () => {
      const sdk = await load();
      await sdk.init();
      return sdk;
    },
    {
      loadingFinished: (sdk) => sdk.gameLoadingFinished(),
      gameplayStart: (sdk) => sdk.gameplayStart(),
      gameplayStop: (sdk) => sdk.gameplayStop(),
      rewarded: (sdk) => sdk.rewardedBreak(),
    },
    onReward,
  );
}

export function createCrazyGamesPlatform(
  load: () => Promise<CrazyGamesSdk>,
  onReward: OnReward,
): PlatformService {
  return createPortalPlatform(
    'crazygames',
    async () => {
      const sdk = await load();
      await sdk.init();
      return sdk;
    },
    {
      loadingStart: (sdk) => sdk.game.loadingStart(),
      loadingFinished: (sdk) => sdk.game.loadingStop(),
      gameplayStart: (sdk) => sdk.game.gameplayStart(),
      gameplayStop: (sdk) => sdk.game.gameplayStop(),
      rewarded: (sdk) =>
        new Promise((resolve) => {
          sdk.ad.requestAd('rewarded', {
            adFinished: () => resolve(true),
            adError: () => resolve(false),
          });
        }),
    },
    onReward,
  );
}
