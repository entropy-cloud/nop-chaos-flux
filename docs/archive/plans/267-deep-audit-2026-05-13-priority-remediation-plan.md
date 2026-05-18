# 267 Deep Audit 2026-05-13 Priority Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/262-deep-audit-2026-05-13-structural-owner-successor-plan.md`, `docs/plans/264-deep-audit-2026-05-13-layout-contract-and-theme-boundary-successor-plan.md`, `docs/plans/265-deep-audit-2026-05-13-reactive-owner-boundary-successor-plan.md`, `docs/plans/266-deep-audit-2026-05-13-async-lifecycle-owner-successor-plan.md`, `docs/plans/268-deep-audit-2026-05-13-validation-owner-successor-plan.md`, `docs/plans/269-deep-audit-2026-05-13-accessibility-and-test-gate-successor-plan.md`, `docs/plans/270-deep-audit-2026-05-13-host-contract-error-fidelity-and-performance-successor-plan.md`, `docs/plans/271-deep-audit-2026-05-13-doc-and-plan-baseline-successor-plan.md`

## Purpose

把 `2026-05-13-deep-audit-batch1` 的 66 个最终 retained IDs 从“分析结果”收口为“可执行 owner 队列”。

这份计划是 owner-routing 与 priority-queue plan，不是直接修完全部 retained items 的单一实现计划。它的职责只有三件事：

- 统一解释本 batch summary 中两套统计口径，给出单一 retained-ID baseline。
- 给每个 retained ID 指定且只指定一个当前 owner plan。
- 规定哪些 owner plans 承接本轮最高优先级修复，哪些承接较低优先级 structural/doc/test-governance residual。

完成态要求：所有 retained IDs 都有且只有一个显式 owner；不存在 still-live defect / contract drift / owner-doc drift / hard-gate issue 处于 ownerless 状态；所有 successor plans 都符合 `00-plan-authoring-and-execution-guide.md` 的最低结构要求。

## Current Baseline

- `docs/analysis/2026-05-13-deep-audit-batch1/summary.md` 顶部的 `54` / `49` / `14` / `5` 是按“深挖发现复核结果”计数：54 个复核发现里，49 个最终保留，其中 14 个是降级后保留，5 个被驳回。
- 同一份 summary 的 P1/P2/P3 表格列的是 remediation owner matrix 要覆盖的最终 retained IDs，共 `66` 个：P1=`10`、P2=`42`、P3=`14`。
- 零发现维度 `03`、`09` 已完成独立复核，本计划不重开这两个维度的零发现结论。
- 已驳回条目 `01-01`, `04-01`, `04-02`, `15-02`, `18-02` 不进入 retained owner matrix。
- 现有 successor plans `262`, `264`, `265`, `266` 只能覆盖本批 retained IDs 的一部分；本计划需要补齐缺失的 owner buckets，而不是把剩余条目留在 umbrella plan 本身。
- 由于这是一份 docs-only routing plan，closure 只要求 retained-ID matrix 和 successor ownership 完整，不要求在本计划内直接完成代码修复或运行 workspace verification。

## Goals

- 为 summary 表格中的 66 个 retained IDs 建立一份一对一 owner matrix。
- 把 10 个 P1 retained IDs 全部路由到明确的 execution owner plans，不允许停留在 umbrella plan 或泛化 follow-up 中。
- 为高风险 P2 retained IDs 指定优先执行 owner plans，使后续实现计划可以直接按 bucket 开工。
- 为低优先级 structural/doc/test-governance residual 指定 successor ownership 或合法 residual bucket，避免 silent debt。
- 让所有被引用的 successor plans 至少达到 `planned` 且结构完整，可被后续执行或再拆分。

## Non-Goals

- 不在本计划内直接修复 66 个 retained IDs。
- 不运行 `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test` 作为本计划的 closure 条件；这些验证属于后续代码执行 plans。
- 不重开已驳回条目或零发现维度。
- 不把 ownerless retained items 临时挂在“以后再说”的非阻塞 follow-up 下。

## Scope

### In Scope

