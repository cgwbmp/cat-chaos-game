import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvents } from '../../src/core/events';
import type { ObjectDef } from '../../src/core/types';
import {
  comboMultiplier,
  createRules,
  EXTEND_TIMER_SEC,
  INTRO_SEC,
  starsFor,
  type LevelConfig,
  type LevelState,
  type Rules,
} from '../../src/game/rules';

type Emitted = { [K in keyof GameEvents]: { type: K; event: GameEvents[K] } }[keyof GameEvents];

const cup: ObjectDef = {
  id: 'cup',
  name: 'Cup',
  tier: 'light',
  coins: 10,
  massKg: 0.2,
  material: 'ceramic',
  break: { kind: 'impact', minImpulse: 1 },
  meshNode: 'cup',
};
const statue: ObjectDef = {
  ...cup,
  id: 'statue',
  name: 'Golden Statue',
  tier: 'treasure',
  coins: 1000,
};

const mission: LevelConfig = {
  roomId: 'tiny-studio',
  mode: 'mission',
  breakableCount: 30,
  objects: [cup, statue],
  mission: { timeLimitSec: 90, targetCoins: 1200 },
};
const freeSoul: LevelConfig = { ...mission, mode: 'free-soul', breakableCount: 3 };

let emitted: Emitted[];
let banked: number[];
let states: LevelState[];
let rules: Rules;

function of<K extends keyof GameEvents>(type: K): GameEvents[K][] {
  return emitted
    .filter((entry) => entry.type === type)
    .map((entry) => entry.event as GameEvents[K]);
}

function breakObject(def: ObjectDef = cup, coins = def.coins): void {
  rules.objectBroken({
    objectId: `${def.id}_1`,
    defId: def.id,
    coins,
    isTreasure: def.tier === 'treasure',
    position: { x: 0, y: 0, z: 0 },
  });
}

function play(config: LevelConfig): void {
  rules.load(config);
  rules.advance(INTRO_SEC);
}

beforeEach(() => {
  emitted = [];
  banked = [];
  states = [];
  rules = createRules({
    emit: (type, event) => emitted.push({ type, event } as Emitted),
    bank: (coins) => banked.push(coins),
    stateChanged: (state) => states.push(state),
  });
});

describe('comboMultiplier', () => {
  it('adds 0.25 per chained break and caps at 3x', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(1)).toBe(1.25);
    expect(comboMultiplier(4)).toBe(2);
    expect(comboMultiplier(8)).toBe(3);
    expect(comboMultiplier(50)).toBe(3);
  });
});

describe('starsFor', () => {
  it('gives no stars below the target', () => {
    expect(starsFor('mission', 1199, 1200, false)).toBe(0);
    expect(starsFor('mission', 1199, 1200, true)).toBe(0);
  });

  it('gives 1 star at the target and 2 at 150%', () => {
    expect(starsFor('mission', 1200, 1200, false)).toBe(1);
    expect(starsFor('mission', 1799, 1200, false)).toBe(1);
    expect(starsFor('mission', 1800, 1200, false)).toBe(2);
  });

  it('gives 3 stars for the target plus the treasure, whatever the total', () => {
    expect(starsFor('mission', 1200, 1200, true)).toBe(3);
    expect(starsFor('mission', 5000, 1200, true)).toBe(3);
  });

  it('gives no stars in Free Soul', () => {
    expect(starsFor('free-soul', 99999, 1200, true)).toBe(0);
  });
});

describe('level flow', () => {
  it('starts idle, runs an intro, then plays', () => {
    expect(rules.state).toBe('idle');
    rules.load(mission);
    expect(rules.state).toBe('intro');
    expect(of('level/started')).toEqual([]);

    rules.advance(INTRO_SEC - 0.5);
    expect(rules.state).toBe('intro');
    rules.advance(0.5);
    expect(rules.state).toBe('playing');
    expect(states).toEqual(['intro', 'playing']);
  });

  it('announces a Mission with its time limit and target', () => {
    play(mission);
    expect(of('level/started')).toEqual([
      { roomId: 'tiny-studio', mode: 'mission', timeLimitSec: 90, targetCoins: 1200 },
    ]);
    expect(of('timer/tick')).toEqual([{ remainingSec: 90 }]);
  });

  it('announces Free Soul without a timer or target', () => {
    play(freeSoul);
    expect(of('level/started')).toEqual([{ roomId: 'tiny-studio', mode: 'free-soul' }]);
    rules.advance(500);
    expect(of('timer/tick')).toEqual([]);
    expect(rules.state).toBe('playing');
  });

  it('pauses and resumes; the timer stands still while paused', () => {
    play(mission);
    rules.advance(10);
    rules.setPaused(true);
    expect(rules.state).toBe('paused');
    rules.advance(60);
    rules.setPaused(false);
    expect(rules.state).toBe('playing');
    rules.advance(1);
    expect(of('timer/tick').at(-1)).toEqual({ remainingSec: 79 });
  });

  it('ignores pause requests outside play', () => {
    rules.setPaused(true);
    expect(rules.state).toBe('idle');
    rules.load(mission);
    rules.setPaused(true);
    expect(rules.state).toBe('intro');
  });

  it('quit returns to idle and stops everything', () => {
    play(mission);
    rules.quit();
    expect(rules.state).toBe('idle');
    rules.advance(200);
    breakObject();
    expect(of('level/ended')).toEqual([]);
    expect(of('score/changed')).toEqual([]);
  });

  it('loading again resets the score and the timer', () => {
    play(mission);
    breakObject();
    rules.advance(30);
    play(mission);
    breakObject();
    expect(of('score/changed').at(-1)).toEqual({ coins: 10, delta: 10 });
    expect(of('timer/tick').at(-1)).toEqual({ remainingSec: 90 });
  });
});

