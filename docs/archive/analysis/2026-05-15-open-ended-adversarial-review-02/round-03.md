# Open-Ended Adversarial Review — 2026-05-15 (Session 2) — Round 3

This round followed the "10x scale" perspective into table rendering, and the "dead code scavenger" perspective into the compilation pipeline. The previous rounds covered scope isolation, form validation races, lifecycle gaps, import security, error boundaries, and action disposal. This round adds table data integrity and compilation-safety findings.

## Finding 1: Duplicate `rowKey` Causes Silent Scope Aliasing and Data Corruption

**Where**:

- `packages/flux-renderers-data/src/table-renderer/table-data.ts:48-67` (`warnOnDuplicateRowKeys` warns only)
- `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts:141` (`rowScopeCache.set(rowKey, ...)` silently overwrites)

**What**: When two rows in the data array produce the same `rowKey`, the row scope cache silently aliases them. The architecture doc at lines 267-268 says: "duplicate rowKey values are invalid and must surface development diagnostics; conflicting rows must not silently share reused scopes." The implementation does the opposite:

1. `warnOnDuplicateRowKeys()` (`table-data.ts:48-67`) only calls `console.warn` in dev mode. It returns `void`.
2. `use-table-row-scope-cache.ts:141` does `rowScopeCache.set(rowKey, createdScope)` — a `Map.set` that silently overwrites the first row's scope with the second's.

After aliasing: Row 1's cells, buttons, actions, and events read Row 2's data. This is a data corruption bug, not just a dev warning gap. The `rowScopeCache` is a `Map<string, ScopeRef>` — there is no deduplication prefix, no `ScopeRef[]` accumulator, no rejection. Duplicate keys are structurally impossible to represent correctly in this data structure.

**Why it matters**: In real schemas, `rowKey` often binds to a field like `id`. If the backend does not enforce uniqueness (e.g., a denormalized join producing duplicate IDs, or a data source that has temporary IDs), the user sees Row 1's visual position with Row 2's data. Every action targeting Row 1 (edit, delete, navigate) operates on Row 2. The warning-only approach is invisible in production.

The architecture doc explicitly calls this out as an invalid condition. The code has the check but no enforcement.

**Confidence**: High. The `Map.set` overwrite is unconditional.

---

## Finding 2: Every Quick-Edit Keystroke Re-Renders All Rows — Version Counter Defeats Row-Local Invalidation

**Where**:

- `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts:149,164-172` (single `version` counter, entire-map copy)
- `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:130-189` (`NonVirtualBody` receives new Map on every version change)
- `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:88` (keystroke → `rowScope.update(...)`)

**What**: When a quick-edit cell fires a keystroke:

1. `rowScope.update(...)` writes to the row's Zustand store (`scope.ts:398`)
2. `useTableRowScopeCache`'s listener fires, increments a single `version` counter, and calls all registered listeners
3. `useSyncExternalStore` triggers re-render of the component tree
4. `useMemo(() => new Map(rowScopeCache), [version])` creates a **new Map** of ALL row scopes
5. `NonVirtualBody` receives the new Map → re-renders every row

The single `version` counter provides no row-level granularity. A keystroke in row 5's cell forces row 1-500 all to reconstruct. The `new Map(rowScopeCache)` copy allocates 500 Map entries per keystroke for a 500-row table. At 10 keystrokes: 5000 row renders + 5000 Map entries allocated.

This violates multiple architecture doc hot-path rules: line 506-514 (row-local invalidation), line 617 (no per-render allocation for unchanged rows), line 620 (no row-scope publication when unchanged).

**Why it matters**: While React reconciliation (keyed by `rowKey`) limits actual DOM mutations to the changed row, the VDOM creation and reconciliation cost for all rows is incurred on every keystroke. At 50 rows the cost is negligible; at 500 rows it's visible jank; at 5000 rows the `new Map` allocation plus VDOM reconciliation produces multi-second freezes. This is a systemic O(n) scaling issue where O(1) or O(changed-row) is the expected design.

