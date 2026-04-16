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
      'src/validation-model.ts',
      'src/utils/path-binding.ts',
      'src/utils/instance-path.ts'
    ],
    thresholds: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
});
