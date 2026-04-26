import { createSharedVitestConfig } from '../../vitest.shared';

export default createSharedVitestConfig({
  environment: 'node',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary'],
    include: [
      'src/compile.ts',
      'src/date-helper.ts',
      'src/lexer.ts',
      'src/parser.ts',
      'src/evaluator.ts',
      'src/registry.ts',
      'src/builtins.ts',
      'src/template.ts',
      'src/scope.ts'
    ],
    thresholds: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
});
