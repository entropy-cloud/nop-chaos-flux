# 378 Deep Audit 2026-05-19 Import-Stack Suite Decomposition Plan

> Plan Status: completed
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

Status: completed
Targets: import-stack tests and helpers

- Item Types: `Fix | Proof`
- [x] Split the oversized suite into narrower test files.
- [x] Deduplicate repeated helpers into a shared helper path if needed.

Exit Criteria:

- [x] `02-06` and `14-04` are fixed.
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

Status Note: Completed. The in-scope import-stack suite decomposition remains landed, the independent closure audit found no remaining in-scope semantic gap, and workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are green.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent `ses_1beedbcceffeL502P1qtU4bOQv`
- Evidence:
  - `packages/flux-runtime/src/__tests__/import-stack.test.ts` now covers only `push`, `pop`, `resolveAlias`, `currentBindings`, `preload`, `dispose`, and `frames`, and is reduced to `419` lines.
  - `packages/flux-runtime/src/__tests__/import-stack-install-prepared.test.ts` now owns the `installPrepared` contract surface (`214` lines).
  - `packages/flux-runtime/src/__tests__/import-stack-rollback.test.ts` keeps rollback-specific proof (`92` lines).
  - Shared helper ownership remains centralized in `packages/flux-runtime/src/__tests__/import-stack-test-support.ts`, which is reused by all three suites.
  - Focused verification passed: `pnpm --filter @nop-chaos/flux-runtime exec vitest run src/__tests__/import-stack.test.ts src/__tests__/import-stack-install-prepared.test.ts src/__tests__/import-stack-rollback.test.ts` (`3` files / `37` tests).
  - `pnpm --filter @nop-chaos/flux-runtime typecheck`, `build`, and `lint` passed.
  - `pnpm exec node scripts/check-oversized-code-files.mjs` no longer reports any import-stack hard-gate offender; remaining `700+` files are unrelated (`packages/flow-designer-renderers/src/designer-page-shell.test.tsx`, `scripts/audit/rules.mjs`).

Verification Evidence:

- Workspace `pnpm typecheck` is green (`49` successful tasks).
- Workspace `pnpm build` is green (`26` successful tasks).
- Workspace `pnpm lint` is green (`26` successful tasks).
- Workspace `pnpm test` is green (`49` successful tasks).
