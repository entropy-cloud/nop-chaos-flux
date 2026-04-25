# 137 CRUD Table-Heavy Parity Successor Plan

> Plan Status: completed
> Last Reviewed: 2026-04-25
> Source: `docs/plans/136-crud-workflow-completion-plan.md`, `docs/components/crud/design.md`, `docs/components/table/design.md`, `docs/architecture/renderer-runtime.md`, live repo audit of `packages/flux-renderers-data/src/table-renderer*`, `packages/flux-renderers-data/src/__tests__/data-table.test.tsx`, and `apps/playground/src/component-lab/renderers/crud-lab-page.tsx`
> Related: `docs/plans/136-crud-workflow-completion-plan.md`

## Purpose

这份计划承接 Plan 136 已关闭后的 CRUD/table follow-up，只收口仍未完成的 table-heavy parity：更完整的 `columnSettings`、responsive more-columns expansion、以及 header quick search/filter UI 的可用性与文档/测试基线。

## Current Baseline

- Plan 136 已完成并明确把剩余 CRUD table-heavy 工作移交 successor plans。
- `packages/flux-renderers-data/src/table-renderer.tsx` 已有 `columnSettings` 最小 live baseline：列显隐、`orderedColumnsStatePath`、本地 move-up/move-down controls。
- `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx` 已有更稳定的 header filter/search baseline：keyword search、option filter、active trigger state、以及 per-column clear action。
- `packages/flux-renderers-data/src/schemas.ts` / `crud-schema.ts` 已定义 `columnSettings.draggable/overlay`、`responsive`、`searchable`、`filterable` 等契约字段，但多数只停留在 schema surface 或基础运行时。
- `packages/flux-renderers-data/src/__tests__/data-table.test.tsx` 已覆盖 fixed columns、visible columns、ordered columns state、最小 reorder controls、inline column settings、responsive expansion、以及更稳定的 header search/filter clear-flow。

## Goals

- 把 CRUD 依赖的 table-heavy parity 收敛成独立 owner plan，而不再回灌到已完成的 Plan 136。
- 让 `columnSettings` 从最小 baseline 推进到更完整、明确的 live semantics。
- 为 responsive more-columns expansion 和 richer header search/filter UI 建立 repo-observable baseline、focused tests、playground/examples、以及文档同步。

## Non-Goals

- 不重新打开 CRUD workflow baseline 或 Plan 136。
- 不在本计划中收口 `quickEdit`、`quickSaveAction`、`quickSaveItemAction`、`clientMode.loadDataOnce`、`syncLocation`。
- 不在本计划中完成 API/request-owned CRUD workflow。

## Scope

### In Scope

- `packages/flux-renderers-data/src/table-renderer*` 中与 richer `columnSettings`、responsive expansion、header search/filter UX 相关的实现
- `packages/flux-renderers-data/src/schemas.ts` 与 `crud-schema.ts` 中这些能力的 live/runtime 对齐
- `packages/flux-renderers-data/src/__tests__/data-table.test.tsx`、必要的 CRUD follow-up tests、playground CRUD/table labs、相关 docs/examples

### Out Of Scope

- `quickEdit` / quick save runtime
- `clientMode` / `syncLocation`
- API-backed source owner 协作
- 完整 AMIS CRUD parity closure

## Execution Plan

### Phase 1 - Freeze Table-Heavy Target Baseline

Status: completed
Targets: `docs/components/crud/design.md`, `docs/components/table/design.md`, `packages/flux-renderers-data/src/schemas.ts`, `packages/flux-renderers-data/src/crud-schema.ts`

- [x] 审核并写清 `columnSettings` richer parity 的目标边界：哪些属于本计划，哪些继续后置
- [x] 明确 responsive expansion 与 header search/filter 的 live baseline 目标，不再让“契约已定义”和“语义已落地”混写

Exit Criteria:

- [x] richer `columnSettings` / responsive / header search-filter 的目标边界写入 plan 与相关 docs
- [x] 本计划的 out-of-scope 与 editing/runtime successor 边界清晰

