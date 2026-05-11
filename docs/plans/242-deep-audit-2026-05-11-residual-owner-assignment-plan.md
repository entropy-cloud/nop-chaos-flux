# 242 Deep Audit 2026-05-11 Residual Owner Assignment Plan

> Plan Status: completed
> Last Reviewed: 2026-05-11
> Source: `docs/analysis/2026-05-11-deep-audit-full/{summary.md,01-dependency-graph.md,15-security-performance.md}`
> Related: `docs/plans/{00-plan-authoring-and-execution-guide.md,188-deep-audit-2026-05-03-summary-remediation-plan.md,217-deep-audit-2026-05-06-confirmed-defect-remediation-plan.md,227-safety-and-performance-redlines-plan.md,201-surface-family-runtime-convergence-plan.md}`

## Purpose

为 2026-05-11 deep audit 仍保留的 19 个 confirmed defects 建立明确 owner map，并把它们拆分到可以独立收口的 successor plans。

这份计划只 owner 一件事：残留问题的 owner assignment、scope freeze、以及 successor completeness。它不直接 owner 代码修复执行。

## Current Baseline

- `docs/analysis/2026-05-11-deep-audit-full/summary.md` 当前保留 `19` 条：维度 01 有 `13` 条 package-boundary / manifest hygiene defects，维度 15 有 `7` 个最终保留编号（原 `15-03` 已并入 `15-02`）。
- 维度 01 的 retained set 高度同质：一条 workspace-only test-support hidden entry（`01-01`），三条测试真实导入未声明（`01-02` ~ `01-04`），九条 test-only / unused 生产依赖污染（`01-05` ~ `01-13`）。
- 维度 15 的 retained set 已按新的 v1 readonly baseline 清洗，不再包含“只因 by-reference readonly view 就成立”的误报；剩余问题集中在四个 owner surfaces：runtime degradation observability + isolation、flow-designer graph fallback bounded-cost、surface open-path compile-failure semantics、flow-designer host visibility + instance isolation。
- 现有已完成 plans 与这些 retained items 只存在相邻边界，不存在直接 owner：
  - `188` / `217` 已处理 earlier manifest hygiene slices，但未覆盖 05-11 新确认的完整 retained set。
  - `201` 已完成 surface-family runtime convergence，但未 owner `resolveSurfaceValidationPlan()` compile failure reporting / degrade semantics。
  - `227` 已关闭 05-07 safety/performance redlines，不拥有本次 05-11 retained runtime/flow residuals。
- 根据 `docs/plans/00-plan-authoring-and-execution-guide.md`，当前最稳妥的收口方式不是再写一个 omnibus remediation plan，而是先冻结 owner assignment，再把 retained items 交给窄 successor plans。

## Goals

- 让 2026-05-11 retained finding set 中每一条 confirmed defect 都有且只有一个 explicit owner。
- 把 retained set 拆成少量可执行的 successor surfaces，而不是一个同时混合 package boundary、runtime observability、surface semantics、flow-designer interaction/perf 的过宽计划。
- 为后续实现计划预先冻结 overlap 边界，避免与 `188`、`201`、`217`、`227` 的已关闭范围发生 owner 冲突。

## Non-Goals

- 不在本计划内直接落任何代码修复。
- 不重开已被驳回的 readonly-view / projection-by-reference 误报项。
- 不把“建议新增的自动化检查”直接当成与 confirmed defect 等价的 closure blocker；它们只能作为 successor plan 中的 proof/follow-up 候选。

## Scope

### In Scope

- `docs/analysis/2026-05-11-deep-audit-full/summary.md`
- `docs/analysis/2026-05-11-deep-audit-full/01-dependency-graph.md`
- `docs/analysis/2026-05-11-deep-audit-full/15-security-performance.md`
- this plan
- successor plans `243`, `244`, `245`, `246`, `247`
- `docs/logs/2026/05-11.md`

### Out Of Scope

- direct implementation code for any retained defect
- broad workspace DX/tooling expansion beyond the retained manifest defect set
- new audit dimensions or reopening adjudicated false positives

## Execution Plan

### Phase 1 - Freeze Retained Owner Surfaces

Status: completed
Targets: retained findings in `summary.md`, overlapping completed plans, this plan

- Item Types: `Decision | Proof`

- [x] Re-audit every retained 05-11 finding against live completed plans and confirm whether it already has an explicit owner.
- [x] Freeze the minimal owner-surface split that keeps package-boundary cleanup, runtime observability/isolation, flow-designer residuals, and surface compile-failure semantics separate.
- [x] Record one owner for every retained item and explicitly list any intentional overlap boundary with earlier closed plans.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Every retained 05-11 finding has exactly one explicit owner or a recorded reason why a predecessor plan already owns it.
- [x] No retained finding remains in an ambiguous “adjacent but not actually owned” state.
- [x] `docs/logs/2026/05-11.md` records the ownership freeze.
- [x] No owner-doc update required.

### Phase 2 - Author Narrow Successor Plans

