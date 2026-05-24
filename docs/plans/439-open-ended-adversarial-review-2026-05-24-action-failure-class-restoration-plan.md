# 439 Open-Ended Adversarial Review 2026-05-24 Action Failure-Class Restoration Plan

> Plan Status: completed
> Last Reviewed: 2026-05-24
> Source: `docs/analysis/2026-05-24-open-ended-adversarial-review-01/round-04.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/425-deep-audit-2026-05-21-runtime-error-propagation-fidelity-plan.md`, `docs/plans/436-open-ended-adversarial-review-2026-05-24-contract-and-host-truthfulness-routing-plan.md`

## Purpose

修复 shared action engine 中 `cancelled` / `timedOut` 与 failure-class 语义的 live drift，让 action classification、`onError`、chain-abort behavior、focused proof、以及 owner docs 重新回到当前已裁定的 supported baseline。

## Current Baseline

- `R24-04`: `docs/analysis/2026-05-24-open-ended-adversarial-review-01/round-04.md` 已确认 `packages/flux-action-core/src/action-core.ts` 把 `cancelled` / `timedOut` 分类为独立 `'cancelled'` class，而不是 `docs/architecture/action-algebra-formal-spec.md` / `docs/architecture/action-scope-and-imports.md` 当前定义的 failure-class。
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts` 因此只在 `resultClass === 'failure'` 时执行 `onError` 并中断主链，导致 cancelled/timedOut 结果跳过 `onError` 且继续执行后续 actions。
- `packages/flux-action-core/src/__tests__/cancelled-class-and-error-guard.test.ts` 当前锁定了这种 drift behavior，因此当前问题不仅是实现 drift，也是 focused proof drift。
- 已完成计划 `425` 已把 cancellation / timeout / failure fidelity 的 active baseline收敛为 failure-class semantics。本计划承接的是 live implementation/test residual，不重新打开一个抽象 redesign decision。

## Goals

- 修复 `R24-04`。
- 让 shared action engine 的 cancelled/timedOut behavior 再次符合当前 active owner docs 和 Plan `425` 已裁定的 failure-class baseline。
- 让 focused tests 证明最终 live semantics，而不是继续锁定 drift。

## Non-Goals

- 不把 confirmed live defect 重新包装成“是否要改 docs”的开放式决策题。
- 不扩大到 unrelated async owner / host-provider failure fidelity families already closed by Plan `425`, unless execution proves a regression in the same shared action path.

## Scope

### In Scope

- `R24-04`
- `packages/flux-action-core/src/{action-core.ts,action-dispatcher/action-execution.ts}`
- Focused tests under `packages/flux-action-core/src/__tests__/`
- `docs/architecture/{action-algebra-formal-spec.md,action-scope-and-imports.md}`
- `docs/logs/2026/05-24.md`

### Out Of Scope

- generic action algebra redesign beyond restoring the current supported failure-class baseline
- unrelated runtime/source/validation/provider error-propagation paths unless they prove to be direct regressions caused by the same shared classification logic

## Execution Plan

### Phase 1 - Re-verify Failure-Class Drift Boundary

Status: completed
Targets: live action-core code/tests, this plan, `docs/logs/2026/05-24.md`

- Item Types: `Decision | Proof`

- [x] Re-verify `R24-04` against active owner docs, Plan `425` closure baseline, live classification logic, and current focused tests.
- [x] Record explicit confirmation that this plan restores the already-supported baseline rather than reopening a design-choice debate.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R24-04` remains accurately scoped as implementation/test drift against the current supported failure-class baseline.
- [x] No owner-doc update required.
- [x] `docs/logs/2026/05-24.md` is updated.

### Phase 2 - Restore Failure-Class Semantics And Proof

Status: completed
Targets: `packages/flux-action-core/src/{action-core.ts,action-dispatcher/action-execution.ts}`, focused tests, `docs/architecture/{action-algebra-formal-spec.md,action-scope-and-imports.md}`

- Item Types: `Fix | Proof`

- [x] Restore cancelled/timedOut classification and downstream dispatcher behavior so `onError`, `onSettled`, and main-chain abort semantics match the current failure-class owner docs.
- [x] Update/rewrite the focused tests that currently lock in the drifted cancelled-class behavior.
- [x] Re-audit `docs/architecture/{action-algebra-formal-spec.md,action-scope-and-imports.md}`; no owner-doc update was required because they already described the final supported baseline.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R24-04` is fixed.
- [x] Focused proof covers cancelled/timedOut behavior for `onError`, `onSettled`, branch bindings, and main-chain continuation/abort.
- [x] `docs/architecture/{action-algebra-formal-spec.md,action-scope-and-imports.md}` are updated if needed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-24.md` is updated.

## Closure Gates

- [x] The in-scope confirmed live defect is fixed.
- [x] Shared action failure-class semantics again match the current supported baseline across code, tests, and owner docs.
- [x] Necessary focused verification is complete.
- [x] No in-scope residual is silently downgraded to deferred or follow-up.
- [x] Affected owner docs are synced to the final live baseline, or each phase explicitly records `No owner-doc update required`.
- [x] Independent subagent / independent reviewer closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Draft Review Record

- Draft created after routing plan `436` split the original umbrella proposal into owner-specific plans and draft review explicitly rejected leaving `R24-04` as a re-decision instead of a fix.
- Independent split-plan review: `accept` (`ses_1a89922ceffepLXxJNLuTtqrOy`).

## Deferred But Adjudicated

None at draft time.

## Non-Blocking Follow-ups

- Expand scope only if execution uncovers direct regressions in the same shared action-classification path; otherwise require explicit successor ownership.

## Closure

Status Note: `R24-04` is fixed in live code, focused proof and current-session workspace verification passed, and an independent closure audit found no remaining plan-owned work.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit subagent `ses_1a8678678ffeji9P1UDeRQCJQj`
- Evidence: fresh-session audit re-checked `packages/flux-action-core/src/{action-core.ts,action-dispatcher/action-execution.ts}`, the focused regression tests under `packages/flux-action-core/src/__tests__/`, and the active action-algebra owner docs, then confirmed cancelled/timedOut results again follow the supported failure-class baseline for `onError`, `onSettled`, branch bindings, and main-chain abort semantics; current-session `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` all passed.

Follow-up:

- No remaining plan-owned work.
