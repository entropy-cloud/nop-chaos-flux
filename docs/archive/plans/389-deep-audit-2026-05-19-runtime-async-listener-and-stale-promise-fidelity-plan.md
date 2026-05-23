# 389 Deep Audit 2026-05-19 Runtime Lifecycle And Debug Fidelity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-20
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `07-03`、`07-04`、`19-01`、`19-07`：让 runtime async listener lifecycle、cleanup fallback、stale active promise semantics、以及 debug summary fidelity 回到可信 baseline。

## Current Baseline

- request parent `AbortSignal` listener 正常完成不移除。
- `ActionScope` release/dispose 缺 namespace provider fallback cleanup。
- timeout/retry path 可能复用 stale active promise。
- async-governance debug summary 丢 `stack` / `cause`。

## Goals

- 修复 `07-03`、`07-04`、`19-01`、`19-07`。
- 补 focused lifecycle/error proof。

## Non-Goals

- 不扩展到其它 runtime owner surfaces outside these four retained findings。

## Scope

### In Scope

- `07-03`, `07-04`, `19-01`, `19-07`
- relevant runtime async-data files/tests
- `docs/logs/2026/05-20.md`

### Out Of Scope

- non-adjacent runtime findings outside this lifecycle/debug surface

## Execution Plan

### Phase 1 - Fix Runtime Lifecycle And Debug Fidelity

Status: completed
Targets: runtime async-data code and focused tests

- Item Types: `Fix | Proof`
- [x] Remove listener leaks on normal completion.
- [x] Add the missing cleanup fallback on release/dispose.
- [x] Prevent stale active promise reuse across timeout/retry paths.
- [x] Preserve `stack` and `cause` in the debug summary surface.

Implemented:

- `packages/flux-runtime/src/async-data/request-runtime.ts` now clears stale aborted active requests before dedup reuse and detaches parent abort listeners in the request `finally` path.
- `packages/flux-runtime/src/action-scope.ts` now applies namespace-provider cleanup through both `dispose?.()` and fallback `release?.()` on replacement/unregister.
- `packages/flux-core/src/types/actions.ts` now exposes optional `release?(): void` on `ActionNamespaceProvider` so runtime-owned providers can advertise fallback cleanup explicitly.
- `packages/flux-runtime/src/async-data/async-governance.ts` already preserves `stack` and `cause`; focused proof now locks that owner-facing debug contract in place.
- Focused proof now lives in `packages/flux-runtime/src/__tests__/request-runtime.executor.test.ts`, `src/__tests__/action-scope-and-adaptor.test.ts`, and `src/__tests__/async-governance.test.ts`.

Exit Criteria:

- [x] `07-03`, `07-04`, `19-01`, and `19-07` are fixed.
- [x] Focused proof covers lifecycle, stale-promise, cleanup, and debug-fidelity semantics.
- [x] `No owner-doc update required`.
- [x] `docs/logs/2026/05-20.md` is updated.

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

Status Note: Completed. The runtime listener lifecycle, fallback cleanup, stale-request eviction, and debug-summary fidelity are landed, no owner-doc update was required, and the current workspace verification baseline is green.

Focused Verification Evidence:

- `pnpm --filter @nop-chaos/flux-runtime exec vitest run src/__tests__/action-scope-and-adaptor.test.ts src/__tests__/async-governance.test.ts src/__tests__/request-runtime.executor.test.ts`
- `pnpm --filter @nop-chaos/flux-runtime typecheck`

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1bce29ca2ffelWf7dD0qZl9N8b`)
- Evidence: confirmed parent abort-listener cleanup, stale-request eviction, namespace provider `dispose?.()` / `release?.()` cleanup, and debug-summary `stack` / `cause` preservation on the live tree; repo-wide `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` all pass.
