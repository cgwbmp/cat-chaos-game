// Schema check of every objects.json against ObjectDef.
// Usage: pnpm validate-objects [file ...]   (default: every room plus assets/shared)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { validateObjectDefs } from '../src/core/validate';

const root = join(import.meta.dirname, '..');

function defaultFiles(): string[] {
  const roomsDir = join(root, 'src/rooms');
  const files = readdirSync(roomsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(roomsDir, entry.name, 'objects.json'));
  files.push(join(root, 'assets/shared/objects.json'));
  return files.filter((file) => existsSync(file));
}

function validateFile(file: string): string[] {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return [`not valid JSON: ${error instanceof Error ? error.message : String(error)}`];
  }
  const result = validateObjectDefs(data);
  return result.ok ? [] : result.errors;
}

const args = process.argv.slice(2);
const files = args.length > 0 ? args : defaultFiles();
if (files.length === 0) {
  console.error('No objects.json files found.');
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const errors = validateFile(file);
  const name = relative(process.cwd(), file);
  if (errors.length === 0) {
    console.log(`ok    ${name}`);
  } else {
    failed++;
    console.error(`FAIL  ${name}`);
    for (const error of errors) console.error(`      ${error}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${files.length} file(s) failed.`);
  process.exit(1);
}
