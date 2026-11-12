import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build runs from any sub-path (game portals host under one).
  base: './',
  server: {
    // Listen on the LAN so phones can open the dev server.
    host: true,
  },
  preview: {
    host: true,
  },
  build: {
    target: ['es2022', 'safari16'],
    // The Babylon core chunk is about 1.1 MB minified; the real budget is tools/check-bundle-size.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
