/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  packageManager: 'pnpm',
  mutate: [
    'packages/flux-runtime/src/**/*.ts',
    '!packages/flux-runtime/src/**/*.test.ts',
    '!packages/flux-runtime/src/**/*.test.tsx'
  ],
  vitest: {
    configFile: 'packages/flux-runtime/vitest.config.ts'
  },
  reporters: ['clear-text', 'progress'],
  tempDirName: '.stryker-tmp/runtime',
  coverageAnalysis: 'off',
  testRunnerNodeArgs: ['--experimental-vm-modules'],
  thresholds: {
    high: 80,
    low: 60,
    break: 0
  }
};
