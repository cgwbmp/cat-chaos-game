import { describe, expect, it } from 'vitest';
import type { BreakRule } from '../../src/core/types';
import {
  DIRECT_BLOW_MIN,
  WEAR_OUT_HITS,
  breaksOnBlow,
  breaksOnHit,
  breaksOnImpact,
  breaksOnTrigger,
  createBreakState,
  trackHeight,
} from '../../src/physics/break-rules';

const impact: BreakRule = { kind: 'impact', minImpulse: 3 };
const hits: BreakRule = { kind: 'hits', count: 3 };
const fall: BreakRule = { kind: 'fall', minHeightM: 0.5 };
const trigger: BreakRule = { kind: 'trigger', triggerId: 'pull_cloth' };

describe('impact rule', () => {
  it('breaks when the collision impulse reaches the minimum', () => {
    const state = createBreakState(1);
    expect(breaksOnImpact(impact, state, 2.99, 1)).toBe(false);
    expect(breaksOnImpact(impact, state, 3, 1)).toBe(true);
    expect(breaksOnImpact(impact, state, 10, 1)).toBe(true);
  });

  it('ignores how far the object fell', () => {
    const state = createBreakState(5);
    expect(breaksOnImpact(impact, state, 1, 0)).toBe(false);
  });

  it('does not break from a few swats, or from triggers', () => {
    const state = createBreakState(1);
    for (let swat = 0; swat < 3; swat++) expect(breaksOnHit(impact, state, 'light')).toBe(false);
    expect(breaksOnTrigger(impact, 'pull_cloth')).toBe(false);
  });
});

describe('hits rule', () => {
  it('breaks on the Nth swat, not before', () => {
    const state = createBreakState(1);
    expect(breaksOnHit(hits, state, 'light')).toBe(false);
    expect(breaksOnHit(hits, state, 'light')).toBe(false);
    expect(breaksOnHit(hits, state, 'light')).toBe(true);
  });

  it('a count of 1 breaks on the first swat', () => {
    expect(breaksOnHit({ kind: 'hits', count: 1 }, createBreakState(0), 'light')).toBe(true);
  });

  it('counts swats per object', () => {
    const first = createBreakState(1);
    const second = createBreakState(1);
    breaksOnHit(hits, first, 'light');
    breaksOnHit(hits, first, 'light');
    expect(breaksOnHit(hits, second, 'light')).toBe(false);
    expect(first.hits).toBe(2);
    expect(second.hits).toBe(1);
  });

  it('does not break from collisions, however hard', () => {
    const state = createBreakState(3);
    expect(breaksOnImpact(hits, state, 1000, 0)).toBe(false);
  });
});

describe('fall rule', () => {
  it('breaks when it lands at least the minimum height below where it rested', () => {
    const state = createBreakState(0.8);
    trackHeight(state, 0.8, true);
    trackHeight(state, 0.5, false);
    expect(breaksOnImpact(fall, state, 0.1, 0.31)).toBe(false); // fell 0.49 m
    expect(breaksOnImpact(fall, state, 0.1, 0.3)).toBe(true); // fell 0.5 m
  });

  it('does not depend on the impulse', () => {
    const state = createBreakState(2);
    expect(breaksOnImpact(fall, state, 0, 0)).toBe(true);
    expect(breaksOnImpact(fall, createBreakState(0.2), 1000, 0)).toBe(false);
  });

  it('measures from the highest point when the object is knocked upward first', () => {
    const state = createBreakState(0.3);
    trackHeight(state, 0.3, true);
    trackHeight(state, 0.7, false);
    trackHeight(state, 0.9, false);
    trackHeight(state, 0.6, false);
    expect(state.peakY).toBe(0.9);
    expect(breaksOnImpact(fall, state, 1, 0.35)).toBe(true); // 0.55 m below the peak
  });

  it('restarts the measurement once the object rests again', () => {
    const state = createBreakState(0.75);
    trackHeight(state, 0.4, false); // slid down to a lower surface
    expect(breaksOnImpact(fall, state, 1, 0.4)).toBe(false); // 0.35 m, survives
    trackHeight(state, 0.4, true); // comes to rest there
    expect(state.peakY).toBe(0.4);
    trackHeight(state, 0.2, false);
    expect(breaksOnImpact(fall, state, 1, 0)).toBe(false); // only 0.4 m from the new rest
  });

  it('keeps the peak across a bounce that does not rest', () => {
    const state = createBreakState(0.6);
    trackHeight(state, 0.3, false);
    expect(breaksOnImpact(fall, state, 1, 0.3)).toBe(false); // first contact, 0.3 m
    trackHeight(state, 0.35, false); // bounces without resting
    trackHeight(state, 0.05, false);
    expect(breaksOnImpact(fall, state, 1, 0.05)).toBe(true); // 0.55 m in total
  });

  it('a resting object touched by something else does not break', () => {
    const state = createBreakState(0.75);
    trackHeight(state, 0.75, true);
    expect(breaksOnImpact(fall, state, 50, 0.75)).toBe(false);
  });

  it('does not break from a few swats', () => {
    const state = createBreakState(1);
    for (let swat = 0; swat < 3; swat++) expect(breaksOnHit(fall, state, 'light')).toBe(false);
  });
});

