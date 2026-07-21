# Gantt Multi-Select + Batch Operations Design

> Part of S3 Gantt advanced features.
> Source: `docs/components/gantt/design.md` §12 (S3.9)

## Purpose

Provide multi-task selection and batch operations for the Gantt chart, enabling users to select multiple tasks and perform bulk edits, drag moves, or deletions.

## Selection Model

### `selectionMode` Prop

- `selectionMode: 'single' | 'multiple'` (default `'single'`)
- When `multiple`, enables multi-select interactions

### Interaction

- Click on task row: selects task (deselects others if no modifier)
- Shift+Click on task row: range selection (selects all tasks between last clicked and this one)
- Ctrl/Cmd+Click on task row: toggle individual task selection (adds/removes from selection set)
- Click on empty grid area: deselects all

### Selection State

- `selectedTaskIds: Set<GanttId>` stored in local state
- Exposed via `useGanttStore` → `getSelectedTaskIds()` / `setSelectedTaskIds()`
- Selected rows highlighted with distinct background (`bg-blue-50`)
- Selected-count badge shown in toolbar (`"N selected"`)

## Batch Operations

### Batch Drag

- Dragging any selected task bar moves all selected tasks together
- Offset calculated from the drag target task's original position
- All selected tasks receive the same delta in start/end dates
- Undo: single undo step for the entire batch move

### Batch Delete

- Delete/Backspace key or "Delete N tasks" button deletes all selected tasks
- Confirmation dialog for > 5 tasks: "Delete N tasks?" with cancel/confirm
- Undo: single undo step restoring all deleted tasks

### Batch Field Update

- "Batch edit" button opens editor with common fields (start, end, duration, progress, type)
- Changes applied to all selected tasks
- Fields left blank are not changed (partial update per task)

## Implementation

> ⚠️ Implementation removed (see `docs/plans/2026-07-21-2100-1-dead-module-cleanup-scheduling-content.md`). The multi-select model was never wired into the render pipeline; the file was identified as dead code and removed. This design doc is retained as reference for future re-implementation.

> Design reference only — no live source file.

```typescript
interface MultiSelectState {
  selectedTaskIds: Set<GanttId>;
  lastClickedId: GanttId | null;
  rangeAnchorId: GanttId | null;
}

interface UseMultiSelectResult {
  selectedTaskIds: Set<GanttId>;
  isSelected: (taskId: GanttId) => boolean;
  toggleSelection: (
    taskId: GanttId,
    event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  ) => void;
  clearSelection: () => void;
  selectRange: (from: GanttId, to: GanttId) => void;
  selectAll: () => void;
}
```

## Undo Integration

- Batch operations create a single composite `Command` in UndoStack
- `BatchMoveCommand`, `BatchDeleteCommand`, `BatchUpdateCommand` each implement `Command` interface from §12.8

## UI Elements

- Selected-count badge in toolbar: `"3 selected"` with a "Clear" button
- Batch action buttons appear when > 1 task selected:
  - "Batch edit" (pencil icon)
  - "Delete N tasks" (trash icon, only if `editable: true`)
- Selected rows in grid have `bg-blue-50` background and `aria-selected="true"`
- Multi-select drag handles: all selected bars show drag handle simultaneously

## Stores

Selection state is maintained in a new export from `GanttStore`:

```typescript
class GanttStore {
  // ... existing API ...
  selectedTaskIds: Set<GanttId>;
  setSelectedTaskIds(ids: Set<GanttId>): void;
  getSelectedTaskIds(): GanttId[];
  isSelected(taskId: GanttId): boolean;
}
```

This is local state (not persisted), reset on task data reload.
