# 269 Deep Audit 2026-05-13 Accessibility And Test-Gate Successor Plan

> Plan Status: planned
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`, `docs/plans/267-deep-audit-2026-05-13-priority-remediation-plan.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the retained main-path accessibility defects and test-gate false-green findings from the 2026-05-13 deep audit batch.

## Current Baseline

- Plan 267 routes the accessibility and test-governance bucket here.
- The in-scope items cover field label/error association, tree-control focus semantics, exploratory/debug suite leakage, mixed renderer test environments, and coverage/test-signal hygiene.
- These items need a dedicated owner plan because they change supported test gates and user-facing interaction semantics.

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

Status: planned
Targets: `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form-advanced/src/{tag-list.tsx,tree-controls.tsx}`, `tests/e2e/*`, renderer `vitest.config.ts` files

- Item Types: `Decision | Fix | Proof`

- [ ] Re-audit each retained ID against live code and current test runners.
- [ ] Land the first closure-ready accessibility and false-green gate fixes.
- [ ] Record owner decisions for the lower-priority test-governance residuals.

Exit Criteria:

- [ ] Every in-scope retained ID has an explicit owner decision.
- [ ] Any landed fix has focused DOM/runner proof.
- [ ] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [ ] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [ ] All in-scope retained findings are adjudicated.
- [ ] No confirmed accessibility or test-gate defect is silently deferred.
- [ ] Remaining work has explicit successor ownership or landed fixes.
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
