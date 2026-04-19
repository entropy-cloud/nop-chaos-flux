import type { SchemaCompileDiagnosticsOptions, SchemaCompileValidationOptions, SchemaDiagnostic } from '../schema-diagnostics';
import type { BaseSchema, SchemaFieldRule, SchemaInput, SchemaPath, ScopePolicy } from './schema';
import type { CompiledCidState } from '../compiled-cid';
import type { CompiledTemplate, NodeMetaProgram, NodeRuntimeState } from './node-identity';

/** @deprecated Use NodeMetaProgram instead. */
export type CompiledSchemaMeta = NodeMetaProgram;
/** @deprecated Use NodeRuntimeState instead. */
export type CompiledNodeRuntimeState = NodeRuntimeState;

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
  diagnostics?: SchemaCompileDiagnosticsOptions;
  validation?: SchemaCompileValidationOptions;
}

export interface CompileNodeOptions {
  path: SchemaPath;
  parentPath?: SchemaPath;
  schemaUrl?: string;
  renderer: import('./renderer-core').RendererDefinition;
  fieldRules?: readonly SchemaFieldRule[];
}

export interface SchemaCompiler {
  compile(schema: SchemaInput, options?: CompileSchemaOptions): CompiledTemplate;
  compileNode(schema: BaseSchema, options: CompileNodeOptions): import('./node-identity').TemplateNode;
  validate?(schema: SchemaInput, options?: CompileSchemaOptions): SchemaDiagnostic[];
}
