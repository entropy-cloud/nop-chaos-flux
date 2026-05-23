# 355 Open-Ended Adversarial Review 2026-05-18 Flow-Designer Integrity And Remount Safety Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-02.md` (Findings 1, 2, 3), `docs/analysis/2026-05-18-open-ended-adversarial-review-02/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/350-open-ended-adversarial-review-2026-05-18-priority-remediation-plan.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/collaboration.md`

## Purpose

收口 flow-designer integrity / remount safety surface 的 3 个 defects：`commitTransactionState()` 提交错误 transaction、`inputTreeDocument` prop 更新覆盖未保存编辑、以及 ELK layout owner 在 strict-mode remount 后失效。

## Current Baseline

Outdated Note: the bullets below capture the pre-fix flow-designer baseline. Final live status is recorded in the completed execution checklist, closure gates, and `docs/logs/2026/05-18.md`.

- `R2-1`, `R2-2`, `R2-3` 都位于 flow-designer core/renderers 交界处的数据完整性和 remount safety surface。
- 当前 live baseline 同时存在一个 transaction correctness bug、一个 host-prop-driven data-loss bug、以及一个 React remount/strict-mode stability bug。
- `docs/architecture/flow-designer/design.md` 与 `docs/architecture/flow-designer/collaboration.md` 是这个 surface 的 owner-doc baseline。

## Goals

- Make transaction commit semantics correct for the supported nested transaction baseline.
- Prevent host prop refresh from silently clobbering unsaved tree-mode edits.
- Make auto-layout remount-safe on the supported React baseline.

## Non-Goals

- 不接管 flow-designer palette/perf residual。
- 不扩展成 generic flow-designer shell redesign。
- 不接管 spreadsheet/report designer workbench behavior。

## Scope

### In Scope

- `R2-1`
- `R2-2`
- `R2-3`
- `packages/flow-designer-core/src/core/transactions.ts`
- `packages/flow-designer-renderers/src/{designer-tree-mode.tsx,use-designer-auto-layout.ts}`
- focused tests and relevant docs
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/collaboration.md`
- `docs/logs/2026/05-18.md`

### Out Of Scope

- flow-designer styling/palette residuals
- report designer / spreadsheet designer behaviors
- unrelated command adapter cleanup

## Execution Plan

### Phase 1 - Freeze Flow-Designer Integrity Baseline

Status: completed
Targets: touched flow-designer files, focused tests, owner docs

- Item Types: `Decision | Proof`

- [x] Re-audit transaction commit behavior, tree-mode prop replacement behavior, and remount-safe auto-layout as one integrity family.
- [x] Record one supported baseline for transaction ownership, host prop replacement semantics, and auto-layout remount behavior.
- [x] Add or update focused proof for each in-scope defect before implementation.

Exit Criteria:

- [x] The plan records one explicit supported baseline for the three in-scope behaviors.
- [x] Focused proof exists for transaction correctness, unsaved-edit preservation, and remount-safe auto-layout.
- [x] Owner-doc update needs are explicitly decided as `No owner-doc update required`; the current flow-designer docs did not encode the broken commit/overwrite/remount behavior and remain compatible with the fixed baseline.
- [x] `docs/logs/2026/05-18.md` records the baseline decision.

### Phase 2 - Land Integrity And Remount-Safety Fixes

Status: completed
Targets: touched flow-designer core/renderers files

- Item Types: `Fix | Proof`

- [x] Fix `R2-1` so `commitTransactionState()` commits the requested transaction rather than the wrong stack entry.
- [x] Fix `R2-2` so host `inputTreeDocument` updates no longer silently overwrite unsaved edits on the supported baseline.
- [x] Fix `R2-3` so auto-layout ownership remains valid across supported remount / strict-mode behavior.
- [x] Keep focused proof green for all three in-scope defects after implementation.

Exit Criteria:

- [x] Flow-designer transaction and host-refresh behaviors match one explicit supported integrity baseline.
- [x] Auto-layout is remount-safe on the supported React baseline.
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
- [x] Independent closure audit confirms no remaining plan-owned flow-designer integrity blocker.
- [x] This plan's statuses, checklists, closure gates, and daily-log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`R2-1`, `R2-2`, `R2-3`) are fixed.
- [x] Flow-designer integrity and remount safety converge to one supported baseline.
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

Status Note: Completed. `commitTransactionState()` now respects an explicit target index of `0`, tree-mode host replacement is blocked only while local edits diverge and allowed again after realignment, and auto-layout recreates its ELK owner after cleanup so strict-mode remounts do not reuse invalidated state.

Closure Audit Evidence:

- Reviewer / Agent: fresh independent closure audit `ses_1c63fd605ffeJCKRcr7zDfq3aD`.
- Evidence: the fresh reviewer re-checked `packages/flow-designer-core/src/core/transactions.ts`, `packages/flow-designer-renderers/src/{designer-tree-mode.tsx,use-designer-auto-layout.ts}`, focused proofs `core-graph.test.ts`, `designer-page.tree-history.test.tsx`, and `auto-layout-guards.test.tsx`, and confirmed the plan is closure-ready after plan/log sync with no remaining plan-owned blocker.

Follow-up:

- None.
