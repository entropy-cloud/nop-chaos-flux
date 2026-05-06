# 42 CRUD Selection Always-On Causing Table Body Empty

## Problem

- CRUD table body rendered zero rows in playground at `/lab/crud`, despite valid `source` data and correct column definitions
- Table header rendered correctly, but `<tbody>` contained no `<tr>` elements
- The issue affected all CRUD instances, including those without any selection configuration

## Diagnostic Method

- Initial suspicion was dev server / HMR issue; restarting did not help
- Wrote a unit test (`crud-selection-and-features.test.tsx`) that rendered a minimal CRUD with 3 data rows and asserted `querySelectorAll('[data-slot="table-row"]').length === 3` — **test failed with 4 rows instead of 3** (1 header + 3 body, but header `TableRow` also carries `data-slot="table-row"`)
- Narrowed to the actual cell count per row: `rows[0].querySelectorAll('td').length` was 4 instead of 3 — an unexpected `table-select-cell` was present
- Traced back to `crud-renderer.tsx:281`: `if (normalizedSchema.selectionOwnership)` was the gate for adding `rowSelection`
- Traced back to `crud-schema.ts:191`: `normalizeCrudSchema` unconditionally defaults `selectionOwnership` to `'local'`
- `'local'` is truthy → the gate always passed → `rowSelection` was always set, with uninitialized `selectedRowKeys`
- The table renderer attempted to render select cells against an invalid selection state, which silently broke the entire body rendering

## Root Cause

- `normalizeCrudSchema` (`crud-schema.ts:191`) defaulted `selectionOwnership` to `'local'` regardless of whether selection was actually configured
- `crud-renderer.tsx:281` used `selectionOwnership` (always truthy due to the default) as the condition to inject `rowSelection` into the internal table schema
- When no `selection` config existed, the selection state was not properly initialized, but `rowSelection` was still passed — the table renderer failed on the invalid state

## Fix

- `crud-schema.ts:191`: `selectionOwnership` now only defaults to `'local'` when `selection` config is present; otherwise `undefined`
- `crud-renderer.tsx:281`: gate changed from `normalizedSchema.selectionOwnership` to `normalizedSchema.selection` — selection is now **opt-in** via the `selection` config object, matching AMIS behavior
- Updated `useMemo` dependency array to include `normalizedSchema.selection` instead of the old `selectionOwnership`
- Added `selection: {}` to playground CRUD schemas that use selection features (`listActions`, `selectionCount`)

## Tests

- `packages/flux-renderers-data/src/__tests__/crud-selection-and-features.test.tsx` — 4 new tests covering basic CRUD body rendering (no selection), headers, toolbar+pagination, and opt-in checkbox selection with field value verification
- `packages/flux-renderers-data/src/__tests__/crud-selection-and-features.test.tsx` — existing selection-driven list action test updated to include `selection: {}` config
- All tests use `tbody [data-slot="table-row"]` selector to avoid false matches from header rows

## Affected Files

- `packages/flux-renderers-data/src/crud-schema.ts`
- `packages/flux-renderers-data/src/crud-renderer.tsx`
- `packages/flux-renderers-data/src/__tests__/crud-selection-and-features.test.tsx`
- `apps/playground/src/component-lab/renderers/crud-lab-page.tsx`

## Notes For Future Refactors

- `selectionOwnership` is a state-ownership hint, not an enable/disable switch. Never use it as the gate for feature activation. The presence of the `selection` config object is the correct enable signal.
- The `TableRow` component from `@nop-chaos/ui` always adds `data-slot="table-row"` to every `<tr>` (header and body). Tests that count rows must scope with `tbody` to avoid counting the header row.
- When adding new CRUD features that depend on selection (e.g. `listActions`, `selectionCount` in `footerToolbar`), always include `selection: {}` in the schema. Without it, the selection state will not be initialized.
