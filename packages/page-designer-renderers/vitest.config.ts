import { createSharedVitestConfig } from '../../vitest.shared';

export default createSharedVitestConfig({
  environment: 'happy-dom',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/__tests__/**',
      // 纯类型与桶导出（无可执行分支）。
      'src/types.ts',
      'src/index.ts',
    ],
    thresholds: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
});
