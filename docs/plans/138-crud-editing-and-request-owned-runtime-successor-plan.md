# 138 CRUD Editing And Request-Owned Runtime Successor Plan

> Plan Status: completed
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

Status: completed
Targets: `docs/components/crud/design.md`, `packages/flux-renderers-data/src/crud-schema.ts`, `packages/flux-renderers-data/src/crud-renderer.tsx`

- [x] 明确 request-owned `source` workflow 的目标 baseline
- [x] 明确 `quickEdit` / quick save / `clientMode` / `syncLocation` 中哪些要在本计划落地，哪些继续后置

Exit Criteria:

- [x] editing/runtime target baseline 在 plan 与 docs 中明确
- [x] 与 table-heavy successor 的边界清晰

### Phase 2 - Land Request-Owned CRUD Source Workflow

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, focused CRUD tests, playground CRUD lab

- [x] 让 CRUD 与 request-owned / source-owned workflow 形成明确的 live baseline，而不再只有数组型 `source`
- [x] 收敛 `api -> source` canonical target 到真正可观察的运行时语义
- [x] 修复 request-owned proof 中的 owner-scope refresh contract 与 dependency-less source invalidation loop，确保 focused request-owned test 可稳定结束

Exit Criteria:

- [x] 至少一条 focused test 证明 request-owned/source-owned CRUD baseline 成立
- [x] docs/examples/playground 与该 baseline 一致
- [x] request-owned refresh proof 不再因 CRUD scope publication 触发 dependency-less `data-source` refresh loop

### Phase 3 - Land Editing And Query-Sync Extensions

Status: in progress
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, related table/form integration, focused tests, docs/examples

- [x] 落地第一版 `quickEdit` / `quickSaveAction` / `quickSaveItemAction` baseline
- [x] 落地第一版 `clientMode.loadDataOnce` / `fetchOnFilter` baseline
- [x] 明确将 `syncLocation` / primitive query parsing baseline 后置，不在当前 Phase 3 收口
- [x] 明确将 `clientMode.matchFunc` baseline 后置，不在当前 Phase 3 收口

Exit Criteria:

- [x] 已 landed 的 `quickEdit` baseline 有 focused tests
- [x] 当前未 landed extension 在 plan/docs 中保持显式 deferred
- [x] 已 landed 的 `clientMode.loadDataOnce` / `fetchOnFilter` baseline 有 focused tests
- [x] `syncLocation` / primitive query parsing 在当前 plan state 中被显式 deferred，而不是保持模糊
- [x] `clientMode.matchFunc` 在当前 plan state 中被显式 deferred，而不是保持模糊

### Phase 4 - Docs, Verification, And Closure Audit

Status: completed
Targets: CRUD docs/examples, playground CRUD lab, daily log, this plan

- [x] 同步 docs/examples/playground
- [x] 运行 package/workspace verification
- [x] 做独立 closure audit

Exit Criteria:

- [x] docs/examples/playground 与 live editing/request-owned baseline 一致
- [x] 独立 closure audit 明确无剩余 plan-owned gap

## Validation Checklist

- [x] request-owned/source-owned CRUD baseline 具备 focused behavior tests
- [x] quick edit / quick save baseline 具备 focused behavior tests
- [x] `clientMode` / `syncLocation` baseline 具备 focused behavior tests or are explicitly deferred
- [x] CRUD docs/examples/playground 已同步
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: completed. Plan-owned CRUD editing/runtime scope is landed and independently re-audited clean. Remaining workspace lint/test noise is outside this plan's owned files and does not block closure.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent
- Evidence: `task_id: ses_23c4c10a0ffelzd3faTDRoVl8z`

Follow-up:

- After this plan and Plan 137 close, a later successor can own AMIS CRUD full-parity / migration closure audit.

## Documentation Follow-Up

- Phase 1 baseline is now explicit: the first request-owned/source-owned CRUD slice does not invent a CRUD-private fetch protocol. Instead, CRUD accepts common upstream source result objects such as `{ items, total }`, `{ rows, total }`, `{ records, total }`, or `{ list, total }` from scope/data-source publication and preserves upstream total in `$crud.total` while applying local query filtering to visible rows.
- Phase 2 baseline now also has a request-owned refresh path: CRUD can consume a real upstream `data-source` result object via `source`, and `component:refresh` on CRUD can re-enter that upstream owner through `onRefresh: { action: 'refreshSource', targetId }` instead of inventing a CRUD-local request protocol.
- Phase 2 request-owned proof required two live fixes before it became stable: CRUD `onRefresh` must keep the owner scope when delegating to `refreshSource`, and the runtime source-registry invalidation path must not treat dependency-less sources as “refresh on every scope write”. Without those fixes, CRUD's own `$crud` / `$_crud.*` scope publication could keep retriggering the upstream source and leave the focused test hanging.
- Phase 3 now has a broader but still intentionally narrow live `quickEdit` slice through the table-backed CRUD bridge: columns with `quickEdit: true`, `quickEdit: { saveImmediately }`, inline `quickEdit.body`, or `quickEdit.mode: 'dialog'` render editors on the existing row scope and reuse the same `quickSaveItemAction` / `quickSaveAction` bridge. The current dialog mode is a local quick-edit dialog shell, not a convergence of CRUD quick-edit with the managed `openDialog` surface-runtime path.
- Phase 3 also now has a first `clientMode` baseline for request-owned/source-owned CRUD: when `clientMode.loadDataOnce` is true, query submit/reset stay local by default and do not re-enter upstream query refresh actions; when `clientMode.fetchOnFilter` is also true, those query actions opt back into upstream source refresh while CRUD still applies its local visible-row filtering to the refreshed result set.
- `syncLocation` and primitive query parsing are now explicitly deferred from this plan's live runtime scope. They are useful only when CRUD query state must participate in page-level navigation, refresh persistence, or shareable deep links, and that routing/state-ownership slice is broader than the current Phase 3 goal.
- `clientMode.matchFunc` is also explicitly deferred from this plan's live runtime scope. It becomes valuable only once the repo needs a shared contract for custom client-side record matching beyond the current default local filtering behavior, and that matching contract is broader than the narrow `loadDataOnce` baseline landed here.
- Phase 4 closure evidence is now recorded. The independent closure audit found no remaining plan-owned gaps after docs/playground sync and quick-save fallback coverage were added. Plan-owned verification passed with focused CRUD tests plus `flux-renderers-data` and `flux-playground` typecheck/build; ambient workspace noise remains limited to an unrelated `apps/playground/src/component-lab/renderers/dynamic-renderer-lab-page.tsx` lint failure and non-blocking playground build chunk warnings.
