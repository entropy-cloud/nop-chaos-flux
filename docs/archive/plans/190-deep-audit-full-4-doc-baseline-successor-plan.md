# 190 Deep Audit Full-4 Doc Baseline Successor Plan

> Plan Status: completed
> Last Reviewed: 2026-05-03
> Source: `docs/analysis/2026-05-03-deep-audit-full-4/summary.md`, live verification of `docs/index.md` and `docs/references/terminology.md`
> Related: `docs/plans/177-deep-audit-doc-baseline-sync-plan.md`, `docs/plans/189-deep-audit-full-4-workbench-surface-and-boundary-plan.md`

## Purpose

单独 owner `deep-audit-full-4` 中属于 doc-baseline 的残留：`docs/index.md` 的失效 plan 路由与 `ImportFrame` / `ImportStack` 术语同步缺口。该计划只收口 active docs 的当前基线，不混入 package surface、theme、或测试质量整改。

## Current Baseline

- `docs/analysis/2026-05-03-deep-audit-full-4/summary.md` 已把 `docs/index.md` / active plans 中失效 `docs/plans/*` 路由列为建议新增自动化检查项，说明 live doc routing baseline 仍可能漂移。
- 同一份 summary 的跨维度模式已点名 `import-stack` 术语/接口仍存在文档收口快于 live code 的残留。
- `Plan 177` 已完成 2026-05-02 那一轮 handbook / architecture doc sync，但不 owner 2026-05-03 新确认的 plan-route 与 glossary residual。
- `Plan 189` 已明确把这些 doc residual 排除出 workbench/package boundary owner surface，并把 owner 转交给本 successor。

## Goals

- 让 `docs/index.md` 只指向 live 有效且当前 owner 明确的 plans/doc routes。
- 让 `docs/references/terminology.md` 对 `ImportFrame` / `ImportStack` 的说明回到当前 live baseline。
- 为这类 doc-baseline residual 建立独立 closure 证据，避免再次依赖 later audit 手工兜底。

## Non-Goals

- 不修改任何生产代码。
- 不处理 package public surface、theme token、host action provider、或 playground demo CSS。
- 不扩大到与本次 residual 无关的广义 docs refresh。

## Scope

### In Scope

- `docs/index.md`
- `docs/references/terminology.md`
- any directly affected active doc that must be synced to keep these two files self-consistent
- `docs/logs/2026/05-03.md`

### Out Of Scope

- `packages/*`
- `apps/playground/*`
- `docs/architecture/*` not directly affected by the in-scope route/terminology sync
- playground BEM demo cleanup

## Closure Gates

- [x] In-scope owner docs match the live repo baseline and no longer point to stale plan routes or stale import-stack terminology
- [x] Necessary focused doc verification is completed
- [x] All affected owner docs and `docs/logs/2026/05-03.md` are synchronized to the final baseline

## Deferred But Adjudicated

### Playground Demo BEM Cleanup

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: demo-layer CSS cleanup does not affect the active doc routing or terminology baseline owned by this plan.
- Successor Required: `no`
- Successor Path: n/a

## Non-Blocking Follow-ups

- broader doc drift outside plan routing and `ImportFrame` / `ImportStack` terminology should move through a separate successor rather than widening this plan

## Execution Plan

### Phase 1 - Freeze Doc Residual Baseline

Status: completed
Targets: `docs/index.md`, `docs/references/terminology.md`, `docs/logs/2026/05-03.md`

- Item Types: `Decision | Proof`

- [x] Re-audit the live doc routing and import-stack terminology residuals against the current repo.
- [x] Freeze the final supported wording for `ImportFrame` / `ImportStack` before editing the docs.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] The plan records one final repo-observable decision for every in-scope doc residual.
- [x] Any deferred/non-blocking items have explicit justification instead of implicit omission.
- [x] `docs/logs/2026/05-03.md` records the frozen doc-baseline decisions.

### Phase 2 - Sync Active Doc Routes And Terminology

Status: completed
Targets: `docs/index.md`, `docs/references/terminology.md`, any directly affected active doc, `docs/logs/2026/05-03.md`

- Item Types: `Fix | Proof`

- [x] Remove or update stale `docs/plans/*` references in `docs/index.md` so the active routing matches the live plan set.
- [x] Update `docs/references/terminology.md` so `ImportFrame` / `ImportStack` wording matches the current live baseline.
- [x] Sync any directly affected active doc that must change for consistency with the final route/terminology baseline.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `docs/index.md` no longer routes readers to stale plan paths in this plan's scope.
- [x] `docs/references/terminology.md` matches the final supported `ImportFrame` / `ImportStack` baseline.
- [x] Any directly affected owner doc is updated to the final baseline, or `No owner-doc update required` is explicitly recorded.
- [x] `docs/logs/2026/05-03.md` is updated.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: in-scope docs, this plan

- Item Types: `Proof | Follow-up`

- [x] Run focused verification for the landed doc-route and terminology changes.
- [x] Perform an independent closure audit that re-checks the live doc routing and glossary baseline.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Focused verification is recorded for every landed doc slice.
- [x] Independent closure audit confirms no remaining in-scope doc-baseline work.
- [x] `docs/logs/2026/05-03.md` records closure evidence.

## Validation Checklist

> **关闭条件**：只有本 section 所有条目、`Closure Gates`、以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] In-scope docs match the live route and terminology baseline.
- [x] No in-scope live doc drift has been silently downgraded into deferred / follow-up.
- [x] Independent closure audit is completed and recorded.

## Closure

Status Note: All in-scope doc-baseline residuals are resolved. 6 stale archived-plan routing rows removed from `docs/index.md`, 1 stale "Then read" reference updated, and `ImportFrame`/`ImportStack`/`ImportStackEntry` glossary entries added to `docs/references/terminology.md`. Independent closure audit confirmed no remaining issues.

Closure Audit Evidence:

- Reviewer / Agent: independent subagent `ses_2123fd2e9ffe2oh7sPmVfw588i`
- Evidence: all 6 stale plan references absent from index.md; all 3 valid plan references intact; all 3 terminology entries present and consistent with live code; all remaining `docs/plans/` references point to existing files.

Follow-up:

- no remaining plan-owned doc-baseline work. Broader doc drift outside plan routing and `ImportFrame`/`ImportStack` terminology should move through a separate successor.
