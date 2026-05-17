# 57 Performance Table Row Scope Cache Snapshot Fix

## Problem

- The performance table page loaded headers and pagination, but body rows could be empty in the browser.
- The page had processed data, no tracked browser errors, and no obvious runtime exception.
- The symptom looked like table data loss, but the underlying issue was React not observing row-scope cache mutation.

## Diagnostic Method

- Verified page readiness and inspected debugger/page error channels before changing selectors.
- Inspected the rendered table state and found `processedDataLength` was populated while the row-scope cache seen by the row renderer stayed empty.
- Reproduced with focused performance-table E2E and isolated the row materialization hook.
- The decisive evidence was that publishing immutable external-store snapshots caused row rendering to update without changing the table data source.

## Root Cause

- `useTableRowScopeCache` relied on a mutable cache object that could change without producing a React-observable snapshot change.
- Under the React Compiler-enabled playground build, row materialization could reuse stale reads and skip the render that should expose newly created row scopes.
- The issue was not a CSS/selector problem; the table body was genuinely not materialized from the current row-scope cache state.

## Fix

- `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts` now publishes cache changes through `useSyncExternalStore` with version-sensitive immutable snapshots.
- The hook still preserves row scope identity where required, but React now gets a new snapshot when the cache content changes.
- Tests now assert stable row scopes rather than stable mutable `Map` references.

## Tests

- `packages/flux-renderers-data/src/__tests__/use-table-row-scope-cache.test.tsx` verifies row-scope reuse and snapshot behavior.
- `tests/e2e/performance-table.spec.ts` verifies the browser performance table renders rows and interactions.
- `tests/e2e/exploratory/performance-table-deep-state.spec.ts` verifies deep-state table scenarios.

## Affected Files

- `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`
- `packages/flux-renderers-data/src/__tests__/use-table-row-scope-cache.test.tsx`
- `tests/e2e/performance-table.spec.ts`
- `tests/e2e/exploratory/performance-table-deep-state.spec.ts`

## Notes For Future Refactors

- React-facing stores must expose immutable snapshots when their semantic content changes.
- Preserving child row-scope object identity is compatible with immutable collection snapshots; do not conflate the two invariants.
- Empty DOM rows with populated source data should be diagnosed through runtime/cache state before changing selectors or waits.
