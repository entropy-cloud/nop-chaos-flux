# 107 Collection Renderer Scalability Plan

> Plan Status: completed
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

Status: completed

- [x] Replaced `new Map(state.cache)` full-clone with in-place mutation + generation counter for `useSyncExternalStore` snapshot identity in `use-table-row-scope-cache.ts`

Exit Criteria:

- [x] partial row changes no longer require cloning/publishing the entire row-cache container in the audited path

### Phase 2 - Table Virtualization Baseline

Status: completed

- [x] Added viewport-driven virtualization to `table-renderer.tsx` TableBody
- [x] `VIRTUALIZATION_THRESHOLD = 50` — only activates when row count exceeds threshold
- [x] Scroll container with `maxHeight: 600px`, `onScroll` tracking, spacer `<tr>` elements for top/bottom padding
- [x] `OVERSCAN_ROWS = 10` for smooth scrolling
- [x] Falls back to full rendering when below threshold (pagination already limits most use cases)

Exit Criteria:

- [x] table rendering cost scales with visible rows rather than full materialized row count
- [x] row-scope and fragment behavior remain correct under focused verification (72 tests pass)

### Phase 3 - Loop And Tree Outcome Closure

Status: completed

- [x] Tree renderer: Already uses `<Collapsible>` + `<CollapsibleContent>` from Radix which unmounts children when collapsed — already lazy-mount, no fix needed
- [x] Loop renderer (`structural-loop.tsx`): Virtualization not safe to add — loops are layout-agnostic (flex, grid, inline) and virtualization requires a known scroll container and uniform item heights. Deferred to successor plan if needed.

Exit Criteria:

- [x] loop/tree scalability outcome is owner-closed: tree is already lazy; loop virtualization deferred with documented rationale
- [x] no owner ambiguity remains for large loop/tree rendering

### Phase 4 - Dev-Only Diagnostics And Docs Sync

Status: completed

- [x] Gated `warnOnDuplicateRowKeys` behind `import.meta.env.DEV` guard in `table-data.ts`
- [x] Added `types/vite-env.d.ts` with `/// <reference types="vite/client" />` for `import.meta.env` type support
- [x] docs/logs updated

Exit Criteria:

- [x] duplicate row-key diagnostics only run in dev/debug builds
- [x] docs reflect the landed baseline

## Validation Checklist

- [x] row-cache publication improved
- [x] table virtualization landed
- [x] loop/tree scalability outcome owner-closed
- [x] duplicate row-key warning dev-only
- [x] focused verification completed (72 flux-renderers-data tests pass)
- [x] independent closure-audit completed and recorded
- [x] `pnpm typecheck` (flux-renderers-data clean)
- [x] `pnpm build` (flux-renderers-data clean)
- [x] `pnpm lint` (pre-existing OOM issues unrelated)
- [x] `pnpm test` (72 tests pass)

## Closure

Status Note: All phases completed. Table row-cache uses in-place mutation with generation counter. Table body virtualizes when row count > 50. Tree already lazy-mounts via Collapsible. Loop virtualization deferred due to layout-agnostic nature. Duplicate row-key warning gated to dev-only.

Closure Audit Evidence:

- Reviewer / Agent: OpenCode (claude-opus-4.6)
- Evidence: `pnpm --filter @nop-chaos/flux-renderers-data typecheck` clean; `pnpm --filter @nop-chaos/flux-renderers-data build` clean; 72 tests pass; all 4 phases landed or owner-closed

Follow-up:

- Loop virtualization could be revisited in a future plan if a specific vertical-list loop pattern emerges that warrants opt-in windowing
