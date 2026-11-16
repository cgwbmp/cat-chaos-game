// Entry point read by main.ts: wires the rules to the event bus, the frame clock and the save.
import type { SystemFactory } from '../core/services';
import type { GameMode } from '../core/types';
import { createRules } from './rules';
import {
  BUMP_COOLDOWN_SEC,
  CATCH_COOLDOWN_SEC,
  CATCH_PENALTY_SEC,
  catches,
  createPatrol,
  type Patrol,
} from './walker';
import { createWalkerView, type WalkerView } from './walker-view';

export const startGame: SystemFactory = (services) => {
  const { bus, save, input, platform } = services;
  const { scene, engine } = services.scene;
  let currentRoom: string | undefined;
  let mode: GameMode = 'mission';

  const rules = createRules({
    emit: (type, event) => bus.emit(type, event),
    bank(coins) {
      if (coins <= 0) return;
      save.update((data) => {
        data.totalCoins += coins;
      });
    },
    stateChanged(state) {
      input.setEnabled(state === 'playing');
      if (state === 'playing') platform.gameplayStart();
      else platform.gameplayStop();
    },
  });

  // Walkers: NPCs a room module asks for with `walker/patrol`.
  const walkers = new Map<
    string,
    { patrol: Patrol; view: WalkerView; cooldown: number; bumpCooldown: number }
  >();
  function clearWalkers(): void {
    for (const { view } of walkers.values()) view.dispose();
    walkers.clear();
  }

  function advanceWalkers(dt: number): void {
    if (rules.state !== 'playing') return;
    const cat = scene.getTransformNodeByName('cat');
    for (const [id, walker] of walkers) {
      const pose = walker.patrol.advance(dt);
      walker.view.moveTo(pose);
      walker.cooldown -= dt;
      walker.bumpCooldown -= dt;
      if (!cat?.isEnabled() || walker.bumpCooldown > 0 || !catches(pose, cat.position)) continue;
      walker.bumpCooldown = BUMP_COOLDOWN_SEC;
      // Every touch bumps the cat away; only the first one in a while costs time.
      const fresh = walker.cooldown <= 0;
      const penaltySec = fresh && mode === 'mission' ? CATCH_PENALTY_SEC : 0;
      const { x, y, z } = cat.position;
      if (fresh) {
        walker.cooldown = CATCH_COOLDOWN_SEC;
        rules.penalize(penaltySec);
      }
      bus.emit('walker/caught', { id, position: { x, y, z }, penaltySec });
      if (!fresh) continue;
      bus.emit('audio/play', { cue: 'lose', position: { x, y, z } });
      bus.emit('juice/shake', { intensity: 0.4, durationMs: 250 });
    }
  }

  // QA aid: `?timescale=10` runs the level clock ten times faster (physics is unaffected), so
  // a test can reach the results screen in seconds.
  const timescale = Math.max(1, Number(new URLSearchParams(location.search).get('timescale')) || 1);

  const beforeRender = scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1);
    rules.advance(dt * timescale);
    advanceWalkers(dt);
  });

  const unsubscribe = [
    bus.on('level/loaded', (event) => {
      const { roomId, breakableCount, objects } = event;
      const room = services.rooms.get(roomId);
      if (!room) return;
      currentRoom = roomId;
      mode = event.mode;
      rules.load({ roomId, mode, breakableCount, objects, mission: room.mission });
    }),
    bus.on('object/broken', (event) => rules.objectBroken(event)),
    bus.on('game/paused', ({ paused }) => rules.setPaused(paused)),
    bus.on('reward/granted', ({ reward }) => rules.grantReward(reward)),
    bus.on('level/quit', () => {
      currentRoom = undefined;
      rules.quit();
      clearWalkers();
    }),
    // A room module asks for its walkers while the room loads, before `level/loaded`.
    bus.on('level/requested', clearWalkers),
    bus.on('walker/patrol', ({ id, waypoints, speed, pauseSec }) => {
      walkers.get(id)?.view.dispose();
      const patrol = createPatrol(waypoints, speed, pauseSec);
      const view = createWalkerView(scene, id, patrol.pose);
      walkers.set(id, { patrol, view, cooldown: 0, bumpCooldown: 0 });
    }),
    bus.on('input/action', ({ action, pressed }) => {
      if (action === 'pause' && pressed && rules.state === 'playing') {
        bus.emit('game/paused', { paused: true });
      }
    }),
    bus.on('level/ended', ({ result }) => {
      if (result.roomId !== currentRoom) return;
      save.update((data) => {
        const room = (data.rooms[result.roomId] ??= {
          bestCoins: 0,
          stars: 0,
          freeSoulCleared: false,
        });
        room.bestCoins = Math.max(room.bestCoins, result.coins);
        if (result.stars > room.stars) room.stars = result.stars;
        if (result.mode === 'free-soul') room.freeSoulCleared = true;
      });
    }),
  ];
  input.setEnabled(false); // menus first

  return {
    dispose() {
      for (const off of unsubscribe) off();
      scene.onBeforeRenderObservable.remove(beforeRender);
      clearWalkers();
    },
  };
};
