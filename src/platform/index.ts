// Entry point read by main.ts. The adapter is chosen at build time:
//   VITE_PLATFORM=poki pnpm build        (or crazygames; default: none)
import type { PlatformService, ServiceFactory } from '../core/services';
import {
  CRAZYGAMES_SDK_URL,
  POKI_SDK_URL,
  createCrazyGamesPlatform,
  createNonePlatform,
  createPokiPlatform,
  loadScript,
  type CrazyGamesSdk,
  type PokiSdk,
} from './adapters';

export const createPlatform: ServiceFactory<PlatformService> = (services) => {
  const onReward = (reward: 'extend_timer' | 'double_coins') =>
    services.bus.emit('reward/granted', { reward });

  switch (import.meta.env.VITE_PLATFORM) {
    case 'poki':
      return createPokiPlatform(async () => {
        await loadScript(POKI_SDK_URL);
        return (window as unknown as { PokiSDK: PokiSdk }).PokiSDK;
      }, onReward);
    case 'crazygames':
      return createCrazyGamesPlatform(async () => {
        await loadScript(CRAZYGAMES_SDK_URL);
        return (window as unknown as { CrazyGames: { SDK: CrazyGamesSdk } }).CrazyGames.SDK;
      }, onReward);
    default:
      return createNonePlatform();
  }
};
