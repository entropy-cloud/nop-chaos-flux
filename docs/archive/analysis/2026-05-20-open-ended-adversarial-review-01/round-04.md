# Open-Ended Adversarial Review — 2026-05-20 — Round 04

**Execution date**: 2026-05-20
**Result directory**: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/`
**Exploration areas**: Report Designer route-level E2E, spreadsheet/designer metadata boundary
**Discovery source**: test-truthfulness review after excluding already reported CRUD quick-edit and Flow Designer synthetic interaction gaps

---

## Finding: Report Designer E2E claims metadata binding but only proves spreadsheet text was written

- **Where**:
  - `tests/e2e/report-designer-demo.spec.ts:112-126`
  - `apps/playground/src/pages/report-designer-demo.tsx:313-345`
  - `packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx:131-168`
  - `packages/report-designer-core/src/__tests__/designer-core.test.ts:269-298`
- **What**: the Playwright test is named `dragging a field onto a cell writes the cell value and binds report metadata`, but after `field.dragTo(targetCell)` it only asserts `targetCell` contains `${orderId}`. The route code performs two distinct cross-package mutations: `spreadsheet:setCellValue` writes visible cell text, then `report-designer:dropFieldToTarget` binds semantic metadata. The E2E only observes the first mutation. Metadata is observable on the live grid through `data-cell-bound` when `getCellMetadata()` returns truthy, but the test never asserts it. Existing core unit tests verify the command can write metadata in isolation, not that the route-level drag path actually dispatches it and refreshes the rendered grid.
- **Why it matters**: a regression that removes, misorders, cancels, or fails the `dispatchDesigner()` call would still pass this E2E as long as the spreadsheet cell text is written. That is precisely the boundary the test name says it protects: the Report Designer semantic layer staying synchronized with Spreadsheet UI state. Because the implementation has rollback logic only after the spreadsheet write, this blind spot can hide split-brain states where the user sees `${field}` in the grid but export/preview/inspector semantics do not know the field is bound.
- **Confidence**: High. Repository search found no E2E assertion for `data-cell-bound`, report metadata after route-level drag, or inspector-bound field state. The core tests cover the command in isolation, which does not protect the UI integration boundary.
- **Suggested guardrail**: after the drag assertion, also assert the target cell has `data-cell-bound="true"` or assert an inspector/metadata surface shows the dropped field. Prefer checking the rendered semantic marker because it exercises `getCellMetadata()` through the same route-level state refresh path.

## Round Assessment

This is another instance of a broader test-trust pattern: tests sometimes name the cross-boundary invariant but assert only the visible half of the behavior. Here the missing half is not cosmetic; it is the semantic report binding that later export, preview, and inspector flows depend on.

## Blind-Spot Self-Assessment

This round did not execute the Playwright spec. The finding is based on static inspection of the tested assertions and the route/rendering paths. A follow-up could run the spec after adding a temporary `data-cell-bound` assertion to confirm the current implementation passes and to turn the observation into a regression test.
