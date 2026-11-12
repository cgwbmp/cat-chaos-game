// Virtual joystick math, free of the DOM so it can be unit tested.

export interface StickVector {
  x: number; // right
  y: number; // forward (screen up)
}

/**
 * Converts a finger offset from the stick center (pixels, screen y pointing down) into a move
 * vector of length 0..1. Offsets inside the dead zone give no movement; from its edge the length
 * grows linearly and reaches 1 at `radius`.
 */
export function stickVector(dx: number, dy: number, radius: number, deadZone = 0.15): StickVector {
  const distance = Math.hypot(dx, dy);
  const tilt = Math.min(distance / radius, 1);
  if (distance === 0 || tilt <= deadZone) return { x: 0, y: 0 };
  const length = (tilt - deadZone) / (1 - deadZone);
  return { x: (dx / distance) * length, y: (-dy / distance) * length };
}

/** Where to draw the knob: the finger offset, kept inside the stick's radius. */
export function clampToRadius(dx: number, dy: number, radius: number): { dx: number; dy: number } {
  const distance = Math.hypot(dx, dy);
  if (distance <= radius) return { dx, dy };
  return { dx: (dx / distance) * radius, dy: (dy / distance) * radius };
}
