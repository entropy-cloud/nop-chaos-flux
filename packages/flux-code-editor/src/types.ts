import type { ApiObject, BaseSchema } from '@nop-chaos/flux-core';

export type EditorLanguage =
  | 'expression'
  | 'sql'
  | 'json'
  | 'javascript'
  | 'typescript'
  | 'html'
  | 'css'
  | 'plaintext';

export type EditorMode = 'expression' | 'template' | 'code';

export interface CodeEditorSchema extends BaseSchema {
  type: 'code-editor';
  language: EditorLanguage;
  mode?: EditorMode;
  value?: string;
  placeholder?: string;
  width?: number | string;
  height?: number | string;
  lineNumbers?: boolean;
  folding?: boolean;
  autoHeight?: boolean;
  allowFullscreen?: boolean;
  expressionConfig?: any;
  sqlConfig?: any;
  editorTheme?: 'light' | 'dark';
  options?: any;
  onChange?: string;
  onFocus?: string;
  onBlur?: string;
}

export interface ExpressionEditorConfig {
  variables?: VariableItem[] | VariableSourceRef;
  functions?: FuncGroup[] | FuncSourceRef;
  showFriendlyNames?: boolean;
  lint?: boolean | ExpressionLintConfig;
  showFunctionDocs?: boolean;
}

export interface VariableItem {
  label: string;
  value: string;
  type?: string;
  children?: VariableItem[];
  description?: string;
  tags?: string[];
}

export interface FuncGroup {
  groupName: string;
  items: FuncItem[];
}

export interface FuncItem {
  name: string;
  description?: string;
  example?: string;
  returnType?: string;
  params?: FuncParam[];
}

export interface FuncParam {
  name: string;
  type?: string;
  description?: string;
  required?: boolean;
}

export type VariableSourceRef = {
  source: 'scope' | 'api';
  scopePath?: string;
  api?: ApiObject;
  dataPath?: string;
};

export type FuncSourceRef = {
  source: 'builtin' | 'api';
  builtinSet?: string[];
  api?: ApiObject;
  dataPath?: string;
};

export interface ExpressionLintConfig {
  enabled: boolean;
  showOnEdit?: boolean;
  debounceMs?: number;
  customRules?: ExpressionLintRule[];
}

export interface ExpressionLintRule {
  name: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  validate: string;
}

export interface SQLFormatConfig {
  enabled: boolean;
  language?: 'sql' | 'mysql' | 'postgresql' | 'mariadb' | 'tsql' | 'plsql';
  tabWidth?: number;
  keywordCase?: 'upper' | 'lower' | 'preserve';
  indentStyle?: 'standard' | 'tabularLeft' | 'tabularRight';
  logicalOperatorNewline?: 'before' | 'after';
}

export interface CodeSnippetTemplate {
  name: string;
  template: string;
  description?: string;
  icon?: string;
}

export interface VariablePanelConfig {
  enabled: boolean;
  variables?: VariableItem[] | VariableSourceRef;
  insertTemplate?: string;
}

export interface SQLExecutionConfig {
  enabled: boolean;
  onExecute?: string | ApiObject;
  resultPath?: string;
  params?: Record<string, string>;
  showPreview?: boolean;
}

export interface SQLEditorConfig {
  tables?: TableSchema[] | SQLSchemaSourceRef;
  dialect?: SQLDialect;
  keywords?: boolean;
  uppercaseKeywords?: boolean;
  format?: boolean | SQLFormatConfig;
  execution?: SQLExecutionConfig;
  snippets?: CodeSnippetTemplate[];
  variablePanel?: VariablePanelConfig;
}

export type SQLDialect = 'standard' | 'mysql' | 'postgresql' | 'sqlite' | 'mssql';

export interface TableSchema {
  name: string;
  alias?: string;
  description?: string;
  columns: ColumnSchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
  defaultValue?: string;
}

export type SQLSchemaSourceRef = {
  source: 'scope' | 'api';
  scopePath?: string;
  api?: ApiObject;
  dataPath?: string;
};

export interface CodeEditorResolvedProps {
  language: EditorLanguage;
  mode: EditorMode;
  value: string;
  placeholder: string;
  readOnly: boolean;
  expressionConfig?: ExpressionEditorConfig;
  sqlConfig?: SQLEditorConfig;
  editorTheme: 'light' | 'dark';
  lineNumbers: boolean;
  folding: boolean;
  autoHeight: boolean;
  allowFullscreen: boolean;
  height: number | string;
  width: number | string;
  options: Record<string, unknown>;
}

export function getDefaultLineNumbers(language: EditorLanguage): boolean {
  return language !== 'expression';
}

export function getDefaultAutoHeight(language: EditorLanguage): boolean {
  return language === 'expression';
}

export function getDefaultHeight(language: EditorLanguage): number | string {
  return language === 'expression' ? 'auto' : 300;
}

export function isVariableSourceRef(input: unknown): input is VariableSourceRef {
  return typeof input === 'object' && input !== null && 'source' in input;
}

export function isFuncSourceRef(input: unknown): input is FuncSourceRef {
  return typeof input === 'object' && input !== null && 'source' in input;
}

export function isSQLSchemaSourceRef(input: unknown): input is SQLSchemaSourceRef {
  return typeof input === 'object' && input !== null && 'source' in input;
}

export function resolveVariables(config: ExpressionEditorConfig | undefined): VariableItem[] {
  if (!config?.variables) return [];
  if (isVariableSourceRef(config.variables)) return [];
  return config.variables;
}

export function resolveFunctions(config: ExpressionEditorConfig | undefined): FuncGroup[] {
  if (!config?.functions) return [];
  if (isFuncSourceRef(config.functions)) return [];
  return config.functions;
}

export function resolveTables(config: SQLEditorConfig | undefined): TableSchema[] {
  if (!config?.tables) return [];
  if (isSQLSchemaSourceRef(config.tables)) return [];
  return config.tables;
}

export function resolveFormatConfig(config: SQLEditorConfig | undefined): SQLFormatConfig | undefined {
  if (!config?.format) return undefined;
  if (config.format === true) return { enabled: true };
  return config.format;
}

export function resolveSQLVariables(config: SQLEditorConfig | undefined): VariableItem[] {
  if (!config?.variablePanel?.variables) return [];
  if (isVariableSourceRef(config.variablePanel.variables)) return [];
  return config.variablePanel.variables;
}

export function renderInsertTemplate(
  template: string,
  variable: { value: string; label: string },
): string {
  return template
    .replace(/\$\{value\}/g, variable.value)
    .replace(/\$\{label\}/g, variable.label);
}