- `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`
- `docs/plans/262-deep-audit-2026-05-13-structural-owner-successor-plan.md`
- `docs/plans/264-deep-audit-2026-05-13-layout-contract-and-theme-boundary-successor-plan.md`
- `docs/plans/265-deep-audit-2026-05-13-reactive-owner-boundary-successor-plan.md`
- `docs/plans/266-deep-audit-2026-05-13-async-lifecycle-owner-successor-plan.md`
- `docs/plans/268-deep-audit-2026-05-13-validation-owner-successor-plan.md`
- `docs/plans/269-deep-audit-2026-05-13-accessibility-and-test-gate-successor-plan.md`
- `docs/plans/270-deep-audit-2026-05-13-host-contract-error-fidelity-and-performance-successor-plan.md`
- `docs/plans/271-deep-audit-2026-05-13-doc-and-plan-baseline-successor-plan.md`
- `docs/logs/` 对应执行日期条目

### Out Of Scope

- 任何代码修复本身
- 任意新增 retained finding 的 open-ended 深挖
- 与本 batch retained matrix 无关的历史 plan 清理

## Execution Plan

### Phase 1 - Normalize The Retained-ID Baseline

Status: completed
Targets: `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`, this plan

- Item Types: `Decision | Proof`

- [x] Reconcile the summary's review-count stats with the retained-ID table stats and record the distinction in this plan.
- [x] Build the canonical retained-ID matrix from the summary tables only, excluding rejected IDs and zero-finding dimensions.
- [x] Verify that the matrix contains exactly 66 retained IDs with no duplicates and no omissions.

Exit Criteria:

- [x] The plan text clearly distinguishes review-result counts from retained-ID counts.
- [x] Every retained ID from the summary tables appears exactly once in the matrix.
- [x] `No owner-doc update required` is recorded for this docs-only routing phase.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 2 - Route Existing Successor Owners

Status: completed
Targets: `docs/plans/262-deep-audit-2026-05-13-structural-owner-successor-plan.md`, `docs/plans/264-deep-audit-2026-05-13-layout-contract-and-theme-boundary-successor-plan.md`, `docs/plans/265-deep-audit-2026-05-13-reactive-owner-boundary-successor-plan.md`, `docs/plans/266-deep-audit-2026-05-13-async-lifecycle-owner-successor-plan.md`

- Item Types: `Decision | Fix | Proof`

- [x] Update Plan 262 so its scope explicitly owns `01-02`, `02-01`, `02-02`, `02-03`, `02-04`, and `12-03`.
- [x] Update Plan 264 so its scope explicitly owns `10-01` and `10-02`.
- [x] Update Plan 265 so its scope explicitly owns `05-01`, `05-02`, `05-03`, `05-04`, `07-01`, `07-02`, `07-03`, and `07-06`.
- [x] Update Plan 266 so its scope explicitly owns `06-01`, `06-02`, `06-03`, `06-04`, `07-04`, `07-05`, `07-07`, and `08-01`.

Exit Criteria:

- [x] Plans 262, 264, 265, and 266 each have explicit in-scope retained IDs matching the matrix.
- [x] No retained ID assigned to an existing successor remains ambiguous or ownerless.
- [x] `No owner-doc update required` is recorded for this docs-only routing phase.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 3 - Create Missing Successor Owner Plans

Status: completed
Targets: `docs/plans/268-deep-audit-2026-05-13-validation-owner-successor-plan.md`, `docs/plans/269-deep-audit-2026-05-13-accessibility-and-test-gate-successor-plan.md`, `docs/plans/270-deep-audit-2026-05-13-host-contract-error-fidelity-and-performance-successor-plan.md`, `docs/plans/271-deep-audit-2026-05-13-doc-and-plan-baseline-successor-plan.md`

- Item Types: `Fix | Decision | Proof`

- [x] Create Plan 268 for the validation/owner-contract bucket: `04-03`, `08-02`, `08-03`, `08-04`.
- [x] Create Plan 269 for the accessibility/test-gate bucket: `12-01`, `14-01`, `14-02`, `14-03`, `14-04`, `14-05`, `14-06`, `14-07`, `14-08`, `14-09`, `20-01`, `20-02`, `20-03`, `20-04`.
- [x] Create Plan 270 for the host-contract/error-fidelity/performance bucket: `12-02`, `12-04`, `13-01`, `13-02`, `13-03`, `15-01`, `15-03`, `15-04`, `15-05`, `18-03`, `19-01`, `19-02`, `19-03`.
- [x] Create Plan 271 for the doc/plan/naming baseline bucket: `16-01`, `16-02`, `16-03`, `16-04`, `16-05`, `16-06`, `16-07`, `17-01`, `17-02`, `17-03`, `18-01`.

