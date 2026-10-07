import { defineConfig } from 'vitest/config';

// Interaction-state inventory generator (plan 543 Phase 1). Unlike the R2
// visual-quality inventory config, this generator imports ONLY pure-data
// route models (route-model.ts / complex-pages-model.ts) — no renderer
// definition packages — so a node environment suffices (no leafer stubs,
// no DOM setup).
export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    testTimeout: 60_000,
    include: ['scripts/interaction-state/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
  },
});
