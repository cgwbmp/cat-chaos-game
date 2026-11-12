import { expect, test } from '@playwright/test';
import {
  enterRoom,
  MISSIONS,
  overlayValue,
  ROOMS,
  seedSave,
  tapToPlay,
  trackErrors,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await seedSave(page);
});

test('boots to the title screen with no console errors', async ({ page }) => {
  const errors = trackErrors(page);
  await tapToPlay(page);
  await expect(page.locator('html')).toHaveAttribute('data-state', 'playing');
  await expect(page.getByRole('button', { name: 'Tap to Play' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Cat Chaos' }).last()).toBeVisible();
  await expect(page.getByText(/^v\d+\.\d+\.\d+/)).toBeVisible();

  const canvas = page.locator('canvas#game');
  const viewport = page.viewportSize();
  const box = await canvas.boundingBox();
  expect(box?.width).toBe(viewport?.width);
  expect(box?.height).toBe(viewport?.height);
  expect(errors).toEqual([]);
});

test('every menu screen is reachable with the keyboard and Escape goes back', async ({ page }) => {
  await tapToPlay(page);
  // Play is focused first; the arrows move through Shop and Settings.
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: 'Shop' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('slider', { name: 'Music' })).toBeVisible();
  await page.getByRole('button', { name: 'High' }).click();
  await expect(page.getByRole('button', { name: 'High' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Back' }).click();

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Rooms' })).toBeVisible();
  for (const room of ROOMS) await expect(page.getByRole('button', { name: room })).toBeEnabled();
  await page.getByRole('button', { name: ROOMS[0] }).click();
  await expect(page.getByRole('button', { name: /^Mission/ })).toBeFocused();
  await expect(page.getByRole('button', { name: /^Free Soul/ })).toBeEnabled();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});

test('a fresh save has only the first room unlocked and Free Soul locked', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('cat-chaos/save'));
  await tapToPlay(page);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: ROOMS[0] })).toBeEnabled();
  for (const room of ROOMS.slice(1)) {
    await expect(page.getByRole('button', { name: room })).toBeDisabled();
  }
  await page.getByRole('button', { name: ROOMS[0] }).click();
  await expect(page.getByRole('button', { name: /^Free Soul/ })).toBeDisabled();
});

test('the debug overlay toggles with the backtick key and a three-finger tap', async ({ page }) => {
  await tapToPlay(page);
  const overlay = page.locator('#debug-overlay');
  await expect(overlay).toBeHidden();
  await page.keyboard.press('Backquote');
  await expect(overlay).toBeVisible();
  await expect.poll(() => overlayValue(page, 'FPS')).toBeGreaterThan(0);
  await page.keyboard.press('Backquote');
  await expect(overlay).toBeHidden();

  // Playwright has no multi-touch API and WebKit cannot construct Touch objects, so the event
  // is a plain Event carrying a `touches` list of the right length.
  const tap = (fingers: number) =>
    page.evaluate((count) => {
      const event = new Event('touchstart', { bubbles: true });
      Object.defineProperty(event, 'touches', { value: Array.from({ length: count }) });
      document.body.dispatchEvent(event);
    }, fingers);
  await tap(2);
  await expect(overlay).toBeHidden();
  await tap(3);
  await expect(overlay).toBeVisible();
});

test('only phones held in portrait see the rotate prompt', async ({ page, isMobile }) => {
  await page.goto('/');
  const prompt = page.getByText('Rotate your phone to play');
  await expect(prompt).toBeHidden();

  const landscape = page.viewportSize();
  if (!landscape) throw new Error('No viewport');
  await page.setViewportSize({ width: landscape.height, height: landscape.width });
  // A portrait desktop window is fine; only touch devices are asked to rotate.
  await expect(prompt).toBeVisible({ visible: isMobile });

  await page.setViewportSize(landscape);
  await expect(prompt).toBeHidden();
});

test('touch controls show on phones only, and only during a level', async ({ page, isMobile }) => {
  await tapToPlay(page);
  const controls = page.locator('#touch-controls');
  await expect(controls).toBeHidden();

  await enterRoom(page, ROOMS[0] ?? '');
  await expect(controls).toBeVisible({ visible: isMobile });
  for (const name of ['Swat', 'Jump', 'Zoom']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible({
      visible: isMobile,
    });
  }
});

