import { createSharedVitestConfig } from '../../vitest.shared';

export default createSharedVitestConfig({
  environment: 'happy-dom',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**'],
    thresholds: {
      branches: 60,
      functions: 70,
      lines: 76,
      statements: 73,
    },
  },
});
