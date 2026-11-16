// Prop library for code-built rooms. An ObjectDef's `meshNode` names one of these; the builder
// turns the parts into the breakable's mesh. Every prop stands on its base at y = 0 and is
// slightly oversized and chunky, as the art rules ask.
//
// The first part is the prop's body: its color is the color of the shards. Details sit a few
// millimeters proud of the body, so the collider (the convex hull of the parts) stays the shape
// of the body; a surface that other objects stand on keeps its height.
import { C } from './palette';
import { ball, box, cyl, place, type Color, type Part, type Triple } from './parts';

const flat = Math.PI / 2;

/** A cylinder on its side, its axis along x or z; `center` is its middle. */
function disc(
  diameter: number,
  length: number,
  color: Color,
  center: Triple,
  axis: 'x' | 'z',
  sides?: number,
): Part {
  const at: Triple = [center[0], center[1] - length / 2, center[2]];
  return cyl(diameter, length, color, at, {
    rot: axis === 'x' ? [0, 0, flat] : [flat, 0, 0],
    sides,
  });
}

/** A closed book lying flat: the spine on its -z side, pages showing on the other three. */
function flatBook(width: number, depth: number, color: Color, at: Triple, rotY = 0): Part[] {
  return place(
    [
      box(width, 0.05, 0.012, color, [0, 0, -depth / 2 + 0.006]),
      box(width, 0.008, depth - 0.012, color, [0, 0, 0.006]),
      box(width, 0.008, depth - 0.012, color, [0, 0.042, 0.006]),
      box(width - 0.016, 0.034, depth - 0.02, C.paper, [0, 0.008, 0.002]),
    ],
    at,
    rotY,
  );
}

/** A frame around a `width` x `depth` slab 2 cm thick, level with it, so the top stays flat. */
function border(width: number, depth: number, band: number, color: Color): Part[] {
  const x = width / 2 + band / 2;
  const z = depth / 2 + band / 2;
  return [
    box(width + band * 2, 0.02, band, color, [0, 0, -z]),
    box(width + band * 2, 0.02, band, color, [0, 0, z]),
    box(band, 0.02, depth, color, [-x, 0, 0]),
    box(band, 0.02, depth, color, [x, 0, 0]),
  ];
}

/** Goods on one level of the `shelf_unit`; each box shows on both sides of the shelf. */
function goods(y: number, colors: readonly Color[]): Part[] {
  return colors.map((color, index) =>
    box(0.12, 0.2 + (index % 2) * 0.08, 0.31, color, [-0.3 + index * 0.15, y, 0]),
  );
}

/**
 * A hanging prop is placed with its base this far under a beam. Its cord ends 3 cm short of the
 * beam, so the prop does not start in contact with it.
 */
export const HANG_DROP = 0.9;

/** The cord of a hanging prop whose body is `body` tall. */
function cord(body: number, color: Color): Part {
  return cyl(0.014, HANG_DROP - 0.03 - body, color, [0, body, 0], { sides: 6 });
}

/** Book spines on one level of the `bookcase`, showing on both sides like `goods`. */
function spines(y: number, colors: readonly Color[]): Part[] {
  return colors.map((color, index) =>
    box(0.09, 0.26 + (index % 3) * 0.03, 0.31, color, [-0.34 + index * 0.097, y, 0]),
  );
}

