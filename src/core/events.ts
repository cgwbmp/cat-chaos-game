// Typed event bus. Systems communicate through it, never by direct calls across folders.
import type {
  CatAction,
  GameMode,
  InputAction,
  LevelResult,
  ObjectDef,
  QualityTier,
  RewardKind,
  SaveData,
  Vec3,
} from './types';

/** `objectId` is the unique runtime id of a breakable: its mesh name in the room. */
export type GameEvents = {
  // From SPEC.md › Core contracts. `level/loaded` also carries the room's breakables so that
  // event-only systems (game rules, UI) can count them and show their names.
  'level/loaded': { roomId: string; mode: GameMode; breakableCount: number; objects: ObjectDef[] };
  'level/started': { roomId: string; mode: GameMode; timeLimitSec?: number; targetCoins?: number };
  'level/ended': { result: LevelResult };
  'object/hit': { objectId: string; force: number };
  'object/broken': {
    objectId: string;
    defId: string;
    coins: number;
    isTreasure: boolean;
    position: Vec3;
    /** `objectId` of the breakable that knocked this one into breaking (chain causality). */
    causedBy?: string;
  };
  'combo/changed': { multiplier: number; chain: number };
  'score/changed': { coins: number; delta: number };
  'timer/tick': { remainingSec: number };
  'cat/action': { action: CatAction; position: Vec3 };
  'input/action': { action: InputAction; pressed: boolean };
  'game/paused': { paused: boolean };
  'audio/play': { cue: string; position?: Vec3; volume?: number };

  // Additions the spec implies but does not list.
  /** UI asks main.ts to load a room and start a level. */
  'level/requested': { roomId: string; mode: GameMode };
  /** UI asks main.ts to unload the current room (back to menus). */
  'level/quit': Record<string, never>;
  'settings/changed': { settings: SaveData['settings'] };
  'quality/changed': { tier: QualityTier };
  /** A rewarded ad finished; game rules apply the reward. */
  'reward/granted': { reward: RewardKind };
  /** Juice helpers (rendering). `intensity` is 0..1. */
  'juice/shake': { intensity: number; durationMs: number };
  'juice/hitPause': { durationMs: number };
  /** Squash and stretch on a scene node, e.g. the cat root or a breakable's `objectId`. */
  'juice/squash': { nodeName: string; amount: number };
  /**
   * Walker behavior (game rules): a room module asks for an NPC that patrols the waypoints in
   * a loop. Walkers are removed when the room unloads.
   */
  'walker/patrol': { id: string; waypoints: Vec3[]; speed: number; pauseSec?: number };
  /** A walker caught the cat. In a Mission this costs `penaltySec` on the timer. */
  'walker/caught': { id: string; position: Vec3; penaltySec: number };
};

export interface EventBus {
  on<K extends keyof GameEvents>(type: K, fn: (e: GameEvents[K]) => void): () => void;
  emit<K extends keyof GameEvents>(type: K, e: GameEvents[K]): void;
}

type Listener<K extends keyof GameEvents> = (e: GameEvents[K]) => void;

/**
 * Listeners run synchronously in subscription order. A listener that throws is reported with
 * `console.error` and does not stop the others. Unsubscribing during an emit is safe.
 */
export function createEventBus(): EventBus {
  // Each list only ever holds listeners for its own key; `never` lets one map store them all.
  const listeners = new Map<keyof GameEvents, Array<(e: never) => void>>();

  return {
    on<K extends keyof GameEvents>(type: K, fn: Listener<K>) {
      let list = listeners.get(type);
      if (!list) listeners.set(type, (list = []));
      list.push(fn);
      return () => {
        const index = list.indexOf(fn);
        if (index !== -1) list.splice(index, 1);
      };
    },
    emit<K extends keyof GameEvents>(type: K, e: GameEvents[K]) {
      for (const fn of [...(listeners.get(type) ?? [])]) {
        try {
          (fn as Listener<K>)(e);
        } catch (error) {
          console.error(`[bus] listener for '${type}' threw`, error);
        }
      }
    },
  };
}
