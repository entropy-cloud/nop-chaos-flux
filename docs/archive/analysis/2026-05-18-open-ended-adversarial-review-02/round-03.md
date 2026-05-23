# Open-Ended Adversarial Review — 2026-05-18 — Round 03

**Execution date**: 2026-05-18
**Result directory**: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/`
**Exploration areas**: Runtime scope management, cross-package consistency audit
**Discovery source**: Parallel adversarial exploration + code verification

---

## Finding 1: `createCompositeScopeStore` subscription survives after scope disposal — memory leak and stale callback hazard

- **Where**: `packages/flux-runtime/src/scope.ts:248-257` (subscription creation), `packages/flux-runtime/src/runtime-factory.ts:354-357` (`disposeScope` implementation)
- **What**: `createCompositeScopeStore` creates a subscription to the parent scope's store via `parent.store?.subscribe(...)`. This subscription calls `readVisible()` and `listener(change)` whenever the parent scope changes. However, `runtime.disposeScope(scopeId)` (runtime-factory.ts:354-357) only cleans up source and reaction registries — it does **not** trigger the unsubscribe function returned by `parent.store.subscribe`. The `ScopeRef` interface has no `dispose()` method, so there's no mechanism to call the cleanup.
- **Why it matters**: After a scope is disposed, the parent scope still notifies it on every change. The subscription callback's closure holds references to the disposed scope's data and store. This is:
  1. A memory leak (listener closures remain registered on the parent)
  2. A potential correctness hazard (callbacks could fire on disposed state)
  3. Particularly impactful for surface scopes (dialogs/drawers) that are frequently created and disposed
- **Confidence**: Certain (confirmed by code)
- **Non-duplication note**: Earlier runtime audits (2026-04-16, 2026-05-06) covered scope ownership patterns but did not identify this subscription lifecycle gap.

---

## Finding 2: `HostProjectionScope` reads return valid data after disposal — safety boundary violation

- **Where**: `packages/flux-runtime/src/runtime-host-projection-scope.ts:74-88` (read methods), `:90-124` (write methods with `disposed` check), `:127-130` (dispose)
- **What**: The `dispose()` method sets `disposed = true`, and write methods (`update`, `merge`, `replace`) check this flag and no-op after disposal. But **read methods** (`get`, `has`, `readOwn`, `readVisible`, `materializeVisible`) do **not** check `disposed` — they delegate directly to `hostScope` without guard.
- **Why it matters**: After disposal, reads continue returning the underlying host scope data. A disposed projection scope should return `undefined` or throw for reads. The asymmetry (writes block, reads don't) is confusing and creates a safety gap: code holding a reference to a disposed projection scope can still read data as if it's alive.
- **Confidence**: Certain (confirmed by code)
- **Non-duplication note**: Not reported in earlier scope or surface owner reviews.

---

## Finding 3: `createSurfaceScope` injects entire visible snapshot into dialog/drawer scope — isolation boundary bypass

- **Where**: `packages/flux-runtime/src/action-adapter.ts:541-557`
- **What**: When `openDialog` or `openDrawer` triggers `createSurfaceScope`, the new child scope is created with `initialData: { ...visibleSnapshot, dialogId: pendingId, ...(patch ?? {}) }`, where `visibleSnapshot` is the entire `materializeVisible()` of the parent scope. The scope's `parent` is set to `ctx.scope`. Because `readVisible()` merges parent data, AND the parent's data is also copied into `initialData`, the dialog/drawer scope carries the caller's entire data — even if the parent scope is marked `isolate`.
- **Why it matters**: The isolation boundary is double-bypassed: first through the parent chain merge (which `isolate` blocks), and then again through `initialData` (which has no `isolate` awareness). If a dialog is intended to be isolated from the caller's scope, the caller's full visible data is still available in the dialog's own store. This is an explicit design choice but directly contradicts the `isolate` semantic.
- **Confidence**: Certain (confirmed by code)
- **Non-duplication note**: Earlier surface-owner and scope isolation audits (2026-04-16, 2026-05-06) discussed scope ownership but did not identify this specific `initialData` bypass.

---

## Finding 4: `isAbortError` duplicated across packages with divergent behavior — bug propagation risk

- **Where**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:171-176` (local duplicate), `packages/flux-core/src/runtime-inspection.ts:8` (canonical), `packages/flux-action-core/src/action-core.ts:372` (re-export)
- **What**: The canonical `isAbortError` in `flux-core` handles three cases: `DOMException('AbortError')`, `Error` with `name: 'AbortError'`, AND plain objects with `name: 'AbortError'` or `code: 'ABORT_ERR'`. The local copy in `variant-field.tsx` is more restrictive:
  ```typescript
  // variant-field.tsx (restrictive):
  function isAbortError(error: unknown): boolean {
    return (
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error instanceof Error && error.name === 'AbortError')
    );
  }
  ```
  It misses plain objects with `name: 'AbortError'` (which occur when errors cross postMessage or structuredClone boundaries) and `code: 'ABORT_ERR'` (an alternative abort signal convention).
- **Why it matters**: When variant-field encounters a structured-cloned abort error (e.g., from a Web Worker or cross-iframe), it won't recognize it as an abort, treating it as a regular failure. This could cause the variant field to show an error state instead of gracefully handling cancellation. The `isAbortError` function is imported from `@nop-chaos/flux-core` in `flux-runtime` and `flux-action-core` — only this one renderer has a divergent local copy.
- **Confidence**: Certain (confirmed by code)
- **Non-duplication note**: Not reported in earlier cross-package audits.

---

## Finding 5: Unused production dependency in `flux-renderers-form`

- **Where**: `packages/flux-renderers-form/package.json:28` (declares `@nop-chaos/flux-runtime` as production dependency), `packages/flux-renderers-form/src/` (zero imports from flux-runtime)
- **What**: By contrast, `flux-renderers-basic/package.json:28` correctly puts `flux-runtime` only in `devDependencies`. The form package has it in production dependencies, adding unnecessary weight to the dependency graph.
- **Why it matters**: Consuming applications that only install `flux-renderers-form` will pull in `flux-runtime` as a transitive dependency even though no import path requires it. This is minor for source code (bundlers may tree-shake) but matters for type resolution, dev experience, and dependency audit clarity.
- **Confidence**: Certain (confirmed by code — 0 import matches)
- **Non-duplication note**: Earlier package-boundary audits (2026-04-16, 2026-05-06) covered module boundary integrity but not dependency weight.

---

## Round Assessment

This round found 5 findings across 3 areas:

| Area                      | Count | Key patterns                                                                                                                        |
| ------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Runtime scope lifecycle   | 3     | Subscription leak after scope disposal; disposal asymmetry in reads vs writes; isolation bypass via `initialData` in surface scopes |
| Cross-package consistency | 2     | Divergent `isAbortError` implementation in variant-field; unused production dependency in renderers-form                            |

The most critical are:

1. **Scope disposal is incomplete** (Findings 1-2): Two independent scope lifecycle bugs — `createCompositeScopeStore` subscriptions and `HostProjectionScope` reads — both survive disposal. Combined, they create both memory leaks and stale-data hazards.
2. **Isolation semantic bypass** (Finding 3): `createSurfaceScope` injects parent data into child initialData, bypassing the `isolate` boundary that the scope system otherwise enforces.
3. **Divergent abort detection** (Finding 4): A local copy of `isAbortError` with different behavior in variant-field creates a bug that only manifests under specific (but real) error propagation scenarios.
