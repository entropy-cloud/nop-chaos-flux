import type { CompiledRuntimeValue, RuntimeValueState } from './compilation';
import type { SchemaCompileDiagnosticsOptions, SchemaCompileValidationOptions, SchemaDiagnostic } from '../schema-diagnostics';
import type { BaseSchema, FieldLinkageSchema, SchemaFieldRule, SchemaInput, SchemaPath, ScopePolicy } from './schema';
import type { ScopeDependencySet } from './scope';
import type { CompiledFormValidationModel } from './validation';
import type { CompiledCidState } from '../compiled-cid';
import type { CompiledTemplate } from './node-identity';

export interface CompiledSchemaMeta {
  id?: CompiledRuntimeValue<string | undefined>;
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
  /**
   * Declared parameter names for parameterized regions (see SchemaFieldRule.params).
   * When present, region instantiation publishes a reserved $slot frame containing
   * the provided bindings rather than flattening them into ordinary top-level scope names.
   */
  params?: readonly string[];
  /**
   * When true, the child scope created for this parameterized region is
   * isolated from parent lexical scope.
   */
  isolate?: boolean;
}

export interface CompiledNodeFlags {
  hasVisibilityRule: boolean;
  hasHiddenRule: boolean;
  hasDisabledRule: boolean;
  isContainer: boolean;
  isStatic: boolean;
}

export interface CompiledNodeRuntimeBoundaries {
  mayPublishScope: boolean;
  mayPublishActionScope: boolean;
  mayPublishComponentRegistry: boolean;
  mayPublishClassAliases: boolean;
}

export interface CompiledNodeRenderPlanProviders {
  actionScope: boolean;
  componentRegistry: boolean;
  classAliases: boolean;
}

export type WrapProvidersFn = (
  wrapProvider: (kind: string, value: unknown, children: unknown) => unknown,
  values: Record<string, unknown>,
  children: unknown
) => unknown;

export interface CompiledNodeRenderPlan {
  providers: CompiledNodeRenderPlanProviders;
  wrapProviders: WrapProvidersFn;
}

export interface CompiledNodeLinkageEffect {
  visible?: CompiledRuntimeValue<boolean | unknown>;
  disabled?: CompiledRuntimeValue<boolean | unknown>;
  required?: CompiledRuntimeValue<boolean | unknown>;
  options?: CompiledRuntimeValue<unknown>;
}

export interface CompiledNodeLinkage {
  source: FieldLinkageSchema;
  dependencies?: readonly string[];
  when: CompiledRuntimeValue<boolean | unknown>;
  fulfill?: CompiledNodeLinkageEffect;
  otherwise?: CompiledNodeLinkageEffect;
}

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

export interface CompiledNodeRuntimeState {
  meta: Record<string, RuntimeValueState<unknown>>;
  props?: RuntimeValueState<Record<string, unknown>>;
  linkage?: {
    when?: RuntimeValueState<unknown>;
    fulfill?: Record<string, RuntimeValueState<unknown>>;
    otherwise?: Record<string, RuntimeValueState<unknown>>;
  };
  metaDependencies?: ScopeDependencySet;
  propsDependencies?: ScopeDependencySet;
  resolvedMeta?: ResolvedNodeMeta;
  resolvedProps?: Readonly<Record<string, unknown>>;
  _staticPropsResult?: ResolvedNodeProps;
  _lastPropsResult?: ResolvedNodeProps;
}

/**
 * @internal Compiler artifact. Do not use in renderer components or runtime paths.
 * Use TemplateNode (from CompiledTemplate) and NodeInstance instead.
 */
export interface CompiledSchemaNode<S extends BaseSchema = BaseSchema> {
  id: string;
  type: S['type'];
  path: SchemaPath;
  cid?: number;
  templateGraphId?: string;
  templateNodeId?: number;
  schema: S;
  extensions?: Readonly<Record<string, unknown>>;
  component: import('./renderer-core').RendererDefinition<S>;
  meta: CompiledSchemaMeta;
  props: CompiledRuntimeValue<Record<string, unknown>>;
  linkage?: CompiledNodeLinkage;
  sourcePropKeys: readonly string[];
  sourceStatePropKeys: Readonly<Record<string, string>>;
  validation?: CompiledFormValidationModel;
  regions: Readonly<Record<string, CompiledRegion>>;
  lifecycleActions?: Readonly<{
    onMount?: unknown;
    onUnmount?: unknown;
  }>;
  eventActions: Readonly<Record<string, unknown>>;
  eventKeys: readonly string[];
  flags: CompiledNodeFlags;
  renderPlan: CompiledNodeRenderPlan;
  runtimeBoundaries: CompiledNodeRuntimeBoundaries;
  createRuntimeState(): CompiledNodeRuntimeState;
}

export interface CompileSchemaOptions {
  basePath?: SchemaPath;
  parentPath?: SchemaPath;
  parentScopePolicy?: ScopePolicy;
  cidState?: CompiledCidState;
  diagnostics?: SchemaCompileDiagnosticsOptions;
  validation?: SchemaCompileValidationOptions;
}

export interface CompileNodeOptions {
  path: SchemaPath;
  parentPath?: SchemaPath;
  renderer: import('./renderer-core').RendererDefinition;
  fieldRules?: readonly SchemaFieldRule[];
}

export interface SchemaCompiler {
  compile(schema: SchemaInput, options?: CompileSchemaOptions): CompiledTemplate;
  compileNode(schema: BaseSchema, options: CompileNodeOptions): CompiledSchemaNode;
  validate?(schema: SchemaInput, options?: CompileSchemaOptions): SchemaDiagnostic[];
}
