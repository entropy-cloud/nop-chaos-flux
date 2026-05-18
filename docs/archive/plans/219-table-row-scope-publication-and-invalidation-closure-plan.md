# 219 Table Row Scope Publication And Invalidation Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-07
> Source: `docs/architecture/dependency-tracking.md`, `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/plans/107-collection-renderer-scalability-plan.md`, live code in `packages/flux-renderers-data/src/table-renderer.tsx`, `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`, and `packages/flux-react/src/render-nodes.tsx`
> Related: `docs/plans/107-collection-renderer-scalability-plan.md`, `docs/plans/184-reactive-hot-path-precision-and-notification-scaling-plan.md`

## Purpose

把 table 已经部分落地的 row-scope reuse 和 row-local invalidation 从“owner-side实现片段”收口为明确的 live runtime baseline：同一 `rowKey` 的 materialized row 复用同一个 isolated row scope，table owner 只向受影响的 row scope 发布精确 root 变化，并用 focused tests 和 owner docs 锁定该契约。

## Current Baseline

- `docs/architecture/dependency-tracking.md` 目前同时存在两种状态：前文仍把 collection/row reconciliation 标成 `Gap 4` follow-up，但后文已经写出了 collection owner 向 row-local roots 翻译的规范性规则；真正的 drift 是“table-owner live baseline 已部分存在，但 owner docs 仍未把 table-only closure 与 generic collection gap 分开说清楚”。
- `docs/architecture/table-row-identity-and-scope-performance.md` 已要求 table row invalidation 默认止于 row boundary，并要求 row owner只发布变更的 row-local roots，同时明确禁止 render-phase row-scope cache mutation / publication。
- live table code 已有 stable `rowKey`、row scope cache、和 isolated row scope reuse：`packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts` 通过 `helpers.createScope(..., { isolate: true, source: 'row' })` 为每个 materialized row 复用 scope。
- 但当前 `useTableRowScopeCache()` 仍在 render 期变更模块级 cache、创建/驱逐 row scope、并通过逐 root `scope.merge({ record })` / `scope.merge({ index })` 分别发布 row payload，这与现有 owner doc 的 render-phase rule 不一致。
- 同一模块还保留模块级 `tableRowScopeCaches` map，组件卸载后不会回收对应 cache entry；本计划如果继续拥有 `use-table-row-scope-cache.ts`，必须把该 lifetime defect 一并收口，而不能静默忽略。
- 计划 107 明确没有重做 row scope architecture，因此本计划只收口 table-owner baseline，不宣称 generic loop/list/tree collection translation closure。

## Goals

- 为 table row owner 建立清晰的 supported baseline：row scope 按 `rowKey` 复用，row payload 以 row-local roots (`record`, `index`, optional future extras) 为单位精确发布。
- 把当前 row scope 同步从多次 root merge 收敛为单次最小 change-set publication，避免同一次 row reconciliation 产生额外中间通知。
- 增加 focused tests，证明 table owner 只对受影响 row 发布 row-local roots，且未变化的 row scope 不 republish。
- 同步 `docs/architecture/dependency-tracking.md` 与 `docs/architecture/table-row-identity-and-scope-performance.md` 到最终 live baseline，并明确 generic collection translation 仍未在本计划内完成。

## Non-Goals

- 不实现 generic loop/collection owner translation substrate。
- 不重做 `ScopeRef`、`scopeChangeHitsDependencies()`、或 runtime-wide collection metadata。
- 不扩展到 list/tree/loop row carrier 统一化。
- 不改变 table value-path/index-addressed form semantics。

## Scope

### In Scope

- `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`
- `packages/flux-renderers-data/src/table-renderer.tsx`
- `packages/flux-renderers-data/src/__tests__/data-table.test.tsx`
- `packages/flux-renderers-data/src/__tests__/table-data-and-layout.test.tsx`
- `docs/architecture/dependency-tracking.md`
- `docs/architecture/table-row-identity-and-scope-performance.md`

### Out Of Scope

- `loop` item-scope translation or any generic repeated-item runtime substrate
- `packages/flux-runtime/src/scope.ts` public contract expansion beyond what table owner already needs
- source/reaction invalidation redesign for generic row scopes

## Execution Plan

