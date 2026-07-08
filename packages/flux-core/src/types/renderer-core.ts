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
  CompiledReactionPlan,
  CompiledRuntimeValue,
  ExpressionCompiler,
  ImportStack,
  ModuleCache,
  PreparedImportSpec,
  ReactionRegistration,
} from './compilation.js';
import type {
  NodeRuntimeState,
  ResolutionContext,
  TemplateNode,
} from './node-identity.js';
import type { NodeInstance } from './node-identity.js';
import type { ComponentHandleRegistryCore, ComponentTarget } from './component-handle-core.js';
import type { ComponentHandleRegistry } from './renderer-component.js';
import type { RendererEnv } from './renderer-api.js';
import type { SchemaCompiler } from './renderer-compiler.js';
import type { ResolvedNodeMeta, ResolvedNodeProps } from './resolved-node-types.js';
import type {
  RenderFragmentOptions,
  RenderNodeInput,
  RenderRegionHandle,
} from './render-fragment-types.js';
import type { RendererPlugin } from './renderer-plugin.js';
import type {
  RendererCompilationDefinition,
  RendererDeepFieldDefinition,
  RendererDefinitionShape,
  RendererValidationDefaults,
  ValidationContributor,
} from './renderer-definition-types.js';
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
  SchemaInput,
  SchemaPath,
  SourceSchema,
  XuiImportSpec,
} from './schema.js';
import type { CreateScopeOptions, ScopeRef } from './scope.js';
import type { CompiledFormValidationModel } from './validation.js';
import type { CompiledTemplate } from './node-identity.js';

type BivariantCallback<Args extends readonly unknown[], Result> = {
  bivarianceHack(...args: Args): Result;
}['bivarianceHack'];

type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K]: T[K];
};

export interface RendererHelpers {
  render: (input: RenderNodeInput, options?: RenderFragmentOptions) => RendererRenderOutput;
  evaluate: <T = unknown>(target: unknown, scope?: ScopeRef) => T;
  evaluateCompiled: <T = unknown>(target: CompiledRuntimeValue<T>, scope?: ScopeRef) => T;
  createScope: (patch?: object, options?: CreateScopeOptions) => ScopeRef;
  disposeScope: (scopeId: string) => void;
  dispatch: (
    action: ActionSchema | ActionSchema[] | CompiledActionProgram,
    ctx?: Partial<ActionContext>,
  ) => Promise<ActionResult>;
  executeSource: (source: SourceSchema, options?: { scope?: ScopeRef }) => Promise<ActionResult>;
}

export type RendererRenderOutput = unknown;

export type RendererResolvedProps<S extends BaseSchema = BaseSchema> = {
  [key: string]: unknown;
} & Omit<
  Partial<RemoveIndexSignature<S>>,
  'when' | 'visible' | 'hidden' | 'disabled' | 'className' | 'frameClassName' | 'testid' | 'readOnly' | 'required'
> & {
  type?: S['type'];
  id?: string;
  className?: string;
  frameClassName?: string;
  disabled?: boolean;
  testid?: string;
  cid?: number;
  readOnly?: boolean;
  required?: boolean;
};

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
    ctx?: Partial<ActionContext>;
  }): void;
  dispose(): void;
}

export type RendererEventHandler = (
  event?: unknown,
  ctx?: Partial<ActionContext>,
) => Promise<ActionResult>;

/**
 * Debug snapshot returned by `ReactionHandle.getDebugState()`. Diagnostic only;
 * external consumers should treat `phase` as `'ready' | 'paused'` even though
 * the runtime distinguishes initial-paused vs explicit-paused internally.
 */
export interface ReactionHandleDebugState {
  phase: 'initial-paused' | 'ready' | 'explicit-paused' | 'disposed';
  fireCount: number;
  pauseCount: number;
  pendingChange: boolean;
  pendingChangedPaths: readonly string[];
  disposed: boolean;
}

