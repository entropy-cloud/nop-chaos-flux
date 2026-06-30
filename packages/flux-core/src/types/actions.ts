import type {
  ApiSchema,
  OperationControlConfig,
  SchemaObject,
  SchemaPath,
  SchemaValue,
  XuiImportSpec,
} from './schema-base-types.js';
import type { ImportedLibraryStaticMeta, CompiledRuntimeValue } from './compiled-value-types.js';
import type { ScopeRef } from './scope.js';
import type { ComponentHandleRegistryCore } from './component-handle-core.js';

type ActionInstanceFrame = {
  repeatedTemplateId: string;
  instanceKey: string;
};

type ActionContextNodeInstance = {
  cid?: number;
  instancePath?: readonly ActionInstanceFrame[];
  templateNode: {
    id: string;
    templatePath?: string;
  };
  scope: ScopeRef;
  state?: unknown;
};

type ActionContextRuntime = {
  env: {
    notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  };
  expressionCompiler: unknown;
  dispatch(
    action: ActionSchema | ActionSchema[] | CompiledActionProgram,
    ctx: ActionContext,
  ): Promise<ActionResult>;
};

type ActionContextForm = {
  id: string;
  setValues(values: Record<string, unknown>): void;
  submit(options?: { interactionId?: string; signal?: AbortSignal }): Promise<ActionResult>;
};

type ActionContextPage = {
  refresh(): void;
  store: {
    getState(): {
      refreshTick: number;
    };
  };
};

type ActionContextSurfaceRuntime = {
  open(input: {
    kind: 'dialog' | 'drawer' | 'sheet';
    surface: Record<string, any>;
    scope: ScopeRef;
    surfaceId?: string;
    options?: {
      ownerScope?: ScopeRef;
      actionScope?: ActionScope;
      componentRegistry?: ComponentHandleRegistryCore;
      validationPlan?: {
        order: string[];
        behavior: {
          triggers: ('change' | 'blur' | 'submit')[];
          showErrorOn: ('touched' | 'dirty' | 'visited' | 'submit')[];
        };
        dependents: Record<string, string[]>;
        nodes?: Record<string, unknown>;
        rootPath?: string;
        ownerId?: string;
      };
      ownerNodeInstance?: ActionContextNodeInstance;
      title?: unknown;
      body?: unknown;
      actions?: unknown;
      meta?: unknown;
      regionHandles?: Readonly<Record<string, unknown>>;
      controlledOpen?: boolean;
      onOpen?: () => Promise<ActionResult> | ActionResult | void;
      onClose?: () => Promise<ActionResult> | ActionResult | void;
    };
  }): string;
  close(surfaceId?: string): void;
  closeTop(): void;
};

/**
 * Reduced environment available inside action execution contexts.
 * Unlike `RendererEnv` (which extends `ExpressionExecutionEnv` with full browser capabilities),
 * this type makes `fetcher` and `notify` optional because actions may execute outside the
 * browser — e.g. server-side rendering or headless tests — where those services are unavailable.
 */
type ActionContextRendererEnv = {
  fetcher?: unknown;
  notify?: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  importLoader?: ImportedLibraryLoader;
  resolveImportUrl?: (schemaUrl: string, from: string, options?: Record<string, unknown>) => string;
};

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
  dialogId?: string;
  surfaceId?: string;
  args?: Record<string, SchemaValue>;
  control?: OperationControlConfig;
  timeout?: number;
  retry?: OperationControlConfig['retry'];
  debounce?: number;
  when?: boolean | string;
  preventDefault?: boolean | string;
  stopPropagation?: boolean | string;
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

export interface ConfirmActionSchema extends ActionShapeFields {
  action: 'confirm';
  args: { message?: SchemaValue; title?: SchemaValue };
}

export interface AlertActionSchema extends ActionShapeFields {
  action: 'alert';
  args: { message?: SchemaValue; title?: SchemaValue };
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
  | ConfirmActionSchema
  | AlertActionSchema
  | NavigateActionSchema;

export interface ActionSchema extends ActionShapeFields {
  action: string;
}

export type XuiActionDefinitions = Record<string, ActionSchema>;

export interface ActionResult {
  ok: boolean;
  cause?: unknown;
  cancelled?: boolean;
  skipped?: boolean;
  timedOut?: boolean;
  failureHandled?: boolean;
  data?: unknown;
  results?: ActionResult[];
  attempts?: number;
  failureCount?: number;
  error?: unknown;
  onErrorError?: unknown;
  componentId?: string;
  componentName?: string;
  componentType?: string;
  namespace?: string;
  sourceScopeId?: string;
  providerKind?: 'host' | 'import';
  settledError?: unknown;
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
  runtime: ActionContextRuntime;
  scope: ScopeRef;
  instancePath?: readonly ActionInstanceFrame[];
  nodeInstance?: ActionContextNodeInstance;
  getInstanceKey?: () => string | undefined;
  interactionId?: string;
  signal?: AbortSignal;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistryCore;
  event?: FluxActionEvent;
  form?: ActionContextForm;
  page?: ActionContextPage;
  surfaceRuntime?: ActionContextSurfaceRuntime;
  dialogId?: string;
  prevResult?: ActionResult;
  evaluationBindings?: Record<string, unknown>;
}

export interface ActionNamespaceProvider {
  kind?: 'host' | 'import';
  invoke(
    method: string,
    payload: Record<string, unknown> | undefined,
    ctx: ActionContext,
  ): Promise<ActionResult> | ActionResult;
  dispose?(): void;
  release?(): void;
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
  createNamespace(
    context: ImportedNamespaceContext,
  ): Promise<ActionNamespaceProvider> | ActionNamespaceProvider;
  createExpressionHelpers?(
    context: ImportedNamespaceContext,
  ): Promise<Record<string, unknown>> | Record<string, unknown>;
  getStaticMeta?(): ImportedLibraryStaticMeta | Promise<ImportedLibraryStaticMeta>;
}

export interface ImportedLibraryLoader {
  load(
    spec: XuiImportSpec,
    signal?: AbortSignal,
  ): Promise<ImportedLibraryModule>;
}

export interface ImportedNamespaceContext {
  runtime: ActionContextRuntime;
  env: ActionContextRendererEnv;
  actionScope: ActionScope;
  componentRegistry?: ComponentHandleRegistryCore;
  scope: ScopeRef;
  spec: XuiImportSpec;
  nodeInstance?: ActionContextNodeInstance;
}

export interface ActionMonitorPayload {
  actionType: string;
  instancePath?: readonly ActionInstanceFrame[];
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
  dialogId?: string;
  surfaceId?: string;
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
  preventDefault?: CompiledRuntimeValue<boolean>;
  stopPropagation?: CompiledRuntimeValue<boolean>;
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
  invokeBuiltInAction(
    invocation: BuiltInActionInvocation,
    ctx: ActionContext,
  ): Promise<ActionResult>;

  /**
   * Resolve a component handle and invoke a component-targeted action.
   */
  invokeComponentAction(
    invocation: ComponentActionInvocation,
    ctx: ActionContext,
  ): Promise<ActionResult>;

  /**
   * Resolve a namespaced action and invoke it.
   */
  invokeNamespacedAction(
    invocation: NamespacedActionInvocation,
    ctx: ActionContext,
  ): Promise<ActionResult>;
}
