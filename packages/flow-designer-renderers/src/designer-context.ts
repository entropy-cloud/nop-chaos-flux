import React, { useMemo, useSyncExternalStore } from 'react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { useHostScope } from '@nop-chaos/flux-react';
import type {
  DesignerCore,
  DesignerSnapshot,
  DesignerConfig,
  NodeTypeConfig,
  EdgeTypeConfig,
  NormalizedDesignerConfig,
} from '@nop-chaos/flow-designer-core';
import type { DesignerCommandAdapter } from './designer-command-adapter';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';

/**
 * Stable context value that does not change when snapshot updates.
 * This allows consumers that only need dispatch/config to avoid re-rendering.
 */
export interface DesignerContextValue {
  core: DesignerCore;
  commandAdapter: DesignerCommandAdapter;
  dispatch: (
    command: import('./designer-command-adapter').DesignerCommand,
  ) => import('./designer-command-adapter').DesignerCommandResult;
  config: DesignerConfig;
  openCreateDialog?: (nodeType: NodeTypeConfig, position: { x: number; y: number }) => void;
  onPlusButtonClick?: (
    sourceId: string,
    clientX: number,
    clientY: number,
    sourceKind?: 'node' | 'branch-group' | 'merge',
  ) => void;
}

export const DesignerContext = React.createContext<DesignerContextValue | null>(null);

/**
 * Returns stable context value (dispatch, config, core).
 * Does NOT include snapshot - use useDesignerSnapshotSelector for reactive snapshot data.
 */
export function useDesignerContext(): DesignerContextValue {
  const ctx = React.useContext(DesignerContext);
  if (!ctx) {
    throw new Error('Designer components must be used within a designer-page');
  }
  return ctx;
}

/**
 * Subscribe to the full snapshot from core.
 * Use useDesignerSnapshotSelector for fine-grained subscriptions.
 */
export function useDesignerFullSnapshot(): DesignerSnapshot {
  const { core } = useDesignerContext();
  return useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot);
}

/**
 * Fine-grained snapshot selector hook.
 * Only re-renders when the selected value changes (via Object.is comparison).
 *
 * @example
 * const activeNode = useDesignerSnapshotSelector(s => s.activeNode);
 * const canUndo = useDesignerSnapshotSelector(s => s.canUndo);
 */
export function useDesignerSnapshotSelector<T>(
  selector: (snapshot: DesignerSnapshot) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const { core } = useDesignerContext();
  return useSyncExternalStoreWithSelector(
    core.subscribe,
    core.getSnapshot,
    core.getSnapshot,
    selector,
    isEqual,
  );
}

/**
 * Standalone hook for subscribing to snapshot outside of context.
 * Used internally by DesignerPageBody before context is established.
 */
export function useDesignerSnapshot(core: DesignerCore): DesignerSnapshot {
  return useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot);
}

export function notifyCommandFailure(
  notify: import('@nop-chaos/flux-core').RendererEnv['notify'] | undefined,
  error: string | undefined,
  reason?: string,
) {
  if (!error || reason === 'unchanged') {
    return;
  }

  notify?.('warning', error);
}

export function toActionResult(result: import('./designer-command-adapter').DesignerCommandResult) {
  return {
    ok: result.ok,
    data: result.exported ?? result.data,
    error: result.error ? new Error(result.error) : undefined,
  };
}

export function buildDesignerScopeData(input: {
  snapshot: DesignerSnapshot;
  config: DesignerConfig;
  core: DesignerCore;
}) {
  const { snapshot } = input;
  const selectionKind = snapshot.activeBranch
    ? 'branch'
    : snapshot.activeNode
      ? 'node'
      : snapshot.activeEdge
        ? 'edge'
        : 'none';
  const nodeIds = snapshot.selection.selectedNodeIds;
  const edgeIds = snapshot.selection.selectedEdgeIds;

  return {
    doc: snapshot.doc,
    selection: {
      kind: selectionKind,
      count: nodeIds.length + edgeIds.length,
      nodeIds,
      edgeIds,
      selectedNodeIds: nodeIds,
      selectedEdgeIds: edgeIds,
      activeNodeId: snapshot.selection.activeNodeId,
      activeEdgeId: snapshot.selection.activeEdgeId,
      activeBranchId: snapshot.selection.activeBranchId,
    },
    activeNode: snapshot.activeNode,
    activeEdge: snapshot.activeEdge,
    activeBranch: snapshot.activeBranch,
    runtime: {
      canUndo: snapshot.canUndo,
      canRedo: snapshot.canRedo,
      dirty: snapshot.isDirty,
      isDirty: snapshot.isDirty,
      gridEnabled: snapshot.gridEnabled,
      zoom: snapshot.viewport.zoom,
      viewport: snapshot.viewport,
    },
  };
}

export function useDesignerHostScope(input: {
  snapshot: DesignerSnapshot;
  config: DesignerConfig;
  core: DesignerCore;
  path: string;
}): ScopeRef {
  const scopeData = useMemo(() => buildDesignerScopeData(input), [input]);
  return useHostScope(scopeData, input.path, 'designer');
}

export function useNormalizedConfig(): NormalizedDesignerConfig {
  const { core } = useDesignerContext();
  return core.getConfig();
}

export function useNodeTypeConfig(typeId: string): NodeTypeConfig | undefined {
  const normalizedConfig = useNormalizedConfig();
  return normalizedConfig.nodeTypes.get(typeId);
}

export function useEdgeTypeConfig(typeId: string): EdgeTypeConfig | undefined {
  const normalizedConfig = useNormalizedConfig();
  return normalizedConfig.edgeTypes.get(typeId);
}
