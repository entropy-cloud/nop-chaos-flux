import { createSharedVitestConfig } from '../../vitest.shared';

export default createSharedVitestConfig({
  environment: 'node',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary'],
    include: [
      'src/class-aliases.ts',
      'src/compiled-cid.ts',
      'src/constants.ts',
      'src/registry.ts',
      'src/i18n-sink.ts',
      'src/validation-model.ts',
      'src/utils/path-binding.ts',
      'src/utils/instance-path.ts',
      'src/utils/debounce.ts',
      'src/utils/import-failure.ts',
      'src/utils/runtime-host-reporting.ts',
      'src/schema-diagnostics/index.ts',
    ],
    thresholds: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
});
