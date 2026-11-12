// Room kit, data side: rooms and props are described as lists of simple colored parts. This
// file is free of Babylon so layouts can be checked in unit tests. Units are meters.

export type Color = readonly [r: number, g: number, b: number];
export type Triple = readonly [x: number, y: number, z: number];

export interface Part {
  shape: 'box' | 'cyl' | 'ball';
  /** box: width, height, depth. cyl: bottom diameter, height, top diameter. ball: diameter x3. */
  size: Triple;
  /** Center of the part's base (its lowest point when not rotated). */
  at: Triple;
  /** Rotation about the part's own center, radians. */
  rot: Triple;
  color: Color;
  /** Sides of a cylinder; fewer looks chunkier. */
  sides: number;
}

const ORIGIN: Triple = [0, 0, 0];

export function box(
  width: number,
  height: number,
  depth: number,
  color: Color,
  at: Triple = ORIGIN,
  rot: Triple = ORIGIN,
): Part {
  return { shape: 'box', size: [width, height, depth], at, rot, color, sides: 4 };
}

/** A cylinder; pass `top` for a cone (0) or a tapered shape such as a cup or a lampshade. */
export function cyl(
  diameter: number,
  height: number,
  color: Color,
  at: Triple = ORIGIN,
  options: { top?: number; sides?: number; rot?: Triple } = {},
): Part {
  return {
    shape: 'cyl',
    size: [diameter, height, options.top ?? diameter],
    at,
    rot: options.rot ?? ORIGIN,
    color,
    sides: options.sides ?? 10,
  };
}

export function ball(diameter: number, color: Color, at: Triple = ORIGIN): Part {
  return { shape: 'ball', size: [diameter, diameter, diameter], at, rot: ORIGIN, color, sides: 8 };
}

/** Moves parts to `at` and turns them about the vertical axis by `rotY` radians. */
export function place(parts: readonly Part[], at: Triple, rotY = 0): Part[] {
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  return parts.map((part) => {
    const [x, y, z] = part.at;
    return {
      ...part,
      at: [at[0] + x * cos + z * sin, at[1] + y, at[2] - x * sin + z * cos],
      rot: [part.rot[0], part.rot[1] + rotY, part.rot[2]],
    };
  });
}

export type MarkerName = 'cat_spawn' | 'camera_bounds' | 'owner_door' | `trigger:${string}`;

/** A breakable in a room: which ObjectDef it is and where it stands (base center). */
export interface Placement {
  def: string;
  at: Triple;
  rotY?: number;
}

export interface RoomLayout {
  /** Static geometry: shell and furniture. Merged into one mesh with one collider. */
  statics: Part[];
  objects: Placement[];
  markers: { marker: MarkerName; at: Triple; scale?: Triple }[];
}

/** `count` placements in a row starting at `from`, each `step` further along. */
export function row(
  def: string,
  count: number,
  from: Triple,
  step: Triple,
  rotY?: number,
): Placement[] {
  return Array.from({ length: count }, (_, index) => ({
    def,
    at: [from[0] + step[0] * index, from[1] + step[1] * index, from[2] + step[2] * index],
    rotY,
  }));
}
