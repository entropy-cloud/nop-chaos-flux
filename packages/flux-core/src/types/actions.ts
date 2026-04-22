import type { NodeInstance, InstanceFrame } from './node-identity';
import type { ApiSchema, SchemaObject, SchemaValue, SchemaPath, OperationControlConfig } from './schema';
import type { ScopeRef } from './scope';
import type { ComponentHandleRegistry, RendererRuntime, RendererEnv } from './renderer';
import type { FormRuntime, PageRuntime, SurfaceRuntime } from './runtime';
import type { CompiledRuntimeValue } from './compilation';

export interface SetValueActionArgs extends SchemaObject {
  path?: string;
  value: SchemaValue;
}

export interface SetValuesActionArgs extends SchemaObject {
  path?: string;
  values: Record<string, SchemaValue>;
}

export interface NavigateActionArgs extends SchemaObject {
  url?: SchemaValue;
  replace?: SchemaValue;
  back?: SchemaValue;
}

export interface ShowToastActionArgs extends SchemaObject {
  level?: SchemaValue;
  message?: SchemaValue;
}

export interface ActionShapeFields extends SchemaObject {
  action?: string;
  _targetCid?: number;
  _targetTemplateId?: string;
  targetId?: string;
  componentId?: string;
  componentName?: string;
  formId?: string;
  dialogId?: string;
  dataPath?: string;
  args?: Record<string, SchemaValue>;
  control?: OperationControlConfig;
  timeout?: number;
  retry?: OperationControlConfig['retry'];
  debounce?: number;
  when?: string;
  parallel?: ActionSchema[];
  continueOnError?: boolean;
  then?: ActionSchema | ActionSchema[];
  onError?: ActionSchema | ActionSchema[];
  onSettled?: ActionSchema | ActionSchema[];
}

export interface AjaxActionSchema extends ActionShapeFields {
  action: 'ajax';
  args: ApiSchema;
}

export interface SubmitFormActionSchema extends ActionShapeFields {
  action: 'submitForm';
  args: ApiSchema;
}

export interface OpenDialogActionSchema extends ActionShapeFields {
  action: 'openDialog';
  args: Record<string, SchemaValue>;
}

export interface OpenDrawerActionSchema extends ActionShapeFields {
  action: 'openDrawer';
  args: Record<string, SchemaValue>;
}

export interface CloseDialogActionSchema extends ActionShapeFields {
  action: 'closeDialog';
}

export interface CloseDrawerActionSchema extends ActionShapeFields {
  action: 'closeDrawer';
}

export interface RefreshTableActionSchema extends ActionShapeFields {
  action: 'refreshTable';
}

export interface RefreshSourceActionSchema extends ActionShapeFields {
  action: 'refreshSource';
  targetId: string;
}

export interface SetValueActionSchema extends ActionShapeFields {
  action: 'setValue';
  args: SetValueActionArgs;
}

export interface SetValuesActionSchema extends ActionShapeFields {
  action: 'setValues';
  args: SetValuesActionArgs;
}

export interface ShowToastActionSchema extends ActionShapeFields {
  action: 'showToast';
  args: ShowToastActionArgs;
}

export interface NavigateActionSchema extends ActionShapeFields {
  action: 'navigate';
  args: NavigateActionArgs;
}

export interface ComponentActionSchema extends ActionShapeFields {
  action: `component:${string}`;
  args?: Record<string, SchemaValue>;
}

export interface NamespacedActionSchema extends ActionShapeFields {
  action: `${string}:${string}`;
  args?: Record<string, SchemaValue>;
}

export type BuiltInActionSchema =
  | AjaxActionSchema
  | SubmitFormActionSchema
  | OpenDialogActionSchema
  | OpenDrawerActionSchema
  | CloseDialogActionSchema
  | CloseDrawerActionSchema
  | RefreshTableActionSchema
  | RefreshSourceActionSchema
  | SetValueActionSchema
  | SetValuesActionSchema
  | ShowToastActionSchema
  | NavigateActionSchema;

export interface ActionSchema extends ActionShapeFields {
  action: string;
}

