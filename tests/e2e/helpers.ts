import { expect, type Page } from '@playwright/test';

/** Room names as shown on the level select cards, with each Mission's time limit. */
export const MISSIONS = [
  { room: 'Tiny Studio Apartment', timeLimitSec: 90 },
  { room: 'Corner Convenience Store', timeLimitSec: 90 },
  { room: 'Cozy Café', timeLimitSec: 100 },
  { room: 'Gaming Café', timeLimitSec: 100 },
  { room: "Grandma's House", timeLimitSec: 110 },
  { room: 'Pop Star Dorm', timeLimitSec: 110 },
  { room: 'Traditional Wooden House', timeLimitSec: 120 },
  { room: 'Spa & Bathhouse', timeLimitSec: 150 },
  { room: 'Karaoke Room', timeLimitSec: 140 },
  { room: 'Flower Shop', timeLimitSec: 140 },
  { room: 'Comic Book Café', timeLimitSec: 150 },
  { room: 'Night Market Food Tent', timeLimitSec: 150 },
  { room: 'School Classroom', timeLimitSec: 160 },
  { room: 'Rooftop Garden', timeLimitSec: 160 },
  { room: 'Pottery Gallery', timeLimitSec: 170 },
  { room: 'Luxury Penthouse', timeLimitSec: 180 },
];

export const ROOMS = MISSIONS.map(({ room }) => room);

const ROOM_IDS = [
  'tiny-studio',
  'convenience-store',
  'cozy-cafe',
  'gaming-cafe',
  'grandmas-house',
  'pop-star-dorm',
  'wooden-house',
  'bathhouse',
  'karaoke-room',
  'flower-shop',
  'comic-cafe',
  'night-market',
  'classroom',
  'rooftop-garden',
  'pottery-gallery',
  'penthouse',
];

/** Collects console errors and uncaught page errors for the whole test. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

/**
 * Starts from a save with every room unlocked, the tutorial done and low quality, so a test can
 * enter any room and does not sit through the quality benchmark.
 */
export async function seedSave(page: Page): Promise<void> {
  await page.addInitScript((ids) => {
    const rooms = Object.fromEntries(
      ids.map((id) => [id, { bestCoins: 0, stars: 3, freeSoulCleared: false }]),
    );
    localStorage.setItem(
      'cat-chaos/save',
      JSON.stringify({
        version: 1,
        rooms,
        totalCoins: 0,
        cosmetics: { owned: [], equipped: {} },
        settings: { music: 0.7, sfx: 1, quality: 'low', haptics: false },
        tutorialDone: true,
      }),
    );
    localStorage.setItem('cat-chaos/quality-auto', '1');
  }, ROOM_IDS);
}

/** Boot screen to the title screen. */
export async function tapToPlay(page: Page, query = ''): Promise<void> {
  await page.goto(`/${query}`);
  const tap = page.getByRole('button', { name: 'Tap to Play' });
  await expect(tap).toBeEnabled();
  await tap.click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
}

/** Title screen to a running level, through level select and mode select. */
export async function enterRoom(
  page: Page,
  room: string,
  mode: 'Mission' | 'Free Soul' = 'Mission',
): Promise<void> {
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: room }).click();
  await page.getByRole('button', { name: new RegExp(`^${mode}`) }).click();
  // The HUD appears when the intro ends and the level starts.
  await expect(page.locator('.hud')).toBeVisible({ timeout: 20_000 });
}

/** Reads one row of the debug overlay, e.g. "Draw calls  14" -> 14. */
export async function overlayValue(page: Page, label: string): Promise<number> {
  const text = (await page.locator('#debug-overlay').textContent()) ?? '';
  const match = new RegExp(`${label}\\s+(\\d+)`).exec(text);
  return match ? Number(match[1]) : Number.NaN;
}
