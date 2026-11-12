// Animation state machine: picks which clip plays. Free of Babylon so it can be unit tested;
// model.ts plays the clip of the same name from cat.glb.

export type CatClip =
  'idle' | 'walk' | 'run' | 'jump' | 'land' | 'swat' | 'pounce' | 'loaf' | 'celebrate';

/** Clips that play once on request, then hand back to the state-driven clips. */
export type OneShot = 'land' | 'swat' | 'celebrate';

export const ONE_SHOT_SEC: Record<OneShot, number> = { land: 0.2, swat: 0.29, celebrate: 2 };
export const LOAF_AFTER_SEC = 8;
export const MOVING_SPEED = 0.15; // m/s
export const RUNNING_SPEED = 2.2; // m/s

export interface CatAnimInput {
  grounded: boolean;
  /** Horizontal speed, m/s. */
  speed: number;
  pouncing: boolean;
}

export interface CatAnimator {
  readonly clip: CatClip;
  /** Seconds the current clip has been playing. */
  readonly clipTime: number;
  play(oneShot: OneShot): void;
  update(dt: number, input: CatAnimInput): CatClip;
}

export function createCatAnimator(): CatAnimator {
  let clip: CatClip = 'idle';
  let clipTime = 0;
  let idleTime = 0;
  let oneShot: { clip: OneShot; remaining: number } | undefined;

  function pick({ grounded, speed, pouncing }: CatAnimInput): CatClip {
    if (pouncing) return 'pounce';
    // Landing only makes sense on the ground; moving off cuts a celebration short.
    if (oneShot?.clip === 'land' && !grounded) oneShot = undefined;
    if (oneShot?.clip === 'celebrate' && (!grounded || speed >= MOVING_SPEED)) oneShot = undefined;
    if (oneShot) return oneShot.clip;
    if (!grounded) return 'jump';
    if (speed >= RUNNING_SPEED) return 'run';
    if (speed >= MOVING_SPEED) return 'walk';
    return idleTime >= LOAF_AFTER_SEC ? 'loaf' : 'idle';
  }

  return {
    get clip() {
      return clip;
    },
    get clipTime() {
      return clipTime;
    },
    play(next) {
      oneShot = { clip: next, remaining: ONE_SHOT_SEC[next] };
      idleTime = 0;
    },
    update(dt, input) {
      if (oneShot) {
        oneShot.remaining -= dt;
        if (oneShot.remaining <= 0) oneShot = undefined;
      }
      const resting = input.grounded && input.speed < MOVING_SPEED && !input.pouncing && !oneShot;
      idleTime = resting ? idleTime + dt : 0;

      const next = pick(input);
      clipTime = next === clip ? clipTime + dt : 0;
      clip = next;
      return clip;
    },
  };
}
