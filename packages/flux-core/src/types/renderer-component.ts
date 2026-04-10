import type { ActionContext, ActionResult } from './actions';
import type {
  InspectResult,
  NodeInstance,
} from './node-identity';
import type { ResolvedNodeMeta, ResolvedNodeProps } from './renderer-compiler';
import type { ScopeRef } from './scope';

export interface ComponentTarget {
  _targetCid?: number;
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
  nodeInstance?: NodeInstance;
  scope?: ScopeRef;
  resolvedMeta?: ResolvedNodeMeta;
  resolvedProps?: ResolvedNodeProps['value'];
  updatedAt?: number;
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
  debugEnabled?: boolean;
  setDebugEnabled?(enabled: boolean): void;
  register(
    handle: ComponentHandle,
    options?: {
      cid?: number;
    }
  ): () => void;
  unregister(handle: ComponentHandle): void;
  resolve(target: ComponentTarget): ComponentHandle | undefined;
  inspectCid?(cid: number): InspectResult;
  getHandleByCid?(cid: number): ComponentHandle | undefined;
  setHandleDebugData?(cid: number, data: ComponentHandleDebugData | undefined): void;
  getHandleDebugData?(cid: number): ComponentHandleDebugData | undefined;
  getDebugSnapshot?(): ComponentHandleRegistryDebugSnapshot;
}
