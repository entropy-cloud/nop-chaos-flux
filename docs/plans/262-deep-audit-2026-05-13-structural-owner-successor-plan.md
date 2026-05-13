# 262 Deep Audit 2026-05-13 Structural Owner Successor Plan

> Plan Status: planned
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-12-deep-audit-full/summary.md`, `docs/analysis/2026-05-12-deep-audit-full/02-module-responsibility.md`, `docs/analysis/2026-05-12-deep-audit-full/12-field-slot.md`, `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`
> Related: `docs/plans/256-deep-audit-2026-05-12-module-boundary-and-test-hygiene-plan.md`, `docs/plans/258-deep-audit-2026-05-12-renderer-slot-and-typing-follow-up-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the still-live structural owner-boundary hotspots that remained after Plans 256 and 258 closed their low-risk fixes and moved the larger cross-package work into explicit successor ownership.

## Current Baseline

- Plans 256 and 258 closed the low-risk test-hygiene, event-contract, and typing fixes that were feasible in the current slice.
- The remaining live structural work still spans compiler tables, runtime/renderer boundaries, and large-file ownership seams.
- These items need a dedicated owner plan instead of remaining as open-ended residuals inside closure-ready successor plans.
- Plan 267 now also routes the 2026-05-13 retained structural set here, so this plan owns both the carried legacy structural backlog and the current batch structural owner matrix.

## Goals

- Re-audit the retained structural hotspots against the live repo.
- Decide the smallest safe owner-boundary reshapes for each retained hotspot.
- Land the first closure-ready structural slices with focused proof.

## Non-Goals

- Re-open the already-closed 2026-05-13 low-risk fixes from Plans 256 and 258.
- Absorb styling/theme or public-surface narrowing work.

## Scope

### In Scope

- Legacy carried structural set: `02-07`, `02-08`, `02-09`, `02-11`, `02-12`, `02-13`
- 2026-05-13 retained set routed by Plan 267: `01-02`, `02-01`, `02-02`, `02-03`, `02-04`, `12-03`

### Out Of Scope

- Findings routed to Plans 257, 259, 260, and 261

## Execution Plan

### Phase 1 - Re-audit Structural Ownership Map

Status: planned
Targets: `packages/report-designer-renderers/package.json`, `packages/flux-compiler/src/schema-compiler/*`, `packages/flux-renderers-form/src/renderers/input.tsx`, `scripts/{verify-no-src-artifacts,clean-src-artifacts}.mjs`, `packages/*/src/**/*.d.ts.map`

- Item Types: `Decision | Fix | Proof`

- [ ] Re-audit the 2026-05-13 routed structural set `01-02`, `02-01`, `02-02`, `02-03`, `02-04`, `12-03` against the live baseline.
- [ ] Separate immediate guard/large-file closure work from longer-lived structural reshapes.
- [ ] Record the chosen fix/split path for each 2026-05-13 routed retained ID before touching the carried legacy backlog.

Exit Criteria:

- [ ] Every 2026-05-13 routed retained ID has an explicit live-owner decision.
- [ ] Closure-ready slices are separated from longer-term structural work.
- [ ] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [ ] `docs/logs/` corresponding date entry is updated.

### Phase 2 - Re-audit Carried Legacy Structural Backlog

Status: planned
Targets: `packages/flux-runtime/src/*`, `packages/flux-renderers-form-advanced/src/composite-field/*`, `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`

- Item Types: `Decision | Fix | Proof`

- [ ] Re-audit the carried legacy structural set `02-07`, `02-08`, `02-09`, `02-11`, `02-12`, `02-13` after the priority 2026-05-13 routed set has an execution path.
- [ ] Group the legacy items into closure-ready slices instead of one monolithic rewrite.
- [ ] Record the chosen ownership path for each legacy retained ID.

Exit Criteria:

- [ ] Every carried legacy retained ID has an explicit live-owner decision.
- [ ] Legacy structural slices are separated from the 2026-05-13 priority set.
- [ ] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [ ] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [ ] All in-scope retained findings are adjudicated.
- [ ] No confirmed live structural defect is silently deferred.
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
