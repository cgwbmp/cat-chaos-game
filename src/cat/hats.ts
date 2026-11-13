// Hat models: one shape per hat of the cosmetics catalog, built in code from a few flat-shaded
// colored parts, like the props of the rooms. The hat's catalog color is its main color.
//
// Units: a hat stands on y = 0, the top of the head, and its front is +z. A plain cap is about
// 1 wide; HAT_SCALE of those fit the diameter of the cat's hat anchor (model.ts scales the hat to
// the anchor).
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';

type Rgb = readonly [r: number, g: number, b: number];
type Triple = readonly [x: number, y: number, z: number];

export interface HatPart {
  shape: 'box' | 'cyl' | 'ball';
  /** box: width, height, depth. cyl: bottom diameter, height, top diameter. ball: diameter x3. */
  size: Triple;
  /** Center of the part's base (its lowest point when not rotated). */
  at: Triple;
  /** Rotation about the part's own center, radians. */
  rot: Triple;
  color: Rgb;
  /** Sides of a cylinder. */
  sides: number;
}

/** Fills the space between the ears, so the hat still reads from the game camera. */
const HAT_SCALE = 1.4;

const ORIGIN: Triple = [0, 0, 0];
const WHITE: Rgb = [0.98, 0.97, 0.93];
const YELLOW: Rgb = [1, 0.86, 0.45];
const MINT: Rgb = [0.5, 0.86, 0.74];
const RUBY: Rgb = [0.88, 0.27, 0.36];
const SAPPHIRE: Rgb = [0.36, 0.56, 0.95];

function box(size: Triple, color: Rgb, at: Triple = ORIGIN, rot: Triple = ORIGIN): HatPart {
  return { shape: 'box', size, at, rot, color, sides: 4 };
}

/** A cylinder; pass `top` for a cone (0) or a tapered shape. */
function cyl(
  diameter: number,
  height: number,
  color: Rgb,
  at: Triple = ORIGIN,
  options: { top?: number; sides?: number; rot?: Triple } = {},
): HatPart {
  return {
    shape: 'cyl',
    size: [diameter, height, options.top ?? diameter],
    at,
    rot: options.rot ?? ORIGIN,
    color,
    sides: options.sides ?? 8,
  };
}

function ball(diameter: number, color: Rgb, at: Triple = ORIGIN): HatPart {
  return { shape: 'ball', size: [diameter, diameter, diameter], at, rot: ORIGIN, color, sides: 8 };
}

/** The color darker (`amount` below 1) or lighter (above 1). */
function shade([r, g, b]: Rgb, amount: number): Rgb {
  return [Math.min(1, r * amount), Math.min(1, g * amount), Math.min(1, b * amount)];
}

/** A point on a circle around the hat's axis; angle 0 is the front. */
function around(radius: number, angle: number, y: number): Triple {
  return [Math.sin(angle) * radius, y, Math.cos(angle) * radius];
}

const TURN = Math.PI * 2;
/** Turns an 8-sided cylinder so that a flat side, not an edge, is in front. */
const FLAT_FRONT: Triple = [0, Math.PI / 8, 0];

/** The plain cone every hat used to be; stands in for a hat that has no design yet. */
function cone(color: Rgb): HatPart[] {
  return [cyl(1, 1.1, color, ORIGIN, { top: 0 })];
}

