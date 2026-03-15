import type { ComponentType, ReactElement, ReactNode } from 'react';

export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type SchemaValue = Primitive | SchemaObject | SchemaValue[];

export interface SchemaObject {
  [key: string]: SchemaValue;
}

export type SchemaPath = string;

export interface BaseSchema extends SchemaObject {
  type: string;
  id?: string;
  name?: string;
  label?: string;
  className?: string;
  visibleOn?: string;
  hiddenOn?: string;
  disabledOn?: string;
}

export type SchemaInput = BaseSchema | BaseSchema[];

export interface ApiObject extends SchemaObject {
  url: string;
  method?: string;
  data?: SchemaValue;
  headers?: Record<string, string>;
  responseAdaptor?: string;
  requestAdaptor?: string;
  cache?: boolean;
  dataPath?: string;
}

export interface ApiRequestContext {
  scope: ScopeRef;
  env: RendererEnv;
  signal?: AbortSignal;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  headers?: Record<string, string>;
  data: T;
  raw?: unknown;
}

export type ApiFetcher = <T = unknown>(api: ApiObject, ctx: ApiRequestContext) => Promise<ApiResponse<T>>;

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

export interface ActionMonitorPayload {
  actionType: string;
  nodeId?: string;
  path?: SchemaPath;
}

export interface ErrorMonitorPayload {
  phase: 'compile' | 'render' | 'action' | 'expression' | 'api';
  error: unknown;
  nodeId?: string;
  path?: SchemaPath;
}

export interface ApiMonitorPayload {
  api: ApiObject;
  path?: SchemaPath;
  nodeId?: string;
}

export interface RendererEnv {
  fetcher: ApiFetcher;
  notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  navigate?: (to: string, options?: unknown) => void;
  confirm?: (message: string, options?: unknown) => Promise<boolean>;
  monitor?: RendererMonitor;
}

export interface ScopeStore {
  getSnapshot(): object;
  subscribe(listener: () => void): () => void;
}

export interface ScopeRef {
  id: string;
  path: string;
  value: object;
  parent?: ScopeRef;
  store?: ScopeStore;
  update(path: string, value: unknown): void;
}

export interface CreateScopeOptions {
  pathSuffix?: string;
  isolate?: boolean;
  scopeKey?: string;
  source?: 'root' | 'row' | 'dialog' | 'form' | 'fragment' | 'custom';
}

export interface FormulaCompiler {
  hasExpression(input: string): boolean;
  compileExpression<T = unknown>(source: string): CompiledExpression<T>;
  compileTemplate<T = unknown>(source: string): CompiledTemplate<T>;
}

export interface StaticValueNode<T = unknown> {
  kind: 'static-node';
  value: T;
}

export interface ExpressionValueNode<T = unknown> {
  kind: 'expression-node';
  source: string;
  compiled: CompiledExpression<T>;
}

export interface TemplateValueNode<T = unknown> {
  kind: 'template-node';
  source: string;
  compiled: CompiledTemplate<T>;
}

export interface ArrayValueNode<T = unknown> {
  kind: 'array-node';
  items: ReadonlyArray<CompiledValueNode<T>>;
}

export interface ObjectEntryNode {
  key: string;
  value: CompiledValueNode<unknown>;
}

export interface ObjectValueNode {
  kind: 'object-node';
  keys: readonly string[];
  entries: Readonly<Record<string, CompiledValueNode<unknown>>>;
}

export type CompiledValueNode<T = unknown> =
  | StaticValueNode<T>
  | ExpressionValueNode<T>
  | TemplateValueNode<T>
  | ArrayValueNode
  | ObjectValueNode;

export type DynamicValueNode<T = unknown> =
  | ExpressionValueNode<T>
  | TemplateValueNode<T>
  | ArrayValueNode
  | ObjectValueNode;

export interface StaticRuntimeValue<T = unknown> {
  kind: 'static';
  isStatic: true;
  node: StaticValueNode<T>;
  value: T;
}

export interface DynamicRuntimeValue<T = unknown> {
  kind: 'dynamic';
  isStatic: false;
  node: DynamicValueNode<T>;
  createState(): RuntimeValueState<T>;
  exec(scope: object, env: RendererEnv, state?: RuntimeValueState<T>): ValueEvaluationResult<T>;
}

export type CompiledRuntimeValue<T = unknown> = StaticRuntimeValue<T> | DynamicRuntimeValue<T>;

export interface CompiledExpression<T = unknown> {
  kind: 'expression';
  source: string;
  exec(scope: object, env: RendererEnv): T;
}

export interface CompiledTemplate<T = unknown> {
  kind: 'template';
  source: string;
  exec(scope: object, env: RendererEnv): T;
}

export interface LeafValueState<T = unknown> {
  kind: 'leaf-state';
  initialized: boolean;
  lastValue?: T;
}

