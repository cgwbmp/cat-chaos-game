// Optimizes a .glb for the game: Meshopt geometry compression and KTX2 textures.
// Usage: pnpm optimize-glb <input.glb> <output.glb> [--uastc]
// KTX2 needs KTX-Software (the `ktx` command) on the PATH: https://github.com/KhronosGroup/KTX-Software
import { Mode, toktx } from '@gltf-transform/cli';
import { Logger, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune } from '@gltf-transform/functions';
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

function hasKtxSoftware(): boolean {
  try {
    execFileSync('ktx', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const args = process.argv.slice(2);
const paths = args.filter((arg) => !arg.startsWith('--'));
const [input, output] = paths;
if (!input || !output || paths.length !== 2) {
  console.error('Usage: pnpm optimize-glb <input.glb> <output.glb> [--uastc]');
  process.exit(1);
}
if (resolve(input) === resolve(output)) {
  console.error('Refusing to overwrite the input file; choose a different output path.');
  process.exit(1);
}

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const document = await io.read(input);
document.setLogger(new Logger(Logger.Verbosity.WARN));

const hasTextures = document.getRoot().listTextures().length > 0;
if (hasTextures && !hasKtxSoftware()) {
  console.error(
    `${input} has textures, and KTX2 compression needs KTX-Software.\n` +
      'Install it so that `ktx` is on the PATH: https://github.com/KhronosGroup/KTX-Software/releases',
  );
  process.exit(1);
}

// Meshopt quantizes vertex data and moves the matching scale and offset onto each mesh node, so
// node transforms differ from the Blender export. Node names and extras are kept.
await document.transform(
  dedup(),
  // Empty leaf nodes are kept: room markers (cat_spawn, camera_bounds, ...) are exactly that.
  prune({ keepLeaves: true }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
if (hasTextures) {
  // ETC1S is smallest; --uastc keeps more detail (use it if the palette texture shows banding).
  const mode = args.includes('--uastc') ? Mode.UASTC : Mode.ETC1S;
  await document.transform(toktx({ mode, encoder: undefined }));
}

await io.write(output, document);

const kilobytes = (path: string) => `${(statSync(path).size / 1024).toFixed(1)} kB`;
console.log(`${input} (${kilobytes(input)}) -> ${output} (${kilobytes(output)})`);