Exit Criteria:

- [x] Plans 268-271 exist and each contains a guide-compliant planned execution structure.
- [x] Every retained ID not owned by Plans 262/264/265/266 is owned by exactly one new successor plan.
- [x] `No owner-doc update required` is recorded for this docs-only routing phase.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 4 - Closure Audit For Routing Honesty

Status: completed
Targets: this plan, successor plans, retained-ID matrix, daily log

- Item Types: `Proof | Decision | Fix`

- [x] Run an independent routing audit with a fresh subagent that re-reads this plan, the summary, and every referenced successor plan.
- [x] Fix any duplicated, missing, or semantically misrouted retained ID before closure.
- [x] Record closure evidence proving no confirmed retained item is left without an execution owner.

Exit Criteria:

- [x] Independent audit concludes the retained-ID matrix is complete and one-to-one.
- [x] No confirmed retained item is silently downgraded to a vague follow-up.
- [x] `No owner-doc update required` is recorded for this docs-only routing phase.
- [x] Daily log records routing completion and closure evidence.

## Closure Gates

> 这是纯文档 owner-routing plan。关闭条件是 retained owner matrix 与 successor ownership 完整，而不是代码已经全部修复。

- [x] All 66 retained IDs have exactly one current owner in the matrix.
- [x] All 10 P1 retained IDs are routed to explicit execution owner plans.
- [x] No confirmed live defect, contract drift, owner-doc drift, or hard-gate issue remains ownerless.
- [x] Every referenced successor plan exists and is at least `planned` with guide-compliant scope and exit criteria.
- [x] Independent closure audit is completed and recorded with evidence.

## Deferred But Adjudicated

None. This plan may not use deferred classification to hide ownerless retained IDs.

## Non-Blocking Follow-ups

None. Follow-ups may only be added after a retained item already has explicit successor ownership.

## Retained-ID Matrix

### Plan 262 - Structural Owner Successor

- `01-02`, `02-01`, `02-02`, `02-03`, `02-04`, `12-03`

### Plan 264 - Layout Contract And Theme Boundary Successor

- `10-01`, `10-02`

### Plan 265 - Reactive Owner Boundary Successor

- `05-01`, `05-02`, `05-03`, `05-04`, `07-01`, `07-02`, `07-03`, `07-06`

### Plan 266 - Async Lifecycle Owner Successor

- `06-01`, `06-02`, `06-03`, `06-04`, `07-04`, `07-05`, `07-07`, `08-01`

### Plan 268 - Validation Owner Successor

- `04-03`, `08-02`, `08-03`, `08-04`

### Plan 269 - Accessibility And Test-Gate Successor

- `12-01`, `14-01`, `14-02`, `14-03`, `14-04`, `14-05`, `14-06`, `14-07`, `14-08`, `14-09`, `20-01`, `20-02`, `20-03`, `20-04`

### Plan 270 - Host Contract, Error Fidelity, And Performance Successor

- `12-02`, `12-04`, `13-01`, `13-02`, `13-03`, `15-01`, `15-03`, `15-04`, `15-05`, `18-03`, `19-01`, `19-02`, `19-03`

### Plan 271 - Doc And Plan Baseline Successor

- `16-01`, `16-02`, `16-03`, `16-04`, `16-05`, `16-06`, `16-07`, `17-01`, `17-02`, `17-03`, `18-01`

### Totals Reconciliation

- P1 retained IDs: 10
- P2 retained IDs: 42
- P3 retained IDs: 14
- Total retained IDs: 66

## Closure

Status Note: owner-routing closure is complete. The retained-ID matrix is one-to-one, all successor plans exist, and no batch-1 retained item remains ownerless.

Closure Audit Evidence:

- Reviewer / Agent: independent routing audit subagent `ses_1ded2dbb8ffeCRzAy09BcgcZHw`
- Evidence: independent re-audit confirmed the matrix in this plan covers all 66 retained IDs exactly once, the eight successor plans exist, and each successor plan scopes the IDs assigned here; no retained item remained ownerless after the routing pass.

Follow-up:

- Successor plans own all later code and doc execution work.
