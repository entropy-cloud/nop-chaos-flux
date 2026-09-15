import { createSharedVitestConfig } from '../../vitest.shared';

// Coverage thresholds follow the industrial skeleton precedent (90% four-way,
// established at a low-code-volume skeleton and raised as waves land).
// headless-untestable branches (real WebGL) must be listed explicitly in
// `exclude` below — never by lowering thresholds (plan 465 Phase 5 policy).
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
