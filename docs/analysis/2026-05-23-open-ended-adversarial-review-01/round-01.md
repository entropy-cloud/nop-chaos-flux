# Open-Ended Adversarial Review — 2026-05-23 — Round 01

**Execution date**: 2026-05-23
**Result directory**: `docs/analysis/2026-05-23-open-ended-adversarial-review-01/`
**Exploration areas**: `report-designer-renderers`, report host projection contract, selection/active-sheet semantics
**Discovery source**: contract archaeology after de-duplicating recent report-designer split-brain findings

---

## Finding 1: Report Designer top-level `activeSheet` is not actually the current active sheet

- **Where**:
  - `packages/report-designer-renderers/src/host-data.ts:13-33,111-117,170-205`
  - `packages/report-designer-core/src/types.ts:19-27,144-152`
  - `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:92-146`
  - `docs/components/report-designer-page/design.md:82,86,106-112`
- **What**: the owner doc declares top-level `activeSheet` as the canonical "current active sheet" convenience field. Live code computes that field with `getActiveSheet(snapshot, snapshot.selectionTarget)`, and `getActiveSheet()` only handles `sheet`, `cell`, and `range`. Valid report selection targets `workbook`, `row`, and `column` all return `undefined`, even though the current workbook still has an active sheet and the nested spreadsheet projection continues to expose it through `spreadsheet.activeSheet`.
- **Why it matters**: this creates a host-scope contract split inside one snapshot. A schema fragment that follows the documented canonical top-level `activeSheet` field can suddenly lose sheet context whenever selection moves to workbook metadata, a whole row, or a whole column. At the same time, `spreadsheet.activeSheet` still points at the real active sheet. That means two supported read paths disagree about a basic navigation fact, which can break inspector/tooling schemas that read sheet-level metadata, labels, or formulas via top-level `activeSheet`.
- **Confidence**: Certain
- **Non-duplication note**: this is different from the already-reported Report Designer workbook sync split or `selectionTarget` mirror lag. Even if selection mirroring is perfectly up to date and both cores are synchronized, top-level `activeSheet` still drops to `undefined` by construction for valid `workbook` / `row` / `column` targets.

## Round Assessment

The high-value pattern in this round is **canonical convenience fields whose names promise stable context, but whose implementation quietly reinterprets them as selection-dependent projections**. In Report Designer, `activeSheet` is documented and positioned as a core host field, yet its live behavior is really "selected sheet when the target shape happens to carry one in the handled branches".

Immediate improvement direction: define `activeSheet` from the actual active sheet owner (`spreadsheet.activeSheet` or an explicit report-level active-sheet identity), not from the subset of `selectionTarget` kinds that currently happen to encode a sheet reference.

## Blind-Spot Self-Assessment

This round stayed tightly on Report Designer host projection semantics. I did not verify whether downstream schema examples currently rely on top-level `activeSheet`, and I did not inspect whether the manifest or status publication repeats the same semantic drift. A next round would be best spent on a different subsystem unless another clearly distinct Report Designer host-contract defect appears.
