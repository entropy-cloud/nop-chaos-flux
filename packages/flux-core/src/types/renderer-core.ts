import type {
  ActionContext,
  ActionResult,
  ActionSchema,
  ActionScope,
  CompiledActionProgram,
} from './actions.js';
import type { AsyncOwnerDebugSnapshot, AsyncOwnerDebugState } from './async-governance.js';
import type {
  CompiledDataSource,
  CompiledReaction,
  CompiledRuntimeValue,
  ExpressionCompiler,
  ImportStack,
  ModuleCache,
  PreparedImportSpec,
  SymbolInfo,
} from './compilation.js';
import type {
  CapabilityMethodContract,
  FluxValueShape,
  RendererHostContract,
} from '../schema-diagnostics/index.js';
import type {
  NodeInstance,
  NodeRuntimeState,
  ResolutionContext,
  TemplateNode,
} from './node-identity.js';
import type { ComponentHandleRegistry, ComponentTarget } from './renderer-component.js';
import type { RendererEnv } from './renderer-api.js';
import type { ResolvedNodeMeta, ResolvedNodeProps, SchemaCompiler } from './renderer-compiler.js';
import type { RenderFragmentOptions, RenderNodeInput, RenderRegionHandle } from './renderer-hooks.js';
import type { RendererPlugin } from './renderer-plugin.js';
import type {
  DataSourceController,
  DataSourceRegistration,
  FormLifecycleHandlers,
  FormRuntime,
  PageRuntime,
  ValidationScopeRuntime,
} from './runtime.js';
import type {
  BaseSchema,
  SchemaFieldRule,
  SchemaInput,
  SchemaPath,
  ScopePolicy,
  SourceSchema,
  XuiImportSpec,
} from './schema.js';
import type { CreateScopeOptions, ScopeRef } from './scope.js';
import type {
  ChildValidationMode,
  CompiledFormValidationModel,
  ValidationOwnerBoundaryKind,
  ValidationRule,
} from './validation.js';
import type { CompiledTemplate } from './node-identity.js';

export interface ValidationCollectContext<S extends BaseSchema = BaseSchema> {
  schema: S;
  renderer: RendererDefinition<S>;
  path: SchemaPath;
  fieldPathPrefix?: string;
}

export interface ValidationContributor<S extends BaseSchema = BaseSchema> {
  kind: 'field' | 'container' | 'none';
  valueKind?: 'scalar' | 'array' | 'object';
  ownerResolution?: ValidationOwnerBoundaryKind;
  childContractMode?: ChildValidationMode;
  getFieldPath?(schema: S, ctx: ValidationCollectContext<S>): string | undefined;
  collectRules?(schema: S, ctx: ValidationCollectContext<S>): ValidationRule[];
  /**
   * Returns the prefix to use for child field paths during validation compilation.
   * Return `false` to skip validation compilation for child nodes (useful for array-field
   * where child validation is handled at runtime via registerField).
   */
  getChildFieldPathPrefix?(schema: S, ctx: ValidationCollectContext<S>): string | false | undefined;
}

type BivariantCallback<Args extends readonly unknown[], Result> = {
  bivarianceHack(...args: Args): Result;
}['bivarianceHack'];

export interface RendererHelpers {
  render: (input: RenderNodeInput, options?: RenderFragmentOptions) => RendererRenderOutput;
  evaluate: <T = unknown>(target: unknown, scope?: ScopeRef) => T;
  createScope: (patch?: object, options?: CreateScopeOptions) => ScopeRef;
  dispatch: (
    action: ActionSchema | ActionSchema[] | CompiledActionProgram,
    ctx?: Partial<ActionContext>,
  ) => Promise<ActionResult>;
  executeSource: (source: SourceSchema, options?: { scope?: ScopeRef }) => Promise<ActionResult>;
}

export type RendererRenderOutput = unknown;

export type RendererResolvedProps<S extends BaseSchema = BaseSchema> = Record<string, any> &
  Partial<S>;

export interface ReactionDebugEntry {
  id: string;
  scopeId: string;
  watch: unknown;
  when?: string;
  immediate?: boolean;
  debounce?: number;
  once?: boolean;
  disposed: boolean;
  queued: boolean;
  running: boolean;
  fireCount: number;
  dependencies?: readonly string[];
  async?: AsyncOwnerDebugState;
}

export interface ReactionRegistryDebugSnapshot {
  reactions: ReactionDebugEntry[];
}

export interface SourceDebugEntry {
  id: string;
  scopeId: string;
  name?: string;
  targetPath?: string;
  statusPath?: string;
  dependencies?: readonly string[];
  started: boolean;
  status: 'idle' | 'pending' | 'success' | 'error';
  fetchStatus: 'idle' | 'fetching';
  loading: boolean;
  stale: boolean;
  hasValue: boolean;
  error?: string;
  async?: AsyncOwnerDebugState;
}