export interface ActionResult {
  ok: boolean;
  cancelled?: boolean;
  skipped?: boolean;
  timedOut?: boolean;
  data?: unknown;
  results?: ActionResult[];
  attempts?: number;
  failureCount?: number;
  error?: unknown;
  componentId?: string;
  componentName?: string;
  componentType?: string;
  namespace?: string;
  sourceScopeId?: string;
  providerKind?: 'host' | 'import';
}

export interface FluxActionEvent {
  type: string;
  nativeEvent?: Event;
  currentTarget?: HTMLElement | null;
  target?: HTMLElement | null;
  preventDefault?(): void;
  stopPropagation?(): void;
  [key: string]: unknown;
}

export interface ActionContext {
  runtime: RendererRuntime;
  scope: ScopeRef;
  instancePath?: readonly InstanceFrame[];
  nodeInstance?: NodeInstance;
  getInstanceKey?: () => string | undefined;
  interactionId?: string;
  signal?: AbortSignal;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  event?: FluxActionEvent;
  form?: FormRuntime;
  page?: PageRuntime;
  surfaceRuntime?: SurfaceRuntime;
  dialogId?: string;
  prevResult?: ActionResult;
  evaluationBindings?: Record<string, unknown>;
}

export interface ActionNamespaceProvider {
  kind?: 'host' | 'import';
  invoke(method: string, payload: Record<string, unknown> | undefined, ctx: ActionContext): Promise<ActionResult> | ActionResult;
  dispose?(): void;
  listMethods?(): readonly string[];
}

export interface ResolvedActionHandler {
  namespace: string;
  method: string;
  provider: ActionNamespaceProvider;
  sourceScopeId: string;
}

export interface ActionScopeDebugNamespaceEntry {
  namespace: string;
  providerKind?: 'host' | 'import';
  methods?: readonly string[];
}

export interface ActionScopeDebugSnapshot {
  id: string;
  parentId?: string;
  namespaces: ActionScopeDebugNamespaceEntry[];
}

export interface ActionScope {
  id: string;
  parent?: ActionScope;
  resolve(actionName: string): ResolvedActionHandler | undefined;
  registerNamespace(namespace: string, provider: ActionNamespaceProvider): () => void;
  unregisterNamespace(namespace: string): void;
  listNamespaces(): readonly string[];
  getDebugSnapshot?(): ActionScopeDebugSnapshot;
}

export interface ImportedLibraryModule {
  createNamespace(context: ImportedNamespaceContext): Promise<ActionNamespaceProvider> | ActionNamespaceProvider;
  createExpressionHelpers?(context: ImportedNamespaceContext): Promise<Record<string, unknown>> | Record<string, unknown>;
}

export interface ImportedLibraryLoader {
  load(spec: import('./schema').XuiImportSpec, signal?: AbortSignal): Promise<ImportedLibraryModule>;
}

export interface ImportedNamespaceContext {
  runtime: RendererRuntime;
  env: RendererEnv;
  actionScope: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  scope: ScopeRef;
  spec: import('./schema').XuiImportSpec;
  nodeInstance?: NodeInstance;
}

export interface ActionMonitorPayload {
  actionType: string;
  instancePath?: readonly InstanceFrame[];
  nodeId?: string;
  path?: SchemaPath;
  interactionId?: string;
  dispatchMode?: 'built-in' | 'component' | 'namespace';
  namespace?: string;
  method?: string;
  targetId?: string;
  sourceScopeId?: string;
  providerKind?: 'host' | 'import';
  componentId?: string;
  componentName?: string;
  componentType?: string;
}

/**
 * Compiled payload fields for an action.
 * Dynamic values are compiled to CompiledRuntimeValue for evaluation at dispatch time.
 */
export interface CompiledActionPayload {
  args?: CompiledRuntimeValue<Record<string, unknown>>;
}

/**
 * Targeting fields for an action.
 * These are kept as original values since they're typically static identifiers.
 */
export interface CompiledActionTargeting {
  _targetCid?: number;
  _targetTemplateId?: string;
  targetId?: string;
  componentId?: string;
  componentName?: string;
  formId?: string;
  dialogId?: string;
  dataPath?: string;
}

/**
 * Execution control fields for an action.
 * These are kept as original values since they're typically static configuration.
 */
export interface CompiledActionControl {
  control?: OperationControlConfig;
  timeout?: number;
  retry?: OperationControlConfig['retry'];
  debounce?: number;
  continueOnError?: boolean;
}