describe('trigger rule', () => {
  it('breaks only on its own trigger id', () => {
    expect(breaksOnTrigger(trigger, 'pull_cloth')).toBe(true);
    expect(breaksOnTrigger(trigger, 'pull_cable')).toBe(false);
    expect(breaksOnTrigger(trigger, '')).toBe(false);
  });

  it('does not break from a few swats, or from collisions', () => {
    const state = createBreakState(2);
    for (let swat = 0; swat < 3; swat++) expect(breaksOnHit(trigger, state, 'light')).toBe(false);
    expect(breaksOnImpact(trigger, state, 1000, 0)).toBe(false);
  });
});

describe('wearing out', () => {
  it('any object breaks after enough swats, whatever its rule', () => {
    for (const rule of [impact, fall, trigger, { kind: 'hits', count: 99 } as BreakRule]) {
      const state = createBreakState(1);
      for (let swat = 1; swat < WEAR_OUT_HITS.medium; swat++) {
        expect(breaksOnHit(rule, state, 'medium'), `${rule.kind} swat ${swat}`).toBe(false);
      }
      expect(breaksOnHit(rule, state, 'medium'), rule.kind).toBe(true);
    }
  });

  it('takes more swats for pricier tiers', () => {
    const { light, medium, heavy, trick, treasure } = WEAR_OUT_HITS;
    expect(light).toBeLessThan(medium);
    expect(medium).toBeLessThan(heavy);
    expect(heavy).toBeLessThanOrEqual(trick);
    expect(trick).toBeLessThan(treasure);
  });

  it('a hits rule with a lower count still breaks at its own count', () => {
    const state = createBreakState(1);
    expect(breaksOnHit({ kind: 'hits', count: 2 }, state, 'treasure')).toBe(false);
    expect(breaksOnHit({ kind: 'hits', count: 2 }, state, 'treasure')).toBe(true);
  });
});

describe('direct blows', () => {
  it('a blow at least as hard as the impact threshold breaks a heavy impact object', () => {
    const jar: BreakRule = { kind: 'impact', minImpulse: 17 };
    expect(breaksOnBlow(jar, 16.9)).toBe(false);
    expect(breaksOnBlow(jar, 17)).toBe(true);
  });

  it('swat-sized blows never break impact objects, however fragile', () => {
    const cup: BreakRule = { kind: 'impact', minImpulse: 0.6 };
    expect(breaksOnBlow(cup, 0.64)).toBe(false);
    expect(breaksOnBlow(cup, 6)).toBe(false);
    expect(breaksOnBlow(cup, DIRECT_BLOW_MIN)).toBe(true);
  });

  it('only applies to the impact rule', () => {
    expect(breaksOnBlow(hits, 100)).toBe(false);
    expect(breaksOnBlow(fall, 100)).toBe(false);
    expect(breaksOnBlow(trigger, 100)).toBe(false);
  });
});
