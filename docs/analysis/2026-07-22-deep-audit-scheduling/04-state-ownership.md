# Dimension 04: State Ownership & Single Source of Truth

## Resolution Summary

**15 previous D04 findings**: 8 resolved, 1 partially resolved, 4 persisting, 2 new findings.

## Findings

### [D04-01] Kanban boardData re-sync with props.data — RESOLVED

- Previous severity: P1. **CLOSED.**
- `dataFingerprintRef` + `prevDataRef` guard watches `resolved.data` and calls `setLocalBoardData` on reference change. Correct.

### [D04-02] Kanban ownership/statePath fields — PARTIALLY RESOLVED

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:69-76`
- **Severity**: P2
- **Evidence**: `kanbanOwnership`/`kanbanStatePath` and `collapsedOwnership`/`collapsedStatePath` implemented. `columnsOrderOwnership`/`columnsOrderStatePath` read but void-cast as dead code.
- **Current State**: 2 of 7 ownership fields are dead.
- **Recommendation**: Implement or remove.

### [D04-03] Gantt mutation-before-event — PARTIALLY RESOLVED

- **File**: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.ts:116-124`
- **Severity**: P2
- **Evidence**: Order corrected — events fire BEFORE store mutations. However, store mutation is still unconditional — `revertTask` exists but is never called.
- **Risk**: Event handler cannot prevent mutation.
- **Recommendation**: Add `if` guard pattern: fire event first, only commit on success.

### [D04-04] Kanban undo full snapshot duplication — RESOLVED

- Command-based undo stores `UndoCommand` objects. No `structuredClone`. **CLOSED.**

### [D04-05] Gantt selectedTaskId/editingTaskId — RESOLVED

- Now inside the Zustand store. **CLOSED.**

### [D04-06] Gantt useState semantic misuse — PERSISTS

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:61`
- **Severity**: P3
- **Evidence**: `const [store] = useState(() => createInitialStore(resolved))` — setter never called.
- **Recommendation**: Replace with `useRef` or `useMemo` with empty deps.

### [D04-07] Gantt scrollLeft outside Zustand store — PERSISTS

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:48,89-91`
- **Severity**: P3
- **Evidence**: `scrollLeft` is plain class property. Deliberate optimization but undocumented.
- **Recommendation**: Add doc comment explaining design decision.

### [D04-08] Gantt JSON.stringify fingerprint — RESOLVED

- Now uses reference equality. **CLOSED.**

### [D04-09] Kanban DnD listener re-registration — RESOLVED

- Pushed to subcomponents. **CLOSED.**

### [D04-10] BarcodeQueue double-source — RESOLVED

- Migrated to Zustand vanilla store. **CLOSED.**

### [D04-11] Calendar latestViewRef/latestDateRef sync chain — PERSISTS

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:136-170`
- **Severity**: P3
- **Evidence**: Two effects sync `activeView`/`currentDate` into refs, creating one-tick stale window.
- **Recommendation**: Inline ref writes into setState callbacks.

### [D04-12] GanttStore class pattern — PERSISTS

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:45-325`
- **Severity**: P3
- **Evidence**: Class wraps StoreApi internally. `getSnapshot` returns new reference on every call.
- **Recommendation**: Add stable selectors or refactor to functional factory.

### [D04-13] Stale callback closures — RESOLVED

- Ref pattern used throughout. **CLOSED.**

### [D04-14] BarcodeInput camera focus race condition — RESOLVED

- Uses mountedRef + AbortController. **CLOSED.**

### [D04-15] Gantt undo stack never populated — NEW

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:156-168`
- **Severity**: P2
- **Evidence**: `undoStackRef` created, `handleUndo` wired to keyboard Ctrl+Z. But zero calls to `undoStackRef.current.push(cmd)` anywhere. Ctrl+Z is a silent no-op.
- **Recommendation**: Push commands after every mutation in drag handlers.

### [D04-16] Kanban prevBoardRef dead code — NEW

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:172-173`
- **Severity**: P3
- **Evidence**: `prevBoardRef.current` written but never read.
- **Recommendation**: Remove.

### [D04-17] Kanban selectedTagIds not re-synced with filterTags — NEW

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:151-152`
- **Severity**: P3
- **Evidence**: `selectedTagIds` initialized from `resolved.filterTags` at mount, no re-sync effect.
- **Recommendation**: Add sync effect with merge.

### [D04-18] FilterBar localText not re-synced — NEW

- **File**: `packages/flux-renderers-scheduling/src/gantt/components/filter-bar.tsx:27-46`
- **Severity**: P3
- **Evidence**: `localText` useState initialized from `filterText` prop, no re-sync effect.
- **Recommendation**: Add sync effect.

### [D04-19] Gantt undo-stack.ts doc comment incorrect about Kanban — NEW

- **File**: `packages/flux-renderers-scheduling/src/gantt/undo-stack.ts:6-8`
- **Severity**: P3
- **Evidence**: Comment says "Kanban uses a snapshot-based pattern" but Kanban has been refactored to command-based.
- **Recommendation**: Update comment.

### [D04-20] Kanban helpers structuredClone on every mutation — NEW

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-helpers.ts:3-4`
- **Severity**: P3
- **Evidence**: `cloneBoard` uses `structuredClone` on every mutation operation.
- **Recommendation**: Add doc comment explaining design trade-off.

## Summary

| ID     | Finding                            | Severity    | Status                |
| ------ | ---------------------------------- | ----------- | --------------------- |
| D04-01 | Kanban boardData re-sync           | P1→resolved | CLOSED                |
| D04-02 | Kanban ownership fields partial    | P2          | OPEN (2/7 dead)       |
| D04-03 | Gantt mutation-before-event        | P2          | OPEN (no cancel path) |
| D04-04 | Kanban undo snapshot duplication   | resolved    | CLOSED                |
| D04-05 | Gantt selectedTaskId location      | resolved    | CLOSED                |
| D04-06 | Gantt useState semantic misuse     | P3          | OPEN                  |
| D04-07 | Gantt scrollLeft undocumented      | P3          | OPEN                  |
| D04-08 | Gantt JSON.stringify fingerprint   | resolved    | CLOSED                |
| D04-09 | Kanban DnD re-registration         | resolved    | CLOSED                |
| D04-10 | BarcodeQueue double-source         | resolved    | CLOSED                |
| D04-11 | Calendar ref sync chain            | P3          | OPEN                  |
| D04-12 | GanttStore class pattern           | P3          | OPEN                  |
| D04-13 | Stale callback closures            | resolved    | CLOSED                |
| D04-14 | BarcodeInput camera race           | resolved    | CLOSED                |
| D04-15 | Gantt undo stack never populated   | P2          | NEW                   |
| D04-16 | Kanban prevBoardRef dead code      | P3          | NEW                   |
| D04-17 | Kanban selectedTagIds unsynced     | P3          | NEW                   |
| D04-18 | FilterBar localText unsynced       | P3          | NEW                   |
| D04-19 | Gantt undo-stack doc comment stale | P3          | NEW                   |
| D04-20 | Kanban helpers structuredClone     | P3          | NEW                   |
