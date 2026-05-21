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
  reporters: ['clear-text', 'progress'],
  tempDirName: '.stryker-tmp/runtime',
  cleanTempDir: 'always',
  coverageAnalysis: 'off',
  thresholds: {
    high: 80,
    low: 60,
    break: 60,
  },
};
