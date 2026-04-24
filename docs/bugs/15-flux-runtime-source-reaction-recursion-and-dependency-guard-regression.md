# 15 Flux Runtime Source/Reaction Recursion And Dependency Guard Regression

## Status

Closed on 2026-04-24 after verification showed the previously reported failure was no longer reproducible.

## Discovered

2026-04-24 during full-workspace verification while executing `docs/plans/134-node-renderer-compile-time-execution-plan-convergence-plan.md`.

## Symptoms

- Original report: `packages/flux-runtime` tests were believed to be failing with recursive source/reaction refresh behavior and `RangeError: Maximum call stack size exceeded` near `packages/flux-runtime/src/async-data/data-source-runtime.ts:130`.
- Current verification on 2026-04-24 did not reproduce the failure.

## Current Understanding

- The originally suspected owner area was still the async-data / reaction subsystem, not the NodeRenderer import-plan path.
- Reproduction attempts on 2026-04-24 all passed without code changes:
  - `pnpm exec vitest run "src/source-reaction-dependencies.test.ts"` in `packages/flux-runtime`
  - `pnpm exec vitest run "src/__tests__/runtime-sources.test.ts" "src/__tests__/runtime-sources-refresh.test.ts" "src/__tests__/runtime-reactions.test.ts" "src/__tests__/runtime-actions-advanced.test.ts"` in `packages/flux-runtime`
  - `pnpm test` in `packages/flux-runtime`
  - workspace-root `pnpm test`
- The most likely explanation is that the failure was transient or already eliminated by subsequent changes elsewhere before this follow-up verification.
- No runtime code changes were made as part of closing this bug note.

## Why This Is Separate From Plan 134

- Plan 134 changed import preloading, compile-time node plans, and `NodeRenderer` execution.
- If a similar failure reappears, it should still be tracked as source/reaction runtime behavior in `flux-runtime`, not silently folded into Plan 134.

## Recommended Next Step

- No immediate runtime fix is required.
- If the regression reappears, start by rerunning the focused `flux-runtime` test commands above before changing code.
- Reopen or replace this bug note only if the failure becomes reproducible again with concrete failing output.
