import type { RendererRegistry } from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import type { CodeEditorSchema } from './types.js';
import {
  CodeEditorRenderer,
  codeEditorRendererDefinition as _codeEditorRendererDefinition,
} from './code-editor-renderer.js';

const LazyCodeEditorRenderer = createLazyRendererComponent<CodeEditorSchema>(
  () => import('./code-editor-renderer.js').then((m) => m.CodeEditorRenderer),
);

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

export { CodeEditorRenderer };
export const codeEditorRendererDefinition = {
  ..._codeEditorRendererDefinition,
  component: LazyCodeEditorRenderer,
};
export const codeEditorRendererDefinitions = [codeEditorRendererDefinition] as const;

export function registerCodeEditorRenderers(registry: RendererRegistry) {
  for (const definition of codeEditorRendererDefinitions) {
    registry.register(definition);
  }
  return registry;
}
