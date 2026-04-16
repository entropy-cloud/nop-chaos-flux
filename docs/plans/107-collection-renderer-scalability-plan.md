# 107 Collection Renderer Scalability Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Source: `docs/analysis/2026-04-16-performance-audit.md` sections 6.3, 6.4, 10.2, `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/architecture/renderer-runtime.md`
> Related: `docs/plans/101-performance-audit-closure-and-owner-assignment-plan.md`, `docs/plans/89-scope-visible-view-and-materialization-refactor-plan.md`

## Purpose

收口 table/loop/tree collection renderer 上仍然成立的 confirmed scalability defects，重点是 row-cache publication、virtualization baseline、和 dev-only diagnostics 边界。

## Current Baseline

- table row-scope cache store 仍在 mutation 时 clone 整个 `Map`。
- table body 仍无 virtualization。
- loop/tree 仍渲染所有 materialized items。
- duplicate row-key warning 仍未限定在 dev-only diagnostics。
- Plan 89 已关闭 scope/materialization 基线；本计划不重写 row carrier 或 scope model。

## Goals

- 让 table row-cache publication 更细粒度。
- 为 table large-list render path 建立 virtualization baseline。
- 为 loop/tree large collection render 建立明确 owner outcome：落地 opt-in virtualization，或拆 successor plan 但不留下 owner ambiguity。
- 将 duplicate row-key warning 收敛为 dev-only diagnostics。

## Non-Goals

- 不重设计 row carrier / row scope model。
- 不重开 Plan 89 的 scope/materialization contract。

## Scope

### In Scope

- `packages/flux-renderers-data/src/table-renderer.tsx`
- `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`
- `packages/flux-renderers-data/src/table-renderer/table-data.ts`
- `packages/flux-renderers-basic/src/loop.tsx`
- `packages/flux-renderers-basic/src/structural-loop.tsx`
- `packages/flux-renderers-data/src/tree-renderer.tsx`
- tests/playground scenarios/docs/logs

### Out Of Scope

- form-store / field-state API changes
- row scope architecture redesign

## Execution Plan

### Phase 1 - Table Row Cache Publication

Status: planned
Targets: `use-table-row-scope-cache.ts`

- [ ] reduce whole-Map cloning and broad publication on partial row changes

Exit Criteria:

- [ ] partial row changes no longer require cloning/publishing the entire row-cache container in the audited path

### Phase 2 - Table Virtualization Baseline

Status: planned
Targets: `table-renderer.tsx`, supporting helpers/tests

- [ ] add table body virtualization aligned with current row-scope and fragment-render contracts

Exit Criteria:

- [ ] table rendering cost scales with visible rows rather than full materialized row count
- [ ] row-scope and fragment behavior remain correct under focused verification

### Phase 3 - Loop And Tree Outcome Closure

Status: planned
Targets: `loop.tsx`, `structural-loop.tsx`, `tree-renderer.tsx`

- [ ] either land opt-in virtualization for loop/tree where contract-safe, or create an explicit successor plan with preserved owner outcome

Exit Criteria:

- [ ] loop/tree scalability outcome is owner-closed by landed code or explicit successor-plan handoff
- [ ] no owner ambiguity remains for large loop/tree rendering

### Phase 4 - Dev-Only Diagnostics And Docs Sync

Status: planned
Targets: `table-data.ts`, docs/logs

- [ ] gate duplicate row-key warning to dev-only diagnostics
- [ ] reverse-update audit/log text

Exit Criteria:

- [ ] duplicate row-key diagnostics only run in dev/debug builds
- [ ] docs reflect the landed baseline

## Validation Checklist

- [ ] row-cache publication improved
- [ ] table virtualization landed
- [ ] loop/tree scalability outcome owner-closed
- [ ] duplicate row-key warning dev-only
- [ ] focused verification completed
- [ ] independent closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: complete this section only after table row-cache, table virtualization, and loop/tree scalability ownership are all closed without reopening row-scope architecture work.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- if loop/tree virtualization cannot safely land within this plan, create a named successor plan and record the handoff here
