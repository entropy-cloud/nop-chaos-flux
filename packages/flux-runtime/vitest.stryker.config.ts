import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

// include must REPLACE the base globs for the stryker slice: mergeConfig
// unions arrays, so an override include would still run the whole package's
// `**/*.{test,spec}.ts(x)` set from vitest.shared.ts per mutant
// (P1-MA4.1-009). Spread the base fields explicitly, pin root to this
// package (include globs resolve against process cwd otherwise, which under
// stryker's sandbox is the repo root), and override include.
export default defineConfig({
  ...(baseConfig as Record<string, unknown>),
  root: __dirname,
  test: {
    ...((baseConfig as { test?: Record<string, unknown> }).test ?? {}),
    include: ['src/validation/*.test.ts'],
  },
});
