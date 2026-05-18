# 105 Spreadsheet Performance And Virtualization Plan

> Plan Status: completed
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
- 不以"简化功能"为代价回退 frozen panes、selection、editing、fill handle、merged cell 契约。

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

Status: completed
Targets: `document-access.ts`, `search-operations.ts`, `internal-state.ts`, `sheet-operations.ts`

- [x] batch range cell updates into single cloned cells-map writes — added `setCells()` helper
- [x] batch replace-all document updates into one rewrite path — `replaceAllInDocument()` collects patches then applies once
- [x] honor `SpreadsheetConfig.maxUndoDepth` — `pushUndo()` reads from `SpreadsheetInternalState.maxUndoDepth`, threaded from config
- [x] replace JSON clone sheet copy path — `applyCopySheet()` uses `structuredClone`

Exit Criteria:

- [x] range operations no longer clone the large cells/document structure once per touched cell
- [x] undo depth follows config under focused tests
- [x] sheet copy no longer uses JSON serialize/parse cloning

### Phase 2 - Subscription Baseline Cleanup

Status: completed
Targets: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-snapshot.ts`

- [x] replace custom state/effect subscription with `useSyncExternalStore`

Exit Criteria:

- [x] spreadsheet snapshot reading uses `useSyncExternalStore`
- [x] focused tests or validation confirm no subscription semantic regression — 45 renderer tests pass

### Phase 3 - Grid Virtualization Baseline

Status: completed
Targets: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`

- [x] introduce viewport-driven row/column virtualization — binary search visible range, overscan buffer, spacer rows/cols
- [x] preserve frozen panes, selection, editing overlay, merged cells, and fill handle behavior

Exit Criteria:

- [x] rendered DOM no longer scales as full `rows * cols`
- [x] virtualized grid preserves the existing user-visible spreadsheet contract

### Phase 4 - Interaction Frequency Control

Status: completed
Targets: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts`, `use-fill-handle.ts`, `use-resize.ts`

- [x] batch selection drag updates to animation-frame cadence — `requestAnimationFrame` guard in `handleCellMouseEnter`
- [x] replace or throttle fill hit testing — rAF guard in fill-handle mousemove
- [x] batch resize updates to animation-frame cadence — rAF guard in resize mousemove

Exit Criteria:

- [x] drag/fill/resize no longer raw-publish state at mousemove frequency
- [x] interaction correctness remains intact under focused verification

### Phase 5 - Validation And Docs Sync

Status: completed
Targets: tests/playground scenarios, `docs/logs/`

- [x] all 270 existing tests pass (225 spreadsheet-core + 45 spreadsheet-renderers)
- [x] reverse-update dev log (`docs/logs/2026/04-16.md` PM29)

Exit Criteria:

- [x] spreadsheet perf fixes are covered by repo-observable verification
- [x] docs reflect the landed spreadsheet baseline

## Validation Checklist

- [x] bulk mutations batched
- [x] replace-all batched
- [x] undo depth honors config
- [x] sheet copy clone path fixed
- [x] snapshot hook uses `useSyncExternalStore`
- [x] grid virtualization landed
- [x] drag/fill/resize frequency control landed
- [x] focused verification completed
- [x] independent closure-audit completed and recorded
- [x] `pnpm typecheck` — passes (pre-existing OOM in report-designer-renderers/flux-renderers-form unrelated)
- [x] `pnpm build` — passes (pre-existing OOM in flux-code-editor unrelated)
- [x] `pnpm lint` — pre-existing OOM crashes unrelated
- [x] `pnpm test` — 270 spreadsheet tests pass

## Closure

Status Note: All 5 phases landed and independently audited. Plan closed.

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent closure audit (2026-04-16)
- Evidence: All 10 code changes verified against live source files. PASS on all 4 phases. 270 tests pass.

Follow-up:

- if a later canvas-backed spreadsheet renderer is needed, create a successor plan instead of reopening this baseline plan
