# 47 Performance Table Row Action Page Scope Writeback Fix

## Problem

- on `#/performance-table` in `Full Stress` mode, clicking the row `Ping` action did not update Scenario C's `Last action` text
- the visible symptom was stable and misleading: the button worked, but `Last action` stayed `none`
- the smallest repro was opening `#/performance-table`, switching to `Full Stress`, and clicking the first `Ping` button

## Diagnostic Method

- diagnosis was non-obvious because there was no console error, no debugger failure, and the action itself still fired
- first checked the `setValue` action wiring in `apps/playground/src/pages/performance-table/schema.ts`; the path looked correct: `perfState.lastAction`
- then read `packages/flux-runtime/src/action-adapter.ts` and `packages/flux-runtime/src/scope.ts` to confirm what `setValue` actually writes to when no `formId` is provided
- the decisive evidence was that `ctx.scope.update(path, value)` writes only to the current scope's own store, while table rows are created as isolated row scopes in `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`
- that meant the row action was writing `perfState.lastAction` into the isolated row scope, while Scenario C read `perfState.lastAction` from the page scope

## Root Cause

- `setValue` without explicit form targeting writes through the current action scope
- `performance-table` row actions execute inside isolated row scopes by design
- the schema assumed a row-scoped action could write a page-owned state path just by using the same dotted path string
- the read and write paths looked identical in authoring, but they resolved against different scope owners

## Fix

- added a page-local `perf-ping-button` renderer in `apps/playground/src/pages/performance-table-page.tsx`
- the renderer still reads `$slot.record` from the current row scope, but dispatches `setValue('perfState.lastAction', ...)` against `page.scope`
- updated `apps/playground/src/pages/performance-table/schema.ts` so the row action uses this local renderer instead of a plain schema button
- this keeps the current runtime row-isolation contract unchanged and fixes only the demo's intended page-scope writeback path

## Tests

- `tests/e2e/exploratory/performance-table-deep-state.spec.ts` - verifies sorting plus row `Ping` action updates `Last action` and keeps page/debugger error channels clean
- `apps/playground/src/pages/performance-table-page.test.tsx` - verifies the row `Ping` action writes back to page scope from the rendered page component

## Affected Files

- `apps/playground/src/pages/performance-table/schema.ts`
- `apps/playground/src/pages/performance-table-page.tsx`
- `tests/e2e/exploratory/performance-table-deep-state.spec.ts`
- `apps/playground/src/pages/performance-table-page.test.tsx`

## Notes For Future Refactors

- row-scoped actions must not assume that writing `a.b.c` automatically targets the page or parent owner; by default it targets the current action scope
- when an isolated repeated scope needs to update parent-owned state, make that boundary explicit instead of depending on path-name coincidence
- if the runtime later gains an explicit parent/root write protocol, revisit this page-local renderer and replace the ad hoc bridge with the supported contract
