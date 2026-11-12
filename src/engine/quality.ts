// Quality tiers: resolution scale, shadows, post effects and debris cap. The tier is picked once
// from a 2 s benchmark and can be changed in settings.
import type { QualityService, QualitySettings, ServiceFactory } from '../core/services';
import type { QualityTier } from '../core/types';

export const QUALITY_TIERS: Record<QualityTier, QualitySettings> = {
  low: { resolutionScale: 0.6, shadows: false, postEffects: false, debrisCap: 80 },
  medium: { resolutionScale: 0.8, shadows: true, postEffects: false, debrisCap: 150 },
  high: { resolutionScale: 1, shadows: true, postEffects: true, debrisCap: 250 },
};

const BENCHMARK_SEC = 2;
const WARM_UP_SEC = 0.3; // the first frames compile shaders and are not representative
const MAX_PIXEL_RATIO = 2;
const AUTO_DONE_KEY = 'cat-chaos/quality-auto';

/** Tier for an average frame rate measured at medium quality. */
export function pickTier(fps: number): QualityTier {
  if (fps >= 55) return 'high';
  if (fps >= 35) return 'medium';
  return 'low';
}

/** True once the benchmark has run on this device. Storage may be blocked; then it runs again. */
export function hasAutoDetected(): boolean {
  try {
    return localStorage.getItem(AUTO_DONE_KEY) !== null;
  } catch {
    return false;
  }
}

function rememberAutoDetected(): void {
  try {
    localStorage.setItem(AUTO_DONE_KEY, '1');
  } catch {
    // Storage blocked: nothing to remember.
  }
}

export const createQualityService: ServiceFactory<QualityService> = (services) => {
  let tier: QualityTier = 'medium';

  function apply(): void {
    const { engine } = services.scene;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    engine.setHardwareScalingLevel(1 / (QUALITY_TIERS[tier].resolutionScale * pixelRatio));
  }

  function setTier(next: QualityTier): void {
    const changed = next !== tier;
    tier = next;
    apply();
    if (changed) services.bus.emit('quality/changed', { tier });
  }

  return {
    get tier() {
      return tier;
    },
    get settings() {
      return QUALITY_TIERS[tier];
    },
    setTier,
    autoDetect() {
      const { engine, scene } = services.scene;
      setTier('medium');
      return new Promise((resolve) => {
        let elapsed = 0;
        let frames = 0;
        const observer = scene.onAfterRenderObservable.add(() => {
          const dt = engine.getDeltaTime() / 1000;
          elapsed += dt;
          if (elapsed > WARM_UP_SEC) frames++;
          if (elapsed < WARM_UP_SEC + BENCHMARK_SEC) return;
          scene.onAfterRenderObservable.remove(observer);
          setTier(pickTier(frames / (elapsed - WARM_UP_SEC)));
          rememberAutoDetected();
          resolve(tier);
        });
      });
    },
  };
};
