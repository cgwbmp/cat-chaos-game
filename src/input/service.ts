// Input service: keyboard (WASD/arrows, Space jump, J swat, K pounce, Shift zoomies, Esc or P
// pause) and touch (floating joystick plus Swat, Jump and Zoomies buttons).
import type { InputService, ServiceFactory } from '../core/services';
import type { InputAction } from '../core/types';
import { createTouchControls } from './touch';

const ACTION_KEYS: Record<string, InputAction> = {
  Space: 'jump',
  KeyJ: 'swat',
  KeyK: 'pounce',
  ShiftLeft: 'zoomies',
  ShiftRight: 'zoomies',
  Escape: 'pause',
  KeyP: 'pause',
};

const MOVE_KEYS: Record<string, { x: number; y: number }> = {
  KeyW: { x: 0, y: 1 },
  ArrowUp: { x: 0, y: 1 },
  KeyS: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: -1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export const createInputService: ServiceFactory<InputService> = (services) => {
  const keysDown = new Set<string>();
  // How many sources (keys, touch buttons) currently hold each action.
  const held = new Map<InputAction, number>();
  let enabled = true;

  function setAction(action: InputAction, pressed: boolean): void {
    const before = held.get(action) ?? 0;
    const after = Math.max(0, before + (pressed ? 1 : -1));
    held.set(action, after);
    // Emit only on the first press and the last release.
    if (before === 0 && after === 1) services.bus.emit('input/action', { action, pressed: true });
    if (before === 1 && after === 0) services.bus.emit('input/action', { action, pressed: false });
  }

  function releaseAll(): void {
    keysDown.clear();
    for (const [action, count] of held) {
      if (count > 0) {
        held.set(action, 0);
        services.bus.emit('input/action', { action, pressed: false });
      }
    }
  }

  const touch = createTouchControls((action, pressed) => {
    if (enabled) setAction(action, pressed);
  });

  window.addEventListener('keydown', (event) => {
    if (!enabled || event.repeat || isTyping(event.target) || keysDown.has(event.code)) return;
    const action = ACTION_KEYS[event.code];
    if (!action && !MOVE_KEYS[event.code]) return;
    event.preventDefault(); // no page scroll on Space and arrows
    keysDown.add(event.code);
    if (action) setAction(action, true);
  });
  window.addEventListener('keyup', (event) => {
    if (!keysDown.delete(event.code)) return;
    const action = ACTION_KEYS[event.code];
    if (action) setAction(action, false);
  });
  window.addEventListener('blur', releaseAll);

  // A touch on the game (the canvas or the touch controls) is the game's alone: the browser gets
  // no double-tap or pinch zoom out of it, however fast the taps come. Pointer events still fire.
  // Menus are left out, or their buttons would get no click.
  const { canvas } = services.scene;
  window.addEventListener(
    'touchstart',
    (event) => {
      const { target } = event;
      if (target === canvas || (target instanceof Element && target.closest('#touch-controls'))) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  return {
    getMove() {
      if (!enabled) return { x: 0, y: 0 };
      let x = 0;
      let y = 0;
      for (const code of keysDown) {
        const move = MOVE_KEYS[code];
        if (move) {
          x += move.x;
          y += move.y;
        }
      }
      if (x === 0 && y === 0) return touch.getMove();
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    isPressed(action) {
      return (held.get(action) ?? 0) > 0;
    },
    setEnabled(next) {
      enabled = next;
      touch.setVisible(next);
      if (!next) releaseAll();
    },
  };
};
