import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createTemplateModeExtension: vi.fn(() => ['template-mode']),
  createExpressionLinter: vi.fn(() => ['expression-linter']),
  createFriendlyNameDecoration: vi.fn(() => ['friendly-names']),
  sqlCompletionSource: vi.fn(() => 'sql-completion'),
  expressionCompletionSource: vi.fn(() => 'expression-completion'),
}));

vi.mock('../extensions/expression/template-mode.js', () => ({
  createTemplateModeExtension: mocks.createTemplateModeExtension,
}));
vi.mock('../extensions/expression/linter.js', () => ({
  createExpressionLinter: mocks.createExpressionLinter,
}));
vi.mock('../extensions/expression/decoration.js', () => ({
  createFriendlyNameDecoration: mocks.createFriendlyNameDecoration,
}));
vi.mock('../extensions/sql/completion.js', () => ({
  sqlCompletionSource: mocks.sqlCompletionSource,
}));
vi.mock('../extensions/expression/completion.js', () => ({
  expressionCompletionSource: mocks.expressionCompletionSource,
}));

import { createBaseExtensions } from '../extensions/base.js';

/**
 * Characterization tests（plan 616 F5）：钉住 createBaseExtensions 五条特例路径的
 * 分发行为，作为 registry 收敛重构的行为等价基线——重构前后必须全绿。
 */
describe('createBaseExtensions characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sql + dialect replaces the language extension via createSQLDialectExtension', () => {
    const extensions = createBaseExtensions({
      language: 'sql',
      sqlDialect: 'mysql',
    });
    // 替换语义：createLanguageExtension('sql') 不应再被走（dialect 分支整体替换），
    // 返回数组不包含 undefined 占位
    expect(extensions.length).toBeGreaterThan(3);
    expect(extensions).not.toContain(undefined);
  });

  it('expression template mode uses createTemplateModeExtension', () => {
    const completionConfig = { variables: [{ label: 'a' } as never], functions: [] };
    createBaseExtensions({
      language: 'expression',
      mode: 'template',
      completionConfig,
    });
    expect(mocks.createTemplateModeExtension).toHaveBeenCalledTimes(1);
    expect(mocks.createTemplateModeExtension).toHaveBeenCalledWith(
      completionConfig.variables,
      completionConfig.functions,
    );
    // template 模式不做 expression completion
    expect(mocks.expressionCompletionSource).not.toHaveBeenCalled();
  });

  it('expression code mode with completion wires expressionCompletionSource', () => {
    const completionConfig = {
      variables: [{ label: 'a' } as never],
      functions: [{ name: 'f' } as never],
    };
    createBaseExtensions({
      language: 'expression',
      mode: 'code',
      completionConfig,
    });
    expect(mocks.expressionCompletionSource).toHaveBeenCalledTimes(1);
    expect(mocks.createTemplateModeExtension).not.toHaveBeenCalled();
  });

  it('sql tables completion wires sqlCompletionSource', () => {
    const completionConfig = { tables: [{ name: 't' } as never] };
    createBaseExtensions({
      language: 'sql',
      completionConfig,
    });
    expect(mocks.sqlCompletionSource).toHaveBeenCalledTimes(1);
    expect(mocks.sqlCompletionSource).toHaveBeenCalledWith(completionConfig.tables);
  });

  it('expression lint config wires createExpressionLinter', () => {
    createBaseExtensions({
      language: 'expression',
      lintConfig: { enabled: true } as never,
    });
    expect(mocks.createExpressionLinter).toHaveBeenCalledTimes(1);
  });

  it('friendly names require variables and showFriendlyNames', () => {
    const variables = [{ label: 'a' } as never];
    createBaseExtensions({
      language: 'expression',
      showFriendlyNames: true,
      completionConfig: { variables },
    });
    expect(mocks.createFriendlyNameDecoration).toHaveBeenCalledTimes(1);
    expect(mocks.createFriendlyNameDecoration).toHaveBeenCalledWith(variables);
  });
});
