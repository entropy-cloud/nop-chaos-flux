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
    statusPath?: string;
    valuesPath?: string;
  }): FormRuntime;
}
