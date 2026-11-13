// In-level HUD: coins, timer or objects left, mission progress with star marks, combo popup,
// floating "+120" labels where objects break, and the pause button.
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Services } from '../core/services';
import type { GameMode, Vec3 } from '../core/types';
import { button, coinIcon, h, starIcon } from './dom';
import { formatCoins, formatTime, missionProgress } from './format';

const LABEL_MS = 900;

export interface Hud {
  readonly element: HTMLElement;
  /** Resets the HUD for a level; it stays hidden until `setVisible(true)`. */
  reset(mode: GameMode, breakableCount: number, targetCoins: number): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

export function createHud(services: Services, onPause: () => void): Hud {
  const { bus } = services;
  const { scene, engine, canvas } = services.scene;

  const coins = h('span', { class: 'hud-coins-value', text: '0' });
  const timer = h('div', { class: 'hud-timer', role: 'timer' });
  const fill = h('div', { class: 'hud-progress-fill' });
  const progress = h(
    'div',
    { class: 'hud-progress', 'aria-hidden': 'true' },
    fill,
    h('span', { class: 'hud-mark hud-mark-1' }, starIcon(true)),
    h('span', { class: 'hud-mark hud-mark-2' }, starIcon(true), starIcon(true)),
  );
  const combo = h('div', { class: 'hud-combo', 'aria-live': 'polite' });
  const alert = h('div', { class: 'hud-alert', role: 'alert' });
  const labels = h('div', { class: 'hud-labels', 'aria-hidden': 'true' });
  const element = h(
    'div',
    { class: 'hud', hidden: true },
    h('div', { class: 'hud-coins' }, coinIcon(), coins),
    h('div', { class: 'hud-center' }, timer, progress),
    button('Pause', onPause, { class: 'hud-pause', 'aria-label': 'Pause' }),
    combo,
    alert,
    labels,
  );

  let mode: GameMode = 'mission';
  let target = 0;
  let total = 0;
  let broken = 0;

  function showLeft(): void {
    const left = Math.max(0, total - broken);
    timer.textContent = left === 1 ? '1 object left' : `${left} objects left`;
  }

  /** World position to CSS pixels on the canvas, or undefined when behind the camera. */
  function toScreen(position: Vec3): { x: number; y: number } | undefined {
    const camera = scene.activeCamera;
    if (!camera) return undefined;
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const projected = Vector3.Project(
      new Vector3(position.x, position.y, position.z),
      Matrix.IdentityReadOnly,
      scene.getTransformMatrix(),
      camera.viewport.toGlobal(width, height),
    );
    if (projected.z < 0 || projected.z > 1) return undefined;
    return {
      x: (projected.x / width) * canvas.clientWidth,
      y: (projected.y / height) * canvas.clientHeight,
    };
  }

  const unsubscribe = [
    bus.on('score/changed', ({ coins: value }) => {
      coins.textContent = formatCoins(value);
      fill.style.width = `${missionProgress(value, target) * 100}%`;
      // Restart the bump animation.
      coins.classList.remove('bump');
      void coins.offsetWidth;
      coins.classList.add('bump');
    }),
    bus.on('timer/tick', ({ remainingSec }) => {
      if (mode !== 'mission') return;
      timer.textContent = formatTime(remainingSec);
      timer.classList.toggle('urgent', remainingSec <= 10);
    }),
    bus.on('combo/changed', ({ multiplier, chain }) => {
      combo.textContent = chain > 0 ? `Combo x${multiplier}` : '';
      combo.classList.toggle('active', chain > 0);
    }),
    bus.on('walker/caught', ({ penaltySec }) => {
      alert.textContent = penaltySec > 0 ? `Caught! -${penaltySec} s` : 'Caught!';
      alert.classList.remove('show');
      void alert.offsetWidth;
      alert.classList.add('show');
    }),
    bus.on('object/broken', ({ position }) => {
      broken++;
      if (mode === 'free-soul') showLeft();
      const settings = services.save.get().settings;
      if (settings.haptics) navigator.vibrate?.(12);
      labelAt = position;
      queueMicrotask(flushLabel);
    }),
    bus.on('score/changed', ({ delta }) => {
      labelCoins = delta;
      queueMicrotask(flushLabel);
    }),
  ];

  // A break and its coins arrive as two events in either order; pair them up once both are in.
  let labelAt: Vec3 | undefined;
  let labelCoins: number | undefined;
  function flushLabel(): void {
    if (!labelAt || labelCoins === undefined) return;
    const at = toScreen(labelAt);
    const delta = labelCoins;
    labelAt = undefined;
    labelCoins = undefined;
    if (!at || delta <= 0) return;
    const label = h('span', { class: 'hud-label', text: `+${formatCoins(delta)}` });
    label.style.left = `${at.x}px`;
    label.style.top = `${at.y}px`;
    labels.append(label);
    window.setTimeout(() => label.remove(), LABEL_MS);
  }

  return {
    element,
    reset(nextMode, breakableCount, targetCoins) {
      mode = nextMode;
      target = targetCoins;
      total = breakableCount;
      broken = 0;
      coins.textContent = '0';
      fill.style.width = '0%';
      combo.textContent = '';
      combo.classList.remove('active');
      // A leftover `show` class replays the animation when the hidden HUD is shown again.
      alert.textContent = '';
      alert.classList.remove('show');
      labels.replaceChildren();
      progress.hidden = mode !== 'mission';
      timer.classList.remove('urgent');
      if (mode === 'mission') timer.textContent = '';
      else showLeft();
    },
    setVisible(visible) {
      element.hidden = !visible;
    },
    dispose() {
      for (const off of unsubscribe) off();
      element.remove();
    },
  };
}
