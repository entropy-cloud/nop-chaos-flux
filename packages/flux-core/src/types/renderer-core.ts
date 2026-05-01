import type {
  ActionContext,
  ActionResult,
  ActionSchema,
  ActionScope,
  CompiledActionProgram,
} from './actions';
import type { AsyncOwnerDebugSnapshot, AsyncOwnerDebugState } from './async-governance';
import type {
  CompiledApiConfig,
  CompiledDataSource,
  CompiledReaction,
  CompiledRuntimeValue,
  ExpressionCompiler,
  ImportStack,
  ModuleCache,
  PreparedImportSpec,
  SymbolInfo,
} from './compilation';
import type {
  CapabilityMethodContract,
  FluxValueShape,
  RendererAuthoringTransform,
  RendererSchemaValidator,
  RendererHostContract,
} from '../schema-diagnostics';
import type {
  NodeInstance,
  NodeRuntimeState,
  ResolutionContext,
  TemplateNode,
} from './node-identity';
import type { ComponentHandleRegistry, ComponentTarget } from './renderer-component';
import type { RendererEnv } from './renderer-api';
import type { ResolvedNodeMeta, ResolvedNodeProps, SchemaCompiler } from './renderer-compiler';
import type { RenderFragmentOptions, RenderNodeInput, RenderRegionHandle } from './renderer-hooks';
import type { RendererPlugin } from './renderer-plugin';
import type {
  DataSourceController,
  DataSourceRegistration,
  FormLifecycleHandlers,
  FormRuntime,
  PageRuntime,
  ValidationScopeRuntime,
} from './runtime';
import type {
  BaseSchema,
  SchemaFieldRule,
  SchemaInput,
  SchemaPath,
  ScopePolicy,
  SourceSchema,
  XuiImportSpec,
} from './schema';
import type { CreateScopeOptions, ScopeRef } from './scope';
import type {
  ChildValidationMode,
  CompiledFormValidationModel,
  ValidationOwnerBoundaryKind,
  ValidationRule,
} from './validation';
import type { CompiledTemplate } from './node-identity';

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

export interface RendererHelpers {
  render: (input: RenderNodeInput, options?: RenderFragmentOptions) => any;
  evaluate: <T = unknown>(target: unknown, scope?: ScopeRef) => T;
  createScope: (patch?: object, options?: CreateScopeOptions) => ScopeRef;
  dispatch: (
    action: ActionSchema | ActionSchema[] | CompiledActionProgram,
    ctx?: Partial<ActionContext>,
  ) => Promise<ActionResult>;
  executeSource: (source: SourceSchema, options?: { scope?: ScopeRef }) => Promise<ActionResult>;
}

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

export type RendererEventHandler = (
  event?: unknown,
  ctx?: Partial<ActionContext>,
) => Promise<ActionResult>;

export interface RendererComponentProps<S extends BaseSchema = BaseSchema> {
  id: string;
  path: SchemaPath;
  schema: S;
  templateNode: TemplateNode<S>;
  node: NodeInstance<S>;
  props: Readonly<Record<string, unknown>>;
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

export interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  type: S['type'];
  component?: (props: RendererComponentProps<any>) => any;
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
  regions?: readonly string[];
  fields?: readonly SchemaFieldRule[];
  authoringTransform?: RendererAuthoringTransform<S>;
  schemaValidator?: RendererSchemaValidator<S>;
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
  }): import('./runtime').SurfaceRuntime;
  createDataSourceController(input: {
    compiledApi: CompiledApiConfig;
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
