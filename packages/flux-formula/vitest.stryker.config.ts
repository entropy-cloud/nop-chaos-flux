import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

// include must REPLACE the base globs for the stryker slice: mergeConfig
// unions arrays, so an override include would still run the whole package's
// `**/*.{test,spec}.ts(x)` set per mutant (P1-MA4.1-009, same root as the
// flux-runtime slice). Spread the base fields explicitly, pin root to this
// package, and override include to the co-located formula test files.
export default defineConfig({
  ...(baseConfig as Record<string, unknown>),
  root: __dirname,
  test: {
    ...((baseConfig as { test?: Record<string, unknown> }).test ?? {}),
    include: ['src/**/*.test.ts'],
  },
});
