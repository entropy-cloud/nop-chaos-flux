# 377 Deep Audit 2026-05-19 SchemaRenderer Suite Decomposition Plan

> Plan Status: completed
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

Status: completed
Targets: `schema-renderer` test surface

- Item Types: `Fix | Proof`
- [x] Split the oversized suite by contract owner.
- [x] Keep focused proof for each resulting surface.

Exit Criteria:

- [x] `02-05` and `14-03` are fixed.
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

Status Note: Completed. The in-scope SchemaRenderer suite split remains landed, the independent closure audit found no remaining in-scope semantic gap, and workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are green.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent `ses_1bfccaf68ffe9ARbI0y9NFyyzn`
- Evidence:
  - `packages/flux-react/src/__tests__/schema-renderer.test.tsx` now keeps the root callback/import-preparation surface only.
  - `packages/flux-react/src/__tests__/schema-renderer-registry-debug.test.tsx` now owns the registry/debug/surface-runtime seam coverage.
  - Focused verification passed: `pnpm exec vitest run src/__tests__/schema-renderer.test.tsx src/__tests__/schema-renderer-registry-debug.test.tsx` in `packages/flux-react` (`2` files / `19` tests).
  - `pnpm --filter @nop-chaos/flux-react typecheck`, `build`, and `lint` passed.
  - `pnpm check:oversized-code-files` no longer reports any `packages/flux-react/src/__tests__/schema-renderer*.test.tsx` hard-gate offender; remaining hard-gate files are unrelated.
  - Workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are green.
