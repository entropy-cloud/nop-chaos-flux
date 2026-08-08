# 111 Report Designer Undo Does Not Revert The Spreadsheet Canvas Fix

## Problem

- In the `report-designer-page` host renderer, clicking the toolbar **Undo** (or **Redo**, or running **importTemplate**) after a spreadsheet edit left the spreadsheet canvas showing the _new_ cell value — the visible grid never reverted, while the report document (metadata/semantic) did revert.
- The designer document and the spreadsheet canvas diverged: the canvas kept the edited value; the next spreadsheet edit then silently merged onto the pre-undo document state.
- Minimal reproducible: in the page renderer host, set cell A1 to `v1` via a spreadsheet command, then dispatch `report-designer:undo` — A1 still shows `v1`.

## Diagnostic Method

- Traced the bidirectional sync effects in `page-renderer.tsx:429-462` (report→spreadsheet and spreadsheet→report).
- Found the report→spreadsheet effect guarded by `nextReportSpreadsheet === lastSyncedSpreadsheetRef.current || snapshot.spreadsheetSyncSource === lastSyncedSpreadsheetRef.current`.
- `spreadsheetSyncSource` is only written by `syncSpreadsheetDocument` (spreadsheet→report direction) and is never cleared; after any spreadsheet-originated sync it stays equal to `lastSynced`, so **every** report-side document replacement (undo/redo/importTemplate) hits the stale guard and returns early — `replaceDocument` never fires.
- Wrote a reproduction as a page-renderer shell test (toolbar `spreadsheet:setCellValue` → `report-designer:undo` → cell assertion) — red (cell stayed `v1`).
- Rejected hypothesis: "the sync loop guard is the only issue" — simply clearing `spreadsheetSyncSource` alone caused an infinite sync loop because `replaceDocument` clones internally, producing a reference `lastSyncedSpreadsheetRef` cannot match.

## Root Cause

- Two compounding problems in the bidirectional sync design:
  1. `spreadsheetSyncSource` is a one-directional marker: it is set when the report document absorbs a spreadsheet-originated change, but never cleared when the report document is replaced from the report side (undo/redo/importTemplate). The stale marker then suppresses propagation of the report-side replacement to the spreadsheet core.
  2. `spreadsheetCore.replaceDocument` clones its input, so the reference stored in `lastSyncedSpreadsheetRef` (the report-side document) can never equal the spreadsheet core's actual document — any naive guard change would re-trigger the feedback loop.

## Fix

- `packages/report-designer-core/src/core-dispatch.ts`: `report-designer:undo`, `report-designer:redo`, and `report-designer:importTemplate` now clear `spreadsheetSyncSource` when replacing the document from the report side.
- `packages/report-designer-renderers/src/page-renderer.tsx`: after `spreadsheetCore.replaceDocument(...)`, the effect now stores the actually-applied clone (`spreadsheetCore.getSnapshot().document`) into `lastSyncedSpreadsheetRef` — the spreadsheet→report effect then sees reference equality and skips the redundant sync, breaking the loop while still propagating undo/redo/importTemplate to the canvas.

## Tests

- `packages/report-designer-renderers/src/page-renderer-shell.test.tsx` — new test "propagates report-designer undo/redo back to the spreadsheet canvas": toolbar set A1 → Undo (cell empty) → Redo (cell `v1`). Red before the fix, green after.
- `packages/report-designer-core/src/__tests__/designer-core-codec-and-selection.test.ts` — new test "clears spreadsheetSyncSource when the document is replaced from the report side": asserts the marker is cleared by undo and importTemplate, locking the guard semantics at core level.

## Affected Files

- `packages/report-designer-core/src/core-dispatch.ts`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/report-designer-renderers/src/page-renderer-shell.test.tsx`
- `packages/report-designer-core/src/__tests__/designer-core-codec-and-selection.test.ts`

## Notes For Future Refactors

- The sync guard triplet (`lastApplied`, `lastSynced`, `spreadsheetSyncSource` + `syncing` flag) is load-bearing: any change to the bidirectional sync must keep the "applied clone" reference semantics, or the stale-marker bug or an infinite loop returns.
- If `replaceDocument` ever gains a return value or an options object, prefer returning the applied document to make the reference handshake explicit instead of re-reading `getSnapshot()`.
- The e2e confirmation point lives in `tests/e2e/report-designer-host.spec.ts` (host page Undo/Redo round-trip).
