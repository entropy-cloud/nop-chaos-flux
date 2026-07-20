import type { GanttId } from '../gantt.types.js';

export interface MultiSelectState {
  selectedIds: Set<GanttId>;
  lastClickedId: GanttId | null;
  rangeAnchorId: GanttId | null;
}

export function createMultiSelectState(): MultiSelectState {
  return {
    selectedIds: new Set(),
    lastClickedId: null,
    rangeAnchorId: null,
  };
}

export function handleMultiSelectClick(
  state: MultiSelectState,
  taskId: GanttId,
  visibleIds: GanttId[],
  event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
): MultiSelectState {
  const newSelected = new Set(state.selectedIds);
  const isCtrl = event.ctrlKey || event.metaKey;

  if (event.shiftKey && state.rangeAnchorId != null) {
    const anchorIdx = visibleIds.indexOf(state.rangeAnchorId);
    const clickIdx = visibleIds.indexOf(taskId);
    if (anchorIdx >= 0 && clickIdx >= 0) {
      const start = Math.min(anchorIdx, clickIdx);
      const end = Math.max(anchorIdx, clickIdx);
      if (!isCtrl) newSelected.clear();
      for (let i = start; i <= end; i++) {
        newSelected.add(visibleIds[i]);
      }
    }
    return {
      selectedIds: newSelected,
      lastClickedId: taskId,
      rangeAnchorId: state.rangeAnchorId,
    };
  }

  if (isCtrl) {
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    return {
      selectedIds: newSelected,
      lastClickedId: taskId,
      rangeAnchorId: state.rangeAnchorId,
    };
  }

  return {
    selectedIds: new Set([taskId]),
    lastClickedId: taskId,
    rangeAnchorId: taskId,
  };
}

export function clearSelection(): MultiSelectState {
  return createMultiSelectState();
}

export function selectAll(visibleIds: GanttId[]): MultiSelectState {
  return {
    selectedIds: new Set(visibleIds),
    lastClickedId: null,
    rangeAnchorId: null,
  };
}
