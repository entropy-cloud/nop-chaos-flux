# 245 Flow Designer Graph Fallback Bounded-Cost Plan

> Plan Status: completed
> Last Reviewed: 2026-05-11
> Source: `docs/analysis/2026-05-11-deep-audit-full/{summary.md,15-security-performance.md}`
> Related: `docs/plans/{220-cross-boundary-state-and-host-contract-closure-plan.md,227-safety-and-performance-redlines-plan.md,242-deep-audit-2026-05-11-residual-owner-assignment-plan.md}`

## Purpose

收口 retained `15-02` graph fallback complexity family，使 flow-designer 的 legacy graph insertion fallback 不再保留 avoidable O(n^2) mutation path。

## Current Baseline

- `15-02` 已合并原 `15-03`，当前 owner surface 是一个明确的 root-cause family：`designer-command-adapter.ts` 在 merge/branch/insert-chain fallback 路径上，先扫描边表，再在循环内调用会再次全量扫描/重建的 core edge API。
- retained defect 不接受“legacy/fallback path”作为降级理由；只要 live fallback 仍是支持路径，它就必须满足 bounded-cost baseline。
- `220` 已处理 earlier flow-designer owner/boundary defects，但未 owning 这个 retained graph fallback complexity family；`227` 也不覆盖 flow-designer renderer graph mutation residuals。

## Goals

- 用一次 owner 修复关闭 `15-02`（含原 `15-03`）的整族高成本 fallback mutation。
- 让 merge/branch/insert-chain fallback 都基于 bounded-cost batch transform，而不是循环内反复全表扫描。
- 用 focused proof 锁定最终 bounded-cost baseline。

## Non-Goals

- 不扩展成广义 flow-designer performance backlog。
- 不处理 auto-layout observability 或 plus-button multi-instance isolation；这些由 `247` owning。
- 不重开 tree-document / projection 设计讨论。

## Scope

### In Scope

- `packages/flow-designer-renderers/src/designer-command-adapter.ts`
- directly affected `flow-designer-core` edge-operation helpers/tests
- affected flow-designer owner docs if the supported fallback behavior wording changes

### Out Of Scope

- flow-designer host visibility / instance isolation defects owned by `247`
- runtime async-data residuals owned by `244`
- surface validation-plan compile failure semantics owned by `246`

## Execution Plan

### Phase 1 - Replace Retained High-Cost Fallback Mutation Pattern

Status: completed
Targets: `15-02`, command adapter/core edge helpers, focused tests

- Item Types: `Fix | Proof`

- [x] Replace the retained loop-inside-full-scan fallback mutations with document-level or otherwise bounded-cost batch transforms.
- [x] Cover merge, branch-pair, and insert-chain evidence paths so the merged `15-02` owner truly closes the root-cause family.
- [x] Add focused proof that the repaired path no longer depends on repeated full edge-table rescans per affected edge.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `15-02` is closed, including the former `15-03` evidence path.
- [x] Focused proof covers the retained fallback mutation family.
- [x] Any affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] The plan-owned retained defect (`15-02`) is fixed.
- [x] No retained flow-designer graph fallback path in this owner set still depends on the old repeated full-scan mutation pattern.
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

- Broader flow-designer optimization work outside the retained graph fallback family should open a separate successor instead of widening this plan.

## Closure

Status Note: Completed. The merged `15-02` fallback mutation family now uses bounded-cost document replacement paths, focused proof is present, and workspace verification is green.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent independent closure audit (`ses_1e9d55336ffeCpAIoAhaJaR1oL`)
- Evidence:
  - Bounded-cost fallback rewrites landed in `packages/flow-designer-renderers/src/designer-command-adapter.ts`.
  - Focused proof exists in `packages/flow-designer-renderers/src/designer-command-adapter.test.ts` for `insertChainNode`, `insertChainNodeAtMerge`, and `insertBranchPair` single-rewrite behavior.
  - No owner-doc update was required beyond plan/log sync because the supported fallback contract did not change; it was repaired to match the existing bounded-cost expectation.

Follow-up:

- None yet; any broader flow-designer optimization candidate outside the retained `15-02` family must stay outside this plan unless independently re-audited into scope.