describe('timer', () => {
  it('ticks once per second that passes', () => {
    play(mission);
    rules.advance(0.5);
    rules.advance(0.4);
    expect(of('timer/tick')).toEqual([{ remainingSec: 90 }]);
    rules.advance(0.2);
    expect(of('timer/tick').at(-1)).toEqual({ remainingSec: 89 });
    rules.advance(3);
    expect(of('timer/tick').at(-1)).toEqual({ remainingSec: 86 });
  });

  it('plays the door at 10 s left and footsteps at 3 s, once each', () => {
    play(mission);
    rules.advance(79.9);
    expect(of('audio/play')).toEqual([]);
    rules.advance(0.2);
    expect(of('audio/play')).toEqual([{ cue: 'owner_door' }]);
    rules.advance(6);
    expect(of('audio/play')).toEqual([{ cue: 'owner_door' }]);
    rules.advance(1);
    expect(of('audio/play')).toEqual([{ cue: 'owner_door' }, { cue: 'owner_footsteps' }]);
    rules.advance(1);
    expect(of('audio/play')).toHaveLength(2);
  });

  it('ends the Mission when time runs out', () => {
    play(mission);
    rules.advance(89.9);
    expect(rules.state).toBe('playing');
    rules.advance(0.2);
    expect(rules.state).toBe('ended');
    expect(of('timer/tick').at(-1)).toEqual({ remainingSec: 0 });
    expect(of('level/ended')).toHaveLength(1);
  });

  it('a penalty takes time off the Mission timer only while playing', () => {
    rules.load(mission);
    rules.penalize(5);
    rules.advance(INTRO_SEC);
    rules.penalize(5);
    expect(of('timer/tick').at(-1)).toEqual({ remainingSec: 85 });
    rules.penalize(500);
    expect(of('timer/tick').at(-1)).toEqual({ remainingSec: 0 });
    rules.advance(0.1);
    expect(rules.state).toBe('ended');
  });
});

describe('scoring and combo', () => {
  it('a single break scores its coins at 1x', () => {
    play(mission);
    breakObject();
    expect(of('score/changed')).toEqual([{ coins: 10, delta: 10 }]);
    expect(of('combo/changed')).toEqual([{ multiplier: 1, chain: 0 }]);
  });

  it('breaks within 1.5 s of each other chain up', () => {
    play(mission);
    breakObject(cup, 100);
    rules.advance(1.5);
    breakObject(cup, 100);
    rules.advance(1);
    breakObject(cup, 100);
    expect(of('score/changed')).toEqual([
      { coins: 100, delta: 100 },
      { coins: 225, delta: 125 },
      { coins: 375, delta: 150 },
    ]);
    expect(of('combo/changed').at(-1)).toEqual({ multiplier: 1.5, chain: 2 });
  });

  it('a break after more than 1.5 s starts over at 1x', () => {
    play(mission);
    breakObject(cup, 100);
    rules.advance(1.6);
    breakObject(cup, 100);
    expect(of('score/changed').at(-1)).toEqual({ coins: 200, delta: 100 });
  });

  it('announces the combo ending when the window passes', () => {
    play(mission);
    breakObject();
    rules.advance(0.5);
    breakObject();
    rules.advance(1.4);
    expect(of('combo/changed').at(-1)).toEqual({ multiplier: 1.25, chain: 1 });
    rules.advance(0.2);
    expect(of('combo/changed').at(-1)).toEqual({ multiplier: 1, chain: 0 });
  });

  it('caps the multiplier at 3x', () => {
    play(mission);
    for (let index = 0; index < 12; index++) breakObject(cup, 100);
    expect(of('score/changed').at(-1)?.delta).toBe(300);
    expect(of('combo/changed').at(-1)).toEqual({ multiplier: 3, chain: 11 });
  });

  it('rounds coins to whole numbers', () => {
    play(mission);
    breakObject(cup, 5);
    breakObject(cup, 5);
    expect(of('score/changed').at(-1)).toEqual({ coins: 11, delta: 6 });
  });

  it('ignores breaks when no level is running and after it ended', () => {
    breakObject();
    play(mission);
    rules.advance(100);
    breakObject();
    expect(of('score/changed')).toEqual([]);
  });

  it('counts a break during the intro', () => {
    rules.load(mission);
    breakObject();
    expect(of('score/changed')).toEqual([{ coins: 10, delta: 10 }]);
  });
});

