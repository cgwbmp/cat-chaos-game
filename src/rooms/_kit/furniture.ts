// Static furniture and room shells for code-built rooms, as parts. Rooms are open toward -z
// (the camera side): a floor, a back wall at +z and side walls at -x and +x.
import type { Vec3 } from '../../core/types';
import { C } from './palette';
import { box, cyl, place, type Color, type Part, type RoomLayout, type Triple } from './parts';

export const WALL = 0.2; // wall and floor thickness

/** Floor centered on the origin with its top at y = 0, a back wall and two side walls. */
export function shell(
  width: number,
  depth: number,
  height: number,
  colors: { floor: Color; wall: Color; trim: Color },
): Part[] {
  const halfW = width / 2;
  const halfD = depth / 2;
  return [
    box(width + WALL * 2, WALL, depth + WALL, colors.floor, [0, -WALL, WALL / 2]),
    box(width + WALL * 2, height, WALL, colors.wall, [0, 0, halfD + WALL / 2]),
    box(WALL, height, depth, colors.wall, [-halfW - WALL / 2, 0, 0]),
    box(WALL, height, depth, colors.wall, [halfW + WALL / 2, 0, 0]),
    // Baseboards.
    box(width, 0.12, 0.03, colors.trim, [0, 0, halfD - 0.015]),
    box(0.03, 0.12, depth, colors.trim, [-halfW + 0.015, 0, 0]),
    box(0.03, 0.12, depth, colors.trim, [halfW - 0.015, 0, 0]),
  ];
}

/**
 * Marker for a `shell` of the same size: the cat cannot leave this box, so it is the room's
 * invisible front wall and ceiling. Objects still fall out of the open side.
 */
export function roomZone(
  width: number,
  depth: number,
  height: number,
): RoomLayout['markers'][number] {
  return { marker: 'trigger:zone_room', at: [0, height / 2, 0], scale: [width, height, depth] };
}

/** An inner wall along x (a partition), with an optional doorway gap. */
export function partition(
  length: number,
  height: number,
  color: Color,
  at: Triple,
  door?: { offset: number; width: number },
): Part[] {
  if (!door) return [box(length, height, WALL, color, at)];
  const left = length / 2 + door.offset - door.width / 2;
  const right = length / 2 - door.offset - door.width / 2;
  return [
    box(left, height, WALL, color, [at[0] - length / 2 + left / 2, at[1], at[2]]),
    box(right, height, WALL, color, [at[0] + length / 2 - right / 2, at[1], at[2]]),
    box(door.width, height - 1.9, WALL, color, [at[0] + door.offset, at[1] + 1.9, at[2]]),
  ];
}

/** Table with four legs; `height` is the top surface. */
export function table(
  width: number,
  depth: number,
  height: number,
  top: Color,
  leg: Color = top,
): Part[] {
  const x = width / 2 - 0.06;
  const z = depth / 2 - 0.06;
  const legs = [
    [-x, -z],
    [x, -z],
    [-x, z],
    [x, z],
  ] as const;
  return [
    box(width, 0.06, depth, top, [0, height - 0.06, 0]),
    ...legs.map(([lx, lz]) => box(0.07, height - 0.06, 0.07, leg, [lx, 0, lz])),
  ];
}

/** Solid block with a top slab: counters, cabinets, the mini fridge, a bed base. */
export function block(
  width: number,
  height: number,
  depth: number,
  body: Color,
  top: Color = body,
): Part[] {
  return [
    box(width, height - 0.04, depth, body),
    box(width + 0.04, 0.04, depth + 0.04, top, [0, height - 0.04, 0]),
  ];
}

/**
 * Open shelf unit standing on the floor; `boards` are the heights of the shelf surfaces.
 * `width` runs along x and `depth` along z. For a unit on a side wall pass its length as
 * `depth` and set `sideWall`, which puts the end panels at the z ends.
 */
export function shelves(
  width: number,
  depth: number,
  boards: readonly number[],
  color: Color,
  sideWall = false,
): Part[] {
  const top = Math.max(...boards);
  const ends = sideWall
    ? [
        box(width, top, 0.05, color, [0, 0, -depth / 2 + 0.025]),
        box(width, top, 0.05, color, [0, 0, depth / 2 - 0.025]),
      ]
    : [
        box(0.05, top, depth, color, [-width / 2 + 0.025, 0, 0]),
        box(0.05, top, depth, color, [width / 2 - 0.025, 0, 0]),
      ];
  return [
    ...ends,
    ...boards.map((height) => box(width, 0.05, depth, color, [0, height - 0.05, 0])),
  ];
}

