import type { NodeInstance, InstanceFrame } from './node-identity';
import type { SchemaObject, SchemaValue, SchemaPath, OperationControlConfig } from './schema';
import type { ScopeRef } from './scope';
import type { ComponentHandleRegistry, RendererRuntime, RendererEnv } from './renderer';
import type { FormRuntime, PageRuntime, SurfaceRuntime } from './runtime';
import type { CompiledRuntimeValue } from './compilation';

export interface ActionSchema extends SchemaObject {
  action: string;
  _targetCid?: number;
  _targetTemplateId?: string;
  targetId?: string;
  componentId?: string;
  componentName?: string;
  componentPath?: string;
  formId?: string;
  dialogId?: string;
  dataPath?: string;
  value?: SchemaValue;
  values?: Record<string, SchemaValue>;
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
  value?: CompiledRuntimeValue<SchemaValue>;
  values?: CompiledRuntimeValue<Record<string, SchemaValue>>;
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
  componentPath?: string;
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
