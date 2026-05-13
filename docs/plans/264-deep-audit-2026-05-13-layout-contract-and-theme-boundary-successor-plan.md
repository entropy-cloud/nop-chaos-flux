# 264 Deep Audit 2026-05-13 Layout Contract And Theme Boundary Successor Plan

> Plan Status: planned
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-12-deep-audit-full/09-renderer-contract.md`, `docs/analysis/2026-05-12-deep-audit-full/10-styling.md`, `docs/analysis/2026-05-12-deep-audit-full/11-ui-components.md`
> Related: `docs/plans/259-deep-audit-2026-05-12-styling-and-ui-primitive-cleanup-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the still-live layout-contract and theme-boundary cleanup after Plan 259 closed the low-risk marker/primitive fixes and documented the spreadsheet table-shell exception.

## Current Baseline

- Plan 259 resolved `10-03`, `11-01`, `11-03`, and the actionable part of `11-02` by moving spreadsheet input/button controls onto `@nop-chaos/ui` primitives and documenting the raw table-shell exception.
- The remaining live items are contract-level layout exceptions (`09-01`, `10-01`, `10-02`, `10-04`) and word-editor theme-boundary drift (`10-05`).
- These items need a dedicated styling-contract owner plan rather than remaining as open residuals in a closure-ready cleanup plan.

## Goals

- Re-audit the retained layout/theme findings against the live styling-system docs.
- Decide which renderers should converge to marker-only behavior and which need explicit contract exceptions.
- Land the first closure-ready styling-contract slice with focused proof and owner-doc updates.

## Non-Goals

- Re-open the already-closed 2026-05-13 primitive and marker fixes from Plan 259.
- Absorb public-surface narrowing or structural compiler work.

## Scope

### In Scope

- `09-01`, `10-01`, `10-02`, `10-04`, `10-05`

### Out Of Scope

- Findings routed to Plans 256, 257, 258, 260, and 261

## Execution Plan

### Phase 1 - Re-audit Layout And Theme Residuals

Status: planned
Targets: `packages/flux-react/src/default-spacing.css`, `packages/flux-renderers-basic/src/{flex.tsx,container.tsx}`, `packages/word-editor-renderers/src/word-editor-page.tsx`, relevant owner docs

- Item Types: `Decision | Fix | Proof`

- [ ] Re-audit the retained layout and theme findings against the live styling contract.
- [ ] Decide explicit exception vs convergence paths for each in-scope item.
- [ ] Land the first closure-ready slice with focused proof and doc updates.

Exit Criteria:

- [ ] Every in-scope retained ID has an explicit contract decision.
- [ ] Any behavior-changing fix has focused verification and owner-doc updates.
- [ ] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [ ] All in-scope retained findings are adjudicated.
- [ ] No confirmed styling/theme drift is silently deferred.
- [ ] Remaining exceptions are documented as supported contract, not implicit behavior.

## Deferred But Adjudicated

None yet.

## Non-Blocking Follow-ups

None yet.
