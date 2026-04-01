import type { ComponentType, ReactElement, ReactNode } from 'react';
import type {
  SchemaPath,
  ScopePolicy,
  BaseSchema,
  SchemaInput,
  SchemaFieldRule,
  XuiImportSpec
} from './schema';
import type { ScopeRef, CreateScopeOptions } from './scope';
import type { CompiledRuntimeValue, ExpressionCompiler, RuntimeValueState } from './compilation';
import type { FormulaCompiler } from './compilation';
import type { ValidationRule, ValidationError, CompiledFormValidationModel } from './validation';
import type {
  ActionSchema,
  ActionContext,
  ActionResult,
  ActionScope,
  ActionMonitorPayload,
  ImportedLibraryLoader
} from './actions';
import type {
  FormRuntime,
  PageRuntime,
  PageStoreApi,
  FormErrorQuery,
  FormFieldStateSnapshot
} from './runtime';

export interface ComponentTarget {
  _targetCid?: number;
  _targetTemplateId?: string;
  componentInstanceKey?: string;
  componentId?: string;
  componentName?: string;
}

export interface ComponentCapabilities {
  store?: unknown;
  invoke(method: string, payload: Record<string, unknown> | undefined, ctx: ActionContext): Promise<ActionResult> | ActionResult;
  hasMethod?(method: string): boolean;
  listMethods?(): readonly string[];
}

export interface ComponentHandle {
  _cid?: number;
  _templateId?: string;
  _instanceKey?: string;
  _mounted?: boolean;
  id?: string;
  name?: string;
  type: string;
  capabilities: ComponentCapabilities;
}

export interface ComponentHandleRegistry {
  id: string;
  parent?: ComponentHandleRegistry;
  register(
    handle: ComponentHandle,
    options?: {
      cid?: number;
      templateId?: string;
      instanceKey?: string;
      dynamicLoaded?: boolean;
    }
  ): () => void;
  unregister(handle: ComponentHandle): void;
  cleanupDynamic(templateId: string): void;
  resolve(target: ComponentTarget): ComponentHandle | undefined;
}

export interface ApiRequestContext {
  scope: ScopeRef;
  env: RendererEnv;
  signal?: AbortSignal;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  headers?: Record<string, string>;
  raw?: unknown;
}

export type ApiFetcher = <T = unknown>(api: import('./schema').ApiObject, ctx: ApiRequestContext) => Promise<ApiResponse<T>>;

export interface RendererMonitor {
  onRenderStart?(payload: RenderMonitorPayload): void;
  onRenderEnd?(payload: RenderMonitorPayload & { durationMs: number }): void;
  onActionStart?(payload: ActionMonitorPayload): void;
  onActionEnd?(payload: ActionMonitorPayload & { durationMs: number; result?: ActionResult }): void;
  onError?(payload: ErrorMonitorPayload): void;
  onApiRequest?(payload: ApiMonitorPayload): void;
}

export interface RenderMonitorPayload {
  nodeId: string;
  path: SchemaPath;
  type: string;
}

export interface ErrorMonitorPayload {
  phase: 'compile' | 'render' | 'action' | 'expression' | 'api';
  error: unknown;
  nodeId?: string;
  path?: SchemaPath;
}

export interface ApiMonitorPayload {
  api: import('./schema').ApiObject;
  nodeId?: string;
  path?: SchemaPath;
}

export interface RendererEnv {
  fetcher: ApiFetcher;
  notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  navigate?: (to: string, options?: unknown) => void;
  confirm?: (message: string, options?: unknown) => Promise<boolean>;
  functions?: Record<string, (...args: any[]) => any>;
  filters?: Record<string, (input: any, ...args: any[]) => any>;
  importLoader?: ImportedLibraryLoader;
  monitor?: RendererMonitor;
}

export interface ValidationCollectContext<S extends BaseSchema = BaseSchema> {
  schema: S;
  renderer: RendererDefinition<S>;
  path: SchemaPath;
}

export interface ValidationContributor<S extends BaseSchema = BaseSchema> {
  kind: 'field' | 'container' | 'none';
  valueKind?: 'scalar' | 'array' | 'object';
  getFieldPath?(schema: S, ctx: ValidationCollectContext<S>): string | undefined;
  collectRules?(schema: S, ctx: ValidationCollectContext<S>): ValidationRule[];
}

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

export interface ResolvePropsArgs<S extends BaseSchema = BaseSchema> {
  schema: S;
  node: CompiledSchemaNode<S>;
  scope: ScopeRef;
  runtime: RendererRuntime;
}

export interface RenderFragmentOptions {
  data?: object;
  scope?: ScopeRef;
  scopeKey?: string;
  isolate?: boolean;
  pathSuffix?: string;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
}

export interface RenderRegionHandle {
  key: string;
  path: SchemaPath;
  node: CompiledSchemaNode | CompiledSchemaNode[] | null;
  render(options?: RenderFragmentOptions): ReactNode;
}

export type RenderNodeInput = SchemaInput | CompiledSchemaNode | CompiledSchemaNode[] | null | undefined;

export interface RendererHelpers {
  render: (input: RenderNodeInput, options?: RenderFragmentOptions) => ReactNode;
  evaluate: <T = unknown>(target: unknown, scope?: ScopeRef) => T;
  createScope: (patch?: object, options?: CreateScopeOptions) => ScopeRef;
  dispatch: (action: ActionSchema | ActionSchema[], ctx?: Partial<ActionContext>) => Promise<ActionResult>;
}

export type RendererEventHandler = (event?: unknown, ctx?: Partial<ActionContext>) => Promise<ActionResult>;

