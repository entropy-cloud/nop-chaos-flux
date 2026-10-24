/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  packageManager: 'pnpm',
  mutate: [
    'packages/flux-runtime/src/validation/*.ts',
    '!packages/flux-runtime/src/validation/index.ts',
    '!packages/flux-runtime/src/validation/*.test.ts',
  ],
  testFiles: ['packages/flux-runtime/src/validation/*.test.ts'],
  vitest: {
    configFile: 'packages/flux-runtime/vitest.stryker.config.ts',
  },
  reporters: ['clear-text', 'progress', 'json'],
  tempDirName: '.stryker-tmp/runtime',
  cleanTempDir: 'always',
  coverageAnalysis: 'off',
  // P1-MA4.5-001 fix direction ②: run every test per mutant (no first-failure
  // bail) so per-mutant execution counts stay meaningful for the canary probe.
  disableBail: true,
  thresholds: {
    high: 80,
    low: 60,
    break: 60,
  },
};
