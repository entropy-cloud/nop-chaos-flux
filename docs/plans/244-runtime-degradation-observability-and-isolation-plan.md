# 244 Runtime Degradation Observability And Isolation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-11
> Source: `docs/analysis/2026-05-11-deep-audit-full/{summary.md,15-security-performance.md}`
> Related: `docs/plans/{217-deep-audit-2026-05-06-confirmed-defect-remediation-plan.md,227-safety-and-performance-redlines-plan.md,242-deep-audit-2026-05-11-residual-owner-assignment-plan.md}`

## Purpose

收口 2026-05-11 retained `flux-runtime` async-data residuals：degradation failure 必须进入统一 host reporting，cascade guard 必须是 per-runtime 隔离，而不是模块级共享状态。

## Current Baseline

- `15-05` 保留的是 residual console-only degradation path：global/source cascade limit 命中后仍只写 `console.error`，host/debugger 侧看不到结构化失败。
- `15-06` 是当前 retained set 中唯一 `P1`：`reaction-runtime.ts` / `source-registry.ts` 的 depth counter 是模块级可变状态，会跨 runtime 串扰。
- `15-10` 暴露 formula data source first publish failure 只写本地 state/status，不走 `reportRuntimeHostIssue()` / `monitor.onError()`。
- Earlier plans `217` 和 `227` 已关闭 earlier async observability / redline families，但不 owner 本次 retained runtime residuals。

## Goals

- 将 retained degradation failures 全部接入统一 host reporting / monitor contract。
- 把 cascade depth ownership 下沉到 runtime-local owner，消除跨 runtime 串扰。
- 用 focused tests 证明 runtime observability 和多实例隔离基线成立。

## Non-Goals

- 不扩展成通用 tracing / observability platform。
- 不重开已被驳回的 request-runtime pre-aborted transport-boundary debate。
- 不处理与 async-data 无关的 runtime families。

## Scope

### In Scope

- `packages/flux-runtime/src/async-data/reaction-runtime.ts`
- `packages/flux-runtime/src/async-data/source-registry.ts`
- `packages/flux-runtime/src/async-data/formula-data-source-controller.ts`
- directly affected runtime factory/helpers/tests
- affected owner docs under `docs/architecture/` if the supported reporting/isolation baseline changes

### Out Of Scope

- surface-family compile failure semantics owned by `246`
- flow-designer retained defects owned by `245`
- non-retained request transport semantics

## Execution Plan

### Phase 1 - Runtime-Local Isolation For Cascade Guards

Status: completed
Targets: `15-06`, runtime async-data owner files, focused tests

- Item Types: `Fix | Proof | Decision`

- [x] Move source/reaction cascade depth counters from module-level mutable state into per-runtime or per-registry ownership.
- [x] Re-audit any helper API touched by that move so depth accounting still behaves correctly inside one runtime.
- [x] Add focused multi-runtime tests proving one runtime's cascade activity cannot trip another runtime's guard.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `15-06` is closed.
- [x] Focused proof covers at least one multi-runtime isolation scenario.
- [x] Any affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Honest Degradation Reporting

Status: completed
Targets: `15-05`, `15-10`, runtime reporting seams, focused tests/docs

- Item Types: `Fix | Proof`

- [x] Route retained cascade-limit failures through the supported runtime host-reporting seam instead of console-only logging.
- [x] Route formula source first-publish failure through the same reporting seam while preserving local status updates.
- [x] Add focused tests that assert structured reporting happens for the retained degradation paths.
- [x] Record the final supported reporting baseline in owner docs if wording changes are required.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `15-05` and `15-10` are closed.
- [x] Retained degradation paths no longer depend on console-only visibility.
- [x] Focused proof covers both cascade-limit and formula publish failure reporting.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] All plan-owned retained runtime defects (`15-05`, `15-06`, `15-10`) are fixed.
- [x] Runtime async-data isolation is no longer process-global for the retained guard counters.
- [x] Retained degraded behaviors now emit structured host-visible diagnostics.
- [x] Needed focused verification is complete.
- [x] Affected docs/logs are synced, or `No owner-doc update required` is explicitly recorded.
- [x] Independent closure audit confirms no plan-owned blocker remains.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None.

## Non-Blocking Follow-ups

- Any wider runtime tracing or debugger UX expansion beyond the retained reporting/isolation defects belongs in a separate observability plan.

## Closure

Status Note: Completed. Runtime-local cascade ownership and honest host-visible degradation reporting are now live, focused proofs are present, and the workspace verification chain is green.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent independent closure audit (`ses_1e9d55336ffeCpAIoAhaJaR1oL`)
- Evidence:
  - Runtime-local isolation and reporting landed in `packages/flux-runtime/src/async-data/{reaction-runtime.ts,source-registry.ts,formula-data-source-controller.ts}`.
  - Focused proof exists in `packages/flux-runtime/src/__tests__/{reaction-runtime.test.ts,source-registry.test.ts,action-adapter.unit.test.ts}`.
  - Owner-doc baseline was updated in `docs/architecture/api-data-source.md`, and workspace-green verification was recorded in `docs/logs/2026/05-11.md`.

Follow-up:

- None yet; non-blocking observability expansion outside `15-05`, `15-06`, and `15-10` should not be folded back into this plan implicitly.
