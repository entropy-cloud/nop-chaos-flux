# 263 Deep Audit 2026-05-13 Public Surface Narrowing Successor Plan

> Plan Status: completed
> Last Reviewed: 2026-05-14
> Source: `docs/analysis/2026-05-12-deep-audit-full/03-api-surface.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-01-05.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-11-15.md`
> Related: `docs/plans/257-deep-audit-2026-05-12-doc-baseline-and-public-contract-successor-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the remaining public-surface width and contract-rationalization findings after Plan 257 closed the live doc-baseline fixes that were straightforward in the current slice.

## Current Baseline

- Plan 257 resolved the doc-baseline and owner-doc drift for `15-02`, `17-01`, `17-04`, `17-05`, and `17-07`.
- The remaining live work is no longer doc drift; it is supported-surface narrowing, submit-semantics/public-contract adjudication, and semantic-vocabulary adjudication.
- These items need their own plan because they may require package-export changes, test-support migration, or formal exception documentation.
- Live re-audit on 2026-05-13 confirmed `02-15` and `03-01` as the only still-live public-surface items at handoff time, while `08-03` was no longer plan-owned here and `17-03` had already been downgraded to watch-only naming residual under Plan 271.
- Follow-up execution under Plan `274` closed the remaining work: `02-15` is fixed by removing the public `@nop-chaos/flux-renderers-form/test-support` subpath, and `03-01` is now explicitly adjudicated as a supported documented exception rather than implicit drift.

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

Status: completed
Targets: `packages/flux-renderers-form/package.json`, `packages/flux-renderers-form/src/index.tsx`, related owner docs and consuming tests

- Item Types: `Decision | Fix | Proof`

- [x] Audit live consumers of the retained public/test-support surfaces.
- [x] Decide which surfaces should be narrowed, re-homed, or explicitly documented as supported exceptions.
- [x] Land the first closure-ready public-surface narrowing slice with focused proof.

Exit Criteria:

- [x] Every in-scope retained ID has an explicit supported-surface decision.
- [x] Any behavior-changing contract update has focused verification.
- [x] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [x] All in-scope retained findings are adjudicated.
- [x] No confirmed public-surface drift is silently deferred.
- [x] Remaining exceptions are documented as stable supported behavior, not implicit drift.

## Closure

Status Note: completed. This owner-successor plan finished its re-audit/successor-routing role, and the only still-live execution work (`02-15`, `03-01`) was fully adjudicated under Plan `274`.

Closure Audit Evidence:

- Reviewer / Agent: independent closure-audit chain across Plans `263` and `274`
- Evidence: this plan's re-audit established the active successor-owned set, and Plan `274` then rechecked the live repo and confirmed `02-15` is fixed, `03-01` is an explicitly supported exception, `08-03` is not owned here, and `17-03` remains a Plan `271` watch-only naming residual.

Follow-up:

- no remaining plan-owned work

## Deferred But Adjudicated

None yet.

## Non-Blocking Follow-ups

None yet.
