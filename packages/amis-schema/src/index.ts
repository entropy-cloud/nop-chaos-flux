import type { ComponentType, ReactElement, ReactNode } from 'react';

export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type SchemaValue = Primitive | SchemaObject | ReadonlyArray<SchemaValue> | SchemaValue[];

export interface SchemaObject {
  [key: string]: SchemaValue;
}

export type SchemaPath = string;

export interface BaseSchema extends SchemaObject {
  type: string;
  id?: string;
  name?: string;
  label?: string;
  title?: string;
  className?: string;
  visible?: boolean | string;
  hidden?: boolean | string;
  disabled?: boolean | string;
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
  data: T;
  headers?: Record<string, string>;
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
  monitor?: RendererMonitor;
}

export interface ScopeStore<T = Record<string, any>> {
  getSnapshot(): T;
  setSnapshot(next: T): void;
  subscribe(listener: () => void): () => void;
}

export interface EvalContext {
  resolve(path: string): unknown;
  has(path: string): boolean;
  materialize(): Record<string, any>;
}

export interface ScopeRef {
  id: string;
  path: string;
  parent?: ScopeRef;
  store?: ScopeStore;
  readonly value: Record<string, any>;
  get(path: string): unknown;
  has(path: string): boolean;
  readOwn(): Record<string, any>;
  read(): Record<string, any>;
  update(path: string, value: unknown): void;
}

export interface CreateScopeOptions {
  pathSuffix?: string;
  isolate?: boolean;
  scopeKey?: string;
  source?: 'root' | 'row' | 'dialog' | 'form' | 'fragment' | 'custom';
}

export interface CompiledExpression<T = unknown> {
  kind: 'expression';
  source: string;
  exec(context: EvalContext | object, env: RendererEnv): T;
}

