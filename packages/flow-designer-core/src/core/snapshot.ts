import type { DesignerSelectionState } from './selection.js';
import { getSelectionSummary } from './selection.js';
import type { DesignerShellState } from './shell-state.js';
import type { DesignerSnapshot, BranchSummary, GraphDocument } from '../types.js';

function resolveActiveBranch(
  activeNode: DesignerSnapshot['activeNode'],
  activeBranchId: string | null,
): BranchSummary | null {
  if (!activeNode || !activeBranchId) {
    return null;
  }

  const branches = Array.isArray(activeNode.data.branches)
    ? (activeNode.data.branches as BranchSummary[])
    : [];
  return branches.find((branch) => branch.id === activeBranchId) ?? null;
}

export interface DesignerSnapshotCache {
  selection: DesignerSnapshot['selection'];
  snapshot: DesignerSnapshot;
}

export function createDesignerSnapshotCache(input: {
  doc: GraphDocument;
  selectionState: DesignerSelectionState;
  shell: DesignerShellState;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  readonly: boolean;
}): DesignerSnapshotCache {
  const selection = getSelectionSummary(input.selectionState);

  return {
    selection,
    snapshot: {
      doc: input.doc,
      selection,
      activeNode: null,
      activeEdge: null,
      activeBranch: null,
      canUndo: input.canUndo,
      canRedo: input.canRedo,
      isDirty: input.isDirty,
      readonly: input.readonly,
      gridEnabled: input.shell.gridEnabled,
      paletteCollapsed: input.shell.paletteCollapsed,
      inspectorCollapsed: input.shell.inspectorCollapsed,
      viewport: input.shell.viewport,
    },
  };
}

export function getDesignerSnapshot(input: {
  cache: DesignerSnapshotCache;
  doc: GraphDocument;
  selectionState: DesignerSelectionState;
  shell: DesignerShellState;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  readonly: boolean;
}) {
  const selection = getSelectionSummary(input.selectionState);
  const activeNodeId = selection.activeNodeId;
  const activeEdgeId = selection.activeEdgeId;
  const activeNode = activeNodeId
    ? (input.doc.nodes.find((n) => n.id === activeNodeId) ?? null)
    : null;
  const activeEdge = activeEdgeId
    ? (input.doc.edges.find((e) => e.id === activeEdgeId) ?? null)
    : null;
  const activeBranch = resolveActiveBranch(activeNode, selection.activeBranchId);

  const selectionUnchanged =
    input.cache.selection.activeNodeId === selection.activeNodeId &&
    input.cache.selection.activeEdgeId === selection.activeEdgeId &&
    input.cache.selection.activeBranchId === selection.activeBranchId &&
    input.cache.selection.selectedNodeIds === selection.selectedNodeIds &&
    input.cache.selection.selectedEdgeIds === selection.selectedEdgeIds;

  if (
    input.cache.snapshot.doc === input.doc &&
    selectionUnchanged &&
    input.cache.snapshot.activeNode === activeNode &&
    input.cache.snapshot.activeEdge === activeEdge &&
    input.cache.snapshot.activeBranch === activeBranch &&
    input.cache.snapshot.canUndo === input.canUndo &&
    input.cache.snapshot.canRedo === input.canRedo &&
    input.cache.snapshot.isDirty === input.isDirty &&
    input.cache.snapshot.readonly === input.readonly &&
    input.cache.snapshot.gridEnabled === input.shell.gridEnabled &&
    input.cache.snapshot.paletteCollapsed === input.shell.paletteCollapsed &&
    input.cache.snapshot.inspectorCollapsed === input.shell.inspectorCollapsed &&
    input.cache.snapshot.viewport === input.shell.viewport
  ) {
    return input.cache.snapshot;
  }

  input.cache.selection = selection;
  input.cache.snapshot = {
    doc: input.doc,
    selection,
    activeNode,
    activeEdge,
    activeBranch,
    canUndo: input.canUndo,
    canRedo: input.canRedo,
    isDirty: input.isDirty,
    readonly: input.readonly,
    gridEnabled: input.shell.gridEnabled,
    paletteCollapsed: input.shell.paletteCollapsed,
    inspectorCollapsed: input.shell.inspectorCollapsed,
    viewport: input.shell.viewport,
  };

  return input.cache.snapshot;
}