export interface ArrayValueState<T = unknown[]> {
  kind: 'array-state';
  initialized: boolean;
  lastValue?: T;
  items: RuntimeValueStateNode[];
}

export interface ObjectValueState<T = Record<string, unknown>> {
  kind: 'object-state';
  initialized: boolean;
  lastValue?: T;
  entries: Record<string, RuntimeValueStateNode>;
}

export type RuntimeValueStateNode<T = unknown> =
  | LeafValueState<T>
  | ArrayValueState
  | ObjectValueState;

export interface RuntimeValueState<T = unknown> {
  root: RuntimeValueStateNode<T>;
}

export interface ValueEvaluationResult<T = unknown> {
  value: T;
  changed: boolean;
  reusedReference: boolean;
}

export interface ExpressionCompiler {
  formulaCompiler: FormulaCompiler;
  compileNode<T = unknown>(input: T): CompiledValueNode<T>;
  compileValue<T = unknown>(input: T): CompiledRuntimeValue<T>;
  createState<T = unknown>(input: DynamicRuntimeValue<T>): RuntimeValueState<T>;
  evaluateValue<T = unknown>(
    input: CompiledRuntimeValue<T>,
    scope: ScopeRef,
    env: RendererEnv,
    state?: RuntimeValueState<T>
  ): T;
  evaluateWithState<T = unknown>(
    input: DynamicRuntimeValue<T>,
    scope: ScopeRef,
    env: RendererEnv,
    state: RuntimeValueState<T>
  ): ValueEvaluationResult<T>;
}

export interface ResolvePropsArgs<S extends BaseSchema = BaseSchema> {
  schema: S;
  node: CompiledSchemaNode<S>;
  scope: ScopeRef;
  runtime: RendererRuntime;
}

export interface ResolvedNodeProps {
  value: Readonly<Record<string, unknown>>;
  changed: boolean;
  reusedReference: boolean;
}

export interface ResolvedNodeMeta {
  visible: boolean;
  hidden: boolean;
  disabled: boolean;
  className?: string;
  label?: string;
  changed: boolean;
}

export interface RenderFragmentOptions {
  data?: object;
  scope?: ScopeRef;
  scopeKey?: string;
  isolate?: boolean;
  pathSuffix?: string;
}

export type ScopePolicy = 'inherit' | 'isolate' | 'page' | 'form' | 'dialog' | 'row';

export type SchemaFieldKind = 'meta' | 'prop' | 'region' | 'ignored';

export interface SchemaFieldRule {
  key: string;
  kind: SchemaFieldKind;
  regionKey?: string;
}

export interface CompiledSchemaMeta {
  id?: CompiledRuntimeValue<string | undefined>;
  name?: CompiledRuntimeValue<string | undefined>;
  label?: CompiledRuntimeValue<string | undefined>;
  className?: CompiledRuntimeValue<string | undefined>;
  visibleOn?: DynamicRuntimeValue<boolean | unknown>;
  hiddenOn?: DynamicRuntimeValue<boolean | unknown>;
  disabledOn?: DynamicRuntimeValue<boolean | unknown>;
}

export interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  type: S['type'];
  component: ComponentType<RendererComponentProps<S>>;
  regions?: readonly string[];
  fields?: readonly SchemaFieldRule[];
  memo?: boolean;
  scopePolicy?: ScopePolicy;
  resolveProps?: (args: ResolvePropsArgs<S>) => Record<string, unknown>;
}

export interface RendererRegistry {
  register<S extends BaseSchema>(definition: RendererDefinition<S>): void;
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
  dynamicProps: Record<string, RuntimeValueState<unknown>>;
  resolvedMeta?: ResolvedNodeMeta;
  resolvedProps?: Readonly<Record<string, unknown>>;
}

export interface CompiledSchemaNode<S extends BaseSchema = BaseSchema> {
  id: string;
  type: S['type'];
  path: SchemaPath;
  schema: S;
  component: RendererDefinition<S>;
  meta: CompiledSchemaMeta;
  staticProps: Readonly<Record<string, unknown>>;
  dynamicProps: Readonly<Record<string, DynamicRuntimeValue<unknown>>>;
  regions: Readonly<Record<string, CompiledRegion>>;
  flags: CompiledNodeFlags;
  createRuntimeState(): CompiledNodeRuntimeState;
}

