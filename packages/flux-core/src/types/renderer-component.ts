import type { InspectResult, NodeInstance } from './node-identity.js';
import type { ScopeRef } from './scope.js';
import type {
  ComponentCapabilities,
  ComponentHandle,
  ComponentHandleRegistryCore,
} from './component-handle-core.js';

type ComponentHandleResolvedMeta = {
  id?: string;
  className?: string;
  frameClassName?: string;
  when?: boolean;
  visible?: boolean;
  hidden?: boolean;
  disabled?: boolean;
  testid?: string;
  changed?: boolean;
  cid?: number;
};

export interface ComponentHandleDebugData {
  debugEntryId?: number;
  nodeId?: string;
  path?: string;
  rendererType?: string;
  nodeInstance?: NodeInstance;
  scope?: ScopeRef;
  resolvedMeta?: ComponentHandleResolvedMeta;
  resolvedProps?: Readonly<Record<string, unknown>>;
  sourceHints?: {
    fieldName?: string;
    formValue?: unknown;
    scopeValue?: unknown;
    metaRules?: Partial<Record<'visible' | 'hidden' | 'disabled', string>>;
  };
  updatedAt?: number;
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

export interface ComponentHandleRegistry extends ComponentHandleRegistryCore {
  debugEnabled?: boolean;
  setDebugEnabled?(enabled: boolean): void;
  subscribeDebugEnabled?(listener: () => void): () => void;
  inspectCid?(cid: number): InspectResult;
  getHandleByCid?(cid: number): ComponentHandle | undefined;
  setHandleDebugData?(cid: number, data: ComponentHandleDebugData | undefined): void;
  getHandleDebugData?(cid: number): ComponentHandleDebugData | undefined;
  getDebugSnapshot?(): ComponentHandleRegistryDebugSnapshot;
}
