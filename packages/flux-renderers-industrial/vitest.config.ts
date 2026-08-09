import { createSharedVitestConfig } from '../../vitest.shared';

// Coverage thresholds established at the I4.1 skeleton baseline (mirrors
// spreadsheet-core "threshold established at current baseline" precedent).
// The package currently contains only the renderer-definitions shell and the
// registerScadaRenderers entry; executable lines are fully exercised by the
// definitions test. Thresholds must only be raised (never lowered) as I5/I8-I10
// waves land code and tests. `src/test-support/**` is vi.mock test
// infrastructure (never shipped logic) and is excluded like test files.
export default createSharedVitestConfig({
  environment: 'happy-dom',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary', 'json'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**', 'src/test-support/**'],
    thresholds: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
});
