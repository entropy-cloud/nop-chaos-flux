# 385 Deep Audit 2026-05-19 Table Column-Settings Performance Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `15-03`：消除 table column-settings surface 中的局部 `O(n^2)` lookup。

## Current Baseline

- table column settings 当前存在局部 `O(n^2)` 查找。

## Goals

- 修复 `15-03`。
- 保留现有 behavior while reducing the hotspot.

## Non-Goals

- 不改 table/CRUD contract semantics。

## Scope

### In Scope

- `15-03`
- relevant table column-settings implementation/tests
- `docs/logs/2026/05-19.md`

### Out Of Scope

- owner-state, schema, and row a11y findings

## Execution Plan

### Phase 1 - Reduce Column-Settings Lookup Cost

Status: completed
Targets: table column-settings code and tests

- Item Types: `Fix | Proof`
- [x] Replace the local `O(n^2)` lookup path with memoized keyed lookups.
- [x] Add focused proof that preserves the supported result.

Exit Criteria:

- [x] `15-03` is fixed.
- [x] Focused proof covers the optimized path.
- [x] `No owner-doc update required`.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained finding is fixed.
- [x] `No owner-doc update required`.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed. The in-scope performance fix is landed, focused proof passed, and the current workspace verification baseline is green.

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1c0f62c9dffe4PJxn8dEuWtW0L`)
- Evidence: re-audited live `packages/flux-renderers-data/src/table-renderer.tsx` and the focused proof in `packages/flux-renderers-data/src/__tests__/data-table-columns.test.tsx`; the render path no longer performs the prior local `findIndex`/`indexOf` scans, and current workspace `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` all pass.
