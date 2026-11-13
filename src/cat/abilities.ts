// Ability math, free of Babylon so it can be unit tested.
import type { Vec3 } from '../core/types';
import {
  HEAD_LEAN,
  HEAD_LEAN_SPEED,
  POUNCE_BASE_IMPULSE,
  POUNCE_HEIGHT,
  POUNCE_IMPULSE_PER_SPEED,
  POUNCE_RADIUS,
  POUNCE_SPEED,
  RUN_SPEED,
  RUN_TILT,
  SWAT_CLOSE,
  SWAT_CONE_COS,
  SWAT_HEIGHT,
  SWAT_MAX_IMPULSE,
  SWAT_RADIUS,
  SWAT_REACH,
  SWAT_SPEED,
  WALK_SPEED,
  ZOOMIES_MULTIPLIER,
} from './tuning';

/** Horizontal unit direction. */
export interface Heading {
  x: number;
  z: number;
}

function scaled(x: number, y: number, z: number, length: number): Vec3 {
  const current = Math.hypot(x, y, z);
  return { x: (x / current) * length, y: (y / current) * length, z: (z / current) * length };
}

/** Ground speed for a stick tilt of 0..1: walk up to RUN_TILT, then blend up to a run. */
export function moveSpeed(tilt: number, zoomies: boolean): number {
  const clamped = Math.min(Math.max(tilt, 0), 1);
  const base =
    clamped <= RUN_TILT
      ? WALK_SPEED * (clamped / RUN_TILT)
      : WALK_SPEED + (RUN_SPEED - WALK_SPEED) * ((clamped - RUN_TILT) / (1 - RUN_TILT));
  return zoomies ? base * ZOOMIES_MULTIPLIER : base;
}

/** Turns `yaw` toward `target` by at most `maxStep` radians, the short way round. */
export function turnTowards(yaw: number, target: number, maxStep: number): number {
  let delta = (target - yaw) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return Math.abs(delta) <= maxStep ? target : yaw + Math.sign(delta) * maxStep;
}

/**
 * The capsule's lean over the head after `dt` seconds. In the air the capsule is upright, or the
 * head would catch the underside of a table the cat jumps onto from close by. On the ground the
 * lean comes back gradually, which moves a cat that landed with its head in a wall out of it.
 */
export function headLean(lean: number, grounded: boolean, dt: number): number {
  return grounded ? Math.min(HEAD_LEAN, lean + HEAD_LEAN_SPEED * dt) : 0;
}

/** An axis-aligned box in world space. */
export interface Box {
  min: Vec3;
  max: Vec3;
}

/**
 * Invisible walls and ceiling: moves `position` back inside `box` and stops `velocity` from
 * pushing further out. The box has no bottom; the room's floor is real. Both vectors are changed
 * in place. Returns true when the position was outside.
 */
export function confine(position: Vec3, velocity: Vec3, box: Box): boolean {
  let outside = false;
  for (const axis of ['x', 'z'] as const) {
    if (position[axis] < box.min[axis]) {
      position[axis] = box.min[axis];
      velocity[axis] = Math.max(velocity[axis], 0);
      outside = true;
    } else if (position[axis] > box.max[axis]) {
      position[axis] = box.max[axis];
      velocity[axis] = Math.min(velocity[axis], 0);
      outside = true;
    }
  }
  if (position.y > box.max.y) {
    position.y = box.max.y;
    velocity.y = Math.min(velocity.y, 0);
    outside = true;
  }
  return outside;
}

/** An object as the cat's abilities see it: its center and half of its height. */
export interface Target {
  position: Vec3;
  halfHeight: number;
}

/** True when the object's height range comes within `reach` of height `y`. */
function withinHeight(target: Target, y: number, reach: number): boolean {
  return Math.abs(target.position.y - y) <= reach + target.halfHeight;
}

/**
 * Impulse a swat gives an object, or undefined when the object is out of reach: outside the
 * swat area in front of the cat, outside the forward cone, or wholly above or below the cat
 * (a tall lamp next to the cat is hit, a cup on a shelf overhead is not).
 * Objects fly forward and slightly up; heavy ones get the same capped impulse, so they move less.
 */
export function swatImpulse(
  cat: Vec3,
  facing: Heading,
  { position: target, halfHeight }: Target,
  massKg: number,
): Vec3 | undefined {
  if (!withinHeight({ position: target, halfHeight }, cat.y, SWAT_HEIGHT)) return undefined;
  const reachX = target.x - (cat.x + facing.x * SWAT_REACH);
  const reachZ = target.z - (cat.z + facing.z * SWAT_REACH);
  if (Math.hypot(reachX, reachZ) > SWAT_RADIUS) return undefined;
  let x = target.x - cat.x;
  let z = target.z - cat.z;
  const distance = Math.hypot(x, z);
  if (distance > 0) {
    x /= distance;
    z /= distance;
  } else {
    x = facing.x;
    z = facing.z;
  }
  if (distance > SWAT_CLOSE && x * facing.x + z * facing.z < SWAT_CONE_COS) return undefined;

  const strength = Math.min(massKg * SWAT_SPEED, SWAT_MAX_IMPULSE);
  return scaled((x + facing.x) / 2, 0.3, (z + facing.z) / 2, strength);
}

/**
 * Impulse a pounce landing gives a nearby object (away from the cat and up), or undefined when
 * the object is too far to the side or on another level.
 */
export function pounceImpulse(
  feet: Vec3,
  { position: target, halfHeight }: Target,
  massKg: number,
  landingSpeed: number,
): Vec3 | undefined {
  let x = target.x - feet.x;
  let z = target.z - feet.z;
  const distance = Math.hypot(x, z);
  if (distance > POUNCE_RADIUS) return undefined;
  if (!withinHeight({ position: target, halfHeight }, feet.y, POUNCE_HEIGHT)) return undefined;
  if (distance > 0) {
    x /= distance;
    z /= distance;
  }
  const cap = POUNCE_BASE_IMPULSE + POUNCE_IMPULSE_PER_SPEED * landingSpeed;
  return scaled(x * 0.6, 0.8, z * 0.6, Math.min(massKg * POUNCE_SPEED, cap));
}
