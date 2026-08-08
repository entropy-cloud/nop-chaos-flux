# 105 Gantt Data Mutation Paths Emitting No Schema Event Fix

## Problem

Three gantt data-mutation paths — editor save, inline grid cell commit, and
keyboard Delete/Backspace — wrote directly to the store and dispatched **no
schema event**. A host synchronizing task data via `onTaskEdit` never saw
these changes: the gantt UI updated, but the host's data layer silently
diverged. `gantt.types.ts` declared no edit-type event at all.

## Diagnostic Method

- Hard part: this is a "declaration is contract" (ghost contract) defect —
  absence of an event is invisible in code review; it only surfaces when a
  host actually depends on change notification.
- Listed every data-write path in the gantt family and checked each against
  the schema event surface (`gantt.types.ts:179-191`): editor save
  (`gantt-editor.tsx:33-53` commitTask+closeEditor), inline submit
  (`gantt-grid.tsx:67-70` store.updateTask), keyboard delete
  (`use-gantt-keyboard.ts:100-114` onDeleteTask/deleteTask).
- Compared with the sibling family: drag/keyboard move already dispatched
  `onTaskDragEnd` — a notification precedent existed for mutations, the edit
  paths just had none.
- Decisive evidence: zero of the three paths referenced any `props.events`
  dispatch; the types file listed no `onTaskEdit`/`onTaskChange`.

## Root Cause

- All three data-change paths bypassed the schema event layer; the event
  contract lacked `onTaskEdit` entirely, so hosts had no edit-type
  notification channel (only drag had `onTaskDragEnd`).

## Fix

- Added the `onTaskEdit` schema event (`{ _taskId, changes?, deleted? }`) —
  registered in `scheduling-renderer-definitions.ts` — and unified dispatch
  through `dispatchTaskEdit` (`gantt.tsx:174`) on three paths: `gantt-editor`
  `onCommit`, `gantt-grid` `onCellCommit`, and keyboard Delete (with
  `deleted: true`), all with the full ctx aligned to CX-12. design.md §5/§8.1
  synced.

## Tests

- `packages/flux-renderers-scheduling/src/gantt/gantt-keyboard-edit.test.tsx`
  — keyboard delete dispatches `onTaskEdit` with `deleted: true`.
- `packages/flux-renderers-scheduling/src/gantt/gantt-editor.test.tsx` —
  editor save dispatches `onTaskEdit` with changes.
- `packages/flux-renderers-scheduling/src/gantt/gantt.test.tsx` — grid
  inline commit dispatches `onTaskEdit`.
- All test-first, red before the fix.

## Affected Files

- `packages/flux-renderers-scheduling/src/gantt/gantt.tsx`
- `packages/flux-renderers-scheduling/src/gantt/gantt-editor.tsx`
- `packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx`
- `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-keyboard.ts`
- `packages/flux-renderers-scheduling/src/gantt/gantt.types.ts`
- `packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts`
- `docs/components/gantt/design.md` (§5/§8.1)

## Notes For Future Refactors

- Every store mutation path in a renderer must map to a schema event; the
  "no one listens" assumption is how ghost contracts are born.
- When adding a mutation path, check the design doc's event semantic split
  (drag vs edit) and register the event in the renderer definitions + types
  before wiring dispatch.
