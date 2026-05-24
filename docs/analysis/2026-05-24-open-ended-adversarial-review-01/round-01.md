# Open-Ended Adversarial Review — 2026-05-24 — Round 01

**Execution date**: 2026-05-24
**Result directory**: `docs/analysis/2026-05-24-open-ended-adversarial-review-01/`
**Exploration areas**: `report-designer-renderers`, host-scope/runtime summary publication, bridge/status consistency
**Discovery source**: contract archaeology after re-running lint/check and excluding previously reported Report Designer selection/active-sheet findings

---

## Finding 1: Report Designer host-scope `runtime` silently falls back to report-only state while docs, bridge, and `statusPath` all promise aggregated cross-owner runtime

- **Where**:
  - `packages/report-designer-renderers/src/host-data.ts:172-227`
  - `packages/report-designer-renderers/src/bridge.ts:70-99`
  - `packages/report-designer-renderers/src/page-renderer.tsx:542-555`
  - `docs/components/report-designer-page/design.md:106-112`
  - `docs/architecture/report-designer/design.md:447-455`
- **What**: owner docs define top-level `runtime.dirty` and `runtime.canUndo` / `runtime.canRedo` as the aggregated runtime summary exposed to both `statusPath` and host scope, with report-only history staying under `designer.*`. Live code only honors that contract in two places: `deriveDesignerHostSnapshot()` aggregates report + spreadsheet runtime, and `useStatusPathPublication()` also publishes `snapshot.* || spreadsheetSnapshot.history.*`. But `buildReportDesignerScopeData()` publishes top-level `runtime` from `ReportDesignerRuntimeSnapshot` only, ignoring spreadsheet dirty/history entirely.
- **Why it matters**: this creates a supported-surface split inside one page instance. A schema fragment rendered inside `report-designer-page` and reading `runtime.canUndo` or `runtime.dirty` from host scope can see `false` after spreadsheet-only edits, while status consumers and bridge consumers simultaneously see `true`. That undermines the point of the canonical convenience projection: toolbar buttons, badges, or guards implemented against host scope can disagree with the outer status model and with any consumer wired through the bridge snapshot.
- **Confidence**: Certain
- **Non-duplication note**: this is in the same general family as prior Report Designer split-brain findings, but it is not the already reported `activeSheet` drift or `spreadsheet.selection` manifest weakness. The defect here is a new three-way inconsistency specifically on aggregated runtime summary semantics.

## Round Assessment

This round surfaced a high-value pattern: **the project has already converged on a canonical public summary DTO in docs and bridge/status plumbing, but one internal publication path still emits the pre-convergence semantics**. That is particularly dangerous because all three paths use the same field names, so consumers get contradictory answers without any obvious migration signal.

Immediate improvement direction: make `buildReportDesignerScopeData()` derive top-level `runtime` from the same aggregated formula used by `deriveDesignerHostSnapshot()` and `useStatusPathPublication()`, or centralize that summary construction in one shared helper so the contract cannot diverge again.

## Blind-Spot Self-Assessment

This round stayed on Report Designer runtime publication seams. I did not yet audit whether manifest contracts for top-level `runtime` should also include nested spreadsheet runtime fields like viewport/zoom, and I did not inspect whether toolbar schemas in demos rely on host scope or bridge snapshot today. The next round should either deepen adjacent public-contract drift or switch subsystems entirely.
