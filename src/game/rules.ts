// Game rules, free of rendering: level state machine, scoring, combo, timer, stars and the
// owner events. Driven by `load`, `advance`, `objectBroken` and friends; talks back through
// `emit` (the event bus) and a few hooks.
import type { GameEvents } from '../core/events';
import type { BrokenObject, GameMode, LevelResult, ObjectDef, RewardKind } from '../core/types';

export const INTRO_SEC = 1.5;
export const COMBO_WINDOW_SEC = 1.5;
export const COMBO_STEP = 0.25;
export const MAX_MULTIPLIER = 3;
export const OWNER_DOOR_SEC = 10; // door sound when this much time is left
export const OWNER_FOOTSTEPS_SEC = 3;
export const EXTEND_TIMER_SEC = 30;
export const TWO_STAR_FACTOR = 1.5;

export type LevelState = 'idle' | 'intro' | 'playing' | 'paused' | 'ended';

export interface LevelConfig {
  roomId: string;
  mode: GameMode;
  breakableCount: number;
  objects: ObjectDef[];
  mission: { timeLimitSec: number; targetCoins: number };
}

export interface RulesHooks {
  emit<K extends keyof GameEvents>(type: K, event: GameEvents[K]): void;
  /** Coins to add to the player's spendable total. */
  bank(coins: number): void;
  stateChanged?(state: LevelState): void;
}

export interface Rules {
  readonly state: LevelState;
  load(config: LevelConfig): void;
  advance(dt: number): void;
  objectBroken(event: GameEvents['object/broken']): void;
  setPaused(paused: boolean): void;
  /** Takes time off the mission timer (the dorm robot vacuum bumping into the cat). */
  penalize(seconds: number): void;
  grantReward(reward: RewardKind): void;
  quit(): void;
}

/** Multiplier for a chain: 1 + 0.25 per chained break, capped at 3x. */
export function comboMultiplier(chain: number): number {
  return Math.min(MAX_MULTIPLIER, 1 + COMBO_STEP * chain);
}

/**
 * Mission stars: 1 for reaching the target, 2 for 150% of it, 3 for the target plus the room's
 * treasure. Free Soul has no stars.
 */
export function starsFor(
  mode: GameMode,
  coins: number,
  targetCoins: number,
  treasureBroken: boolean,
): 0 | 1 | 2 | 3 {
  if (mode !== 'mission' || coins < targetCoins) return 0;
  if (treasureBroken) return 3;
  return coins >= targetCoins * TWO_STAR_FACTOR ? 2 : 1;
}

