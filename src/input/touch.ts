// Touch controls: a floating joystick on the left half of the screen and three buttons on the
// right (Swat, Jump, Zoomies). Shown on touch devices only (see touch.css).
import type { InputAction } from '../core/types';
import { clampToRadius, stickVector, type StickVector } from './stick';
import './touch.css';

const STICK_RADIUS = 56; // px

const BUTTONS: { action: InputAction; label: string }[] = [
  { action: 'zoomies', label: 'Zoom' },
  { action: 'jump', label: 'Jump' },
  { action: 'swat', label: 'Swat' },
];

export interface TouchControls {
  /** Current joystick vector; zero when the stick is not held. */
  getMove(): StickVector;
  setVisible(visible: boolean): void;
}

export function createTouchControls(
  onAction: (action: InputAction, pressed: boolean) => void,
): TouchControls {
  const root = document.createElement('div');
  root.id = 'touch-controls';

  const zone = document.createElement('div');
  zone.className = 'touch-stick-zone';
  const base = document.createElement('div');
  base.className = 'touch-stick-base';
  base.hidden = true;
  const knob = document.createElement('div');
  knob.className = 'touch-stick-knob';
  base.append(knob);
  zone.append(base);

  const buttons = document.createElement('div');
  buttons.className = 'touch-buttons';
  for (const { action, label } of BUTTONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `touch-button touch-button-${action}`;
    button.textContent = label;
    const set = (pressed: boolean) => {
      if (button.classList.contains('pressed') === pressed) return;
      button.classList.toggle('pressed', pressed);
      onAction(action, pressed);
    };
    button.addEventListener('pointerdown', (event) => {
      button.setPointerCapture(event.pointerId);
      set(true);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      button.addEventListener(type, () => set(false));
    }
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    buttons.append(button);
  }

  root.append(zone, buttons);
  // Below #ui in the page, so menus stay on top of the controls.
  const ui = document.getElementById('ui');
  if (ui) ui.before(root);
  else document.body.append(root);

  // Floating stick: it appears where the finger lands and follows only that finger.
  let stickPointer: number | undefined;
  let originX = 0;
  let originY = 0;
  let move: StickVector = { x: 0, y: 0 };

  function release(): void {
    stickPointer = undefined;
    move = { x: 0, y: 0 };
    base.hidden = true;
  }

  zone.addEventListener('pointerdown', (event) => {
    if (stickPointer !== undefined) return;
    stickPointer = event.pointerId;
    zone.setPointerCapture(event.pointerId);
    originX = event.clientX;
    originY = event.clientY;
    base.style.left = `${originX}px`;
    base.style.top = `${originY}px`;
    knob.style.transform = '';
    base.hidden = false;
  });
  zone.addEventListener('pointermove', (event) => {
    if (event.pointerId !== stickPointer) return;
    const dx = event.clientX - originX;
    const dy = event.clientY - originY;
    move = stickVector(dx, dy, STICK_RADIUS);
    const shown = clampToRadius(dx, dy, STICK_RADIUS);
    knob.style.transform = `translate(${shown.dx}px, ${shown.dy}px)`;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    zone.addEventListener(type, (event) => {
      if (event.pointerId === stickPointer) release();
    });
  }

  return {
    getMove: () => move,
    setVisible(visible) {
      root.classList.toggle('hidden', !visible);
      if (!visible) {
        release();
        for (const button of buttons.querySelectorAll('.pressed')) {
          button.classList.remove('pressed');
        }
      }
    },
  };
}
