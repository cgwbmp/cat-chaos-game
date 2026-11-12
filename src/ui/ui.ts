// The HTML/CSS overlay above the canvas: title, level select, mode select, HUD, pause, results,
// settings and the cosmetics shop. It reads state from services and reacts to events; it asks
// for levels with `level/requested` and `level/quit`.
import { version } from '../../package.json';
import { COSMETICS, isCosmeticOwned, type CosmeticDef } from '../core/cosmetics';
import type { Services, System } from '../core/services';
import type { GameMode, LevelResult, QualityTier, RoomDef } from '../core/types';
import { button, coinIcon, focusFirst, h, moveFocus, starIcon, starRow } from './dom';
import {
  formatCoins,
  formatTime,
  groupBroken,
  isFreeSoulUnlocked,
  isRoomUnlocked,
  nextRoom,
  resultTitle,
  totalStars,
} from './format';
import { createHud } from './hud';
import { createTutorial } from './tutorial';
import './ui.css';

const RESULTS_DELAY_MS = 700;
const STAR_STAMP_MS = 380;

type ScreenFactory = () => HTMLElement;

export function createUi(services: Services): System {
  const { bus, save, rooms, platform } = services;
  const root = document.getElementById('ui');
  if (!root) throw new Error('Missing #ui in index.html');

  const menu = h('div', { class: 'ui-layer ui-menu' });
  const overlay = h('div', { class: 'ui-layer ui-overlay' });
  const banner = h('div', { class: 'ui-banner', role: 'status', hidden: true });
  const hud = createHud(services, () => bus.emit('game/paused', { paused: true }));
  const tutorial = createTutorial(services);
  root.append(hud.element, tutorial.element, banner, menu, overlay);

  let level: { room: RoomDef; mode: GameMode } | undefined;
  let lastResult: LevelResult | undefined;
  let resultsTimer: number | undefined;
  let justPaused = false;
  const history: ScreenFactory[] = [];

  const click = () => bus.emit('audio/play', { cue: 'ui_click' });

  // --- Navigation ----------------------------------------------------------------------------
  function render(layer: HTMLElement, screen: HTMLElement | undefined): void {
    layer.replaceChildren(...(screen ? [screen] : []));
    if (screen) focusFirst(screen);
  }

  function open(factory: ScreenFactory): void {
    history.push(factory);
    render(menu, factory());
  }

  function back(): void {
    if (history.length <= 1) return;
    history.pop();
    bus.emit('audio/play', { cue: 'ui_back' });
    const previous = history.at(-1);
    if (previous) render(menu, previous());
  }

  /** Re-renders the screen on top, e.g. after a purchase. */
  function refresh(): void {
    const top = history.at(-1);
    if (top) render(menu, top());
  }

  function closeMenus(): void {
    history.length = 0;
    render(menu, undefined);
  }

  function screen(title: string, className: string, ...children: (Node | false)[]): HTMLElement {
    return h(
      'section',
      { class: `screen ${className}`, 'aria-label': title },
      h(
        'header',
        { class: 'screen-header' },
        history.length > 1 && button('Back', back, { class: 'back' }),
        h('h2', { text: title }),
        h('span', { class: 'balance' }, coinIcon(), formatCoins(save.get().totalCoins)),
      ),
      ...children.filter((child): child is Node => child !== false),
    );
  }

  // --- Menus ---------------------------------------------------------------------------------
  const titleScreen: ScreenFactory = () =>
    h(
      'section',
      { class: 'screen title-screen', 'aria-label': 'Cat Chaos' },
      h('h1', { class: 'logo', text: 'Cat Chaos' }),
      h('p', { class: 'tagline', text: 'Knock it over. Break it all.' }),
      h(
        'div',
        { class: 'stack' },
        button('Play', () => open(levelsScreen), { class: 'primary', 'data-autofocus': true }),
        button('Shop', () => open(shopScreen)),
        button('Settings', () => open(settingsScreen)),
      ),
      // Testers quote this in bug reports.
      h('p', { class: 'version', text: `v${version}` }),
    );

  const levelsScreen: ScreenFactory = () => {
    const data = save.get();
    const cards = rooms.list().map((room) => {
      const unlocked = isRoomUnlocked(room, data);
      const progress = data.rooms[room.id];
      return button(
        h(
          'span',
          { class: 'card-body' },
          h('span', { class: 'card-order', text: String(room.order) }),
          h('span', { class: 'card-name', text: room.name }),
          unlocked
            ? starRow(progress?.stars ?? 0)
            : h(
                'span',
                { class: 'card-lock' },
                starIcon(true),
                `${room.unlock.requiresStars} to unlock`,
              ),
          unlocked &&
            h('span', { class: 'card-best' }, coinIcon(), formatCoins(progress?.bestCoins ?? 0)),
        ),
        () => open(() => modesScreen(room)),
        { class: unlocked ? 'card' : 'card locked', disabled: !unlocked },
      );
    });
    return screen(
      'Rooms',
      'levels-screen',
      h('p', { class: 'hint' }, starIcon(true), `${totalStars(data)} stars`),
      h('div', { class: 'cards' }, ...cards),
    );
  };

  function modesScreen(room: RoomDef): HTMLElement {
    const freeSoul = isFreeSoulUnlocked(room, save.get());
    const start = (mode: GameMode) => {
      bus.emit('level/requested', { roomId: room.id, mode });
      render(menu, h('section', { class: 'screen loading-screen' }, h('p', { text: 'Loading…' })));
    };
    return screen(
      room.name,
      'modes-screen',
      h(
        'div',
        { class: 'modes' },
        button(
          h(
            'span',
            { class: 'mode-body' },
            h('strong', { text: 'Mission' }),
            h(
              'span',
              {},
              `Break `,
              coinIcon(),
              ` ${formatCoins(room.mission.targetCoins)} in ${formatTime(room.mission.timeLimitSec)}`,
            ),
            h('span', { class: 'small', text: 'before the owner comes home' }),
          ),
          () => start('mission'),
          { class: 'mode primary', 'data-autofocus': true },
        ),
        button(
          h(
            'span',
            { class: 'mode-body' },
            h('strong', { text: 'Free Soul' }),
            h('span', { text: 'No timer. Break everything.' }),
            !freeSoul && h('span', { class: 'small', text: 'Clear the Mission once to unlock' }),
          ),
          () => start('free-soul'),
          { class: freeSoul ? 'mode' : 'mode locked', disabled: !freeSoul },
        ),
      ),
    );
  }

  const settingsScreen: ScreenFactory = () => {
    const { settings } = save.get();
    const slider = (label: string, key: 'music' | 'sfx') => {
      const input = h('input', {
        type: 'range',
        min: '0',
        max: '100',
        step: '5',
        value: String(Math.round(settings[key] * 100)),
        'aria-label': label,
      });
      input.addEventListener('input', () => {
        save.update((data) => {
          data.settings[key] = Number(input.value) / 100;
        });
      });
      input.addEventListener('change', click);
      return h('label', { class: 'row' }, h('span', { text: label }), input);
    };
    const tiers: QualityTier[] = ['low', 'medium', 'high'];
    const quality = h(
      'div',
      { class: 'segments', role: 'group', 'aria-label': 'Graphics quality' },
      ...tiers.map((tier) =>
        button(
          tier[0]?.toUpperCase() + tier.slice(1),
          () => {
            save.update((data) => {
              data.settings.quality = tier;
            });
            refresh();
          },
          {
            class: settings.quality === tier ? 'segment on' : 'segment',
            'aria-pressed': String(settings.quality === tier),
          },
        ),
      ),
    );
    const haptics = h('input', { type: 'checkbox', checked: settings.haptics });
    haptics.addEventListener('change', () => {
      save.update((data) => {
        data.settings.haptics = haptics.checked;
      });
    });
    return screen(
      'Settings',
      'settings-screen',
      h(
        'div',
        { class: 'rows' },
        slider('Music', 'music'),
        slider('Sound', 'sfx'),
        h('div', { class: 'row' }, h('span', { text: 'Graphics' }), quality),
        h('label', { class: 'row' }, h('span', { text: 'Vibration' }), haptics),
      ),
    );
  };

  const shopScreen: ScreenFactory = () => {
    const data = save.get();
    const item = (cosmetic: CosmeticDef) => {
      const owned = isCosmeticOwned(cosmetic, data);
      const equipped = data.cosmetics.equipped[cosmetic.slot] === cosmetic.id;
      const [r, g, b] = cosmetic.color.map((channel) => Math.round(channel * 255));
      let action: HTMLElement;
      if (owned) {
        action = button(equipped ? 'Take off' : 'Wear', () => {
          save.update((draft) => {
            if (equipped) draft.cosmetics.equipped[cosmetic.slot] = undefined;
            else draft.cosmetics.equipped[cosmetic.slot] = cosmetic.id;
          });
          refresh();
        });
      } else if (cosmetic.price !== undefined) {
        const price = cosmetic.price;
        action = button(
          h('span', {}, coinIcon(), formatCoins(price)),
          () => {
            save.update((draft) => {
              draft.totalCoins -= price;
              draft.cosmetics.owned.push(cosmetic.id);
            });
            refresh();
          },
          {
            disabled: data.totalCoins < price,
            'aria-label': `Buy ${cosmetic.name} for ${price} coins`,
          },
        );
      } else {
        const room = rooms.get(cosmetic.unlockRoom ?? '');
        action = h('span', { class: 'small' }, starRow(3), ` in ${room?.name ?? 'a later room'}`);
      }
      return h(
        'li',
        { class: equipped ? 'item on' : 'item' },
        h('span', { class: 'swatch', style: `background: rgb(${r} ${g} ${b})` }),
        h('span', { class: 'item-name', text: cosmetic.name }),
        action,
      );
    };
    const group = (label: string, slot: CosmeticDef['slot']) =>
      h(
        'div',
        { class: 'shop-group' },
        h('h3', { text: label }),
        h('ul', { class: 'items' }, ...COSMETICS.filter((entry) => entry.slot === slot).map(item)),
      );
    return screen(
      'Shop',
      'shop-screen',
      h(
        'div',
        { class: 'shop' },
        group('Fur', 'fur'),
        group('Collars', 'collar'),
        group('Hats', 'hat'),
      ),
    );
  };

  // --- In-level overlays ---------------------------------------------------------------------
  /** Restart and Quit on the pause screen end the pause too; physics and sound wait for that. */
  function leavePause(): void {
    if (overlay.querySelector('.pause-screen')) bus.emit('game/paused', { paused: false });
  }

  function restart(): void {
    if (!level) return;
    leavePause();
    render(overlay, undefined);
    bus.emit('level/requested', { roomId: level.room.id, mode: level.mode });
  }

  function quit(): void {
    leavePause();
    window.clearTimeout(resultsTimer);
    render(overlay, undefined);
    hud.setVisible(false);
    tutorial.stop();
    banner.hidden = true;
    level = undefined;
    bus.emit('level/quit', {});
    history.length = 0;
    history.push(titleScreen);
    open(levelsScreen);
  }

  function pauseScreen(): HTMLElement {
    return h(
      'section',
      { class: 'screen panel pause-screen', role: 'dialog', 'aria-label': 'Paused' },
      h('h2', { text: 'Paused' }),
      h(
        'div',
        { class: 'stack' },
        button('Resume', () => bus.emit('game/paused', { paused: false }), {
          class: 'primary',
          'data-autofocus': true,
        }),
        button('Restart', restart),
        button('Quit', quit),
      ),
    );
  }

  function resultsScreen(result: LevelResult): HTMLElement {
    const stars = h('div', {
      class: 'result-stars',
      role: 'img',
      'aria-label': `${result.stars} of 3 stars`,
    });
    if (result.mode === 'mission') {
      for (let index = 0; index < 3; index++) {
        const star = starIcon(index < result.stars);
        if (index < result.stars) {
          // Stars stamp in one after another.
          star.style.animationDelay = `${index * STAR_STAMP_MS}ms`;
          star.classList.add('stamp');
          window.setTimeout(() => bus.emit('audio/play', { cue: 'star' }), index * STAR_STAMP_MS);
        }
        stars.append(star);
      }
    }
    const list = h(
      'ul',
      { class: 'broken' },
      ...groupBroken(result.broken).map((group) =>
        h(
          'li',
          {},
          h('span', { text: group.count > 1 ? `${group.name} x${group.count}` : group.name }),
          h('span', {}, coinIcon(), formatCoins(group.coins)),
        ),
      ),
    );
    const next = level && nextRoom(rooms.list(), level.room.id);
    const canNext = next !== undefined && isRoomUnlocked(next, save.get());
    const ads = platform.id !== 'none';
    return h(
      'section',
      { class: 'screen panel results-screen', role: 'dialog', 'aria-label': resultTitle(result) },
      h('h2', { text: resultTitle(result) }),
      result.mode === 'mission' && stars,
      h(
        'div',
        { class: 'result-stats' },
        h('span', { class: 'result-coins' }, coinIcon(), formatCoins(result.coins)),
        h('span', { text: `Best combo x${result.bestCombo}` }),
        h('span', { text: `Time ${formatTime(result.timeSec)}` }),
      ),
      result.broken.length > 0
        ? list
        : h('p', { class: 'hint', text: 'Nothing broken this time.' }),
      h(
        'div',
        { class: 'actions' },
        canNext &&
          next &&
          button(
            'Next room',
            () => {
              render(overlay, undefined);
              level = undefined;
              bus.emit('level/quit', {});
              history.length = 0;
              history.push(titleScreen, levelsScreen);
              open(() => modesScreen(next));
            },
            { class: 'primary', 'data-autofocus': true },
          ),
        button('Retry', restart, canNext ? {} : { class: 'primary', 'data-autofocus': true }),
        button('Rooms', quit),
        ads && button('Double coins (ad)', () => void platform.showRewardedAd('double_coins')),
        ads &&
          result.mode === 'mission' &&
          result.stars < 3 &&
          button('+30 s (ad)', () => void platform.showRewardedAd('extend_timer')),
      ),
    );
  }

  // --- Events --------------------------------------------------------------------------------
  const unsubscribe = [
    bus.on('level/loaded', ({ roomId, mode, breakableCount }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      window.clearTimeout(resultsTimer);
      level = { room, mode };
      closeMenus();
      render(overlay, undefined);
      hud.reset(mode, breakableCount, room.mission.targetCoins);
      hud.setVisible(false);
      banner.replaceChildren(
        h('strong', { text: room.name }),
        h(
          'span',
          {},
          ...(mode === 'mission'
            ? [
                'Break ',
                coinIcon(),
                ` ${formatCoins(room.mission.targetCoins)} before the owner is home`,
              ]
            : ['Free Soul: break everything']),
        ),
      );
      banner.hidden = false;
    }),
    bus.on('level/started', () => {
      window.clearTimeout(resultsTimer);
      banner.hidden = true;
      render(overlay, undefined);
      hud.setVisible(true);
      tutorial.start();
      // Keys now drive the cat; a focused button would also react to Space.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }),
    bus.on('game/paused', ({ paused }) => {
      if (!level) return;
      render(overlay, paused ? pauseScreen() : undefined);
      // The Escape press that paused the game also reaches onKeyDown below; without this it
      // would resume at once.
      justPaused = paused;
      window.setTimeout(() => {
        justPaused = false;
      });
    }),
    bus.on('level/ended', ({ result }) => {
      lastResult = result;
      tutorial.stop();
      resultsTimer = window.setTimeout(() => {
        hud.setVisible(false);
        if (lastResult) render(overlay, resultsScreen(lastResult));
      }, RESULTS_DELAY_MS);
    }),
  ];

  function onKeyDown(event: KeyboardEvent): void {
    const active = overlay.firstElementChild ?? menu.firstElementChild;
    if (!(active instanceof HTMLElement)) return;
    if (event.key === 'Escape') {
      if (overlay.querySelector('.pause-screen')) {
        if (!justPaused) bus.emit('game/paused', { paused: false });
      } else if (!overlay.firstElementChild) {
        back();
      }
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      if (document.activeElement instanceof HTMLInputElement) return; // sliders use arrows
      event.preventDefault();
      moveFocus(active, 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      if (document.activeElement instanceof HTMLInputElement) return;
      event.preventDefault();
      moveFocus(active, -1);
    }
  }
  window.addEventListener('keydown', onKeyDown);
  root.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('button')) click();
  });

  const beforeRender = services.scene.scene.onBeforeRenderObservable.add(() => tutorial.update());
  open(titleScreen);

  return {
    dispose() {
      for (const off of unsubscribe) off();
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(resultsTimer);
      services.scene.scene.onBeforeRenderObservable.remove(beforeRender);
      hud.dispose();
      tutorial.dispose();
      root.replaceChildren();
    },
  };
}
