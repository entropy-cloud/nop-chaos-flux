# 108 Spreadsheet Multi-Select Row/Column Count Used Span Instead Of Actual Count Fix

## Problem

- `getSelectedAxisInfo` reported `count = end - start + 1` (the span) instead of the number of actually selected rows/columns.
- Multi-select rows 2 and 5 (shift-click row headers) produced `count = 4`; the context menu "Insert Row Above"/"Delete Row" then passed that span as the command `count`, deleting or inserting rows 3 and 4 that were never selected.
- Minimal reproducible: shift-click row headers 2 and 5 → right-click → Delete Row → rows 2..5 (4 rows) removed instead of the 2 selected rows.

## Diagnostic Method

- Hard because single-row selection behaved identically under both semantics (`span === 1 === length`), so the bug only manifested in the multi-select path.
- Inspected `selection-handlers.ts` first: `selectRow extend` accumulates clicked rows into a set (`rows: [2, 5]`), confirming selections are non-contiguous lists, not ranges.
- Inspected the consumer matrix of `getSelectedAxisInfo`: `canResizeRow/Column` (`count === 1` guard) and context menu insert/delete counts (`use-context-menu-actions.ts`).
- Decisive evidence: MA5 P3-12 audit record flagged the span semantics; live tracing of `handleContextDeleteRow` showed `count: selectedRowInfo?.count` feeding the command.

## Root Cause

- `getSelectedAxisInfo` was written with an implicit "rows are contiguous" assumption (`end - start + 1`), while the selection model stores an explicit list of selected indexes. The count was computed from the bounding box instead of the list length.

## Fix

- `getSelectedAxisInfo` now returns `count: values.length` (the actual selected count), keeping `start`/`end` as min/max for anchoring.
- Single-selection behavior is unchanged (`count === 1` still holds); multi-select insert/delete now operates exactly on the selected rows/columns.

## Tests

- `packages/spreadsheet-renderers/src/spreadsheet-grid/axis-info.test.ts` - asserts single-row, multi-row `[2, 5] → count 2`, multi-column, and empty/null cases.
- Phase 5 e2e (`spreadsheet-demo.spec.ts`) asserts multi-row delete removes only the selected rows.

## Affected Files

- `packages/spreadsheet-renderers/src/spreadsheet-grid/constants.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-grid/axis-info.test.ts`

## Notes For Future Refactors

- Any future contiguous-range selection model must re-check this: if selections become true ranges, span semantics could be correct again — the invariant to preserve is "count equals the number of rows/columns the user actually selected".
- The `count` is consumed as command `count` for insert/delete row/column; keep it in sync with the selection list length.
