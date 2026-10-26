import { createSharedVitestConfig } from '../../vitest.shared';

export default createSharedVitestConfig({
  environment: 'happy-dom',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**'],
    thresholds: {
      branches: 80,
      functions: 56, // plan 760 ratchet: live 57.14 on 2026-10-26; raise toward 80, never lower
      lines: 75, // plan 760 ratchet: live 76.47 on 2026-10-26; raise toward 80, never lower
      statements: 73, // plan 760 ratchet: live 74.28 on 2026-10-26; raise toward 80, never lower
    },
  },
});
