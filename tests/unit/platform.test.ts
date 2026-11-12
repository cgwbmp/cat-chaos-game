import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCrazyGamesPlatform,
  createNonePlatform,
  createPokiPlatform,
  type CrazyGamesSdk,
  type PokiSdk,
} from '../../src/platform/adapters';

function fakePoki(rewarded: () => Promise<boolean> = async () => true) {
  return {
    init: vi.fn(async () => {}),
    gameLoadingFinished: vi.fn(),
    gameplayStart: vi.fn(),
    gameplayStop: vi.fn(),
    rewardedBreak: vi.fn(rewarded),
  } satisfies PokiSdk;
}

function fakeCrazyGames(outcome: 'adFinished' | 'adError' = 'adFinished') {
  return {
    init: vi.fn(async () => {}),
    game: {
      loadingStart: vi.fn(),
      loadingStop: vi.fn(),
      gameplayStart: vi.fn(),
      gameplayStop: vi.fn(),
    },
    ad: {
      requestAd: vi.fn((_type: string, callbacks: Record<string, (() => void) | undefined>) => {
        callbacks.adStarted?.();
        callbacks[outcome]?.();
      }),
    },
  } satisfies CrazyGamesSdk;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('none platform', () => {
  it('does nothing and never shows an ad', async () => {
    const platform = createNonePlatform();
    expect(platform.id).toBe('none');
    await platform.init();
    platform.loadingProgress(1);
    platform.gameplayStart();
    platform.gameplayStop();
    await expect(platform.showRewardedAd('double_coins')).resolves.toBe(false);
  });
});

describe('poki platform', () => {
  it('initialises the SDK and reports loading finished once, at 100%', async () => {
    const sdk = fakePoki();
    const platform = createPokiPlatform(async () => sdk, vi.fn());
    await platform.init();
    expect(sdk.init).toHaveBeenCalledTimes(1);

    platform.loadingProgress(0.4);
    expect(sdk.gameLoadingFinished).not.toHaveBeenCalled();
    platform.loadingProgress(1);
    platform.loadingProgress(1);
    expect(sdk.gameLoadingFinished).toHaveBeenCalledTimes(1);
  });

  it('reports gameplay start and stop only when the state changes', async () => {
    const sdk = fakePoki();
    const platform = createPokiPlatform(async () => sdk, vi.fn());
    await platform.init();
    platform.gameplayStop();
    platform.gameplayStart();
    platform.gameplayStart();
    platform.gameplayStop();
    platform.gameplayStop();
    platform.gameplayStart();
    expect(sdk.gameplayStart).toHaveBeenCalledTimes(2);
    expect(sdk.gameplayStop).toHaveBeenCalledTimes(1);
  });

  it('grants the reward when the rewarded break succeeds', async () => {
    const onReward = vi.fn();
    const platform = createPokiPlatform(async () => fakePoki(), onReward);
    await platform.init();
    await expect(platform.showRewardedAd('extend_timer')).resolves.toBe(true);
    expect(onReward).toHaveBeenCalledExactlyOnceWith('extend_timer');
  });

  it('grants nothing when the ad is skipped or fails', async () => {
    const onReward = vi.fn();
    const skipped = createPokiPlatform(async () => fakePoki(async () => false), onReward);
    await skipped.init();
    await expect(skipped.showRewardedAd('double_coins')).resolves.toBe(false);

    const failing = createPokiPlatform(
      async () => fakePoki(() => Promise.reject(new Error('no fill'))),
      onReward,
    );
    await failing.init();
    await expect(failing.showRewardedAd('double_coins')).resolves.toBe(false);
    expect(onReward).not.toHaveBeenCalled();
  });

  it('runs like the none platform when the SDK cannot load', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onReward = vi.fn();
    const platform = createPokiPlatform(() => Promise.reject(new Error('blocked')), onReward);
    await expect(platform.init()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    platform.loadingProgress(1);
    platform.gameplayStart();
    await expect(platform.showRewardedAd('double_coins')).resolves.toBe(false);
    expect(onReward).not.toHaveBeenCalled();
    expect(platform.id).toBe('poki');
  });
});

describe('crazygames platform', () => {
  it('brackets loading with loadingStart and loadingStop', async () => {
    const sdk = fakeCrazyGames();
    const platform = createCrazyGamesPlatform(async () => sdk, vi.fn());
    await platform.init();
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.game.loadingStart).toHaveBeenCalledTimes(1);
    platform.loadingProgress(0.99);
    expect(sdk.game.loadingStop).not.toHaveBeenCalled();
    platform.loadingProgress(1);
    expect(sdk.game.loadingStop).toHaveBeenCalledTimes(1);
  });

  it('reports gameplay start and stop', async () => {
    const sdk = fakeCrazyGames();
    const platform = createCrazyGamesPlatform(async () => sdk, vi.fn());
    await platform.init();
    platform.gameplayStart();
    platform.gameplayStop();
    expect(sdk.game.gameplayStart).toHaveBeenCalledTimes(1);
    expect(sdk.game.gameplayStop).toHaveBeenCalledTimes(1);
  });

  it('requests a rewarded ad and grants the reward when it finishes', async () => {
    const sdk = fakeCrazyGames('adFinished');
    const onReward = vi.fn();
    const platform = createCrazyGamesPlatform(async () => sdk, onReward);
    await platform.init();
    await expect(platform.showRewardedAd('double_coins')).resolves.toBe(true);
    expect(sdk.ad.requestAd).toHaveBeenCalledWith('rewarded', expect.any(Object));
    expect(onReward).toHaveBeenCalledExactlyOnceWith('double_coins');
  });

  it('grants nothing on an ad error', async () => {
    const onReward = vi.fn();
    const platform = createCrazyGamesPlatform(async () => fakeCrazyGames('adError'), onReward);
    await platform.init();
    await expect(platform.showRewardedAd('double_coins')).resolves.toBe(false);
    expect(onReward).not.toHaveBeenCalled();
  });
});
