// Shared data contracts. Frozen after Phase 0 (tag contracts-v1); see AGENTS.md rule 2.
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { Services } from './services';

/** World-space vector in meters, Y up. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type GameMode = 'mission' | 'free-soul';

/** Cat abilities announced on `cat/action`. */
export type CatAction = 'jump' | 'land' | 'swat' | 'pounce' | 'push' | 'zoomies';

/** Button-style inputs announced on `input/action`. Movement is read from `InputService.getMove()`. */
export type InputAction = 'jump' | 'swat' | 'pounce' | 'zoomies' | 'pause';

export type QualityTier = 'low' | 'medium' | 'high';

export type RewardKind = 'extend_timer' | 'double_coins';

// --- Objects ---------------------------------------------------------------------------------

export type Material =
  'ceramic' | 'glass' | 'wood' | 'plastic' | 'paper' | 'metal' | 'fabric' | 'electronic';

export type BreakRule =
  | { kind: 'impact'; minImpulse: number } // breaks when it lands hard enough
  | { kind: 'hits'; count: number } // breaks after N swats
  | { kind: 'fall'; minHeightM: number } // breaks if it falls from this height
  | { kind: 'trigger'; triggerId: string }; // breaks via a special interaction

export type ObjectTier = 'light' | 'medium' | 'heavy' | 'trick' | 'treasure';

export type ObjectSpecial = 'tablecloth' | 'stack' | 'rolling' | 'liquid' | 'electronic_spark';

/** One entry of `src/rooms/<room-id>/objects.json` or `assets/shared/objects.json`. */
export interface ObjectDef {
  id: string; // 'vase_tall'
  name: string; // 'Tall Vase' (English, shown in results)
  tier: ObjectTier;
  coins: number;
  massKg: number;
  material: Material;
  break: BreakRule;
  meshNode: string; // node name in the room .glb
  fractureSet?: string; // pre-fractured pieces node, else generic shards
  special?: ObjectSpecial;
}

// --- Rooms -----------------------------------------------------------------------------------

/** Marker names carried in glTF extras `{ "marker": ... }`. */
export type MarkerKind = 'cat_spawn' | 'camera_bounds' | 'owner_door' | `trigger:${string}`;

/**
 * glTF extras the game reads from room nodes (Babylon exposes them at
 * `node.metadata.gltf.extras`; use `readExtras` from `./extras`).
 */
export interface NodeExtras {
  obj?: string; // ObjectDef.id, on each breakable mesh
  marker?: MarkerKind;
}

/** Builds room geometry in code instead of loading a .glb (graybox and tests). Returns the room root. */
export type RoomBuilder = (scene: Scene) => TransformNode;

/** Time of day a room is lit for. `day` is the neutral look. */
export type LightingMood = 'day' | 'sunrise' | 'sunset' | 'night';

/** Lamps and lanterns give `warm` light, screens and fridges `cool` light. */
export type LightTone = 'warm' | 'cool';

/** How rendering lights a room. Lamps are off in the `day` mood. */
export interface RoomLighting {
  mood: LightingMood;
  /** ObjectDef ids that shine, with the tone of their light. One goes dark when it breaks. */
  lamps?: Record<string, LightTone>;
  /** Fixed lights that cannot break (wall lamps, a glowing fridge): where the light comes from. */
  fixtures?: { at: Vec3; tone: LightTone }[];
}

export interface RoomDef {
  id: string; // 'tiny-studio'; ids starting with '_' are dev rooms hidden from level select
  name: string; // 'Tiny Studio Apartment'
  order: number; // position in level select
  glb: string; // URL of room.glb
  objectsJson: string; // URL of objects.json
  mission: { timeLimitSec: number; targetCoins: number };
  unlock: { requiresStars: number };
  music: string;
  ambience?: string;
  lighting?: RoomLighting; // time of day and lamps; neutral daylight when left out
  module?: () => Promise<RoomModule>; // optional custom logic, lazy loaded
  builder?: () => Promise<RoomBuilder>; // code-built geometry used instead of `glb`, lazy loaded
}

export interface RoomMarker {
  marker: MarkerKind;
  node: TransformNode;
}

/** A room after `AssetService.loadRoom`. */
export interface RoomAssets {
  def: RoomDef;
  root: TransformNode;
  /** Every mesh under `root` except markers. Meshes without an `obj` extra are static geometry. */
  meshes: AbstractMesh[];
  /** Validated contents of `def.objectsJson`. */
  objects: ObjectDef[];
  /** Marker nodes; the asset service disables them so they neither render nor collide. */
  markers: RoomMarker[];
}

export interface RoomContext {
  room: RoomAssets;
  mode: GameMode;
  services: Services;
}

export interface RoomModule {
  setup(ctx: RoomContext): void; // register triggers, scripted gags
  dispose(): void;
}

// --- Level results ---------------------------------------------------------------------------

export interface BrokenObject {
  defId: string;
  name: string;
  coins: number; // coins awarded for this break, combo multiplier included
}

export interface LevelResult {
  roomId: string;
  mode: GameMode;
  coins: number;
  stars: 0 | 1 | 2 | 3;
  broken: BrokenObject[]; // in break order
  bestCombo: number; // highest combo multiplier reached
  timeSec: number; // time played
  treasureBroken: boolean;
}

// --- Save ------------------------------------------------------------------------------------

export interface SaveData {
  version: 1;
  rooms: Record<string, { bestCoins: number; stars: 0 | 1 | 2 | 3; freeSoulCleared: boolean }>;
  totalCoins: number; // spendable on cosmetics
  cosmetics: { owned: string[]; equipped: { hat?: string; collar?: string; fur?: string } };
  settings: { music: number; sfx: number; quality: 'low' | 'medium' | 'high'; haptics: boolean };
  tutorialDone?: boolean; // the first-run hints have been shown
}
