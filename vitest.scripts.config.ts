import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    // Script-gate tests exec the real gates against fixtures staged in the
    // real repo tree; parallel files would race those fixtures (a gate in one
    // file could collect a fixture another file is deleting mid-run → ENOENT).
    fileParallelism: false,
    // Script-gate tests exec the real gates against the full repo tree; the
    // git-scaffolding cases in check-workspace-manifest-deps measure ~5s on a
    // loaded machine, above vitest's 5s default — DV 2026-08-09 adjudication.
    testTimeout: 30_000,
    include: ['scripts/__tests__/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.stryker-tmp/**'],
  },
});
