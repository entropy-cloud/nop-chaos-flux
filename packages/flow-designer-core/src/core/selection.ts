import type { SelectionSummary } from '../types';

export interface DesignerSelectionState {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
}

function sameIds(left: string[], right: string[]): boolean {
  if (left === right) {
    return true;
  }
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

export function createSelectionState(): DesignerSelectionState {
  return {
    selectedNodeIds: [],
    selectedEdgeIds: [],
  };
}

export function getSelectionSummary(state: DesignerSelectionState): SelectionSummary {
  return {
    selectedNodeIds: state.selectedNodeIds,
    selectedEdgeIds: state.selectedEdgeIds,
    activeNodeId: state.selectedNodeIds[0] ?? null,
    activeEdgeId: state.selectedEdgeIds[0] ?? null,
  };
}

export function selectSingleNode(
  state: DesignerSelectionState,
  nodeId: string | null,
): DesignerSelectionState {
  if (state.selectedNodeIds.length === 1 && state.selectedNodeIds[0] === nodeId) {
    return state;
  }

  return {
    selectedNodeIds: nodeId ? [nodeId] : [],
    selectedEdgeIds: [],
  };
}

export function selectSingleEdge(
  state: DesignerSelectionState,
  edgeId: string | null,
): DesignerSelectionState {
  if (state.selectedEdgeIds.length === 1 && state.selectedEdgeIds[0] === edgeId) {
    return state;
  }

  return {
    selectedNodeIds: [],
    selectedEdgeIds: edgeId ? [edgeId] : [],
  };
}

export function clearSelectionState(
  state: DesignerSelectionState,
): DesignerSelectionState {
  if (state.selectedNodeIds.length === 0 && state.selectedEdgeIds.length === 0) {
    return state;
  }
  return createSelectionState();
}

export function toggleNodeSelection(
  state: DesignerSelectionState,
  nodeId: string,
): DesignerSelectionState {
  if (state.selectedNodeIds.includes(nodeId)) {
    return {
      selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
      selectedEdgeIds: state.selectedEdgeIds,
    };
  }

  return {
    selectedNodeIds: [...state.selectedNodeIds, nodeId],
    selectedEdgeIds: [],
  };
}

export function toggleExistingEdgeSelection(
  state: DesignerSelectionState,
  edgeId: string,
): DesignerSelectionState {
  if (state.selectedEdgeIds.includes(edgeId)) {
    return {
      selectedNodeIds: state.selectedNodeIds,
      selectedEdgeIds: state.selectedEdgeIds.filter((id) => id !== edgeId),
    };
  }

  return {
    selectedNodeIds: [],
    selectedEdgeIds: [...state.selectedEdgeIds, edgeId],
  };
}

export function selectAllNodeIds(
  state: DesignerSelectionState,
  nodeIds: string[],
): DesignerSelectionState {
  if (sameIds(state.selectedNodeIds, nodeIds) && state.selectedEdgeIds.length === 0) {
    return state;
  }

  return {
    selectedNodeIds: nodeIds,
    selectedEdgeIds: [],
  };
}

export function setSelectionState(
  state: DesignerSelectionState,
  nodeIds: string[],
  edgeIds: string[],
): DesignerSelectionState {
  if (sameIds(state.selectedNodeIds, nodeIds) && sameIds(state.selectedEdgeIds, edgeIds)) {
    return state;
  }

  return {
    selectedNodeIds: nodeIds,
    selectedEdgeIds: edgeIds,
  };
}

export function removeNodeFromSelection(
  state: DesignerSelectionState,
  nodeId: string,
): DesignerSelectionState {
  if (!state.selectedNodeIds.includes(nodeId)) {
    return state;
  }

  return {
    selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
    selectedEdgeIds: state.selectedEdgeIds,
  };
}

export function removeEdgeFromSelection(
  state: DesignerSelectionState,
  edgeId: string,
): DesignerSelectionState {
  if (!state.selectedEdgeIds.includes(edgeId)) {
    return state;
  }

  return {
    selectedNodeIds: state.selectedNodeIds,
    selectedEdgeIds: state.selectedEdgeIds.filter((id) => id !== edgeId),
  };
}