export interface CompiledTemplate<T = unknown> {
  kind: 'template';
  source: string;
  exec(context: EvalContext | object, env: RendererEnv): T;
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

export interface ArrayValueNode {
  kind: 'array-node';
  items: ReadonlyArray<CompiledValueNode<unknown>>;
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
  exec(context: EvalContext, env: RendererEnv, state?: RuntimeValueState<T>): ValueEvaluationResult<T>;
}

export type CompiledRuntimeValue<T = unknown> = StaticRuntimeValue<T> | DynamicRuntimeValue<T>;

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

export type ScopePolicy = 'inherit' | 'isolate' | 'page' | 'form' | 'dialog' | 'row';
export type SchemaFieldKind = 'meta' | 'prop' | 'region' | 'ignored';

export interface SchemaFieldRule {
  key: string;
  kind: SchemaFieldKind;
  regionKey?: string;
}

export type ValidationRule =
  | { kind: 'required'; message?: string }
  | { kind: 'minLength'; value: number; message?: string }
  | { kind: 'maxLength'; value: number; message?: string }
  | { kind: 'pattern'; value: string; message?: string }
  | { kind: 'email'; message?: string }
  | { kind: 'async'; api: ApiObject; debounce?: number; message?: string };

export interface ValidationError {
  path: string;
  message: string;
  rule: ValidationRule['kind'];
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export interface FormValidationResult extends ValidationResult {
  fieldErrors: Record<string, ValidationError[]>;
}

export interface CompiledFormValidationField {
  path: string;
  controlType: string;
  label?: string;
  rules: ValidationRule[];
}

export interface CompiledFormValidationModel {
  fields: Record<string, CompiledFormValidationField>;
  order: string[];
}

export interface ValidationCollectContext<S extends BaseSchema = BaseSchema> {
  schema: S;
  renderer: RendererDefinition<S>;
  path: SchemaPath;
}

export interface ValidationContributor<S extends BaseSchema = BaseSchema> {
  kind: 'field' | 'container' | 'none';
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

export interface RendererComponentProps<S extends BaseSchema = BaseSchema> {
  id: string;
  path: SchemaPath;
  schema: S;
  node: CompiledSchemaNode<S>;
  props: Readonly<Record<string, unknown>>;
  meta: ResolvedNodeMeta;
  regions: Readonly<Record<string, RenderRegionHandle>>;
  helpers: RendererHelpers;
}

export interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  type: S['type'];
  component: ComponentType<RendererComponentProps<any>>;
  regions?: readonly string[];
  fields?: readonly SchemaFieldRule[];
  memo?: boolean;
  scopePolicy?: ScopePolicy;
  resolveProps?: (args: ResolvePropsArgs<S>) => Record<string, unknown>;
  validation?: ValidationContributor<S>;
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
  changed: boolean;
}

export interface FormStoreState {
  values: Record<string, any>;
  errors: Record<string, ValidationError[]>;
  validating: Record<string, boolean>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  visited: Record<string, boolean>;
  submitting: boolean;
}

export interface FormStoreApi {
  getState(): FormStoreState;
  subscribe(listener: () => void): () => void;
  setValues(values: Record<string, any>): void;
  setValue(path: string, value: unknown): void;
  setErrors(errors: Record<string, ValidationError[]>): void;
  setValidating(path: string, validating: boolean): void;
  setTouched(path: string, touched: boolean): void;
  setDirty(path: string, dirty: boolean): void;
  setVisited(path: string, visited: boolean): void;
  setSubmitting(submitting: boolean): void;
}

export interface DialogState {
  id: string;
  dialog: Record<string, any>;
  scope: ScopeRef;
}

export interface PageStoreState {
  data: Record<string, any>;
  dialogs: DialogState[];
  refreshTick: number;
}

export interface PageStoreApi {
  getState(): PageStoreState;
  subscribe(listener: () => void): () => void;
  setData(data: Record<string, any>): void;
  updateData(path: string, value: unknown): void;
  openDialog(dialog: DialogState): void;
  closeDialog(dialogId?: string): void;
  refresh(): void;
}

export interface FormRuntime {
  id: string;
  store: FormStoreApi;
  scope: ScopeRef;
  validation?: CompiledFormValidationModel;
  validateField(path: string): Promise<ValidationResult>;
  validateForm(): Promise<FormValidationResult>;
  getError(path: string): ValidationError[] | undefined;
  isValidating(path: string): boolean;
  isTouched(path: string): boolean;
  isDirty(path: string): boolean;
  isVisited(path: string): boolean;
  touchField(path: string): void;
  visitField(path: string): void;
  clearErrors(path?: string): void;
  submit(api?: ApiObject): Promise<ActionResult>;
  reset(values?: object): void;
  setValue(name: string, value: unknown): void;
}

export interface PageRuntime {
  store: PageStoreApi;
  scope: ScopeRef;
  openDialog(dialog: Record<string, any>, scope: ScopeRef): string;
  closeDialog(dialogId?: string): void;
  refresh(): void;
}

export interface DialogRendererProps {
  dialogs: DialogState[];
  renderDialog: (dialog: DialogState) => ReactNode;
}

export interface ActionSchema extends SchemaObject {
  action: string;
  componentId?: string;
  componentPath?: string;
  formId?: string;
  dialogId?: string;
  api?: ApiObject;
  dialog?: Record<string, any>;
  dataPath?: string;
  value?: SchemaValue;
  args?: Record<string, SchemaValue>;
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
  dispatch(action: ActionSchema | ActionSchema[], ctx: ActionContext): Promise<ActionResult>;
  createPageRuntime(data?: Record<string, any>): PageRuntime;
  createFormRuntime(input: {
    id?: string;
    initialValues?: Record<string, any>;
    parentScope: ScopeRef;
    page?: PageRuntime;
    validation?: CompiledFormValidationModel;
  }): FormRuntime;
}

export interface RendererHookApi {
  useRendererRuntime(): RendererRuntime;
  useRenderScope(): ScopeRef;
  useScopeSelector<T>(selector: (scopeData: any) => T, equalityFn?: (a: T, b: T) => boolean): T;
  useRendererEnv(): RendererEnv;
  useActionDispatcher(): RendererRuntime['dispatch'];
  useCurrentForm(): FormRuntime | undefined;
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
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}

export type SchemaRendererComponent = (props: SchemaRendererProps) => ReactElement | null;

export const META_FIELDS = new Set([
  'id',
  'name',
  'label',
  'title',
  'className',
  'visible',
  'hidden',
  'disabled'
]);

export function isPlainObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

export function isSchema(value: unknown): value is BaseSchema {
  return isPlainObject(value) && typeof value.type === 'string';
}

export function isSchemaArray(value: unknown): value is BaseSchema[] {
  return Array.isArray(value) && value.every((item) => isSchema(item));
}

export function isSchemaInput(value: unknown): value is SchemaInput {
  return isSchema(value) || isSchemaArray(value);
}

export function parsePath(path: string): string[] {
  if (!path) {
    return [];
  }

  const normalized = path.replace(/\[(\d+)\]/g, '.$1');

  return normalized
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function getIn(input: unknown, path: string): unknown {
  if (!path) {
    return input;
  }

  return parsePath(path).reduce<unknown>((current, segment) => {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, input);
}

export function setIn(input: Record<string, any>, path: string, value: unknown): Record<string, any> {
  if (!path) {
    return isPlainObject(value) ? value : input;
  }

  const segments = parsePath(path);
  const clone = Array.isArray(input) ? [...input] : { ...input };
  let cursor: Record<string, any> = clone;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];

    if (index === segments.length - 1) {
      cursor[segment] = value;
      break;
    }

    const next = cursor[segment];
    const nextClone = isPlainObject(next) ? { ...next } : {};
    cursor[segment] = nextClone;
    cursor = nextClone;
  }

  return clone;
}

export function createNodeId(path: string, schema: BaseSchema): string {
  if (schema.id) {
    return schema.id;
  }

  return path.replace(/[^a-zA-Z0-9-_:.]/g, '_');
}

export function shallowEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }

  if (Array.isArray(left) !== Array.isArray(right)) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => Object.is((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}
