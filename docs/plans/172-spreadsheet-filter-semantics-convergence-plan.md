# 172 Spreadsheet Filter Semantics Convergence Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-01
> Source: `docs/analysis/2026-05-01-adversarial-review-follow-up.md`, `docs/logs/2026/04-25.md`, `packages/spreadsheet-core/src/core/filter-operations.ts`, `packages/spreadsheet-core/src/types.ts`
> Related: `docs/plans/154-complex-control-code-doc-convergence-implementation-plan.md`

## Purpose

收口 spreadsheet filter owner model 中已经暴露出来、但当前没有 owner plan 的语义裂缝：`WorksheetFilterState.columns` 允许多列 filter 并存，但行级 `filteredOut` 计算只按最后一次调用的单列条件重算，造成 metadata 与实际过滤效果分裂。

## Current Baseline

- `packages/spreadsheet-core/src/types.ts` 已定义 `WorksheetFilterState.columns: WorksheetColumnFilter[]`，表明 shared model 允许多个列过滤条件并存。
- `packages/spreadsheet-core/src/core/filter-operations.ts` 当前每次 `applyFilterRowsByCellValue()` 只按当前列条件重算 `rows[*].filteredOut`，却会保留先前列的 filter metadata。
- `packages/spreadsheet-core/src/__tests__/core-basics.test.ts` 当前只覆盖单列 filter 和 clear path，没有覆盖多列组合。
- `docs/logs/2026/04-25.md` 已把 `sheet.filters` 提升为“shared spreadsheet model 的显式 owner model”，因此当前 metadata/effect 分裂已经不是 harmless first slice，而是 shared owner model 的真实语义缺口。

## Goals

- 让 `sheet.filters.columns` 与 `rows[*].filteredOut` 表达同一套 live filter semantics。
- 明确 spreadsheet 当前是否支持多列组合过滤；如果支持，就实现组合判定；如果不支持，就把 model surface 收窄到单列 truth。
- 补 focused tests，防止 future filter UI 建在自相矛盾的 baseline 上。

## Non-Goals

- 不实现完整 Excel-style AutoFilter UI。
- 不新增复杂多条件/操作符/filter-builder 功能。
- 不改 report-designer broader host projection / DSL inspector work。

## Scope

### In Scope

- `packages/spreadsheet-core/src/types.ts`
- `packages/spreadsheet-core/src/core/filter-operations.ts`
- `packages/spreadsheet-core/src/__tests__/core-basics.test.ts`
- `docs/architecture/report-designer/design.md` if needed for shared spreadsheet model wording
- `docs/logs/2026/05-01.md`

### Out Of Scope

- renderer-side filter UI redesign
- report-designer inspector / page renderer changes unrelated to filter semantics

## Execution Plan

### Phase 1 - Freeze Supported Filter Semantics

Status: planned
Targets: in-scope files, scoped docs, this plan

- [ ] Re-audit current model and decide whether the supported baseline is multi-column composable filters or explicit single-column only semantics.
- [ ] Record the final supported baseline in plan notes and docs before code changes begin.

Exit Criteria:

- [ ] The plan records one explicit supported filter semantic baseline.
- [ ] `docs/logs/2026/05-01.md` is updated.

### Phase 2 - Align Model And Row Filtering Behavior

Status: planned
Targets: `packages/spreadsheet-core/src/types.ts`, `packages/spreadsheet-core/src/core/filter-operations.ts`, focused tests, scoped docs

- [ ] Implement the Phase 1 decision so `WorksheetFilterState.columns` and `rows[*].filteredOut` no longer disagree.
- [ ] Add focused tests for the supported baseline, especially the current untested multi-call path.

Exit Criteria:

- [ ] Filter metadata and row filtering behavior express the same semantics.
- [ ] Focused tests cover the supported multi-call behavior.
- [ ] Scoped docs are updated if the model wording changed.
- [ ] `docs/logs/2026/05-01.md` is updated.

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: in-scope package, focused tests, scoped docs, this plan

- [ ] Run focused verification.
- [ ] Run repo-wide required verification after code changes land.
- [ ] Perform an independent closure audit.

Exit Criteria:

- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining plan-owned work.
- [ ] `docs/logs/2026/05-01.md` records closure evidence.

## Validation Checklist

- [ ] spreadsheet filter metadata and row effect are semantically aligned
- [ ] focused tests cover the supported multi-call behavior
- [ ] independent closure audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: <<Fill when execution is complete.>>

Closure Audit Evidence:

- Reviewer / Agent: <<independent reviewer or fresh subagent>>
- Evidence: <<task id / log link / audit summary>>

Follow-up:

- Richer filter UI and multi-condition authoring should move through a separate successor plan instead of widening this one.
