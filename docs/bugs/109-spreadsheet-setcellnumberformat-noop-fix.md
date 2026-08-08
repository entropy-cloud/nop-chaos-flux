# 109 Spreadsheet SetCellNumberFormat Command No-Op Fix

## Problem

- `spreadsheet:setCellNumberFormat` accepted a `format` argument but applied an empty style patch — the number format was silently discarded.
- The method is part of the public host contract (`SPREADSHEET_HOST_METHOD_CONTRACTS_FORMATTING.setCellNumberFormat` declares `format: string`), so any host invoking it got `ok: true` with zero effect.
- Minimal reproducible: dispatch `setCellNumberFormat` with `format: '#,##0.00'` and read the cell back — `style.numberFormat` is absent.

## Diagnostic Method

- Easy once surfaced by the declaration-is-contract double-check (lesson 08 pattern): the host contract declares the method and argument, so the handler must implement it.
- Inspected `cell-handlers.ts`: every style command handler routes through `applyStyleHandler` with an explicit patch; `handleSetCellNumberFormat` passed `{}` — the only style handler with an empty patch.
- Rejected hypothesis: "number format is handled elsewhere" — `applyCellStyleChange` writes whatever patch it receives and `CellStyle.numberFormat` exists in the types.

## Root Cause

- Copy/paste stub: the handler was registered with the correct command type but never wired the `format` field into the document. The number format belongs on the `CellDocument.numberFormat` field (types.ts), not the style object, so routing it through the style-patch helper would have been wrong anyway.

## Fix

- New `applySetCellNumberFormat` operation (`core/cell-operations.ts`) writes `numberFormat` onto the target cell — or every cell of a range — at the `CellDocument` level.
- `handleSetCellNumberFormat` now dispatches through that operation via `applySimpleDocumentMutation` (undo-stack aware), replacing the empty style patch.

## Tests

- `packages/spreadsheet-core/src/__tests__/number-format.test.ts` - asserts the format lands on a single cell and on every cell of a range.

## Affected Files

- `packages/spreadsheet-core/src/command-handlers/cell-handlers.ts`
- `packages/spreadsheet-core/src/__tests__/number-format.test.ts`

## Notes For Future Refactors

- Number format is a `CellDocument` field, not a `CellStyle` field — keep the operation on the cell-document level like `applySetCellValue`.
- The renderer has no number-format UI today; if one is added, the command contract (`format: string`) is the wiring point.