Status: completed
Targets: `docs/plans/243-package-boundary-manifest-hygiene-successor-plan.md`, `docs/plans/244-runtime-degradation-observability-and-isolation-plan.md`, `docs/plans/245-flow-designer-graph-fallback-bounded-cost-plan.md`, `docs/plans/246-surface-validation-plan-failure-semantics-plan.md`, `docs/plans/247-flow-designer-host-visibility-and-instance-isolation-plan.md`

- Item Types: `Decision | Proof | Follow-up`

- [x] Author successor plan `243` for all retained dimension-01 package-boundary and manifest defects.
- [x] Author successor plan `244` for retained runtime degradation observability and per-runtime isolation defects (`15-05`, `15-06`, `15-10`).
- [x] Author successor plan `245` for retained flow-designer graph fallback bounded-cost defect (`15-02`).
- [x] Author successor plan `246` for retained surface validation-plan compile-failure semantics (`15-01`).
- [x] Author successor plan `247` for retained flow-designer host visibility and instance-isolation defects (`15-07`, `15-09`).
- [x] Ensure each successor plan follows the single-result-surface rule and names its predecessor overlap boundaries explicitly.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Successor plans `243` through `247` exist under `docs/plans/`.
- [x] Each successor plan has `Current Baseline`, `Goals`, `Non-Goals`, explicit scope, execution slices, and closure gates.
- [x] Each successor plan names the retained finding IDs it owns.
- [x] `docs/logs/2026/05-11.md` records the successor-plan handoff.

### Phase 3 - Independent Review And Consensus

Status: completed
Targets: this plan, successor plans `243`-`247`, `docs/logs/2026/05-11.md`

- Item Types: `Proof | Decision`

- [x] Run at least one fresh independent review over the owner map and successor-plan set.
- [x] Revise any successor that is still too broad, missing a retained item, or blurring predecessor boundaries.
- [x] Run at least one additional fresh independent review after revision.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] At least two fresh independent reviews have re-checked the owner map and successor plans.
- [x] Review disagreements are resolved in plan text rather than left as implicit assumptions.
- [x] `docs/logs/2026/05-11.md` records the review evidence.
- [x] No owner-doc update required.

## Owner Map

- `01-01` through `01-13`
  - Owner: `docs/plans/243-package-boundary-manifest-hygiene-successor-plan.md`
  - Reason: all retained dimension-01 items are one package-boundary / manifest-hygiene surface; splitting them further before execution would create needless plan fragmentation.

- `15-05`, `15-06`, `15-10`
  - Owner: `docs/plans/244-runtime-degradation-observability-and-isolation-plan.md`
  - Reason: these three are all `flux-runtime` async-data failures where degraded behavior is not fully reported or not runtime-local.

- `15-02`
  - Owner: `docs/plans/245-flow-designer-graph-fallback-bounded-cost-plan.md`
  - Reason: the merged `15-02` family, including the former `15-03` evidence path, is one bounded-cost graph-mutation result surface and should close with one owner.

- `15-07`, `15-09`
  - Owner: `docs/plans/247-flow-designer-host-visibility-and-instance-isolation-plan.md`
  - Reason: both are active flow-designer renderer runtime safety defects where host-visible failure state or per-instance interaction routing is currently dishonest.

- `15-01`
  - Owner: `docs/plans/246-surface-validation-plan-failure-semantics-plan.md`
  - Reason: it is a narrow surface-runtime/open-path contract issue adjacent to `201`, but not owned by `201`'s completed convergence scope.

## Deferred But Adjudicated

### Suggested New Automation Checks

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `summary.md` recommends new checks for manifest hygiene, host-reporting contracts, and multi-runtime isolation, but those are not themselves the retained live defects. Successor plans may add them as proof if they materially lock the landed fixes.
- Successor Required: `no`
- Successor Path: `n/a`

## Non-Blocking Follow-ups

- If successor execution discovers a retained item was scoped too broadly for one owner, split that successor again rather than widening this owner-assignment plan.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。本计划是 docs-only owner-assignment plan，因此不要求 workspace code verification gates。

- [x] Every retained 05-11 finding has one explicit owner.
- [x] Successor plans `243`-`247` exist and collectively cover the entire retained set.
- [x] No retained live defect is silently downgraded into a vague follow-up.
- [x] Predecessor/successor boundaries are explicit for adjacent completed plans.
- [x] Independent closure audit confirms no ownership ambiguity remains.

## Closure

Status Note: Completed. The retained 2026-05-11 owner map is frozen, successor plans `243` through `247` collectively cover the whole retained set, and independent review found no remaining ownership ambiguity.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent independent closure audit (`ses_1e9d55336ffeCpAIoAhaJaR1oL`)
- Evidence:
  - Owner map and predecessor boundaries are recorded in `docs/plans/242-deep-audit-2026-05-11-residual-owner-assignment-plan.md`.
  - Successor plan set exists at `docs/plans/{243-package-boundary-manifest-hygiene-successor-plan.md,244-runtime-degradation-observability-and-isolation-plan.md,245-flow-designer-graph-fallback-bounded-cost-plan.md,246-surface-validation-plan-failure-semantics-plan.md,247-flow-designer-host-visibility-and-instance-isolation-plan.md}`.
  - Final review confirmed no additional deferred residual beyond the existing automation-check note.

Follow-up:

- Execute successor plans `243`, `244`, `245`, `246`, and `247`.
