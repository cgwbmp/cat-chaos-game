// Debug overlay: FPS, draw calls, awake physics bodies and quality tier, plus cheats: physics
// body view, coins, unlock all rooms and room jump. Toggle with the backtick key or a
// three-finger tap.
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import type { PhysicsViewer } from '@babylonjs/core/Debug/physicsViewer';
import type { SystemFactory } from '../core/services';
import type { GameMode } from '../core/types';
import './overlay.css';

const REFRESH_MS = 250;

export const startDebug: SystemFactory = (services) => {
  const { engine, scene } = services.scene;
  const instrumentation = new SceneInstrumentation(scene);

  const overlay = document.createElement('div');
  overlay.id = 'debug-overlay';
  overlay.hidden = true;
  const stats = document.createElement('pre');
  const controls = document.createElement('div');
  controls.className = 'debug-controls';
  overlay.append(stats, controls);
  document.body.append(overlay);

  function button(label: string, onClick: () => void): HTMLButtonElement {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.addEventListener('click', onClick);
    controls.append(element);
    return element;
  }

  // Physics body view, loaded on first use.
  let viewer: PhysicsViewer | undefined;
  async function toggleBodies(): Promise<void> {
    if (viewer) {
      viewer.dispose();
      viewer = undefined;
      return;
    }
    const { PhysicsViewer } = await import('@babylonjs/core/Debug/physicsViewer');
    viewer = new PhysicsViewer(scene);
    for (const node of [...scene.meshes, ...scene.transformNodes]) {
      if (node.physicsBody) viewer.showBody(node.physicsBody);
    }
  }
  button('Bodies', () => void toggleBodies());

  button('+1000 coins', () => {
    services.save.update((data) => {
      data.totalCoins += 1000;
    });
  });
  button('Unlock all', () => {
    services.save.update((data) => {
      for (const room of services.rooms.list()) {
        const entry = (data.rooms[room.id] ??= { bestCoins: 0, stars: 0, freeSoulCleared: false });
        entry.stars = 3;
      }
    });
  });

  // Room jump.
  const roomSelect = document.createElement('select');
  for (const room of services.rooms.list({ includeDev: true })) {
    roomSelect.add(new Option(room.name, room.id));
  }
  const modeSelect = document.createElement('select');
  modeSelect.add(new Option('Mission', 'mission'));
  modeSelect.add(new Option('Free Soul', 'free-soul'));
  controls.append(roomSelect, modeSelect);
  button('Go', () => {
    services.bus.emit('level/requested', {
      roomId: roomSelect.value,
      mode: modeSelect.value as GameMode,
    });
  });

  function refresh(): void {
    stats.textContent = [
      `FPS         ${engine.getFps().toFixed(0)}`,
      `Draw calls  ${instrumentation.drawCallsCounter.current}`,
      `Bodies      ${services.physics.awakeBodyCount()}`,
      `Quality     ${services.quality.tier}`,
    ].join('\n');
  }

  let timer: number | undefined;
  function toggle(): void {
    overlay.hidden = !overlay.hidden;
    window.clearInterval(timer);
    if (!overlay.hidden) {
      refresh();
      timer = window.setInterval(refresh, REFRESH_MS);
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Backquote' && !event.repeat) toggle();
  }
  function onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 3) toggle();
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('touchstart', onTouchStart);

  return {
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.clearInterval(timer);
      viewer?.dispose();
      instrumentation.dispose();
      overlay.remove();
    },
  };
};
