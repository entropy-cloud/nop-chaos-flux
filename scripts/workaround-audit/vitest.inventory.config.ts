import { defineConfig } from 'vitest/config';

// Workaround-audit inventory generator (plan 560 Phase 1). The generator only
// scans the filesystem (packages/*/src + apps/playground/src) — no TS imports
// of workspace packages — so a node environment suffices. Independent config,
// same organization as scripts/interaction-state (plan 543): runs via
// `pnpm workaround:inventory`, not part of the turbo `pnpm test` task family.
export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    testTimeout: 120_000,
    include: ['scripts/workaround-audit/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
  },
});
