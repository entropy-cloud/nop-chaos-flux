# 107 Spreadsheet Frozen Panes Render Unpinned Fix

## Problem

- Spreadsheet freeze feature (toolbar 冻结按钮 / context menu / `freezePanes` command) wrote the `sheet.frozen` document state and computed frozen row/column indexes in the virtual viewport, but in a real browser the frozen **data rows and columns scrolled away with the table content** — only the column/row header cells stayed pinned.
- Symptom: freeze A1 → scroll down/right → frozen row 1 / column A disappear off-screen.
- Minimal reproducible: set `frozen: { row: 1, col: 1 }` in any document, render the grid, scroll the container.

## Diagnostic Method

- Hard because the command chain and viewport math were all correct — the freeze state was written and rendered; only the _pinning_ was missing, so unit tests on the command layer all passed.
- Inspected `viewport.ts` (frozen rows/cols are placed first in `visibleRowIndices`/`visibleColIndices` and `topSpacerHeight`/`leftSpacerWidth` compensate the scroll metrics — math consistent).
- Inspected `canvas-styles.css` for sticky rules: only `[data-slot='spreadsheet-column-header'|'row-header'|'corner-header']` are `position: sticky`; `.frozen-row` had zero CSS rules and `.ss-cell[data-cell-frozen]` only tinted the background; `ss-frozen-separator-col/row` were dead CSS with no render site.
- Rejected hypothesis: "headers stick so frozen rows stick too" — the single scroll container + single table structure scrolls all tbody rows together.
- Decisive evidence: grep for `sticky`/`frozen-row` in `canvas-styles.css` found no rule pinning tbody rows or frozen data cells.

## Root Cause

- The freeze render contract was incomplete: viewport index math + data attributes were implemented, but the DOM/CSS pinning layer was never added. With one scroll container, only CSS `position: sticky` can keep tbody rows/cells visible during scroll.

## Fix

- `table-shell.tsx` now applies `position: sticky; top: GRID_HEADER_HEIGHT + rowOffsets[row]` on frozen `<tr>` elements (each frozen row sticks at its natural unscrolled position, below the sticky column header) and `position: sticky; left: ROW_HEADER_WIDTH + colOffsets[col]` on frozen column data cells (sticky `th` header cells already existed via CSS).
- `GRID_HEADER_HEIGHT` (22px) added to `spreadsheet-grid/constants.ts`, matching the CSS column-header height so frozen rows pin below the header.
- The `frozen-row` class and `data-cell-frozen` markers are retained.

## Tests

- `packages/spreadsheet-renderers/src/__tests__/freeze-pinning.test.tsx` - renders a frozen document and asserts frozen cells get `position: sticky` inline offsets while scrollable cells do not; asserts no `data-cell-frozen` without a frozen pane.
- Phase 5 e2e (`spreadsheet-demo.spec.ts`) asserts frozen cells stay within the container rect while scrolling (real-browser confirmation).

## Affected Files

- `packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx`
- `packages/spreadsheet-renderers/src/spreadsheet-grid/constants.ts`
- `packages/spreadsheet-renderers/src/__tests__/freeze-pinning.test.tsx`

## Notes For Future Refactors

- The sticky top/left offsets depend on `GRID_HEADER_HEIGHT` matching the CSS header height — changing header sizing requires updating both.
- Frozen row/col pinning relies on `position: sticky` on `tr` and `td`; any future DOM restructure (dual-layer frozen panels) must preserve the scroll-metric compensation in `viewport.ts` (`topSpacerHeight`/`leftSpacerWidth`).
- `ss-frozen-separator-col/row` separator CSS remains unused (P3 record) — a future cosmetic pass may render it.
