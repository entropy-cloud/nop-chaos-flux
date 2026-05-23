# Open-Ended Adversarial Review — 2026-05-21 — Round 01

**Execution date**: 2026-05-21
**Result directory**: `docs/analysis/2026-05-21-open-ended-adversarial-review-01/`
**Exploration areas**: `spreadsheet-renderers`, `spreadsheet-core`, spreadsheet host contract docs
**Discovery source**: config-contract archaeology after de-duplicating recent styling / variant-field reports

---

## Finding 1: Default `spreadsheet-page` host silently truncates the sheet to `100 x 26` and leaves most `SpreadsheetConfig` fields dead

- **Where**:
  - `packages/spreadsheet-renderers/src/default-page-body.tsx:9-18,27-34,179-214`
  - `packages/spreadsheet-core/src/types.ts:257-263`
  - `packages/spreadsheet-core/src/core.ts:32-50`
  - `packages/spreadsheet-renderers/src/types.ts:14-16`
  - `packages/spreadsheet-renderers/src/page-renderer.tsx:94-105,209-214`
  - `docs/components/spreadsheet-page/design.md:11,21,25-27,65-68`
- **What**: the public `spreadsheet-page` contract exposes `config?: SpreadsheetConfig`, and `SpreadsheetConfig` itself declares five knobs: `defaultRowHeight`, `defaultColumnWidth`, `minRowHeight`, `minColumnWidth`, and `maxUndoDepth`. Live code only honors one of them in core (`maxUndoDepth` in `createSpreadsheetCore`). The default page body then computes grid dimensions with:

  ```ts
  rows: Math.max(DEFAULT_ROWS, 1);
  cols: Math.max(DEFAULT_COLS, 1);
  ```

  so the rendered canvas is always `100` rows by `26` columns regardless of the actual workbook shape or any host intent. `defaultRowHeight` / `defaultColumnWidth` are read into the returned object but never consumed downstream, and `minRowHeight` / `minColumnWidth` are not read anywhere in `spreadsheet-core` or `spreadsheet-renderers`.

- **Why it matters**: this is not just an unused-config cleanup. The default host path can render only a hardcoded viewport-sized logical sheet even when the underlying document contains more rows/columns or the host expects different defaults. Any imported workbook, generated report sheet, or host schema relying on larger dimensions gets a silently cropped interactive surface: cells outside row 99 / column 25 are unreachable from the main grid even though they still exist in the document model. At the same time, the exposed `config` API overpromises four knobs that the shipped host never honors, which makes the contract misleading for schema authors and future host integrations.
- **Confidence**: Certain
- **Non-duplication note**: prior spreadsheet reviews covered viewport-allocation cost, accessibility, and one older `maxUndoDepth` gap. This is a different live defect family: the current default host path still hardcodes sheet dimensions and leaves most of the published `SpreadsheetConfig` contract unimplemented.

## Round Assessment

The pattern here is **public host contracts that exist on paper but are only partially wired through the default implementation**. `spreadsheet-page` advertises `config` as a first-class host input, but the live default body effectively behaves like a fixed demo shell: one config field reaches core, four do not, and the interactive grid ignores workbook size entirely.

Immediate improvement direction: derive rendered row/column bounds from the active workbook or an explicit host-owned dimension policy instead of a fixed `100 x 26`, then either implement the remaining `SpreadsheetConfig` fields end to end or remove/reshape them so the published contract matches reality.

## Blind-Spot Self-Assessment

This round stayed on the default spreadsheet host path and did not inspect report-designer spreadsheet embedding, import/export flows, or whether hidden off-grid cells remain reachable through secondary commands. I also did not run a UI repro. The next round should switch away from spreadsheet unless a second, materially different contract gap appears nearby.
