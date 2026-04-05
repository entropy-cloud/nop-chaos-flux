# Performance Design Requirements

## Purpose

Define mandatory performance design constraints for Flux core/runtime/react/renderers.

This is a normative design requirements document.

## Source Basis

- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/flow-designer/design.md`
- `docs/analysis/deep-architecture-analysis.md`

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

## P6. Observability for performance-sensitive failures

- Swallowed errors that can cause hidden degraded behavior are prohibited in runtime-critical paths.

## Recommended Patterns

- Use revision counters for dirty/changed flags.
- Use single-pass transforms for bulk collection updates.
- Split contexts/stores by change frequency.
- Prefer explicit cache invalidation over ad-hoc global cache retention.
- Add targeted regression tests for performance-sensitive logic paths.

## Prohibited Patterns

- Repeated `findIndex/find` inside mutation loops on large collections.
- Deep `JSON.stringify` comparisons on every interactive update.
- In-place mutation mixed with reference-based change detection.
- Ambiguous viewport/state ownership in interactive canvas components.

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