A per-row dirty set (`Set<string>`) that only notifies consumers when specific rows change, combined with referentially stable Map entries for unchanged rows, would fix this.

**Confidence**: High. The code path is linear and the single counter is unambiguous.

---

## Finding 3: `CompiledCidState` Has Dead Code — `duplicateIds` Tracking Was Planned But Never Wired

**Where**:

- `packages/flux-core/src/compiled-cid.ts:6-8` (declaration of `byId`, `idPaths`, `duplicateIds`)
- `packages/flux-compiler/src/schema-compiler/target-enrichment.ts:50-63` (only increments `nextTemplateNodeId`, never reads `schema.id`)
- `packages/flux-react/src/render-nodes.tsx:414-416` (uses `node.id` as React key)

**What**: The `CompiledCidState` interface declares three tracking fields:

```ts
export interface CompiledCidState {
  nextTemplateNodeId: number;
  byId: Map<string, number>;
  idPaths: Map<string, string[]>;
  duplicateIds: Set<string>;
}
```

`byId`, `idPaths`, and `duplicateIds` are initialized in `createCompiledCidState` and validated in tests (`compiled-cid.test.ts:24-40`), but they are **never populated** by any code path. `enrichTemplateNodeIds` only calls `cidState.nextTemplateNodeId += 1`. The `schema.id` field is never collected, never checked for uniqueness, and `duplicateIds` remains empty forever.

Meanwhile, `render-nodes.tsx:414-416` uses `node.id` as the React `key`:

```tsx
{children.map((node, index) => (
  <NodeRenderer key={node.id}>
```

If a schema author creates two sibling objects with the same `id` (two buttons both `{ type: 'button', id: 'my-btn' }`), the resulting React duplicate-key warning points to the symptom (React reconciliation). The root cause — a compile-time `schema.id` collision — goes undetected because the planned detection infrastructure (`byId`, `duplicateIds`) was declared but never connected to the compilation pass that could populate it.

**Why it matters**: This is a "safety net that was bolted to the wall but never connected to a power source." The architecture intent was to catch duplicate schema `id` values at compile time. The code has the tracking structure and the compilation pass that should feed it — but the connection was never made. A future developer adding `id` collision detection would need to either:

- Hook `byId` population into `enrichTemplateNodeIds` or `nodeCompiler`, OR
- Add a dedicated post-compilation pass

Either way, the current state leaves developers with React's runtime duplicate-key warning (which is deduped in production React builds). In production, duplicate `id` values silently cause incorrect component reconciliation.

**Confidence**: Certain (triple-verified: the collection code exists in no file in the compiler package; the fields are only written in test assertions; grep for `byId.set` or `duplicateIds.add` returns no results outside tests).

---

## Finding 4: Row Scopes Evicted Without Disposal — Accumulates Scope Stores on Pagination/Filter

**Where**: `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts:154-162`

**What**: When visible rows change (pagination, filter, sort, data refresh), row scopes for non-visible rows are evicted from the cache but never disposed:

```ts
for (const key of Array.from(rowScopeCache.keys())) {
  if (visibleKeys.has(key)) continue;
  rowScopeCache.delete(key);
  rowScopeSnapshots.delete(key);
  changed = true; // no scope.dispose() or similar cleanup
}
```

Each `ScopeRef` created at line 135 backs a Zustand store with its own subscriber set. While row scopes are isolated (no parent store subscription that could leak), the scope object and its store remain alive if any reference to it exists outside the cache — and there are multiple possible sources: component callback closures, action dispatch contexts, event handler bindings.

The same gap exists in the unmount cleanup at lines 119-125:

```ts
return () => {
  rowScopeCache.clear();
  rowScopeSnapshots.clear(); // no dispose
  tableRowScopeCaches.delete(cacheKey);
};
```

