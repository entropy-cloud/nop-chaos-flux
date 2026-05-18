# 269 Deep Audit 2026-05-13 Accessibility And Test-Gate Successor Plan

> Plan Status: completed
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`, `docs/plans/267-deep-audit-2026-05-13-priority-remediation-plan.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the retained main-path accessibility defects and test-gate false-green findings from the 2026-05-13 deep audit batch.

## Current Baseline

- Plan 267 routes the accessibility and test-governance bucket here.
- Live re-audit is complete for all in-scope IDs.
- `20-01`, `20-02`, `20-03`, and `20-04` are now fixed in `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`, and `packages/flux-renderers-form-advanced/src/tree-controls.tsx`, with focused proof in `packages/flux-react/src/__tests__/data-source-and-node-identity.test.tsx`, `packages/flux-renderers-form-advanced/src/__tests__/form-tree-control-source-states.test.tsx`, and `packages/flux-renderers-form-advanced/src/tree-control-controllers.test.tsx`.
- `14-01`, `14-02`, and `14-06` are fixed by explicitly skipping exploratory/debug Playwright suites; `14-03` and `14-07` are fixed by converging active renderer packages onto package-level `happy-dom`; `14-05` and `14-09` are fixed by package-level coverage thresholds in active public packages; `14-08` is fixed by skipping the remaining asset-capture helper tests in `tests/e2e/code-editor.spec.ts` and `tests/e2e/flow-designer-ui.spec.ts`.
- `12-01` is now fixed: `tag-list` no longer toggles from wrapped field-shell clicks, and the live regression proof now aligns across `packages/flux-renderers-form-advanced/src/tag-list.test.tsx` and `packages/flux-renderers-form-advanced/src/__tests__/form-double-edit-regression.test.tsx`.
- `14-04` is now fixed: `packages/flux-runtime/src/__tests__/async-data-contracts.test.ts` has been reduced to the remaining data-source integration slice, while cache and source-observer proofs now live with their owners in `packages/flux-runtime/src/async-data/api-cache.test.ts` and `packages/flux-runtime/src/async-data/source-observer.test.ts`.

## Goals

- Re-audit the retained accessibility and test-gate findings against the live baseline.
- Land the highest-priority main-path fixes with focused DOM/runner proof.
- Split true closure blockers from lower-priority test-governance residuals without leaving any item ownerless.

## Non-Goals

- Absorb host-contract narrowing, error-fidelity, or validation-owner work.

## Scope

### In Scope

- `12-01`, `14-01`, `14-02`, `14-03`, `14-04`, `14-05`, `14-06`, `14-07`, `14-08`, `14-09`, `20-01`, `20-02`, `20-03`, `20-04`

### Out Of Scope

- Findings owned by Plans 262, 264, 265, 266, 268, 270, and 271

## Execution Plan

### Phase 1 - Re-audit Accessibility And Test Gates

Status: completed
Targets: `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form-advanced/src/{tag-list.tsx,tree-controls.tsx}`, `tests/e2e/*`, renderer `vitest.config.ts` files

- Item Types: `Decision | Fix | Proof`

- [x] Re-audit each retained ID against live code and current test runners.
- [x] Land the first closure-ready accessibility and false-green gate fixes.
- [x] Record owner decisions for the lower-priority test-governance residuals.

Exit Criteria:

- [x] Every in-scope retained ID has an explicit owner decision.
- [x] Any landed fix has focused DOM/runner proof.
- [x] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [x] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [x] All in-scope retained findings are adjudicated.
- [x] No confirmed accessibility or test-gate defect is silently deferred.
- [x] Remaining work has explicit successor ownership or landed fixes.
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

Status Note: all in-scope retained IDs are now fixed or explicitly adjudicated, the full workspace closure gates are green, and independent closure audit evidence is recorded below.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit subagent `ses_1ded2dbb8ffeCRzAy09BcgcZHw`
- Evidence: independent re-audit found no remaining live in-scope accessibility or test-gate defect. Focused proof remains in the package test suites and skipped exploratory/debug E2E cases are now explicit. Workspace closure gates were rerun green on 2026-05-13 via `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`.

Follow-up:

- No follow-up required.
