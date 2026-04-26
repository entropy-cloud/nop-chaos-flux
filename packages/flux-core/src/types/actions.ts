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
  surfaceId?: string;
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

export interface CloseSurfaceActionSchema extends ActionShapeFields {
  action: 'closeSurface';
  surfaceId?: string;
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
  | CloseSurfaceActionSchema
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
  getStaticMeta?(): import('./compilation').ImportedLibraryStaticMeta | Promise<import('./compilation').ImportedLibraryStaticMeta>;
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
  surfaceId?: string;
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

export interface BuiltInActionInvocation {
  action: string;
  args?: Record<string, unknown>;
  targeting: CompiledActionTargeting;
  actionNode: CompiledActionNode;
  signal?: AbortSignal;
}

export interface ComponentActionInvocation {
  method: string;
  target: { _targetCid?: number; componentId?: string; componentName?: string };
  payload: Record<string, unknown> | undefined;
}

export interface NamespacedActionInvocation {
  actionName: string;
  namespace: string;
  method: string;
  payload: Record<string, unknown> | undefined;
}

/**
 * Runtime adapter interface for action execution.
 *
 * flux-action-core owns dispatch ordering, selector recognition, payload evaluation,
 * and result classification. The runtime adapter owns the final runtime invocation
 * boundary for built-in, component-targeted, and namespaced actions.
 *
 * This interface isolates runtime-specific behavior behind a single adapter object,
 * allowing action-core to remain independent of form/page/surface/source runtime internals.
 */
export interface ActionRuntimeAdapter {
  /**
   * Execute a built-in action invocation.
   *
   * Built-in payload remains args-centric at this boundary; action-specific DTO
   * normalization is a runtime implementation detail below the adapter surface.
   */
  invokeBuiltInAction(invocation: BuiltInActionInvocation, ctx: ActionContext): Promise<ActionResult>;

  /**
   * Resolve a component handle and invoke a component-targeted action.
   */
  invokeComponentAction(invocation: ComponentActionInvocation, ctx: ActionContext): Promise<ActionResult>;

  /**
   * Resolve a namespaced action and invoke it.
   */
  invokeNamespacedAction(invocation: NamespacedActionInvocation, ctx: ActionContext): Promise<ActionResult>;
}
