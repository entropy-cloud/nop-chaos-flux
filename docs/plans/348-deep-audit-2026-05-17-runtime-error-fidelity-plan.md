# 348 Deep Audit 2026-05-17 Runtime Error Fidelity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-17-deep-audit-full/{19-error-propagation.md,summary.md}`, live code verification of `packages/flux-runtime/src/{form-runtime-owner.ts,form-runtime-validation.ts,runtime-action-helpers.ts}`, `docs/plans/343-deep-audit-2026-05-17-review-completion-and-owner-routing-plan.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/160-swallowed-exception-remediation-plan.md`, `docs/plans/331-deep-audit-2026-05-16-action-error-fidelity-and-debugger-observability-plan.md`

## Purpose

收口 `2026-05-17/19-01` / `2026-05-17/19-03` / `2026-05-17/19-04`：runtime validation/action error paths 仍把 unexpected failure 扁平化成无 cause 的 synthetic `Error` 或 synthetic validation record，导致 returned result 无法保留原始错误因果链。

## Current Baseline

- `packages/flux-runtime/src/form-runtime-owner.ts:399-411` 在 field validation throw 时记录 `console.error(...)`，但返回的 `validationError` 不带原始 `error` / `cause`。
- `packages/flux-runtime/src/form-runtime-validation.ts:433-441` 在 catch 中将 non-`Error` failure 规范化为 `new Error(String(error))`，未使用 `{ cause: error }`。
- `packages/flux-runtime/src/runtime-action-helpers.ts:46-53` 在 async validation action `result.ok === false` 且 `result.error` 不是 `Error` 时，构造新的 `Error(...)` 丢失原始 payload/cause。
- `packages/flux-core/src/types/validation.ts:27-45` 的 `ValidationError` 当前没有 `cause` / `diagnostics` 字段；这是否需要 exported contract changes 是本计划 Phase 1 需要显式裁定的设计问题，而不是既成事实。
- Plan `160` 已关闭 unhandled/swallowed async exception family；Plan `331` 已关闭 `2026-05-16/19-01`、`2026-05-16/19-03` 与 debugger/action/report-designer observability residual。当前计划只 owning `2026-05-17` audit 下的 runtime validation result-fidelity subset，需要在文本中保持 dated-ID 区分，避免把已 closure 的旧 defect id 当成 reopened scope。

## Goals

- Preserve original failure cause/payload across the in-scope runtime validation and async validation action paths.
- Ensure returned runtime error surfaces remain honest about internal failure origin instead of silently flattening to generic synthetic errors.
- Add focused proof for each touched error-fidelity path.

## Non-Goals

- 不重开 unhandled rejection / missing `.catch()` family。
- 不接管 debugger enrich telemetry 或 report-designer host action fidelity。
- 不引入大范围 observability framework；只修正 in-scope cause-preservation contract。

## Scope

### In Scope

- `2026-05-17/19-01`
- `2026-05-17/19-03`
- `2026-05-17/19-04`
- `packages/flux-runtime/src/{form-runtime-owner.ts,form-runtime-validation.ts,runtime-action-helpers.ts}`
- `packages/flux-core/src/types/validation.ts` only if the exported validation error/result contract must change
- focused tests under `packages/flux-runtime/src/__tests__/`
- `docs/architecture/form-validation.md`
- `docs/references/form-validation-runtime-types.md` if exported validation/runtime types change
- `docs/logs/2026/05-17.md`

### Out Of Scope

- `2026-05-17/19-02`
- `2026-05-16/15-02`
- generic debugger or host telemetry work
- unrelated async cancellation semantics

## Execution Plan

### Phase 1 - Freeze Runtime Error-Fidelity Baseline

Status: completed
Targets: touched runtime/core files, focused tests/docs

- Item Types: `Decision | Proof`

- [x] Re-audit the three in-scope `2026-05-17` failure paths and record one supported baseline for cause preservation in runtime validation results and async validation actions.
- [x] Decide explicitly whether the supported fix requires exported type changes (`ValidationError`, result shapes) or can stay internal without contract dishonesty.
- [x] Define focused proof for each in-scope path.

Exit Criteria:

- [x] The plan records a clean boundary against Plans `160` and `331`.
- [x] Each in-scope path has an explicit target fidelity contract.
- [x] Affected owner docs are updated if exported contracts change; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-17.md` records the baseline decision.

### Phase 2 - Land Runtime Error-Fidelity Fixes

Status: completed
Targets: touched runtime/core files, focused tests

- Item Types: `Fix | Proof`

- [x] Preserve the original cause/payload in `form-runtime-owner.ts` field-validation failure reporting.
- [x] Preserve the original cause/payload when `form-runtime-validation.ts` normalizes thrown non-`Error` failures.
- [x] Preserve the original cause/payload when `runtime-action-helpers.ts` adapts failed async validation actions.
- [x] Add or update focused tests proving the retained cause chain on the supported baseline.

Exit Criteria:

- [x] All in-scope runtime error paths preserve a truthful cause chain or equivalent supported diagnostics payload.
- [x] Focused proof is green for `2026-05-17/19-01`, `2026-05-17/19-03`, and `2026-05-17/19-04`.
- [x] `docs/architecture/form-validation.md` and, if needed, `docs/references/form-validation-runtime-types.md` match the final baseline; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-17.md` records the landed fix.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched runtime/core files/tests/docs, this plan

- Item Types: `Proof | Decision | Fix`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after the in-scope fixes land.
- [x] Record execution, verification, and evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, Plans `160` / `331`, linked analysis, live code/tests/docs, and verification output.

Exit Criteria:

- [x] Focused verification for `2026-05-17/19-01`, `2026-05-17/19-03`, and `2026-05-17/19-04` has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining runtime error-fidelity blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] The in-scope confirmed live defects (`2026-05-17/19-01`, `2026-05-17/19-03`, `2026-05-17/19-04`) are fixed.
- [x] Runtime error fidelity converges to one supported cause-preserving baseline.
- [x] Necessary focused verification exists for every touched failure path.
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

Status Note: Completed. Runtime validation and async validation action adaptation now preserve original failure causes through exported result/error surfaces, and the owner docs reflect the updated baseline.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1c9c98c7dffeT2tkRiULA7FBJX` (`general` subagent)
- Evidence: Final independent closure audit found no remaining runtime error-fidelity blocker; focused cause-preservation proof and final full verification remained green (`tool_e362d7ff6001MPuSig14CcdoVo`).

Follow-up:

- None.
