import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const treeShakeMessage =
  'Import from the module path so the bundle tree-shakes, e.g. @babylonjs/core/Meshes/mesh.';

export default defineConfig(
  globalIgnores(['dist/', 'test-results/', 'playwright-report/']),
  js.configs.recommended,
  tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@babylonjs/core', message: treeShakeMessage },
            { name: '@babylonjs/core/index', message: treeShakeMessage },
            { name: '@babylonjs/core/Legacy/legacy', message: treeShakeMessage },
            { name: '@babylonjs/loaders', message: treeShakeMessage },
          ],
        },
      ],
    },
  },
  prettier,
);
