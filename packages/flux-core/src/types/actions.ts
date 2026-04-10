import type { NodeInstance, NodeLocator } from './node-identity';
import type { SchemaObject, SchemaValue, SchemaPath, ApiSchema, OperationControlConfig } from './schema';
import type { ScopeRef } from './scope';
import type { ComponentHandleRegistry, RendererRuntime, CompiledSchemaNode, RendererEnv } from './renderer';
import type { FormRuntime, PageRuntime } from './runtime';

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
  api?: ApiSchema;
  dialog?: Record<string, any>;
  drawer?: Record<string, any>;
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
}

export interface ActionResult {
  ok: boolean;
  cancelled?: boolean;
  skipped?: boolean;
  timedOut?: boolean;
  data?: unknown;
  results?: ActionResult[];
  attempts?: number;
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
  locator?: NodeLocator;
  nodeInstance?: NodeInstance;
  getInstanceKey?: () => string | undefined;
  interactionId?: string;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  event?: FluxActionEvent;
  node?: CompiledSchemaNode;
  form?: FormRuntime;
  page?: PageRuntime;
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
}

export interface ImportedLibraryLoader {
  load(spec: import('./schema').XuiImportSpec): Promise<ImportedLibraryModule>;
}

export interface ImportedNamespaceContext {
  runtime: RendererRuntime;
  env: RendererEnv;
  actionScope: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  scope: ScopeRef;
  spec: import('./schema').XuiImportSpec;
  node?: CompiledSchemaNode;
  nodeInstance?: NodeInstance;
}

export interface ActionMonitorPayload {
  actionType: string;
  locator?: NodeLocator;
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