test('pause stops the timer; resume, restart and quit work', async ({ page }) => {
  await tapToPlay(page);
  await enterRoom(page, ROOMS[0] ?? '');
  const timer = page.getByRole('timer');
  await expect(timer).toHaveText(/^1:\d\d$/);

  await page.keyboard.press('Escape');
  const paused = page.getByRole('dialog', { name: 'Paused' });
  await expect(paused).toBeVisible();
  const frozen = await timer.textContent();
  await page.waitForTimeout(2200);
  await expect(timer).toHaveText(frozen ?? '');

  await page.keyboard.press('Escape');
  await expect(paused).toBeHidden();
  await expect(timer).not.toHaveText(frozen ?? '', { timeout: 5000 });

  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(paused).toBeHidden();
  await expect(timer).toHaveText('1:30', { timeout: 20_000 });

  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Quit' }).click();
  await expect(page.getByRole('heading', { name: 'Rooms' })).toBeVisible();
  await expect(page.locator('.hud')).toBeHidden();
});

// Full smoke for every room: enter it, play 10 s with scripted input, reach the results screen,
// with zero console errors. `?timescale` speeds up the Mission clock so that the time runs out
// about 12 s in, just after the scripted input ends.
const PLAY_MS = 10_000;
for (const { room, timeLimitSec } of MISSIONS) {
  test(`${room}: play 10 s and reach results with no console errors`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = trackErrors(page);
    await tapToPlay(page, `?timescale=${(timeLimitSec / 12).toFixed(2)}`);
    await enterRoom(page, room);

    // 10 s of running in every direction with jumps, swats, a pounce and zoomies.
    const started = Date.now();
    const keys = ['KeyW', 'KeyD', 'KeyS', 'KeyA'];
    for (let step = 0; Date.now() - started < PLAY_MS; step++) {
      const key = keys[step % keys.length] ?? 'KeyW';
      await page.keyboard.down(key);
      await page.keyboard.press('Space', { delay: step % 3 === 0 ? 220 : 60 });
      await page.keyboard.press('KeyJ');
      if (step % 4 === 1) await page.keyboard.press('KeyK');
      if (step % 4 === 2) await page.keyboard.press('ShiftLeft');
      await page.waitForTimeout(350);
      await page.keyboard.up(key);
    }

    const results = page.getByRole('dialog', { name: /Mission Complete!|The Owner Is Home!/ });
    await expect(results).toBeVisible({ timeout: 45_000 });
    await expect(results.getByText(/^Best combo x/)).toBeVisible();
    await expect(results.getByRole('button', { name: 'Retry' })).toBeVisible();
    await results.getByRole('button', { name: 'Rooms' }).click();
    await expect(page.getByRole('heading', { name: 'Rooms' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('Free Soul ends when everything is broken and marks the room cleared', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = trackErrors(page);
  await tapToPlay(page);
  await page.keyboard.press('Backquote');
  // The performance scene is the quickest room to clear: one swat breaks every object.
  await page.locator('#debug-overlay select').first().selectOption('_perf');
  await page.locator('#debug-overlay select').last().selectOption('free-soul');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.locator('.hud')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('timer')).toHaveText('60 objects left');
  await page.keyboard.press('KeyJ');

  const results = page.getByRole('dialog', { name: 'Room Cleared!' });
  await expect(results).toBeVisible({ timeout: 30_000 });
  await expect(results.getByText('Test Cup x60')).toBeVisible();
  const cleared = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('cat-chaos/save') ?? '{}');
    return save.rooms?._perf?.freeSoulCleared === true && save.totalCoins > 0;
  });
  expect(cleared).toBe(true);
  expect(errors).toEqual([]);
});

// Restart and Quit leave the pause screen without Resume; the next level must not stay paused.
for (const exit of ['Restart', 'Quit'] as const) {
  test(`the level plays after ${exit} on the pause screen`, async ({ page }) => {
    test.setTimeout(60_000);
    await tapToPlay(page);
    await page.keyboard.press('Backquote');
    // The performance scene: one swat breaks every object, which needs running physics.
    await page.locator('#debug-overlay select').first().selectOption('_perf');
    await page.locator('#debug-overlay select').last().selectOption('free-soul');
    const go = page.getByRole('button', { name: 'Go', exact: true });
    const hud = page.locator('.hud');
    await go.click();
    await expect(hud).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Pause' }).click();
    await page.getByRole('button', { name: exit }).click();
    await expect(hud).toBeHidden();
    if (exit === 'Quit') await go.click();
    await expect(hud).toBeVisible({ timeout: 20_000 });
    await page.keyboard.press('KeyJ');
    await expect(page.getByRole('dialog', { name: 'Room Cleared!' })).toBeVisible({
      timeout: 30_000,
    });
  });
}
