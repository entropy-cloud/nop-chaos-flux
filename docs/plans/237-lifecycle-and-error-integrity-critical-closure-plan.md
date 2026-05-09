# 237 Lifecycle And Error Integrity Critical Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-09
> Source: `docs/analysis/2026-05-08-deep-audit-full/{06-async-safety.md,07-lifecycle.md,19-error-fidelity.md,summary.md}`
> Related: `docs/plans/{229-async-lifecycle-and-error-integrity-plan.md,234-deep-audit-2026-05-08-critical-closure-program-plan.md}`

## Purpose

收口 2026-05-08 deep audit 已确认的 lifecycle/error-integrity critical defects：retry cancellation、prepared import rollback、Flow Designer transaction rollback、以及 quick-edit 对 non-throw `ActionResult` 的成功误判。

完成态要求：这些 failure/cancellation paths 全部具备一致的 rollback 或终止语义，并有 focused proof 防止再次静默泄漏到 success path。

## Current Baseline

- `06-01`、`07-05`、`19-01`、`19-11` 已完成维度复核与子项复核，仍是 confirmed critical defects。
- 它们共享一个 owner family：失败路径或取消路径没有把 state / registry / transaction / UI success path 安全地收敛。
- 虽然这几个问题分布在不同 package，但都属于 lifecycle/error integrity closure，而不是 validation-owner 或 test-hard-gate family。

## Goals

- 让 parent cancellation、prepared import、transaction failure、quick-edit save failure 在失败路径上具备一致的 integrity semantics。
- 为每个 defect 增加 focused regression coverage。
- 明确相关 owner docs 是否需要更新，避免 silent doc drift。

## Non-Goals

- 不扩展到本轮非 critical 的 error-fidelity P2/P3 项。
- 不把计划扩大为广义 async/runtime redesign。
- 不吸收 validation-owner 或 spreadsheet canonical owner 工作。

## Scope

### In Scope

- `packages/flux-action-core/src/action-dispatcher/action-runners.ts`
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts`
- `packages/flux-action-core/src/operation-control.ts`
- `packages/flux-runtime/src/import-stack.ts`
- `packages/flow-designer-renderers/src/designer-command-adapter.ts`
- `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`
- 对应 tests
- 受影响 docs: `docs/architecture/action-scope-and-imports.md`, `docs/architecture/renderer-runtime.md`, 或显式 `No owner-doc update required`

### Out Of Scope

- non-critical error-fidelity retained set
- generic validation-owner fixes
- test hard-gate file split

## Execution Plan

### Phase 1 - Cancellation And Import Rollback Integrity

Status: completed
Targets: `action-runners.ts`, `import-stack.ts`, related tests/docs

- Item Types: `Fix | Proof`

- [x] [Fix] 修复 `06-01`：retry execution 正确继承父级 `AbortSignal`，取消后不会继续 delay/attempt，并把 retry-layer `AbortError` 归一化为 cancelled `ActionResult`。
- [x] [Fix] 修复 `07-05`：prepared import / push 在部分失败时 rollback 已注册 namespace providers。
- [x] [Proof] focused tests：parent cancellation 真正终止 retry；prepared import failure 不留 registry residue。

Exit Criteria:

- [x] cancellation 与 import rollback contract 已闭合。
- [x] focused regression tests 通过。
- [x] `No owner-doc update required`。本轮修复收紧的是取消/rollback 失败路径，不改变文档中的 author-facing runtime contract。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Transaction And Result Integrity

Status: completed
Targets: `designer-command-adapter.ts`, `table-quick-edit-controller.ts`, related tests/docs

- Item Types: `Fix | Proof`

- [x] [Fix] 修复 `19-01`：Flow Designer 复合事务在异常路径上总能 rollback/finally settle。
- [x] [Fix] 修复 `19-11`：table quick edit 必须检查 `ActionResult.ok`，`ok:false` 不能进入保存成功路径。
- [x] [Proof] focused tests：transaction failure 不留 hanging transaction；quick-edit `ok:false` 保持 error state 而非关闭成功 UI。

Exit Criteria:

- [x] transaction 与 non-throw result integrity 已闭合。
- [x] focused regression tests 通过。
- [x] `No owner-doc update required`。本轮修复收紧的是 failure-path integrity，不改变文档中的 public surface 或 authoring semantics。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: in-scope packages, this plan

- Item Types: `Proof | Decision`

- [x] [Proof] 运行 in-scope focused tests。
- [x] [Proof] 运行 `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test`。
- [x] [Decision] 独立 closure audit 确认没有通过降级文案或 follow-up 吞掉 failure-path defect。

Exit Criteria:

- [x] 所有 focused verification 通过。
- [x] Workspace verification 通过。
- [x] 独立 closure audit 明确通过。
- [x] 受影响 owner docs 已更新，或显式记录 `No owner-doc update required`。
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] 所有 in-scope lifecycle/error-integrity critical defects 已修复。
- [x] focused verification 已完成并保留为 closure blocker。
- [x] 受影响 owner docs 已同步到 live baseline，或每个 phase 已显式记录 `No owner-doc update required`。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope defect。
- [x] 独立 closure audit 已完成并记录证据。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Non-Critical Error-Fidelity Follow-Ups

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划只收口 critical lifecycle/error-integrity set；其余 retained P2/P3 error-fidelity items 需要独立 owner 继续排期。
- Successor Required: yes
- Successor Path: future error-integrity follow-up plan

## Closure

Status Note: Completed. Retry cancellation, import rollback, transaction rollback, and quick-edit `ActionResult.ok` integrity are all landed with focused proof, and the independent closure audit found no remaining failure-path blocker or silent deferral.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit task `ses_1f3d7d6fcffeN1812fS1mT7gvS`
- Evidence: refreshed audit confirmed retry cancellation in `packages/flux-action-core/src/__tests__/action-dispatcher-control-flow.test.ts`, import rollback in `packages/flux-runtime/src/__tests__/import-stack.test.ts`, transaction rollback in `packages/flow-designer-renderers/src/designer-command-adapter.test.ts` and `packages/flow-designer-renderers/src/designer-command-adapter.tree.test.ts`, and quick-edit `ok:false` handling in `packages/flux-renderers-data/src/__tests__/table-quick-edit-controller.test.tsx`; final workspace verification passed via `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`.

Follow-up:

- no remaining plan-owned work.
