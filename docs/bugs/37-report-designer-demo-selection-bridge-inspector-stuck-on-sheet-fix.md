# 37 report-designer-demo Selection Bridge Inspector Stuck On Sheet Fix

## Problem

- On the playground report designer demo page, clicking spreadsheet cells did not update the inspector to the selected cell.
- The inspector stayed on the sheet-level summary even after a visible cell selection change in the grid.
- The page also made some e2e failures look like stale selectors or empty-state drift, because the inspector was not blank; it was showing a stable but wrong target.

## Diagnostic Method

- Diagnosis was hard because the spreadsheet interaction itself worked: the grid rendered, cells were clickable, and selection UI changed. The failure only appeared in the report-designer inspector layer.
- First checked the failing e2e DOM snapshots. They showed the inspector already rendering `Selection` content for a `sheet:*` target, which ruled out a simple missing-element regression.
- Probed the live page before and after clicking a cell. The decisive evidence was that the inspector HTML remained identical after the click, still showing sheet-level values instead of `Cell:`, `Row:`, `Column:`, and `Value:` lines.
- Compared the hand-written demo page with `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`. That component already contained the missing synchronization effect from spreadsheet selection state into `core.setSelectionTarget(...)`.

## Root Cause

- `apps/playground/src/pages/report-designer-demo.tsx` embedded `SpreadsheetGrid` directly through `useSpreadsheetInteractions(...)`.
- Unlike the shared `report-spreadsheet-canvas.tsx`, the demo page did not mirror `selectedCell` and `snapshot.selection` back into `designerCore.setSelectionTarget(...)`.
- As a result, the spreadsheet layer and the report-designer layer diverged: the grid selected a cell, but the inspector still believed the active target was the sheet.

## Fix

- Added a local effect in `report-designer-demo.tsx` that mirrors spreadsheet selection state into `designerCore.setSelectionTarget(...)`.
- The effect now handles `sheet`, `row`, `column`, `range`, and `cell` targets, matching the existing bridge logic used by the shared report designer spreadsheet canvas.
- Updated the related e2e assertions to the current inspector structure instead of the old `.inspector-empty` / `.inspector-content` markers.

## Tests

- `tests/e2e/report-designer-demo.spec.ts` - verifies the demo surfaces render with current DOM markers.
- `tests/e2e/report-designer-demo.spec.ts` - verifies clicking a spreadsheet cell updates the inspector with `Cell`, `Row`, `Column`, and `Value` details.

## Affected Files

- `apps/playground/src/pages/report-designer-demo.tsx`
- `tests/e2e/report-designer-demo.spec.ts`
- `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`

## Notes For Future Refactors

- Any page that bypasses `report-spreadsheet-canvas.tsx` and wires `SpreadsheetGrid` manually must also mirror spreadsheet selection into the report-designer core.
- When inspector e2e failures show valid sheet-level content instead of an empty panel, treat that as a bridge-state mismatch possibility, not only as a selector drift.
- Keep the spreadsheet selection model and report-designer selectionTarget model aligned; otherwise the inspector will look healthy while reporting the wrong target.
