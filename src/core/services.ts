// Service interfaces and the services registry. Each Phase 1 agent implements the interfaces of
// its own folders; until then `src/<area>/stub.ts` stands in.
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { EventBus } from './events';
import type {
  InputAction,
  QualityTier,
  RewardKind,
  RoomAssets,
  RoomDef,
  SaveData,
  Vec3,
} from './types';

/** Babylon engine and the single game scene, created by main.ts. */
export interface SceneService {
  readonly canvas: HTMLCanvasElement;
  readonly engine: AbstractEngine;
  readonly scene: Scene;
}

/** Every room that registers itself through `src/rooms/<room-id>/index.ts`. */
export interface RoomRegistry {
  /** Rooms sorted by `order`. Dev rooms (id starting with '_') only with `includeDev`. */
  list(options?: { includeDev?: boolean }): RoomDef[];
  get(id: string): RoomDef | undefined;
}

export interface PhysicsObjectInfo {
  objectId: string;
  defId: string;
  /** Center of the object. */
  position: Vec3;
  /** Half of the object's height as it stands now, so callers can tell a tall lamp from a cup. */
  halfHeight: number;
}

export interface PhysicsService {
  /** Loads the Havok WASM and enables physics on the scene. Called once at boot. */
  init(): Promise<void>;
  /**
   * Creates bodies for a loaded room: a breakable for each mesh whose `obj` extra matches an
   * ObjectDef, a static collider for every other mesh. Returns the number of breakables.
   */
  loadRoom(room: RoomAssets): number;
  unloadRoom(): void;
  /** Applies an impulse (N·s) to a breakable, at a world point or its center. Emits `object/hit`. */
  applyImpulse(objectId: string, impulse: Vec3, at?: Vec3): void;
  /** Unbroken breakables whose center is within `radius` meters of `center` (swat, pounce). */
  objectsInRadius(center: Vec3, radius: number): PhysicsObjectInfo[];
  /** Breaks every object whose break rule is `{ kind: 'trigger', triggerId }`. */
  fireTrigger(triggerId: string): void;
  remainingBreakables(): number;
  /** Dynamic bodies that are currently awake. */
  awakeBodyCount(): number;
}

export interface AssetService {
  /**
   * Loads a room: geometry from `def.builder` when set, else from `def.glb`, plus the validated
   * `def.objectsJson`. `onProgress` receives 0..1.
   */
  loadRoom(def: RoomDef, onProgress?: (fraction: number) => void): Promise<RoomAssets>;
  /** Disposes everything loaded for the room. */
  unloadRoom(roomId: string): void;
  /** Loads a shared .glb (cat, common props), cached by URL. Returns a new instance root. */
  loadModel(url: string): Promise<TransformNode>;
}

export interface AudioService {
  /** Resumes the audio context. Must be called from a user gesture (the "Tap to Play" tap). */
  unlock(): Promise<void>;
  /** Plays a sound bank cue; same as emitting `audio/play`. */
  play(cue: string, options?: { position?: Vec3; volume?: number }): void;
  playMusic(track: string, options?: { fadeSec?: number }): void;
  stopMusic(fadeSec?: number): void;
  /** Volume 0..1 per bus. */
  setVolume(bus: 'music' | 'sfx', volume: number): void;
}

export interface SaveService {
  get(): Readonly<SaveData>;
  /** Applies a change and persists it. Returns the new data. */
  update(change: (draft: SaveData) => void): Readonly<SaveData>;
  reset(): void;
}

export type PlatformId = 'none' | 'poki' | 'crazygames';

export interface PlatformService {
  readonly id: PlatformId;
  init(): Promise<void>;
  /** Loading progress 0..1; 1 means the game is ready to play. */
  loadingProgress(fraction: number): void;
  gameplayStart(): void;
  gameplayStop(): void;
  /** Shows a rewarded ad. Resolves true when the reward was earned (always false on `none`). */
  showRewardedAd(reward: RewardKind): Promise<boolean>;
}

export interface QualitySettings {
  resolutionScale: number; // 1 = native
  shadows: boolean;
  postEffects: boolean;
  debrisCap: number;
}

export interface QualityService {
  readonly tier: QualityTier;
  readonly settings: QualitySettings;
  /** Emits `quality/changed`. */
  setTier(tier: QualityTier): void;
  /** Runs the 2 s benchmark, applies and returns the tier it picked. */
  autoDetect(): Promise<QualityTier>;
}

export interface InputService {
  /** Movement axis, each component in -1..1: x = right, y = forward. Length is at most 1. */
  getMove(): { x: number; y: number };
  isPressed(action: InputAction): boolean;
  /** Disabled input reports no movement and emits no `input/action` (menus, pause). */
  setEnabled(enabled: boolean): void;
}

/**
 * The services registry, built once by main.ts. The spec lists `bus` to `quality`; `input` and
 * `rooms` are needed by the Phase 1 briefs (B replaces the input stub; UI lists rooms).
 */
export interface Services {
  bus: EventBus;
  scene: SceneService;
  physics: PhysicsService;
  assets: AssetService;
  audio: AudioService;
  save: SaveService;
  platform: PlatformService;
  quality: QualityService;
  input: InputService;
  rooms: RoomRegistry;
}

/**
 * Creates a service. The registry is still being filled when a factory runs: keep the reference
 * and read other services only after boot (inside methods), never in the factory body.
 */
export type ServiceFactory<T> = (services: Services) => T;

/** A system without a service interface (game rules, UI, cat, rendering, debug). */
export interface System {
  dispose(): void;
}

/** Starts a system once every service is ready. Exported by `src/<area>/index.ts`. */
export type SystemFactory = (services: Services) => System;
