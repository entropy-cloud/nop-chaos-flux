import type { ActionContext, ActionResult } from './actions';
import type { ResolvedNodeMeta, ResolvedNodeProps } from './renderer-compiler';
import type { ScopeRef } from './scope';

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
  getDebugData?(): Record<string, unknown> | undefined;
}

export interface ComponentHandleDebugData {
  nodeId?: string;
  path?: string;
  rendererType?: string;
  scope?: ScopeRef;
  resolvedMeta?: ResolvedNodeMeta;
  resolvedProps?: ResolvedNodeProps['value'];
  updatedAt?: number;
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

export interface ComponentHandleDebugEntry {
  cid?: number;
  id?: string;
  name?: string;
  type: string;
  mounted: boolean;
  capabilities?: ComponentCapabilities;
}

export interface ComponentHandleRegistryDebugSnapshot {
  handles: ComponentHandleDebugEntry[];
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
  getHandleByCid?(cid: number): ComponentHandle | undefined;
  setHandleDebugData?(cid: number, data: ComponentHandleDebugData | undefined): void;
  getHandleDebugData?(cid: number): ComponentHandleDebugData | undefined;
  getDebugSnapshot?(): ComponentHandleRegistryDebugSnapshot;
}