export interface SourceRegistryDebugSnapshot {
  sources: SourceDebugEntry[];
}

export interface SourceTransientState {
  loading: boolean;
  error: unknown;
  status: 'idle' | 'loading' | 'ready' | 'error';
}

export interface AnonymousSourceEntry {
  key: string;
  source: SourceSchema;
  stateKey?: string;
}

export interface SourceObserverSnapshot {
  value: Readonly<Record<string, unknown>>;
}

export interface SourceObserver {
  getSnapshot(): SourceObserverSnapshot;
  subscribe(listener: () => void): () => void;
  run(input: {
    scope: ScopeRef;
    entries: readonly AnonymousSourceEntry[];
    baseValue?: Readonly<Record<string, unknown>>;
  }): void;
  dispose(): void;
}

export type RendererEventHandler = (
  event?: unknown,
  ctx?: Partial<ActionContext>,
) => Promise<ActionResult>;

export interface RendererComponentProps<
  S extends BaseSchema = BaseSchema,
  P extends Record<string, unknown> = RendererResolvedProps<S>,
> {
  id: string;
  path: SchemaPath;
  schema: S;
  templateNode: TemplateNode<S>;
  node: NodeInstance<S>;
  props: Readonly<P>;
  meta: ResolvedNodeMeta;
  regions: Readonly<Record<string, RenderRegionHandle>>;
  events: Readonly<Record<string, RendererEventHandler | undefined>>;
  helpers: RendererHelpers;
}

export type RendererRendererClass =
  | 'instance-renderer'
  | 'flux-owner-renderer'
  | 'domain-host-renderer';

export interface RendererPropContract {
  shape: FluxValueShape;
  displayName: string;
  description?: string;
  editorType?: string;
  defaultValue?: unknown;
  required?: boolean;
}

export interface RendererEventContract {
  displayName: string;
  description?: string;
  payload?: FluxValueShape;
}

/**
 * Ordinary renderer capability metadata reuses the shared method-contract language but keeps
 * a renderer-local envelope instead of adopting the host manifest envelope.
 */
export interface RendererCapabilityContract extends CapabilityMethodContract {
  handle: string;
  displayName: string;
}

export interface RendererDefinition<
  S extends BaseSchema = BaseSchema,
  P extends Record<string, unknown> = RendererResolvedProps<S>,
> {
  type: S['type'];
  component?: BivariantCallback<[RendererComponentProps<S, P>], RendererRenderOutput>;
  displayName?: string;
  icon?: string;
  category?: string;
  defaultSchema?: Partial<S>;
  propSchema?: Record<string, unknown>;
  rendererClass?: RendererRendererClass;
  rendererTraits?: readonly string[];
  propContracts?: Readonly<Record<string, RendererPropContract>>;
  eventContracts?: Readonly<Record<string, RendererEventContract>>;
  componentCapabilityContracts?: readonly RendererCapabilityContract[];
  /**
   * Narrow readonly Flux-native exports such as $form or $crud summaries.
   * This is not host projection and must not be used as a host-manifest substitute.
   */
  scopeExportContracts?: Readonly<Record<string, FluxValueShape>>;
  injectedLocals?: Readonly<Record<string, Omit<SymbolInfo, 'name'>>>;
  sourcePackage?: string;
  fields?: readonly SchemaFieldRule[];
  authoringTransform?: BivariantCallback<
    [import('../schema-diagnostics/index.js').RendererAuthoringTransformContext<S>],
    S
  >;
  schemaValidator?: BivariantCallback<
    [import('../schema-diagnostics/index.js').RendererSchemaValidationContext<S>],
    void
  >;
  scopePolicy?: ScopePolicy;
  actionScopePolicy?: 'inherit' | 'new';
  componentRegistryPolicy?: 'inherit' | 'new';
  validation?: ValidationContributor<S>;
  wrap?: boolean;
  /**
   * Whether this renderer supports static rendering (no client interaction needed).
   * Used by the compiler for bottom-up static analysis.
   *
   * - true: display-only renderers (text, image, container, flex, heading, etc.)
   * - false: interactive renderers (input, button, select, form, etc.)
   *
   * Default: false (safe default - assume interactive unless declared otherwise)
   *
   * @see docs/plans/131-static-analysis-optimization-plan.md
   */
  staticCapable?: boolean;
  /**
   * Host contract metadata for publishing owner renderers.
   * Only renderers that act as host boundaries (e.g., designer-page, report-designer-page)
   * should define this field.
   *
   * See: docs/architecture/capability-projection-manifest.md
   */
  hostContract?: RendererHostContract;
}

export interface RendererRegistry {
  register(definition: RendererDefinition, options?: { override?: boolean }): void;
  get(type: string): RendererDefinition | undefined;
  has(type: string): boolean;
  list(): RendererDefinition[];
}

