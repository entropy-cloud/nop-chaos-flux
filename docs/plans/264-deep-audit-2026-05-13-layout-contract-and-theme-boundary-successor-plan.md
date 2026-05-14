# 264 Deep Audit 2026-05-13 Layout Contract And Theme Boundary Successor Plan

> Plan Status: completed
> Last Reviewed: 2026-05-14
> Source: `docs/analysis/2026-05-12-deep-audit-full/09-renderer-contract.md`, `docs/analysis/2026-05-12-deep-audit-full/10-styling.md`, `docs/analysis/2026-05-12-deep-audit-full/11-ui-components.md`, `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`
> Related: `docs/plans/259-deep-audit-2026-05-12-styling-and-ui-primitive-cleanup-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the still-live layout-contract and theme-boundary cleanup after Plan 259 closed the low-risk marker/primitive fixes and documented the spreadsheet table-shell exception.

## Current Baseline

- Plan 259 resolved `10-03`, `11-01`, `11-03`, and the actionable part of `11-02` by moving spreadsheet input/button controls onto `@nop-chaos/ui` primitives and documenting the raw table-shell exception.
- The remaining live items are contract-level layout exceptions (`09-01`, `10-01`, `10-02`, `10-04`) and word-editor theme-boundary drift (`10-05`).
- These items need a dedicated styling-contract owner plan rather than remaining as open residuals in a closure-ready cleanup plan.
- Live re-audit on 2026-05-13 confirmed `10-01` and `10-02` were already fixed in `flux-react` styling/marker surfaces. Follow-up execution under Plan `275` closed the remaining retained items: `09-01` and `10-04` now converge on explicit-only semantic direction overrides in `flux-renderers-basic`, and `10-05` is no longer live because `@nop-chaos/word-editor-renderers` ships package-owned `--nop-*` fallback tokens from `src/styles.css` on the supported package entry path.

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

Status: completed
Targets: `packages/flux-react/src/default-spacing.css`, `packages/flux-renderers-basic/src/{flex.tsx,container.tsx}`, `packages/word-editor-renderers/src/word-editor-page.tsx`, relevant owner docs

- Item Types: `Decision | Fix | Proof`

- [x] Re-audit the retained layout and theme findings against the live styling contract.
- [x] Decide explicit exception vs convergence paths for each in-scope item.
- [x] Land the first closure-ready slice with focused proof and doc updates.

Exit Criteria:

- [x] Every in-scope retained ID has an explicit contract decision.
- [x] Any behavior-changing fix has focused verification and owner-doc updates.
- [x] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [x] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [x] All in-scope retained findings are adjudicated.
- [x] No confirmed styling/theme drift is silently deferred.
- [x] Remaining exceptions are documented as supported contract, not implicit behavior.
- [x] Independent closure audit is completed and recorded with evidence.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None yet.

## Non-Blocking Follow-ups

None yet.

## Closure

Status Note: completed. This owner-successor plan finished its re-audit/successor-routing role: `10-01` and `10-02` were already fixed on the live baseline, and the remaining retained items were fully adjudicated under Plan `275` (`09-01`, `10-04`) or no longer live (`10-05`).

Closure Audit Evidence:

- Reviewer / Agent: independent closure-audit chain across Plans `264` and `275`
- Evidence: this plan's re-audit established the retained execution set, and Plan `275` then rechecked code, focused proof, and owner docs; it confirmed `09-01` and `10-04` are closed in `flux-renderers-basic`, `10-05` is already satisfied by package-owned `--nop-*` fallback tokens, and full workspace closure gates were rerun green.

Follow-up:

- no remaining plan-owned work
