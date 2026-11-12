import { describe, expect, it } from 'vitest';
import { moveSpeed, pounceImpulse, swatImpulse, turnTowards } from '../../src/cat/abilities';
import {
  POUNCE_BASE_IMPULSE,
  POUNCE_IMPULSE_PER_SPEED,
  POUNCE_SPEED,
  RUN_SPEED,
  RUN_TILT,
  SWAT_MAX_IMPULSE,
  SWAT_SPEED,
  WALK_SPEED,
  ZOOMIES_MULTIPLIER,
} from '../../src/cat/tuning';

const length = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);
const cat = { x: 0, y: 0.2, z: 0 };
const facingForward = { x: 0, z: 1 };

describe('moveSpeed', () => {
  it('is zero with no tilt', () => {
    expect(moveSpeed(0, false)).toBe(0);
  });

  it('walks up to the run threshold, then blends up to a full run', () => {
    expect(moveSpeed(RUN_TILT / 2, false)).toBeCloseTo(WALK_SPEED / 2);
    expect(moveSpeed(RUN_TILT, false)).toBeCloseTo(WALK_SPEED);
    expect(moveSpeed((RUN_TILT + 1) / 2, false)).toBeCloseTo((WALK_SPEED + RUN_SPEED) / 2);
    expect(moveSpeed(1, false)).toBeCloseTo(RUN_SPEED);
  });

  it('clamps tilt to 0..1', () => {
    expect(moveSpeed(-1, false)).toBe(0);
    expect(moveSpeed(5, false)).toBeCloseTo(RUN_SPEED);
  });

  it('zoomies multiply the speed', () => {
    expect(moveSpeed(1, true)).toBeCloseTo(RUN_SPEED * ZOOMIES_MULTIPLIER);
    expect(moveSpeed(0, true)).toBe(0);
  });
});

describe('turnTowards', () => {
  it('snaps to the target when it is within one step', () => {
    expect(turnTowards(0, 0.1, 0.2)).toBe(0.1);
    expect(turnTowards(1, 1, 0.2)).toBe(1);
  });

  it('turns by at most the step', () => {
    expect(turnTowards(0, 1, 0.2)).toBeCloseTo(0.2);
    expect(turnTowards(0, -1, 0.2)).toBeCloseTo(-0.2);
  });

  it('takes the short way round across the ±180° seam', () => {
    // From 170° to -170° is 20° through 180°, not 340° back through 0°.
    const from = (170 * Math.PI) / 180;
    const to = (-170 * Math.PI) / 180;
    expect(turnTowards(from, to, 0.1)).toBeCloseTo(from + 0.1);
    expect(turnTowards(to, from, 0.1)).toBeCloseTo(to - 0.1);
  });
});

