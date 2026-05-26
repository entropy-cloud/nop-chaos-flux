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
  dispose?(): void;
}