**Why it matters**: For tables that cycle through many pages (e.g., a user browsing 20 pages of 50 rows), each navigation creates new scopes and abandons old ones. Over a long session with multiple filter/sort/page operations, orphaned scope stores accumulate. The scope store's subscription set is internal to Zustand — even with zero external subscribers, the store object itself persists until GC reclaims it (which depends on whether any closures still reference it).

While each individual scope store is small, 200 pages × 50 rows = 10,000 orphaned scope stores in a session is not implausible. The same applies to `new Map(rowScopeCache)` from Finding 2 which retains references to every scope.

**Confidence**: High. The delete-only pattern is unambiguous; the missing dispose is structurally the same class of gap found in fragment scope cleanup (reported in this session's round-01 scope analysis) but in a higher-churn context.

---

## Finding 5: Quick-Edit Draft State Destroyed by Any Data Refresh That Changes Record Reference

**Where**: `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:41-48`

**What**: The quick-edit controller's useEffect resets ALL draft state whenever `record` reference changes:

```ts
useEffect(() => {
  const nextValue = toOptionalDraftValue(record, field);
  setDraftValue(nextValue);
  setSavedValue(nextValue);
  setBodyDirty(false);
  setDialogOpen(false);
  setSaveError(undefined);
}, [field, record]);
```

If `record` is a new object reference — which happens with immutable data patterns, API refresh, or any parent re-render that reconstructs the source array — the user's in-progress edit is silently discarded. The effect resets everything: draft text, dirty flag, dialog state, saved value.

The same `record` reference change is also what propagates through the full-table re-render (Finding 2), compounding the problem. A user typing in a cell can lose their draft due to:

- An auto-refresh poll completing
- A different cell in the same table saving and triggering data refresh
- Any parent re-render producing a new source array (even with identical data)

**Why it matters**: This is a user data loss bug, not just a performance concern. A user mid-edit in a cell sees their work disappear without warning. The data is not completely lost (the scope store may still hold the edited value depending on timing), but the UI state reverts. Combined with the full-table re-render issue, even a keystroke-debounce that triggers an auto-save → refresh cycle would reset the editing state.

The fix would be to preserve draft values across record reference changes using `useRef`, or compare records by value before resetting.

**Confidence**: High. The effect dependency on `record` (a reference that changes on every new array from data sources) makes this trigger predictably.

---

## Round Summary

| #   | Area                 | Severity | Summary                                                                                     |
| --- | -------------------- | -------- | ------------------------------------------------------------------------------------------- |
| 1   | Table data integrity | High     | Duplicate `rowKey` silently aliases row scopes, causing data corruption                     |
| 2   | Table performance    | High     | Single version counter causes full-table re-render on every quick-edit keystroke            |
| 3   | Compilation safety   | High     | `duplicateIds` tracking declared but never wired; schema `id` collisions go undetected      |
| 4   | Table memory         | High     | Row scopes evicted without disposal; stores accumulate on pagination/filter                 |
| 5   | Table UX             | High     | Quick-edit draft destroyed by any record reference change (refresh, poll, parent re-render) |

This round adds table rendering and compilation to the coverage map. The connecting thread is **uncritical data structures**: a `Map` that overwrites on collision, a counter that broadcasts O(n) instead of O(1), a declared-but-empty safety net, and an effect dependency that destroys UI state on reference identity. These are not design-level decisions gone wrong — they are implementation-level choices that violate stated performance and data-integrity requirements.

## Blind-Spot Self-Assessment

I did not run any table renderer tests or simulate pagination/keystroke patterns. The performance findings (Finding 2) would benefit from a benchmark to establish the actual jank threshold. I also did not read every renderer's interaction with the row scope cache — there may be additional patterns beyond quick-edit that trigger the full-table re-render.

Areas still not covered in this session:

- CSS/styling system contradictions
- The data source caching and reaction lifecycle
- The debugger runtime
- The `flux-formula` package for expression evaluation correctness
- Per-package test quality/coverage

These are good candidates for a future review session but I will stop here as the number of high-quality remaining candidates per round is diminishing and the already-reported set is broad.
