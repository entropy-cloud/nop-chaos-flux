import { createSharedVitestConfig } from '../../vitest.shared';

export default createSharedVitestConfig({
  environment: 'happy-dom',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**'],
    thresholds: {
      branches: 74, // plan 760 ratchet: live 75.00 on 2026-10-26; raise toward 80, never lower
      functions: 75, // plan 760 ratchet: live 76.27 on 2026-10-26; raise toward 80, never lower
      lines: 80,
      statements: 80,
    },
  },
});