describe('swatImpulse', () => {
  /** A small object (10 cm tall) centered at the given point. */
  const small = (x: number, y: number, z: number) => ({ position: { x, y, z }, halfHeight: 0.05 });

  it('hits an object straight ahead: forward and slightly up', () => {
    const impulse = swatImpulse(cat, facingForward, small(0, 0.2, 0.4), 0.2);
    expect(impulse).toBeDefined();
    if (!impulse) return;
    expect(impulse.x).toBeCloseTo(0);
    expect(impulse.z).toBeGreaterThan(0);
    expect(impulse.y).toBeGreaterThan(0);
    expect(impulse.y).toBeLessThan(impulse.z);
  });

  it('gives light objects the swat speed', () => {
    const impulse = swatImpulse(cat, facingForward, small(0, 0.2, 0.4), 0.5);
    expect(impulse && length(impulse)).toBeCloseTo(0.5 * SWAT_SPEED);
  });

  it('caps the impulse, so heavy objects move slower', () => {
    const impulse = swatImpulse(cat, facingForward, small(0, 0.2, 0.4), 8);
    expect(impulse && length(impulse)).toBeCloseTo(SWAT_MAX_IMPULSE);
  });

  it('misses an object behind the cat', () => {
    expect(swatImpulse(cat, facingForward, small(0, 0.2, -0.4), 0.2)).toBeUndefined();
  });

  it('hits inside the 75° cone and misses outside it', () => {
    const at = (degrees: number) => {
      const angle = (degrees * Math.PI) / 180;
      return small(Math.sin(angle) * 0.4, 0.2, Math.cos(angle) * 0.4);
    };
    expect(swatImpulse(cat, facingForward, at(70), 0.2)).toBeDefined();
    expect(swatImpulse(cat, facingForward, at(-70), 0.2)).toBeDefined();
    expect(swatImpulse(cat, facingForward, at(80), 0.2)).toBeUndefined();
    expect(swatImpulse(cat, facingForward, at(-80), 0.2)).toBeUndefined();
  });

  it('reaches 0.85 m ahead and no further', () => {
    expect(swatImpulse(cat, facingForward, small(0, 0.2, 0.84), 0.2)).toBeDefined();
    expect(swatImpulse(cat, facingForward, small(0, 0.2, 0.86), 0.2)).toBeUndefined();
  });

  it('misses small objects on a shelf overhead or on a surface below', () => {
    // The cat's middle is at 0.2; a swat reaches 0.4 up and down, plus the object's own half.
    expect(swatImpulse(cat, facingForward, small(0, 0.66, 0.3), 0.2)).toBeUndefined();
    expect(swatImpulse(cat, facingForward, small(0, -0.26, 0.3), 0.2)).toBeUndefined();
    expect(swatImpulse(cat, facingForward, small(0, 0.64, 0.3), 0.2)).toBeDefined();
    expect(swatImpulse(cat, facingForward, small(0, -0.24, 0.3), 0.2)).toBeDefined();
  });

  it('hits a tall object standing next to the cat although its center is high up', () => {
    const lamp = { position: { x: 0, y: 0.73, z: 0.4 }, halfHeight: 0.73 };
    expect(swatImpulse(cat, facingForward, lamp, 5)).toBeDefined();
  });

  it('pushes an object to the side partly sideways', () => {
    const impulse = swatImpulse(cat, facingForward, small(0.3, 0.2, 0.3), 0.2);
    expect(impulse?.x).toBeGreaterThan(0);
    expect(impulse?.z).toBeGreaterThan(impulse?.x ?? Infinity);
  });

  it('always hits an object right next to the cat, even behind it', () => {
    expect(swatImpulse(cat, facingForward, small(0, 0.2, -0.15), 0.2)).toBeDefined();
  });

  it('pushes an object exactly at the cat along the facing', () => {
    const impulse = swatImpulse(cat, { x: 1, z: 0 }, { position: cat, halfHeight: 0.05 }, 0.2);
    expect(impulse?.x).toBeGreaterThan(0);
    expect(impulse?.z).toBeCloseTo(0);
  });

  it('follows the facing direction', () => {
    const impulse = swatImpulse(cat, { x: -1, z: 0 }, small(-0.4, 0.2, 0), 0.2);
    expect(impulse?.x).toBeLessThan(0);
    expect(swatImpulse(cat, { x: -1, z: 0 }, small(0.4, 0.2, 0), 0.2)).toBeUndefined();
  });
});

describe('pounceImpulse', () => {
  const feet = { x: 0, y: 0, z: 0 };
  const small = (x: number, y: number, z: number) => ({ position: { x, y, z }, halfHeight: 0.05 });

  it('throws an object away from the cat and up', () => {
    const impulse = pounceImpulse(feet, small(0.5, 0.05, 0), 0.5, 8);
    expect(impulse).toBeDefined();
    if (!impulse) return;
    expect(impulse.x).toBeGreaterThan(0);
    expect(impulse.z).toBeCloseTo(0);
    expect(impulse.y).toBeGreaterThan(impulse.x);
  });

  it('gives light objects the pounce speed', () => {
    const impulse = pounceImpulse(feet, small(0, 0.05, -0.5), 0.5, 8);
    expect(impulse && length(impulse)).toBeCloseTo(0.5 * POUNCE_SPEED);
    expect(impulse?.z).toBeLessThan(0);
  });

  it('caps heavy objects by the landing speed: a harder landing moves them more', () => {
    const jar = { position: { x: 0.5, y: 0.3, z: 0 }, halfHeight: 0.3 };
    const soft = pounceImpulse(feet, jar, 20, 2);
    const hard = pounceImpulse(feet, jar, 20, 12);
    expect(soft && length(soft)).toBeCloseTo(POUNCE_BASE_IMPULSE + POUNCE_IMPULSE_PER_SPEED * 2);
    expect(hard && length(hard)).toBeCloseTo(POUNCE_BASE_IMPULSE + POUNCE_IMPULSE_PER_SPEED * 12);
  });

  it('throws an object directly under the cat straight up', () => {
    const impulse = pounceImpulse(feet, { position: feet, halfHeight: 0.05 }, 0.5, 8);
    expect(impulse?.x).toBeCloseTo(0);
    expect(impulse?.z).toBeCloseTo(0);
    expect(impulse?.y).toBeCloseTo(0.5 * POUNCE_SPEED);
  });

  it('reaches 0.8 m around the cat and no further', () => {
    expect(pounceImpulse(feet, small(0.79, 0.05, 0), 0.5, 8)).toBeDefined();
    expect(pounceImpulse(feet, small(0.81, 0.05, 0), 0.5, 8)).toBeUndefined();
  });

  it('leaves objects on another level alone', () => {
    expect(pounceImpulse(feet, small(0.3, 0.75, 0), 0.5, 8)).toBeUndefined();
    expect(pounceImpulse(feet, small(0.3, -0.75, 0), 0.5, 8)).toBeUndefined();
  });
});