/**
 * A single compiled action node in the action DAG.
 * The action graph is assembled at compile time from schema structure.
 */
export interface CompiledActionNode {
  action: string;
  when?: CompiledRuntimeValue<boolean>;
  payload: CompiledActionPayload;
  targeting: CompiledActionTargeting;
  control: CompiledActionControl;
  then?: CompiledActionNode[];
  onError?: CompiledActionNode[];
  onSettled?: CompiledActionNode[];
  parallel?: CompiledActionNode[];
  source: ActionSchema;
  sourcePath?: string;
}

/**
 * A compiled action program representing a complete action DAG.
 * This is the precompiled form of ActionSchema or ActionSchema[] for event handlers.
 */
export interface CompiledActionProgram {
  nodes: CompiledActionNode[];
  isFullyStatic: boolean;
}

/**
 * Runtime adapter interface for action execution.
 * 
 * flux-action-core owns dispatch ordering, built-in recognition, and result normalization.
 * The runtime adapter owns actual effect execution that requires runtime-specific capabilities.
 * 
 * This interface isolates runtime-specific behavior behind a single adapter object,
 * allowing action-core to remain independent of form/page/surface/source runtime internals.
 */
export interface ActionRuntimeAdapter {
  /**
   * Execute a setValue action by updating scope or form values.
   */
  setValue(
    path: string,
    value: unknown,
    ctx: ActionContext,
    targeting: CompiledActionTargeting
  ): Promise<ActionResult>;

  /**
   * Execute a setValues action by updating multiple scope or form values.
   */
  setValues(
    values: Record<string, unknown>,
    ctx: ActionContext,
    targeting: CompiledActionTargeting
  ): Promise<ActionResult>;

  /**
   * Execute an ajax action by performing an API request.
   */
  executeAjax(
    api: unknown,
    action: CompiledActionNode,
    ctx: ActionContext,
    signal?: AbortSignal
  ): Promise<ActionResult>;

  /**
   * Execute a submitForm action by triggering form submission.
   */
  submitForm(
    api: unknown | undefined,
    action: CompiledActionNode,
    ctx: ActionContext,
    signal?: AbortSignal
  ): Promise<ActionResult>;

  /**
   * Execute an openDialog action by opening a dialog surface.
   */
  openDialog(
    dialog: Record<string, unknown>,
    ctx: ActionContext
  ): Promise<ActionResult>;

  /**
   * Execute a closeDialog action by closing a dialog surface.
   */
  closeDialog(
    dialogId: string | undefined,
    ctx: ActionContext
  ): Promise<ActionResult>;

  /**
   * Execute an openDrawer action by opening a drawer surface.
   */
  openDrawer(
    drawer: Record<string, unknown>,
    ctx: ActionContext
  ): Promise<ActionResult>;

  /**
   * Execute a closeDrawer action by closing a drawer surface.
   */
  closeDrawer(
    drawerId: string | undefined,
    ctx: ActionContext
  ): Promise<ActionResult>;

  /**
   * Execute a showToast action by displaying a notification.
   */
  showToast(
    args: Record<string, unknown> | undefined,
    ctx: ActionContext
  ): Promise<ActionResult>;

  /**
   * Execute a navigate action by navigating to a URL.
   */
  navigate(
    args: { url?: string; back?: boolean; replace?: boolean },
    ctx: ActionContext
  ): Promise<ActionResult>;

  /**
   * Execute a refreshTable action by refreshing the page.
   */
  refreshTable(ctx: ActionContext): Promise<ActionResult>;

  /**
   * Execute a refreshSource action by refreshing a data source.
   */
  refreshSource(
    sourceId: string,
    ctx: ActionContext
  ): Promise<ActionResult>;

  /**
   * Resolve a component handle and invoke a method on it.
   */
  invokeComponentMethod(
    method: string,
    target: { _targetCid?: number; componentId?: string; componentName?: string },
    payload: Record<string, unknown> | undefined,
    ctx: ActionContext
  ): Promise<ActionResult>;

  /**
   * Resolve a namespaced action and invoke it.
   */
  invokeNamespacedAction(
    namespace: string,
    method: string,
    payload: Record<string, unknown> | undefined,
    ctx: ActionContext
  ): Promise<ActionResult>;
}
