import { mergeConfig } from 'vitest/config';
import babel from '@rolldown/plugin-babel';
import { reactCompilerPreset } from '@vitejs/plugin-react';
import { createSharedVitestConfig } from '../../vitest.shared';

// P0-MA5.1-003：canvas-prop-edit-refresh 判别回归依赖 flux-react selector fork 在
// React Compiler 转换下的判别面（playground 全量编译、vitest 缺省不编译——该差异
// 曾使缺陷在单测绿而 live 红）。只对 fork 模块施加 transform，保持其余测试面不变。
export default mergeConfig(
  createSharedVitestConfig({
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
