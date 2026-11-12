// Boot and scene manager: creates the engine, the scene and the services registry, starts every
// system, then loads rooms on request.
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { createAudio } from './audio';
import { startCat } from './cat';
import { createEventBus } from './core/events';
import { createRoomRegistry } from './core/rooms';
import type { Services } from './core/services';
import type { GameMode, RoomDef, RoomModule } from './core/types';
import { startDebug } from './debug';
import { createAssets, createQuality, startRendering } from './engine';
import { startGame } from './game';
import { createInput } from './input';
import './main.css';
import { createPhysics } from './physics';
import { createPlatform } from './platform';
import { createSave } from './save';
import { startUi } from './ui';

type BootState = 'booting' | 'ready' | 'playing' | 'error';

function setState(state: BootState): void {
  document.documentElement.dataset.state = state;
}

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found as T;
}

function createServices(canvas: HTMLCanvasElement): Services {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  // Rooms register themselves: each src/rooms/<room-id>/index.ts default-exports its RoomDef.
  const roomModules = import.meta.glob<RoomDef>('./rooms/*/index.ts', {
    eager: true,
    import: 'default',
  });

  // Factories receive the registry before it is complete; see ServiceFactory.
  const base: Pick<Services, 'bus' | 'scene' | 'rooms'> = {
    bus: createEventBus(),
    scene: { canvas, engine, scene },
    rooms: createRoomRegistry(Object.values(roomModules)),
  };
  const services = base as Services;
  const rest: Omit<Services, keyof typeof base> = {
    save: createSave(services),
    platform: createPlatform(services),
    quality: createQuality(services),
    assets: createAssets(services),
    physics: createPhysics(services),
    audio: createAudio(services),
    input: createInput(services),
  };
  return Object.assign(services, rest);
}

function createLevelLoader(services: Services): void {
  const { bus, rooms, assets, physics, platform } = services;
  let current: { roomId: string; module?: RoomModule } | undefined;
  // Requests run one after another so a load never races an unload.
  let queue: Promise<void> = Promise.resolve();

  function unload(): void {
    if (!current) return;
    current.module?.dispose();
    physics.unloadRoom();
    assets.unloadRoom(current.roomId);
    current = undefined;
  }

  async function load(roomId: string, mode: GameMode): Promise<void> {
    const def = rooms.get(roomId);
    if (!def) throw new Error(`Unknown room '${roomId}'`);
    unload();

    const room = await assets.loadRoom(def, (fraction) => platform.loadingProgress(fraction));
    current = { roomId };
    const breakableCount = physics.loadRoom(room);
    const module = await def.module?.();
    module?.setup({ room, mode, services });
    current.module = module;

    bus.emit('level/loaded', { roomId, mode, breakableCount, objects: room.objects });
  }

  function enqueue(task: () => void | Promise<void>): Promise<void> {
    queue = queue.then(task).catch((error: unknown) => console.error('[level]', error));
    return queue;
  }

  bus.on('level/requested', ({ roomId, mode }) => void enqueue(() => load(roomId, mode)));
  bus.on('level/quit', () => void enqueue(unload));
}

async function boot(): Promise<void> {
  const canvas = element<HTMLCanvasElement>('game');
  const playButton = element<HTMLButtonElement>('play');

  const services = createServices(canvas);
  const { engine, scene } = services.scene;
  if (import.meta.env.DEV) Object.assign(window, { __catChaos: services });

  await services.platform.init();
  await services.physics.init();

  for (const start of [startRendering, startCat, startGame, startUi, startDebug]) {
    start(services);
  }
  createLevelLoader(services);

  window.addEventListener('resize', () => engine.resize());
  engine.runRenderLoop(() => scene.render());

  playButton.textContent = 'Tap to Play';
  playButton.disabled = false;
  setState('ready');

  playButton.addEventListener(
    'click',
    () => {
      // The tap is the user gesture that lets browsers start audio.
      void services.audio.unlock();
      setState('playing');
      // The menus were inert under the boot screen; hand them the keyboard now.
      const ui = element('ui');
      ui.inert = false;
      ui.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    },
    { once: true },
  );
}

boot().catch((error: unknown) => {
  console.error('[boot]', error);
  const message = element<HTMLParagraphElement>('boot-error');
  message.textContent = 'The game could not start. Please try a newer browser.';
  message.hidden = false;
  element<HTMLButtonElement>('play').hidden = true;
  setState('error');
});
