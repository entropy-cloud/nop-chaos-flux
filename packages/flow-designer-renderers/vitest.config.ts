import { defineConfig, mergeConfig } from 'vitest/config';
import { createSharedVitestConfig } from '../../vitest.shared';

export default mergeConfig(
  createSharedVitestConfig({
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  }),
  defineConfig({
    test: {
      maxWorkers: 1,
      fileParallelism: false,
    },
  }),
);
