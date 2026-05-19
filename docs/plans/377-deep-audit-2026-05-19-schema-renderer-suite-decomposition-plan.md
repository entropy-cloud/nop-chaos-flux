# 377 Deep Audit 2026-05-19 SchemaRenderer Suite Decomposition Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `02-05` 与 `14-03`：拆分 oversized `schema-renderer.test.tsx`，把混合 contract owners 分离成诚实的 test surfaces。

## Current Baseline

- `packages/flux-react/src/__tests__/schema-renderer.test.tsx` 超过 hard gate。
- 同一 suite 混合多个 contract owners。

## Goals

- 修复 `02-05`。
- 修复 `14-03`。

## Non-Goals

- 不重写 `SchemaRenderer` runtime behavior itself.

## Scope

### In Scope

- `02-05`, `14-03`
- `packages/flux-react/src/__tests__/schema-renderer.test.tsx`
- split successor test files if needed
- `docs/logs/2026/05-19.md`

### Out Of Scope

- unrelated `flux-react` tests

## Execution Plan

### Phase 1 - Split Mixed-Contract SchemaRenderer Tests

Status: planned
Targets: `schema-renderer` test surface

- Item Types: `Fix | Proof`
- [ ] Split the oversized suite by contract owner.
- [ ] Keep focused proof for each resulting surface.

Exit Criteria:

- [ ] `02-05` and `14-03` are fixed.
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
