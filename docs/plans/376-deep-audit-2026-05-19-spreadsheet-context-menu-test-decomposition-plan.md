# 376 Deep Audit 2026-05-19 Spreadsheet Context-Menu Test Decomposition Plan

> Plan Status: completed
> Last Reviewed: 2026-05-20
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `02-04` 与 `14-02`：拆分 oversized spreadsheet context-menu suite，并消除重复内联 `SpreadsheetGridHarness`。

## Current Baseline

- Live repo no longer contains `packages/spreadsheet-renderers/src/__tests__/context-menu-operations.test.tsx`.
- The spreadsheet context-menu coverage is already decomposed across `context-menu-structure.test.tsx`, `context-menu-state-and-resize.test.tsx`, and `context-menu-fill-and-range.test.tsx`.
- `packages/spreadsheet-renderers/src/__tests__/spreadsheet-grid-harness.tsx` exists as shared spreadsheet test support and is reused by the context-menu suites plus `grid-selection.test.tsx`.
- Remaining closure work was proof-only: confirm the spreadsheet retained findings stay fixed and rerun the repo-wide oversized and workspace gates on the current tree.

## Goals

- 修复 `02-04`。
- 修复 `14-02`。

## Non-Goals

- 不改 spreadsheet runtime semantics。

## Scope

### In Scope

- `02-04`, `14-02`
- `packages/spreadsheet-renderers/src/__tests__/context-menu-operations.test.tsx`
- shared test harness extraction if needed
- `docs/logs/2026/05-19.md`

### Out Of Scope

- non-test spreadsheet findings from other successor plans

## Execution Plan

### Phase 1 - Split And Deduplicate Context-Menu Tests

Status: completed
Targets: spreadsheet context-menu tests and helpers

- Item Types: `Fix | Proof`
- [x] Split the oversized suite into narrower owner-shaped test files.
- [x] Extract or reuse a shared `SpreadsheetGridHarness` instead of repeating it inline.

Exit Criteria:

- [x] `02-04` and `14-02` are fixed.
- [x] The touched suite no longer violates the oversized hard gate.
- [x] `No owner-doc update required`.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] `No owner-doc update required`.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Focused spreadsheet verification confirms the split suites and shared harness preserve the covered behavior surface.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm check:oversized-code-files`
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed. The in-scope spreadsheet decomposition remains landed, the shared harness reuse remains intact, `pnpm check:oversized-code-files` now passes with warning-only unrelated files, and the current workspace verification baseline is green.

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1bce29d43ffeuzWeLBl4keTTrn`)
- Evidence: confirmed `context-menu-operations.test.tsx` remains absent, `SpreadsheetGridHarness` reuse remains live across the split context-menu suites plus `grid-selection.test.tsx`, focused spreadsheet verification passed (`4` files / `36` tests), `pnpm check:oversized-code-files` now returns `80 warnings, 0 errors`, and repo-wide `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` all pass on the current tree.