/**
 * Imperative + reactive handle exposed to renderers for a `kind: 'reaction'`
 * field. The runtime wrapper (flux-runtime `renderer-reaction-handle.ts`)
 * subscribes to scope changes on `dependsOn` roots and uses `force()` to fire;
 * renderers own initial-fire timing via `ready()` and may temporarily suspend
 * firing via `pause()` / `resume()`.
 *
 * After dispose, `dispatch` resolves to a canonical cancelled result and
 * `force`/`ready`/`pause`/`resume` are silent no-ops; `getDebugState()` keeps
 * returning a snapshot with `phase: 'disposed'`.
 *
 * @see docs/plans/2026-07-07-loadAction-reaction-kind-plan.md
 */
export interface ReactionHandle {
  /**
   * Dispatch the underlying action program imperatively. Renderers use this for
   * renderer-internal triggers (page change, sort change, etc.). The wrapper
   * injects `evaluationBindings` and per-fire `AbortController` before reaching
   * the action dispatcher. Returns the full `ActionResult` so renderers can
   * consume `data`, `error`, etc.
   */
  dispatch(ctx?: {
    signal?: AbortSignal;
    evaluationBindings?: Record<string, unknown>;
  }): Promise<ActionResult>;
  /**
   * Force the reaction to fire as if a scope change touched `paths` (or all
   * declared dependency roots when omitted). No-op when paused or disposed.
   */
  force(paths?: readonly string[]): void;
  /**
   * Transition from the initial paused state to ready. Required for the
   * reaction to fire on initial mount. No-op after the first call.
   */
  ready(): void;
  /**
   * Pause firing. Nested pauses are tracked via a counter; only the matching
   * number of `resume()` calls resume firing. Pending changes accumulated
   * during pause are flushed once on the final resume.
   */
  pause(): void;
  /** Resume firing (counter-based). See `pause()`. */
  resume(): void;
  /**
   * Dispose the handle and underlying registration. Aborts any in-flight
   * dispatch (per-fire AbortController chain), unsubscribes from scope changes,
   * and transitions the handle to `phase: 'disposed'`. After dispose, all
   * methods become no-ops and `dispatch()` resolves to a canonical cancelled
   * result. Idempotent.
   */
  dispose(): void;
  /** Snapshot for debug tooling. */
  getDebugState(): ReactionHandleDebugState;
}

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
  regions: Readonly<Record<string, RenderRegionHandle<RendererRenderOutput>>>;
  events: Readonly<Record<string, RendererEventHandler | undefined>>;
  /**
   * `kind: 'reaction'` field handles. Each handle is a lazy proxy: the
   * underlying registration is created on first activation (during the
   * layout-effect mount) and disposed on unmount. Renderers default to
   * `props.reactions[key]` being absent (`{}`) when the schema declares no
   * reaction fields. Channel parallels `events` and `regions`.
   */
  reactions: Readonly<Record<string, ReactionHandle>>;
  helpers: RendererHelpers;
}

export interface RendererDefinition<
  S extends BaseSchema = BaseSchema,
  P extends Record<string, unknown> = RendererResolvedProps<S>,