export interface RendererComponentProps<S extends BaseSchema = BaseSchema> {
  id: string;
  path: SchemaPath;
  schema: S;
  node: CompiledSchemaNode<S>;
  props: Readonly<Record<string, unknown>>;
  meta: ResolvedNodeMeta;
  regions: Readonly<Record<string, RenderRegionHandle>>;
  events: Readonly<Record<string, RendererEventHandler | undefined>>;
  helpers: RendererHelpers;
}

export interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  type: S['type'];
  component: ComponentType<RendererComponentProps<any>>;
  regions?: readonly string[];
  fields?: readonly SchemaFieldRule[];
  memo?: boolean;
  scopePolicy?: ScopePolicy;
  actionScopePolicy?: 'inherit' | 'new';
  componentRegistryPolicy?: 'inherit' | 'new';
  resolveProps?: (args: ResolvePropsArgs<S>) => Record<string, unknown>;
  validation?: ValidationContributor<S>;
  wrap?: boolean;
}

export interface RendererRegistry {
  register(definition: RendererDefinition): void;
  get(type: string): RendererDefinition | undefined;
  has(type: string): boolean;
  list(): RendererDefinition[];
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

export interface CompiledNodeRuntimeState {
  meta: Record<string, RuntimeValueState<unknown>>;
  props?: RuntimeValueState<Record<string, unknown>>;
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
  component: RendererDefinition<S>;
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
  renderer: RendererDefinition;
  fieldRules?: readonly SchemaFieldRule[];
}

export interface RendererPlugin {
  name: string;
  priority?: number;
  beforeCompile?(schema: SchemaInput): SchemaInput;
  afterCompile?(node: CompiledSchemaNode | CompiledSchemaNode[]): CompiledSchemaNode | CompiledSchemaNode[];
  wrapComponent?<S extends BaseSchema>(definition: RendererDefinition<S>): RendererDefinition<S>;
  beforeAction?(action: ActionSchema, ctx: ActionContext): ActionSchema | Promise<ActionSchema>;
  onError?(error: unknown, payload: ErrorMonitorPayload): void;
}

export interface SchemaCompiler {
  compile(schema: SchemaInput, options?: CompileSchemaOptions): CompiledSchemaNode | CompiledSchemaNode[];
  compileNode(schema: BaseSchema, options: CompileNodeOptions): CompiledSchemaNode;
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
}

export interface RendererRuntime {
  registry: RendererRegistry;
  env: RendererEnv;
  expressionCompiler: ExpressionCompiler;
  schemaCompiler: SchemaCompiler;
  plugins: readonly RendererPlugin[];
  compile(schema: SchemaInput): CompiledSchemaNode | CompiledSchemaNode[];
  evaluate<T = unknown>(target: unknown, scope: ScopeRef): T;
  resolveNodeMeta(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeMeta;
  resolveNodeProps(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeProps;
  createChildScope(parent: ScopeRef, patch?: object, options?: CreateScopeOptions): ScopeRef;
  createActionScope(input?: { id?: string; parent?: ActionScope }): ActionScope;
  createComponentHandleRegistry(input?: { id?: string; parent?: ComponentHandleRegistry }): ComponentHandleRegistry;
  ensureImportedNamespaces(input: {
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    scope: ScopeRef;
    node?: CompiledSchemaNode;
  }): Promise<void>;
  releaseImportedNamespaces(input: {
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
  }): void;
  dispatch(action: ActionSchema | ActionSchema[], ctx: ActionContext): Promise<ActionResult>;
  createPageRuntime(data?: Record<string, any>): PageRuntime;
  createFormRuntime(input: {
    id?: string;
    name?: string;
    initialValues?: Record<string, any>;
    parentScope: ScopeRef;
    page?: PageRuntime;
    validation?: CompiledFormValidationModel;
  }): FormRuntime;
}

export interface RendererHookApi {
  useRendererRuntime(): RendererRuntime;
  useRenderScope(): ScopeRef;
  useCurrentActionScope(): ActionScope | undefined;
  useCurrentComponentRegistry(): ComponentHandleRegistry | undefined;
  useScopeSelector<T, S = Record<string, unknown>>(selector: (scopeData: S) => T, equalityFn?: (a: T, b: T) => boolean): T;
  useRendererEnv(): RendererEnv;
  useActionDispatcher(): RendererRuntime['dispatch'];
  useCurrentForm(): FormRuntime | undefined;
  useCurrentFormErrors(query?: FormErrorQuery): ValidationError[];
  useCurrentFormError(query: FormErrorQuery): ValidationError | undefined;
  useCurrentFormFieldState(path: string, query?: FormErrorQuery): FormFieldStateSnapshot;
  useValidationNodeState(path: string): FormFieldStateSnapshot;
  useFieldError(path: string): ValidationError | undefined;
  useOwnedFieldState(path: string): FormFieldStateSnapshot;
  useChildFieldState(path: string): FormFieldStateSnapshot;
  useAggregateError(path: string): ValidationError | undefined;
  useCurrentPage(): PageRuntime | undefined;
  useCurrentNodeMeta(): { id: string; path: SchemaPath; type: string };
  useRenderFragment(): RendererHelpers['render'];
}

export interface RenderNodeMeta {
  id: string;
  path: SchemaPath;
  type: string;
}

export interface SchemaRendererProps {
  schema: SchemaInput;
  data?: Record<string, any>;
  env: RendererEnv;
  formulaCompiler: FormulaCompiler;
  registry?: RendererRegistry;
  plugins?: RendererPlugin[];
  pageStore?: PageStoreApi;
  parentScope?: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}

export type SchemaRendererComponent = (props: SchemaRendererProps) => ReactElement | null;
