import { describe, expect, it } from 'vitest';
import { catches, createPatrol, type WalkerPose } from '../../src/game/walker';

const square = [
  { x: 0, y: 0, z: 0 },
  { x: 4, y: 0, z: 0 },
  { x: 4, y: 0, z: 4 },
  { x: 0, y: 0, z: 4 },
];

describe('patrol', () => {
  it('starts at the first waypoint', () => {
    const patrol = createPatrol(square, 2);
    expect(patrol.pose.position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('walks toward the next waypoint at its speed and faces where it goes', () => {
    const patrol = createPatrol(square, 2);
    const pose = patrol.advance(0.5);
    expect(pose.position.x).toBeCloseTo(1);
    expect(pose.position.z).toBeCloseTo(0);
    expect(pose.heading).toEqual({ x: 1, z: 0 });
  });

  it('turns the corner within one step and keeps the leftover distance', () => {
    const patrol = createPatrol(square, 2);
    const pose = patrol.advance(2.5); // 5 m: 4 along x, then 1 along z
    expect(pose.position.x).toBeCloseTo(4);
    expect(pose.position.z).toBeCloseTo(1);
    expect(pose.heading.x).toBeCloseTo(0);
    expect(pose.heading.z).toBeCloseTo(1);
  });

  it('loops back to the first waypoint', () => {
    const patrol = createPatrol(square, 2);
    const pose = patrol.advance(8); // 16 m = one full lap
    expect(pose.position.x).toBeCloseTo(0);
    expect(pose.position.z).toBeCloseTo(0);
    patrol.advance(0.5);
    expect(patrol.pose.position.x).toBeCloseTo(1);
  });

  it('pauses at each waypoint', () => {
    const patrol = createPatrol(square, 2, 1);
    patrol.advance(2); // reaches the first corner
    patrol.advance(0.9);
    expect(patrol.pose.position).toMatchObject({ x: 4, z: 0 });
    patrol.advance(0.6); // 0.1 s pause left, then 0.5 s of walking
    expect(patrol.pose.position.z).toBeCloseTo(1);
  });

  it('takes the height of each waypoint it reaches', () => {
    const patrol = createPatrol(
      [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0.2, z: 0 },
      ],
      1,
    );
    patrol.advance(1);
    expect(patrol.pose.position.y).toBe(0.2);
  });

  it('stands still with one waypoint, none, or no speed', () => {
    expect(createPatrol([{ x: 2, y: 0, z: 3 }], 2).advance(5).position).toEqual({
      x: 2,
      y: 0,
      z: 3,
    });
    expect(createPatrol([], 2).advance(5).position).toEqual({ x: 0, y: 0, z: 0 });
    expect(createPatrol(square, 0).advance(5).position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('does not hang on waypoints that coincide', () => {
    const patrol = createPatrol(
      [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ],
      2,
    );
    expect(patrol.advance(1).position).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('catches', () => {
  const walker: WalkerPose = { position: { x: 0, y: 0, z: 0 }, heading: { x: 0, z: 1 } };

  it('catches a cat close in front', () => {
    expect(catches(walker, { x: 0, y: 0, z: 1 })).toBe(true);
    expect(catches(walker, { x: 0.4, y: 0, z: 0.8 })).toBe(true);
  });

  it('does not catch beyond its reach', () => {
    expect(catches(walker, { x: 0, y: 0, z: 1.2 })).toBe(false);
  });

  it('does not see a cat behind or far to the side', () => {
    expect(catches(walker, { x: 0, y: 0, z: -0.9 })).toBe(false);
    expect(catches(walker, { x: 0.9, y: 0, z: 0.1 })).toBe(false);
  });

  it('catches at the edge of its 60° cone, not outside it', () => {
    const at = (degrees: number) => {
      const angle = (degrees * Math.PI) / 180;
      return { x: Math.sin(angle) * 0.9, y: 0, z: Math.cos(angle) * 0.9 };
    };
    expect(catches(walker, at(58))).toBe(true);
    expect(catches(walker, at(62))).toBe(false);
  });

  it('catches a cat that touches it from any side', () => {
    expect(catches(walker, { x: 0, y: 0, z: -0.4 })).toBe(true);
    expect(catches(walker, { x: -0.44, y: 0, z: 0 })).toBe(true);
    expect(catches(walker, { x: 0, y: 0, z: 0 })).toBe(true);
  });

  it('cannot reach a cat on a high shelf', () => {
    expect(catches(walker, { x: 0, y: 1.3, z: 0.5 })).toBe(false);
    expect(catches(walker, { x: 0, y: 1.1, z: 0.5 })).toBe(true);
  });

  it('follows the walker heading', () => {
    const turned: WalkerPose = { position: { x: 2, y: 0, z: 2 }, heading: { x: -1, z: 0 } };
    expect(catches(turned, { x: 1.1, y: 0, z: 2 })).toBe(true);
    expect(catches(turned, { x: 2.9, y: 0, z: 2 })).toBe(false);
  });
});
