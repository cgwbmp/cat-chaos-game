import { describe, expect, it } from 'vitest';
import { clampToRadius, stickVector } from '../../src/input/stick';

const RADIUS = 50;

describe('stickVector', () => {
  it('is zero at the center', () => {
    expect(stickVector(0, 0, RADIUS)).toEqual({ x: 0, y: 0 });
  });

  it('is zero inside the dead zone and at its edge', () => {
    expect(stickVector(5, 0, RADIUS)).toEqual({ x: 0, y: 0 });
    expect(stickVector(0, -7.5, RADIUS)).toEqual({ x: 0, y: 0 });
  });

  it('starts from zero just outside the dead zone', () => {
    const { x, y } = stickVector(8, 0, RADIUS);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(0.05);
    expect(y).toBeCloseTo(0);
  });

  it('reaches full length at the radius', () => {
    expect(stickVector(RADIUS, 0, RADIUS)).toEqual({ x: 1, y: -0 });
  });

  it('dragging up on screen means forward', () => {
    const { x, y } = stickVector(0, -RADIUS, RADIUS);
    expect(x).toBeCloseTo(0);
    expect(y).toBe(1);
  });

  it('dragging down on screen means backward, left means left', () => {
    expect(stickVector(0, RADIUS, RADIUS).y).toBe(-1);
    expect(stickVector(-RADIUS, 0, RADIUS).x).toBe(-1);
  });

  it('never exceeds length 1 beyond the radius', () => {
    const { x, y } = stickVector(300, -400, RADIUS);
    expect(Math.hypot(x, y)).toBeCloseTo(1);
    expect(x).toBeCloseTo(0.6);
    expect(y).toBeCloseTo(0.8);
  });

  it('grows linearly between the dead zone and the radius', () => {
    // Half way between the dead zone (15%) and the edge is a tilt of 57.5%.
    expect(stickVector(RADIUS * 0.575, 0, RADIUS).x).toBeCloseTo(0.5);
  });

  it('respects a custom dead zone', () => {
    expect(stickVector(20, 0, RADIUS, 0.5)).toEqual({ x: 0, y: 0 });
    expect(stickVector(37.5, 0, RADIUS, 0.5).x).toBeCloseTo(0.5);
    expect(stickVector(1, 0, RADIUS, 0).x).toBeCloseTo(0.02);
  });
});

describe('clampToRadius', () => {
  it('leaves offsets inside the radius alone', () => {
    expect(clampToRadius(10, -20, RADIUS)).toEqual({ dx: 10, dy: -20 });
    expect(clampToRadius(0, 0, RADIUS)).toEqual({ dx: 0, dy: 0 });
  });

  it('pulls offsets outside the radius back onto it, keeping the direction', () => {
    const { dx, dy } = clampToRadius(300, -400, RADIUS);
    expect(dx).toBeCloseTo(30);
    expect(dy).toBeCloseTo(-40);
  });
});
