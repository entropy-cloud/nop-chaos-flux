# 376 Deep Audit 2026-05-19 Spreadsheet Context-Menu Test Decomposition Plan

> Plan Status: partially completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `02-04` 与 `14-02`：拆分 oversized spreadsheet context-menu suite，并消除重复内联 `SpreadsheetGridHarness`。

## Current Baseline

- Live repo no longer contains `packages/spreadsheet-renderers/src/__tests__/context-menu-operations.test.tsx`.
- The spreadsheet context-menu coverage is already decomposed across `context-menu-structure.test.tsx`, `context-menu-state-and-resize.test.tsx`, and `context-menu-fill-and-range.test.tsx`.
- `packages/spreadsheet-renderers/src/__tests__/spreadsheet-grid-harness.tsx` exists as shared spreadsheet test support and is reused by the context-menu suites plus `grid-selection.test.tsx`.
- Remaining closure work is proof-only: confirm the spreadsheet retained findings stay fixed and record that the repo-wide oversized hard gate still fails only on unrelated files.

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
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm check:oversized-code-files`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: In-scope spreadsheet test decomposition is landed and focused proof is green, but the plan is not yet closable because `pnpm check:oversized-code-files` still fails on unrelated hard-gate offenders and no independent closure audit was recorded.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: focused proof run on 2026-05-19 showed `16` passing spreadsheet-renderer test files / `104` tests via `pnpm --filter @nop-chaos/spreadsheet-renderers test -- --runInBand src/__tests__/context-menu-structure.test.tsx src/__tests__/context-menu-state-and-resize.test.tsx src/__tests__/context-menu-fill-and-range.test.tsx src/__tests__/grid-selection.test.tsx src/__tests__/schema-integration.test.tsx`; `pnpm check:oversized-code-files` still fails on unrelated files `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `packages/flux-react/src/__tests__/schema-renderer.test.tsx`, and `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts`.
