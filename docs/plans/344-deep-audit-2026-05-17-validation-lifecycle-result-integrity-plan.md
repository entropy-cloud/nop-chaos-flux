# 344 Deep Audit 2026-05-17 Validation Lifecycle Result Integrity Plan

> Plan Status: planned
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-17-deep-audit-full/{08-validation.md,summary.md}`, live code verification of `packages/flux-runtime/src/form-runtime-owner.ts`, `docs/plans/343-deep-audit-2026-05-17-review-completion-and-owner-routing-plan.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/178-validation-owner-bootstrap-and-hidden-participation-plan.md`, `docs/plans/323-deep-audit-2026-05-16-validation-trigger-and-diagnostics-fidelity-plan.md`

## Purpose

收口 `08-01`：validation owner 在 `disposed` 生命周期下不能把“未执行验证”伪装成普通 clean success。计划只 owning validation lifecycle result integrity，不重开 bootstrap lifecycle、trigger reason、或 hidden participation 已 closure 的 surface。

## Current Baseline

- `packages/flux-runtime/src/form-runtime-owner.ts:229-234` 的 `applyChangesAndRevalidate(...)` 在 `input.sharedState.lifecycleState === 'disposed'` 时仍返回 `{ ok: true, errors: [], fieldErrors: {} }`。
- 同文件 `validateForm(...)` 已在 owner 不可用时使用 `createLifecycleBlockedValidationResult()`，说明 live code 已有“生命周期阻塞不是 clean success”的内部基线，但 `applyChangesAndRevalidate(...)` 没有对齐。
- `docs/architecture/form-validation.md` 当前已明确：`disposed` owner 必须拒绝新验证请求；但针对 `disposed` 路径是否也需要像过渡生命周期一样显式禁止返回与“无错误”不可区分的 clean-success result，仍应在本计划中写成可审计的 doc-sync 裁定。
- `packages/flux-runtime/src/form-runtime-owner.ts:45-65` 已集中定义 lifecycle-blocked `FormValidationResult` 形状，且 `packages/flux-runtime/src/__tests__/owner-validation-lifecycle-contracts.test.ts:114-129` 已证明 sibling validation entrypoint 在 disposed 后返回 blocked result，说明 live baseline 已存在，当前缺口是 `applyChangesAndRevalidate(...)` 没有对齐该基线。
- Plan `178` 已关闭 bootstrap / hidden participation owner family；Plan `323` 已关闭 `2026-05-16/08-02` / `2026-05-16/08-03` trigger + diagnostics fidelity。当前计划不接管 `2026-05-17` audit 中另行编号的 `08-02` / `08-03`，只 owning disposed lifecycle 的结果诚实性。

## Goals

- Make `applyChangesAndRevalidate(...)` return an explicit lifecycle-blocked result when the owner is `disposed`.
- Keep the blocked-result semantics aligned with the supported validation-owner architecture and existing `validateForm(...)` baseline.
- Add focused regression proof that callers can distinguish lifecycle-blocked validation from ordinary clean success.

## Non-Goals

- 不重开 validation bootstrap lifecycle。
- 不接管 trigger reason propagation、dependent revalidation diagnostics、或 hidden-field participation。
- 不扩展 `ValidationResult` 为新的 cancellation/disposed taxonomy，除非修复 `08-01` 所必需。

## Scope

### In Scope

- `08-01`
- `packages/flux-runtime/src/form-runtime-owner.ts`
- focused tests under `packages/flux-runtime/src/__tests__/`
- `docs/architecture/form-validation.md`
- `docs/logs/2026/05-17.md`

### Out Of Scope

- `2026-05-17/08-02`
- `2026-05-17/08-03`
- `19-*`
- submit orchestration or action result semantics

## Execution Plan

### Phase 1 - Freeze Lifecycle-Blocked Result Baseline

Status: planned
Targets: `packages/flux-runtime/src/form-runtime-owner.ts`, `docs/architecture/form-validation.md`, focused tests

- Item Types: `Decision | Proof`

- [ ] Re-audit the exact disposed-owner path in `applyChangesAndRevalidate(...)` against the already-established lifecycle-blocked baseline used by sibling validation entrypoints.
- [ ] Define the narrowest focused regression proof that extends the existing disposed-owner blocked-result contract to `applyChangesAndRevalidate(...)`.

Exit Criteria:

- [ ] The plan records why `08-01` is a result-integrity residual extending an existing blocked-result baseline rather than a reopened bootstrap/trigger plan.
- [ ] Focused proof strategy is explicit for the disposed-owner path.
- [ ] `docs/architecture/form-validation.md` is updated or explicitly adjudicated for disposed-owner non-clean-success semantics.
- [ ] `docs/logs/2026/05-17.md` records the baseline decision.

### Phase 2 - Land The Disposed-Owner Result Fix

Status: planned
Targets: `packages/flux-runtime/src/form-runtime-owner.ts`, focused tests

- Item Types: `Fix | Proof`

- [ ] Change the disposed `applyChangesAndRevalidate(...)` branch so it returns an explicit lifecycle-blocked result instead of a clean-success result.
- [ ] Add or update focused tests proving disposed owners do not report `ok: true` when validation never ran.

Exit Criteria:

- [ ] The disposed-owner revalidation path no longer returns a clean-success result that is indistinguishable from “no validation errors”.
- [ ] Focused proof is green for the fixed lifecycle-blocked branch.
- [ ] `docs/architecture/form-validation.md` matches the final disposed-owner result baseline.
- [ ] `docs/logs/2026/05-17.md` records the landed fix.

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: touched runtime files, docs, this plan

- Item Types: `Proof | Decision | Fix`

- [ ] Run all focused tests added or modified in Phases 1-2.
- [ ] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after the in-scope fix lands.
- [ ] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [ ] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis, live code/tests/docs, and verification output.

Exit Criteria:

- [ ] Focused verification for `08-01` has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] `docs/architecture/form-validation.md` matches the final baseline, or `No additional owner-doc update required in Phase 3` is explicit.
- [ ] Independent closure audit confirms no remaining validation lifecycle result-integrity blocker.
- [ ] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [ ] The in-scope confirmed live defect (`08-01`) is fixed.
- [ ] The disposed-owner revalidation path (`2026-05-17/08-01`) converges to one honest lifecycle-blocked result baseline.
- [ ] Necessary focused verification exists for the disposed-owner path.
- [ ] No in-scope live defect is silently downgraded to deferred/follow-up.
- [ ] `docs/architecture/form-validation.md` is synced to the final disposed-owner result baseline.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: <<fill when completed>>

Closure Audit Evidence:

- Reviewer / Agent: <<fill when completed>>
- Evidence: <<fill when completed>>

Follow-up:

- <<fill when completed if needed>>
