# Kanban Undo/Redo Design

> Status: final
> Last Updated: 2026-07-20
> Source: `docs/components/kanban/design.md` §12 (P3 deferred), S7.6 plan item
> References: `packages/flux-renderers-scheduling/src/kanban/kanban-helpers.ts` (moveCard/moveColumn/addCard/removeCard/changeCard), `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-dnd.ts`, `packages/flux-renderers-scheduling/src/kanban/hooks/use-column-dnd.ts`

## Purpose

Add command-pattern UndoStack to KanbanBoard enabling Ctrl+Z/Ctrl+Shift+Z undo/redo for all card and column operations.

## Command Types

```typescript
type UndoCommandType =
  | 'moveCard'
  | 'moveColumn'
  | 'addCard'
  | 'removeCard'
  | 'changeCard'
  | 'addColumn'
  | 'removeColumn';

interface UndoCommand {
  type: UndoCommandType;
  timestamp: number;
  boardSnapshot: BoardData; // Full BoardData before the operation
  metadata: {
    cardId?: string;
    columnId?: string;
    targetColumnId?: string;
    targetIndex?: number;
    fromIndex?: number;
  };
}
```

## Implementation

### UndoStack

```typescript
interface UndoStack {
  undoStack: UndoCommand[];
  redoStack: UndoCommand[];
  maxSize: number; // default 1000, FIFO eviction
}

function pushCommand(stack: UndoStack, command: UndoCommand): UndoStack;
function undo(stack: UndoStack, currentBoard: BoardData): { board: BoardData; stack: UndoStack };
function redo(stack: UndoStack, currentBoard: BoardData): { board: BoardData; stack: UndoStack };
function canUndo(stack: UndoStack): boolean;
function canRedo(stack: UndoStack): boolean;
```

### Merge Strategy

Consecutive `moveCard` operations on the same card collapse into a single undo step: only the first boardSnapshot (before the first move) is retained. This prevents undo from walking through every intermediate drag position.

Merge condition: last pushed command is `moveCard` AND `command.metadata.cardId === lastCommand.metadata.cardId`.

### Wire Points

- `useKanbanDnd.onDrop` → after `moveCard` → `pushCommand({ type: 'moveCard', boardSnapshot: previousBoard, ... })`
- `useKanbanAdder` → after `addCard`/`removeCard`/`addColumn`/`removeColumn` → `pushCommand`
- `KanbanBoard` → `useEffect` handler for `Ctrl+Z` / `Ctrl+Shift+Z` keyboard events
- Toolbar buttons: `onUndo`/`onRedo` callbacks with `canUndo`/`canRedo` disabled states

### Failure Paths

| Scenario              | Trigger                              | Expected Behavior                                          | Retryable |
| --------------------- | ------------------------------------ | ---------------------------------------------------------- | --------- |
| `undo-stack-overflow` | 10,000+ commands accumulated         | Cap stack at 1000 (FIFO eviction); oldest silently dropped | No        |
| `undo-empty`          | Ctrl+Z pressed with empty undo stack | No-op; button disabled                                     | No        |
| `redo-empty`          | Ctrl+Shift+Z pressed with empty redo | No-op; button disabled                                     | No        |
| `snapshot-stale`      | board mutated outside undoStack      | Undo restores stale snapshot; next operation re-syncs      | Yes       |
