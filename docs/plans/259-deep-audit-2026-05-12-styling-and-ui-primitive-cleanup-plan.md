# 259 Deep Audit 2026-05-12 Styling And UI Primitive Cleanup Plan

> Plan Status: completed
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-12-deep-audit-full/summary.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-06-10.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-11-15.md`
> Related: `docs/plans/251-deep-audit-2026-05-12-priority-remediation-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the retained styling-system and raw UI primitive cleanup findings that were intentionally excluded from Plan 251 closure.

## Current Baseline

- Plan 251 only fixed the accessibility paths that were on the main risk path.
- The remaining styling/theme-contract findings `09-01`, `10-01`, `10-02`, `10-04`, and `10-05` have been moved into explicit successor ownership under Plan 264.
- The live drift for `10-03`, `11-01`, `11-02`, and `11-03` no longer reproduces after the 2026-05-13 cleanup in `apps/playground/src/flow-designer/flow-designer-canvas.tsx`, `packages/nop-debugger/src/panel/json-viewer.tsx`, `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`, `packages/word-editor-renderers/src/toolbar/font-controls.tsx`, and the spreadsheet table-shell exemption note in `docs/architecture/styling-system.md`.

## Goals

- Re-audit the retained styling and raw primitive findings.
- Land the still-live cleanup with focused proof.
- Update styling owner docs when the supported contract changes.

## Non-Goals

- Re-open Plan 251 priority a11y fixes.
- Absorb unrelated performance or package-boundary work.

## Scope

### In Scope

- `09-01`, `10-01`, `10-02`, `10-03`, `10-04`, `10-05`, `11-01`, `11-02`, `11-03`

### Out Of Scope

- Findings routed to Plans 254-258, 260, and 261

## Execution Plan

### Phase 1 - Re-audit Styling And Primitive Residuals

Status: completed
Targets: retained IDs listed in Scope

- Item Types: `Decision | Fix | Proof`

- [x] Re-audit the retained findings against the current styling baseline.
- [x] Land the still-live cleanup with focused proof for `10-03`, `11-01`, `11-02`, and `11-03`.
- [x] Update owner docs where the styling contract changed in this slice.

Exit Criteria:

- [x] Every in-scope retained ID is adjudicated.
- [x] Focused verification covers each behavior-changing fix.
- [x] Owner docs/logs are updated where required.
- [x] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [x] All in-scope retained findings are adjudicated.
- [x] No confirmed live defect is silently deferred.
- [x] Focused verification passes for the landed primitive cleanups, and the remaining styling/theme work is moved to explicit successor ownership.

## Closure Notes

- `10-03`, `11-01`, and `11-03` were closed by the landed marker/primitive fixes already recorded in this plan.
- `11-02` was closed by replacing spreadsheet editing/row-header controls with `@nop-chaos/ui` `Input` and `Button` in `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`, plus documenting the raw table-shell exception in `docs/architecture/styling-system.md`.
- The still-live styling/theme items `09-01`, `10-01`, `10-02`, `10-04`, and `10-05` were moved to `docs/plans/264-deep-audit-2026-05-13-layout-contract-and-theme-boundary-successor-plan.md`.
- Closure audit evidence: independent review `ses_1e137c328ffeVBrqXeuqXvwgdD` confirmed this plan can now be marked `completed` because all remaining live styling/theme work was moved into explicit successor ownership.

## Deferred But Adjudicated

### Remaining styling-system and primitive residuals moved to explicit successor ownership (`09-01`, `10-01`, `10-02`, `10-04`, `10-05`)

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: the remaining live layout/theme work now has a dedicated active owner plan instead of remaining as silent debt here.
- Successor Required: `yes`
- Successor Path: `docs/plans/264-deep-audit-2026-05-13-layout-contract-and-theme-boundary-successor-plan.md`

## Non-Blocking Follow-ups

- Resolved via 2026-05-13 re-audit: `10-03`, `11-01`, `11-02`, `11-03`.
