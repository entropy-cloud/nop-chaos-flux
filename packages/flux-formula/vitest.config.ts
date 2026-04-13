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
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
});
