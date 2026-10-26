import { createSharedVitestConfig } from '../../vitest.shared';

export default createSharedVitestConfig({
  environment: 'node',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**'],
    thresholds: {
      branches: 74, // plan 760 ratchet: live 75.97 on 2026-10-26; raise toward 80, never lower
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
});
