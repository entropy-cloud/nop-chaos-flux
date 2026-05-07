import type { RendererRegistry } from '@nop-chaos/flux-core';
import {
  CodeEditorRenderer,
  codeEditorRendererDefinition,
  codeEditorFieldRules,
} from './code-editor-renderer.js';

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
} from './types.js';

export {
  getDefaultLineNumbers,
  getDefaultAutoHeight,
  getDefaultHeight,
  isVariableSourceRef,
  isFuncSourceRef,
  isSQLSchemaSourceRef,
  resolveFormatConfig,
  renderInsertTemplate,
} from './types.js';

export {
  useResolvedVariables,
  useResolvedFunctions,
  useResolvedTables,
  useResolvedSQLVariables,
} from './source-resolvers.js';

export { useCodeMirror } from './use-code-mirror.js';
export type { UseCodeMirrorOptions, UseCodeMirrorResult } from './use-code-mirror.js';

export { CodeEditorRenderer, codeEditorRendererDefinition, codeEditorFieldRules };
export const codeEditorRendererDefinitions = [codeEditorRendererDefinition] as const;

export function registerCodeEditorRenderers(registry: RendererRegistry) {
  for (const definition of codeEditorRendererDefinitions) {
    registry.register(definition);
  }
  return registry;
}
