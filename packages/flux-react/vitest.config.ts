import { mergeConfig } from 'vitest/config';
import babel from '@rolldown/plugin-babel';
import { reactCompilerPreset } from '@vitejs/plugin-react';
import { createSharedVitestConfig } from '../../vitest.shared';

// P0-MA5.1-003：selector fork 以 `'use no memo'` 钉住非编译语义。vitest 面镜像
// playground 全量 reactCompilerPreset 的构建差异——只对 fork 模块施加 transform，
// 让「同快照换 selector 必须重跑」契约的回归在 CI 可判别。
export default mergeConfig(
  createSharedVitestConfig({
    environment: 'happy-dom',
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
  }),
  {
    plugins: [
      babel({
        include: /use-sync-external-store-with-selector/,
        presets: [reactCompilerPreset({ target: '19' })],
      }),
    ],
  },
);
