# 101 Drag Hooks Missing pointercancel Termination Fix

## Problem

Four drag hooks in the scheduling family
(`use-gantt-drag` / `use-gantt-link-draw` / `use-calendar-drag` /
`use-calendar-drag-create`) only listened for `pointermove`/`pointerup`. When
the browser fired `pointercancel` (touch-scroll interrupt, OS gesture, lost
pointer), the drag session leaked: ghost/indicator visuals stayed on screen
(the gantt `gantt-drop-indicator` kept 0.3 opacity), window-level listeners
stayed attached, and a later stray `pointerup` mis-committed a drop the user
never intended.

## Diagnostic Method

- Hard part: `pointercancel` is rare in mouse-driven testing, so all
  existing drag tests (mouse paths) passed; the defect only appears on touch
  devices or under OS interference.
- Grepped the hooks for the full pointer termination set
  (`rg "pointercancel"` in the scheduling drag hooks) — zero hits in the
  three gantt/calendar hooks.
- Compared against the already-fixed `use-calendar-drag-create` (plan
  `2026-08-07-1747-1` Phase 3), which established the "pointercancel = full
  termination" family pattern.
- Decisive evidence: `pointerup` handler did cleanup+commit but nothing
  cleaned up on `pointercancel`; the ghost element and window listeners were
  provably still live after a cancelled session.

## Root Cause

- The drag hooks implemented pointer lifecycle as a binary
  move/up state machine, missing the third terminal event `pointercancel`.
- Same missing-path pattern in four hooks across gantt and calendar — a
  cross-component duplication (three fixed in `2026-08-07-2228-2`; the
  fourth, `use-calendar-drag-create`, fixed earlier in `2026-08-07-1747-1`).

## Fix

- `pointercancel` is now treated as a full termination equal to `pointerup`:
  clear ghost/`gantt-drop-indicator`, remove window listeners, reset the
  session state, and do **not** commit a drop
  (`use-gantt-drag.ts:148,164,184` / `use-gantt-link-draw.ts:103,112,118` /
  `use-calendar-drag.ts:155-170`), aligned with the `use-calendar-drag-create`
  pattern.

## Tests

- `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.test.ts`
  — pointercancel clears ghost + removes listeners + no drop dispatch.
- `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-link-draw.test.ts`
  — pointercancel terminates link drawing cleanly.
- `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-drag.test.ts`
  — pointercancel resets session without committing.
- All test-first, red before the fix.

## Affected Files

- `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.ts`
- `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-link-draw.ts`
- `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-drag.ts`
- (`use-calendar-drag-create.ts` — fixed in `2026-08-07-1747-1`)

## Notes For Future Refactors

- Every pointer-based interaction must handle all three terminal events —
  `pointerup`, `pointercancel`, and unmount — with identical cleanup.
- When adding a new drag hook, copy the pointercancel termination branch from
  the family pattern; do not assume `pointerup` is the only end of a drag.