export function createRules(hooks: RulesHooks): Rules {
  let state: LevelState = 'idle';
  let config: LevelConfig | undefined;
  let names = new Map<string, string>();

  let introLeft = 0;
  let elapsed = 0; // seconds played
  let remaining = 0; // mission timer
  let lastTick = -1;
  let doorPlayed = false;
  let footstepsPlayed = false;

  let coins = 0;
  let broken: BrokenObject[] = [];
  let brokenCount = 0;
  let treasureBroken = false;
  let chain = 0;
  let lastBreakAt = -Infinity;
  let bestCombo = 1;

  let timedOut = false;
  let banked = 0;
  let extended = false;
  let doubled = false;

  function setState(next: LevelState): void {
    if (next === state) return;
    state = next;
    hooks.stateChanged?.(state);
  }

  function tick(): void {
    const shown = Math.max(0, Math.ceil(remaining));
    if (shown === lastTick) return;
    lastTick = shown;
    hooks.emit('timer/tick', { remainingSec: shown });
  }

  function start(): void {
    if (!config) return;
    setState('playing');
    const { roomId, mode, mission } = config;
    hooks.emit(
      'level/started',
      mode === 'mission'
        ? { roomId, mode, timeLimitSec: remaining, targetCoins: mission.targetCoins }
        : { roomId, mode },
    );
    if (mode === 'mission') {
      lastTick = -1;
      tick();
    }
    // Everything can already be broken when the intro ends (objects that fell on their own).
    if (brokenCount >= config.breakableCount) end();
  }

  function end(): void {
    if (!config) return;
    setState('ended');
    if (chain > 0) {
      chain = 0;
      hooks.emit('combo/changed', { multiplier: 1, chain: 0 });
    }
    const result: LevelResult = {
      roomId: config.roomId,
      mode: config.mode,
      coins,
      stars: starsFor(config.mode, coins, config.mission.targetCoins, treasureBroken),
      broken: [...broken],
      bestCombo,
      timeSec: elapsed,
      treasureBroken,
    };
    // After an extended timer only the coins earned since the first ending are new.
    hooks.bank(coins - banked);
    banked = coins;
    hooks.emit('level/ended', { result });
  }

  return {
    get state() {
      return state;
    },

    load(next) {
      config = next;
      names = new Map(next.objects.map((def) => [def.id, def.name]));
      introLeft = INTRO_SEC;
      elapsed = 0;
      remaining = next.mission.timeLimitSec;
      lastTick = -1;
      doorPlayed = false;
      footstepsPlayed = false;
      coins = 0;
      broken = [];
      brokenCount = 0;
      treasureBroken = false;
      chain = 0;
      lastBreakAt = -Infinity;
      bestCombo = 1;
      timedOut = false;
      banked = 0;
      extended = false;
      doubled = false;
      state = 'idle'; // so that a reload of the same state still notifies
      setState('intro');
    },

    advance(dt) {
      if (!config) return;
      if (state === 'intro') {
        introLeft -= dt;
        if (introLeft <= 0) start();
        return;
      }
      if (state !== 'playing') return;

      // A long frame must not count time past the end of the Mission.
      elapsed += config.mode === 'mission' ? Math.min(dt, Math.max(0, remaining)) : dt;
      if (chain > 0 && elapsed - lastBreakAt > COMBO_WINDOW_SEC) {
        chain = 0;
        hooks.emit('combo/changed', { multiplier: 1, chain: 0 });
      }
      if (config.mode !== 'mission') return;

      remaining -= dt;
      tick();
      // The owner is coming home.
      if (!doorPlayed && remaining <= OWNER_DOOR_SEC) {
        doorPlayed = true;
        hooks.emit('audio/play', { cue: 'owner_door' });
      }
      if (!footstepsPlayed && remaining <= OWNER_FOOTSTEPS_SEC) {
        footstepsPlayed = true;
        hooks.emit('audio/play', { cue: 'owner_footsteps' });
      }
      if (remaining <= 0) {
        timedOut = true;
        end();
      }
    },

    objectBroken(event) {
      if (!config || (state !== 'intro' && state !== 'playing' && state !== 'paused')) return;
      brokenCount++;
      if (event.isTreasure) treasureBroken = true;

      chain = elapsed - lastBreakAt <= COMBO_WINDOW_SEC ? chain + 1 : 0;
      lastBreakAt = elapsed;
      const multiplier = comboMultiplier(chain);
      bestCombo = Math.max(bestCombo, multiplier);
      const delta = Math.round(event.coins * multiplier);
      coins += delta;
      broken.push({
        defId: event.defId,
        name: names.get(event.defId) ?? event.defId,
        coins: delta,
      });

      hooks.emit('combo/changed', { multiplier, chain });
      hooks.emit('score/changed', { coins, delta });
      // Nothing left to break ends both modes.
      if (brokenCount >= config.breakableCount && state !== 'intro') end();
    },

    setPaused(paused) {
      if (paused && state === 'playing') setState('paused');
      else if (!paused && state === 'paused') setState('playing');
    },

    penalize(seconds) {
      if (state !== 'playing' || config?.mode !== 'mission') return;
      remaining = Math.max(0, remaining - seconds);
      tick();
    },

    grantReward(reward) {
      if (!config || state !== 'ended') return;
      if (reward === 'double_coins' && !doubled) {
        doubled = true;
        hooks.bank(coins);
      }
      if (reward === 'extend_timer' && timedOut && !extended) {
        extended = true;
        timedOut = false;
        remaining = EXTEND_TIMER_SEC;
        doorPlayed = false;
        footstepsPlayed = false;
        start();
      }
    },

    quit() {
      config = undefined;
      setState('idle');
    },
  };
}