export interface SchemaCompiler {
  compile(schema: SchemaInput, options?: CompileSchemaOptions): CompiledSchemaNode | CompiledSchemaNode[];
  compileNode(schema: BaseSchema, options: CompileNodeOptions): CompiledSchemaNode;
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

export interface SchemaCompileContext {
  registry: RendererRegistry;
  expressionCompiler: ExpressionCompiler;
  plugins: readonly RendererPlugin[];
  createNodeId(path: SchemaPath, schema: BaseSchema): string;
  createRegionPath(parentPath: SchemaPath, regionKey: string, index?: number): SchemaPath;
  classifyField(schema: BaseSchema, key: string, renderer: RendererDefinition): SchemaFieldRule;
}

export interface RenderRegionHandle {
  key: string;
  path: SchemaPath;
  node: CompiledSchemaNode | CompiledSchemaNode[] | null;
  render(options?: RenderFragmentOptions): ReactNode;
}

export type RenderNodeInput =
  | SchemaInput
  | CompiledSchemaNode
  | CompiledSchemaNode[]
  | null
  | undefined;

export interface FormRuntime {
  id: string;
  store: FormStoreApi;
  submit(): Promise<void>;
  reset(values?: object): void;
  setValue(name: string, value: unknown): void;
}

export interface DialogInstance {
  id: string;
  schema: SchemaInput;
  scope: ScopeRef;
}

export interface PageRuntime {
  store: PageStoreApi;
  openDialog(dialog: DialogInstance): void;
  closeDialog(dialogId: string): void;
}

export interface FormStoreApi {
  getState(): unknown;
  subscribe(listener: () => void): () => void;
}

export interface PageStoreApi {
  getState(): unknown;
  subscribe(listener: () => void): () => void;
}

export interface ActionSchema extends SchemaObject {
  action: string;
  componentId?: string;
  componentPath?: string;
  formId?: string;
  dialogId?: string;
  api?: ApiObject;
  args?: Record<string, unknown>;
  debounce?: number;
  continueOnError?: boolean;
  then?: ActionSchema | ActionSchema[];
}

export interface ActionContext {
  runtime: RendererRuntime;
  scope: ScopeRef;
  event?: unknown;
  node?: CompiledSchemaNode;
  form?: FormRuntime;
  page?: PageRuntime;
  dialogId?: string;
  prevResult?: ActionResult;
}

export interface ActionResult {
  ok: boolean;
  cancelled?: boolean;
  data?: unknown;
  error?: unknown;
}

export interface RendererHelpers {
  render: (input: RenderNodeInput, options?: RenderFragmentOptions) => ReactNode;
  evaluate: <T = unknown>(target: unknown, scope?: ScopeRef) => T;
  createScope: (patch?: object, options?: CreateScopeOptions) => ScopeRef;
  dispatch: (action: ActionSchema | ActionSchema[], ctx?: Partial<ActionContext>) => Promise<ActionResult>;
}

export interface RendererComponentProps<S extends BaseSchema = BaseSchema> {
  id: string;
  path: SchemaPath;
  schema: S;
  node: CompiledSchemaNode<S>;
  props: Readonly<Record<string, unknown>>;
  regions: Readonly<Record<string, RenderRegionHandle>>;
  helpers: RendererHelpers;
}

export interface RendererPlugin {
  name: string;
  priority?: number;
  beforeCompile?(schema: SchemaInput): SchemaInput;
  afterCompile?(node: CompiledSchemaNode | CompiledSchemaNode[]): CompiledSchemaNode | CompiledSchemaNode[];
  wrapComponent?<S extends BaseSchema>(
    definition: RendererDefinition<S>
  ): RendererDefinition<S>;
  beforeAction?(action: ActionSchema, ctx: ActionContext): ActionSchema | Promise<ActionSchema>;
  onError?(error: unknown, payload: ErrorMonitorPayload): void;
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
  renderNode(node: RenderNodeInput, options?: RenderFragmentOptions): ReactNode;
  renderRegion(region: RenderRegionHandle, options?: RenderFragmentOptions): ReactNode;
  createChildScope(parent: ScopeRef, patch?: object, options?: CreateScopeOptions): ScopeRef;
  dispatch(action: ActionSchema | ActionSchema[], ctx: ActionContext): Promise<ActionResult>;
}

export interface RenderNodeMeta {
  id: string;
  path: SchemaPath;
  type: string;
}

export interface RendererHookApi {
  useRendererRuntime(): RendererRuntime;
  useExpressionCompiler(): ExpressionCompiler;
  useRenderScope(): ScopeRef;
  useScopeSelector<T>(selector: (scopeData: any) => T, equalityFn?: (a: T, b: T) => boolean): T;
  useRendererEnv(): RendererEnv;
  useActionDispatcher(): RendererRuntime['dispatch'];
  useCurrentNodeMeta(): RenderNodeMeta;
  useCurrentForm(): FormRuntime | undefined;
  useCurrentPage(): PageRuntime | undefined;
  useRenderFragment(): RendererHelpers['render'];
}

export interface SchemaRendererProps {
  schema: SchemaInput;
  data?: object;
  env: RendererEnv;
  formulaCompiler: FormulaCompiler;
  registry?: RendererRegistry;
  plugins?: RendererPlugin[];
  pageStore?: PageStoreApi;
  parentScope?: ScopeRef;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}

export type SchemaRendererComponent = (props: SchemaRendererProps) => ReactElement | null;
