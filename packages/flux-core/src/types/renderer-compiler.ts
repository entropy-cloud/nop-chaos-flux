import type { CompiledRuntimeValue, RuntimeValueState } from './compilation';
import type { BaseSchema, SchemaFieldRule, SchemaInput, SchemaPath, ScopePolicy } from './schema';
import type { ScopeDependencySet } from './scope';
import type { CompiledFormValidationModel } from './validation';

export interface CompiledSchemaMeta {
  id?: CompiledRuntimeValue<string | undefined>;
  name?: CompiledRuntimeValue<string | undefined>;
  label?: CompiledRuntimeValue<string | undefined>;
  title?: CompiledRuntimeValue<string | undefined>;
  className?: CompiledRuntimeValue<string | undefined>;
  visible?: CompiledRuntimeValue<boolean | unknown>;
  hidden?: CompiledRuntimeValue<boolean | unknown>;
  disabled?: CompiledRuntimeValue<boolean | unknown>;
  testid?: CompiledRuntimeValue<string | undefined>;
}

export interface CompiledRegion {
  key: string;
  path: SchemaPath;
  node: CompiledSchemaNode | CompiledSchemaNode[] | null;
}

export interface CompiledNodeFlags {
  hasVisibilityRule: boolean;
  hasHiddenRule: boolean;
  hasDisabledRule: boolean;
  isContainer: boolean;
  isStatic: boolean;
}

export interface ResolvedNodeProps {
  value: Readonly<Record<string, unknown>>;
  changed: boolean;
  reusedReference: boolean;
}

export interface ResolvedNodeMeta {
  id?: string;
  name?: string;
  label?: string;
  title?: string;
  className?: string;
  visible: boolean;
  hidden: boolean;
  disabled: boolean;
  testid?: string;
  changed: boolean;
  cid?: number;
}

export interface CompiledNodeRuntimeState {
  meta: Record<string, RuntimeValueState<unknown>>;
  props?: RuntimeValueState<Record<string, unknown>>;
  metaDependencies?: ScopeDependencySet;
  propsDependencies?: ScopeDependencySet;
  resolvedMeta?: ResolvedNodeMeta;
  resolvedProps?: Readonly<Record<string, unknown>>;
  _staticPropsResult?: ResolvedNodeProps;
  _lastPropsResult?: ResolvedNodeProps;
}

export interface CompiledSchemaNode<S extends BaseSchema = BaseSchema> {
  id: string;
  type: S['type'];
  path: SchemaPath;
  schema: S;
  component: import('./renderer-core').RendererDefinition<S>;
  meta: CompiledSchemaMeta;
  props: CompiledRuntimeValue<Record<string, unknown>>;
  validation?: CompiledFormValidationModel;
  regions: Readonly<Record<string, CompiledRegion>>;
  eventActions: Readonly<Record<string, unknown>>;
  eventKeys: readonly string[];
  flags: CompiledNodeFlags;
  createRuntimeState(): CompiledNodeRuntimeState;
}

export interface CompileSchemaOptions {
  basePath?: SchemaPath;
  parentPath?: SchemaPath;
  parentScopePolicy?: ScopePolicy;
}

export interface CompileNodeOptions {
  path: SchemaPath;
  parentPath?: SchemaPath;
  renderer: import('./renderer-core').RendererDefinition;
  fieldRules?: readonly SchemaFieldRule[];
}

export interface SchemaCompiler {
  compile(schema: SchemaInput, options?: CompileSchemaOptions): CompiledSchemaNode | CompiledSchemaNode[];
  compileNode(schema: BaseSchema, options: CompileNodeOptions): CompiledSchemaNode;
}
