import { mergeConfig } from 'vitest/config';
import { createSharedVitestConfig } from '../../vitest.shared';

export default mergeConfig(
  createSharedVitestConfig({
    environment: 'jsdom',
  }),
  {
    test: {
      setupFiles: ['./src/__tests__/setup.ts'],
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
    },
  },
);
