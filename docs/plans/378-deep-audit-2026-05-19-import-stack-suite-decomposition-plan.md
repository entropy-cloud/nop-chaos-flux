# 378 Deep Audit 2026-05-19 Import-Stack Suite Decomposition Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `02-06` 与 `14-04`：拆分 oversized `import-stack.test.ts`，并消除重复 helper。

## Current Baseline

- `packages/flux-runtime/src/__tests__/import-stack.test.ts` 超过 hard gate。
- 同一 suite 还存在重复 helper。

## Goals

- 修复 `02-06`。
- 修复 `14-04`。

## Non-Goals

- 不顺带修改 runtime import-stack semantics。

## Scope

### In Scope

- `02-06`, `14-04`
- `packages/flux-runtime/src/__tests__/import-stack.test.ts`
- extracted test helpers if needed
- `docs/logs/2026/05-19.md`

### Out Of Scope

- runtime async/error findings owned elsewhere

## Execution Plan

### Phase 1 - Split And Deduplicate Import-Stack Tests

Status: planned
Targets: import-stack tests and helpers

- Item Types: `Fix | Proof`
- [ ] Split the oversized suite into narrower test files.
- [ ] Deduplicate repeated helpers into a shared helper path if needed.

Exit Criteria:

- [ ] `02-06` and `14-04` are fixed.
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
