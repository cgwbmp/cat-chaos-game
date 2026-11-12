// Break rule logic, free of Havok so it can be unit tested. The service feeds it swats, collision
// impulses, heights and triggers; each function answers "does the object break now?".
import type { BreakRule, ObjectTier } from '../core/types';

export interface BreakState {
  /** Swats and pounces landed so far. */
  hits: number;
  /** Highest point since the object last rested, meters. */
  peakY: number;
}

export function createBreakState(y: number): BreakState {
  return { hits: 0, peakY: y };
}

/** Call every frame. A resting object restarts its fall measurement from where it lies. */
export function trackHeight(state: BreakState, y: number, resting: boolean): void {
  state.peakY = resting ? y : Math.max(state.peakY, y);
}

/**
 * Swats that break an object whatever its rule. Without this an object that ends up somewhere
 * its rule can no longer fire (a cup that rolled under a table, a shelf lying on the floor)
 * could never be broken, and Free Soul could not be finished. Pricier objects take more work.
 */
export const WEAR_OUT_HITS: Record<ObjectTier, number> = {
  light: 4,
  medium: 5,
  heavy: 8,
  trick: 8,
  treasure: 10,
};

/** A swat or pounce landed on the object. Counts the hit. */
export function breaksOnHit(rule: BreakRule, state: BreakState, tier: ObjectTier): boolean {
  state.hits++;
  if (rule.kind === 'hits' && state.hits >= rule.count) return true;
  return state.hits >= WEAR_OUT_HITS[tier];
}

/**
 * A blow this hard (N·s) or harder, applied directly, counts as an impact. Swats stay below it
 * (the cat caps them at 6 N·s), so only a pounce landing breaks an impact-rule object on the
 * spot; a hard pounce, from a height, breaks the heaviest ones.
 */
export const DIRECT_BLOW_MIN = 7;

/** An impulse of `impulse` N·s was applied directly to the object (swat or pounce). */
export function breaksOnBlow(rule: BreakRule, impulse: number): boolean {
  return rule.kind === 'impact' && impulse >= Math.max(rule.minImpulse, DIRECT_BLOW_MIN);
}

/** The object collided with `impulse` (N·s) while its center was at height `y`. */
export function breaksOnImpact(
  rule: BreakRule,
  state: BreakState,
  impulse: number,
  y: number,
): boolean {
  switch (rule.kind) {
    case 'impact':
      return impulse >= rule.minImpulse;
    case 'fall':
      return state.peakY - y >= rule.minHeightM;
    default:
      return false;
  }
}

export function breaksOnTrigger(rule: BreakRule, triggerId: string): boolean {
  return rule.kind === 'trigger' && rule.triggerId === triggerId;
}
