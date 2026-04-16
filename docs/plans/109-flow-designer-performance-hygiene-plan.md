# 109 Flow Designer Performance Hygiene Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Source: `docs/analysis/2026-04-16-performance-audit.md` sections 7.2-7.5, `docs/architecture/performance-design-requirements.md`
> Related: `docs/plans/101-performance-audit-closure-and-owner-assignment-plan.md`, `docs/plans/75-reaction-and-renderer-perf-fix-plan.md`

## Purpose

收口 flow-designer surface 上仍残留的 confirmed performance defects：tree structural relayout scope、node sync lookup、history cloning retention、以及 viewport persistence eagerness。

## Current Baseline

- tree-mode structural inserts 仍会触发 full relayout。
- `DesignerXyflowCanvas` node sync 仍有 `find()` inside `map()`。
- history 仍保留 cloned document entries，未做 structural sharing；当前审计更接近“memory tradeoff needs explicit owner decision”而不是必须本轮落地 structural sharing。
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

Status: planned
Targets: `designer-command-adapter.ts`, `DesignerXyflowCanvas.tsx`

- [ ] reduce tree structural insert relayout scope
- [ ] replace `find()` inside `map()` node sync with indexed lookup

Exit Criteria:

- [ ] tree structural insert no longer defaults to the audited full-relayout behavior in the named hot path
- [ ] node sync no longer performs `find()` inside `map()`

### Phase 2 - History Retention Decision And Viewport Persistence

Status: planned
Targets: `core/history.ts`, `core.ts`, `DesignerXyflowCanvas.tsx`

- [ ] decide whether current cloned-history retention should be accepted as the active baseline or narrowed with a local fix
- [ ] narrow viewport persistence so it is not eagerly published from both move paths without need

Exit Criteria:

- [ ] flow-designer history retention is owner-closed by either a landed local improvement or an explicit documented baseline decision with evidence
- [ ] viewport persistence owner path is narrowed and verified

### Phase 3 - Docs Sync And Verification

Status: planned
Targets: docs/logs/tests

- [ ] add/update focused tests
- [ ] reverse-update audit/log text

Exit Criteria:

- [ ] docs and tests reflect the landed flow-designer baseline

## Validation Checklist

- [ ] tree insert relayout scope reduced
- [ ] node sync indexed lookup landed
- [ ] history retention owner decision closed
- [ ] viewport persistence narrowed
- [ ] focused verification completed
- [ ] independent closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: complete this section only after all in-scope flow-designer issues are closed without reopening Plan 75 work or measure-first items kept out of scope.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- if ELK worker offload later becomes evidence-backed, create a separate successor plan
