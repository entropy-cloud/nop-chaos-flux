# 273 Deep Audit 2026-05-13 Structural Hotspots Execution Successor Plan

> Plan Status: planned
> Last Reviewed: 2026-05-13
> Source: `docs/plans/262-deep-audit-2026-05-13-structural-owner-successor-plan.md`, `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-01-05.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the still-live structural hotspots that remained after Plan 262 completed its re-audit and split the surviving large-file/owner-boundary work into an explicit execution successor.

## Current Baseline

- Plan 262 already closed the fixed/no-longer-live subset (`01-02`, `02-03`, `02-04`).
- The remaining live structural work is concentrated in oversized owner files and compiler-global responsibility seams.

## Goals

- Re-audit the surviving structural hotspots against the live repo.
- Separate near-term extraction slices from longer-lived architecture debt.
- Land the first closure-ready structural refactors with focused proof.

## Non-Goals

- Re-open the already adjudicated fixed/no-longer-live subset closed in Plan 262.

## Scope

### In Scope

- `02-01`, `02-02`, `12-03`, `02-07`, `02-08`, `02-09`, `02-11`, `02-12`, `02-13`

### Out Of Scope

- Fixed/no-longer-live Plan 262 items: `01-02`, `02-03`, `02-04`

## Execution Plan

### Phase 1 - Re-audit And Slice Structural Hotspots

Status: planned
Targets: `packages/flux-compiler/src/schema-compiler/*`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `packages/flux-runtime/src/{runtime-factory.ts,async-data/reaction-runtime.ts,import-stack.ts}`, `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`

- Item Types: `Decision | Fix | Proof`

- [ ] Re-audit each in-scope hotspot against the live repo.
- [ ] Group the surviving work into closure-ready extraction/refactor slices.
- [ ] Record whether any item remains architecture debt but not a current closure blocker for the first implementation slice.

Exit Criteria:

- [ ] Every in-scope retained ID has an explicit execution decision.
- [ ] The first structural execution slice is clearly defined.
- [ ] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [ ] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [ ] All in-scope retained findings are adjudicated.
- [ ] No confirmed live structural defect is silently deferred.
- [ ] Remaining work has explicit successor ownership or landed fixes.

## Deferred But Adjudicated

None yet.

## Non-Blocking Follow-ups

None yet.