describe('results', () => {
  it('reports coins, stars, broken list, best combo, time and treasure', () => {
    play(mission);
    breakObject(cup, 200);
    breakObject(statue);
    rules.advance(100);
    expect(of('level/ended')).toEqual([
      {
        result: {
          roomId: 'tiny-studio',
          mode: 'mission',
          coins: 1450,
          stars: 3,
          broken: [
            { defId: 'cup', name: 'Cup', coins: 200 },
            { defId: 'statue', name: 'Golden Statue', coins: 1250 },
          ],
          bestCombo: 1.25,
          timeSec: 90,
          treasureBroken: true,
        },
      },
    ]);
  });

  it('gives 0 stars when the target is missed', () => {
    play(mission);
    breakObject(cup, 500);
    rules.advance(100);
    expect(of('level/ended')[0]?.result.stars).toBe(0);
  });

  it('banks the coins earned when the level ends', () => {
    play(mission);
    breakObject(cup, 500);
    rules.advance(100);
    expect(banked).toEqual([500]);
  });

  it('uses the def id as the name when the object is not in the room list', () => {
    play(mission);
    breakObject({ ...cup, id: 'mystery' });
    rules.advance(100);
    expect(of('level/ended')[0]?.result.broken).toEqual([
      { defId: 'mystery', name: 'mystery', coins: 10 },
    ]);
  });

  it('Free Soul ends when every breakable is gone', () => {
    play(freeSoul);
    breakObject();
    breakObject();
    expect(rules.state).toBe('playing');
    breakObject();
    expect(rules.state).toBe('ended');
    expect(of('level/ended')[0]?.result).toMatchObject({ mode: 'free-soul', stars: 0, coins: 38 });
  });

  it('a Mission also ends early when nothing is left to break', () => {
    play({ ...mission, breakableCount: 1 });
    rules.advance(20);
    breakObject(statue);
    expect(rules.state).toBe('ended');
    expect(of('level/ended')[0]?.result).toMatchObject({ timeSec: 20, stars: 0 });
  });

  it('ends right after the intro when everything broke during it', () => {
    rules.load(freeSoul);
    breakObject();
    breakObject();
    breakObject();
    expect(rules.state).toBe('intro');
    rules.advance(INTRO_SEC);
    expect(rules.state).toBe('ended');
    expect(of('level/started')).toHaveLength(1);
    expect(of('level/ended')[0]?.result.broken).toHaveLength(3);
  });

  it('closes an open combo when the level ends', () => {
    play(freeSoul);
    breakObject();
    breakObject();
    breakObject();
    expect(of('combo/changed').at(-1)).toEqual({ multiplier: 1, chain: 0 });
  });
});

describe('rewards', () => {
  it('double coins banks the run a second time, once', () => {
    play(mission);
    breakObject(cup, 500);
    rules.advance(100);
    rules.grantReward('double_coins');
    rules.grantReward('double_coins');
    expect(banked).toEqual([500, 500]);
  });

  it('extend timer resumes a timed-out Mission with 30 s, once', () => {
    play(mission);
    breakObject(cup, 500);
    rules.advance(100);
    rules.grantReward('extend_timer');
    expect(rules.state).toBe('playing');
    expect(of('level/started').at(-1)).toMatchObject({ timeLimitSec: EXTEND_TIMER_SEC });

    breakObject(cup, 100);
    rules.advance(EXTEND_TIMER_SEC + 1);
    expect(rules.state).toBe('ended');
    expect(of('level/ended').at(-1)?.result).toMatchObject({ coins: 600, timeSec: 120 });
    // Only the coins earned after the first ending are banked the second time.
    expect(banked).toEqual([500, 100]);

    rules.grantReward('extend_timer');
    expect(rules.state).toBe('ended');
  });

  it('extend timer does nothing when the level ended by clearing the room', () => {
    play({ ...mission, breakableCount: 1 });
    breakObject();
    rules.grantReward('extend_timer');
    expect(rules.state).toBe('ended');
  });

  it('rewards are ignored while the level is running', () => {
    play(mission);
    rules.grantReward('double_coins');
    rules.grantReward('extend_timer');
    expect(banked).toEqual([]);
    expect(of('level/started')).toHaveLength(1);
  });
});
