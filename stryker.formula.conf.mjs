/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  packageManager: 'pnpm',
  mutate: [
    'packages/flux-formula/src/**/*.ts',
    '!packages/flux-formula/src/index.ts',
    '!packages/flux-formula/src/**/*.test.ts',
  ],
  vitest: {
    configFile: 'packages/flux-formula/vitest.stryker.config.ts',
  },
  reporters: ['clear-text', 'progress', 'json'],
  tempDirName: '.stryker-tmp/formula',
  cleanTempDir: 'always',
  coverageAnalysis: 'off',
  disableBail: true,
  thresholds: {
    high: 80,
    low: 60,
    // registration-only scope: do not break the run on score
    break: null,
  },
};
