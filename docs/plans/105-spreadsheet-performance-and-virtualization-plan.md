# 105 Spreadsheet Performance And Virtualization Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Source: `docs/analysis/2026-04-16-performance-audit.md` sections 4.1-4.9, `docs/architecture/report-designer/design.md`, `docs/components/spreadsheet-page/design.md`, `docs/architecture/performance-design-requirements.md`
> Related: `docs/plans/101-performance-audit-closure-and-owner-assignment-plan.md`, `docs/plans/94-spreadsheet-command-dispatch-pattern-refactor-plan.md`

## Purpose

收口 spreadsheet surface 上仍成立的 confirmed scalability defects，包括 core bulk mutation、history/config、subscription model、grid virtualization、以及 interaction-frequency publish。

## Current Baseline

- spreadsheet grid 仍按全量 `rows * cols` 渲染 DOM。
- `setCell()` 和 `replaceAllInDocument()` 仍走 repeated large-structure cloning。
- undo depth 仍忽略 `SpreadsheetConfig.maxUndoDepth`。
- spreadsheet snapshot hook 仍未统一到 `useSyncExternalStore`。
- selection drag / fill hit test / resize 仍存在 raw mousemove frequency state publish。
- `applyCopySheet()` 仍使用 JSON clone。
- Plan 94 只拥有 `core-dispatch.ts` handler-registry 重构，不拥有这些 operation-level perf fixes。

## Goals

- 让 spreadsheet core bulk operations 走 batched mutation baseline。
- 让 history depth 与 config 对齐。
- 让 renderer 订阅模型与其余 host-store read path 一致。
- 让 grid 渲染规模与 viewport 而不是 sheet dimensions 挂钩。
- 让高频交互更新收敛到 batched publish。

## Non-Goals

- 不吸收 Plan 94 的 `core-dispatch.ts` command registry 重构。
- 不改变 spreadsheet page / report designer family 的 owner boundary。
- 不以“简化功能”为代价回退 frozen panes、selection、editing、fill handle、merged cell 契约。

## Scope

### In Scope

- `packages/spreadsheet-core/src/core/document-access.ts`
- `packages/spreadsheet-core/src/core/search-operations.ts`
- `packages/spreadsheet-core/src/core/internal-state.ts`
- `packages/spreadsheet-core/src/core/sheet-operations.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/`
- `packages/spreadsheet-renderers/src/page-renderer.tsx`
- supporting files/tests/playground validation scenarios/docs/logs

### Out Of Scope

- `core-dispatch.ts` refactor and handler extraction
- global spreadsheet canvas CSS loading mode

## Execution Plan

### Phase 1 - Core Bulk Mutation And History Baseline

Status: planned
Targets: `document-access.ts`, `search-operations.ts`, `internal-state.ts`, `sheet-operations.ts`

- [ ] batch range cell updates into single cloned cells-map writes
- [ ] batch replace-all document updates into one rewrite path
- [ ] honor `SpreadsheetConfig.maxUndoDepth`
- [ ] replace JSON clone sheet copy path

Exit Criteria:

- [ ] range operations no longer clone the large cells/document structure once per touched cell
- [ ] undo depth follows config under focused tests
- [ ] sheet copy no longer uses JSON serialize/parse cloning

### Phase 2 - Subscription Baseline Cleanup

Status: planned
Targets: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-snapshot.ts`

- [ ] replace custom state/effect subscription with `useSyncExternalStore`

Exit Criteria:

- [ ] spreadsheet snapshot reading uses `useSyncExternalStore`
- [ ] focused tests or validation confirm no subscription semantic regression

### Phase 3 - Grid Virtualization Baseline

Status: planned
Targets: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`, any needed visible-range helpers

- [ ] introduce viewport-driven row/column virtualization
- [ ] preserve frozen panes, selection, editing overlay, merged cells, and fill handle behavior

Exit Criteria:

- [ ] rendered DOM no longer scales as full `rows * cols`
- [ ] virtualized grid preserves the existing user-visible spreadsheet contract

### Phase 4 - Interaction Frequency Control

Status: planned
Targets: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts`, `use-fill-handle.ts`, `use-resize.ts`

- [ ] batch selection drag updates to animation-frame cadence
- [ ] replace or throttle fill hit testing
- [ ] batch resize updates to animation-frame cadence

Exit Criteria:

- [ ] drag/fill/resize no longer raw-publish state at mousemove frequency
- [ ] interaction correctness remains intact under focused verification

### Phase 5 - Validation And Docs Sync

Status: planned
Targets: tests/playground scenarios, `docs/analysis/2026-04-16-performance-audit.md`, `docs/logs/`

- [ ] add/update focused tests and at least one large-grid validation scenario
- [ ] reverse-update audit/log text

Exit Criteria:

- [ ] spreadsheet perf fixes are covered by repo-observable verification
- [ ] docs reflect the landed spreadsheet baseline

## Validation Checklist

- [ ] bulk mutations batched
- [ ] replace-all batched
- [ ] undo depth honors config
- [ ] sheet copy clone path fixed
- [ ] snapshot hook uses `useSyncExternalStore`
- [ ] grid virtualization landed
- [ ] drag/fill/resize frequency control landed
- [ ] focused verification completed
- [ ] independent closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: complete this section only after spreadsheet core and renderer defects in scope are closed without crossing into Plan 94 ownership.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- if a later canvas-backed spreadsheet renderer is needed, create a successor plan instead of reopening this baseline plan
