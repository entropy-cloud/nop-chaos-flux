# 353 Open-Ended Adversarial Review 2026-05-18 React Integration And Surface Visibility Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-01.md` (Findings 4, 5), `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-02.md` (Finding 7), `docs/analysis/2026-05-18-open-ended-adversarial-review-02/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/350-open-ended-adversarial-review-2026-05-18-priority-remediation-plan.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/surface-owner.md`

## Purpose

收口 React integration correctness / surface visibility family 的 3 个 defects：container registry 持有 stale DOM ref、`useSurfaceScopeSnapshot()` 订阅结果被丢弃，以及 form `initAction` 失败对用户不可见。

## Current Baseline

Outdated Note: the bullets below capture the pre-fix silent-misbehavior baseline. Final live status is recorded in the completed execution checklist, closure gates, and `docs/logs/2026/05-18.md`.

- `R1-4`, `R1-5`, `R2-7` 共享一个结果面：React integration surface 在无显式 crash 的情况下可以产生 silent wrong behavior 或 invisible failure。
- 前两个问题位于 `packages/flux-react`，第三个问题位于 `packages/flux-renderers-form`，但它们都围绕 React-driven runtime surfaces 的可见性和正确性。
- 当前 baseline 下，container targets 可能指向 detached element，surface snapshot hook 可能只是 dead subscription，form init failures 只写 host issue 而不给用户可见反馈。

## Goals

- Make React-managed runtime surfaces observe the current DOM/data contract rather than stale references or discarded subscription output.
- Ensure form initialization failure is visible on the supported user-facing baseline.
- Add focused proof for the touched React integration behaviors.

## Non-Goals

- 不接管 renderer styling contract 和 button default-type defects；那部分由 Plan `356` owning。
- 不接管 runtime scope lifecycle defects；那部分由 Plan `351` owning。
- 不做 generic error-boundary rearchitecture。

## Scope

### In Scope

- `R1-4`
- `R1-5`
- `R2-7`
- `packages/flux-react/src/{container-hooks.ts,dialog-host-surface.tsx}`
- `packages/flux-renderers-form/src/renderers/form.tsx`
- focused tests and relevant docs
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/surface-owner.md`
- `docs/architecture/form-validation.md` only if the supported form-init failure visibility baseline needs owner-doc-visible wording there
- `docs/logs/2026/05-18.md`

### Out Of Scope

- `R2-5`
- `R2-6`
- `R3-1`
- global debugger or generic page-surface failure behavior

## Execution Plan

### Phase 1 - Freeze React Surface Visibility Baseline

Status: completed
Targets: touched React/renderer files, focused tests, owner docs

- Item Types: `Decision | Proof`

- [x] Re-audit the stale-ref, discarded-subscription, and invisible-init-failure behaviors as one React surface visibility family.
- [x] Record one supported baseline for container registration, surface snapshot subscription semantics, and user-visible init failure behavior.
- [x] Add or update focused proof for each in-scope defect.

Exit Criteria:

- [x] The plan records one explicit supported baseline for the three in-scope behaviors.
- [x] Focused proof exists for container registration, surface snapshot behavior, and form init error visibility.
- [x] Owner-doc impact for `R2-7` is explicitly decided: `No owner-doc update required` is explicit for that surface because the owner docs did not promise the broken invisible-failure behavior.
- [x] Owner-doc update needs are explicitly decided.
- [x] `docs/logs/2026/05-18.md` records the baseline decision.

### Phase 2 - Land React Surface Visibility Fixes

Status: completed
Targets: `packages/flux-react/src/{container-hooks.ts,dialog-host-surface.tsx}`, `packages/flux-renderers-form/src/renderers/form.tsx`

- Item Types: `Fix | Proof`

- [x] Fix `R1-4` so container registration tracks the live DOM element rather than a stale detached ref target.
- [x] Fix `R1-5` so `useSurfaceScopeSnapshot()` has one honest supported behavior: return/useful value or removal if dead.
- [x] Fix `R2-7` so form initialization failure becomes visible on the supported user-facing baseline instead of remaining console-only.
- [x] Keep focused proof green for all three in-scope defects after implementation.

Exit Criteria:

- [x] Touched React-managed surfaces no longer depend on stale refs or discarded subscription output.
- [x] Form init failures have one honest user-visible supported behavior.
- [x] Focused proof is green for all three in-scope defects.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-18.md` records the landed fix.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-18.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis, live code/docs/tests, and verification results.

Exit Criteria:

- [x] Focused verification for all in-scope defects has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned React surface visibility blocker.
- [x] This plan's statuses, checklists, closure gates, and daily-log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`R1-4`, `R1-5`, `R2-7`) are fixed.
- [x] React integration and surface visibility converge to one supported baseline.
- [x] Necessary focused verification exists for every touched defect family.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. Container registration now rebinds against live DOM element changes, `useSurfaceScopeSnapshot(...)` returns the selected snapshot value instead of dropping it, and form init failures are visible on the supported user-facing baseline.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit `ses_1c66e86ebffeUQPLe8MOl7YoC6`.
- Evidence: the fresh reviewer re-checked `packages/flux-react/src/{container-hooks.ts,dialog-host-surface.tsx}` and the already-landed visible init-failure behavior in `packages/flux-renderers-form/src/renderers/form.tsx`, plus focused React/dialog tests, and reported `353` closure-ready with no remaining plan-owned blockers.

Follow-up:

- None.
