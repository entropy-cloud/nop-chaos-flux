# Dimension 02: Module Responsibilities & File Boundaries

## Findings

### [D02-01] kanban-board.tsx — 720 lines with 12+ mixed responsibilities

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:1-720`
- **Severity**: P2
- **Evidence**: Handles board state, collapsed state, undo/redo, activity log, keyboard DnD, column add UI, filter compilation, WIP limits, tag filtering, DnD visual effects via querySelectorAll, undo/redo toolbar, search bar — all in one 720-line component.
- **Recommendation**: Split into `useKanbanBoardState` hook + `KanbanColumnAdder` component.

### [D02-02] calendar.tsx — 576 lines with inline drag/keyboard logic

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:1-576`
- **Severity**: P2
- **Evidence**: 160+ lines of event-move, keyboard-drag, swap-confirm logic inline. Three overlay modals inline.
- **Recommendation**: Extract drag-confirm hook + overlay sub-components.

### [D02-03] All index.ts files are clean — PASS

- **Status**: All barrel files contain pure re-exports only. No implementation.

### [D02-04] barcode-input/ lacks barrel index.ts

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/` (no index.ts)
- **Severity**: P2
- **Evidence**: gantt/, kanban/, calendar/ all have barrel exports. barcode-input/ does not.
- **Recommendation**: Create barrel, update root index.ts re-exports.

### [D02-05] Two `buildParentIndex` functions overlap

- **Files**: `gantt-utils.ts` and `gantt-tree-utils.ts`
- **Severity**: P2
- **Evidence**: Both export `buildParentIndex` with different input types (Array vs Map). Near-identical implementation.
- **Recommendation**: Unify into single canonical implementation.

### [D02-06] undo-stack.ts vs kanban-undo-stack.ts — contradictory comments

- **Files**: `gantt/undo-stack.ts:156-159`, `kanban/utils/kanban-undo-stack.ts:1-7`
- **Severity**: P3
- **Evidence**: Gantt comment says kanban uses snapshot-based undo, but kanban uses command-based. Both command-based.
- **Recommendation**: Fix the incorrect comment in `gantt/undo-stack.ts`.
