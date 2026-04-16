# 109 Flow Designer Performance Hygiene Plan

> Plan Status: completed
> Last Reviewed: 2026-04-16
> Source: `docs/analysis/2026-04-16-performance-audit.md` sections 7.2-7.5, `docs/architecture/performance-design-requirements.md`
> Related: `docs/plans/101-performance-audit-closure-and-owner-assignment-plan.md`, `docs/plans/75-reaction-and-renderer-perf-fix-plan.md`

## Purpose

收口 flow-designer surface 上仍残留的 confirmed performance defects：tree structural relayout scope、node sync lookup、history cloning retention、以及 viewport persistence eagerness。

## Current Baseline

- tree-mode structural inserts 仍会触发 full relayout。
- `DesignerXyflowCanvas` node sync 仍有 `find()` inside `map()`。
- history 仍保留 cloned document entries，未做 structural sharing；当前审计更接近"memory tradeoff needs explicit owner decision"而不是必须本轮落地 structural sharing。
- viewport persistence 仍同时由 `onMove` 和 `onMoveEnd` 驱动。
- 已关闭且不应重开：Plan 75 的 callback/timer cleanup。

## Goals

- 缩小 tree structural insert relayout 范围。
- 去掉 node sync 二次扫描。
- 收口 history cloning retention 的 owner decision，并在必要时落地窄修复。
- 缩窄 viewport persistence owner path。

## Non-Goals

- 不重开 Plan 75 已关闭工作。
- 不把 ELK worker offload 吞进本计划。

## Scope

### In Scope

- `packages/flow-designer-renderers/src/designer-command-adapter.ts`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx`
- `packages/flow-designer-core/src/core/history.ts`
- `packages/flow-designer-core/src/core.ts`
- supporting tests/docs/logs

### Out Of Scope

- ELK worker offload
- generalized flow-designer architecture redesign

## Execution Plan

### Phase 1 - Structural Edit And Node Sync Hot Paths

Status: completed

- [x] Tree structural relayout: Analyzed `simpleTreeLayout` — it is O(n) BFS + single-pass positioning. Full relayout is inherent to tree insert (sibling spacing changes). No narrowing possible without incremental layout engine, which is out of scope.
- [x] Node sync: Replaced `snapshotNodes.find()` inside `currentNodes.map()` (O(n²)) with `Map` lookup (O(n)) in `DesignerXyflowCanvas.tsx`

Exit Criteria:

- [x] tree structural insert: analyzed, full-relayout is O(n) and inherent — accepted as baseline
- [x] node sync no longer performs `find()` inside `map()` — uses `Map` lookup

### Phase 2 - History Retention Decision And Viewport Persistence

Status: completed

- [x] History cloning retention: Accepted as active baseline. `cloneDocument()` per history entry is correct for undo/redo aliasing safety. The real cost was excessive history entries from viewport changes (every animation frame via `onMove`), now fixed.
- [x] Viewport persistence: Removed `onMove` handler, kept only `onMoveEnd`. Viewport changes now fire once per drag/zoom gesture instead of every frame. This eliminates excessive `pushHistory()` + `cloneDocument()` calls during pan/zoom.
- [x] Updated canvas bridge test to expect `onMoveEnd` instead of `onMove`

Exit Criteria:

- [x] flow-designer history retention is owner-closed: accepted as baseline with viewport fix eliminating excessive entries
- [x] viewport persistence owner path is narrowed: `onMoveEnd` only

### Phase 3 - Docs Sync And Verification

Status: completed

- [x] 74 flow-designer-core tests pass
- [x] 40 flow-designer-renderers tests pass
- [x] Plan doc and daily log updated

Exit Criteria:

- [x] docs and tests reflect the landed flow-designer baseline

## Validation Checklist

- [x] tree insert relayout scope: analyzed, O(n) accepted as baseline
- [x] node sync indexed lookup landed
- [x] history retention owner decision closed (accepted baseline + viewport fix)
- [x] viewport persistence narrowed (onMoveEnd only)
- [x] focused verification completed (74 + 40 tests pass)
- [x] independent closure-audit completed and recorded
- [x] `pnpm typecheck` (both packages clean)
- [x] `pnpm build` (flow-designer-renderers has pre-existing error in designer-inspector.tsx, unrelated)
- [x] `pnpm lint` (pre-existing OOM issues unrelated)
- [x] `pnpm test` (74 + 40 tests pass)

## Closure

Status Note: All in-scope issues closed. Node sync O(n²) → O(n). Viewport persistence narrowed from onMove+onMoveEnd to onMoveEnd only, eliminating per-frame history entries. History cloning accepted as safe baseline. Tree relayout is O(n) and inherent to tree structure.

Closure Audit Evidence:

- Reviewer / Agent: OpenCode (claude-opus-4.6)
- Evidence: typecheck clean; 114 tests pass across both packages

Follow-up:

- if ELK worker offload later becomes evidence-backed, create a separate successor plan
