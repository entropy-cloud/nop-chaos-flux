# 265 Deep Audit 2026-05-13 Reactive Owner Boundary Successor Plan

> Plan Status: planned
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-12-deep-audit-full/final-review-results-01-05.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-06-10.md`, `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`
> Related: `docs/plans/254-deep-audit-2026-05-12-reactive-and-owner-boundary-follow-up-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the still-live reactive-precision and owner-boundary findings that remained after Plan 254 re-audited its retained set and split the unresolved work into explicit successor ownership.

## Current Baseline

- Plan 254 no longer owns active execution; it closed after adjudicating its retained set and moving the still-live subset here.
- The remaining work is concentrated in reactive subscription precision, renderer/runtime owner seams, dialog/table subscription hot paths, and one still-live tree renderer contract gap.
- The prior `09-05` renderer-contract concern was removed through scope change after the 2026-05-13 batch re-audit concluded that the current unstable provider usage is an acceptable owner-renderer child-runtime boundary.
- Plan 267 now additionally routes the 2026-05-13 retained reactive/publication set here, so this plan owns both the carried legacy reactive backlog and the current batch reactive owner matrix.

## Goals

- Re-audit the remaining reactive and owner-boundary findings against the live repo.
- Separate closure-ready low-risk fixes from larger structural reshapes.
- Land the first safe slices with focused proof and owner-doc updates where required.

## Non-Goals

- Re-open Plan 254 items already adjudicated as no longer live.
- Absorb async/lifecycle, styling/theme, or broader public-surface narrowing work.

## Scope

### In Scope

- Legacy carried reactive-owner set: `02-14`, `02-16`, `04-04`, `05-05`, `05-06`, `05-07`, `05-08`, `09-02`
- 2026-05-13 retained set routed by Plan 267: `05-01`, `05-02`, `05-03`, `05-04`, `07-01`, `07-02`, `07-03`, `07-06`

### Out Of Scope

- `09-05` already adjudicated and closed in Plan 254
- Findings routed to Plans 255-264 and 266

## Execution Plan

### Phase 1 - Re-audit Reactive Owner Map

Status: planned
Targets: `packages/flux-runtime/src/*`, `packages/flux-react/src/*`, `packages/flux-renderers-basic/src/*`, `packages/flux-renderers-form/src/*`, `packages/flux-renderers-data/src/*`

- Item Types: `Decision | Fix | Proof`

- [ ] Re-audit the 2026-05-13 routed reactive/publication set `05-01`, `05-02`, `05-03`, `05-04`, `07-01`, `07-02`, `07-03`, `07-06` against live code, tests, and owner docs.
- [ ] Group the surviving 2026-05-13 issues into closure-ready implementation slices.
- [ ] Record the chosen owner-boundary path for every 2026-05-13 routed ID before touching the carried legacy backlog.

Exit Criteria:

- [ ] Every 2026-05-13 routed retained ID has an explicit live-owner decision.
- [ ] Closure-ready slices are separated from longer-running structural work.
- [ ] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [ ] `docs/logs/` corresponding date entry is updated.

### Phase 2 - Re-audit Carried Legacy Reactive Backlog

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/*`, `packages/flux-code-editor/src/*`, `packages/flux-runtime/src/*`

- Item Types: `Decision | Fix | Proof`

- [ ] Re-audit the carried legacy reactive-owner set `02-14`, `02-16`, `04-04`, `05-05`, `05-06`, `05-07`, `05-08`, `09-02` after the 2026-05-13 routed set has an execution path.
- [ ] Group the surviving legacy issues into closure-ready implementation slices.
- [ ] Record the chosen owner-boundary path for every carried legacy ID.

Exit Criteria:

- [ ] Every carried legacy retained ID has an explicit live-owner decision.
- [ ] Legacy reactive slices are separated from the 2026-05-13 priority set.
- [ ] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [ ] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [ ] All in-scope retained findings are adjudicated.
- [ ] No confirmed live reactive/owner-boundary defect is silently deferred.
- [ ] Each deferred slice has explicit successor ownership or a landed fix.
- [ ] Independent closure audit is completed and recorded with evidence.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None yet.

## Non-Blocking Follow-ups

None yet.

## Closure

Status Note: pending execution.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- Pending execution.
