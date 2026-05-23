# 351 Open-Ended Adversarial Review 2026-05-18 Runtime Scope Lifecycle And Isolation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-03.md` (Findings 1, 2, 3), `docs/analysis/2026-05-18-open-ended-adversarial-review-02/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/350-open-ended-adversarial-review-2026-05-18-priority-remediation-plan.md`, `docs/architecture/scope-ownership-and-isolation.md`, `docs/architecture/surface-owner.md`

## Purpose

收口 runtime scope lifecycle / isolation surface 的 3 个 live defects：复合作用域订阅在释放后存活、`HostProjectionScope` 释放后仍可读、以及 `createSurfaceScope` 通过 `initialData` 快照绕过隔离边界。

## Current Baseline

Outdated Note: the bullets below capture the defect baseline before the in-scope runtime fixes landed. Final live status is recorded in the completed execution checklist, closure gates, and `docs/logs/2026/05-18.md`.

- `R3-1`, `R3-2`, `R3-3` 都属于 `flux-runtime` 的 scope ownership / disposal / isolation 同一结果面。
- 这组问题集中在 `packages/flux-runtime/src/{scope.ts,runtime-host-projection-scope.ts,action-adapter.ts}`，不等同于历史上已关闭的 generic dual-state 或 surface historical double-state reopen 条目。
- 当前 live baseline 同时存在两个 lifecycle asymmetry（dispose 后仍订阅、dispose 后仍可读）和一个隔离语义绕过（surface scope 把 parent visible snapshot 烘焙进 `initialData`）。
- `docs/architecture/scope-ownership-and-isolation.md` 与 `docs/architecture/surface-owner.md` 是本 surface 的 owner-doc baseline；如果实现改变了 supported isolation/disposal 语义，必须同步它们。

## Goals

- Ensure disposed scope-like objects do not keep live subscriptions or readable post-disposal state.
- Restore one honest isolation baseline for surface-created child scopes.
- Add focused proof for disposal and isolation semantics so this owner surface does not regress silently.

## Non-Goals

- 不接管 compiler `cidState` idempotency。
- 不接管 form validation residual 或 flow-designer remount residual。
- 不重构整个 scope system，只修复当前 plan-owned lifecycle/isolation defect family。

## Scope

### In Scope

- `R3-1`
- `R3-2`
- `R3-3`
- `packages/flux-runtime/src/{scope.ts,runtime-host-projection-scope.ts,action-adapter.ts,runtime-factory.ts}`
- focused tests under `packages/flux-runtime/src/**/__tests__/*` or adjacent runtime tests
- `docs/architecture/scope-ownership-and-isolation.md`
- `docs/architecture/surface-owner.md`
- `docs/logs/2026/05-18.md`

### Out Of Scope

- `R1-8`
- `R2-2`
- `R3-4`
- generic runtime performance cleanup unrelated to disposal/isolation semantics

## Execution Plan

### Phase 1 - Freeze Scope Disposal And Isolation Baseline

Status: completed
Targets: touched runtime files, owner docs, focused tests

- Item Types: `Decision | Proof`

- [x] Re-audit the create/dispose/read matrix for composite scopes, projection scopes, and surface scopes.
- [x] Record one supported post-dispose contract for projection/composite scopes and one supported isolation contract for surface-created child scopes.
- [x] Add or update focused proof that reproduces the three in-scope defects before landing fixes.

Exit Criteria:

- [x] The plan records one explicit supported baseline for disposal and surface-isolation behavior.
- [x] Focused proof exists for post-dispose subscription/read behavior and surface-scope isolation behavior.
- [x] `docs/architecture/scope-ownership-and-isolation.md` / `docs/architecture/surface-owner.md` update needs are explicitly decided as `No owner-doc update required`; the landed lexical-inheritance and inert-after-dispose behavior matches the current owner-doc baseline.
- [x] `docs/logs/2026/05-18.md` records the baseline decision.

### Phase 2 - Land Symmetric Disposal And Honest Isolation Semantics

Status: completed
Targets: `packages/flux-runtime/src/{scope.ts,runtime-host-projection-scope.ts,action-adapter.ts,runtime-factory.ts}`

- Item Types: `Fix | Proof`

- [x] Fix `R3-1` so composite-scope parent subscriptions are released when the owning scope is disposed.
- [x] Fix `R3-2` so disposed `HostProjectionScope` instances no longer behave like live readable scopes.
- [x] Fix `R3-3` according to the Phase 1 baseline decision so surface scope creation no longer violates the supported isolation contract chosen for closure.
- [x] Keep focused proof green for all three defects after the implementation change.

Exit Criteria:

- [x] No in-scope disposed scope object keeps a live subscription or readable live-state contract contrary to the supported baseline.
- [x] Surface-created child scopes match one explicit supported isolation baseline.
- [x] Focused proof is green for all three in-scope defects.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-18.md` records the landed fix.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched runtime tests/docs, this plan

- Item Types: `Proof | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-18.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis, live code/docs/tests, and verification results.

Exit Criteria:

- [x] Focused verification for all in-scope defects has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned lifecycle/isolation blocker.
- [x] Closure audit explicitly re-checks `R3-1`, `R3-2`, and `R3-3` against final evidence so none can silently drop out of scope.
- [x] This plan's statuses, checklists, closure gates, and daily-log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`R3-1`, `R3-2`, `R3-3`) are fixed.
- [x] Runtime scope lifecycle and isolation converge to one supported baseline.
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

Status Note: Completed. `createSurfaceScope(...)` now inherits from `ctx.scope` lexically instead of freezing parent-visible snapshots, disposed composite/projection scopes are inert and unreadable, and runtime-owned child scope disposal calls the owning scope's actual `dispose()` path.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit `ses_1c66e86ebffeUQPLe8MOl7YoC6`.
- Evidence: the fresh reviewer re-checked `packages/flux-runtime/src/{runtime-factory.ts,scope.ts,runtime-host-projection-scope.ts}` plus focused tests `scope-lifecycle-leak-fix.test.ts`, `runtime-dialogs-scope.drawer-and-dispose.test.ts`, and `runtime-dialogs-scope.dialog-state.test.ts`, and reported `351` closure-ready with no remaining plan-owned blockers.

Follow-up:

- None.
