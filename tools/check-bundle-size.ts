// Fails when the production build's code exceeds the budget: 3 MB gzip before assets.
// Usage: pnpm build && pnpm check-size
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT_BYTES = 3 * 1024 * 1024;
// Code only; models, textures and audio have their own budgets (SPEC.md › Quality bars).
const CODE_EXTENSIONS = new Set(['.js', '.css', '.html', '.wasm', '.json']);

const dist = join(import.meta.dirname, '../dist');
if (!existsSync(dist)) {
  console.error('dist/ not found. Run `pnpm build` first.');
  process.exit(1);
}

let total = 0;
for (const entry of readdirSync(dist, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !CODE_EXTENSIONS.has(extname(entry.name))) continue;
  total += gzipSync(readFileSync(join(entry.parentPath, entry.name))).length;
}

const megabytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);
console.log(`Build size: ${megabytes(total)} MB gzip (limit ${megabytes(LIMIT_BYTES)} MB)`);
if (total > LIMIT_BYTES) {
  console.error('Build is over the size budget.');
  process.exit(1);
}
