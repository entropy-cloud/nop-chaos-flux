import { createSharedVitestConfig } from '../../vitest.shared';

export default createSharedVitestConfig({
  environment: 'node',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**'],
    thresholds: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
});