### Phase 2 - Land Richer Column Settings Runtime

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer.tsx`, `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts`, `packages/flux-renderers-data/src/__tests__/data-table.test.tsx`, playground table/crud labs

- [x] 收口 richer `columnSettings` 运行时语义，例如 `overlay`、更稳定的 menu state、以及需要纳入本计划的 ordering/visibility UX
- [x] 明确 `draggable` 若不落地应如何在 docs/schema/playground 中表述，避免假 parity

Exit Criteria:

- [x] `columnSettings` richer baseline 具备 focused tests
- [x] docs/playground/examples 不再把未实现 parity 误写成已落地

### Phase 3 - Land Responsive Expansion And Header Search/Filter Baseline

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer*`, `packages/flux-renderers-data/src/__tests__/data-table.test.tsx`, playground table/crud labs

- [x] 为 responsive more-columns expansion 建立明确 live baseline
- [x] 收敛 header quick search/filter UI 到更稳定可验证的状态

Exit Criteria:

- [x] 至少一条 focused test 覆盖 responsive expansion baseline
- [x] 至少一条 focused test 覆盖 richer header search/filter baseline

### Phase 4 - Docs, Playground, And Closure Audit

Status: completed
Targets: `docs/components/crud/design.md`, `docs/components/table/design.md`, relevant examples, playground labs, daily log, this plan

- [x] 同步 docs/examples/playground 到最终 landed baseline
- [x] 运行 package/workspace verification
- [x] 做独立 closure audit

Exit Criteria:

- [x] docs/examples/playground 与 live table-heavy baseline 一致
- [x] 独立 closure audit 明确无剩余 plan-owned gap

## Validation Checklist

- [x] richer `columnSettings` baseline 具备 focused behavior tests
- [x] responsive expansion baseline 具备 focused behavior tests
- [x] header search/filter baseline 具备 focused behavior tests
- [x] CRUD/table docs 和 playground 示例已同步
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: completed after final independent closure audit confirmed no remaining plan-owned gap in the live repo.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent
- Evidence: `task_id: ses_23dbc4ba1ffeeZwc0ZiCB90OlY`

Follow-up:

- If richer table parity still has large leftover beyond this plan, split that remainder explicitly instead of silently reopening CRUD workflow scope.

## Documentation Follow-Up

- Phase 1 baseline is now explicit: `columnSettings` in-scope runtime means visibility toggles, ordered-column ownership, move-up/move-down ordering, and `overlay: false` inline rendering. `draggable` remains deferred until drag behavior lands.
- `responsive` in-scope baseline means table-level more-columns expansion only after a repo-observable expand/collapse UX exists; the presence of ordinary `expandable` rows does not count as CRUD responsive parity.
- header search/filter in-scope baseline means stable header-triggered keyword/filter controls with focused tests; the pre-existing minimal search/filter plumbing counts as partial groundwork, not closure evidence.
- Playground and renderer-contract follow-up for the current baseline is now landed: the CRUD lab shows inline column settings plus basic header search/filter controls, and renderer metadata now states that drag reorder is still deferred.
- Phase 3 responsive baseline is now landed as the first repo-observable more-columns baseline: when `responsive.mode: 'expand'` is active below the configured breakpoint, the table keeps the primary/fixed columns in-row and moves secondary columns into an expandable detail row. Richer trigger/layout parity is still open only if a later plan chooses to pursue it.
- Phase 3 header-control baseline is now landed: header menus use i18n-backed trigger labels, active-state signaling, and a stable per-column clear action that resets both keyword and option filters. Playground table coverage now includes a dedicated header search/filter scenario.
- Playground table coverage now also includes a dedicated responsive-expansion scenario, so both major Phase 3 baselines are visible outside focused tests.
- Independent closure audit on 2026-04-25 found one remaining plan-owned gap: `crud-renderer` was not forwarding `responsive` into the internal table schema, so CRUD had no live/table-owned responsive parity despite standalone table support. That gap is now fixed, with CRUD-focused test coverage and a dedicated CRUD lab scenario added before re-running closure audit.
- Fresh closure audit on 2026-04-25 then found two smaller remaining blockers: the CRUD lab still used stale `title`-based column examples that did not match the live table contract, and CRUD integration still lacked direct focused evidence for forwarded header search/filter behavior. Both are now fixed via CRUD lab alignment plus a dedicated CRUD header-forwarding test file.
