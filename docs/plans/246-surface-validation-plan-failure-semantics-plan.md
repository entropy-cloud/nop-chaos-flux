# 246 Surface Validation Plan Failure Semantics Plan

> Plan Status: completed
> Last Reviewed: 2026-05-11
> Source: `docs/analysis/2026-05-11-deep-audit-full/{summary.md,15-security-performance.md}`
> Related: `docs/plans/{201-surface-family-runtime-convergence-plan.md,242-deep-audit-2026-05-11-residual-owner-assignment-plan.md}`

## Purpose

收口 retained `15-01`：surface validation plan 编译失败时，surface 不得再以“打开成功但没有 validation owner plan”的不透明降级语义继续前进。

## Current Baseline

- `resolveSurfaceValidationPlan()` 当前在 compile failure 时 `catch` 后直接返回 `undefined`，随后 dialog/drawer 仍继续打开。
- retained defect 不仅是“吞错”，而是 compile failure 被伪装成弱化后的成功路径，host 没有结构化失败信号，也没有被文档裁定的 degrade semantics。
- `201` 已完成 surface-family runtime convergence，但不拥有这个后续发现的 validation-plan compile-failure contract gap。

## Goals

- 为 surface validation-plan compile failure 定义一个单一、诚实、可观测的支持语义。
- 确保 failure path 会进入 host-visible reporting，而不是单纯吞错继续打开。
- 用 focused tests 锁定最终 chosen semantics。

## Non-Goals

- 不重开整个 surface-family runtime convergence。
- 不把本计划扩大成通用 action compile observability program。
- 不改变与 retained defect 无关的 dialog/drawer public authoring DSL。

## Scope

### In Scope

- `packages/flux-runtime/src/action-adapter.ts`
- directly affected surface-runtime/open-path tests
- affected owner docs under `docs/architecture/` / `docs/components/` if supported semantics wording changes

### Out Of Scope

- declarative/action-opened surface parity already closed by `201`
- runtime async-data residuals owned by `244`
- flow-designer residuals owned by `245`

## Execution Plan

### Phase 1 - Freeze Supported Failure Semantics

Status: completed
Targets: `15-01`, `action-adapter.ts`, affected docs/tests

- Item Types: `Decision | Fix | Proof`

- [x] Decide the single supported behavior when surface validation plan compilation fails: fail closed, explicit degraded open with structured reporting, or another equally honest documented contract.
- [x] Implement the chosen behavior so compile failure is no longer silently translated into `undefined` + normal open.
- [x] Route the failure through the supported host-visible reporting seam.
- [x] Add focused proof for the chosen semantics on the surface open path.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `15-01` is closed.
- [x] Compile failure is no longer a silent weak-success path.
- [x] Focused tests prove the chosen surface behavior and reporting semantics.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] The plan-owned retained defect (`15-01`) is fixed.
- [x] Surface validation-plan compile failure now has one explicit supported semantics.
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

- If later audits identify broader surface-action observability gaps, route them to a separate successor rather than reopening this narrow retained-defect plan.

## Closure

Status Note: Completed. Surface validation-plan compile failure is now fail-closed with structured host-visible reporting, focused proof is present, and workspace verification is green.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent independent closure audit (`ses_1e9d55336ffeCpAIoAhaJaR1oL`)
- Evidence:
  - Fail-closed semantics landed in `packages/flux-runtime/src/action-adapter.ts`.
  - Focused proof exists in `packages/flux-runtime/src/__tests__/action-adapter.unit.test.ts` and the dialog/drawer runtime scope tests under `packages/flux-runtime/src/__tests__/runtime-dialogs-scope.*.test.ts`.
  - Owner-doc baseline was updated in `docs/architecture/surface-owner.md`, and workspace-green verification was recorded in `docs/logs/2026/05-11.md`.

Follow-up:

- None yet; broader surface-action observability work outside retained `15-01` must not be folded into this plan implicitly.
