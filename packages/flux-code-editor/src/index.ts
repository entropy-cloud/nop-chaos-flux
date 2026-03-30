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
} from './types';

export { useCodeMirror } from './use-code-mirror';
export type { UseCodeMirrorOptions, UseCodeMirrorResult } from './use-code-mirror';

export { CodeEditorRenderer, codeEditorRendererDefinition, codeEditorFieldRules } from './code-editor-renderer';

export { createBaseExtensions, createLanguageExtension, createSQLDialectExtension } from './extensions/base';
export type { CompletionConfig, CreateBaseExtensionsOptions } from './extensions/base';
