# 103 Gantt Keyboard Date Edit Dispatched To Wrong Event Channel Fix

## Problem

In gantt, keyboard date edits — ArrowLeft/ArrowRight move, resize
(`move-up`/`move-down`/`resize-left`/`resize-right` via keyboard) — dispatched
`onTaskDragEnd` instead of `onTaskEdit`. A host persisting edits through
`onTaskEdit` silently missed every keyboard-driven date change: the task
moved on screen but the host's data never updated.

## Diagnostic Method

- Hard part: the events fire, so nothing looks broken; the issue is a
  _semantic channel_ mismatch — contract drift between code and
  design.md §8.1, which splits `onTaskDragEnd` (drag) from `onTaskEdit`
  (edit-type changes: editor / inline / keyboard).
- Mapped every mutation path in `gantt.tsx` to the event it dispatches.
- Considered and rejected the "keyboard = drag equivalent" reading: the
  design doc's split exists precisely because hosts use different handlers to
  persist drag moves vs edits; keyboard date change is edit-type.
- Decisive evidence: keyboard branches (`gantt.tsx:218,231,242,253` at
  finding time, later `:222,235,246,257`) routed to `onTaskDragEnd` while
  editor-onCommit / grid-onCellCommit / keyboard-Delete all used the edit
  channel — the keyboard move/resize paths were the outliers.

## Root Cause

- Gantt keyboard move/resize branches dispatched edit-type changes through
  the drag-end event channel — a contract drift vs design.md §8.1's event
  semantic split.

## Fix

- Adjudicated as contract violation; the four keyboard branches now dispatch
  `onTaskEdit` through the unified `dispatchTaskEdit` (`gantt.tsx:174`) with
  the full event ctx (`{ event, evaluationBindings, scope }`), aligned with
  the editor/grid/keyboard-Delete paths; `onTaskDragEnd` remains on the real
  drag path only. design.md §8.1 synced.

## Tests

- `packages/flux-renderers-scheduling/src/gantt/gantt-keyboard-edit.test.tsx`
  (test-first, red before the fix): keyboard move/resize dispatch
  `onTaskEdit` (not `onTaskDragEnd`) with the full ctx.

## Affected Files

- `packages/flux-renderers-scheduling/src/gantt/gantt.tsx`
- `docs/components/gantt/design.md` (§8.1)

## Notes For Future Refactors

- Event-channel contract splits (drag vs edit) are load-bearing for hosts;
  any new interaction path must be classified against design.md's semantic
  split, not "which handler is easiest to call".
- When adding keyboard equivalents of pointer interactions, verify the
  keyboard path dispatches the same event family as the semantic equivalent,
  not the pointer path.
