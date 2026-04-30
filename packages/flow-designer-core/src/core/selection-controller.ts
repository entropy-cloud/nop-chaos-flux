import {
  clearSelectionState,
  getSelectionSummary,
  selectActiveBranch,
  selectAllNodeIds,
  selectSingleEdge,
  selectSingleNode,
  setSelectionState,
  toggleExistingEdgeSelection,
  toggleNodeSelection as toggleExistingNodeSelection,
  type DesignerSelectionState,
} from './selection';
import type { DesignerEvent } from '../types';

interface SelectionControllerArgs {
  getSelectionState(): DesignerSelectionState;
  setSelectionState(next: DesignerSelectionState): void;
  getAllNodeIds(): string[];
  emit(event: DesignerEvent): void;
}

export function createSelectionController(args: SelectionControllerArgs) {
  function apply(nextSelection: DesignerSelectionState) {
    if (nextSelection === args.getSelectionState()) {
      return false;
    }

    args.setSelectionState(nextSelection);
    args.emit({ type: 'selectionChanged', selection: getSelectionSummary(nextSelection) });
    return true;
  }

  return {
    selectNode(nodeId: string | null) {
      apply(selectSingleNode(args.getSelectionState(), nodeId));
    },
    selectEdge(edgeId: string | null) {
      apply(selectSingleEdge(args.getSelectionState(), edgeId));
    },
    selectBranch(ownerNodeId: string, branchId: string | null) {
      apply(selectActiveBranch(args.getSelectionState(), ownerNodeId, branchId));
    },
    clearSelection() {
      apply(clearSelectionState(args.getSelectionState()));
    },
    toggleNodeSelection(nodeId: string) {
      apply(toggleExistingNodeSelection(args.getSelectionState(), nodeId));
    },
    toggleEdgeSelection(edgeId: string) {
      apply(toggleExistingEdgeSelection(args.getSelectionState(), edgeId));
    },
    selectAllNodes() {
      apply(selectAllNodeIds(args.getSelectionState(), args.getAllNodeIds()));
    },
    setSelection(nodeIds: string[], edgeIds: string[]) {
      apply(setSelectionState(args.getSelectionState(), nodeIds, edgeIds));
    },
  };
}
