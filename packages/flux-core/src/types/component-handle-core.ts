export interface ComponentCapabilityResult {
  ok: boolean;
  error?: unknown;
  data?: unknown;
  cause?: unknown;
  cancelled?: boolean;
  skipped?: boolean;
  timedOut?: boolean;
  failureHandled?: boolean;
}

export interface ComponentCapabilityActionContext {
  runtime?: unknown;
  scope?: unknown;
  instancePath?: readonly unknown[];
  nodeInstance?: unknown;
  getInstanceKey?: () => string | undefined;
  interactionId?: string;
  signal?: AbortSignal;
  actionScope?: unknown;
  componentRegistry?: unknown;
  event?: unknown;
  form?: unknown;
  page?: unknown;
  surfaceRuntime?: unknown;
  dialogId?: string;
  prevResult?: ComponentCapabilityResult;
  evaluationBindings?: Record<string, unknown>;
}

export interface ComponentTarget {
  _targetCid?: number;
  componentId?: string;
  componentName?: string;
}

export interface ComponentCapabilities {
  store?: unknown;
  invoke(
    method: string,
    payload: Record<string, unknown> | undefined,
    ctx: ComponentCapabilityActionContext,
  ): Promise<ComponentCapabilityResult> | ComponentCapabilityResult;
  hasMethod?(method: string): boolean;
  listMethods?(): readonly string[];
  getDebugData?(): Record<string, unknown> | undefined;
}

export interface ComponentHandle {
  _cid?: number;
  _mounted?: boolean;
  id?: string;
  name?: string;
  type: string;
  ref?: HTMLElement | null;
  capabilities: ComponentCapabilities;
  /**
   * Optional scope this handle belongs to. Populated by renderer hooks that
   * have access to the current render scope (e.g. CRUD / tree / form handles).
   * Used by `ComponentHandleRegistry.findFirstInScope` to enable scope-aware
   * lookup for `refreshNearest`. When undefined, the handle does not
   * participate in scope-based lookup (only id/name based resolve works).
   */
  scope?: import('./scope.js').ScopeRef;
}

export interface ComponentHandleRegistryCore {
  id: string;
  parent?: ComponentHandleRegistryCore;
  register(
    handle: ComponentHandle,
    options?: {
      cid?: number;
    },
  ): () => void;
  unregister(handle: ComponentHandle): void;
  resolve(target: ComponentTarget): ComponentHandle | undefined;
  /**
   * Find the first handle in this registry's own bucket whose `handle.scope.id`
   * matches `scope.id` and that satisfies `predicate`. Does NOT walk parent or
   * child registries — callers responsible for registry tree traversal.
   *
   * Returns undefined when no handle in this bucket carries the given scope
   * (e.g. handles registered without a scope are skipped).
   */
  findFirstInScope?(
    scope: import('./scope.js').ScopeRef,
    predicate: (handle: ComponentHandle) => boolean,
  ): ComponentHandle | undefined;
  dispose?(): void;
}
