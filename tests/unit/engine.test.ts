import { describe, expect, it } from 'vitest';
import { orbitOffset } from '../../src/engine/camera';
import { pickTier, QUALITY_TIERS } from '../../src/engine/quality';

describe('pickTier', () => {
  it('picks high from 55 FPS, medium from 35, low below', () => {
    expect(pickTier(60)).toBe('high');
    expect(pickTier(55)).toBe('high');
    expect(pickTier(54.9)).toBe('medium');
    expect(pickTier(35)).toBe('medium');
    expect(pickTier(34.9)).toBe('low');
    expect(pickTier(0)).toBe('low');
  });
});

describe('quality tiers', () => {
  it('get heavier from low to high', () => {
    const { low, medium, high } = QUALITY_TIERS;
    expect(low.resolutionScale).toBeLessThan(medium.resolutionScale);
    expect(medium.resolutionScale).toBeLessThanOrEqual(high.resolutionScale);
    expect(low.debrisCap).toBeLessThan(medium.debrisCap);
    expect(medium.debrisCap).toBeLessThan(high.debrisCap);
    expect([low.shadows, medium.shadows, high.shadows]).toEqual([false, true, true]);
    expect([low.postEffects, medium.postEffects, high.postEffects]).toEqual([false, false, true]);
  });

  it('stays inside the debris budgets: 80 on low, 250 at most', () => {
    expect(QUALITY_TIERS.low.debrisCap).toBe(80);
    expect(QUALITY_TIERS.high.debrisCap).toBeLessThanOrEqual(250);
  });
});

describe('orbitOffset', () => {
  it('puts the camera behind the focus (toward -z) and above it by default', () => {
    const offset = orbitOffset(0, Math.PI / 4, 4);
    expect(offset.x).toBeCloseTo(0);
    expect(offset.y).toBeCloseTo(4 * Math.SQRT1_2);
    expect(offset.z).toBeCloseTo(-4 * Math.SQRT1_2);
  });

  it('keeps the requested distance for any angles', () => {
    for (const [yaw, pitch] of [
      [0.3, 0.2],
      [-2, 1.1],
      [Math.PI, 0.62],
    ] as const) {
      const { x, y, z } = orbitOffset(yaw, pitch, 3.6);
      expect(Math.hypot(x, y, z)).toBeCloseTo(3.6);
    }
  });

  it('swings around the focus with yaw', () => {
    const quarter = orbitOffset(Math.PI / 2, 0, 2);
    expect(quarter.x).toBeCloseTo(-2);
    expect(quarter.z).toBeCloseTo(0);
    expect(quarter.y).toBeCloseTo(0);
  });
});
