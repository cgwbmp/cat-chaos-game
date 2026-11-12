import { describe, expect, it } from 'vitest';
import {
  createCatAnimator,
  LOAF_AFTER_SEC,
  ONE_SHOT_SEC,
  type CatAnimInput,
} from '../../src/cat/animation';

const standing: CatAnimInput = { grounded: true, speed: 0, pouncing: false };
const walking: CatAnimInput = { grounded: true, speed: 1.2, pouncing: false };
const running: CatAnimInput = { grounded: true, speed: 3.4, pouncing: false };
const airborne: CatAnimInput = { grounded: false, speed: 2, pouncing: false };
const STEP = 1 / 60;

describe('cat animator', () => {
  it('starts idle', () => {
    expect(createCatAnimator().clip).toBe('idle');
  });

  it('picks walk, run and jump from speed and ground contact', () => {
    const animator = createCatAnimator();
    expect(animator.update(STEP, walking)).toBe('walk');
    expect(animator.update(STEP, running)).toBe('run');
    expect(animator.update(STEP, airborne)).toBe('jump');
    expect(animator.update(STEP, standing)).toBe('idle');
  });

  it('switches from walk to run at 2.2 m/s and from idle to walk at 0.15 m/s', () => {
    const animator = createCatAnimator();
    expect(animator.update(STEP, { ...standing, speed: 0.14 })).toBe('idle');
    expect(animator.update(STEP, { ...standing, speed: 0.15 })).toBe('walk');
    expect(animator.update(STEP, { ...standing, speed: 2.19 })).toBe('walk');
    expect(animator.update(STEP, { ...standing, speed: 2.2 })).toBe('run');
  });

  it('loafs after standing still long enough, and gets up when it moves', () => {
    const animator = createCatAnimator();
    expect(animator.update(LOAF_AFTER_SEC - 0.1, standing)).toBe('idle');
    expect(animator.update(0.2, standing)).toBe('loaf');
    expect(animator.update(STEP, walking)).toBe('walk');
    expect(animator.update(STEP, standing)).toBe('idle');
  });

  it('moving restarts the wait before loafing', () => {
    const animator = createCatAnimator();
    animator.update(LOAF_AFTER_SEC - 1, standing);
    animator.update(STEP, walking);
    expect(animator.update(LOAF_AFTER_SEC - 1, standing)).toBe('idle');
  });

  it('plays a swat for its duration, then returns to the state clip', () => {
    const animator = createCatAnimator();
    animator.play('swat');
    expect(animator.update(STEP, standing)).toBe('swat');
    expect(animator.update(ONE_SHOT_SEC.swat - 2 * STEP, running)).toBe('swat');
    expect(animator.update(2 * STEP, running)).toBe('run');
  });

  it('a swat can play in the air', () => {
    const animator = createCatAnimator();
    animator.play('swat');
    expect(animator.update(STEP, airborne)).toBe('swat');
  });

  it('a landing is dropped if the cat is back in the air', () => {
    const animator = createCatAnimator();
    animator.play('land');
    expect(animator.update(STEP, standing)).toBe('land');
    expect(animator.update(STEP, airborne)).toBe('jump');
    expect(animator.update(STEP, standing)).toBe('idle');
  });

  it('pounce overrides everything while it lasts', () => {
    const animator = createCatAnimator();
    animator.play('swat');
    expect(animator.update(STEP, { ...airborne, pouncing: true })).toBe('pounce');
    expect(animator.update(STEP, { ...standing, pouncing: true })).toBe('pounce');
  });

  it('celebrates for two seconds while standing', () => {
    const animator = createCatAnimator();
    animator.play('celebrate');
    expect(animator.update(1, standing)).toBe('celebrate');
    expect(animator.update(0.9, standing)).toBe('celebrate');
    expect(animator.update(0.2, standing)).toBe('idle');
  });

  it('moving cuts a celebration short', () => {
    const animator = createCatAnimator();
    animator.play('celebrate');
    animator.update(0.5, standing);
    expect(animator.update(STEP, walking)).toBe('walk');
    expect(animator.update(STEP, standing)).toBe('idle');
  });

  it('a one-shot restarts the wait before loafing', () => {
    const animator = createCatAnimator();
    animator.update(LOAF_AFTER_SEC - 0.5, standing);
    animator.play('swat');
    animator.update(ONE_SHOT_SEC.swat + STEP, standing);
    expect(animator.update(1, standing)).toBe('idle');
  });

  it('clipTime counts up within a clip and restarts when the clip changes', () => {
    const animator = createCatAnimator();
    animator.update(0.5, walking);
    expect(animator.clipTime).toBe(0);
    animator.update(0.5, walking);
    animator.update(0.25, walking);
    expect(animator.clipTime).toBeCloseTo(0.75);
    animator.update(0.1, running);
    expect(animator.clipTime).toBe(0);
  });
});
