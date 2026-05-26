import type {
  CompiledRuntimeValue,
  RuntimeValueState,
  CompiledDataSource,
  CompiledReaction,
} from './compilation.js';
import type {
  CompiledRendererContract,
  TemplateCompiledActionProgram,
} from './compiled-renderer-contract.js';
import type { ResolvedNodeMeta, ResolvedNodeProps } from './resolved-node-types.js';
import type { BaseSchema, SchemaPath } from './schema.js';
import type { ScopeDependencySet, ScopeRef } from './scope.js';

type WrapProvidersFn = (
  wrapProvider: (kind: string, value: unknown, children: unknown) => unknown,
  values: Record<string, unknown>,
  children: unknown,
) => unknown;

/**
 * Compiler-computed static analysis results.
 * Computed bottom-up during schema compilation (post-order traversal).
 *
 * @see docs/plans/131-static-analysis-optimization-plan.md
 */
export interface StaticAnalysisResult {
  /**
   * This node and all descendants are fully static.
   * True only when ALL conditions are met:
   * - Renderer declares staticCapable: true
   * - Props have no expressions (propsProgram.isStatic)
   * - No name binding in schema
   * - No event handlers (eventPlans is empty)
   * - No scope creation (scopePlan doesn't create scope)
   * - All children are static (recursive, computed bottom-up)
   */
  isStaticContent: boolean;

  /**
   * Extracted dependency paths from expressions.
   * Empty array if node is fully static.
   * Used for fine-grained reactivity tracking.
   */
  dependencies: readonly string[];
}

export type TemplateNodeId = number;
export type RepeatedTemplateId = string;
export type RuntimeId = string;
export type InstanceKey = string;

export interface InstanceFrame {
  repeatedTemplateId: RepeatedTemplateId;
  instanceKey: InstanceKey;
}

export interface TemplateRegion {
  key: string;
  path: SchemaPath;
  node: TemplateNode | readonly TemplateNode[] | null;
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

export type ScopePlan =
  | { kind: 'inherit' }
  | { kind: 'child'; bindings?: Readonly<Record<string, CompiledRuntimeValue<unknown>>> }
  | { kind: 'form' }
  | { kind: 'dialog' }
  | {
      kind: 'repeated-item';
      item?: string;
      index?: string;
      key?: string;
      record?: string;
    };

export type RegistryPlan = Readonly<Record<string, unknown>>;
export type ValidationPlan = import('./validation.js').CompiledFormValidationModel;
export type RuntimeProgramState<T = unknown> = RuntimeValueState<T>;

export interface NodeRuntimeState {
  meta: Record<string, RuntimeValueState<unknown>>;
  props?: RuntimeValueState<Record<string, unknown>>;
  metaDependencies?: ScopeDependencySet;
  propsDependencies?: ScopeDependencySet;
  resolvedMeta?: ResolvedNodeMeta;
  resolvedProps?: Readonly<Record<string, unknown>>;
  _staticPropsResult?: ResolvedNodeProps;
  _lastPropsResult?: ResolvedNodeProps;
}

export type NodeMetaProgram = {
  id?: CompiledRuntimeValue<string | undefined>;
  className?: CompiledRuntimeValue<string | undefined>;
  frameClassName?: CompiledRuntimeValue<string | undefined>;
  when?: CompiledRuntimeValue<boolean | unknown>;
  visible?: CompiledRuntimeValue<boolean | unknown>;
  hidden?: CompiledRuntimeValue<boolean | unknown>;
  disabled?: CompiledRuntimeValue<boolean | undefined>;
  testid?: CompiledRuntimeValue<string | undefined>;
};

export interface TemplateProviderPlan {
  actionScope: boolean;
  componentRegistry: boolean;
  classAliases: boolean;
}

export interface TemplateImportsPlan {
  imports: readonly import('./schema.js').XuiImportSpec[];
  resolvedImports: readonly import('./schema.js').XuiImportSpec[];
  preparedImports: readonly import('./compilation.js').PreparedImportSpec[];
  staticMeta?: Readonly<Record<string, import('./compilation.js').ImportedLibraryStaticMeta>>;
}

export interface TemplateClassAliasesPlan {
  aliases: Readonly<Record<string, string>>;
}

export interface TemplateNode<S extends BaseSchema = BaseSchema> {
  templateNodeId: TemplateNodeId;
  id: string;
  type: S['type'];
  schema: S;
  templatePath: SchemaPath;
  schemaUrl?: string;
  rendererType: string;
  component: CompiledRendererContract<S>;
  propsProgram: CompiledRuntimeValue<Record<string, unknown>>;
  metaProgram: NodeMetaProgram;
  structuralWhen?: CompiledRuntimeValue<boolean | unknown>;
  structuralFields?: Readonly<Record<string, CompiledRuntimeValue<unknown>>>;
  eventPlans: Readonly<Record<string, TemplateCompiledActionProgram>>;
  lifecycleActions?: Readonly<{
    onMount?: TemplateCompiledActionProgram;
    onUnmount?: TemplateCompiledActionProgram;
  }>;
  regions: Readonly<Record<string, TemplateRegion>>;
  providerPlan?: TemplateProviderPlan;
  providerWrap?: WrapProvidersFn;
  classAliasesPlan?: TemplateClassAliasesPlan;
  importsPlan?: TemplateImportsPlan;
  scopePlan: ScopePlan;
  registryPlan?: RegistryPlan;
  validationPlan?: ValidationPlan;
  validationOwnerPlan?: import('./validation.js').ValidationOwnerPlan;
  sourcePropKeys: readonly string[];
  sourceStatePropKeys: Readonly<Record<string, string>>;
  /**
   * Compiler-computed static analysis results.
   * Used by framework adapters for optimization decisions.
   * Computed bottom-up during schema compilation (children first, then parents).
   *
   * @see docs/plans/131-static-analysis-optimization-plan.md
   */
  staticAnalysis?: StaticAnalysisResult;

