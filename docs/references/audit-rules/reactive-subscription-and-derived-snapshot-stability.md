# Reactive Subscription And Derived Snapshot Stability

## Purpose

This rule captures recurring failures where reactive UI paths subscribe too broadly, derive unstable snapshots, or rebuild host projection inputs on every render.

Use it when reviewing selector hooks, bridge `getSnapshot()` implementations, host-scope publication, or any React path built on `useSyncExternalStore`.

## Scope

Apply this rule when code changes touch any of the following:

- `useSyncExternalStore` or `useSyncExternalStoreWithSelector` consumers
- bridge-layer `getSnapshot()` functions that derive host snapshots
- selector hooks that read multiple scope/store paths
- host scope objects passed through `useHostScope()` or equivalent publication hooks
- memoization around selector inputs, host snapshot derivation, or scope data replacement

## Required Pattern

### 1) Reactive subscriptions must match the smallest practical dependency set

- Do not subscribe whole-store or whole-snapshot paths when the consumer only needs a stable subset.
- Prefer path/subfield selectors plus a comparator when the consumer does not need the full snapshot.
- Split oversized selectors when one selector mixes unrelated reactive concerns.

Review checks:

- Search for identity selectors like `(state) => state` or selectors returning large composite objects.
- Confirm the selector only reads values the component actually uses.
- If one selector reads many unrelated fields, check whether the path can be split.

### 2) Derived `getSnapshot()` results must be reference-stable when the source snapshot is unchanged

- If `getSnapshot()` derives a host snapshot from a lower-level runtime snapshot, it must cache and reuse the derived object until the source snapshot changes.
- Do not return a fresh derived object on every read.
- Cache at the bridge or adapter boundary, not in each consumer component.

Review checks:

- Search for `getSnapshot()` implementations that call `derive*Snapshot(...)` inline.
- Confirm repeated reads with no source change return the same object reference.
- Add a focused test for repeated snapshot reads when the source store is unchanged.

### 3) Host-scope publication inputs must be reference-stable when semantics are unchanged

- Objects passed into `useHostScope()` or similar publication helpers must be memoized from their actual semantic inputs.
- Avoid recreating host-scope objects every render.
- Dependency arrays must name the true semantic inputs, not broad wrapper objects.

Review checks:

- Search for inline object literals passed to host-scope publication hooks.
- Check `useMemo` dependency arrays for broad wrapper deps like `[input]` when only some fields matter.
- Verify `scope.replace` or equivalent publication only runs when the projected semantics change.

## Allowed Exceptions

- Whole-snapshot subscription is allowed when the component truly renders from arbitrary dynamic paths and no narrower stable dependency set exists.
- Fresh derived objects are allowed only when the source snapshot itself changed or the owner doc explicitly treats the result as non-cacheable ephemeral data.
- Unmemoized host-scope objects are allowed only in one-shot non-reactive setup paths that do not feed `scope.replace`-style reactive publication.

## Review Checklist

- Selectors do not subscribe more broadly than the rendered data requires.
- Derived `getSnapshot()` results stay reference-stable across repeated reads with unchanged source state.
- Host-scope inputs are memoized from their real semantic dependencies.
- `scope.replace` or equivalent publication is not triggered by reference churn alone.
- Focused tests cover both unchanged-source stability and actual-change propagation.

## Evidence From This Repository

- `docs/plans/165-reactive-subscription-precision-plan.md`
- `docs/bugs/32-react19-external-store-derived-snapshot-loop-fix.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/05-reactive-precision.md`
- `docs/analysis/2026-05-01-deep-audit-full-2/summary.md`

## Primary Architecture Anchors

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/performance-design-requirements.md`