/** A single shelf board fixed to a wall, with two brackets. `at` is the top surface. */
export function wallShelf(width: number, depth: number, color: Color): Part[] {
  return [
    box(width, 0.05, depth, color, [0, -0.05, 0]),
    box(0.04, 0.14, depth * 0.8, C.gray, [-width / 2 + 0.15, -0.19, 0]),
    box(0.04, 0.14, depth * 0.8, C.gray, [width / 2 - 0.15, -0.19, 0]),
  ];
}

export function bed(width: number, length: number, blanket: Color): Part[] {
  return [
    box(width, 0.3, length, C.woodLight),
    box(width - 0.06, 0.14, length - 0.06, C.white, [0, 0.3, 0]),
    box(width - 0.04, 0.06, length * 0.6, blanket, [0, 0.42, -length * 0.18]),
    box(width * 0.7, 0.1, 0.36, C.white, [0, 0.44, length / 2 - 0.26]),
    box(width, 0.7, 0.08, C.woodLight, [0, 0, length / 2]),
  ];
}

export function sofa(width: number, color: Color): Part[] {
  return [
    box(width, 0.4, 0.8, color),
    box(width, 0.5, 0.2, color, [0, 0.4, 0.3]),
    box(0.18, 0.2, 0.8, color, [-width / 2 + 0.09, 0.4, 0]),
    box(0.18, 0.2, 0.8, color, [width / 2 - 0.09, 0.4, 0]),
  ];
}

export function rug(width: number, depth: number, color: Color, border: Color = C.white): Part[] {
  return [box(width, 0.012, depth, border), box(width - 0.2, 0.016, depth - 0.2, color)];
}

/** A window on the back wall; `at` is the bottom center, against the wall. */
export function windowFrame(width: number, height: number): Part[] {
  return [
    box(width, height, 0.04, C.white, [0, 0, -0.02]),
    box(width - 0.12, height - 0.12, 0.05, C.sky, [0, 0.06, -0.03]),
    box(0.04, height - 0.12, 0.06, C.white, [0, 0.06, -0.035]),
    box(width + 0.1, 0.05, 0.14, C.white, [0, -0.05, -0.07]),
  ];
}

/** A framed picture hung on the back wall; `at` is the bottom center, against the wall. */
export function wallArt(width: number, height: number, color: Color): Part[] {
  return [
    box(width, height, 0.03, C.wood, [0, 0, -0.015]),
    box(width - 0.08, height - 0.08, 0.035, color, [0, 0.04, -0.02]),
  ];
}

const SHADE_GLOW = 1.7;

/**
 * A lamp fixed to the back wall; `at` is the bottom center of its plate, against the wall. On a
 * side wall turn it with `place`: `-Math.PI / 2` on the left wall, `Math.PI / 2` on the right.
 */
export function wallLamp(shade: Color = C.lemon): Part[] {
  // Brighter than any light makes it, so the shade looks lit from inside in a dim room.
  const lit: Color = [shade[0] * SHADE_GLOW, shade[1] * SHADE_GLOW, shade[2] * SHADE_GLOW];
  return [
    box(0.16, 0.24, 0.03, C.woodDark, [0, 0, -0.015]),
    box(0.04, 0.04, 0.2, C.woodDark, [0, 0.16, -0.115]),
    cyl(0.3, 0.2, lit, [0, 0.08, -0.24], { top: 0.16, sides: 8 }),
  ];
}

const WALL_LAMP_LIGHT: Triple = [0, 0.04, -0.45]; // in front of the shade, so the shade is lit too

/** Where a `wallLamp` placed at `at` shines from, for `lighting.fixtures` in the room's index.ts. */
export function wallLampLight(at: Triple, rotY = 0): Vec3 {
  const [, y, z] = WALL_LAMP_LIGHT;
  return { x: at[0] + z * Math.sin(rotY), y: at[1] + y, z: at[2] + z * Math.cos(rotY) };
}

export function chair(color: Color): Part[] {
  return [...table(0.42, 0.42, 0.44, color), box(0.42, 0.44, 0.05, color, [0, 0.44, 0.19])];
}

export function stoolSeat(color: Color): Part[] {
  return [cyl(0.34, 0.06, color, [0, 0.42, 0]), cyl(0.06, 0.42, C.gray)];
}

/** A sunken bath: a rim around water. `at` is the center at floor level. */
export function bath(width: number, depth: number, rim: Color): Part[] {
  const t = 0.14;
  return [
    box(width, 0.34, t, rim, [0, 0, -depth / 2 + t / 2]),
    box(width, 0.34, t, rim, [0, 0, depth / 2 - t / 2]),
    box(t, 0.34, depth - t * 2, rim, [-width / 2 + t / 2, 0, 0]),
    box(t, 0.34, depth - t * 2, rim, [width / 2 - t / 2, 0, 0]),
    box(width - t * 2, 0.24, depth - t * 2, C.water),
  ];
}

export { place };
