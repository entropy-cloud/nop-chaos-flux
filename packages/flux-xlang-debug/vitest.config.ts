import { createSharedVitestConfig } from '../../vitest.shared';

export default createSharedVitestConfig({
  environment: 'happy-dom',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**'],
    thresholds: {
      branches: 63, // plan 760 ratchet: live 64.35 on 2026-10-26; raise toward 80, never lower
      functions: 78, // plan 760 ratchet: live 79.70 on 2026-10-26; raise toward 80, never lower
      lines: 80,
      statements: 80,
    },
  },
});
