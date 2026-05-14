import type {
  SchemaCompileDiagnosticsOptions,
  SchemaCompileValidationOptions,
  SchemaDiagnostic,
} from '../schema-diagnostics/index.js';
import type {
  BaseSchema,
  SchemaFieldRule,
  SchemaInput,
  SchemaPath,
  ScopePolicy,
} from './schema.js';
import type { CompiledCidState } from '../compiled-cid.js';
import type { CompiledTemplate } from './node-identity.js';
import type { CompileSymbolTable } from './compilation.js';

export type WrapProvidersFn = (
  wrapProvider: (kind: string, value: unknown, children: unknown) => unknown,
  values: Record<string, unknown>,
  children: unknown,
) => unknown;

export interface ResolvedNodeProps {
  value: Readonly<Record<string, unknown>>;
  changed: boolean;
  reusedReference: boolean;
}

export interface ResolvedNodeMeta {
  id?: string;
  className?: string;
  frameClassName?: string;
  when?: boolean;
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
  signal?: AbortSignal;
  parentScopePolicy?: ScopePolicy;
  cidState?: CompiledCidState;
  symbolTable?: CompileSymbolTable;
  preparedImports?: ReadonlyMap<string, import('./compilation.js').PreparedImportSpec>;
  importLoader?: import('./actions.js').ImportedLibraryLoader;
  resolveImportUrl?: (schemaUrl: string, from: string, options?: Record<string, unknown>) => string;
  diagnostics?: SchemaCompileDiagnosticsOptions;
  validation?: SchemaCompileValidationOptions;
}

export interface PreparedSchemaCompileResult {
  schema: SchemaInput;
  preparedImports: ReadonlyMap<string, import('./compilation.js').PreparedImportSpec>;
}

export interface CompileNodeOptions {
  path: SchemaPath;
  parentPath?: SchemaPath;
  schemaUrl?: string;
  symbolTable?: CompileSymbolTable;
  preparedImports?: ReadonlyMap<string, import('./compilation.js').PreparedImportSpec>;
  renderer: import('./renderer-core.js').RendererDefinition;
  fieldRules?: readonly SchemaFieldRule[];
  diagnostics?: { enabled?: boolean };
}

export interface SchemaCompiler {
  compile(schema: SchemaInput, options?: CompileSchemaOptions): CompiledTemplate;
  prepare?(
    schema: SchemaInput,
    options?: CompileSchemaOptions,
  ): Promise<PreparedSchemaCompileResult>;
  compileNode(
    schema: BaseSchema,
    options: CompileNodeOptions,
  ): import('./node-identity.js').TemplateNode;
  validate?(schema: SchemaInput, options?: CompileSchemaOptions): SchemaDiagnostic[];
}
