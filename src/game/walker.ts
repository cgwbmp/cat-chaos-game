// Walker behavior, logic side: an NPC that patrols a loop of waypoints (the Pop Star Dorm
// manager) and catches the cat when it comes close in front of it. Free of rendering.
import type { Vec3 } from '../core/types';

export const CATCH_RADIUS = 1.1; // m, in front of the walker
export const CATCH_CONE_COS = Math.cos((60 * Math.PI) / 180);
export const TOUCH_RADIUS = 0.45; // m, any direction
export const CATCH_HEIGHT = 1.2; // the cat is safe on high shelves
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

/** True when the walker catches a cat at `cat`: close in front of it, or touching it. */
export function catches(walker: WalkerPose, cat: Vec3): boolean {
  if (Math.abs(cat.y - walker.position.y) > CATCH_HEIGHT) return false;
  const dx = cat.x - walker.position.x;
  const dz = cat.z - walker.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= TOUCH_RADIUS) return true;
  if (distance > CATCH_RADIUS) return false;
  return (dx * walker.heading.x + dz * walker.heading.z) / distance >= CATCH_CONE_COS;
}
