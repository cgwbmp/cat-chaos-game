import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const PERF = /perf\.spec\.ts/;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The game renders with software WebGL in headless browsers; more than two at once starve
  // each other and the level clock falls behind.
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  // Software-rendered frames keep the main thread busy, so the page answers slowly under load.
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: PERF,
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7 landscape'] },
      testIgnore: PERF,
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13 landscape'] },
      testIgnore: PERF,
    },
    // The performance test measures frame rate, so it runs alone: `pnpm test:perf`.
    {
      name: 'perf',
      use: { ...devices['Desktop Chrome'] },
      testMatch: PERF,
    },
  ],
  // Serves the production build; run `pnpm build` first (`pnpm test:e2e` does).
  webServer: {
    command: `pnpm preview --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
  },
});