### Phase 1 - Table Row Publication Contract

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`, `packages/flux-renderers-data/src/table-renderer.tsx`, focused tests, owner docs

- Item Types: `Fix | Decision | Proof`

- [x] Move row-scope cache mutation, row-scope publication, and stale-row eviction out of render phase into an owner-controlled reconciliation step that satisfies the existing table row owner doc rule.
- [x] Replace the current per-root `merge()` sync in `useTableRowScopeCache()` with a single minimal row-payload publication path that emits only the changed row-local roots for that row reconciliation.
- [x] Keep `rowKey`-addressed scope reuse and preserve no-op behavior when both `record` and `index` are stable for an existing row.
- [x] Add explicit cache cleanup on unmount / owner-key turnover so the module-level row cache does not leak stale table entries.
- [x] Add a small helper or explicit local contract for row-scope payload diffing/publication so the table owner baseline is readable in code rather than hidden inside ad hoc `if` branches.
- [x] Add focused unit coverage using `ScopeRef.store.getLastChange()` or a row-scope spy/fake proving row payload publication emits `['record']`, `['index']`, or `['index', 'record']` as appropriate and emits nothing for unchanged rows.
- [x] Add focused cleanup coverage proving the row-scope cache entry is removed when the owning table unmounts or its owner key changes.

Exit Criteria:

- [x] Table row owner no longer mutates external row-scope cache state or publishes row-scope updates as a render-phase side effect in the supported path.
- [x] Table row owner publishes one minimal change-set per affected row reconciliation instead of multiple sequential root merges in the supported path.
- [x] Unchanged rows keep their existing scope and do not republish row-local roots.
- [x] Module-level row cache entries are cleaned up when the owning table instance unmounts or its owner key changes.
- [x] Focused tests lock both the changed-root publication contract and the row-scope cache cleanup contract.
- [x] `docs/architecture/table-row-identity-and-scope-performance.md` is updated to the final supported row owner baseline.
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Table Behavior Proof And Owner-Doc Closure

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer.tsx`, `packages/flux-renderers-data/src/__tests__/data-table.test.tsx`, `docs/architecture/dependency-tracking.md`, `docs/architecture/table-row-identity-and-scope-performance.md`

- Item Types: `Fix | Decision | Proof`

- [x] Add integration-style proof that a rerender with the same `rowKey` reuses the same row scope while row-local consumers observe updated `record` content from the reused scope.
- [x] Add explicit wording to owner docs that table already owns a supported row-local translation slice, while generic collection-owner translation for loop/list/tree remains out of scope.
- [x] Re-audit the inconsistent sections in `dependency-tracking.md` (`Gap 4` vs later normative collection/row rules) and rewrite them to describe the final table-only baseline plus remaining generic gap honestly.

Exit Criteria:

- [x] Focused integration tests prove stable row-scope reuse plus updated row-local bindings under reused scopes.
- [x] `docs/architecture/dependency-tracking.md` and `docs/architecture/table-row-identity-and-scope-performance.md` describe the final live table baseline without claiming generic collection closure.
- [x] No in-scope owner ambiguity remains between plan 107 and this plan.
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Verification And Independent Closure Audit

Status: completed
Targets: in-scope package/tests/docs, this plan

- Item Types: `Proof | Decision`

- [x] Run focused `@nop-chaos/flux-renderers-data` tests covering row scope reuse/publication behavior.
- [x] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after the code and doc changes land.
- [x] Perform an independent closure audit and revise the plan if the audit finds scope dishonesty or remaining in-scope contract drift.

Exit Criteria:

- [x] Focused verification is recorded for row publication and reuse behavior.
- [x] Workspace verification passes.
- [x] Independent closure audit confirms the plan closes the table-owned slice honestly without overclaiming generic collection translation.
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 行为/契约结果已达成
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure Note

- Final independent closure audit on 2026-05-07 confirmed the table-owned slice closes honestly: row-scope reconciliation/publication no longer runs in render, unchanged rows do not republish, owner-key turnover/unmount cleanup is covered, and owner docs now describe the supported table-only baseline without overclaiming generic collection translation.
- Final verification recorded for closure: `pnpm --filter @nop-chaos/flux-renderers-data typecheck`, `pnpm --filter @nop-chaos/flux-renderers-data build`, `pnpm --filter @nop-chaos/flux-renderers-data lint`, `pnpm --filter @nop-chaos/flux-renderers-data test`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`.

## Deferred But Adjudicated

### Generic Collection Owner Translation

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: live repo currently has a table-owner-specific row scope baseline but no generic collection-owner metadata substrate; this plan only closes the already-landable table slice and must not overclaim loop/list/tree runtime convergence.
- Successor Required: yes
- Successor Path: `docs/architecture/dependency-tracking.md` Phase 4 successor plan (not yet created)
