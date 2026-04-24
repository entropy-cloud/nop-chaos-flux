import type { SchemaCompileDiagnosticsOptions, SchemaCompileValidationOptions, SchemaDiagnostic } from '../schema-diagnostics';
import type { BaseSchema, SchemaFieldRule, SchemaInput, SchemaPath, ScopePolicy } from './schema';
import type { CompiledCidState } from '../compiled-cid';
import type { CompiledTemplate } from './node-identity';
import type { CompileSymbolTable } from './compilation';

export type WrapProvidersFn = (
  wrapProvider: (kind: string, value: unknown, children: unknown) => unknown,
  values: Record<string, unknown>,
  children: unknown
) => unknown;

export interface ResolvedNodeProps {
  value: Readonly<Record<string, unknown>>;
  changed: boolean;
  reusedReference: boolean;
}

export interface ResolvedNodeMeta {
  id?: string;
  className?: string;
  visible: boolean;
  hidden: boolean;
  disabled: boolean;
  testid?: string;
  changed: boolean;
  cid?: number;
}

export interface CompileSchemaOptions {
  basePath?: SchemaPath;
  parentPath?: SchemaPath;
  schemaUrl?: string;
  parentScopePolicy?: ScopePolicy;
  cidState?: CompiledCidState;
  symbolTable?: CompileSymbolTable;
  preparedImports?: ReadonlyMap<string, import('./compilation').PreparedImportSpec>;
  importLoader?: import('./actions').ImportedLibraryLoader;
  resolveImportUrl?: (schemaUrl: string, from: string, options?: Record<string, unknown>) => string;
  diagnostics?: SchemaCompileDiagnosticsOptions;
  validation?: SchemaCompileValidationOptions;
}

export interface PreparedSchemaCompileResult {
  schema: SchemaInput;
  preparedImports: ReadonlyMap<string, import('./compilation').PreparedImportSpec>;
}

export interface CompileNodeOptions {
  path: SchemaPath;
  parentPath?: SchemaPath;
  schemaUrl?: string;
  symbolTable?: CompileSymbolTable;
  preparedImports?: ReadonlyMap<string, import('./compilation').PreparedImportSpec>;
  renderer: import('./renderer-core').RendererDefinition;
  fieldRules?: readonly SchemaFieldRule[];
}

export interface SchemaCompiler {
  compile(schema: SchemaInput, options?: CompileSchemaOptions): CompiledTemplate;
  prepare?(schema: SchemaInput, options?: CompileSchemaOptions): Promise<PreparedSchemaCompileResult>;
  compileNode(schema: BaseSchema, options: CompileNodeOptions): import('./node-identity').TemplateNode;
  validate?(schema: SchemaInput, options?: CompileSchemaOptions): SchemaDiagnostic[];
}
