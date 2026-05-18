# 60 Table Operation Slot Scope Isolation Fix

## Problem

- On `apps/playground` route `#/flux-basic`, the final table's `Inspect` button opened `User Details` reliably only for the last row.
- Earlier rows either did not open a dialog or opened with missing/stale row data.
- The browser console and page error channels could stay clean, so the failure looked like a dialog or action dispatch issue until debugger state was inspected.

## Diagnostic Method

- Added focused happy-dom coverage with `console.error` / `console.warn` spies; the `openDialog` action started and no console warning explained the missing dialog.
- Reproduced in Playwright and checked debugger state from the page. The browser had no console/page errors, but the debugger captured an action evaluation failure while opening the dialog.
- Used `__NOP_DEBUGGER_API__.inspectByCid(cid)` on each row button. Multiple row buttons shared the same fragment scope id for the column-level `buttons` region, and earlier rows lacked the expected `$slot.record` payload.
- Cross-checked the compiler table metadata and confirmed `buttons` / `cell` are isolated parameterized regions with `params: ['record', 'index']`; the row renderer passed bindings and row `instancePath`, but not the row scope.

## Root Cause

- `packages/flux-renderers-data` rendered compiled table operation and cell regions without `scope: rowScope`.
- Because the region handle did not receive the current row scope, repeated rows reused a column-level fragment scope keyed by path suffix such as `buttons.<columnIndex>` instead of creating row-owned fragment scopes.
- The last row could overwrite the shared `$slot.record` frame, leaving earlier row buttons with missing or stale slot data.

## Fix

- `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx` now passes `scope: rowScope` when rendering compiled `buttons`, `cell`, responsive hidden-cell, and expanded-row regions.
- `apps/playground/src/pages/fluxBasicPageSchema.json` now snapshots the selected row into `openDialog.args.data` through `$slot.record.*`; the dialog body reads `${username}` / `${email}` from dialog scope.
- Adjacent hardening keeps repeated-instance dialog surface scope ids distinct and defaults renderer event dispatch scope to the current node instance scope when no explicit event scope is supplied, but the table row region scope fix is the decisive root-cause fix.

## Tests

- `packages/flux-renderers-data/src/__tests__/data-table.test.tsx` verifies operation button `$slot.record` data stays isolated for each row.
- `apps/playground/src/pages/flux-basic-page.debugger.test.tsx` verifies each `Inspect` row opens a matching dialog without console warnings/errors.
- `tests/e2e/flux-basic-row-inspect.spec.ts` verifies the browser route opens all three row dialogs and leaves debugger error/action-failure state empty.
- `packages/flux-runtime/src/__tests__/runtime-dialogs-scope.dialog-state.test.ts` verifies repeated instances sharing one template node still receive distinct dialog scope ids.

## Affected Files

- `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`
- `packages/flux-renderers-data/src/__tests__/data-table.test.tsx`
- `apps/playground/src/pages/fluxBasicPageSchema.json`
- `apps/playground/src/pages/flux-basic-page.debugger.test.tsx`
- `tests/e2e/flux-basic-row-inspect.spec.ts`
- `packages/flux-runtime/src/runtime-factory.ts`
- `packages/flux-runtime/src/__tests__/runtime-dialogs-scope.dialog-state.test.ts`
- `packages/flux-react/src/node-renderer-resolved.tsx`

## Notes For Future Refactors

- For table/list/tree-style parameterized regions, `bindings` alone are not enough; renderers must also pass the repeated row/item scope so fragment scope identity is rooted in the correct owner.
- Table row schema should read row-local data through `$slot.record.*`; dialog/drawer bodies should receive row data through surface `args.data` when they need a stable cross-surface snapshot.
- When a row action fails without browser console errors, inspect debugger action errors and `inspectByCid(cid)` scope chains before changing waits, selectors, or dialog rendering.
