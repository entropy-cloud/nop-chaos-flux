# 263 Deep Audit 2026-05-13 Public Surface Narrowing Successor Plan

> Plan Status: planned
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-12-deep-audit-full/03-api-surface.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-01-05.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-11-15.md`
> Related: `docs/plans/257-deep-audit-2026-05-12-doc-baseline-and-public-contract-successor-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the remaining public-surface width and contract-rationalization findings after Plan 257 closed the live doc-baseline fixes that were straightforward in the current slice.

## Current Baseline

- Plan 257 resolved the doc-baseline and owner-doc drift for `15-02`, `17-01`, `17-04`, `17-05`, and `17-07`.
- The remaining live work is no longer doc drift; it is supported-surface narrowing, submit-semantics/public-contract adjudication, and semantic-vocabulary adjudication.
- These items need their own plan because they may require package-export changes, test-support migration, or formal exception documentation.

## Goals

- Re-audit the remaining public-surface width against actual consumers.
- Narrow or formally classify the still-live exported surfaces.
- Record stable owner-doc language for any supported exception that remains public.

## Non-Goals

- Re-open the already-closed doc-baseline fixes from Plan 257.
- Absorb structural compiler ownership or styling-contract work.

## Scope

### In Scope

- `02-15`, `03-01`, `08-03`, `17-03`

### Out Of Scope

- Findings routed to Plans 256, 258, 259, 260, and 261

## Execution Plan

### Phase 1 - Re-audit Public Surface Residuals

Status: planned
Targets: `packages/flux-renderers-form/package.json`, `packages/flux-renderers-form/src/index.tsx`, related owner docs and consuming tests

- Item Types: `Decision | Fix | Proof`

- [ ] Audit live consumers of the retained public/test-support surfaces.
- [ ] Decide which surfaces should be narrowed, re-homed, or explicitly documented as supported exceptions.
- [ ] Land the first closure-ready public-surface narrowing slice with focused proof.

Exit Criteria:

- [ ] Every in-scope retained ID has an explicit supported-surface decision.
- [ ] Any behavior-changing contract update has focused verification.
- [ ] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [ ] All in-scope retained findings are adjudicated.
- [ ] No confirmed public-surface drift is silently deferred.
- [ ] Remaining exceptions are documented as stable supported behavior, not implicit drift.

## Deferred But Adjudicated

None yet.

## Non-Blocking Follow-ups

None yet.
