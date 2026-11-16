// Walker behavior, logic side: an NPC that patrols a loop of waypoints (the Pop Star Dorm
// robot vacuum) and catches the cat when the two bump into each other. Free of rendering.
import type { Vec3 } from '../core/types';

/** The body is a low disc. */
export const BODY_RADIUS = 0.18;
export const BODY_HEIGHT = 0.14;
const CAT_RADIUS = 0.14; // the cat's capsule, see src/cat/tuning.ts
/** Distance from the walker's center to the cat's feet at which they touch, with some slack. */
export const TOUCH_RADIUS = BODY_RADIUS + CAT_RADIUS + 0.04;
/** The cat is bumped on every touch, but loses time at most once per CATCH_COOLDOWN_SEC. */
export const BUMP_COOLDOWN_SEC = 0.3;
export const CATCH_COOLDOWN_SEC = 3;
export const CATCH_PENALTY_SEC = 5;

export interface WalkerPose {
  position: Vec3;
  /** Direction the walker faces, as a horizontal unit vector. */
  heading: { x: number; z: number };
}

export interface Patrol {
  readonly pose: WalkerPose;
  /** Moves the walker along its loop. */
  advance(dt: number): WalkerPose;
}

/**
 * Walks from waypoint to waypoint at `speed` m/s, pausing `pauseSec` at each, and loops back to
 * the first. With fewer than two waypoints the walker stands still.
 */
export function createPatrol(waypoints: readonly Vec3[], speed: number, pauseSec = 0): Patrol {
  const first = waypoints[0] ?? { x: 0, y: 0, z: 0 };
  const pose: WalkerPose = { position: { ...first }, heading: { x: 0, z: 1 } };
  let next = 1 % Math.max(1, waypoints.length);
  let pause = 0;

  return {
    pose,
    advance(dt) {
      if (waypoints.length < 2 || speed <= 0) return pose;
      let time = dt;
      // A long frame can cross several waypoints.
      for (let guard = 0; time > 0 && guard < waypoints.length * 2 + 2; guard++) {
        if (pause > 0) {
          const waited = Math.min(pause, time);
          pause -= waited;
          time -= waited;
          continue;
        }
        const target = waypoints[next] ?? first;
        const dx = target.x - pose.position.x;
        const dz = target.z - pose.position.z;
        const distance = Math.hypot(dx, dz);
        if (distance > 1e-6) pose.heading = { x: dx / distance, z: dz / distance };
        const reach = speed * time;
        if (reach < distance) {
          pose.position.x += pose.heading.x * reach;
          pose.position.z += pose.heading.z * reach;
          time = 0;
        } else {
          pose.position.x = target.x;
          pose.position.z = target.z;
          pose.position.y = target.y;
          time -= distance / speed;
          next = (next + 1) % waypoints.length;
          pause = pauseSec;
        }
      }
      return pose;
    },
  };
}

/** How high above the body the cat's feet must be to jump over it without a bump. */
export const CLEARANCE = 0.05;

/**
 * True when the cat, with its feet at `cat`, touches the walker: bumps into its side from any
 * direction, or stands on it (the character steps onto low bodies). Jumping over it is safe.
 */
export function catches(walker: WalkerPose, cat: Vec3): boolean {
  const height = cat.y - walker.position.y;
  if (height < -BODY_HEIGHT || height > BODY_HEIGHT + CLEARANCE) return false;
  return Math.hypot(cat.x - walker.position.x, cat.z - walker.position.z) <= TOUCH_RADIUS;
}
