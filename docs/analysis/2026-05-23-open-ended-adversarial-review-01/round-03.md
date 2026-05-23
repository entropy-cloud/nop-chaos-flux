# Open-Ended Adversarial Review — 2026-05-23 — Round 03

**Execution date**: 2026-05-23
**Result directory**: `docs/analysis/2026-05-23-open-ended-adversarial-review-01/`
**Exploration areas**: `report-designer-renderers`, manifest precision vs live host projection vocabulary
**Discovery source**: public-contract audit after excluding older Report Designer sync and alias findings

---

## Finding 1: Report Designer manifest erases the structured `spreadsheet.selection` contract that live host data and owner docs both promise

- **Where**:
  - `packages/report-designer-renderers/src/report-designer-manifest.ts:16-81,154-173,209-211`
  - `packages/report-designer-renderers/src/host-data.ts:39-65,67-86,167-169,200-200`
  - `docs/components/report-designer-page/design.md:106-112`
- **What**: the Report Designer owner doc explicitly says `spreadsheet.selection` publishes a structured selection target with stable shapes for `cell`, `range`, `row`, `column`, and `sheet`. Live host data does exactly that in `getSpreadsheetSelectionTarget()`. But the public manifest declares `spreadsheet.selection` only as `kind: 'object', fields: {}`. This is not a case where the shape is unknowable: the same file already defines `selectionTargetShape` with the necessary discriminated union structure, and runtime code is already normalizing selection into those concrete variants.
- **Why it matters**: compiler/tooling/schema-authoring consumers lose the very contract the runtime and docs say is canonical. Any schema logic, validator, or future static capability tooling that relies on the manifest can only see "some object" for `spreadsheet.selection`, even though row/column/sheet/cell/range semantics are part of the supported host vocabulary. That weakens static validation exactly at a boundary the docs explicitly try to make guess-free.
- **Confidence**: Certain
- **Non-duplication note**: this is different from the already-reported Report Designer `selectionTarget` alias cleanup and from the runtime split between `selectionTarget` and `spreadsheet.selection`. The defect here is narrower and static-facing: the manifest throws away a structured nested contract that live host data already publishes and owner docs already standardize.

## Round Assessment

This round found another high-value pattern: **the runtime and docs converged on a structured vocabulary, but the manifest still advertises a much weaker type surface**. That kind of drift is easy to miss because the UI works, yet schema tooling and compile-time checks quietly regress back to "opaque object" handling.

Immediate improvement direction: reuse a shared structured selection shape for `spreadsheet.selection` in the Report Designer manifest, instead of publishing it as an untyped empty object.

## Blind-Spot Self-Assessment

This round focused on manifest precision rather than runtime behavior. I did not inspect whether other nested `spreadsheet.*` fields in Report Designer are similarly under-specified, and I did not compare this manifest against Spreadsheet's own manifest field-by-field. The next round should either switch subsystem or specifically audit other public manifests for "runtime structured, manifest opaque" residuals.
