import { describe, expect, it } from 'vitest';
import { orbitOffset } from '../../src/engine/camera';
import { LAMP_LIGHTS, MOODS, pickSpread } from '../../src/engine/lighting';
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

describe('lighting moods', () => {
  it('keeps lamps off by day and on in every other mood', () => {
    const { day, ...others } = MOODS;
    expect(day.lamps).toBe(0);
    for (const look of Object.values(others)) {
      expect(look.lamps).toBeGreaterThan(0);
      expect(look.lamps).toBeLessThanOrEqual(1);
    }
  });

  it('shines the sun down and in through the open side of the room', () => {
    for (const { sun } of Object.values(MOODS)) {
      const [, y, z] = sun.direction;
      expect(y).toBeLessThan(0);
      expect(z).toBeGreaterThan(0);
    }
  });

  it('lights fewer lamps on low quality', () => {
    expect(LAMP_LIGHTS.low).toBeLessThan(LAMP_LIGHTS.medium);
    expect(LAMP_LIGHTS.medium).toBeLessThanOrEqual(LAMP_LIGHTS.high);
  });
});

describe('pickSpread', () => {
  const at = (x: number, z: number) => ({ x, y: 1, z });
  // Two lamps side by side on the left, one in the middle, one on the right.
  const lamps = [at(-4, 0), at(-3.5, 0), at(0, 0), at(4, 0)];

  it('lights every lamp when the budget allows', () => {
    expect(pickSpread(lamps, [], 4).sort()).toEqual([0, 1, 2, 3]);
    expect(pickSpread(lamps, [], 9).sort()).toEqual([0, 1, 2, 3]);
  });

  it('spreads a small budget over the room', () => {
    expect(pickSpread(lamps, [], 2)).toEqual([0, 3]);
    expect(pickSpread(lamps, [], 3)).toEqual([0, 3, 2]);
  });

  it('adds to the lamps lit already, away from them', () => {
    expect(pickSpread(lamps, [0, 3], 1)).toEqual([2]);
    expect(pickSpread(lamps, [0, 2, 3], 1)).toEqual([1]);
  });

  it('picks nothing without budget or lamps', () => {
    expect(pickSpread(lamps, [0, 3], 0)).toEqual([]);
    expect(pickSpread(lamps, [0, 1, 2, 3], -1)).toEqual([]);
    expect(pickSpread([], [], 2)).toEqual([]);
  });
});