export interface RendererRuntime {
  runtimeId: string;
  registry: RendererRegistry;
  env: RendererEnv;
  expressionCompiler: ExpressionCompiler;
  schemaCompiler: SchemaCompiler;
  plugins: readonly RendererPlugin[];
  importStack: ImportStack;
  strictMode: boolean;
  compile(schema: SchemaInput): CompiledTemplate;
  prepareSchema?(
    schema: SchemaInput,
    options?: {
      schemaUrl?: string;
    },
  ): Promise<{
    preparedImports: ReadonlyMap<string, PreparedImportSpec>;
  }>;
  evaluate<T = unknown>(target: unknown, scope: ScopeRef): T;
  allocateMountedCid(): number;
  resolveTarget(
    target: ComponentTarget,
    ctx: ResolutionContext & { componentRegistry?: ComponentHandleRegistry },
  ): NodeInstance | undefined;
  resolveNodeMeta(node: TemplateNode, scope: ScopeRef, state?: NodeRuntimeState): ResolvedNodeMeta;
  resolveNodeProps(
    node: TemplateNode,
    scope: ScopeRef,
    state?: NodeRuntimeState,
  ): ResolvedNodeProps;
  createChildScope(parent: ScopeRef, patch?: object, options?: CreateScopeOptions): ScopeRef;
  createHostProjectionScope(input: {
    parentScope: ScopeRef;
    projection: Record<string, unknown>;
    path: string;
    scopeLabel: string;
  }): ScopeRef;
  createActionScope(input?: { id?: string; parent?: ActionScope }): ActionScope;
  createComponentHandleRegistry(input?: {
    id?: string;
    parent?: ComponentHandleRegistry;
  }): ComponentHandleRegistry;
  resolvePreparedImports(input: {
    imports?: readonly XuiImportSpec[];
    schemaUrl: string;
  }): readonly PreparedImportSpec[];
  ensureImportedNamespaces(input: {
    imports?: readonly PreparedImportSpec[];
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    scope: ScopeRef;
    schemaUrl: string;
    nodeInstance?: NodeInstance;
  }): Promise<void>;
  getImportedExpressionBindings(input: {
    imports?: readonly PreparedImportSpec[];
    actionScope?: ActionScope;
    schemaUrl: string;
  }): Readonly<Record<string, unknown>>;
  releaseImportedNamespaces(input: {
    imports?: readonly PreparedImportSpec[];
    actionScope?: ActionScope;
    schemaUrl: string;
  }): void;
  dispatch(
    action: ActionSchema | ActionSchema[] | CompiledActionProgram,
    ctx: ActionContext,
  ): Promise<ActionResult>;
  executeSource(input: {
    source: SourceSchema;
    scope: ScopeRef;
    ctx?: Partial<ActionContext>;
  }): Promise<ActionResult>;
  createSourceObserver(): SourceObserver;
  createPageRuntime(data?: Record<string, any>): PageRuntime;
  createValidationScopeRuntime(input: {
    id?: string;
    parentScope: ScopeRef;
    scopePath?: string;
    validation?: CompiledFormValidationModel;
    initialValues?: Record<string, any>;
  }): ValidationScopeRuntime;
  createSurfaceRuntime(input?: {
    disposeScope?: (scopeId: string) => void;
  }): import('./runtime.js').SurfaceRuntime;
  createDataSourceController(input: {
    action: ActionSchema | ActionSchema[] | CompiledActionProgram;
    scope: ScopeRef;
    targetPath?: string;
    interval?: number;
    stopWhen?: string;
    silent?: boolean;
    initialData?: unknown;
    compiledResultMapping?: CompiledRuntimeValue<unknown>;
  }): DataSourceController;
  registerDataSource(input: {
    id: string;
    scope: ScopeRef;
    compiledSource: CompiledDataSource;
  }): DataSourceRegistration;
  refreshDataSource(input: { id: string; scope?: ScopeRef }): Promise<boolean>;
  registerReaction(input: {
    id: string;
    scope: ScopeRef;
    compiledReaction: CompiledReaction;
    dispatch: (
      action: ActionSchema | ActionSchema[] | CompiledActionProgram,
      ctx?: Partial<ActionContext>,
    ) => Promise<ActionResult>;
  }): { id: string; dispose(): void };
  getSourceDebugSnapshot?(): SourceRegistryDebugSnapshot;
  getReactionDebugSnapshot?(): ReactionRegistryDebugSnapshot;
  getAsyncOwnerDebugSnapshot?(): AsyncOwnerDebugSnapshot;
  moduleCache: ModuleCache;
  setEnv(env: RendererEnv): void;
  dispose(): void;
  createFormRuntime(input: {
    id?: string;
    name?: string;
    initialValues?: Record<string, any>;
    parentScope: ScopeRef;
    page?: PageRuntime;
    validation?: CompiledFormValidationModel;
    lifecycle?: FormLifecycleHandlers;
  }): FormRuntime;
}
