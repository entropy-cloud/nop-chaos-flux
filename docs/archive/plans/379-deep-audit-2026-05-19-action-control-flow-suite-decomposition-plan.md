# 379 Deep Audit 2026-05-19 Action Control-Flow Suite Decomposition Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `02-07` 与 `14-05`：拆分 oversized action control-flow edge-case suite，并减少 compiled-node boilerplate。

## Current Baseline

- `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts` 超过 hard gate。
- 同一 suite 还存在过多 compiled-node boilerplate。

## Goals

- 修复 `02-07`。
- 修复 `14-05`。

## Non-Goals

- 不改变 action control-flow supported behavior。

## Scope

### In Scope

- `02-07`, `14-05`
- `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts`
- extracted helpers if needed
- `docs/logs/2026/05-19.md`

### Out Of Scope

- action runtime behavior fixes outside the test surface

## Execution Plan

### Phase 1 - Split And Simplify Action Edge-Case Tests

Status: completed
Targets: action control-flow tests and helpers

- Item Types: `Fix | Proof`
- [x] Split the oversized suite into narrower owner-shaped test files.
- [x] Reduce repeated compiled-node boilerplate through shared helpers or fixtures.

Exit Criteria:

- [x] `02-07` and `14-05` are fixed.
- [x] The touched suite no longer violates the oversized hard gate.
- [x] `No owner-doc update required`.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] `No owner-doc update required`.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed. The in-scope action control-flow suite split remains landed, the independent closure audit found no remaining in-scope semantic gap, and workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are green.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent `ses_1bfccaf68ffe9ARbI0y9NFyyzn`
- Evidence:
  - Replaced `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts` with narrower suites: `contract-control-flow-branches.test.ts`, `contract-control-flow-parallel.test.ts`, and `contract-control-flow-timeout-cancel.test.ts`.
  - Extracted shared compiled-node fixtures into `packages/flux-action-core/src/__tests__/control-flow-test-fixtures.ts` to reduce repeated boilerplate.
  - Focused verification passed: `pnpm exec vitest run src/__tests__/contract-control-flow-branches.test.ts src/__tests__/contract-control-flow-parallel.test.ts src/__tests__/contract-control-flow-timeout-cancel.test.ts` in `packages/flux-action-core` (`3` files / `19` tests).
  - `pnpm --filter @nop-chaos/flux-action-core typecheck`, `build`, and `lint` passed.
  - `pnpm check:oversized-code-files` no longer reports the old action control-flow hard-gate suite; remaining hard-gate files are unrelated.
  - Workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are green.
