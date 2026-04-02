import type { ActionContext, ActionResult } from './actions';

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