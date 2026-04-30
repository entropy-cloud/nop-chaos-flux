# Performance Design Requirements

## Purpose

Define mandatory performance design constraints for Flux core/runtime/react/renderers.

This is a normative design requirements document.

## Source Basis

- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/flow-designer/design.md`
- `docs/analysis/2026-03-31-deep-architecture-analysis.md`

## Performance Boundary Principles

1. Compile once, execute many.

- Prefer compile-time normalization over repeated runtime interpretation.

2. Keep identity stable when semantic value is unchanged.

- Reuse references for unchanged computed results.
- Avoid unnecessary allocations in hot render/update paths.

3. Subscription granularity over broad invalidation.

- Prefer selective subscriptions and scoped updates.
- Avoid full-tree updates for local state changes.
- When the substrate supports it, carry changed-path payloads through subscriptions so render-time resolution can cheaply skip unrelated work.

4. Immutable update semantics for observable state.

- Do not mutate shared state containers in place on critical paths.
- Ensure change detection can rely on structural identity rules.

5. Avoid accidental quadratic paths in interaction loops.

- Review map/find/filter nesting on node/edge collections.
- Use indexed lookup structures where interaction scale can grow.

6. Keep diagnostics and safety checks lightweight on hot paths.

- Expensive deep compare/stringify operations should not run per interaction tick.

## Mandatory Requirements

## P1. No full-graph stringify checks in hot paths

- Dirty tracking must use revisions/version counters or equivalent incremental markers.

## P2. No avoidable O(n^2) loops for graph editing operations

- For repeated id-based lookup in loops, pre-index by id (`Map`) before transformation.

## P3. Maintain immutable updates in shared state models

- Bulk update paths must produce new containers when values change.

## P4. Controlled vs uncontrolled model consistency

- Do not maintain pseudo-controlled state that is not actually wired to controlled props/APIs.

## P5. Predictable async behavior

- Debounce/throttle/request coordination promises must always settle deterministically.
- All async `useEffect` closures that perform network or runtime requests MUST use `AbortController` for lifecycle management: call `controller.abort()` in the cleanup return to prevent stale updates from being applied after the component unmounts or dependencies change.
- The two cancellation layers are distinct: (1) **ignore stale results** â€” check `signal.aborted` before calling `setState`; (2) **abort in-flight tasks** â€” pass `signal` to fetch/runtime APIs that support it. Both layers must be present when the runtime API accepts a signal.

## P6. Observability for performance-sensitive failures

- Swallowed errors that can cause hidden degraded behavior are prohibited in runtime-critical paths.

## P7. Field-state hooks must use per-path subscription, not full-store broadcast

- Any React hook that reads per-field state (errors, touched, validating, dirty,
  visited) MUST subscribe via `FormStoreApi.subscribeToPath(path, listener)`, not via
  the full-store `subscribe` broadcast.
- The broadcast subscription is reserved for form-level consumers (submit banner,
  debugger, form-level error summary).
- Projected stores (`createPrefixedStore`, `createItemStore`, `createVariantStore`)
  must delegate `subscribeToPath` to the parent store with path translation; they must
  not create an intermediate full-store broadcast and then filter by prefix.
- Rationale: in a 1 000-field form, a single keystroke that updates one field must wake
  only the hook(s) subscribed to that field — O(1) wake-ups, not O(n).
- See `docs/plans/90-form-store-per-path-subscription-plan.md` for the per-path subscription
  implementation plan and `docs/plans/91-form-field-state-normalization-refactor-plan.md`
  for the unified `fieldStates` map refactor.

## Recommended Patterns

- Use revision counters for dirty/changed flags.
- Use single-pass transforms for bulk collection updates.
- Split contexts/stores by change frequency.
- Prefer explicit cache invalidation over ad-hoc global cache retention.
- Add targeted regression tests for performance-sensitive logic paths.

## React 19 / Compiler Conventions

### React Compiler

- The playground build chain ingests the React Compiler via `@rolldown/plugin-babel` + `babel-plugin-react-compiler` configured in `apps/playground/vite.config.ts`.
- The `eslint-plugin-react-compiler` rule `react-compiler/react-compiler` is set to `error` in `eslint.config.js`. Any new code that introduces compiler-hostile patterns (mutating props, conditional hook calls, etc.) will fail lint.
- **Do not remove existing `useMemo` / `useCallback` without profiling evidence that the compiler has taken over that boundary.** Only retire manual memoization after verifying the compiler successfully compiles the component and a before/after profile confirms no regression.

### `startTransition` / `useTransition`

- Use `startTransition` (or `useTransition`) for state updates that control **non-urgent**, deferred re-renders: pagination page changes, sort/filter toggles, row selection batch updates, and sheet/tab switching. These are already applied in `useTablePagination`, `useTableSelection`.
- **Never** wrap the user's primary input handler (the click itself, the keystroke capture) inside a transition â€” only the resulting derived state update belongs in a transition.
- Use `useDeferredValue` to defer expensive downstream computations (e.g. large filtered dataset) rather than the interaction source.

### Module Boundary Rules for Hot Paths

- Large renderer components must be decomposed into independent modules when they mix data derivation, state management, UI rendering, and side-effect bindings in a single file.
- See `packages/flux-renderers-data/src/table-renderer/` and `packages/spreadsheet-renderers/src/spreadsheet-interactions/` as reference splits.
- Each sub-module must be independently typecheckable and testable.

## Prohibited Patterns

- Repeated `findIndex/find` inside mutation loops on large collections.
- Deep `JSON.stringify` comparisons on every interactive update.
- In-place mutation mixed with reference-based change detection.
- Ambiguous viewport/state ownership in interactive canvas components.
- Using bare boolean flags (`let cancelled = false`) instead of `AbortController` in async `useEffect` closures.
- Using `startTransition` around input event handlers or state that must respond synchronously (e.g., typing, pointer capture).
- Skipping React Compiler output verification after adding or refactoring components in hot-path packages.

## Design Review Checklist

Before merge, answer all:

- Is this path executed per interaction or per render?
- Does the change introduce repeated linear scans inside loops?
- Are unchanged values preserving references where expected?
- Is state update strategy immutable and observable?
- Are async cancellation/debounce semantics deterministic?
- Are potential degradations covered by tests or monitors?

## Documentation Sync Requirements

When this document changes or related constraints change, review:

- `docs/index.md`
- `docs/references/maintenance-checklist.md`
- architecture docs for impacted packages/modules
