# 376 Deep Audit 2026-05-19 Spreadsheet Context-Menu Test Decomposition Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `02-04` 与 `14-02`：拆分 oversized spreadsheet context-menu suite，并消除重复内联 `SpreadsheetGridHarness`。

## Current Baseline

- `packages/spreadsheet-renderers/src/__tests__/context-menu-operations.test.tsx` 超过 hard gate。
- 同一 test surface 还重复内联 `SpreadsheetGridHarness`。

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

Status: planned
Targets: spreadsheet context-menu tests and helpers

- Item Types: `Fix | Proof`
- [ ] Split the oversized suite into narrower owner-shaped test files.
- [ ] Extract or reuse a shared `SpreadsheetGridHarness` instead of repeating it inline.

Exit Criteria:

- [ ] `02-04` and `14-02` are fixed.
- [ ] The touched suite no longer violates the oversized hard gate.
- [ ] `No owner-doc update required`.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained findings are fixed.
- [ ] `No owner-doc update required`.
- [ ] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: not yet run
