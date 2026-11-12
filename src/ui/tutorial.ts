// First-run hints: move, jump, swat, pounce, zoomies. Each hint stays until the player does the
// action; after the last one `tutorialDone` is saved and the hints never show again.
import type { Services } from '../core/services';
import type { CatAction } from '../core/types';
import { h } from './dom';

interface Hint {
  /** Done when the cat reports this action; `move` is done when the player steers. */
  action: CatAction | 'move';
  keyboard: string;
  touch: string;
}

const HINTS: readonly Hint[] = [
  {
    action: 'move',
    keyboard: 'Move with WASD or the arrow keys',
    touch: 'Drag on the left to move',
  },
  {
    action: 'jump',
    keyboard: 'Press Space to jump. Hold it to jump higher',
    touch: 'Tap Jump. Hold it to jump higher',
  },
  {
    action: 'swat',
    keyboard: 'Press J next to something to swat it',
    touch: 'Tap Swat next to something',
  },
  { action: 'pounce', keyboard: 'Press K to pounce', touch: 'Tap Swat in the air to pounce' },
  {
    action: 'zoomies',
    keyboard: 'Press Shift for a burst of zoomies',
    touch: 'Tap Zoom for a burst of speed',
  },
];

export interface Tutorial {
  readonly element: HTMLElement;
  /** Starts the hints if they have not been completed yet. */
  start(): void;
  stop(): void;
  /** Call every frame while a level is running. */
  update(): void;
  dispose(): void;
}

export function createTutorial(services: Services): Tutorial {
  const element = h('div', { class: 'tutorial', role: 'status', hidden: true });
  const touch = window.matchMedia('(pointer: coarse)').matches;
  let index = -1; // -1 = not running

  function show(): void {
    const hint = HINTS[index];
    if (!hint) {
      index = -1;
      element.hidden = true;
      services.save.update((data) => {
        data.tutorialDone = true;
      });
      return;
    }
    element.textContent = touch ? hint.touch : hint.keyboard;
    element.hidden = false;
  }

  function complete(action: Hint['action']): void {
    if (index === -1 || HINTS[index]?.action !== action) return;
    index++;
    show();
  }

  const off = services.bus.on('cat/action', ({ action }) => complete(action));

  return {
    element,
    start() {
      if (services.save.get().tutorialDone) return;
      index = 0;
      show();
    },
    stop() {
      index = -1;
      element.hidden = true;
    },
    update() {
      if (index === -1 || HINTS[index]?.action !== 'move') return;
      const { x, y } = services.input.getMove();
      if (x !== 0 || y !== 0) complete('move');
    },
    dispose() {
      off();
      element.remove();
    },
  };
}