export const PROPS: Record<string, Part[]> = {
  // --- Tableware -------------------------------------------------------------------------------
  cup: [
    cyl(0.08, 0.09, C.white, [0, 0, 0], { top: 0.1 }),
    cyl(0.08, 0.004, C.wood, [0, 0.088, 0]),
    box(0.03, 0.045, 0.016, C.white, [0.058, 0.025, 0]),
  ],
  mug: [
    cyl(0.1, 0.11, C.sky),
    box(0.03, 0.06, 0.02, C.sky, [0.06, 0.03, 0]),
    cyl(0.104, 0.025, C.white, [0, 0.035, 0]),
    cyl(0.08, 0.004, C.woodDark, [0, 0.108, 0]),
  ],
  glass: [
    cyl(0.07, 0.13, C.water, [0, 0, 0], { top: 0.09 }),
    cyl(0.0755, 0.07, C.lemon, [0, 0.01, 0], { top: 0.0863 }),
  ],
  plate: [
    cyl(0.24, 0.025, C.white, [0, 0, 0], { sides: 12 }),
    cyl(0.2, 0.004, C.sky, [0, 0.023, 0], { sides: 12 }),
    cyl(0.16, 0.004, C.white, [0, 0.026, 0], { sides: 12 }),
  ],
  plate_stack: [
    cyl(0.24, 0.1, C.white, [0, 0, 0], { sides: 12 }),
    cyl(0.2, 0.012, C.sky, [0, 0.1, 0], { sides: 12 }),
    cyl(0.246, 0.008, C.gray, [0, 0.03, 0], { sides: 12 }),
    cyl(0.246, 0.008, C.gray, [0, 0.064, 0], { sides: 12 }),
  ],
  bowl: [
    cyl(0.1, 0.08, C.celadon, [0, 0, 0], { top: 0.2 }),
    cyl(0.17, 0.004, C.white, [0, 0.078, 0]),
  ],
  bottle: [
    cyl(0.08, 0.17, C.leaf),
    cyl(0.08, 0.03, C.leaf, [0, 0.17, 0], { top: 0.035 }),
    cyl(0.035, 0.07, C.leaf, [0, 0.2, 0]),
    cyl(0.044, 0.02, C.cream, [0, 0.27, 0]),
    cyl(0.084, 0.06, C.cream, [0, 0.06, 0]),
  ],
  can: [
    cyl(0.07, 0.12, C.coral),
    cyl(0.074, 0.04, C.white, [0, 0.04, 0]),
    cyl(0.056, 0.004, C.gray, [0, 0.118, 0]),
  ],
  carton: [
    box(0.09, 0.19, 0.09, C.white),
    // The gable: a square bar turned on its edge, half of it inside the body.
    box(0.064, 0.064, 0.09, C.white, [0, 0.158, 0], [0, 0, Math.PI / 4]),
    box(0.012, 0.03, 0.09, C.sky, [0, 0.212, 0]),
    box(0.094, 0.06, 0.094, C.sky, [0, 0.05, 0]),
  ],
  kettle: [
    cyl(0.18, 0.2, C.gray, [0, 0, 0], { top: 0.13 }),
    cyl(0.1, 0.012, C.charcoal, [0, 0.2, 0]),
    box(0.03, 0.035, 0.02, C.charcoal, [0, 0.2, -0.05]),
    box(0.03, 0.035, 0.02, C.charcoal, [0, 0.2, 0.05]),
    box(0.03, 0.02, 0.12, C.charcoal, [0, 0.23, 0]),
    box(0.07, 0.03, 0.03, C.gray, [0.085, 0.12, 0], [0, 0, 0.6]),
  ],
  teapot: [
    ball(0.16, C.celadon),
    cyl(0.05, 0.03, C.celadon, [0, 0.15, 0]),
    box(0.09, 0.03, 0.03, C.celadon, [0.1, 0.08, 0]),
    box(0.025, 0.07, 0.025, C.celadon, [-0.085, 0.045, 0]),
    cyl(0.166, 0.012, C.white, [0, 0.074, 0]),
    ball(0.03, C.white, [0, 0.175, 0]),
    // A foot, so it stands level instead of resting on a facet of the ball.
    cyl(0.09, 0.014, C.celadon),
  ],
  pot: [
    cyl(0.24, 0.13, C.lemon),
    cyl(0.26, 0.02, C.gold, [0, 0.13, 0]),
    ball(0.05, C.charcoal, [0, 0.14, 0]),
    box(0.05, 0.02, 0.07, C.gold, [-0.14, 0.09, 0]),
    box(0.05, 0.02, 0.07, C.gold, [0.14, 0.09, 0]),
  ],
  hot_plate: [
    box(0.3, 0.05, 0.3, C.charcoal),
    cyl(0.22, 0.012, C.slate, [0, 0.05, 0], { sides: 12 }),
    box(0.03, 0.02, 0.01, C.coral, [-0.08, 0.015, -0.152]),
    box(0.03, 0.02, 0.01, C.gray, [0.08, 0.015, -0.152]),
  ],
  rice_cooker: [
    cyl(0.28, 0.2, C.white),
    cyl(0.26, 0.05, C.rose, [0, 0.2, 0], { top: 0.2 }),
    box(0.08, 0.05, 0.02, C.gray, [0, 0.06, -0.14]),
    box(0.03, 0.02, 0.008, C.coral, [0, 0.075, -0.152]),
    cyl(0.286, 0.014, C.gray, [0, 0.19, 0]),
    box(0.1, 0.02, 0.04, C.gray, [0, 0.25, 0]),
  ],
  tray: [
    box(0.4, 0.03, 0.28, C.wood),
    box(0.404, 0.042, 0.022, C.woodDark, [0, 0.003, -0.131]),
    box(0.404, 0.042, 0.022, C.woodDark, [0, 0.003, 0.131]),
    box(0.022, 0.042, 0.24, C.woodDark, [-0.191, 0.003, 0]),
    box(0.022, 0.042, 0.24, C.woodDark, [0.191, 0.003, 0]),
  ],
  cake: [
    cyl(0.2, 0.09, C.cream, [0, 0, 0], { sides: 12 }),
    cyl(0.2, 0.02, C.rose, [0, 0.09, 0], { sides: 12 }),
    ball(0.04, C.red, [0, 0.11, 0]),
    cyl(0.204, 0.014, C.rose, [0, 0.038, 0], { sides: 12 }),
    ball(0.035, C.white, [-0.065, 0.105, 0]),
    ball(0.035, C.white, [0.065, 0.105, 0]),
    ball(0.035, C.white, [0, 0.105, -0.065]),
    ball(0.035, C.white, [0, 0.105, 0.065]),
  ],
  cake_case: [
    box(0.6, 0.06, 0.4, C.white),
    box(0.56, 0.3, 0.36, C.water, [0, 0.06, 0]),
    cyl(0.18, 0.08, C.rose, [-0.14, 0.38, 0]),
    box(0.6, 0.03, 0.4, C.white, [0, 0.36, 0]),
    ball(0.04, C.red, [-0.14, 0.455, 0]),
    // Corner posts and a shelf, with a cake on each level showing through the glass.
    box(0.024, 0.3, 0.024, C.white, [-0.274, 0.06, -0.174]),
    box(0.024, 0.3, 0.024, C.white, [0.274, 0.06, -0.174]),
    box(0.024, 0.3, 0.024, C.white, [-0.274, 0.06, 0.174]),
    box(0.024, 0.3, 0.024, C.white, [0.274, 0.06, 0.174]),
    box(0.566, 0.012, 0.366, C.white, [0, 0.2, 0]),
    box(0.14, 0.06, 0.368, C.peach, [-0.1, 0.066, 0]),
    box(0.12, 0.07, 0.368, C.lemon, [0.12, 0.212, 0]),
  ],
  cup_tower: [
    cyl(0.08, 0.09, C.white, [0, 0, 0], { top: 0.1 }),
    cyl(0.08, 0.09, C.peach, [0, 0.09, 0], { top: 0.1 }),
    cyl(0.08, 0.09, C.white, [0, 0.18, 0], { top: 0.1 }),
    cyl(0.08, 0.09, C.mint, [0, 0.27, 0], { top: 0.1 }),
    cyl(0.08, 0.004, C.wood, [0, 0.358, 0]),
  ],
  espresso_machine: [
    box(0.4, 0.4, 0.34, C.coral),
    box(0.44, 0.05, 0.36, C.gray, [0, 0.4, 0]),
    box(0.3, 0.03, 0.2, C.gray, [0, 0.0, -0.22]),
    cyl(0.05, 0.12, C.gray, [-0.1, 0.2, -0.2]),
    cyl(0.05, 0.12, C.gray, [0.1, 0.2, -0.2]),
    // Brew head over the spouts, a cup under each, a pressure gauge and the steam knob.
    box(0.34, 0.07, 0.08, C.gray, [0, 0.3, -0.2]),
    cyl(0.05, 0.04, C.white, [-0.1, 0.03, -0.22], { top: 0.06 }),
    cyl(0.05, 0.04, C.white, [0.1, 0.03, -0.22], { top: 0.06 }),
    disc(0.08, 0.012, C.gold, [0, 0.13, -0.172], 'z'),
    disc(0.06, 0.018, C.white, [0, 0.13, -0.172], 'z'),
    box(0.03, 0.03, 0.05, C.charcoal, [0.215, 0.25, 0]),
    // Cups warming on top.
    cyl(0.07, 0.05, C.white, [-0.1, 0.45, 0.05], { top: 0.08 }),
    cyl(0.07, 0.05, C.white, [0.02, 0.45, 0.05], { top: 0.08 }),
  ],
  jar: [
    cyl(0.14, 0.2, C.clay, [0, 0, 0], { top: 0.18 }),
    cyl(0.14, 0.03, C.woodDark, [0, 0.2, 0]),
    cyl(0.162, 0.03, C.cream, [0, 0.085, 0], { top: 0.168 }),
    ball(0.04, C.woodDark, [0, 0.22, 0]),
  ],
  jar_big: [
    cyl(0.34, 0.24, C.clay, [0, 0, 0], { top: 0.56 }),
    cyl(0.56, 0.3, C.clay, [0, 0.24, 0], { top: 0.4 }),
    cyl(0.44, 0.05, C.woodDark, [0, 0.54, 0]),
    cyl(0.566, 0.024, C.woodDark, [0, 0.228, 0]),
    cyl(0.12, 0.035, C.woodDark, [0, 0.59, 0], { top: 0.08 }),
  ],
  jar_gold: [
    cyl(0.3, 0.2, C.gold, [0, 0, 0], { top: 0.48 }),
    cyl(0.48, 0.26, C.gold, [0, 0.2, 0], { top: 0.34 }),
    cyl(0.38, 0.05, C.clay, [0, 0.46, 0]),
    cyl(0.486, 0.02, C.clay, [0, 0.19, 0]),
    cyl(0.389, 0.015, C.clay, [0, 0.38, 0], { top: 0.381 }),
    cyl(0.1, 0.03, C.clay, [0, 0.51, 0], { top: 0.07 }),
  ],

  // --- Paper, books, boxes -----------------------------------------------------------------------
  /** Stands with its spine toward -z: two covers and the page block between them. */
  book: [
    box(0.05, 0.24, 0.012, C.coral, [0, 0, -0.079]),
    box(0.008, 0.24, 0.158, C.coral, [-0.021, 0, 0.006]),
    box(0.008, 0.24, 0.158, C.coral, [0.021, 0, 0.006]),
    box(0.034, 0.224, 0.15, C.paper, [0, 0.008, 0.002]),
    box(0.054, 0.04, 0.006, C.cream, [0, 0.15, -0.084]),
  ],
  book_stack: [
    ...flatBook(0.24, 0.17, C.sky, [0, 0, 0]),
    ...flatBook(0.22, 0.16, C.lemon, [0.01, 0.05, 0], Math.PI),
    ...flatBook(0.24, 0.17, C.rose, [-0.01, 0.1, 0.01], 0.12),
    ...flatBook(0.2, 0.15, C.mint, [0, 0.15, 0], Math.PI - 0.15),
  ],
  magazine_stack: [
    box(0.3, 0.06, 0.22, C.paper),
    box(0.3, 0.02, 0.22, C.rose, [0.01, 0.06, 0.01]),
    box(0.304, 0.008, 0.224, C.sky, [0, 0.016, 0]),
    box(0.304, 0.008, 0.224, C.lavender, [0, 0.038, 0]),
    box(0.22, 0.004, 0.03, C.white, [0.01, 0.08, 0.08]),
    box(0.18, 0.004, 0.11, C.sky, [0.01, 0.08, -0.015]),
  ],
  album: [
    box(0.03, 0.26, 0.26, C.lavender),
    box(0.036, 0.2, 0.2, C.rose, [0, 0.03, 0]),
    disc(0.09, 0.042, C.gold, [0, 0.15, 0], 'x', 8),
    box(0.042, 0.022, 0.14, C.white, [0, 0.05, 0]),
  ],
  album_stack: [
    box(0.27, 0.04, 0.27, C.lavender),
    box(0.27, 0.04, 0.27, C.rose, [0.01, 0.04, 0]),
    box(0.27, 0.04, 0.27, C.sky, [-0.01, 0.08, 0.01]),
    box(0.27, 0.04, 0.27, C.lemon, [0, 0.12, 0]),
    box(0.27, 0.04, 0.27, C.mint, [0.01, 0.16, 0]),
    box(0.2, 0.004, 0.2, C.lavender, [0.01, 0.2, 0]),
    cyl(0.09, 0.004, C.gold, [0.01, 0.204, 0], { sides: 8 }),
  ],
  snack_bag: [
    box(0.18, 0.24, 0.07, C.lemon),
    box(0.18, 0.03, 0.02, C.coral, [0, 0.24, 0]),
    box(0.184, 0.035, 0.074, C.coral, [0, 0.04, 0]),
    box(0.11, 0.08, 0.076, C.white, [0, 0.105, 0]),
  ],
  snack_box: [
    box(0.2, 0.12, 0.14, C.rose),
    box(0.204, 0.03, 0.144, C.white, [0, 0.07, 0]),
    box(0.08, 0.004, 0.06, C.lemon, [0, 0.12, 0]),
  ],
  noodle_cup: [
    cyl(0.09, 0.12, C.white, [0, 0, 0], { top: 0.12 }),
    cyl(0.125, 0.012, C.red, [0, 0.12, 0]),
    cyl(0.104, 0.04, C.red, [0, 0.04, 0], { top: 0.114 }),
    box(0.03, 0.006, 0.03, C.white, [0.07, 0.126, 0]),
  ],
  crate: [
    box(0.36, 0.3, 0.3, C.wood),
    box(0.38, 0.03, 0.32, C.woodDark, [0, 0.14, 0]),
    box(0.03, 0.296, 0.03, C.woodDark, [-0.175, 0.002, -0.145]),
    box(0.03, 0.296, 0.03, C.woodDark, [0.175, 0.002, -0.145]),
    box(0.03, 0.296, 0.03, C.woodDark, [-0.175, 0.002, 0.145]),
    box(0.03, 0.296, 0.03, C.woodDark, [0.175, 0.002, 0.145]),
    box(0.1, 0.03, 0.31, C.woodDark, [0, 0.22, 0]),
  ],
  basket: [
    cyl(0.26, 0.2, C.sand, [0, 0, 0], { top: 0.34 }),
    cyl(0.297, 0.03, C.wood, [0, 0.08, 0], { top: 0.309 }),
    cyl(0.348, 0.022, C.wood, [0, 0.182, 0]),
    cyl(0.3, 0.004, C.woodDark, [0, 0.203, 0]),
  ],
  tissue_box: [
    box(0.22, 0.09, 0.12, C.mint),
    box(0.06, 0.04, 0.02, C.white, [0, 0.09, 0]),
    box(0.12, 0.003, 0.05, C.teal, [0, 0.09, 0]),
    box(0.224, 0.02, 0.124, C.white, [0, 0.02, 0]),
  ],
  paper_door: [
    box(0.9, 1.7, 0.05, C.woodLight),
    box(0.78, 1.5, 0.06, C.paper, [0, 0.1, 0]),
    // Lattice over the paper, and a pull on the frame.
    box(0.02, 1.5, 0.07, C.woodLight, [-0.13, 0.1, 0]),
    box(0.02, 1.5, 0.07, C.woodLight, [0.13, 0.1, 0]),
    box(0.78, 0.02, 0.07, C.woodLight, [0, 0.465, 0]),
    box(0.78, 0.02, 0.07, C.woodLight, [0, 0.84, 0]),
    box(0.78, 0.02, 0.07, C.woodLight, [0, 1.215, 0]),
    box(0.03, 0.14, 0.058, C.woodDark, [-0.42, 0.8, 0]),
  ],
  scroll: [
    disc(0.05, 0.36, C.paper, [0, 0.035, 0], 'x'),
    disc(0.07, 0.03, C.woodDark, [-0.195, 0.035, 0], 'x'),
    disc(0.07, 0.03, C.woodDark, [0.195, 0.035, 0], 'x'),
    disc(0.056, 0.03, C.red, [0, 0.035, 0], 'x'),
  ],

  // --- Electronics -------------------------------------------------------------------------------
  monitor: [
    box(0.2, 0.02, 0.14, C.charcoal),
    box(0.05, 0.12, 0.03, C.charcoal, [0, 0.02, 0]),
    box(0.56, 0.34, 0.04, C.charcoal, [0, 0.13, 0]),
    box(0.5, 0.28, 0.01, C.sky, [0, 0.16, -0.022]),
    // Two windows on the screen and a power light on the bezel.
    box(0.24, 0.16, 0.01, C.white, [-0.1, 0.25, -0.026]),
    box(0.24, 0.03, 0.014, C.lavender, [-0.1, 0.38, -0.026]),
    box(0.16, 0.1, 0.01, C.mint, [0.14, 0.19, -0.026]),
    box(0.02, 0.01, 0.006, C.mint, [0.25, 0.14, -0.021]),
  ],
  keyboard: [
    box(0.4, 0.025, 0.14, C.white),
    box(0.36, 0.01, 0.028, C.gray, [0, 0.025, -0.037]),
    box(0.36, 0.01, 0.028, C.gray, [0, 0.025, 0]),
    box(0.36, 0.01, 0.028, C.gray, [0, 0.025, 0.037]),
    box(0.04, 0.012, 0.028, C.coral, [-0.16, 0.025, 0.037]),
  ],
  mouse: [
    box(0.06, 0.03, 0.1, C.white),
    box(0.064, 0.012, 0.05, C.gray, [0, 0.006, 0.015]),
    box(0.012, 0.008, 0.024, C.coral, [0, 0.028, -0.025]),
  ],
  /** The lid leans back from the rear edge, so the screen faces up toward the camera. */
  laptop: [
    box(0.34, 0.02, 0.24, C.gray),
    box(0.34, 0.22, 0.015, C.gray, [0, 0.02, 0.14], [0.25, 0, 0]),
    box(0.3, 0.18, 0.005, C.sky, [0, 0.0425, 0.1303], [0.25, 0, 0]),
    // A window on the tilted screen, the keys and the trackpad.
    box(0.14, 0.09, 0.005, C.white, [-0.06, 0.1076, 0.1323], [0.25, 0, 0]),
    box(0.28, 0.004, 0.1, C.charcoal, [0, 0.02, 0.035]),
    box(0.09, 0.004, 0.05, C.white, [0, 0.02, -0.07]),
  ],
  phone: [
    box(0.08, 0.015, 0.16, C.charcoal),
    box(0.07, 0.004, 0.14, C.sky, [0, 0.015, 0]),
    box(0.05, 0.004, 0.03, C.white, [0, 0.018, 0.035]),
    box(0.05, 0.004, 0.05, C.rose, [0, 0.018, -0.03]),
  ],
  speaker: [
    box(0.14, 0.22, 0.14, C.plum),
    disc(0.09, 0.01, C.lavender, [0, 0.075, -0.072], 'z', 12),
    disc(0.04, 0.014, C.plum, [0, 0.075, -0.073], 'z', 8),
    disc(0.05, 0.01, C.lavender, [0, 0.165, -0.072], 'z', 8),
  ],
  /** Stands on its ear cups: a band over two cups with soft pads on the inside. */
  headphones: [
    box(0.2, 0.025, 0.04, C.coral, [0, 0.2, 0]),
    box(0.025, 0.13, 0.04, C.coral, [-0.0875, 0.075, 0]),
    box(0.025, 0.13, 0.04, C.coral, [0.0875, 0.075, 0]),
    disc(0.09, 0.05, C.charcoal, [-0.085, 0.045, 0], 'x'),
    disc(0.09, 0.05, C.charcoal, [0.085, 0.045, 0], 'x'),
    disc(0.07, 0.016, C.cream, [-0.054, 0.045, 0], 'x'),
    disc(0.07, 0.016, C.cream, [0.054, 0.045, 0], 'x'),
  ],
  console: [
    box(0.3, 0.07, 0.22, C.white),
    box(0.1, 0.02, 0.06, C.sky, [0.07, 0.07, 0]),
    box(0.16, 0.01, 0.006, C.charcoal, [-0.04, 0.04, -0.11]),
    box(0.02, 0.012, 0.006, C.mint, [0.11, 0.039, -0.11]),
    box(0.018, 0.006, 0.018, C.coral, [0.09, 0.09, 0]),
    box(0.018, 0.006, 0.018, C.lemon, [0.05, 0.09, 0]),
  ],
  pc_tower: [
    box(0.2, 0.42, 0.4, C.charcoal),
    box(0.01, 0.3, 0.3, C.mint, [-0.1, 0.06, 0]),
    // Two fans behind the side window, a light strip and the power button on the front.
    disc(0.1, 0.004, C.lavender, [-0.106, 0.28, 0], 'x', 8),
    disc(0.1, 0.004, C.lavender, [-0.106, 0.14, 0], 'x', 8),
    box(0.012, 0.3, 0.006, C.mint, [0.06, 0.06, -0.2]),
    box(0.03, 0.03, 0.006, C.gray, [-0.04, 0.36, -0.2]),
  ],
  clock: [
    disc(0.14, 0.05, C.red, [0, 0.095, 0], 'z', 12),
    box(0.03, 0.03, 0.04, C.red, [-0.04, 0, 0]),
    box(0.03, 0.03, 0.04, C.red, [0.04, 0, 0]),
    // The face shows on both sides; hands on the front and two bells on top.
    disc(0.11, 0.056, C.white, [0, 0.095, 0], 'z', 12),
    box(0.01, 0.04, 0.004, C.charcoal, [0, 0.095, -0.03]),
    box(0.03, 0.01, 0.004, C.charcoal, [0.015, 0.09, -0.03]),
    ball(0.05, C.red, [-0.04, 0.14, 0]),
    ball(0.05, C.red, [0.04, 0.14, 0]),
  ],
  desk_lamp: [
    cyl(0.14, 0.02, C.charcoal),
    cyl(0.025, 0.3, C.charcoal, [0, 0.02, 0]),
    cyl(0.08, 0.1, C.lemon, [0, 0.3, 0], { top: 0.18 }),
    cyl(0.045, 0.02, C.gold, [0, 0.29, 0]),
    ball(0.03, C.coral, [0.04, 0.012, 0]),
  ],
  floor_lamp: [
    cyl(0.3, 0.04, C.woodDark),
    cyl(0.04, 1.2, C.woodDark, [0, 0.04, 0]),
    cyl(0.22, 0.26, C.peach, [0, 1.2, 0], { top: 0.36 }),
    cyl(0.366, 0.02, C.white, [0, 1.443, 0]),
    cyl(0.07, 0.03, C.gold, [0, 1.17, 0]),
    cyl(0.2, 0.02, C.wood, [0, 0.04, 0], { top: 0.08 }),
  ],
  lightstick: [
    cyl(0.035, 0.18, C.white),
    ball(0.1, C.rose, [0, 0.16, 0]),
    cyl(0.05, 0.02, C.lavender, [0, 0.15, 0]),
    cyl(0.042, 0.03, C.rose, [0, 0.03, 0]),
  ],
  mic: [
    cyl(0.16, 0.02, C.charcoal),
    cyl(0.02, 0.26, C.gray, [0, 0.02, 0]),
    ball(0.07, C.charcoal, [0, 0.27, 0]),
    cyl(0.035, 0.06, C.charcoal, [0, 0.21, 0]),
    cyl(0.076, 0.012, C.gray, [0, 0.299, 0]),
  ],
  /** A lit ring: the dark middle shows on both sides, with a phone held in front of it. */
  ring_light: [
    cyl(0.2, 0.02, C.charcoal),
    cyl(0.025, 0.5, C.charcoal, [0, 0.02, 0]),
    disc(0.3, 0.04, C.white, [0, 0.52, 0], 'z', 12),
    disc(0.2, 0.046, C.charcoal, [0, 0.52, 0], 'z', 12),
    box(0.05, 0.1, 0.012, C.sky, [0, 0.47, -0.028]),
  ],
  /** Runs along a whole desk row, under the monitors; one end sticks out to be pulled. */
  cable_bundle: [
    box(3.5, 0.03, 0.4, C.charcoal),
    box(0.14, 0.06, 0.44, C.coral, [-1.72, 0, 0]),
    // Ties between the monitors.
    box(0.03, 0.032, 0.404, C.gray, [-1, 0.002, 0]),
    box(0.03, 0.032, 0.404, C.gray, [0, 0.002, 0]),
    box(0.03, 0.032, 0.404, C.gray, [1, 0.002, 0]),
  ],

  // --- Decor -------------------------------------------------------------------------------------
  vase: [
    cyl(0.1, 0.16, C.sky, [0, 0, 0], { top: 0.16 }),
    cyl(0.16, 0.08, C.sky, [0, 0.16, 0], { top: 0.08 }),
    cyl(0.166, 0.014, C.white, [0, 0.153, 0]),
    cyl(0.09, 0.012, C.white, [0, 0.232, 0]),
    // Two flowers.
    box(0.012, 0.1, 0.012, C.leaf, [0.01, 0.24, 0]),
    ball(0.07, C.rose, [0.01, 0.32, 0]),
    box(0.012, 0.07, 0.012, C.leaf, [-0.02, 0.24, 0.01]),
    ball(0.06, C.lemon, [-0.025, 0.29, 0.012]),
  ],
  vase_tall: [
    cyl(0.12, 0.3, C.lavender, [0, 0, 0], { top: 0.2 }),
    cyl(0.2, 0.12, C.lavender, [0, 0.3, 0], { top: 0.09 }),
    cyl(0.151, 0.02, C.white, [0, 0.1, 0], { top: 0.157 }),
    cyl(0.206, 0.016, C.white, [0, 0.292, 0]),
    cyl(0.1, 0.012, C.white, [0, 0.412, 0]),
  ],
  celadon_vase: [
    cyl(0.12, 0.14, C.celadon, [0, 0, 0], { top: 0.3 }),
    cyl(0.3, 0.2, C.celadon, [0, 0.14, 0], { top: 0.12 }),
    cyl(0.12, 0.07, C.celadon, [0, 0.34, 0], { top: 0.16 }),
    // Inlaid bands, a white lip and a dark foot.
    cyl(0.306, 0.014, C.white, [0, 0.133, 0]),
    cyl(0.256, 0.01, C.teal, [0, 0.195, 0], { top: 0.247 }),
    cyl(0.17, 0.01, C.white, [0, 0.404, 0]),
    cyl(0.13, 0.012, C.teal, [0, 0.002, 0]),
  ],
  pottery_bowl: [
    cyl(0.1, 0.03, C.clay),
    cyl(0.12, 0.08, C.celadon, [0, 0.03, 0], { top: 0.24 }),
    cyl(0.207, 0.015, C.white, [0, 0.085, 0], { top: 0.23 }),
    cyl(0.2, 0.004, C.teal, [0, 0.108, 0]),
  ],
  plant_small: [
    cyl(0.1, 0.1, C.clay, [0, 0, 0], { top: 0.14 }),
    ball(0.18, C.leaf, [0, 0.09, 0]),
    cyl(0.15, 0.024, C.wood, [0, 0.08, 0]),
    ball(0.1, C.mint, [0.05, 0.19, 0.02]),
    ball(0.09, C.leaf, [-0.05, 0.18, -0.03]),
  ],
  plant_big: [
    cyl(0.2, 0.22, C.white, [0, 0, 0], { top: 0.28 }),
    ball(0.36, C.leaf, [0, 0.2, 0]),
    ball(0.26, C.mint, [0.06, 0.44, 0.02]),
    ball(0.2, C.leaf, [-0.09, 0.4, -0.04]),
    cyl(0.23, 0.02, C.sky, [0, 0.07, 0], { top: 0.237 }),
    cyl(0.29, 0.03, C.sky, [0, 0.193, 0]),
  ],
  /** Leans back on a leg behind it, so it stands; the picture faces -z. */
  frame: [
    box(0.2, 0.26, 0.025, C.wood, [0, 0, 0], [0.15, 0, 0]),
    box(0.15, 0.2, 0.01, C.sky, [0, 0.03, -0.012], [0.15, 0, 0]),
    // A hill and a sun on the tilted picture.
    box(0.15, 0.07, 0.006, C.mint, [0, 0.0315, -0.0267], [0.15, 0, 0]),
    box(0.045, 0.045, 0.006, C.lemon, [0.035, 0.1528, -0.0102], [0.15, 0, 0]),
    box(0.04, 0.18, 0.012, C.woodDark, [0, -0.007, 0.057], [-0.45, 0, 0]),
  ],
  cushion: [
    box(0.4, 0.1, 0.4, C.rose),
    box(0.404, 0.02, 0.404, C.white, [0, 0.04, 0]),
    cyl(0.06, 0.008, C.white, [0, 0.097, 0]),
  ],
  figurine: [
    cyl(0.14, 0.03, C.gold),
    cyl(0.08, 0.12, C.lavender, [0, 0.03, 0], { top: 0.1 }),
    ball(0.12, C.peach, [0, 0.14, 0]),
    cyl(0.1, 0.06, C.coral, [0, 0.24, 0], { top: 0 }),
    // Hat brim, arms, eyes and a name plate on the base.
    cyl(0.13, 0.01, C.coral, [0, 0.236, 0]),
    box(0.17, 0.025, 0.03, C.lavender, [0, 0.1, 0]),
    box(0.014, 0.014, 0.012, C.charcoal, [-0.022, 0.2, -0.052]),
    box(0.014, 0.014, 0.012, C.charcoal, [0.022, 0.2, -0.052]),
    box(0.07, 0.016, 0.008, C.white, [0, 0.007, -0.068]),
  ],
  trophy: [
    box(0.16, 0.05, 0.16, C.woodDark),
    cyl(0.04, 0.1, C.gold, [0, 0.05, 0]),
    cyl(0.08, 0.14, C.gold, [0, 0.15, 0], { top: 0.2 }),
    box(0.11, 0.016, 0.11, C.gold, [0, 0.05, 0]),
    box(0.09, 0.024, 0.006, C.gold, [0, 0.013, -0.081]),
    box(0.03, 0.07, 0.02, C.gold, [-0.1, 0.205, 0]),
    box(0.03, 0.07, 0.02, C.gold, [0.1, 0.205, 0]),
  ],
  lucky_cat: [
    cyl(0.2, 0.04, C.red),
    ball(0.24, C.gold, [0, 0.03, 0]),
    ball(0.17, C.gold, [0, 0.21, 0]),
    cyl(0.05, 0.06, C.gold, [-0.05, 0.36, 0], { top: 0 }),
    cyl(0.05, 0.06, C.gold, [0.05, 0.36, 0], { top: 0 }),
    box(0.04, 0.14, 0.04, C.gold, [0.12, 0.2, 0]),
    // Collar with a bell, eyes, and the coin it holds.
    cyl(0.19, 0.024, C.red, [0, 0.222, 0]),
    ball(0.04, C.lemon, [0, 0.2, -0.1]),
    box(0.016, 0.02, 0.012, C.charcoal, [-0.03, 0.3, -0.076]),
    box(0.016, 0.02, 0.012, C.charcoal, [0.03, 0.3, -0.076]),
    box(0.07, 0.09, 0.016, C.lemon, [0, 0.09, -0.116]),
  ],
  award: [
    cyl(0.16, 0.04, C.charcoal),
    cyl(0.03, 0.14, C.gold, [0, 0.04, 0]),
    ball(0.14, C.gold, [0, 0.16, 0]),
    cyl(0.05, 0.08, C.gold, [0, 0.28, 0], { top: 0 }),
    cyl(0.1, 0.015, C.gold, [0, 0.04, 0]),
    cyl(0.2, 0.012, C.lemon, [0, 0.224, 0]),
  ],
  towel_trophy: [
    cyl(0.18, 0.04, C.woodDark),
    cyl(0.05, 0.12, C.gold, [0, 0.04, 0]),
    ball(0.1, C.gold, [-0.08, 0.16, 0]),
    ball(0.14, C.gold, [0, 0.14, 0]),
    ball(0.1, C.gold, [0.08, 0.16, 0]),
    cyl(0.12, 0.014, C.gold, [0, 0.04, 0]),
    box(0.08, 0.02, 0.008, C.gold, [0, 0.01, -0.086]),
  ],
  lantern: [
    cyl(0.14, 0.03, C.woodDark),
    box(0.16, 0.22, 0.16, C.paper, [0, 0.03, 0]),
    cyl(0.28, 0.04, C.woodDark, [0, 0.25, 0], { top: 0.11, sides: 4, rot: [0, Math.PI / 4, 0] }),
    // Corner posts and a rail around the paper.
    box(0.02, 0.22, 0.02, C.woodDark, [-0.078, 0.03, -0.078]),
    box(0.02, 0.22, 0.02, C.woodDark, [0.078, 0.03, -0.078]),
    box(0.02, 0.22, 0.02, C.woodDark, [-0.078, 0.03, 0.078]),
    box(0.02, 0.22, 0.02, C.woodDark, [0.078, 0.03, 0.078]),
    box(0.168, 0.014, 0.168, C.woodDark, [0, 0.133, 0]),
  ],
  makeup_kit: [
    box(0.22, 0.08, 0.14, C.rose),
    box(0.2, 0.14, 0.01, C.sky, [0, 0.08, 0.06], [-0.2, 0, 0]),
    // A lipstick and a compact on the lid, and a clasp on the front.
    cyl(0.022, 0.03, C.gold, [-0.06, 0.08, -0.02]),
    cyl(0.018, 0.025, C.red, [-0.06, 0.11, -0.02]),
    cyl(0.055, 0.014, C.lavender, [0.05, 0.08, -0.025]),
    box(0.224, 0.008, 0.144, C.white, [0, 0.05, 0]),
    box(0.03, 0.02, 0.006, C.gold, [0, 0.03, -0.071]),
  ],
  plush: [
    ball(0.2, C.lavender),
    ball(0.14, C.lavender, [0, 0.16, 0]),
    ball(0.06, C.rose, [-0.06, 0.26, 0]),
    ball(0.06, C.rose, [0.06, 0.26, 0]),
    // Arms, a white belly and muzzle, eyes.
    ball(0.07, C.lavender, [-0.105, 0.07, -0.02]),
    ball(0.07, C.lavender, [0.105, 0.07, -0.02]),
    ball(0.1, C.white, [0, 0.04, -0.06]),
    ball(0.055, C.white, [0, 0.19, -0.055]),
    box(0.014, 0.016, 0.012, C.charcoal, [-0.028, 0.24, -0.06]),
    box(0.014, 0.016, 0.012, C.charcoal, [0.028, 0.24, -0.06]),
  ],

  // --- Bath --------------------------------------------------------------------------------------
  soap_bottle: [
    cyl(0.08, 0.16, C.mint),
    cyl(0.03, 0.05, C.white, [0, 0.16, 0]),
    box(0.05, 0.014, 0.022, C.white, [0.012, 0.21, 0]),
    cyl(0.084, 0.05, C.white, [0, 0.05, 0]),
  ],
  basin: [
    cyl(0.24, 0.1, C.sky, [0, 0, 0], { top: 0.34 }),
    cyl(0.346, 0.014, C.white, [0, 0.089, 0]),
    cyl(0.29, 0.004, C.water, [0, 0.102, 0]),
  ],
  bucket: [
    cyl(0.2, 0.22, C.woodLight, [0, 0, 0], { top: 0.26 }),
    box(0.03, 0.05, 0.03, C.woodDark, [0.13, 0.2, 0]),
    box(0.03, 0.05, 0.03, C.woodDark, [-0.13, 0.2, 0]),
    // Two hoops, and water inside.
    cyl(0.215, 0.02, C.woodDark, [0, 0.035, 0], { top: 0.221 }),
    cyl(0.246, 0.02, C.woodDark, [0, 0.15, 0], { top: 0.252 }),
    cyl(0.22, 0.004, C.water, [0, 0.218, 0]),
  ],
  towel_stack: [
    box(0.3, 0.06, 0.22, C.white),
    box(0.3, 0.06, 0.22, C.sky, [0, 0.06, 0]),
    box(0.3, 0.06, 0.22, C.rose, [0, 0.12, 0]),
    // A woven stripe near each end of every towel.
    box(0.03, 0.058, 0.224, C.sky, [-0.09, 0.002, 0]),
    box(0.03, 0.058, 0.224, C.sky, [0.09, 0.002, 0]),
    box(0.03, 0.06, 0.224, C.white, [-0.09, 0.06, 0]),
    box(0.03, 0.06, 0.224, C.white, [0.09, 0.06, 0]),
    box(0.03, 0.063, 0.224, C.white, [-0.09, 0.12, 0]),
    box(0.03, 0.063, 0.224, C.white, [0.09, 0.12, 0]),
  ],
  stool: [
    cyl(0.26, 0.04, C.woodLight, [0, 0.2, 0]),
    box(0.04, 0.2, 0.04, C.woodLight, [-0.08, 0, -0.08]),
    box(0.04, 0.2, 0.04, C.woodLight, [0.08, 0, -0.08]),
    box(0.04, 0.2, 0.04, C.woodLight, [-0.08, 0, 0.08]),
    box(0.04, 0.2, 0.04, C.woodLight, [0.08, 0, 0.08]),
    box(0.2, 0.02, 0.02, C.woodLight, [0, 0.08, -0.08]),
    box(0.2, 0.02, 0.02, C.woodLight, [0, 0.08, 0.08]),
    cyl(0.2, 0.004, C.cream, [0, 0.24, 0]),
  ],
  egg_basket: [
    cyl(0.2, 0.08, C.sand, [0, 0, 0], { top: 0.26 }),
    ball(0.07, C.cream, [-0.04, 0.05, 0]),
    ball(0.07, C.cream, [0.04, 0.05, 0.02]),
    ball(0.07, C.cream, [0, 0.05, -0.05]),
    ball(0.07, C.cream, [0.01, 0.085, 0]),
    cyl(0.268, 0.016, C.wood, [0, 0.067, 0]),
  ],

  // --- Hanging pieces: a cord runs up from the body, HANG_DROP in all ----------------------------
  disco_ball: [
    ball(0.4, C.gray),
    cord(0.4, C.charcoal),
    cyl(0.404, 0.03, C.white, [0, 0.185, 0], { sides: 8 }),
    cyl(0.33, 0.03, C.sky, [0, 0.07, 0], { sides: 8 }),
    cyl(0.33, 0.03, C.rose, [0, 0.3, 0], { sides: 8 }),
    cyl(0.09, 0.03, C.charcoal, [0, 0.385, 0]),
  ],
  hanging_lantern: [
    cyl(0.24, 0.26, C.coral, [0, 0.03, 0], { sides: 8 }),
    cyl(0.14, 0.03, C.charcoal, [0, 0, 0], { sides: 8 }),
    cyl(0.14, 0.03, C.charcoal, [0, 0.29, 0], { sides: 8 }),
    cyl(0.246, 0.02, C.gold, [0, 0.15, 0], { sides: 8 }),
    cord(0.32, C.charcoal),
  ],
  hanging_planter: [
    cyl(0.18, 0.16, C.clay, [0, 0, 0], { top: 0.26 }),
    ball(0.26, C.leaf, [0, 0.1, 0]),
    ball(0.12, C.mint, [0.11, 0.06, 0.03]),
    ball(0.1, C.leaf, [-0.12, 0.04, -0.02]),
    cyl(0.266, 0.02, C.white, [0, 0.145, 0]),
    cord(0.3, C.woodDark),
  ],
  planet_mobile: [
    ball(0.2, C.lemon),
    cyl(0.6, 0.012, C.woodLight, [0, 0.3, 0], { sides: 10 }),
    ball(0.1, C.blue, [0.26, 0.16, 0]),
    ball(0.08, C.coral, [-0.18, 0.2, 0.18]),
    ball(0.12, C.plum, [-0.1, 0.14, -0.24]),
    ball(0.07, C.mint, [0.12, 0.21, 0.22]),
    cyl(0.2, 0.008, C.sand, [-0.1, 0.196, -0.24], { sides: 8 }),
    cord(0.2, C.charcoal),
  ],
  art_mobile: [
    ball(0.16, C.coral, [-0.3, 0.04, 0]),
    box(0.72, 0.02, 0.02, C.charcoal, [0, 0.3, 0]),
    box(0.008, 0.1, 0.008, C.charcoal, [-0.3, 0.2, 0]),
    cyl(0.18, 0.16, C.blue, [0.3, 0, 0], { top: 0, sides: 4 }),
    box(0.008, 0.14, 0.008, C.charcoal, [0.3, 0.16, 0]),
    box(0.14, 0.14, 0.02, C.lemon, [0, 0.1, 0]),
    box(0.008, 0.06, 0.008, C.charcoal, [0, 0.24, 0]),
    cord(0.32, C.charcoal),
  ],
  chandelier: [
    cyl(0.56, 0.05, C.gold, [0, 0.14, 0], { sides: 10 }),
    cyl(0.02, 0.14, C.water, [0, 0, 0], { top: 0.16, sides: 6 }),
    cyl(0.2, 0.12, C.gold, [0, 0.19, 0], { top: 0.04 }),
    cord(0.31, C.gold),
    // Candles on the ring and crystal drops under it.
    cyl(0.05, 0.1, C.lemon, [0.24, 0.19, 0], { sides: 6 }),
    cyl(0.05, 0.1, C.lemon, [-0.24, 0.19, 0], { sides: 6 }),
    cyl(0.05, 0.1, C.lemon, [0, 0.19, 0.24], { sides: 6 }),
    cyl(0.05, 0.1, C.lemon, [0, 0.19, -0.24], { sides: 6 }),
    cyl(0.01, 0.08, C.water, [0.17, 0.06, 0.17], { top: 0.06, sides: 6 }),
    cyl(0.01, 0.08, C.water, [-0.17, 0.06, 0.17], { top: 0.06, sides: 6 }),
    cyl(0.01, 0.08, C.water, [0.17, 0.06, -0.17], { top: 0.06, sides: 6 }),
    cyl(0.01, 0.08, C.water, [-0.17, 0.06, -0.17], { top: 0.06, sides: 6 }),
  ],

  // --- Karaoke -----------------------------------------------------------------------------------
  /** Lies on the table and rolls: a handle with the head at one end. */
  hand_mic: [
    disc(0.045, 0.18, C.charcoal, [0, 0.0375, 0], 'x'),
    ball(0.075, C.gray, [0.11, 0, 0]),
    disc(0.05, 0.02, C.gold, [0.07, 0.0375, 0], 'x'),
  ],
  tambourine: [
    cyl(0.24, 0.05, C.woodLight, [0, 0, 0], { sides: 12 }),
    cyl(0.2, 0.004, C.white, [0, 0.05, 0], { sides: 12 }),
    box(0.04, 0.02, 0.012, C.gold, [0, 0.015, -0.12]),
    box(0.04, 0.02, 0.012, C.gold, [0, 0.015, 0.12]),
    box(0.012, 0.02, 0.04, C.gold, [-0.12, 0.015, 0]),
    box(0.012, 0.02, 0.04, C.gold, [0.12, 0.015, 0]),
  ],
  karaoke_machine: [
    box(0.36, 0.5, 0.3, C.plum),
    box(0.26, 0.16, 0.01, C.sky, [0, 0.3, -0.152]),
    box(0.16, 0.03, 0.014, C.rose, [-0.03, 0.4, -0.152]),
    disc(0.16, 0.012, C.lavender, [0, 0.14, -0.152], 'z', 12),
    disc(0.07, 0.016, C.plum, [0, 0.14, -0.153], 'z', 8),
    box(0.03, 0.03, 0.02, C.gold, [-0.12, 0.5, 0]),
    box(0.03, 0.03, 0.02, C.gold, [0.12, 0.5, 0]),
  ],
  /** A music note in lit tubes on a dark board; it faces -z. */
  neon_sign: [
    box(0.44, 0.36, 0.03, C.charcoal, [0, 0.02, 0]),
    box(0.3, 0.02, 0.14, C.charcoal),
    box(0.03, 0.2, 0.012, C.rose, [0.05, 0.12, -0.02]),
    box(0.1, 0.07, 0.012, C.rose, [0, 0.08, -0.02]),
    box(0.12, 0.03, 0.012, C.rose, [0.095, 0.3, -0.02]),
    box(0.38, 0.015, 0.012, C.sky, [0, 0.045, -0.02]),
    box(0.38, 0.015, 0.012, C.sky, [0, 0.34, -0.02]),
  ],

  // --- Flowers and garden ------------------------------------------------------------------------
  flower_bucket: [
    cyl(0.2, 0.3, C.sky, [0, 0, 0], { top: 0.27 }),
    cyl(0.276, 0.02, C.white, [0, 0.285, 0]),
    cyl(0.2, 0.08, C.leaf, [0, 0.3, 0], { top: 0.26 }),
    ball(0.12, C.rose, [-0.06, 0.36, 0.02]),
    ball(0.12, C.lemon, [0.06, 0.38, -0.03]),
    ball(0.11, C.coral, [0, 0.42, 0.05]),
    ball(0.1, C.white, [0.02, 0.35, -0.09]),
  ],
  bouquet: [
    cyl(0.2, 0.22, C.peach, [0, 0, 0], { top: 0.24, sides: 8 }),
    cyl(0.212, 0.03, C.rose, [0, 0.05, 0], { top: 0.218, sides: 8 }),
    ball(0.11, C.rose, [-0.05, 0.2, 0]),
    ball(0.11, C.white, [0.05, 0.2, 0.02]),
    ball(0.1, C.lavender, [0, 0.22, -0.05]),
    ball(0.08, C.leaf, [0.02, 0.18, 0.07]),
  ],
  watering_can: [
    cyl(0.2, 0.2, C.teal),
    box(0.2, 0.03, 0.03, C.teal, [0.17, 0.11, 0], [0, 0, 0.6]),
    cyl(0.07, 0.02, C.gray, [0.25, 0.19, 0]),
    box(0.03, 0.16, 0.03, C.teal, [-0.13, 0.04, 0]),
    box(0.1, 0.03, 0.03, C.teal, [-0.08, 0.2, 0]),
    cyl(0.206, 0.02, C.white, [0, 0.09, 0]),
  ],
  orchid_gold: [
    cyl(0.16, 0.14, C.gold, [0, 0, 0], { top: 0.22 }),
    cyl(0.226, 0.02, C.lemon, [0, 0.125, 0]),
    box(0.014, 0.32, 0.014, C.leaf, [0, 0.14, 0]),
    box(0.2, 0.012, 0.07, C.leaf, [0.09, 0.16, 0], [0, 0, 0.35]),
    box(0.2, 0.012, 0.07, C.leaf, [-0.09, 0.16, 0], [0, 0, -0.35]),
    ball(0.1, C.lavender, [0.04, 0.4, 0]),
    ball(0.09, C.rose, [-0.05, 0.33, 0.01]),
    ball(0.08, C.lavender, [0.05, 0.28, -0.01]),
    ball(0.03, C.lemon, [0.04, 0.435, -0.04]),
  ],
  /** Lies on its side and rolls. */
  ribbon_roll: [
    disc(0.12, 0.08, C.rose, [0, 0.06, 0], 'x'),
    disc(0.05, 0.084, C.white, [0, 0.06, 0], 'x'),
  ],
  terrarium: [
    cyl(0.18, 0.22, C.water, [0, 0, 0], { top: 0.3, sides: 8 }),
    cyl(0.3, 0.1, C.water, [0, 0.22, 0], { top: 0.14, sides: 8 }),
    cyl(0.15, 0.03, C.wood, [0, 0.32, 0]),
    // Soil and moss showing through the glass.
    cyl(0.194, 0.03, C.clay, [0, 0.02, 0], { top: 0.212, sides: 8 }),
    cyl(0.212, 0.05, C.leaf, [0, 0.05, 0], { top: 0.24, sides: 8 }),
  ],
  bonsai: [
    box(0.32, 0.08, 0.22, C.celadon),
    box(0.28, 0.01, 0.18, C.woodDark, [0, 0.08, 0]),
    box(0.05, 0.2, 0.05, C.woodDark, [-0.03, 0.08, 0], [0, 0, 0.3]),
    box(0.04, 0.16, 0.04, C.woodDark, [0.05, 0.2, 0], [0, 0, -0.7]),
    ball(0.2, C.leaf, [-0.08, 0.26, 0]),
    ball(0.16, C.leaf, [0.12, 0.24, 0.01]),
    ball(0.12, C.mint, [0.01, 0.36, -0.01]),
    box(0.04, 0.02, 0.2, C.gold, [-0.12, 0, 0]),
    box(0.04, 0.02, 0.2, C.gold, [0.12, 0, 0]),
  ],
  planter_box: [
    box(0.7, 0.22, 0.26, C.wood),
    box(0.66, 0.01, 0.22, C.woodDark, [0, 0.22, 0]),
    box(0.704, 0.03, 0.264, C.woodDark, [0, 0.16, 0]),
    ball(0.16, C.leaf, [-0.22, 0.2, 0]),
    ball(0.18, C.leaf, [0, 0.2, 0.01]),
    ball(0.16, C.leaf, [0.22, 0.2, -0.01]),
    ball(0.06, C.red, [-0.2, 0.33, -0.04]),
    ball(0.06, C.red, [0.04, 0.35, 0.04]),
    ball(0.06, C.red, [0.24, 0.32, 0.03]),
  ],

  // --- Street food -------------------------------------------------------------------------------
  bowl_stack: [
    cyl(0.1, 0.08, C.celadon, [0, 0, 0], { top: 0.2 }),
    cyl(0.1, 0.08, C.white, [0, 0.04, 0], { top: 0.2 }),
    cyl(0.1, 0.08, C.celadon, [0, 0.08, 0], { top: 0.2 }),
    cyl(0.1, 0.08, C.white, [0, 0.12, 0], { top: 0.2 }),
    cyl(0.17, 0.004, C.sand, [0, 0.198, 0]),
  ],
  skewer_stand: [
    box(0.32, 0.05, 0.12, C.wood),
    ...[-0.12, -0.06, 0, 0.06, 0.12].flatMap((x, index) => [
      box(0.012, 0.24, 0.012, C.woodLight, [x, 0.05, 0]),
      box(0.04, 0.12, 0.02, index % 2 === 0 ? C.sand : C.coral, [x, 0.12, 0]),
    ]),
  ],
  grill: [
    box(0.5, 0.14, 0.3, C.charcoal, [0, 0.04, 0]),
    box(0.04, 0.04, 0.26, C.slate, [-0.2, 0, 0]),
    box(0.04, 0.04, 0.26, C.slate, [0.2, 0, 0]),
    box(0.44, 0.012, 0.24, C.coral, [0, 0.18, 0]),
    ...[-0.16, -0.08, 0, 0.08, 0.16].map((x) => box(0.012, 0.016, 0.26, C.gray, [x, 0.19, 0])),
    box(0.3, 0.02, 0.03, C.sand, [0, 0.206, -0.04]),
    box(0.3, 0.02, 0.03, C.sand, [0, 0.206, 0.05]),
  ],
  gold_pig: [
    ball(0.28, C.gold, [0, 0.04, 0]),
    box(0.05, 0.06, 0.05, C.gold, [-0.07, 0, -0.07]),
    box(0.05, 0.06, 0.05, C.gold, [0.07, 0, -0.07]),
    box(0.05, 0.06, 0.05, C.gold, [-0.07, 0, 0.07]),
    box(0.05, 0.06, 0.05, C.gold, [0.07, 0, 0.07]),
    disc(0.1, 0.05, C.lemon, [0, 0.17, -0.14], 'z', 8),
    cyl(0.06, 0.06, C.gold, [-0.07, 0.27, -0.05], { top: 0, sides: 4 }),
    cyl(0.06, 0.06, C.gold, [0.07, 0.27, -0.05], { top: 0, sides: 4 }),
    box(0.014, 0.014, 0.012, C.charcoal, [-0.05, 0.22, -0.125]),
    box(0.014, 0.014, 0.012, C.charcoal, [0.05, 0.22, -0.125]),
    box(0.08, 0.008, 0.016, C.charcoal, [0, 0.316, 0]),
  ],

  // --- School ------------------------------------------------------------------------------------
  globe: [
    ball(0.3, C.sky, [0, 0.03, 0]),
    cyl(0.16, 0.03, C.woodDark),
    box(0.12, 0.1, 0.012, C.leaf, [-0.03, 0.15, -0.142]),
    box(0.1, 0.08, 0.012, C.leaf, [0.05, 0.14, 0.142]),
    box(0.012, 0.1, 0.1, C.leaf, [0.142, 0.13, 0.02]),
    box(0.012, 0.08, 0.12, C.leaf, [-0.142, 0.16, -0.02]),
    cyl(0.03, 0.02, C.gold, [0, 0.325, 0]),
  ],
  pencil_cup: [
    cyl(0.08, 0.1, C.coral),
    box(0.012, 0.09, 0.012, C.lemon, [-0.015, 0.08, 0]),
    box(0.012, 0.07, 0.012, C.sky, [0.015, 0.08, 0.01]),
    box(0.012, 0.08, 0.012, C.leaf, [0, 0.08, -0.018]),
    cyl(0.084, 0.02, C.white, [0, 0.03, 0]),
  ],
  beaker_rack: [
    box(0.34, 0.03, 0.12, C.woodLight),
    cyl(0.09, 0.1, C.water, [-0.11, 0.03, 0], { top: 0.04, sides: 8 }),
    cyl(0.04, 0.05, C.water, [-0.11, 0.13, 0], { sides: 8 }),
    cyl(0.07, 0.16, C.mint, [0, 0.03, 0], { sides: 8 }),
    cyl(0.09, 0.1, C.rose, [0.11, 0.03, 0], { top: 0.04, sides: 8 }),
    cyl(0.04, 0.05, C.rose, [0.11, 0.13, 0], { sides: 8 }),
  ],
  microscope: [
    box(0.16, 0.03, 0.22, C.charcoal),
    box(0.04, 0.26, 0.04, C.gray, [0, 0.03, 0.07]),
    box(0.12, 0.012, 0.12, C.gray, [0, 0.12, -0.01]),
    cyl(0.05, 0.16, C.white, [0, 0.2, 0], { rot: [0.5, 0, 0], sides: 8 }),
    cyl(0.03, 0.05, C.charcoal, [0, 0.14, -0.03], { sides: 8 }),
    box(0.03, 0.03, 0.05, C.gold, [0.035, 0.2, 0.07]),
  ],
  backpack: [
    box(0.3, 0.36, 0.16, C.blue),
    box(0.22, 0.14, 0.03, C.sky, [0, 0.05, -0.09]),
    box(0.304, 0.06, 0.164, C.lemon, [0, 0.27, 0]),
    box(0.05, 0.3, 0.02, C.slate, [-0.09, 0.03, 0.085]),
    box(0.05, 0.3, 0.02, C.slate, [0.09, 0.03, 0.085]),
    box(0.08, 0.03, 0.03, C.slate, [0, 0.36, 0]),
  ],
  gold_apple: [
    box(0.16, 0.05, 0.16, C.woodDark),
    ball(0.18, C.gold, [0, 0.05, 0]),
    box(0.016, 0.05, 0.016, C.woodDark, [0, 0.22, 0]),
    box(0.07, 0.012, 0.04, C.leaf, [0.04, 0.25, 0], [0, 0, 0.4]),
    box(0.1, 0.024, 0.006, C.gold, [0, 0.013, -0.081]),
  ],

  // --- Gallery -----------------------------------------------------------------------------------
  moon_jar: [
    cyl(0.16, 0.2, C.white, [0, 0, 0], { top: 0.42 }),
    cyl(0.42, 0.2, C.white, [0, 0.2, 0], { top: 0.2 }),
    cyl(0.2, 0.03, C.cream, [0, 0.4, 0]),
    cyl(0.426, 0.012, C.cream, [0, 0.194, 0]),
    cyl(0.17, 0.012, C.cream, [0, 0.002, 0]),
  ],
  display_case: [
    box(0.5, 0.06, 0.5, C.white),
    box(0.44, 0.5, 0.44, C.water, [0, 0.06, 0]),
    box(0.5, 0.03, 0.5, C.white, [0, 0.56, 0]),
    box(0.024, 0.5, 0.024, C.white, [-0.224, 0.06, -0.224]),
    box(0.024, 0.5, 0.024, C.white, [0.224, 0.06, -0.224]),
    box(0.024, 0.5, 0.024, C.white, [-0.224, 0.06, 0.224]),
    box(0.024, 0.5, 0.024, C.white, [0.224, 0.06, 0.224]),
    // A small vase on a stand, showing through the glass on all four sides.
    box(0.446, 0.04, 0.2, C.woodDark, [0, 0.066, 0]),
    box(0.2, 0.04, 0.446, C.woodDark, [0, 0.066, 0]),
    box(0.446, 0.2, 0.12, C.celadon, [0, 0.106, 0]),
    box(0.12, 0.2, 0.446, C.celadon, [0, 0.106, 0]),
    box(0.446, 0.06, 0.06, C.celadon, [0, 0.306, 0]),
    box(0.06, 0.06, 0.446, C.celadon, [0, 0.306, 0]),
  ],
  stanchion: [
    cyl(0.04, 0.8, C.gold, [0, 0.03, 0]),
    cyl(0.26, 0.03, C.gold, [0, 0, 0], { top: 0.2 }),
    ball(0.08, C.gold, [0, 0.82, 0]),
    box(0.2, 0.03, 0.03, C.red, [0.11, 0.7, 0], [0, 0, -0.5]),
    box(0.2, 0.03, 0.03, C.red, [-0.11, 0.7, 0], [0, 0, 0.5]),
  ],
  sculpture: [
    cyl(0.14, 0.2, C.coral, [0, 0.06, 0], { top: 0.22, sides: 5 }),
    box(0.2, 0.06, 0.2, C.charcoal),
    ball(0.16, C.lemon, [0, 0.25, 0]),
    box(0.22, 0.04, 0.06, C.blue, [0, 0.39, 0], [0, 0.5, 0.4]),
  ],

  // --- Penthouse ---------------------------------------------------------------------------------
  aquarium: [
    box(0.8, 0.4, 0.36, C.water, [0, 0.05, 0]),
    box(0.84, 0.05, 0.4, C.charcoal),
    box(0.84, 0.03, 0.4, C.charcoal, [0, 0.45, 0]),
    // Sand, a plant and two fish, showing through the front and the back.
    box(0.76, 0.05, 0.366, C.sand, [0, 0.052, 0]),
    box(0.04, 0.2, 0.366, C.leaf, [-0.26, 0.1, 0]),
    box(0.1, 0.05, 0.366, C.coral, [0.02, 0.24, 0]),
    box(0.08, 0.04, 0.366, C.lemon, [0.24, 0.17, 0]),
  ],
  /** On a tripod; the tube points up and toward +z. */
  telescope: [
    cyl(0.1, 0.5, C.white, [0, 0.62, 0], { rot: [-0.7, 0, 0], sides: 8 }),
    cyl(0.44, 0.74, C.charcoal, [0, 0, 0], { top: 0.05, sides: 3 }),
    cyl(0.12, 0.05, C.gold, [0, 0.845, 0.16], { rot: [-0.7, 0, 0], sides: 8 }),
    cyl(0.07, 0.06, C.charcoal, [0, 0.74, 0]),
  ],
  candelabra: [
    cyl(0.16, 0.03, C.gold, [0, 0, 0], { top: 0.1 }),
    cyl(0.03, 0.22, C.gold, [0, 0.03, 0]),
    box(0.3, 0.02, 0.03, C.gold, [0, 0.2, 0]),
    ...[-0.14, 0, 0.14].flatMap((x) => [
      cyl(0.035, x === 0 ? 0.14 : 0.1, C.white, [x, x === 0 ? 0.25 : 0.22, 0], { sides: 6 }),
      cyl(0.03, 0.05, C.lemon, [x, x === 0 ? 0.39 : 0.32, 0], { top: 0, sides: 6 }),
    ]),
  ],

  // --- Big pieces --------------------------------------------------------------------------------
  /** A free-standing bookcase, the same size as the `shelf_unit`: a row falls like dominoes. */
  bookcase: [
    box(0.9, 1.3, 0.3, C.wood),
    box(0.94, 0.04, 0.34, C.woodDark, [0, 1.3, 0]),
    box(0.8, 0.02, 0.31, C.woodDark, [0, 0.04, 0]),
    box(0.8, 0.02, 0.31, C.woodDark, [0, 0.45, 0]),
    box(0.8, 0.02, 0.31, C.woodDark, [0, 0.9, 0]),
    ...spines(0.06, [C.blue, C.red, C.lemon, C.teal, C.plum, C.coral, C.blue, C.leaf]),
    ...spines(0.47, [C.lemon, C.plum, C.coral, C.sky, C.red, C.teal, C.lemon, C.rose]),
    ...spines(0.92, [C.teal, C.coral, C.blue, C.lemon, C.leaf, C.plum, C.red, C.sky]),
  ],
  robot_figure: [
    box(0.16, 0.14, 0.1, C.gold, [0, 0.11, 0]),
    box(0.18, 0.03, 0.14, C.woodDark),
    box(0.05, 0.08, 0.06, C.gold, [-0.04, 0.03, 0]),
    box(0.05, 0.08, 0.06, C.gold, [0.04, 0.03, 0]),
    box(0.12, 0.1, 0.1, C.gold, [0, 0.26, 0]),
    box(0.04, 0.12, 0.05, C.gold, [-0.1, 0.12, 0]),
    box(0.04, 0.12, 0.05, C.gold, [0.1, 0.12, 0]),
    box(0.012, 0.05, 0.012, C.gold, [0, 0.36, 0]),
    ball(0.03, C.red, [0, 0.4, 0]),
    box(0.025, 0.025, 0.008, C.sky, [-0.028, 0.305, -0.052]),
    box(0.025, 0.025, 0.008, C.sky, [0.028, 0.305, -0.052]),
    box(0.08, 0.05, 0.008, C.lemon, [0, 0.16, -0.052]),
  ],
  /** A free-standing shop shelf, tall and narrow so a row of them falls like dominoes. */
  shelf_unit: [
    box(0.9, 1.3, 0.3, C.white),
    box(0.94, 0.04, 0.34, C.sky, [0, 1.3, 0]),
    box(0.8, 0.02, 0.31, C.sky, [0, 0.04, 0]),
    box(0.8, 0.02, 0.31, C.sky, [0, 0.45, 0]),
    box(0.8, 0.02, 0.31, C.sky, [0, 0.9, 0]),
    ...goods(0.06, [C.coral, C.lemon, C.mint, C.coral, C.lavender]),
    ...goods(0.47, [C.lemon, C.rose, C.peach, C.mint, C.lemon]),
    ...goods(0.92, [C.lavender, C.peach, C.coral, C.lemon, C.rose]),
  ],
  mat: [box(0.62, 0.02, 0.32, C.peach), ...border(0.62, 0.32, 0.04, C.white)],
  tablecloth: [
    box(0.8, 0.02, 0.8, C.rose),
    box(0.6, 0.004, 0.6, C.white, [0, 0.02, 0]),
    ...border(0.8, 0.8, 0.05, C.white),
  ],
};
