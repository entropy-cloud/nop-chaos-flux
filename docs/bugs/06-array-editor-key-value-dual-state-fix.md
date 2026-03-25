# 06 ArrayEditor/KeyValue Dual State Desync Fix

## Problem

- `array-editor` and `key-value` renderers showed stale values after `form.reset()` or external `form.setValue()` calls
- user edits an array item, then triggers a reset action â€” the input still shows the edited value instead of the reset value
- stable reproduction: edit â†’ reset â†’ UI unchanged

## Root Cause

- both renderers use `useState` initialized once on mount from scope data (`packages/flux-renderers-form/src/renderers/array-editor.tsx:126`, `key-value.tsx:182`)
- no subscription or effect synced external store changes back to local React state
- `syncItems`/`syncField` only wrote local â†’ store direction; the reverse path did not exist
- `form.reset()` updated the Zustand store but the local `useState` was never re-read

## Fix

- added `useCurrentFormState` subscription with a deep equality comparator in both renderers
- `array-editor`: `useCurrentFormState` with `arrayItemsEqual` (compares `id` + `value` per item)
- `key-value`: `useCurrentFormState` with `keyValuePairsEqual` (compares `id` + `key` + `value` per pair)
- a `useEffect` syncs the external value into local `items`/`pairs` state when it differs from the ref
- deep equality prevents false-positive loops caused by `setIn` creating new references at every path level
- corrected the remaining plain-scope gap by subscribing to scope data when `currentForm` is absent, so external host data updates also resync the local renderer state

## Tests

- `packages/flux-renderers-form/src/__tests__/bug-dual-state.test.tsx` - 6 tests covering form `reset()` / `setValue()` plus plain-scope host data updates for both renderers

## Affected Files

- `packages/flux-renderers-form/src/renderers/array-editor.tsx`
- `packages/flux-renderers-form/src/renderers/key-value.tsx`

## Notes For Future Refactors

- complex field renderers must not maintain local state that mirrors store state without a sync mechanism
- when adding store or scope subscriptions, use deep equality only across the fields the renderer actually consumes; if row objects grow new UI-relevant fields, update the comparator too
- if a new renderer follows the same `useState` + `syncItems` pattern, it will have the same bug