  /**
   * Compiled data sources - all expressions pre-compiled.
   * Replaces runtime access to raw schema.sources.
   *
   * @see docs/plans/132-runtime-schema-dependency-elimination-plan.md
   */
  compiledSources?: readonly CompiledDataSource[];

  /**
   * Compiled reactions - all expressions pre-compiled.
   * Replaces runtime access to raw schema.reactions.
   *
   * @see docs/plans/132-runtime-schema-dependency-elimination-plan.md
   */
  compiledReactions?: readonly CompiledReaction[];
  namedActionPlans?: Readonly<Record<string, TemplateCompiledActionProgram>>;
}

export interface RepeatedTemplate {
  repeatedTemplateId: RepeatedTemplateId;
  root: TemplateNode | readonly TemplateNode[];
  itemBindings: {
    item?: string;
    index?: string;
    key?: string;
    record?: string;
  };
}

export interface CompiledTemplate {
  root: TemplateNode | readonly TemplateNode[];
  repeatedTemplates: ReadonlyMap<RepeatedTemplateId, RepeatedTemplate>;
}

export interface NodeState {
  metaState: Record<string, RuntimeProgramState<unknown>>;
  propsState?: RuntimeProgramState<Record<string, unknown>>;
  metaDependencies?: ScopeDependencySet;
  propsDependencies?: ScopeDependencySet;
  resolvedMeta?: unknown;
  resolvedProps?: unknown;
  mounted: boolean;
}

export interface NodeInstance<S extends BaseSchema = BaseSchema> {
  cid?: number;
  instancePath?: readonly InstanceFrame[];
  templateNode: TemplateNode<S>;
  scope: ScopeRef;
  state: NodeState;
}

export interface ResolutionContext {
  runtimeId: RuntimeId;
  instancePath?: readonly InstanceFrame[];
}

export interface ScopeSnapshot {
  id?: string;
  path?: string;
  label?: string;
  data: Record<string, unknown>;
}

export interface NodeInspectPayload {
  cid: number;
  instancePath?: readonly InstanceFrame[];
  state?: NodeState;
  scopeChain?: readonly ScopeSnapshot[];
  resolvedMeta?: unknown;
  resolvedProps?: unknown;
}

export type InspectResult =
  | { kind: 'resolved'; payload: NodeInspectPayload }
  | { kind: 'notMaterialized'; cid?: number; instancePath?: readonly InstanceFrame[] }
  | { kind: 'notFound' };

export interface NodeRefRegistry {
  resolveCid(cid: number): NodeInstance | undefined;
  inspectCid(cid: number): InspectResult;
}