const DESIGNS: Record<string, (color: Rgb) => HatPart[]> = {
  /** A striped cone with a rim and a pompom. */
  hat_party: (color) => [
    cyl(1, 1.15, color, ORIGIN, { top: 0 }),
    cyl(1.1, 0.1, WHITE),
    // Stripes: slices of the cone, a little wider than it.
    cyl(0.71, 0.18, YELLOW, [0, 0.38, 0], { top: 0.55 }),
    cyl(0.4, 0.14, MINT, [0, 0.74, 0], { top: 0.27 }),
    ball(0.3, WHITE, [0, 1.02, 0]),
  ],

  /** A band with five points, a jewel on each side of the front and a velvet cap inside. */
  hat_crown: (color) => [
    cyl(1, 0.32, color, ORIGIN, { top: 1.08 }),
    cyl(0.8, 0.44, RUBY, ORIGIN, { top: 0.6 }),
    ...[0, 1, 2, 3, 4].flatMap((index) => {
      const angle = (index / 5) * TURN;
      return [
        cyl(0.32, 0.36, color, around(0.38, angle, 0.3), { top: 0, sides: 4, rot: [0, angle, 0] }),
        ball(0.13, shade(color, 1.1), around(0.38, angle, 0.6)),
      ];
    }),
    ball(0.17, RUBY, around(0.5, 0, 0.08)),
    ball(0.15, SAPPHIRE, around(0.5, TURN / 8, 0.09)),
    ball(0.15, SAPPHIRE, around(0.5, -TURN / 8, 0.09)),
  ],

  /** A uniform cap: round crown, white front panel and a visor. */
  hat_cap: (color) => [
    cyl(1.12, 0.3, color, ORIGIN, { rot: FLAT_FRONT }),
    cyl(1.12, 0.22, color, [0, 0.3, 0], { top: 0.7, rot: FLAT_FRONT }),
    ball(0.14, shade(color, 0.75), [0, 0.47, 0]),
    box([0.46, 0.24, 0.05], WHITE, [0, 0.04, 0.5]),
    cyl(0.95, 0.06, shade(color, 0.75), [0, 0.01, 0.52], { rot: [0.1, Math.PI / 8, 0] }),
  ],

  /** A wide flat cap slouching to one side, with a stalk. */
  hat_beret: (color) => [
    cyl(0.85, 0.14, shade(color, 0.75)),
    cyl(1.4, 0.14, color, [0.14, 0.1, 0], { top: 1.5, rot: [0, 0, -0.12] }),
    cyl(1.5, 0.16, color, [0.16, 0.24, 0], { top: 1, rot: [0, 0, -0.12] }),
    cyl(0.09, 0.14, shade(color, 0.75), [0.2, 0.38, 0], { sides: 5 }),
  ],

  /** A knit cap: folded cuff, dome and a pompom. */
  hat_bonnet: (color) => [
    cyl(1.22, 0.24, shade(color, 1.08)),
    cyl(1.12, 0.3, color, [0, 0.22, 0], { top: 1 }),
    cyl(1, 0.24, color, [0, 0.52, 0], { top: 0.6 }),
    ball(0.42, WHITE, [0, 0.7, 0]),
  ],

  /** A gat, the Korean scholar's hat: a very wide thin brim under a small tapered crown. */
  hat_scholar: (color) => [
    cyl(2.1, 0.04, color, [0, 0.12, 0], { sides: 12 }),
    cyl(0.84, 0.6, color, [0, 0.12, 0], { top: 0.62, sides: 10 }),
    cyl(0.87, 0.05, shade(color, 0.6), [0, 0.16, 0], { top: 0.86, sides: 10 }),
  ],

  /** A bathhouse towel folded into a "sheep head": a wrap with a round roll at each ear. */
  hat_towel: (color) => [
    cyl(1.15, 0.34, color, ORIGIN, { top: 0.9 }),
    cyl(1.17, 0.07, MINT, [0, 0.05, 0], { top: 1.12 }),
    // The rolls show their round ends to the front, each with the spiral's turns.
    ...[-1, 1].flatMap((side) => {
      const roll = (diameter: number, length: number, tone: Rgb) =>
        cyl(diameter, length, tone, [side * 0.68, 0.18 - length / 2, 0.18], {
          rot: [Math.PI / 2, 0, 0],
        });
      return [
        roll(0.52, 0.44, color),
        roll(0.3, 0.46, shade(color, 0.84)),
        roll(0.12, 0.48, color),
      ];
    }),
  ],
};

/** The parts of the hat with this cosmetic id, in its catalog color. */
export function hatParts(id: string, color: Rgb): HatPart[] {
  return (DESIGNS[id] ?? cone)(color);
}

/** Hats that have their own design. */
export const HAT_DESIGNS: readonly string[] = Object.keys(DESIGNS);

function partMesh(part: HatPart, scene: Scene): Mesh {
  const [a, b, c] = part.size;
  let mesh: Mesh;
  if (part.shape === 'box') {
    mesh = CreateBox('part', { width: a, height: b, depth: c }, scene);
  } else if (part.shape === 'cyl') {
    mesh = CreateCylinder(
      'part',
      { diameterBottom: a, height: b, diameterTop: c, tessellation: part.sides },
      scene,
    );
    mesh.convertToFlatShadedMesh();
  } else {
    mesh = CreateSphere('part', { diameter: a, segments: 3 }, scene);
    mesh.convertToFlatShadedMesh();
  }
  mesh.position.set(part.at[0], part.at[1] + b / 2, part.at[2]);
  mesh.rotation.set(...part.rot);

  const [red, green, blue] = part.color;
  const colors = new Float32Array(mesh.getTotalVertices() * 4);
  for (let index = 0; index < colors.length; index += 4) {
    colors.set([red, green, blue, 1], index);
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, colors);
  return mesh;
}

/** Builds the hat as one mesh that carries its colors on the vertices; the caller gives the material. */
export function buildHat(id: string, color: Rgb, scene: Scene): Mesh {
  const merged = Mesh.MergeMeshes(
    hatParts(id, color).map((part) => partMesh(part, scene)),
    true,
    true,
  );
  if (!merged) throw new Error(`Could not build the hat '${id}': it has no parts`);
  merged.name = `cat-${id}`;
  merged.scaling.setAll(HAT_SCALE);
  merged.bakeCurrentTransformIntoVertices();
  return merged;
}
