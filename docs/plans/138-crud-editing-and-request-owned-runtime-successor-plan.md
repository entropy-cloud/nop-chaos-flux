# 138 CRUD Editing And Request-Owned Runtime Successor Plan

> Plan Status: planned
> Last Reviewed: 2026-04-25
> Source: `docs/plans/136-crud-workflow-completion-plan.md`, `docs/components/crud/design.md`, `docs/components/table/design.md`, `docs/components/form/design.md`, `docs/architecture/action-interaction-state.md`, live repo audit of `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flux-renderers-data/src/crud-schema.ts`, and current focused CRUD tests
> Related: `docs/plans/136-crud-workflow-completion-plan.md`, `docs/plans/137-crud-table-heavy-parity-successor-plan.md`

## Purpose

这份计划承接 Plan 136 关闭后的 CRUD editing/runtime extension scope：`quickEdit`、`quickSaveAction`、`quickSaveItemAction`、`clientMode.loadDataOnce`、`syncLocation`，以及 API/request-owned `source` 驱动的 CRUD workflow。

## Current Baseline

- Plan 136 已完成的 CRUD baseline 只证明数组型 `source` 与内部 query/pagination/sort/filter/selection 参数流。
- `packages/flux-renderers-data/src/crud-renderer.tsx` 当前对 `source` 仍只接受数组；非数组 `source` 会退回 `EMPTY_ROWS`。
- `packages/flux-renderers-data/src/crud-schema.ts` 已声明 `quickEdit`、`quickSaveAction`、`quickSaveItemAction`、`clientMode`、`syncLocation`、`autoGenerateQueryForm` 等契约字段，但 runtime 未落地。
- 当前 docs 已明确这些能力仍未实现，不应误读为 live parity。

## Goals

- 为 CRUD 的 editing/runtime extension scope 建立单独 owner plan，避免与 table-heavy parity 混在一起。
- 收敛 API/request-owned `source` 驱动的 CRUD baseline。
- 收敛 `quickEdit` / quick save / clientMode / syncLocation 的 live baseline、focused tests、docs/examples。

## Non-Goals

- 不重新打开 Plan 136 已完成的 CRUD workflow baseline。
- 不在本计划中收口 richer `columnSettings`、responsive expansion、header search/filter UI。
- 不在本计划中直接宣称 AMIS CRUD full parity 完成。

## Scope

### In Scope

- `packages/flux-renderers-data/src/crud-renderer.tsx` 中与 request-owned source workflow、query sync、editing/runtime extensions 相关的实现
- `packages/flux-renderers-data/src/crud-schema.ts` 和相关 docs/examples/playground 的 runtime 对齐
- focused CRUD tests covering request-owned source / quick edit / clientMode / syncLocation baseline

### Out Of Scope

- richer table-heavy parity
- 完整 AMIS CRUD full-parity closure
- 通用迁移 CLI

## Execution Plan

### Phase 1 - Freeze Editing And Request-Owned Baseline

Status: planned
Targets: `docs/components/crud/design.md`, `packages/flux-renderers-data/src/crud-schema.ts`, `packages/flux-renderers-data/src/crud-renderer.tsx`

- [ ] 明确 request-owned `source` workflow 的目标 baseline
- [ ] 明确 `quickEdit` / quick save / `clientMode` / `syncLocation` 中哪些要在本计划落地，哪些继续后置

Exit Criteria:

- [ ] editing/runtime target baseline 在 plan 与 docs 中明确
- [ ] 与 table-heavy successor 的边界清晰

### Phase 2 - Land Request-Owned CRUD Source Workflow

Status: planned
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, focused CRUD tests, playground CRUD lab

- [ ] 让 CRUD 与 request-owned / source-owned workflow 形成明确的 live baseline，而不再只有数组型 `source`
- [ ] 收敛 `api -> source` canonical target 到真正可观察的运行时语义

Exit Criteria:

- [ ] 至少一条 focused test 证明 request-owned/source-owned CRUD baseline 成立
- [ ] docs/examples/playground 与该 baseline 一致

### Phase 3 - Land Editing And Query-Sync Extensions

Status: planned
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, related table/form integration, focused tests, docs/examples

- [ ] 落地 `quickEdit` / `quickSaveAction` / `quickSaveItemAction` baseline
- [ ] 评估并落地 `clientMode.loadDataOnce` / `fetchOnFilter` / `matchFunc` baseline
- [ ] 评估并落地 `syncLocation` / primitive query parsing baseline

Exit Criteria:

- [ ] 每项 landed extension 都有 focused tests
- [ ] 未 landed extension 明确保留在 docs/plan out-of-scope，而非保持模糊

### Phase 4 - Docs, Verification, And Closure Audit

Status: planned
Targets: CRUD docs/examples, playground CRUD lab, daily log, this plan

- [ ] 同步 docs/examples/playground
- [ ] 运行 package/workspace verification
- [ ] 做独立 closure audit

Exit Criteria:

- [ ] docs/examples/playground 与 live editing/request-owned baseline 一致
- [ ] 独立 closure audit 明确无剩余 plan-owned gap

## Validation Checklist

- [ ] request-owned/source-owned CRUD baseline 具备 focused behavior tests
- [ ] quick edit / quick save baseline 具备 focused behavior tests
- [ ] `clientMode` / `syncLocation` baseline 具备 focused behavior tests or are explicitly deferred
- [ ] CRUD docs/examples/playground 已同步
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: pending

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- After this plan and Plan 137 close, a later successor can own AMIS CRUD full-parity / migration closure audit.
