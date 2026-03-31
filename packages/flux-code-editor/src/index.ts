export type {
  CodeEditorSchema,
  CodeEditorResolvedProps,
  EditorLanguage,
  EditorMode,
  ExpressionEditorConfig,
  ExpressionLintConfig,
  ExpressionLintRule,
  VariableItem,
  VariableSourceRef,
  FuncGroup,
  FuncItem,
  FuncParam,
  FuncSourceRef,
  SQLEditorConfig,
  SQLDialect,
  SQLSchemaSourceRef,
  TableSchema,
  ColumnSchema,
  SQLFormatConfig,
  CodeSnippetTemplate,
  VariablePanelConfig,
  SQLExecutionConfig,
} from './types';

export {
  getDefaultLineNumbers,
  getDefaultAutoHeight,
  getDefaultHeight,
  isVariableSourceRef,
  isFuncSourceRef,
  isSQLSchemaSourceRef,
  resolveVariables,
  resolveFunctions,
  resolveTables,
  resolveFormatConfig,
  resolveSQLVariables,
  renderInsertTemplate,
} from './types';

export { useCodeMirror } from './use-code-mirror';
export type { UseCodeMirrorOptions, UseCodeMirrorResult } from './use-code-mirror';

export { CodeEditorRenderer, codeEditorRendererDefinition, codeEditorFieldRules } from './code-editor-renderer';

export { createBaseExtensions, createLanguageExtension, createSQLDialectExtension } from './extensions/base';
export type { CompletionConfig, CreateBaseExtensionsOptions } from './extensions/base';

export { createExpressionLinter } from './extensions/expression/linter';

export { createFriendlyNameDecoration } from './extensions/expression/decoration';

export { createTemplateModeExtension } from './extensions/expression/template-mode';

export { SnippetPanel } from './extensions/snippet-panel';
export { VariablePanel } from './variable-panel';
export { SQLResultPanel } from './sql-result-panel';
export type { SQLResultState } from './sql-result-panel';
