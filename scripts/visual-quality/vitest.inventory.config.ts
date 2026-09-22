import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { workspacePackageAliases } from '../../vite.workspace-alias';

// leafer-ui and its @leafer-in/* plugins instantiate real canvases at module
// load; the inventory generator only reads renderer definition METADATA, so
// the alias layer swaps inert stubs. (vi.mock cannot intercept these
// externalized deps under this config; aliasing is transform-time and total.)
const leaferStubs = [
  { find: /^leafer-ui$/, replacement: resolve(__dirname, 'leafer-stub.ts') },
  { find: /^@leafer-in\/[a-z-]+$/, replacement: resolve(__dirname, 'leafer-stub.ts') },
  { find: /^@leafer-ui\/[a-z-]+$/, replacement: resolve(__dirname, 'leafer-stub.ts') },
  { find: /^leafer-editor$/, replacement: resolve(__dirname, 'leafer-stub.ts') },
];

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: [resolve(__dirname, 'canvas-globals-setup.ts')],
    pool: 'forks',
    testTimeout: 60_000,
    include: ['scripts/visual-quality/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
  },
  resolve: {
    alias: [
      ...leaferStubs,
      ...Object.entries(workspacePackageAliases).map(([find, replacement]) => ({ find, replacement })),
    ],
  },
});