> extends RendererDefinitionShape<S> {
  type: S['type'];
  component?: BivariantCallback<[RendererComponentProps<S, P>], RendererRenderOutput>;
  /**
   * Narrow readonly Flux-native exports such as $form or $crud summaries.
   * This is not host projection and must not be used as a host-manifest substitute.
   */
  validation?: ValidationContributor<S>;
  validationDefaults?: RendererValidationDefaults;
  deepFields?: readonly RendererDeepFieldDefinition[];
  compilation?: RendererCompilationDefinition;
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
      signal?: AbortSignal;
    },
  ): Promise<{
    preparedImports: ReadonlyMap<string, PreparedImportSpec>;
  }>;
  evaluate<T = unknown>(target: unknown, scope: ScopeRef): T;
  evaluateCompiled<T = unknown>(target: CompiledRuntimeValue<T>, scope: ScopeRef): T;
  allocateMountedCid(): number;
  resolveTarget(
    target: ComponentTarget,
    ctx: ResolutionContext & { componentRegistry?: ComponentHandleRegistryCore },
  ): NodeInstance | undefined;
  resolveNodeMeta(node: TemplateNode, scope: ScopeRef, state?: NodeRuntimeState): ResolvedNodeMeta;
  resolveNodeProps(
    node: TemplateNode,
    scope: ScopeRef,
    state?: NodeRuntimeState,
  ): ResolvedNodeProps;
  createChildScope(parent: ScopeRef, patch?: object, options?: CreateScopeOptions): ScopeRef;
  disposeScope(scopeId: string): void;
  createHostProjectionScope(input: {
    parentScope: ScopeRef;
    projection: Record<string, unknown>;
    path: string;
    scopeLabel: string;
  }): ScopeRef;
  createActionScope(input?: { id?: string; parent?: ActionScope }): ActionScope;
  releaseActionScope(actionScope: ActionScope): void;
  createComponentHandleRegistry(input?: {
    id?: string;
    parent?: ComponentHandleRegistryCore;
  }): ComponentHandleRegistry;
  resolvePreparedImports(input: {
    imports?: readonly XuiImportSpec[];
    schemaUrl: string;
  }): readonly PreparedImportSpec[];
  ensureImportedNamespaces(input: {
    imports?: readonly PreparedImportSpec[];
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistryCore;
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
  disposeOwnedPage(page: PageRuntime): void;
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
    stopWhen?: CompiledRuntimeValue<boolean>;
    silent?: boolean;
    initialData?: unknown;
    compiledResultMapping?: CompiledRuntimeValue<unknown>;
  }): DataSourceController;
  registerDataSource(input: {
    id: string;
    scope: ScopeRef;
    compiledSource: CompiledDataSource;
  }): DataSourceRegistration;
  refreshDataSource(input: { name: string; scope?: ScopeRef }): Promise<boolean>;
  registerReaction(input: {
    id: string;
    scope: ScopeRef;
    compiledReaction: CompiledReaction;
    dispatch: (
      action: ActionSchema | ActionSchema[] | CompiledActionProgram,
      ctx?: Partial<ActionContext>,
    ) => Promise<ActionResult>;
  }): ReactionRegistration;
  /**
   * Register a renderer-owned reaction for a `kind: 'reaction'` field. Returns
   * a full `ReactionHandle` (the renderer-facing abstraction with
   * dispatch/force/ready/pause/resume). Internally the wrapper synthesises a
   * static watch (no schema-declared watch), self-subscribes to scope changes
   * on `dependsOn` roots, applies `ignoreWritesTo` filtering, maintains the
   * ready/pause state machine, and triggers fires via the underlying
   * `ForceableReactionRegistration.force(paths?)` (obtained from
   * `registerReaction`'s result via internal cast).
   *
   * Distinct from `registerReaction`: this entry point never fires on the
   * runtime's own scope-subscription — all firing goes through the wrapper's
   * explicit `force()` or the renderer's `dispatch()`.
   */
  registerRendererReaction(input: {
    id: string;
    scope: ScopeRef;
    compiledReactionPlan: CompiledReactionPlan;
    dispatch: (
      action: ActionSchema | ActionSchema[] | CompiledActionProgram,
      ctx?: Partial<ActionContext>,
    ) => Promise<ActionResult>;
  }): ReactionHandle;
  getSourceDebugSnapshot?(): SourceRegistryDebugSnapshot;
  getReactionDebugSnapshot?(): ReactionRegistryDebugSnapshot;
  getAsyncOwnerDebugSnapshot?(): AsyncOwnerDebugSnapshot;
  getFormStoreDiagnosticsBridge?(): import('./runtime.js').FormStoreDiagnosticsBridge;
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
    statusPath?: string;
    valuesPath?: string;
  }): FormRuntime;
}
