# 15 Flux Runtime Source/Reaction Recursion And Dependency Guard Regression

## Status

Open.

## Discovered

2026-04-24 during full-workspace verification while executing `docs/plans/134-node-renderer-compile-time-execution-plan-convergence-plan.md`.

## Symptoms

- `pnpm test` fails in `packages/flux-runtime`.
- Multiple source/reaction tests report `RangeError: Maximum call stack size exceeded`.
- The stack traces repeatedly point at `packages/flux-runtime/src/async-data/data-source-runtime.ts:130` during `writeDataToScope(...)`.
- Affected tests include:
  - `packages/flux-runtime/src/source-reaction-dependencies.test.ts`
  - `packages/flux-runtime/src/__tests__/runtime-sources.test.ts`
  - `packages/flux-runtime/src/__tests__/runtime-sources-refresh.test.ts`
  - `packages/flux-runtime/src/__tests__/runtime-reactions.test.ts`
  - `packages/flux-runtime/src/__tests__/runtime-actions-advanced.test.ts`

## Current Understanding

- The failing area is the async-data / reaction subsystem, not the NodeRenderer import-plan path.
- The likely fault line is interaction between:
  - `packages/flux-runtime/src/async-data/data-source-runtime.ts`
  - `packages/flux-runtime/src/async-data/source-registry.ts`
  - `packages/flux-runtime/src/async-data/reaction-runtime.ts`
  - dependency filtering via `packages/flux-runtime/src/scope-change.ts`
- The observed failure mode suggests a scope writeback is re-triggering source/reaction refresh recursively, or explicit `dependsOn` guards are not being applied the way the tests expect.
- Two speculative edits were tried locally during investigation and then reverted because they were not the correct fix direction; no intentional runtime behavior change from those experiments remains.

## Why This Is Separate From Plan 134

- Plan 134 changed import preloading, compile-time node plans, and `NodeRenderer` execution.
- The failing tests exercise source/reaction dependency refresh logic in `flux-runtime`, a separate owner area.
- Full-workspace verification is correctly surfacing this blocker, but it should be tracked and fixed as its own bug line rather than silently broadening Plan 134.

## Recommended Next Step

- Create a focused execution plan for the `flux-runtime` source/reaction dependency guard path.
- Reproduce with `pnpm exec vitest run "src/source-reaction-dependencies.test.ts"` in `packages/flux-runtime`.
- Audit the actual change events reaching source/reaction subscriptions and compare them against expected `dependsOn`, target-path, and self-published write filtering semantics before changing runtime behavior.
