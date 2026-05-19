# 379 Deep Audit 2026-05-19 Action Control-Flow Suite Decomposition Plan

> Plan Status: planned
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

Status: planned
Targets: action control-flow tests and helpers

- Item Types: `Fix | Proof`
- [ ] Split the oversized suite into narrower owner-shaped test files.
- [ ] Reduce repeated compiled-node boilerplate through shared helpers or fixtures.

Exit Criteria:

- [ ] `02-07` and `14-05` are fixed.
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
