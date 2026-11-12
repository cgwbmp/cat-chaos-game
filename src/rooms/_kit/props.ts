// Prop library for code-built rooms. An ObjectDef's `meshNode` names one of these; the builder
// turns the parts into the breakable's mesh. Every prop stands on its base at y = 0 and is
// slightly oversized and chunky, as the art rules ask.
import { C } from './palette';
import { ball, box, cyl, type Part } from './parts';

const flat = Math.PI / 2;

export const PROPS: Record<string, Part[]> = {
  // --- Tableware -------------------------------------------------------------------------------
  cup: [cyl(0.08, 0.09, C.white, [0, 0, 0], { top: 0.1 })],
  mug: [cyl(0.1, 0.11, C.sky), box(0.03, 0.06, 0.02, C.sky, [0.06, 0.03, 0])],
  glass: [cyl(0.07, 0.13, C.water, [0, 0, 0], { top: 0.09 })],
  plate: [cyl(0.24, 0.025, C.white, [0, 0, 0], { sides: 12 })],
  plate_stack: [
    cyl(0.24, 0.1, C.white, [0, 0, 0], { sides: 12 }),
    cyl(0.2, 0.012, C.sky, [0, 0.1, 0], { sides: 12 }),
  ],
  bowl: [cyl(0.1, 0.08, C.celadon, [0, 0, 0], { top: 0.2 })],
  bottle: [cyl(0.08, 0.2, C.leaf), cyl(0.035, 0.09, C.leaf, [0, 0.2, 0])],
  can: [cyl(0.07, 0.12, C.coral)],
  carton: [box(0.09, 0.19, 0.09, C.white), box(0.09, 0.05, 0.02, C.sky, [0, 0.19, 0])],
  kettle: [
    cyl(0.18, 0.2, C.gray, [0, 0, 0], { top: 0.13 }),
    box(0.04, 0.03, 0.14, C.charcoal, [0, 0.22, 0]),
  ],
  teapot: [
    ball(0.16, C.celadon),
    cyl(0.05, 0.03, C.celadon, [0, 0.15, 0]),
    box(0.09, 0.03, 0.03, C.celadon, [0.1, 0.08, 0]),
  ],
  pot: [
    cyl(0.24, 0.13, C.lemon),
    cyl(0.26, 0.02, C.gold, [0, 0.13, 0]),
    ball(0.05, C.charcoal, [0, 0.14, 0]),
  ],
  hot_plate: [
    box(0.3, 0.05, 0.3, C.charcoal),
    cyl(0.22, 0.012, C.slate, [0, 0.05, 0], { sides: 12 }),
  ],
  rice_cooker: [
    cyl(0.28, 0.2, C.white),
    cyl(0.26, 0.05, C.rose, [0, 0.2, 0], { top: 0.2 }),
    box(0.08, 0.05, 0.02, C.gray, [0, 0.06, -0.14]),
  ],
  tray: [box(0.4, 0.03, 0.28, C.wood)],
  cake: [
    cyl(0.2, 0.09, C.cream, [0, 0, 0], { sides: 12 }),
    cyl(0.2, 0.02, C.rose, [0, 0.09, 0], { sides: 12 }),
    ball(0.04, C.red, [0, 0.11, 0]),
  ],
  cake_case: [
    box(0.6, 0.06, 0.4, C.white),
    box(0.56, 0.3, 0.36, C.water, [0, 0.06, 0]),
    cyl(0.18, 0.08, C.rose, [-0.14, 0.38, 0]),
    box(0.6, 0.03, 0.4, C.white, [0, 0.36, 0]),
  ],
  cup_tower: [
    cyl(0.08, 0.09, C.white, [0, 0, 0], { top: 0.1 }),
    cyl(0.08, 0.09, C.peach, [0, 0.09, 0], { top: 0.1 }),
    cyl(0.08, 0.09, C.white, [0, 0.18, 0], { top: 0.1 }),
    cyl(0.08, 0.09, C.mint, [0, 0.27, 0], { top: 0.1 }),
  ],
  espresso_machine: [
    box(0.4, 0.4, 0.34, C.coral),
    box(0.44, 0.05, 0.36, C.gray, [0, 0.4, 0]),
    box(0.2, 0.03, 0.2, C.gray, [0, 0.0, -0.22]),
    cyl(0.05, 0.12, C.gray, [-0.1, 0.2, -0.2]),
    cyl(0.05, 0.12, C.gray, [0.1, 0.2, -0.2]),
  ],
  jar: [cyl(0.14, 0.2, C.clay, [0, 0, 0], { top: 0.18 }), cyl(0.14, 0.03, C.woodDark, [0, 0.2, 0])],
  jar_big: [
    cyl(0.34, 0.24, C.clay, [0, 0, 0], { top: 0.56 }),
    cyl(0.56, 0.3, C.clay, [0, 0.24, 0], { top: 0.4 }),
    cyl(0.44, 0.05, C.woodDark, [0, 0.54, 0]),
  ],
  jar_gold: [
    cyl(0.3, 0.2, C.gold, [0, 0, 0], { top: 0.48 }),
    cyl(0.48, 0.26, C.gold, [0, 0.2, 0], { top: 0.34 }),
    cyl(0.38, 0.05, C.clay, [0, 0.46, 0]),
  ],

  // --- Paper, books, boxes -----------------------------------------------------------------------
  book: [box(0.05, 0.24, 0.17, C.coral), box(0.04, 0.22, 0.16, C.paper, [0.005, 0.01, 0.01])],
  book_stack: [
    box(0.24, 0.05, 0.17, C.sky),
    box(0.22, 0.05, 0.16, C.lemon, [0.01, 0.05, 0]),
    box(0.24, 0.05, 0.17, C.rose, [-0.01, 0.1, 0.01]),
    box(0.2, 0.05, 0.15, C.mint, [0, 0.15, 0]),
  ],
  magazine_stack: [box(0.3, 0.06, 0.22, C.paper), box(0.3, 0.02, 0.22, C.rose, [0.01, 0.06, 0.01])],
  album: [box(0.03, 0.26, 0.26, C.lavender), box(0.02, 0.2, 0.2, C.rose, [-0.01, 0.03, 0])],
  album_stack: [
    box(0.27, 0.04, 0.27, C.lavender),
    box(0.27, 0.04, 0.27, C.rose, [0.01, 0.04, 0]),
    box(0.27, 0.04, 0.27, C.sky, [-0.01, 0.08, 0.01]),
    box(0.27, 0.04, 0.27, C.lemon, [0, 0.12, 0]),
    box(0.27, 0.04, 0.27, C.mint, [0.01, 0.16, 0]),
  ],
  snack_bag: [box(0.18, 0.24, 0.07, C.lemon), box(0.18, 0.03, 0.02, C.coral, [0, 0.24, 0])],
  snack_box: [box(0.2, 0.12, 0.14, C.rose)],
  noodle_cup: [
    cyl(0.09, 0.12, C.white, [0, 0, 0], { top: 0.12 }),
    cyl(0.125, 0.012, C.red, [0, 0.12, 0]),
  ],
  crate: [box(0.36, 0.3, 0.3, C.wood), box(0.38, 0.03, 0.32, C.woodDark, [0, 0.14, 0])],
  basket: [cyl(0.26, 0.2, C.sand, [0, 0, 0], { top: 0.34 })],
  tissue_box: [box(0.22, 0.09, 0.12, C.mint), box(0.06, 0.04, 0.02, C.white, [0, 0.09, 0])],
  paper_door: [box(0.9, 1.7, 0.05, C.woodLight), box(0.78, 1.5, 0.06, C.paper, [0, 0.1, 0])],
  scroll: [
    cyl(0.05, 0.4, C.paper, [0, 0.025, 0], { rot: [0, 0, flat] }),
    cyl(0.07, 0.03, C.woodDark, [0.2, 0.035, 0], { rot: [0, 0, flat] }),
  ],

  // --- Electronics -------------------------------------------------------------------------------
  monitor: [
    box(0.2, 0.02, 0.14, C.charcoal),
    box(0.05, 0.12, 0.03, C.charcoal, [0, 0.02, 0]),
    box(0.56, 0.34, 0.04, C.charcoal, [0, 0.13, 0]),
    box(0.5, 0.28, 0.01, C.sky, [0, 0.16, -0.022]),
  ],
  keyboard: [box(0.4, 0.025, 0.14, C.white), box(0.36, 0.01, 0.1, C.gray, [0, 0.025, 0])],
  mouse: [box(0.06, 0.03, 0.1, C.white)],
  laptop: [
    box(0.34, 0.02, 0.24, C.gray),
    box(0.34, 0.22, 0.015, C.gray, [0, 0.02, 0.12], [-0.25, 0, 0]),
    box(0.3, 0.18, 0.005, C.sky, [0, 0.04, 0.108], [-0.25, 0, 0]),
  ],
  phone: [box(0.08, 0.015, 0.16, C.charcoal), box(0.07, 0.004, 0.14, C.sky, [0, 0.015, 0])],
  speaker: [
    box(0.14, 0.22, 0.14, C.plum),
    cyl(0.09, 0.01, C.lavender, [0, 0.07, -0.072], { rot: [flat, 0, 0], sides: 12 }),
  ],
  headphones: [
    cyl(0.2, 0.04, C.coral, [0, 0.1, 0], { rot: [flat, 0, 0] }),
    cyl(0.09, 0.05, C.charcoal, [-0.09, 0, 0], { rot: [0, 0, flat] }),
    cyl(0.09, 0.05, C.charcoal, [0.09, 0, 0], { rot: [0, 0, flat] }),
  ],
  console: [box(0.3, 0.07, 0.22, C.white), box(0.1, 0.02, 0.06, C.sky, [0.07, 0.07, 0])],
  pc_tower: [box(0.2, 0.42, 0.4, C.charcoal), box(0.01, 0.3, 0.3, C.mint, [-0.1, 0.06, 0])],
  clock: [
    cyl(0.14, 0.05, C.red, [0, 0.07, 0], { rot: [flat, 0, 0], sides: 12 }),
    box(0.03, 0.03, 0.04, C.red, [-0.04, 0, 0]),
    box(0.03, 0.03, 0.04, C.red, [0.04, 0, 0]),
  ],
  desk_lamp: [
    cyl(0.14, 0.02, C.charcoal),
    cyl(0.025, 0.3, C.charcoal, [0, 0.02, 0]),
    cyl(0.08, 0.1, C.lemon, [0, 0.3, 0], { top: 0.18 }),
  ],
  floor_lamp: [
    cyl(0.3, 0.04, C.woodDark),
    cyl(0.04, 1.2, C.woodDark, [0, 0.04, 0]),
    cyl(0.22, 0.26, C.peach, [0, 1.2, 0], { top: 0.36 }),
  ],
  lightstick: [cyl(0.035, 0.18, C.white), ball(0.1, C.rose, [0, 0.16, 0])],
  mic: [
    cyl(0.16, 0.02, C.charcoal),
    cyl(0.02, 0.26, C.gray, [0, 0.02, 0]),
    ball(0.07, C.charcoal, [0, 0.27, 0]),
  ],
  ring_light: [
    cyl(0.2, 0.02, C.charcoal),
    cyl(0.025, 0.5, C.charcoal, [0, 0.02, 0]),
    cyl(0.3, 0.04, C.white, [0, 0.5, 0], { rot: [flat, 0, 0], sides: 12 }),
  ],
  /** Runs along a whole desk row, under the monitors; one end sticks out to be pulled. */
  cable_bundle: [box(3.5, 0.03, 0.4, C.charcoal), box(0.14, 0.06, 0.44, C.coral, [-1.72, 0, 0])],

  // --- Decor -------------------------------------------------------------------------------------
  vase: [
    cyl(0.1, 0.16, C.sky, [0, 0, 0], { top: 0.16 }),
    cyl(0.16, 0.08, C.sky, [0, 0.16, 0], { top: 0.08 }),
  ],
  vase_tall: [
    cyl(0.12, 0.3, C.lavender, [0, 0, 0], { top: 0.2 }),
    cyl(0.2, 0.12, C.lavender, [0, 0.3, 0], { top: 0.09 }),
  ],
  celadon_vase: [
    cyl(0.12, 0.14, C.celadon, [0, 0, 0], { top: 0.3 }),
    cyl(0.3, 0.2, C.celadon, [0, 0.14, 0], { top: 0.12 }),
    cyl(0.12, 0.07, C.celadon, [0, 0.34, 0], { top: 0.16 }),
  ],
  pottery_bowl: [cyl(0.1, 0.03, C.clay), cyl(0.12, 0.08, C.celadon, [0, 0.03, 0], { top: 0.24 })],
  plant_small: [cyl(0.1, 0.1, C.clay, [0, 0, 0], { top: 0.14 }), ball(0.18, C.leaf, [0, 0.09, 0])],
  plant_big: [
    cyl(0.2, 0.22, C.white, [0, 0, 0], { top: 0.28 }),
    ball(0.36, C.leaf, [0, 0.2, 0]),
    ball(0.26, C.mint, [0.06, 0.44, 0.02]),
  ],
  frame: [
    box(0.2, 0.26, 0.025, C.wood, [0, 0, 0], [-0.15, 0, 0]),
    box(0.15, 0.2, 0.01, C.sky, [0, 0.03, -0.012], [-0.15, 0, 0]),
  ],
  cushion: [box(0.4, 0.1, 0.4, C.rose)],
  figurine: [
    cyl(0.14, 0.03, C.gold),
    cyl(0.08, 0.12, C.lavender, [0, 0.03, 0], { top: 0.1 }),
    ball(0.12, C.peach, [0, 0.14, 0]),
    cyl(0.1, 0.06, C.coral, [0, 0.24, 0], { top: 0 }),
  ],
  trophy: [
    box(0.16, 0.05, 0.16, C.woodDark),
    cyl(0.04, 0.1, C.gold, [0, 0.05, 0]),
    cyl(0.08, 0.14, C.gold, [0, 0.15, 0], { top: 0.2 }),
  ],
  lucky_cat: [
    cyl(0.2, 0.04, C.red),
    ball(0.24, C.gold, [0, 0.03, 0]),
    ball(0.17, C.gold, [0, 0.21, 0]),
    cyl(0.05, 0.06, C.gold, [-0.05, 0.36, 0], { top: 0 }),
    cyl(0.05, 0.06, C.gold, [0.05, 0.36, 0], { top: 0 }),
    box(0.04, 0.14, 0.04, C.gold, [0.12, 0.2, 0]),
  ],
  award: [
    cyl(0.16, 0.04, C.charcoal),
    cyl(0.03, 0.14, C.gold, [0, 0.04, 0]),
    ball(0.14, C.gold, [0, 0.16, 0]),
    cyl(0.05, 0.08, C.gold, [0, 0.28, 0], { top: 0 }),
  ],
  towel_trophy: [
    cyl(0.18, 0.04, C.woodDark),
    cyl(0.05, 0.12, C.gold, [0, 0.04, 0]),
    ball(0.1, C.gold, [-0.08, 0.16, 0]),
    ball(0.14, C.gold, [0, 0.14, 0]),
    ball(0.1, C.gold, [0.08, 0.16, 0]),
  ],
  lantern: [
    cyl(0.14, 0.03, C.woodDark),
    box(0.16, 0.22, 0.16, C.paper, [0, 0.03, 0]),
    cyl(0.2, 0.04, C.woodDark, [0, 0.25, 0], { top: 0.08, sides: 4 }),
  ],
  makeup_kit: [
    box(0.22, 0.08, 0.14, C.rose),
    box(0.2, 0.14, 0.01, C.sky, [0, 0.08, 0.06], [-0.2, 0, 0]),
  ],
  plush: [
    ball(0.2, C.lavender),
    ball(0.14, C.lavender, [0, 0.16, 0]),
    ball(0.06, C.rose, [-0.06, 0.26, 0]),
    ball(0.06, C.rose, [0.06, 0.26, 0]),
  ],

  // --- Bath --------------------------------------------------------------------------------------
  soap_bottle: [cyl(0.08, 0.16, C.mint), cyl(0.03, 0.05, C.white, [0, 0.16, 0])],
  basin: [cyl(0.24, 0.1, C.sky, [0, 0, 0], { top: 0.34 })],
  bucket: [
    cyl(0.2, 0.22, C.woodLight, [0, 0, 0], { top: 0.26 }),
    box(0.03, 0.05, 0.03, C.woodDark, [0.13, 0.2, 0]),
  ],
  towel_stack: [
    box(0.3, 0.06, 0.22, C.white),
    box(0.3, 0.06, 0.22, C.sky, [0, 0.06, 0]),
    box(0.3, 0.06, 0.22, C.rose, [0, 0.12, 0]),
  ],
  stool: [
    cyl(0.26, 0.04, C.woodLight, [0, 0.2, 0]),
    box(0.04, 0.2, 0.04, C.woodLight, [-0.08, 0, -0.08]),
    box(0.04, 0.2, 0.04, C.woodLight, [0.08, 0, -0.08]),
    box(0.04, 0.2, 0.04, C.woodLight, [-0.08, 0, 0.08]),
    box(0.04, 0.2, 0.04, C.woodLight, [0.08, 0, 0.08]),
  ],
  egg_basket: [
    cyl(0.2, 0.08, C.sand, [0, 0, 0], { top: 0.26 }),
    ball(0.07, C.cream, [-0.04, 0.05, 0]),
    ball(0.07, C.cream, [0.04, 0.05, 0.02]),
    ball(0.07, C.cream, [0, 0.05, -0.05]),
  ],

  // --- Big pieces --------------------------------------------------------------------------------
  /** A free-standing shop shelf, tall and narrow so a row of them falls like dominoes. */
  shelf_unit: [
    box(0.9, 1.3, 0.3, C.white),
    box(0.94, 0.04, 0.34, C.sky, [0, 1.3, 0]),
    box(0.8, 0.02, 0.31, C.sky, [0, 0.45, 0]),
    box(0.8, 0.02, 0.31, C.sky, [0, 0.9, 0]),
  ],
  mat: [box(0.7, 0.02, 0.4, C.peach)],
  tablecloth: [box(0.9, 0.02, 0.9, C.rose), box(0.6, 0.004, 0.6, C.white, [0, 0.02, 0])],
};
