# 256 Deep Audit 2026-05-12 Module Boundary And Test Hygiene Plan

> Plan Status: completed
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-12-deep-audit-full/summary.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-01-05.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-11-15.md`
> Related: `docs/plans/251-deep-audit-2026-05-12-priority-remediation-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the retained module-boundary, large-file, and test-hygiene findings that were intentionally not closure blockers for Plan 251.

## Current Baseline

- Plan 251 fixed the public contract drift that blocked the priority remediation closure path.
- The remaining structural `02-*` work has been moved into explicit successor ownership under Plan 262.
- The test-hygiene findings `14-01`, `14-02`, and `14-03` no longer reproduce after the live updates in `tests/e2e/component-lab/{coverage-manifest.ts,complex-form.spec.ts}` and `packages/flux-renderers-data/src/__tests__/use-table-controls.selection.test.tsx`.
- Independent re-audit on 2026-05-13 confirmed that the large-file/module-boundary findings remain live and cannot be silently closed.

## Goals

- Re-audit the retained structural and test-hygiene findings.
- Fix the still-live subset with the smallest correct boundary changes.
- Record explicit proof for any finding that is downgraded or removed after re-audit.

## Non-Goals

- Re-open Plan 251's fixed public-contract work.
- Absorb styling, accessibility, or performance buckets.

## Scope

### In Scope

- `02-01`, `02-02`, `02-03`, `02-04`, `02-07`, `02-08`, `02-09`, `02-11`, `02-12`, `02-13`, `14-01`, `14-02`, `14-03`

### Out Of Scope

- `02-05`, `02-06`, `02-10` allowed residuals owned by Plan 251 Phase 7 classification
- Findings routed to Plans 254-255 and 257-261

## Execution Plan

### Phase 1 - Re-audit Structure And Test Hygiene

Status: completed
Targets: retained IDs listed in Scope

- Item Types: `Decision | Fix | Proof`

- [x] Re-audit the retained structural and test-hygiene findings.
- [x] Land the still-live test-hygiene fixes with focused proof for `14-01`, `14-02`, and `14-03`.
- [x] Move the remaining structural findings into explicit successor ownership instead of leaving this plan half-open.

Exit Criteria:

- [x] Every in-scope retained ID is adjudicated.
- [x] Focused verification covers each behavior-changing fix.
- [x] Owner docs/logs are updated where required.
- [x] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [x] All in-scope retained findings are adjudicated.
- [x] No confirmed live defect is silently deferred.
- [x] Focused verification passes for the landed test-hygiene fixes, and the remaining structural work is moved to explicit successor ownership.

## Closure Notes

- `14-01`, `14-02`, and `14-03` were closed by the landed Component Lab and selection-coverage fixes already recorded in this plan.
- The still-live structural findings `02-01`, `02-02`, `02-03`, `02-04`, `02-07`, `02-08`, `02-09`, `02-11`, `02-12`, and `02-13` were moved to `docs/plans/262-deep-audit-2026-05-13-structural-owner-successor-plan.md`.
- Closure audit evidence: independent review `ses_1e137c328ffeVBrqXeuqXvwgdD` confirmed this plan can now be marked `completed` because all remaining live structural work was moved into explicit successor ownership.

## Deferred But Adjudicated

### Structural owner slice moved to explicit successor ownership (`02-01`, `02-02`, `02-03`, `02-04`, `02-07`, `02-08`, `02-09`, `02-11`, `02-12`, `02-13`)

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: these are still-live maintainability/module-boundary hotspots, but they now have a dedicated active owner plan instead of remaining inside this closure-ready remediation plan.
- Successor Required: `yes`
- Successor Path: `docs/plans/262-deep-audit-2026-05-13-structural-owner-successor-plan.md`

## Non-Blocking Follow-ups

- `14-01`: resolved by adding the missing `input-number` Component Lab manifest coverage entry in `tests/e2e/component-lab/coverage-manifest.ts`.
- `14-02`: resolved by aligning write-tier coverage with real interaction assertions in `tests/e2e/component-lab/complex-form.spec.ts`.
- `14-03`: resolved by adding selection semantics coverage in `packages/flux-renderers-data/src/__tests__/use-table-controls.selection.test.tsx`.
