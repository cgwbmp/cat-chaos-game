import { expect, test } from '@playwright/test';
import { seedSave, tapToPlay } from './helpers';

// Performance scene: 60 objects break at the same moment. The frame rate is measured over the
// three seconds around the break and must stay above the baseline (50 FPS; PERF_MIN_FPS
// overrides it, for machines without a GPU). Run it on its own, with one worker
// (`pnpm test:perf`): other tests running in parallel take the CPU it is measuring.
const MIN_FPS = Number(process.env.PERF_MIN_FPS ?? 50);

test('60 objects breaking at once keep the frame rate above the baseline', async ({ page }) => {
  test.setTimeout(60_000);
  await seedSave(page);
  await tapToPlay(page);
  await page.keyboard.press('Backquote');
  await page.locator('#debug-overlay select').first().selectOption('_perf');

  // Count frames for 3 s from the swat that breaks all 60 cups.
  await page.evaluate(() => {
    const state = { frames: 0, running: true };
    Object.assign(window, { __perf: state });
    const tick = () => {
      state.frames++;
      if (state.running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.locator('.hud')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1000); // let the first frames of the room (shader compiles) pass
  await page.keyboard.press('KeyJ');
  const before = await page.evaluate(() => {
    const state = (window as unknown as { __perf: { frames: number } }).__perf;
    state.frames = 0;
    return performance.now();
  });
  await page.waitForTimeout(3000);
  const { frames, elapsedMs } = await page.evaluate((start) => {
    const state = (window as unknown as { __perf: { frames: number; running: boolean } }).__perf;
    state.running = false;
    return { frames: state.frames, elapsedMs: performance.now() - start };
  }, before);

  // The level is over by now: every cup broke.
  await expect(page.getByRole('dialog', { name: /Mission Complete!/ })).toBeVisible();
  await expect(page.getByText('Test Cup x60')).toBeVisible();
  const fps = frames / (elapsedMs / 1000);
  console.log(`Performance scene: ${fps.toFixed(1)} FPS (baseline ${MIN_FPS})`);
  expect(fps).toBeGreaterThanOrEqual(MIN_FPS);
});
